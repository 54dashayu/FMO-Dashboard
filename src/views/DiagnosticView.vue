<template>
  <div class="diagnostic-view">
    <section class="diagnostic-card">
      <div class="diagnostic-header">
        <div>
          <h2>诊断日志</h2>
          <p>用于排查 APK 闪退、语音播报失败、FMO 连接异常等问题。</p>
        </div>
        <span class="entry-count">{{ entries.length }} 条</span>
      </div>

      <div class="action-row">
        <button class="primary-btn" @click="copyLog">复制日志</button>
        <button class="secondary-btn" @click="exportLog">导出文件</button>
        <button class="danger-btn" @click="clearLog">清空日志</button>
      </div>

      <p v-if="status" class="status-text">{{ status }}</p>

      <div class="privacy-note">
        日志只保存在本机，不会自动上传。导出前会包含设备环境、页面错误和连接失败信息，请确认后再发送给开发者。
      </div>

      <pre class="log-box">{{ logText || '暂无诊断日志' }}</pre>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import {
  addDiagnosticLog,
  clearDiagnosticLog,
  getDiagnosticEntries,
  getDiagnosticText
} from '../services/diagnosticLog'
import { exportFile, shareFile } from '../utils/exportFile'

const refreshTick = ref(0)
const status = ref('')

const entries = computed(() => {
  refreshTick.value
  return getDiagnosticEntries()
})

const logText = computed(() => {
  refreshTick.value
  return getDiagnosticText()
})

function refresh() {
  refreshTick.value += 1
}

function filename() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `FMO-Dashboard-diagnostic-${stamp}.txt`
}

async function copyLog() {
  try {
    await navigator.clipboard.writeText(logText.value)
    status.value = '诊断日志已复制'
  } catch {
    status.value = '复制失败，请使用导出文件'
  }
}

async function exportLog() {
  try {
    addDiagnosticLog('info', '用户导出诊断日志')
    refresh()
    const result = await exportFile(filename(), logText.value, 'text/plain;charset=utf-8')
    if (result?.uri) {
      try {
        await shareFile(result.uri, 'FMO仪表盘诊断日志')
      } catch {
        // 用户取消分享时，文件仍然已保存。
      }
    }
    status.value = result?.displayPath ? `已保存到：${result.displayPath}` : '诊断日志已导出'
  } catch (err) {
    addDiagnosticLog('error', '导出诊断日志失败', err)
    status.value = '导出失败，请尝试复制日志'
  } finally {
    refresh()
  }
}

function clearLog() {
  clearDiagnosticLog()
  status.value = '诊断日志已清空'
  refresh()
}
</script>

<style scoped>
.diagnostic-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.diagnostic-card {
  display: grid;
  gap: 1rem;
  max-width: 980px;
  margin: 0 auto;
  padding: 1.25rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
}

.diagnostic-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.diagnostic-header h2 {
  margin: 0 0 0.35rem;
  color: var(--text-primary);
}

.diagnostic-header p,
.privacy-note,
.status-text {
  margin: 0;
  color: var(--text-tertiary);
  line-height: 1.6;
}

.entry-count {
  flex-shrink: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.primary-btn,
.secondary-btn,
.danger-btn {
  min-width: 92px;
  border-radius: 4px;
  padding: 0.48rem 0.9rem;
  cursor: pointer;
}

.primary-btn {
  border: 1px solid var(--color-success);
  background: var(--color-success);
  color: #fff;
}

.secondary-btn {
  border: 1px solid var(--border-secondary);
  background: transparent;
  color: var(--text-primary);
}

.danger-btn {
  border: 1px solid rgba(245, 108, 108, 0.45);
  background: transparent;
  color: var(--color-danger);
}

.privacy-note {
  padding: 0.75rem;
  border-left: 3px solid var(--color-warning, #e6a23c);
  background: rgba(230, 162, 60, 0.08);
}

.log-box {
  min-height: 360px;
  max-height: 62vh;
  overflow: auto;
  margin: 0;
  padding: 1rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.18);
  color: var(--text-secondary);
  font-size: 0.78rem;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .diagnostic-view {
    padding: 1rem;
  }

  .diagnostic-card {
    padding: 1rem;
  }
}
</style>
