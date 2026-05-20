package net.bh1jss.fmodashboard;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.os.Build;
import android.os.IBinder;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.media.app.NotificationCompat.MediaStyle;

/**
 * FmoAudioService: MEDIA_PLAYBACK 类型前台服务。
 *
 * 设计原则：
 *  - 通知按钮使用“明确动作”（ACTION_MUTE / ACTION_UNMUTE），而非 toggle。
 *    避免 addAction + MediaSession.Callback 双路径同时触发导致互相抵消。
 *  - MediaSession.Callback 也调用明确动作（onPause=mute(true), onPlay=mute(false)）。
 *  - 服务作为单例，允许直接同步刷新 mediaSession 与通知，避免异步 intent 链造成状态闪回。
 */
public class FmoAudioService extends Service {

    private static final String TAG = "FmoAudioService";
    public static final String CHANNEL_ID = "fmo_audio_playback";
    public static final int NOTIFICATION_ID = 0x46_4D_4F_01;

    public static final String ACTION_START = "net.bh1jss.fmodashboard.FMO_AUDIO_START";
    public static final String ACTION_STOP = "net.bh1jss.fmodashboard.FMO_AUDIO_STOP";
    public static final String ACTION_UPDATE = "net.bh1jss.fmodashboard.FMO_AUDIO_UPDATE";
    public static final String ACTION_MUTE = "net.bh1jss.fmodashboard.FMO_AUDIO_MUTE";
    public static final String ACTION_UNMUTE = "net.bh1jss.fmodashboard.FMO_AUDIO_UNMUTE";
    public static final String ACTION_STOP_CLICK = "net.bh1jss.fmodashboard.FMO_AUDIO_STOP_CLICK";

    public static final String EXTRA_TITLE = "title";
    public static final String EXTRA_TEXT = "text";
    public static final String EXTRA_MUTED = "muted";

    private static volatile String sTitle = "FMO 音频播放中";
    private static volatile String sText = "当前无人发言";
    private static volatile boolean sMuted = false;
    /** 音频 WebSocket 是否已真正建立连接。未连接时不显示播放/暂停/停止等媒体控件。 */
    private static volatile boolean sConnected = false;

    private static volatile FmoAudioService sInstance;

    private MediaSessionCompat mediaSession;

    // 简单去抖：过滤掉 300ms 内的重复点击，防止 ROM 同时走 Callback + PendingIntent
    private volatile long lastActionTs = 0L;
    private volatile String lastAction = "";

