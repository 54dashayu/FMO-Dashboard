import type {
  EventsSnapshot,
  EventsStatus,
  ServerInfo
} from '../types/speaking'

export interface EventsConnectConfig {
  /** 多连接隔离 key（一般使用地址 ID） */
  addressId: string
  /** 完整 WebSocket URL，形如 ws(s)://host/ws */
  url: string
  /** 完整 WebSocket URL，形如 ws(s)://host/ws，用于 station:getCurrent 轮询（调用端不再自行拼接 /ws） */
  apiUrl: string
}

export interface IEventsService {
  connect(cfg: EventsConnectConfig): Promise<void>
  disconnect(addressId: string): Promise<void>
  disconnectAll(): Promise<void>
  /** 设置主地址（用于快照同步与 UI 聚焦） */
  setPrimary(addressId: string): Promise<void>
  /** 主动刷新某地址的服务器信息（例如电台切换后） */
  refreshServerInfo(addressId: string): Promise<void>
  /** 拉取快照（原生端用于恢复后台期间积累的状态） */
  getSnapshot(addressId?: string): Promise<EventsSnapshot>
  /** 业务侧更新缓存的服务器名（仅原生需要，Web 为 no-op） */
  updateServerName(addressId: string, name: string): Promise<void>

  /** 订阅原始消息（JSON string） */
  onMessage(cb: (addressId: string, data: string) => void): () => void
  onStatus(cb: (addressId: string, status: EventsStatus) => void): () => void
  onServerInfo(cb: (addressId: string, info: ServerInfo) => void): () => void
}
