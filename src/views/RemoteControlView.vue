<template>
  <div class="remote-control-view">
    <section class="control-section">
      <div class="section-header">
        <div>
          <h2>FMO 中继控制</h2>
          <p>{{ activeAddressLabel }}</p>
        </div>
        <button class="btn-secondary" :disabled="!canControl || stationLoading" @click="refreshStation">
          {{ stationLoading ? '刷新中...' : '刷新' }}
        </button>
      </div>

      <div class="control-address-row">
        <label>控制地址</label>
        <select v-model="manualProtocol" class="protocol-select">
          <option value="ws">ws://</option>
          <option value="wss">wss://</option>
        </select>
        <input
          v-model="manualHost"
          class="host-input"
          type="text"
          placeholder="输入 FMO IP 或域名"
          @change="saveManualAddress"
        />
      </div>

      <div v-if="!canControl" class="empty-panel">
        请输入 FMO 地址
      </div>

      <div v-else class="station-panel">
        <div class="current-station">
          <span class="label">当前中继</span>
          <strong>{{ currentStation?.name || (stationLoading ? '读取中...' : '未知') }}</strong>
          <span v-if="currentStation?.uid" class="uid">#{{ currentStation.uid }}</span>
        </div>

        <div class="station-actions">
          <button class="btn-primary" :disabled="stationBusy" @click="switchPrev">上一中继</button>
          <button class="btn-primary" :disabled="stationBusy" @click="switchNext">下一中继</button>
          <button class="btn-primary" :disabled="stationBusy" @click="openStationList">
            选择中继
          </button>
        </div>

        <div v-if="stationMessage" class="status-text" :class="{ error: stationError }">
          {{ stationMessage }}
        </div>
      </div>
    </section>

    <section class="control-section">
      <div class="section-header">
        <div>
          <h2>APRS 远程控制</h2>
          <p>发送 APRS 控制指令</p>
        </div>
      </div>
      <AprsRemoteControl :active-address-id="activeAddressId" :address-list="addressList" />
    </section>

    <StationListModal
      :visible="showStationList"
      :station-list="stationList"
      :current-station="currentStation"
      :loading="stationLoading"
      :favorite-busy-uid="stationFavoriteBusyUid"
      @close="showStationList = false"
      @select="selectStation"
      @favorite="favoriteStation"
      @refresh="loadStationList"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import AprsRemoteControl from '../components/home/modals/AprsRemoteControl.vue'
import StationListModal from '../components/home/modals/StationListModal.vue'
import { FmoApiClient } from '../services/fmoApi'
import { normalizeHost } from '../utils/urlUtils'

