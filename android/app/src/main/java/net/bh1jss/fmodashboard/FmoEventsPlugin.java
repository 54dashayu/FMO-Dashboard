package net.bh1jss.fmodashboard;

import android.content.Context;
import android.content.SharedPreferences;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Iterator;
import java.util.LinkedList;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;
import okio.ByteString;

/**
 * FmoEvents: 原生 WebSocket 多连接事件订阅插件。
 * - 每个 addressId 一条 /events 连接，互相独立重连。
 * - OkHttp pingInterval 20s 主动探活，对抗息屏半开连接。
 * - 指数退避重连：3→5→10→30s 封顶，连上后归零。
 */
@CapacitorPlugin(name = "FmoEvents")
public class FmoEventsPlugin extends Plugin {

    private static final String TAG = "FmoEventsPlugin";
    private static final long[] BACKOFF_MS = { 3000L, 5000L, 10000L, 30000L };
    // 发言历史保留时长：1 小时
    private static final long HISTORY_RETENTION_MS = 60L * 60L * 1000L;
    // 服务器信息（getCurrent）轮询间隔
    private static final long SERVER_INFO_POLL_MS = 30_000L;
    // 单次 getCurrent 请求的超时
    private static final long SERVER_INFO_TIMEOUT_MS = 5_000L;

    private OkHttpClient httpClient;
    private SharedPreferences prefs;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<String, ConnectionState> connections = new ConcurrentHashMap<>();
    // 原生侧维护的业务状态（JS 冻结期间也持续累积），按 addressId 隔离
    private final Map<String, BusinessState> business = new ConcurrentHashMap<>();
    // 当前主服务器 addressId，由 JS 侧通过 setPrimary 告知。
    // 只有 primary 的 currentSpeaker 变化才会直接驱动通知栏刷新。
    private volatile String primaryAddressId = "";

    private static final String PREFS_NAME = "fmo_events";
    private static final String KEY_HISTORY_PREFIX = "history_";

