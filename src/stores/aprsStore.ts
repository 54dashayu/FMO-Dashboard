import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  parseCallsignSsid,
  buildAPRSPacket,
  nextCounter,
  type CounterState
} from '../core/aprsCodec'
import { validateAPRS } from '../core/aprsPasscode'
import { getPlatform } from '../platform'

// ========== LocalStorage keys ==========
const STORAGE_KEY = {
  PARAMS: 'fmo_aprs_params',
  HISTORY: 'fmo_aprs_history',
  COUNTER: 'fmo_aprs_counter',
  SERVER_LIST: 'fmo_aprs_server_list',
  ACTIVE_SERVER_ID: 'fmo_aprs_active_server_id'
}

const DEFAULT_SERVER = 'wss://fmoac.srv.ink/api/ws'
const DEFAULT_SERVER_ITEM = {
  id: 'default',
  url: DEFAULT_SERVER,
  isDefault: true
}
const AUTO_DISCONNECT_DELAY = 60000

// 呼号/密钥验证规则
const VALIDATION = {
  CALLSIGN: /^B[A-Z][0-9][A-Z]{2,3}$/,
  SECRET: /^[A-Z0-9]{12}$/,
  PASSCODE: /^\d{1,5}$/
}

interface HistoryRecord {
  operationType: 'send' | 'success' | 'fail'
  success: boolean | null
  type: string
  message: string
  raw?: string
  timestamp: string
}

interface ServerItem {
  id: string
  url: string
  isDefault: boolean
}

