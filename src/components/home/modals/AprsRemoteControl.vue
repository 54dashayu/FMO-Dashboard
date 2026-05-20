<template>
  <div class="aprs-control">
    <!-- 服务器配置（Android 原生分支下隐藏，使用内置 APRS-IS 直连） -->
    <div v-if="!isNativeAprs" class="server-config-section">
      <div class="section-header">
        <div class="section-label-with-status">
          <span class="section-label">远程控制服务器</span>
          <span
            class="connection-status"
            :class="{
              'status-connected': wsConnected,
              'status-disconnected': !wsConnected && !wsConnecting,
              'status-connecting': wsConnecting
            }"
            :title="statusMessage"
          ></span>
        </div>
        <button class="btn-add-server" @click="showAddServerDialog = true">+ 添加</button>
      </div>

      <div class="server-selector">
        <div class="server-dropdown">
          <select
            id="server-select"
            v-model="activeServerId"
            class="server-select"
            @change="handleServerChange"
          >
            <option v-for="server in serverList" :key="server.id" :value="server.id">
              {{ server.url }}
            </option>
          </select>
          <div class="server-actions">
            <button
              v-if="!currentServerIsDefault"
              class="btn-icon"
              title="编辑"
              @click="editCurrentServer"
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path
                  d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
                />
              </svg>
            </button>
            <button
              v-if="!currentServerIsDefault"
              class="btn-icon btn-icon-danger"
              title="删除"
              @click="deleteCurrentServer"
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
    </div>

    <!-- 表单 -->
    <div class="aprs-form">
      <!-- 呼号 -->
      <div class="form-group" :class="{ 'form-group-full': !advancedMode }">
        <label class="form-label">呼号</label>
        <div class="callsign-input">
          <CallsignInput
            id="callsign-base"
            v-model="callsignBase"
            placeholder="如 BG5ESN"
            class="form-input callsign-base"
            @input="onCallsignChange"
          />
        </div>
      </div>

      <!-- FMO呼号（高级选项） -->
      <div v-if="advancedMode" class="form-group form-group-fmo-callsign">
        <label class="form-label">FMO呼号</label>
        <div class="callsign-input">
          <CallsignInput
            id="fmo-callsign-base"
            v-model="fmoCallsignBase"
            placeholder="如 BH5HSJ（默认与呼号相同）"
            class="form-input"
            @input="onFmoCallsignChange"
          />
        </div>
      </div>

      <!-- 控制尾缀 -->
      <div class="form-group form-group-ssid">
        <label class="form-label">控制尾缀</label>
        <select
          id="control-ssid"
          v-model="controlSsid"
          class="form-input ssid-select"
          @change="onCallsignChange"
        >
          <option v-for="n in 16" :key="n - 1" :value="n - 1" :disabled="n - 1 === fmoSsid">
            {{ n - 1 }}
          </option>
        </select>
      </div>

      <!-- FMO尾缀 -->
      <div class="form-group form-group-ssid">
        <label class="form-label">FMO尾缀</label>
        <select
          id="fmo-ssid"
          v-model="fmoSsid"
          class="form-input ssid-select"
          @change="onFmoSsidChange"
        >
          <option v-for="n in 16" :key="n - 1" :value="n - 1">{{ n - 1 }}</option>
        </select>
      </div>

      <!-- APRS密钥 -->
      <div class="form-group form-group-password">
        <label class="form-label">APRS密钥</label>
        <div class="password-input-wrapper">
          <input
            id="aprs-passcode"
            v-model="passcode"
            :type="showPasscode ? 'text' : 'password'"
            placeholder="5位数字"
            class="form-input"
            @input="saveCurrentParams"
          />
          <button type="button" class="password-toggle" @click="showPasscode = !showPasscode">
            <svg
              v-if="!showPasscode"
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="currentColor"
            >
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 设备密钥 -->
      <div class="form-group form-group-password">
        <label class="form-label">设备密钥</label>
        <div class="password-input-wrapper">
          <input
            id="device-secret"
            v-model="secret"
            :type="showSecret ? 'text' : 'password'"
            placeholder="在设备配置中设置的密钥"
            class="form-input"
            @input="saveCurrentParams"
          />
          <button type="button" class="password-toggle" @click="showSecret = !showSecret">
            <svg v-if="!showSecret" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
              />
            </svg>
            <svg v-else viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path
                d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- 高级选项 -->
      <div class="form-group form-group-full advanced-option">
        <label class="form-checkbox">
          <input
            id="advanced-mode"
            v-model="advancedMode"
            type="checkbox"
            @change="onAdvancedModeChange"
          />
          <span>高级选项（允许设置不同的FMO呼号）</span>
        </label>
      </div>
    </div>

    <!-- 控制按钮 -->
    <div class="aprs-buttons">
      <button
        class="btn-control btn-normal"
        :disabled="!canSend"
        @click="handleSendCommand('NORMAL')"
      >
        普通模式
      </button>
      <button
        class="btn-control btn-standby"
        :disabled="!canSend"
        @click="handleSendCommand('STANDBY')"
      >
        待机模式
      </button>
      <button class="btn-control btn-reboot" :disabled="!canSend" @click="handleRebootCommand">
        软重启
      </button>
    </div>

    <!-- 历史记录 -->
    <div v-if="history.length > 0" class="aprs-history">
      <div class="history-header">
        <span>操作记录</span>
        <button class="btn-text-danger" @click="clearHistory">清空</button>
      </div>
      <div class="timeline">
        <div v-for="(item, index) in history" :key="index" class="timeline-item">
          <div
            class="timeline-dot"
            :class="{
              'timeline-dot-send': item.operationType === 'send',
              'timeline-dot-success': item.operationType === 'success',
              'timeline-dot-fail': item.operationType === 'fail'
            }"
          ></div>
          <div v-if="index < history.length - 1" class="timeline-line"></div>
          <div class="timeline-content">
            <div class="timeline-message">{{ formatMessage(item.message) }}</div>
            <div class="timeline-time">{{ formatHistoryTime(item.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- 添加/编辑服务器弹窗 -->
  <div
    v-if="showAddServerDialog || showEditServerDialog"
    class="dialog-overlay"
    @click.self="closeServerDialog"
  >
    <div class="dialog">
      <div class="dialog-header">
        <span class="dialog-title">{{ showEditServerDialog ? '编辑服务器' : '添加服务器' }}</span>
        <button class="close-btn" @click="closeServerDialog">&times;</button>
      </div>
      <div class="dialog-body">
        <div class="form-group">
          <label class="form-label">服务器地址</label>
          <input
            id="server-url"
            v-model="serverFormData.url"
            type="text"
            placeholder="ws://your-server:8090/api/ws"
            class="form-input"
          />
        </div>
        <div v-if="serverFormError" class="form-error">
          {{ serverFormError }}
        </div>
      </div>
      <div class="dialog-footer">
        <button class="btn-secondary" @click="closeServerDialog">取消</button>
        <button class="btn-primary" @click="submitServerForm">
          {{ showEditServerDialog ? '保存' : '添加' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { getPlatform } from '../../../platform'
import { useAprsStore } from '../../../stores/aprsStore'
import confirmDialog from '../../../composables/useConfirm'
import { useModalBackHandler, registerModal } from '../../../composables/useModalBackHandler'
import CallsignInput from '../../common/CallsignInput.vue'

// 原生 APRS 直连模式：隐藏服务器列表/添加/编辑/删除等中转相关 UI
const isNativeAprs = getPlatform().capabilities.hasNativeAprs

const props = defineProps({
  activeAddressId: {
    type: String,
    default: null
  },
  addressList: {
    type: Array,
    default: () => []
  }
})

const aprsStore = useAprsStore()

// 提取响应式 state/getters（保持响应性）
const {
  wsConnected,
  wsConnecting,
  statusMessage,
  history,
  canSend,
  mycall,
  passcode,
  secret,
  tocall,
  serverList,
  activeServerId
} = storeToRefs(aprsStore)

// actions 直接从 store 拿（不需要响应性）
const {
  init,
  disconnectWebSocket,
  sendCommand,
  clearHistory,
  addServer,
  deleteServer,
  updateServer,
  selectServer,
  saveCurrentParams
} = aprsStore

// 呼号和尾缀
const callsignBase = ref('')
const controlSsid = ref(7) // 控制尾缀（mycall），默认为7
const fmoSsid = ref(0) // FMO尾缀（tocall），默认为0

// 高级选项
const advancedMode = ref(false)
const fmoCallsignBase = ref('') // FMO呼号基础（高级模式下使用）

// 密码显示状态
const showPasscode = ref(false)
const showSecret = ref(false)

// 监听当前激活地址的呼号变化，自动填充
const currentAddressCallsign = computed(() => {
  if (!props.activeAddressId || !props.addressList?.length) return ''
  const activeAddr = props.addressList.find((a) => a.id === props.activeAddressId)
  return activeAddr?.userInfo?.callsign || ''
})

// 监听地址变化，自动更新呼号
// 注意：不使用 immediate，避免在组件初始化时干扰数据加载
watch(
  currentAddressCallsign,
  (newCallsign) => {
    if (newCallsign) {
      // 解析呼号（可能带有 SSID）
      const parts = newCallsign.toUpperCase().split('-')
      callsignBase.value = parts[0] || ''

      // 如果地址带有尾缀，使用地址的尾缀
      if (parts.length >= 2) {
        const ssid = parseInt(parts[1], 10)
        if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
          controlSsid.value = ssid
        }
      }
      // 如果地址不带尾缀，保持当前的尾缀设置

      // 触发呼号变化处理，更新 mycall 和 tocall
      onCallsignChange()
    }
    // 注意：当 newCallsign 为空时，不清空 callsignBase
    // 保留之前加载的数据或用户输入的数据
  }
  // 移除 immediate: true，让初始化逻辑在 onMounted 中完成
)

// 组件初始化时加载参数并测试服务器连接
onMounted(() => {
  // 初始化（加载保存的参数和服务器列表）
  const params = init()

  // 先从保存的数据中恢复尾缀（如果有的话）
  if (params && mycall.value) {
    const mycallParts = mycall.value.split('-')
    if (mycallParts.length >= 2) {
      const ssid = parseInt(mycallParts[1], 10)
      if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
        controlSsid.value = ssid
      }
    }
  }

  if (params && tocall.value) {
    const tocallParts = tocall.value.split('-')
    if (tocallParts.length >= 2) {
      const ssid = parseInt(tocallParts[1], 10)
      if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
        fmoSsid.value = ssid
      }
    }
  }

  // 优先从当前地址获取呼号
  if (currentAddressCallsign.value) {
    // 从地址获取呼号（可能带尾缀）
    const parts = currentAddressCallsign.value.toUpperCase().split('-')
    callsignBase.value = parts[0] || ''

    // 如果地址提供了尾缀，覆盖之前恢复的尾缀
    if (parts.length >= 2) {
      const ssid = parseInt(parts[1], 10)
      if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
        controlSsid.value = ssid
      }
    }
    // 如果地址不带尾缀，保持从 localStorage 恢复的尾缀

    // 构造 mycall 和 tocall 并保存
    updateCallsigns()
  } else if (params && mycall.value) {
    // 没有当前地址，从保存的数据恢复界面状态
    parseCallsignsFromStorage()
  }

  // 测试当前选择的服务器连接
  setTimeout(() => {
    selectServer(activeServerId.value)
  }, 100)
})

// 从保存的 mycall/tocall 解析界面状态
function parseCallsignsFromStorage() {
  // 解析 mycall
  if (mycall.value) {
    const parts = mycall.value.split('-')
    if (parts.length >= 1) {
      callsignBase.value = parts[0]
    }
    if (parts.length >= 2) {
      const ssid = parseInt(parts[1], 10)
      if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
        controlSsid.value = ssid
      }
    }
  }

  // 解析 tocall
  if (tocall.value) {
    const parts = tocall.value.split('-')
    if (parts.length >= 2) {
      const ssid = parseInt(parts[1], 10)
      if (!isNaN(ssid) && ssid >= 0 && ssid <= 15) {
        fmoSsid.value = ssid
      }
    }
    // 判断是否为高级模式
    if (parts.length >= 1 && callsignBase.value && parts[0] !== callsignBase.value) {
      fmoCallsignBase.value = parts[0]
      advancedMode.value = true
    }
  }
}