    @Override
    public void load() {
        httpClient = new OkHttpClient.Builder()
                .pingInterval(20, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();
        Context ctx = getContext();
        if (ctx != null) {
            prefs = ctx.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String addressId = call.getString("addressId");
        String url = call.getString("url");
        if (addressId == null || addressId.isEmpty() || url == null || url.isEmpty()) {
            call.reject("addressId and url are required");
            return;
        }

        // 若已存在同 id 连接，先彻底关闭
        ConnectionState existing = connections.get(addressId);
        if (existing != null) {
            existing.manualClose.set(true);
            existing.cancelReconnect();
            stopServerInfoPolling(existing);
            if (existing.ws != null) {
                try { existing.ws.cancel(); } catch (Exception ignore) {}
            }
        }

        String apiUrl = call.getString("apiUrl", "");
        ConnectionState state = new ConnectionState(addressId, url);
        state.apiUrl = apiUrl == null ? "" : apiUrl;
        connections.put(addressId, state);
        BusinessState bs = new BusinessState();
        business.put(addressId, bs);
        loadHistoryFromPrefs(addressId, bs);
        openWebSocket(state);
        call.resolve();
    }

    /** JS 主动触发一次服务器信息查询（用于电台切换后立即刷新）。 */
    @PluginMethod
    public void refreshServerInfo(PluginCall call) {
        String addressId = call.getString("addressId");
        if (addressId == null || addressId.isEmpty()) { call.resolve(); return; }
        ConnectionState state = connections.get(addressId);
        if (state != null) {
            fetchServerInfoOnce(state);
        }
        call.resolve();
    }

    @PluginMethod
    public void getSnapshot(PluginCall call) {
        String addressId = call.getString("addressId");
        JSObject result = new JSObject();
        JSArray list = new JSArray();
        if (addressId != null && !addressId.isEmpty()) {
            BusinessState bs = business.get(addressId);
            if (bs != null) {
                list.put(buildSnapshot(addressId, bs));
            }
        } else {
            for (Map.Entry<String, BusinessState> e : business.entrySet()) {
                list.put(buildSnapshot(e.getKey(), e.getValue()));
            }
        }
        result.put("connections", list);
        call.resolve(result);
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        String addressId = call.getString("addressId");
        if (addressId != null) {
            closeConnection(addressId);
        }
        call.resolve();
    }

    @PluginMethod
    public void disconnectAll(PluginCall call) {
        for (String id : connections.keySet().toArray(new String[0])) {
            closeConnection(id);
        }
        call.resolve();
    }

    /** JS 告知当前主服务器 addressId，空字符串表示清空。调用后会立即刷新一次通知栏。 */
    @PluginMethod
    public void setPrimary(PluginCall call) {
        String addressId = call.getString("addressId", "");
        primaryAddressId = addressId == null ? "" : addressId;
        Log.i(TAG, "setPrimary -> \"" + primaryAddressId + "\"");
        if (primaryAddressId.isEmpty()) {
            // 清空 primary：通知恢复默认文案，取消自动静音
            FmoAudioService.updateSpeakerFromEvents(getContext(), null, null, null);
            FmoAudioPlugin audioPlugin = FmoAudioPlugin.getInstance();
            if (audioPlugin != null) audioPlugin.setHostMuted(false);
        } else {
            pushPrimaryToNotification();
        }
        call.resolve();
    }

    /** JS 推送服务器名称（用作通知标题前缀） */
    @PluginMethod
    public void updateServerName(PluginCall call) {
        String addressId = call.getString("addressId");
        String name = call.getString("name", "");
        if (addressId == null) { call.resolve(); return; }
        BusinessState bs = business.get(addressId);
        if (bs != null) {
            bs.serverName = name == null ? "" : name;
        }
        if (addressId.equals(primaryAddressId)) pushPrimaryToNotification();
        call.resolve();
    }

    /** 将 primary 的最新业务状态推送给 FmoAudioService。
     *  城市名直接从 {@link GridAddressResolver} 的进程内共享缓存按 grid 取；
     *  无需走 JS 桥。未命中缓存时由 {@link #scheduleGridResolveIfNeeded} 启动异步
     *  解析，成功后会再次触发本方法刷通知。
     *  同时同步 host 发言状态到 FmoAudioPlugin 的自动静音。 */
    private void pushPrimaryToNotification() {
        String pid = primaryAddressId;
        if (pid == null || pid.isEmpty()) return;
        BusinessState bs = business.get(pid);
        if (bs == null) {
            FmoAudioService.updateSpeakerFromEvents(getContext(), null, null, null);
            FmoAudioPlugin audioPlugin = FmoAudioPlugin.getInstance();
            if (audioPlugin != null) audioPlugin.setHostMuted(false);
            return;
        }
        String sn;
        String cs;
        String grid;
        boolean isHost;
        synchronized (bs) {
            sn = bs.serverName;
            cs = bs.currentSpeaker;
            grid = bs.currentGrid;
            isHost = bs.currentIsHost;
        }
        String addr = "";
        if (grid != null && !grid.isEmpty()) {
            JSONObject cached = GridAddressResolver.get(getContext()).getCached(grid);
            if (cached != null) {
                addr = GridAddressResolver.formatCity(cached);
            }
        }
        FmoAudioService.updateSpeakerFromEvents(getContext(), sn, cs, addr);
        // 当前发言人为 host 时自动静音，否则取消自动静音
        FmoAudioPlugin audioPlugin = FmoAudioPlugin.getInstance();
        if (audioPlugin != null) {
            audioPlugin.setHostMuted(cs != null && !cs.isEmpty() && isHost);
        }
    }

    /** 当前发言的 grid 若没缓存，启动后台异步解析；成功后如果仍然是同一呼号+grid
     *  在发言，就再次刷新通知栏。 */
    private void scheduleGridResolveIfNeeded(String addressId, String callsign, String grid) {
        if (grid == null || grid.isEmpty()) return;
        GridAddressResolver resolver = GridAddressResolver.get(getContext());
        if (resolver.getCached(grid) != null) return; // 已有，pushPrimary 当场已经用上
        resolver.resolveAsync(grid, new GridAddressResolver.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                // 只有在当前还是这条 grid 才刷新，避免过时回调抓乱通知
                BusinessState bs = business.get(addressId);
                if (bs == null) return;
                boolean stillMatch;
                synchronized (bs) {
                    stillMatch = grid.equals(bs.currentGrid);
                }
                if (stillMatch && addressId.equals(primaryAddressId)) {
                    pushPrimaryToNotification();
                }
            }

            @Override
            public void onError(Throwable t) {
                // 静默，缓存不命中就维持无地址通知
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        for (String id : connections.keySet().toArray(new String[0])) {
            closeConnection(id);
        }
        super.handleOnDestroy();
    }

    private void closeConnection(String addressId) {
        ConnectionState state = connections.remove(addressId);
        business.remove(addressId);
        if (state == null) return;
        state.manualClose.set(true);
        state.cancelReconnect();
        stopServerInfoPolling(state);
        if (state.ws != null) {
            try { state.ws.cancel(); } catch (Exception ignore) {}
        }
    }

    private void openWebSocket(final ConnectionState state) {
        if (state.manualClose.get()) return;
        Request.Builder builder = new Request.Builder().url(state.url);
        WebViewAuthHelper.addAuthHeaders(getContext(), builder, state.url);
        Request request = builder.build();
        Log.i(TAG, "[" + state.addressId + "] opening WS: " + state.url);
        state.ws = httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket ws, @NonNull Response response) {
                Log.i(TAG, "[" + state.addressId + "] onOpen");
                state.reconnectAttempts.set(0);
                emitStatus(state.addressId, "connected");
                // 上线后启动服务器信息轮询（立即拉一次 + 定时 30s）
                startServerInfoPolling(state);
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull String text) {
                Log.i(TAG, "[" + state.addressId + "] recv len=" + text.length()
                        + " preview=" + text.substring(0, Math.min(120, text.length())));
                processBusinessMessage(state.addressId, text);
                emitMessage(state.addressId, text);
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull ByteString bytes) {
                String s = bytes.utf8();
                Log.i(TAG, "[" + state.addressId + "] recv(bytes) len=" + s.length()
                        + " preview=" + s.substring(0, Math.min(120, s.length())));
                processBusinessMessage(state.addressId, s);
                emitMessage(state.addressId, s);
            }

            @Override
            public void onClosing(@NonNull WebSocket ws, int code, @NonNull String reason) {
                try { ws.close(1000, null); } catch (Exception ignore) {}
            }

            @Override
            public void onClosed(@NonNull WebSocket ws, int code, @NonNull String reason) {
                Log.w(TAG, "[" + state.addressId + "] onClosed code=" + code + " reason=" + reason);
                scheduleReconnect(state);
            }

            @Override
            public void onFailure(@NonNull WebSocket ws, @NonNull Throwable t, Response response) {
                Log.w(TAG, "[" + state.addressId + "] onFailure: " + t.getMessage());
                scheduleReconnect(state);
            }
        });
    }

