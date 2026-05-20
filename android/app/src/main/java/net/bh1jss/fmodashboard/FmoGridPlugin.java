package net.bh1jss.fmodashboard;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.util.Iterator;

/**
 * FmoGrid: Capacitor bridge 入口。
 * 真正的缓存/限频/远程查询逻辑全部位于 {@link GridAddressResolver}，本类仅做参数校验与转发，
 * 这样原生其它模块（如 {@link FmoEventsPlugin}）可以直接复用同一份缓存状态，不用再绕 JS。
 */
@CapacitorPlugin(name = "FmoGrid")
public class FmoGridPlugin extends Plugin {

    private static final String TAG = "FmoGridPlugin";

    /**
     * gridToAddress({ grid }) → { grid, country, province, city, district, township }
     */
    @PluginMethod
    public void gridToAddress(PluginCall call) {
        String raw = call.getString("grid");
        if (raw == null || raw.trim().isEmpty()) {
            call.reject("grid is required");
            return;
        }
        GridAddressResolver resolver = GridAddressResolver.get(getContext());
        resolver.resolveAsync(raw, new GridAddressResolver.Callback() {
            @Override
            public void onSuccess(JSONObject data) {
                JSObject out = new JSObject();
                Iterator<String> keys = data.keys();
                while (keys.hasNext()) {
                    String k = keys.next();
                    out.put(k, data.opt(k));
                }
                if (!out.has("grid")) out.put("grid", raw.trim().toUpperCase());
                call.resolve(out);
            }

            @Override
            public void onError(Throwable t) {
                Log.w(TAG, "gridToAddress failed for " + raw + ": " + t.getMessage());
                call.reject(t.getMessage() == null ? "gridToAddress failed" : t.getMessage());
            }
        });
    }

    /** clearCache() 清空内存与 SQLite 的全部缓存。 */
    @PluginMethod
    public void clearCache(PluginCall call) {
        try {
            GridAddressResolver.get(getContext()).clearAll();
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "clearCache failed" : e.getMessage());
        }
    }
}
