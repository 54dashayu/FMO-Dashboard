<template>
  <div class="dashboard-view">
    <section class="station-band">
      <div class="active-contact-card" :class="{ idle: !activeContact }">
        <span class="eyebrow">{{ activeContact?.isSpeaking ? '当前通联' : '最后发言' }}</span>
        <div v-if="activeContact" class="active-contact-main">
          <div class="active-contact-primary">
            <h2>{{ activeContact.callsign }}</h2>
            <p class="active-contact-meta">
              <span v-if="activeContact.grid">{{ activeContact.grid }}</span>
              <span v-if="activeContact.qth">{{ activeContact.qth }}</span>
              <span v-if="!activeContact.grid && !activeContact.qth">位置未知</span>
            </p>
          </div>
          <div class="bearing-panel">
            <div class="compass" :class="{ unavailable: !activeContact.bearing }">
              <span class="north-label">N</span>
              <svg
                class="compass-arrow"
                viewBox="0 0 24 32"
                aria-hidden="true"
                :style="{ transform: `rotate(${activeContact.bearing?.bearing || 0}deg)` }"
              >
                <path d="M12 2 21 29 12 23 3 29Z" />
              </svg>
            </div>
            <div>
              <strong>{{ activeContact.bearing?.direction || '方位未知' }}</strong>
              <span>
                <template v-if="activeContact.bearing">
                  {{ activeContact.bearing.bearing }}° · {{ activeContact.bearing.distanceText }}
                </template>
                <template v-else>{{ activeContact.bearingHint }}</template>
              </span>
            </div>
          </div>
        </div>
        <div v-else class="active-contact-empty">
          <h2>无人发言</h2>
          <p>{{ liveStatusText }}</p>
        </div>
      </div>
      <div class="station-actions">
        <div class="station-summary">
          <span class="eyebrow">当前中继</span>
          <strong>{{ currentStation?.name || (loadingStation ? '读取中...' : '未知') }}</strong>
          <span>
            {{ controlProtocol }}://{{ controlHost }}
            <template v-if="currentStation?.uid"> · #{{ currentStation.uid }}</template>
          </span>
        </div>
        <div class="refresh-stack">
          <button class="refresh-btn" :disabled="refreshing" @click="refreshNow">
            {{ refreshing ? '刷新中...' : '刷新' }}
          </button>
          <span class="refresh-time">{{ lastRefreshText }}</span>
        </div>
      </div>
    </section>

    <section class="live-panel">
      <div class="panel-header">
        <h3>最近通联</h3>
        <span :class="['live-status', error ? 'error' : '']">
          {{ liveStatusText }}
        </span>
      </div>

      <div v-if="displayRecords.length > 0" class="live-table-wrap">
        <table class="live-table">
          <thead>
            <tr>
              <th>呼号</th>
              <th>时间</th>
              <th>QTH</th>
              <th>留言</th>
              <th>模式</th>
              <th>中继</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in displayRecords"
              :key="record.rowId"
              :class="{ 'is-speaking': record.isSpeaking }"
            >
              <td class="callsign-cell">
                <strong>
                  {{ record.toCallsign || '-' }}
                  <span
                    v-if="record.hasLoggedContact"
                    class="logged-star"
                    title="已在通联日志中"
                  >★</span>
                  <span v-if="record.isSelf" class="self-badge">您</span>
                  <span v-if="record.isSpeaking" class="speaking-badge">正在发言</span>
                </strong>
                <span v-if="record.toGrid">{{ record.toGrid }}</span>
              </td>
              <td class="time-cell">
                <span>{{ formatDatePart(record.timestamp) }}</span>
                <span>{{ formatClockPart(record.timestamp) }}</span>
              </td>
              <td class="qth-cell"><span class="qth-content">{{ record.qth || '-' }}</span></td>
              <td class="comment-cell">{{ record.toComment || '-' }}</td>
              <td>{{ record.mode || '-' }}</td>
              <td class="relay-cell">
                <button
                  v-if="record.relayName"
                  class="relay-link"
                  :disabled="switchingRelay === record.relayName"
                  :title="`切换到 ${record.relayName}`"
                  @click="switchRelay(record.relayName)"
                >
                  {{ record.relayName }}
                </button>
                <span
                  v-if="record.isRelayPinned"
                  class="favorite-indicator"
                  title="已在 FMO 收藏中"
                >★</span>
                <span v-if="!record.relayName">-</span>
                <span v-if="record.relayAdmin" class="relay-admin">（{{ record.relayAdmin }}）</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="empty-state">
        {{ refreshing ? '正在读取最近通联...' : '暂无通联数据' }}
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { FmoApiClient } from '../services/fmoApi'
import { formatTimestamp } from '../components/home/constants'
import { getControlTarget, switchStationByRelayName } from '../services/stationControl'
import { useSpeakingStatusStore } from '../stores/speakingStore'
import { gridToAddress } from '../services/gridService'
import { addDiagnosticLog } from '../services/diagnosticLog'
import { playCallsignSpeech } from '../services/callsignSpeech'
import toast from '../composables/useToast'

