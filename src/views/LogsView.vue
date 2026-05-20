<template>
  <div class="logs-view">
    <!-- 状态提示 -->
    <StatusHints :sync-message="fmoSyncMessage" :loading="loading" :error="error">
      <template v-if="importProgress" #loading>
        正在导入数据... {{ importProgress.current }} /
        {{ importProgress.total }}
      </template>
    </StatusHints>

    <!-- 过滤区域 -->
    <QuerySection
      v-model:search-keyword="dataQuery.searchKeyword.value"
      :filter-date="displayFilterDate"
      :current-query-type="'all'"
      :from-callsign="selectedFromCallsign"
      :db-loaded="dbLoaded"
      :active-quick-filter="activeQuickFilter"
      @update:search-keyword="onSearchInput"
      @update:filter-date="onPickerDateChange"
      @quick-filter="onQuickFilter"
    />

    <!-- 数据表格 -->
    <LogDataTable
      :query-result="dataQuery.queryResult.value"
      :display-columns="displayColumns"
      :db-loaded="dbLoaded"
      :loading-more="loadingMore"
      :has-more="hasMore"
      :contact-counts="contactCounts"
      :fmo-address="fmoAddress"
      :protocol="protocol"
      @show-callsign-records="handleShowCallsignRecords"
      @load-more="handleLoadMore"
    />

    <!-- 分页 -->
    <PaginationControl
      :current-page="dataQuery.currentPage.value"
      :total-pages="dataQuery.totalPages.value"
      :total-records="dataQuery.totalRecords.value"
      :disabled="!dbLoaded"
      @page-change="handlePageChange"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

// 组件
import StatusHints from '../components/common/StatusHints.vue'
import QuerySection from '../components/home/QuerySection.vue'
import LogDataTable from '../components/home/LogDataTable.vue'
import PaginationControl from '../components/home/PaginationControl.vue'

// 常量
import { DEFAULT_COLUMNS } from '../components/home/constants'

const props = defineProps({
  dbLoaded: Boolean,
  selectedFromCallsign: String,
  loading: Boolean,
  error: String,
  importProgress: Object,
  fmoSyncMessage: String,
  dataQuery: Object,
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

const emit = defineEmits(['execute-query', 'show-callsign-records'])

function handleShowCallsignRecords(payload) {
  emit('show-callsign-records', payload)
}

// 滚动加载状态
const loadingMore = ref(false)

// 计算属性
const displayColumns = computed(() => {
  if (props.dataQuery.queryResult.value) {
    return props.dataQuery.queryResult.value.columns
  }
  return DEFAULT_COLUMNS
})

const hasMore = computed(() => {
  return props.dataQuery.currentPage.value < props.dataQuery.totalPages.value
})

// 防抖定时器
let searchTimer = null

// 快捷筛选状态
const activeQuickFilter = ref('')
// DatePicker 专属显示值（快捷筛选时为空，避免回显仅开始日期）
const pickerDate = ref(null)

const displayFilterDate = computed(() => {
  return activeQuickFilter.value ? null : pickerDate.value
})

function getTodayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getWeekStartDateStr() {
  const d = new Date()
  const dayOfWeek = d.getDay() || 7
  d.setDate(d.getDate() - dayOfWeek + 1)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getMonthStartDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    props.dataQuery.currentPage.value = 1
    emit('execute-query')
  }, 300)
}

function onFilterDateChange() {
  props.dataQuery.currentPage.value = 1
  emit('execute-query')
  // 手动改日期时清除快捷筛选状态
  activeQuickFilter.value = ''
}

// DatePicker 手动选日期：同步到 pickerDate 和查询用的 filterDate
function onPickerDateChange(val) {
  pickerDate.value = val
  props.dataQuery.filterDate.value = val
  activeQuickFilter.value = ''
  props.dataQuery.currentPage.value = 1
  emit('execute-query')
}

function onQuickFilter(type) {
  activeQuickFilter.value = activeQuickFilter.value === type ? '' : type
  // 快捷筛选：设置查询日期但清空 DatePicker 显示，避免只展示开始日期的困惑
  pickerDate.value = null
  if (activeQuickFilter.value === 'today') {
    props.dataQuery.filterDate.value = getTodayDateStr()
  } else if (activeQuickFilter.value === 'week') {
    props.dataQuery.filterDate.value = getWeekStartDateStr()
  } else if (activeQuickFilter.value === 'month') {
    props.dataQuery.filterDate.value = getMonthStartDateStr()
  } else {
    props.dataQuery.filterDate.value = null
  }
  props.dataQuery.currentPage.value = 1
  emit('execute-query')
}

function handlePageChange(page) {
  props.dataQuery.goToPage(page)
  emit('execute-query')
}

async function handleLoadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    await props.dataQuery.loadMoreData(props.selectedFromCallsign, props.dbLoaded)
  } finally {
    loadingMore.value = false
  }
}

// 初始化时确保查询类型正确并重置分页
onMounted(() => {
  if (props.dataQuery.currentQueryType.value !== 'all') {
    props.dataQuery.currentQueryType.value = 'all'
  }
  // 切换视图时重置分页到第一页
  props.dataQuery.currentPage.value = 1
  if (props.dbLoaded) {
    emit('execute-query')
  }
})

// 清理定时器
onUnmounted(() => {
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }
})
</script>

<style scoped>
.logs-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@media (max-width: 768px) {
  .logs-view {
    height: auto;
    min-height: 0;
    margin-top: 0.5rem;
  }
}
</style>