    private void scheduleReconnect(final ConnectionState state) {
        // 连接断开期间停掉轮询，等 onOpen 再重启
        stopServerInfoPolling(state);
        // 已被主动关闭或已被新连接替换，不再重连
        if (state.manualClose.get() || connections.get(state.addressId) != state) {
            emitStatus(state.addressId, "disconnected");
            return;
        }
        int attempts = state.reconnectAttempts.getAndIncrement();
        long delay = BACKOFF_MS[Math.min(attempts, BACKOFF_MS.length - 1)];
        Log.i(TAG, "[" + state.addressId + "] reconnect in " + delay + "ms (attempt " + (attempts + 1) + ")");
        emitStatus(state.addressId, "reconnecting");

        state.cancelReconnect();
        state.reconnectTask = new Runnable() {
            @Override
            public void run() {
                if (!state.manualClose.get() && connections.get(state.addressId) == state) {
                    openWebSocket(state);
                }
            }
        };
        handler.postDelayed(state.reconnectTask, delay);
    }

    private void emitMessage(String addressId, String text) {
        JSObject obj = new JSObject();
        obj.put("addressId", addressId);
        obj.put("data", text);
        notifyListeners("message", obj);
    }

    private void emitStatus(String addressId, String status) {
        JSObject obj = new JSObject();
        obj.put("addressId", addressId);
        obj.put("status", status);
        notifyListeners("status", obj);
    }

