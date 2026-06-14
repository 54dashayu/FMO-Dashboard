import packageInfo from '../../package.json'
import { getAndroidCompatibilityInfo } from '../utils/androidCompatibility'

const LOG_KEY = 'fmo_dashboard_diagnostic_log'
const MAX_ENTRIES = 300
let installed = false
let originalConsole = null

function safeStringify(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack
    }
  }

  try {
    return JSON.parse(JSON.stringify(value))
  } catch {
    return String(value)
  }
}

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeEntries(entries) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)))
  } catch {
    /* localStorage may be unavailable on some embedded WebViews */
  }
}

export function addDiagnosticLog(level, message, detail = null) {
  const entry = {
    time: new Date().toISOString(),
    level,
    message: String(message || ''),
    detail: detail === null || detail === undefined ? null : safeStringify(detail)
  }
  writeEntries([...readEntries(), entry])
}

export function getDiagnosticEntries() {
  return readEntries()
}

export function clearDiagnosticLog() {
  writeEntries([])
  addDiagnosticLog('info', '诊断日志已清空')
}

export function getDiagnosticText() {
  const compatibility = getAndroidCompatibilityInfo()
  const header = [
    'FMO仪表盘诊断日志',
    `版本: ${packageInfo.version}`,
    `导出时间: ${new Date().toLocaleString()}`,
    `平台: ${navigator.platform || '-'}`,
    `UserAgent: ${navigator.userAgent || '-'}`,
    `Android版本: ${compatibility.androidMajor || '-'}`,
    `WebView/Chrome版本: ${compatibility.chromeMajor || '-'}`,
    `最低WebView建议: ${compatibility.minimumWebViewFloor}`,
    `WebView过旧: ${compatibility.criticalLegacyWebView ? '是' : '否'}`,
    `旧系统风险: ${compatibility.needsCompatibilityWarning ? '是' : '否'}`,
    `页面: ${location.href}`,
    ''
  ]

  const lines = readEntries().map((entry) => {
    const detail = entry.detail ? ` ${JSON.stringify(entry.detail)}` : ''
    return `[${entry.time}] [${entry.level}] ${entry.message}${detail}`
  })

  return [...header, ...lines].join('\n')
}

export function installDiagnosticLog() {
  if (installed || typeof window === 'undefined') return
  installed = true

  originalConsole = {
    error: console.error.bind(console),
    warn: console.warn.bind(console)
  }

  console.error = (...args) => {
    addDiagnosticLog('error', args.map((arg) => String(arg?.message || arg)).join(' '), args)
    originalConsole.error(...args)
  }

  console.warn = (...args) => {
    addDiagnosticLog('warn', args.map((arg) => String(arg?.message || arg)).join(' '), args)
    originalConsole.warn(...args)
  }

  window.addEventListener('error', (event) => {
    addDiagnosticLog('error', event.message || '页面脚本错误', {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      error: event.error
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    addDiagnosticLog('error', '未处理的异步错误', event.reason)
  })

  addDiagnosticLog('info', '应用启动', {
    version: packageInfo.version,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    url: location.href
  })
}
