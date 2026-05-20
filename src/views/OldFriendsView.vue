<template>
  <div class="old-friends-view">
    <!-- 状态提示 -->
    <StatusHints :sync-message="fmoSyncMessage" :loading="loading" :error="error" />

    <!-- 过滤区域 -->
    <QuerySection
      v-model:old-friends-search-keyword="dataQuery.oldFriendsSearchKeyword.value"
      :current-query-type="'oldFriends'"
      :from-callsign="selectedFromCallsign"
      :db-loaded="dbLoaded"
      :total-count="dataQuery.oldFriendsResult.value?.total || 0"
      @update:old-friends-search-keyword="onOldFriendsSearchInput"
    />

    <!-- 老朋友卡片视图 -->
    <OldFriendsList
      :old-friends-result="dataQuery.oldFriendsResult.value"
      :old-friends-all-data="dataQuery.oldFriendsAllData.value"
      :old-friends-display-count="dataQuery.oldFriendsDisplayCount.value"
      :db-loaded="dbLoaded"
      :loading-more="loadingMore"
      :has-more="hasMore"
      :prioritize-today="prioritizeToday"
      @show-records="$emit('show-callsign-records', $event)"
      @load-more="handleLoadMore"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../stores/settingsStore'

// 组件
import StatusHints from '../components/common/StatusHints.vue'
import QuerySection from '../components/home/QuerySection.vue'
import OldFriendsList from '../components/home/OldFriendsList.vue'

const props = defineProps({
  dbLoaded: Boolean,
  selectedFromCallsign: String,
  loading: Boolean,
  error: String,
  fmoSyncMessage: String,
  dataQuery: Object
})

const emit = defineEmits(['execute-query', 'show-callsign-records'])

const settingsStore = useSettingsStore()
const { prioritizeToday } = storeToRefs(settingsStore)

// 滚动加载状态
const loadingMore = ref(false)

// 计算属性：是否还有更多数据可展示（基于全量数据+displayCount）
const hasMore = computed(() => {
  return props.dataQuery.oldFriendsHasMore.value
})

// 防抖定时器
let oldFriendsSearchTimer = null

function onOldFriendsSearchInput() {
  if (oldFriendsSearchTimer) clearTimeout(oldFriendsSearchTimer)
  oldFriendsSearchTimer = setTimeout(() => {
    props.dataQuery.oldFriendsPage.value = 1
    emit('execute-query')
  }, 300)
}

async function handleLoadMore() {
  if (loadingMore.value || !hasMore.value) return

  loadingMore.value = true
  try {
    // 全量数据已在查询时加载，这里仅增加展示数量
    props.dataQuery.loadMoreOldFriends()
  } finally {
    loadingMore.value = false
  }
}

// 初始化时确保查询类型正确并重置分页
onMounted(() => {
  if (props.dataQuery.currentQueryType.value !== 'oldFriends') {
    props.dataQuery.currentQueryType.value = 'oldFriends'
  }
  // 切换视图时重置分页到第一页
  props.dataQuery.oldFriendsPage.value = 1
  if (props.dbLoaded) {
    emit('execute-query')
  }
})

// 清理定时器
onUnmounted(() => {
  if (oldFriendsSearchTimer) {
    clearTimeout(oldFriendsSearchTimer)
    oldFriendsSearchTimer = null
  }
})
</script>

<style scoped>
.old-friends-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@media (max-width: 768px) {
  .old-friends-view {
    height: auto;
    margin-top: 0.5rem;
  }
}
</style>