const FmoSpeech = registerPlugin('FmoSpeech')

const props = defineProps({
  fmoAddress: {
    type: String,
    default: ''
  },
  protocol: {
    type: String,
    default: 'ws'
  },
  selectedFromCallsign: {
    type: String,
    default: ''
  },
  todayContactedCallsigns: {
    type: Object,
    default: () => new Set()
  },
  contactCounts: {
    type: Object,
    default: () => new Map()
  },
  voiceMode: {
    type: String,
    default: 'off'
  }
})

const records = ref([])
const currentStation = ref(null)
const refreshing = ref(false)
const loadingStation = ref(false)
const error = ref('')
const lastRefreshAt = ref(null)
const switchingRelay = ref('')
const pinnedRelayNames = ref([])
const qthCache = ref({})
const fmoCoordinate = ref(null)
const voiceStatus = ref('')
const activeNow = ref(Date.now())
let timer = null
let activeTimer = null
let audioContext = null
const REFRESH_INTERVAL_MS = 5000
const ACTIVE_CONTACT_LINGER_MS = 5000
const VOICE_REPEAT_INTERVAL_MS = 10 * 60 * 1000
const VOICE_HISTORY_KEY = 'fmo_dashboard_voice_history'

const controlTarget = computed(() => getControlTarget(props.fmoAddress, props.protocol))
const controlHost = computed(() => controlTarget.value.host)
const controlProtocol = computed(() => controlTarget.value.protocol)
const speakingStatus = useSpeakingStatusStore()
const { speakingHistory, primaryConnected } = storeToRefs(speakingStatus)

const lastRefreshText = computed(() => {
  if (!lastRefreshAt.value) return '尚未刷新'
  return `上次刷新 ${formatClock(lastRefreshAt.value)}`
})

const liveStatusText = computed(() => {
  if (error.value) return error.value
  if (voiceStatus.value) return voiceStatus.value
  if (primaryConnected.value) return '实时监听中'
  return '正在连接实时事件'
})

const currentSpeakingRecord = computed(() => {
  return [...speakingHistory.value]
    .filter((item) => !item.endTime && item.callsign)
    .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0] || null
})

const recentEndedSpeakingRecord = computed(() => {
  const now = activeNow.value
  return [...speakingHistory.value]
    .filter((item) => item.endTime && item.callsign && now - item.endTime <= ACTIVE_CONTACT_LINGER_MS)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0] || null
})

const activeContact = computed(() => {
  const current = currentSpeakingRecord.value || recentEndedSpeakingRecord.value
  if (!current) return null

  const matchedLog = findMatchingLog(current)
  const grid = normalizeGrid(current.grid || matchedLog?.toGrid || '')
  const qth = getRecordQth({ ...matchedLog, toGrid: grid })
  const bearing = getBearingForGrid(grid)

  return {
    callsign: getCallsign(current),
    timestamp: Math.floor(current.startTime / 1000),
    grid,
    qth,
    bearing,
    bearingHint: getBearingHint(grid),
    isSpeaking: !current.endTime
  }
})

