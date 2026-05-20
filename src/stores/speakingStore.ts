import { defineStore } from 'pinia'
import { ref, computed, reactive } from 'vue'
// @ts-ignore - legacy JS
import { normalizeHost } from '../utils/urlUtils'
// @ts-ignore - legacy JS
import { gridToAddress } from '../services/gridService'
import { getPlatform } from '../platform'
import type { ServerInfo, EventsStatus } from '../platform/types/speaking'

// 是否由原生侧（Android）托管 events：连接池、快照、通知栏等
const hasNativeEvents = getPlatform().capabilities.hasNativeEvents

interface SpeakingRecord {
  callsign: string
  grid?: string
  startTime: number
  endTime: number | null
  serverName?: string
  serverUid?: string
}

function getStorageKey(addressId: string) {
  return `fmo_speaking_history_${addressId}`
}

function loadFromStorage(addressId: string): SpeakingRecord[] {
  if (hasNativeEvents) return []
  try {
    const raw = localStorage.getItem(getStorageKey(addressId))
    if (!raw) return []
    const list: SpeakingRecord[] = JSON.parse(raw)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    return list
      .filter((h) => (h.endTime || h.startTime) > oneHourAgo)
      .map((h) => ({ ...h, endTime: h.endTime || h.startTime }))
  } catch (err) {
    console.error(`[${addressId}] 加载发言历史失败:`, err)
    return []
  }
}

function saveToStorage(addressId: string, list: SpeakingRecord[]) {
  if (hasNativeEvents) return
  try {
    localStorage.setItem(getStorageKey(addressId), JSON.stringify(list))
  } catch (err) {
    console.error(`[${addressId}] 保存发言历史失败:`, err)
  }
}

function formatAddr(data: any): string {
  if (!data) return ''
  return data.city || data.province || ''
}

/**
 * Speaking 状态 store（替代 composables/useSpeakingStatus.js 中的业务态部分）。
 *
 * 职责：
 * - 订阅 platform.events 推送的 onMessage/onStatus/onServerInfo
 * - 按 addressId 维护：当前发言人、发言历史、地址、host 标记、serverInfo
 * - Web 端 localStorage 持久化；Android 由原生 SharedPreferences 兜底
 * - 暴露 connect/disconnect 等 actions 驱动 platform.events
 */
