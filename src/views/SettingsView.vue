<template>
  <div class="settings-view">
    <div class="settings-content">
      <!-- 设置 -->
      <div class="tab-content">
        <!-- FMO地址管理 -->
        <div class="setting-group">
          <div class="setting-item">
            <span class="setting-label">FMO地址</span>
            <div class="setting-actions">
              <!-- 多选同步开关 -->
              <div v-if="addressList.length > 0" class="multi-select-toggle">
                <span class="toggle-label">多选同步</span>
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
                <span class="text-desktop">清空FMO地址</span>
                <span class="text-mobile">清空</span>
              </button>
              <button class="btn-add" @click="showAddForm">
                <span class="text-desktop">+ 添加地址</span>
                <span class="text-mobile">添加</span>
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
                  <span v-if="multiSelectMode && addr.id === activeAddressId" class="primary-badge"
                    >主服务器</span
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
                  title="设为主服务器"
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
                  title="刷新用户信息"
                  :disabled="refreshingId === addr.id"
                  @click="handleRefreshUserInfo(addr.id)"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
                    />
                  </svg>
                </button>
                <button class="btn-icon" title="打开FMO页面" @click="openFmoPage(addr)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                    />
                  </svg>
                </button>
                <button class="btn-icon" title="编辑" @click="editAddress(addr)">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path
                      d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                    />
                  </svg>
                </button>
                <button
                  class="btn-icon btn-icon-danger"
                  title="删除"
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
            <p>暂无FMO地址，点击上方"添加地址"按钮添加</p>
          </div>

          <!-- 操作按钮 -->
          <div v-if="addressList.length > 0" class="setting-item-buttons">
            <select
              id="sync-days"
              v-model.number="syncDays"
              class="sync-days-select"
              :disabled="syncing"
            >
              <option :value="1">今天</option>
              <option :value="3">最近3天</option>
              <option :value="7">最近7天</option>
              <option :value="30">最近30天</option>
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
              备份FMO日志
            </button>
          </div>
          <div v-if="syncStatus" class="sync-status">
            {{ syncStatus }}
          </div>
        </div>

        <!-- 播放设置 -->
        <div class="setting-group-audio">
          <div class="setting-group-title">播放设置</div>
          <div class="setting-item">
            <label class="setting-label-normal">播放音量</label>
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
        </div>

        <!-- 数据管理 -->
        <div class="setting-group-data">
          <div class="setting-item-data-header">
            <span class="setting-label">数据管理</span>
          </div>
          <div class="setting-item-data-row">
            <button class="btn-primary btn-full" @click="$emit('select-files')">导入FMO日志</button>
          </div>
          <div class="setting-item-data-row">
            <button class="btn-secondary" :disabled="!dbLoaded" @click="$emit('export-data')">
              导出数据库文件
            </button>
            <button class="btn-secondary" :disabled="!dbLoaded" @click="$emit('export-adif')">
              导出ADIF
            </button>
          </div>
          <div v-if="dbLoaded" class="setting-item-data-clear">
            <div class="data-clear-info">
              <span class="data-clear-warning">此操作将永久删除所有本地通联日志，不可恢复！</span>
              <button class="btn-danger" @click="$emit('clear-all-data')">清空通联日志</button>
            </div>
          </div>
          <div class="setting-item-data-clear setting-item-data-clear-mt">
            <div class="grid-cache-info">
              <span class="grid-cache-desc">清理网格地址本地缓存，下次查询将重新请求远程接口</span>
              <button class="btn-secondary" @click="handleClearGridCache">清理地址缓存</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 地址编辑弹框 -->
    <div v-if="showAddressDialog" class="dialog-overlay" @click.self="cancelAddressDialog">
      <div class="dialog">
        <div class="dialog-header">
          <span class="dialog-title">{{ editingId ? '编辑地址' : '添加地址' }}</span>
          <button class="close-btn" @click="cancelAddressDialog">&times;</button>
        </div>
        <div class="dialog-body">
          <div class="form-group">
            <label class="form-label">名称（可选）</label>
            <input
              id="address-name"
              v-model="formData.name"
              type="text"
              placeholder="如：家里的FMO"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label class="form-label">地址</label>
            <div class="form-row">
              <select id="address-protocol" v-model="formData.protocol" class="protocol-select">
                <option value="ws">ws://</option>
                <option value="wss">wss://</option>
              </select>
              <input
                id="address-host"
                v-model="formData.host"
                type="text"
                :placeholder="isMobileDevice ? '输入设备IP' : '输入设备IP或域名(fmo.local)'"
                class="form-input-flex"
              />
            </div>
          </div>
          <div v-if="!isMobileDevice" class="form-hint">
            支持mDNS服务，可直接输入 <code>fmo.local</code> 连接设备
          </div>
          <div v-if="formError" class="form-error">
            {{ formError }}
          </div>
        </div>
        <div class="dialog-footer">
          <button class="btn-secondary" :disabled="formValidating" @click="cancelAddressDialog">
            取消
          </button>
          <button class="btn-primary" :disabled="formValidating" @click="submitAddressForm">
            {{ formValidating ? '验证中...' : '确定' }}
          </button>
        </div>
      </div>
    </div>
    <!-- FMO 页面预览弹框 -->
    <div v-if="showFmoPreview" class="dialog-overlay" @click.self="closeFmoPreview">
      <div class="fmo-preview-dialog">
        <div class="fmo-preview-toolbar">
          <button class="btn-icon" title="上一页" @click="fmoPreviewGoBack">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z" />
            </svg>
          </button>
          <div class="fmo-preview-toolbar-spacer"></div>
          <button class="btn-icon" title="在浏览器中打开" @click="openFmoExternal">
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
import { ref, computed, onUnmounted } from 'vue'
import { normalizeHost } from '../utils/urlUtils'
import confirmDialog from '../composables/useConfirm'
import { clearGridCache } from '../services/gridService'
import { useModalBackHandler, registerModal } from '../composables/useModalBackHandler'

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
      return `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`
    }
    return '正在同步...'
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return `同步已选地址(${props.selectedAddressIds.length})`
  }
  return syncDays.value === 1 ? '同步今日通联' : `同步${syncDays.value}天通联`
})