const displayRecords = computed(() => {
  const liveRows = speakingHistory.value.filter((item) => item.endTime).map((item) => {
    const matchedLog = findMatchingLog(item)
    const timestamp = Math.floor(item.startTime / 1000)
    const grid = item.grid || matchedLog?.toGrid || ''
    return {
      ...matchedLog,
      rowId: `live-${item.callsign}-${item.startTime}`,
      toCallsign: item.callsign,
      toGrid: grid,
      qth: getRecordQth({ ...matchedLog, toGrid: grid }),
      timestamp,
      toComment: item.endTime ? matchedLog?.toComment || '最近发言' : '正在发言',
      mode: matchedLog?.mode || 'FMO',
      relayName: item.serverName || matchedLog?.relayName || currentStation.value?.name || '',
      relayAdmin: matchedLog?.relayAdmin || '',
      isRelayPinned: isRelayPinned(item.serverName || matchedLog?.relayName || currentStation.value?.name),
      hasLoggedContact: hasLoggedContact(item.callsign, matchedLog),
      isSelf: isSelfCallsign(item.callsign),
      isSpeaking: !item.endTime
    }
  })

  const qsoRows = records.value
    .filter(
      (record) =>
        !isSameContact(currentSpeakingRecord.value, record) &&
        !liveRows.some((row) => isSameContact(row, record))
    )
    .map((record) => ({
      ...record,
      qth: getRecordQth(record),
      rowId: `log-${record.logId || record.timestamp || ''}-${record.toCallsign || ''}`,
      isRelayPinned: isRelayPinned(record.relayName),
      hasLoggedContact: hasLoggedContact(record.toCallsign, record),
      isSelf: isSelfCallsign(record.toCallsign),
      isSpeaking: false
    }))

  const sortedRows = [...liveRows, ...qsoRows].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
  return dedupeLatestByCallsign(sortedRows).slice(0, 20)
})

function createClient() {
  if (!controlHost.value) return null
  return new FmoApiClient(`${controlProtocol.value}://${controlHost.value}`)
}

function formatClock(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  return formatTimestamp(timestamp)
}

function formatDatePart(timestamp) {
  const text = formatTime(timestamp)
  return text.includes(' ') ? text.split(' ')[0] : text
}

function formatClockPart(timestamp) {
  const text = formatTime(timestamp)
  return text.includes(' ') ? text.split(' ')[1] : ''
}

function formatErrorMessage(err) {
  if (!err) return '未知错误'
  if (err instanceof Error && err.message) return err.message
  if (typeof err === 'string') return err
  if (err?.message) return err.message
  if (err?.type) return `连接事件异常：${err.type}`
  return '连接失败，请检查 FMO 地址、网络或浏览器安全设置'
}

function normalizeRecord(item, detail) {
  const log = detail?.log || detail || item
  return {
    ...item,
    ...log,
    logId: log.logId || item.logId
  }
}

function formatAddress(address) {
  if (!address) return ''
  return [
    address.province,
    address.city,
    address.district
  ]
    .filter(Boolean)
    .filter((part, index, arr) => arr.indexOf(part) === index)
    .join('')
}

function getRecordQth(record) {
  const direct =
    record?.qth ||
    record?.address ||
    record?.location ||
    record?.toAddress ||
    record?.city ||
    record?.province
  if (direct) return direct

  const grid = normalizeGrid(record?.toGrid || record?.grid)
  if (!grid) return ''
  return qthCache.value[grid] || grid
}

function normalizeGrid(grid) {
  return String(grid || '').trim().toUpperCase()
}

function gridToLatLng(grid) {
  const normalized = normalizeGrid(grid)
  if (normalized.length < 4 || normalized.length % 2 !== 0) return null

  const pairs = normalized.match(/.{1,2}/g) || []
  let lon = -180
  let lat = -90
  const lonSteps = [20, 2, 5 / 60, 5 / 600]
  const latSteps = [10, 1, 2.5 / 60, 2.5 / 600]
  let lonPrecision = lonSteps[0]
  let latPrecision = latSteps[0]

  for (let index = 0; index < pairs.length && index < lonSteps.length; index += 1) {
    const [lonChar, latChar] = pairs[index]
    lonPrecision = lonSteps[index]
    latPrecision = latSteps[index]

    if (index === 0 || index === 2) {
      const base = index === 0 ? 65 : 65
      const lonValue = lonChar.charCodeAt(0) - base
      const latValue = latChar.charCodeAt(0) - base
      if (lonValue < 0 || latValue < 0) return null
      lon += lonValue * lonPrecision
      lat += latValue * latPrecision
    } else {
      const lonValue = Number(lonChar)
      const latValue = Number(latChar)
      if (Number.isNaN(lonValue) || Number.isNaN(latValue)) return null
      lon += lonValue * lonPrecision
      lat += latValue * latPrecision
    }
  }

  return {
    lat: lat + latPrecision / 2,
    lng: lon + lonPrecision / 2
  }
}

function toRadians(value) {
  return (value * Math.PI) / 180
}

function toDegrees(value) {
  return (value * 180) / Math.PI
}

