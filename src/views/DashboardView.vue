<template>
  <div class="dashboard-view">
    <section class="dashboard-command-bar">
      <div class="dashboard-brand">
        <img src="/app-icon.png" alt="" class="dashboard-brand-mark" />
        <strong>{{ t('app.name', 'FMO 仪表盘') }}</strong>
        <div class="mobile-command-stats" aria-label="移动端统计">
          <span
            class="command-stat total-today-stat"
            :title="`${t('header.total', '总通联数量')} / ${t('header.today', '今日通联数量')}`"
          >
            <span class="stat-icon" aria-hidden="true">✨</span>
            {{ totalLogs || totalContactCount }}<small>/{{ todayLogs || todayContactCount }}</small>
          </span>
          <span class="command-stat friend-stat" :title="t('header.friends', '好友数量')">
            <span class="stat-icon" aria-hidden="true">👥</span>
            {{ uniqueCallsigns }}
          </span>
        </div>
      </div>
      <div class="connection-strip">
        <span :class="['status-dot', liveStatusKind || 'ok']"></span>
        <div class="connection-copy">
          <strong
            >{{ activeContact?.callsign || ownCallsign || selectedFromCallsign || 'FMO' }}
            {{
              activeContact ? t('header.onAir', '正在通联') : t('header.monitoring', '正在守听')
            }}</strong
          >
        </div>
        <div class="command-stats">
          <span
            class="command-stat total-today-stat"
            :title="`${t('header.total', '总通联数量')} / ${t('header.today', '今日通联数量')}`"
          >
            <span class="stat-icon" aria-hidden="true">✨</span>
            {{ totalLogs || totalContactCount }}<small>/{{ todayLogs || todayContactCount }}</small>
          </span>
          <span class="command-stat friend-stat" :title="t('header.friends', '好友数量')">
            <span class="stat-icon" aria-hidden="true">👥</span>
            {{ uniqueCallsigns }}
          </span>
        </div>
      </div>
      <div class="command-tools">
        <label class="command-select-wrap" :title="t('header.broadcastMode', '播报模式')">
          <span class="tool-icon" aria-hidden="true">●</span>
          <select
            class="command-select"
            :value="voiceMode"
            @change="emit('update-dashboard-voice-mode', $event.target.value)"
          >
            <option value="alert">{{ t('header.newCallsignAlert', '新呼号提醒') }}</option>
            <option value="radio">{{ t('header.contactBroadcast', '通联播报') }}</option>
            <option value="off">{{ t('header.broadcastOff', '关闭所有播报') }}</option>
          </select>
        </label>
        <button
          type="button"
          class="command-tool command-tool-wide"
          :title="
            isDarkTheme
              ? t('header.switchLight', '切换浅色主题')
              : t('header.switchDark', '切换深色主题')
          "
          @click="toggleTheme"
        >
          <span class="tool-icon">{{ isDarkTheme ? '☾' : '☀' }}</span>
          <span
            >{{ t('header.theme', '主题') }}
            {{ isDarkTheme ? t('header.dark', '深') : t('header.light', '浅') }}</span
          >
        </button>
        <PublicSiteTools />
        <button
          type="button"
          class="command-tool"
          :title="t('common.language', '语言：简体中文')"
          @click="toggleLocale"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
          </svg>
        </button>
        <button
          type="button"
          class="command-tool"
          :title="t('common.settings', '设置')"
          @click="router.push('/settings')"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2h-4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3v-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.8-2.8.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3h4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1Z"
            />
          </svg>
        </button>
      </div>
    </section>

    <div
      v-if="showRecentRelaySwitcher"
      class="recent-relay-switcher-overlay"
      @click.self="showRecentRelaySwitcher = false"
    >
      <section
        class="recent-relay-switcher"
        :aria-label="t('dashboard.recentActiveRelay', '最近活跃中继')"
      >
        <button
          type="button"
          class="recent-relay-action"
          :disabled="recentRelayBusy"
          @click="switchRecentRelay('prev')"
        >
          <span
            v-for="line in t('dashboard.prevActiveRelay', '上个活跃中继').split('\n')"
            :key="line"
            class="recent-relay-action-line"
          >
            {{ line }}
          </span>
        </button>
        <button
          type="button"
          class="recent-relay-action"
          :disabled="recentRelayBusy"
          @click="switchRecentRelay('next')"
        >
          <span
            v-for="line in t('dashboard.nextActiveRelay', '下个活跃中继').split('\n')"
            :key="line"
            class="recent-relay-action-line"
          >
            {{ line }}
          </span>
        </button>
      </section>
    </div>

    <div class="dashboard-grid">
      <section class="active-contact-card" :class="{ idle: !activeContact }">
        <div class="section-label">
          <span>{{
            activeContact?.isSpeaking
              ? t('dashboard.currentCall', '当前呼叫')
              : t('dashboard.lastSpeaker', '最后发言')
          }}</span>
          <span>{{
            activeContact?.isSpeaking ? t('dashboard.live', 'LIVE') : lastRefreshText
          }}</span>
        </div>

        <div class="active-contact-main">
          <div class="active-contact-primary">
            <div class="callsign-wrap">
              <h1>{{ activeContact?.callsign || t('dashboard.noSpeaker', '无人发言') }}</h1>
              <span v-if="activeContact?.grid" class="grid-square">{{ activeContact.grid }}</span>
              <span v-if="activeContact?.isNewCallsign" class="active-contact-new-badge">{{
                t('dashboard.new', '新')
              }}</span>
            </div>
            <div class="contact-tags">
              <span v-if="activeContact?.hasLoggedContact">{{
                t('dashboard.contacted', '已通联')
              }}</span>
              <span v-if="activeContact?.contactCount">{{
                t('dashboard.history', `历史 ${activeContact.contactCount} 次`, {
                  count: activeContact.contactCount
                })
              }}</span>
              <span v-if="activeContact?.qth">QTH：{{ activeContact.qth }}</span>
              <span v-if="!activeContact">{{ t('dashboard.waitingEvents', '等待实时事件') }}</span>
            </div>
            <div class="active-contact-controls">
              <span
                class="command-address"
                :class="{ external: controlAccessInfo.isExternal }"
                :title="controlAccessInfo.title"
              >
                {{ controlAccessInfo.label }}
              </span>
              <button class="command-refresh" :disabled="refreshing" @click="refreshNow">
                {{
                  refreshing
                    ? t('common.refreshing', '刷新中...')
                    : t('dashboard.refreshScene', '刷新现场')
                }}
              </button>
              <span v-if="controlAccessInfo.isExternal" class="external-access-warning">
                {{ t('dashboard.externalAccessWarning', '正在使用外网访问，请注意隐私安全') }}
              </span>
            </div>
          </div>

          <div class="bearing-panel" :class="{ unavailable: !activeContact?.bearing }">
            <div class="compass">
              <span class="north-label">N</span>
              <svg
                class="compass-arrow"
                viewBox="0 0 24 32"
                aria-hidden="true"
                :style="{ transform: `rotate(${activeContact?.bearing?.bearing || 0}deg)` }"
              >
                <path d="M12 2 21 29 12 23 3 29Z" />
              </svg>
            </div>
            <div class="bearing-meta">
              <strong>{{
                activeContact?.bearing?.direction || t('dashboard.bearingUnknown', '方位未知')
              }}</strong>
              <span v-if="activeContact?.bearing">
                {{ activeContact.bearing.bearing }}° · {{ activeContact.bearing.distanceText }}
              </span>
              <span v-else>{{
                activeContact?.bearingHint || t('dashboard.waitingLocation', '等待呼叫位置')
              }}</span>
            </div>
          </div>
        </div>

        <div class="contact-details">
          <button
            type="button"
            class="contact-detail-card relay-detail-card"
            :title="t('dashboard.relaySearch', '中继列表 / 搜索')"
            @click="openStationList"
          >
            <span>{{ t('dashboard.relay', '中继 / 服务器') }}</span>
            <strong>
              {{
                activeContact?.relayName ||
                recentActiveRelayName ||
                currentStation?.name ||
                t('common.unknown', '未知')
              }}
              <small v-if="currentStation?.uid">#{{ currentStation.uid }}</small>
            </strong>
          </button>
          <button
            type="button"
            class="contact-detail-card frequency-detail-card"
            :title="recentRelayCommandTitle"
            @click="showRecentRelaySwitcher = true"
          >
            <span>{{ t('dashboard.frequency', '频率 / 模式') }}</span>
            <strong class="frequency-line">{{ currentFrequencyLine }}</strong>
          </button>
        </div>

        <section class="mobile-previous-card">
          <div class="section-label">
            <span>{{ t('dashboard.previous', '上个通联') }}</span>
            <span>{{
              previousContact
                ? formatTimeAgo(previousContact.timestamp)
                : t('dashboard.noPrevious', '暂无')
            }}</span>
          </div>
          <div v-if="previousContact" class="mobile-previous-main">
            <div class="mobile-previous-identity">
              <strong>{{ previousContact.callsign }}</strong>
              <span v-if="previousContact.grid">{{ previousContact.grid }}</span>
            </div>
            <div class="mobile-previous-meta">
              <span v-if="previousContact.contactCount">{{
                t('dashboard.history', `历史 ${previousContact.contactCount} 次`, {
                  count: previousContact.contactCount
                })
              }}</span>
              <span v-if="previousContact.qth">QTH：{{ previousContact.qth }}</span>
              <span v-if="previousContact.bearing?.direction">{{
                previousContact.bearing.direction
              }}</span>
            </div>
          </div>
          <div v-else class="mobile-previous-empty">
            {{ t('dashboard.noPrevious', '暂无上个通联') }}
          </div>
        </section>

        <nav class="dashboard-actions" :aria-label="t('dashboard.quickNavLabel', '仪表盘高频入口')">
          <router-link
            v-for="route in dashboardQuickRoutes"
            :key="route.path"
            :to="route.path"
            :class="{ primary: route.type === 'remoteControl' }"
          >
            {{ route.label }}
          </router-link>
        </nav>
      </section>

      <aside class="dashboard-side">
        <section class="previous-card">
          <div class="section-label">
            <span>{{ t('dashboard.previous', '上个通联') }}</span>
            <span>{{
              previousContact
                ? formatTimeAgo(previousContact.timestamp)
                : t('dashboard.noPrevious', '暂无')
            }}</span>
          </div>
          <div v-if="previousContact" class="previous-main">
            <div>
              <div class="callsign-wrap">
                <strong class="previous-callsign">{{ previousContact.callsign }}</strong>
                <span v-if="previousContact.grid" class="grid-square">{{
                  previousContact.grid
                }}</span>
              </div>
              <div class="contact-tags">
                <span v-if="previousContact.contactCount">{{
                  t('dashboard.history', `历史 ${previousContact.contactCount} 次`, {
                    count: previousContact.contactCount
                  })
                }}</span>
                <span v-if="previousContact.qth">QTH：{{ previousContact.qth }}</span>
              </div>
            </div>
            <div class="mini-bearing">
              <div class="compass">
                <span class="north-label">N</span>
                <svg
                  class="compass-arrow"
                  viewBox="0 0 24 32"
                  aria-hidden="true"
                  :style="{ transform: `rotate(${previousContact.bearing?.bearing || 0}deg)` }"
                >
                  <path d="M12 2 21 29 12 23 3 29Z" />
                </svg>
              </div>
              <span>{{
                previousContact.bearing?.direction || t('dashboard.bearingUnknown', '方位未知')
              }}</span>
            </div>
          </div>
          <div v-else class="side-empty">{{ t('dashboard.noPrevious', '暂无上个通联') }}</div>
        </section>

        <section class="server-card">
          <button
            type="button"
            class="section-label server-card-header"
            :title="t('dashboard.relaySearch', '中继列表 / 搜索')"
            @click="openStationList"
          >
            <span>{{ t('dashboard.favoriteRelays', '收藏中继 / 服务器') }}</span>
            <span class="server-list-trigger">{{
              t('dashboard.relaySearch', '中继列表 / 搜索')
            }}</span>
          </button>
          <div v-if="sortedStations.length" class="server-list">
            <button
              v-for="station in sortedStations"
              :key="station.uid || station.name"
              :disabled="switchingRelay === station.name"
              :class="{
                active: String(station.uid) === String(currentStation?.uid),
                pinned: station.isPinned
              }"
              @click="switchRelay(station.name)"
            >
              <span class="station-name">{{ station.name }}</span>
              <span v-if="station.isPinned" class="station-pin">{{
                t('dashboard.favorite', '已收藏')
              }}</span>
            </button>
          </div>
          <div v-else class="side-empty">
            {{
              loadingStation
                ? t('dashboard.loadingRelays', '正在读取中继...')
                : t('dashboard.noRelays', '暂无中继列表')
            }}
          </div>
        </section>
      </aside>

      <section class="live-panel">
        <div class="panel-header">
          <h3>{{ t('dashboard.recent20', '最近20个通联') }}</h3>
        </div>

        <div v-if="displayRecords.length > 0" class="live-table-wrap">
          <table class="live-table">
            <thead>
              <tr>
                <th>{{ t('dashboard.callsign', '呼号') }}</th>
                <th>{{ t('dashboard.time', '时间') }}</th>
                <th>QTH</th>
                <th>{{ t('dashboard.comment', '留言') }}</th>
                <th>{{ t('dashboard.mode', '模式') }}</th>
                <th>{{ t('dashboard.relay', '中继') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="record in displayRecords.slice(0, 20)"
                :key="record.rowId"
                :class="{ 'is-speaking': record.isSpeaking }"
              >
                <td
                  class="callsign-cell"
                  :class="{ 'is-clickable': record.hasLoggedContact && record.toCallsign }"
                  :title="
                    record.hasLoggedContact && record.toCallsign
                      ? t('dashboard.viewContact', '查看通联卡片')
                      : ''
                  "
                  @click="openCallsignRecords(record)"
                >
                  <strong>
                    <button
                      v-if="record.hasLoggedContact && record.toCallsign"
                      class="callsign-card-link"
                      :title="t('dashboard.viewContact', '查看通联卡片')"
                      type="button"
                      @click.stop="openCallsignRecords(record)"
                    >
                      {{ record.toCallsign }}
                    </button>
                    <template v-else>{{ record.toCallsign || '-' }}</template>
                    <span
                      v-if="record.hasLoggedContact"
                      class="logged-star"
                      :title="t('dashboard.loggedInLogs', '已在通联日志中')"
                      >★</span
                    >
                    <span v-if="record.isSelf" class="self-badge">{{
                      t('dashboard.you', '您')
                    }}</span>
                    <span v-if="record.isSpeaking" class="speaking-badge">{{
                      t('dashboard.speaking', '正在发言')
                    }}</span>
                  </strong>
                  <span v-if="record.toGrid">{{ record.toGrid }}</span>
                </td>
                <td class="time-cell">
                  <span>{{ formatDatePart(record.timestamp) }}</span>
                  <span>{{ formatClockPart(record.timestamp) }}</span>
                </td>
                <td class="qth-cell">
                  <span class="qth-content">{{ record.qth || '-' }}</span>
                </td>
                <td class="comment-cell">{{ record.toComment || '-' }}</td>
                <td>{{ record.mode || '-' }}</td>
                <td class="relay-cell">
                  <button
                    v-if="record.relayName"
                    class="relay-link"
                    :disabled="switchingRelay === record.relayName"
                    :title="
                      t('dashboard.switchToRelay', `切换到 ${record.relayName}`, {
                        name: record.relayName
                      })
                    "
                    @click="switchRelay(record.relayName)"
                  >
                    {{ record.relayName }}
                  </button>
                  <span
                    v-if="record.isRelayPinned"
                    class="favorite-indicator"
                    :title="t('dashboard.inFmoFavorites', '已在 FMO 收藏中')"
                    >★</span
                  >
                  <span v-if="!record.relayName">-</span>
                  <span v-if="record.relayAdmin" class="relay-admin"
                    >（{{ record.relayAdmin }}）</span
                  >
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          {{
            refreshing
              ? t('dashboard.readingContacts', '正在读取最近通联...')
              : t('dashboard.noContacts', '暂无通联数据')
          }}
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { FmoApiClient } from '../services/fmoApi'
import {
  formatFreqHz,
  formatTimestamp,
  MORE_ROUTES,
  NAV_ROUTES
} from '../components/home/constants'
import { getControlTarget, switchStationByRelayName } from '../services/stationControl'
import { useSpeakingStatusStore } from '../stores/speakingStore'
import { gridToAddress } from '../services/gridService'
import { addDiagnosticLog } from '../services/diagnosticLog'
import { playCallsignSpeech } from '../services/callsignSpeech'
import { formatCallsignForSpeech as formatCallsignForNatoSpeech } from '../utils/callsignSpeechText'
import toast from '../composables/useToast'
import { useLocale } from '../composables/useLocale'
import PublicSiteTools from '../components/home/PublicSiteTools.vue'

const FmoSpeech = registerPlugin('FmoSpeech')
const IOS_SPEECH_RATE = 1

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
  ownCallsign: {
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
  },
  totalLogs: {
    type: Number,
    default: 0
  },
  todayLogs: {
    type: Number,
    default: 0
  },
  uniqueCallsigns: {
    type: Number,
    default: 0
  },
  stationBusy: {
    type: Boolean,
    default: false
  },
  stationConnected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'show-callsign-records',
  'update-dashboard-voice-mode',
  'open-station-list',
  'station-prev',
  'station-next'
])
const router = useRouter()
const { t, isEnglish, toggleLocale } = useLocale()
const isDarkTheme = ref(
  localStorage.getItem('fmo_theme') === 'dark' ||
    (!localStorage.getItem('fmo_theme') &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)
)

