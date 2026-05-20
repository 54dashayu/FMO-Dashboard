/**
 * 键值存储抽象。
 * - Web：localStorage / IndexedDB（小字段走 localStorage）
 * - Android：@capacitor/preferences（替代 localStorage，保证原生端持久化）
 */
export interface IStorageService {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  remove(key: string): Promise<void>
}
