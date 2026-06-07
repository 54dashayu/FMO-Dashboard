import { addDiagnosticLog } from './diagnosticLog'

const SUPPORTED_CHARS = new Set('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''))
const bufferCache = new Map()
let audioContext = null

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  return audioContext
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeCallsignParts(callsign) {
  return String(callsign || '')
    .trim()
    .toUpperCase()
    .split('')
    .filter((char) => SUPPORTED_CHARS.has(char))
}

async function loadBuffer(char, context) {
  if (bufferCache.has(char)) return bufferCache.get(char)

  const assetUrl = new URL(`speech/callsign/en/${encodeURIComponent(char)}.wav`, document.baseURI)
    .href
  const response = await fetch(assetUrl)
  if (!response.ok) {
    throw new Error(`缺少呼号语音片段：${char}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const buffer = await context.decodeAudioData(arrayBuffer)
  bufferCache.set(char, buffer)
  return buffer
}

function playBuffer(buffer, context, volume = 1) {
  return new Promise((resolve) => {
    const source = context.createBufferSource()
    const gain = context.createGain()
    source.buffer = buffer
    gain.gain.value = volume
    source.connect(gain)
    gain.connect(context.destination)
    source.onended = resolve
    source.start()
  })
}

export async function playCallsignSpeech(callsign, options = {}) {
  const chars = normalizeCallsignParts(callsign)
  if (chars.length === 0) return

  const context = getAudioContext()
  if (!context) {
    throw new Error('当前环境不支持音频播放')
  }

  if (context.state === 'suspended') {
    await context.resume()
  }

  const volume = options.volume ?? 1.35
  const gapMs = options.gapMs ?? 55

  addDiagnosticLog('info', '开始播放内置呼号语音', { callsign, chars: chars.join('') })

  for (const char of chars) {
    const buffer = await loadBuffer(char, context)
    await playBuffer(buffer, context, volume)
    await sleep(gapMs)
  }
}
