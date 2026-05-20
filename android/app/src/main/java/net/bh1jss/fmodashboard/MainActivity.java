package net.bh1jss.fmodashboard;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FmoAudioPlugin.class);
        registerPlugin(FmoEventsPlugin.class);
        registerPlugin(FmoAprsPlugin.class);
        registerPlugin(FmoGridPlugin.class);
        registerPlugin(FmoSystemUiPlugin.class);
        registerPlugin(FmoLocationPlugin.class);
        registerPlugin(FmoSpeechPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
