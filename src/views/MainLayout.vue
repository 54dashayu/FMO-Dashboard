<template>
  <div class="container" :class="{ 'dashboard-route': route.name === 'dashboard' }">
    <!-- 标题栏（含桌面端导航） -->
    <AppHeader
      :today-logs="todayLogs"
      :total-logs="totalLogs"
      :unique-callsigns="uniqueCallsigns"
      :current-speaker="speakingStatus.currentSpeaker.value"
      :own-callsign="ownCallsign"
      :selected-from-callsign="selectedFromCallsign"
      :voice-mode="dashboardVoiceMode"
      @update-voice-mode="handleUpdateDashboardVoiceMode"
    />

    <!-- 发言状态条 -->
    <SpeakingBar
      :current-speaker="speakingStatus.currentSpeaker.value"
      :current-speaker-address="speakingStatus.currentSpeakerAddress.value"
      :speaking-history="speakingStatus.speakingHistory.value"
      :fmo-address="settings.fmoAddress.value"
      :events-connected="speakingStatus.eventsConnected.value"
      :selected-from-callsign="selectedFromCallsign"
      :all-speaking-histories="speakingStatus.allSpeakingHistories.value"
      :all-current-speakers="speakingStatus.allCurrentSpeakers.value"
      :address-list="settings.addressList.value"
      :multi-select-mode="settings.multiSelectMode.value"
      :active-address-id="settings.activeAddressId.value"
      :is-audio-playing="dashboardVoiceMode !== 'off'"
      :is-audio-muted="isAudioMuted"
      :today-contacted-callsigns="settings.todayContactedCallsigns.value"
      :contact-counts="settings.contactCounts.value"
      :voice-mode="dashboardVoiceMode"
      @click="showSpeakingHistory = true"
      @toggle-audio="handleToggleAudio"
      @update-voice-mode="handleUpdateDashboardVoiceMode"
    />

    <!-- 下拉刷新指示器（触摸设备，在 content-area 上方） -->
    <div
      v-if="supportsPullToRefresh"
      class="pull-refresh-indicator"
      :style="{ height: pullDistance + 'px', opacity: Math.min(pullDistance / PULL_THRESHOLD, 1) }"
    >
      <span class="refresh-icon" :class="{ spinning: isRefreshing }">↻</span>
      <span class="refresh-text">{{
        isRefreshing
          ? t('common.refreshing', '刷新中...')
          : pullDistance >= PULL_THRESHOLD
            ? t('common.releaseToRefresh', '松开刷新')
            : t('common.pullToRefresh', '下拉刷新')
      }}</span>
    </div>

    <!-- 路由视图 -->
    <div
      ref="contentAreaRef"
      class="content-area"
      :class="{ 'pull-snapping': !isPullTracking && !isRefreshing }"
      :style="supportsPullToRefresh ? { transform: `translateY(${pullDistance}px)` } : {}"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
    >
      <div class="route-frame">
        <router-view v-slot="{ Component }">
          <component
            :is="Component"
            :db-loaded="dbLoaded"
            :selected-from-callsign="selectedFromCallsign"
            :own-callsign="ownCallsign"
            :loading="loading || dataQuery.loading.value"
            :error="error || dataQuery.error.value"
            :import-progress="importProgress"
            :fmo-sync-message="fmoSync.autoSyncMessage.value"
            :data-query="dataQuery"
            :callsign-records="callsignRecords"
            :active-address-id="settings.activeAddressId.value"
            :address-list="settings.addressList.value"
            :fmo-address="settings.fmoAddress.value"
            :protocol="settings.protocol.value"
            :syncing="fmoSync.syncing.value"
            :sync-status="fmoSync.syncStatus.value"
            :multi-select-mode="settings.multiSelectMode.value"
            :selected-address-ids="settings.selectedAddressIds.value"
            :multi-sync-progress="fmoSync.multiSyncProgress.value"
            :audio-volume="settings.audioVolume.value"
            :contact-counts="settings.contactCounts.value"
            :today-contacted-callsigns="settings.todayContactedCallsigns.value"
            :total-logs="totalLogs"
            :today-logs="todayLogs"
            :unique-callsigns="uniqueCallsigns"
            :voice-mode="dashboardVoiceMode"
            :station-connected="speakingStatus.primaryConnected.value"
            :station-busy="stationBusy"
            @update-dashboard-voice-mode="handleUpdateDashboardVoiceMode"
            @execute-query="executeQuery"
            @show-callsign-records="handleShowCallsignRecords"
            @select-files="triggerFileInput"
            @export-data="handleExportData"
            @export-adif="handleExportAdif"
            @export-fmo-backup="handleExportFmoBackup"
            @convert-adif-to-fmo="triggerAdifConvertInput"
            @sync-days="handleSyncDays"
            @sync-incremental="handleSyncIncremental"
            @sync-full="handleSyncFull"
            @clear-all-data="handleClearAllData"
            @update:multi-select-mode="handleSetMultiSelectMode"
            @toggle-address-selection="handleToggleAddressSelection"
            @sync-multiple="handleSyncMultiple"
            @add-address="handleAddAddress"
            @update-address="handleUpdateAddress"
            @delete-address="handleDeleteAddress"
            @select-address="handleSelectAddress"
            @clear-all-addresses="handleClearAllAddresses"
            @refresh-user-info="handleRefreshUserInfo"
            @validate-and-select="handleValidateAndSelect"
            @update-audio-volume="handleUpdateAudioVolume"
            @open-station-list="handleOpenStationList"
            @station-prev="handleStationPrev"
            @station-next="handleStationNext"
          />
        </router-view>
      </div>

      <footer class="app-footer">
        <span>{{ t('footer.credit', 'FMO仪表盘 由 BH1JSS 机婶婶 贡献') }}</span>
        <span class="footer-share-line">
          {{ t('footer.openSource', '开源项目') }}
          <a
            href="https://github.com/54dashayu/FMO-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('footer.githubLabel', 'GitHub 项目主页')"
            :title="t('footer.githubLabel', 'GitHub 项目主页')"
            @click="handleExternalLinkClick($event, 'https://github.com/54dashayu/FMO-Dashboard')"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.68c-2.78.6-3.37-1.18-3.37-1.18-.45-1.15-1.1-1.45-1.1-1.45-.9-.62.07-.6.07-.6 1 .07 1.52 1.03 1.52 1.03.88 1.5 2.31 1.07 2.87.82.09-.64.35-1.07.63-1.32-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.57 9.57 0 0 1 12 6.98c.85 0 1.7.11 2.5.34 1.9-1.29 2.74-1.02 2.74-1.02.55 1.37.2 2.39.1 2.64.64.7 1.02 1.59 1.02 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.86v2.76c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"
              />
            </svg>
          </a>
          {{ t('footer.share', '欢迎分享') }}
        </span>
      </footer>

      <!-- 回到顶部按钮（仅移动端显示） -->
      <transition name="fade">
        <button v-show="showBackToTop" class="back-to-top-btn" @click="scrollToTop">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        </button>
      </transition>
    </div>

    <!-- 通联记录弹框 -->
    <CallsignRecordsModal
      :visible="callsignRecords.showCallsignModal.value"
      :callsign="callsignRecords.currentCallsign.value"
      :records="callsignRecords.callsignRecords.value"
      :highlight-timestamp="callsignRecords.highlightTimestamp.value"
      :fmo-address="settings.fmoAddress.value"
      :protocol="settings.protocol.value"
      @close="callsignRecords.closeCallsignModal()"
    />

    <!-- 隐藏的文件输入 -->
    <input
      id="db-file-input"
      ref="fileInputRef"
      type="file"
      accept=".zip"
      class="hidden-input"
      @change="handleFileSelect"
    />
    <input
      id="adif-convert-file-input"
      ref="adifConvertInputRef"
      type="file"
      accept=".adi,.adif"
      multiple
      class="hidden-input"
      @change="handleAdifConvertFileSelect"
    />

    <!-- 发言历史弹框 -->
    <SpeakingHistoryModal
      :visible="showSpeakingHistory"
      :history="speakingStatus.speakingHistory.value"
      :today-contacted-callsigns="settings.todayContactedCallsigns.value"
      :station-connected="speakingStatus.primaryConnected.value"
      :current-station="speakingStatus.primaryServerInfo.value"
      :station-busy="stationBusy"
      :selected-from-callsign="selectedFromCallsign"
      :all-speaking-histories="speakingStatus.allSpeakingHistories.value"
      :all-current-speakers="speakingStatus.allCurrentSpeakers.value"
      :address-list="settings.addressList.value"
      :multi-select-mode="settings.multiSelectMode.value"
      :active-address-id="settings.activeAddressId.value"
      :contact-counts="settings.contactCounts.value"
      @close="showSpeakingHistory = false"
      @show-callsign-records="handleShowCallsignRecords"
      @station-prev="handleStationPrev"
      @station-next="handleStationNext"
      @station-open-list="handleOpenStationList"
    />

    <!-- 服务器列表弹框 -->
    <StationListModal
      :visible="showStationList"
      :station-list="stationList"
      :current-station="speakingStatus.primaryServerInfo.value"
      :loading="stationListLoading"
      :show-primary-badge="settings.multiSelectMode.value"
      :favorite-busy-uid="stationFavoriteBusyUid"
      @close="handleCloseStationList"
      @select="handleStationSelect"
      @favorite="handleStationFavorite"
      @refresh="handleRefreshStationList"
    />

    <!-- 快捷导航弹框 -->
    <QuickNavModal :visible="showQuickNav" :db-loaded="dbLoaded" @close="showQuickNav = false" />

    <!-- 底部导航栏（手机端显示） -->
    <nav class="query-nav mobile-nav">
      <router-link v-for="route in NAV_ROUTES" :key="route.path" :to="route.path" class="nav-tab">
        <SvgIcon :name="route.icon" :size="22" class="nav-icon" />
        <span class="nav-label">{{ routeLabel(route) }}</span>
        <span
          v-if="route.type === 'messages' && hasUnreadMessages"
          class="mobile-unread-badge"
        ></span>
      </router-link>
    </nav>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, provide } from 'vue'