function applyTheme() {
  document.documentElement.dataset.theme = isDarkTheme.value ? 'dark' : 'light'
  localStorage.setItem('fmo_theme', isDarkTheme.value ? 'dark' : 'light')
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value
  applyTheme()
}

function openStationList() {
  emit('open-station-list')
}

const records = ref([])
const currentStation = ref(null)
const refreshing = ref(false)
const loadingStation = ref(false)
const error = ref('')
const refreshWarning = ref('')
const consecutiveRefreshFailures = ref(0)
const lastRefreshAt = ref(null)
const switchingRelay = ref('')
const pinnedRelayNames = ref([])
const pinnedStations = ref([])
const allStations = ref([])
const qthCache = ref({})
const fmoCoordinate = ref(null)
const voiceStatus = ref('')
const activeNow = ref(Date.now())
const showRecentRelaySwitcher = ref(false)
let timer = null
let activeTimer = null
let audioContext = null
let removeVisibilityListener = null
let removeAppStateListener = null
let lastForegroundRefreshAt = 0
const REFRESH_INTERVAL_MS = 12000
const ACTIVE_CONTACT_LINGER_MS = 5000
const SOFT_REFRESH_FAILURE_LIMIT = 3
const VOICE_REPEAT_INTERVAL_MS = 10 * 60 * 1000
const VOICE_HISTORY_KEY = 'fmo_dashboard_voice_history'
const FOREGROUND_REFRESH_DEBOUNCE_MS = 1200
const ANNOUNCE_DEDUP_WINDOW_MS = 3000
const DASHBOARD_QUICK_ROUTE_TYPES = [
  'logs',
  'oldFriends',
  'top20',
  'messages',
  'settings',
  'remoteControl',
  'wishWall',
  'more'
]
const DASHBOARD_QUICK_LABELS = {
  logs: '日志',
  oldFriends: '好友',
  top20: '排行榜',
  messages: '消息',
  settings: '设置',
  remoteControl: 'FMO控制',
  wishWall: '愿望墙',
  more: '更多'
}

const shouldReconnectEventsOnForeground =
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
const recentAnnouncements = new Map()
const allDashboardRoutes = [...NAV_ROUTES, ...MORE_ROUTES]
const dashboardQuickRoutes = computed(() =>
  DASHBOARD_QUICK_ROUTE_TYPES.map((type) => {
    const route = allDashboardRoutes.find((item) => item.type === type)
    return route
      ? {
          ...route,
          label: isEnglish.value
            ? t(`nav.${type}`, DASHBOARD_QUICK_LABELS[type])
            : DASHBOARD_QUICK_LABELS[type]
        }
      : null
  }).filter(Boolean)
)

