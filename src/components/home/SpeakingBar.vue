<template>
  <div
    v-if="fmoAddress && (eventsConnected || speakingHistory.length > 0)"
    class="speaking-bar"
    @click="$emit('click')"
  >
    <div class="speaking-bar-content">
      <span v-if="isSpeakingNow" class="speaking-indicator speaking"></span>
      <span v-else class="speaking-indicator idle"></span>
      <span class="speaking-text">
        <template v-if="displaySpeaker">
          <template v-if="multiSelectMode && isSpeakingNow">
            <!-- 多选模式：显示所有服务器的当前发言者，格式：呼号[标记]、呼号[标记] -->
            {{ speakerLabel }}:
            <span
              v-for="(speaker, index) in allCurrentSpeakers"
              :key="speaker.addressId"
              class="speaker-item"
            >
              <strong>{{ speaker.callsign }}[{{ getServerName(speaker.addressId) }}]</strong>
              <span v-if="speaker.callsign === selectedFromCallsign" class="self-tag">{{
                t('header.you', '您')
              }}</span>
              <span v-if="todayContactedCallsigns.has(speaker.callsign)" class="today-star">★</span>
              <span v-if="contactCounts.get(speaker.callsign)" class="contact-count">
                x{{ contactCounts.get(speaker.callsign) }}
              </span>
              <span v-if="speaker.address" class="speaker-address">{{ speaker.address }}</span>
              <strong v-if="index < allCurrentSpeakers.length - 1">&nbsp;&nbsp;&nbsp;&nbsp;</strong>
            </span>
          </template>
          <template v-else>
            <!-- 单选模式：只显示当前发言者，不加标记 -->
            {{ speakerLabel }}: <strong>{{ displaySpeaker }}</strong>
            <span v-if="displaySpeaker === selectedFromCallsign" class="self-tag">{{
              t('header.you', '您')
            }}</span>
            <span v-if="todayContactedCallsigns.has(displaySpeaker)" class="today-star">★</span>
            <span v-if="contactCounts.get(displaySpeaker)" class="contact-count">
              x{{ contactCounts.get(displaySpeaker) }}
            </span>
            <span v-if="displaySpeakerAddress" class="speaker-address">{{
              displaySpeakerAddress
            }}</span>
          </template>
        </template>
        <template v-else> {{ t('header.lastSpeaker', '最后发言') }} </template>
      </span>
      <button
        class="audio-toggle-btn"
        :class="{ playing: isAudioPlaying, muted: isAudioMuted }"
        :title="
          isAudioPlaying
            ? isAudioMuted
              ? t('header.muted', '已静音')
              : t('header.broadcastOff', '关闭所有播报')
            : t('header.enableBroadcast', '开启通联播报')
        "
        @click.stop="$emit('toggle-audio')"
      >
        <span class="audio-icon">{{ isAudioPlaying ? '■' : '▶' }}</span>
      </button>
      <select
        class="voice-mode-select"
        :value="voiceMode"
        :title="t('header.broadcastMode', '声音模式')"
        @click.stop
        @change.stop="$emit('update-voice-mode', $event.target.value)"
      >
        <option value="alert">{{ t('header.newCallsignAlert', '新呼号提示') }}</option>
        <option value="radio">{{ t('header.contactBroadcast', '通联播报') }}</option>
        <option value="off">{{ t('header.broadcastOff', '关闭所有播报') }}</option>
      </select>
      <span class="speaking-expand">{{ t('header.clickExpand', '点击展开') }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useLocale } from '../../composables/useLocale'

const props = defineProps({
  currentSpeaker: {
    type: String,
    default: ''
  },
  currentSpeakerAddress: {
    type: String,
    default: ''
  },
  speakingHistory: {
    type: Array,
    default: () => []
  },
  fmoAddress: {
    type: String,
    default: ''
  },
  eventsConnected: {
    type: Boolean,
    default: false
  },
  selectedFromCallsign: {
    type: String,
    default: ''
  },
  allCurrentSpeakers: {
    type: Array,
    default: () => []
  },
  // 元素结构: { addressId, callsign, address }
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
  isAudioPlaying: {
    type: Boolean,
    default: false
  },
  isAudioMuted: {
    type: Boolean,
    default: false
  },
  todayContactedCallsigns: {
    type: Set,
    default: () => new Set()
  },
  contactCounts: {
    type: Map,
    default: () => new Map()
  },
  voiceMode: {
    type: String,
    default: 'off'
  }
})

