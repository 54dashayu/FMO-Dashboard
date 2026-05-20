<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-speaking-history">
      <div class="modal-header">
        <StationControl
          :connected="stationConnected"
          :current-station="currentStation"
          :is-busy="stationBusy"
          :show-primary-badge="multiSelectMode"
          @prev="$emit('station-prev')"
          @next="$emit('station-next')"
          @open-list="$emit('station-open-list')"
        />
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <div class="modal-body">
        <!-- 发言历史列表 -->
        <div v-if="displayHistory.length > 0" class="speaking-history-list">
          <div
            v-for="(record, index) in displayHistory"
            :key="index"
            class="speaking-history-item"
            :class="{
              'is-speaking': !record.endTime,
              'is-self': record.callsign === selectedFromCallsign
            }"
            @click="
              record.callsign !== selectedFromCallsign &&
              $emit('show-callsign-records', record.callsign)
            "
          >
            <div class="history-main">
              <div class="history-top-row">
                <div class="history-callsign-area">
                  <span class="history-indicator" :class="{ speaking: !record.endTime }"></span>
                  <span class="history-callsign">
                    <!-- 多选模式下显示服务器标签 -->
                    <span v-if="multiSelectMode && record.addressId" class="server-tag">{{
                      getServerName(record.addressId)
                    }}</span>
                    <span class="callsign-text">{{ record.callsign }}</span>
                    <span class="callsign-badge">
                      <span v-if="record.callsign === selectedFromCallsign" class="self-tag"
                        >您</span
                      >
                      <span v-if="todayContactedCallsigns.has(record.callsign)" class="today-star"
                        >&#11088;</span
                      >
                    </span>
                    <span v-if="contactCounts.get(record.callsign)" class="contact-count"
                      >x{{ contactCounts.get(record.callsign) }}</span
                    >
                  </span>
                </div>
                <div class="history-time">
                  <div class="speaking-time">
                    <template v-if="!record.endTime">正在发言</template>
                    <template v-else>{{ formatTimeAgo(record.endTime) }}</template>
                  </div>
                  <div class="duration-time">
                    {{ formatDurationMmSs((record.endTime || now) - record.startTime) }}
                  </div>
                </div>
              </div>
              <div v-if="record.grid || record.serverUid" class="history-address-row">
                <span v-if="record.serverUid" class="history-server-tag">{{
                  formatServerInfo(record.serverUid, record.serverName)
                }}</span>
                <span v-if="record.grid" class="history-grid-tag">{{ record.grid }}</span>
                <span v-if="gridAddressMap[record.grid]" class="history-address-text">{{
                  gridAddressMap[record.grid]
                }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="speaking-history-empty">
          <div class="empty-divider"></div>
          <div class="empty-text">暂无1小时内的发言记录</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, reactive } from 'vue'
import { formatTimeAgo, formatDurationMmSs } from '../constants'
import { gridToAddress } from '../../../services/gridService'
import StationControl from '../StationControl.vue'

const now = ref(Date.now())
let nowTimer = null

// grid -> 格式化地址的缓存映射
const gridAddressMap = reactive({})

// 格式化地址数据（精确到区，使用 - 分隔）
function formatAddress(data) {
  if (!data) return ''
  const province = data.province || ''
  const city = data.city || ''
  const district = data.district || ''

  const parts = []
  if (province) parts.push(province)
  if (city && city !== province) parts.push(city)
  if (district) parts.push(district)

  const full = parts.join('-')
  return full
}

// 异步加载历史记录中 grid 对应的地址（实时请求，不走缓存）
async function loadGridAddresses(records) {
  const grids = new Set()
  for (const record of records) {
    if (record.grid) {
      grids.add(record.grid)
    }
  }
  for (const grid of grids) {
    try {
      const result = await gridToAddress(grid)
      const formatted = formatAddress(result)
      gridAddressMap[grid] = formatted
    } catch (err) {
      console.warn(`[SpeakingHistoryModal] grid 转地址失败: ${grid}`, err.message)
      gridAddressMap[grid] = ''
    }
  }
}

onMounted(() => {
  nowTimer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
    nowTimer = null
  }
})

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  history: {
    type: Array,
    default: () => []
  },
  todayContactedCallsigns: {
    type: Set,
    default: () => new Set()
  },
  stationConnected: {
    type: Boolean,
    default: false
  },
  currentStation: {
    type: Object,
    default: null
  },
  stationBusy: {
    type: Boolean,
    default: false
  },
  selectedFromCallsign: {
    type: String,
    default: ''
  },
  allSpeakingHistories: {
    type: Array,
    default: () => []
  },
  allCurrentSpeakers: {
    type: Array,
    default: () => []
  },
  addressList: {
    type: Array,
    default: () => []
  },
  multiSelectMode: {
    type: Boolean,
    default: false
  },
  activeAddressId: {
    type: String,
    default: ''
  },
  contactCounts: {
    type: Map,
    default: () => new Map()
  }
})

// 计算要显示的历史记录（多选模式使用 allSpeakingHistories，单选模式使用 history）
const displayHistory = computed(() => {
  if (props.multiSelectMode && props.allSpeakingHistories?.length > 0) {
    return props.allSpeakingHistories
  }
  return props.history
})

// 监听历史记录变化，自动加载 grid 地址
watch(
  () => displayHistory.value,
  (records) => {
    if (records?.length > 0) {
      loadGridAddresses(records)
    }
  },
  { immediate: true, deep: true }
)