const controlTarget = computed(() => getControlTarget(props.fmoAddress, props.protocol))
const controlHost = computed(() => controlTarget.value.host)
const controlProtocol = computed(() => controlTarget.value.protocol)
const controlAccessInfo = computed(() => {
  if (!controlHost.value) {
    return {
      isExternal: false,
      label: t('dashboard.noFmoAddress', '未配置 FMO 地址'),
      title: t('dashboard.noFmoAddress', '未配置 FMO 地址')
    }
  }

  const host = stripHostPort(controlHost.value)
  const isLocal = isLocalAccessHost(host)
  const protocolText = controlProtocol.value ? `${controlProtocol.value}://` : ''
  if (isLocal) {
    return {
      isExternal: false,
      label: `${protocolText}${t('dashboard.localAccess', '局域网地址')}`,
      title: `${protocolText}${host}`
    }
  }

  return {
    isExternal: true,
    label: `${protocolText}${t('dashboard.externalAccess', '外网访问')}`,
    title: t('dashboard.externalAccessWarning', '正在使用外网访问，请注意隐私安全')
  }
})
const speakingStatus = useSpeakingStatusStore()
const { speakingHistory, primaryConnected } = storeToRefs(speakingStatus)

const lastRefreshText = computed(() => {
  if (!lastRefreshAt.value) return t('dashboard.neverRefreshed', '尚未刷新')
  return t('dashboard.lastRefresh', `上次刷新 ${formatClock(lastRefreshAt.value)}`, {
    time: formatClock(lastRefreshAt.value)
  })
})

const liveStatusKind = computed(() => {
  if (error.value) return 'error'
  if (refreshWarning.value) return 'warning'
  return ''
})

const totalContactCount = computed(() => {
  if (props.contactCounts instanceof Map) {
    return Array.from(props.contactCounts.values()).reduce(
      (sum, count) => sum + Number(count || 0),
      0
    )
  }
  return Object.values(props.contactCounts || {}).reduce(
    (sum, count) => sum + Number(count || 0),
    0
  )
})

const todayContactCount = computed(() => {
  if (props.todayContactedCallsigns instanceof Set) return props.todayContactedCallsigns.size
  return Object.keys(props.todayContactedCallsigns || {}).length
})

const currentFrequencyDisplay = computed(() => {
  const candidates = [
    currentStation.value,
    activeContact.value?.frequencySource,
    findStationByName(activeContact.value?.relayName),
    findStationByName(recentActiveRelayName.value),
    records.value.find((record) => getFrequencyParts(record).hasFrequency),
    activeContact.value
  ].filter(Boolean)

  let fallback = null
  for (const candidate of candidates) {
    const display = formatFrequencyDisplay(candidate)
    if (display.tx || display.rx) return display
    if (!fallback && (display.hasFrequency || display.mode !== 'FMO')) fallback = display
  }

  if (fallback) return fallback
  return formatFrequencyDisplay(null)
})

const currentFrequencyLine = computed(() => {
  const display = currentFrequencyDisplay.value
  if (display.tx || display.rx) {
    const parts = []
    if (display.tx) parts.push(`T:${display.tx.replace(/\s*MHz$/i, '')}`)
    if (display.rx) parts.push(`R:${display.rx.replace(/\s*MHz$/i, '')}`)
    parts.push(display.mode)
    return parts.join('/')
  }
  return [display.single?.replace(/\s*MHz$/i, ''), display.mode].filter(Boolean).join('/')
})

const sortedStations = computed(() => {
  const pinnedUids = new Set(pinnedStations.value.map((station) => String(station.uid)))
  const merged = allStations.value.map((station) => ({
    ...station,
    isPinned: pinnedUids.has(String(station.uid))
  }))

  return merged.sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1
    if (String(a.uid) === String(currentStation.value?.uid)) return -1
    if (String(b.uid) === String(currentStation.value?.uid)) return 1
    return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN')
  })
})

const currentSpeakingRecord = computed(() => {
  return (
    [...speakingHistory.value]
      .filter((item) => !item.endTime && item.callsign)
      .sort((a, b) => (b.startTime || 0) - (a.startTime || 0))[0] || null
  )
})

const recentEndedSpeakingRecord = computed(() => {
  const now = activeNow.value
  return (
    [...speakingHistory.value]
      .filter(
        (item) => item.endTime && item.callsign && now - item.endTime <= ACTIVE_CONTACT_LINGER_MS
      )
      .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))[0] || null
  )
})

const activeContact = computed(() => {
  const current = currentSpeakingRecord.value || recentEndedSpeakingRecord.value
  if (!current) return null

  const matchedLog = findMatchingLog(current)
  const grid = normalizeGrid(current.grid || matchedLog?.toGrid || '')
  const qth = getRecordQth({ ...matchedLog, toGrid: grid })
  const callsign = getCallsign(current)
  const isSelf = isSelfCallsign(callsign)
  const bearing = getBearingForGrid(grid, isSelf)

  return {
    callsign,
    timestamp: Math.floor(current.startTime / 1000),
    grid,
    qth,
    relayName: current.serverName || matchedLog?.relayName || currentStation.value?.name || '',
    frequencySource: matchedLog || findStationByName(current.serverName) || currentStation.value,
    bearing,
    bearingHint: getBearingHint(grid, isSelf),
    isSpeaking: !current.endTime,
    isNewCallsign: Boolean(callsign && !isSelf && getContactCount(callsign) <= 0),
    contactCount: getContactCount(callsign),
    hasLoggedContact: hasLoggedContact(callsign, matchedLog)
  }
})

const recentActiveRelayName = computed(() => {
  const liveRelay = getSpeakingRelayName(currentSpeakingRecord.value)
  if (liveRelay) return liveRelay

  const recentRelay = getSpeakingRelayName(recentEndedSpeakingRecord.value)
  if (recentRelay) return recentRelay

  const latestRelayRecord = [...speakingHistory.value]
    .filter((item) => item.callsign && (item.serverName || findMatchingLog(item)?.relayName))
    .sort((a, b) => {
      const aTime = a.endTime || a.startTime || 0
      const bTime = b.endTime || b.startTime || 0
      return bTime - aTime
    })[0]

  return getSpeakingRelayName(latestRelayRecord)
})

