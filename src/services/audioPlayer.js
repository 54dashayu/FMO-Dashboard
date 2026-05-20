/**
 * 音频流播放器
 * 用于播放来自 FMO 设备的 8kHz PCM 音频流
 * 支持缓冲调度、延迟控制和音频处理链路
 */

export class AudioStreamPlayer {
  constructor({ url, inputSampleRate = 8000 } = {}) {
    // WebSocket URL（必填，由调用方构建好传入）
    this.url = url
    this.inputSampleRate = inputSampleRate

    // WebAudio 上下文和节点
    this.audioCtx = null
    this.gainNode = null
    this._chainInput = null
    this.hpf = null
    this.lpf = null
    this.eqLow = null
    this.eqMid = null
    this.eqHigh = null
    this.compressor = null

    // WebSocket
    this.ws = null
    this.connected = false

    // 缓冲和调度
    this.chunkQueue = [] // Array<Float32Array>
    this.queuedSamples = 0
    this.scheduledEndTime = 0 // 音频上下文时间
    this.buffering = true
    this.started = false // 一旦开始播放，不再重回缓冲状态

    // 可调参数
    this.minStartBufferSec = 0.1 // 开始播放所需的最小缓冲时间
    this.lowBufferSec = 0.3 // 保留兼容，播放后不再重新缓冲
    this.targetLeadSec = 0.5 // 目标提前调度时间
    this.maxBufferSec = 1.0 // 最大缓冲时间，超过则丢弃旧数据

    // 状态回调
    this.onStatus = null // (statusText) => void

    // 调度定时器
    this._tickTimer = null

    // 自动重连配置
    this.autoReconnect = true // 是否自动重连
    this.reconnectDelay = 3000 // 重连延迟（毫秒）
    this._reconnectTimer = null // 重连定时器
    this._manualDisconnect = false // 是否手动断开
  }

  /**
   * 设置状态文本
   * @param {string} text - 状态文本
   */
  setStatus(text) {
    if (this.onStatus) this.onStatus(text)
  }

  /**
   * 确保音频上下文已创建
   */
  ensureAudio() {
    if (this.audioCtx) return

    // 在用户手势时创建上下文
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    this.gainNode = this.audioCtx.createGain()
    this.gainNode.gain.value = 1

    // 构建音频处理链路
    // 链路：source -> _chainInput -> HPF -> LPF -> EQ(Low,Mid,High) -> Compressor -> GainNode -> Destination
    this._chainInput = this.audioCtx.createGain()
    this._chainInput.gain.value = 1.0

    // 高通滤波器：去除直流/低频噪音
    this.hpf = this.audioCtx.createBiquadFilter()
    this.hpf.type = 'highpass'
    this.hpf.frequency.value = 220 // Hz，保留更多温暖感
    this.hpf.Q.value = 0.5 // 更平缓的斜率

    // 低通滤波器：抑制 8kHz 采样带来的高频嘶声（奈奎斯特频率 4kHz）
    this.lpf = this.audioCtx.createBiquadFilter()
    this.lpf.type = 'lowpass'
    this.lpf.frequency.value = 3000 // Hz，柔化边缘
    this.lpf.Q.value = 0.5 // 减少共振/相位伪影

    // EQ：低频架（温暖感）
    this.eqLow = this.audioCtx.createBiquadFilter()
    this.eqLow.type = 'lowshelf'
    this.eqLow.frequency.value = 180 // Hz
    this.eqLow.gain.value = 0.5 // dB，轻微提升

    // EQ：中频峰（减少鼻音）
    this.eqMid = this.audioCtx.createBiquadFilter()
    this.eqMid.type = 'peaking'
    this.eqMid.frequency.value = 1400 // Hz
    this.eqMid.Q.value = 0.8 // 更宽，更自然
    this.eqMid.gain.value = 1.0 // dB，温和提升

    // EQ：高频架（保持亮度）
    this.eqHigh = this.audioCtx.createBiquadFilter()
    this.eqHigh.type = 'highshelf'
    this.eqHigh.frequency.value = 2600 // Hz
    this.eqHigh.gain.value = 0.0 // dB，不额外提升

    // 压缩器：增加响度一致性
    this.compressor = this.audioCtx.createDynamicsCompressor()
    this.compressor.threshold.value = -22 // dB
    this.compressor.knee.value = 24 // dB，软拐点
    this.compressor.ratio.value = 2.0 // :1，减少平坦化
    this.compressor.attack.value = 0.006 // s，让瞬态通过
    this.compressor.release.value = 0.3 // s，平滑恢复

    // 连接链路
    this._chainInput.connect(this.hpf)
    this.hpf.connect(this.lpf)
    this.lpf.connect(this.eqLow)
    this.eqLow.connect(this.eqMid)
    this.eqMid.connect(this.eqHigh)
    this.eqHigh.connect(this.compressor)
    this.compressor.connect(this.gainNode)
    this.gainNode.connect(this.audioCtx.destination)
  }

  /**
   * 设置音量
   * @param {number} v - 音量值（0-1）
   */
  setVolume(v) {
    if (this.gainNode) this.gainNode.gain.value = Number(v) || 0
  }

  /**
   * 连接到 WebSocket 音频流
   */
  connect() {
    if (this.ws && (this.connected || this.ws.readyState === WebSocket.CONNECTING)) return

    // 重置手动断开标志
    this._manualDisconnect = false

    this.ensureAudio()
    this.resetBuffers()

    // 尝试恢复 AudioContext（可能因为无用户手势而失败，后续通过用户交互恢复）
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume()
    }

