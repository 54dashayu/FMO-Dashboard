import { isTauri } from '@tauri-apps/api/core'
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog'
import { readFile, writeFile } from '@tauri-apps/plugin-fs'
import { openUrl } from '@tauri-apps/plugin-opener'

function isDesktopTauri() {
  try {
    return isTauri()
  } catch {
    return false
  }
}

function pathBasename(path) {
  return String(path || '')
    .split(/[\\/]/)
    .filter(Boolean)
    .pop()
}

async function dataToBytes(data, mimeType) {
  if (data instanceof Uint8Array) return data
  if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer())
  if (data instanceof ArrayBuffer) return new Uint8Array(data)
  const blob = new Blob([data], { type: mimeType || 'text/plain' })
  return new Uint8Array(await blob.arrayBuffer())
}

function filtersForFilename(filename, mimeType) {
  const extension = String(filename || '')
    .split('.')
    .pop()
    ?.toLowerCase()
  if (extension && extension !== filename) {
    return [{ name: extension.toUpperCase(), extensions: [extension] }]
  }
  if (mimeType?.includes('sqlite')) return [{ name: 'SQLite DB', extensions: ['db'] }]
  if (mimeType?.includes('text')) return [{ name: 'Text', extensions: ['txt', 'adi', 'adif'] }]
  return undefined
}

export function isTauriDesktop() {
  return isDesktopTauri()
}

export async function saveFileWithDialog(filename, data, mimeType) {
  if (!isDesktopTauri()) return null

  const targetPath = await saveDialog({
    title: `保存 ${filename}`,
    defaultPath: filename,
    filters: filtersForFilename(filename, mimeType),
    canCreateDirectories: true
  })
  if (!targetPath) {
    return { platform: 'tauri', canceled: true }
  }

  await writeFile(targetPath, await dataToBytes(data, mimeType))
  return {
    platform: 'tauri',
    savedPath: targetPath,
    displayPath: targetPath
  }
}

export async function pickImportFiles() {
  if (!isDesktopTauri()) return null

  const selected = await openDialog({
    title: '选择 FMO 日志备份或 ADIF 文件',
    multiple: true,
    filters: [
      { name: 'FMO 日志与 ADIF', extensions: ['db', 'adi', 'adif'] },
      { name: 'SQLite 数据库', extensions: ['db'] },
      { name: 'ADIF', extensions: ['adi', 'adif'] }
    ]
  })

  const paths = Array.isArray(selected) ? selected : selected ? [selected] : []
  if (paths.length === 0) return []

  return Promise.all(
    paths.map(async (path) => {
      const bytes = await readFile(path)
      return {
        name: pathBasename(path),
        path,
        async arrayBuffer() {
          return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
        }
      }
    })
  )
}

export async function openExternalUrl(url) {
  if (!url) return
  if (isDesktopTauri()) {
    await openUrl(url)
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function handleExternalLinkClick(event, url) {
  if (!url) return
  if (event) {
    event.preventDefault()
    event.stopPropagation()
  }
  await openExternalUrl(url)
}
