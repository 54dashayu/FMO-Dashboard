<template>
  <div class="station-control">
    <button class="station-btn prev-btn" :disabled="!connected || isBusy" @click="$emit('prev')">
      &lt;
    </button>
    <div class="station-info" @click="handleOpenList">
      <span v-if="connected && currentStation" class="station-name clickable">
        {{ currentStation.name }}
        <span v-if="showPrimaryBadge" class="primary-badge">主</span>
        <span class="dropdown-arrow">▼</span>
      </span>
      <span v-else-if="connected" class="station-loading"> 加载中... </span>
      <span v-else class="station-disconnected"> 未连接 </span>
    </div>
    <button class="station-btn next-btn" :disabled="!connected || isBusy" @click="$emit('next')">
      &gt;
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  connected: {
    type: Boolean,
    default: false
  },
  currentStation: {
    type: Object,
    default: null
  },
  isBusy: {
    type: Boolean,
    default: false
  },
  showPrimaryBadge: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['prev', 'next', 'open-list'])

function handleOpenList() {
  if (!props.connected || !props.currentStation) return
  emit('open-list')
}
</script>

<style scoped>
.station-control {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.station-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-card);
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.station-btn:hover:not(:disabled) {
  background: var(--bg-table-hover);
  color: var(--text-primary);
}

.station-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.station-info {
  min-width: 120px;
  text-align: center;
}

.station-name {
  font-weight: 600;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.station-name.clickable {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.station-name.clickable:hover {
  color: var(--color-success);
}

.dropdown-arrow {
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

/* 主服务器标签样式 - 与 user-uid 同款绿色 */
.primary-badge {
  background: rgba(103, 194, 58, 0.15);
  color: var(--color-success);
  font-size: 0.7rem;
  padding: 0.1rem 0.1rem;
  border-radius: 2px;
  font-weight: 700;
  margin-left: 0.1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1rem;
  min-height: 1rem;
}

.station-loading {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.station-disconnected {
  color: var(--text-disabled);
  font-size: 0.9rem;
}

@media (max-width: 480px) {
  .station-btn {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .station-info {
    min-width: 80px;
  }

  .station-name {
    font-size: 1rem;
  }
}
</style>
