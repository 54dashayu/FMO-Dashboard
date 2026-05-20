<template>
  <div class="top20-container">
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
    <template v-else-if="top20Result">
      <!-- 对方呼号 TOP20 -->
      <div class="top20-card">
        <h3>对方呼号 TOP20</h3>
        <div class="top20-list">
          <div
            v-for="(item, index) in top20Result.toCallsign"
            :key="'callsign-' + index"
            class="top20-item"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="name">{{ item.toCallsign || '-' }}</span>
            <span class="count"
              ><strong>{{ item.count }}</strong></span
            >
          </div>
          <div v-if="top20Result.toCallsign.length === 0" class="empty-item">暂无数据</div>
        </div>
      </div>

      <!-- 接收网格 TOP20 -->
      <div class="top20-card">
        <h3>接收网格 TOP20</h3>
        <div class="top20-list">
          <div
            v-for="(item, index) in top20Result.toGrid"
            :key="'grid-' + index"
            class="top20-item"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="name name-stacked">
              <span class="name-grid">{{ item.toGrid || '-' }}</span>
              <span
                v-if="gridAddressMap[item.toGrid]"
                class="name-addr"
                :title="gridAddressMap[item.toGrid]"
              >
                {{ gridAddressMap[item.toGrid] }}
              </span>
            </span>
            <span class="count"
              ><strong>{{ item.count }}</strong></span
            >
          </div>
          <div v-if="top20Result.toGrid.length === 0" class="empty-item">暂无数据</div>
        </div>
      </div>

      <!-- 中继名称 TOP20 -->
      <div class="top20-card">
        <h3>中继名称 TOP20</h3>
        <div class="top20-list">
          <div
            v-for="(item, index) in top20Result.relayName"
            :key="'relay-' + index"
            class="top20-item"
          >
            <span class="rank">{{ index + 1 }}</span>
            <span class="name"
              >{{ item.relayName || '-'
              }}<span class="relay-admin">（{{ item.relayAdmin }}）</span></span
            >
            <span class="count"
              ><strong>{{ item.count }}</strong></span
            >
          </div>
          <div v-if="top20Result.relayName.length === 0" class="empty-item">暂无数据</div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { watch, reactive } from 'vue'
import { gridToAddress } from '../../services/gridService'

const props = defineProps({
  top20Result: {
    type: Object,
    default: null
  },
  dbLoaded: {
    type: Boolean,
    default: false
  }
})

const gridAddressMap = reactive({})

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

async function loadGridAddresses(result) {
  if (!result?.toGrid?.length) return
  const grids = new Set()
  for (const item of result.toGrid) {
    if (item.toGrid) grids.add(item.toGrid)
  }
  for (const grid of grids) {
    if (gridAddressMap[grid] !== undefined) continue
    try {
      const data = await gridToAddress(grid)
      gridAddressMap[grid] = formatAddress(data)
    } catch {
      gridAddressMap[grid] = ''
    }
  }
}

watch(() => props.top20Result, loadGridAddresses, { immediate: true, deep: true })
</script>

<style scoped>
.top20-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  flex: 1;
  overflow: auto;
  margin-top: 1rem;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  align-content: start;
}

.empty-hint {
  grid-column: 1 / -1;
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

/* ===== 卡片样式 ===== */
.top20-card {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 1px 3px var(--shadow-card);
  transition: box-shadow 0.2s;
}

.top20-card:hover {
  box-shadow: 0 4px 16px var(--shadow-card);
}

.top20-card h3 {
  margin: 0;
  padding: 0.875rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  overflow: visible;
}

/* 每个卡片标题前的彩色圆点 */
.top20-card h3::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.top20-card:nth-child(1) h3::before {
  background: #6366f1;
}

.top20-card:nth-child(2) h3::before {
  background: #10b981;
}

.top20-card:nth-child(3) h3::before {
  background: #f59e0b;
}

/* ===== 列表样式 ===== */
.top20-list {
  padding: 0.375rem 0;
  overflow-y: auto;
  flex: 1;
}

.top20-item {
  display: flex;
  align-items: center;
  padding: 0.55rem 1.25rem;
  line-height: 1.5;
  gap: 0.75rem;
  transition: background 0.15s;
  border-left: 3px solid transparent;
}

.top20-item:hover {
  background: var(--bg-table-hover);
}

/* 前三名左侧色条 */
.top20-item:nth-child(1) {
  border-left-color: #f59e0b;
}

.top20-item:nth-child(2) {
  border-left-color: #94a3b8;
}

.top20-item:nth-child(3) {
  border-left-color: #d97706;
}

/* 斑马纹 */
.top20-item:nth-child(even) {
  background: var(--bg-table-stripe);
}

.top20-item:nth-child(even):hover {
  background: var(--bg-table-hover);
}

/* ===== 排名序号 ===== */
.top20-item .rank {
  width: 26px;
  min-width: 26px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-tertiary);
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.top20-item:nth-child(1) .rank {
  color: #f59e0b;
  font-size: 0.95rem;
  font-weight: 700;
}

.top20-item:nth-child(2) .rank {
  color: #94a3b8;
  font-size: 0.9rem;
  font-weight: 700;
}

.top20-item:nth-child(3) .rank {
  color: #d97706;
  font-size: 0.9rem;
  font-weight: 700;
}

/* ===== 名称 ===== */
.top20-item .name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: var(--text-primary);
  min-width: 0;
}

.name-stacked {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  line-height: 1.3;
}

.name-grid {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.name-addr {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top20-item .relay-admin {
  color: var(--text-tertiary);
  font-size: 0.82rem;
  font-weight: 400;
}

/* ===== 计数 ===== */
.top20-item .count {
  flex-shrink: 0;
  margin-left: auto;
}

.top20-item .count strong {
  display: inline-block;
  min-width: 1.8ch;
  text-align: center;
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-primary);
  background: var(--bg-card);
  border: 1px solid var(--color-primary);
  padding: 0.1rem 0.45rem;
  border-radius: 10px;
  line-height: 1.4;
}

.empty-item {
  text-align: center;
  color: var(--text-tertiary);
  padding: 2rem;
  font-size: 0.9rem;
}

/* ===== 响应式 ===== */
@media (max-width: 1024px) {
  .top20-container {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .top20-container {
    grid-template-columns: 1fr;
    margin-top: 0.5rem;
    overflow: visible;
    padding: 0;
    gap: 0.75rem;
  }

  .top20-card {
    max-height: none;
    width: 100%;
  }

  .top20-item {
    padding: 0.5rem 1rem;
  }

  .top20-card h3 {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}
</style>
