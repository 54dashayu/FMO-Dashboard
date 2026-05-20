package net.bh1jss.fmodashboard;

import android.content.Context;
import android.util.Base64;
import android.util.Log;
import android.webkit.CookieManager;
import android.webkit.WebViewDatabase;

import okhttp3.Request;

/**
 * WebView 认证凭据提取工具。
 * 从 Android 系统级 WebView 存储中采集 Cookie / Basic Auth 凭据，
 * 并以标准 HTTP 头形式注入 OkHttp 请求。
 *
 * 覆盖三种认证方式：
 * 1. Cookie/Session —— 通过 CookieManager.getCookie() 提取
 * 2. HTTP Basic Auth —— 通过 WebViewDatabase 提取已保存的凭据
 * 3. Bearer Token —— 若 JWT 以 Cookie 形式存储，方案1已覆盖；
 *    若仅在 JS Authorization 头中发送则此处无法获取，需 JS 侧配合传递。
 */
public final class WebViewAuthHelper {

    private static final String TAG = "WebViewAuth";

    private WebViewAuthHelper() {}

    /**
     * 从 WebView 存储中提取认证凭据并注入到 OkHttp 请求头。
     *
     * @param ctx     Android Context（用于 WebViewDatabase）
     * @param builder OkHttp 请求构造器
     * @param url     目标 URL（用于域名匹配）
     */
    public static void addAuthHeaders(Context ctx, Request.Builder builder, String url) {
        Log.d(TAG, "addAuthHeaders for url=" + url);

        // java.net.URL / CookieManager 不识别 ws/wss 协议，统一转换为 http/https
        String httpUrl = url;
        if (url.startsWith("wss://")) {
            httpUrl = "https://" + url.substring("wss://".length());
        } else if (url.startsWith("ws://")) {
            httpUrl = "http://" + url.substring("ws://".length());
        }

        // 1. Cookie / Session
        try {
            CookieManager cm = CookieManager.getInstance();
            if (cm == null) {
                Log.w(TAG, "CookieManager is null — WebView 可能尚未初始化");
            } else if (!cm.acceptCookie()) {
                Log.w(TAG, "CookieManager.acceptCookie()=false — WebView 禁用了 Cookie");
            } else {
                // 优先用 http/https URL 查询（WebView 的 Cookie 按 http/https 域名存储）
                String cookies = cm.getCookie(httpUrl);
                if (cookies == null || cookies.isEmpty()) {
                    Log.d(TAG, "CookieManager.getCookie(" + httpUrl + ") 返回空 — 该域名下无 Cookie（需先在 WebView 中访问 FMO 页面并登录）");
                } else {
                    Log.i(TAG, "注入 Cookie 头 (len=" + cookies.length() + "): " + cookies);
                    builder.addHeader("Cookie", cookies);
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "CookieManager 读取失败: " + e.getMessage(), e);
        }

        // 2. HTTP Basic Auth（从 WebView 内置凭据存储提取）
        if (ctx == null) {
            Log.w(TAG, "Context 为 null，跳过 Basic Auth 提取");
        } else {
            try {
                java.net.URL parsed = new java.net.URL(httpUrl);
                String host = parsed.getHost();
                Log.d(TAG, "Basic Auth: 查询 host=" + host);
                WebViewDatabase wvDb = WebViewDatabase.getInstance(ctx);
                if (wvDb == null) {
                    Log.w(TAG, "WebViewDatabase.getInstance() 返回 null");
                } else {
                    // 先尝试空 realm，部分服务器不指定 realm
                    String[] creds = wvDb.getHttpAuthUsernamePassword(host, "");
                    if (creds == null || creds.length < 2 || creds[0] == null) {
                        Log.d(TAG, "Basic Auth: 空 realm 无凭据，尝试 realm='FMO'");
                        creds = wvDb.getHttpAuthUsernamePassword(host, "FMO");
                    }
                    if (creds != null && creds.length == 2 && creds[0] != null && creds[1] != null) {
                        Log.i(TAG, "注入 Basic Auth 头, user=" + creds[0] + " host=" + host);
                        String basic = Base64.encodeToString(
                                (creds[0] + ":" + creds[1]).getBytes(java.nio.charset.StandardCharsets.UTF_8),
                                Base64.NO_WRAP);
                        builder.addHeader("Authorization", "Basic " + basic);
                    } else {
                        Log.d(TAG, "Basic Auth: host=" + host + " 无已保存凭据");
                    }
                }
            } catch (Exception e) {
                Log.w(TAG, "Basic Auth 提取失败: " + e.getMessage(), e);
            }
        }
    }
}