// 根据界面状态更新 mycall 和 tocall
function updateCallsigns() {
  if (callsignBase.value) {
    mycall.value = `${callsignBase.value.toUpperCase()}-${controlSsid.value}`

    if (!advancedMode.value || !fmoCallsignBase.value) {
      tocall.value = `${callsignBase.value.toUpperCase()}-${fmoSsid.value}`
    } else {
      tocall.value = `${fmoCallsignBase.value.toUpperCase()}-${fmoSsid.value}`
    }
  } else {
    mycall.value = ''
    tocall.value = ''
  }

  // 保存到 localStorage
  saveCurrentParams()
}

// 呼号或尾缀变化时，更新 composable 中的值
function onCallsignChange() {
  updateCallsigns()
}

// FMO呼号变化时
function onFmoCallsignChange() {
  updateCallsigns()
}

// 高级模式切换
function onAdvancedModeChange() {
  if (!advancedMode.value) {
    // 关闭高级模式时，清空FMO呼号并重置为相同
    fmoCallsignBase.value = ''
    onCallsignChange()
  } else {
    // 开启高级模式时，如果FMO呼号为空，默认使用控制呼号
    if (!fmoCallsignBase.value && callsignBase.value) {
      fmoCallsignBase.value = callsignBase.value
      onFmoCallsignChange()
    }
  }
}

