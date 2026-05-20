<template>
  <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal modal-callsign-records">
      <div class="modal-header">
        <h3>
          <a
            v-if="callsign"
            class="callsign-link"
            :href="getQrzUrl(callsign)"
            target="_blank"
            rel="noopener noreferrer"
            @click.stop
          >
            {{ callsign }}
          </a>
          <template v-else>-</template>
          &#11088; {{ records ? records.total : 0 }}
        </h3>
        <button class="close-btn" @click="$emit('close')">&times;</button>
      </div>
      <div ref="modalBodyRef" class="modal-body">
        <div v-if="records && records.data.length > 0" class="record-cards-grid">
          <div
            v-for="(record, index) in records.data"
            :key="record.timestamp + '-' + index"
            ref="cardRefs"
            class="record-card"
            :class="{
              'today-record': isTodayContact(record.timestamp),
              'highlighted-record': highlightTimestamp === record.timestamp
            }"
          >
            <div class="record-row">
              <span class="record-label">日期：</span>
              <span class="record-value">{{ formatTimestamp(record.timestamp) }}</span>
            </div>
            <div class="record-row">
              <span class="record-label">接收方：</span>
              <span class="record-value">
                <a
                  v-if="record.toCallsign"
                  class="callsign-link"
                  :href="getQrzUrl(record.toCallsign)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  {{ record.toCallsign }}
                </a>
                <template v-else>-</template>
                / {{ record.toGrid || '-' }}
              </span>
            </div>
            <div v-if="gridAddressMap[record.toGrid]" class="record-row">
              <span class="record-label"></span>
              <span class="record-value address-line">{{ gridAddressMap[record.toGrid] }}</span>
            </div>
            <div class="record-row">
              <span class="record-label">发送方：</span>
              <span class="record-value">
                <a
                  v-if="record.fromCallsign"
                  class="callsign-link"
                  :href="getQrzUrl(record.fromCallsign)"
                  target="_blank"
                  rel="noopener noreferrer"
                  @click.stop
                >
                  {{ record.fromCallsign }}
                </a>
                <template v-else>-</template>
                / {{ record.fromGrid || '-' }}
              </span>
            </div>
            <div v-if="gridAddressMap[record.fromGrid]" class="record-row">
              <span class="record-label"></span>
              <span class="record-value address-line">{{ gridAddressMap[record.fromGrid] }}</span>
            </div>
            <div class="record-row">
              <span class="record-label">频率：</span>
              <span class="record-value">{{ formatFreqHz(record.freqHz) }} MHz</span>
            </div>
            <div class="record-row">
              <span class="record-label">中继：</span>
              <span class="record-value">
                <button
                  v-if="record.relayName"
                  class="relay-link"
                  :disabled="switchingRelay === record.relayName"
                  :title="`切换到 ${record.relayName}`"
                  @click.stop="handleRelaySwitch(record.relayName)"
                >
                  {{ record.relayName }}
                </button>
                <template v-else>-</template>
                <template v-if="record.relayAdmin">
                  （
                  <a
                    class="callsign-link"
                    :href="getQrzUrl(record.relayAdmin)"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                  >
                    {{ record.relayAdmin }}
                  </a>
                  ）
                </template>
              </span>
            </div>
            <div v-if="record.toComment" class="record-row">
              <span class="record-label">留言：</span>
              <span class="record-value">{{ record.toComment }}</span>
            </div>
          </div>
        </div>
        <div v-else class="empty-hint">暂无记录</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick, reactive } from 'vue'
