<template>
  <div class="date-picker">
    <div class="date-picker-trigger" @click="toggleCalendar">
      <span class="trigger-text" :class="{ placeholder: !selectedDate }">{{ displayText }}</span>
      <span v-if="selectedDate" class="clear-btn" @click.stop="clearDate">×</span>
    </div>

    <div v-if="showCalendar" class="calendar-popup">
      <!-- 头部：年份切换 -->
      <div class="calendar-nav">
        <button class="nav-btn" @click="prevMonth">&lt;</button>
        <div class="nav-title">
          <div class="nav-year">
            {{ currentYear }}年
            <span v-if="yearStats > 0" class="stats-badge">⭐{{ yearStats }}</span>
          </div>
          <div class="nav-month">
            {{ currentMonth + 1 }}月
            <span v-if="monthStats > 0" class="stats-badge">⭐{{ monthStats }}</span>
          </div>
        </div>
        <button class="nav-btn" @click="nextMonth">&gt;</button>
      </div>

      <!-- 星期 -->
      <div class="weekdays">
        <span v-for="day in weekDays" :key="day">{{ day }}</span>
      </div>

      <!-- 日期网格 -->
      <div class="days-grid">
        <div
          v-for="(day, index) in calendarDays"
          :key="index"
          class="day-cell"
          :class="{
            'other-month': !day.isCurrentMonth,
            'has-data': day.count > 0 && day.isCurrentMonth,
            selected: day.dateStr === selectedDate,
            today: day.isToday
          }"
          @click="selectDate(day)"
        >
          <span class="day-number">{{ day.day }}</span>
          <span v-if="day.count > 0 && day.isCurrentMonth" class="day-badge">{{ day.count }}</span>
        </div>
      </div>
    </div>

    <div v-if="showCalendar" class="calendar-backdrop" @click="showCalendar = false"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { getMonthlyContactStatsFromIndexedDB } from '../../services/db'

const props = defineProps({
  modelValue: {
    type: String,
    default: null
  },
  fromCallsign: {
    type: String,
    default: null
  },
  placeholder: {
    type: String,
    default: '选择日期'
  }
})

const emit = defineEmits(['update:modelValue'])

const showCalendar = ref(false)
const currentYear = ref(new Date().getUTCFullYear())
const currentMonth = ref(new Date().getUTCMonth())

// 按需加载的统计数据
const dailyStats = ref({})
const yearStats = ref(0)
const monthStats = ref(0)
const loading = ref(false)

const weekDays = ['日', '一', '二', '三', '四', '五', '六']

const selectedDate = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const displayText = computed(() => {
  if (selectedDate.value) {
    return selectedDate.value
  }
  return props.placeholder
})

// 加载当前月份的统计数据
async function loadMonthStats() {
  if (!props.fromCallsign) {
    dailyStats.value = {}
    yearStats.value = 0
    monthStats.value = 0
    return
  }

  loading.value = true
  try {
    const result = await getMonthlyContactStatsFromIndexedDB(
      props.fromCallsign,
      currentYear.value,
      currentMonth.value + 1
    )
    dailyStats.value = result.dailyStats
    yearStats.value = result.yearTotal
    monthStats.value = result.monthTotal
  } catch (err) {
    console.error('加载月度统计失败:', err)
    dailyStats.value = {}
    yearStats.value = 0
    monthStats.value = 0
  }
  loading.value = false
}

