import type { AprsCommandParams, AprsCommandResult } from '../types/aprs'

export interface IAprsService {
  /** 当前平台/环境是否可用（不可用时 UI 应提示改走服务器端路径） */
  isAvailable(): boolean
  /** 发送一条 APRS 控制指令（单次短连接） */
  sendCommand(params: AprsCommandParams): Promise<AprsCommandResult>
}
