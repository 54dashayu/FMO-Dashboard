import type { AudioStartConfig, AudioStatus } from '../types/audio'

export interface IAudioService {
  start(cfg: AudioStartConfig): Promise<void>
  stop(): Promise<void>
  setVolume(percent: number): Promise<void>
  setMuted(muted: boolean): Promise<void>
  /**
   * 恢复音频上下文（处理浏览器自动播放策略）。
   * Web：调用 AudioContext.resume()
   * Native：no-op
   */
  resume(): Promise<void>

  /**
   * 订阅状态变化。返回取消订阅的函数。
   */
  onStatus(cb: (status: AudioStatus) => void): () => void

  /**
   * 订阅由系统/通知栏（或其他 UI 外）触发的静音切换。
   * Native：通知栏上的静音按钮按下时触发
   * Web：从不触发（返回空订阅）
   */
  onMuteChanged(cb: (muted: boolean) => void): () => void
}