// 生成日历天数
const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(Date.UTC(currentYear.value, currentMonth.value, 1))
  const lastDay = new Date(Date.UTC(currentYear.value, currentMonth.value + 1, 0))

  // 获取当月第一天是星期几
  const startDayOfWeek = firstDay.getUTCDay()

  // 填充上月日期
  const prevMonthLastDay = new Date(Date.UTC(currentYear.value, currentMonth.value, 0))
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const day = prevMonthLastDay.getUTCDate() - i
    const dateStr = formatDateStr(currentYear.value, currentMonth.value - 1, day)
    days.push({
      day,
      dateStr,
      isCurrentMonth: false,
      count: 0,
      isToday: false
    })
  }

  // 当月日期
  const today = new Date()
  const todayStr = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(today.getUTCDate()).padStart(2, '0')}`

  for (let day = 1; day <= lastDay.getUTCDate(); day++) {
    const dateStr = formatDateStr(currentYear.value, currentMonth.value, day)
    days.push({
      day,
      dateStr,
      isCurrentMonth: true,
      count: dailyStats.value[dateStr] || 0,
      isToday: dateStr === todayStr
    })
  }

  // 填充下月日期，补齐6行
  const remainingDays = 42 - days.length
  for (let day = 1; day <= remainingDays; day++) {
    const dateStr = formatDateStr(currentYear.value, currentMonth.value + 1, day)
    days.push({
      day,
      dateStr,
      isCurrentMonth: false,
      count: 0,
      isToday: false
    })
  }

  return days
})

function formatDateStr(year, month, day) {
  // 处理跨年的情况
  const date = new Date(Date.UTC(year, month, day))
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
  if (showCalendar.value) {
    loadMonthStats()
  }
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
  loadMonthStats()
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
  loadMonthStats()
}

function selectDate(day) {
  if (day.isCurrentMonth) {
    selectedDate.value = day.dateStr
    showCalendar.value = false
  }
}

function clearDate() {
  selectedDate.value = null
}

// 当选中日期变化时，跳转到对应月份
watch(
  () => props.modelValue,
  (newVal) => {
    if (newVal) {
      const [year, month] = newVal.split('-').map(Number)
      if (year !== currentYear.value || month - 1 !== currentMonth.value) {
        currentYear.value = year
        currentMonth.value = month - 1
        if (showCalendar.value) {
          loadMonthStats()
        }
      }
    }
  }
)

// ESC 关闭日历
function handleKeydown(e) {
  if (e.key === 'Escape' && showCalendar.value) {
    showCalendar.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
.date-picker {
  position: relative;
  display: inline-block;
}

.date-picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  cursor: pointer;
  background: var(--bg-input);
  color: var(--text-primary);
  font-size: 0.9rem;
  white-space: nowrap;
  min-width: 110px;
  height: 32px;
  box-sizing: border-box;
}

.date-picker-trigger:hover {
  border-color: var(--color-primary);
}

.clear-btn {
  color: var(--text-secondary);
  font-size: 1.1rem;
  line-height: 1;
}

.clear-btn:hover {
  color: var(--color-danger);
}

.trigger-text.placeholder {
  color: var(--text-secondary);
  font-weight: 350;
  opacity: 0.85;
}

.calendar-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.4);
}

.calendar-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  z-index: 1000;
  padding: 1.25rem;
  width: 340px;
  max-width: 95vw;
}

/* 导航栏 */
.calendar-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.nav-btn {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-primary);
  background: var(--bg-input);
  cursor: pointer;
  color: var(--text-primary);
  border-radius: 8px;
  transition: all 0.2s;
  font-size: 1.2rem;
  font-weight: bold;
}

.nav-btn:hover {
  background: var(--bg-hover);
  border-color: var(--color-primary);
}

.nav-title {
  text-align: center;
}

.nav-year {
  font-size: 1rem;
  color: var(--text-secondary);
  margin-bottom: 2px;
}

.nav-month {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text-primary);
}

.stats-badge {
  font-size: 1rem;
  font-weight: 500;
  color: var(--color-success);
}

/* 星期栏 */
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin-bottom: 0.5rem;
}

.weekdays span {
  text-align: center;
  font-size: 0.75rem;
  color: var(--text-disabled);
  padding: 0.5rem 0;
  font-weight: 500;
}

/* 日期网格 */
.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.15s;
}

.day-cell:hover {
  background: var(--bg-hover);
}

.day-cell.other-month {
  color: var(--text-disabled);
  cursor: default;
}

.day-cell.other-month:hover {
  background: transparent;
}

.day-cell.has-data {
  background: var(--bg-success-light);
  font-weight: 500;
}

.day-cell.has-data:hover {
  background: var(--color-success-border);
}

.day-cell.today {
  border: 2px solid var(--color-primary);
}

.day-cell.selected {
  background: var(--color-primary);
  color: white;
  font-weight: 500;
}

.day-cell.selected:hover {
  background: var(--color-primary);
}

.day-cell.selected.today {
  border-color: var(--color-primary);
}

.day-number {
  line-height: 1;
}

/* 通联数徽章 */
.day-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 16px;
  text-align: center;
  color: white;
  background: var(--color-success);
  border-radius: 8px;
}

.day-cell.selected .day-badge {
  background: rgba(255, 255, 255, 0.3);
}
</style>
