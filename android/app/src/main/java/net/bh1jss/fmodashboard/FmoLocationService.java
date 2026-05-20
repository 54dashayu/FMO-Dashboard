package net.bh1jss.fmodashboard;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayDeque;
import java.util.Date;
import java.util.Deque;
import java.util.Iterator;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.WebSocket;
import okhttp3.WebSocketListener;

/**
 * FmoLocationService: LOCATION 类型前台服务。
 *
 * 定位策略（v2，已重构以减少漂移）：
 *   1. 仅使用 GPS_PROVIDER 持续监听（不接受 NETWORK_PROVIDER 入池，避免基站/WiFi 漂移）；
 *   2. 维护最近 10 个有效点的环形缓冲池，入池前做多重过滤
 *      （来源/精度/速度合理性/时钟有效性）；
 *   3. 上报时从缓冲池按"精度+新鲜度"加权评分选最佳点；
 *   4. 模式切换：
 *        - 短间隔 (≤ {@link #CONTINUOUS_THRESHOLD_SECONDS} s) 用"持续监听"模式，
 *          Service 启动起 GPS 常开；
 *        - 长间隔（&gt; 该阈值）用"预热"模式，每次报告前
 *          {@link #WARMUP_BEFORE_REPORT_MS} 启动 GPS 收点，上报完后立即关闭以省电；
 *   5. 仅当缓冲池完全无点（GPS 长时间无信号）才回退 NETWORK_PROVIDER 单次定位，
 *      且精度门限收紧到 {@link #NETWORK_ACCURACY_THRESHOLD}；
 *   6. 静止检测：连续 N 个点都在 {@link #STATIONARY_RADIUS} 内即视为静止，跳过上报；
 *   7. {@code sLastReportedLat/Lng/Time} 持久化到 SharedPreferences，重启不失忆。
 *
 * 息屏后由前台服务保活，不受 WebView JS 线程挂起影响。
 * 通过 OkHttp WebSocket + WebViewAuthHelper 认证头与 FMO 通信。
 */
public class FmoLocationService extends Service {

    private static final String TAG = "FmoLocationService";
    public static final String CHANNEL_ID = "fmo_location_report";
    public static final int NOTIFICATION_ID = 0x46_4D_4F_02;

    public static final String ACTION_START = "net.bh1jss.fmodashboard.FMO_LOCATION_START";
    public static final String ACTION_STOP = "net.bh1jss.fmodashboard.FMO_LOCATION_STOP";
    public static final String ACTION_UPDATE = "net.bh1jss.fmodashboard.FMO_LOCATION_UPDATE";
    public static final String ACTION_ALARM = "net.bh1jss.fmodashboard.FMO_LOCATION_ALARM";
    public static final String ACTION_WARMUP = "net.bh1jss.fmodashboard.FMO_LOCATION_WARMUP";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_INTERVAL_SECONDS = "intervalSeconds";
    public static final String EXTRA_FMO_URL = "fmoUrl";

    // ---- 调参常量 ----

    /** GPS 精度门限：> 30m 的点入池前直接丢弃 */
    private static final float GPS_ACCURACY_THRESHOLD = 30f;
    /** NETWORK 兜底定位精度门限（仅在缓冲池完全为空时使用） */
    private static final float NETWORK_ACCURACY_THRESHOLD = 50f;
    /** 与上一次上报点的偏移 < 此值时跳过本次上报 */
    private static final float DRIFT_THRESHOLD = 1.0f;
    /** 缓冲池点的最大存活时间，超过自动过期 */
    private static final long BUFFER_MAX_AGE_MS = 60_000L;
    /** 缓冲池容量 */
    private static final int BUFFER_CAPACITY = 10;
    /** 速度合理性上限：> 50 m/s (180 km/h) 的连续点视为漂移 */
    private static final double MAX_REASONABLE_SPEED = 50.0;
    /** 持续监听最小间隔（GPS 采样频率） */
    private static final long CONTINUOUS_MIN_TIME_MS = 1000L;
    /** 短间隔阈值：interval ≤ 此值时启用持续监听模式；否则使用预热模式 */
    private static final int CONTINUOUS_THRESHOLD_SECONDS = 60;
    /** 预热模式下，每次报告前预热 GPS 的时长 */
    private static final long WARMUP_BEFORE_REPORT_MS = 10_000L;
    /** 报告时等待新鲜点的最大时长（NETWORK 兜底前的窗口） */
    private static final long FRESH_FIX_TIMEOUT_MS = 30_000L;
    /** 静止检测：最近 N 个点都在 STATIONARY_RADIUS 内视为静止 */
    private static final int STATIONARY_SAMPLE_COUNT = 5;
    private static final float STATIONARY_RADIUS = 1.0f;
    /** 时钟有效性：GPS 上报时钟与系统时钟相差超过此值视为异常点 */
    private static final long MAX_CLOCK_SKEW_MS = 5L * 60L * 1000L;

