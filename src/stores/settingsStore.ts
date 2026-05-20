import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
// @ts-ignore - legacy JS
import {
  saveFmoAddresses,
  getFmoAddresses,
  getAllRecordsFromIndexedDB,
  getContactCountsFromIndexedDB
} from '../services/db'
// @ts-ignore - legacy JS
import { FmoApiClient } from '../services/fmoApi'
// @ts-ignore - legacy JS
import { normalizeHost } from '../utils/urlUtils'
// @ts-ignore - legacy JS
import { downloadRemoteFile } from '../utils/exportFile'
import { getPlatform } from '../platform'

const AUDIO_VOLUME_KEY = 'fmo_audio_volume'
const AUDIO_PLAYING_KEY = 'fmo_audio_playing'
const PRIORITIZE_TODAY_KEY = 'fmo_prioritize_today'

interface UserInfo {
  callsign: string
  uid: number | null
  wlanIP: string
}

interface AddressItem {
  id: string
  numId?: number
  name: string
  host: string
  protocol: string
  userInfo?: UserInfo
}

interface AddressStorage {
  addresses: AddressItem[]
  activeId: string | null
  selectedIds: string[]
  multiSelectMode?: boolean
}

interface ActionResult {
  success: boolean
  message?: string
  reconnect?: boolean
  id?: string
}

/**
 * 设置/存储 store（替代 composables/useSettings.js）。
 *
 * 职责：
 * - 多地址管理（fmoAddresses 通过 db.js 的 IndexedDB 读写）
 * - 全局音量、音频播放状态（通过 platform.storage 跨端持久化）
 * - 今日通联呼号、通联次数（从 IndexedDB 派生）
 * - 备份导出、连接验证、用户信息刷新等 actions
 */