import { useRoute, useRouter } from 'vue-router'

// 组件
import AppHeader from '../components/home/AppHeader.vue'
import SpeakingBar from '../components/home/SpeakingBar.vue'
import CallsignRecordsModal from '../components/home/modals/CallsignRecordsModal.vue'

import SpeakingHistoryModal from '../components/home/modals/SpeakingHistoryModal.vue'
import StationListModal from '../components/home/modals/StationListModal.vue'
import QuickNavModal from '../components/home/modals/QuickNavModal.vue'
import SvgIcon from '../components/common/SvgIcon.vue'

// Composables
import { storeToRefs } from 'pinia'
import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { useSpeakingStatusStore } from '../stores/speakingStore'
import { useSyncStore } from '../stores/syncStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useAudioPlayerStore } from '../stores/audioPlayerStore'
import { useDataQuery, useCallsignRecords } from '../composables/useDataQuery'
import { useDbManager } from '../composables/useDbManager'
import {
  useModalBackHandler,
  registerModal,
  countOpenModals,
  closeTopModal
} from '../composables/useModalBackHandler'
import toast from '../composables/useToast'
import confirmDialog from '../composables/useConfirm'
import { useLocale } from '../composables/useLocale'
import {
  exportDataToDbFile,
  exportDataToAdif,
  exportDataToFmoBackupZip,
  convertAdifFilesToFmoBackupZip
} from '../services/db'
import { FmoApiClient } from '../services/fmoApi'
import { normalizeHost } from '../utils/urlUtils'
import {
  isTauriDesktop,
  pickFmoBackupZipFile,
  pickAdifFiles,
  handleExternalLinkClick
} from '../utils/desktopBridge'
import { NAV_ROUTES } from '../components/home/constants'
import { getMessageService } from '../services/messageService'
import packageInfo from '../../package.json'

// 路由
const route = useRoute()
const router = useRouter()
const appVersion = packageInfo.version
const { isEnglish, t } = useLocale()

function routeLabel(item) {
  return isEnglish.value ? t(`nav.${item.type}`, item.label) : item.label
}

// UI 状态
const showSpeakingHistory = ref(false)
const fileInputRef = ref(null)
const adifConvertInputRef = ref(null)
const contentAreaRef = ref(null)
const showBackToTop = ref(false)
let scrollTimer = null

// 快捷导航弹框状态
const showQuickNav = ref(false)

// 服务器列表弹框状态
const showStationList = ref(false)
function normalizeDashboardVoiceMode(mode) {
  if (mode === 'beep' || mode === 'full') return 'alert'
  if (mode === 'after') return 'radio'
  return ['alert', 'radio', 'off'].includes(mode) ? mode : 'radio'
}
const DEFAULT_DASHBOARD_VOICE_MODE = 'radio'
localStorage.setItem('fmo_dashboard_voice_mode', DEFAULT_DASHBOARD_VOICE_MODE)
const dashboardVoiceMode = ref(DEFAULT_DASHBOARD_VOICE_MODE)
const USAGE_STATS_HOSTS = new Set(['fmo.bh1jss.net', 'fmolog.bh1jss.net'])
const USAGE_STATS_INTERVAL_MS = 30 * 60 * 1000
const USAGE_STATS_KEY = 'fmo_usage_stats_last_sent'

// 下拉刷新状态（触摸设备，包括原生 App 和手机浏览器）
const supportsPullToRefresh = 'ontouchstart' in window
const isRefreshing = ref(false)
const pullDistance = ref(0)
const PULL_THRESHOLD = 80
let pullTouchStartY = 0
let pullTouchCurrentY = 0
let isPullTracking = false

// 判断触摸目标是否为 range 滑块（避免与下拉刷新冲突）
function isRangeSliderTarget(target) {
  if (!target) return false
  // 检查当前节点及其祖先节点（最多向上查找5层，避免性能问题）
  let el = target
  let depth = 0
  while (el && depth < 5) {
    if (el.tagName === 'INPUT' && el.type === 'range') return true
    el = el.parentElement
    depth++
  }
  return false
}

function sendUsageStatsBeacon(reason = 'init', options = {}) {
  if (!USAGE_STATS_HOSTS.has(window.location.hostname)) return

  const activeAddress = settings.activeAddress.value
  const callsign = activeAddress?.userInfo?.callsign || selectedFromCallsign.value || ''
  if (!callsign && !settings.fmoAddress.value) return

  const now = Date.now()
  const statsIdentity = callsign || 'anonymous'
  const lastKey = `${USAGE_STATS_KEY}:${activeAddress?.id || settings.fmoAddress.value || 'unknown'}:${statsIdentity}`
  const lastSent = Number(localStorage.getItem(lastKey) || 0)
  if (!options.force && now - lastSent < USAGE_STATS_INTERVAL_MS) return
  localStorage.setItem(lastKey, String(now))

  const params = new window.URLSearchParams({
    callsign: callsign || '-',
    fmo: settings.fmoAddress.value ? normalizeHost(settings.fmoAddress.value) : '-',
    protocol: settings.protocol.value || '-',
    uid: activeAddress?.userInfo?.uid ? String(activeAddress.userInfo.uid) : '-',
    version: appVersion,
    reason
  })

  const url = `/__fmo_stats.gif?${params.toString()}`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url)
  } else {
    window.fetch(url, { method: 'GET', keepalive: true }).catch(() => {})
  }
}

function handleTouchStart(e) {
  if (isRefreshing.value) return
  // 仅当内容区滚动到顶部时触发
  if (contentAreaRef.value?.scrollTop > 0) return
  // 如果触摸目标是 range 滑块，跳过下拉刷新，让滑块正常响应
  if (isRangeSliderTarget(e.target)) return
  pullTouchStartY = e.touches[0].clientY
  pullTouchCurrentY = pullTouchStartY
  isPullTracking = true
}

function handleTouchMove(e) {
  if (!isPullTracking || isRefreshing.value) return
  pullTouchCurrentY = e.touches[0].clientY
  const dist = pullTouchCurrentY - pullTouchStartY
  if (dist > 0) {
    pullDistance.value = Math.min(dist * 0.4, 140)
  }
}

function handleTouchEnd() {
  if (!isPullTracking) return
  isPullTracking = false

  if (pullDistance.value >= PULL_THRESHOLD) {
    doPullRefresh()
  } else {
    pullDistance.value = 0
  }
}

