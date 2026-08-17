/**
 * 跨平台文件导出工具
 * - Web 端：走浏览器原生下载
 * - Android/iOS：优先直接保存到公共 Documents 目录（FMO-Dashboard 子目录），方便用户在文件管理器中查看
 *   如需分享，可调用单独导出的 shareFile() 发起系统分享
 */

import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isTauriDesktop, saveFileWithDialog } from './desktopBridge'

// 原生端统一写入到 Documents/FMO-Dashboard 子目录，便于用户查找
const NATIVE_SUBDIR = 'FMO-Dashboard'

/**
 * 将 Blob 转换为 Base64 字符串
 * @param {Blob} blob
 * @returns {Promise<string>}
 */
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * 触发浏览器原生下载
 * @param {string} filename
 * @param {Blob} blob
 */
function downloadInBrowser(filename, blob) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // 部分 WebView / 内嵌浏览器需要下载动作完成后再释放 blob URL。
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/**
 * 将入参统一转换为 Blob
 */
function toBlob(data, mimeType) {
  if (data instanceof Blob) return data
  if (data instanceof Uint8Array) return new Blob([data], { type: mimeType })
  return new Blob([data], { type: mimeType || 'text/plain' })
}

/**
 * 跨平台文件导出
 * @param {string} filename - 文件名
 * @param {Uint8Array|string|Blob} data - 文件数据
 * @param {string} mimeType - MIME 类型
 * @returns {Promise<{platform: string, savedPath?: string, uri?: string, displayPath?: string}>}
 *   - platform: 'web' | 'android' | 'ios'
 *   - savedPath: 原生端保存时在存储中的相对路径（如 FMO-Dashboard/xxx.adi）
 *   - displayPath: 面向用户展示的路径（如 文档/FMO-Dashboard/xxx.adi）
 *   - uri: 原生端的文件 URI，可用于后续分享
 */
export async function exportFile(filename, data, mimeType) {
  const platform = Capacitor.getPlatform() // 'web' | 'android' | 'ios'

  if (isTauriDesktop()) {
    return await saveFileWithDialog(filename, data, mimeType)
  }

  // ========== Web 端：保持原有浏览器下载体验 ==========
  if (platform === 'web') {
    downloadInBrowser(filename, toBlob(data, mimeType))
    return { platform, filename, displayPath: filename }
  }

  // ========== Android/iOS：直接保存到 Documents 目录 ==========
  const base64 = await blobToBase64(toBlob(data, mimeType))
  const relativePath = `${NATIVE_SUBDIR}/${filename}`

  let result
  try {
    // 优先写入公共 Documents 目录（用户可在系统文件管理器的"文档"中直接找到）
    result = await Filesystem.writeFile({
      path: relativePath,
      data: base64,
      directory: Directory.Documents,
      recursive: true
    })
  } catch (err) {
    // 某些设备/权限下 Documents 不可写，回退到应用数据目录
    console.warn('[exportFile] 写入 Documents 失败，回退到 Data 目录:', err)
    result = await Filesystem.writeFile({
      path: relativePath,
      data: base64,
      directory: Directory.Data,
      recursive: true
    })
    return {
      platform,
      savedPath: relativePath,
      uri: result.uri,
      displayPath: `应用目录/${relativePath}`
    }
  }

  return {
    platform,
    savedPath: relativePath,
    uri: result.uri,
    displayPath: `文档/${relativePath}`
  }
}

/**
 * 主动分享一个已经保存的文件（如果调用方需要分享入口，可以调用此函数）
 * @param {string} uri - Filesystem 返回的文件 URI
 * @param {string} filename - 文件名（用于对话框标题）
 */
export async function shareFile(uri, filename) {
  if (!uri) return
  await Share.share({
    title: `分享 ${filename}`,
    files: [uri],
    dialogTitle: '选择分享方式'
  })
}

/**
 * 从响应头解析 filename，解析失败回退到 fallback
 * @param {Record<string,string>} headers
 * @param {string} fallback
 */
function parseFilenameFromHeaders(headers, fallback) {
  const getHeader = (name) => {
    const lower = name.toLowerCase()
    for (const key of Object.keys(headers || {})) {
      if (key.toLowerCase() === lower) return headers[key]
    }
    return ''
  }
  const disposition = getHeader('Content-Disposition') || ''
  const matchStar = disposition.match(/filename\*=(?:UTF-8'')?([^;]+)/i)
  const matchPlain = disposition.match(/filename="?([^";]+)"?/i)
  if (matchStar && matchStar[1]) {
    try {
      return decodeURIComponent(matchStar[1].trim())
    } catch {
      return matchStar[1].trim()
    }
  }
  if (matchPlain && matchPlain[1]) return matchPlain[1].trim()
  return fallback
}

/**
 * 跨平台下载远程文件并落盘。
 * - Web：交给浏览器原生下载（由服务器决定文件名）
 * - Android/iOS：走 CapacitorHttp 绕过 WebView CORS，拿到 blob 后按 Content-Disposition 命名，复用 exportFile 写入
 *
 * @param {string} url 远程 URL
 * @param {string} fallbackFilename Content-Disposition 解析失败时的兜底文件名
 * @returns {Promise<{platform: string, savedPath?: string, uri?: string, displayPath?: string}|undefined>}
 */
export async function downloadRemoteFile(url, fallbackFilename) {
  const platform = Capacitor.getPlatform()

  if (isTauriDesktop()) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const headers = Object.fromEntries(response.headers.entries())
    const filename = parseFilenameFromHeaders(headers, fallbackFilename)
    const blob = await response.blob()
    return await exportFile(filename, blob, blob.type || 'application/octet-stream')
  }

  if (platform === 'web') {
    const link = document.createElement('a')
    link.href = url
    link.download = ''
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    return { platform }
  }

  const httpResponse = await CapacitorHttp.request({
    method: 'GET',
    url,
    responseType: 'blob'
  })

  if (httpResponse.status < 200 || httpResponse.status >= 300) {
    throw new Error(`HTTP ${httpResponse.status}`)
  }

  const headers = httpResponse.headers || {}
  const filename = parseFilenameFromHeaders(headers, fallbackFilename)

  const base64 = httpResponse.data || ''
  const binary = atob(base64)
  const data = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i)
  }
  const mimeType = headers['Content-Type'] || headers['content-type'] || 'application/octet-stream'

  return await exportFile(filename, data, mimeType)
}