import { formatTimestamp, formatFreqHz, isTodayContact } from '../constants'
import { gridToAddress } from '../../../services/gridService'
import { switchStationByRelayName } from '../../../services/stationControl'
import toast from '../../../composables/useToast'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  callsign: {
    type: String,
    default: ''
  },
  records: {
    type: Object,
    default: null
  },
  highlightTimestamp: {
    type: Number,
    default: null
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

const emit = defineEmits(['close'])

const cardRefs = ref([])
const modalBodyRef = ref(null)
const switchingRelay = ref('')

const gridAddressMap = reactive({})

function getQrzUrl(callsign) {
  const normalized = String(callsign || '')
    .trim()
    .toUpperCase()
  return `https://www.qrz.com/db/${encodeURIComponent(normalized)}`
}

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

function formatAddress(data) {
  if (!data) return ''
  const province = data.province || ''
  const city = data.city || ''
  const district = data.district || ''

  const parts = []
  if (province) parts.push(province)
  if (city && city !== province) parts.push(city)
  if (district) parts.push(district)

  return parts.join('-')
}

async function loadGridAddresses(records) {
  if (!records?.data?.length) return
  const grids = new Set()
  for (const record of records.data) {
    if (record.toGrid) grids.add(record.toGrid)
    if (record.fromGrid) grids.add(record.fromGrid)
  }
  for (const grid of grids) {
    if (gridAddressMap[grid] !== undefined) continue
    try {
      const result = await gridToAddress(grid)
      gridAddressMap[grid] = formatAddress(result)
    } catch {
      gridAddressMap[grid] = ''
    }
  }
}

function scrollToHighlight() {
  if (!props.highlightTimestamp || !props.records?.data?.length) return
  const index = props.records.data.findIndex((r) => r.timestamp === props.highlightTimestamp)
  if (index === -1) return
  const el = cardRefs.value[index]
  if (!el || !modalBodyRef.value) return
  el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(
  () => [props.visible, props.records],
  ([newVisible, newRecords]) => {
    if (newVisible && newRecords) {
      loadGridAddresses(newRecords)
    }
    if (newVisible && props.highlightTimestamp) {
      nextTick(() => {
        setTimeout(scrollToHighlight, 100)
      })
    }
  },
  { deep: true }
)
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
  z-index: 1010;
}

.modal {
  background: var(--bg-card);
  border-radius: 8px;
  box-shadow: 0 4px 20px var(--shadow-modal);
}

.modal-callsign-records {
  width: 90%;
  max-width: 900px;
  height: 80vh;
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
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.modal-footer {
  flex-shrink: 0;
  padding: 0.75rem 1rem;
  border-top: 1px solid var(--border-light);
  background: var(--bg-card);
}

.record-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.record-card {
  background: var(--bg-record-card);
  border: 1px solid var(--border-record-card);
  border-radius: 8px;
  padding: 0.75rem;
}

.record-row {
  display: flex;
  margin-bottom: 0.3rem;
  font-size: 0.85rem;
  line-height: 1.4;
}

.record-row:last-child {
  margin-bottom: 0;
}

.record-label {
  color: var(--text-tertiary);
  flex-shrink: 0;
  width: 60px;
}

.record-value {
  color: var(--text-primary);
  flex: 1;
  min-width: 0;
  word-break: break-all;
}

.callsign-link {
  color: var(--color-primary);
  font-weight: 700;
  text-decoration: none;
}

.callsign-link:hover {
  text-decoration: underline;
}

.relay-link {
  border: 0;
  background: transparent;
  color: var(--color-primary);
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  padding: 0;
  text-align: left;
}

.relay-link:hover:not(:disabled) {
  text-decoration: underline;
}

.relay-link:disabled {
  cursor: wait;
  opacity: 0.7;
}

.address-line {
  color: var(--text-tertiary);
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.record-card.today-record {
  background: var(--bg-today-card);
  border-color: var(--border-today-card);
}

.record-card.highlighted-record {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
}

.empty-hint {
  text-align: center;
  color: var(--text-tertiary);
  padding: 3rem;
}

@media (max-width: 768px) {
  .record-cards-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .modal-callsign-records {
    width: 95%;
    height: 75vh;
  }

  .modal-body {
    padding: 0.75rem;
    max-height: calc(80vh - 120px);
  }
}
</style>
