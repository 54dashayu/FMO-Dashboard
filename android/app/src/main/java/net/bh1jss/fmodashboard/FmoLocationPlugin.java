package net.bh1jss.fmodashboard;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * FmoLocation: 原生 GPS 定位插件。
 * - 负责权限请求、单次定位、持续定位监听
 * - 定位结果通过 notifyListeners("location", ...) 推给 JS
 * - 前台服务 FmoLocationService 通过 Intent 启动/停止
 */
@CapacitorPlugin(name = "FmoLocation")
public class FmoLocationPlugin extends Plugin {

    private static final String TAG = "FmoLocationPlugin";
    private static final int PERM_REQ_LOCATION = 2001;
    private static final int PERM_REQ_BACKGROUND = 2002;
    private static final long LOCATION_MAX_AGE_MS = 60_000L;  // 缓存定位最大有效期 60s

    private static volatile FmoLocationPlugin sInstance;

    public static FmoLocationPlugin getInstance() { return sInstance; }

    private LocationManager locationManager;
    private LocationListener watchingListener;
    private volatile Location lastLocation;

    private final Handler mainHandler = new Handler(Looper.getMainLooper());

    @Override
    public void load() {
        sInstance = this;
        Context ctx = getContext();
        if (ctx != null) {
            locationManager = (LocationManager) ctx.getSystemService(Context.LOCATION_SERVICE);
        }
    }

    @Override
    protected void handleOnDestroy() {
        stopWatchingInternal();
        sInstance = null;
        super.handleOnDestroy();
    }

    /** 获取最后一次已知位置（供 Service 侧读取） */
    public static Location getLastLocation() {
        FmoLocationPlugin inst = sInstance;
        if (inst == null) return null;
        return inst.lastLocation;
    }

    /** 供 Service 侧刷通知 */
    public static void updateServiceNotification(String title, String text) {
        FmoLocationPlugin inst = sInstance;
        if (inst == null) return;
        Context ctx = inst.getContext();
        if (ctx != null) {
            FmoLocationService.updateNotification(ctx, title, text);
        }
    }

    /** FMO WebSocket 地址（静态存储，供 Service 侧读取） */
    private static volatile String sFmoUrl = "";

