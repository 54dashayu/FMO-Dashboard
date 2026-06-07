<template>
  <div class="settings-view">
    <div class="settings-content">
      <!-- 设置 -->
      <div class="tab-content">
        <!-- FMO地址管理 -->
        <div class="setting-group">
          <div class="setting-item">
            <span class="setting-label">{{ t('settings.fmoAddress', 'FMO地址') }}</span>
            <div class="setting-actions">
              <!-- 多选同步开关 -->
              <div v-if="addressList.length > 0" class="multi-select-toggle">
                <span class="toggle-label">{{ t('settings.multiSync', '多选同步') }}</span>
                <label class="toggle-switch">
                  <input
                    id="multi-select-toggle"
                    type="checkbox"
                    :checked="multiSelectMode"
                    @change="$emit('update:multiSelectMode', $event.target.checked)"
                  />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <button
                v-if="addressList.length > 0"
                class="btn-text-danger"
                @click="handleClearAllAddresses"
              >
                <span class="text-desktop">{{ t('settings.clearFmoAddress', '清空FMO地址') }}</span>
                <span class="text-mobile">{{ t('settings.clear', '清空') }}</span>
              </button>
              <button class="btn-add" @click="showAddForm">
                <span class="text-desktop">{{ t('settings.addAddress', '+ 添加地址') }}</span>
                <span class="text-mobile">{{ t('settings.add', '添加') }}</span>
              </button>
            </div>
          </div>

          <!-- 地址列表 -->
          <div v-if="addressList.length > 0" class="address-list">
            <div
              v-for="(addr, index) in addressList"
              :key="addr.id"
              class="address-card"
              :class="{
                active: multiSelectMode
                  ? selectedAddressIds.includes(addr.id)
                  : addr.id === activeAddressId,
                connecting: connectingId === addr.id
              }"
              @click="handleSelectAddress(addr.id)"
            >
              <!-- 连接状态灯 -->
              <div class="address-status">
                <span v-if="connectingId === addr.id" class="status-connecting"></span>
                <span
                  v-else-if="
                    multiSelectMode
                      ? selectedAddressIds.includes(addr.id)
                      : addr.id === activeAddressId
                  "
                  class="status-active"
                ></span>
                <span v-else class="status-inactive"></span>
              </div>
              <div class="address-info">
                <div class="address-name">
                  <!-- 服务器数字 ID 标签 -->
                  <span class="server-id-tag">
                    {{ getServerNumId(addr, index) }}
                  </span>
                  {{ addr.name }}
                  <!-- 主服务器标签 -->
                  <span
                    v-if="multiSelectMode && addr.id === activeAddressId"
                    class="primary-badge"
                    >{{ t('settings.primaryServer', '主服务器') }}</span
                  >
                </div>
                <div class="address-url">{{ addr.protocol }}://{{ addr.host }}</div>
                <div v-if="addr.id === activeAddressId && addr.userInfo" class="address-user-info">
                  <span v-if="addr.userInfo.callsign" class="user-callsign">{{
                    addr.userInfo.callsign
                  }}</span>
                  <span v-if="addr.userInfo.uid" class="user-uid"
                    >UID: {{ addr.userInfo.uid }}</span
                  >
                </div>
              </div>
              <div class="address-actions" @click.stop>
                <!-- 多选模式下的设为主服务器按钮 -->
                <button
                  v-if="multiSelectMode && addr.id !== activeAddressId"
                  class="btn-icon"
                  :title="t('settings.setPrimary', '设为主服务器')"
                  :disabled="connectingId === addr.id"
                  @click="handleSetPrimary(addr.id)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                    />
                  </svg>
                </button>
                <button
                  v-if="addr.id === activeAddressId"
                  class="btn-icon"
                  :class="{ 'btn-icon-loading': refreshingId === addr.id }"
                  :title="t('settings.refreshUser', '刷新用户信息')"
                  :disabled="refreshingId === addr.id"
                  @click="handleRefreshUserInfo(addr.id)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                    />
                  </svg>
                </button>
                <button
                  class="btn-icon"
                  :title="t('settings.openFmo', '打开FMO页面')"
                  @click="openFmoPage(addr)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                </button>
                <button
                  class="btn-icon"
                  :title="t('settings.edit', '编辑')"
                  @click="editAddress(addr)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    />
                  </svg>
                </button>
                <button
                  class="btn-icon btn-icon-danger"
                  :title="t('common.delete', '删除')"
                  @click="handleDeleteAddress(addr.id)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- 无地址时的提示 -->
          <div v-else class="no-address">
            <p>{{ t('settings.noAddress', '暂无FMO地址，点击上方"添加地址"按钮添加') }}</p>
          </div>

          <!-- 操作按钮 -->
          <div v-if="addressList.length > 0" class="setting-item-buttons">
            <select
              id="sync-days"
              v-model.number="syncDays"
              class="sync-days-select"
              :disabled="syncing"
            >
              <option :value="1">{{ t('settings.today', '今天') }}</option>
              <option :value="3">{{ t('settings.lastDays', '最近3天', { count: 3 }) }}</option>
              <option :value="7">{{ t('settings.lastDays', '最近7天', { count: 7 }) }}</option>
              <option :value="30">{{ t('settings.lastDays', '最近30天', { count: 30 }) }}</option>
            </select>
            <button
              class="btn-secondary"
              :disabled="
                (!fmoAddress && !(multiSelectMode && selectedAddressIds.length > 0)) || syncing
              "
              @click="handleSyncDays"
            >
              {{ getSyncDaysButtonText }}
            </button>
          </div>
          <div v-if="addressList.length > 0" class="setting-item-buttons">
            <button
              class="btn-secondary"
              :disabled="
                (!fmoAddress && !(multiSelectMode && selectedAddressIds.length > 0)) || syncing
              "
              @click="handleSyncIncremental"
            >
              {{ getSyncIncrementalButtonText }}
            </button>
            <button
              class="btn-secondary"
              :disabled="
                (!fmoAddress && !(multiSelectMode && selectedAddressIds.length > 0)) || syncing
              "
              @click="handleSyncFull"
            >
              {{ getSyncFullButtonText }}
            </button>
          </div>
          <div v-if="addressList.length > 0" class="setting-item-buttons setting-item-buttons-full">
            <button
              class="btn-ghost"
              :disabled="!fmoAddress || syncing"
              @click="$emit('backup-logs')"
            >
              {{ t('settings.backupLogs', '备份FMO日志') }}
            </button>
          </div>
          <div v-if="syncStatus" class="sync-status">
            {{ syncStatus }}
          </div>
        </div>

        <!-- 播放设置 -->
        <div class="setting-group-audio">
          <div class="setting-group-title">{{ t('settings.audioSettings', '播放设置') }}</div>
          <div class="setting-item">
            <label class="setting-label-normal">{{ t('settings.volume', '播放音量') }}</label>
            <div class="volume-control">
              <input
                type="range"
                min="0"
                max="200"
                step="1"
                :value="audioVolume"
                class="volume-slider"
                :style="{
                  background: `linear-gradient(to right, var(--color-primary, #409eff) 0%, var(--color-primary, #409eff) ${audioVolume / 2}%, var(--border-primary) ${audioVolume / 2}%, var(--border-primary) 100%)`
                }"
                @input="handleVolumeChange"
              />
              <span class="volume-value">{{ audioVolume }}%</span>
            </div>
          </div>
          <div class="setting-item voice-test-item">
            <label class="setting-label-normal">{{ t('settings.voiceTest', '语音测试') }}</label>
            <div class="voice-test-control">
              <input
                v-model.trim="voiceTestCallsign"
                class="voice-test-input"
                type="text"
                :placeholder="t('settings.callsignPlaceholder', '输入呼号')"
                autocomplete="off"
                autocapitalize="characters"
                @keyup.enter="handleVoiceTest"
              />
              <button
                class="btn-secondary voice-test-btn"
                :disabled="voiceTesting"
                @click="handleVoiceTest"
              >
                {{
                  voiceTesting
                    ? t('settings.playing', '播放中...')
                    : t('settings.testVoice', '测试播报')
                }}
              </button>
            </div>
            <div v-if="voiceTestStatus" class="voice-test-status">{{ voiceTestStatus }}</div>
          </div>
        </div>

        <!-- 数据管理 -->
        <div class="setting-group-data">
          <div class="setting-item-data-header">
            <span class="setting-label">{{ t('settings.dataManagement', '数据管理') }}</span>
          </div>
          <div class="setting-item-data-row">
            <button class="btn-primary btn-full" @click="$emit('select-files')">
              {{ t('settings.importLogs', '导入FMO日志') }}
            </button>
          </div>
          <div class="setting-item-data-row">
            <button class="btn-secondary" :disabled="!dbLoaded" @click="$emit('export-data')">
              {{ t('settings.exportDb', '导出数据库文件') }}
            </button>
            <button class="btn-secondary" :disabled="!dbLoaded" @click="$emit('export-adif')">
              {{ t('settings.exportAdif', '导出ADIF') }}
            </button>
          </div>
          <div v-if="dbLoaded" class="setting-item-data-clear">
            <div class="data-clear-info">
              <span class="data-clear-warning">{{
                t('settings.clearDataWarning', '此操作将永久删除所有本地通联日志，不可恢复！')
              }}</span>
              <button class="btn-danger" @click="$emit('clear-all-data')">
                {{ t('settings.clearLogs', '清空通联日志') }}
              </button>
            </div>
          </div>
          <div class="setting-item-data-clear setting-item-data-clear-mt">
            <div class="grid-cache-info">
              <span class="grid-cache-desc">{{
                t('settings.clearGridCacheDesc', '清理网格地址本地缓存，下次查询将重新请求远程接口')
              }}</span>
              <button class="btn-secondary" @click="handleClearGridCache">
                {{ t('settings.clearGridCache', '清理地址缓存') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地址编辑弹框 -->
    <div v-if="showAddressDialog" class="dialog-overlay" @click.self="cancelAddressDialog">
      <div class="dialog">
        <div class="dialog-header">
          <span class="dialog-title">{{
            editingId
              ? t('settings.editAddress', '编辑地址')
              : t('settings.addAddressTitle', '添加地址')
          }}</span>
          <button class="close-btn" @click="cancelAddressDialog">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">{{ t('settings.nameOptional', '名称（可选）') }}</label>
            <input
              id="address-name"
              v-model="formData.name"
              type="text"
              :placeholder="t('settings.namePlaceholder', '如：家里的FMO')"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">{{ t('settings.connectionType', '连接方式') }}</label>
            <select id="address-type" v-model="formData.addressType" class="connection-select">
              <option value="local">{{ t('settings.localLan', '本地IP / 局域网') }}</option>
              <option value="ddns">{{ t('settings.ddnsRemote', 'DDNS动态域名远程') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">{{ addressHostLabel }}</label>
            <input
              id="address-host"
              v-model="formData.host"
              type="text"
              :placeholder="addressHostPlaceholder"
              class="form-input"
            />
          </div>
          <div v-if="!isMobileDevice" class="form-hint">
            {{ addressTypeHelpText }}
          </div>
          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" :disabled="formValidating" @click="cancelAddressDialog">
            {{ t('common.cancel', '取消') }}
          </button>
          <button class="btn-primary" :disabled="formValidating" @click="submitAddressForm">
            {{
              formValidating ? t('settings.validating', '验证中...') : t('common.confirm', '确定')
            }}
          </button>
        </div>
      </div>
    </div>
    <!-- FMO 页面预览弹框 -->
    <div v-if="showFmoPreview" class="dialog-overlay" @click.self="closeFmoPreview">
      <div class="fmo-preview-dialog">
        <div class="fmo-preview-toolbar">
          <button class="btn-icon" :title="t('common.back', '上一页')" @click="fmoPreviewGoBack">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </button>
          <div class="fmo-preview-toolbar-spacer"></div>
          <button
            class="btn-icon"
            :title="t('common.openInBrowser', '在浏览器中打开')"
            @click="openFmoExternal"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path
                d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"
              />
            </svg>
          </button>
          <button class="close-btn" @click="closeFmoPreview">&times;</button>
        </div>
        <div class="fmo-preview-body">
          <iframe
            :key="fmoPreviewKey"
            ref="fmoPreviewIframe"
            :src="fmoPreviewUrl"
            class="fmo-preview-iframe"
            referrerpolicy="no-referrer"
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-modals"
            @load="onFmoIframeLoad"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted, watch } from 'vue'
import { Capacitor, registerPlugin } from '@capacitor/core'
import { getProtocolFromAddress, isValidHostAddress, normalizeHost } from '../utils/urlUtils'
import confirmDialog from '../composables/useConfirm'
import { clearGridCache } from '../services/gridService'
import { addDiagnosticLog } from '../services/diagnosticLog'
import { playCallsignSpeech } from '../services/callsignSpeech'
import { formatCallsignForSpeech as formatCallsignForNatoSpeech } from '../utils/callsignSpeechText'
import { useModalBackHandler, registerModal } from '../composables/useModalBackHandler'
import { useLocale } from '../composables/useLocale'

const FmoSpeech = registerPlugin('FmoSpeech')
const IOS_SPEECH_RATE = 1
const { t } = useLocale()

const props = defineProps({
  dbLoaded: {
    type: Boolean,
    default: false
  },
  fmoAddress: {
    type: String,
    default: ''
  },
  protocol: {
    type: String,
    default: 'ws'
  },
  addressList: {
    type: Array,
    default: () => []
  },
  activeAddressId: {
    type: String,
    default: null
  },
  syncing: {
    type: Boolean,
    default: false
  },
  syncStatus: {
    type: String,
    default: ''
  },
  multiSelectMode: {
    type: Boolean,
    default: false
  },
  selectedAddressIds: {
    type: Array,
    default: () => []
  },
  multiSyncProgress: {
    type: Object,
    default: () => ({ current: 0, total: 0, currentName: '', results: [] })
  },
  audioVolume: {
    type: Number,
    default: 100
  }
})

const emit = defineEmits([
  'select-files',
  'export-data',
  'export-adif',
  'sync-days',
  'sync-incremental',
  'sync-full',
  'backup-logs',
  'clear-all-data',
  'add-address',
  'update-address',
  'delete-address',
  'select-address',
  'clear-all-addresses',
  'refresh-user-info',
  'update:multiSelectMode',
  'toggle-address-selection',
  'sync-multiple',
  'validate-and-select',
  'update-audio-volume'
])

const connectingId = ref(null)
const refreshingId = ref(null)
const voiceTestCallsign = ref('BH1JSS')
const voiceTesting = ref(false)
const voiceTestStatus = ref('')

// 同步天数选择
const syncDays = ref(1)

// FMO 页面预览弹框状态
const showFmoPreview = ref(false)
const fmoPreviewUrl = ref('')
const fmoPreviewIframe = ref(null)
// 每次打开时递增，用作 iframe :key 强制重建，避免复用旧 DOM / 缓存
const fmoPreviewKey = ref(0)
// 可回退的 iframe 导航次数（首次 load 不计，每次额外 load / back 时修正）
const fmoBackableCount = ref(0)
let fmoIframeLoadCount = 0

function onFmoIframeLoad() {
  fmoIframeLoadCount += 1
  // 首次加载不算导航
  if (fmoIframeLoadCount > 1) {
    fmoBackableCount.value += 1
  }
}

function openFmoPage(addr) {
  const httpProtocol = addr.protocol === 'wss' ? 'https' : 'http'
  const host = normalizeHost(addr.host)
  // 追加时间戳强制重新请求，避免 WebView / 浏览器命中旧缓存
  const sep = host.includes('?') ? '&' : '?'
  fmoPreviewUrl.value = `${httpProtocol}://${host}${sep}_t=${Date.now()}`
  fmoPreviewKey.value += 1
  fmoIframeLoadCount = 0
  fmoBackableCount.value = 0
  showFmoPreview.value = true
}

function closeFmoPreview() {
  showFmoPreview.value = false
  fmoPreviewUrl.value = ''
  fmoIframeLoadCount = 0
  fmoBackableCount.value = 0
}

function fmoPreviewGoBack() {
  const iframe = fmoPreviewIframe.value
  const win = iframe?.contentWindow
  // 优先尝试 iframe 自身的 history（同源 / 允许跨域后退时可用）
  if (win) {
    try {
      // 同源时可读 length；跨域读取会抛错，进入兜底
      if (typeof win.history.length === 'number' && win.history.length > 1) {
        win.history.back()
        if (fmoBackableCount.value > 0) fmoBackableCount.value -= 1
        return
      }
    } catch {
      // 跨域无法读 length，尝试直接 back
    }
    try {
      win.history.back()
      if (fmoBackableCount.value > 0) fmoBackableCount.value -= 1
      return
    } catch {
      // 继续降级
    }
  }
  // 兜底：iframe 的子页导航会在顶层 history 留下 entry，
  // 顶层 back 可让 iframe 回退，而不改变 Vue 路由 URL
  if (fmoBackableCount.value > 0) {
    fmoBackableCount.value -= 1
    window.history.back()
  }
}

function openFmoExternal() {
  if (!fmoPreviewUrl.value) return
  window.open(fmoPreviewUrl.value, '_blank', 'noopener,noreferrer')
}

// 地址编辑弹框状态
const showAddressDialog = ref(false)

// ---- 弹框返回键拦截 ----
useModalBackHandler([showFmoPreview, showAddressDialog])

const _unregFmoPreview = registerModal(
  () => showFmoPreview.value,
  () => closeFmoPreview(),
  50
)
const _unregAddressDialog = registerModal(
  () => showAddressDialog.value,
  () => cancelAddressDialog(),
  50
)

onUnmounted(() => {
  _unregFmoPreview()
  _unregAddressDialog()
})

const editingId = ref(null)
const formData = ref({
  name: '',
  host: '',
  addressType: 'local',
  protocol: 'ws'
})
const formValidating = ref(false)
const formError = ref('')

const isMobileDevice = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})

// 同步按钮文本计算属性
const getSyncDaysButtonText = computed(() => {
  if (props.syncing) {
    if (
      props.multiSelectMode &&
      props.selectedAddressIds.length > 1 &&
      props.multiSyncProgress.total > 0
    ) {
      return t(
        'settings.syncingProgress',
        `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`,
        {
          current: props.multiSyncProgress.current,
          total: props.multiSyncProgress.total
        }
      )
    }
    return t('settings.syncing', '正在同步...')
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return t('settings.syncSelected', `同步已选地址(${props.selectedAddressIds.length})`, {
      count: props.selectedAddressIds.length
    })
  }
  return syncDays.value === 1
    ? t('settings.syncToday', '同步今日通联')
    : t('settings.syncDays', `同步${syncDays.value}天通联`, { count: syncDays.value })
})

const getSyncIncrementalButtonText = computed(() => {
  if (props.syncing) {
    if (
      props.multiSelectMode &&
      props.selectedAddressIds.length > 1 &&
      props.multiSyncProgress.total > 0
    ) {
      return t(
        'settings.syncingProgress',
        `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`,
        {
          current: props.multiSyncProgress.current,
          total: props.multiSyncProgress.total
        }
      )
    }
    return t('settings.syncing', '正在同步...')
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return t('settings.incrementalSelected', `增量同步已选(${props.selectedAddressIds.length})`, {
      count: props.selectedAddressIds.length
    })
  }
  return t('settings.incrementalSync', '增量同步')
})

const getSyncFullButtonText = computed(() => {
  if (props.syncing) {
    if (
      props.multiSelectMode &&
      props.selectedAddressIds.length > 1 &&
      props.multiSyncProgress.total > 0
    ) {
      return t(
        'settings.syncingProgress',
        `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`,
        {
          current: props.multiSyncProgress.current,
          total: props.multiSyncProgress.total
        }
      )
    }
    return t('settings.syncing', '正在同步...')
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return t('settings.fullSelected', `全量同步已选(${props.selectedAddressIds.length})`, {
      count: props.selectedAddressIds.length
    })
  }
  return t('settings.fullSync', '全量同步')
})

const addressHostLabel = computed(() => {
  return formData.value.addressType === 'ddns'
    ? t('settings.ddnsAddress', '动态域名地址')
    : t('settings.localAddress', '本地地址')
})

const addressHostPlaceholder = computed(() => {
  if (formData.value.addressType === 'ddns') return 'xxxx.ddns.xxx:40088'
  return t('settings.localPlaceholder', '例如 192.168.31.146 或 fmo.local')
})

const addressTypeHelpText = computed(() => {
  if (formData.value.addressType === 'ddns') {
    return t(
      'settings.ddnsHelp',
      '填写动态域名和端口。鉴于某些浏览器会自动开启安全连接，建议在浏览器设置中关掉“一律使用安全连接”，并确认地址栏完整输入 http://fmo.bh1jss.net/。'
    )
  }
  return t(
    'settings.localHelp',
    '手机、电脑和 FMO 在同一个局域网时选择这个，填写 FMO 的本地 IP 或 fmo.local。'
  )
})

watch(
  () => formData.value.addressType,
  (type) => {
    if (!showAddressDialog.value) return
    const host = formData.value.host.trim()
    if (type === 'ddns') {
      if (!host || host === 'fmo.local' || /^192\.168\./.test(host)) {
        formData.value.host = ''
      }
      return
    }
    if (!host) {
      formData.value.host = 'fmo.local'
    }
  }
)

function guessAddressType(host) {
  const normalized = normalizeHost(host).replace(/:\d+$/, '').toLowerCase()
  if (!normalized || normalized === 'fmo.local' || normalized.endsWith('.local')) return 'local'
  const parts = normalized.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) return 'ddns'
  const [a, b] = parts
  if (a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168)) {
    return 'local'
  }
  return 'ddns'
}