async function doPullRefresh() {
  isRefreshing.value = true
  // 保持指示器在阈值高度，确保用户能看到刷新动画
  pullDistance.value = PULL_THRESHOLD

  // 记住刷新前的音频播放状态
  const wasAudioPlaying = isAudioPlaying.value

  try {
    // 停止音频
    if (wasAudioPlaying) stopAudio()

    // 断开所有连接
    messageService.disconnect()
    speakingStatus.disconnectAllEventWs()
    fmoSync.stopAutoSyncTask()

    // 短暂等待确保断开完成
    await new Promise((r) => setTimeout(r, 300))

    // 重新连接
    connectEventsWebSocket()
    speakingStatus.setOnMessageCallback((data) => {
      messageService.handleNewMessageSummary(data)
    })

    if (settings.fmoAddress.value) {
      messageService.connect(settings.fmoAddress.value, settings.protocol.value).catch((err) => {
        console.error('消息服务连接失败:', err)
      })
      messageService.getList(settings.fmoAddress.value, settings.protocol.value, 0).catch((err) => {
        console.error('获取消息列表失败:', err)
      })
    }

    // 重新启动定时同步
    fmoSync.startAutoSyncTask(getSyncAddresses)

    // 重新查询数据
    if (dbLoaded.value) {
      await executeQuery()
      await updateStats()
    }

    // 恢复音频播放
    if (wasAudioPlaying && settings.fmoAddress.value) {
      toggleAudio(settings.fmoAddress.value, settings.protocol.value)
      if (isAudioPlaying.value && !isAudioMuted.value) {
        setAudioVolumePlayer(settings.audioVolume.value)
      }
    }

    toast.success('刷新成功')
  } catch (err) {
    console.error('刷新失败:', err)
    toast.error('刷新失败')
  } finally {
    isRefreshing.value = false
    pullDistance.value = 0
  }
}

// 从 localStorage 读取缓存的服务器列表
function getCachedStationList() {
  try {
    const cached = localStorage.getItem('stationListCache')
    if (cached) {
      const parsed = JSON.parse(cached)
      return { list: parsed.list || [], fetchedAt: parsed.fetchedAt || null }
    }
  } catch (e) {
    console.error('读取服务器列表缓存失败:', e)
  }
  return { list: [], fetchedAt: null }
}

const cachedStations = getCachedStationList()
const stationList = ref(cachedStations.list)
const stationListLoading = ref(false)
const stationListFetchedAt = ref(cachedStations.fetchedAt)
const stationFavoriteBusyUid = ref('')

// Station 状态
const stationBusy = ref(false)

// 消息未读状态
const hasUnreadMessages = computed(() => {
  return messageService.messageList.value.some((msg) => !msg.isRead)
})

// Composables
const {
  dbLoaded,
  dbCount,
  availableFromCallsigns,
  selectedFromCallsign,
  importProgress,
  loading,
  error,
  totalLogs,
  todayLogs,
  uniqueCallsigns,
  updateStats,
  tryRestoreDirectory,
  clearAllData
} = useDbManager()

// settings：内联 useSettings 薄层（store + storeToRefs）
const _settingsStore = useSettingsStore()
const _settingsRefs = storeToRefs(_settingsStore)
const settings = {
  fmoAddress: _settingsRefs.fmoAddress,
  protocol: _settingsRefs.protocol,
  todayContactedCallsigns: _settingsRefs.todayContactedCallsigns,
  remoteControlUrl: _settingsRefs.remoteControlUrl,
  addressList: _settingsRefs.addressList,
  activeAddressId: _settingsRefs.activeAddressId,
  activeAddress: _settingsRefs.activeAddress,
  contactCounts: _settingsRefs.contactCounts,
  selectedAddressIds: _settingsRefs.selectedAddressIds,
  multiSelectMode: _settingsRefs.multiSelectMode,
  audioVolume: _settingsRefs.audioVolume,
  audioPlaying: _settingsRefs.audioPlaying,
  isHttps: _settingsStore.isHttps,
  isMobileDevice: _settingsStore.isMobileDevice,
  initFmoAddress: _settingsStore.initFmoAddress,
  validateAndSaveFmoAddress: _settingsStore.validateAndSaveFmoAddress,
  loadTodayContactedCallsigns: _settingsStore.loadTodayContactedCallsigns,
  loadContactCounts: _settingsStore.loadContactCounts,
  addFmoAddress: _settingsStore.addFmoAddress,
  updateFmoAddress: _settingsStore.updateFmoAddress,
  deleteFmoAddress: _settingsStore.deleteFmoAddress,
  selectFmoAddress: _settingsStore.selectFmoAddress,
  clearAllAddresses: _settingsStore.clearAllAddresses,
  refreshUserInfo: _settingsStore.refreshUserInfo,
  validateConnection: _settingsStore.validateConnection,
  toggleAddressSelection: _settingsStore.toggleAddressSelection,
  setMultiSelectMode: _settingsStore.setMultiSelectMode,
  setActiveAddressId: _settingsStore.setActiveAddressId,
  setAudioVolume: _settingsStore.setAudioVolume,
  setAudioPlaying: _settingsStore.setAudioPlaying
}
const ownCallsign = computed(
  () => settings.activeAddress.value?.userInfo?.callsign || selectedFromCallsign.value || ''
)

// speakingStatus：内联 useSpeakingStatus 薄层
const _speakingStore = useSpeakingStatusStore()
const _speakingRefs = storeToRefs(_speakingStore)
const speakingStatus = {
  currentSpeaker: _speakingRefs.currentSpeaker,
  currentSpeakerGrid: _speakingRefs.currentSpeakerGrid,
  currentSpeakerAddress: _speakingRefs.currentSpeakerAddress,
  isHostSpeaking: _speakingRefs.isHostSpeaking,
  speakingHistory: _speakingRefs.speakingHistory,
  allSpeakingHistories: _speakingRefs.allSpeakingHistories,
  allCurrentSpeakers: _speakingRefs.allCurrentSpeakers,
  primaryAddressId: _speakingRefs.primaryAddressId,
  primaryServerInfo: _speakingRefs.primaryServerInfo,
  primaryConnected: _speakingRefs.primaryConnected,
  eventsConnected: _speakingRefs.eventsConnected,
  connectEventWs: _speakingStore.connectEventWs,
  disconnectEventWs: _speakingStore.disconnectEventWs,
  connectMultipleEventWs: _speakingStore.connectMultipleEventWs,
  disconnectAllEventWs: _speakingStore.disconnectAllEventWs,
  getSpeakingHistoryFor: _speakingStore.getSpeakingHistoryFor,
  isAddressConnected: _speakingStore.isAddressConnected,
  getServerInfo: _speakingStore.getServerInfo,
  updateServerInfo: _speakingStore.updateServerInfo,
  setOnMessageCallback: _speakingStore.setOnMessageCallback,
  clearSpeakingHistory: _speakingStore.clearSpeakingHistory
}

const dataQuery = useDataQuery()
const callsignRecords = useCallsignRecords()

// 消息服务
const messageService = getMessageService()

// 音频播放：直连 audioPlayerStore
const _audioStore = useAudioPlayerStore()
const _audioRefs = storeToRefs(_audioStore)
const isAudioPlaying = _audioRefs.isPlaying
const isAudioMuted = _audioRefs.isMuted
const toggleAudio = _audioStore.toggleAudio
const stopAudio = _audioStore.stopAudio
const setAudioVolumePlayer = _audioStore.setVolume
const resumeAudio = _audioStore.resumeAudio
const updateSpeakerInfo = _audioStore.updateSpeakerInfo
const setAudioHostMuted = _audioStore.setHostMuted

// fmoSync：内联 useFmoSync 薄层（setContext + storeToRefs + onUnmounted teardown）
const _syncStore = useSyncStore()
_syncStore.reset()
_syncStore.setContext({
  onSyncComplete: async ({ callsigns, syncedCount }) => {
    if (callsigns.length > 0) {
      availableFromCallsigns.value = callsigns
      if (!selectedFromCallsign.value) {
        selectedFromCallsign.value = callsigns[0]
      }
      dbLoaded.value = true
      dbCount.value = callsigns.length
    }
    if (syncedCount > 0) {
      // 重置老朋友页面流式加载状态，确保同步后从第1页重新加载
      dataQuery.oldFriendsPage.value = 1
      await executeQuery()
      // 更新顶部统计数据
      await updateStats()
      if (showSpeakingHistory.value) {
        await settings.loadTodayContactedCallsigns(selectedFromCallsign.value)
      }
      if (selectedFromCallsign.value) {
        await settings.loadContactCounts(selectedFromCallsign.value)
      }
      // 如果通联记录弹框正在打开，自动刷新数据
      if (callsignRecords.showCallsignModal.value) {
        await callsignRecords.loadCallsignRecords(selectedFromCallsign.value)
      }
    }
  },
  getSpeakingHistory: (addressId) => speakingStatus.getSpeakingHistoryFor(addressId),
  getSelectedFromCallsign: () => selectedFromCallsign.value,
  getDbLoaded: () => dbLoaded.value,
  getTotalLogs: () => totalLogs.value,
  getEventsConnected: (addressId) => speakingStatus.isAddressConnected(addressId)
})
const _syncRefs = storeToRefs(_syncStore)
const fmoSync = {
  syncing: _syncRefs.syncing,
  syncStatus: _syncRefs.syncStatus,
  autoSyncMessage: _syncRefs.autoSyncMessage,
  syncFailedRecords: _syncRefs.syncFailedRecords,
  multiSyncProgress: _syncRefs.multiSyncProgress,
  syncToday: _syncStore.syncToday,
  syncIncremental: _syncStore.syncIncremental,
  syncFull: _syncStore.syncFull,
  syncMultiple: _syncStore.syncMultiple,
  startAutoSyncTask: _syncStore.startAutoSyncTask,
  stopAutoSyncTask: _syncStore.stopAutoSyncTask,
  showAutoSyncMessage: _syncStore.showAutoSyncMessage
}

