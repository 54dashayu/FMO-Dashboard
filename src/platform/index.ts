import { Capacitor } from '@capacitor/core'
import type {
  IAprsService,
  IAudioService,
  IBackgroundService,
  ICapabilities,
  IEventsService,
  IGridService,
  ILocationService,
  IStorageService
} from './interfaces'
import { createWebPlatform } from './web'
import { createNativePlatform } from './native-capacitor'

export interface Platform {
  events: IEventsService
  audio: IAudioService
  aprs: IAprsService
  grid: IGridService
  background: IBackgroundService
  location: ILocationService
  storage: IStorageService
  capabilities: ICapabilities
}

let instance: Platform | null = null

/**
 * 获取当前平台实例（单例）。
 * - Android：Capacitor 原生实现
 * - Web / Tauri 桌面：Web 实现
 */
export function getPlatform(): Platform {
  if (instance) return instance
  const isAndroid =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  instance = isAndroid ? createNativePlatform() : createWebPlatform()
  return instance
}

/** 仅测试用：重置单例 */
export function __resetPlatform(): void {
  instance = null
}

export type {
  IAprsService,
  IAudioService,
  IBackgroundService,
  ICapabilities,
  IEventsService,
  IGridService,
  ILocationService,
  IStorageService
}