// ========== 本地存储辅助 ==========
function saveParams(p: any) {
  localStorage.setItem(STORAGE_KEY.PARAMS, JSON.stringify(p))
}
function loadParams() {
  const data = localStorage.getItem(STORAGE_KEY.PARAMS)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
function saveHistoryRecord(record: HistoryRecord) {
  let history: HistoryRecord[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY.HISTORY) || '[]'
  )
  history.unshift({ ...record, timestamp: new Date().toISOString() })
  if (history.length > 20) history = history.slice(0, 20)
  localStorage.setItem(STORAGE_KEY.HISTORY, JSON.stringify(history))
}
function loadHistoryFromStorage(): HistoryRecord[] {
  const data = localStorage.getItem(STORAGE_KEY.HISTORY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}
function clearHistoryStorage() {
  localStorage.removeItem(STORAGE_KEY.HISTORY)
}
function loadCounterState(): CounterState | null {
  const data = localStorage.getItem(STORAGE_KEY.COUNTER)
  if (!data) return null
  try {
    return JSON.parse(data)
  } catch {
    return null
  }
}
function saveCounterState(state: CounterState) {
  localStorage.setItem(
    STORAGE_KEY.COUNTER,
    JSON.stringify({ ...state, last_updated: new Date().toISOString() })
  )
}
function saveServerList(list: ServerItem[]) {
  const custom = list.filter((s) => !s.isDefault)
  localStorage.setItem(STORAGE_KEY.SERVER_LIST, JSON.stringify(custom))
}
function loadServerList(): ServerItem[] {
  const data = localStorage.getItem(STORAGE_KEY.SERVER_LIST)
  let custom: ServerItem[] = []
  if (data) {
    try {
      custom = JSON.parse(data)
    } catch {
      custom = []
    }
  }
  return [DEFAULT_SERVER_ITEM, ...custom]
}
function saveActiveServerId(id: string) {
  localStorage.setItem(STORAGE_KEY.ACTIVE_SERVER_ID, id)
}
function loadActiveServerId(): string {
  return localStorage.getItem(STORAGE_KEY.ACTIVE_SERVER_ID) || 'default'
}

/**
 * APRS 远程控制 store（替代原 composables/useAprsControl.js）。
 *
 * Android 原生：直接走 platform.aprs.sendCommand（TCP 直连 APRS-IS）。
 * Web/Tauri：连 WebSocket 中转服务，登录后发送 rawPacket 并等 ACK。
 * 两条路径的 UI 状态由本 store 统一承载，上层组件只订阅 state、调用 actions。
 */
export const useAprsStore = defineStore('aprs', () => {
  // ========== state ==========
  const ws = ref<WebSocket | null>(null)
  const wsConnected = ref(false)
  const wsConnecting = ref(false)
  const statusMessage = ref('未连接')
  const statusType = ref<'info' | 'success'>('info')
  const history = ref<HistoryRecord[]>([])
  const sending = ref(false)

  const serverList = ref<ServerItem[]>([DEFAULT_SERVER_ITEM])
  const activeServerId = ref('default')
  const mycall = ref('')
  const passcode = ref('')
  const secret = ref('')
  const tocall = ref('')

  let autoDisconnectTimer: any = null

  const currentServerUrl = computed(() => {
    const s = serverList.value.find((x) => x.id === activeServerId.value)
    return s ? s.url : DEFAULT_SERVER
  })

  const canSend = computed(() => {
    if (sending.value) return false
    try {
      const { call: myCallBase } = parseCallsignSsid(mycall.value)
      if (!VALIDATION.CALLSIGN.test(myCallBase)) return false
    } catch {
      return false
    }
    try {
      const { call: toCallBase } = parseCallsignSsid(tocall.value)
      if (!VALIDATION.CALLSIGN.test(toCallBase)) return false
    } catch {
      return false
    }
    if (!VALIDATION.PASSCODE.test(passcode.value)) return false
    try {
      const { call: myCallBase } = parseCallsignSsid(mycall.value)
      if (!validateAPRS(myCallBase, passcode.value)) return false
    } catch {
      return false
    }
    if (!VALIDATION.SECRET.test(secret.value)) return false
    return true
  })

  // ========== 定时器 ==========
  function clearAutoDisconnectTimer() {
    if (autoDisconnectTimer) {
      clearTimeout(autoDisconnectTimer)
      autoDisconnectTimer = null
    }
  }
  function resetAutoDisconnectTimer() {
    clearAutoDisconnectTimer()
    autoDisconnectTimer = setTimeout(() => {
      if (wsConnected.value && !sending.value) {
        if (ws.value) {
          ws.value.close()
          ws.value = null
        }
        clearAutoDisconnectTimer()
      }
    }, AUTO_DISCONNECT_DELAY)
  }

  // ========== WebSocket 连接（Web 中转路径） ==========
  function connectWebSocket(testOnly = false): Promise<void> {
    const serverUrl = currentServerUrl.value
    if (!serverUrl) {
      statusMessage.value = '请先选择服务器'
      statusType.value = 'info'
      return Promise.reject(new Error('请先选择服务器'))
    }
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      if (testOnly) {
        disconnectWebSocket()
        statusMessage.value = '测试成功'
        statusType.value = 'success'
        return Promise.resolve()
      } else {
        resetAutoDisconnectTimer()
        return Promise.resolve()
      }
    }
    if (wsConnected.value && (!ws.value || ws.value.readyState !== WebSocket.OPEN)) {
      wsConnected.value = false
    }
    if (wsConnecting.value) {
      return new Promise((resolve, reject) => {
        const timer = setInterval(() => {
          if (wsConnected.value) {
            clearInterval(timer)
            resolve()
          } else if (!wsConnecting.value) {
            clearInterval(timer)
            reject(new Error('连接失败'))
          }
        }, 100)
      })
    }

    wsConnecting.value = true
    statusMessage.value = '正在连接...'
    statusType.value = 'info'

    return new Promise((resolve, reject) => {
      try {
        ws.value = new WebSocket(serverUrl)
      } catch (err: any) {
        wsConnecting.value = false
        statusMessage.value = `连接失败: ${err?.message || err}`
        statusType.value = 'info'
        reject(err)
        return
      }
      ws.value.onopen = () => {
        wsConnecting.value = false
        wsConnected.value = true
        if (testOnly) {
          statusMessage.value = '测试成功'
          statusType.value = 'success'
          setTimeout(() => {
            if (ws.value) {
              ws.value.close()
              ws.value = null
            }
          }, 500)
          resolve()
        } else {
          statusMessage.value = '已连接'
          statusType.value = 'success'
          resetAutoDisconnectTimer()
          resolve()
        }
      }
      ws.value.onclose = () => {
        wsConnecting.value = false
        clearAutoDisconnectTimer()
        if (!testOnly && statusType.value !== 'success') {
          wsConnected.value = false
          statusMessage.value = '连接已断开'
          statusType.value = 'info'
        }
      }
      ws.value.onerror = () => {
        wsConnecting.value = false
        wsConnected.value = false
        clearAutoDisconnectTimer()
        statusMessage.value = '连接错误'
        statusType.value = 'info'
        reject(new Error('连接错误'))
      }
      ws.value.onmessage = (event) => {
        try {
          handleServerResponse(JSON.parse(event.data))
        } catch {
          console.error('[APRS] 消息解析失败')
        }
        if (!testOnly) resetAutoDisconnectTimer()
      }
    })
  }

  function disconnectWebSocket() {
    clearAutoDisconnectTimer()
    if (ws.value) {
      ws.value.close()
      ws.value = null
    }
    wsConnected.value = false
    wsConnecting.value = false
  }

  function handleServerResponse(result: any) {
    sending.value = false
    const { success, type, message, raw, timestamp } = result
    saveHistoryRecord({
      operationType: success ? 'success' : 'fail',
      success,
      type,
      message,
      raw: raw || '',
      timestamp: timestamp || new Date().toISOString()
    })
    history.value = loadHistoryFromStorage()
    statusMessage.value = success ? `✅ ${message}` : `❌ ${message}`
    statusType.value = success ? 'success' : 'info'
  }

  // ========== 发送指令（Android 走 platform.aprs；Web 走 WS 中转） ==========
  async function sendCommand(action: string) {
    sending.value = true
    try {
      const mycallInput = mycall.value.trim()
      const passcodeInput = passcode.value.trim()
      const secretInput = secret.value.trim()
      let tocallInput = tocall.value.trim()
      if (!mycallInput) throw new Error('请输入登录呼号')
      if (!passcodeInput) throw new Error('请输入 APRS 密钥')
      if (!secretInput) throw new Error('请输入设备密钥')
      if (!tocallInput) tocallInput = mycallInput

      const { call: myCall, ssid: mySsid } = parseCallsignSsid(mycallInput)
      const { call: toCall, ssid: toSsid } = parseCallsignSsid(tocallInput)
      if (!validateAPRS(myCall, passcodeInput)) {
        throw new Error('APRS 密钥与呼号不匹配')
      }
      saveParams({
        mycall: mycallInput,
        passcode: passcodeInput,
        secret: secretInput,
        tocall: tocallInput
      })

      const timeSlot = Math.floor(Date.now() / 1000 / 60)
      const { counter, next } = nextCounter(loadCounterState(), timeSlot)
      saveCounterState(next)

      const rawPacket = buildAPRSPacket({
        mycall: myCall,
        mySSID: mySsid,
        tocall: toCall,
        toSSID: toSsid,
        action,
        secret: secretInput,
        timeSlot,
        counter
      })
      const mycallFull = `${myCall}-${mySsid}`
      const tocallFull = `${toCall}-${toSsid}`

      const actionMap: Record<string, string> = {
        NORMAL: '普通模式',
        STANDBY: '待机模式',
        REBOOT: '软重启'
      }
      const actionText = actionMap[action] || action
      saveHistoryRecord({
        operationType: 'send',
        success: null,
        type: 'send',
        message: `${mycallFull} -> ${tocallFull} 发送「${actionText}」控制指令`,
        raw: rawPacket,
        timestamp: new Date().toISOString()
      })
      history.value = loadHistoryFromStorage()

      const platform = getPlatform()
      if (platform.capabilities.hasNativeAprs && platform.aprs.isAvailable()) {
        // Android：直连 APRS-IS
        statusMessage.value = `正在发送 ${action} 指令...`
        statusType.value = 'info'
        try {
          const result = await platform.aprs.sendCommand({
            mycall: mycallFull,
            passcode: passcodeInput,
            tocall: tocallFull,
            rawPacket,
            waitAck: 20
          })
          handleServerResponse(result)
        } catch (err: any) {
          handleServerResponse({
            success: false,
            type: 'error',
            message: err?.message || String(err),
            raw: '',
            timestamp: new Date().toISOString()
          })
        }
        return
      }

      // Web：按需连 WebSocket 中转
      await connectWebSocket()
      if (!ws.value || ws.value.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket 未连接')
      }
      const request = {
        type: 'send',
        mycall: mycallFull,
        passcode: passcodeInput,
        tocall: tocallFull,
        rawPacket,
        waitAck: 20
      }
      ws.value.send(JSON.stringify(request))
      statusMessage.value = `正在发送 ${action} 指令...`
      statusType.value = 'info'
      resetAutoDisconnectTimer()
    } catch (err: any) {
      sending.value = false
      statusMessage.value = `错误: ${err.message}`
      statusType.value = 'info'
    }
  }

  // ========== 初始化 ==========
  function init() {
    const params = loadParams()
    if (params) {
      mycall.value = params.mycall || ''
      passcode.value = params.passcode || ''
      secret.value = params.secret || ''
      tocall.value = params.tocall || ''
    }
    history.value = loadHistoryFromStorage()
    serverList.value = loadServerList()
    activeServerId.value = loadActiveServerId()
    return params
  }

  function saveCurrentParams() {
    saveParams({
      mycall: mycall.value,
      passcode: passcode.value,
      secret: secret.value,
      tocall: tocall.value
    })
  }

  function clearHistory() {
    clearHistoryStorage()
    history.value = []
  }

  function addServer(_name: string, url: string) {
    const s: ServerItem = { id: Date.now().toString(), url, isDefault: false }
    serverList.value.push(s)
    saveServerList(serverList.value)
    return s.id
  }

  function deleteServer(serverId: string) {
    if (serverId === 'default') return
    serverList.value = serverList.value.filter((s) => s.id !== serverId)
    saveServerList(serverList.value)
    if (activeServerId.value === serverId) selectServer('default')
  }

  function updateServer(serverId: string, _name: string, url: string) {
    if (serverId === 'default') return
    const s = serverList.value.find((x) => x.id === serverId)
    if (s) {
      s.url = url
      saveServerList(serverList.value)
    }
  }

  function selectServer(serverId: string) {
    activeServerId.value = serverId
    saveActiveServerId(serverId)
    if (wsConnected.value) disconnectWebSocket()
    statusMessage.value = '正在测试服务器连接...'
    statusType.value = 'info'
    connectWebSocket(true).catch((err) => {
      statusMessage.value = `连接失败: ${err.message}`
      statusType.value = 'info'
    })
  }

  function updateCallsign(newCallsign: string) {
    if (newCallsign && typeof newCallsign === 'string') {
      mycall.value = newCallsign.toUpperCase()
      if (!tocall.value || tocall.value === mycall.value) {
        tocall.value = newCallsign.toUpperCase()
      }
    }
  }

  return {
    // state
    wsConnected,
    wsConnecting,
    statusMessage,
    statusType,
    history,
    sending,
    canSend,
    serverList,
    activeServerId,
    currentServerUrl,
    mycall,
    passcode,
    secret,
    tocall,
    // actions
    init,
    connectWebSocket,
    disconnectWebSocket,
    sendCommand,
    clearHistory,
    addServer,
    deleteServer,
    updateServer,
    selectServer,
    updateCallsign,
    saveCurrentParams
  }
})
