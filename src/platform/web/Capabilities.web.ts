import type { ICapabilities } from '../interfaces/ICapabilities'

export const webCapabilities: ICapabilities = {
  hasNativeAprs: false,
  hasBackgroundMode: false,
  hasPersistentGridCache: false, // Web 走 IndexedDB 但默认 TTL 过期策略与原生不同
  hasNativeEvents: false,
  hasNativeAudio: false,
  hasNativeLocation: false
}