function calculateDistanceKm(from, to) {
  const earthRadiusKm = 6371
  const dLat = toRadians(to.lat - from.lat)
  const dLng = toRadians(to.lng - from.lng)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calculateBearing(from, to) {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const dLng = toRadians(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return Math.round((toDegrees(Math.atan2(y, x)) + 360) % 360)
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 100) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

function bearingToDirection(bearing) {
  const labels = [
    '北',
    '东北偏北',
    '东北',
    '东北偏东',
    '东',
    '东南偏东',
    '东南',
    '东南偏南',
    '南',
    '西南偏南',
    '西南',
    '西南偏西',
    '西',
    '西北偏西',
    '西北',
    '西北偏北'
  ]
  return labels[Math.round(bearing / 22.5) % 16]
}

function getBearingForGrid(grid) {
  const from = fmoCoordinate.value
  const to = gridToLatLng(grid)
  if (!from || !to) return null
  const distance = calculateDistanceKm(from, to)
  const bearing = calculateBearing(from, to)
  return {
    bearing,
    direction: bearingToDirection(bearing),
    distanceKm: distance,
    distanceText: formatDistance(distance)
  }
}

function getBearingHint(grid) {
  if (!grid) return '缺少对方网格'
  if (!fmoCoordinate.value) return '未读取到 FMO 坐标'
  return '网格格式不可用'
}

function normalizeRelayName(name) {
  return String(name || '').trim().toLowerCase()
}

function isRelayPinned(relayName) {
  const name = normalizeRelayName(relayName)
  return Boolean(name && pinnedRelayNames.value.includes(name))
}

function collectVisibleGrids() {
  const grids = new Set()
  for (const record of records.value) {
    const grid = normalizeGrid(record.toGrid)
    if (grid) grids.add(grid)
  }
  for (const item of speakingHistory.value) {
    const grid = normalizeGrid(item.grid)
    if (grid) grids.add(grid)
  }
  return Array.from(grids)
}

async function loadQthForGrid(grid) {
  if (!grid || qthCache.value[grid]) return
  try {
    const address = await gridToAddress(grid)
    const qth = formatAddress(address) || grid
    qthCache.value = { ...qthCache.value, [grid]: qth }
  } catch {
    qthCache.value = { ...qthCache.value, [grid]: grid }
  }
}

function getCallsign(record) {
  return (record?.toCallsign || record?.callsign || '').toUpperCase()
}

function normalizeCallsign(callsign) {
  return String(callsign || '').trim().toUpperCase()
}

function isSelfCallsign(callsign) {
  return Boolean(normalizeCallsign(callsign) && normalizeCallsign(callsign) === normalizeCallsign(props.selectedFromCallsign))
}

function formatCallsignForSpeech(callsign) {
  return callsign.split('').join(' ')
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function getPreferredSpeechVoice() {
  if (!window.speechSynthesis?.getVoices) return null
  const voices = window.speechSynthesis.getVoices()
  const englishVoices = voices.filter((voice) => /^en[-_]/i.test(voice.lang || ''))
  const femaleHints = [
    'female',
    'woman',
    'samantha',
    'victoria',
    'karen',
    'susan',
    'zira',
    'jenny',
    'aria',
    'ava',
    'emma'
  ]

  return (
    englishVoices.find((voice) =>
      femaleHints.some((hint) => voice.name.toLowerCase().includes(hint))
    ) ||
    englishVoices.find((voice) => /en-US/i.test(voice.lang || '')) ||
    englishVoices[0] ||
    voices[0] ||
    null
  )
}

function waitForVoices(timeoutMs = 1800) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis?.getVoices) {
      resolve([])
      return
    }

    const currentVoices = window.speechSynthesis.getVoices()
    if (currentVoices.length > 0) {
      resolve(currentVoices)
      return
    }

    const timer = setTimeout(() => {
      window.speechSynthesis.onvoiceschanged = null
      resolve(window.speechSynthesis.getVoices())
    }, timeoutMs)

    window.speechSynthesis.onvoiceschanged = () => {
      clearTimeout(timer)
      window.speechSynthesis.onvoiceschanged = null
      resolve(window.speechSynthesis.getVoices())
    }
  })
}

function getSpeechTimeoutMs(text) {
  return Math.max(20000, String(text || '').length * 1800)
}

function getContactCount(callsign) {
  if (!callsign) return 0
  if (props.contactCounts instanceof Map) {
    return props.contactCounts.get(callsign) || props.contactCounts.get(callsign.toLowerCase()) || 0
  }
  return props.contactCounts?.[callsign] || props.contactCounts?.[callsign.toLowerCase()] || 0
}

function hasTodayContact(callsign) {
  if (!callsign) return false
  if (props.todayContactedCallsigns instanceof Set) {
    return (
      props.todayContactedCallsigns.has(callsign) ||
      props.todayContactedCallsigns.has(callsign.toLowerCase())
    )
  }
  return Boolean(
    props.todayContactedCallsigns?.[callsign] ||
      props.todayContactedCallsigns?.[callsign.toLowerCase()]
  )
}

