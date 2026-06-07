<template>
  <div class="wish-wall-view">
    <section class="wish-board">
      <div class="wish-header">
        <div>
          <h1>{{ t('wish.title', '愿望墙') }}</h1>
          <p>{{ t('wish.subtitle', '记录想要的功能、体验改进和待跟进想法。') }}</p>
        </div>
        <div class="wish-stats">
          <div class="stat-item">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">{{ t('wish.all', '全部') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.planned }}</span>
            <span class="stat-label">{{ t('wish.planned', '计划中') }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ stats.done }}</span>
            <span class="stat-label">{{ t('wish.done', '已完成') }}</span>
          </div>
        </div>
      </div>

      <form class="wish-form" @submit.prevent="handleSubmit">
        <div class="form-main">
          <input
            v-model.trim="form.title"
            maxlength="60"
            :placeholder="t('wish.titlePlaceholder', '想要什么新功能？')"
          />
          <textarea
            v-model.trim="form.detail"
            rows="3"
            maxlength="240"
            :placeholder="t('wish.detailPlaceholder', '补充使用场景、期望效果或优先级...')"
          ></textarea>
        </div>
        <div class="form-footer">
          <input
            v-model.trim="form.author"
            maxlength="20"
            :placeholder="t('wish.authorPlaceholder', '署名/呼号（可选）')"
          />
          <button class="btn-primary" :disabled="!form.title || saving" type="submit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {{ t('wish.submit', '贴上愿望') }}
          </button>
        </div>
      </form>

      <div class="filter-bar">
        <button
          v-for="option in filterOptions"
          :key="option.value"
          class="filter-btn"
          :class="{ active: activeFilter === option.value }"
          @click="activeFilter = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <div v-if="!loaded" class="empty-state">{{ t('common.loading', '加载中...') }}</div>
      <div v-else-if="filteredWishes.length === 0" class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M19 21H5a2 2 0 0 1-2-2V7l9-4 9 4v12a2 2 0 0 1-2 2Z" />
          <path d="M9 21v-8h6v8" />
        </svg>
        <p>{{ t('wish.noItems', '还没有愿望') }}</p>
        <span>{{ t('wish.noItemsHint', '把第一个想法贴上来吧') }}</span>
      </div>
      <div v-else class="wish-grid">
        <article
          v-for="wish in filteredWishes"
          :key="wish.id"
          class="wish-card"
          :class="`status-${wish.status}`"
        >
          <div class="wish-card-header">
            <span class="status-badge">{{ statusLabel(wish.status) }}</span>
            <button
              class="delete-btn"
              :title="t('common.delete', '删除')"
              @click="removeWish(wish.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path
                  d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
                />
              </svg>
            </button>
          </div>
          <h2>{{ wish.title }}</h2>
          <p v-if="wish.detail" class="wish-detail">{{ wish.detail }}</p>
          <div class="wish-meta">
            <span>{{ wish.author || t('wish.anonymous', '匿名') }}</span>
            <span>{{ formatDate(wish.createdAt) }}</span>
          </div>
          <div class="wish-actions">
            <button class="vote-btn" @click="voteWish(wish.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 10v12" />
                <path
                  d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"
                />
              </svg>
              {{ wish.votes }}
            </button>
            <select :value="wish.status" @change="handleStatusChange(wish.id, $event)">
              <option value="pending">{{ t('wish.pending', '新愿望') }}</option>
              <option value="planned">{{ t('wish.planned', '计划中') }}</option>
              <option value="done">{{ t('wish.done', '已完成') }}</option>
            </select>
          </div>
          <div class="wish-submit-actions">
            <button type="button" :disabled="exportingId === wish.id" @click="exportWish(wish)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
              </svg>
              {{
                exportingId === wish.id
                  ? t('common.exporting', '导出中...')
                  : t('wish.exportCard', '导出卡片')
              }}
            </button>
            <button
              type="button"
              class="send-author-btn"
              :disabled="sendingId === wish.id || !fmoAddress"
              :title="
                fmoAddress
                  ? t('wish.sendTooltip', '通过 FMO 消息发送给 BH1JSS')
                  : t('wish.noFmoTooltip', '请先配置 FMO 地址')
              "
              @click="sendWishToAuthor(wish)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
              {{
                sendingId === wish.id
                  ? t('wish.sending', '发送中...')
                  : t('wish.sendToAuthor', '发送给 BH1JSS')
              }}
            </button>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, inject, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useWishWallStore } from '../stores/wishWallStore'
import { getMessageService } from '../services/messageService'
import { exportFile } from '../utils/exportFile'
import toast from '../composables/useToast'
import confirmDialog from '../composables/useConfirm'
import { useLocale } from '../composables/useLocale'

const wishStore = useWishWallStore()
const { loaded, sortedWishes, stats } = storeToRefs(wishStore)
const { addWish, loadWishes, removeWish, setWishStatus, voteWish } = wishStore
const messageService = getMessageService()
const fmoAddress = inject('fmoAddress', ref(''))
const protocol = inject('protocol', ref('http'))
const { t } = useLocale()