function showAddForm() {
  editingId.value = null
  formData.value = {
    name: '',
    host: 'fmo.local',
    addressType: 'local',
    protocol: 'ws'
  }
  formError.value = ''
  showAddressDialog.value = true
}

function editAddress(addr) {
  editingId.value = addr.id
  formData.value = {
    name: addr.name,
    host: addr.host,
    addressType: guessAddressType(addr.host),
    protocol: addr.protocol
  }
  formError.value = ''
  showAddressDialog.value = true
}

function cancelAddressDialog() {
  showAddressDialog.value = false
  editingId.value = null
  formData.value = { name: '', host: '', addressType: 'local', protocol: 'ws' }
  formError.value = ''
}

async function submitAddressForm() {
  const { name, host } = formData.value
  const protocol = getProtocolFromAddress(host, formData.value.protocol || 'ws')
  const normalizedHost = normalizeHost(host)

  if (!normalizedHost) {
    formError.value = t('settings.enterAddress', '请输入地址')
    return
  }

  if (!isValidHostAddress(normalizedHost)) {
    formError.value = t('settings.invalidAddress', '请输入有效的IP地址或域名')
    return
  }

  formError.value = ''

  // 临时测试：只校验地址格式，不用 WebSocket 探测结果阻止保存。
  // DDNS、反向代理或 HTTPS 页面连接 ws:// 时，浏览器可能拦截前置探测。
  if (editingId.value) {
    emit('update-address', {
      id: editingId.value,
      name: name.trim() || normalizedHost,
      host: normalizedHost,
      protocol
    })
  } else {
    emit('add-address', {
      name: name.trim() || normalizedHost,
      host: normalizedHost,
      protocol
    })
  }

  // 关闭弹框并清空数据
  cancelAddressDialog()
}

