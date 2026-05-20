<template>
  <div ref="containerRef" class="old-friends-container">
    <div v-if="!dbLoaded" class="empty-hint">
      <div class="empty-state">
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
    </div>
    <template v-else-if="oldFriendsResult && oldFriendsResult.data.length > 0">
      <div class="old-friends-grid">
        <div
          v-for="(item, index) in sortedData"
          :key="'friend-' + index"
          class="friend-card"
          :class="{ 'today-contact': isTodayContact(item.latestTime) }"
          @click="$emit('show-records', item.toCallsign)"
        >
          <div class="friend-header">
            <div class="friend-callsign">
              {{ item.toCallsign || '-' }}
              <span class="contact-count">&nbsp;x{{ item.count }}</span>
            </div>
          </div>
          <div class="friend-grid">
            <span v-if="item.toGrid">{{ item.toGrid }}</span>
            <span v-if="item.toGrid && gridAddressMap[item.toGrid]">&nbsp;</span>
            <span v-if="gridAddressMap[item.toGrid]" class="friend-address">{{
              gridAddressMap[item.toGrid]
            }}</span>
            <span v-if="!item.toGrid">-</span>
          </div>
          <div class="friend-time">
            <div class="time-label">首次：{{ formatTimestampMinute(item.firstTime) }}</div>
            <div class="time-label">最新：{{ formatTimestampMinute(item.latestTime) }}</div>
          </div>
        </div>
      </div>
      <!-- 滚动加载观察器 -->
      <div ref="loadMoreRef" class="load-more-trigger">
        <template v-if="loadingMore">
          <span class="loading-spinner"></span>
          加载中...
        </template>
        <template v-else-if="!hasMore"> 没有更多数据 </template>
      </div>
    </template>
    <div v-else-if="oldFriendsResult" class="empty-hint">
      <div class="empty-state">
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
        <p class="empty-title">暂无老朋友</p>
        <p class="empty-desc">导入数据后即可查看老朋友统计</p>
      </div>
    </div>
  </div>
</template>

<script setup>
/* global IntersectionObserver */
import { ref, onMounted, onUnmounted, watch, reactive, computed } from 'vue'
import { formatTimestampMinute, isTodayContact } from './constants'
import { gridToAddress } from '../../services/gridService.js'

const props = defineProps({
  oldFriendsResult: {
    type: Object,
    default: null
  },
  oldFriendsAllData: {
    type: Array,
    default: () => []
  },
  oldFriendsDisplayCount: {
    type: Number,
    default: 25
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
  prioritizeToday: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['show-records', 'load-more'])

const gridAddressMap = reactive({})

const sortedData = computed(() => {
  const allData =
    props.oldFriendsAllData.length > 0
      ? props.oldFriendsAllData
      : props.oldFriendsResult?.data || []
  if (allData.length === 0) return []

  if (!props.prioritizeToday) {
    // 全量数据已排序，直接切片展示
    return allData.slice(0, props.oldFriendsDisplayCount)
  }

  // 今日通联前置：将今日通联者排在前面
  const today = []
  const others = []
  for (const item of allData) {
    if (isTodayContact(item.latestTime)) {
      today.push(item)
    } else {
      others.push(item)
    }
  }
  // 合并后按展示数量切片
  return [...today, ...others].slice(0, props.oldFriendsDisplayCount)
})

function formatGridAddress(data) {
  if (!data) return ''
  return data.city || data.province || ''
}

async function loadGridAddresses() {
  const allData =
    props.oldFriendsAllData.length > 0
      ? props.oldFriendsAllData
      : props.oldFriendsResult?.data || []
  if (allData.length === 0) return
  const grids = new Set()
  for (const item of allData) {
    if (item.toGrid) grids.add(item.toGrid)
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

watch(() => props.oldFriendsAllData, loadGridAddresses, { immediate: true, deep: true })

const containerRef = ref(null)
const loadMoreRef = ref(null)
let observer = null

function setupObserver() {
  if (!loadMoreRef.value) return

  observer = new IntersectionObserver(
    (entries) => {
      const entry = entries[0]
      if (entry.isIntersecting && !props.loadingMore && props.hasMore) {
        emit('load-more')
      }
    },
    {
      root: containerRef.value,
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
  if (loadMoreRef.value) {
    setupObserver()
  }
}

watch(
  () => props.oldFriendsResult,
  () => {
    cleanupObserver()
    setTimeout(() => {
      if (loadMoreRef.value) {
        setupObserver()
      }
    }, 100)
  }
)
</script>

<style scoped>
.old-friends-container {
  flex: 1;
  overflow: auto;
  margin-top: 1rem;
  padding-top: 2px;
}

.empty-hint {
  text-align: center;
  color: var(--text-tertiary);
  padding: 3rem;
  display: flex;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
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

.old-friends-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.75rem;
}

.friend-card {
  background: var(--bg-friend-card);
  border: 1px solid var(--border-friend-card);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
  cursor: pointer;
  min-width: 0;
}

.friend-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px var(--shadow-card);
}

.friend-card.today-contact {
  background: var(--bg-today-card);
  border-color: var(--border-today-card);
}

.friend-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.friend-callsign {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.contact-count {
  font-weight: normal;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.friend-grid {
  font-size: 0.85rem;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  max-width: 100%;
}

.friend-address {
  font-weight: 400;
}

.friend-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
  line-height: 1.5;
  min-width: 0;
}

.friend-time .time-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 滚动加载提示 */
.load-more-trigger {
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

@media (max-width: 1024px) {
  .old-friends-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .old-friends-container {
    margin-top: 0.5rem;
    overflow: visible;
  }

  .old-friends-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 600px) {
  .old-friends-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .friend-card {
    padding: 0.6rem;
  }

  .friend-callsign {
    font-size: 1rem;
  }

  .friend-grid {
    font-size: 0.75rem;
  }

  .friend-time {
    font-size: 0.8rem;
  }
}
</style>