// 计算当前查询类型（根据路由名称映射）
const routeToQueryType = {
  logs: 'all',
  top20: 'top20Summary',
  oldFriends: 'oldFriends'
}

const currentQueryType = computed(() => {
  const routeName = route.name
  return routeToQueryType[routeName] || 'all'
})

// 同步路由变化到 dataQuery
watch(currentQueryType, (newType) => {
  if (dataQuery.currentQueryType.value !== newType) {
    dataQuery.currentQueryType.value = newType
  }
})

// 查询方法
async function executeQuery() {
  await dataQuery.executeQuery(selectedFromCallsign.value, dbLoaded.value)
}

// 呼号自动推断：根据当前激活地址的 userInfo 自动推断
function inferFromCallsign() {
  const activeAddr = settings.activeAddress.value
  const callsignFromAddr = activeAddr?.userInfo?.callsign

  if (callsignFromAddr && availableFromCallsigns.value.includes(callsignFromAddr)) {
    selectedFromCallsign.value = callsignFromAddr
  } else if (availableFromCallsigns.value.length > 0) {
    // 退回到第一个可用呼号
    selectedFromCallsign.value = availableFromCallsigns.value[0]
  }
}

// 创建临时 station client（按需连接，用完即关）
function createStationClient() {
  if (!settings.fmoAddress.value) return null
  const host = normalizeHost(settings.fmoAddress.value)
  const fullAddress = `${settings.protocol.value}://${host}`
  return new FmoApiClient(fullAddress)
}

async function handleStationPrev() {
  if (stationBusy.value) return
  const client = createStationClient()
  if (!client) return

  stationBusy.value = true
  try {
    await client.connect()
    const result = await client.prevStation()
    if (result?.result === 0) {
      const primaryId = speakingStatus.primaryAddressId.value
      if (primaryId) {
        await speakingStatus.getServerInfo(primaryId, true)
      }
    }
  } catch (err) {
    console.error('切换上一个服务器失败:', err)
  } finally {
    try {
      client.close()
    } catch (closeErr) {
      console.error('关闭客户端连接失败:', closeErr)
    }
    stationBusy.value = false
  }
}

async function handleStationNext() {
  if (stationBusy.value) return
  const client = createStationClient()
  if (!client) return

  stationBusy.value = true
  try {
    await client.connect()
    const result = await client.nextStation()
    if (result?.result === 0) {
      const primaryId = speakingStatus.primaryAddressId.value
      if (primaryId) {
        await speakingStatus.getServerInfo(primaryId, true)
      }
    }
  } catch (err) {
    console.error('切换下一个服务器失败:', err)
  } finally {
    try {
      client.close()
    } catch (closeErr) {
      console.error('关闭客户端连接失败:', closeErr)
    }
    stationBusy.value = false
  }
}

function handleOpenStationList() {
  showStationList.value = true
  const expired =
    !stationListFetchedAt.value || Date.now() - stationListFetchedAt.value > 60 * 60 * 1000
  if (expired) {
    fetchAllStations()
  }
}

function handleCloseStationList() {
  showStationList.value = false
}

async function fetchAllStations() {
  if (stationListLoading.value) return
  const client = createStationClient()
  if (!client) return
  stationListLoading.value = true
  try {
    const [list, pinnedList] = await Promise.all([
      client.getAllStations(),
      client.getAllPinnedStations()
    ])

    // 将收藏信息合并到服务器列表
    const pinnedUids = new Set(pinnedList.map((s) => s.uid))
    const mergedList = list.map((station) => ({
      ...station,
      isPinned: pinnedUids.has(station.uid)
    }))

    stationList.value = mergedList
    stationListFetchedAt.value = Date.now()
    // 写入 localStorage 缓存
    try {
      localStorage.setItem(
        'stationListCache',
        JSON.stringify({ list: stationList.value, fetchedAt: stationListFetchedAt.value })
      )
    } catch (e) {
      console.error('保存服务器列表缓存失败:', e)
    }
  } catch (e) {
    console.error('获取服务器列表失败:', e)
  } finally {
    stationListLoading.value = false
    client.close()
  }
}

function handleRefreshStationList() {
  fetchAllStations()
}

async function handleStationFavorite(station) {
  if (!station?.uid || stationFavoriteBusyUid.value) return
  const client = createStationClient()
  if (!client) return

  stationFavoriteBusyUid.value = station.uid
  try {
    await client.addPinnedStation(station.uid)
    await new Promise((resolve) => setTimeout(resolve, 700))
    const pinnedList = await client.getAllPinnedStations()
    const pinnedUids = new Set(pinnedList.map((item) => String(item.uid)))

    if (pinnedUids.has(String(station.uid))) {
      stationList.value = stationList.value.map((item) =>
        String(item.uid) === String(station.uid) ? { ...item, isPinned: true } : item
      )
      toast.success(`已收藏：${station.name}`)
    } else {
      toast.error('当前 FMO 固件没有开放远程添加收藏接口')
    }
  } catch (err) {
    toast.error(err.message || '添加 FMO 收藏失败')
  } finally {
    try {
      client.close()
    } catch (closeErr) {
      console.error('关闭客户端连接失败:', closeErr)
    }
    stationFavoriteBusyUid.value = ''
  }
}

async function handleStationSelect(uid) {
  if (stationBusy.value) return
  const client = createStationClient()
  if (!client) return

  stationBusy.value = true
  try {
    await client.connect()
    const result = await client.setCurrentStation(uid)
    if (result?.result === 0) {
      const primaryId = speakingStatus.primaryAddressId.value
      if (primaryId) {
        const selectedStation = stationList.value.find(
          (station) => String(station.uid) === String(uid)
        )
        if (selectedStation) {
          speakingStatus.updateServerInfo(primaryId, selectedStation)
        }
        await speakingStatus.getServerInfo(primaryId, true)
      }
    }
  } catch (err) {
    console.error('设置当前服务器失败:', err)
  } finally {
    try {
      client.close()
    } catch (closeErr) {
      console.error('关闭客户端连接失败:', closeErr)
    }
    stationBusy.value = false
  }
}

// 回到顶部 - 带防抖的滚动处理
function handleScroll() {
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    if (contentAreaRef.value) {
      showBackToTop.value = contentAreaRef.value.scrollTop > 200
    }
  }, 100)
}

function scrollToTop() {
  contentAreaRef.value?.scrollTo({ top: 0, behavior: 'smooth' })
}

async function handleShowCallsignRecords(payload) {
  let callsign = payload
  let timestamp = null
  if (typeof payload === 'object' && payload !== null) {
    callsign = payload.callsign
    timestamp = payload.timestamp
  }
  await callsignRecords.showCallsignRecordsModal(callsign, selectedFromCallsign.value, timestamp)
}

// 数据库操作
async function triggerFileInput() {
  if (isTauriDesktop()) {
    const file = await pickFmoBackupZipFile()
    if (!file) return
    await restoreBackupToFmo(file)
    return
  }

  fileInputRef.value?.click()
}

async function handleFileSelect(event) {
  const file = event.target.files?.[0]
  await restoreBackupToFmo(file)
  event.target.value = ''
}

function getActiveFmoHttpBaseUrl() {
  const host = settings.fmoAddress.value || settings.activeAddress.value?.host || ''
  if (!host) throw new Error('请先设置并选择 FMO 地址')

  const httpProtocol = settings.protocol.value === 'wss' ? 'https' : 'http'
  const normalizedHost = normalizeHost(host)
  if (!normalizedHost) throw new Error('请先设置并选择 FMO 地址')
  return `${httpProtocol}://${normalizedHost}`
}

async function fileLikeToBlob(file) {
  if (file instanceof Blob) return file
  const buffer = await file.arrayBuffer()
  return new Blob([buffer], { type: 'application/zip' })
}

