<template>
  <header class="header">
    <button
      class="brand-home"
      type="button"
      :title="t('header.backDashboard', '返回仪表盘')"
      @click="router.push('/dashboard')"
    >
      <img src="/app-icon.png" alt="" class="header-logo" />
      <span>{{ t('app.name', 'FMO 仪表盘') }}</span>
    </button>

    <div class="connection-summary">
      <span class="status-light"></span>
      <strong
        >{{ currentSpeaker || ownCallsign || selectedFromCallsign || 'FMO' }}
        {{
          currentSpeaker ? t('header.onAir', '正在通联') : t('header.monitoring', '正在守听')
        }}</strong
      >
    </div>

    <div class="header-stats">
      <span :title="t('header.total', '总通联数量')"
        ><b class="stat-star">★</b>{{ totalLogs }}</span
      >
      <span :title="t('header.friends', '好友数量')"
        ><b class="stat-light friend"></b>{{ t('header.friends', '好友') }}
        {{ uniqueCallsigns }}</span
      >
      <span :title="t('header.today', '今日通联数量')"
        ><b class="stat-light today"></b>{{ t('header.today', '今日') }} {{ todayLogs }}</span
      >
    </div>

    <div class="header-actions">
      <label class="voice-select-wrap" :title="t('header.broadcastMode', '播报模式')">
        <span class="voice-dot"></span>
        <select
          :value="voiceMode"
          :aria-label="t('header.broadcastMode', '播报模式')"
          @change="$emit('update-voice-mode', $event.target.value)"
        >
          <option value="alert">{{ t('header.newCallsignAlert', '新呼号提醒') }}</option>
          <option value="radio">{{ t('header.contactBroadcast', '通联播报') }}</option>
          <option value="off">{{ t('header.broadcastOff', '关闭所有播报') }}</option>
        </select>
      </label>

      <button class="tool-btn theme-btn" type="button" @click="toggleTheme">
        <span>{{ isDarkTheme ? '☾' : '☀' }}</span>
        <span
          >{{ t('header.theme', '主题') }}
          {{ isDarkTheme ? t('header.dark', '深') : t('header.light', '浅') }}</span
        >
      </button>

      <PublicSiteTools />

      <button
        class="tool-btn icon-btn"
        type="button"
        :title="t('common.language', '语言：简体中文')"
        @click="toggleLocale"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
        </svg>
      </button>

      <button
        class="tool-btn icon-btn"
        type="button"
        :title="t('common.settings', '设置')"
        @click="router.push('/settings')"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5v.2h-4v-.2a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1-2.8-2.8.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3v-4h.2a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1 2.8-2.8.1.1a1.7 1.7 0 0 0 1.8.3 1.7 1.7 0 0 0 1-1.5V3h4v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1 2.8 2.8-.1.1a1.7 1.7 0 0 0-.3 1.8 1.7 1.7 0 0 0 1.5 1h.2v4h-.2a1.7 1.7 0 0 0-1.4 1Z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import PublicSiteTools from './PublicSiteTools.vue'
import { useLocale } from '../../composables/useLocale'

const router = useRouter()
const { t, toggleLocale } = useLocale()
const storedTheme = localStorage.getItem('fmo_theme')
const isDarkTheme = ref(
  storedTheme === 'dark' ||
    (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
)

defineProps({
  todayLogs: { type: Number, default: 0 },
  totalLogs: { type: Number, default: 0 },
  uniqueCallsigns: { type: Number, default: 0 },
  currentSpeaker: { type: String, default: '' },
  ownCallsign: { type: String, default: '' },
  selectedFromCallsign: { type: String, default: '' },
  voiceMode: { type: String, default: 'off' }
})

defineEmits(['update-voice-mode'])

function applyTheme() {
  document.documentElement.dataset.theme = isDarkTheme.value ? 'dark' : 'light'
  localStorage.setItem('fmo_theme', isDarkTheme.value ? 'dark' : 'light')
}

function toggleTheme() {
  isDarkTheme.value = !isDarkTheme.value
  applyTheme()
}

onMounted(applyTheme)
</script>

<style scoped>
.header {
  z-index: 100;
  display: flex;
  min-width: 0;
  min-height: 3.9rem;
  flex-shrink: 0;
  align-items: center;
  gap: 0.8rem;
  padding: 0.7rem 1rem;
  border-bottom: 1px solid color-mix(in srgb, var(--border-light) 80%, var(--color-primary));
  background: var(--bg-header);
  box-sizing: border-box;
}

.brand-home,
.connection-summary,
.header-stats,
.header-actions,
.header-stats span,
.voice-select-wrap,
.tool-btn {
  display: flex;
  align-items: center;
}

.brand-home {
  gap: 0.55rem;
  padding: 0;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 1rem;
  font-weight: 750;
  white-space: nowrap;
  cursor: pointer;
}

.header-logo {
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-primary);
  border-radius: 7px;
}

.connection-summary {
  min-width: 0;
  gap: 0.55rem;
}

.connection-summary strong {
  overflow: hidden;
  color: var(--text-primary);
  font-size: 0.9rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-light,
.stat-light,
.voice-dot {
  width: 0.5rem;
  height: 0.5rem;
  flex-shrink: 0;
  border-radius: 50%;
}

.status-light {
  background: var(--color-success);
  box-shadow: 0 0 0 4px var(--surface-success);
}

.header-stats {
  gap: 0.55rem;
}

.header-stats span {
  gap: 0.28rem;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 650;
  white-space: nowrap;
}

.stat-star {
  color: #f6b925;
  font-size: 0.92rem;
}

.stat-light.friend {
  background: #45b6ff;
}

.stat-light.today {
  background: #65d47e;
}

.header-actions {
  gap: 0.5rem;
  margin-left: auto;
}

.voice-select-wrap,
.tool-btn {
  height: 2.25rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--bg-table-stripe);
  box-sizing: border-box;
}

.voice-select-wrap {
  gap: 0.35rem;
  padding-left: 0.6rem;
}

.voice-dot {
  background: var(--color-primary);
}

.voice-select-wrap select {
  width: 7.5rem;
  height: 100%;
  padding: 0 1.15rem 0 0;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.tool-btn {
  justify-content: center;
  gap: 0.35rem;
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.tool-btn:hover,
.brand-home:hover {
  color: var(--color-primary);
}

.icon-btn {
  width: 2.25rem;
  padding: 0;
}

.icon-btn svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@media (min-width: 769px) and (max-width: 1000px) {
  .header {
    gap: 0.45rem;
    padding-inline: 0.55rem;
  }

  .brand-home,
  .connection-summary {
    gap: 0.35rem;
  }

  .brand-home,
  .connection-summary strong {
    font-size: 0.82rem;
  }

  .header-stats {
    gap: 0.3rem;
  }

  .header-stats span {
    font-size: 0.68rem;
  }

  .theme-btn {
    padding: 0 0.45rem;
  }

  .voice-select-wrap select {
    width: 6.8rem;
  }
}

@media (max-width: 768px) {
  .header {
    min-height: 3.4rem;
    padding: 0.5rem 0.75rem;
  }

  .brand-home span,
  .connection-summary,
  .header-stats,
  .voice-select-wrap {
    display: none;
  }

  .theme-btn {
    width: 2.25rem;
    padding: 0;
  }

  .theme-btn span:last-child {
    display: none;
  }

  .header-logo {
    width: 2rem;
    height: 2rem;
  }
}
</style>
