import { defineStore } from 'pinia'
import { ref } from 'vue'
// @ts-ignore - legacy JS
import { normalizeHost } from '../utils/urlUtils'
import { getPlatform } from '../platform'
import type { AudioStatus } from '../platform/types/audio'

// 原生侧（Android）托管音频时，由原生自行处理 host 静音
const hasNativeAudio = getPlatform().capabilities.hasNativeAudio

function statusToText(s: AudioStatus): string {
  switch (s) {
    case 'connecting':
      return '音频连接中...'
    case 'connected':
      return '音频已连接'
    case 'playing':
      return '播放中'
    case 'reconnecting':
      return '音频重连中...'
    case 'error':
      return '音频连接错误'
    case 'disconnected':
      return '音频未连接'
    default:
      return ''
  }
}

/**
 * 音频播放 store（替代 composables/useAudioPlayer.js）。
 *
 * 职责：
 * - 维护 isPlaying / isMuted / hostMuted / audioStatus 响应式 state
 * - 驱动 platform.audio 执行 start/stop/setVolume/setMuted/resume
 * - 驱动 platform.background 在播放时启/停后台保活（Android 前台服务 + WakeLock）
 * - 订阅 platform.audio 的 onStatus / onMuteChanged 回推
 * - host 静音规则：Web 端通过 setVolume(0) 叠加实现，Android 交给原生
 */
export const useAudioPlayerStore = defineStore('audioPlayer', () => {
  const isPlaying = ref(false)
  const isMuted = ref(false)
  const hostMuted = ref(false)
  const audioStatus = ref('')

  let listenersInstalled = false
  let unsubStatus: (() => void) | null = null
  let unsubMute: (() => void) | null = null
  let visibilityBound = false

  // 非响应式：记录用户设置的音量（用于 hostMuted 恢复/取消静音）
  let currentVolumePercent = 100

  function installListeners() {
    if (listenersInstalled) return
    listenersInstalled = true
    const p = getPlatform()

    unsubStatus = p.audio.onStatus((s) => {
      audioStatus.value = statusToText(s)
      if (s === 'disconnected' || s === 'error') {
        isPlaying.value = false
        isMuted.value = false
      }
    })

    unsubMute = p.audio.onMuteChanged((muted) => {
      isMuted.value = muted
    })

    if (!visibilityBound) {
      document.addEventListener('visibilitychange', onVisibilityChange)
      visibilityBound = true
    }
  }

  function onVisibilityChange() {
    if (!isPlaying.value) return
    if (document.visibilityState === 'visible') {
      // Web：可能因页面隐藏 AudioContext 被挂起；Android：no-op
      getPlatform().audio.resume().catch(() => {})
    }
  }

  // ========== 公共 actions ==========
  async function startAudio(host: string, protocol: string) {
    if (!host) return
    installListeners()

    // 先停旧的
    await stopAudio()

    const wsProtocol = protocol === 'wss' ? 'wss' : 'ws'
    const normalizedHost = normalizeHost(host)
    const url = `${wsProtocol}://${normalizedHost}/audio`

    currentVolumePercent = 100
    isPlaying.value = true
    isMuted.value = false

    // 启动保活（Android 前台服务；Web 申请 WakeLock）
    try {
      await getPlatform().background.enable()
    } catch {
      /* ignore */
    }
    try {
      await getPlatform().audio.start({ url, volumePercent: 100, muted: false })
    } catch (e) {
      console.warn('[Audio] start failed', e)
      audioStatus.value = '音频连接错误'
      isPlaying.value = false
      try {
        await getPlatform().background.disable()
      } catch {
        /* ignore */
      }
    }
  }

  async function stopAudio() {
    try {
      await getPlatform().audio.stop()
    } catch {
      /* ignore */
    }
    isPlaying.value = false
    isMuted.value = false
    hostMuted.value = false
    audioStatus.value = ''
    try {
      await getPlatform().background.disable()
    } catch {
      /* ignore */
    }
  }

  async function toggleAudio(host: string, protocol: string) {
    if (isPlaying.value) {
      await stopAudio()
    } else {
      await startAudio(host, protocol)
    }
  }

  async function muteAudio() {
    if (!isPlaying.value) return
    await getPlatform().audio.setMuted(true)
    isMuted.value = true
  }

  async function unmuteAudio(volumePercent = 100) {
    if (!isPlaying.value) return
    currentVolumePercent = volumePercent
    await getPlatform().audio.setMuted(false)
    // host 静音期间不恢复实际音量
    if (!hostMuted.value) {
      await getPlatform().audio.setVolume(volumePercent)
    }
    isMuted.value = false
  }

  async function setVolume(volumePercent: number) {
    if (!isPlaying.value || isMuted.value) return
    currentVolumePercent = volumePercent
    if (hostMuted.value) return // host 静音期间只记录，不下发
    await getPlatform().audio.setVolume(volumePercent)
  }

  /**
   * 当前用户（host）发言时自动静音。
   * - 原生音频：由原生侧监听 events 自行处理，此处 no-op
   * - Web：通过 setVolume(0) 叠加实现，不影响用户的 isMuted
   */
  async function setHostMuted(m: boolean) {
    if (hasNativeAudio) return
    hostMuted.value = m
    if (!isPlaying.value) return
    if (m) {
      await getPlatform().audio.setVolume(0)
    } else if (!isMuted.value) {
      await getPlatform().audio.setVolume(currentVolumePercent)
    }
  }

  async function resumeAudio() {
    await getPlatform().audio.resume()
  }

  /**
   * 占位：原 composable 里已降为 no-op（通知栏文案由原生侧依据 events 自动组装）。
   */
  function updateSpeakerInfo(_callsign?: string, _address?: string) {
    /* no-op */
  }

  return {
    // state
    isPlaying,
    isMuted,
    hostMuted,
    audioStatus,
    // actions
    startAudio,
    stopAudio,
    toggleAudio,
    muteAudio,
    unmuteAudio,
    setVolume,
    setHostMuted,
    resumeAudio,
    updateSpeakerInfo
  }
})
