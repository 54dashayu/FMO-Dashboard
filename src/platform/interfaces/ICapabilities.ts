/**
 * 平台能力标志。Vue 层读取这些标志做差异化展示，避免在组件里判 isAndroid。
 */
export interface ICapabilities {
  /** 是否具备原生 APRS 直连能力（TCP 到 APRS-IS） */
  hasNativeAprs: boolean
  /** 是否具备前台服务式的后台保活能力 */
  hasBackgroundMode: boolean
  /** Grid→地址解析是否具备持久化缓存（跨会话） */
  hasPersistentGridCache: boolean
  /** 是否具备原生 WebSocket 事件保活（后台仍在线） */
  hasNativeEvents: boolean
  /** 是否具备原生音频保活（后台播放） */
  hasNativeAudio: boolean
  /** 是否具备原生GPS定位能力 */
  hasNativeLocation: boolean
}
