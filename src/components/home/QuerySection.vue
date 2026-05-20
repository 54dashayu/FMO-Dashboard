<template>
  <div v-if="hasFilters" class="query-section">
    <div class="filter-controls">
      <div v-if="currentQueryType === 'oldFriends' && totalCount > 0" class="stats-label">
        <svg
          class="stats-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        老友数：{{ totalCount }}
      </div>
      <div v-if="currentQueryType === 'all'" class="search-box">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <CallsignInput
          id="search-keyword"
          :model-value="searchKeyword"
          placeholder="对方呼号"
          :disabled="!dbLoaded"
          @update:model-value="$emit('update:searchKeyword', $event)"
        />
      </div>
      <div v-if="currentQueryType === 'all'" class="date-filter">
        <DatePicker
          :model-value="filterDate"
          :from-callsign="fromCallsign"
          placeholder="筛选日期"
          @update:model-value="$emit('update:filterDate', $event)"
        />
      </div>
      <div v-if="currentQueryType === 'all'" class="quick-filters">
        <button
          class="quick-filter-chip"
          :class="{ active: activeQuickFilter === 'today' }"
          :disabled="!dbLoaded"
          @click="$emit('quickFilter', 'today')"
        >
          今日
        </button>
        <button
          class="quick-filter-chip"
          :class="{ active: activeQuickFilter === 'week' }"
          :disabled="!dbLoaded"
          @click="$emit('quickFilter', 'week')"
        >
          本周
        </button>
        <button
          class="quick-filter-chip"
          :class="{ active: activeQuickFilter === 'month' }"
          :disabled="!dbLoaded"
          @click="$emit('quickFilter', 'month')"
        >
          本月
        </button>
      </div>
      <div v-if="currentQueryType === 'oldFriends'" class="search-box">
        <svg
          class="search-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <CallsignInput
          id="old-friends-search"
          :model-value="oldFriendsSearchKeyword"
          placeholder="搜索呼号"
          :disabled="!dbLoaded"
          @update:model-value="$emit('update:oldFriendsSearchKeyword', $event)"
        />
      </div>
      <div
        v-if="currentQueryType === 'oldFriends' && totalCount > 0"
        class="prioritize-chip-wrapper"
      >
        <button
          class="prioritize-chip"
          :class="{ active: prioritizeToday }"
          :disabled="!dbLoaded"
          @click="togglePrioritizeToday"
        >
          <svg
            class="sort-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <line x1="4" y1="6" x2="20" y2="6" />
            <line x1="4" y1="12" x2="14" y2="12" />
            <line x1="4" y1="18" x2="8" y2="18" />
          </svg>
          今日已通联
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '../../stores/settingsStore'
import DatePicker from '../common/DatePicker.vue'
import CallsignInput from '../common/CallsignInput.vue'

const props = defineProps({
  currentQueryType: {
    type: String,
    required: true
  },
  searchKeyword: {
    type: String,
    default: ''
  },
  oldFriendsSearchKeyword: {
    type: String,
    default: ''
  },
  filterDate: {
    type: String,
    default: null
  },
  fromCallsign: {
    type: String,
    default: null
  },
  dbLoaded: {
    type: Boolean,
    default: false
  },
  totalCount: {
    type: Number,
    default: 0
  },
  activeQuickFilter: {
    type: String,
    default: ''
  }
})

defineEmits([
  'update:searchKeyword',
  'update:oldFriendsSearchKeyword',
  'update:filterDate',
  'quickFilter'
])

const settingsStore = useSettingsStore()
const { prioritizeToday } = storeToRefs(settingsStore)

function togglePrioritizeToday() {
  settingsStore.setPrioritizeToday(!prioritizeToday.value)
}

const hasFilters = computed(() => {
  return props.currentQueryType === 'all' || props.currentQueryType === 'oldFriends'
})
</script>

<style scoped>
.query-section {
  margin-bottom: 0;
  flex-shrink: 0;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 8px;
  padding: 0.65rem 0.9rem;
  margin-top: 0.5rem;
}

.filter-controls {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.stats-label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  white-space: nowrap;
  margin-right: auto;
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.stats-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.search-box {
  display: flex;
  align-items: center;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  color: var(--text-tertiary);
  pointer-events: none;
  z-index: 1;
}

.search-box :deep(input) {
  padding: 0.4rem 0.8rem 0.4rem 1.8rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 0.9rem;
  width: 135px;
  height: 32px;
  box-sizing: border-box;
  background: var(--bg-input);
  color: var(--text-primary);
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-box :deep(input:focus) {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--shadow-primary);
}

.date-filter {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.quick-filters {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.quick-filter-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  background: var(--bg-container);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-family: inherit;
  line-height: 1.5;
}

.quick-filter-chip:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--bg-primary-light);
}

.quick-filter-chip.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.quick-filter-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.prioritize-chip-wrapper {
  display: flex;
  align-items: center;
}

.prioritize-chip {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  border: 1px solid var(--border-primary);
  border-radius: 14px;
  background: var(--bg-container);
  color: var(--text-secondary);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
  font-family: inherit;
  line-height: 1.5;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.prioritize-chip .sort-icon {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.prioritize-chip:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--bg-primary-light);
}

.prioritize-chip.active {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.prioritize-chip:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .query-section {
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    margin-top: 0.25rem;
  }

  .filter-controls {
    gap: 0.5rem;
  }

  .quick-filters {
    display: none;
  }

  .search-box {
    flex: 1;
    min-width: 0;
  }

  .search-box :deep(input) {
    width: 100%;
    font-size: 0.85rem;
  }

  .date-filter {
    flex: 1;
    min-width: 0;
  }
}

@media (max-width: 360px) {
  .query-section {
    margin-top: 0;
    border-radius: 0;
    border-left: none;
    border-right: none;
    padding: 0.4rem 0.5rem;
  }

  .filter-controls {
    width: 100%;
    gap: 0.4rem;
    flex-direction: column;
    align-items: stretch;
  }

  .search-box,
  .date-filter {
    width: 100%;
    flex: none;
  }

  .search-box :deep(input) {
    width: 100%;
  }
}
</style>

<style>
/* 移动端（≤768px）：强制日期选择器撑满 .date-filter 宽度 */
@media (max-width: 768px) {
  .query-section .date-filter .date-picker {
    display: flex;
    width: 100%;
  }

  .query-section .date-filter .date-picker-trigger {
    flex: 1;
  }
}
</style>
