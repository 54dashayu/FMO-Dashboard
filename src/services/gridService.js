/**
 * 兼容薄层：历史调用点通过 from '../services/gridService' 访问 Grid 能力。
 * 新的真正实现位于 src/platform/web/GridService.web.ts 与
 * src/platform/native-capacitor/GridService.native.ts，此处仅作路由。
 *
 * 未来所有调用点迁移到 getPlatform().grid.* 后即可删除本文件。
 */
import { getPlatform } from '../platform'

/**
 * Grid 转地址（自动路由到当前平台的实现：Web 走 IndexedDB + 远程 API，Android 走原生插件）
 *
 * @param {string} grid - Maidenhead 网格编码
 * @returns {Promise<{grid: string, country?: string, province?: string, city?: string, district?: string, township?: string}|null>}
 */
export async function gridToAddress(grid) {
  return getPlatform().grid.gridToAddress(grid)
}

/**
 * 清空所有 Grid 缓存（内存 + 持久化）。
 */
export async function clearGridCache() {
  return getPlatform().grid.clearCache()
}