// FMO尾缀变化时，如果与控制尾缀冲突，自动调整控制尾缀
function onFmoSsidChange() {
  if (controlSsid.value === fmoSsid.value) {
    // 找到第一个不与FMO尾缀冲突的值
    for (let i = 0; i < 16; i++) {
      if (i !== fmoSsid.value) {
        controlSsid.value = i
        break
      }
    }
  }
  onCallsignChange()
}

// ========== 服务器管理 ==========

// 服务器弹窗状态
const showAddServerDialog = ref(false)
const showEditServerDialog = ref(false)

// ---- 弹框返回键拦截 ----
useModalBackHandler([showAddServerDialog, showEditServerDialog])

const _unregServerDialog = registerModal(
  () => showAddServerDialog.value || showEditServerDialog.value,
  () => closeServerDialog(),
  50
)
const editingServerId = ref(null)
const serverFormData = ref({ url: '' })
const serverFormError = ref('')

// 当前选中的服务器是否为默认服务器
const currentServerIsDefault = computed(() => {
  const server = serverList.value.find((s) => s.id === activeServerId.value)
  return server?.isDefault || false
})

// 服务器切换
function handleServerChange() {
  selectServer(activeServerId.value)
}

// 编辑当前服务器
function editCurrentServer() {
  const server = serverList.value.find((s) => s.id === activeServerId.value)
  if (server && !server.isDefault) {
    editingServerId.value = server.id
    serverFormData.value = {
      url: server.url
    }
    showEditServerDialog.value = true
  }
}

