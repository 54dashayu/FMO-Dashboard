import { ref } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  function show(message, type = 'info', duration = 3000) {
    const id = ++toastId
    toasts.value.push({ id, message, type })

    if (duration > 0) {
      setTimeout(() => {
        remove(id)
      }, duration)
    }

    return id
  }

  function remove(id) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  function error(message, duration = 4000) {
    return show(message, 'error', duration)
  }

  function success(message, duration = 3000) {
    return show(message, 'success', duration)
  }

  function warning(message, duration = 3500) {
    return show(message, 'warning', duration)
  }

  function info(message, duration = 3000) {
    return show(message, 'info', duration)
  }

  return {
    toasts,
    show,
    remove,
    error,
    success,
    warning,
    info
  }
}

// 导出单例供全局使用
const toast = useToast()
export default toast
