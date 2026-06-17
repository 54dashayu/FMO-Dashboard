package net.bh1jss.fmodashboard;




import android.content.res.Resources;
import android.os.Build;
import android.util.DisplayMetrics;
import android.util.Log;
import android.view.View;
import android.view.WindowInsets;

import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * FmoSystemUi: 获取真实系统栏安全区 inset 并通过 CSS 变量注入 WebView。
 * <p>
 * Android WebView 的 env(safe-area-inset-*) 在许多厂商 ROM 上返回 0px，
 * 本插件通过原生 WindowInsets API 获取真实值，在 JS 层写入 CSS 变量。
 * <p>
 * 关键：WindowInsets.getInsets() 返回的是原始物理像素 (raw px)，
 * 而 WebView 的 CSS px 对应 dp。必须通过 displayMetrics.density
 * 做 px → dp 转换，否则高 DPI 设备上数值会严重偏大。
 * <p>
 * 同时监听 inset 变化（手势/三键导航切换、折叠屏展开/折叠等），
 * 通过 {@code safeAreaChanged} 事件实时通知 JS 更新。
 */
@CapacitorPlugin(name = "FmoSystemUi")
public class FmoSystemUiPlugin extends Plugin {

    private static final String TAG = "FmoSystemUiPlugin";

    /** 屏幕密度，用于 px → dp 转换。1dp = 1px on mdpi, 3dp = 1px on xxhdpi。 */
    private float density = 1.0f;

    @Override
    public void load() {
        try {
            Resources res = getActivity().getResources();
            DisplayMetrics metrics = res.getDisplayMetrics();
            density = metrics.density;
            Log.i(TAG, "density=" + density + " (width=" + metrics.widthPixels
                + "px, dpi=" + metrics.densityDpi + ")");

            View decor = getActivity().getWindow().getDecorView();
            ViewCompat.setOnApplyWindowInsetsListener(decor, (v, insets) -> {
                JSObject data = new JSObject();
                int statusBarDp = pxToDp(insets.getInsets(WindowInsetsCompat.Type.statusBars()).top);
                int navBarDp = pxToDp(insets.getInsets(WindowInsetsCompat.Type.navigationBars()).bottom);
                int left = pxToDp(Math.max(
                    insets.getInsets(WindowInsetsCompat.Type.systemBars()).left,
                    insets.getInsets(WindowInsetsCompat.Type.displayCutout()).left
                ));
                int right = pxToDp(Math.max(
                    insets.getInsets(WindowInsetsCompat.Type.systemBars()).right,
                    insets.getInsets(WindowInsetsCompat.Type.displayCutout()).right
                ));
                data.put("top", statusBarDp);
                data.put("bottom", navBarDp);
                data.put("left", left);
                data.put("right", right);
                Log.i(TAG, "safeAreaChanged top=" + statusBarDp + " bottom=" + navBarDp
                    + " left=" + left + " right=" + right);
                notifyListeners("safeAreaChanged", data);
                return insets;
            });
            // 主动触发一次 dispatch，确保首次一定能收到 inset 值
            ViewCompat.requestApplyInsets(decor);
        } catch (Throwable e) {
            Log.w(TAG, "setOnApplyWindowInsetsListener failed: " + e.getMessage());
        }
    }

    /**
     * getSafeAreaInsets() → { top, bottom, left, right }，单位 dp（与 CSS px 一致）。
     * JS 层在 app 启动时调用一次，拿到真实的安全区值写入 CSS 变量。
     * 若当前 View 尚未完成 layout，返回估算值（dp）。
     */
    @PluginMethod
    public void getSafeAreaInsets(PluginCall call) {
        JSObject result = new JSObject();
        try {
            View decor = getActivity().getWindow().getDecorView();
            WindowInsets insets = decor.getRootWindowInsets();
            if (insets != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                int statusBarDp = pxToDp(insets.getInsets(WindowInsets.Type.statusBars()).top);
                int navBarDp = pxToDp(insets.getInsets(WindowInsets.Type.navigationBars()).bottom);
                result.put("top", statusBarDp);
                result.put("bottom", navBarDp);
                result.put("left", pxToDp(Math.max(
                    insets.getInsets(WindowInsets.Type.systemBars()).left,
                    insets.getInsets(WindowInsets.Type.displayCutout()).left
                )));
                result.put("right", pxToDp(Math.max(
                    insets.getInsets(WindowInsets.Type.systemBars()).right,
                    insets.getInsets(WindowInsets.Type.displayCutout()).right
                )));
            } else if (insets != null) {
                result.put("top", pxToDp(insets.getSystemWindowInsetTop()));
                result.put("bottom", pxToDp(insets.getSystemWindowInsetBottom()));
                result.put("left", pxToDp(insets.getSystemWindowInsetLeft()));
                result.put("right", pxToDp(insets.getSystemWindowInsetRight()));
            } else {
                // 尚未完成 layout 时的估算值（dp）
                result.put("top", 36);
                result.put("bottom", 48);
                result.put("left", 0);
                result.put("right", 0);
            }
        } catch (Throwable e) {
            Log.w(TAG, "getSafeAreaInsets failed: " + e.getMessage());
            result.put("top", 36);
            result.put("bottom", 48);
            result.put("left", 0);
            result.put("right", 0);
        }
        Log.i(TAG, "getSafeAreaInsets → " + result);
        call.resolve(result);
    }

    /** 将原始物理像素转换为 dp（与 WebView CSS px 一致）。 */
    private int pxToDp(int px) {
        if (density <= 0) return px;
        return Math.round(px / density);
    }
}
