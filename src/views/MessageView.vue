<template>
  <div class="message-view">
    <!-- 主内容区 -->
    <div class="message-layout">
      <!-- 左侧：消息列表 -->
      <div class="message-list-section" :class="{ 'mobile-hidden': showDetail }">
        <!-- 发送消息按钮 -->
        <button class="btn-primary send-message-btn" @click="openSendModal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
          发送消息
        </button>

        <!-- 操作按钮组 -->
        <div class="action-buttons">
          <button class="btn-text refresh-btn" :disabled="loading" @click="refreshMessages">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
            刷新
          </button>
          <button
            v-if="messageList.length > 0"
            class="btn-text btn-danger"
            :disabled="deletingAll"
            @click="handleDeleteAll"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
            清空
          </button>
        </div>

        <!-- 消息列表 -->
        <div class="message-list-container">
          <div v-if="loading && messageList.length === 0" class="loading-state">
            <div class="spinner"></div>
            <span>加载中...</span>
          </div>

          <div v-else-if="messageList.length === 0" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path
                d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"
              />
            </svg>
            <p>暂无消息</p>
            <span class="empty-hint">点击上方按钮发送第一条消息</span>
          </div>

          <div v-else class="message-list">
            <div
              v-for="msg in messageList"
              :key="msg.messageId"
              class="message-item"
              :class="{
                unread: !msg.isRead,
                active: selectedMessageId === msg.messageId
              }"
              @click="selectMessage(msg)"
            >
              <div class="message-item-header">
                <div class="message-item-sender">
                  <span class="sender">{{ msg.from }}</span>
                  <span v-if="!msg.isRead" class="unread-indicator">未读</span>
                </div>
                <span v-if="!msg.message && !msg.preview" class="detail-tag">点击查看详情</span>
              </div>
              <div class="message-item-time">
                <span class="time">{{ formatTime(msg.timestamp) }}</span>
              </div>
            </div>

            <!-- 加载更多 -->
            <button
              class="load-more-btn"
              :class="{ 'no-more': !hasMore }"
              :disabled="loadingMore || !hasMore"
              @click="loadMore"
            >
              {{ loadingMore ? '加载中...' : hasMore ? '加载更多' : '没有更多消息了' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 右侧：消息详情 -->
      <div v-if="showDetail" class="message-detail-section">
        <div class="detail-header">
          <button class="back-btn" @click="closeDetail(true)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            返回列表
          </button>
          <button
            v-if="currentDetail && !currentDetail.isRead"
            class="btn-text"
            :disabled="markingRead"
            @click="markAsRead"
          >
            标记已读
          </button>
        </div>

        <div v-if="detailLoading" class="detail-loading">
          <div class="spinner"></div>
        </div>

        <div v-else-if="currentDetail" class="detail-content email-style">
          <!-- 邮件头部信息 -->
          <div class="email-header">
            <div class="email-subject-line">
              <span class="email-label">主题:</span>
              <span class="email-subject">消息来自 {{ currentDetail.from }}</span>
            </div>
            <div class="email-meta-line">
              <span class="email-label">来自:</span>
              <button class="email-sender-btn" @click="replyToSender">
                <span class="sender-name-highlight">{{ formatSender(currentDetail.from) }}</span>
                <span class="reply-hint">点击回复</span>
              </button>
            </div>
            <div class="email-meta-line">
              <span class="email-label">时间:</span>
              <span class="email-time">{{ formatDateTime(currentDetail.timestamp) }}</span>
            </div>
            <div v-if="currentDetail.to" class="email-meta-line">
              <span class="email-label">至:</span>
              <span class="email-recipient">{{ currentDetail.to }}</span>
            </div>
          </div>

          <!-- 邮件正文 -->
          <div class="email-body">
            <div class="email-message-content">
              {{ currentDetail.message }}
            </div>
          </div>

          <!-- 底部元信息和操作 -->
          <div class="email-footer">
            <div v-if="currentDetail.rig" class="footer-line">
              <span class="footer-label">设备:</span>
              <span class="footer-value">{{ currentDetail.rig }}</span>
            </div>
            <div v-if="currentDetail.path" class="footer-line">
              <span class="footer-label">路径:</span>
              <span class="footer-value">{{ currentDetail.path }}</span>
            </div>
            <div class="email-actions">
              <button
                class="btn-text btn-danger"
                :disabled="deletingId === currentDetail.messageId"
                @click="handleDeleteCurrentMessage"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path
                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                  />
                </svg>
                删除此消息
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 发送消息弹窗 -->
    <div v-if="showSendModal" class="modal-overlay" @click.self="closeSendModal">
      <div class="modal-content send-modal">
        <div class="modal-header">
          <h3>发送消息</h3>
          <button class="close-btn" @click="closeSendModal">&times;</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>目标呼号</label>
            <CallsignInput
              id="target-callsign"
              v-model="sendForm.callsign"
              placeholder="输入呼号 (如: BG1AAA)"
              maxlength="15"
            />
            <span v-if="callsignError" class="error-text">{{ callsignError }}</span>
          </div>

          <div class="form-group">
            <label>SSID</label>
            <select id="target-ssid" v-model="sendForm.ssid">
              <option v-for="n in 15" :key="n" :value="n">{{ n }}</option>
            </select>
          </div>

          <div class="form-group">
            <label>消息内容</label>
            <textarea
              id="message-content"
              v-model="sendForm.message"
              rows="4"
              placeholder="输入消息内容..."
              maxlength="500"
            ></textarea>
            <span class="char-count">{{ sendForm.message.length }}/500</span>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSendModal">取消</button>
          <button class="btn-primary" :disabled="!canSend || sending" @click="handleSend">
            <span v-if="sending" class="spinner-small"></span>
            <span v-else>发送</span>
          </button>
        </div>

        <!-- 发送结果提示 -->
        <div v-if="sendResult" class="send-result" :class="sendResult.type">
          {{ sendResult.message }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, inject } from 'vue'
import { getMessageService, validateCallsign, validateSSID } from '../services/messageService'
import toast from '../composables/useToast'
import confirmDialog from '../composables/useConfirm'
import { useModalBackHandler, registerModal } from '../composables/useModalBackHandler'
import CallsignInput from '../components/common/CallsignInput.vue'

// 注入父组件提供的状态
const fmoAddress = inject('fmoAddress', ref(''))
const protocol = inject('protocol', ref('http'))

// 消息服务
const messageService = getMessageService()

// 状态
const loading = ref(false)
const loadingMore = ref(false)
const detailLoading = ref(false)
const deletingId = ref(null)
const deletingAll = ref(false)
const markingRead = ref(false)
const selectedMessageId = ref(0)
const currentDetail = ref(null)
const showDetail = ref(false)
const showSendModal = ref(false)

// ---- 弹框返回键拦截 ----
useModalBackHandler([showSendModal])

const _unregSendModal = registerModal(
  () => showSendModal.value,
  () => closeSendModal(),
  50
)
const sending = ref(false)
const sendResult = ref(null)
const sendResultTimer = ref(null)

// 发送表单
const sendForm = ref({
  callsign: '',
  ssid: 1,
  message: ''
})
const callsignError = ref('')

// 计算属性
const messageList = computed(() => messageService.messageList.value)
const hasMore = computed(() => messageService.hasMore.value)

const canSend = computed(() => {
  return (
    sendForm.value.callsign.trim() &&
    sendForm.value.message.trim() &&
    validateCallsign(sendForm.value.callsign.toUpperCase())
  )
})

// 方法
function formatTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  return (
    date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  )
}

function formatDateTime(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  return date.toLocaleString('zh-CN')
}

async function selectMessage(msg) {
  selectedMessageId.value = msg.messageId
  showDetail.value = true
  openDetailState()
  detailLoading.value = true
  currentDetail.value = null

  try {
    const result = await messageService.getDetail(fmoAddress.value, protocol.value, msg.messageId)
    if (result.status === 'success' && result.messageId) {
      currentDetail.value = result
      // 自动标记已读 (注意 isRead 可能是数字 0/1)
      if (!result.isRead || result.isRead === 0) {
        await messageService.setRead(fmoAddress.value, protocol.value, msg.messageId)
      }
    } else {
      toast.error('获取消息详情失败')
    }
  } catch (err) {
    toast.error(`获取详情失败: ${err.message}`)
  } finally {
    detailLoading.value = false
  }
}

function closeDetail(manual = false) {
  if (manual && detailPushedState && isMobileLayout()) {
    closeDetailState()
    return
  }
  showDetail.value = false
  selectedMessageId.value = 0
  currentDetail.value = null
}

// 详情历史状态管理（仅用于移动端返回键关闭详情）
let detailPushedState = false

function isMobileLayout() {
  return window.innerWidth <= 768
}

function openDetailState() {
  if (!detailPushedState && isMobileLayout()) {
    history.pushState({ messageDetail: true }, '')
    detailPushedState = true
  }
}

function closeDetailState() {
  if (detailPushedState) {
    history.back()
    detailPushedState = false
  }
}

function handlePopState(event) {
  if (showDetail.value && isMobileLayout()) {
    event.stopImmediatePropagation()
    closeDetail()
    detailPushedState = false
  }
}

async function markAsRead() {
  if (!currentDetail.value) return

  markingRead.value = true
  try {
    const result = await messageService.setRead(
      fmoAddress.value,
      protocol.value,
      currentDetail.value.messageId
    )
    if (result.status === 'success') {
      currentDetail.value.isRead = true
      toast.success('已标记为已读')
    }
  } catch (err) {
    toast.error('标记失败')
  } finally {
    markingRead.value = false
  }
}

async function loadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    const nextAnchorId = messageService.nextAnchorId.value
    await messageService.getList(fmoAddress.value, protocol.value, nextAnchorId)
  } catch (err) {
    toast.error('加载更多失败')
  } finally {
    loadingMore.value = false
  }
}

