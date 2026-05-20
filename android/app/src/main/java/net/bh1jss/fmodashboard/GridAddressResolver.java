package net.bh1jss.fmodashboard;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;

/**
 * Maidenhead 网格 → 行政区地址解析的应用级单例。
 *
 * 设计要点：
 * 1. 三级查询：内存 LRU（上限 {@value #MEMORY_CACHE_MAX}）→ SQLite 持久化 → 远程 API。
 * 2. 同一 grid 并发请求通过 {@link #inflightLocks} 合并，只会真正发起一次 HTTP。
 * 3. 远程请求做 {@value #RATE_LIMIT_MIN_INTERVAL_MS}ms 最小间隔限频；命中 429 后整插件进入
 *    {@value #RATE_LIMIT_BACKOFF_MS}ms 冷却期。
 * 4. 数据持久化到 {@link GridDbHelper}，除非显式 {@link #clearAll()}，数据跟随应用安装期。
 * 5. 提供两种对内原生调用入口：
 *    - {@link #getCached(String)}：仅查内存 + SQLite，miss 返回 null，绝不发远程请求，供需要
 *      「立刻拿现成结果」的链路（如通知栏刷新）同步使用。
 *    - {@link #resolveAsync(String, Callback)}：走完整三级路径，miss 则异步发起 HTTP。
 *
 * 被 {@link FmoGridPlugin}（JS bridge 入口）和 {@link FmoEventsPlugin}（通知栏原生直查链路）
 * 共享同一份缓存状态，确保数据只写一次、多处命中。
 */
public class GridAddressResolver {

    private static final String TAG = "GridAddressResolver";
    private static final String API_BASE = "https://grid.lzyike.cn";
    private static final int MEMORY_CACHE_MAX = 2048;
    // 基础频率限制：每 600ms 最多一次远程请求（与 Web 端 gridService.js 一致）
    private static final long RATE_LIMIT_MIN_INTERVAL_MS = 600L;
    // 被后端 429 拒绝后，下一次窗口至少延后这么久，避免持续轰炸
    private static final long RATE_LIMIT_BACKOFF_MS = 3_000L;

    public interface Callback {
        void onSuccess(JSONObject data);
        void onError(Throwable t);
    }

    private static volatile GridAddressResolver sInstance;

    public static GridAddressResolver get(Context ctx) {
        if (sInstance == null) {
            synchronized (GridAddressResolver.class) {
                if (sInstance == null) {
                    sInstance = new GridAddressResolver(ctx.getApplicationContext());
                }
            }
        }
        return sInstance;
    }

    private final OkHttpClient httpClient;
    private final GridDbHelper dbHelper;
    private final ExecutorService executor = Executors.newFixedThreadPool(4);

    private final LinkedHashMap<String, JSONObject> memoryCache =
            new LinkedHashMap<String, JSONObject>(256, 0.75f, true) {
                @Override
                protected boolean removeEldestEntry(Map.Entry<String, JSONObject> eldest) {
                    return size() > MEMORY_CACHE_MAX;
                }
            };

    private final Map<String, Object> inflightLocks = new ConcurrentHashMap<>();
    private final AtomicLong lastCallAt = new AtomicLong(0L);
    private final Object rateLimiterLock = new Object();

    private GridAddressResolver(Context appCtx) {
        httpClient = new OkHttpClient.Builder()
                .connectTimeout(10, TimeUnit.SECONDS)
                .readTimeout(15, TimeUnit.SECONDS)
                .build();
        dbHelper = new GridDbHelper(appCtx);
    }

    // ========== 公共 API ==========

    /**
     * 格式化地址对象为用于展示的城市名，规则与 Web 端 formatAddress 对齐：
     * 优先 city，退到 province，都没有则返回 ""。
     */
    public static String formatCity(JSONObject data) {
        if (data == null) return "";
        String city = data.optString("city", "");
        if (!city.isEmpty()) return city;
        String prov = data.optString("province", "");
        return prov == null ? "" : prov;
    }

    /** 归一化 grid（trim + upper），空字符串返回 null。 */
    public static String normalize(String grid) {
        if (grid == null) return null;
        String g = grid.trim().toUpperCase();
        return g.isEmpty() ? null : g;
    }

