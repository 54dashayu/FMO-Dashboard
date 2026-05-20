<template>
  <div ref="resultSectionRef" class="result-section">
    <!-- 未加载数据：不显示表格，只显示空状态 -->
    <div v-if="!dbLoaded" class="empty-state standalone">
      <svg
        class="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
        <line x1="9" y1="13" x2="15" y2="13" />
        <line x1="9" y1="17" x2="13" y2="17" />
      </svg>
      <p class="empty-title">暂无通联数据</p>
      <p class="empty-desc">导入数据库文件或同步FMO服务器即可查看</p>
    </div>

    <!-- 已加载但无匹配数据 -->
    <div v-else-if="queryResult && queryResult.data.length === 0" class="empty-state standalone">
      <svg
        class="empty-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
        <line x1="8" y1="11" x2="14" y2="11" />
      </svg>
      <p class="empty-title">暂无匹配结果</p>
      <p class="empty-desc">尝试调整筛选条件或导入更多数据</p>
    </div>

    <!-- 有数据时显示表格 -->
    <template v-else-if="queryResult">
      <table class="data-table">
        <thead>
          <tr>
            <th v-for="col in displayColumns" :key="col" :class="'col-' + col">
              {{ ColumnNames[col] || col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in queryResult.data"
            :key="index"
            :class="{ 'row-today': isTodayContact(row.timestamp) }"
            @click="handleRowClick(row)"
          >
            <td
              v-for="col in queryResult.columns"
              :key="col"
              :class="[
                'col-' + col,
                col === 'dailyIndex' && row.dailyIndex === 1 ? 'rank-bg-1' : '',
                col === 'dailyIndex' && row.dailyIndex === 2 ? 'rank-bg-2' : '',
                col === 'dailyIndex' && row.dailyIndex === 3 ? 'rank-bg-3' : '',
                col === 'dailyIndex' && isTodayContact(row.timestamp) && row.dailyIndex > 3
                  ? 'today-index'
                  : ''
              ]"
            >
              <template v-if="col === 'timestamp'">
                <div class="timestamp-div">
                  <div>{{ formatDatePart(formatTimestamp(row[col])) }}</div>
                  <div class="time-row">
                    {{ formatTimePart(formatTimestamp(row[col])) }}
                  </div>
                </div>
              </template>
              <template v-else-if="col === 'dailyIndex'">
                <div class="daily-index-cell">
                  <span
                    class="daily-index"
                    :class="{
                      'rank-1': row.dailyIndex === 1,
                      'rank-2': row.dailyIndex === 2,
                      'rank-3': row.dailyIndex === 3
                    }"
                    >{{ row.dailyIndex }}</span
                  >
                </div>
              </template>
              <template v-else-if="col === 'freqHz'">
                {{ formatFreqHz(row[col]) }}
              </template>
              <template v-else-if="col === 'relayName'">
                <div class="relay-cell">
                  <button
                    v-if="row.relayName"
                    class="relay-link"
                    :disabled="switchingRelay === row.relayName"
                    :title="`切换到 ${row.relayName}`"
                    @click.stop="handleRelaySwitch(row.relayName)"
                  >
                    {{ row.relayName }}
                  </button>
                  <div v-else>-</div>
                  <div class="relay-admin">（{{ row.relayAdmin }}）</div>
                </div>
              </template>
              <template v-else-if="col === 'toCallsign'">
                <div class="callsign-with-grid">
                  <div class="callsign-main">
                    <span class="callsign-text">{{ row.toCallsign }}</span>
                    <span v-if="contactCounts.get(row.toCallsign)" class="contact-count">
                      x{{ contactCounts.get(row.toCallsign) }}
                    </span>
                  </div>
                  <div v-if="row.toGrid || gridAddressMap[row.toGrid]" class="callsign-grid">
                    <span v-if="row.toGrid">{{ row.toGrid }}</span>
                    <span v-if="row.toGrid && gridAddressMap[row.toGrid]">&nbsp;</span>
                    <span v-if="gridAddressMap[row.toGrid]" class="callsign-address">
                      {{ gridAddressMap[row.toGrid] }}
                    </span>
                  </div>
                </div>
              </template>
              <template v-else>
                {{ row[col] }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
      <!-- 滚动加载观察器（仅移动端显示） -->
      <div
        v-if="dbLoaded && queryResult && queryResult.data.length > 0"
        ref="loadMoreRef"
        class="load-more-trigger"
      >
        <template v-if="loadingMore">
          <span class="loading-spinner"></span>
          加载中...
        </template>
        <template v-else-if="!hasMore"> 没有更多数据 </template>
      </div>
    </template>
  </div>
</template>

<script setup>
/* global IntersectionObserver */
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import { ColumnNames, formatTimestamp, formatFreqHz, isTodayContact } from './constants'
import { gridToAddress } from '../../services/gridService.js'
import { switchStationByRelayName } from '../../services/stationControl'
import toast from '../../composables/useToast'

const props = defineProps({
  queryResult: {
    type: Object,
    default: null
  },
  displayColumns: {
    type: Array,
    required: true
  },
  dbLoaded: {
    type: Boolean,
    default: false
  },
  loadingMore: {
    type: Boolean,
    default: false
  },
  hasMore: {
    type: Boolean,
    default: true
  },
  contactCounts: {
    type: Map,
    default: () => new Map()
  },
  fmoAddress: {
    type: String,
    default: ''
  },
  protocol: {
    type: String,
    default: 'ws'
  }
})

const emit = defineEmits(['show-callsign-records', 'load-more'])

function handleRowClick(row) {
  emit('show-callsign-records', { callsign: row.toCallsign, timestamp: row.timestamp })
}

const gridAddressMap = reactive({})
const switchingRelay = ref('')

async function handleRelaySwitch(relayName) {
  if (!relayName || switchingRelay.value) return
  switchingRelay.value = relayName

  try {
    const { current, station } = await switchStationByRelayName(
      relayName,
      props.fmoAddress,
      props.protocol
    )
    toast.success(`已切换到：${current?.name || station.name}`)
  } catch (err) {
    toast.error(err.message || '切换中继失败')
  } finally {
    switchingRelay.value = ''
  }
}

function formatGridAddress(data) {
  if (!data) return ''
  return data.city || data.province || ''
}

async function loadGridAddresses() {
  if (!props.queryResult?.data) return
  const grids = new Set()
  for (const row of props.queryResult.data) {
    if (row.toGrid) grids.add(row.toGrid)
  }
  for (const grid of grids) {
    if (gridAddressMap[grid]) continue
    try {
      const result = await gridToAddress(grid)
      gridAddressMap[grid] = formatGridAddress(result)
    } catch {
      gridAddressMap[grid] = ''
    }
  }
}

watch(() => props.queryResult, loadGridAddresses, { immediate: true, deep: true })

const resultSectionRef = ref(null)
const loadMoreRef = ref(null)
let observer = null

function isMobile() {
  return window.innerWidth <= 768
}

function setupObserver() {
  if (!isMobile() || !loadMoreRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !props.loadingMore && props.hasMore) {
        emit('load-more')
      }
    },
    {
      root: isMobile() ? null : resultSectionRef.value,
      rootMargin: '100px',
      threshold: 0
    }
  )
  observer.observe(loadMoreRef.value)
}