function hasLoggedContact(callsign, record = null) {
  return Boolean(record?.logId || getContactCount(callsign) > 0)
}

function loadVoiceHistory() {
  try {
    return JSON.parse(localStorage.getItem(VOICE_HISTORY_KEY) || '{}')
  } catch {
    return {}
  }
}

function saveVoiceHistory(history) {
  const now = Date.now()
  const pruned = Object.fromEntries(
    Object.entries(history).filter(([, timestamp]) => now - Number(timestamp) < 24 * 60 * 60 * 1000)
  )
  localStorage.setItem(VOICE_HISTORY_KEY, JSON.stringify(pruned))
}

function getVoicePlan(callsign) {
  const history = loadVoiceHistory()
  const lastSeenAt = Number(history[callsign] || 0)
  if (lastSeenAt && Date.now() - lastSeenAt < VOICE_REPEAT_INTERVAL_MS) {
    return null
  }

  if (getContactCount(callsign) <= 0) {
    return { beepCount: 3, label: '历史新呼号' }
  }

  if (!hasTodayContact(callsign)) {
    return { beepCount: 2, label: '今日新呼号' }
  }

  return { beepCount: 0, label: '10分钟未出现' }
}

function getAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  if (!AudioContextClass) return null
  if (!audioContext) audioContext = new AudioContextClass()
  return audioContext
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function playBeeps(count) {
  const context = getAudioContext()
  if (!context || count <= 0) return
  if (context.state === 'suspended') await context.resume()

  for (let index = 0; index < count; index += 1) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = 920
    gain.gain.value = 0.112
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)
    await sleep(210)
  }
}

async function speakCallsign(callsign) {
  const text = formatCallsignForSpeech(callsign)

  try {
    await playCallsignSpeech(callsign)
    return
  } catch (err) {
    addDiagnosticLog('warn', '内置呼号语音播放失败，尝试系统语音', {
      callsign,
      error: err?.message || String(err)
    })
  }

  if (isNativeAndroid()) {
    try {
      const result = await FmoSpeech.speak({
        text,
        lang: 'en-US',
        rate: 0.42,
        pitch: 1
      })
      if (result && result.ok === false) {
        throw new Error(result.error || '安卓系统语音未播放')
      }
      return
    } catch (err) {
      addDiagnosticLog('warn', '安卓原生呼号播报失败，尝试网页语音', {
        callsign,
        error: err?.message || String(err)
      })
    }
  }

  await waitForVoices()
  return new Promise((resolve) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      addDiagnosticLog('warn', '当前 WebView 不支持语音合成，无法播报呼号')
      resolve()
      return
    }

    const utterance = new SpeechSynthesisUtterance(text)
    const voice = getPreferredSpeechVoice()
    if (voice) utterance.voice = voice
    utterance.lang = 'en-US'
    utterance.rate = 0.33
    utterance.volume = 1
    utterance.pitch = 1
    const keepAlive = setInterval(() => {
      window.speechSynthesis?.resume?.()
    }, 1000)
    const timeout = setTimeout(() => {
      clearInterval(keepAlive)
      addDiagnosticLog('warn', '呼号播报超时，已继续播放提示音', {
        callsign,
        voice: voice ? `${voice.name} (${voice.lang})` : '未选择语音',
        text
      })
      resolve()
    }, getSpeechTimeoutMs(text))
    utterance.onend = () => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      resolve()
    }
    utterance.onerror = (event) => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      addDiagnosticLog('warn', '呼号播报失败', { callsign, error: event.error })
      resolve()
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    window.speechSynthesis.resume?.()
  })
}

async function announceCallsign(callsign) {
  if (props.voiceMode !== 'alert' || !callsign) return
  if (isSelfCallsign(callsign)) return
  const plan = getVoicePlan(callsign)
  if (!plan) return

  const history = loadVoiceHistory()
  history[callsign] = Date.now()
  saveVoiceHistory(history)

  voiceStatus.value = `正在播报：${callsign}（${plan.label}）`
  await speakCallsign(callsign)
  await playBeeps(plan.beepCount)
  voiceStatus.value = ''
}

function dedupeLatestByCallsign(rows) {
  const seen = new Set()
  return rows.filter((row) => {
    const callsign = getCallsign(row)
    if (!callsign) return true
    if (seen.has(callsign)) return false
    seen.add(callsign)
    return true
  })
}

