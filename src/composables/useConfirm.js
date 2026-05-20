import { ref } from 'vue'

const visible = ref(false)
const title = ref('')
const message = ref('')
const confirmText = ref('确定')
const cancelText = ref('取消')
let resolvePromise = null

export function useConfirm() {
  function show(options) {
    return new Promise((resolve) => {
      if (typeof options === 'string') {
        message.value = options
        title.value = '确认'
      } else {
        message.value = options.message || ''
        title.value = options.title || '确认'
        confirmText.value = options.confirmText || '确定'
        cancelText.value = options.cancelText || '取消'
      }

      visible.value = true
      resolvePromise = resolve
    })
  }

  function confirm() {
    visible.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  function cancel() {
    visible.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  return {
    visible,
    title,
    message,
    confirmText,
    cancelText,
    show,
    confirm,
    cancel
  }
}

// 导出单例供全局使用
const confirmDialog = useConfirm()
export default confirmDialog