const saving = ref(false)
const sendingId = ref('')
const exportingId = ref('')
const activeFilter = ref('all')
const form = reactive({
  title: '',
  detail: '',
  author: ''
})

const statusKeys = {
  pending: ['wish.pending', '新愿望'],
  planned: ['wish.planned', '计划中'],
  done: ['wish.done', '已完成']
}

const filterOptions = computed(() => [
  { label: t('wish.all', '全部'), value: 'all' },
  { label: t('wish.pending', '新愿望'), value: 'pending' },
  { label: t('wish.planned', '计划中'), value: 'planned' },
  { label: t('wish.done', '已完成'), value: 'done' }
])

const filteredWishes = computed(() => {
  if (activeFilter.value === 'all') return sortedWishes.value
  return sortedWishes.value.filter((wish) => wish.status === activeFilter.value)
})

onMounted(() => {
  loadWishes()
})

async function handleSubmit() {
  if (!form.title || saving.value) return
  saving.value = true
  await addWish({
    title: form.title,
    detail: form.detail,
    author: form.author
  })
  form.title = ''
  form.detail = ''
  form.author = ''
  saving.value = false
}

function handleStatusChange(id, event) {
  setWishStatus(id, event.target.value)
}

function formatDate(timestamp) {
  const date = new Date(timestamp)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${month}-${day}`
}

function statusLabel(status) {
  const [key, fallback] = statusKeys[status] || statusKeys.pending
  return t(key, fallback)
}

function buildWishCard(wish) {
  const lines = [
    'FMO 仪表盘愿望卡片',
    `标题：${wish.title}`,
    `详情：${wish.detail || '未填写'}`,
    `署名：${wish.author || '匿名'}`,
    `创建时间：${new Date(wish.createdAt).toLocaleString('zh-CN')}`,
    `状态：${statusLabel(wish.status)}`,
    '',
    '此愿望由 FMO 仪表盘本地愿望墙导出。'
  ]
  return lines.join('\n')
}

function buildWishMessage(wish) {
  const detail = String(wish.detail || '未填写')
    .replace(/\s+/g, ' ')
    .trim()
  return [
    '【FMO仪表盘愿望】',
    `标题：${wish.title}`,
    `详情：${detail}`,
    `署名：${wish.author || '匿名'}`,
    `日期：${new Date(wish.createdAt).toLocaleDateString('zh-CN')}`
  ]
    .join('\n')
    .slice(0, 500)
}

async function exportWish(wish) {
  if (exportingId.value) return
  exportingId.value = wish.id
  const safeTitle =
    String(wish.title || 'wish')
      .replace(/[\\/:*?"<>|]/g, '-')
      .slice(0, 30) || 'wish'
  const filename = `FMO愿望-${safeTitle}-${new Date(wish.createdAt).toISOString().slice(0, 10)}.txt`
  try {
    const result = await exportFile(filename, buildWishCard(wish), 'text/plain;charset=utf-8')
    toast.success(
      result?.displayPath
        ? t('wish.exportedTo', `愿望卡片已保存到 ${result.displayPath}`, {
            path: result.displayPath
          })
        : t('wish.exported', '愿望卡片已导出')
    )
  } catch (err) {
    toast.error(
      t('common.exportFailed', `导出失败：${err?.message || '未知错误'}`, {
        message: err?.message || t('common.unknown', '未知错误')
      })
    )
  } finally {
    exportingId.value = ''
  }
}

async function sendWishToAuthor(wish) {
  if (!fmoAddress.value || sendingId.value) {
    if (!fmoAddress.value) toast.warning(t('wish.needFmo', '请先在设置中配置并连接 FMO 地址'))
    return
  }

  const confirmed = await confirmDialog.show({
    title: t('wish.sendTitle', '发送愿望给作者'),
    message: t(
      'wish.sendMessage',
      `将通过当前 FMO 设备，把“${wish.title}”发送给 BH1JSS-1。确认发送吗？`,
      {
        title: wish.title
      }
    ),
    confirmText: t('wish.confirmSend', '确认发送'),
    cancelText: t('common.cancel', '取消')
  })
  if (!confirmed) return

  sendingId.value = wish.id
  try {
    const result = await messageService.send(
      fmoAddress.value,
      protocol.value,
      'BH1JSS',
      1,
      buildWishMessage(wish)
    )
    if (result.status === 'success' && result.result === 0) {
      toast.success(t('wish.sent', '愿望已发送给 BH1JSS'))
    } else {
      toast.error(t('wish.sendServiceFailed', '发送失败，请检查 FMO 消息服务后重试'))
    }
  } catch (err) {
    toast.error(
      t('common.sendFailed', `发送失败：${err?.message || '连接异常'}`, {
        message: err?.message || t('common.unknown', '未知错误')
      })
    )
  } finally {
    sendingId.value = ''
  }
}
</script>

<style scoped>
.wish-wall-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.wish-board {
  max-width: 1120px;
  margin: 0 auto;
}

.wish-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 1rem;
}

.wish-header h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.8rem;
  font-weight: 700;
}

.wish-header p {
  margin: 0.35rem 0 0;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.wish-stats {
  display: flex;
  gap: 0.75rem;
}

.stat-item {
  min-width: 72px;
  padding: 0.65rem 0.8rem;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  text-align: center;
}

.stat-value {
  display: block;
  color: var(--text-primary);
  font-size: 1.2rem;
  font-weight: 700;
}

.stat-label {
  display: block;
  color: var(--text-tertiary);
  font-size: 0.75rem;
}

.wish-form {
  padding: 1rem;
  margin-bottom: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
}

.form-main {
  display: grid;
  gap: 0.75rem;
}

.wish-form input,
.wish-form textarea,
.wish-actions select {
  width: 100%;
  color: var(--text-primary);
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font: inherit;
  outline: none;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.wish-form input,
.wish-actions select {
  height: 38px;
  padding: 0 0.75rem;
}

.wish-form textarea {
  resize: vertical;
  min-height: 86px;
  padding: 0.65rem 0.75rem;
}

.wish-form input:focus,
.wish-form textarea:focus,
.wish-actions select:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--shadow-primary);
}

.form-footer {
  display: grid;
  grid-template-columns: minmax(180px, 260px) auto;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.btn-primary,
.filter-btn,
.vote-btn,
.delete-btn {
  border: none;
  font: inherit;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  height: 38px;
  padding: 0 1rem;
  color: var(--text-white);
  background: var(--color-primary);
  border-radius: 6px;
  font-weight: 600;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
}

.btn-primary:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.btn-primary svg {
  width: 16px;
  height: 16px;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.filter-btn {
  height: 34px;
  padding: 0 0.9rem;
  color: var(--text-secondary);
  background: var(--bg-input);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
}

.filter-btn.active,
.filter-btn:hover {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: var(--bg-primary-light);
}

.wish-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.wish-card {
  display: flex;
  min-height: 220px;
  padding: 1rem;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-top: 4px solid var(--color-primary);
  border-radius: 8px;
  box-shadow: 0 4px 12px var(--shadow-card);
}

.wish-card.status-planned {
  border-top-color: var(--color-warning);
}

.wish-card.status-done {
  border-top-color: var(--color-success);
}

.wish-card-header,
.wish-actions,
.wish-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 0.55rem;
  color: var(--color-primary);
  background: var(--bg-primary-light);
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.status-planned .status-badge {
  color: var(--color-warning);
  background: var(--bg-warning-light);
}

.status-done .status-badge {
  color: var(--color-success);
  background: var(--bg-success-light);
}

.delete-btn {
  display: flex;
  width: 30px;
  height: 30px;
  align-items: center;
  justify-content: center;
  color: var(--text-disabled);
  background: transparent;
  border-radius: 6px;
}

.delete-btn:hover {
  color: var(--color-danger);
  background: var(--bg-error-light);
}

.delete-btn svg,
.vote-btn svg {
  width: 16px;
  height: 16px;
}

.wish-card h2 {
  margin: 0.85rem 0 0;
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.35;
  word-break: break-word;
}

.wish-detail {
  flex: 1;
  margin: 0.7rem 0;
  color: var(--text-secondary);
  font-size: 0.9rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.wish-meta {
  margin-top: auto;
  padding-top: 0.75rem;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-light);
  font-size: 0.78rem;
}

.wish-actions {
  margin-top: 0.85rem;
}

.wish-submit-actions {
  display: grid;
  grid-template-columns: 1fr 1.35fr;
  gap: 0.5rem;
  margin-top: 0.55rem;
}

.wish-submit-actions button {
  display: inline-flex;
  min-width: 0;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.55rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--bg-input);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
}

.wish-submit-actions button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.wish-submit-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.wish-submit-actions .send-author-btn {
  color: var(--color-primary);
  background: var(--bg-primary-light);
}

.wish-submit-actions svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.vote-btn {
  display: inline-flex;
  height: 34px;
  min-width: 70px;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  color: var(--color-primary);
  background: var(--bg-primary-light);
  border-radius: 6px;
  font-weight: 700;
}

.vote-btn:hover {
  box-shadow: 0 4px 10px var(--shadow-primary);
  transform: translateY(-1px);
}

.wish-actions select {
  max-width: 120px;
}

.empty-state {
  display: flex;
  min-height: 220px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  color: var(--text-tertiary);
  background: var(--bg-card);
  border: 1px dashed var(--border-primary);
  border-radius: 8px;
}

.empty-state svg {
  width: 48px;
  height: 48px;
  margin-bottom: 0.75rem;
  color: var(--text-disabled);
}

.empty-state p {
  margin: 0;
  color: var(--text-secondary);
  font-weight: 600;
}

.empty-state span {
  margin-top: 0.25rem;
  font-size: 0.85rem;
}

@media (max-width: 768px) {
  .wish-wall-view {
    padding: 1rem;
  }

  .wish-header {
    flex-direction: column;
  }

  .wish-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }

  .form-footer {
    grid-template-columns: 1fr;
  }

  .btn-primary {
    width: 100%;
  }

  .wish-grid {
    grid-template-columns: 1fr;
  }
}
</style>