async function handleSelectAddress(id) {
  // 多选模式下，点击卡片切换选中/取消选中
  if (props.multiSelectMode) {
    const isCurrentlySelected = props.selectedAddressIds.includes(id)

    // 取消选中时：直接 toggle，无需验证
    if (isCurrentlySelected) {
      emit('toggle-address-selection', id)
      return
    }

    // 选中时：先验证连接
    const addr = props.addressList.find((a) => a.id === id)
    if (!addr) return

    connectingId.value = id

    try {
      // 调用父组件验证并选中
      await emit('validate-and-select', {
        id,
        host: addr.host,
        protocol: addr.protocol
      })
    } catch {
      // 验证失败
    } finally {
      connectingId.value = null
    }
    return
  }

  // 单选模式下，切换主服务器
  if (id === props.activeAddressId || connectingId.value) return

  connectingId.value = id
  emit('select-address', id)

  // 超时后清除连接状态
  setTimeout(() => {
    connectingId.value = null
  }, 6000)
}

function handleSetPrimary(id) {
  if (id === props.activeAddressId || connectingId.value) return
  connectingId.value = id
  emit('select-address', id)
  setTimeout(() => {
    connectingId.value = null
  }, 6000)
}

async function handleDeleteAddress(id) {
  const confirmed = await confirmDialog.show(
    t('settings.confirmDeleteAddress', '确定要删除这个地址吗？')
  )
  if (confirmed) {
    emit('delete-address', id)
  }
}

