<template>
  <div class="location-view">
    <div class="location-content">
      <!-- FMO 当前坐标 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">FMO 当前坐标</span>
          <button class="btn-refresh" :disabled="store.isFetchingFmo" @click="handleFetchFmo">
            <svg
              ref="fmoIconRef"
              class="btn-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path
                d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"
              />
            </svg>
            刷新
          </button>
        </div>
        <div v-if="store.fmoCoordinate" class="coord-display">
          <div class="coord-row">
            <span class="coord-label">纬度</span>
            <span class="coord-value">{{ store.fmoCoordinate.lat.toFixed(6) }}</span>
          </div>
          <div class="coord-row">
            <span class="coord-label">经度</span>
            <span class="coord-value">{{ store.fmoCoordinate.lng.toFixed(6) }}</span>
          </div>
        </div>
        <div v-else class="card-empty">点击刷新获取 FMO 当前坐标</div>
      </div>

      <!-- 当前 GPS 定位 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">当前 GPS 定位</span>
          <button class="btn-refresh" :disabled="store.isRefreshingGps" @click="handleRefreshGps">
            <svg
              ref="gpsIconRef"
              class="btn-icon"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="currentColor"
            >
              <path
                d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
              />
            </svg>
            获取定位
          </button>
        </div>
        <div v-if="store.currentGps" class="coord-display">
          <div class="coord-row">
            <span class="coord-label">纬度</span>
            <span class="coord-value">{{ store.currentGps.lat.toFixed(6) }}</span>
          </div>
          <div class="coord-row">
            <span class="coord-label">经度</span>
            <span class="coord-value">{{ store.currentGps.lng.toFixed(6) }}</span>
          </div>
        </div>
        <div v-else class="card-empty">点击获取当前 GPS 定位</div>
      </div>

      <!-- 自动上报控制 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">自动上报</span>
        </div>

        <div class="setting-row">
          <span class="setting-label">开启自动上报</span>
          <label class="toggle-switch">
            <input type="checkbox" :checked="store.enabled" @change="store.toggleEnabled()" />
            <span class="toggle-slider"></span>
          </label>
        </div>

        <div class="setting-row interval-row">
          <span class="setting-label">上报间隔</span>
          <input
            v-model="sliderValue"
            type="range"
            min="0"
            :max="SLIDER_MAX"
            class="interval-slider"
            :style="{
              background: `linear-gradient(to right, var(--color-primary, #409eff) 0%, var(--color-primary, #409eff) ${(sliderValue / SLIDER_MAX) * 100}%, var(--border-primary) ${(sliderValue / SLIDER_MAX) * 100}%, var(--border-primary) 100%)`
            }"
            @change="handleSliderChange"
          />
          <span class="interval-current">{{ displayLabel }}</span>
        </div>

        <div v-if="isShortInterval" class="setting-hint">
          短间隔（≤60秒）会启用 GPS 持续监听，定位更准，但耗电增加。
        </div>

        <div class="setting-row-actions">
          <button
            class="btn-primary"
            :disabled="store.isManualReporting"
            @click="handleManualReport"
          >
            <span v-if="store.isManualReporting" class="btn-spinner btn-spinner-light" />
            {{ manualReportLabel }}
          </button>
        </div>
      </div>

      <!-- 状态 -->
      <div class="card">
        <div class="card-header">
          <span class="card-title">上报状态</span>
        </div>
        <div v-if="store.lastReportTime" class="status-info">
          <div class="status-row">
            <span class="status-label">上次上报</span>
            <span class="status-value">{{ store.lastReportTime }}</span>
          </div>
          <div class="status-row">
            <span class="status-label">结果</span>
            <span class="status-value" :class="resultStatusClass">{{
              store.lastReportResult
            }}</span>
          </div>
        </div>
        <div v-else class="card-empty">尚未上报</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useLocationStore } from '../stores/locationStore'
import { SLIDER_POSITIONS } from '../stores/locationStore'

const store = useLocationStore()
const SLIDER_MAX = 100

// 图标 DOM 引用，用于通过 JS 驱动旋转动画
const fmoIconRef = ref(null)
const gpsIconRef = ref(null)

const iconAngles = new WeakMap()

/**
 * JS 驱动的完美平滑旋转动画
 * 保证动画在 isProcessing 结束后，一定会平滑过渡到 360° 的整数倍，
 * 然后完美停在原点，绝对不会出现任何 CSS 造成的「回跳」或「单次强制停止」问题。
 */
