import { Preferences } from '@capacitor/preferences'
import type { IStorageService } from '../interfaces/IStorageService'

/**
 * Android 原生端存储：@capacitor/preferences（底层 SharedPreferences）。
 *
 * 选择理由：
 * - Capacitor WebView 的 localStorage 在某些版本 / Android WebView 变更时存在被清空的风险
 * - 原生 SharedPreferences 与应用生命周期绑定，更稳定
 * - 与前台服务 / 原生插件共享存储（未来可能需要在原生侧读取同一 key）
 */
export class NativeStorageService implements IStorageService {
  async get(key: string): Promise<string | null> {
    try {
      const { value } = await Preferences.get({ key })
      return value ?? null
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      await Preferences.set({ key, value })
    } catch (e) {
      console.warn('[NativeStorageService] set failed:', e)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await Preferences.remove({ key })
    } catch {
      // 忽略
    }
  }
}