async function handleClearAllAddresses() {
  const confirmed = await confirmDialog.show(
    t('settings.confirmClearAddresses', '确定要清除全部FMO地址吗？')
  )
  if (confirmed) {
    emit('clear-all-addresses')
  }
}

async function handleClearGridCache() {
  const confirmed = await confirmDialog.show(
    t('settings.confirmClearGrid', '确定要清理网格地址本地缓存吗？')
  )
  if (confirmed) {
    try {
      await clearGridCache()
      confirmDialog.show(t('settings.gridCacheCleared', '地址缓存已清理'))
    } catch (err) {
      confirmDialog.show(
        t('settings.gridCacheFailed', `清理失败: ${err.message}`, {
          message: err.message
        })
      )
    }
  }
}

async function handleRefreshUserInfo(id) {
  refreshingId.value = id
  emit('refresh-user-info', id, () => {
    refreshingId.value = null
  })
}

// 同步按钮点击处理
async function handleSyncDays() {
  // 多选模式且选中多个地址
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    const confirmed = await confirmDialog.show(
      t(
        'settings.confirmSyncSelected',
        `确定要同步选中的 ${props.selectedAddressIds.length} 个地址的最近${syncDays.value}天数据吗？`,
        {
          count: props.selectedAddressIds.length,
          days: syncDays.value
        }
      )
    )
    if (confirmed) {
      emit('sync-multiple', { syncType: 'today', days: syncDays.value })
    }
    return
  }
  // 单选模式
  emit('sync-days', syncDays.value)
}

