package net.bh1jss.fmodashboard;

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
    private TextToSpeech tts;
    private boolean ready = false;
    private PluginCall pendingCall;

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
        if (ready && tts != null) {
            tts.setLanguage(Locale.US);
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
            tts = new TextToSpeech(getContext(), this);
        }

        if (!ready || tts == null) {
            call.reject("系统文字转语音尚未就绪");
            return;
        }

        float rate = call.getFloat("rate", 0.42f);
        float pitch = call.getFloat("pitch", 1.0f);
        tts.setLanguage(Locale.US);
        tts.setSpeechRate(rate);
        tts.setPitch(pitch);

        if (pendingCall != null) {
            resolvePending(false, "新的播报已开始");
        }
        pendingCall = call;

        String utteranceId = "fmo-speech-" + UUID.randomUUID();
        HashMap<String, String> params = new HashMap<>();
        params.put(TextToSpeech.Engine.KEY_PARAM_UTTERANCE_ID, utteranceId);

        int result = tts.speak(text, TextToSpeech.QUEUE_FLUSH, params);
        if (result == TextToSpeech.ERROR) {
            resolvePending(false, "TTS 启动失败");
        }
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
        PluginCall call = pendingCall;
        pendingCall = null;
        if (call == null) return;

        JSObject ret = new JSObject();
        ret.put("ok", ok);
        if (error != null) ret.put("error", error);
        call.resolve(ret);
    }
}
