<template>
  <Teleport to="body">
    <Transition name="confirm-fade">
      <div v-if="visible" class="confirm-overlay" @click.self="cancel">
        <div class="confirm-dialog">
          <div class="confirm-header">
            <h3>{{ title }}</h3>
          </div>
          <div class="confirm-body">
            <p>{{ message }}</p>
          </div>
          <div class="confirm-footer">
            <button class="btn btn-cancel" @click="cancel">{{ cancelText }}</button>
            <button class="btn btn-confirm" @click="confirm">{{ confirmText }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import confirmDialog from '../../composables/useConfirm'

const { visible, title, message, confirmText, cancelText, confirm, cancel } = confirmDialog
</script>

<style scoped>
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.confirm-dialog {
  background: var(--bg-card);
  border-radius: 8px;
  width: 360px;
  max-width: 90%;
  box-shadow: 0 4px 20px var(--shadow-modal);
}

.confirm-header {
  padding: 16px 20px 0;
}

.confirm-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.confirm-body {
  padding: 16px 20px;
}

.confirm-body p {
  margin: 0;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  word-break: break-word;
}

.confirm-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 20px 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-cancel {
  background: var(--bg-disabled);
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--border-primary);
}

.btn-confirm {
  background: var(--color-primary);
  color: var(--text-white);
}

.btn-confirm:hover {
  background: var(--color-primary-hover);
}

/* 过渡动画 */
.confirm-fade-enter-active,
.confirm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.confirm-fade-enter-active .confirm-dialog,
.confirm-fade-leave-active .confirm-dialog {
  transition: transform 0.2s ease;
}

.confirm-fade-enter-from,
.confirm-fade-leave-to {
  opacity: 0;
}

.confirm-fade-enter-from .confirm-dialog {
  transform: scale(0.95);
}

.confirm-fade-leave-to .confirm-dialog {
  transform: scale(0.95);
}
</style>