const recentActiveRelayNames = computed(() => {
  const names = []
  const seen = new Set()
  const recordsByTime = [...speakingHistory.value].sort((a, b) => {
    const aTime = a.endTime || a.startTime || 0
    const bTime = b.endTime || b.startTime || 0
    return bTime - aTime
  })

  for (const item of recordsByTime) {
    const name = getSpeakingRelayName(item)
    const key = normalizeRelayName(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    names.push(name)
  }

  return names
})

const recentRelayControlName = computed(() => {
  return currentStation.value?.name || recentActiveRelayName.value || ''
})

const recentRelayBusy = computed(() => {
  return (
    props.stationBusy || Boolean(switchingRelay.value) || recentActiveRelayNames.value.length === 0
  )
})

const recentRelayCommandTitle = computed(() => {
  if (recentRelayControlName.value) {
    return t('dashboard.recentActiveRelay', `最近活跃中继：${recentRelayControlName.value}`, {
      name: recentRelayControlName.value
    })
  }
  return t('dashboard.recentActiveRelay', '最近活跃中继')
})

const displayRecords = computed(() => {
  const liveRows = speakingHistory.value
    .filter((item) => item.endTime)
    .map((item) => {
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
        toComment: item.endTime
          ? matchedLog?.toComment || t('dashboard.recentSpeaker', '最近发言')
          : t('dashboard.speaking', '正在发言'),
        mode: matchedLog?.mode || 'FMO',
        relayName: item.serverName || matchedLog?.relayName || currentStation.value?.name || '',
        relayAdmin: matchedLog?.relayAdmin || '',
        isRelayPinned: isRelayPinned(
          item.serverName || matchedLog?.relayName || currentStation.value?.name
        ),
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

  const sortedRows = [...liveRows, ...qsoRows].sort(
    (a, b) => (b.timestamp || 0) - (a.timestamp || 0)
  )
  return dedupeLatestByCallsign(sortedRows).slice(0, 20)
})

const previousContact = computed(() => {
  const activeCallsign = normalizeCallsign(activeContact.value?.callsign)
  const activeTimestamp = activeContact.value?.timestamp || 0
  const record = displayRecords.value.find((item) => {
    const sameCallsign = normalizeCallsign(item.toCallsign) === activeCallsign
    const sameMoment = Math.abs((item.timestamp || 0) - activeTimestamp) < 90
    return !(sameCallsign && sameMoment)
  })
  if (!record) return null

  const callsign = normalizeCallsign(record.toCallsign)
  const grid = normalizeGrid(record.toGrid)
  return {
    ...record,
    callsign,
    grid,
    qth: record.qth || getRecordQth(record),
    bearing: getBearingForGrid(grid, record.isSelf),
    contactCount: getContactCount(callsign)
  }
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

function formatTimeAgo(timestamp) {
  if (!timestamp) return t('dashboard.noPrevious', '暂无')
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp))
  if (seconds < 60) return t('dashboard.justNow', '刚刚')
  if (seconds < 3600) {
    const count = Math.floor(seconds / 60)
    return t('dashboard.minutesAgo', `${count} 分钟前`, { count })
  }
  if (seconds < 86400) {
    const count = Math.floor(seconds / 3600)
    return t('dashboard.hoursAgo', `${count} 小时前`, { count })
  }
  const count = Math.floor(seconds / 86400)
  return t('dashboard.daysAgo', `${count} 天前`, { count })
}

function findStationByName(name) {
  const key = normalizeRelayName(name)
  if (!key) return null
  return (
    allStations.value.find((station) => normalizeRelayName(station.name) === key) ||
    pinnedStations.value.find((station) => normalizeRelayName(station.name) === key) ||
    null
  )
}

function readFrequencyValue(record, names) {
  if (!record) return null
  for (const name of names) {
    const value = record[name]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function normalizeFrequencyHz(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string' && value.trim().toUpperCase().endsWith('MHZ')) {
    const mhz = Number(value.replace(/mhz/i, '').trim())
    return Number.isFinite(mhz) ? Math.round(mhz * 10000) : null
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return null

  // FMO 日志使用 MHz * 10000；部分接口可能直接返回 MHz 或 Hz。
  if (numeric < 10000) return Math.round(numeric * 10000)
  if (numeric > 100000000) return Math.round(numeric / 100)
  return Math.round(numeric)
}

function normalizeFrequencyDeltaHz(value) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string' && value.trim().toUpperCase().endsWith('MHZ')) {
    const mhz = Number(value.replace(/mhz/i, '').trim())
    return Number.isFinite(mhz) && mhz !== 0 ? Math.round(mhz * 10000) : null
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric === 0) return null
  const abs = Math.abs(numeric)
  let normalized = 0
  if (abs < 10000) normalized = Math.round(abs * 10000)
  else if (abs > 100000000) normalized = Math.round(abs / 100)
  else normalized = Math.round(abs)
  return numeric < 0 ? -normalized : normalized
}

function formatFrequencyValue(value) {
  const normalized = normalizeFrequencyHz(value)
  return normalized ? `${formatFreqHz(normalized)} MHz` : ''
}

function findCombinedFrequencyText(record) {
  if (!record || typeof record !== 'object') return ''
  const preferredKeys = [
    'frequencyText',
    'frequencyDisplay',
    'freqText',
    'freqDisplay',
    'displayFrequency',
    'channel',
    'channelText',
    'radioFrequency',
    'workFrequency'
  ]
  const values = []
  for (const key of preferredKeys) {
    const value = record[key]
    if (typeof value === 'string') values.push(value)
  }
  for (const value of Object.values(record)) {
    if (typeof value === 'string' && /(?:^|[\\s/])(?:T|TX|R|RX)\\s*[:：]/i.test(value)) {
      values.push(value)
    }
  }
  return values.find((value) => /(?:T|TX)\\s*[:：].*(?:R|RX)\\s*[:：]/i.test(value)) || ''
}

function parseCombinedFrequencyParts(record) {
  const text = findCombinedFrequencyText(record)
  if (!text) return { tx: '', rx: '' }
  const txMatch = text.match(/(?:^|[\\s/])(?:T|TX)\\s*[:：]\\s*([0-9]+(?:\\.[0-9]+)?)/i)
  const rxMatch = text.match(/(?:^|[\\s/])(?:R|RX)\\s*[:：]\\s*([0-9]+(?:\\.[0-9]+)?)/i)
  return {
    tx: txMatch ? formatFrequencyValue(txMatch[1]) : '',
    rx: rxMatch ? formatFrequencyValue(rxMatch[1]) : ''
  }
}

function getOffsetFrequencyValue(record) {
  return readFrequencyValue(record, [
    'txOffsetHz',
    'txOffset',
    'freqOffsetHz',
    'freqOffset',
    'frequencyOffsetHz',
    'frequencyOffset',
    'offsetHz',
    'offset',
    'shiftHz',
    'shift',
    'duplexOffsetHz',
    'duplexOffset',
    'differenceHz',
    'difference'
  ])
}

function inferTxRxFromOffset(record, singleText) {
  const singleHz = normalizeFrequencyHz(
    readFrequencyValue(record, ['freqHz', 'frequencyHz', 'freq'])
  )
  const offsetHz = normalizeFrequencyDeltaHz(getOffsetFrequencyValue(record))
  if (!singleHz || !offsetHz) return { tx: '', rx: '' }

  const direction = String(
    readFrequencyValue(record, ['duplex', 'shiftDirection', 'offsetDirection', 'direction']) || ''
  ).toLowerCase()
  const sign =
    direction.includes('-') || direction.includes('minus') || offsetHz < 0
      ? -1
      : direction.includes('+') || direction.includes('plus')
        ? 1
        : 1

  const txHz = singleHz + sign * Math.abs(offsetHz)
  if (txHz <= 0 || txHz === singleHz) return { tx: '', rx: '' }
  return {
    tx: formatFrequencyValue(txHz),
    rx: singleText || formatFrequencyValue(singleHz)
  }
}

function inferKnownFmoPair(record, singleText) {
  const mode = String(record?.mode || record?.app_fmo_mode || '').toUpperCase()
  const singleHz = normalizeFrequencyHz(
    readFrequencyValue(record, ['freqHz', 'frequencyHz', 'freq'])
  )
  if (mode !== 'FMO' || singleHz !== 4382500) return { tx: '', rx: '' }
  return {
    tx: '434.2500 MHz',
    rx: singleText || '438.2500 MHz'
  }
}

function getFrequencyParts(record) {
  let tx = formatFrequencyValue(
    readFrequencyValue(record, [
      'txFreqHz',
      'txFrequencyHz',
      'txFreq',
      'txFrequency',
      'tx_freq',
      'tx_frequency',
      'tx',
      'tFreqHz',
      'tFreq',
      't',
      'transmitFreqHz',
      'transmitFreq',
      'transmitFrequency',
      'transmit',
      'sendFreqHz',
      'sendFreq',
      'sendFrequency',
      'frequencyTx',
      'frequencyTX',
      'uplinkFreqHz',
      'uplinkFreq',
      'uplinkFrequency'
    ])
  )
  let rx = formatFrequencyValue(
    readFrequencyValue(record, [
      'rxFreqHz',
      'rxFrequencyHz',
      'rxFreq',
      'rxFrequency',
      'rx_freq',
      'rx_frequency',
      'rx',
      'rFreqHz',
      'rFreq',
      'r',
      'receiveFreqHz',
      'receiveFreq',
      'receiveFrequency',
      'receive',
      'recvFreqHz',
      'recvFreq',
      'recvFrequency',
      'frequencyRx',
      'frequencyRX',
      'downlinkFreqHz',
      'downlinkFreq',
      'downlinkFrequency'
    ])
  )
  const single = formatFrequencyValue(readFrequencyValue(record, ['freqHz', 'frequencyHz', 'freq']))
  if (!tx || !rx) {
    const combined = parseCombinedFrequencyParts(record)
    tx = tx || combined.tx
    rx = rx || combined.rx
  }
  if (!tx || !rx) {
    const offsetParts = inferTxRxFromOffset(record, single)
    tx = tx || offsetParts.tx
    rx = rx || offsetParts.rx
  }
  if (!tx || !rx) {
    const knownPair = inferKnownFmoPair(record, single)
    tx = tx || knownPair.tx
    rx = rx || knownPair.rx
  }
  return {
    tx,
    rx,
    single: tx || rx ? '' : single,
    hasFrequency: Boolean(tx || rx || single)
  }
}

function formatFrequencyDisplay(record) {
  const parts = getFrequencyParts(record)
  return {
    ...parts,
    mode: record?.mode || record?.app_fmo_mode || 'FMO'
  }
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
  return [address.province, address.city, address.district]
    .filter(Boolean)
    .filter((part, index, arr) => arr.indexOf(part) === index)
    .join('')
}

function stripHostPort(host) {
  const raw = String(host || '').trim()
  if (!raw) return ''
  if (raw.startsWith('[')) return raw.slice(1, raw.indexOf(']')).toLowerCase()
  return raw.split(':')[0].toLowerCase()
}

function isLocalAccessHost(host) {
  if (!host) return false
  if (host === 'localhost' || host.endsWith('.local')) return true
  if (host === '::1') return true

  const parts = host.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return false
  const [a, b] = parts
  return (
    a === 10 ||
    a === 127 ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 169 && b === 254)
  )
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
  return String(grid || '')
    .trim()
    .toUpperCase()
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
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function calculateBearing(from, to) {
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)
  const dLng = toRadians(to.lng - from.lng)
  const y = Math.sin(dLng) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return Math.round((toDegrees(Math.atan2(y, x)) + 360) % 360)
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  if (km < 100) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

function bearingToDirection(bearing) {
  const labels = isEnglish.value
    ? [
        'dashboard.direction.N',
        'dashboard.direction.NNE',
        'dashboard.direction.NE',
        'dashboard.direction.ENE',
        'dashboard.direction.E',
        'dashboard.direction.ESE',
        'dashboard.direction.SE',
        'dashboard.direction.SSE',
        'dashboard.direction.S',
        'dashboard.direction.SSW',
        'dashboard.direction.SW',
        'dashboard.direction.WSW',
        'dashboard.direction.W',
        'dashboard.direction.WNW',
        'dashboard.direction.NW',
        'dashboard.direction.NNW'
      ]
    : [
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
  const label = labels[Math.round(bearing / 22.5) % 16]
  return isEnglish.value ? t(label, label.replace('dashboard.direction.', '')) : label
}

function getBearingForGrid(grid, isSelf = false) {
  if (isSelf) {
    return {
      bearing: 0,
      direction: t('dashboard.selfPosition', '本机位置'),
      distanceKm: 0,
      distanceText: '0 m'
    }
  }

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

function getBearingHint(grid, isSelf = false) {
  if (isSelf) return t('dashboard.selfPosition', '本机位置')
  if (!grid) return t('dashboard.waitingLocation', '缺少对方网格')
  if (!fmoCoordinate.value) return t('dashboard.noFmoCoordinate', '未读取到 FMO 坐标')
  return t('dashboard.invalidGrid', '网格格式不可用')
}

function normalizeRelayName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
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
  return String(callsign || '')
    .trim()
    .toUpperCase()
}

function isSelfCallsign(callsign) {
  return Boolean(
    normalizeCallsign(callsign) &&
    normalizeCallsign(callsign) === normalizeCallsign(props.selectedFromCallsign)
  )
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function isNativeIos() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

function formatCallsignForLegacySpeech(callsign) {
  return String(callsign || '')
    .split('')
    .join(' ')
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
  if (isNativeIos()) {
    return speakCallsignOnIos(callsign)
  }

  const text = formatCallsignForLegacySpeech(callsign)

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

    const utterance = new window.SpeechSynthesisUtterance(text)
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

async function speakCallsignOnIos(callsign) {
  const text = formatCallsignForNatoSpeech(callsign)

  async function playBuiltInPrimary() {
    try {
      window.speechSynthesis?.cancel?.()
      await playCallsignSpeech(callsign)
      addDiagnosticLog('info', 'iOS 已使用内置呼号音频播报', { callsign, text })
      return true
    } catch (err) {
      addDiagnosticLog('warn', 'iOS 内置呼号音频不可用，尝试系统语音', {
        callsign,
        text,
        error: err?.message || String(err)
      })
      return false
    }
  }

  async function playBuiltInFallback(reason) {
    try {
      window.speechSynthesis?.cancel?.()
      await playCallsignSpeech(callsign)
      addDiagnosticLog('info', '已使用内置呼号音频保底播报', {
        callsign,
        text,
        reason
      })
    } catch (err) {
      addDiagnosticLog('warn', '内置呼号音频保底播报失败', {
        callsign,
        text,
        reason,
        error: err?.message || String(err)
      })
    }
  }

  if (await playBuiltInPrimary()) return

  await waitForVoices()
  return new Promise((resolve) => {
    let settled = false
    const finish = () => {
      if (settled) return false
      settled = true
      resolve()
      return true
    }

    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      addDiagnosticLog('warn', '当前 WebView 不支持语音合成，尝试内置呼号语音')
      playBuiltInFallback('web-speech-unavailable').finally(finish)
      return
    }

    const utterance = new window.SpeechSynthesisUtterance(text)
    const voice = getPreferredSpeechVoice()
    if (voice) utterance.voice = voice
    utterance.lang = 'en-US'
    utterance.rate = IOS_SPEECH_RATE
    utterance.volume = 1
    utterance.pitch = 1
    const keepAlive = setInterval(() => {
      window.speechSynthesis?.resume?.()
    }, 1000)
    const timeout = setTimeout(() => {
      clearInterval(keepAlive)
      if (settled) return
      addDiagnosticLog('warn', '呼号播报超时，已继续播放提示音', {
        callsign,
        voice: voice ? `${voice.name} (${voice.lang})` : '未选择语音',
        text
      })
      playBuiltInFallback('web-speech-timeout').finally(finish)
    }, getSpeechTimeoutMs(text))
    utterance.onend = () => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      finish()
    }
    utterance.onerror = (event) => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      if (settled) return
      addDiagnosticLog('warn', '呼号播报失败', { callsign, error: event.error })
      playBuiltInFallback(`web-speech-error:${event.error || 'unknown'}`).finally(finish)
    }
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    window.speechSynthesis.resume?.()
  })
}

async function announceCallsign(callsign) {
  if (props.voiceMode !== 'alert' || !callsign) return
  if (isSelfCallsign(callsign)) return
  const normalized = normalizeCallsign(callsign)
  const eventKey = currentSpeakingRecord.value
    ? `${normalized}:${currentSpeakingRecord.value.startTime || ''}`
    : normalized
  const lastAnnouncedAt = recentAnnouncements.get(eventKey) || 0
  if (Date.now() - lastAnnouncedAt < ANNOUNCE_DEDUP_WINDOW_MS) return
  recentAnnouncements.set(eventKey, Date.now())

  const plan = getVoicePlan(callsign)
  if (!plan) {
    recentAnnouncements.delete(eventKey)
    return
  }

  const history = loadVoiceHistory()
  history[callsign] = Date.now()
  saveVoiceHistory(history)

  voiceStatus.value = `正在播报：${callsign}（${plan.label}）`
  await speakCallsign(callsign)
  await playBeeps(plan.beepCount)
  voiceStatus.value = ''
}

function openCallsignRecords(record) {
  const callsign = getCallsign(record)
  if (!callsign || !hasLoggedContact(callsign, record)) return
  emit('show-callsign-records', {
    callsign,
    timestamp: record.timestamp || null
  })
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
    const [station, qsoResponse, pinnedList, coordinate, stationList] = await Promise.all([
      client.getCurrentStation(),
      client.getQsoList(0, 20, props.selectedFromCallsign || ''),
      client.getAllPinnedStations(),
      client.getCoordinate().catch(() => null),
      allStations.value.length > 0 ? Promise.resolve(allStations.value) : client.getAllStations()
    ])
    currentStation.value = station
    if (
      coordinate &&
      typeof coordinate.latitude === 'number' &&
      typeof coordinate.longitude === 'number'
    ) {
      fmoCoordinate.value = { lat: coordinate.latitude, lng: coordinate.longitude }
    }
    pinnedStations.value = pinnedList || []
    pinnedRelayNames.value = pinnedStations.value.map((item) => normalizeRelayName(item.name))
    allStations.value = stationList || []
    loadingStation.value = false

    const list = qsoResponse?.list || []
    const detailed = list.map((item) => normalizeRecord(item, null))
    records.value = detailed

    for (const [index, item] of list.entries()) {
      try {
        const detail = item.logId ? await client.getQsoDetail(item.logId) : null
        detailed[index] = normalizeRecord(item, detail)
      } catch (err) {
        addDiagnosticLog('warn', '读取通联详情失败，已使用列表数据', {
          logId: item.logId,
          error: err?.message || String(err)
        })
      }

      if (index === 0) records.value = [...detailed]
    }

    records.value = detailed
    lastRefreshAt.value = new Date()
    consecutiveRefreshFailures.value = 0
    refreshWarning.value = ''
    error.value = ''
  } catch (err) {
    consecutiveRefreshFailures.value += 1
    const message = formatErrorMessage(err)
    const hasCachedData = records.value.length > 0 || currentStation.value || lastRefreshAt.value
    if (hasCachedData && consecutiveRefreshFailures.value < SOFT_REFRESH_FAILURE_LIMIT) {
      refreshWarning.value = `网络波动，保留上次数据（${consecutiveRefreshFailures.value}/${SOFT_REFRESH_FAILURE_LIMIT}）：${message}`
      error.value = ''
      addDiagnosticLog('warn', '仪表盘刷新暂时失败，保留上次数据', {
        failures: consecutiveRefreshFailures.value,
        error: message
      })
    } else {
      refreshWarning.value = ''
      error.value = `刷新失败：${message}`
      addDiagnosticLog('error', '仪表盘刷新失败', err)
    }
  } finally {
    loadingStation.value = false
    refreshing.value = false
    client.close()
  }
}

function refreshNow() {
  refreshDashboard()
  refreshSpeakingSnapshot()
}

function refreshSpeakingSnapshot({ reconnect = false } = {}) {
  const addressId = speakingStatus.primaryAddressId || 'single'
  if (reconnect) {
    return speakingStatus.reconnectEventWs?.(addressId)
  }
  speakingStatus.refreshSnapshot?.(addressId)
}

function updateCurrentStationSnapshot(station) {
  if (!station) return
  currentStation.value = station
  const addressId = speakingStatus.primaryAddressId || 'single'
  speakingStatus.updateServerInfo?.(addressId, station)
}

function refreshAfterForeground() {
  const now = Date.now()
  if (now - lastForegroundRefreshAt < FOREGROUND_REFRESH_DEBOUNCE_MS) return
  lastForegroundRefreshAt = now
  refreshSpeakingSnapshot({ reconnect: shouldReconnectEventsOnForeground })
  refreshDashboard()
}

function handleVisibilityChange() {
  if (document.visibilityState !== 'visible') return
  refreshAfterForeground()
}

function handleAppStateChange(state) {
  if (!state?.isActive) return
  refreshAfterForeground()
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
      if (voiceStatus.value === '已关闭所有播报' || voiceStatus.value.startsWith('声音模式：')) {
        voiceStatus.value = ''
      }
    }, 1800)
  }
)