function startSpinning(iconRef, isProcessingRef) {
  const el = iconRef.value
  if (!el) return

  if (el.dataset.spinning === 'true') return
  el.dataset.spinning = 'true'

  let startTime = window.performance.now()
  let currentAngle = iconAngles.get(el) || 0
  const speed = 360 / 900 // 每毫秒 0.4°（一圈 0.9 秒，与之前 btn-spin 动画一致）

  function animate(time) {
    if (!iconRef.value) {
      el.dataset.spinning = 'false'
      return
    }

    // 限制单帧最大时间间隔为 50ms（防止由于切后台再切回导致的极端大角度跳跃）
    const dt = Math.min(time - startTime, 50)
    startTime = time

    currentAngle += speed * dt

    // 停止逻辑：当处理结束时，计算下一个 360 的整数倍
    if (!isProcessingRef.value) {
      const nextStop = Math.ceil(currentAngle / 360) * 360
      // 如果当前角度已经非常接近目标（或刚好跨过），就直接吸附过去并停止
      if (currentAngle >= nextStop - speed * dt) {
        currentAngle = nextStop
        el.style.transform = `rotate(${currentAngle}deg)`
        // 保存归零状态，确保下次点击完美衔接（取模避免数值无限膨胀）
        iconAngles.set(el, currentAngle % 360)
        el.dataset.spinning = 'false'
        return // 结束动画循环
      }
    }

    el.style.transform = `rotate(${currentAngle}deg)`
    window.requestAnimationFrame(animate)
  }

  window.requestAnimationFrame(animate)
}

watch(
  () => store.isFetchingFmo,
  (val) => {
    if (val) {
      startSpinning(
        fmoIconRef,
        computed(() => store.isFetchingFmo)
      )
    }
  }
)

watch(
  () => store.isRefreshingGps,
  (val) => {
    if (val) {
      startSpinning(
        gpsIconRef,
        computed(() => store.isRefreshingGps)
      )
    }
  }
)

// 滑块当前值（v-model 双向绑定，拖拽时实时更新，松手时吸附）
const sliderValue = ref(SLIDER_POSITIONS[store.getIntervalIndex()])

// 监听 store 间隔变化（如外部修改），同步滑块位置
watch(
  () => store.intervalSeconds,
  () => {
    const idx = store.getIntervalIndex()
    sliderValue.value = SLIDER_POSITIONS[idx]
  }
)

// 将滑块位置 (0-100) 映射到最近的有效选项索引
function sliderToIndex(pos) {
  let nearest = 0
  let minDist = Infinity
  for (let i = 0; i < SLIDER_POSITIONS.length; i++) {
    const dist = Math.abs(SLIDER_POSITIONS[i] - pos)
    if (dist < minDist) {
      minDist = dist
      nearest = i
    }
  }
  return nearest
}

// 松手时吸附到最近有效位置并应用
function handleSliderChange(e) {
  const pos = Number(e.target.value)
  const idx = sliderToIndex(pos)
  const snapped = SLIDER_POSITIONS[idx]
  sliderValue.value = snapped
  store.setIntervalByIndex(idx)
}

// 根据滑块位置实时显示对应的标签文字
const displayLabel = computed(() => {
  const idx = sliderToIndex(sliderValue.value)
  return store.INTERVAL_OPTIONS[idx].label
})

// 当前是否处于短间隔（≤60秒，对应原生侧的持续监听模式）
const isShortInterval = computed(() => store.intervalSeconds <= 60)

// 立即上报按钮文案（根据阶段变化）
const manualReportLabel = computed(() => {
  if (!store.isManualReporting) return '立即上报'
  switch (store.reportingPhase) {
    case 'locating':
      return '正在获取定位…'
    case 'reporting':
      return '正在上报…'
    case 'awaiting':
      return '等待 FMO 回执…'
    default:
      return '处理中…'
  }
})

/**
 * 上报结果状态分类，决定文字颜色：
 *   - 失败/异常 → red
 *   - 静止/未变化/跳过 → muted（次要色，非错误）
 *   - 成功 → green
 */
const resultStatusClass = computed(() => {
  const msg = store.lastReportResult || ''
  if (!msg) return ''
  if (/失败|超时|不足|异常|拒绝|未配置|疑似漂移/.test(msg)) return 'text-danger'
  if (/未变化|静止|跳过/.test(msg)) return 'text-muted'
  if (/成功/.test(msg)) return 'text-success'
  return ''
})

async function handleFetchFmo() {
  await store.fetchFmoCoordinate()
}