// 删除当前服务器
async function deleteCurrentServer() {
  const server = serverList.value.find((s) => s.id === activeServerId.value)
  if (server && !server.isDefault) {
    const confirmed = await confirmDialog.show(`确定要删除服务器"${server.url}"吗？`)
    if (confirmed) {
      deleteServer(server.id)
    }
  }
}

// 提交服务器表单
function submitServerForm() {
  const { url } = serverFormData.value

  if (!url.trim()) {
    serverFormError.value = '请输入服务器地址'
    return
  }

  // 简单的URL格式验证
  if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
    serverFormError.value = '服务器地址必须以 ws:// 或 wss:// 开头'
    return
  }

  if (showEditServerDialog.value) {
    // 编辑模式
    updateServer(editingServerId.value, '', url.trim())
  } else {
    // 添加模式
    const newId = addServer('', url.trim())
    // 自动切换到新添加的服务器
    selectServer(newId)
  }

  closeServerDialog()
}

// 关闭服务器弹窗
function closeServerDialog() {
  showAddServerDialog.value = false
  showEditServerDialog.value = false
  editingServerId.value = null
  serverFormData.value = { url: '' }
  serverFormError.value = ''
}

// ========== 呼号管理 ==========

// 发送指令
function handleSendCommand(action) {
  // 发送前确保呼号格式正确
  onCallsignChange()
  sendCommand(action)
}