async function switchRelay(relayName) {
  if (!relayName || switchingRelay.value) return false
  switchingRelay.value = relayName

  try {
    const { current, station } = await switchStationByRelayName(
      relayName,
      props.fmoAddress,
      props.protocol,
      {
        onSwitched: updateCurrentStationSnapshot
      }
    )
    updateCurrentStationSnapshot(current || station)
    refreshSpeakingSnapshot()
    toast.success(`已切换到：${current?.name || station.name}`)
    return true
  } catch (err) {
    toast.error(err.message || '切换中继失败')
    return false
  } finally {
    switchingRelay.value = ''
  }
}

function getSpeakingRelayName(speakingRecord) {
  if (!speakingRecord) return ''
  const matchedLog = findMatchingLog(speakingRecord)
  return speakingRecord.serverName || matchedLog?.relayName || ''
}

async function switchRecentRelay(direction) {
  if (recentRelayBusy.value) return

  const names = recentActiveRelayNames.value
  if (names.length === 0) {
    toast.warning('暂无最近活跃中继')
    return
  }

  const currentKey = normalizeRelayName(currentStation.value?.name || recentActiveRelayName.value)
  const currentIndex = names.findIndex((name) => normalizeRelayName(name) === currentKey)
  let nextIndex = 0

  if (currentIndex >= 0) {
    nextIndex = direction === 'prev' ? currentIndex + 1 : currentIndex - 1
    if (nextIndex < 0) nextIndex = names.length - 1
    if (nextIndex >= names.length) nextIndex = 0
  }

  const switched = await switchRelay(names[nextIndex])
  if (switched) showRecentRelaySwitcher.value = false
}

onMounted(() => {
  applyTheme()
  if (controlHost.value && !primaryConnected.value) {
    speakingStatus.connectEventWs(controlHost.value, controlProtocol.value)
  }
  refreshSpeakingSnapshot()
  refreshDashboard()
  timer = setInterval(refreshDashboard, REFRESH_INTERVAL_MS)
  activeTimer = setInterval(() => {
    activeNow.value = Date.now()
  }, 1000)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  removeVisibilityListener = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
  if (shouldReconnectEventsOnForeground) {
    CapacitorApp.addListener('appStateChange', handleAppStateChange).then((handle) => {
      removeAppStateListener = () => {
        handle.remove()
      }
    })
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (activeTimer) clearInterval(activeTimer)
  if (removeVisibilityListener) removeVisibilityListener()
  if (removeAppStateListener) removeAppStateListener()
  window.speechSynthesis?.cancel()
})
</script>

<style scoped>
.dashboard-view {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dashboard-command-bar,
.station-band,
.live-panel {
  min-width: 0;
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  border: 1px solid color-mix(in srgb, var(--border-light) 78%, var(--color-primary));
  border-radius: 8px;
  box-shadow: var(--shadow-panel);
}

.dashboard-command-bar {
  display: grid;
  grid-template-columns: minmax(220px, 0.8fr) minmax(0, 1.2fr);
  gap: 0.85rem;
  align-items: center;
  padding: 0.8rem;
  flex-shrink: 0;
}

.connection-strip {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  min-width: 0;
  padding: 0.2rem 0.25rem;
}

.status-dot {
  width: 0.68rem;
  height: 0.68rem;
  border-radius: 50%;
  background: var(--color-success);
  box-shadow: 0 0 0 0.28rem var(--surface-success);
  flex-shrink: 0;
}

.status-dot.error {
  background: var(--color-danger);
  box-shadow: 0 0 0 0.28rem var(--surface-danger);
}

.status-dot.warning {
  background: var(--color-warning);
  box-shadow: 0 0 0 0.28rem var(--surface-warning);
}

.connection-copy {
  display: grid;
  gap: 0.08rem;
  min-width: 0;
}

.connection-copy strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.96rem;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.quick-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}

.quick-actions::-webkit-scrollbar {
  display: none;
}

.quick-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.15rem;
  padding: 0 0.78rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  background: var(--surface-accent);
  color: var(--text-primary);
  font-size: 0.88rem;
  font-weight: 650;
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color 0.2s,
    background-color 0.2s,
    color 0.2s;
}

.quick-action:hover {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--border-light));
  background: color-mix(in srgb, var(--surface-accent) 65%, var(--bg-card));
  color: var(--color-primary);
}

.station-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 0.36fr);
  align-items: stretch;
  gap: 1rem;
  padding: 1rem;
  flex-shrink: 0;
}

.eyebrow {
  color: var(--text-tertiary);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.75rem;
  align-content: stretch;
  min-width: 0;
}

