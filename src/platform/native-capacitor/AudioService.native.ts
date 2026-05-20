import { registerPlugin } from '@capacitor/core'
import type { IAudioService } from '../interfaces/IAudioService'
import type { AudioStartConfig, AudioStatus } from '../types/audio'

/**
 * FmoAudio 原生插件契约。
 * 方法：start / stop / setVolume / setMuted
 * 事件：
 *   - 'status' -> { status: 'connecting' | 'connected' | 'playing' | 'reconnecting' | 'disconnected' | 'error' }
 *   - 'muteChanged' -> { muted }
 */
interface FmoAudioPlugin {
  start(params: { url: string; volumePercent?: number; muted?: boolean }): Promise<void>
  stop(): Promise<void>
  setVolume(params: { volumePercent: number }): Promise<void>
  setMuted(params: { muted: boolean }): Promise<void>
  addListener(
    event: 'status' | 'muteChanged',
    cb: (payload: any) => void
  ): Promise<{ remove: () => Promise<void> }>
}

const FmoAudio = registerPlugin<FmoAudioPlugin>('FmoAudio')

function mapNativeStatus(raw: string): AudioStatus {
  switch (raw) {
    case 'connecting':
      return 'connecting'
    case 'connected':
      return 'connected'
    case 'playing':
      return 'playing'
    case 'reconnecting':
      return 'reconnecting'
    case 'error':
      return 'error'
    case 'disconnected':
    default:
      return 'disconnected'
  }
}

/**
 * Android 原生音频服务。由 FmoAudioPlugin 管理 MEDIA_PLAYBACK 前台服务、
 * WakeLock、以及通知栏媒体按钮。host 静音由原生侧基于 FmoEventsPlugin
 * 事件自动处理，不需要 JS 显式触发。
 */
export class NativeAudioService implements IAudioService {
  private statusListeners = new Set<(s: AudioStatus) => void>()
  private muteListeners = new Set<(muted: boolean) => void>()
  private statusHandle: { remove: () => Promise<void> } | null = null
  private muteHandle: { remove: () => Promise<void> } | null = null
  private listenersInstalled = false

  private installListeners() {
    if (this.listenersInstalled) return
    this.listenersInstalled = true
    FmoAudio.addListener('status', (payload: any) => {
      const s = mapNativeStatus(payload?.status || '')
      for (const cb of this.statusListeners) {
        try {
          cb(s)
        } catch (err) {
          console.warn('[Audio] status listener error', err)
        }
      }
    }).then((h) => {
      this.statusHandle = h
    })

    FmoAudio.addListener('muteChanged', (payload: any) => {
      const muted = !!payload?.muted
      for (const cb of this.muteListeners) {
        try {
          cb(muted)
        } catch (err) {
          console.warn('[Audio] mute listener error', err)
        }
      }
    }).then((h) => {
      this.muteHandle = h
    })
  }

  async start(cfg: AudioStartConfig): Promise<void> {
    this.installListeners()
    await FmoAudio.start({
      url: cfg.url,
      volumePercent: cfg.volumePercent ?? 100,
      muted: !!cfg.muted
    })
  }

  async stop(): Promise<void> {
    try {
      await FmoAudio.stop()
    } catch (err) {
      console.warn('[Audio] stop failed', err)
    }
  }

  async setVolume(percent: number): Promise<void> {
    try {
      await FmoAudio.setVolume({ volumePercent: percent })
    } catch {
      /* ignore */
    }
  }

  async setMuted(muted: boolean): Promise<void> {
    try {
      await FmoAudio.setMuted({ muted })
    } catch {
      /* ignore */
    }
  }

  async resume(): Promise<void> {
    /* native: no-op，FmoAudioPlugin 自己管理 MediaPlayer 生命周期 */
  }

  onStatus(cb: (s: AudioStatus) => void) {
    this.installListeners()
    this.statusListeners.add(cb)
    return () => this.statusListeners.delete(cb)
  }
  onMuteChanged(cb: (muted: boolean) => void) {
    this.installListeners()
    this.muteListeners.add(cb)
    return () => this.muteListeners.delete(cb)
  }
}
