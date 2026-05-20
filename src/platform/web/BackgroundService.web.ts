import type { IBackgroundService } from '../interfaces/IBackgroundService'

/**
 * Web / Tauri 桌面：使用 WakeLock（可用时）维持屏幕唤醒；
 * 浏览器前台/桌面端通常不会被系统杀，这里只管唤醒锁。
 */
export class WebBackgroundService implements IBackgroundService {
  private wakeLockRef: WakeLockSentinel | null = null

  async enable(): Promise<void> {
    try {
      if (
        typeof document !== 'undefined' &&
        document.visibilityState === 'visible' &&
        'wakeLock' in navigator
      ) {
        // @ts-ignore - 某些运行时缺少类型
        this.wakeLockRef = await navigator.wakeLock.request('screen')
      }
    } catch (e) {
      console.debug('[BackgroundService] WakeLock 请求失败:', e)
    }
  }

  async disable(): Promise<void> {
    try {
      if (this.wakeLockRef) {
        await this.wakeLockRef.release()
        this.wakeLockRef = null
      }
    } catch {
      // 忽略
    }
  }
}
