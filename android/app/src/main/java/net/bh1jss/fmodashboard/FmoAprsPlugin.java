package net.bh1jss.fmodashboard;

import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * FmoAprs: Android 原生 APRS-IS 控制插件。
 *
 * 复刻后端 {@code aprs/client.go} 的"单次短连接"实现：
 * 1) TCP 连接 APRS-IS(默认 china.aprs2.net:14580)
 * 2) 登录: user MYCALL pass PASSCODE vers FMO-ANDROID 1.0
 * 3) 若 tocall != mycall 发 #filter b/TOCALL
 * 4) 发送 rawPacket
 * 5) 按 waitAck 秒数等待包含 ":ACK,CONTROL," 的回包并匹配 addressee
 * 6) 关闭连接
 *
 * 返回结构与 WebSocket 中转服务的 ACKResult 完全一致:
 *   { success, type, message, raw, timestamp }
 */
@CapacitorPlugin(name = "FmoAprs")
public class FmoAprsPlugin extends Plugin {

    private static final String TAG = "FmoAprsPlugin";
    private static final String DEFAULT_HOST = "china.aprs2.net";
    private static final int DEFAULT_PORT = 14580;
    private static final String DEFAULT_VERS = "FMO-ANDROID 1.0";
    private static final int CONNECT_TIMEOUT_MS = 10_000;
    private static final int LOGIN_TIMEOUT_MS = 2_000;

    private final ExecutorService executor = Executors.newCachedThreadPool();

    @PluginMethod
    public void sendCommand(final PluginCall call) {
        final String host = call.getString("host", DEFAULT_HOST);
        final int port = call.getInt("port", DEFAULT_PORT);
        final String mycall = call.getString("mycall", "");
        final String passcode = call.getString("passcode", "");
        final String tocall = call.getString("tocall", "");
        final String rawPacket = call.getString("rawPacket", "");
        final int waitAck = call.getInt("waitAck", 20);
        final String vers = call.getString("vers", DEFAULT_VERS);

        if (mycall.isEmpty() || passcode.isEmpty() || rawPacket.isEmpty()) {
            call.reject("mycall, passcode, rawPacket are required");
            return;
        }

        executor.execute(new Runnable() {
            @Override
            public void run() {
                JSObject result = runSingleShot(host, port, mycall, passcode, tocall, rawPacket, waitAck, vers);
                call.resolve(result);
            }
        });
    }