function cleanupObserver() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
}

onMounted(() => {
  setupObserver()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  cleanupObserver()
  window.removeEventListener('resize', handleResize)
})

function handleResize() {
  cleanupObserver()
  if (isMobile() && loadMoreRef.value) {
    setupObserver()
  }
}

watch(
  () => props.queryResult,
  () => {
    // 数据变化后重新设置观察器
    cleanupObserver()
    setTimeout(() => {
      if (isMobile() && loadMoreRef.value) {
        setupObserver()
      }
    }, 100)
  }
)

function formatDatePart(dateTimeStr) {
  if (!dateTimeStr) return ''
  return dateTimeStr.split(' ')[0]
}

function formatTimePart(dateTimeStr) {
  if (!dateTimeStr) return ''
  return dateTimeStr.split(' ')[1]
}
</script>

<style scoped>
.result-section {
  margin-top: 1rem;
  flex: 1;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.9rem;
  table-layout: fixed;
}

.data-table th,
.data-table td {
  border-bottom: 1px solid var(--border-primary);
  border-right: 1px solid var(--border-primary);
  padding: 0.6rem 0.65rem;
  text-align: left;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.data-table th:first-child,
.data-table td:first-child {
  border-left: 1px solid var(--border-primary);
}

.data-table th {
  background: var(--bg-table-header);
  font-weight: 600;
  font-size: 0.85rem;
  position: sticky;
  top: 0;
  z-index: 1;
  text-align: center;
  border-top: 1px solid var(--border-primary);
  color: var(--text-secondary);
  letter-spacing: 0.02em;
}

/* 列宽设置 */
.col-timestamp {
  width: 120px;
  text-align: center;
  vertical-align: middle;
  line-height: 1.2;
}
.col-dailyIndex {
  width: 60px;
  text-align: center;
  vertical-align: middle;
}
.col-freqHz {
  width: 95px;
}
.col-toCallsign {
  width: 240px;
}
.col-toComment {
  width: 100%;
}
.col-mode {
  width: 80px;
}
.col-relayName {
  width: 130px;
  text-align: center;
  vertical-align: middle;
}
.col-count {
  width: 60px;
}

.timestamp-div {
  display: block;
  white-space: nowrap;
  text-align: center;
}

.time-row {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.today-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65rem;
  font-weight: 700;
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
  border-radius: 3px;
  padding: 0.05rem 0.25rem;
  line-height: 1.3;
  flex-shrink: 0;
}

.relay-cell {
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
}

.relay-link:hover:not(:disabled) {
  text-decoration: underline;
}

.relay-link:disabled {
  cursor: wait;
  opacity: 0.7;
}

.relay-admin {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.callsign-with-grid {
  display: flex;
  flex-direction: column;
  line-height: 1.3;
}

.callsign-main {
  display: flex;
  align-items: center;
  gap: 0.2rem;
}

.callsign-text {
  display: inline-block;
  width: 6.2ch;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  font-weight: bold;
  font-size: 1.1rem;
}

.callsign-grid {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: normal;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.callsign-address {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-weight: 400;
}

.contact-count {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-tertiary);
  line-height: 1;
  display: inline-flex;
  align-items: center;
  margin-left: 0.2rem;
}

.daily-index {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.daily-index.rank-1 {
  color: #c69500;
  font-weight: 800;
  font-size: 1.1rem;
}

.daily-index.rank-2 {
  color: #5c6b7f;
  font-weight: 800;
  font-size: 1.05rem;
}

.daily-index.rank-3 {
  color: #a0522d;
  font-weight: 800;
  font-size: 1.05rem;
}

/* ========== 序号列背景色（按优先级分层） ========== */

/* 基础层：默认序号列 */
.data-table tbody td.col-dailyIndex {
  background-color: var(--bg-table-stripe);
}

/* 状态层：今日通联行 - 左侧强调线 + 极淡底色 */
.data-table tbody tr.row-today {
  border-left: 3px solid var(--color-today-accent);
  box-shadow: inset 3px 0 0 0 var(--color-today-accent);
}

.data-table tbody tr.row-today td {
  background-color: var(--bg-today-row);
  border-color: var(--border-today-row);
}

.data-table tbody tr.row-today td:first-child {
  box-shadow: inset 3px 0 0 0 var(--color-today-accent);
}

.data-table tbody tr.row-today td.col-dailyIndex,
.data-table tbody tr.row-today td.col-dailyIndex.today-index {
  background-color: var(--bg-today-index);
}

/* 特殊层：排名（覆盖所有状态） */
.data-table tbody tr td.col-dailyIndex.rank-bg-1 {
  background-color: var(--bg-rank-1);
}
.data-table tbody tr td.col-dailyIndex.rank-bg-2 {
  background-color: var(--bg-rank-2);
}
.data-table tbody tr td.col-dailyIndex.rank-bg-3 {
  background-color: var(--bg-rank-3);
}
.data-table tbody tr td.col-dailyIndex.today-index {
  background-color: var(--bg-today-index-neutral);
}

/* 交互层：hover */
.data-table tbody tr:hover:not(.empty-row) td {
  background-color: var(--bg-table-hover);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.data-table tbody tr:hover:not(.empty-row) td.col-dailyIndex[class*='rank-bg'],
.data-table tbody tr:hover:not(.empty-row) td.col-dailyIndex.today-index {
  background-color: var(--bg-table-hover);
}

.data-table tbody tr.row-today:hover td {
  background-color: var(--bg-table-hover);
}
.data-table tbody tr.row-today:hover td.col-dailyIndex {
  background-color: var(--bg-table-hover);
}

.daily-index-cell {
  display: flex;
  justify-content: center;
  align-items: center;
}

.data-table tbody tr {
  line-height: 1.6;
}

.empty-row .empty-cell {
  text-align: center;
  color: var(--text-tertiary);
  padding: 3rem 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-state.standalone {
  padding: 3rem 1rem;
}

.empty-icon {
  width: 48px;
  height: 48px;
  color: var(--text-disabled);
  margin-bottom: 0.25rem;
}

.empty-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.empty-desc {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-tertiary);
}

/* 滚动加载提示 */
.load-more-trigger {
  display: none;
  text-align: center;
  padding: 1rem;
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.loading-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid var(--border-primary);
  border-top-color: var(--color-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-right: 0.5rem;
  vertical-align: middle;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-color-scheme: dark) {
  .today-badge {
    color: #fbbf24;
    background: #422006;
    border-color: #78350f;
  }

  /* 基础层：默认序号列 */
  .data-table tbody td.col-dailyIndex {
    background-color: var(--bg-table-stripe);
  }

  /* 状态层：今日通联行 - 左侧强调线 */
  .data-table tbody tr.row-today td {
    background-color: var(--bg-today-row);
    border-color: var(--border-today-row);
  }

  .data-table tbody tr.row-today td.col-dailyIndex,
  .data-table tbody tr.row-today td.col-dailyIndex.today-index {
    background-color: var(--bg-today-index);
  }

  /* 特殊层：排名 & today-index */
  .data-table tbody tr td.col-dailyIndex.rank-bg-1 {
    background-color: var(--bg-rank-1);
  }
  .data-table tbody tr td.col-dailyIndex.rank-bg-2 {
    background-color: var(--bg-rank-2);
  }
  .data-table tbody tr td.col-dailyIndex.rank-bg-3 {
    background-color: var(--bg-rank-3);
  }
  .data-table tbody tr td.col-dailyIndex.today-index {
    background-color: var(--bg-today-index-neutral);
  }
}

@media (max-width: 1024px) {
  .col-freqHz,
  .col-mode,
  .col-relayName {
    display: none;
  }
}

@media (max-width: 768px) {
  .result-section {
    margin-top: 0.5rem;
    overflow: visible;
  }

  .data-table {
    font-size: 0.8rem;
  }

  .data-table th,
  .data-table td {
    padding: 0.4rem;
  }

  .col-toComment {
    display: none;
  }

  .load-more-trigger {
    display: block;
  }
}

@media (max-width: 480px) {
  .col-freqHz,
  .col-toComment,
  .col-mode,
  .col-relayName {
    display: none;
  }

  .col-timestamp,
  .col-toCallsign {
    display: table-cell;
  }

  .col-timestamp {
    width: 90px;
  }
}
</style>
