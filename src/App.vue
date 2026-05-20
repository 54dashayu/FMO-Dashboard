<script setup>
import { onUnmounted } from 'vue'
import ToastContainer from './components/common/ToastContainer.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
import confirmDialog from './composables/useConfirm'
import { useModalBackHandler, registerModal } from './composables/useModalBackHandler'

// ---- 全局确认弹框返回键拦截（最高优先级）----
useModalBackHandler([confirmDialog.visible])

const _unregConfirm = registerModal(
  () => confirmDialog.visible.value,
  () => confirmDialog.cancel(),
  1
)

onUnmounted(() => {
  _unregConfirm()
})
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>

<style>
html,
body {
  margin: 0;
  padding: 0;
  height: 100%;
  overflow: hidden;
}

#app {
  height: 100%;
}
</style>
