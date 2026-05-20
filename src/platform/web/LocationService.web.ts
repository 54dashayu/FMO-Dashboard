import type { ILocationService, PermissionCheckResult, ReportStatusResult } from '../interfaces/ILocationService'

export class WebLocationService implements ILocationService {
  async checkPermission(): Promise<PermissionCheckResult> {
    return { granted: false, notificationGranted: false, backgroundGranted: false, needRationale: false }
  }

  async requestPermission(): Promise<boolean> {
    return false
  }

  async requestBackgroundPermission(): Promise<boolean> {
    return false
  }

  async setFmoConfig(_url: string, _intervalMinutes: number): Promise<void> {
    // no-op
  }

  async getCurrentPosition(): Promise<{ latitude: number; longitude: number; accuracy: number } | null> {
    return null
  }

  async startWatching(_intervalSeconds: number): Promise<void> {
    // no-op
  }

  async stopWatching(): Promise<void> {
    // no-op
  }

  async startForegroundService(_title: string, _text: string, _intervalMinutes: number): Promise<void> {
    // no-op
  }

  async stopForegroundService(): Promise<void> {
    // no-op
  }

  onLocation(_callback: (pos: { latitude: number; longitude: number }) => void): void {
    // no-op
  }

  onReportStatus(_callback: (result: ReportStatusResult) => void): void {
    // no-op
  }
}
