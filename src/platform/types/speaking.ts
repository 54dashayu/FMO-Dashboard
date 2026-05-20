// 发言状态相关 DTO 与事件类型

export interface ServerInfo {
  uid: string
  name: string
}

export interface SpeakingRecord {
  callsign: string
  grid?: string
  startTime: number
  endTime?: number
  // 其它历史字段（地址、序号等）以松散结构承载，保留扩展空间
  [k: string]: any
}

export type EventsStatus = 'connected' | 'reconnecting' | 'disconnected'

export interface EventsSnapshotConnection {
  addressId: string
  status: EventsStatus
  currentSpeaker?: string
  history?: SpeakingRecord[]
  serverInfo?: ServerInfo
}

export interface EventsSnapshot {
  connections: EventsSnapshotConnection[]
}