export const useSettingsStore = defineStore('settings', () => {
  // ========== state ==========
  const fmoAddressStorage = ref<AddressStorage>({
    addresses: [],
    activeId: null,
    selectedIds: []
  })
  const todayContactedCallsigns = ref<Set<string>>(new Set())
  const contactCounts = ref<Map<string, number>>(new Map())

  const selectedAddressIds = ref<string[]>([])
  const multiSelectMode = ref(false)

  const audioVolume = ref(100)
  const audioPlaying = ref(false)
  const prioritizeToday = ref(false)

  const isHttps = window.location.protocol === 'https:'
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  )

  // ========== getters ==========
  const activeAddress = computed<AddressItem | null>(() => {
    if (!fmoAddressStorage.value.activeId) return null
    return (
      fmoAddressStorage.value.addresses.find(
        (a) => a.id === fmoAddressStorage.value.activeId
      ) || null
    )
  })

  const fmoAddress = computed(() => activeAddress.value?.host || '')
  const protocol = computed(() => activeAddress.value?.protocol || 'ws')
  const addressList = computed(() => fmoAddressStorage.value.addresses)
  const activeAddressId = computed(() => fmoAddressStorage.value.activeId)

  const remoteControlUrl = computed(() => {
    if (!fmoAddress.value) return '#'
    const host = normalizeHost(fmoAddress.value)
    return `http://${host}/remote.html`
  })

  // ========== 音量 / 播放状态（走 platform.storage） ==========
  async function initAudioVolume() {
    const saved = await getPlatform().storage.get(AUDIO_VOLUME_KEY)
    if (saved !== null) {
      const val = Number(saved)
      if (!isNaN(val) && val >= 0 && val <= 200) {
        audioVolume.value = val
      }
    }
  }

  async function setAudioVolume(value: number | string) {
    const num = Number(value)
    const val = Math.max(0, Math.min(200, isNaN(num) ? 100 : num))
    audioVolume.value = val
    await getPlatform().storage.set(AUDIO_VOLUME_KEY, String(val))
  }

  async function initAudioPlaying() {
    const saved = await getPlatform().storage.get(AUDIO_PLAYING_KEY)
    audioPlaying.value = saved === 'true'
  }

  async function setAudioPlaying(value: boolean) {
    audioPlaying.value = !!value
    await getPlatform().storage.set(AUDIO_PLAYING_KEY, String(!!value))
  }

  async function initPrioritizeToday() {
    const saved = await getPlatform().storage.get(PRIORITIZE_TODAY_KEY)
    prioritizeToday.value = saved === 'true'
  }

  async function setPrioritizeToday(value: boolean) {
    prioritizeToday.value = !!value
    await getPlatform().storage.set(PRIORITIZE_TODAY_KEY, String(!!value))
  }

  // ========== 地址初始化与管理 ==========
  async function initFmoAddress(): Promise<boolean> {
    await initAudioVolume()
    await initAudioPlaying()
    await initPrioritizeToday()

    const storage: AddressStorage = await getFmoAddresses()
    fmoAddressStorage.value = storage

    selectedAddressIds.value = storage.selectedIds || []
    multiSelectMode.value = storage.multiSelectMode || false

    if (storage.addresses.length > 0) {
      await saveFmoAddresses(storage)

      if (storage.activeId) {
        const activeAddr = storage.addresses.find((a) => a.id === storage.activeId)
        if (activeAddr && !activeAddr.userInfo) {
          try {
            const host = normalizeHost(activeAddr.host)
            const fullAddress = `${activeAddr.protocol}://${host}`
            const client = new FmoApiClient(fullAddress)
            const userInfo = await client.getUserInfo()

            const index = fmoAddressStorage.value.addresses.findIndex(
              (a) => a.id === storage.activeId
            )
            if (index !== -1) {
              fmoAddressStorage.value.addresses[index] = {
                ...fmoAddressStorage.value.addresses[index],
                userInfo: {
                  callsign: userInfo.callsign || '',
                  uid: userInfo.uid || null,
                  wlanIP: userInfo.wlanIP || ''
                }
              }
              await saveFmoAddresses(fmoAddressStorage.value)
            }
            client.close()
          } catch (err) {
            console.log('初始化时获取用户信息失败:', err)
          }
        }
      }

      return true
    }

    return false
  }

  async function validateConnection(host: string, proto: string): Promise<boolean> {
    const wsUrl = `${proto}://${normalizeHost(host)}/ws`
    return new Promise((resolve) => {
      const socket = new WebSocket(wsUrl)
      const timeout = setTimeout(() => {
        socket.close()
        resolve(false)
      }, 5000)
      socket.onopen = () => {
        clearTimeout(timeout)
        socket.close()
        resolve(true)
      }
      socket.onerror = () => {
        clearTimeout(timeout)
        socket.close()
        resolve(false)
      }
    })
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 11)
  }

  function generateNumId(): number {
    const usedIds = new Set(
      fmoAddressStorage.value.addresses.map((a) => a.numId).filter(Boolean)
    )
    let id = 1
    while (usedIds.has(id)) id++
    return id
  }

  async function toggleAddressSelection(id: string) {
    const index = selectedAddressIds.value.indexOf(id)
    if (index === -1) {
      selectedAddressIds.value.push(id)
    } else {
      selectedAddressIds.value.splice(index, 1)
    }
    fmoAddressStorage.value.selectedIds = [...selectedAddressIds.value]
    await saveFmoAddresses(fmoAddressStorage.value)
  }

  async function setMultiSelectMode(value: boolean) {
    multiSelectMode.value = value
    fmoAddressStorage.value.multiSelectMode = value
    await saveFmoAddresses(fmoAddressStorage.value)
  }

  async function addFmoAddress(
    name: string,
    host: string,
    proto: string
  ): Promise<ActionResult> {
    const client = new FmoApiClient(`${proto}://${host}`)
    if (!client.isValidAddress(host)) {
      return { success: false, message: '请输入有效的IP地址或域名' }
    }

    const exists = fmoAddressStorage.value.addresses.some(
      (a) => a.host === host && a.protocol === proto
    )
    if (exists) {
      return { success: false, message: '该地址已存在' }
    }

    const id = generateId()
    const numId = generateNumId()
    const newAddress: AddressItem = { id, numId, name: name || host, host, protocol: proto }

    try {
      const normalizedHost = normalizeHost(host)
      const fullAddress = `${proto}://${normalizedHost}`
      const apiClient = new FmoApiClient(fullAddress)
      const userInfo = await apiClient.getUserInfo()
      newAddress.userInfo = {
        callsign: userInfo.callsign || '',
        uid: userInfo.uid || null,
        wlanIP: userInfo.wlanIP || ''
      }
      apiClient.close()
    } catch (err) {
      console.log('获取用户信息失败:', err)
    }

    fmoAddressStorage.value.addresses.push(newAddress)
    fmoAddressStorage.value.activeId = id

    await saveFmoAddresses(fmoAddressStorage.value)
    return { success: true, message: '地址已添加', id, reconnect: true }
  }

  async function updateFmoAddress(
    id: string,
    name: string,
    host: string,
    proto: string
  ): Promise<ActionResult> {
    const index = fmoAddressStorage.value.addresses.findIndex((a) => a.id === id)
    if (index === -1) {
      return { success: false, message: '地址不存在' }
    }

    const client = new FmoApiClient(`${proto}://${host}`)
    if (!client.isValidAddress(host)) {
      return { success: false, message: '请输入有效的IP地址或域名' }
    }

    const duplicate = fmoAddressStorage.value.addresses.some(
      (a, i) => i !== index && a.host === host && a.protocol === proto
    )
    if (duplicate) {
      return { success: false, message: '该地址已存在' }
    }

    fmoAddressStorage.value.addresses[index] = {
      ...fmoAddressStorage.value.addresses[index],
      name: name || host,
      host,
      protocol: proto
    }

    await saveFmoAddresses(fmoAddressStorage.value)
    return { success: true, message: '地址已更新' }
  }

  async function deleteFmoAddress(id: string): Promise<ActionResult> {
    const index = fmoAddressStorage.value.addresses.findIndex((a) => a.id === id)
    if (index === -1) {
      return { success: false, message: '地址不存在' }
    }

    const wasActive = fmoAddressStorage.value.activeId === id
    fmoAddressStorage.value.addresses.splice(index, 1)

    if (wasActive) {
      if (fmoAddressStorage.value.addresses.length > 0) {
        fmoAddressStorage.value.activeId = fmoAddressStorage.value.addresses[0].id
      } else {
        fmoAddressStorage.value.activeId = null
      }
    }

    const selectedIndex = selectedAddressIds.value.indexOf(id)
    if (selectedIndex !== -1) {
      selectedAddressIds.value.splice(selectedIndex, 1)
    }

    fmoAddressStorage.value.selectedIds = [...selectedAddressIds.value]
    await saveFmoAddresses(fmoAddressStorage.value)
    return { success: true, message: '地址已删除', reconnect: wasActive }
  }

  async function selectFmoAddress(id: string): Promise<ActionResult> {
    const address = fmoAddressStorage.value.addresses.find((a) => a.id === id)
    if (!address) {
      return { success: false, message: '地址不存在' }
    }

    const isConnected = await validateConnection(address.host, address.protocol)

    if (isConnected) {
      fmoAddressStorage.value.activeId = id

      try {
        const host = normalizeHost(address.host)
        const fullAddress = `${address.protocol}://${host}`
        const client = new FmoApiClient(fullAddress)
        const userInfo = await client.getUserInfo()

        const index = fmoAddressStorage.value.addresses.findIndex((a) => a.id === id)
        if (index !== -1) {
          fmoAddressStorage.value.addresses[index] = {
            ...fmoAddressStorage.value.addresses[index],
            userInfo: {
              callsign: userInfo.callsign || '',
              uid: userInfo.uid || null,
              wlanIP: userInfo.wlanIP || ''
            }
          }
        }
        client.close()
      } catch (err) {
        console.log('获取用户信息失败:', err)
      }

      await saveFmoAddresses(fmoAddressStorage.value)
      return { success: true, message: '已切换到: ' + address.name, reconnect: true }
    } else {
      if (isHttps && address.protocol === 'ws') {
        return {
          success: false,
          message:
            '连接失败。提示：HTTPS 网站无法直接连接局域网设备，请开启浏览器"不安全内容"访问权限，或选择 wss:// 协议。'
        }
      } else {
        return { success: false, message: '连接失败，请确认地址是否正确' }
      }
    }
  }

  async function clearAllAddresses(): Promise<ActionResult> {
    const hadAddresses = fmoAddressStorage.value.addresses.length > 0
    fmoAddressStorage.value.addresses = []
    fmoAddressStorage.value.activeId = null
    selectedAddressIds.value = []
    fmoAddressStorage.value.selectedIds = []
    await saveFmoAddresses(fmoAddressStorage.value)
    return { success: true, reconnect: hadAddresses }
  }

  async function refreshUserInfo(id: string): Promise<ActionResult> {
    const address = fmoAddressStorage.value.addresses.find((a) => a.id === id)
    if (!address) {
      return { success: false, message: '地址不存在' }
    }

    try {
      const host = normalizeHost(address.host)
      const fullAddress = `${address.protocol}://${host}`
      const client = new FmoApiClient(fullAddress)
      const userInfo = await client.getUserInfo()

      const index = fmoAddressStorage.value.addresses.findIndex((a) => a.id === id)
      if (index !== -1) {
        fmoAddressStorage.value.addresses[index] = {
          ...fmoAddressStorage.value.addresses[index],
          userInfo: {
            callsign: userInfo.callsign || '',
            uid: userInfo.uid || null,
            wlanIP: userInfo.wlanIP || ''
          }
        }
        await saveFmoAddresses(fmoAddressStorage.value)
      }
      client.close()
      return { success: true, message: '用户信息已更新' }
    } catch (err) {
      console.log('刷新用户信息失败:', err)
      return { success: false, message: '获取用户信息失败' }
    }
  }

  async function validateAndSaveFmoAddress(): Promise<ActionResult> {
    const address = fmoAddress.value
    if (!address) {
      return { success: true, message: '设置已保存' }
    }

    const isConnected = await validateConnection(address, protocol.value)
    if (isConnected) {
      return { success: true, message: '设置已保存', reconnect: true }
    } else {
      if (isHttps && protocol.value === 'ws') {
        return {
          success: false,
          message:
            '请确认 fmo 地址。提示：HTTPS 网站无法直接连接局域网设备，请按界面提示开启浏览器"不安全内容"访问权限，或选择 wss:// 协议。'
        }
      } else {
        return { success: false, message: '请确认fmo地址' }
      }
    }
  }

  async function backupLogs() {
    if (!fmoAddress.value) return

    let address = fmoAddress.value.trim()
    const httpProtocol = protocol.value === 'wss' ? 'https' : 'http'

    if (!address.startsWith('http://') && !address.startsWith('https://')) {
      address = `${httpProtocol}://${address}`
    }
    address = address.replace(/\/+$/, '')

    const url = `${address}/api/qso/backup`
    return await downloadRemoteFile(url, `fmo-backup-${Date.now()}.db`)
  }

  async function loadTodayContactedCallsigns(selectedFromCallsign: string) {
    if (!selectedFromCallsign) {
      todayContactedCallsigns.value = new Set()
      return
    }

    try {
      const allRecords = await getAllRecordsFromIndexedDB(
        1,
        999999,
        '',
        selectedFromCallsign
      )
      const callsigns = new Set<string>()
      const today = new Date()

      for (const record of allRecords.data) {
        if (record.timestamp) {
          const contactDate = new Date(record.timestamp * 1000)
          const isToday =
            contactDate.getUTCFullYear() === today.getUTCFullYear() &&
            contactDate.getUTCMonth() === today.getUTCMonth() &&
            contactDate.getUTCDate() === today.getUTCDate()
          if (isToday && record.toCallsign) {
            callsigns.add(record.toCallsign)
          }
        }
      }

      todayContactedCallsigns.value = callsigns
    } catch (error) {
      console.error('查询今日通联呼号失败:', error)
      todayContactedCallsigns.value = new Set()
    }
  }

  async function loadContactCounts(selectedFromCallsign: string) {
    if (!selectedFromCallsign) {
      contactCounts.value = new Map()
      return
    }

    try {
      contactCounts.value = await getContactCountsFromIndexedDB(selectedFromCallsign)
    } catch (error) {
      console.error('加载通联次数失败:', error)
      contactCounts.value = new Map()
    }
  }

  async function setActiveAddressId(id: string) {
    fmoAddressStorage.value.activeId = id
    await saveFmoAddresses(fmoAddressStorage.value)
  }

  return {
    // state / getters
    fmoAddress,
    protocol,
    todayContactedCallsigns,
    isHttps,
    isMobileDevice,
    remoteControlUrl,
    addressList,
    activeAddressId,
    activeAddress,
    contactCounts,
    selectedAddressIds,
    multiSelectMode,
    audioVolume,
    audioPlaying,
    prioritizeToday,
    // actions
    initFmoAddress,
    validateAndSaveFmoAddress,
    backupLogs,
    loadTodayContactedCallsigns,
    loadContactCounts,
    addFmoAddress,
    updateFmoAddress,
    deleteFmoAddress,
    selectFmoAddress,
    clearAllAddresses,
    refreshUserInfo,
    validateConnection,
    toggleAddressSelection,
    setMultiSelectMode,
    setActiveAddressId,
    setAudioVolume,
    setAudioPlaying,
    setPrioritizeToday
  }
})