export const useSpeakingStatusStore = defineStore('speakingStatus', () => {
  // ========== 核心 state（按 addressId 隔离） ==========
  const currentSpeakerMap = reactive(new Map<string, string>())
  const speakingHistoryMap = reactive(new Map<string, SpeakingRecord[]>())
  const speakerAddressMap = reactive(new Map<string, string>())
  const isHostSpeakingMap = reactive(new Map<string, boolean>())
  const serverInfoMap = reactive(new Map<string, ServerInfo>())

  const connectionConfigs = new Map<
    string,
    { host: string; protocol: string; isPrimary: boolean }
  >()
  const statusMap = reactive(new Map<string, EventsStatus>())
  const changeCounter = ref(0)

  const cleanupTimers = new Map<string, any>()
  let unsubMsg: (() => void) | null = null
  let unsubStatus: (() => void) | null = null
  let unsubInfo: (() => void) | null = null
  let visibilityBound = false
  let listenersInstalled = false

  const primaryAddressId = ref<string | null>(null)
  const primaryConnected = ref(false)

  let onMessageCallback: ((data: any) => void) | null = null

  // ========== 派生 getter ==========
  const eventsConnected = computed(() => {
    changeCounter.value
    for (const s of statusMap.values()) {
      if (s === 'connected') return true
    }
    return false
  })

  const currentSpeaker = computed(() => {
    if (!primaryAddressId.value) return ''
    return currentSpeakerMap.get(primaryAddressId.value) || ''
  })

  const speakingHistory = computed<SpeakingRecord[]>(() => {
    if (!primaryAddressId.value) return []
    return speakingHistoryMap.get(primaryAddressId.value) || []
  })

  const currentSpeakerGrid = computed(() => {
    if (!primaryAddressId.value) return ''
    const callsign = currentSpeakerMap.get(primaryAddressId.value)
    if (!callsign) return ''
    const hist = speakingHistoryMap.get(primaryAddressId.value) || []
    const rec = hist.find((h) => !h.endTime && h.callsign === callsign)
    return rec?.grid || ''
  })

  const currentSpeakerAddress = computed(() => {
    if (!primaryAddressId.value) return ''
    return speakerAddressMap.get(primaryAddressId.value) || ''
  })

  const isHostSpeaking = computed(() => {
    if (!primaryAddressId.value) return false
    return isHostSpeakingMap.get(primaryAddressId.value) || false
  })

  const primaryServerInfo = computed<ServerInfo | null>(() => {
    if (!primaryAddressId.value) return null
    return serverInfoMap.get(primaryAddressId.value) || null
  })

  const allSpeakingHistories = computed(() => {
    changeCounter.value
    const all: any[] = []
    for (const [addressId, hist] of speakingHistoryMap.entries()) {
      for (const r of hist) all.push({ ...r, addressId })
    }
    return all.sort((a, b) => b.startTime - a.startTime)
  })

  const allCurrentSpeakers = computed(() => {
    changeCounter.value
    const out: any[] = []
    for (const [addressId, callsign] of currentSpeakerMap.entries()) {
      if (callsign) {
        out.push({ addressId, callsign, address: speakerAddressMap.get(addressId) || '' })
      }
    }
    return out
  })

  // ========== 内部：处理 events 原始消息 ==========
  function handleRawMessage(addressId: string, data: string) {
    const cfg = connectionConfigs.get(addressId)
    if (!cfg) return
    const isPrimary = cfg.isPrimary

    const messages = data.split('}{').map((msg, index, arr) => {
      if (arr.length === 1) return msg
      if (index === 0) return msg + '}'
      if (index === arr.length - 1) return '{' + msg
      return '{' + msg + '}'
    })

    let history = speakingHistoryMap.get(addressId)
    if (!history) {
      history = []
      speakingHistoryMap.set(addressId, history)
    }
    let changed = false

    for (const msgStr of messages) {
      try {
        const msg: any = JSON.parse(msgStr)
        if (msg.type === 'qso' && msg.subType === 'callsign' && msg.data) {
          const { callsign, isSpeaking } = msg.data
          const isHost = !!msg.data.isHost
          const now = Date.now()

          if (isSpeaking && callsign) {
            const grid = msg.data.grid || ''
            if (grid) {
              gridToAddress(grid)
                .then((r: any) => speakerAddressMap.set(addressId, formatAddr(r)))
                .catch(() => speakerAddressMap.set(addressId, ''))
            } else {
              speakerAddressMap.set(addressId, '')
            }

            history.forEach((h) => {
              if (!h.endTime) h.endTime = now
            })
            currentSpeakerMap.set(addressId, callsign)
            isHostSpeakingMap.set(addressId, isHost)

            const sInfo = serverInfoMap.get(addressId)
            const existingIdx = history.findIndex((h) => h.callsign === callsign)
            if (existingIdx >= 0) {
              const existing = history.splice(existingIdx, 1)[0]
              existing.startTime = now
              existing.endTime = null
              existing.grid = grid
              if (sInfo) {
                existing.serverName = sInfo.name
                existing.serverUid = sInfo.uid
              }
              history.unshift(existing)
            } else {
              const rec: SpeakingRecord = {
                callsign,
                grid,
                startTime: now,
                endTime: null
              }
              if (sInfo) {
                rec.serverName = sInfo.name
                rec.serverUid = sInfo.uid
              }
              history.unshift(rec)
            }
            changed = true
            saveToStorage(addressId, history)
          } else {
            history.forEach((h) => {
              if (!h.endTime) h.endTime = now
            })
            currentSpeakerMap.set(addressId, '')
            isHostSpeakingMap.set(addressId, false)
            changed = true
            saveToStorage(addressId, history)
          }
        } else if (msg.type === 'message' && msg.subType === 'summary') {
          if (isPrimary && onMessageCallback) {
            onMessageCallback(msg.data)
          }
        }
      } catch {
        /* ignore parse error */
      }
    }

    if (changed) {
      speakingHistoryMap.set(addressId, [...history])
      changeCounter.value++
    }
  }

  // ========== 内部：应用原生快照 ==========
  function applyNativeSnapshot(entry: any) {
    if (!entry || !entry.addressId) return
    const { addressId, currentSpeaker, currentGrid, currentIsHost, history: nativeHistory } = entry
    if (!connectionConfigs.has(addressId)) return

    currentSpeakerMap.set(addressId, currentSpeaker || '')
    isHostSpeakingMap.set(addressId, !!currentIsHost)

    if (currentGrid) {
      gridToAddress(currentGrid)
        .then((r: any) => speakerAddressMap.set(addressId, formatAddr(r)))
        .catch(() => speakerAddressMap.set(addressId, ''))
    } else {
      speakerAddressMap.set(addressId, '')
    }

    const existing = speakingHistoryMap.get(addressId) || []
    const sInfo = serverInfoMap.get(addressId)
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const merged = new Map<string, SpeakingRecord>()

    function toRecord(h: any): SpeakingRecord {
      const rec: SpeakingRecord = {
        callsign: h.callsign,
        grid: h.grid || '',
        startTime: h.startTime,
        endTime: h.endTime == null ? null : h.endTime
      }
      if (sInfo) {
        rec.serverName = sInfo.name
        rec.serverUid = sInfo.uid
      }
      return rec
    }

    for (const h of existing) {
      const t = h.endTime || h.startTime
      if (t < oneHourAgo) continue
      merged.set(h.callsign, toRecord(h))
    }
    for (const h of nativeHistory || []) {
      const t = h.endTime != null ? h.endTime : h.startTime
      if (t < oneHourAgo) continue
      merged.set(h.callsign, toRecord(h))
    }

    const list = Array.from(merged.values()).sort((a, b) => b.startTime - a.startTime)
    speakingHistoryMap.set(addressId, list)
    saveToStorage(addressId, list)
    changeCounter.value++
  }

  async function syncFromNativeSnapshot(addressId?: string) {
    if (!hasNativeEvents) return
    try {
      const snap = await getPlatform().events.getSnapshot(addressId)
      for (const entry of snap.connections || []) applyNativeSnapshot(entry)
    } catch (err) {
      console.warn('[Events] syncFromNativeSnapshot failed', err)
    }
  }

  // ========== 内部：订阅 platform.events ==========
  function installListeners() {
    if (listenersInstalled) return
    listenersInstalled = true
    const p = getPlatform()

    unsubMsg = p.events.onMessage((addressId, data) => {
      handleRawMessage(addressId, data)
    })

    unsubStatus = p.events.onStatus((addressId, status) => {
      const cfg = connectionConfigs.get(addressId)
      statusMap.set(addressId, status)
      changeCounter.value++
      if (status === 'connected') {
        if (cfg?.isPrimary) primaryConnected.value = true
        startHistoryCleanup(addressId)
        if (hasNativeEvents) syncFromNativeSnapshot(addressId)
      } else if (status === 'reconnecting') {
        if (cfg?.isPrimary) primaryConnected.value = false
      } else if (status === 'disconnected') {
        if (cfg?.isPrimary) primaryConnected.value = false
        stopHistoryCleanup(addressId)
      }
    })

    unsubInfo = p.events.onServerInfo((addressId, info) => {
      serverInfoMap.set(addressId, info)
      changeCounter.value++
    })

    if (hasNativeEvents && !visibilityBound) {
      document.addEventListener('visibilitychange', onVisibilityChange)
      visibilityBound = true
    }
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible') {
      syncFromNativeSnapshot()
    }
  }

  function pushCachedServerNameIfAny(addressId: string) {
    if (!hasNativeEvents || !addressId) return
    const info = serverInfoMap.get(addressId)
    const name = info?.name || ''
    if (!name) return
    getPlatform().events.updateServerName(addressId, name)
  }

  // ========== 清理定时器 ==========
  function cleanupHistory(addressId: string) {
    const hist = speakingHistoryMap.get(addressId)
    if (!hist) return
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    const oldLen = hist.length
    const filtered = hist.filter((h) => (h.endTime || h.startTime) > oneHourAgo)
    if (oldLen !== filtered.length) {
      speakingHistoryMap.set(addressId, filtered)
      saveToStorage(addressId, filtered)
      changeCounter.value++
    }
  }
  function startHistoryCleanup(addressId: string) {
    if (cleanupTimers.has(addressId)) return
    const t = setInterval(() => cleanupHistory(addressId), 60000)
    cleanupTimers.set(addressId, t)
  }
  function stopHistoryCleanup(addressId: string) {
    const t = cleanupTimers.get(addressId)
    if (t) {
      clearInterval(t)
      cleanupTimers.delete(addressId)
    }
  }

  // ========== 公共 actions ==========
  function buildWsUrl(host: string, protocol: string) {
    const normalizedHost = normalizeHost(host)
    return {
      wsUrl: `${protocol}://${normalizedHost}/events`,
      // 完整的 station WebSocket URL，调用端直接使用，不再自行拼接 /ws
      apiUrl: `${protocol}://${normalizedHost}/ws`
    }
  }

  function connectEventWs(host: string, protocol: string) {
    if (!host) return
    installListeners()
    const addressId = 'single'
    // 若已连接/连接中，忽略
    if (statusMap.get(addressId) === 'connected') return

    primaryAddressId.value = addressId
    connectionConfigs.set(addressId, { host, protocol, isPrimary: true })
    speakingHistoryMap.set(addressId, loadFromStorage(addressId))

    if (hasNativeEvents) {
      pushCachedServerNameIfAny(addressId)
      getPlatform().events.setPrimary(addressId)
    }
    const { wsUrl, apiUrl } = buildWsUrl(host, protocol)
    getPlatform().events.connect({ addressId, url: wsUrl, apiUrl }).catch((err) => {
      console.warn(`[${addressId}] connect failed`, err)
    })
  }

  function disconnectEventWs(addressId: string) {
    connectionConfigs.delete(addressId)
    getPlatform().events.disconnect(addressId).catch(() => {})
    stopHistoryCleanup(addressId)

    currentSpeakerMap.delete(addressId)
    speakingHistoryMap.delete(addressId)
    speakerAddressMap.delete(addressId)
    isHostSpeakingMap.delete(addressId)
    serverInfoMap.delete(addressId)
    statusMap.delete(addressId)

    if (addressId === primaryAddressId.value) {
      primaryConnected.value = false
      primaryAddressId.value = null
      if (hasNativeEvents) getPlatform().events.setPrimary('')
    }
    changeCounter.value++
  }

  function connectMultipleEventWs(
    addresses: Array<{ id: string; host: string; protocol: string }>,
    primaryId: string
  ) {
    if (!addresses || addresses.length === 0) return
    installListeners()

    // 先断开所有旧连接
    disconnectAllEventWs()
    primaryAddressId.value = primaryId

    if (hasNativeEvents) {
      pushCachedServerNameIfAny(primaryId)
      getPlatform().events.setPrimary(primaryId || '')
    }

    for (const addr of addresses) {
      const isPrimary = addr.id === primaryId
      connectionConfigs.set(addr.id, { host: addr.host, protocol: addr.protocol, isPrimary })
      speakingHistoryMap.set(addr.id, loadFromStorage(addr.id))
      const { wsUrl, apiUrl } = buildWsUrl(addr.host, addr.protocol)
      getPlatform()
        .events.connect({ addressId: addr.id, url: wsUrl, apiUrl })
        .catch((err) => console.warn(`[${addr.id}] connect failed`, err))
    }
  }

  function disconnectAllEventWs() {
    getPlatform().events.disconnectAll().catch(() => {})

    for (const addressId of Array.from(cleanupTimers.keys())) stopHistoryCleanup(addressId)
    cleanupTimers.clear()

    connectionConfigs.clear()
    currentSpeakerMap.clear()
    speakingHistoryMap.clear()
    speakerAddressMap.clear()
    isHostSpeakingMap.clear()
    serverInfoMap.clear()
    statusMap.clear()

    primaryConnected.value = false
    primaryAddressId.value = null
    if (hasNativeEvents) getPlatform().events.setPrimary('')
    changeCounter.value++
  }

  function getSpeakingHistoryFor(addressId: string): SpeakingRecord[] {
    return speakingHistoryMap.get(addressId) || []
  }

  function isAddressConnected(addressId: string): boolean {
    return statusMap.get(addressId) === 'connected'
  }

  async function getServerInfo(
    addressId: string,
    forceRefresh = false
  ): Promise<ServerInfo | null> {
    if (forceRefresh) {
      await getPlatform().events.refreshServerInfo(addressId)
    }
    return serverInfoMap.get(addressId) || null
  }

  function updateServerInfo(addressId: string, info: ServerInfo) {
    if (info && info.uid) {
      serverInfoMap.set(addressId, { uid: info.uid, name: info.name || '' })
      changeCounter.value++
    }
  }

  function setOnMessageCallback(cb: ((data: any) => void) | null) {
    onMessageCallback = cb
  }

  function clearSpeakingHistory() {
    for (const addressId of Array.from(currentSpeakerMap.keys())) {
      currentSpeakerMap.set(addressId, '')
    }
    for (const addressId of Array.from(speakingHistoryMap.keys())) {
      speakingHistoryMap.set(addressId, [])
      saveToStorage(addressId, [])
    }
    changeCounter.value++
  }

  return {
    // 响应式 state / computed
    primaryAddressId,
    primaryConnected,
    eventsConnected,
    currentSpeaker,
    currentSpeakerGrid,
    currentSpeakerAddress,
    isHostSpeaking,
    speakingHistory,
    primaryServerInfo,
    allSpeakingHistories,
    allCurrentSpeakers,

    // actions
    connectEventWs,
    disconnectEventWs,
    connectMultipleEventWs,
    disconnectAllEventWs,
    getSpeakingHistoryFor,
    isAddressConnected,
    getServerInfo,
    updateServerInfo,
    setOnMessageCallback,
    clearSpeakingHistory
  }
})