    /**
     * Service 启动后首次上报的"GPS 收集窗口"时长：
     * 窗口期间不上报，等缓冲池积累点；超时仍无 GPS 点 → 走 NETWORK 兜底。
     */
    private static final long INITIAL_COLLECTION_WINDOW_MS = 15_000L;
    /**
     * 首次上报"快速通道"精度阈值：
     * 收集窗口期间一旦有 accuracy ≤ 此值的点入池 → 立刻上报，不必等满窗口。
     */
    private static final float FAST_REPORT_ACCURACY = 10f;

    // ---- 持久化 ----
    private static final String PREFS_NAME = "fmo_location_state";
    private static final String PREF_LAST_LAT = "last_lat";
    private static final String PREF_LAST_LNG = "last_lng";
    private static final String PREF_LAST_TIME = "last_time";

    private static volatile String sTitle = "FMO 位置上报中";
    private static volatile String sText = "正在定时上报GPS位置";
    private static volatile int sIntervalSeconds = 300;
    private static volatile String sFmoUrl = "";
    private static volatile double sLastReportedLat = 0;
    private static volatile double sLastReportedLng = 0;
    private static volatile long sLastReportTime = 0;

    private static volatile FmoLocationService sInstance;

    private OkHttpClient httpClient;
    private LocationManager locationManager;
    private final Handler reportHandler = new Handler(Looper.getMainLooper());

    // ---- 持续监听 ----
    private LocationListener continuousListener;
    private boolean continuousActive = false;

    // ---- 点缓冲池 ----
    private final Deque<LocationSample> buffer = new ArrayDeque<>(BUFFER_CAPACITY);

    // ---- 高级卡尔曼滤波器 ----
    private final AdvancedKalmanFilter advancedKalmanFilter = new AdvancedKalmanFilter();

    // ---- 首次上报状态（Service 启动后的 GPS 收集窗口） ----
    /** 是否处于"首次上报等待中"状态 */
    private volatile boolean awaitingFirstReport = false;
    /** 首次上报窗口超时任务（窗口结束触发 doReport 或 NETWORK 兜底） */
    private Runnable initialCollectionTimeout;
    /** 首次上报时刻（仅用于日志） */
    private long firstReportStartMs = 0;

    // ---- NETWORK 兜底状态 ----
    private LocationListener networkFallbackListener;
    private Runnable networkFallbackTimeout;

    /** 缓冲池条目：携带系统接收时刻，避免 GPS 时钟跳变 */
    private static final class LocationSample {
        final Location loc;
        final long receivedAt;
        LocationSample(Location loc, long receivedAt) {
            this.loc = loc;
            this.receivedAt = receivedAt;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        ensureChannel();
        httpClient = new OkHttpClient.Builder()
                .pingInterval(20, TimeUnit.SECONDS)
                .readTimeout(0, TimeUnit.MILLISECONDS)
                .build();
        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
        restoreLastReported();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onStartCommand action=" + action);

        if (ACTION_UPDATE.equals(action) && intent != null) {
            applyExtras(intent);
            refreshNotification();
            applyMode();
            startTimer();
            return START_STICKY;
        }

        if (ACTION_ALARM.equals(action)) {
            doReport();
            // 准备下一个周期
            startTimer();
            // 预热模式：上报完后立即关 GPS，并安排下个周期的预热
            if (sIntervalSeconds > CONTINUOUS_THRESHOLD_SECONDS) {
                stopContinuousGps();
                scheduleWarmup();
            }
            return START_STICKY;
        }

        if (ACTION_WARMUP.equals(action)) {
            Log.i(TAG, "warmup: starting GPS before next report");
            startContinuousGps();
            return START_STICKY;
        }

        if (intent != null) applyExtras(intent);

        Notification notification = buildNotification(this, sTitle, sText);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (ACTION_STOP.equals(action)) {
            stopTimer();
            stopContinuousGps();
            cancelNetworkFallback();
            cancelWarmup();
            cancelInitialCollection();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        // 根据当前 interval 选择模式
        applyMode();
        // 启动定时上报循环
        startTimer();
        // 启动"首次上报"收集窗口（不立刻 doReport，等首个 GPS 点入池）
        startInitialCollection();

        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopTimer();
        stopContinuousGps();
        cancelNetworkFallback();
        cancelWarmup();
        cancelInitialCollection();
        if (sInstance == this) sInstance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void applyExtras(Intent intent) {
        String t = intent.getStringExtra(EXTRA_TITLE);
        String x = intent.getStringExtra(EXTRA_TEXT);
        int i = intent.getIntExtra(EXTRA_INTERVAL_SECONDS, 0);
        String url = intent.getStringExtra(EXTRA_FMO_URL);
        if (t != null && !t.isEmpty()) sTitle = t;
        if (x != null) sText = x;
        if (i > 0) sIntervalSeconds = i;
        if (url != null && !url.isEmpty()) sFmoUrl = url;
    }

    private void refreshNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIFICATION_ID, buildNotification(this, sTitle, sText));
        }
    }