    this.ws = new WebSocket(this.url)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.connected = true
      this.setStatus('音频已连接')
      // 清除重连定时器
      this._clearReconnect()
      // 如果音频上下文被暂停，恢复它
      if (this.audioCtx?.state === 'suspended') this.audioCtx.resume()
    }

    this.ws.onclose = () => {
      this.connected = false
      if (!this._manualDisconnect && this.autoReconnect) {
        this.setStatus('音频重连中...')
        this._scheduleReconnect()
      } else {
        this.setStatus('音频未连接')
      }
    }

    this.ws.onerror = () => {
      // 错误时由 onclose 处理重连逻辑
      this.setStatus('音频连接错误')
    }

    this.ws.onmessage = (evt) => {
      const buf = evt.data // ArrayBuffer
      if (!(buf instanceof ArrayBuffer)) return
      this._ingestPCM16(buf)
      this._maybeSchedule()
    }
  }

  /**
   * 断开 WebSocket 连接
   */
  disconnect() {
    // 标记为手动断开，避免自动重连
    this._manualDisconnect = true
    this._clearReconnect()

    if (this.ws) {
      try {
        this.ws.close()
      } catch {
        // 忽略关闭错误
      }
      this.ws = null
    }
    this.connected = false
    // 停止调度并清空缓冲
    this.resetBuffers()
    // 可选：暂停音频上下文以节省 CPU
    if (this.audioCtx?.state === 'running') this.audioCtx.suspend()
    this.setStatus('音频未连接')
  }

  /**
   * 调度自动重连
   * @private
   */
  _scheduleReconnect() {
    this._clearReconnect()
    this._reconnectTimer = setTimeout(() => {
      if (!this._manualDisconnect && this.autoReconnect) {
        this.connect()
      }
    }, this.reconnectDelay)
  }

  /**
   * 清除重连定时器
   * @private
   */
  _clearReconnect() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer)
      this._reconnectTimer = null
    }
  }

  /**
   * 恢复 AudioContext（用于解决浏览器自动播放策略限制）
   * 应在用户手势事件中调用
   */
  resumeAudioContext() {
    if (this.audioCtx?.state === 'suspended') {
      this.audioCtx.resume()
    }
  }

  /**
   * 重置缓冲区和状态
   */
  resetBuffers() {
    // 停止调度定时器
    if (this._tickTimer) {
      clearTimeout(this._tickTimer)
      this._tickTimer = null
    }
    // 清除重连定时器
    this._clearReconnect()
    this.chunkQueue = []
    this.queuedSamples = 0
    this.scheduledEndTime = this.audioCtx ? this.audioCtx.currentTime : 0
    this.buffering = true
    this.started = false
  }

  /**
   * 摄取 PCM 16-bit LE 数据
   * @param {ArrayBuffer} arrayBuffer - PCM 数据
   * @private
   */
  _ingestPCM16(arrayBuffer) {
    const view = new Int16Array(arrayBuffer)
    // 转换为 Float32 [-1, 1]
    const f32 = new Float32Array(view.length)
    for (let i = 0; i < view.length; i++) {
      f32[i] = view[i] / 32768
    }

    // 延迟控制：如果队列过长，丢弃旧数据
    const queuedSec = this.queuedSamples / this.inputSampleRate
    if (queuedSec > this.maxBufferSec) {
      const targetSamples = Math.floor(this.targetLeadSec * this.inputSampleRate)
      // 从头部丢弃足够的数据
      let toDrop = this.queuedSamples + f32.length - targetSamples
      while (toDrop > 0 && this.chunkQueue.length) {
        const c = this.chunkQueue[0]
        if (c.length <= toDrop) {
          this.chunkQueue.shift()
          this.queuedSamples -= c.length
          toDrop -= c.length
        } else {
          // 裁剪第一个块
          const remain = c.length - toDrop
          const trimmed = c.subarray(c.length - remain)
          this.chunkQueue[0] = trimmed
          this.queuedSamples -= toDrop
          toDrop = 0
        }
      }
    }

    this.chunkQueue.push(f32)
    this.queuedSamples += f32.length
  }

  /**
   * 调度音频播放
   * @private
   */
  _maybeSchedule() {
    if (!this.audioCtx) return

    const now = this.audioCtx.currentTime
    if (this.scheduledEndTime < now) this.scheduledEndTime = now

    const queuedSec = this.queuedSamples / this.inputSampleRate

    // 缓冲逻辑
    if (this.buffering) {
      if (queuedSec >= this.minStartBufferSec) {
        this.buffering = false
        this.started = true
        this.setStatus('播放中')
      } else {
        // 首次启动时缓冲不足
        this.setStatus('缓冲中...')
        return
      }
    }

    // 调度音频以保持目标提前时间
    while (this.scheduledEndTime - now < this.targetLeadSec && this.chunkQueue.length) {
      const chunk = this.chunkQueue.shift()
      this.queuedSamples -= chunk.length

      const buffer = this.audioCtx.createBuffer(1, chunk.length, this.inputSampleRate)
      buffer.copyToChannel(chunk, 0, 0)

      const src = this.audioCtx.createBufferSource()
      src.buffer = buffer
      // 连接到处理链路
      if (this._chainInput) {
        src.connect(this._chainInput)
      } else {
        src.connect(this.gainNode)
      }

      const duration = chunk.length / this.inputSampleRate
      src.start(this.scheduledEndTime)
      this.scheduledEndTime += duration
    }

    // 已开始播放后，即使没有数据也不重回缓冲状态，保持"播放中"
    if (this.started && !this.buffering) {
      this.setStatus('播放中')
    }

    // 保持轻量级调度定时器
    if (this.connected) {
      clearTimeout(this._tickTimer)
      this._tickTimer = setTimeout(() => this._maybeSchedule(), 60)
    }
  }
}