const LINGER_MS = 5000
const { t } = useLocale()
const lingeringSpeaker = ref('')
const lingeringSpeakerAddress = ref('')
let lingerTimer = null

const displaySpeaker = computed(() => props.currentSpeaker || lingeringSpeaker.value)
const displaySpeakerAddress = computed(() =>
  props.currentSpeaker ? props.currentSpeakerAddress : lingeringSpeakerAddress.value
)
const isSpeakingNow = computed(() => Boolean(props.currentSpeaker))
const speakerLabel = computed(() =>
  props.currentSpeaker ? t('header.speakingNow', '正在发言') : t('header.lastSpeaker', '最后发言')
)

function clearLingerTimer() {
  if (lingerTimer) {
    clearTimeout(lingerTimer)
    lingerTimer = null
  }
}

function rememberCurrentSpeaker() {
  if (!props.currentSpeaker) return
  lingeringSpeaker.value = props.currentSpeaker
  lingeringSpeakerAddress.value = props.currentSpeakerAddress || ''
}

function clearLingeringSpeakerAfterDelay() {
  clearLingerTimer()
  if (!lingeringSpeaker.value) return
  lingerTimer = setTimeout(() => {
    lingeringSpeaker.value = ''
    lingeringSpeakerAddress.value = ''
    lingerTimer = null
  }, LINGER_MS)
}

watch(
  () => props.currentSpeaker,
  (speaker) => {
    if (speaker) {
      clearLingerTimer()
      rememberCurrentSpeaker()
      return
    }
    clearLingeringSpeakerAfterDelay()
  },
  { immediate: true }
)

watch(
  () => props.currentSpeakerAddress,
  () => {
    if (props.currentSpeaker) rememberCurrentSpeaker()
  }
)

onBeforeUnmount(() => {
  clearLingerTimer()
})

// 根据 addressId 获取服务器显示名称
function getServerName(addressId) {
  // 主服务器显示"主"
  if (addressId === props.activeAddressId) return t('common.primary', '主')
  const address = props.addressList.find((a) => a.id === addressId)
  if (!address) return '?'
  // 显示 numId，如果没有则降级显示在列表中的 index+1
  if (address.numId) return address.numId.toString()
  const index = props.addressList.findIndex((a) => a.id === addressId)
  return index !== -1 ? (index + 1).toString() : '?'
}

defineEmits(['click', 'toggle-audio', 'update-voice-mode'])
</script>

<style scoped>
.speaking-bar {
  flex-shrink: 0;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border-light);
  padding: 0.45rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 0;
  overflow: hidden;
}

.speaking-bar:hover {
  background: var(--bg-table-stripe);
}

.speaking-bar-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 2rem;
  min-width: 0;
}

.speaking-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
}

.speaking-indicator.speaking {
  background: var(--color-speaking);
  box-shadow: 0 0 0 5px var(--surface-success);
  animation: pulse 1.5s infinite;
}