async function handleSyncIncremental() {
  // 多选模式且选中多个地址
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    const confirmed = await confirmDialog.show(
      t(
        'settings.confirmIncrementalSelected',
        `确定要对选中的 ${props.selectedAddressIds.length} 个地址执行增量同步吗？将从各FMO服务器获取所有日志，并补充本地缺失的记录。`,
        { count: props.selectedAddressIds.length }
      )
    )
    if (confirmed) {
      emit('sync-multiple', { syncType: 'incremental', days: 1 })
    }
    return
  }
  // 单选模式
  const confirmed = await confirmDialog.show(
    t(
      'settings.confirmIncremental',
      '确定要执行增量同步吗？将从FMO服务器获取所有日志，并补充本地缺失的记录。'
    )
  )
  if (confirmed) {
    emit('sync-incremental')
  }
}

async function handleSyncFull() {
  // 多选模式且选中多个地址
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    const confirmed = await confirmDialog.show(
      t(
        'settings.confirmFullSelected',
        `确定要对选中的 ${props.selectedAddressIds.length} 个地址执行全量同步吗？将用各FMO服务器的数据完全替换本地数据库中的所有记录。`,
        { count: props.selectedAddressIds.length }
      )
    )
    if (confirmed) {
      emit('sync-multiple', { syncType: 'full', days: 1 })
    }
    return
  }
  // 单选模式
  const confirmed = await confirmDialog.show(
    t(
      'settings.confirmFull',
      '确定要执行全量同步吗？将用FMO服务器的数据完全替换本地数据库中的所有记录。'
    )
  )
  if (confirmed) {
    emit('sync-full')
  }
}

// 暴露方法供父组件调用
// 根据地址获取服务器数字 ID 显示文本
function getServerNumId(address, index) {
  if (address.numId) return address.numId.toString()
  return (index + 1).toString()
}

function handleVolumeChange(e) {
  const value = Number(e.target.value)
  emit('update-audio-volume', value)
}

function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

function isNativeIos() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