.active-contact-card {
  min-width: 0;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, var(--border-light) 75%, var(--color-primary));
  border-radius: 8px;
  background: linear-gradient(135deg, var(--surface-accent), transparent 58%), var(--bg-card);
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
  align-self: stretch;
  align-content: start;
  gap: 0.18rem;
}

.active-contact-primary h1,
.active-contact-primary h2,
.active-contact-empty h2 {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(2.2rem, 5vw, 4.1rem);
  line-height: 0.96;
  letter-spacing: 0;
}

.active-contact-new-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(64, 158, 255, 0.45);
  border-radius: 4px;
  min-width: 1.36rem;
  height: 1.1rem;
  padding: 0 0.26rem;
  color: var(--color-primary);
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
  transform: translateY(-0.08rem);
  vertical-align: baseline;
}

.active-contact-primary p,
.active-contact-empty p {
  margin: 0;
  color: var(--text-tertiary);
  font-size: clamp(0.95rem, 1.25vw, 1.08rem);
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
  min-width: 210px;
  padding: 0.75rem;
  border: 1px solid color-mix(in srgb, var(--border-light) 70%, var(--color-success));
  border-radius: 8px;
  background: var(--surface-success);
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
  width: 52px;
  height: 52px;
  margin-top: 0.55rem;
  border: 2px solid color-mix(in srgb, var(--color-success) 45%, var(--border-secondary));
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
  gap: 0.2rem;
  min-width: 0;
  padding: 0.85rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-table-stripe);
  text-align: left;
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
  width: 100%;
  min-height: 2.55rem;
  border: 1px solid var(--color-success);
  background: var(--color-success);
  color: #fff;
  border-radius: 7px;
  padding: 0.45rem 0.9rem;
  cursor: pointer;
  white-space: nowrap;
  font-weight: 700;
}

.refresh-btn:disabled {
  cursor: wait;
  opacity: 0.7;
}

.refresh-stack {
  display: grid;
  justify-items: stretch;
  gap: 0.28rem;
  flex-shrink: 0;
}

.refresh-time,
.record-count {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.refresh-time {
  text-align: center;
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
  padding: 0.62rem 0.85rem;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.panel-header h3 {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.86rem;
  font-weight: 700;
}

.live-table-wrap {
  min-height: 0;
  flex: 1;
  overflow: auto;
  max-width: 100%;
}

.live-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.live-table th,
.live-table td {
  padding: 0.34rem 0.58rem;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  font-size: 0.82rem;
  line-height: 1.16;
  text-align: left;
  vertical-align: middle;
}

.live-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--bg-table-header) 82%, var(--bg-card));
  color: var(--text-tertiary);
  font-size: 0.7rem;
  font-weight: 700;
}

.live-table tr.is-speaking td {
  background: rgba(76, 175, 80, 0.1);
}

.callsign-cell {
  width: clamp(118px, 12vw, 148px);
}

.callsign-cell strong {
  display: block;
  font-size: 0.88rem;
  line-height: 1.12;
}

.callsign-card-link {
  appearance: none;
  border: 0;
  border-radius: 4px;
  margin: -0.05rem -0.12rem;
  padding: 0.05rem 0.12rem;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: inherit;
  letter-spacing: 0;
}

.callsign-card-link:hover,
.callsign-card-link:focus-visible {
  background: var(--bg-table-hover);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 0.16rem;
  outline: none;
}

.callsign-cell.is-clickable {
  cursor: pointer;
}

.callsign-cell.is-clickable:active .callsign-card-link,
.callsign-cell.is-clickable:active .logged-star {
  opacity: 0.75;
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
    overflow-x: hidden;
  }

  .dashboard-command-bar {
    grid-template-columns: 1fr;
    gap: 0.65rem;
    padding: 0.75rem;
  }

  .quick-actions {
    justify-content: flex-start;
    width: 100%;
    padding-bottom: 0.1rem;
  }

  .quick-action {
    min-height: 2rem;
    padding: 0 0.68rem;
    font-size: 0.82rem;
  }

  .station-band,
  .panel-header {
    align-items: flex-start;
  }

  .station-band {
    grid-template-columns: 1fr;
    gap: 0.85rem;
  }

  .active-contact-card {
    width: 100%;
    min-width: 0;
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

  .active-contact-primary h1,
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
    overflow-x: auto;
    overscroll-behavior-x: contain;
    -webkit-overflow-scrolling: touch;
  }
}

@media (max-width: 520px) {
  .dashboard-view {
    padding: 0.75rem;
  }

  .active-contact-primary h1,
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

/* V2 dashboard slices */
.dashboard-view {
  padding: 0;
}

.dashboard-command-bar {
  grid-template-columns: auto minmax(0, 1fr) auto;
  border-radius: 0;
  border-width: 0 0 1px;
  box-shadow: none;
}

.dashboard-brand {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: max-content;
}

.dashboard-brand-mark {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-primary);
  border-radius: 7px;
  object-fit: cover;
}

.dashboard-brand strong {
  color: var(--text-primary);
  font-size: 1rem;
  white-space: nowrap;
}

.connection-strip {
  gap: 0.8rem;
}

.connection-copy {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.25rem 0.6rem;
}

.connection-copy strong {
  font-size: 1rem;
}

.connection-copy span {
  color: var(--text-tertiary);
  font-size: 0.82rem;
}

.command-stats,
.mobile-command-stats,
.command-tools {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.command-stats span,
.mobile-command-stats span,
.command-address {
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 650;
  white-space: nowrap;
}

.command-stats .command-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.mobile-command-stats {
  display: none;
}

.stat-star {
  color: #f6b925;
  font-size: 0.92rem;
  text-shadow: 0 0 8px rgba(246, 185, 37, 0.28);
}

.stat-light {
  width: 0.48rem;
  height: 0.48rem;
  flex-shrink: 0;
  border-radius: 50%;
}

.friend-stat .stat-light {
  background: #45b6ff;
  box-shadow: 0 0 0 3px rgba(69, 182, 255, 0.12);
}

.today-stat .stat-light {
  background: #65d47e;
  box-shadow: 0 0 0 3px rgba(101, 212, 126, 0.12);
}

.command-tools {
  justify-content: flex-end;
}

.command-select-wrap {
  display: inline-flex;
  height: 2.25rem;
  align-items: center;
  gap: 0.35rem;
  padding: 0 0.4rem 0 0.6rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--color-primary);
  background: var(--surface-accent);
}

.command-select {
  width: 7.5rem;
  height: 100%;
  padding: 0 1.25rem 0 0;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.command-tool {
  display: inline-flex;
  width: 2.25rem;
  height: 2.25rem;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--bg-table-stripe);
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.command-tool-wide {
  width: auto;
  padding: 0 0.65rem;
}

.command-tool.active,
.command-tool:hover {
  border-color: color-mix(in srgb, var(--color-primary) 50%, var(--border-light));
  color: var(--color-primary);
  background: var(--surface-accent);
}

.command-tool svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.tool-icon {
  font-size: 1rem;
  line-height: 1;
}

.recent-relay-switcher-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  align-items: start;
  justify-items: center;
  padding: calc(5rem + var(--safe-inset-top, env(safe-area-inset-top, 0px))) 1rem 1rem;
  background: rgba(0, 0, 0, 0.38);
}

.recent-relay-switcher {
  display: grid;
  width: min(100%, 22rem);
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 0.65rem;
  border: 1px solid color-mix(in srgb, var(--border-light) 75%, var(--color-success));
  border-radius: 8px;
  background: color-mix(in srgb, var(--bg-card) 94%, transparent);
  box-shadow: var(--shadow-panel);
}

.recent-relay-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  min-height: 3rem;
  border: 0;
  border-radius: 7px;
  color: #fff;
  background: #63d37d;
  font-size: 0.96rem;
  font-weight: 800;
  letter-spacing: 0;
}

.recent-relay-action-line {
  display: block;
}

.recent-relay-action:active:not(:disabled) {
  transform: translateY(1px);
}

.recent-relay-action:disabled {
  cursor: wait;
  opacity: 0.62;
}

:global(.native-android .recent-relay-switcher) {
  width: min(100%, 286px);
  gap: 10px;
  padding: 10px;
  -webkit-text-size-adjust: 100%;
  text-size-adjust: 100%;
}

:global(.native-android .recent-relay-action) {
  min-height: 40px;
  padding: 0 10px;
  font-size: 14px;
  line-height: 1.15;
}

@media (max-width: 768px) {
  :global(.native-ios .recent-relay-switcher) {
    width: min(100%, 286px);
    gap: 10px;
    padding: 10px;
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  :global(.native-ios .recent-relay-action) {
    min-height: 40px;
    padding: 0 10px;
    font-size: 14px;
    line-height: 1.15;
  }
}

.command-refresh {
  min-height: 2.2rem;
  padding: 0 0.8rem;
  border-radius: 7px;
  color: var(--text-primary);
  background: var(--bg-table-header);
  font-size: 0.82rem;
  font-weight: 700;
}

.active-contact-controls {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-wrap: wrap;
  margin-top: auto;
  padding-top: 1rem;
}

.active-contact-controls .command-address {
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  background: color-mix(in srgb, var(--bg-card) 82%, transparent);
}

.active-contact-controls .command-address.external {
  border-color: color-mix(in srgb, var(--color-warning) 55%, var(--border-light));
  color: var(--color-warning);
  background: var(--surface-warning);
}

.external-access-warning {
  color: var(--color-warning);
  font-size: 0.66rem;
  font-weight: 650;
  line-height: 1.2;
  opacity: 0.9;
}

.dashboard-grid {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(310px, 0.8fr);
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.75rem;
  padding: 0.75rem;
  overflow: hidden;
}

.active-contact-card,
.previous-card,
.server-card,
.live-panel {
  min-width: 0;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
  box-shadow: none;
}

.active-contact-card {
  padding: 1rem;
  background: linear-gradient(135deg, var(--surface-accent), transparent 48%), var(--bg-card);
}

.section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  color: var(--text-tertiary);
  font-size: 0.78rem;
}

.active-contact-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 148px;
  gap: 1.1rem;
  align-items: start;
  margin-top: 0.75rem;
}

.callsign-wrap {
  display: flex;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 0.5rem;
  min-width: 0;
}

.active-contact-primary h1,
.active-contact-primary h2 {
  font-size: clamp(3rem, 6vw, 5rem);
  overflow-wrap: anywhere;
}

:global(html[lang='en']) .active-contact-card.idle .callsign-wrap {
  flex-wrap: nowrap;
}

