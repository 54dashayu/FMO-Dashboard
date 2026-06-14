import {
  buildWebSocketUrl,
  getLocalMdnsTroubleshootingMessage,
  isValidHostAddress,
  normalizeHost
} from '../utils/urlUtils'

function formatWebSocketCreateError(error, wsUrl) {
  const message = error?.message || String(error)
  if (/insecure WebSocket|loaded over HTTPS/i.test(message)) {
    return `当前页面被浏览器按 HTTPS 处理，不能直接连接 ${wsUrl}。请用 http://fmo.bh1jss.net/ 打开网页后再同步；如果浏览器自动跳到 HTTPS，请换用本地版、Android/Win64 版，或关闭浏览器的“始终使用安全连接”。`
  }
  const mdnsMessage = getLocalMdnsTroubleshootingMessage(wsUrl)
  if (mdnsMessage) return mdnsMessage
  return message || `WebSocket connection failed: ${wsUrl}`
}

function formatWebSocketConnectionError(wsUrl) {
  const mdnsMessage = getLocalMdnsTroubleshootingMessage(wsUrl)
  return mdnsMessage || `WebSocket connection failed: ${wsUrl}`
}

export class FmoApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl
    this.socket = null
    this.pendingRequests = new Map()
    this.connectPromise = null
    this.timeoutTimers = new Map()
  }

  // 检查是否为有效的IP地址或域名（可带端口号）
  isValidAddress(address) {
    return isValidHostAddress(address)
  }

  async connect() {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return
    }

    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      return this.connectPromise
    }

    let host = normalizeHost(this.baseUrl)
    const protocol = this.baseUrl.startsWith('wss') ? 'wss' : 'ws'
    // 兼容两种 baseUrl：
    //  1) 基础地址，如 'wss://host'           → 自动拼 /ws
    //  2) 完整地址，如 'wss://host/ws'        → 直接使用，避免拼成 /ws/ws
    const wsUrl = host.endsWith('/ws')
      ? buildWebSocketUrl(host.replace(/\/ws$/i, ''), protocol, '/ws')
      : buildWebSocketUrl(host, protocol, '/ws')

    this.connectPromise = new Promise((resolve, reject) => {
      console.log(`Connecting to FMO: ${wsUrl}`)
      try {
        this.socket = new WebSocket(wsUrl)
      } catch (error) {
        this.connectPromise = null
        reject(new Error(formatWebSocketCreateError(error, wsUrl)))
        return
      }

      // 内网穿透/移动网络下 WebSocket 握手偶尔会超过 5 秒，放宽一点减少误判。
      const connectTimeout = setTimeout(() => {
        console.error('FMO WebSocket connection timeout')
        this.connectPromise = null
        this.socket.close()
        this.socket = null
        reject(new Error(formatWebSocketConnectionError(wsUrl)))
      }, 10000)

      this.socket.onopen = () => {
        clearTimeout(connectTimeout)
        console.log('FMO WebSocket connected')
        this.connectPromise = null
        resolve()
      }

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (err) {
          console.error('Failed to parse FMO message:', err)
        }
      }

      this.socket.onerror = (error) => {
        clearTimeout(connectTimeout)
        console.error('FMO WebSocket error:', error)
        this.connectPromise = null
        reject(new Error(formatWebSocketConnectionError(wsUrl)))
      }

      this.socket.onclose = () => {
        clearTimeout(connectTimeout)
        console.log('FMO WebSocket closed')
        this.connectPromise = null
      }
    })

    return this.connectPromise
  }

  handleMessage(message) {
    const { type, subType, code, data } = message
    // 简单的响应匹配逻辑：getList -> getListResponse, getDetail -> getDetailResponse
    let requestSubType = subType.replace('Response', '')

    // 特殊处理：station API 的 getListRange 请求返回 getListResponse
    if (type === 'station' && requestSubType === 'getList') {
      requestSubType = 'getListRange'
    }

    const key = `${type}:${requestSubType}`

    if (this.pendingRequests.has(key)) {
      const { resolve, reject } = this.pendingRequests.get(key)
      this.pendingRequests.delete(key)

      // 清理对应的超时定时器
      if (this.timeoutTimers.has(key)) {
        clearTimeout(this.timeoutTimers.get(key))
        this.timeoutTimers.delete(key)
      }

      if (code === 0) {
        resolve(data)
      } else {
        reject(new Error(`FMO API Error: code ${code}`))
      }
    }
  }

  async sendRequest(type, subType, data = {}, options = {}) {
    const retries = options.retries || 0
    const retryDelayMs = options.retryDelayMs || 450
    let lastError = null

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        return await this.sendRequestOnce(type, subType, data, options)
      } catch (err) {
        lastError = err
        if (attempt >= retries) break
        this.resetSocketAfterFailure()
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs * (attempt + 1)))
      }
    }

    throw lastError
  }

  async sendRequestOnce(type, subType, data = {}, options = {}) {
    await this.connect()

    return new Promise((resolve, reject) => {
      const key = `${type}:${subType}`
      this.pendingRequests.set(key, { resolve, reject })

      const message = {
        type,
        subType,
        data
      }

      const payload = JSON.stringify(message)
      console.log(`[FmoApi] 发送数据 (${type}:${subType}):`, message)
      this.socket.send(payload)

      // 设置超时
      const timeoutId = setTimeout(() => {
        if (this.pendingRequests.has(key)) {
          this.pendingRequests.delete(key)
          this.timeoutTimers.delete(key)
          this.resetSocketAfterFailure()
          reject(new Error(`Request timeout: ${key}`))
        }
      }, options.timeoutMs || 15000)

      this.timeoutTimers.set(key, timeoutId)
    })
  }

  async trySendRequest(type, subType, data = {}, timeoutMs = 2500) {
    return this.sendRequest(type, subType, data, { timeoutMs })
  }

  async getQsoList(page = 0, pageSize = 20, fromCallsign = '') {
    const params = { page, pageSize }
    if (fromCallsign) {
      params.fromCallsign = fromCallsign
    }
    return this.sendRequest('qso', 'getList', params, { retries: 2, timeoutMs: 18000 })
  }

  async getQsoDetail(logId) {
    return this.sendRequest('qso', 'getDetail', { logId }, { retries: 2, timeoutMs: 18000 })
  }

  // Station 相关方法
  async getStationList(start = 0, count = 10) {
    return this.sendRequest(
      'station',
      'getListRange',
      { start, count },
      {
        retries: 1,
        timeoutMs: 12000
      }
    )
  }

  async getAllStations() {
    const all = []
    let start = 0
    const count = 20
    while (true) {
      const result = await this.getStationList(start, count)
      all.push(...result.list)
      if (result.list.length < count) break
      start += count
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    return all
  }

  async getPinnedList(start = 0, count = 10) {
    return this.sendRequest(
      'station',
      'getPinnedList',
      { start, count },
      {
        retries: 1,
        timeoutMs: 12000
      }
    )
  }

  async getAllPinnedStations() {
    const all = []
    let start = 0
    const count = 10
    while (true) {
      const result = await this.getPinnedList(start, count)
      all.push(...result.list)
      if (result.list.length < count) break
      start += count
      await new Promise((resolve) => setTimeout(resolve, 5))
    }
    return all
  }

  async addPinnedStation(uid) {
    const candidates = [
      ['addPinned', { uid }],
      ['setPinned', { uid, isPinned: true }]
    ]

    let lastError = null
    for (const [subType, data] of candidates) {
      try {
        return await this.trySendRequest('station', subType, data, 2500)
      } catch (err) {
        lastError = err
      }
    }

    throw lastError || new Error('FMO 未返回收藏接口响应')
  }

  async getCurrentStation() {
    return this.sendRequest('station', 'getCurrent', {}, { retries: 1, timeoutMs: 12000 })
  }

  async setCurrentStation(uid) {
    return this.sendRequest('station', 'setCurrent', { uid })
  }

  async nextStation() {
    return this.sendRequest('station', 'next', {})
  }

  async prevStation() {
    return this.sendRequest('station', 'prev', {})
  }

  async getUserInfo() {
    return this.sendRequest('user', 'getInfo', {})
  }

  // Config 相关方法
  async getCoordinate() {
    return this.sendRequest('config', 'getCordinate', {}, { retries: 1, timeoutMs: 12000 })
  }

  async setCoordinate(latitude, longitude) {
    return this.sendRequest('config', 'setCordinate', { latitude, longitude })
  }

  close() {
    // 清理连接 Promise
    this.connectPromise = null

    // 关闭 WebSocket
    if (this.socket) {
      try {
        // 只关闭处于 OPEN 或 CONNECTING 状态的连接
        if (
          this.socket.readyState === WebSocket.OPEN ||
          this.socket.readyState === WebSocket.CONNECTING
        ) {
          this.socket.close()
        }
      } catch (err) {
        console.error('关闭 WebSocket 失败:', err)
      }
      this.socket = null
    }

    // 清理所有待处理的请求
    this.pendingRequests.clear()

    // 清理所有超时定时器
    this.timeoutTimers.forEach((timerId) => {
      try {
        clearTimeout(timerId)
      } catch (err) {
        console.error('清理超时定时器失败:', err)
      }
    })
    this.timeoutTimers.clear()
  }

  resetSocketAfterFailure() {
    this.connectPromise = null
    if (!this.socket) return
    try {
      if (
        this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING
      ) {
        this.socket.close()
      }
    } catch (err) {
      console.error('重置 WebSocket 失败:', err)
    }
    this.socket = null
  }
}