    private static Notification buildNotification(Context ctx, String title, String text) {
        Intent launch = new Intent(Intent.ACTION_VIEW, android.net.Uri.parse("fmodashboard://location-report"));
        PendingIntent contentPI = PendingIntent.getActivity(
                ctx, 0, launch,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(contentPI)
                .setOngoing(true)
                .setSilent(true)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
                .setOnlyAlertOnce(true);
        return b.build();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "FMO 位置上报", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("显示位置上报服务运行状态");
                ch.setShowBadge(false);
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
        }
    }

    // ---- 持久化（重启失忆问题） ----

    private void restoreLastReported() {
        try {
            SharedPreferences sp = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
            double lat = Double.longBitsToDouble(sp.getLong(PREF_LAST_LAT, Double.doubleToLongBits(0)));
            double lng = Double.longBitsToDouble(sp.getLong(PREF_LAST_LNG, Double.doubleToLongBits(0)));
            long time = sp.getLong(PREF_LAST_TIME, 0);
            if (time > 0 && lat != 0) {
                sLastReportedLat = lat;
                sLastReportedLng = lng;
                sLastReportTime = time;
                Log.i(TAG, "restoreLastReported lat=" + lat + " lng=" + lng + " time=" + time);
            }
        } catch (Exception e) {
            Log.w(TAG, "restoreLastReported failed", e);
        }
    }

    private void persistLastReported(double lat, double lng, long time) {
        try {
            getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                    .edit()
                    .putLong(PREF_LAST_LAT, Double.doubleToLongBits(lat))
                    .putLong(PREF_LAST_LNG, Double.doubleToLongBits(lng))
                    .putLong(PREF_LAST_TIME, time)
                    .apply();
        } catch (Exception e) {
            Log.w(TAG, "persistLastReported failed", e);
        }
    }

    // ---- 模式切换：持续监听 vs 预热 ----

    /**
     * 根据当前 sIntervalSeconds 决定使用哪种 GPS 收点策略：
     * 短间隔 → 持续监听；长间隔 → 仅在报告前预热。
     */
    private void applyMode() {
        if (sIntervalSeconds <= CONTINUOUS_THRESHOLD_SECONDS) {
            cancelWarmup();
            startContinuousGps();
        } else {
            stopContinuousGps();
            // 预热将在 doReport 前的 (interval - WARMUP) 时刻触发
            scheduleWarmup();
        }
    }