function isNativeMobile() {
  return Capacitor.isNativePlatform() && ['android', 'ios'].includes(Capacitor.getPlatform())
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = String(reader.result || '')
      resolve(result.includes(',') ? result.split(',')[1] : result)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

async function uploadRestoreZipNative(file, url) {
  const blob = await fileLikeToBlob(file)
  const base64 = await blobToBase64(blob)
  const filename = file.name || 'fmo-backup.zip'
  const response = await CapacitorHttp.request({
    method: 'POST',
    url,
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    dataType: 'formData',
    data: [
      {
        type: 'base64File',
        key: 'file',
        value: base64,
        fileName: filename,
        contentType: 'application/zip'
      }
    ],
    connectTimeout: 10_000,
    readTimeout: 10_000
  })
  if (response.status < 200 || response.status >= 300) {
    throw new Error(`HTTP ${response.status}`)
  }
}

function submitRestoreFormInBrowser(file, url) {
  return new Promise((resolve, reject) => {
    const iframeName = `fmo-restore-target-${Date.now()}`
    const iframe = document.createElement('iframe')
    iframe.name = iframeName
    iframe.style.display = 'none'

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = url
    form.enctype = 'multipart/form-data'
    form.target = iframeName
    form.style.display = 'none'

    const input = document.createElement('input')
    input.type = 'file'
    input.name = 'file'

    const cleanup = () => {
      window.setTimeout(() => {
        form.remove()
        iframe.remove()
      }, 1000)
    }

    try {
      const transfer = new window.DataTransfer()
      transfer.items.add(file)
      input.files = transfer.files
    } catch (err) {
      cleanup()
      reject(new Error(`浏览器不允许程序化提交文件: ${err.message}`))
      return
    }

    form.appendChild(input)
    document.body.appendChild(iframe)
    document.body.appendChild(form)

    let settled = false
    iframe.addEventListener('load', () => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    })

    form.submit()

    window.setTimeout(() => {
      if (settled) return
      settled = true
      cleanup()
      resolve()
    }, 4000)
  })
}

async function restoreBackupToFmo(file) {
  if (!file) return
  if (
    !String(file.name || '')
      .toLowerCase()
      .endsWith('.zip')
  ) {
    toast.error('请选择 FMO 备份 ZIP 文件')
    return
  }

  const url = `${getActiveFmoHttpBaseUrl()}/api/qso/restore`
  const confirmed = await confirmDialog.show(
    '将备份 ZIP 导入到当前 FMO 设备后，设备可能会在 1-2 秒内重启。确定继续吗？'
  )
  if (!confirmed) return

  try {
    loading.value = true
    if (isNativeMobile()) {
      await uploadRestoreZipNative(file, url)
    } else if (!isTauriDesktop() && file instanceof window.File) {
      await submitRestoreFormInBrowser(file, url)
    } else {
      const formData = new window.FormData()
      const blob = await fileLikeToBlob(file)
      formData.append('file', blob, file.name || 'fmo-backup.zip')
      const response = await fetch(url, { method: 'POST', body: formData })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
    }
    loading.value = false
    toast.success('已提交恢复到 FMO，设备即将重启')
  } catch (err) {
    loading.value = false
    toast.error(`导入备份到FMO失败: ${err.message}`)
  }
}

async function triggerAdifConvertInput() {
  if (isTauriDesktop()) {
    const files = await pickAdifFiles()
    if (!files || files.length === 0) return
    await handleConvertAdifFiles(files)
    return
  }

  adifConvertInputRef.value?.click()
}

async function handleAdifConvertFileSelect(event) {
  await handleConvertAdifFiles(Array.from(event.target.files || []))
  event.target.value = ''
}

async function handleConvertAdifFiles(files) {
  if (!files || files.length === 0) return

  try {
    loading.value = true
    const result = await convertAdifFilesToFmoBackupZip(
      Array.from(files),
      selectedFromCallsign.value
    )
    loading.value = false
    if (result?.canceled) return
    if (result?.displayPath) {
      const message =
        result.platform === 'web'
          ? `已开始下载 ${result.displayPath}`
          : `已保存到 ${result.displayPath}`
      toast.success(message)
    } else {
      toast.success('已生成FMO备份包')
    }
  } catch (err) {
    loading.value = false
    toast.error(`ADIF转换失败: ${err.message}`)
  }
}

async function handleClearAllData() {
  const confirmed = await confirmDialog.show('确定要清空所有通联日志吗？此操作不可恢复。')
  if (!confirmed) {
    return
  }
  await clearAllData()
  dataQuery.queryResult.value = null
  dataQuery.top20Result.value = null
  dataQuery.oldFriendsResult.value = null
  dataQuery.searchKeyword.value = ''
  dataQuery.oldFriendsSearchKeyword.value = ''
}

// 导出数据
async function handleExportData() {
  try {
    loading.value = true
    const result = await exportDataToDbFile(selectedFromCallsign.value)
    loading.value = false
    if (result && result.displayPath) {
      toast.success(`已保存到 ${result.displayPath}`)
    }
  } catch (err) {
    loading.value = false
    toast.error(`导出失败: ${err.message}`)
  }
}

// 导出ADIF文件
async function handleExportAdif() {
  try {
    loading.value = true
    const appVersion = packageInfo.version
    const result = await exportDataToAdif(selectedFromCallsign.value, appVersion)
    loading.value = false
    if (result && result.displayPath) {
      toast.success(`已保存到 ${result.displayPath}`)
    }
  } catch (err) {
    loading.value = false
    toast.error(`导出ADIF失败: ${err.message}`)
  }
}

// 导出官方 FMO 恢复 ZIP 包
async function handleExportFmoBackup() {
  try {
    loading.value = true
    const result = await exportDataToFmoBackupZip(selectedFromCallsign.value)
    loading.value = false
    if (result && result.displayPath) {
      toast.success(`已保存到 ${result.displayPath}`)
    }
  } catch (err) {
    loading.value = false
    toast.error(`导出FMO恢复包失败: ${err.message}`)
  }
}

// FMO 地址管理
async function handleAddAddress({ name, host, protocol }) {
  const result = await settings.addFmoAddress(name, host, protocol)
  if (!result.success) {
    toast.warning(result.message)
    return
  }

  // 如果正在播放音频，先停止（地址切换需要重新连接）
  if (isAudioPlaying.value) {
    stopAudio()
  }

  // 添加成功后重连到新地址
  if (result.reconnect) {
    speakingStatus.disconnectEventWs('single')
    fmoSync.stopAutoSyncTask()
    messageService.disconnect()
    speakingStatus.connectEventWs(settings.fmoAddress.value, settings.protocol.value)
    speakingStatus.setOnMessageCallback((data) => {
      messageService.handleNewMessageSummary(data)
    })
    messageService.connect(settings.fmoAddress.value, settings.protocol.value).catch((err) => {
      console.error('消息服务连接失败:', err)
    })
    fmoSync.startAutoSyncTask(getSyncAddresses)
  }
}

async function handleUpdateAddress({ id, name, host, protocol }) {
  const result = await settings.updateFmoAddress(id, name, host, protocol)
  if (!result.success) {
    toast.warning(result.message)
  }
}

async function handleDeleteAddress(id) {
  const result = await settings.deleteFmoAddress(id)
  if (!result.success) {
    toast.warning(result.message)
    return
  }

  // 如果正在播放音频，先停止（地址切换需要重新连接）
  if (isAudioPlaying.value) {
    stopAudio()
  }

  // 如果删除的是当前选中地址，需要重连
  if (result.reconnect) {
    messageService.disconnect()

    if (settings.multiSelectMode.value && settings.selectedAddressIds.value.length > 0) {
      // 多选模式：重建 events 连接
      speakingStatus.disconnectAllEventWs()
      const selectedAddresses = settings.addressList.value
        .filter((a) => settings.selectedAddressIds.value.includes(a.id))
        .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
      speakingStatus.connectMultipleEventWs(selectedAddresses, settings.activeAddressId.value)
    } else if (settings.fmoAddress.value) {
      // 单选模式：连接到新的选中地址
      speakingStatus.disconnectEventWs('single')
      speakingStatus.connectEventWs(settings.fmoAddress.value, settings.protocol.value)
    } else {
      // 没有地址了，断开所有连接
      speakingStatus.disconnectAllEventWs()
    }

    speakingStatus.setOnMessageCallback((data) => {
      messageService.handleNewMessageSummary(data)
    })

    if (settings.fmoAddress.value) {
      messageService.connect(settings.fmoAddress.value, settings.protocol.value).catch((err) => {
        console.error('消息服务连接失败:', err)
      })
    }
    // 定时同步不需要重启（因为用的是 getAddresses 函数，自动获取最新地址）
  }
}

