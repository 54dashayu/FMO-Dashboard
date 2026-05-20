import { ref } from 'vue'
import {
  loadDbFilesFromFileList,
  importDbFilesToIndexedDB,
  importAdifFilesToIndexedDB,
  getAvailableFromCallsigns,
  clearIndexedDBData,
  getTotalRecordsCountFromIndexedDB,
  getTodayRecordsCountFromIndexedDB,
  getUniqueCallsignCountFromIndexedDB
} from '../services/db'

export function useDbManager() {
  const dbLoaded = ref(false)
  const dbCount = ref(0)
  const availableFromCallsigns = ref([])
  const selectedFromCallsign = ref('')
  const importProgress = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 统计数据
  const totalLogs = ref(0)
  const todayLogs = ref(0)
  const uniqueCallsigns = ref(0)

  async function loadImportFiles(files) {
    importProgress.value = { current: 0, total: 0 }

    // 按文件类型分组
    const dbFiles = []
    const adifFiles = []

    for (const file of files) {
      const name = file.name.toLowerCase()
      if (name.endsWith('.db')) dbFiles.push(file)
      else if (name.endsWith('.adi') || name.endsWith('.adif')) adifFiles.push(file)
    }

    // 并行导入两种类型的文件
    const results = await Promise.all([
      dbFiles.length > 0
        ? importDbFilesToIndexedDB(dbFiles, (progress) => {
            importProgress.value = progress
          })
        : Promise.resolve({ totalRecords: 0, callsigns: [] }),
      adifFiles.length > 0
        ? importAdifFilesToIndexedDB(adifFiles, (progress) => {
            importProgress.value = progress
          })
        : Promise.resolve({ totalRecords: 0, callsigns: [] })
    ])

    importProgress.value = null

    // 合并结果
    const totalRecords = results[0].totalRecords + results[1].totalRecords
    const allCallsigns = [...new Set([...results[0].callsigns, ...results[1].callsigns])]

    if (totalRecords === 0 && allCallsigns.length === 0) {
      const existingCallsigns = await getAvailableFromCallsigns()
      if (existingCallsigns.length === 0) {
        error.value = '没有成功导入任何数据'
        return false
      }
      availableFromCallsigns.value = existingCallsigns
    } else {
      const currentCallsigns = await getAvailableFromCallsigns()
      availableFromCallsigns.value = currentCallsigns
    }

    if (
      !selectedFromCallsign.value ||
      !availableFromCallsigns.value.includes(selectedFromCallsign.value)
    ) {
      selectedFromCallsign.value = availableFromCallsigns.value[0]
    }

    await updateStats()

    dbCount.value = files.length
    dbLoaded.value = true

    return true
  }

  async function updateStats() {
    if (!selectedFromCallsign.value) return
    totalLogs.value = await getTotalRecordsCountFromIndexedDB(selectedFromCallsign.value)
    todayLogs.value = await getTodayRecordsCountFromIndexedDB(selectedFromCallsign.value)
    uniqueCallsigns.value = await getUniqueCallsignCountFromIndexedDB(selectedFromCallsign.value)
  }

  async function tryRestoreDirectory() {
    try {
      const callsigns = await getAvailableFromCallsigns()
      if (callsigns.length > 0) {
        availableFromCallsigns.value = callsigns
        selectedFromCallsign.value = callsigns[0]
        await updateStats()
        dbLoaded.value = true
        dbCount.value = callsigns.length
        return true
      }
    } catch {
      loading.value = false
    }
    return false
  }

  async function selectFiles(files) {
    if (!files || files.length === 0) return false

    loading.value = true
    error.value = null

    try {
      // 验证文件类型
      const validFiles = []
      for (const file of files) {
        const name = file.name.toLowerCase()
        if (name.endsWith('.db') || name.endsWith('.adi') || name.endsWith('.adif')) {
          validFiles.push(file)
        }
      }

      if (validFiles.length === 0) {
        error.value = '所选文件中没有有效的 .db 或 .adi/.adif 文件'
        loading.value = false
        return false
      }

      // .db 文件需要先通过 loadDbFilesFromFileList 验证
      const dbFiles = await loadDbFilesFromFileList(validFiles)
      const adifFiles = validFiles.filter((f) => f.name.toLowerCase().match(/\.(adi|adif)$/))

      if (dbFiles.length === 0 && adifFiles.length === 0) {
        error.value = '所选文件中没有有效的数据文件'
        loading.value = false
        return false
      }

      // 合并验证后的文件
      const allFiles = [...dbFiles.map((f) => ({ name: f.name, data: f.data })), ...adifFiles]

      const success = await loadImportFiles(allFiles)
      loading.value = false
      return success
    } catch (err) {
      error.value = `加载失败: ${err.message}`
      loading.value = false
      return false
    }
  }

  async function clearAllData() {
    await clearIndexedDBData()
    dbLoaded.value = false
    dbCount.value = 0
    totalLogs.value = 0
    todayLogs.value = 0
    uniqueCallsigns.value = 0
    availableFromCallsigns.value = []
    selectedFromCallsign.value = ''
  }

  return {
    dbLoaded,
    dbCount,
    availableFromCallsigns,
    selectedFromCallsign,
    importProgress,
    loading,
    error,
    totalLogs,
    todayLogs,
    uniqueCallsigns,
    updateStats,
    tryRestoreDirectory,
    selectFiles,
    clearAllData
  }
}