function isSameContact(a, b) {
  const callsignA = getCallsign(a)
  const callsignB = getCallsign(b)
  if (!callsignA || callsignA !== callsignB) return false
  const timestampA = a?.timestamp || Math.floor((a?.startTime || 0) / 1000)
  const timestampB = b?.timestamp || Math.floor((b?.startTime || 0) / 1000)
  if (!timestampA || !timestampB) return false
  return Math.abs(timestampA - timestampB) < 90
}

function findMatchingLog(speakingRecord) {
  const speakingTimestamp = Math.floor(speakingRecord.startTime / 1000)
  return records.value.find((record) => {
    if (getCallsign(record) !== speakingRecord.callsign.toUpperCase()) return false
    return Math.abs((record.timestamp || 0) - speakingTimestamp) < 90
  })
}

async function refreshDashboard() {
  if (refreshing.value) return

  const client = createClient()
  if (!client) {
    error.value = '请先设置 FMO 地址'
    addDiagnosticLog('warn', '仪表盘刷新失败：未设置 FMO 地址')
    return
  }

  refreshing.value = true
  loadingStation.value = true
  error.value = ''

  try {
    const [station, qsoResponse, pinnedList, coordinate] = await Promise.all([
      client.getCurrentStation(),
      client.getQsoList(0, 20, props.selectedFromCallsign || ''),
      client.getAllPinnedStations(),
      client.getCoordinate().catch(() => null)
    ])
    currentStation.value = station
    if (
      coordinate &&
      typeof coordinate.latitude === 'number' &&
      typeof coordinate.longitude === 'number'
    ) {
      fmoCoordinate.value = { lat: coordinate.latitude, lng: coordinate.longitude }
    }
    pinnedRelayNames.value = (pinnedList || []).map((item) => normalizeRelayName(item.name))
    loadingStation.value = false

    const list = qsoResponse?.list || []
    const detailed = []

    for (const item of list) {
      try {
        const detail = item.logId ? await client.getQsoDetail(item.logId) : null
        detailed.push(normalizeRecord(item, detail))
      } catch (err) {
        addDiagnosticLog('warn', '读取通联详情失败，已使用列表数据', {
          logId: item.logId,
          error: err?.message || String(err)
        })
        detailed.push(normalizeRecord(item, null))
      }
    }

    records.value = detailed
    lastRefreshAt.value = new Date()
  } catch (err) {
    error.value = `刷新失败：${formatErrorMessage(err)}`
    addDiagnosticLog('error', '仪表盘刷新失败', err)
  } finally {
    loadingStation.value = false
    refreshing.value = false
    client.close()
  }
}

function refreshNow() {
  refreshDashboard()
}

watch(
  () => collectVisibleGrids().join('|'),
  (gridKey) => {
    if (!gridKey) return
    for (const grid of gridKey.split('|')) {
      loadQthForGrid(grid)
    }
  },
  { immediate: true }
)

watch(
  () =>
    currentSpeakingRecord.value
      ? `${currentSpeakingRecord.value.callsign}-${currentSpeakingRecord.value.startTime}`
      : '',
  () => {
    if (props.voiceMode !== 'alert') return
    const callsign = getCallsign(currentSpeakingRecord.value)
    announceCallsign(callsign)
  }
)

watch(
  () => props.voiceMode,
  async (mode) => {
    window.speechSynthesis?.cancel()
    if (mode === 'off') {
      voiceStatus.value = '已关闭所有播报'
    } else {
      if (mode === 'alert') {
        waitForVoices().then((voices) => {
          addDiagnosticLog('info', '新呼号提示已开启', {
            speechSynthesis: Boolean(window.speechSynthesis),
            voices: voices.length
          })
        })
      }
      const context = getAudioContext()
      if (context?.state === 'suspended') {
        try {
          await context.resume()
        } catch {
          // 浏览器可能要求再次点击页面后才允许播放。
        }
      }
      const labelMap = {
        alert: '新呼号提示',
        radio: '通联播报',
        off: '关闭所有播报'
      }
      voiceStatus.value = `声音模式：${labelMap[mode] || mode}`
    }
    setTimeout(() => {
      if (
        voiceStatus.value === '已关闭所有播报' ||
        voiceStatus.value.startsWith('声音模式：')
      ) {
        voiceStatus.value = ''
      }
    }, 1800)
  }
)

