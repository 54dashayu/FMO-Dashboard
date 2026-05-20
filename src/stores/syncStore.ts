import { defineStore } from 'pinia'
import { ref } from 'vue'
// @ts-ignore - legacy JS
import { FmoApiClient } from '../services/fmoApi'
// @ts-ignore - legacy JS
import { getAvailableFromCallsigns } from '../services/db'
// @ts-ignore - legacy JS
import { normalizeHost } from '../utils/urlUtils'
import {
  syncRecentData,
  syncIncrementalForAddress,
  syncFullForAddress,
  processSingleQsoItem,
  type SyncFailedRecord,
  type SyncContext
} from '../core/sync'

export interface SyncAddress {
  id: string
  name?: string
  host: string
  protocol: string
}

export interface MultiSyncResult {
  addressId: string
  name: string
  success: boolean
  syncedCount: number
  error: string
}

export interface SyncOptions {
  onSyncComplete?: (info: {
    callsigns: string[]
    syncedCount: number
    reload?: boolean
    multiSync?: boolean
  }) => void | Promise<void>
  getSpeakingHistory?: (addressId: string) => Array<any>
  getSelectedFromCallsign?: () => string
  getDbLoaded?: () => boolean
  getTotalLogs?: () => number
  getEventsConnected?: (addressId: string) => boolean
}

/**
 * 同步 store（替代 composables/useFmoSync.js 的状态与编排）。
 *
 * 状态（ref）：syncing / syncStatus / autoSyncMessage / syncFailedRecords / multiSyncProgress
 * 运行上下文：通过 setContext(opts) 注入 onSyncComplete 与各类 getter；
 *   编排层在真正执行 action 时读取最新 context（MainLayout.vue 会在 composable 包装里持续绑定）。
 * 底层算法：纯函数位于 src/core/sync/。
 */