async function handleSelectAddress(id) {
  // 如果正在播放音频，先停止（地址切换需要重新连接）
  if (isAudioPlaying.value) {
    stopAudio()
  }

  const result = await settings.selectFmoAddress(id)

  if (result.success) {
    if (result.reconnect) {
      // 切换主服务器时需要重建 events 连接（因为 primaryId 变了）
      if (settings.multiSelectMode.value && settings.selectedAddressIds.value.length > 0) {
        // 多选模式：重建所有 events 连接
        speakingStatus.disconnectAllEventWs()
        const selectedAddresses = settings.addressList.value
          .filter((a) => settings.selectedAddressIds.value.includes(a.id))
          .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
        speakingStatus.connectMultipleEventWs(selectedAddresses, id)
      } else {
        // 单选模式：保持现有逻辑
        speakingStatus.disconnectEventWs('single')
        speakingStatus.connectEventWs(settings.fmoAddress.value, settings.protocol.value)
      }

      speakingStatus.setOnMessageCallback((data) => {
        messageService.handleNewMessageSummary(data)
      })
      messageService.disconnect()
      messageService.connect(settings.fmoAddress.value, settings.protocol.value).catch((err) => {
        console.error('消息服务连接失败:', err)
      })
      // 定时同步不需要重启（因为用的是 getAddresses 函数，自动获取最新地址）
    }
  } else {
    toast.warning(result.message)
  }
}

async function handleClearAllAddresses() {
  const result = await settings.clearAllAddresses()
  if (!result.success) {
    toast.warning(result.message)
    return
  }

  // 如果正在播放音频，先停止
  if (isAudioPlaying.value) {
    stopAudio()
  }

  // 断开连接并停止同步任务
  if (result.reconnect) {
    speakingStatus.disconnectAllEventWs()
    messageService.disconnect()
    fmoSync.stopAutoSyncTask()
  }
}

async function handleRefreshUserInfo(id, onDone) {
  const result = await settings.refreshUserInfo(id)

  if (result.success) {
    toast.success(result.message)
  } else {
    toast.error(result.message)
  }
  onDone?.()
}

async function handleSyncDays(days = 1) {
  try {
    await fmoSync.syncToday(settings.fmoAddress.value, settings.protocol.value, days)
    sendUsageStatsBeacon('sync-days', { force: true })
  } catch (err) {
    dataQuery.error.value = `同步失败: ${err.message}`
  }
}

async function handleSyncIncremental() {
  try {
    await fmoSync.syncIncremental(settings.fmoAddress.value, settings.protocol.value)
    sendUsageStatsBeacon('sync-incremental', { force: true })
  } catch (err) {
    dataQuery.error.value = `增量同步失败: ${err.message}`
  }
}

async function handleSyncFull() {
  try {
    await fmoSync.syncFull(settings.fmoAddress.value, settings.protocol.value)
    sendUsageStatsBeacon('sync-full', { force: true })
  } catch (err) {
    dataQuery.error.value = `全量同步失败: ${err.message}`
  }
}

// 多地址同步处理
async function handleSyncMultiple({ syncType, days }) {
  // 获取选中的地址对象
  const selectedIds = settings.selectedAddressIds.value
  const addresses = settings.addressList.value.filter((addr) => selectedIds.includes(addr.id))

  if (addresses.length === 0) {
    toast.error('未选择任何地址')
    return
  }

  try {
    await fmoSync.syncMultiple(addresses, syncType, days)
    sendUsageStatsBeacon(`sync-multiple-${syncType}`, { force: true })

    // 同步完成后，检查失败的地址并取消选中
    const failedResults = fmoSync.multiSyncProgress.value.results.filter((r) => !r.success)
    if (failedResults.length > 0) {
      // 取消选中失败的地址
      for (const result of failedResults) {
        if (settings.selectedAddressIds.value.includes(result.addressId)) {
          settings.toggleAddressSelection(result.addressId)
        }
      }
      // 显示失败提示
      const failedNames = failedResults.map((r) => r.name).join('、')
      toast.error(`以下服务器同步失败: ${failedNames}`)
    }
  } catch (err) {
    dataQuery.error.value = `多地址同步失败: ${err.message}`
  }
}

// 多选模式下验证并选中地址
async function handleValidateAndSelect({ id, host, protocol }) {
  try {
    // 测试连接
    const isConnected = await settings.validateConnection(host, protocol)

    if (isConnected) {
      // 连接成功，选中该地址
      settings.toggleAddressSelection(id)

      // 选中后重建 events 连接（因为选中地址列表变了）
      speakingStatus.disconnectAllEventWs()
      const selectedAddresses = settings.addressList.value
        .filter((a) => settings.selectedAddressIds.value.includes(a.id) || a.id === id)
        .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
      speakingStatus.connectMultipleEventWs(selectedAddresses, settings.activeAddressId.value)
    } else {
      // 连接失败，显示提示
      toast.error(`连接失败: ${host}`)
    }
  } catch (err) {
    toast.error(`连接验证失败: ${err.message}`)
  } finally {
    // connecting 状态由页面自行管理
  }
}

// 处理多选模式切换
async function handleSetMultiSelectMode(value) {
  const oldMode = settings.multiSelectMode.value
  const newMode = value

  // 如果正在播放音频，先停止（地址切换需要重新连接）
  if (isAudioPlaying.value) {
    stopAudio()
  }

  // 先更新设置
  await settings.setMultiSelectMode(value)

  // 如果模式发生变化，重建 events 连接和定时同步
  if (oldMode !== newMode) {
    if (newMode) {
      // 从单选切到多选
      speakingStatus.disconnectEventWs('single')
      if (settings.selectedAddressIds.value.length > 0) {
        const selectedAddresses = settings.addressList.value
          .filter((a) => settings.selectedAddressIds.value.includes(a.id))
          .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
        speakingStatus.connectMultipleEventWs(selectedAddresses, settings.activeAddressId.value)
      }
    } else {
      // 从多选切到单选
      speakingStatus.disconnectAllEventWs()
      if (settings.fmoAddress.value) {
        speakingStatus.connectEventWs(settings.fmoAddress.value, settings.protocol.value)
      }
    }

    // 重建定时同步（使用新的 getAddresses 函数）
    fmoSync.stopAutoSyncTask()
    fmoSync.startAutoSyncTask(getSyncAddresses)
  }
}

// 处理地址选择切换（多选模式下）
async function handleToggleAddressSelection(id) {
  const isCurrentlySelected = settings.selectedAddressIds.value.includes(id)

  // 如果正在播放音频，先停止（地址切换需要重新连接）
  if (isAudioPlaying.value) {
    stopAudio()
  }

  // 执行 toggle
  await settings.toggleAddressSelection(id)

  // 如果是取消选择，需要清理连接和数据
  if (isCurrentlySelected) {
    // 断开该服务器的 events 连接并清理发言数据
    speakingStatus.disconnectEventWs(id)

    // 判断是否需要切换主服务器
    const remainingSelected = settings.selectedAddressIds.value
    const wasPrimary = id === settings.activeAddressId.value

    if (wasPrimary && remainingSelected.length > 0) {
      // 切换主服务器到剩余选中中 numId 最小的
      const smallestAddr = settings.addressList.value
        .filter((a) => remainingSelected.includes(a.id))
        .sort((a, b) => (a.numId || Infinity) - (b.numId || Infinity))[0]

      if (smallestAddr) {
        // 设置新的主服务器
        await settings.setActiveAddressId(smallestAddr.id)
      }
    }

    // 重建剩余服务器的 events 连接
    if (remainingSelected.length > 0) {
      connectEventsWebSocket()
    } else {
      speakingStatus.disconnectAllEventWs()
    }

    // 重启同步任务
    fmoSync.stopAutoSyncTask()
    if (remainingSelected.length > 0) {
      fmoSync.startAutoSyncTask(getSyncAddresses)
    }
  } else {
    // 新增选择：重建连接以包含新服务器
    connectEventsWebSocket()
  }
}

// 监听
watch(showSpeakingHistory, async (newValue) => {
  if (newValue) {
    await settings.loadTodayContactedCallsigns(selectedFromCallsign.value)
    await settings.loadContactCounts(selectedFromCallsign.value)
  }
})

watch(
  () => selectedFromCallsign.value,
  async (newVal) => {
    if (newVal) {
      await settings.loadContactCounts(newVal)
      sendUsageStatsBeacon('callsign')
    }
    if (showSpeakingHistory.value && newVal) {
      await settings.loadTodayContactedCallsigns(newVal)
    }
  }
)