async function switchRelay(relayName) {
  if (!relayName || switchingRelay.value) return
  switchingRelay.value = relayName

  try {
    const { current, station } = await switchStationByRelayName(
      relayName,
      props.fmoAddress,
      props.protocol
    )
    currentStation.value = current || station
    toast.success(`已切换到：${current?.name || station.name}`)
  } catch (err) {
    toast.error(err.message || '切换中继失败')
  } finally {
    switchingRelay.value = ''
  }
}

onMounted(() => {
  if (controlHost.value && !primaryConnected.value) {
    speakingStatus.connectEventWs(controlHost.value, controlProtocol.value)
  }
  refreshDashboard()
  timer = setInterval(refreshDashboard, REFRESH_INTERVAL_MS)
  activeTimer = setInterval(() => {
    activeNow.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (activeTimer) clearInterval(activeTimer)
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.dashboard-view {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.station-band,
.live-panel {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
}

.station-band {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1rem;
  flex-shrink: 0;
}

.eyebrow {
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.station-band h2 {
  margin: 0.2rem 0;
  color: var(--text-primary);
  font-size: 1.3rem;
}

.station-band p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.station-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 1rem;
  flex-shrink: 0;
  margin-left: auto;
}

.active-contact-card {
  min-width: 0;
  flex: 1;
}

.active-contact-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
}

.active-contact-primary {
  min-width: 0;
  display: grid;
  gap: 0.18rem;
}

.active-contact-primary h2,
.active-contact-empty h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(1.55rem, 3vw, 2.45rem);
  line-height: 1;
  letter-spacing: 0;
}

.active-contact-primary p,
.active-contact-empty p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: clamp(0.86rem, 1.25vw, 1rem);
  line-height: 1.35;
}

.active-contact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem 0.55rem;
}

.active-contact-meta span + span::before {
  content: '·';
  margin-right: 0.55rem;
  color: var(--text-disabled);
}

.active-contact-card.idle .active-contact-empty h2 {
  color: var(--text-secondary);
}

.bearing-panel {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 190px;
  padding: 0.55rem 0.7rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.bearing-panel strong,
.bearing-panel span {
  display: block;
  white-space: nowrap;
}

.bearing-panel strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.bearing-panel span {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.compass {
  position: relative;
  width: 46px;
  height: 46px;
  margin-top: 0.55rem;
  border: 2px solid var(--border-secondary);
  border-radius: 50%;
  color: var(--color-success);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.north-label {
  position: absolute;
  top: -0.68rem;
  left: 50%;
  transform: translateX(-50%);
  color: var(--text-tertiary);
  font-size: 0.58rem;
  line-height: 1;
  pointer-events: none;
}

.compass-arrow {
  display: block;
  width: 22px;
  height: 30px;
  transform-origin: 50% 50%;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linejoin: round;
  stroke-linecap: round;
  filter: drop-shadow(0 0 4px rgba(56, 189, 248, 0.18));
}

.compass.unavailable {
  color: var(--text-disabled);
}

.station-summary {
  display: grid;
  gap: 0.1rem;
  min-width: 210px;
  text-align: right;
}

.station-summary strong {
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.25;
}

.station-summary span:last-child {
  color: var(--text-tertiary);
  font-size: 0.82rem;
}

.refresh-btn {
  width: 92px;
  border: 1px solid var(--color-success);
  background: var(--color-success);
  color: #fff;
  border-radius: 4px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
}

.refresh-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.refresh-stack {
  display: grid;
  justify-items: center;
  gap: 0.28rem;
  flex-shrink: 0;
}

.refresh-time,
.live-status {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.live-panel {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.65rem 1rem;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  color: var(--text-primary);
}

.live-status.error {
  color: var(--color-danger);
}

.live-table-wrap {
  min-height: 0;
  flex: 1;
  overflow: auto;
}

.live-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.live-table th,
.live-table td {
  padding: 0.45rem 0.65rem;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: 0.9rem;
  line-height: 1.25;
  text-align: left;
  vertical-align: top;
}

.live-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bg-table-header);
  color: var(--text-secondary);
  font-weight: 600;
}

.live-table tr.is-speaking td {
  background: rgba(76, 175, 80, 0.1);
}

.callsign-cell {
  width: clamp(118px, 12vw, 148px);
}

.callsign-cell strong {
  display: block;
  font-size: 0.98rem;
}

.callsign-cell span,
.relay-admin {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.callsign-cell .speaking-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.35rem;
  border: 1px solid rgba(76, 175, 80, 0.45);
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  color: var(--color-success);
  font-size: 0.7rem;
  font-weight: 600;
  vertical-align: middle;
}

.callsign-cell .logged-star {
  display: inline-flex;
  align-items: center;
  margin-left: 0.25rem;
  color: #f59e0b;
  font-size: 0.86rem;
  line-height: 1;
  vertical-align: 0.05em;
}

.callsign-cell .self-badge {
  display: inline-flex;
  align-items: center;
  margin-left: 0.28rem;
  border: 1px solid rgba(64, 158, 255, 0.45);
  border-radius: 4px;
  padding: 0.04rem 0.28rem;
  color: var(--color-primary);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.1;
  vertical-align: middle;
}

.time-cell {
  width: 118px;
  white-space: nowrap;
}

.time-cell span {
  display: block;
}

.time-cell span + span {
  margin-top: 0.12rem;
  color: var(--text-secondary);
}

.qth-cell {
  width: clamp(170px, 18vw, 230px);
  color: var(--text-secondary);
}

.qth-content {
  display: -webkit-box;
  overflow: hidden;
  word-break: break-word;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.comment-cell {
  width: auto;
  word-break: break-word;
}

.relay-cell {
  width: clamp(130px, 15vw, 185px);
}

.live-table th:nth-child(5),
.live-table td:nth-child(5) {
  width: 58px;
  text-align: center;
}

.relay-link {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  padding: 0;
  text-align: left;
}

.favorite-indicator {
  margin-left: 0.35rem;
  color: var(--color-warning, #e6a23c);
  font-size: 0.9rem;
}

.relay-link:hover:not(:disabled) {
  text-decoration: underline;
}

.relay-link:disabled {
  cursor: wait;
  opacity: 0.7;
}

.empty-state {
  flex: 1;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
  text-align: center;
}

@media (max-width: 768px) {
  .dashboard-view {
    padding: 1rem;
    overflow-y: auto;
  }

  .station-band,
  .panel-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .station-band {
    gap: 0.85rem;
  }

  .active-contact-card {
    width: 100%;
  }

  .active-contact-main {
    align-items: center;
    flex-direction: row;
    gap: 0.75rem;
    width: 100%;
  }

  .station-actions {
    align-items: center;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    width: 100%;
  }

  .active-contact-primary {
    flex: 1 1 auto;
  }

  .station-summary {
    min-width: 0;
    text-align: left;
    flex: 1 1 auto;
  }

  .bearing-panel {
    min-width: 154px;
    width: auto;
    flex: 0 0 auto;
    gap: 0.55rem;
    padding: 0.5rem 0.6rem;
  }

  .compass {
    width: 38px;
    height: 38px;
    margin-top: 0.52rem;
  }

  .compass-arrow {
    width: 18px;
    height: 25px;
  }

  .active-contact-primary h2,
  .active-contact-empty h2 {
    font-size: clamp(1.35rem, 6.8vw, 1.9rem);
    line-height: 1;
  }

  .active-contact-primary p,
  .active-contact-empty p {
    font-size: 0.88rem;
    line-height: 1.3;
  }

  .active-contact-primary p {
    overflow: hidden;
  }

  .refresh-btn {
    flex: 0 0 auto;
    padding: 0.42rem 0.75rem;
  }

  .refresh-time {
    width: auto;
    white-space: nowrap;
    font-size: 0.74rem;
  }

  .live-table {
    min-width: 780px;
  }

  .live-table-wrap {
    max-height: 70vh;
  }
}

@media (max-width: 520px) {
  .dashboard-view {
    padding: 0.75rem;
  }

  .active-contact-primary h2,
  .active-contact-empty h2 {
    font-size: clamp(1.25rem, 6.4vw, 1.7rem);
  }

  .active-contact-primary p,
  .active-contact-empty p {
    font-size: 0.82rem;
  }

  .bearing-panel {
    min-width: 138px;
    gap: 0.45rem;
    padding: 0.45rem 0.5rem;
  }

  .bearing-panel strong {
    font-size: 0.92rem;
  }

  .bearing-panel span {
    font-size: 0.75rem;
  }

  .station-summary strong {
    font-size: 0.95rem;
  }

  .station-summary span:last-child {
    display: block;
    font-size: 0.74rem;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  .live-table {
    min-width: 735px;
  }

  .live-table th,
  .live-table td {
    padding: 0.42rem 0.5rem;
    font-size: 0.86rem;
  }

  .callsign-cell {
    width: 112px;
  }

  .time-cell {
    width: 106px;
  }

  .qth-cell {
    width: 205px;
  }

  .qth-content {
    -webkit-line-clamp: 2;
  }

  .relay-cell {
    width: 145px;
  }
}
</style>
