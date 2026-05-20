<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-station-list">
      <div class="modal-header">
        <div class="search-area">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="查询信道"
            @keydown.enter.prevent
          />
        </div>
        <div class="header-actions">
          <button
            class="refresh-btn"
            :disabled="loading"
            title="刷新列表"
            @click="$emit('refresh')"
          >
            {{ loading ? '刷新中...' : '刷新' }}
          </button>
          <button class="close-btn" @click="$emit('close')">&times;</button>
        </div>
      </div>
      <div ref="modalBodyRef" class="modal-body">
        <div v-if="filteredStationList.length > 0" class="station-grid">
          <div
            v-for="station in filteredStationList"
            :key="station.uid"
            class="station-item"
            :class="{
              active: currentStation && String(currentStation.uid) === String(station.uid),
              disabled: loading
            }"
            role="button"
            tabindex="0"
            :aria-disabled="loading"
            :title="station.name"
            @click="handleSelect(station.uid)"
            @keydown.enter.prevent="handleSelect(station.uid)"
            @keydown.space.prevent="handleSelect(station.uid)"
          >
            <button
              class="pin-action"
              :class="{ pinned: station.isPinned }"
              :disabled="true"
              :title="station.isPinned ? '已在 FMO 收藏中' : '添加收藏（功能尚未开放）'"
              @click.stop="handleFavorite(station)"
            >
              {{ station.isPinned ? '已收藏' : '☆' }}
            </button>
            <span class="station-name">{{ station.name }}</span>
            <span
              v-if="
                showPrimaryBadge &&
                currentStation &&
                String(currentStation.uid) === String(station.uid)
              "
              class="primary-badge"
              >主</span
            >
          </div>
        </div>
        <div v-else-if="loading" class="station-loading">加载中...</div>
        <div v-else class="station-empty">暂无服务器</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  stationList: {
    type: Array,
    default: () => []
  },
  currentStation: {
    type: Object,
    default: null
  },
  loading: {
    type: Boolean,
    default: false
  },
  showPrimaryBadge: {
    type: Boolean,
    default: false
  },
  favoriteBusyUid: {
    type: [String, Number],
    default: ''
  }
})

const emit = defineEmits(['close', 'select', 'refresh', 'favorite'])

const searchQuery = ref('')
const modalBodyRef = ref(null)

// 弹框关闭后重置开关状态，打开时滚动到当前选中项
watch(
  () => props.visible,
  async (val) => {
    if (!val) {
      searchQuery.value = ''
      return
    }
    await nextTick()
    scrollToActiveStation()
  }
)

function scrollToActiveStation() {
  const container = modalBodyRef.value
  if (!container) return
  const activeItem = container.querySelector('.station-item.active')
  if (activeItem) {
    const containerRect = container.getBoundingClientRect()
    const itemRect = activeItem.getBoundingClientRect()
    container.scrollTop =
      container.scrollTop +
      itemRect.top -
      containerRect.top -
      containerRect.height / 2 +
      itemRect.height / 2
  } else {
    container.scrollTop = 0
  }
}

const filteredStationList = computed(() => {
  let list = props.stationList

  // 收藏的服务器前置，其他保持原有顺序
  list = [...list].sort((a, b) => {
    if (a.isPinned === b.isPinned) return 0
    return a.isPinned ? -1 : 1
  })

  const query = searchQuery.value.trim()
  if (!query) {
    return list
  }

  // #开头的按uid精确查询
  if (query.startsWith('#')) {
    const uid = query.slice(1).trim()
    if (!uid) {
      return list
    }
    return list.filter((station) => String(station.uid) === uid)
  }

  // 按名称模糊查询
  return list.filter((station) => station.name?.toLowerCase().includes(query.toLowerCase()))
})

function handleSelect(uid) {
  if (props.loading) return
  emit('select', uid)
  emit('close')
}

function handleFavorite(station) {
  if (props.loading || station.isPinned) return
  emit('favorite', station)
}
</script>

<style scoped>
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
  z-index: 1100;
}

.modal {
  background: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--shadow-modal);
}

.modal-station-list {
  width: 550px;
  max-width: 90%;
  height: 70vh;
  min-height: 320px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1rem;
  border-bottom: 1px solid var(--border-light);
}

.search-input {
  width: 180px;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--bg-input, var(--bg-page));
  color: var(--text-primary);
  font-size: 0.95rem;
  outline: none;
  transition: border-color 0.2s;
}

.search-input::placeholder {
  color: var(--text-tertiary);
}

.search-input:focus {
  border-color: var(--color-success);
}

.search-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

/* 主服务器标签样式 - 与 user-uid 同款绿色 */
.title-primary-badge {
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success);
  font-size: 0.7rem;
  padding: 0.1rem 0.1rem;
  border-radius: 2px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  min-height: 1rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn {
  background: none;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  color: var(--text-primary);
  line-height: 1;
  padding: 0.25rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  color: var(--color-success);
}

.refresh-btn:disabled {
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.station-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.station-item {
  position: relative;
  padding: 0.8rem 1.2rem;
  border: 2px solid rgba(150, 150, 150, 0.3);
  background: var(--bg-card);
  border-radius: 6px;
  cursor: pointer;
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-secondary);
  transition: all 0.2s;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.station-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pin-action {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--color-warning, #e6a23c);
  line-height: 1;
  background: rgba(230, 162, 60, 0.22);
  border: 0;
  border-radius: 3px;
  padding: 3px;
  cursor: pointer;
}

.pin-action.pinned,
.pin-action:disabled {
  cursor: default;
}

.pin-action:not(.pinned) {
  min-width: 1.35rem;
  font-size: 0.95rem;
}

.station-item:hover:not(.disabled) {
  background: var(--bg-table-hover);
  color: var(--text-primary);
  border-color: var(--color-success);
}

.station-item.active {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.station-item.active .pin-action {
  color: white;
  background: rgba(255, 255, 255, 0.35);
  font-weight: 300;
}

/* 信道按钮内的主标签样式 - 与 user-uid 同款绿色 */
.primary-badge {
  background: rgba(103, 194, 58, 0.25);
  color: #67c23a;
  font-size: 0.7rem;
  padding: 0.1rem 0.1rem;
  border-radius: 2px;
  font-weight: 700;
  margin-left: 0.25rem;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  min-height: 1rem;
}

.station-item.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.station-loading,
.station-empty {
  text-align: center;
  padding: 2rem;
  color: var(--text-tertiary);
}

@media (max-width: 600px) {
  .modal-station-list {
    width: 95%;
  }

  .station-item {
    padding: 0.7rem 0.5rem;
    font-size: 0.95rem;
  }
}
</style>