// 路由变化时执行查询
watch(
  () => route.name,
  async (newName, oldName) => {
    if (newName !== oldName && dbLoaded.value) {
      // 更新 dataQuery 的查询类型
      const queryType = routeToQueryType[newName]
      if (queryType && dataQuery.currentQueryType.value !== queryType) {
        dataQuery.currentQueryType.value = queryType
        dataQuery.handleQueryTypeChange()
        await executeQuery()
      }
    }
  }
)

// 监听 activeAddress 变化，自动推断呼号
watch(
  () => settings.activeAddress.value,
  () => {
    if (dbLoaded.value && availableFromCallsigns.value.length > 0) {
      inferFromCallsign()
    }
    sendUsageStatsBeacon('active-address')
  },
  { deep: true }
)

// 监听 availableFromCallsigns 变化，自动推断呼号
watch(
  () => availableFromCallsigns.value,
  (newVal) => {
    if (newVal.length > 0 && dbLoaded.value) {
      inferFromCallsign()
    }
  }
)

// 音频控制
async function handleToggleAudio() {
  if (dashboardVoiceMode.value !== 'off') {
    if (isAudioPlaying.value) {
      await stopAudio()
    }
    const nextMode = 'off'
    dashboardVoiceMode.value = nextMode
    localStorage.setItem('fmo_dashboard_voice_mode', nextMode)
    settings.setAudioPlaying(false)
    return
  }

  const nextMode = 'radio'
  dashboardVoiceMode.value = nextMode
  localStorage.setItem('fmo_dashboard_voice_mode', nextMode)

  if (!isAudioPlaying.value && settings.fmoAddress.value) {
    await resumeAudio().catch(() => {})
    await toggleAudio(settings.fmoAddress.value, settings.protocol.value)
  }
  settings.setAudioPlaying(isAudioPlaying.value)
  if (isAudioPlaying.value && !isAudioMuted.value) {
    await setAudioVolumePlayer(settings.audioVolume.value)
  }
}

async function handleUpdateDashboardVoiceMode(mode) {
  const nextMode = normalizeDashboardVoiceMode(mode)
  dashboardVoiceMode.value = nextMode
  localStorage.setItem('fmo_dashboard_voice_mode', nextMode)

  if (nextMode !== 'radio') {
    if (isAudioPlaying.value) {
      await stopAudio()
    }
    settings.setAudioPlaying(false)
    return
  }

  if (!isAudioPlaying.value && settings.fmoAddress.value) {
    await resumeAudio().catch(() => {})
    await toggleAudio(settings.fmoAddress.value, settings.protocol.value)
  }
  settings.setAudioPlaying(isAudioPlaying.value)
  if (isAudioPlaying.value && !isAudioMuted.value) {
    await setAudioVolumePlayer(settings.audioVolume.value)
  }
}

// 恢复音频播放状态（页面加载时调用）
function restoreAudioPlayback() {
  if (settings.fmoAddress.value && dashboardVoiceMode.value === 'radio') {
    settings.setAudioPlaying(true)
    toggleAudio(settings.fmoAddress.value, settings.protocol.value)
      .then(() => {
        settings.setAudioPlaying(isAudioPlaying.value)
        if (isAudioPlaying.value && !isAudioMuted.value) {
          setAudioVolumePlayer(settings.audioVolume.value)
        }
      })
      .catch(() => {
        settings.setAudioPlaying(false)
      })
    // 注册一次性用户交互监听，恢复 AudioContext
    setupAudioContextResume()
  }
}

function setupAudioContextResume() {
  const handler = () => {
    resumeAudio()
    document.removeEventListener('click', handler)
    document.removeEventListener('touchstart', handler)
  }
  document.addEventListener('click', handler, { once: true })
  document.addEventListener('touchstart', handler, { once: true })
}

// 处理音量更新
function handleUpdateAudioVolume(value) {
  settings.setAudioVolume(value)
  // 如果正在播放且未静音，实时应用新音量
  if (isAudioPlaying.value && !isAudioMuted.value) {
    setAudioVolumePlayer(value)
  }
}

// 监听 isAudioPlaying 变化，同步到 settings
watch(isAudioPlaying, (val) => {
  settings.setAudioPlaying(val)
})

// 自动静音：当自己在发言时自动静音（基于 isHost 判断）
watch(
  () => speakingStatus.isHostSpeaking.value,
  (isHost) => {
    if (!isAudioPlaying.value) return
    setAudioHostMuted(isHost)
  }
)

// 同步当前发言人到原生通知栏（仅 Android）
watch(
  [
    () => speakingStatus.currentSpeaker.value,
    () => speakingStatus.currentSpeakerAddress.value,
    isAudioPlaying
  ],
  ([speaker, address, playing]) => {
    if (!playing) return
    updateSpeakerInfo(speaker || '', address || '')
  }
)

// 获取同步地址列表的函数（用于定时同步）
function getSyncAddresses() {
  if (settings.multiSelectMode.value && settings.selectedAddressIds.value.length > 0) {
    return settings.addressList.value
      .filter((a) => settings.selectedAddressIds.value.includes(a.id))
      .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
  }
  // 单选模式
  if (settings.fmoAddress.value) {
    return [{ id: 'single', host: settings.fmoAddress.value, protocol: settings.protocol.value }]
  }
  return []
}

// 连接 events WebSocket（根据当前模式）
function connectEventsWebSocket() {
  const hasSavedAddress = settings.addressList.value.length > 0
  if (!hasSavedAddress) return

  if (settings.multiSelectMode.value && settings.selectedAddressIds.value.length > 0) {
    // 多选模式：连接所有选中地址的 events
    const selectedAddresses = settings.addressList.value
      .filter((a) => settings.selectedAddressIds.value.includes(a.id))
      .map((a) => ({ id: a.id, host: a.host, protocol: a.protocol }))
    speakingStatus.connectMultipleEventWs(selectedAddresses, settings.activeAddressId.value)
  } else {
    // 单选模式：保持原有单连接
    speakingStatus.connectEventWs(settings.fmoAddress.value, settings.protocol.value)
  }
}

// 安卓硬件返回键处理：优先关闭弹框 → 首页直接询问退出 → 路由回退 → 询问退出
let backButtonListener = null
let exitConfirming = false

// ---- 浏览器返回键拦截（popstate）----
// 通过全局弹框注册表统一管理，所有弹框组件各自注册
// 注册 MainLayout 的 4 个弹框
useModalBackHandler([
  showSpeakingHistory,
  showStationList,
  showQuickNav,
  () => callsignRecords.showCallsignModal.value
])

// 在 setup 中立即注册 MainLayout 的弹框（返回 unregister 函数在组件卸载时调用）
const _unregCallsignRecords = registerModal(
  () => callsignRecords.showCallsignModal.value,
  () => callsignRecords.closeCallsignModal(),
  10
)
const _unregStationList = registerModal(
  () => showStationList.value,
  () => {
    showStationList.value = false
  },
  50
)
const _unregQuickNav = registerModal(
  () => showQuickNav.value,
  () => {
    showQuickNav.value = false
  },
  60
)
const _unregSpeakingHistory = registerModal(
  () => showSpeakingHistory.value,
  () => {
    showSpeakingHistory.value = false
  },
  70
)

onUnmounted(() => {
  _unregCallsignRecords()
  _unregStationList()
  _unregQuickNav()
  _unregSpeakingHistory()
})

async function handleHardwareBack({ canGoBack }) {
  // 1) 优先关闭已打开的 modal（通过全局注册表关闭最顶层弹框）
  if (countOpenModals() > 0) {
    closeTopModal()
    return
  }

  // 2) 在仪表盘首页时，忽略历史记录栈，直接询问退出（防止退回到之前的页面）
  if (route.path === '/dashboard') {
    if (exitConfirming) return
    exitConfirming = true
    try {
      const confirmed = await confirmDialog.show('确定要退出应用吗？')
      if (confirmed) {
        await CapacitorApp.exitApp()
      }
    } finally {
      exitConfirming = false
    }
    return
  }

  // 3) 可返回则交给 Vue Router（popstate 也会被各页面自有逻辑处理，例如 MessageView 详情）
  if (canGoBack) {
    router.back()
    return
  }

  // 4) 根路由且无其他可回退状态 → 确认退出
  if (exitConfirming) return
  exitConfirming = true
  try {
    const confirmed = await confirmDialog.show('确定要退出应用吗？')
    if (confirmed) {
      await CapacitorApp.exitApp()
    }
  } finally {
    exitConfirming = false
  }
}

