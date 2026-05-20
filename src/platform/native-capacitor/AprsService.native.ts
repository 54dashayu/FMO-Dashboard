import { Capacitor, registerPlugin } from '@capacitor/core'
import type { IAprsService } from '../interfaces/IAprsService'
import type { AprsCommandParams, AprsCommandResult } from '../types/aprs'

/**
 * Android 原生 APRS 插件（TCP 直连 APRS-IS）。
 * 仅在 Android 平台可用。
 */
interface FmoAprsPlugin {
  sendCommand(params: {
    mycall: string
    passcode: string
    tocall: string
    rawPacket: string
    waitAck: number
    host?: string
    port?: number
  }): Promise<AprsCommandResult>
}

const FmoAprs = registerPlugin<FmoAprsPlugin>('FmoAprs')

export class NativeAprsService implements IAprsService {
  isAvailable(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
  }

  async sendCommand(params: AprsCommandParams): Promise<AprsCommandResult> {
    if (!this.isAvailable()) {
      throw new Error('FmoAprs 原生插件仅在 Android 端可用')
    }
    return FmoAprs.sendCommand({
      mycall: params.mycall,
      passcode: params.passcode,
      tocall: params.tocall || '',
      rawPacket: params.rawPacket,
      waitAck: typeof params.waitAck === 'number' ? params.waitAck : 20,
      host: params.host,
      port: params.port
    })
  }
}