export const useSyncStore = defineStore('sync', () => {
  // ========== state ==========
  const syncing = ref(false)
  const syncStatus = ref('')
  const autoSyncMessage = ref('')
  const syncFailedRecords = ref<SyncFailedRecord[]>([])
  const multiSyncProgress = ref<{
    current: number
    total: number
    currentName: string
    results: MultiSyncResult[]
  }>({
    current: 0,
    total: 0,
    currentName: '',
    results: []
  })

  // ========== 非响应式运行时 ==========
  let autoSyncTimer: any = null
  let autoSyncMessageTimer: any = null
  let reloadTimer: any = null
  let isAutoSyncing = false
  let lastFullSyncTime = 0
  let isAborted = false
  const activeClients = new Set<any>()

  // ========== 上下文（由调用方通过 setContext 注入） ==========
  let ctx: SyncOptions = {}
  function setContext(opts: SyncOptions) {
    ctx = opts || {}
  }
  function clearContext() {
    ctx = {}
  }

  function getCurrentFromCallsign(): string {
    return ctx.getSelectedFromCallsign?.() || ''
  }

  function buildSyncContext(overrides?: Partial<SyncContext>): SyncContext {
    return {
      currentFromCallsign: getCurrentFromCallsign(),
      statusCallback: (msg) => {
        syncStatus.value = msg
      },
      onFailed: (rec) => {
        syncFailedRecords.value.push(rec)
      },
      isAborted: () => isAborted,
      ...overrides
    }
  }

  // 构建静默同步上下文（用于后台自动同步，不更新UI状态）
  function buildSilentSyncContext(overrides?: Partial<SyncContext>): SyncContext {
    return {
      currentFromCallsign: getCurrentFromCallsign(),
      statusCallback: () => {
        // 后台自动同步不更新UI状态
      },
      onFailed: (rec) => {
        syncFailedRecords.value.push(rec)
      },
      isAborted: () => isAborted,
      ...overrides
    }
  }

  // ========== 辅助 ==========
  function showAutoSyncMessage(msg: string) {
    autoSyncMessage.value = msg
    if (autoSyncMessageTimer) clearTimeout(autoSyncMessageTimer)
    autoSyncMessageTimer = setTimeout(() => {
      autoSyncMessage.value = ''
    }, 5000)
  }

  async function updateAfterSync(
    wasEmpty: boolean,
    syncedCount: number,
    message: string | null
  ) {
    if (syncedCount === 0) return { callsigns: [] as string[], wasEmpty }

    const callsigns: string[] = await getAvailableFromCallsigns()

    if (wasEmpty && syncedCount > 0) {
      window.location.reload()
      return { callsigns, wasEmpty: true }
    }

    if (message) {
      showAutoSyncMessage(message)
    }

    await ctx.onSyncComplete?.({ callsigns, syncedCount })
    return { callsigns, wasEmpty }
  }

  function checkShouldSync(addressId: string): boolean {
    const eventsConnected = ctx.getEventsConnected?.(addressId) || false
    const speakingHistory = ctx.getSpeakingHistory?.(addressId) || []
    const currentCallsign = ctx.getSelectedFromCallsign?.()

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const hasRecentSpeaking = speakingHistory.some((h: any) => {
      const time = h.endTime || h.startTime
      return h.callsign === currentCallsign && time > fiveMinutesAgo
    })

    if (eventsConnected) return hasRecentSpeaking
    if (!speakingHistory || speakingHistory.length === 0) return true
    if (!currentCallsign) return true
    return hasRecentSpeaking
  }

  // ========== 自动同步后台任务内部逻辑 ==========
  async function performIncrementalSync(fmoAddress: string, protocol: string) {
    if (isAborted) return

    const host = normalizeHost(fmoAddress)
    const client = new FmoApiClient(`${protocol}://${host}`)
    activeClients.add(client)

    try {
      if (isAborted) return
      const wasEmpty = !ctx.getDbLoaded?.() || (ctx.getTotalLogs?.() || 0) === 0
      const todayStart = Math.floor(new Date().setUTCHours(0, 0, 0, 0) / 1000)
      const currentFromCallsign = getCurrentFromCallsign()
      const response = await client.getQsoList(0, 10, currentFromCallsign)
      const list = response.list || []
      const newCallsigns: string[] = []

      // 使用静默上下文，不更新UI状态
      const innerCtx = buildSilentSyncContext()
      for (const item of list) {
        if (isAborted) break
        const qso = await processSingleQsoItem(item, todayStart, client, innerCtx)
        if (qso) newCallsigns.push(qso.toCallsign)
      }

      if (!isAborted) {
        await updateAfterSync(
          wasEmpty,
          newCallsigns.length,
          newCallsigns.length > 0 ? `同步到和 ${newCallsigns.join(', ')} 的通联` : null
        )
      }
    } catch (err) {
      console.error('增量同步失败:', err)
    } finally {
      client.close()
      activeClients.delete(client)
    }
  }

  async function performTodaySync(fmoAddress: string, protocol: string) {
    if (isAborted) return

    const host = normalizeHost(fmoAddress)
    const client = new FmoApiClient(`${protocol}://${host}`)
    activeClients.add(client)

    try {
      if (isAborted) return
      const wasEmpty = !ctx.getDbLoaded?.() || (ctx.getTotalLogs?.() || 0) === 0
      // 使用静默上下文，不更新UI状态
      const totalSynced = await syncRecentData(client, 1, buildSilentSyncContext())

      if (!isAborted) {
        await updateAfterSync(
          wasEmpty,
          totalSynced,
          totalSynced > 0 ? `每小时同步完成，共更新 ${totalSynced} 条记录` : null
        )
      }

      if (totalSynced === 0) {
        console.log('每小时同步完成，无新数据')
      }
    } catch (err) {
      console.error('今日数据同步失败:', err)
    } finally {
      client.close()
      activeClients.delete(client)
    }
  }

  // ========== 对外 actions ==========
  function startAutoSyncTask(getAddresses: () => SyncAddress[]) {
    if (autoSyncTimer) return
    autoSyncTimer = setInterval(async () => {
      if (isAutoSyncing || syncing.value) return

      const addresses = typeof getAddresses === 'function' ? getAddresses() : []
      if (!addresses || addresses.length === 0) return

      isAutoSyncing = true
      try {
        const now = Date.now()
        const oneHour = 60 * 60 * 1000
        const needsFullSync = now - lastFullSyncTime >= oneHour

        for (const address of addresses) {
          if (!address || !address.host) continue
          try {
            if (needsFullSync) {
              console.log(`执行每小时今日数据同步: ${address.host}`)
              await performTodaySync(address.host, address.protocol)
            } else {
              const shouldSync = checkShouldSync(address.id)
              if (shouldSync) {
                await performIncrementalSync(address.host, address.protocol)
              } else {
                console.log(`当前呼号5分钟内未在 ${address.host} 发言，跳过本次同步`)
              }
            }
          } catch (err) {
            console.error(`同步 ${address.host} 失败:`, err)
          }
          await new Promise((r) => setTimeout(r, 300))
        }

        if (needsFullSync) lastFullSyncTime = now
      } catch (err) {
        console.error('定时同步失败:', err)
      } finally {
        isAutoSyncing = false
      }
    }, 10000)
  }

  function stopAutoSyncTask() {
    if (autoSyncTimer) {
      clearInterval(autoSyncTimer)
      autoSyncTimer = null
    }
  }

  async function syncToday(fmoAddress: string, protocol: string, days = 1) {
    if (!fmoAddress || syncing.value || isAborted) return

    syncing.value = true
    syncStatus.value = '连接 FMO...'
    syncFailedRecords.value = []

    const host = normalizeHost(fmoAddress)
    const client = new FmoApiClient(`${protocol}://${host}`)
    activeClients.add(client)

    try {
      if (isAborted) return
      const totalSynced = await syncRecentData(client, days, buildSyncContext())

      const failedCount = syncFailedRecords.value.length
      syncStatus.value =
        failedCount > 0
          ? `同步完成，共更新 ${totalSynced} 条记录，${failedCount} 条失败`
          : `同步完成，共更新 ${totalSynced} 条记录`
      if (failedCount > 0) console.warn('同步失败的记录:', syncFailedRecords.value)

      const callsigns: string[] = await getAvailableFromCallsigns()
      await ctx.onSyncComplete?.({ callsigns, syncedCount: totalSynced, reload: true })

      if (!isAborted) {
        reloadTimer = setTimeout(() => window.location.reload(), 1500)
      }
    } finally {
      syncing.value = false
      // 手动同步完成后，延迟清空状态文本
      setTimeout(() => {
        if (!syncing.value) {
          syncStatus.value = ''
        }
      }, 3000)
      client.close()
      activeClients.delete(client)
    }
  }

  async function syncIncremental(fmoAddress: string, protocol: string) {
    if (!fmoAddress || syncing.value || isAborted) return

    syncing.value = true
    syncStatus.value = '连接 FMO...'
    syncFailedRecords.value = []

    const host = normalizeHost(fmoAddress)
    const client = new FmoApiClient(`${protocol}://${host}`)
    activeClients.add(client)

    try {
      if (isAborted) return
      const { totalSynced, totalProcessed } = await syncIncrementalForAddress(
        client,
        buildSyncContext()
      )

      const failedCount = syncFailedRecords.value.length
      syncStatus.value =
        failedCount > 0
          ? `增量同步完成，共处理 ${totalProcessed} 条记录，新增 ${totalSynced} 条，${failedCount} 条失败`
          : `增量同步完成，共处理 ${totalProcessed} 条记录，新增 ${totalSynced} 条`
      if (failedCount > 0) console.warn('同步失败的记录:', syncFailedRecords.value)

      const callsigns: string[] = await getAvailableFromCallsigns()
      await ctx.onSyncComplete?.({ callsigns, syncedCount: totalSynced, reload: true })

      if (!isAborted) {
        reloadTimer = setTimeout(() => window.location.reload(), 2000)
      }
    } catch (err: any) {
      syncStatus.value = `增量同步失败: ${err?.message || String(err)}`
      console.error('增量同步失败:', err)
    } finally {
      syncing.value = false
      // 手动同步完成后，延迟清空状态文本
      setTimeout(() => {
        if (!syncing.value) {
          syncStatus.value = ''
        }
      }, 3000)
      client.close()
      activeClients.delete(client)
    }
  }

  async function syncFull(fmoAddress: string, protocol: string) {
    if (!fmoAddress || syncing.value || isAborted) return

    syncing.value = true
    syncStatus.value = '连接 FMO...'
    syncFailedRecords.value = []

    const host = normalizeHost(fmoAddress)
    const client = new FmoApiClient(`${protocol}://${host}`)
    activeClients.add(client)

    try {
      if (isAborted) return
      const { totalSynced, totalProcessed } = await syncFullForAddress(
        client,
        buildSyncContext()
      )

      const failedCount = syncFailedRecords.value.length
      syncStatus.value =
        failedCount > 0
          ? `全量同步完成，共处理 ${totalProcessed} 条记录，已同步 ${totalSynced} 条，${failedCount} 条失败`
          : `全量同步完成，共处理 ${totalProcessed} 条记录，已同步 ${totalSynced} 条`
      if (failedCount > 0) console.warn('同步失败的记录:', syncFailedRecords.value)

      const callsigns: string[] = await getAvailableFromCallsigns()
      await ctx.onSyncComplete?.({ callsigns, syncedCount: totalSynced, reload: true })

      if (!isAborted) {
        reloadTimer = setTimeout(() => window.location.reload(), 2000)
      }
    } catch (err: any) {
      syncStatus.value = `全量同步失败: ${err?.message || String(err)}`
      console.error('全量同步失败:', err)
    } finally {
      syncing.value = false
      // 手动同步完成后，延迟清空状态文本
      setTimeout(() => {
        if (!syncing.value) {
          syncStatus.value = ''
        }
      }, 3000)
      client.close()
      activeClients.delete(client)
    }
  }

  async function syncMultiple(
    addresses: SyncAddress[],
    syncType: 'today' | 'incremental' | 'full',
    days = 1
  ) {
    if (!addresses || addresses.length === 0 || syncing.value || isAborted) return

    syncing.value = true
    syncFailedRecords.value = []
    multiSyncProgress.value = {
      current: 0,
      total: addresses.length,
      currentName: '',
      results: []
    }

    const allResults: MultiSyncResult[] = []

    try {
      for (let i = 0; i < addresses.length; i++) {
        if (isAborted) break

        const address = addresses[i]
        multiSyncProgress.value.current = i + 1
        multiSyncProgress.value.currentName = address.name || address.host

        const host = normalizeHost(address.host)
        const client = new FmoApiClient(`${address.protocol}://${host}`)
        activeClients.add(client)

        let syncedCount = 0
        let success = true
        let errorMsg = ''

        try {
          syncStatus.value = `正在同步 ${address.name || address.host}...`

          const label = address.name || address.host
          const innerCtx = buildSyncContext({
            statusCallback: (msg) => {
              syncStatus.value = `${label}: ${msg}`
            }
          })

          if (syncType === 'today') {
            syncedCount = await syncRecentData(client, days, innerCtx)
          } else if (syncType === 'incremental') {
            const r = await syncIncrementalForAddress(client, innerCtx)
            syncedCount = r.totalSynced
          } else if (syncType === 'full') {
            const r = await syncFullForAddress(client, innerCtx)
            syncedCount = r.totalSynced
          }
        } catch (err: any) {
          success = false
          errorMsg = err?.message || String(err)
          console.error(`同步 ${address.name || address.host} 失败:`, err)
        } finally {
          client.close()
          activeClients.delete(client)
        }

        const result: MultiSyncResult = {
          addressId: address.id,
          name: address.name || address.host,
          success,
          syncedCount,
          error: errorMsg
        }
        allResults.push(result)
        multiSyncProgress.value.results.push(result)

        if (!isAborted && i < addresses.length - 1) {
          await new Promise((r) => setTimeout(r, 300))
        }
      }

      const totalSynced = allResults.reduce((sum, r) => sum + r.syncedCount, 0)
      const callsigns: string[] = await getAvailableFromCallsigns()

      const failedCount = syncFailedRecords.value.length
      syncStatus.value =
        failedCount > 0
          ? `多地址同步完成，共 ${addresses.length} 个地址，新增 ${totalSynced} 条记录，${failedCount} 条失败`
          : `多地址同步完成，共 ${addresses.length} 个地址，新增 ${totalSynced} 条记录`
      if (failedCount > 0) console.warn('同步失败的记录:', syncFailedRecords.value)

      await ctx.onSyncComplete?.({
        callsigns,
        syncedCount: totalSynced,
        reload: true,
        multiSync: true
      })

      if (!isAborted) {
        reloadTimer = setTimeout(() => window.location.reload(), 2000)
      }
    } catch (err: any) {
      syncStatus.value = `多地址同步失败: ${err?.message || String(err)}`
      console.error('多地址同步失败:', err)
    } finally {
      syncing.value = false
      // 3秒后自动清空状态文本，避免一直显示
      setTimeout(() => {
        if (!syncing.value) {
          syncStatus.value = ''
        }
      }, 3000)
    }
  }

  /** 组件卸载时调用，清理 timer 与活跃 client */
  function teardown() {
    isAborted = true
    stopAutoSyncTask()
    if (autoSyncMessageTimer) {
      clearTimeout(autoSyncMessageTimer)
      autoSyncMessageTimer = null
    }
    if (reloadTimer) {
      clearTimeout(reloadTimer)
      reloadTimer = null
    }
    activeClients.forEach((c) => {
      try {
        c.close()
      } catch {
        /* ignore */
      }
    })
    activeClients.clear()
    clearContext()
  }

  /** 重置 abort 标志（组件重新挂载时） */
  function reset() {
    isAborted = false
  }

  return {
    // state
    syncing,
    syncStatus,
    autoSyncMessage,
    syncFailedRecords,
    multiSyncProgress,
    // actions
    setContext,
    reset,
    teardown,
    showAutoSyncMessage,
    startAutoSyncTask,
    stopAutoSyncTask,
    syncToday,
    syncIncremental,
    syncFull,
    syncMultiple
  }
})
