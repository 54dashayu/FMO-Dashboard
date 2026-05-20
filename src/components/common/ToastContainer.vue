<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="item in toasts"
          :key="item.id"
          :class="['toast', `toast-${item.type}`]"
          @click="remove(item.id)"
        >
          <span class="toast-icon">{{ getIcon(item.type) }}</span>
          <span class="toast-message">{{ item.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import toastService from '../../composables/useToast'

const { toasts, remove } = toastService

function getIcon(type) {
  const icons = {
    success: '\u2713',
    error: '\u2717',
    warning: '\u26A0',
    info: '\u2139'
  }
  return icons[type] || icons.info
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: calc(20px + var(--safe-inset-top, env(safe-area-inset-top, 0px)));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 6px;
  background: var(--bg-card);
  box-shadow: 0 4px 12px var(--shadow-modal);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  pointer-events: auto;
  max-width: 400px;
  word-break: break-word;
}

.toast-icon {
  flex-shrink: 0;
  font-size: 16px;
}

.toast-message {
  flex: 1;
}

.toast-success {
  background: var(--bg-success-light);
  border: 1px solid var(--color-success-border);
}

.toast-success .toast-icon {
  color: var(--color-success);
}

.toast-error {
  background: var(--bg-error-light);
  border: 1px solid var(--color-danger);
}

.toast-error .toast-icon {
  color: var(--color-danger);
}

.toast-warning {
  background: var(--bg-warning-light);
  border: 1px solid var(--color-warning-border);
}

.toast-warning .toast-icon {
  color: var(--color-warning);
}

.toast-info {
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
}

.toast-info .toast-icon {
  color: var(--color-primary);
}

/* 过渡动画 */
.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
