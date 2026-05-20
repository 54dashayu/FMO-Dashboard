import { watch, getCurrentScope, onScopeDispose } from 'vue'

// ---- 全局弹框注册表 ----
// 用于统一管理所有弹框的返回键拦截逻辑。
// 各组件通过 registerModal 注册弹框的可见性检查和关闭方法，
// 由全局 popstate 监听器统一处理返回键关闭弹框。

const modalRegistry = []
let modalHistoryPushed = false
let popstateInstalled = false

/**
 * 注册一个弹框到全局拦截器
 * @param {() => boolean} check - 检查弹框是否可见
 * @param {() => void} close - 关闭弹框的方法
 * @param {number} [priority=100] - 优先级，数字越小越先关闭（ConfirmDialog: 1, 通联记录: 10, 其余: 50-100）
 * @returns {() => void} 取消注册的函数
 */
export function registerModal(check, close, priority = 100) {
  const entry = { check, close, priority }
  modalRegistry.push(entry)
  modalRegistry.sort((a, b) => a.priority - b.priority)
  return () => {
    const idx = modalRegistry.indexOf(entry)
    if (idx !== -1) modalRegistry.splice(idx, 1)
  }
}

/** 当前打开的弹框数量 */
export function countOpenModals() {
  return modalRegistry.filter((e) => e.check()).length
}

/** 按优先级关闭最顶层弹框 */
export function closeTopModal() {
  for (const entry of modalRegistry) {
    if (entry.check()) {
      entry.close()
      return
    }
  }
}

// ---- 浏览器返回键拦截核心 ----

function ensureModalHistoryState() {
  if (!modalHistoryPushed && countOpenModals() > 0) {
    history.pushState({ modalOpen: true }, '')
    modalHistoryPushed = true
  }
}

function resetModalHistoryState() {
  modalHistoryPushed = false
}

function handleModalPopState(event) {
  if (countOpenModals() > 0) {
    event.stopImmediatePropagation()
    closeTopModal()
    modalHistoryPushed = false
    if (countOpenModals() > 0) {
      history.pushState({ modalOpen: true }, '')
      modalHistoryPushed = true
    }
  }
}

function installPopstateListener() {
  if (popstateInstalled) return
  // capture: true 确保在捕获阶段运行，早于 Vue Router 在冒泡阶段注册的监听器
  window.addEventListener('popstate', handleModalPopState, { capture: true })
  popstateInstalled = true
}

// ---- Composable ----
// 组件中调用此函数来接入全局弹框返回拦截。
// 传入需要监听的响应式 ref 列表，会自动 watch 它们来管理 history 状态。
// 返回 { registerModal } 用于注册该组件的弹框。

/**
 * @param {import('vue').Ref[]} modalRefs - 需要监听的弹框可见性 ref（如 showDialog）
 * @returns {{ registerModal: Function }}
 */
export function useModalBackHandler(modalRefs = []) {
  installPopstateListener()

  // 自动 watch 传入的 ref，同步 history 状态
  if (modalRefs.length > 0) {
    const scope = getCurrentScope()
    const stopWatch = watch(
      modalRefs,
      () => {
        if (countOpenModals() > 0) {
          ensureModalHistoryState()
        } else {
          resetModalHistoryState()
        }
      },
      { deep: true, flush: 'sync' }
    )
    if (scope) {
      onScopeDispose(stopWatch)
    }
  }

  return { registerModal }
}