    // ========== 服务器信息（station:getCurrent）轮询 ==========
    /** 启动 / 重启 addressId 对应的服务器信息轮询。不重入，有么先停。 */
    private void startServerInfoPolling(final ConnectionState state) {
        if (state.apiUrl == null || state.apiUrl.isEmpty()) return;
        stopServerInfoPolling(state);
        Runnable task = new Runnable() {
            @Override
            public void run() {
                if (state.manualClose.get() || connections.get(state.addressId) != state) return;
                fetchServerInfoOnce(state);
                handler.postDelayed(this, SERVER_INFO_POLL_MS);
            }
        };
        state.serverInfoPollTask = task;
        handler.post(task);
    }

    /** 停掉周期任务 + 取消尚在执行的短命 WS。 */
    private void stopServerInfoPolling(ConnectionState state) {
        Runnable t = state.serverInfoPollTask;
        if (t != null) {
            handler.removeCallbacks(t);
            state.serverInfoPollTask = null;
        }
        WebSocket sws = state.serverInfoWs;
        if (sws != null) {
            try { sws.cancel(); } catch (Exception ignore) {}
            state.serverInfoWs = null;
        }
    }

    /** 建短命 WS 打开 {apiUrl}（ws://host/ws）发一条 station:getCurrent 拿服务器信息。 */
    private void fetchServerInfoOnce(final ConnectionState state) {
        if (state.apiUrl == null || state.apiUrl.isEmpty()) return;
        // 先停掉上次未完成的
        WebSocket prev = state.serverInfoWs;
        if (prev != null) {
            try { prev.cancel(); } catch (Exception ignore) {}
            state.serverInfoWs = null;
        }
        // OkHttp 的 Request.Builder().url() 仅接受 http/https，这里把 ws/wss 映射一下
        String reqUrl = state.apiUrl;
        if (reqUrl.startsWith("wss://")) {
            reqUrl = "https://" + reqUrl.substring("wss://".length());
        } else if (reqUrl.startsWith("ws://")) {
            reqUrl = "http://" + reqUrl.substring("ws://".length());
        }
        final AtomicBoolean done = new AtomicBoolean(false);
        Request req;
        try {
            Request.Builder rbuilder = new Request.Builder().url(reqUrl);
            WebViewAuthHelper.addAuthHeaders(getContext(), rbuilder, state.apiUrl);
            req = rbuilder.build();
        } catch (Exception e) {
            Log.w(TAG, "[" + state.addressId + "] invalid apiUrl=" + state.apiUrl + " err=" + e.getMessage());
            return;
        }
        final WebSocket[] holder = new WebSocket[1];
        WebSocket ws = httpClient.newWebSocket(req, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket s, @NonNull Response response) {
                try {
                    JSONObject body = new JSONObject();
                    body.put("type", "station");
                    body.put("subType", "getCurrent");
                    body.put("data", new JSONObject());
                    s.send(body.toString());
                } catch (Exception e) {
                    try { s.cancel(); } catch (Exception ignore) {}
                }
            }

            @Override
            public void onMessage(@NonNull WebSocket s, @NonNull String text) {
                if (done.getAndSet(true)) return;
                handleServerInfoResponse(state, text);
                try { s.close(1000, null); } catch (Exception ignore) {}
                if (state.serverInfoWs == holder[0]) state.serverInfoWs = null;
            }

            @Override
            public void onMessage(@NonNull WebSocket s, @NonNull ByteString bytes) {
                if (done.getAndSet(true)) return;
                handleServerInfoResponse(state, bytes.utf8());
                try { s.close(1000, null); } catch (Exception ignore) {}
                if (state.serverInfoWs == holder[0]) state.serverInfoWs = null;
            }

            @Override
            public void onFailure(@NonNull WebSocket s, @NonNull Throwable t, Response response) {
                if (state.serverInfoWs == holder[0]) state.serverInfoWs = null;
            }

            @Override
            public void onClosed(@NonNull WebSocket s, int code, @NonNull String reason) {
                if (state.serverInfoWs == holder[0]) state.serverInfoWs = null;
            }
        });
        holder[0] = ws;
        state.serverInfoWs = ws;
        // 超时处理
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                if (done.get()) return;
                try { ws.cancel(); } catch (Exception ignore) {}
                if (state.serverInfoWs == ws) state.serverInfoWs = null;
            }
        }, SERVER_INFO_TIMEOUT_MS);
    }

    /** 解析 station:getCurrentResponse 结果，写入 BusinessState.serverName + 推 JS + 刷通知。 */
    private void handleServerInfoResponse(ConnectionState state, String text) {
        try {
            JSONObject msg = new JSONObject(text);
            if (!"station".equals(msg.optString("type"))) return;
            String sub = msg.optString("subType", "");
            if (!sub.endsWith("Response")) return;
            String requestSub = sub.substring(0, sub.length() - "Response".length());
            if (!"getCurrent".equals(requestSub)) return;
            if (msg.optInt("code", -1) != 0) return;
            JSONObject data = msg.optJSONObject("data");
            if (data == null) return;
            String uid = data.optString("uid", "");
            String name = data.optString("name", "");
            if (uid.isEmpty()) return;

            BusinessState bs = business.get(state.addressId);
            boolean changed = false;
            if (bs != null) {
                synchronized (bs) {
                    if (!name.equals(bs.serverName)) {
                        bs.serverName = name;
                        changed = true;
                    }
                }
            }
            Log.i(TAG, "[" + state.addressId + "] serverInfo uid=" + uid + " name=\"" + name + "\" changed=" + changed);

            // 推给 JS 更新 serverInfoMap
            JSObject evt = new JSObject();
            evt.put("addressId", state.addressId);
            evt.put("uid", uid);
            evt.put("name", name);
            notifyListeners("serverInfo", evt);

            // 主服务器名变动时立刻刷通知栏
            if (changed && state.addressId.equals(primaryAddressId)) {
                pushPrimaryToNotification();
            }
        } catch (Exception e) {
            Log.w(TAG, "[" + state.addressId + "] server info parse failed: " + e.getMessage());
        }
    }

    /**
     * 解析 qso/callsign 消息，更新原生侧 currentSpeaker 与 history。
     * 业务规则与 JS 端 handleEventMessage 完全一致：
     * - 开始发言：将所有未结束记录 endTime=now；若历史里已有同 callsign 记录则提到队首并重置
     *   startTime/endTime/grid，否则新增一条；currentSpeaker = callsign
     * - 结束发言：将所有未结束记录 endTime=now；currentSpeaker = ""
     * - 每次操作后清理 (endTime||startTime) < now-1h 的记录
     */
    private void processBusinessMessage(String addressId, String text) {
        BusinessState bs = business.get(addressId);
        if (bs == null) return;
        try {
            JSONObject msg = new JSONObject(text);
            if (!"qso".equals(msg.optString("type"))) return;
            if (!"callsign".equals(msg.optString("subType"))) return;
            JSONObject data = msg.optJSONObject("data");
            if (data == null) return;

            String callsign = data.optString("callsign", "");
            boolean isSpeaking = data.optBoolean("isSpeaking", false);
            boolean isHost = data.optBoolean("isHost", false);
            String grid = data.optString("grid", "");
            long now = System.currentTimeMillis();

            synchronized (bs) {
                if (isSpeaking && callsign != null && !callsign.isEmpty()) {
                    // 结束所有未结束记录
                    for (HistoryEntry h : bs.history) {
                        if (h.endTime == null) h.endTime = now;
                    }
                    bs.currentSpeaker = callsign;
                    bs.currentGrid = grid;
                    bs.currentIsHost = isHost;
                    // 查找已有同 callsign 记录
                    HistoryEntry existing = null;
                    Iterator<HistoryEntry> it = bs.history.iterator();
                    while (it.hasNext()) {
                        HistoryEntry h = it.next();
                        if (callsign.equals(h.callsign)) {
                            existing = h;
                            it.remove();
                            break;
                        }
                    }
                    if (existing != null) {
                        existing.startTime = now;
                        existing.endTime = null;
                        existing.grid = grid;
                        bs.history.addFirst(existing);
                    } else {
                        bs.history.addFirst(new HistoryEntry(callsign, grid, now));
                    }
                } else {
                    for (HistoryEntry h : bs.history) {
                        if (h.endTime == null) h.endTime = now;
                    }
                    bs.currentSpeaker = "";
                    bs.currentGrid = "";
                    bs.currentIsHost = false;
                }
                // 清理 > 1h
                long cutoff = now - HISTORY_RETENTION_MS;
                Iterator<HistoryEntry> it = bs.history.iterator();
                while (it.hasNext()) {
                    HistoryEntry h = it.next();
                    long t = h.endTime != null ? h.endTime : h.startTime;
                    if (t < cutoff) it.remove();
                }
            }
            // 若为主服务器，立即刷新通知栏（纯原生链路，不经 WebView）
            if (addressId.equals(primaryAddressId)) {
                pushPrimaryToNotification();
            }
            // 持久化发言历史
            saveHistoryToPrefs(addressId, bs);
            // 若本次开始发言的 grid 还没缓存，启动原生侧异步解析；
            // 成功后若该 grid 仍是当前发言人的 grid，会再次刷通知补上城市名
            if (isSpeaking && callsign != null && !callsign.isEmpty()) {
                scheduleGridResolveIfNeeded(addressId, callsign, grid);
            }
        } catch (Exception e) {
            Log.w(TAG, "[" + addressId + "] parse business failed: " + e.getMessage());
        }
    }

    private JSObject buildSnapshot(String addressId, BusinessState bs) {
        JSObject obj = new JSObject();
        obj.put("addressId", addressId);
        synchronized (bs) {
            // 进场先清理一下
            long cutoff = System.currentTimeMillis() - HISTORY_RETENTION_MS;
            Iterator<HistoryEntry> it = bs.history.iterator();
            while (it.hasNext()) {
                HistoryEntry h = it.next();
                long t = h.endTime != null ? h.endTime : h.startTime;
                if (t < cutoff) it.remove();
            }
            obj.put("currentSpeaker", bs.currentSpeaker == null ? "" : bs.currentSpeaker);
            obj.put("currentGrid", bs.currentGrid == null ? "" : bs.currentGrid);
            obj.put("currentIsHost", bs.currentIsHost);
            JSArray arr = new JSArray();
            for (HistoryEntry h : bs.history) {
                JSObject entry = new JSObject();
                entry.put("callsign", h.callsign);
                entry.put("grid", h.grid == null ? "" : h.grid);
                entry.put("startTime", h.startTime);
                if (h.endTime != null) {
                    entry.put("endTime", h.endTime.longValue());
                } else {
                    entry.put("endTime", JSONObject.NULL);
                }
                arr.put(entry);
            }
            obj.put("history", arr);
        }
        return obj;
    }

    /** 将发言历史持久化到 SharedPreferences（异步写入）。 */
    private void saveHistoryToPrefs(String addressId, BusinessState bs) {
        if (prefs == null) return;
        synchronized (bs) {
            long cutoff = System.currentTimeMillis() - HISTORY_RETENTION_MS;
            JSONArray arr = new JSONArray();
            for (HistoryEntry h : bs.history) {
                long t = h.endTime != null ? h.endTime : h.startTime;
                if (t < cutoff) continue;
                try {
                    JSONObject obj = new JSONObject();
                    obj.put("callsign", h.callsign);
                    obj.put("grid", h.grid == null ? "" : h.grid);
                    obj.put("startTime", h.startTime);
                    obj.put("endTime", h.endTime != null ? h.endTime.longValue() : JSONObject.NULL);
                    arr.put(obj);
                } catch (Exception e) {
                    Log.w(TAG, "saveHistoryToPrefs serialize failed", e);
                }
            }
            prefs.edit().putString(KEY_HISTORY_PREFIX + addressId, arr.toString()).apply();
        }
    }

    /** 从 SharedPreferences 加载发言历史到 BusinessState。
     *  仅在 connect() 创建新 BusinessState 后调用一次。
     *  按 callsign 去重（与实时处理逻辑一致），保留最新记录。
     *  进行中的记录（endTime=null）视为已结束，避免重启后残留脏状态。 */
    private void loadHistoryFromPrefs(String addressId, BusinessState bs) {
        if (prefs == null) return;
        String json = prefs.getString(KEY_HISTORY_PREFIX + addressId, null);
        if (json == null || json.isEmpty()) return;
        try {
            JSONArray arr = new JSONArray(json);
            long cutoff = System.currentTimeMillis() - HISTORY_RETENTION_MS;
            java.util.Set<String> seen = new java.util.HashSet<>();
            synchronized (bs) {
                for (int i = 0; i < arr.length(); i++) {
                    JSONObject obj = arr.getJSONObject(i);
                    long startTime = obj.optLong("startTime", 0);
                    if (startTime < cutoff) continue;
                    String callsign = obj.optString("callsign", "");
                    if (callsign.isEmpty()) continue;
                    // 按 callsign 去重：JSON 数组按时间降序排列，先遇到的更新
                    if (!seen.add(callsign)) continue;
                    String grid = obj.optString("grid", "");
                    HistoryEntry entry = new HistoryEntry(callsign, grid, startTime);
                    if (!obj.isNull("endTime")) {
                        entry.endTime = obj.getLong("endTime");
                    } else {
                        // 进行中的记录在重启后视为已结束
                        entry.endTime = startTime;
                    }
                    bs.history.add(entry);
                }
            }
            Log.i(TAG, "[" + addressId + "] loaded " + bs.history.size() + " history entries from prefs");
        } catch (Exception e) {
            Log.w(TAG, "[" + addressId + "] loadHistoryFromPrefs parse failed", e);
        }
    }

    private static class HistoryEntry {
        String callsign;
        String grid;
        long startTime;
        Long endTime; // null = 进行中

        HistoryEntry(String callsign, String grid, long startTime) {
            this.callsign = callsign;
            this.grid = grid;
            this.startTime = startTime;
            this.endTime = null;
        }
    }

    private static class BusinessState {
        volatile String currentSpeaker = "";
        volatile String currentGrid = "";
        volatile boolean currentIsHost = false; // 当前发言人是否为 host
        volatile String serverName = "";
        final LinkedList<HistoryEntry> history = new LinkedList<>();
    }

    private class ConnectionState {
        final String addressId;
        final String url;
        volatile String apiUrl = ""; // ws://host/ws，用于 getCurrent 短命请求
        volatile WebSocket ws;
        final AtomicInteger reconnectAttempts = new AtomicInteger(0);
        final AtomicBoolean manualClose = new AtomicBoolean(false);
        volatile Runnable reconnectTask;
        volatile Runnable serverInfoPollTask;
        volatile WebSocket serverInfoWs;

        ConnectionState(String addressId, String url) {
            this.addressId = addressId;
            this.url = url;
        }

        void cancelReconnect() {
            Runnable t = reconnectTask;
            if (t != null) {
                handler.removeCallbacks(t);
                reconnectTask = null;
            }
        }
    }
}
