<template>
  <!-- 自动同步消息 -->
  <div v-if="syncMessage" class="auto-sync-hint">
    {{ syncMessage }}
  </div>

  <!-- 加载状态 -->
  <div v-if="loading" class="loading">
    <slot name="loading">加载中...</slot>
  </div>

  <!-- 错误提示 -->
  <div v-if="error" class="error">
    {{ error }}
  </div>
</template>

<script setup>
defineProps({
  syncMessage: String,
  loading: Boolean,
  error: String
})
</script>

<style scoped>
.auto-sync-hint {
  background: var(--bg-success-light);
  color: var(--color-success);
  padding: 8px 16px;
  border-radius: 4px;
  margin-bottom: 10px;
  border: 1px solid var(--color-success-border);
  font-size: 14px;
  animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
  from {
    transform: translateY(-10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.loading {
  text-align: center;
  padding: 2rem;
  color: var(--text-secondary);
}

.error {
  padding: 1rem;
  background: var(--bg-error-light);
  color: var(--color-danger);
  border-radius: 4px;
  margin-bottom: 1rem;
}
</style>