:global(html[lang='en']) .active-contact-card.idle .active-contact-primary h1,
:global(html[lang='en']) .active-contact-card.idle .active-contact-primary h2 {
  display: block;
  max-width: 100%;
  overflow: hidden;
  line-height: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-square {
  margin-bottom: 0.45rem;
  color: var(--text-tertiary);
  font-size: 0.78rem;
  font-weight: 750;
}

.contact-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.8rem;
}

.contact-tags span {
  min-height: 1.75rem;
  padding: 0.25rem 0.65rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-secondary);
  background: color-mix(in srgb, var(--bg-table-stripe) 75%, transparent);
  font-size: 0.78rem;
}

.bearing-panel {
  min-width: 0;
  min-height: 148px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 0.45rem;
  padding: 0.7rem;
  background: rgba(0, 0, 0, 0.08);
}

.bearing-panel .compass {
  width: 78px;
  height: 78px;
}

.bearing-meta {
  text-align: center;
}

.bearing-meta strong,
.bearing-meta span {
  display: block;
  white-space: normal;
}

:global(html[lang='en']) .bearing-meta strong,
:global(html[lang='en']) .bearing-meta span {
  overflow: hidden;
  max-width: 100%;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.contact-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
  margin-top: 1rem;
}

.contact-details > div,
.contact-detail-card {
  min-height: 4rem;
  padding: 0.65rem 0.8rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.06);
}

.contact-detail-card {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.relay-detail-card:hover {
  border-color: var(--color-primary);
  background: var(--surface-primary);
}

.frequency-detail-card {
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.frequency-detail-card:hover {
  border-color: var(--color-primary);
  background: var(--surface-accent);
}

.contact-details span {
  display: block;
  color: var(--text-tertiary);
  font-size: 0.72rem;
}

.contact-details strong {
  display: block;
  margin-top: 0.25rem;
  color: var(--text-primary);
  font-size: 1.05rem;
  overflow-wrap: anywhere;
}

.contact-details .frequency-line {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.98rem;
  line-height: 1.25;
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: keep-all;
}

.contact-details strong small {
  margin-left: 0.35rem;
  color: var(--text-tertiary);
  font-size: 0.76rem;
  font-weight: 650;
}

.dashboard-actions {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.dashboard-actions a {
  display: grid;
  min-height: 2.55rem;
  place-items: center;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--text-primary);
  background: var(--bg-table-header);
  font-size: 0.84rem;
  font-weight: 700;
  text-decoration: none;
}

.dashboard-actions a:hover,
.dashboard-actions a.primary {
  border-color: color-mix(in srgb, var(--color-primary) 52%, var(--border-light));
  color: var(--color-primary);
  background: var(--surface-accent);
}

.mobile-previous-card {
  display: none;
}

.dashboard-side {
  min-width: 0;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 0.75rem;
}

.previous-card,
.server-card {
  padding: 0.9rem;
}

.previous-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 0.75rem;
  align-items: center;
  margin-top: 0.75rem;
}

.previous-callsign {
  color: var(--text-primary);
  font-size: clamp(1.7rem, 3vw, 2.25rem);
  line-height: 1;
  overflow-wrap: anywhere;
}

.mini-bearing {
  display: grid;
  place-items: center;
  gap: 0.25rem;
  min-height: 86px;
  padding: 0.4rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.07);
  color: var(--text-secondary);
  font-size: 0.68rem;
  text-align: center;
}

.mini-bearing .compass {
  width: 46px;
  height: 46px;
  margin-top: 0.35rem;
}

.mini-bearing .compass-arrow {
  width: 17px;
  height: 23px;
}

.server-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.server-card-header {
  width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.server-card-header:hover {
  color: var(--color-primary);
}

.server-list-trigger {
  min-height: 1.9rem;
  padding: 0.32rem 0.55rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-primary);
  background: var(--bg-table-header);
  font-size: 0.7rem;
  text-decoration: none;
}

.server-card-header:hover .server-list-trigger {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.server-list {
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-top: 0.75rem;
  overflow: auto;
}

.server-list button {
  position: relative;
  display: grid;
  min-height: 2.75rem;
  place-items: center;
  padding: 0.45rem;
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--bg-table-stripe);
  font-size: 0.78rem;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.server-list button.pinned {
  padding-right: 2.9rem;
}

.station-name {
  max-width: 100%;
}

.station-pin {
  position: absolute;
  top: 0.3rem;
  right: 0.3rem;
  padding: 0.1rem 0.25rem;
  border-radius: 4px;
  color: var(--color-warning);
  background: var(--surface-warning);
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.2;
}

.server-list button.active {
  border-color: var(--color-success);
  color: var(--color-success);
  background: var(--surface-success);
}

.side-empty {
  display: grid;
  min-height: 4.5rem;
  place-items: center;
  color: var(--text-tertiary);
  font-size: 0.8rem;
}

.dashboard-grid > .live-panel {
  grid-column: 1 / -1;
  min-height: 0;
  margin: 0;
}

.live-table {
  border-collapse: separate;
  border-spacing: 0 0.2rem;
  padding: 0 0.45rem 0.3rem;
}

.live-table th,
.live-table td {
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-table-stripe);
}

.live-table th {
  border-bottom: 0;
  background: var(--bg-card);
}

.live-table td:first-child {
  border-left: 1px solid var(--border-light);
  border-radius: 7px 0 0 7px;
}

.live-table td:last-child {
  border-right: 1px solid var(--border-light);
  border-radius: 0 7px 7px 0;
}

@media (min-width: 769px) {
  .dashboard-view {
    height: auto;
    min-height: auto;
    overflow: visible;
  }

  .dashboard-grid {
    flex: none;
    grid-template-rows: auto auto;
    min-height: auto;
    overflow: visible;
  }

  .dashboard-grid > .live-panel {
    min-height: auto;
  }

  .server-list {
    flex: none;
    max-height: calc(3 * 3.35rem + 1rem);
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
  }

  .server-list button {
    min-height: 3.35rem;
  }

  .dashboard-grid > .live-panel,
  .live-panel,
  .live-table-wrap {
    height: auto;
    min-height: 0;
    overflow-y: visible;
  }

  .live-table-wrap {
    flex: none;
  }
}

@media (max-width: 900px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto minmax(0, 1fr);
    overflow-y: auto;
  }

  .dashboard-side {
    grid-template-columns: 1fr 1fr;
    grid-template-rows: auto;
  }

  .dashboard-grid > .live-panel {
    grid-column: 1;
    min-height: 20rem;
  }
}

@media (min-width: 769px) and (max-width: 1180px) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
  }

  .active-contact-primary h1,
  .active-contact-primary h2 {
    font-size: clamp(2.7rem, 5.2vw, 4.2rem);
  }

  .active-contact-main {
    grid-template-columns: minmax(0, 1fr) 128px;
  }

  .bearing-panel {
    min-height: 128px;
  }

  .bearing-panel .compass {
    width: 68px;
    height: 68px;
  }
}

@media (min-width: 769px) and (max-width: 1000px) {
  .dashboard-command-bar {
    gap: 0.45rem;
    padding-inline: 0.55rem;
  }

  .dashboard-brand,
  .connection-strip,
  .command-stats,
  .command-tools {
    gap: 0.35rem;
  }

  .dashboard-brand strong,
  .connection-copy strong {
    font-size: 0.88rem;
  }

  .command-stats span {
    font-size: 0.72rem;
  }

  .command-tool-wide {
    padding: 0 0.45rem;
  }

  .command-select {
    width: 6.8rem;
  }
}

@media (max-width: 768px) {
  .dashboard-view {
    min-height: 100%;
    padding-bottom: calc(0.5rem + var(--safe-inset-bottom, env(safe-area-inset-bottom, 0px)));
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .dashboard-command-bar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 0.45rem;
    min-height: 3.65rem;
    padding: 0.5rem 0.65rem;
    position: sticky;
    top: 0;
    z-index: 5;
    background: color-mix(in srgb, var(--bg-card) 96%, transparent);
  }

  .dashboard-brand {
    display: flex;
    min-width: max-content;
  }

  .dashboard-brand strong {
    display: block;
    max-width: 7.5rem;
    overflow: hidden;
    font-size: 0.9rem;
    text-overflow: ellipsis;
  }

  .mobile-command-stats {
    display: flex;
    gap: 0.38rem;
    margin-left: 0.1rem;
  }

  .mobile-command-stats span {
    gap: 0.18rem;
    font-size: 0.7rem;
  }

  .mobile-command-stats .stat-icon {
    font-size: 0.72rem;
    line-height: 1;
  }

  .mobile-command-stats small {
    color: var(--text-tertiary);
    font-size: 0.68rem;
    font-weight: 750;
  }

  .dashboard-brand-mark {
    width: 2.35rem;
    height: 2.35rem;
  }

  .connection-strip {
    display: none;
  }

  .command-stats,
  .command-address {
    display: none;
  }

  .command-tools {
    display: flex;
    flex-shrink: 0;
    gap: 0.35rem;
  }

  .command-tools :deep(.public-tool-btn),
  .command-tools :deep(.download-tool-btn) {
    display: none;
  }

  .command-select-wrap {
    display: inline-flex;
    width: 7.1rem;
    height: 2.25rem;
    min-width: 0;
    flex-shrink: 0;
    padding: 0 0.3rem 0 0.48rem;
  }

  .command-select-wrap .tool-icon {
    font-size: 0.72rem;
  }

  .command-select {
    width: 100%;
    min-width: 0;
    font-size: 0.7rem;
  }

  .command-tool-wide {
    width: 2.25rem;
    padding: 0;
  }

  .command-tool-wide span:last-child {
    display: none;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto;
    padding: 0.5rem;
    gap: 0.5rem;
    overflow: visible;
  }

  .active-contact-card,
  .previous-card,
  .server-card {
    padding: 0.75rem;
  }

  .active-contact-main {
    grid-template-columns: minmax(0, 1fr) 104px;
    gap: 0.65rem;
    align-items: stretch;
  }

  .active-contact-primary h1,
  .active-contact-primary h2 {
    font-size: clamp(2rem, 10vw, 2.85rem);
    line-height: 1.02;
  }

  .bearing-panel {
    min-height: 104px;
    padding: 0.45rem;
  }

  .bearing-panel .compass {
    width: 52px;
    height: 52px;
  }

  .bearing-meta strong {
    font-size: 0.75rem;
  }

  .bearing-meta span {
    font-size: 0.64rem;
  }

  .contact-details {
    grid-template-columns: 1fr;
    margin-top: 0.7rem;
    gap: 0.45rem;
  }

  .contact-details > div,
  .contact-detail-card {
    min-height: 3.3rem;
    padding: 0.5rem 0.6rem;
  }

  .frequency-detail-card {
    border-color: color-mix(in srgb, var(--color-primary) 62%, var(--border-light));
    background: color-mix(in srgb, var(--surface-accent) 58%, transparent);
  }

  .contact-details strong {
    font-size: 0.85rem;
  }

  .contact-details .frequency-line {
    font-size: clamp(0.72rem, 3vw, 0.84rem);
  }

  .dashboard-actions {
    display: none;
  }

  .server-card {
    display: none;
  }

  .dashboard-side {
    display: none;
  }

  .previous-main {
    grid-template-columns: 1fr;
  }

  .previous-card {
    display: none;
  }

  .mobile-previous-card {
    display: grid;
    gap: 0.45rem;
    margin-top: 0.65rem;
    padding: 0.6rem;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg-table-stripe) 72%, transparent);
  }

  .mobile-previous-main {
    display: grid;
    gap: 0.35rem;
  }

  .mobile-previous-identity {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
    min-width: 0;
  }

  .mobile-previous-identity strong {
    overflow: hidden;
    color: var(--text-primary);
    font-size: 1.25rem;
    line-height: 1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .mobile-previous-identity span {
    color: var(--text-tertiary);
    font-size: 0.76rem;
    font-weight: 750;
    white-space: nowrap;
  }

  .mobile-previous-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.32rem;
  }

  .mobile-previous-meta span,
  .mobile-previous-empty {
    min-height: 1.45rem;
    padding: 0.18rem 0.45rem;
    border: 1px solid var(--border-light);
    border-radius: 6px;
    color: var(--text-secondary);
    background: color-mix(in srgb, var(--bg-card) 72%, transparent);
    font-size: 0.68rem;
    line-height: 1.25;
  }

  .mini-bearing {
    display: none;
  }

  .live-table {
    min-width: 560px;
  }

  .live-table-wrap {
    max-height: 58vh;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
  }

  .live-table th:nth-child(4),
  .live-table td:nth-child(4),
  .live-table th:nth-child(5),
  .live-table td:nth-child(5) {
    display: none;
  }

  .time-cell {
    width: 92px;
  }

  .qth-cell {
    width: 150px;
  }

  .relay-cell {
    width: 122px;
  }
}