const getSyncIncrementalButtonText = computed(() => {
  if (props.syncing) {
    if (
      props.multiSelectMode &&
      props.selectedAddressIds.length > 1 &&
      props.multiSyncProgress.total > 0
    ) {
      return `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`
    }
    return '正在同步...'
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return `增量同步已选(${props.selectedAddressIds.length})`
  }
  return '增量同步'
})

const getSyncFullButtonText = computed(() => {
  if (props.syncing) {
    if (
      props.multiSelectMode &&
      props.selectedAddressIds.length > 1 &&
      props.multiSyncProgress.total > 0
    ) {
      return `正在同步 ${props.multiSyncProgress.current}/${props.multiSyncProgress.total}...`
    }
    return '正在同步...'
  }
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    return `全量同步已选(${props.selectedAddressIds.length})`
  }
  return '全量同步'
})

// 验证WebSocket连接
async function validateConnection(host, proto) {
  const wsUrl = `${proto}://${normalizeHost(host)}/ws`

  return new Promise((resolve) => {
    let socket
    try {
      socket = new WebSocket(wsUrl)
    } catch {
      resolve(false)
      return
    }

    const timeout = setTimeout(() => {
      socket.close()
      resolve(false)
    }, 5000)

    socket.onopen = () => {
      clearTimeout(timeout)
      socket.close()
      resolve(true)
    }

    socket.onerror = () => {
      clearTimeout(timeout)
      socket.close()
      resolve(false)
    }

    socket.onclose = () => {
      clearTimeout(timeout)
      resolve(false)
    }
  })
}

