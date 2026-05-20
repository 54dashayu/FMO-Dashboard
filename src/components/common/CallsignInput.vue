<template>
  <input :value="modelValue" type="text" v-bind="filteredAttrs" @input="handleInput" />
</template>

<script setup>
import { computed, useAttrs } from 'vue'

defineOptions({
  inheritAttrs: false
})

defineProps({
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'input'])

const attrs = useAttrs()

const filteredAttrs = computed(() => {
  const result = { ...attrs }
  Object.keys(result).forEach((key) => {
    if (key.startsWith('on') && typeof result[key] === 'function') {
      delete result[key]
    }
  })
  return result
})

function handleInput(event) {
  const rawValue = event.target.value
  // 仅保留英文字母和数字，并转为大写
  const filtered = rawValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()

  // 同步更新 DOM，避免非法字符闪现
  if (filtered !== rawValue) {
    event.target.value = filtered
  }

  emit('update:modelValue', filtered)
  emit('input', event)
}
</script>