const props = defineProps({
  activeAddressId: {
    type: String,
    default: null
  },
  addressList: {
    type: Array,
    default: () => []
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

const currentStation = ref(null)
const stationList = ref([])
const stationLoading = ref(false)
const stationBusy = ref(false)
const stationFavoriteBusyUid = ref('')
const showStationList = ref(false)
const stationMessage = ref('')
const stationError = ref(false)
const manualHost = ref(
  localStorage.getItem('fmo_control_host') || props.fmoAddress || '192.168.31.146'
)
const manualProtocol = ref(localStorage.getItem('fmo_control_protocol') || props.protocol || 'ws')

const activeAddress = computed(() => {
  if (!props.activeAddressId) return null
  return props.addressList.find((addr) => addr.id === props.activeAddressId) || null
})

const controlHost = computed(() => activeAddress.value?.host || props.fmoAddress || manualHost.value)
const controlProtocol = computed(() => {
  if (activeAddress.value?.protocol) return activeAddress.value.protocol
  if (props.fmoAddress) return props.protocol || 'ws'
  return manualProtocol.value || 'ws'
})
const canControl = computed(() => Boolean(controlHost.value))

const activeAddressLabel = computed(() => {
  if (!canControl.value) return '未选择 FMO 设备'
  const name = activeAddress.value?.name || '当前设备'
  return `${name} · ${controlProtocol.value}://${controlHost.value}`
})

function saveManualAddress() {
  localStorage.setItem('fmo_control_host', manualHost.value.trim())
  localStorage.setItem('fmo_control_protocol', manualProtocol.value)
  currentStation.value = null
  stationList.value = []
  if (canControl.value) refreshStation()
}

function setMessage(message, isError = false) {
  stationMessage.value = message
  stationError.value = isError
}

function createClient() {
  if (!controlHost.value) return null
  const host = normalizeHost(controlHost.value)
  return new FmoApiClient(`${controlProtocol.value}://${host}`)
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runStationTask(task, successMessage) {
  const client = createClient()
  if (!client) {
    setMessage('请先在设置中添加并选择 FMO 地址', true)
    return null
  }

  stationBusy.value = true
  stationError.value = false
  try {
    const result = await task(client)
    if (successMessage) setMessage(successMessage)
    return result
  } catch (err) {
    setMessage(`操作失败：${err.message || err}`, true)
    return null
  } finally {
    client.close()
    stationBusy.value = false
  }
}

async function refreshStation(options = {}) {
  const { message = '当前中继已更新', loading = true } = options
  stationLoading.value = true
  const station = await runStationTask((client) => client.getCurrentStation())
  if (station) {
    currentStation.value = station
    if (message) setMessage(message)
  }
  if (loading) stationLoading.value = false
  return station
}

async function refreshStationAfterSwitch(message) {
  stationLoading.value = true
  await wait(700)
  const station = await refreshStation({ message, loading: false })
  stationLoading.value = false
  return station
}

async function loadStationList() {
  stationLoading.value = true
  const result = await runStationTask(async (client) => {
    const [list, pinnedList] = await Promise.all([
      client.getAllStations(),
      client.getAllPinnedStations()
    ])
    const pinnedUids = new Set(pinnedList.map((station) => station.uid))
    return list.map((station) => ({
      ...station,
      isPinned: pinnedUids.has(station.uid)
    }))
  })

  if (result) {
    stationList.value = result
    setMessage(`已加载 ${result.length} 个中继`)
  }
  stationLoading.value = false
}

async function openStationList() {
  showStationList.value = true
  if (stationList.value.length === 0) {
    await loadStationList()
  }
}

async function selectStation(uid) {
  const station = stationList.value.find((item) => String(item.uid) === String(uid))
  const result = await runStationTask((client) => client.setCurrentStation(uid))
  if (!result) return

  if (station) {
    currentStation.value = station
  }
  await refreshStationAfterSwitch(`已切换到：${station?.name || uid}`)
}

async function favoriteStation(station) {
  if (!station?.uid || stationFavoriteBusyUid.value) return
  const client = createClient()
  if (!client) {
    setMessage('请先在设置中添加并选择 FMO 地址', true)
    return
  }

  stationFavoriteBusyUid.value = station.uid
  stationError.value = false
  try {
    await client.addPinnedStation(station.uid)
    await wait(700)
    const pinnedList = await client.getAllPinnedStations()
    const pinnedUids = new Set((pinnedList || []).map((item) => String(item.uid)))

    if (pinnedUids.has(String(station.uid))) {
      stationList.value = stationList.value.map((item) =>
        String(item.uid) === String(station.uid) ? { ...item, isPinned: true } : item
      )
      setMessage(`已收藏：${station.name}`)
    } else {
      setMessage('当前 FMO 固件没有开放远程添加收藏接口', true)
    }
  } catch {
    setMessage('当前 FMO 固件没有开放远程添加收藏接口', true)
  } finally {
    client.close()
    stationFavoriteBusyUid.value = ''
  }
}

async function switchPrev() {
  const result = await runStationTask((client) => client.prevStation())
  if (!result) return
  await refreshStationAfterSwitch('已切换到上一中继')
}

async function switchNext() {
  const result = await runStationTask((client) => client.nextStation())
  if (!result) return
  await refreshStationAfterSwitch('已切换到下一中继')
}

watch(
  () => [props.activeAddressId, props.fmoAddress, props.protocol],
  () => {
    currentStation.value = null
    stationList.value = []
    stationMessage.value = ''
    if (canControl.value) refreshStation()
  }
)

watch(manualProtocol, saveManualAddress)

onMounted(() => {
  if (canControl.value) refreshStation()
})
</script>

<style scoped>
.remote-control-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-section {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 8px;
  padding: 1rem;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.1rem;
  color: var(--text-primary);
}

.section-header p {
  margin: 0.25rem 0 0;
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.station-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.control-address-row {
  display: grid;
  grid-template-columns: auto 92px minmax(180px, 320px);
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.control-address-row label {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.protocol-select,
.host-input {
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  background: var(--bg-input, var(--bg-page));
  color: var(--text-primary);
  min-height: 2.1rem;
  padding: 0.35rem 0.55rem;
}

.current-station {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-height: 2rem;
}

.current-station .label {
  color: var(--text-tertiary);
}

.current-station strong {
  color: var(--text-primary);
  font-size: 1.2rem;
}

.uid {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.station-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.btn-primary,
.btn-secondary {
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
}

.btn-primary {
  background: var(--color-success);
  color: #fff;
  border-color: var(--color-success);
}

.btn-secondary {
  background: var(--bg-card);
  color: var(--text-primary);
}

.btn-primary:disabled,
.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.empty-panel,
.status-text {
  color: var(--text-tertiary);
  font-size: 0.9rem;
}

.status-text.error {
  color: var(--color-danger);
}

@media (max-width: 768px) {
  .remote-control-view {
    padding: 1rem;
  }

  .section-header,
  .current-station,
  .control-address-row {
    align-items: flex-start;
    flex-direction: column;
  }

  .control-address-row {
    display: flex;
  }

  .protocol-select,
  .host-input {
    width: 100%;
  }

  .station-actions {
    flex-direction: column;
  }
}
</style>
