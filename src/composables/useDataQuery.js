import { ref, computed } from 'vue'
import {
  getTop20StatsFromIndexedDB,
  getAllOldFriendsFromIndexedDB,
  getCallsignRecordsFromIndexedDB,
  getAllRecordsFromIndexedDB,
  getTotalRecordsCountFromIndexedDB,
  getTodayRecordsCountFromIndexedDB,
  getUniqueCallsignCountFromIndexedDB
} from '../services/db'
import { QueryTypes, PAGE_SIZE, OLD_FRIENDS_PAGE_SIZE } from '../components/home/constants'

export function useDataQuery() {
  const loading = ref(false)
  const error = ref(null)
  const queryResult = ref(null)
  const top20Result = ref(null)
  const oldFriendsResult = ref(null)
  const oldFriendsAllData = ref([])
  const oldFriendsDisplayCount = ref(OLD_FRIENDS_PAGE_SIZE)
  const currentPage = ref(1)
  const oldFriendsPage = ref(1)
  const currentQueryType = ref(QueryTypes.ALL)
  const searchKeyword = ref('')
  const oldFriendsSearchKeyword = ref('')
  const filterDate = ref(null)

  // 统计数据
  const totalLogs = ref(0)
  const todayLogs = ref(0)
  const uniqueCallsigns = ref(0)

  // 计算总页数
  const totalPages = computed(() => {
    if (queryResult.value && queryResult.value.totalPages) {
      return queryResult.value.totalPages
    }
    return 0
  })

  // 计算总记录数
  const totalRecords = computed(() => {
    if (queryResult.value) {
      return queryResult.value.total
    }
    return 0
  })

  // 老朋友总数（全量数据）
  const oldFriendsTotal = computed(() => {
    return oldFriendsAllData.value.length
  })

  // 老朋友是否还有更多可展示
  const oldFriendsHasMore = computed(() => {
    return oldFriendsDisplayCount.value < oldFriendsAllData.value.length
  })

  // 执行查询
  async function executeQuery(selectedFromCallsign, dbLoaded) {
    if (!dbLoaded || !selectedFromCallsign) return

    loading.value = true
    error.value = null

    try {
      const fromCallsign = selectedFromCallsign

      if (currentQueryType.value === QueryTypes.TOP20_SUMMARY) {
        top20Result.value = await getTop20StatsFromIndexedDB(fromCallsign)
        queryResult.value = null
        oldFriendsResult.value = null
      } else if (currentQueryType.value === QueryTypes.OLD_FRIENDS) {
        // 全量加载老朋友数据，前端排序后再懒加载展示
        const allData = await getAllOldFriendsFromIndexedDB(
          oldFriendsSearchKeyword.value.trim(),
          fromCallsign
        )
        oldFriendsAllData.value = allData
        oldFriendsDisplayCount.value = OLD_FRIENDS_PAGE_SIZE
        // 构建兼容旧格式的 result 对象（首次展示 displayCount 条）
        oldFriendsResult.value = {
          data: allData.slice(0, OLD_FRIENDS_PAGE_SIZE),
          total: allData.length,
          page: 1,
          pageSize: OLD_FRIENDS_PAGE_SIZE,
          totalPages: Math.ceil(allData.length / OLD_FRIENDS_PAGE_SIZE)
        }
        queryResult.value = null
        top20Result.value = null
      } else if (currentQueryType.value === QueryTypes.ALL) {
        queryResult.value = await getAllRecordsFromIndexedDB(
          currentPage.value,
          PAGE_SIZE,
          searchKeyword.value.trim(),
          fromCallsign,
          filterDate.value
        )
        top20Result.value = null
        oldFriendsResult.value = null
      } else {
        currentPage.value = 1
        queryResult.value = await getAllRecordsFromIndexedDB(1, PAGE_SIZE, '', fromCallsign, null)
        top20Result.value = null
        oldFriendsResult.value = null
      }

      // 更新统计数据
      totalLogs.value = await getTotalRecordsCountFromIndexedDB(fromCallsign)
      todayLogs.value = await getTodayRecordsCountFromIndexedDB(fromCallsign)
      uniqueCallsigns.value = await getUniqueCallsignCountFromIndexedDB(fromCallsign)
    } catch (err) {
      error.value = `查询失败: ${err.message}`
      queryResult.value = null
      top20Result.value = null
      oldFriendsResult.value = null
    }

    loading.value = false
  }

  // 页面跳转
  function goToPage(page) {
    if (!queryResult.value || page < 1 || page > queryResult.value.totalPages) return
    currentPage.value = page
  }

  // 老朋友分页跳转
  function goToOldFriendsPage(page) {
    if (!oldFriendsResult.value || page < 1 || page > oldFriendsResult.value.totalPages) return
    oldFriendsPage.value = page
  }

  // 查询类型变更处理
  function handleQueryTypeChange() {
    searchKeyword.value = ''
    oldFriendsSearchKeyword.value = ''
    filterDate.value = null
    currentPage.value = 1
    oldFriendsPage.value = 1
  }

  // 重置分页
  function resetPagination() {
    currentPage.value = 1
    oldFriendsPage.value = 1
  }

  // 加载更多数据（用于移动端滚动加载）
  async function loadMoreData(selectedFromCallsign, dbLoaded) {
    if (!dbLoaded || !selectedFromCallsign) return
    if (currentQueryType.value !== QueryTypes.ALL) return
    if (!queryResult.value) return
    if (currentPage.value >= queryResult.value.totalPages) return

    const nextPage = currentPage.value + 1
    try {
      const moreData = await getAllRecordsFromIndexedDB(
        nextPage,
        PAGE_SIZE,
        searchKeyword.value.trim(),
        selectedFromCallsign,
        filterDate.value
      )

      if (moreData && moreData.data && moreData.data.length > 0) {
        // 追加数据到现有结果
        queryResult.value = {
          ...queryResult.value,
          data: [...queryResult.value.data, ...moreData.data]
        }
        currentPage.value = nextPage
      }
    } catch (err) {
      console.error('加载更多数据失败:', err)
    }
  }

  // 加载更多老朋友数据（全量数据已加载，仅增加展示数量）
  function loadMoreOldFriends() {
    if (oldFriendsDisplayCount.value >= oldFriendsAllData.value.length) return

    const nextCount = oldFriendsDisplayCount.value + OLD_FRIENDS_PAGE_SIZE
    oldFriendsDisplayCount.value = Math.min(nextCount, oldFriendsAllData.value.length)

    // 更新 result 以触发视图刷新
    oldFriendsResult.value = {
      data: oldFriendsAllData.value.slice(0, oldFriendsDisplayCount.value),
      total: oldFriendsAllData.value.length,
      page: 1,
      pageSize: OLD_FRIENDS_PAGE_SIZE,
      totalPages: Math.ceil(oldFriendsAllData.value.length / OLD_FRIENDS_PAGE_SIZE)
    }
  }

  return {
    loading,
    error,
    queryResult,
    top20Result,
    oldFriendsResult,
    oldFriendsAllData,
    oldFriendsDisplayCount,
    oldFriendsTotal,
    oldFriendsHasMore,
    currentPage,
    oldFriendsPage,
    currentQueryType,
    searchKeyword,
    oldFriendsSearchKeyword,
    filterDate,
    totalPages,
    totalRecords,
    totalLogs,
    todayLogs,
    uniqueCallsigns,
    executeQuery,
    goToPage,
    goToOldFriendsPage,
    handleQueryTypeChange,
    resetPagination,
    loadMoreData,
    loadMoreOldFriends
  }
}

// 通联记录查询 composable
export function useCallsignRecords() {
  const callsignRecords = ref(null)
  const currentCallsign = ref('')
  const showCallsignModal = ref(false)
  const highlightTimestamp = ref(null)

  async function loadCallsignRecords(selectedFromCallsign) {
    callsignRecords.value = await getCallsignRecordsFromIndexedDB(
      currentCallsign.value,
      selectedFromCallsign
    )
  }

  async function showCallsignRecordsModal(callsign, selectedFromCallsign, targetTimestamp = null) {
    currentCallsign.value = callsign
    highlightTimestamp.value = targetTimestamp
    await loadCallsignRecords(selectedFromCallsign)
    showCallsignModal.value = true
  }

  function closeCallsignModal() {
    showCallsignModal.value = false
    highlightTimestamp.value = null
  }

  return {
    callsignRecords,
    currentCallsign,
    showCallsignModal,
    highlightTimestamp,
    loadCallsignRecords,
    showCallsignRecordsModal,
    closeCallsignModal
  }
}