async function handleRefreshGps() {
  await store.refreshGps()
}

async function handleManualReport() {
  await store.reportLocation()
}

onMounted(() => {
  store.init()
})

onUnmounted(() => {
  store.teardown()
})
</script>

<style scoped>
.location-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.location-content {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

/* 卡片 */
.card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.card-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--text-primary);
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
  background: none;
  color: var(--color-primary);
  border: 1px solid var(--color-primary);
  border-radius: 4px;
  cursor: pointer;
  transition:
    background 0.2s,
    color 0.2s,
    border-color 0.2s,
    opacity 0.2s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
  white-space: nowrap;
  box-sizing: border-box;
}

/* 按钮内图标固定 16px，避免影响按钮宽度 */
.btn-refresh > .btn-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  transform-origin: 50% 50%;
}

/* hover 样式仅在真正支持悬浮的设备生效（鼠标）；
   触屏设备 hover: none，避免点击后样式粘住 */
@media (hover: hover) {
  .btn-refresh:hover:not(:disabled) {
    background: var(--color-primary);
    color: var(--text-white);
  }
}

/* 按下时的视觉反馈（替代触屏的 hover） */
.btn-refresh:active:not(:disabled) {
  background: var(--color-primary);
  color: var(--text-white);
  opacity: 0.85;
}

.card-empty {
  color: var(--text-tertiary);
  font-size: 0.85rem;
  padding: 0.5rem 0;
}

/* 坐标显示 */
.coord-display {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.coord-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.4rem 0;
}

.coord-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-width: 2.5em;
}

.coord-value {
  font-family: 'IntelOneMono', monospace;
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-primary);
}

/* 设置行 */
.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0;
}

.setting-row + .setting-row {
  /* interval-row 已同行，无需分隔线 */
}

.setting-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-row-actions {
  padding-top: 0.5rem;
}

/* Toggle Switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--border-primary);
  border-radius: 24px;
  transition: all 0.3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s;
}

.toggle-switch input:checked + .toggle-slider {
  background-color: var(--color-success);
}

.toggle-switch input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

/* 间隔滑块 - 同行布局 */
.setting-row.interval-row {
  flex-wrap: nowrap;
  padding: 0.6rem 0;
}

.interval-row .setting-label {
  flex-shrink: 0;
}

.interval-slider {
  flex: 1;
  margin: 0 0.75rem;
  height: 6px;
  -webkit-appearance: none;
  appearance: none;
  background: var(--border-primary);
  border-radius: 3px;
  outline: none;
  cursor: pointer;
}

.interval-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary, #409eff);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.interval-slider::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--color-primary, #409eff);
  border: none;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.interval-current {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-primary);
}

/* 按钮 */
.btn-primary {
  width: 100%;
  padding: 0.6rem 1rem;
  font-size: 0.9rem;
  background: var(--color-primary);
  color: var(--text-white);
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  -webkit-tap-highlight-color: transparent;
  outline: none;
}

@media (hover: hover) {
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
}

.btn-primary:active:not(:disabled) {
  background: var(--color-primary-hover);
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.8;
  cursor: progress;
}

/* 状态 */
.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.status-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.3rem 0;
}

.status-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  min-width: 4.5em;
}

.status-value {
  font-size: 0.9rem;
  color: var(--text-primary);
}

.text-success {
  color: var(--color-success);
}

.text-danger {
  color: var(--color-danger);
}

.text-muted {
  color: var(--text-secondary);
}

/* 提示文案（小号灰字） */
.setting-hint {
  margin-top: 0.25rem;
  padding: 0.25rem 0;
  font-size: 0.75rem;
  color: var(--text-tertiary);
  line-height: 1.4;
}

/* loading spinner（用于"立即上报"按钮 btn-primary） */
.btn-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  vertical-align: middle;
  animation: btn-spin 0.7s linear infinite;
  box-sizing: border-box;
}

/* btn-primary 内的 spinner 与文字保持间距 */
.btn-primary > .btn-spinner {
  margin-right: 0.4rem;
}

.btn-spinner-light {
  border-color: white;
  border-right-color: transparent;
}

@keyframes btn-spin {
  to {
    transform: rotate(360deg);
  }
}

.btn-refresh:disabled {
  cursor: progress;
  opacity: 0.7;
}

/* 移动端 */
@media (max-width: 768px) {
  .location-view {
    padding: 1rem;
  }

  .card {
    padding: 0.875rem 1rem;
  }

  .card-title {
    font-size: 0.9rem;
  }
}
</style>