    /**
     * 单次短连接执行流程，返回与后端一致的结果对象。
     */
    private JSObject runSingleShot(String host, int port, String mycall, String passcode,
                                   String tocall, String rawPacket, int waitAck, String vers) {
        Socket socket = null;
        try {
            socket = new Socket();
            socket.connect(new InetSocketAddress(host, port), CONNECT_TIMEOUT_MS);
        } catch (Exception e) {
            Log.w(TAG, "connect failed: " + e.getMessage());
            return buildResult(false, "error", "连接失败: " + e.getMessage(), "");
        }

        try {
            OutputStream out;
            BufferedReader reader;
            try {
                out = socket.getOutputStream();
                reader = new BufferedReader(
                        new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            } catch (Exception e) {
                return buildResult(false, "error", "获取连接流失败: " + e.getMessage(), "");
            }

            // 1) 登录
            String loginCmd = "user " + mycall + " pass " + passcode + " vers " + vers + "\n";
            try {
                out.write(loginCmd.getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (Exception e) {
                return buildResult(false, "error", "登录发送失败: " + e.getMessage(), "");
            }

            // 2) 等 logresp（最多 2 秒）
            long loginDeadline = System.currentTimeMillis() + LOGIN_TIMEOUT_MS;
            while (System.currentTimeMillis() < loginDeadline) {
                long remain = loginDeadline - System.currentTimeMillis();
                if (remain <= 0) break;
                try {
                    socket.setSoTimeout((int) Math.max(100, remain));
                    String line = reader.readLine();
                    if (line == null) break;
                    String lower = line.toLowerCase();
                    if (lower.contains("logresp")) {
                        if (lower.contains("unverified")) {
                            return buildResult(false, "error",
                                    "APRS-IS 认证失败: passcode 错误", line);
                        }
                        break;
                    }
                } catch (Exception readErr) {
                    // 读取超时或错误都跳出登录等待，按后端同样的宽松策略继续
                    break;
                }
            }

            // 3) 过滤器（tocall != mycall 时）
            if (!tocall.isEmpty() && !tocall.equals(mycall)) {
                String filterCmd = "#filter b/" + tocall + "\n";
                try {
                    out.write(filterCmd.getBytes(StandardCharsets.UTF_8));
                    out.flush();
                } catch (Exception e) {
                    return buildResult(false, "error", "过滤器发送失败: " + e.getMessage(), "");
                }
                try { Thread.sleep(200); } catch (InterruptedException ignore) {}
            }

            // 4) 发送数据包
            try {
                out.write((rawPacket + "\n").getBytes(StandardCharsets.UTF_8));
                out.flush();
            } catch (Exception e) {
                return buildResult(false, "error", "数据包发送失败: " + e.getMessage(), "");
            }

            // 不等待 ACK
            if (waitAck <= 0) {
                return buildResult(true, "sent", "指令已发送（未等待 ACK）", "");
            }

            // 5) 等待 ACK
            long ackDeadline = System.currentTimeMillis() + waitAck * 1000L;
            while (System.currentTimeMillis() < ackDeadline) {
                long remain = ackDeadline - System.currentTimeMillis();
                if (remain <= 0) break;
                try {
                    socket.setSoTimeout((int) Math.min(500, Math.max(100, remain)));
                    String line = reader.readLine();
                    if (line == null) break;
                    line = line.trim();
                    if (line.isEmpty()) continue;
                    Log.i(TAG, "recv: " + line);

                    // 仅处理 ACK 消息
                    if (!line.contains(":ACK,CONTROL,") && !line.contains("ACK,CONTROL,")) {
                        continue;
                    }

                    // 提取 sender（> 前）——即原请求的目标设备 (ToCall)
                    int senderEnd = line.indexOf('>');
                    if (senderEnd <= 0) continue;
                    String sender = line.substring(0, senderEnd).trim();

                    // 解析 addressee 和 payload
                    int idx = line.indexOf("::");
                    if (idx < 0 || line.length() < idx + 11) continue;
                    String addresseeTrimmed = line.substring(idx + 2, idx + 11).trim();

                    int payloadStart = idx + 11;
                    if (payloadStart >= line.length() || line.charAt(payloadStart) != ':') continue;
                    String payload = line.substring(payloadStart + 1);
                    int brace = payload.indexOf('{');
                    if (brace >= 0) payload = payload.substring(0, brace);

                    // addressee 匹配规则：精确相等 或 addressee 无 SSID 时与 mycall 基础呼号相等
                    boolean match = false;
                    if (addresseeTrimmed.equals(mycall)) {
                        match = true;
                    } else if (!addresseeTrimmed.contains("-")) {
                        int dash = mycall.indexOf('-');
                        String mycallBase = dash >= 0 ? mycall.substring(0, dash) : mycall;
                        match = addresseeTrimmed.equals(mycallBase);
                    }
                    if (!match) continue;

                    // 拆 payload: ACK,CONTROL,STANDBY,29624039,1,OK
                    String[] parts = payload.split(",");
                    if (parts.length < 5) continue;
                    String action = parts[2].trim();
                    String timeslot = parts[3].trim();
                    String counter = parts[4].trim();
                    String status = parts.length > 5 ? parts[5].trim() : "OK";

                    String statusUpper = status.toUpperCase();
                    if (statusUpper.contains("FAIL") || statusUpper.contains("NACK")) {
                        return buildResult(false, "ack", "设备返回失败确认", line);
                    }

                    String message = String.format(
                            "收到设备确认 (%s) - ToCall:%s, T:%s, C:%s",
                            action, sender, timeslot, counter);
                    return buildResult(true, "ack", message, line);
                } catch (java.net.SocketTimeoutException te) {
                    // 读取超时，继续等待下一轮
                } catch (Exception e) {
                    Log.w(TAG, "read error: " + e.getMessage());
                    break;
                }
            }

            return buildResult(false, "timeout", "未在 " + waitAck + " 秒内收到 ACK", "");
        } finally {
            try { socket.close(); } catch (Exception ignore) {}
        }
    }

    private JSObject buildResult(boolean success, String type, String message, String raw) {
        JSObject obj = new JSObject();
        obj.put("success", success);
        obj.put("type", type);
        obj.put("message", message);
        if (raw != null) obj.put("raw", raw);
        obj.put("timestamp", System.currentTimeMillis());
        return obj;
    }
}