    /**
     * JS 告知原生侧 FMO 服务器地址与上报间隔。
     * 原生 Service 通过 Intent EXTRA_FMO_URL 读取，但此处也缓存一份供静态查询。
     */
    @PluginMethod
    public void setFmoConfig(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.isEmpty()) {
            sFmoUrl = url;
            Log.i(TAG, "setFmoConfig url=" + url);
        }
        call.resolve();
    }

    /** 供 Service 侧向 JS 推送上报结果 */
    public void notifyJsReportResult(JSObject result) {
        notifyListeners("reportStatus", result);
    }

    // ---- 权限 ----

    /**
     * 仅检查权限状态（不弹出系统对话框）。
     * 返回：{ granted, notificationGranted, backgroundGranted, needRationale }
     */
    @PluginMethod
    public void checkPermission(PluginCall call) {
        Activity act = getActivity();
        if (act == null) {
            JSObject result = new JSObject();
            result.put("granted", false);
            result.put("notificationGranted", false);
            result.put("backgroundGranted", false);
            result.put("needRationale", false);
            call.resolve(result);
            return;
        }
        boolean fineGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean coarseGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean locGranted = fineGranted || coarseGranted;

        boolean notifGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        boolean bgGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            bgGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                    == PackageManager.PERMISSION_GRANTED;
        }

        boolean needRationale = false;
        if (!locGranted) {
            needRationale = ActivityCompat.shouldShowRequestPermissionRationale(act, Manifest.permission.ACCESS_FINE_LOCATION);
        }

        JSObject result = new JSObject();
        result.put("granted", locGranted);
        result.put("notificationGranted", notifGranted);
        result.put("backgroundGranted", bgGranted);
        result.put("needRationale", needRationale);
        call.resolve(result);
    }

    /**
     * 请求前台定位与通知权限（弹出系统对话框）。
     * 不包含后台定位——Android 11+ 不允许同时请求前后台定位，否则系统不弹框。
     */
    @PluginMethod
    public void requestPermission(PluginCall call) {
        Activity act = getActivity();
        if (act == null) {
            call.resolve(new JSObject().put("granted", false));
            return;
        }
        boolean fineGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean coarseGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        boolean notifGranted = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            notifGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }

        // 只要任一权限缺失（包括通知），就发起请求
        boolean needRequest = false;
        if (!fineGranted) needRequest = true;
        if (!coarseGranted) needRequest = true;
        if (!notifGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) needRequest = true;

        if (!needRequest) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }

        // 保存调用，等待 handleRequestPermissionsResult 中处理结果
        saveCall(call);

        java.util.ArrayList<String> perms = new java.util.ArrayList<>();
        if (!fineGranted) perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
        if (!coarseGranted) perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        if (!notifGranted && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            perms.add(Manifest.permission.POST_NOTIFICATIONS);
        }

        act.runOnUiThread(() -> {
            try {
                ActivityCompat.requestPermissions(act, perms.toArray(new String[0]), PERM_REQ_LOCATION);
            } catch (Exception e) {
                Log.w(TAG, "requestPermissions failed", e);
                PluginCall savedCall = getSavedCall();
                if (savedCall != null) {
                    savedCall.resolve(new JSObject().put("granted", false));
                }
            }
        });
    }

    /**
     * 单独请求后台定位权限（ACCESS_BACKGROUND_LOCATION）。
     * Android 11+ 需在前台定位授权后再单独请求，系统才会提供「始终允许」选项。
     */
    @PluginMethod
    public void requestBackgroundPermission(PluginCall call) {
        Activity act = getActivity();
        if (act == null || Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            call.resolve(new JSObject().put("granted", false));
            return;
        }
        boolean bgGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_BACKGROUND_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
        if (bgGranted) {
            call.resolve(new JSObject().put("granted", true));
            return;
        }

        saveCall(call);
        act.runOnUiThread(() -> {
            try {
                ActivityCompat.requestPermissions(act,
                        new String[]{Manifest.permission.ACCESS_BACKGROUND_LOCATION},
                        PERM_REQ_BACKGROUND);
            } catch (Exception e) {
                Log.w(TAG, "requestBackgroundPermission failed", e);
                PluginCall savedCall = getSavedCall();
                if (savedCall != null) {
                    savedCall.resolve(new JSObject().put("granted", false));
                }
            }
        });
    }

    @Override
    protected void handleRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.handleRequestPermissionsResult(requestCode, permissions, grantResults);

        PluginCall savedCall = getSavedCall();
        if (savedCall == null) return;

        if (requestCode == PERM_REQ_LOCATION) {
            // 前台定位：检查系统最新的权限状态
            Activity act = getActivity();
            boolean locGranted = false;
            if (act != null) {
                locGranted = ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_FINE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED
                        || ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_COARSE_LOCATION)
                        == PackageManager.PERMISSION_GRANTED;
            }
            JSObject result = new JSObject();
            result.put("granted", locGranted);
            savedCall.resolve(result);
        } else if (requestCode == PERM_REQ_BACKGROUND) {
            // 后台定位
            boolean bgGranted = grantResults != null && grantResults.length > 0
                    && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            JSObject result = new JSObject();
            result.put("granted", bgGranted);
            savedCall.resolve(result);
        }
    }

    // ---- 单次定位 ----

    /**
     * 获取当前位置：GPS 优先策略。
     *
     * 流程：
     *   1. 若 Service 正在运行（自动上报开启中）→ 直接从缓冲池取最佳点（最快最准）；
     *   2. 否则请求 GPS_PROVIDER 单次定位，给 {@link #GPS_PREFERRED_WAIT_MS} 时间收星；
     *   3. GPS 超时后再启用 NETWORK_PROVIDER 兜底；
     *   4. NETWORK 也超时（总 {@link #SINGLE_UPDATE_TOTAL_TIMEOUT_MS}）才用 lastKnownLocation 兜底。
     *
     * 避免了"GPS 与 NETWORK 并发请求 + 网络定位秒回 + 漂移"的老问题。
     */
    @PluginMethod
    public void getCurrentPosition(PluginCall call) {
        if (locationManager == null) {
            call.reject("LocationManager not available");
            return;
        }
        Activity act = getActivity();
        if (act == null) {
            call.reject("Activity not available");
            return;
        }
        if (!hasLocationPermission()) {
            call.reject("Location permission not granted");
            return;
        }

        // 优先从 Service 缓冲池读取（自动上报运行时）
        if (FmoLocationService.isRunning()) {
            Location buffered = FmoLocationService.getBestLocationFromBuffer();
            if (buffered != null) {
                Log.i(TAG, "getCurrentPosition: served from Service buffer, accuracy="
                        + (buffered.hasAccuracy() ? buffered.getAccuracy() : "N/A"));
                lastLocation = buffered;
                JSObject result = new JSObject();
                result.put("latitude", buffered.getLatitude());
                result.put("longitude", buffered.getLongitude());
                result.put("accuracy", buffered.hasAccuracy() ? buffered.getAccuracy() : 0);
                result.put("source", "buffer");
                call.resolve(result);
                return;
            }
            // Service 在跑但缓冲池为空（GPS 刚启动还没收到点），继续走单次定位
            Log.i(TAG, "getCurrentPosition: Service running but buffer empty, request single update");
        }

        final boolean[] resolved = {false};
        final LocationListener[] activeListenerHolder = new LocationListener[1];

        // 内部辅助：解析并清理
        final Runnable cleanup = () -> {
            if (activeListenerHolder[0] != null) {
                try {
                    locationManager.removeUpdates(activeListenerHolder[0]);
                } catch (Exception ignore) {}
                activeListenerHolder[0] = null;
            }
        };

        // 阶段 1：GPS 优先
        boolean gpsEnabled = locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER);
        boolean networkEnabled = locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER);

        LocationListener gpsListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (resolved[0] || location == null) return;
                resolved[0] = true;
                lastLocation = location;
                cleanup.run();
                JSObject result = new JSObject();
                result.put("latitude", location.getLatitude());
                result.put("longitude", location.getLongitude());
                result.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : 0);
                call.resolve(result);
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };

        try {
            if (gpsEnabled) {
                activeListenerHolder[0] = gpsListener;
                locationManager.requestSingleUpdate(
                        LocationManager.GPS_PROVIDER, gpsListener, Looper.getMainLooper());
                Log.i(TAG, "getCurrentPosition: requesting GPS first");
            } else if (networkEnabled) {
                // 跳过 GPS 阶段，直接 NETWORK
                Log.i(TAG, "getCurrentPosition: GPS disabled, fallback to NETWORK");
                startNetworkPhase(call, resolved, activeListenerHolder, cleanup);
                return;
            } else {
                call.reject("No location provider available");
                return;
            }
        } catch (SecurityException se) {
            call.reject("Location permission denied: " + se.getMessage());
            return;
        }

        // 阶段 1 超时 → 阶段 2：NETWORK 兜底
        mainHandler.postDelayed(() -> {
            if (resolved[0]) return;
            cleanup.run();
            if (networkEnabled) {
                Log.i(TAG, "getCurrentPosition: GPS timed out, fallback to NETWORK");
                startNetworkPhase(call, resolved, activeListenerHolder, cleanup);
            } else {
                // GPS 超时且无 NETWORK，等总超时再用 lastKnown 兜底
                Log.w(TAG, "getCurrentPosition: GPS timed out and NETWORK disabled");
            }
        }, GPS_PREFERRED_WAIT_MS);

        // 总超时：lastKnownLocation 兜底
        mainHandler.postDelayed(() -> {
            if (resolved[0]) return;
            cleanup.run();
            resolved[0] = true;
            Location fallback = null;
            try {
                if (gpsEnabled) {
                    fallback = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
                }
                if (fallback == null && networkEnabled) {
                    fallback = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                }
            } catch (SecurityException ignore) {}
            if (fallback != null) {
                lastLocation = fallback;
                JSObject result = new JSObject();
                result.put("latitude", fallback.getLatitude());
                result.put("longitude", fallback.getLongitude());
                result.put("accuracy", fallback.hasAccuracy() ? fallback.getAccuracy() : 0);
                call.resolve(result);
            } else {
                call.reject("Location request timed out");
            }
        }, SINGLE_UPDATE_TOTAL_TIMEOUT_MS);
    }

    /** GPS 优先等待窗口：GPS 没回 → NETWORK 兜底 */
    private static final long GPS_PREFERRED_WAIT_MS = 10_000L;
    /** 单次定位总超时：之后用 lastKnownLocation 兜底 */
    private static final long SINGLE_UPDATE_TOTAL_TIMEOUT_MS = 30_000L;

    private void startNetworkPhase(
            PluginCall call,
            boolean[] resolved,
            LocationListener[] activeListenerHolder,
            Runnable cleanup
    ) {
        LocationListener networkListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (resolved[0] || location == null) return;
                resolved[0] = true;
                lastLocation = location;
                cleanup.run();
                JSObject result = new JSObject();
                result.put("latitude", location.getLatitude());
                result.put("longitude", location.getLongitude());
                result.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : 0);
                call.resolve(result);
            }
            @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override public void onProviderEnabled(String provider) {}
            @Override public void onProviderDisabled(String provider) {}
        };
        try {
            activeListenerHolder[0] = networkListener;
            locationManager.requestSingleUpdate(
                    LocationManager.NETWORK_PROVIDER, networkListener, Looper.getMainLooper());
        } catch (SecurityException se) {
            // 由总超时 lastKnown 兜底处理
            activeListenerHolder[0] = null;
        }
    }

    /**
     * 获取系统缓存的定位，仅当定位年龄不超过 LOCATION_MAX_AGE_MS 时才返回。
     * 回退链路：GPS → NETWORK → PASSIVE，均检查新鲜度。
     * 供 Service 侧定时上报超时回退使用。
     */
    private Location getFreshCachedLocation() {
        if (locationManager == null) return null;
        Location loc = null;
        try {
            long now = System.currentTimeMillis();
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                loc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            }
            if (loc != null && (now - loc.getTime()) > LOCATION_MAX_AGE_MS) {
                Log.i(TAG, "getFreshCachedLocation: GPS cached too old, discarding");
                loc = null;
            }
            if (loc == null) {
                loc = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
                if (loc != null && (now - loc.getTime()) > LOCATION_MAX_AGE_MS) {
                    Log.i(TAG, "getFreshCachedLocation: NETWORK cached too old, discarding");
                    loc = null;
                }
            }
            if (loc == null) {
                loc = locationManager.getLastKnownLocation(LocationManager.PASSIVE_PROVIDER);
                if (loc != null && (now - loc.getTime()) > LOCATION_MAX_AGE_MS) {
                    Log.i(TAG, "getFreshCachedLocation: PASSIVE cached too old, discarding");
                    loc = null;
                }
            }
        } catch (SecurityException e) {
            Log.w(TAG, "getFreshCachedLocation: permission denied", e);
        }
        return loc;
    }

    // ---- 持续定位 ----

    @PluginMethod
    public void startWatching(PluginCall call) {
        if (!hasLocationPermission()) {
            call.reject("Location permission not granted");
            return;
        }
        int intervalSeconds = call.getInt("intervalSeconds", 5);
        if (intervalSeconds < 1) intervalSeconds = 1;

        stopWatchingInternal();

        watchingListener = new LocationListener() {
            @Override
            public void onLocationChanged(Location location) {
                if (location == null) return;
                lastLocation = location;
                JSObject data = new JSObject();
                data.put("latitude", location.getLatitude());
                data.put("longitude", location.getLongitude());
                notifyListeners("location", data);
            }

            @Override
            public void onStatusChanged(String provider, int status, Bundle extras) {}
            @Override
            public void onProviderEnabled(String provider) {}
            @Override
            public void onProviderDisabled(String provider) {}
        };

        long minTime = intervalSeconds * 1000L;
        float minDistance = 0f;

        try {
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER, minTime, minDistance, watchingListener, Looper.getMainLooper());
            }
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER, minTime, minDistance, watchingListener, Looper.getMainLooper());
            }
            Log.i(TAG, "startWatching intervalSeconds=" + intervalSeconds);
            call.resolve();
        } catch (SecurityException se) {
            call.reject("Location permission denied");
        }
    }

    @PluginMethod
    public void stopWatching(PluginCall call) {
        stopWatchingInternal();
        call.resolve();
    }

    private void stopWatchingInternal() {
        if (watchingListener != null && locationManager != null) {
            try {
                locationManager.removeUpdates(watchingListener);
            } catch (Exception ignore) {}
            watchingListener = null;
            Log.i(TAG, "stopWatching");
        }
    }

    // ---- 前台服务 ----

    @PluginMethod
    public void startForegroundService(PluginCall call) {
        String title = call.getString("title", "FMO 位置上报中");
        String text = call.getString("text", "正在定时上报GPS位置");
        int intervalSeconds = call.getInt("intervalSeconds", 300);

        Intent intent = new Intent(getContext(), FmoLocationService.class)
                .setAction(FmoLocationService.ACTION_START)
                .putExtra(FmoLocationService.EXTRA_TITLE, title)
                .putExtra(FmoLocationService.EXTRA_TEXT, text)
                .putExtra(FmoLocationService.EXTRA_INTERVAL_SECONDS, intervalSeconds)
                .putExtra(FmoLocationService.EXTRA_FMO_URL, sFmoUrl);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                getContext().startForegroundService(intent);
            } else {
                getContext().startService(intent);
            }
            Log.i(TAG, "startForegroundService title=" + title + " intervalSeconds=" + intervalSeconds + " fmoUrl=" + sFmoUrl);
            call.resolve();
        } catch (Exception e) {
            Log.w(TAG, "startForegroundService failed", e);
            call.reject("startForegroundService failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void stopForegroundService(PluginCall call) {
        Context ctx = getContext();
        if (ctx != null) {
            FmoLocationService.stopService(ctx);
        }
        call.resolve();
    }

    // ---- 辅助 ----

    private boolean hasLocationPermission() {
        Activity act = getActivity();
        if (act == null) return false;
        return ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(act, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }
}