async function refreshMessages() {
  if (loading.value) return

  loading.value = true
  try {
    await messageService.getList(fmoAddress.value, protocol.value, 0)
    toast.success('消息已刷新')
  } catch (err) {
    toast.error('刷新失败')
  } finally {
    loading.value = false
  }
}

async function handleDeleteItem(messageId) {
  const confirmed = await confirmDialog.show('确定要删除这条消息吗？')
  if (!confirmed) return

  deletingId.value = messageId
  try {
    const result = await messageService.deleteItem(fmoAddress.value, protocol.value, messageId)
    if (result.status === 'success') {
      toast.success('删除成功')
      if (selectedMessageId.value === messageId) {
        closeDetail()
      }
    } else {
      toast.error('删除失败')
    }
  } catch (err) {
    toast.error('删除失败')
  } finally {
    deletingId.value = null
  }
}

async function handleDeleteCurrentMessage() {
  if (!currentDetail.value) return
  await handleDeleteItem(currentDetail.value.messageId)
}

async function handleDeleteAll() {
  const confirmed = await confirmDialog.show('确定要清空所有消息吗？此操作不可恢复。')
  if (!confirmed) return

  deletingAll.value = true
  try {
    const result = await messageService.deleteAll(fmoAddress.value, protocol.value)
    if (result.status === 'success') {
      toast.success('已清空所有消息')
      closeDetail()
    } else {
      toast.error('清空失败')
    }
  } catch (err) {
    toast.error('清空失败')
  } finally {
    deletingAll.value = false
  }
}

