import { defineStore } from 'pinia'
import { ref } from 'vue'
// @ts-ignore - legacy JS
import { normalizeHost } from '../utils/urlUtils'

interface MessageSummary {
  messageId: string | number
  from: string
  timestamp: number
  isRead: boolean
}

interface RequestItem {
  subType: string
  data: any
  resolve: (v: any) => void
  reject: (e: any) => void
  timeoutId?: any
}

/**
 * 消息 store（替代 services/messageService.js 的单例实例）。
 *
 * 职责：
 * - 维护消息列表 / 分页状态 / WebSocket 连接状态
 * - 请求队列 + 5s 超时兜底
 * - 按需连接/断开（requestWithConnection）
 * - 服务端推送：summary / ack / xxxResponse
 *
 * 设计保持与原 MessageService 类的方法签名一致，services/messageService.js
 * 将降级为薄 facade 以保持所有现有调用点（MainLayout.vue / MessageView.vue）零修改。
 */
export const useMessageStore = defineStore('message', () => {
  // ========== state ==========
  const connected = ref(false)
  const busy = ref(false)
  const messageList = ref<MessageSummary[]>([])
  const hasMore = ref(true)
  const nextAnchorId = ref(0)

  // ========== 非响应式运行时 ==========
  let socket: WebSocket | null = null
  let connectPromise: Promise<void> | null = null
  let fmoAddress: string | null = null
  let protocol: string | null = null

  const requestQueue: RequestItem[] = []
  let currentRequest: RequestItem | null = null
  const requestTimeout = 5000

  const subscribers = new Map<string, Set<(data: any) => void>>()

  // ========== 事件 ==========
  function emit(event: string, data: any) {
    const callbacks = subscribers.get(event)
    if (!callbacks) return
    callbacks.forEach((cb) => {
      try {
        cb(data)
      } catch (err) {
        console.error(`事件处理错误 [${event}]:`, err)
      }
    })
  }

  function subscribe(event: string, callback: (data: any) => void) {
    if (!subscribers.has(event)) subscribers.set(event, new Set())
    subscribers.get(event)!.add(callback)
    return () => {
      subscribers.get(event)?.delete(callback)
    }
  }

  // ========== WebSocket ==========
  function connect(addr: string, proto: string): Promise<void> {
    if (socket && socket.readyState === WebSocket.OPEN) {
      return Promise.resolve()
    }
    if (socket && socket.readyState === WebSocket.CONNECTING && connectPromise) {
      return connectPromise
    }

    fmoAddress = addr
    protocol = proto

    const host = normalizeHost(addr)
    const wsProtocol = proto === 'https' || proto === 'wss' ? 'wss' : 'ws'
    const wsUrl = `${wsProtocol}://${host}/ws`

    connectPromise = new Promise<void>((resolve, reject) => {
      console.log(`[MessageStore] 连接到: ${wsUrl}`)
      socket = new WebSocket(wsUrl)

      socket.onopen = () => {
        console.log('[MessageStore] WebSocket 已连接')
        connected.value = true
        connectPromise = null
        emit('onDeviceStatusChange', { status: 'connected' })
        resolve()
      }

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          handleWebSocketMessage(msg)
        } catch (err) {
          console.error('[MessageStore] 解析消息失败:', err)
        }
      }

      socket.onerror = (error) => {
        console.error('[MessageStore] WebSocket 错误:', error)
        connected.value = false
        connectPromise = null
        emit('onDeviceStatusChange', { status: 'error' })
        reject(error)
      }

      socket.onclose = () => {
        console.log('[MessageStore] WebSocket 已关闭')
        connected.value = false
        connectPromise = null
        clearQueue()
        emit('onDeviceStatusChange', { status: 'disconnected' })
      }
    })

    return connectPromise
  }

  function disconnect() {
    if (socket) {
      try {
        if (
          socket.readyState === WebSocket.OPEN ||
          socket.readyState === WebSocket.CONNECTING
        ) {
          socket.close()
        }
      } catch (err) {
        console.error('[MessageStore] 关闭 WebSocket 失败:', err)
      }
      socket = null
    }
    connected.value = false
    clearQueue()
  }

  function handleWebSocketMessage(msg: any) {
    console.log('[MessageStore] 收到消息:', msg)
    if (msg.type === 'message') {
      if (msg.subType === 'summary') {
        handleNewMessageSummary(msg.data)
      } else if (msg.subType === 'ack') {
        emit('ack', msg.data)
      } else if (typeof msg.subType === 'string' && msg.subType.endsWith('Response')) {
        handleResponse(msg)
      }
    }
  }

  function handleNewMessageSummary(data: any) {
    const summary: MessageSummary = {
      messageId: data.messageId || data.id,
      from: data.from || data.callsign,
      timestamp: data.timestamp,
      isRead: data.isRead === true || data.isRead === 1
    }
    const exists = messageList.value.some((m) => m.messageId === summary.messageId)
    if (!exists) {
      messageList.value.splice(0, 0, summary)
      emit('newMessage', summary)
    }
  }

  function handleResponse(msg: any) {
    if (!currentRequest) return

    const { subType, data, code } = msg
    const requestSubType = currentRequest.subType

    const responseMap: Record<string, string> = {
      getListResponse: 'getList',
      getDetailResponse: 'getDetail',
      setReadResponse: 'setRead',
      sendResponse: 'send',
      deleteItemResponse: 'deleteItem',
      deleteAllResponse: 'deleteAll'
    }

    if (responseMap[subType] !== requestSubType) return

    if (currentRequest.timeoutId) {
      clearTimeout(currentRequest.timeoutId)
    }

    const isSuccess = code === 0
    let resultData: any
    if (requestSubType === 'getDetail' && data && data.message) {
      resultData = { ...data.message, status: isSuccess ? 'success' : 'error' }
    } else {
      resultData = { ...data, status: isSuccess ? 'success' : 'error' }
    }

    currentRequest.resolve(resultData)
    emit(requestSubType, resultData)

    currentRequest = null
    busy.value = false
    processQueue()
  }

  function sendRequest(subType: string, data: any) {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return
    }
    const request = { type: 'message', subType, data }
    console.log('[MessageStore] 发送请求:', request)
    socket.send(JSON.stringify(request))
  }

  function queueRequest(subType: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      requestQueue.push({ subType, data, resolve, reject })
      processQueue()
    })
  }

  async function requestWithConnection(
    addr: string,
    proto: string,
    subType: string,
    data: any
  ) {
    const shouldDisconnect = !connected.value
    if (shouldDisconnect) {
      await connect(addr, proto)
    }
    try {
      return await queueRequest(subType, data)
    } finally {
      if (shouldDisconnect) disconnect()
    }
  }

  function processQueue() {
    if (busy.value || requestQueue.length === 0) return
    if (!connected.value) return

    busy.value = true
    currentRequest = requestQueue.shift()!

    currentRequest.timeoutId = setTimeout(() => {
      if (currentRequest) {
        const result = { status: 'timeout', subType: currentRequest.subType }
        currentRequest.resolve(result)
        emit(currentRequest.subType, result)
        currentRequest = null
        busy.value = false
        processQueue()
      }
    }, requestTimeout)

    sendRequest(currentRequest.subType, currentRequest.data)
  }

  function clearQueue() {
    if (currentRequest?.timeoutId) {
      clearTimeout(currentRequest.timeoutId)
    }
    while (requestQueue.length > 0) {
      const request = requestQueue.shift()!
      request.reject(new Error('WebSocket 断开'))
    }
    currentRequest = null
    busy.value = false
  }

  // ========== API 方法 ==========
  async function getList(addr: string, proto: string, anchorId = 0, pageSize = 20) {
    const shouldDisconnect = !connected.value
    if (shouldDisconnect) {
      await connect(addr, proto)
    }

    try {
      const result = await queueRequest('getList', { pageSize, anchorId })

      if (result.status === 'success') {
        const list: MessageSummary[] = result.list || []
        if (anchorId === 0) {
          messageList.value.splice(0, messageList.value.length, ...list)
        } else {
          const existingIds = new Set(messageList.value.map((m) => m.messageId))
          const newItems = list.filter((m) => !existingIds.has(m.messageId))
          messageList.value.push(...newItems)
        }
        nextAnchorId.value = result.nextAnchorId || 0
        hasMore.value = result.nextAnchorId !== 0
      }
      return result
    } finally {
      if (shouldDisconnect) disconnect()
    }
  }

  function getDetail(addr: string, proto: string, messageId: string | number) {
    return requestWithConnection(addr, proto, 'getDetail', { messageId })
  }

  async function setRead(addr: string, proto: string, messageId: string | number) {
    const result = await requestWithConnection(addr, proto, 'setRead', { messageId })
    if (result.status === 'success' && result.result === 0) {
      const msg = messageList.value.find((m) => m.messageId === messageId)
      if (msg) msg.isRead = true
    }
    return result
  }

  function send(
    addr: string,
    proto: string,
    callsign: string,
    ssid: number,
    message: string
  ) {
    return requestWithConnection(addr, proto, 'send', { callsign, ssid, message })
  }

  async function deleteItem(addr: string, proto: string, messageId: string | number) {
    const result = await requestWithConnection(addr, proto, 'deleteItem', { messageId })
    if (result.status === 'success' && result.result === 0) {
      const index = messageList.value.findIndex((m) => m.messageId === messageId)
      if (index > -1) messageList.value.splice(index, 1)
    }
    return result
  }

  async function deleteAll(addr: string, proto: string) {
    const result = await requestWithConnection(addr, proto, 'deleteAll', {})
    if (result.status === 'success' && result.result === 0) {
      messageList.value = []
      hasMore.value = false
      nextAnchorId.value = 0
    }
    return result
  }

  function isBusy() {
    return busy.value
  }
  function isConnected() {
    return connected.value
  }

  return {
    // state (ref)
    connected,
    busy,
    messageList,
    hasMore,
    nextAnchorId,
    // actions
    connect,
    disconnect,
    handleNewMessageSummary,
    subscribe,
    getList,
    getDetail,
    setRead,
    send,
    deleteItem,
    deleteAll,
    isBusy,
    isConnected
  }
})