// 根据 addressId 获取服务器显示名称
function getServerName(addressId) {
  // 主服务器显示"主"
  if (addressId === props.activeAddressId) return '主'
  const address = props.addressList.find((a) => a.id === addressId)
  if (!address) return '?'
  // 显示 numId，如果没有则降级显示在列表中的 index+1
  if (address.numId) return address.numId.toString()
  const index = props.addressList.findIndex((a) => a.id === addressId)
  return index !== -1 ? (index + 1).toString() : '?'
}

// 格式化服务器信息：仅显示服务器名称（最多10个字符）
function formatServerInfo(uid, name) {
  const serverName = name || ''
  return serverName.length > 10 ? serverName.slice(0, 10) + '...' : serverName
}

defineEmits(['close', 'show-callsign-records', 'station-prev', 'station-next', 'station-open-list'])
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
  z-index: 1000;
}

.modal {
  background: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--shadow-modal);
}

.modal-speaking-history {
  width: 500px;
  max-width: 90%;
  max-height: 80vh;
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

.modal-header h3 {
  margin: 0;
  font-size: 1.2rem;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  height: auto;
}

.speaking-history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.speaking-history-item {
  display: flex;
  align-items: flex-start;
  padding: 0.5rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 6px;
  transition: background 0.2s;
  cursor: pointer;
}

.speaking-history-item:hover {
  background: var(--bg-table-hover);
}

.speaking-history-item.is-self {
  cursor: default;
}

.speaking-history-item.is-self:hover {
  background: var(--bg-card);
}

.speaking-history-item.is-self.is-speaking:hover {
  background: var(--bg-speaking-bar);
}

.speaking-history-item.is-speaking {
  background: var(--bg-speaking-bar);
  border-color: var(--border-speaking-bar);
}

.history-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--text-disabled);
  flex-shrink: 0;
}

.history-indicator.speaking {
  background: var(--color-speaking);
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.1);
  }
}

.history-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
}

.history-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.history-callsign-area {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.history-callsign {
  font-weight: 700;
  font-size: 1.6rem;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 0.2rem;
  flex-shrink: 0;
}

/* 呼号文字：固定 4.5em 宽度（em 单位跨浏览器一致性好），保证后续徽章/通联次数位置一致 */
/* overflow:hidden 防止文本溢出压到徽章 */
.callsign-text {
  display: inline-block;
  width: 4.5em;
  text-align: left;
  white-space: nowrap;
  flex-shrink: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 徽章区域：固定宽度 0.8em（≈1.28rem），保证"您"/⭐徽章位置一致，防止后续元素偏移 */
.callsign-badge {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  flex-shrink: 0;
  width: 0.8em;
  gap: 0.15em;
}

/* 服务器标签样式 - 与呼号颜色一致 */
.history-callsign .server-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.2rem 0.2rem;
  border-radius: 2px;
  font-size: 0.75rem;
  font-weight: 700;
  background: rgba(128, 128, 128, 0.12);
  color: var(--text-primary);
  line-height: 1;
  flex-shrink: 0;
  min-width: 1.2rem;
  min-height: 1.2rem;
}

.today-star {
  font-size: 1.2rem;
  line-height: 1.6rem;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.contact-count {
  font-size: 1rem;
  font-weight: 400;
  color: var(--text-tertiary);
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.history-server-tag {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-primary);
  line-height: 1;
  flex-shrink: 0;
}

.history-grid-tag {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-tertiary);
  line-height: 1;
  flex-shrink: 0;
}

.history-address-row {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
}

.history-address-text {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.self-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25em;
  border-radius: 2px;
  font-size: 0.5em;
  font-weight: 400;
  background: rgba(212, 107, 8, 0.12);
  color: var(--color-warning);
  line-height: 1;
  text-align: center;
  flex-shrink: 0;
}

.speaking-history-item.is-speaking .history-callsign {
  font-weight: 700;
  color: var(--color-speaking);
}

.speaking-history-item.is-speaking .history-callsign .server-tag {
  color: var(--color-speaking);
  background: rgba(34, 197, 94, 0.12);
}

.history-time {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0;
  line-height: 1.2;
}

.speaking-time {
  font-size: 1.1rem;
  color: var(--text-tertiary);
  font-weight: 400;
  line-height: 1.2;
}

.duration-time {
  font-size: 0.95rem;
  color: var(--text-tertiary);
  font-weight: 400;
  line-height: 1.2;
}

.speaking-history-item.is-speaking .speaking-time,
.speaking-history-item.is-speaking .duration-time {
  color: var(--color-speaking);
}

.speaking-history-empty {
  text-align: center;
  padding: 2rem 1rem;
}

.empty-divider {
  border-top: 1px dashed var(--border-secondary);
  margin-bottom: 1rem;
}

.empty-text {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .modal-speaking-history {
    width: 95%;
    max-height: 85vh;
  }
}

@media (max-width: 480px) {
  .speaking-history-item {
    padding: 0.65rem 0.75rem;
  }

  .history-indicator {
    width: 10px;
    height: 10px;
  }

  .history-callsign {
    font-size: 1.3rem;
    gap: 0.3rem;
  }

  .history-callsign .server-tag {
    padding: 0.15rem 0.35rem;
    font-size: 0.65rem;
  }

  .callsign-text {
    width: 4.5em;
  }

  .today-star {
    font-size: 1rem;
  }

  .contact-count {
    font-size: 0.85rem;
  }

  .speaking-time {
    font-size: 1rem;
  }

  .duration-time {
    font-size: 0.9rem;
  }
}
</style>