    /** 本地 grid 格式校验。返回 null 表示通过，否则返回错误描述。 */
    public static String validate(String grid) {
        if (grid == null) return "缺少 grid 参数";
        int len = grid.length();
        if (len < 4 || len > 8 || len % 2 != 0) {
            return "grid 长度必须在 4-8 字符之间且为偶数长度";
        }
        if (!grid.substring(0, 2).matches("^[A-R]{2}$")) {
            return "grid 前两位必须是 A-R 之间的字母";
        }
        if (!grid.substring(2, 4).matches("^[0-9]{2}$")) {
            return "grid 第3-4位必须是数字";
        }
        if (len >= 6 && !grid.substring(4, 6).matches("^[A-X]{2}$")) {
            return "grid 第5-6位必须是 A-X 之间的字母";
        }
        if (len >= 8 && !grid.substring(6, 8).matches("^[0-9]{2}$")) {
            return "grid 第7-8位必须是数字";
        }
        return null;
    }

    /**
     * 仅查内存 + SQLite，miss 返回 null；不发远程请求，不阻塞。
     * 供通知栏刷新等需要「拿现成数据」的同步链路使用。
     */
    public JSONObject getCached(String rawGrid) {
        String grid = normalize(rawGrid);
        if (grid == null || validate(grid) != null) return null;

        synchronized (memoryCache) {
            JSONObject mem = memoryCache.get(grid);
            if (mem != null) return mem;
        }
        JSONObject disk = queryDb(grid);
        if (disk != null) {
            synchronized (memoryCache) {
                memoryCache.put(grid, disk);
            }
            return disk;
        }
        return null;
    }

    /**
     * 完整三级解析：内存 → SQLite → 远程 API。miss 时异步发起 HTTP。
     * 回调始终在线程池线程触发。
     */
    public void resolveAsync(String rawGrid, Callback cb) {
        String grid = normalize(rawGrid);
        if (grid == null) {
            if (cb != null) cb.onError(new IllegalArgumentException("grid is required"));
            return;
        }
        String err = validate(grid);
        if (err != null) {
            if (cb != null) cb.onError(new IllegalArgumentException("grid 格式错误: " + err));
            return;
        }
        executor.execute(() -> {
            try {
                JSONObject data = resolveBlocking(grid);
                if (cb != null) cb.onSuccess(data);
            } catch (Exception e) {
                Log.w(TAG, "resolveAsync failed for " + grid + ": " + e.getMessage());
                if (cb != null) cb.onError(e);
            }
        });
    }

    /** 清空内存 + SQLite 的全部缓存。 */
    public void clearAll() {
        synchronized (memoryCache) {
            memoryCache.clear();
        }
        try {
            SQLiteDatabase db = dbHelper.getWritableDatabase();
            db.delete(GridDbHelper.TABLE, null, null);
        } catch (Exception e) {
            Log.w(TAG, "clearAll db failed: " + e.getMessage());
        }
        Log.i(TAG, "clearAll done");
    }

    // ========== 内部实现 ==========

    private JSONObject resolveBlocking(String grid) throws Exception {
        // 1. 内存（无锁快路径）
        synchronized (memoryCache) {
            JSONObject mem = memoryCache.get(grid);
            if (mem != null) return mem;
        }

        // 2. 合并同 grid 的并发请求
        Object lock = inflightLocks.computeIfAbsent(grid, k -> new Object());
        try {
            synchronized (lock) {
                synchronized (memoryCache) {
                    JSONObject mem = memoryCache.get(grid);
                    if (mem != null) return mem;
                }

                JSONObject disk = queryDb(grid);
                if (disk != null) {
                    synchronized (memoryCache) {
                        memoryCache.put(grid, disk);
                    }
                    return disk;
                }

                acquireRateLimit();
                JSONObject data = fetchRemote(grid);

                synchronized (memoryCache) {
                    memoryCache.put(grid, data);
                }
                try {
                    saveDb(grid, data);
                } catch (Exception e) {
                    Log.w(TAG, "saveDb failed for " + grid + ": " + e.getMessage());
                }
                return data;
            }
        } finally {
            inflightLocks.remove(grid, lock);
        }
    }

