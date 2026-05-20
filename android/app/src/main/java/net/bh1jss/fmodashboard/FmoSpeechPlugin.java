package net.bh1jss.fmodashboard;

import android.os.Handler;
import android.os.Looper;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashMap;
import java.util.Locale;
import java.util.UUID;

@CapacitorPlugin(name = "FmoSpeech")
public class FmoSpeechPlugin extends Plugin implements TextToSpeech.OnInitListener {
    private static final long INIT_WAIT_TIMEOUT_MS = 6000;
    private static final long SPEAK_TIMEOUT_MS = 20000;
    private TextToSpeech tts;
    private boolean ready = false;
    private boolean initFailed = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private PluginCall pendingCall;
    private Runnable pendingTimeout;

    @Override
    public void load() {
        tts = new TextToSpeech(getContext(), this);
    }

    @Override
    protected void handleOnDestroy() {
        if (tts != null) {
            try {
                tts.stop();
                tts.shutdown();
            } catch (Exception ignore) {
            }
            tts = null;
        }
        super.handleOnDestroy();
    }

    @Override
    public void onInit(int status) {
        ready = status == TextToSpeech.SUCCESS;
        initFailed = !ready;
        if (ready && tts != null) {
            int langResult = tts.setLanguage(Locale.US);
            if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
                tts.setLanguage(Locale.ENGLISH);
            }
            tts.setPitch(1.0f);
            tts.setSpeechRate(0.42f);
            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                @Override
                public void onStart(String utteranceId) {
                }

                @Override
                public void onDone(String utteranceId) {
                    resolvePending(true, null);
                }

                @Override
                public void onError(String utteranceId) {
                    resolvePending(false, "TTS 播放失败");
                }

                @Override
                public void onError(String utteranceId, int errorCode) {
                    resolvePending(false, "TTS 播放失败，错误码 " + errorCode);
                }
            });
        }
    }

    @PluginMethod
    public void speak(PluginCall call) {
        String text = call.getString("text", "");
        if (text == null || text.trim().isEmpty()) {
            call.resolve();
            return;
        }

        if (tts == null) {
            initFailed = false;
            tts = new TextToSpeech(getContext(), this);
        }

        if (!ready || tts == null) {
            waitUntilReadyThenSpeak(call, text, System.currentTimeMillis());
            return;
        }

        doSpeak(call, text);
    }

    private void waitUntilReadyThenSpeak(PluginCall call, String text, long startedAt) {
        if (ready && tts != null) {
            doSpeak(call, text);
            return;
        }

        if (initFailed || System.currentTimeMillis() - startedAt > INIT_WAIT_TIMEOUT_MS) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("error", "系统文字转语音未就绪或不可用");
            ret.put("ready", ready);
            ret.put("engine", getEngineName());
            call.resolve(ret);
            return;
        }

        mainHandler.postDelayed(() -> waitUntilReadyThenSpeak(call, text, startedAt), 250);
    }

    private void doSpeak(PluginCall call, String text) {
        float rate = call.getFloat("rate", 0.42f);
        float pitch = call.getFloat("pitch", 1.0f);
        int langResult = tts.setLanguage(Locale.US);
        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            langResult = tts.setLanguage(Locale.ENGLISH);
        }
        if (langResult == TextToSpeech.LANG_MISSING_DATA || langResult == TextToSpeech.LANG_NOT_SUPPORTED) {
            JSObject ret = new JSObject();
            ret.put("ok", false);
            ret.put("error", "系统缺少英文语音数据");
            ret.put("engine", getEngineName());
            call.resolve(ret);
            return;
        }
        tts.setSpeechRate(rate);
        tts.setPitch(pitch);

        if (pendingCall != null) {
            resolvePending(false, "新的播报已开始");
        }
        pendingCall = call;
        pendingTimeout = () -> resolvePending(false, "TTS 播放超时");
        mainHandler.postDelayed(pendingTimeout, SPEAK_TIMEOUT_MS);

        String utteranceId = "fmo-speech-" + UUID.randomUUID();
        HashMap<String, String> params = new HashMap<>();
        params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);

        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
        if (result == TextToSpeech.ERROR) {
            resolvePending(false, "TTS 启动失败");
        }
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("ready", ready);
        ret.put("initFailed", initFailed);
        ret.put("engine", getEngineName());
        call.resolve(ret);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        if (tts != null) {
            tts.stop();
        }
        resolvePending(false, "播报已停止");
        call.resolve();
    }

    private void resolvePending(boolean ok, String error) {
        if (pendingTimeout != null) {
            mainHandler.removeCallbacks(pendingTimeout);
            pendingTimeout = null;
        }
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;

        JSObject ret = new JSObject();
        ret.put("ok", ok);
        if (error != null) ret.put("error", error);
        ret.put("engine", getEngineName());
        call.resolve(ret);
    }

    private String getEngineName() {
        try {
            if (tts != null && tts.getDefaultEngine() != null) return tts.getDefaultEngine();
        } catch (Exception ignore) {
        }
        return "";
    }
}
