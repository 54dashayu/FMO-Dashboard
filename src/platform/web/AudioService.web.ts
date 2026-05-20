import type { IAudioService } from '../interfaces/IAudioService'
import type { AudioStartConfig, AudioStatus } from '../types/audio'
// @ts-ignore - legacy JS
import { AudioStreamPlayer } from '../../services/audioPlayer'

/**
 * 把 AudioStreamPlayer 的中文 statusText 映射成 AudioStatus 枚举。
 */
function mapWebStatus(text: string): AudioStatus {
  switch (text) {
    case '音频连接中...':
      return 'connecting'
    case '音频已连接':
      return 'connected'
    case '播放中':
      return 'playing'
    case '音频重连中...':
      return 'reconnecting'
    case '音频连接错误':
      return 'error'
    case '音频未连接':
      return 'disconnected'
    default:
      return 'idle'
  }
}

/**
 * 将音量百分比转换为非线性 gain 值（指数曲线，基础增益 5）。
 * 0% → 0, 50% → 1.77, 100% → 5.0, 150% → 9.19, 200% → 14.14
 */
function percentToGain(percent: number): number {
  if (percent <= 0) return 0
  const ratio = percent / 100
  return 5 * Math.pow(ratio, 1.5)
}

/**
 * Web / Tauri 桌面端音频服务。包装 AudioStreamPlayer，
 * 通过 setVolume 的 gain 曲线实现音量百分比；无独立 muted 通道，
 * 由 store 层用 setVolume(0) 协同实现。
 */
export class WebAudioService implements IAudioService {
  private player: any = null
  private statusListeners = new Set<(s: AudioStatus) => void>()
  // Web 端不会触发 onMuteChanged，但接口要求返回订阅函数
  private muteListeners = new Set<(muted: boolean) => void>()
  private lastVolumePercent = 100
  private muted = false

  async start(cfg: AudioStartConfig): Promise<void> {
    // 已有连接则先停
    await this.stop()
    this.lastVolumePercent = cfg.volumePercent ?? 100
    this.muted = !!cfg.muted
    this.player = new (AudioStreamPlayer as any)({ url: cfg.url })
    this.player.onStatus = (text: string) => {
      const s = mapWebStatus(text)
      this.emitStatus(s)
    }
    this.player.connect()
    // 应用初始音量 / 静音
    if (this.muted) {
      this.player.setVolume(0)
    } else {
      this.player.setVolume(percentToGain(this.lastVolumePercent))
    }
  }

  async stop(): Promise<void> {
    if (!this.player) return
    try {
      this.player.disconnect()
    } catch {
      /* ignore */
    }
    this.player = null
    this.emitStatus('disconnected')
  }

  async setVolume(percent: number): Promise<void> {
    this.lastVolumePercent = percent
    if (this.muted) return
    if (this.player) {
      this.player.setVolume(percentToGain(percent))
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    this.muted = muted
    if (!this.player) return
    if (muted) {
      this.player.setVolume(0)
    } else {
      this.player.setVolume(percentToGain(this.lastVolumePercent))
    }
  }

  async resume(): Promise<void> {
    if (this.player && typeof this.player.resumeAudioContext === 'function') {
      this.player.resumeAudioContext()
    }
  }

  onStatus(cb: (s: AudioStatus) => void): () => void {
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }

  onMuteChanged(cb: (muted: boolean) => void): () => void {
    // Web 不会触发，但仍登记以保持对称
    this.muteListeners.add(cb)
    return () => this.muteListeners.delete(cb)
  }

  private emitStatus(s: AudioStatus) {
    for (const cb of this.statusListeners) {
      try {
        cb(s)
      } catch (err) {
        console.warn('[Audio] status listener error', err)
      }
    }
  }
}
