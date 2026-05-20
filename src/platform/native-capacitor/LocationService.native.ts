import type { ILocationService, PermissionCheckResult, ReportStatusResult } from '../interfaces/ILocationService'
import { Capacitor } from '@capacitor/core'
import { registerPlugin } from '@capacitor/core'

interface FmoLocationPlugin {
  checkPermission(): Promise<{ granted: boolean; notificationGranted: boolean; backgroundGranted: boolean; needRationale: boolean }>
  requestPermission(): Promise<{ granted: boolean }>
  requestBackgroundPermission(): Promise<{ granted: boolean }>
  setFmoConfig(options: { url: string; intervalSeconds: number }): Promise<void>
  getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null>
  startWatching(options: { intervalSeconds: number }): Promise<void>
  stopWatching(): Promise<void>
  startForegroundService(options: { title: string; text: string; intervalSeconds: number }): Promise<void>
  stopForegroundService(): Promise<void>
  addListener(eventName: string, callback: (data: any) => void): void
}

const Location = registerPlugin<FmoLocationPlugin>('FmoLocation')

export class NativeLocationService implements ILocationService {
  private locationCallbacks: Array<(pos: { latitude: number; longitude: number }) => void> = []
  private reportStatusCallbacks: Array<(result: ReportStatusResult) => void> = []

  constructor() {
    // 监听原生 location 事件，分发给所有注册的回调
    Location.addListener('location', (data: { latitude: number; longitude: number }) => {
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        for (const cb of this.locationCallbacks) {
          try {
            cb({ latitude: data.latitude, longitude: data.longitude })
          } catch {
            // 忽略回调异常
          }
        }
      }
    })

    // 监听原生 reportStatus 事件，分发给所有注册的回调
    Location.addListener('reportStatus', (data: ReportStatusResult) => {
      if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
        for (const cb of this.reportStatusCallbacks) {
          try {
            cb(data)
          } catch {
            // 忽略回调异常
          }
        }
      }
    })
  }

  async checkPermission(): Promise<PermissionCheckResult> {
    try {
      const result = await Location.checkPermission()
      return {
        granted: result.granted === true,
        notificationGranted: result.notificationGranted !== false,
        backgroundGranted: result.backgroundGranted !== false,
        needRationale: result.needRationale === true
      }
    } catch {
      return { granted: false, notificationGranted: false, backgroundGranted: false, needRationale: false }
    }
  }

  async requestPermission(): Promise<boolean> {
    try {
      const result = await Location.requestPermission()
      return result.granted === true
    } catch {
      return false
    }
  }

  async requestBackgroundPermission(): Promise<boolean> {
    try {
      const result = await Location.requestBackgroundPermission()
      return result.granted === true
    } catch {
      return false
    }
  }

  async getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    try {
      return await Location.getCurrentPosition()
    } catch {
      return null
    }
  }

  async setFmoConfig(url: string, intervalSeconds: number): Promise<void> {
    try {
      await Location.setFmoConfig({ url, intervalSeconds })
    } catch {
      // ignore
    }
  }

  onReportStatus(callback: (result: ReportStatusResult) => void): void {
    this.reportStatusCallbacks.push(callback)
  }

  async startWatching(intervalSeconds: number): Promise<void> {
    await Location.startWatching({ intervalSeconds })
  }

  async stopWatching(): Promise<void> {
    await Location.stopWatching()
  }

  async startForegroundService(title: string, text: string, intervalSeconds: number): Promise<void> {
    await Location.startForegroundService({ title, text, intervalSeconds })
  }

  async stopForegroundService(): Promise<void> {
    await Location.stopForegroundService()
  }

  onLocation(callback: (pos: { latitude: number; longitude: number }) => void): void {
    this.locationCallbacks.push(callback)
  }
}