    /** 启动 GPS 持续监听，所有有效点入缓冲池 */
    private void startContinuousGps() {
        if (continuousActive) return;
        if (locationManager == null) return;
        if (!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            Log.w(TAG, "startContinuousGps: GPS provider disabled");
            return;
        }
        continuousListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                addToBuffer(location);
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };
        try {
            locationManager.requestLocationUpdates(
                    LocationManager.GPS_PROVIDER,
                    CONTINUOUS_MIN_TIME_MS,
                    0f,
                    continuousListener,
                    Looper.getMainLooper());
            continuousActive = true;
            Log.i(TAG, "startContinuousGps minTimeMs=" + CONTINUOUS_MIN_TIME_MS);
        } catch (SecurityException e) {
            Log.w(TAG, "startContinuousGps: permission denied", e);
            continuousListener = null;
        }
    }

    private void stopContinuousGps() {
        if (!continuousActive) return;
        if (continuousListener != null && locationManager != null) {
            try {
                locationManager.removeUpdates(continuousListener);
            } catch (Exception ignore) {}
        }
        continuousListener = null;
        continuousActive = false;
        Log.i(TAG, "stopContinuousGps");
    }

    /** 预热模式：在下一次 doReport 前 WARMUP_BEFORE_REPORT_MS 启动 GPS */
    private void scheduleWarmup() {
        cancelWarmup();
        long intervalMs = sIntervalSeconds * 1000L;
        long delay = intervalMs - WARMUP_BEFORE_REPORT_MS;
        if (delay < 0) delay = 0;

        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent i = new Intent(this, FmoLocationService.class).setAction(ACTION_WARMUP);
        PendingIntent pi = PendingIntent.getService(this, 0, i,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        long triggerAt = System.currentTimeMillis() + delay;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
        Log.i(TAG, "scheduleWarmup (AlarmManager) delay=" + delay);
    }

    private void cancelWarmup() {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            Intent i = new Intent(this, FmoLocationService.class).setAction(ACTION_WARMUP);
            PendingIntent pi = PendingIntent.getService(this, 0, i,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            am.cancel(pi);
        }
        Log.i(TAG, "cancelWarmup (AlarmManager)");
    }

    // ---- 首次上报：GPS 收集窗口 ----

    /**
     * Service 启动后开启"首次上报收集窗口"：
     *   1. 立刻刷新通知栏文案为"正在获取首次定位…"；
     *   2. 不立刻 doReport，等待缓冲池积累 GPS 点；
     *   3. addToBuffer 中检测到 accuracy ≤ FAST_REPORT_ACCURACY 的点 → 提前触发 doReport；
     *   4. 收集窗口超时（INITIAL_COLLECTION_WINDOW_MS）：
     *        - 缓冲池有点 → doReport（选最佳）
     *        - 缓冲池仍空 → NETWORK 兜底
     */
    private void startInitialCollection() {
        cancelInitialCollection();
        awaitingFirstReport = true;
        firstReportStartMs = System.currentTimeMillis();

        sText = "正在获取首次定位… (窗口 " + (INITIAL_COLLECTION_WINDOW_MS / 1000) + "s)";
        refreshNotification();
        Log.i(TAG, "startInitialCollection: collecting GPS for "
                + INITIAL_COLLECTION_WINDOW_MS + "ms");

        initialCollectionTimeout = new Runnable() {
            @Override
            public void run() {
                if (!awaitingFirstReport) return;
                long elapsed = System.currentTimeMillis() - firstReportStartMs;
                Log.i(TAG, "initialCollection: window timed out after " + elapsed + "ms");
                awaitingFirstReport = false;
                initialCollectionTimeout = null;
                // 窗口结束 → 走正常 doReport 流程（缓冲池有点用缓冲，没点走NETWORK兜底）
                doReport();
            }
        };
        reportHandler.postDelayed(initialCollectionTimeout, INITIAL_COLLECTION_WINDOW_MS);
    }

    private void cancelInitialCollection() {
        awaitingFirstReport = false;
        if (initialCollectionTimeout != null) {
            reportHandler.removeCallbacks(initialCollectionTimeout);
            initialCollectionTimeout = null;
        }
    }

    /**
     * 在 addToBuffer 中调用：检测刚入池的点是否满足"快速首次上报"条件
     * （仍在首次上报窗口内 且 accuracy ≤ FAST_REPORT_ACCURACY）。
     */
    private void checkFastFirstReport(Location loc) {
        if (!awaitingFirstReport) return;
        if (!loc.hasAccuracy() || loc.getAccuracy() > FAST_REPORT_ACCURACY) return;
        long elapsed = System.currentTimeMillis() - firstReportStartMs;
        Log.i(TAG, "fastFirstReport: high-accuracy fix arrived in " + elapsed
                + "ms (accuracy=" + loc.getAccuracy() + "m), triggering early report");
        cancelInitialCollection();
        // 立刻触发首次上报
        doReport();
    }

    // ---- 缓冲池管理 ----

    /**
     * 接收一个 GPS 点，做来源/精度/速度/时钟过滤后入池。
     * 仅接受 GPS_PROVIDER；NETWORK_PROVIDER 的点完全不入池。
     */
    private synchronized void addToBuffer(Location loc) {
        if (loc == null) return;
        if (!LocationManager.GPS_PROVIDER.equals(loc.getProvider())) {
            // 仅接受 GPS；NETWORK 点不应入池
            return;
        }
        // 精度校验
        if (!loc.hasAccuracy() || loc.getAccuracy() > GPS_ACCURACY_THRESHOLD) {
            return;
        }
        // 时钟有效性
        long now = System.currentTimeMillis();
        if (Math.abs(now - loc.getTime()) > MAX_CLOCK_SKEW_MS) {
            Log.w(TAG, "addToBuffer: clock skew too large, drop");
            return;
        }
        // 速度合理性：与缓冲池最新一个有效点比较
        LocationSample latest = buffer.peekLast();
        if (latest != null) {
            float[] d = new float[1];
            Location.distanceBetween(
                    latest.loc.getLatitude(), latest.loc.getLongitude(),
                    loc.getLatitude(), loc.getLongitude(), d);
            double dtSec = (now - latest.receivedAt) / 1000.0;
            if (dtSec > 0.1) {
                double speed = d[0] / dtSec;
                if (speed > MAX_REASONABLE_SPEED) {
                    Log.w(TAG, "addToBuffer: speed too high (" + speed + " m/s), drop as drift");
                    return;
                }
            }
        }
        // 入池，容量超限弹出最老
        while (buffer.size() >= BUFFER_CAPACITY) {
            buffer.pollFirst();
        }

        // ---- 高级卡尔曼滤波：平滑坐标 ----
        double[] smoothed = advancedKalmanFilter.process(loc);
        if (smoothed != null) {
            loc.setLatitude(smoothed[0]);
            loc.setLongitude(smoothed[1]);
        }

        buffer.offerLast(new LocationSample(loc, now));

        // 清理过期点
        purgeExpired(now);

        // 若处于首次上报收集窗口且本次点精度优秀 → 提前触发首次上报
        // 注意：checkFastFirstReport 内部会再校验 awaitingFirstReport，避免并发问题
        checkFastFirstReport(loc);
    }

    private synchronized void purgeExpired(long now) {
        Iterator<LocationSample> it = buffer.iterator();
        while (it.hasNext()) {
            LocationSample s = it.next();
            if (now - s.receivedAt > BUFFER_MAX_AGE_MS) {
                it.remove();
            } else {
                // ArrayDeque 是 FIFO，找到第一个未过期的就可以停了
                break;
            }
        }
    }

    /**
     * 从缓冲池选最佳点：精度权重 0.7 + 新鲜度权重 0.3。
     * 返回 null 表示池中无有效点。
     */
    private synchronized Location pickBestLocation() {
        long now = System.currentTimeMillis();
        purgeExpired(now);
        if (buffer.isEmpty()) return null;
        Location best = null;
        double bestScore = -1;
        for (LocationSample s : buffer) {
            double accuracyScore = 100.0 / (s.loc.getAccuracy() + 5);
            double freshnessScore = Math.max(0, 60.0 - (now - s.receivedAt) / 1000.0);
            double score = accuracyScore * 0.7 + freshnessScore * 0.3;
            if (score > bestScore) {
                bestScore = score;
                best = s.loc;
            }
        }
        return best;
    }

    /** 静止检测：最近 N 个点两两距离都 < STATIONARY_RADIUS 视为静止 */
    private synchronized boolean isStationary() {
        if (buffer.size() < STATIONARY_SAMPLE_COUNT) return false;
        // 取最近 N 个
        LocationSample[] arr = buffer.toArray(new LocationSample[0]);
        int from = Math.max(0, arr.length - STATIONARY_SAMPLE_COUNT);
        for (int i = from; i < arr.length; i++) {
            for (int j = i + 1; j < arr.length; j++) {
                float[] d = new float[1];
                Location.distanceBetween(
                        arr[i].loc.getLatitude(), arr[i].loc.getLongitude(),
                        arr[j].loc.getLatitude(), arr[j].loc.getLongitude(), d);
                if (d[0] >= STATIONARY_RADIUS) return false;
            }
        }
        return true;
    }

    // ---- 定时上报核心逻辑 ----

    private void startTimer() {
        stopTimer();
        long intervalMs = sIntervalSeconds * 1000L;
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;

        Intent i = new Intent(this, FmoLocationService.class).setAction(ACTION_ALARM);
        PendingIntent pi = PendingIntent.getService(this, 0, i,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        long triggerAt = System.currentTimeMillis() + intervalMs;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            am.setExact(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        } else {
            am.set(AlarmManager.RTC_WAKEUP, triggerAt, pi);
        }
        Log.i(TAG, "startTimer (AlarmManager) intervalMs=" + intervalMs);
    }

    private void stopTimer() {
        AlarmManager am = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (am != null) {
            Intent i = new Intent(this, FmoLocationService.class).setAction(ACTION_ALARM);
            PendingIntent pi = PendingIntent.getService(this, 0, i,
                    PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            am.cancel(pi);
        }
        Log.i(TAG, "stopTimer (AlarmManager)");
    }

    /**
     * 发起上报：
     *   1. 优先从缓冲池选最佳点；
     *   2. 池中有点 → 静止/漂移校验 → 上报；
     *   3. 池中无点 → 启动 NETWORK 单次定位兜底（30s 超时）。
     */
    private void doReport() {
        final String checkTime = formatNow();

        // 先用缓存快速更新通知栏（仅供展示）
        Location preview = pickBestLocation();
        if (preview != null) {
            sText = "定位中... " + String.format(Locale.US, "%.6f", preview.getLatitude())
                    + ", " + String.format(Locale.US, "%.6f", preview.getLongitude()) + " (" + checkTime + ")";
        } else {
            sText = "定位中... (" + checkTime + ")";
        }
        refreshNotification();

        Location best = pickBestLocation();
        if (best != null) {
            // 静止检测：池中最近 N 个点都聚集 → 跳过上报
            if (isStationary()) {
                Log.i(TAG, "doReport: device stationary, skip report");
                updateNotificationText("设备静止", checkTime, best.getLatitude(), best.getLongitude());
                notifyJs(true, best.getLatitude(), best.getLongitude(), checkTime,
                        "设备静止，跳过上报");
                return;
            }
            processLocation(best, checkTime, false);
            return;
        }

        // 池为空：NETWORK 兜底
        Log.w(TAG, "doReport: buffer empty, fallback to NETWORK provider");
        requestNetworkFallback(checkTime);
    }

    /**
     * NETWORK 兜底定位：仅在缓冲池完全无 GPS 点时使用，门限收紧到 50m。
     */
    private void requestNetworkFallback(final String checkTime) {
        cancelNetworkFallback();
        if (locationManager == null) {
            updateNotificationText("定位失败", checkTime);
            notifyJs(false, 0, 0, checkTime, "LocationManager 不可用");
            return;
        }
        if (!locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
            updateNotificationText("定位失败", checkTime);
            notifyJs(false, 0, 0, checkTime, "GPS 无信号且网络定位未启用");
            return;
        }

        networkFallbackListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (networkFallbackListener == null) return;
                cancelNetworkFallback();
                if (location == null) {
                    updateNotificationText("定位失败", checkTime);
                    notifyJs(false, 0, 0, checkTime, "NETWORK 回调为空");
                    return;
                }
                Log.i(TAG, "networkFallback: got fix accuracy="
                        + (location.hasAccuracy() ? location.getAccuracy() : "N/A"));
                processLocation(location, checkTime, true);
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };
        try {
            locationManager.requestSingleUpdate(
                    LocationManager.NETWORK_PROVIDER,
                    networkFallbackListener,
                    Looper.getMainLooper());
        } catch (SecurityException e) {
            Log.w(TAG, "requestNetworkFallback: permission denied", e);
            cancelNetworkFallback();
            updateNotificationText("定位失败", checkTime);
            notifyJs(false, 0, 0, checkTime, "定位权限被拒绝");
            return;
        }

        networkFallbackTimeout = new Runnable() {
            @Override
            public void run() {
                if (networkFallbackListener == null) return;
                cancelNetworkFallback();
                Log.w(TAG, "networkFallback: timed out");
                updateNotificationText("定位超时", checkTime);
                notifyJs(false, 0, 0, checkTime, "GPS 无信号，网络定位超时");
            }
        };
        reportHandler.postDelayed(networkFallbackTimeout, FRESH_FIX_TIMEOUT_MS);
    }

    private void cancelNetworkFallback() {
        if (networkFallbackTimeout != null) {
            reportHandler.removeCallbacks(networkFallbackTimeout);
            networkFallbackTimeout = null;
        }
        if (networkFallbackListener != null && locationManager != null) {
            try {
                locationManager.removeUpdates(networkFallbackListener);
            } catch (Exception ignore) {}
        }
        networkFallbackListener = null;
    }

    /**
     * 上报前的最终校验：精度（按来源分级）、漂移、速度合理性。
     * @param fromNetwork true 表示这是 NETWORK 兜底点，使用更宽的精度门限
     */
    private void processLocation(Location loc, String checkTime, boolean fromNetwork) {
        double lat = loc.getLatitude();
        double lng = loc.getLongitude();

        // 1. 精度门限（按来源分级）
        float threshold = fromNetwork ? NETWORK_ACCURACY_THRESHOLD : GPS_ACCURACY_THRESHOLD;
        if (loc.hasAccuracy() && loc.getAccuracy() > threshold) {
            Log.w(TAG, "processLocation: accuracy too low: " + loc.getAccuracy()
                    + "m (threshold " + threshold + ")");
            updateNotificationText("精度不足", checkTime, lat, lng);
            notifyJs(false, lat, lng, checkTime,
                    "定位精度不足(" + (int) loc.getAccuracy() + "m)");
            return;
        }

        // 2. 漂移过滤：与上次上报位置比较
        if (sLastReportTime > 0 && sLastReportedLat != 0) {
            float[] results = new float[1];
            Location.distanceBetween(sLastReportedLat, sLastReportedLng, lat, lng, results);
            float dist = results[0];

            // 速度合理性二次校验（与上次上报点）
            long dtMs = System.currentTimeMillis() - sLastReportTime;
            if (dtMs > 0) {
                double speed = dist / (dtMs / 1000.0);
                if (speed > MAX_REASONABLE_SPEED) {
                    Log.w(TAG, "processLocation: speed too high vs last report ("
                            + speed + " m/s), drop");
                    updateNotificationText("疑似漂移", checkTime, lat, lng);
                    notifyJs(false, lat, lng, checkTime,
                            "速度异常(" + String.format(Locale.US, "%.1f", speed) + " m/s)，疑似漂移");
                    return;
                }
            }

            if (dist < DRIFT_THRESHOLD) {
                Log.i(TAG, "processLocation: position unchanged (" + dist + "m), skip");
                updateNotificationText("位置未变", checkTime, lat, lng);
                notifyJs(true, lat, lng, checkTime,
                        "位置未变化(偏移" + String.format(Locale.US, "%.1f", dist) + "m)，跳过上报");
                return;
            }
        }

        // 3. 上报到 FMO
        reportToFmo(lat, lng, checkTime);
    }

    private void reportToFmo(final double lat, final double lng, final String checkTime) {
        if (sFmoUrl.isEmpty()) {
            Log.w(TAG, "reportToFmo: no FMO URL configured");
            updateNotificationText("未配置地址", checkTime);
            return;
        }

        // ws/wss → http/https
        String reqUrl = sFmoUrl;
        if (reqUrl.startsWith("wss://")) {
            reqUrl = "https://" + reqUrl.substring("wss://".length());
        } else if (reqUrl.startsWith("ws://")) {
            reqUrl = "http://" + reqUrl.substring("ws://".length());
        }

        Request.Builder rbuilder = new Request.Builder().url(reqUrl);
        WebViewAuthHelper.addAuthHeaders(getApplicationContext(), rbuilder, sFmoUrl);
        Request request = rbuilder.build();

        Log.i(TAG, "reportToFmo: connecting to " + reqUrl);

        httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket ws, @NonNull Response response) {
                try {
                    JSONObject body = new JSONObject();
                    body.put("type", "config");
                    body.put("subType", "setCordinate");
                    JSONObject data = new JSONObject();
                    data.put("latitude", lat);
                    data.put("longitude", lng);
                    body.put("data", data);
                    ws.send(body.toString());
                    Log.i(TAG, "reportToFmo: sent setCordinate lat=" + lat + " lng=" + lng);
                } catch (Exception e) {
                    Log.w(TAG, "reportToFmo: send failed", e);
                    ws.close(1000, null);
                }
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull String text) {
                Log.i(TAG, "reportToFmo: received response");
                long now = System.currentTimeMillis();
                sLastReportedLat = lat;
                sLastReportedLng = lng;
                sLastReportTime = now;
                persistLastReported(lat, lng, now);
                updateNotificationText("最近上报", checkTime, lat, lng);
                notifyJs(true, lat, lng, checkTime, "上报成功");
                ws.close(1000, null);

                // 5s 后从 FMO 拉取坐标确认
                reportHandler.postDelayed(() -> fetchFmoCoordinateOnce(), 5000);
            }

            @Override
            public void onFailure(@NonNull WebSocket ws, @NonNull Throwable t, Response response) {
                Log.w(TAG, "reportToFmo: failed", t);
                updateNotificationText("上报失败", checkTime, lat, lng);
                notifyJs(false, lat, lng, checkTime, "上报失败: " + t.getMessage());
            }
        });
    }

    private void fetchFmoCoordinateOnce() {
        if (sFmoUrl.isEmpty()) return;

        String reqUrl = sFmoUrl;
        if (reqUrl.startsWith("wss://")) {
            reqUrl = "https://" + reqUrl.substring("wss://".length());
        } else if (reqUrl.startsWith("ws://")) {
            reqUrl = "http://" + reqUrl.substring("ws://".length());
        }

        Request.Builder rbuilder = new Request.Builder().url(reqUrl);
        WebViewAuthHelper.addAuthHeaders(getApplicationContext(), rbuilder, sFmoUrl);
        Request request = rbuilder.build();

        httpClient.newWebSocket(request, new WebSocketListener() {
            @Override
            public void onOpen(@NonNull WebSocket ws, @NonNull Response response) {
                try {
                    JSONObject body = new JSONObject();
                    body.put("type", "config");
                    body.put("subType", "getCordinate");
                    body.put("data", new JSONObject());
                    ws.send(body.toString());
                } catch (Exception e) {
                    ws.close(1000, null);
                }
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull String text) {
                try {
                    JSONObject msg = new JSONObject(text);
                    if (msg.optInt("code", -1) == 0) {
                        JSONObject respData = msg.optJSONObject("data");
                        if (respData != null && respData.has("latitude") && respData.has("longitude")) {
                            double fmoLat = respData.getDouble("latitude");
                            double fmoLng = respData.getDouble("longitude");
                            notifyJsFmoCoord(fmoLat, fmoLng);
                            Log.i(TAG, "fetchFmoCoordinate: got fmoLat=" + fmoLat + " fmoLng=" + fmoLng);
                        }
                    }
                } catch (Exception e) {
                    Log.w(TAG, "fetchFmoCoordinate: parse failed", e);
                }
                ws.close(1000, null);
            }

            @Override
            public void onMessage(@NonNull WebSocket ws, @NonNull okio.ByteString bytes) {
                String s = bytes.utf8();
                onMessage(ws, s);
            }

            @Override
            public void onFailure(@NonNull WebSocket ws, @NonNull Throwable t, Response response) {
                Log.w(TAG, "fetchFmoCoordinate: failed", t);
            }
        });
    }

    private void updateNotificationText(String label, String time) {
        Location loc = pickBestLocation();
        if (loc != null) {
            updateNotificationText(label, time, loc.getLatitude(), loc.getLongitude());
        } else if (sLastReportedLat != 0 && sLastReportedLng != 0) {
            // 如果当前无最佳点（例如网络兜底等情况），尝试兜底使用上一次的已知坐标，避免坐标突然消失
            updateNotificationText(label, time, sLastReportedLat, sLastReportedLng);
        } else {
            sText = label + " (" + time + ")";
            refreshNotification();
        }
    }

    private void updateNotificationText(String label, String time, double lat, double lng) {
        sText = label + ": " + String.format(Locale.US, "%.6f", lat)
                + ", " + String.format(Locale.US, "%.6f", lng)
                + " (" + time + ")";
        refreshNotification();
    }

    private static String formatNow() {
        SimpleDateFormat sdf = new SimpleDateFormat("HH:mm:ss", Locale.getDefault());
        return sdf.format(new Date());
    }

    private void notifyJs(boolean success, double lat, double lng, String time, String message) {
        FmoLocationPlugin plugin = FmoLocationPlugin.getInstance();
        if (plugin == null) return;
        try {
            JSObject result = new JSObject();
            result.put("success", success);
            result.put("latitude", lat);
            result.put("longitude", lng);
            result.put("time", time);
            result.put("message", message);
            plugin.notifyJsReportResult(result);
        } catch (Exception e) {
            Log.w(TAG, "notifyJs failed", e);
        }
    }

    private void notifyJsFmoCoord(double lat, double lng) {
        FmoLocationPlugin plugin = FmoLocationPlugin.getInstance();
        if (plugin == null) return;
        try {
            JSObject result = new JSObject();
            result.put("success", true);
            result.put("latitude", lat);
            result.put("longitude", lng);
            result.put("isFmoCoord", true);
            plugin.notifyJsReportResult(result);
        } catch (Exception e) {
            Log.w(TAG, "notifyJsFmoCoord failed", e);
        }
    }

    // ---- 静态方法 ----

    public static void startService(Context ctx) {
        Intent i = new Intent(ctx, FmoLocationService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
    }

    public static void stopService(Context ctx) {
        Intent i = new Intent(ctx, FmoLocationService.class).setAction(ACTION_STOP);
        ctx.startService(i);
    }

    /**
     * 更新通知栏标题/文案。
     * Android 12+ 后台限制：仅在服务已运行时直接刷新；未运行时只写静态缓存。
     */
    public static void updateNotification(Context ctx, String title, String text) {
        if (title != null && !title.isEmpty()) sTitle = title;
        if (text != null) sText = text;

        FmoLocationService inst = sInstance;
        if (inst != null) {
            inst.refreshNotification();
        }
    }

    /** 获取当前通知静态缓存 */
    public static String getCachedTitle() { return sTitle; }
    public static String getCachedText() { return sText; }
    public static String getCachedFmoUrl() { return sFmoUrl; }

    /**
     * 从 Service 缓冲池获取最佳 GPS 点（供 Plugin 复用）。
     * Service 未运行或缓冲池为空时返回 null。
     */
    public static Location getBestLocationFromBuffer() {
        FmoLocationService inst = sInstance;
        if (inst == null) return null;
        return inst.pickBestLocation();
    }

    /** Service 是否正在运行（GPS 是否在持续监听） */
    public static boolean isRunning() {
        return sInstance != null;
    }
}