// 发送消息
function openSendModal() {
  sendForm.value = { callsign: '', ssid: 1, message: '' }
  callsignError.value = ''
  sendResult.value = null
  showSendModal.value = true
}

function closeSendModal() {
  showSendModal.value = false
  if (sendResultTimer.value) {
    clearTimeout(sendResultTimer.value)
  }
}

function replyMessage() {
  if (!currentDetail.value) return
  replyToSender()
}

function replyToSender() {
  if (!currentDetail.value) return

  // 解析呼号和 SSID
  const from = currentDetail.value.from || ''
  const match = from.match(/^([A-Z0-9]+)(?:-(\d+))?$/)
  const callsign = match ? match[1] : from
  const ssid = match && match[2] ? parseInt(match[2], 10) : 0

  sendForm.value = {
    callsign: callsign,
    ssid: ssid,
    message: ''
  }
  callsignError.value = ''
  sendResult.value = null
  showSendModal.value = true
}

function formatSender(from) {
  if (!from) return ''
  const match = from.match(/^([A-Z0-9]+)(?:-(\d+))?$/)
  if (match && match[2]) {
    return `${match[1]}-${match[2]}`
  }
  return from
}

async function handleSend() {
  if (!canSend.value || sending.value) return

  const callsign = sendForm.value.callsign.toUpperCase().trim()

  if (!validateCallsign(callsign)) {
    callsignError.value = '呼号格式不正确 (1-15位字母数字)'
    return
  }

  sending.value = true
  sendResult.value = null

  try {
    const result = await messageService.send(
      fmoAddress.value,
      protocol.value,
      callsign,
      sendForm.value.ssid,
      sendForm.value.message.trim()
    )

    if (result.status === 'success' && result.result === 0) {
      sendResult.value = { type: 'success', message: '发送成功！' }
      sendForm.value.message = ''
      // 3秒后关闭弹窗
      sendResultTimer.value = setTimeout(() => {
        closeSendModal()
      }, 2000)
    } else {
      sendResult.value = { type: 'error', message: '发送失败，请重试' }
    }
  } catch (err) {
    sendResult.value = { type: 'error', message: `发送失败: ${err.message}` }
  } finally {
    sending.value = false
  }
}

