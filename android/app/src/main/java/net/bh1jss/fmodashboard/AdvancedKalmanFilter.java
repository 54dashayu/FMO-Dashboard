package net.bh1jss.fmodashboard;

import android.location.Location;
import android.util.Log;

/**
 * 高级卡尔曼滤波器 (CA模型 - Constant Acceleration)
 * 用于优化 Android GPS 轨迹。
 * 
 * 特性：
 * 1. 内部计算全部基于“米”单位。
 * 2. 6维状态向量：[x, y, vx, vy, ax, ay]。
 * 3. 动态 R (测量噪声)：根据 Location.getAccuracy() 调整。
 * 4. 动态 Q (过程噪声)：根据速度调整，抑制静止漂移。
 * 5. 跳点剔除：预测点与观测点距离异常时仅执行 Predict。
 */
public class AdvancedKalmanFilter {
    private static final String TAG = "AdvancedKF";

    // 状态向量: [x, y, vx, vy, ax, ay]^T
    private double[] X = new double[6];
    // 协方差矩阵 (简化版，主要关注对角线和关键耦合项)
    private double[][] P = new double[6][6];

    private long lastTimestamp = 0;
    private double originLat = 0;
    private double originLng = 0;
    private boolean isInitialized = false;

    // 参数配置
    private static final double MAX_JUMP_DISTANCE = 50.0; // 米
    private static final double MIN_ACCURACY_THRESHOLD = 30.0; // 米

    public AdvancedKalmanFilter() {
        reset();
    }

    public void reset() {
        X = new double[6];
        P = new double[6][6];
        for (int i = 0; i < 6; i++) {
            P[i][i] = 1.0; 
        }
        // 位置初始不确定性较大
        P[0][0] = 10.0;
        P[1][1] = 10.0;
        isInitialized = false;
        lastTimestamp = 0;
    }

    /**
     * 输入原始 Location，返回平滑后的 [lat, lng]
     */
    public double[] process(Location location) {
        if (location == null) return null;

        long currentTimestamp = location.getTime();
        double lat = location.getLatitude();
        double lng = location.getLongitude();
        double accuracy = location.getAccuracy();
        double speed = location.getSpeed();

        if (!isInitialized) {
            init(location);
            return new double[]{lat, lng};
        }

        double dt = (currentTimestamp - lastTimestamp) / 1000.0;
        
        // 处理时间断点
        if (dt <= 0) return new double[]{lat, lng};
        if (dt > 15.0) { // 超过15秒没点，重新初始化防止惯性漂移过大
            init(location);
            return new double[]{lat, lng};
        }

        // 1. 坐标转换: 将当前经纬度转换为相对于 origin 的偏移 (x, y) 单位：米
        // 使用 distanceBetween 保证精度
        float[] results = new float[2];
        // 计算纬度方向偏移 (Y)
        Location.distanceBetween(originLat, originLng, lat, originLng, results);
        double y = results[0] * (lat < originLat ? -1 : 1);
        // 计算经度方向偏移 (X)
        Location.distanceBetween(lat, originLng, lat, lng, results);
        double x = results[0] * (lng < originLng ? -1 : 1);

        // 2. 预测阶段 (Predict)
        predict(dt, speed);

        // 3. 异常点检测 (Outlier Rejection)
        double predictedDist = Math.sqrt(Math.pow(X[0] - x, 2) + Math.pow(X[1] - y, 2));
        boolean isJump = (predictedDist > MAX_JUMP_DISTANCE && accuracy > 10.0);

        // 4. 更新阶段 (Update)
        if (!isJump) {
            update(x, y, accuracy);
        } else {
            Log.d(TAG, "Jump detected: " + predictedDist + "m. Dead reckoning used.");
            // 不执行 update，即只保留 predict 的结果（盲推）
        }

        lastTimestamp = currentTimestamp;

        // 5. 坐标逆转换: (x, y) -> (lat, lng)
        return metersToLatLng(X[0], X[1]);
    }

    private void init(Location loc) {
        originLat = loc.getLatitude();
        originLng = loc.getLongitude();
        X = new double[6]; // [0,0,0,0,0,0]
        // 初始速度可尝试从 location 获取
        X[2] = 0; 
        X[3] = 0; 
        lastTimestamp = loc.getTime();
        isInitialized = true;
    }

    /**
     * 状态预测: X = F*X, P = F*P*F' + Q
     */
    private void predict(double dt, double speed) {
        double dt2 = dt * dt;
        double dt3 = dt2 * dt;

        // --- X = F * X (恒定加速度模型推算) ---
        double oldX = X[0], oldY = X[1];
        double oldVX = X[2], oldVY = X[3];
        double oldAX = X[4], oldAY = X[5];

        X[0] = oldX + oldVX * dt + 0.5 * oldAX * dt2;
        X[1] = oldY + oldVY * dt + 0.5 * oldAY * dt2;
        X[2] = oldVX + oldAX * dt;
        X[3] = oldVY + oldAY * dt;
        // X[4], X[5] 保持不变

        // --- P = F*P*F' + Q ---
        // 自适应过程噪声 Q: 
        // 静止时减小Q以滤除细微抖动；运动时增大Q以跟踪变化
        double accelNoiseVariance = (speed < 0.3) ? 0.05 : 0.8; 
        
        // 简化 Q 矩阵对 P 的影响 (只对主对角线进行补偿)
        P[0][0] += 0.5 * dt3 * accelNoiseVariance; // x
        P[1][1] += 0.5 * dt3 * accelNoiseVariance; // y
        P[2][2] += dt2 * accelNoiseVariance;       // vx
        P[3][3] += dt2 * accelNoiseVariance;       // vy
        P[4][4] += dt * accelNoiseVariance;        // ax
        P[5][5] += dt * accelNoiseVariance;        // ay
    }

    /**
     * 测量更新: K = P*H'/(H*P*H'+R), X = X+K*(z-H*X), P = (I-K*H)*P
     */
    private void update(double zx, double zy, double accuracy) {
        // 自适应测量噪声 R
        double R = accuracy;
        if (accuracy > MIN_ACCURACY_THRESHOLD) {
            R = accuracy * accuracy * 0.1; // 非线性惩罚低精度点
        }

        // 由于 H 是选择矩阵 [1 0 0 0 0 0; 0 1 0 0 0 0]
        // 我们只需对 x, y 两个维度分别更新 (假设 x, y 独立)
        for (int i = 0; i < 2; i++) {
            double z = (i == 0) ? zx : zy;
            double innovation = z - X[i];
            double s = P[i][i] + R;
            double k = P[i][i] / s;

            X[i] += k * innovation;
            P[i][i] *= (1.0 - k);
            
            // 速度和加速度的联动更新 (通过协方差，这里使用经验系数简化实现)
            // 在全矩阵运算中，这是由 P[v][x] 等非对角线项自动完成的
            // 此处为了性能采用简化的一阶更新
            if (i == 0) { // X direction
                X[2] += (k / 2.0) * innovation; // 更新 vx
                X[4] += (k / 4.0) * innovation; // 更新 ax
            } else { // Y direction
                X[3] += (k / 2.0) * innovation; // 更新 vy
                X[5] += (k / 4.0) * innovation; // 更新 ay
            }
        }
    }

    /**
     * 米 -> 经纬度
     */
    private double[] metersToLatLng(double mx, double my) {
        // 纬度：1度约111,320米
        double resLat = originLat + (my / 111319.9);
        // 经度：与纬度有关
        double resLng = originLng + (mx / (111319.9 * Math.cos(Math.toRadians(originLat))));
        return new double[]{resLat, resLng};
    }
}