function showAddForm() {
  editingId.value = null
  formData.value = {
    name: '',
    host: isMobileDevice.value ? '' : 'fmo.local',
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
    protocol: addr.protocol
  }
  formError.value = ''
  showAddressDialog.value = true
}

function cancelAddressDialog() {
  showAddressDialog.value = false
  editingId.value = null
  formData.value = { name: '', host: '', protocol: 'ws' }
  formError.value = ''
}

async function submitAddressForm() {
  const { name, host, protocol } = formData.value

  if (!host.trim()) {
    formError.value = '请输入地址'
    return
  }

  formError.value = ''
  formValidating.value = true

  // 验证连接
  const isConnected = await validateConnection(host.trim(), protocol)

  formValidating.value = false

  if (!isConnected) {
    formError.value = '连接失败，请检查地址'
    return
  }

  // 连接成功，保存地址
  if (editingId.value) {
    emit('update-address', {
      id: editingId.value,
      name: name.trim() || host.trim(),
      host: host.trim(),
      protocol
    })
  } else {
    emit('add-address', {
      name: name.trim() || host.trim(),
      host: host.trim(),
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
    } catch (err) {
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
  const confirmed = await confirmDialog.show('确定要删除这个地址吗？')
  if (confirmed) {
    emit('delete-address', id)
  }
}

async function handleClearAllAddresses() {
  const confirmed = await confirmDialog.show('确定要清除全部FMO地址吗？')
  if (confirmed) {
    emit('clear-all-addresses')
  }
}

async function handleClearGridCache() {
  const confirmed = await confirmDialog.show('确定要清理网格地址本地缓存吗？')
  if (confirmed) {
    try {
      await clearGridCache()
      confirmDialog.show('地址缓存已清理')
    } catch (err) {
      confirmDialog.show(`清理失败: ${err.message}`)
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
      `确定要同步选中的 ${props.selectedAddressIds.length} 个地址的最近${syncDays.value}天数据吗？`
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
      `确定要对选中的 ${props.selectedAddressIds.length} 个地址执行增量同步吗？将从各FMO服务器获取所有日志，并补充本地缺失的记录。`
    )
    if (confirmed) {
      emit('sync-multiple', { syncType: 'incremental', days: 1 })
    }
    return
  }
  // 单选模式
  const confirmed = await confirmDialog.show(
    '确定要执行增量同步吗？将从FMO服务器获取所有日志，并补充本地缺失的记录。'
  )
  if (confirmed) {
    emit('sync-incremental')
  }
}

async function handleSyncFull() {
  // 多选模式且选中多个地址
  if (props.multiSelectMode && props.selectedAddressIds.length > 1) {
    const confirmed = await confirmDialog.show(
      `确定要对选中的 ${props.selectedAddressIds.length} 个地址执行全量同步吗？将用各FMO服务器的数据完全替换本地数据库中的所有记录。`
    )
    if (confirmed) {
      emit('sync-multiple', { syncType: 'full', days: 1 })
    }
    return
  }
  // 单选模式
  const confirmed = await confirmDialog.show(
    '确定要执行全量同步吗？将用FMO服务器的数据完全替换本地数据库中的所有记录。'
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
</script>

<style scoped>
.settings-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.settings-content {
  max-width: 800px;
  margin: 0 auto;
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

.setting-actions {
  display: flex;
  gap: 0.5rem;
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
  max-width: 90%;
  box-shadow: 0 4px 20px var(--shadow-modal);
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

.protocol-select {
  padding: 0.6rem 0.5rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-size: 0.9rem;
  background: var(--bg-input);
  color: var(--text-primary);
  cursor: pointer;
  min-width: 85px;
}

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
  .text-desktop {
    display: none;
  }

  .text-mobile {
    display: inline;
  }

  .setting-item {
    gap: 0.4rem;
  }

  .setting-label {
    font-size: 0.9rem;
    flex-shrink: 0;
  }

  .setting-actions {
    gap: 0.3rem;
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