// 生命周期
onMounted(async () => {
  // 加载消息列表（按需连接）
  if (fmoAddress.value) {
    loading.value = true
    try {
      await messageService.getList(fmoAddress.value, protocol.value, 0)
    } catch (err) {
      console.error('加载消息列表失败:', err)
    } finally {
      loading.value = false
    }
  }
  // 监听浏览器返回事件，用于移动端关闭详情
  window.addEventListener('popstate', handlePopState)
})

onUnmounted(() => {
  if (sendResultTimer.value) {
    clearTimeout(sendResultTimer.value)
  }
  window.removeEventListener('popstate', handlePopState)
  _unregSendModal()
})
</script>

<style scoped>
.message-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 页面头部 */
/* 连接状态提示 */
.connection-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--bg-warning-light);
  color: var(--color-warning);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.connection-hint svg {
  width: 20px;
  height: 20px;
}

/* 主布局 */
.message-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 消息列表区域 */
.message-list-section {
  width: 360px;
  min-width: 360px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-light);
  background: var(--bg-container);
}

.send-message-btn {
  margin: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.send-message-btn svg {
  width: 18px;
  height: 18px;
}

.action-buttons {
  display: flex;
  gap: 0.5rem;
  margin: 0 1rem 0.75rem;
}

.action-buttons .btn-text {
  flex: 1;
  justify-content: center;
  padding: 0.5rem;
  font-size: 0.8125rem;
}

.action-buttons svg {
  width: 14px;
  height: 14px;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--color-primary);
}

.message-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  color: var(--text-tertiary);
  text-align: center;
}

.empty-state svg {
  width: 64px;
  height: 64px;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 0.875rem;
}

/* 加载状态 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  gap: 1rem;
  color: var(--text-tertiary);
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-light);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.spinner-small {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 消息列表 */
.message-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.message-item {
  position: relative;
  padding: 0.875rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.message-item:hover {
  border-color: var(--color-primary);
  box-shadow: 0 2px 8px var(--shadow-card);
}

.message-item.active {
  border-color: var(--color-primary);
  background: var(--bg-primary-light);
}

.message-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.message-item-sender {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sender {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'IntelOneMono', monospace;
}

.unread-indicator {
  flex-shrink: 0;
  background: var(--bg-error-light);
  color: var(--color-danger);
  font-size: 0.625rem;
  font-weight: 400;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  border: 1px solid var(--color-danger);
}

.detail-tag {
  flex-shrink: 0;
  background: var(--bg-table-hover);
  color: var(--text-tertiary);
  font-size: 0.625rem;
  font-weight: 500;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  border: 1px solid var(--border-light);
}

.message-item-time {
  display: flex;
  justify-content: flex-end;
}

.time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

/* 加载更多 */
.load-more-btn {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  background: none;
  border: 1px dashed var(--border-primary);
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.load-more-btn.no-more {
  border-style: solid;
  border-color: var(--border-light);
  color: var(--text-tertiary);
  background: var(--bg-table-hover);
}

/* 消息详情区域 */
.message-detail-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-page);
  overflow: hidden;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: color 0.2s;
}

.back-btn:hover {
  color: var(--color-primary);
}

.back-btn svg {
  width: 18px;
  height: 18px;
}

.detail-loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 0;
  background: var(--bg-page);
}

/* 电子邮件风格 */
.email-style {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 邮件头部 */
.email-header {
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
  padding: 1.25rem 1.5rem;
}

.email-subject-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.875rem;
  padding-bottom: 0.875rem;
  border-bottom: 1px solid var(--border-light);
}

