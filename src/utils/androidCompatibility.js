const LEGACY_ANDROID_NOTICE_KEY = 'fmo_legacy_android_notice_at'
const NOTICE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

function parseMajor(pattern, text) {
  const match = String(text || '').match(pattern)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) ? value : null
}

export function getAndroidCompatibilityInfo(userAgent = navigator.userAgent || '') {
  const precheck =
    typeof window !== 'undefined' ? window.__FMO_ANDROID_WEBVIEW_PRECHECK__ || null : null
  const androidMajor = parseMajor(/Android\s+(\d+)/i, userAgent)
  const chromeMajor = parseMajor(/(?:Chrome|CriOS)\/(\d+)/i, userAgent)
  const isAndroid = /Android/i.test(userAgent)
  const isWebView = /\bwv\b/i.test(userAgent) || /Version\/\d+\.\d+\s+Chrome\//i.test(userAgent)
  const legacyAndroid = Boolean(androidMajor && androidMajor < 10)
  const legacyWebView = Boolean(chromeMajor && chromeMajor < 80)
  const criticalLegacyWebView = Boolean(
    isAndroid && ((chromeMajor && chromeMajor < 61) || precheck?.tooOld)
  )

  return {
    userAgent,
    isAndroid,
    isWebView,
    androidMajor,
    chromeMajor,
    lacksModuleSupport: Boolean(precheck?.lacksModule),
    legacyAndroid,
    legacyWebView,
    criticalLegacyWebView,
    needsCompatibilityWarning:
      isAndroid && (legacyAndroid || legacyWebView || criticalLegacyWebView),
    supportedInstallFloor: 'Android 7.0 / API 24',
    minimumWebViewFloor: 'Chrome/WebView 61+',
    recommendedFloor: 'Android 10+'
  }
}

export function shouldShowLegacyAndroidNotice(now = Date.now()) {
  try {
    const lastShown = Number(localStorage.getItem(LEGACY_ANDROID_NOTICE_KEY) || 0)
    if (lastShown && now - lastShown < NOTICE_INTERVAL_MS) return false
    localStorage.setItem(LEGACY_ANDROID_NOTICE_KEY, String(now))
  } catch {
    return true
  }
  return true
}