// 生命周期
onMounted(async () => {
  // 回到顶部滚动监听
  contentAreaRef.value?.addEventListener('scroll', handleScroll, { passive: true })

  // 注册安卓硬件返回键监听（仅原生平台）
  if (Capacitor.isNativePlatform()) {
    try {
      backButtonListener = await CapacitorApp.addListener('backButton', handleHardwareBack)
    } catch (err) {
      console.error('注册返回键监听失败:', err)
    }
  }

  const restored = await tryRestoreDirectory()
  if (restored) {
    // 根据当前路由设置查询类型
    const queryType = routeToQueryType[route.name] || 'all'
    dataQuery.currentQueryType.value = queryType
    executeQuery()
    // 数据库加载后执行呼号自动推断
    inferFromCallsign()
  }

  const hasSavedAddress = await settings.initFmoAddress()
  if (hasSavedAddress) {
    // 根据模式连接 events
    connectEventsWebSocket()

    // 注册消息事件回调，让 speakingStatus 的 events 连接转发消息摘要
    speakingStatus.setOnMessageCallback((data) => {
      messageService.handleNewMessageSummary(data)
    })
    // 按需获取消息列表（短连接，获取后自动断开）- 只连主服务器
    messageService.getList(settings.fmoAddress.value, settings.protocol.value, 0).catch((err) => {
      console.error('获取消息列表失败:', err)
    })
    sendUsageStatsBeacon('init')
  }

  // 定时同步：使用 getAddresses 函数模式
  fmoSync.startAutoSyncTask(getSyncAddresses)

  // 恢复音频播放状态（地址初始化完成后）
  restoreAudioPlayback()
})

onUnmounted(() => {
  if (scrollTimer) clearTimeout(scrollTimer)
  contentAreaRef.value?.removeEventListener('scroll', handleScroll)

  // 移除返回键监听
  if (backButtonListener) {
    try {
      backButtonListener.remove()
    } catch (err) {
      console.error('移除返回键监听失败:', err)
    }
    backButtonListener = null
  }

  fmoSync.stopAutoSyncTask()
  _syncStore.teardown()
  speakingStatus.disconnectAllEventWs()
  messageService.disconnect()
})

// 提供共享状态给子组件
provide('dbLoaded', dbLoaded)
provide('selectedFromCallsign', selectedFromCallsign)
provide('executeQuery', executeQuery)
provide('fmoAddress', settings.fmoAddress)
provide('protocol', settings.protocol)
</script>

<style scoped>
.container {
  width: 100%;
  min-width: 0;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 底部导航栏（手机端） */
.mobile-nav {
  display: none;
  flex-shrink: 0;
  background: var(--bg-header);
  border-top: 1px solid color-mix(in srgb, var(--border-light) 80%, var(--color-primary));
  padding: 0.25rem 0;
  padding-bottom: calc(0.25rem + var(--safe-inset-bottom, env(safe-area-inset-bottom, 0px)));
  justify-content: space-around;
  z-index: 200;
}

.mobile-nav .nav-tab {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  background: none;
  border: none;
  border-radius: 7px;
  padding: 0.24rem 0.8rem;
  font-size: 1rem;
  color: var(--text-tertiary);
  cursor: pointer;
  transition: color 0.2s;
  font-family: inherit;
  text-decoration: none;
}

.mobile-nav .nav-tab:hover:not(.disabled) {
  background: var(--surface-accent);
}

.mobile-nav .nav-tab.router-link-active {
  color: var(--color-primary);
  background: var(--surface-accent);
}

.mobile-nav .nav-tab.disabled {
  color: var(--text-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

.nav-icon {
  color: currentColor;
}

.nav-label {
  font-size: 0.7rem;
  line-height: 1;
}

.hidden-input {
  display: none;
}

.content-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1rem;
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--bg-page) 84%, transparent),
    var(--bg-page)
  );
  display: flex;
  flex-direction: column;
  position: relative;
  min-width: 0;
  will-change: transform;
}

/* 下拉松手后的回弹动画 */
.content-area.pull-snapping {
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.route-frame {
  display: flex;
  flex: 1 0 auto;
  min-height: 0;
  flex-direction: column;
}

.route-frame :deep(> *) {
  flex: 1 0 auto;
  min-height: 0;
}

.back-to-top-btn {
  display: none;
}

.app-footer {
  display: grid;
  flex-shrink: 0;
  justify-items: center;
  gap: 0.35rem;
  margin-top: auto;
  padding: 1.5rem 0.5rem 0.25rem;
  color: var(--text-tertiary);
  font-size: 0.72rem;
  line-height: 1.5;
  text-align: center;
}

.footer-share-line {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
}

.footer-share-line a {
  display: inline-flex;
  width: 1rem;
  height: 1rem;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  text-decoration: none;
}

.footer-share-line a:hover {
  color: var(--color-primary);
}

.footer-share-line svg {
  width: 1rem;
  height: 1rem;
  fill: currentColor;
}

:global(.native-ios .container) {
  width: 100%;
  max-width: none;
}

:global(.native-ios .content-area) {
  overflow-x: hidden;
  padding: 0 0.5rem 0.5rem;
  min-height: 0;
}

@media (min-width: 769px) {
  .container :deep(.speaking-bar) {
    display: none;
  }

  .dashboard-route :deep(.header),
  .dashboard-route :deep(.speaking-bar) {
    display: none;
  }

  .dashboard-route .content-area {
    padding: 0;
  }

  .dashboard-route .app-footer {
    padding: 1.5rem 1rem 1.25rem;
  }
}

@media (max-width: 768px) {
  .dashboard-route :deep(.header),
  .dashboard-route :deep(.speaking-bar) {
    display: none;
  }

  .dashboard-route .content-area {
    padding: 0;
  }

  .content-area {
    padding: 0.5rem;
    overflow-y: auto;
    min-height: 0;
  }

  .mobile-nav {
    display: flex;
  }

  .app-footer {
    padding: 1rem 0.5rem 0.85rem;
  }

  .mobile-unread-badge {
    position: absolute;
    top: 0.25rem;
    right: calc(50% - 1.2rem);
    width: 7px;
    height: 7px;
    background: #ef4444;
    border-radius: 50%;
    border: 1.5px solid var(--bg-header, var(--bg-page));
  }

  .back-to-top-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    right: 1rem;
    bottom: calc(60px + var(--safe-inset-bottom, env(safe-area-inset-bottom, 0px)) + 0.75rem);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--bg-header);
    border: 1px solid var(--border-primary);
    box-shadow: 0 2px 8px var(--shadow-card);
    color: var(--text-secondary);
    cursor: pointer;
    z-index: 190;
    padding: 0;
  }

  .back-to-top-btn svg {
    width: 20px;
    height: 20px;
  }

  .back-to-top-btn:focus {
    outline: none;
  }
}

@media (min-width: 769px) and (orientation: landscape) {
  :global(.native-ios .content-area) {
    padding: 1rem;
  }

  :global(.native-ios .dashboard-route) .content-area {
    padding: 0;
  }

  :global(.native-ios .mobile-nav) {
    display: none;
  }
}

@media (max-height: 520px) and (max-width: 950px) and (orientation: landscape) {
  .container {
    max-width: none;
    height: 100vh;
    height: 100dvh;
  }

  .container :deep(.header),
  .container :deep(.speaking-bar) {
    display: none;
  }

  .dashboard-route .content-area,
  .content-area {
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
    padding: 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }

  .mobile-nav {
    display: flex;
    min-height: 2.05rem;
    padding: 0.06rem 0;
    padding-bottom: 0.06rem;
  }

  .mobile-nav .nav-tab {
    gap: 0;
    padding: 0.05rem 0.55rem;
    border-radius: 6px;
  }

  .nav-icon {
    width: 17px;
    height: 17px;
  }

  .nav-label {
    font-size: 0.54rem;
    line-height: 1.05;
  }

  .dashboard-route .app-footer {
    display: none;
  }

  .back-to-top-btn {
    right: 0.55rem;
    bottom: 2.3rem;
    width: 34px;
    height: 34px;
  }

  .back-to-top-btn svg {
    width: 18px;
    height: 18px;
  }
}

/* 回到顶部按钮淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 下拉刷新指示器（在 content-area 上方） */
.pull-refresh-indicator {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  overflow: hidden;
  background: var(--bg-page);
  color: var(--text-tertiary);
  font-size: 0.85rem;
  user-select: none;
  -webkit-user-select: none;
}

.refresh-icon {
  display: inline-block;
  font-size: 1.3rem;
  line-height: 1;
  transition: transform 0.2s ease-out;
}

.refresh-icon.spinning {
  animation: pull-spin 0.8s linear infinite;
}

.refresh-text {
  white-space: nowrap;
}

@keyframes pull-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
