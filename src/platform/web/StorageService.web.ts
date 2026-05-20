import type { IStorageService } from '../interfaces/IStorageService'

/**
 * Web/Tauri：localStorage 同步 API 包装成 Promise
 */
export class WebStorageService implements IStorageService {
  async get(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value)
    } catch (e) {
      console.warn('[WebStorageService] set failed:', e)
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key)
    } catch {
      // 忽略
    }
  }
}