    @Override
    public void onCreate() {
        super.onCreate();
        sInstance = this;
        ensureChannel();
        mediaSession = new MediaSessionCompat(this, "FmoAudioSession");
        mediaSession.setFlags(MediaSessionCompat.FLAG_HANDLES_MEDIA_BUTTONS
                | MediaSessionCompat.FLAG_HANDLES_TRANSPORT_CONTROLS);
        mediaSession.setCallback(new MediaSessionCompat.Callback() {
            @Override public void onPlay() {
                Log.i(TAG, "MediaSession onPlay");
                applyMute(false, "session.onPlay");
            }
            @Override public void onPause() {
                Log.i(TAG, "MediaSession onPause");
                applyMute(true, "session.onPause");
            }
            @Override public void onStop() {
                Log.i(TAG, "MediaSession onStop");
                if (!debounce("stop")) return;
                FmoAudioPlugin p = FmoAudioPlugin.getInstance();
                if (p != null) p.handleStopFromNotification();
            }
        });
        mediaSession.setActive(true);
        updatePlaybackState(sMuted);
        updateMetadata();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        Log.i(TAG, "onStartCommand action=" + action);

        if (ACTION_MUTE.equals(action)) {
            applyMute(true, "notif.mute");
            return START_NOT_STICKY;
        }
        if (ACTION_UNMUTE.equals(action)) {
            applyMute(false, "notif.unmute");
            return START_NOT_STICKY;
        }
        if (ACTION_STOP_CLICK.equals(action)) {
            if (debounce("stop")) {
                FmoAudioPlugin p = FmoAudioPlugin.getInstance();
                if (p != null) p.handleStopFromNotification();
            }
            return START_NOT_STICKY;
        }

        if (ACTION_UPDATE.equals(action) && intent != null) {
            applyExtras(intent);
            refreshNotificationAndState();
            return START_STICKY;
        }

        if (intent != null) applyExtras(intent);
        updatePlaybackState(sMuted);
        Notification notification = buildNotification(this, sTitle, sText, sMuted, mediaSession, sConnected);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (ACTION_STOP.equals(action)) {
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (mediaSession != null) {
            mediaSession.setActive(false);
            mediaSession.release();
            mediaSession = null;
        }
        if (sInstance == this) sInstance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    /** 去抖：同一 action 在 300ms 内只处理一次 */
    private boolean debounce(String key) {
        long now = System.currentTimeMillis();
        if (key.equals(lastAction) && (now - lastActionTs) < 300L) {
            Log.i(TAG, "debounce dropped: " + key);
            return false;
        }
        lastAction = key;
        lastActionTs = now;
        return true;
    }

    /**
     * 幂等地应用静音状态：更新本地缓存 → 通知插件 → 同步刷新 mediaSession + 通知。
     */
    private void applyMute(boolean muted, String source) {
        if (!debounce(muted ? "mute" : "unmute")) return;
        if (sMuted == muted) {
            Log.i(TAG, "applyMute no-op (already " + muted + ") from " + source);
            refreshNotificationAndState();
            return;
        }
        sMuted = muted;
        Log.i(TAG, "applyMute -> " + muted + " from " + source);
        FmoAudioPlugin p = FmoAudioPlugin.getInstance();
        if (p != null) p.setMutedFromNotification(muted);
        refreshNotificationAndState();
    }

    private void refreshNotificationAndState() {
        updatePlaybackState(sMuted);
        updateMetadata();
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIFICATION_ID, buildNotification(this, sTitle, sText, sMuted, mediaSession, sConnected));
    }

    /**
     * 同步 MediaMetadata 到 MediaSession。
     * 这是小米/OPPO/vivo/荣耀等 ROM 的"灵动胶囊"以及锁屏媒体卡片读取
     * 标题（呼号）和副标题（地址）的唯一来源。
     */
    private void updateMetadata() {
        if (mediaSession == null) return;
        MediaMetadataCompat.Builder mb = new MediaMetadataCompat.Builder()
                .putString(MediaMetadataCompat.METADATA_KEY_TITLE, sTitle == null ? "" : sTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, sText == null ? "" : sText)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_TITLE, sTitle == null ? "" : sTitle)
                .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, sText == null ? "" : sText);
        try {
            Bitmap art = BitmapFactory.decodeResource(getResources(), R.mipmap.ic_launcher);
            if (art != null) {
                mb.putBitmap(MediaMetadataCompat.METADATA_KEY_ART, art);
                mb.putBitmap(MediaMetadataCompat.METADATA_KEY_ALBUM_ART, art);
            }
        } catch (Exception ignore) {}
        mediaSession.setMetadata(mb.build());
    }

    private void applyExtras(Intent intent) {
        String t = intent.getStringExtra(EXTRA_TITLE);
        String x = intent.getStringExtra(EXTRA_TEXT);
        if (t != null && !t.isEmpty()) sTitle = t;
        if (x != null) sText = x;
        if (intent.hasExtra(EXTRA_MUTED)) {
            sMuted = intent.getBooleanExtra(EXTRA_MUTED, false);
        }
    }

    private void updatePlaybackState(boolean muted) {
        if (mediaSession == null) return;
        int state = muted ? PlaybackStateCompat.STATE_PAUSED : PlaybackStateCompat.STATE_PLAYING;
        PlaybackStateCompat ps = new PlaybackStateCompat.Builder()
                .setActions(PlaybackStateCompat.ACTION_PLAY
                        | PlaybackStateCompat.ACTION_PAUSE
                        | PlaybackStateCompat.ACTION_PLAY_PAUSE
                        | PlaybackStateCompat.ACTION_STOP)
                .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f)
                .build();
        mediaSession.setPlaybackState(ps);
    }

    private static Notification buildNotification(
            Context ctx, String title, String text, boolean muted, MediaSessionCompat session,
            boolean connected) {
        Intent launch = new Intent(ctx, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentPI = PendingIntent.getActivity(
                ctx, 0, launch,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Intent stopIntent = new Intent(ctx, FmoAudioService.class).setAction(ACTION_STOP_CLICK);
        PendingIntent stopPendingIntent = PendingIntent.getService(
                ctx, 2, stopIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        Bitmap largeIcon = null;
        try {
            largeIcon = BitmapFactory.decodeResource(ctx.getResources(), R.mipmap.ic_launcher);
        } catch (Exception ignore) {}

        NotificationCompat.Builder b = new NotificationCompat.Builder(ctx, CHANNEL_ID)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle(title)
                .setContentText(text)
                .setContentIntent(contentPI)
                .setDeleteIntent(stopPendingIntent)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOnlyAlertOnce(true);
        if (largeIcon != null) b.setLargeIcon(largeIcon);

        if (!connected) {
            // 未连接：不显示媒体控件，仅显示"连接中…"等文案。
            // 仍然 setCategory/setStyle 保证锁屏/胶囊等场景正确显示内容。
            b.setCategory(NotificationCompat.CATEGORY_SERVICE);
            return b.build();
        }

        // 已连接：显示完整媒体控件
        // 根据当前状态选择明确动作：muted=true 时按钮是"继续"（UNMUTE），否则是"暂停"（MUTE）
        String toggleAction = muted ? ACTION_UNMUTE : ACTION_MUTE;
        Intent togglePI = new Intent(ctx, FmoAudioService.class).setAction(toggleAction);
        PendingIntent togglePendingIntent = PendingIntent.getService(
                ctx, muted ? 11 : 10, togglePI,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);

        int toggleIcon = muted ? android.R.drawable.ic_media_play : android.R.drawable.ic_media_pause;
        String toggleLabel = muted ? "继续" : "暂停";

        MediaStyle style = new MediaStyle()
                .setShowActionsInCompactView(0, 1)
                .setShowCancelButton(true)
                .setCancelButtonIntent(stopPendingIntent);
        if (session != null) {
            style.setMediaSession(session.getSessionToken());
        }

        b.setCategory(NotificationCompat.CATEGORY_TRANSPORT)
                .addAction(toggleIcon, toggleLabel, togglePendingIntent)
                .addAction(android.R.drawable.ic_menu_close_clear_cancel, "停止", stopPendingIntent)
                .setStyle(style);
        return b.build();
    }

    private void ensureChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                NotificationChannel ch = new NotificationChannel(
                        CHANNEL_ID, "FMO 音频播放", NotificationManager.IMPORTANCE_LOW);
                ch.setDescription("保持音频流在后台持续播放");
                ch.setShowBadge(false);
                ch.setSound(null, null);
                ch.enableVibration(false);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
        }
    }

    public static void startService(Context ctx) {
        Intent i = new Intent(ctx, FmoAudioService.class).setAction(ACTION_START);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(i);
        } else {
            ctx.startService(i);
        }
    }

    public static void stopService(Context ctx) {
        Intent i = new Intent(ctx, FmoAudioService.class).setAction(ACTION_STOP);
        ctx.startService(i);
    }

    /**
     * 由插件在 WebSocket onOpen / onFailure 时调用，控制通知是否显示媒体控件。
     * connected=true 时通知栏展示播放/暂停/停止按钮；false 时仅展示文案。
     */
    public static void setConnected(Context ctx, boolean connected) {
        if (sConnected == connected) return;
        sConnected = connected;
        Log.i(TAG, "setConnected -> " + connected);
        FmoAudioService inst = sInstance;
        if (inst != null) {
            inst.refreshNotificationAndState();
        }
    }

    /**
     * 更新通知栏标题/副文本/静音图标。
     *
     * Android 12+ 对后台 startService 有限制（BackgroundServiceStartNotAllowedException），
     * 故仅在服务已运行（sInstance != null）时直接刷新；服务未运行时只写静态缓存，
     * 下次 onCreate / onStartCommand 会自动读取最新值，避免后台启动崩溃。
     */
    public static void updateNotification(Context ctx, String title, String text, boolean muted) {
        if (title != null && !title.isEmpty()) sTitle = title;
        if (text != null) sText = text;
        sMuted = muted;

        FmoAudioService inst = sInstance;
        if (inst != null) {
            inst.refreshNotificationAndState();
        }
        // 服务未运行时不再 startService，值已缓存；既无可刷新的通知，也规避后台启动异常。
    }

    /**
     * 由 FmoEventsPlugin 直接调用的纯原生通知文案入口，息屏时也能实时生效。
     * 标题：{serverName}：{callsign} / {serverName}（无人发言时）
     * 副本：{callsign} · {addressText} / {callsign} / 当前无人发言
     * serverName 为空时退化为 "FMO 音频播放中"。
     */
    public static void updateSpeakerFromEvents(
            Context ctx, String serverName, String callsign, String addressText) {
        String sn = (serverName == null || serverName.isEmpty()) ? "FMO 音频播放中" : serverName;
        String title;
        String text;
        if (callsign != null && !callsign.isEmpty()) {
            title = sn + "：" + callsign;
            text = (addressText != null && !addressText.isEmpty())
                    ? (callsign + " · " + addressText)
                    : callsign;
        } else {
            title = sn;
            text = "当前无人发言";
        }
        updateNotification(ctx, title, text, sMuted);
    }
}