function formatCallsignForLegacySpeech(callsign) {
  return String(callsign || '')
    .trim()
    .toUpperCase()
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

async function speakByBrowser(text, options = {}) {
  const voices = await waitForVoices()
  return new Promise((resolve, reject) => {
    if (!window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      reject(new Error('当前浏览器不支持语音合成'))
      return
    }

    const utterance = new window.SpeechSynthesisUtterance(text)
    const voice = getPreferredSpeechVoice()
    if (voice) utterance.voice = voice
    utterance.lang = 'en-US'
    utterance.rate = options.rate ?? 0.33
    utterance.volume = 1
    utterance.pitch = 1

    addDiagnosticLog('info', '网页语音测试已发起', {
      voices: voices.length,
      voice: voice ? `${voice.name} (${voice.lang})` : '未选择语音',
      text
    })

    const keepAlive = setInterval(() => {
      window.speechSynthesis?.resume?.()
    }, 1000)

    const timeout = setTimeout(() => {
      clearInterval(keepAlive)
      reject(new Error('语音播报超时，请检查系统文字转语音或浏览器语音权限'))
    }, getSpeechTimeoutMs(text))

    utterance.onend = () => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      resolve()
    }
    utterance.onerror = (event) => {
      clearInterval(keepAlive)
      clearTimeout(timeout)
      reject(new Error(event.error || '语音播报失败'))
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    window.speechSynthesis.resume?.()
  })
}

async function handleVoiceTest() {
  const callsign = voiceTestCallsign.value.trim().toUpperCase()
  if (!callsign) {
    voiceTestStatus.value = '请先输入一个呼号'
    return
  }

  voiceTestCallsign.value = callsign
  voiceTesting.value = true
  voiceTestStatus.value = '正在测试播报...'

  if (isNativeIos()) {
    const text = formatCallsignForNatoSpeech(callsign)
    try {
      await speakByBrowser(text, { rate: IOS_SPEECH_RATE })
      voiceTestStatus.value = `已调用 iOS 系统语音：${callsign}`
      addDiagnosticLog('info', 'iOS 语音测试成功：speechSynthesis', {
        callsign,
        text,
        rate: IOS_SPEECH_RATE
      })
    } catch (err) {
      const message = err?.message || String(err)
      addDiagnosticLog('warn', 'iOS 语音测试：系统语音失败，尝试内置呼号音频', {
        callsign,
        text,
        error: message
      })
      try {
        await playCallsignSpeech(callsign)
        voiceTestStatus.value = `iOS 系统语音失败，已使用内置呼号音频：${callsign}`
        addDiagnosticLog('info', 'iOS 语音测试成功：内置呼号音频', { callsign, text })
      } catch (fallbackErr) {
        const fallbackMessage = fallbackErr?.message || String(fallbackErr)
        voiceTestStatus.value = `播报失败：${message}；内置音频也失败：${fallbackMessage}`
        addDiagnosticLog('warn', 'iOS 语音测试失败：内置呼号音频不可用', {
          callsign,
          text,
          error: fallbackMessage
        })
      }
    } finally {
      voiceTesting.value = false
    }
    return
  }

  const text = formatCallsignForLegacySpeech(callsign)

  try {
    try {
      await playCallsignSpeech(callsign)
      voiceTestStatus.value = `已播放内置呼号语音：${callsign}`
      return
    } catch (err) {
      addDiagnosticLog('warn', '语音测试：内置呼号语音失败，尝试系统语音', {
        callsign,
        error: err?.message || String(err)
      })
    }

    if (isNativeAndroid()) {
      try {
        const result = await FmoSpeech.speak({ text, lang: 'en-US', rate: 0.42, pitch: 1 })
        if (result && result.ok === false) {
          throw new Error(result.error || '安卓系统语音未播放')
        }
        voiceTestStatus.value = `已调用安卓系统语音：${callsign}`
        addDiagnosticLog('info', '语音测试成功：安卓原生 TTS', {
          callsign,
          engine: result?.engine || ''
        })
        return
      } catch (err) {
        addDiagnosticLog('warn', '语音测试：安卓原生 TTS 失败，尝试网页语音', {
          callsign,
          error: err?.message || String(err)
        })
      }
    }

    await speakByBrowser(text)
    voiceTestStatus.value = `已调用网页语音：${callsign}`
    addDiagnosticLog('info', '语音测试成功：网页 speechSynthesis', { callsign })
  } catch (err) {
    const message = err?.message || String(err)
    voiceTestStatus.value = `播报失败：${message}`
    addDiagnosticLog('warn', '语音测试失败', { callsign, error: message })
  } finally {
    voiceTesting.value = false
  }
}
</script>

<style scoped>
.settings-view {
  width: 100%;
  min-width: 0;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.5rem;
  box-sizing: border-box;
}

.settings-content {
  width: 100%;
  max-width: 800px;
  min-width: 0;
  margin: 0 auto;
  box-sizing: border-box;
}

.tab-content {
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.setting-label {
  font-weight: 500;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.volume-slider {
  flex: 1;
  height: 4px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-primary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary, #409eff);
  cursor: pointer;
}

.volume-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary, #409eff);
  border: none;
  cursor: pointer;
}

.volume-value {
  min-width: 3em;
  text-align: right;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.voice-test-item {
  align-items: flex-start;
  flex-direction: column;
  gap: 0.55rem;
}

.voice-test-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.65rem;
  width: 100%;
  min-width: 0;
}

.voice-test-input {
  min-width: 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 0.95rem;
  text-transform: uppercase;
}

.voice-test-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.voice-test-btn {
  min-width: 6.5rem;
  white-space: nowrap;
}

.voice-test-status {
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.setting-actions {
  display: flex;
  gap: 0.5rem;
  min-width: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.setting-info {
  margin-top: 1rem;
  color: var(--color-success);
  font-size: 0.9rem;
}

.setting-select {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  min-width: 150px;
}

.setting-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.setting-group {
  margin-top: 0;
  padding-top: 0;
}

.setting-group-audio {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-light);
}

.setting-group-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.setting-label-normal {
  font-weight: normal;
}

.setting-group-data {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-light);
}

.setting-item-data-header {
  margin-bottom: 0.75rem;
}

.setting-item-data-header .setting-label {
  font-weight: 500;
  color: var(--text-primary);
}

.setting-item-data-row {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.setting-item-data-row .btn-primary,
.setting-item-data-row .btn-secondary {
  flex: 1;
  min-width: 120px;
  white-space: nowrap;
}

.setting-item-data-row .btn-full {
  width: 100%;
  flex: none;
}

.setting-item-data-clear {
  display: flex;
  gap: 0.5rem;
}

.data-clear-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(245, 108, 108, 0.08);
  border: 1px solid rgba(245, 108, 108, 0.2);
  border-radius: 6px;
  gap: 1rem;
}

.setting-item-data-clear-mt {
  margin-top: 0.75rem;
}

.grid-cache-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(230, 162, 60, 0.08);
  border: 1px solid rgba(230, 162, 60, 0.25);
  border-radius: 6px;
  gap: 1rem;
}

.grid-cache-desc {
  font-size: 0.85rem;
  color: var(--color-warning, #e6a23c);
  flex: 1;
}

.data-clear-warning {
  font-size: 0.85rem;
  color: var(--color-danger);
  flex: 1;
}

.setting-item-data-clear .btn-danger {
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-add {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: var(--bg-container);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: var(--color-primary);
  color: var(--text-white);
}

/* 地址列表 */
.address-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.address-card {
  display: flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.address-card:hover {
  border-color: var(--color-primary);
  background: var(--bg-table-hover);
}

.address-card.active {
  border-color: var(--color-primary);
  background: rgba(64, 158, 255, 0.08);
}

.address-card.connecting {
  opacity: 0.7;
  cursor: wait;
}

.address-status {
  margin-right: 0.75rem;
}

.status-active,
.status-inactive,
.status-connecting {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.status-active {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.status-inactive {
  background: var(--border-primary);
}

.status-connecting {
  background: var(--color-primary);
  animation: pulse 1s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.address-info {
  flex: 1;
  min-width: 0;
}

.address-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.95rem;
  margin-bottom: 0.15rem;
}

.address-url {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.address-user-info {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.user-callsign,
.user-uid {
  font-size: 0.75rem;
  padding: 0.1rem 0.4rem;
  border-radius: 3px;
  font-weight: 500;
}

.user-callsign {
  background: rgba(64, 158, 255, 0.15);
  color: var(--color-primary);
}

.user-uid {
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success);
}

.address-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.btn-icon {
  padding: 0.35rem;
  background: none;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: all 0.2s;
  flex-shrink: 0;
}

.btn-icon:hover {
  background: var(--bg-table-hover);
  color: var(--color-primary);
}

.btn-icon-danger:hover {
  color: var(--color-danger);
}

.btn-icon:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.btn-icon-loading svg {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.no-address {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.setting-note {
  margin-top: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #606266;
}

.setting-note code {
  background-color: #e6f7ff;
  padding: 0.2rem 0.4rem;
  border-radius: 3px;
  font-family: monospace;
  color: #409eff;
  border: 1px solid #d9ecff;
}

.setting-item-buttons {
  display: flex;
  flex-direction: row;
  gap: 0.8rem;
  margin-top: 0.8rem;
  padding-top: 0;
  border-top: none;
}

.setting-item-buttons:first-of-type {
  margin-top: 0;
}

.setting-item-buttons .btn-secondary {
  flex: 1;
}

.setting-item-buttons .sync-days-select {
  flex: 1;
}

.setting-item-buttons-full .btn-ghost {
  width: 100%;
}

.sync-days-select {
  padding: 0.5rem 0.8rem;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
}

.btn-ghost {
  padding: 0.4rem 1rem;
  font-size: 0.82rem;
  background: transparent;
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 0.02em;
}

.btn-ghost:hover {
  color: var(--text-primary);
  border-color: var(--border-secondary);
  background: var(--bg-table-hover);
}

.btn-ghost:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sync-days-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.sync-days-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.sync-status {
  margin-top: 0.8rem;
  font-size: 0.85rem;
  color: var(--color-primary);
  text-align: center;
}

.setting-item-danger {
  margin-top: 0;
  padding-top: 0;
}

.btn-primary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: var(--color-primary);
  color: var(--text-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: var(--bg-container);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary:hover {
  background: var(--bg-table-hover);
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: var(--color-danger);
  color: var(--text-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger:hover {
  background: var(--color-danger-hover);
}

.btn-text-danger {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: none;
  color: var(--color-danger);
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-text-danger:hover {
  color: var(--color-danger-hover);
  text-decoration: underline;
}

/* 地址编辑弹框 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1100;
}

.dialog {
  background: var(--bg-card);
  border-radius: 8px;
  width: 420px;
  max-width: calc(100vw - 2rem);
  box-shadow: 0 4px 20px var(--shadow-modal);
  box-sizing: border-box;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem;
  border-bottom: 1px solid var(--border-light);
}

.dialog-title {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.dialog-body {
  padding: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-of-type {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 0.5rem;
}

.form-row {
  display: flex;
  gap: 0.5rem;
}

.form-input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input-flex {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
}

.form-input-flex:focus {
  outline: none;
  border-color: var(--color-primary);
}

.connection-select,
.protocol-select {
  padding: 0.6rem 0.5rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.connection-select:focus,
.protocol-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-hint {
  margin-top: 0.75rem;
  padding: 0.6rem;
  background-color: #f0f9ff;
  border: 1px solid #b3d8ff;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #606266;
}

.form-hint code {
  background-color: #e6f7ff;
  padding: 0.15rem 0.35rem;
  border-radius: 3px;
  font-family: monospace;
  color: #409eff;
  border: 1px solid #d9ecff;
}

.form-error {
  margin-top: 0.75rem;
  padding: 0.6rem;
  background-color: #fef0f0;
  border: 1px solid #fde2e2;
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-danger);
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-light);
}

/* FMO 页面预览弹框 */
.fmo-preview-dialog {
  background: var(--bg-card);
  border-radius: 12px;
  width: 420px;
  max-width: 92vw;
  height: 75vh;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px var(--shadow-modal);
  overflow: hidden;
}

.fmo-preview-toolbar {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.6rem;
  border-bottom: 1px solid var(--border-light);
  background: var(--bg-card);
}

.fmo-preview-toolbar-spacer {
  flex: 1;
}

.fmo-preview-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--bg-container);
}

.fmo-preview-iframe {
  flex: 1;
  width: 100%;
  border: none;
  background: #fff;
}

@media (max-width: 768px) {
  .fmo-preview-dialog {
    width: 92vw;
    max-width: 92vw;
    height: 75vh;
    max-height: 85vh;
  }
}

/* 响应式文案：桌面端显示完整文案，移动端显示精简文案 */
.text-mobile {
  display: none;
}

/* 移动端优化 */
@media (max-width: 768px) {
  :global(.native-ios .settings-view) {
    width: 100vw;
    max-width: 100vw;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    overflow-x: hidden;
  }

  :global(.native-ios .settings-content) {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    overflow-x: hidden;
  }

  :global(.native-ios .dialog-overlay) {
    width: 100vw;
    max-width: 100vw;
    overflow-x: hidden;
    padding: 0 0.75rem;
    box-sizing: border-box;
  }

  :global(.native-ios .dialog) {
    width: 100%;
    max-width: calc(100vw - 1.5rem);
  }

  :global(.native-ios .dialog-body),
  :global(.native-ios .dialog-footer) {
    padding-left: 1rem;
    padding-right: 1rem;
  }

  :global(.native-ios .form-row) {
    min-width: 0;
  }

  :global(.native-ios .form-input-flex) {
    width: 100%;
    min-width: 0;
  }

  .text-desktop {
    display: none;
  }

  .text-mobile {
    display: inline;
  }

  .setting-item {
    gap: 0.4rem;
    flex-wrap: wrap;
    align-items: flex-start;
  }

  .setting-label {
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .setting-actions {
    gap: 0.3rem;
    flex: 1 1 auto;
  }

  .btn-text-danger {
    padding: 0.3rem 0.4rem;
    font-size: 0.78rem;
  }

  .btn-add {
    padding: 0.3rem 0.5rem;
    font-size: 0.78rem;
  }

  .address-card {
    padding: 0.6rem 0.75rem;
  }

  .address-info {
    flex: 1;
    min-width: 0;
    margin-right: 0.25rem;
  }

  .address-url {
    font-size: 0.75rem;
  }

  .address-actions {
    margin-left: 0.25rem;
    gap: 0.15rem;
  }

  .btn-icon {
    padding: 0.3rem;
  }

  .btn-icon svg {
    width: 14px;
    height: 14px;
  }

  .voice-test-control {
    grid-template-columns: minmax(0, 1fr);
  }

  .voice-test-btn {
    width: 100%;
  }

  .address-name {
    font-size: 0.9rem;
  }

  .user-callsign,
  .user-uid {
    font-size: 0.7rem;
    padding: 0.05rem 0.3rem;
  }
}

/* ========== 多选同步开关样式 ========== */
.multi-select-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-right: 0.5rem;
}

.toggle-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: nowrap;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 40px;
  height: 22px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-primary);
  border-radius: 22px;
  transition: all 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-primary);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(18px);
}

.toggle-switch input:focus + .toggle-slider {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

/* ========== 地址卡片多选样式 ========== */
.address-checkbox-round {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  width: 28px;
  height: 28px;
}

.address-checkbox-round input[type='checkbox'] {
  display: none;
}

.checkbox-circle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid var(--text-tertiary);
  display: inline-block;
  transition: all 0.15s ease;
  position: relative;
}

.address-checkbox-round input[type='checkbox']:checked + .checkbox-circle {
  border-color: var(--color-primary);
  background: transparent;
}

.address-checkbox-round input[type='checkbox']:checked + .checkbox-circle::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-primary);
  transform: translate(-50%, -50%);
}

.address-card.selected {
  border-color: var(--color-primary);
  background: rgba(64, 158, 255, 0.12);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.primary-badge {
  display: inline-block;
  font-size: 0.65rem;
  padding: 0.1rem 0.35rem;
  margin-left: 0.4rem;
  background: var(--color-primary);
  color: white;
  border-radius: 3px;
  font-weight: 500;
  vertical-align: middle;
}

/* 服务器数字 ID 标签样式 - 与 user-uid 同款绿色 */
.server-id-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.15rem;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success);
  line-height: 1;
  margin-right: 0.4rem;
  vertical-align: middle;
  min-width: 1.2rem;
  min-height: 1.2rem;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .multi-select-toggle {
    gap: 0.3rem;
  }

  .toggle-label {
    font-size: 0.8rem;
  }

  .toggle-switch {
    width: 36px;
    height: 20px;
  }

  .toggle-slider::before {
    height: 14px;
    width: 14px;
    left: 3px;
    bottom: 3px;
  }

  .toggle-switch input:checked + .toggle-slider::before {
    transform: translateX(16px);
  }

  .primary-badge {
    font-size: 0.6rem;
    padding: 0.05rem 0.25rem;
  }
}
</style>