.email-subject {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
}

.email-meta-line {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.375rem;
}

.email-meta-line:last-child {
  margin-bottom: 0;
}

.email-label {
  width: 50px;
  color: var(--text-tertiary);
  font-size: 0.875rem;
  flex-shrink: 0;
}

.email-sender-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: none;
  border: none;
  padding: 0.25rem 0.5rem;
  margin: -0.25rem -0.5rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.email-sender-btn:hover {
  background: var(--bg-table-hover);
}

.sender-name-highlight {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-primary);
  font-family: 'IntelOneMono', monospace;
}

.reply-hint {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  padding: 0.125rem 0.375rem;
  background: var(--bg-table-hover);
  border-radius: 4px;
}

.email-time {
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.email-recipient {
  font-size: 0.875rem;
  color: var(--text-secondary);
  font-family: 'IntelOneMono', monospace;
}

/* 邮件正文 */
.email-body {
  flex: 1;
  padding: 1.5rem;
  background: var(--bg-page);
}

.email-message-content {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
}

/* 邮件底部 */
.email-footer {
  background: var(--bg-card);
  border-top: 1px solid var(--border-light);
  padding: 1rem 1.5rem;
}

.footer-line {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.25rem;
}

.footer-line:last-child {
  margin-bottom: 0;
}

.footer-label {
  width: 50px;
  color: var(--text-tertiary);
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.footer-value {
  font-size: 0.8125rem;
  color: var(--text-secondary);
}

.email-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-light);
}

.email-actions .btn-text {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
}

.email-actions svg {
  width: 16px;
  height: 16px;
}

.meta-value {
  color: var(--text-primary);
  font-size: 0.875rem;
}

.meta-value.callsign {
  font-family: 'IntelOneMono', monospace;
  font-weight: 600;
  color: var(--color-primary);
}

/* 按钮样式 */
.btn-primary,
.btn-secondary,
.btn-text,
.btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 1rem;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
  border-color: var(--border-primary);
}

.btn-secondary:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.btn-text {
  background: none;
  color: var(--text-secondary);
  padding: 0.5rem;
}

.btn-text:hover:not(:disabled) {
  color: var(--color-primary);
  background: var(--bg-table-hover);
}

.btn-danger {
  background: none;
  color: var(--color-danger);
  border-color: var(--color-danger);
  padding: 0.5rem 0.75rem;
}

.btn-danger:hover:not(:disabled) {
  background: var(--bg-error-light);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-text:disabled,
.btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-text svg,
.btn-danger svg {
  width: 16px;
  height: 16px;
}

/* 弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: var(--bg-card);
  border-radius: 12px;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow: hidden;
  box-shadow: 0 20px 60px var(--shadow-modal);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1rem;
  border-bottom: 1px solid var(--border-light);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}

.modal-body {
  padding: 1.25rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9375rem;
  font-family: inherit;
  transition: border-color 0.2s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-primary);
}

.form-group textarea {
  resize: vertical;
  min-height: 100px;
}

.form-group select {
  cursor: pointer;
}

.error-text {
  display: block;
  margin-top: 0.375rem;
  font-size: 0.8125rem;
  color: var(--color-danger);
}

.char-count {
  display: block;
  text-align: right;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border-light);
}

.send-result {
  padding: 0.75rem 1.25rem;
  text-align: center;
  font-size: 0.875rem;
}

.send-result.success {
  background: var(--bg-success-light);
  color: var(--color-success);
}

.send-result.error {
  background: var(--bg-error-light);
  color: var(--color-danger);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .message-list-section {
    width: 100%;
    min-width: auto;
    border-right: none;
  }

  .message-list-section.mobile-hidden {
    display: none;
  }

  .message-detail-section {
    width: 100%;
  }

  .detail-content {
    padding: 1rem;
  }

  .detail-meta {
    padding: 0.875rem;
  }

  .meta-label {
    width: 70px;
  }
}

@media (max-width: 480px) {
  .send-message-btn {
    margin: 0.75rem;
  }

  .message-list-container {
    padding: 0 0.75rem 0.75rem;
  }

  .modal-content {
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-overlay {
    padding: 0;
    align-items: flex-end;
  }
}
</style>