@media (orientation: portrait) and (max-width: 1024px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto auto;
    overflow-y: auto;
  }

  .dashboard-side {
    grid-template-columns: 1fr;
    grid-template-rows: auto;
  }

  .dashboard-grid > .live-panel {
    grid-column: 1;
  }

  .server-card {
    display: none;
  }
}

@media (max-width: 430px) {
  .connection-copy strong {
    font-size: 0.88rem;
  }

  .dashboard-command-bar {
    min-height: 3.35rem;
    padding: 0.45rem 0.55rem;
  }

  .dashboard-brand {
    gap: 0.45rem;
  }

  .dashboard-brand strong {
    display: none;
  }

  .mobile-command-stats {
    gap: 0.32rem;
    margin-left: 0;
  }

  .mobile-command-stats span {
    font-size: 0.68rem;
  }

  .mobile-command-stats .stat-icon {
    font-size: 0.68rem;
  }

  .mobile-command-stats small {
    font-size: 0.66rem;
  }

  .dashboard-brand-mark,
  .command-tool {
    width: 2.05rem;
    height: 2.05rem;
  }

  .command-tools {
    gap: 0.25rem;
  }

  .recent-relay-switcher {
    width: min(100%, 19.5rem);
    gap: 0.6rem;
    padding: 0.58rem;
  }

  .recent-relay-action {
    min-height: 2.75rem;
    font-size: 0.9rem;
  }

  .command-select-wrap {
    width: 6.45rem;
    height: 2.05rem;
    padding-left: 0.4rem;
  }

  .command-select {
    font-size: 0.66rem;
  }

  .active-contact-card,
  .previous-card,
  .server-card {
    padding: 0.65rem;
  }

  .active-contact-main {
    grid-template-columns: minmax(0, 1fr) 92px;
    gap: 0.5rem;
  }

  .active-contact-primary h1,
  .active-contact-primary h2 {
    font-size: clamp(1.85rem, 11vw, 2.55rem);
  }

  .contact-tags {
    gap: 0.35rem;
    margin-top: 0.55rem;
  }

  .contact-tags span {
    min-height: 1.55rem;
    padding: 0.18rem 0.45rem;
    font-size: 0.7rem;
  }

  .bearing-panel {
    min-height: 92px;
  }

  .bearing-panel .compass {
    width: 44px;
    height: 44px;
  }

  .dashboard-actions {
    display: none;
  }

  .dashboard-actions a {
    min-height: 2.1rem;
    font-size: 0.7rem;
  }

  .server-list {
    max-height: 11.5rem;
  }

  .live-table {
    min-width: 520px;
  }
}

@media (max-width: 768px) and (orientation: landscape) {
  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr) minmax(240px, 0.62fr);
    grid-template-rows: auto auto;
    align-items: start;
  }

  .active-contact-card {
    grid-column: 1 / -1;
  }

  .active-contact-main {
    grid-template-columns: minmax(0, 1fr) 118px;
  }

  .contact-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .mobile-previous-main {
    grid-template-columns: minmax(0, 0.52fr) minmax(0, 1fr);
    align-items: center;
  }

  .live-panel {
    grid-column: 1 / -1;
  }

  .live-table-wrap {
    max-height: 54vh;
  }
}

@media (max-height: 520px) and (max-width: 950px) and (orientation: landscape) {
  .dashboard-view {
    height: auto;
    min-height: auto;
    gap: 0.22rem;
    overflow: visible;
    padding-bottom: 2.55rem;
  }

  .dashboard-command-bar {
    grid-template-columns: auto minmax(0, 1fr) auto;
    min-height: 2.42rem;
    padding: 0.22rem 0.38rem;
  }

  .dashboard-brand strong {
    display: block;
    max-width: 6.4rem;
    overflow: hidden;
    font-size: 0.82rem;
    text-overflow: ellipsis;
  }

  .dashboard-brand-mark {
    width: 1.72rem;
    height: 1.72rem;
  }

  .connection-strip,
  .command-stats,
  .command-tools :deep(.public-tool-btn),
  .command-tools :deep(.download-tool-btn) {
    display: none;
  }

  .command-tool-wide {
    width: 1.76rem;
    height: 1.76rem;
    padding: 0;
  }

  .command-tool-wide span:last-child {
    display: none;
  }

  .command-select-wrap {
    width: 6.1rem;
    height: 1.76rem;
    padding-left: 0.38rem;
  }

  .command-select {
    font-size: 0.64rem;
  }

  .command-tool {
    width: 1.76rem;
    height: 1.76rem;
  }

  .dashboard-grid {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 0.25rem;
    padding: 0.25rem;
    overflow: visible;
  }

  .active-contact-card {
    padding: 0.38rem;
  }

  .section-label {
    margin-bottom: 0.2rem;
    font-size: 0.62rem;
    line-height: 1.1;
  }

  .active-contact-main {
    grid-template-columns: minmax(0, 1fr) 84px;
    gap: 0.32rem;
  }

  .active-contact-primary {
    grid-template-columns: minmax(0, max-content) auto;
    grid-template-rows: auto minmax(0.25rem, 1fr) auto;
    min-height: 92px;
    align-content: stretch;
    align-items: end;
    column-gap: 0.28rem;
    row-gap: 0.12rem;
  }

  .active-contact-primary .callsign-wrap {
    grid-row: 1;
    grid-column: 1 / -1;
    align-self: start;
  }

  .active-contact-primary h1,
  .active-contact-primary h2 {
    font-size: clamp(56px, 15vw, 84px);
    line-height: 0.9;
  }

  .contact-tags {
    grid-row: 3;
    grid-column: 1;
    justify-self: start;
    gap: 0.2rem;
    margin-top: 0;
  }

  .contact-tags span {
    min-height: 1.08rem;
    padding: 0.08rem 0.28rem;
    font-size: 0.58rem;
    line-height: 1.12;
  }

  .active-contact-controls {
    grid-row: 3;
    grid-column: 2;
    align-self: start;
    justify-self: start;
    margin-top: 0;
    padding-top: 0;
  }

  .command-refresh {
    min-height: 1.72rem;
    padding: 0.12rem 0.45rem;
    font-size: 0.62rem;
  }

  .bearing-panel {
    min-height: 72px;
    padding: 0.28rem;
    gap: 0.24rem;
  }

  .bearing-panel .compass {
    width: 34px;
    height: 34px;
  }

  .bearing-meta strong {
    font-size: 0.62rem;
  }

  .bearing-meta span {
    font-size: 0.52rem;
  }

  .contact-details {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.24rem;
    margin-top: 0.25rem;
  }

  .contact-detail-card {
    min-height: 2.04rem;
    padding: 0.24rem 0.38rem;
  }

  .contact-details span {
    font-size: 0.56rem;
  }

  .contact-details strong {
    margin-top: 0.12rem;
    font-size: 0.68rem;
  }

  .contact-details .frequency-line {
    font-size: clamp(0.62rem, 2.2vw, 0.72rem);
  }

  .dashboard-actions,
  .dashboard-side,
  .previous-card,
  .server-card {
    display: none;
  }

  .mobile-previous-card {
    display: grid;
    gap: 0.18rem;
    margin-top: 0.24rem;
    padding: 0.3rem 0.34rem;
    border: 1px solid var(--border-light);
    border-radius: 8px;
    background: color-mix(in srgb, var(--bg-table-stripe) 72%, transparent);
  }

  .mobile-previous-main {
    grid-template-columns: minmax(0, 0.4fr) minmax(0, 1fr);
    align-items: center;
    gap: 0.28rem;
  }

  .mobile-previous-identity strong {
    font-size: 0.92rem;
  }

  .mobile-previous-identity span {
    font-size: 0.56rem;
  }

  .mobile-previous-meta {
    gap: 0.18rem;
    overflow: hidden;
  }

  .mobile-previous-meta span,
  .mobile-previous-empty {
    min-height: 1.04rem;
    padding: 0.08rem 0.28rem;
    font-size: 0.56rem;
    line-height: 1.1;
  }

  .live-panel {
    grid-column: 1;
    min-height: 12rem;
  }

  .live-table-wrap {
    max-height: none;
    overflow: auto;
  }
}
</style>