// 处理软重启指令（需要二次确认）
async function handleRebootCommand() {
  const confirmed = await confirmDialog.show(
    '确定要执行软重启操作吗？\n\n此操作将重启设备，可能会中断当前的通信。',
    '确认软重启'
  )

  if (confirmed) {
    handleSendCommand('REBOOT')
  }
}

// 格式化时间
function formatHistoryTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatMessage(message) {
  if (!message) return ''
  return message
    .replace(/\(NORMAL\)/g, '(普通模式)')
    .replace(/\(STANDBY\)/g, '(待机模式)')
    .replace(/\(REBOOT\)/g, '(软重启)')
    .replace(/NORMAL/g, '普通模式')
    .replace(/STANDBY/g, '待机模式')
    .replace(/REBOOT/g, '软重启')
}

// 组件卸载时断开连接
onUnmounted(() => {
  disconnectWebSocket()
  _unregServerDialog()
})
</script>

<style scoped>
.aprs-control {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 0;
}

/* 服务器配置区域 */
.server-config-section {
  margin-bottom: 1rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.section-label-with-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.connection-status {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  transition: all 0.3s;
}

.connection-status.status-connected {
  background: var(--color-success);
  box-shadow: 0 0 6px var(--color-success);
}

.connection-status.status-disconnected {
  background: var(--text-disabled);
}

.connection-status.status-connecting {
  background: var(--color-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.btn-add-server {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
  background: var(--bg-container);
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-server:hover {
  background: var(--color-primary);
  color: var(--text-white);
}

.server-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.server-dropdown {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.server-select {
  flex: 1;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: border-color 0.2s;
}

.server-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.server-actions {
  display: flex;
  gap: 0.25rem;
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

/* 表单样式 */
.aprs-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

/* 占据整行的表单项 */
.form-group-full {
  grid-column: 1 / -1;
}

/* 高级选项样式 */
.advanced-option {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--border-light);
}

@media (max-width: 600px) {
  .aprs-form {
    grid-template-columns: 1fr 1fr;
  }

  /* 手机端:呼号、FMO呼号、密钥字段、高级选项 占据整行 */
  .form-group:first-child,
  .form-group-fmo-callsign,
  .form-group-password,
  .advanced-option {
    grid-column: 1 / -1;
  }
}

.aprs-form .form-group {
  margin-bottom: 0;
}

.form-group {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 1rem;
}

/* 输入框容器占据剩余空间 */
.form-group .form-input,
.form-group .callsign-input,
.form-group .password-input-wrapper {
  flex: 1;
  min-width: 0;
}

.form-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  min-width: 80px;
}

/* 复选框样式 */
.form-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text-secondary);
  user-select: none;
}

.form-checkbox input[type='checkbox'] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.form-checkbox:hover {
  color: var(--text-primary);
}

.callsign-input {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.callsign-input .form-input.callsign-base {
  flex: 1;
  min-width: 0;
  width: auto;
}

/* 密码输入框包装器 */
.password-input-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

.password-input-wrapper .form-input {
  padding-right: 2.5rem;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  padding: 0.35rem;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-toggle:hover {
  color: var(--color-primary);
}

.form-input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  background: var(--bg-disabled);
}

.form-input::placeholder {
  color: var(--text-disabled);
}

.ssid-select {
  text-align: center;
  padding: 0.6rem 0.5rem;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 14px;
  cursor: pointer;
}

/* 控制按钮 */
.aprs-buttons {
  display: flex;
  gap: 0.75rem;
  justify-content: center;
  padding: 0.5rem 0;
}

.btn-control {
  flex: 1;
  max-width: 140px;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  font-weight: 500;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
  background: var(--bg-container);
  color: var(--text-primary);
}

.btn-control:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-control:not(:disabled):hover {
  border-color: var(--color-primary);
  background: var(--bg-table-hover);
  color: var(--color-primary);
}

/* 重启按钮保持危险色 */
.btn-reboot {
  color: var(--color-danger);
  border-color: var(--color-danger);
}

.btn-reboot:not(:disabled):hover {
  background: var(--bg-error-light);
  border-color: var(--color-danger);
  color: var(--color-danger);
}

/* 历史记录 */
.aprs-history {
  margin-top: 0.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-light);
}

.btn-text-danger {
  background: none;
  border: none;
  color: var(--color-danger);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  transition: all 0.2s;
}

.btn-text-danger:hover {
  color: var(--color-danger-hover);
  text-decoration: underline;
}

/* 时间轴样式 */
.timeline {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem 0;
  min-height: 100px;
}

.timeline-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding-left: 0.5rem;
}

.timeline-item:last-child {
  margin-bottom: 0;
}

/* 时间轴点 */
.timeline-dot {
  position: relative;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 2;
  margin-top: 4px;
  border: 2px solid var(--bg-card);
}

/* 发送操作 - 蓝色 */
.timeline-dot-send {
  background-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

/* 成功 - 绿色 */
.timeline-dot-success {
  background-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2);
}

/* 失败 - 红色 */
.timeline-dot-fail {
  background-color: #ef4444;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

/* 时间轴连线 */
.timeline-line {
  position: absolute;
  left: calc(0.5rem + 5px);
  top: 20px;
  bottom: -24px;
  width: 2px;
  background-color: var(--border-secondary);
  z-index: 1;
}

/* 时间轴内容 */
.timeline-content {
  flex: 1;
  min-width: 0;
  padding: 0.5rem 0.75rem;
  background: var(--bg-card);
  border-radius: 6px;
  border: 1px solid var(--border-secondary);
  transition: all 0.2s;
}

.timeline-content:hover {
  background: var(--bg-table-hover);
  border-color: var(--border-primary);
}

.timeline-message {
  font-size: 0.85rem;
  color: var(--text-primary);
  line-height: 1.5;
  word-break: break-word;
  margin-bottom: 0.25rem;
}

.timeline-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: 'Intel One Mono', monospace;
}

/* 弹窗样式 */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
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

.form-error {
  margin-top: 0.75rem;
  padding: 0.6rem;
  background-color: var(--bg-error-light);
  border: 1px solid var(--color-danger);
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

.btn-secondary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: var(--bg-container);
  color: var(--text-secondary);
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-table-hover);
}

.btn-primary {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  background: var(--color-primary);
  color: var(--text-white);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  background: var(--color-primary-hover);
}
</style>
