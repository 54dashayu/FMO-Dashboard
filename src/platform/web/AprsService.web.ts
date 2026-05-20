import type { IAprsService } from '../interfaces/IAprsService'
import type { AprsCommandParams, AprsCommandResult } from '../types/aprs'

/**
 * Web / Tauri 桌面：没有原生 TCP 直连能力，由业务层走 WebSocket 中转服务器。
 * 这里保留 isAvailable = false，业务层据此决定分支。
 */
export class WebAprsService implements IAprsService {
  isAvailable(): boolean {
    return false
  }

  async sendCommand(_params: AprsCommandParams): Promise<AprsCommandResult> {
    throw new Error('Web 端不支持 APRS 直连，请使用 WebSocket 中转服务器')
  }
}