    private void acquireRateLimit() throws InterruptedException {
        synchronized (rateLimiterLock) {
            long now = System.currentTimeMillis();
            long wait = lastCallAt.get() + RATE_LIMIT_MIN_INTERVAL_MS - now;
            if (wait > 0) {
                Log.i(TAG, "rate limiter: wait " + wait + "ms before next request");
                Thread.sleep(wait);
            }
            lastCallAt.set(System.currentTimeMillis());
        }
    }

    private void backoffAfter429() {
        synchronized (rateLimiterLock) {
            long target = System.currentTimeMillis() + RATE_LIMIT_BACKOFF_MS - RATE_LIMIT_MIN_INTERVAL_MS;
            if (target > lastCallAt.get()) {
                lastCallAt.set(target);
            }
            Log.w(TAG, "429 backoff applied: next request at +" + RATE_LIMIT_BACKOFF_MS + "ms");
        }
    }

    private JSONObject fetchRemote(String grid) throws Exception {
        Request req = new Request.Builder()
                .url(API_BASE + "/api/grid2addr/" + grid)
                .header("Accept", "application/json")
                .get()
                .build();
        try (Response resp = httpClient.newCall(req).execute()) {
            if (resp.code() == 429) {
                backoffAfter429();
                throw new Exception("请求过于频繁，请稍后再试");
            }
            if (!resp.isSuccessful()) {
                String msg = "HTTP " + resp.code();
                ResponseBody body = resp.body();
                if (body != null) {
                    try {
                        JSONObject err = new JSONObject(body.string());
                        String retmsg = err.optString("retmsg", "");
                        if (!retmsg.isEmpty()) msg = retmsg;
                    } catch (Exception ignore) {
                        // keep default
                    }
                }
                throw new Exception("调用 grid2addr API 失败: " + msg);
            }
            ResponseBody body = resp.body();
            if (body == null) throw new Exception("grid2addr 空响应");
            String text = body.string();
            JSONObject root;
            try {
                root = new JSONObject(text);
            } catch (JSONException e) {
                throw new Exception("grid2addr 响应非法 JSON");
            }
            int retcode = root.optInt("retcode", -1);
            if (retcode != 0 || !root.has("data")) {
                String msg = root.optString("retmsg", "grid 转换失败");
                throw new Exception(msg);
            }
            return root.getJSONObject("data");
        }
    }

    private JSONObject queryDb(String grid) {
        try {
            SQLiteDatabase db = dbHelper.getReadableDatabase();
            try (Cursor c = db.query(GridDbHelper.TABLE,
                    new String[]{"data"}, "grid=?", new String[]{grid},
                    null, null, null, "1")) {
                if (c.moveToFirst()) {
                    String s = c.getString(0);
                    if (s != null && !s.isEmpty()) {
                        return new JSONObject(s);
                    }
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "queryDb failed for " + grid + ": " + e.getMessage());
        }
        return null;
    }

    private void saveDb(String grid, JSONObject data) {
        SQLiteDatabase db = dbHelper.getWritableDatabase();
        ContentValues cv = new ContentValues();
        cv.put("grid", grid);
        cv.put("data", data.toString());
        cv.put("cached_at", System.currentTimeMillis());
        db.insertWithOnConflict(GridDbHelper.TABLE, null, cv, SQLiteDatabase.CONFLICT_REPLACE);
    }

    // ========== SQLite Helper ==========

    private static class GridDbHelper extends SQLiteOpenHelper {
        static final String DB_NAME = "fmo_grid_cache.db";
        static final int DB_VERSION = 1;
        static final String TABLE = "grid_cache";

        GridDbHelper(Context ctx) {
            super(ctx, DB_NAME, null, DB_VERSION);
        }

        @Override
        public void onCreate(SQLiteDatabase db) {
            db.execSQL("CREATE TABLE IF NOT EXISTS " + TABLE + " ("
                    + "grid TEXT PRIMARY KEY NOT NULL,"
                    + "data TEXT NOT NULL,"
                    + "cached_at INTEGER NOT NULL"
                    + ")");
        }

        @Override
        public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
            // no-op
        }
    }
}
