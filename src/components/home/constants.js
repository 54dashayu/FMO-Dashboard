// 从 db.js 重新导出常量，保持兼容性
export { QueryTypes, ColumnNames, formatTimestamp, formatFreqHz } from '../../services/db'
import { getPlatform } from '../../platform'

// 主导航路由（桌面端 Header + 手机端底部 Tab）
export const NAV_ROUTES = [
  { path: '/dashboard', label: '仪表盘', type: 'dashboard', icon: 'dashboard' },
  { path: '/logs', label: '通联日志', type: 'logs', icon: 'logs' },
  { path: '/old-friends', label: '老朋友', type: 'oldFriends', icon: 'oldFriends' },
  { path: '/messages', label: '消息', type: 'messages', icon: 'messages' },
  { path: '/more', label: '更多', type: 'more', icon: 'more' }
]

// 自动定位条目（仅 Android 端有）
const locationReportRoute = {
  path: '/location-report',
  label: '自动定位',
  type: 'locationReport',
  icon: 'locationReport',
  description: '定时上报GPS定位到FMO'
}

const aboutRoute = {
  path: '/about',
  label: '关于',
  type: 'about',
  icon: 'about',
  description: '版本信息与特别感谢'
}

// 更多页面内的子路由（"自动定位"位于"关于"之前，仅 Android 端有此项）
export const MORE_ROUTES = [
  {
    path: '/top20',
    label: '排行榜',
    type: 'top20',
    icon: 'top20',
    description: '查看通联统计排行'
  },
  {
    path: '/settings',
    label: '设置',
    type: 'settings',
    icon: 'settings',
    description: 'FMO地址、播放与数据管理'
  },
  {
    path: '/remote-control',
    label: 'FMO 控制',
    type: 'remoteControl',
    icon: 'remoteControl',
    description: '切换中继与 APRS 控制'
  },
  {
    path: '/friend-links',
    label: '友情链接',
    type: 'friendLinks',
    icon: 'friendLinks',
    description: '业余无线电相关站点'
  },
  // 仅 Android 端追加"自动定位"，位于"关于"之前
  ...(getPlatform().capabilities.hasNativeLocation ? [locationReportRoute] : []),
  aboutRoute
]

// 所有可导航页面（供快捷导航弹框使用）
export const ALL_PAGE_ROUTES = [...NAV_ROUTES, ...MORE_ROUTES]

// 默认列（查看所有模式）
export const DEFAULT_COLUMNS = [
  'timestamp',
  'toCallsign',
  'freqHz',
  'toComment',
  'mode',
  'relayName'
]

// 分页大小
export const PAGE_SIZE = 20
export const OLD_FRIENDS_PAGE_SIZE = 25

// 判断是否今日通联（使用UTC时间）
export function isTodayContact(timestamp) {
  if (!timestamp) return false
  const contactDate = new Date(timestamp * 1000)
  const today = new Date()
  return (
    contactDate.getUTCFullYear() === today.getUTCFullYear() &&
    contactDate.getUTCMonth() === today.getUTCMonth() &&
    contactDate.getUTCDate() === today.getUTCDate()
  )
}

// 格式化时间戳（精确到分钟）
export function formatTimestampMinute(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

// 格式化时间为"X分钟前"
export function formatTimeAgo(timestamp) {
  if (!timestamp) return ''
  const diff = Date.now() - timestamp
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes === 1) return '1分钟前'
  return `${minutes}分钟前`
}

// 按 00:00 格式（mm:ss）格式化时长（毫秒）
export function formatDurationMmSs(durationMs) {
  let safeDuration = durationMs
  if (!safeDuration || safeDuration < 0) safeDuration = 0
  const totalSeconds = Math.floor(safeDuration / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  const mm = String(minutes).padStart(2, '0')
  const ss = String(seconds).padStart(2, '0')
  return `${mm}:${ss}`
}