.speaking-indicator.idle {
  background: var(--text-disabled);
  box-shadow: 0 0 0 5px color-mix(in srgb, var(--text-disabled) 18%, transparent);
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

.speaking-text {
  flex: 1;
  min-width: 0;
  font-size: 0.88rem;
  color: var(--text-primary);
  line-height: 1.3rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.speaking-text strong {
  color: var(--color-speaking);
  font-weight: 700;
  font-size: 0.92rem;
}

.speaking-expand {
  font-size: 0.78rem;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

/* 音频播放按钮 */
.audio-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  margin: 0;
  border: 1px solid var(--border-light);
  background: var(--bg-table-stripe);
  cursor: pointer;
  flex-shrink: 0;
  border-radius: 7px;
  transition: background-color 0.2s;
}

.audio-toggle-btn:hover {
  background-color: var(--bg-table-hover);
}

.audio-toggle-btn .audio-icon {
  font-size: 0.9rem;
  color: var(--text-tertiary);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 播放中状态 */
.audio-toggle-btn.playing .audio-icon {
  color: var(--color-speaking);
}

/* 静音状态 */
.audio-toggle-btn.muted .audio-icon {
  color: var(--text-disabled);
}

.voice-mode-select {
  flex-shrink: 0;
  max-width: 120px;
  min-height: 34px;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  background: var(--bg-table-header);
  color: var(--text-secondary);
  font-size: 0.85rem;
  padding: 0.25rem 0.35rem;
  outline: none;
  cursor: pointer;
}

.voice-mode-select:focus {
  border-color: var(--color-speaking);
}

/* 发言者项样式 */
.speaker-item {
  display: inline;
}

/* 当前用户标签样式 */
.self-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3em;
  border-radius: 2px;
  font-size: 0.6em;
  font-weight: 400;
  background: rgba(212, 107, 8, 0.12);
  color: var(--color-warning);
  line-height: 1;
  text-align: center;
  vertical-align: middle;
  position: relative;
  top: -0.08em;
  margin-left: 0.2em;
}

.today-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.3em;
  border-radius: 2px;
  font-size: 0.65em;
  font-weight: 400;
  background: rgba(255, 193, 7, 0.15);
  color: #d97706;
  line-height: 1;
  text-align: center;
  vertical-align: middle;
  position: relative;
  top: -0.08em;
  margin-left: 0.2em;
}

/* 地址显示样式 */
.speaker-address {
  display: inline;
  font-size: 0.85em;
  color: var(--text-tertiary);
  font-weight: 400;
  margin-left: 0.3em;
}

.contact-count {
  display: inline-flex;
  align-items: center;
  font-size: 0.75em;
  font-weight: 400;
  color: var(--text-tertiary);
  margin-left: 0.2em;
  vertical-align: middle;
  position: relative;
  top: -0.08em;
  line-height: 1;
}

:global(.native-ios) .speaking-bar {
  padding: 0.4rem 0.75rem;
}

:global(.native-ios) .speaking-bar-content {
  min-height: 2rem;
}

:global(.native-ios) .speaking-text {
  font-size: 1.1rem;
}

:global(.native-ios) .speaking-text strong {
  font-size: 1.3rem;
}

:global(.native-ios) .speaking-expand {
  font-size: 0.9rem;
}

:global(.native-ios) .audio-toggle-btn {
  width: 32px;
  height: 32px;
}

:global(.native-ios) .audio-toggle-btn .audio-icon {
  font-size: 1rem;
}

:global(.native-ios) .voice-mode-select {
  max-width: 104px;
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .speaking-bar {
    padding: 0.4rem 0.75rem;
  }

  .speaking-bar-content {
    min-height: 2rem;
  }

  .speaking-text {
    font-size: 0.88rem;
  }

  .speaking-text strong {
    font-size: 0.92rem;
  }

  .speaking-expand {
    font-size: 0.9rem;
  }

  .audio-toggle-btn {
    width: 32px;
    height: 32px;
  }

  .audio-toggle-btn .audio-icon {
    font-size: 1rem;
  }

  .voice-mode-select {
    max-width: 104px;
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .speaking-bar {
    padding: 0.35rem 0.5rem;
  }

  .speaking-bar-content {
    gap: 0.5rem;
    min-height: 1.8rem;
  }

  .speaking-indicator {
    width: 9px;
    height: 9px;
  }

  .speaking-text {
    font-size: 0.82rem;
  }

  .speaking-text strong {
    font-size: 0.86rem;
  }

  .speaking-expand {
    display: none;
  }

  .audio-toggle-btn {
    width: 28px;
    height: 28px;
  }

  .audio-toggle-btn .audio-icon {
    font-size: 0.85rem;
  }

  .voice-mode-select {
    max-width: 92px;
    font-size: 0.75rem;
  }
}
</style>
