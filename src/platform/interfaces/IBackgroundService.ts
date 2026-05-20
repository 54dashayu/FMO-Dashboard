/**
 * 后台保活与唤醒锁抽象。
 * - Android：Capacitor BackgroundMode + 前台服务通知
 * - Web / Tauri 桌面：WakeLock / 无操作（no-op）
 */
export interface IBackgroundService {
  /** 进入后台保活（例如音频播放启动时调用） */
  enable(): Promise<void>
  /** 退出后台保活 */
  disable(): Promise<void>
}
