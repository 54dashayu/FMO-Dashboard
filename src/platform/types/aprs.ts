// APRS 相关类型

export interface AprsCommandParams {
  /** 登录呼号（含 SSID），如 "BG9JYT-0" */
  mycall: string
  passcode: string
  /** 目标设备呼号（含 SSID） */
  tocall: string
  /** 完整的已签名 APRS 数据包 */
  rawPacket: string
  /** 等待 ACK 的秒数，默认 20 */
  waitAck?: number
  host?: string
  port?: number
}

export interface AprsCommandResult {
  success: boolean
  type: string
  message: string
  raw?: string
  timestamp: number
}
