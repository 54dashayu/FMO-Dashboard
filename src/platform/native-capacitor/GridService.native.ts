import type { IGridService } from '../interfaces/IGridService'
import type { GridAddress } from '../types/grid'
import { registerPlugin } from '@capacitor/core'

/**
 * Android 原生 Grid 插件。
 * 原生侧统一走「内存 LRU → SQLite 持久化 → 远程 API」三级缓存。
 */
interface FmoGridPlugin {
  gridToAddress(opts: { grid: string }): Promise<GridAddress>
  clearCache(): Promise<void>
}

const FmoGrid = registerPlugin<FmoGridPlugin>('FmoGrid')

export class NativeGridService implements IGridService {
  async gridToAddress(grid: string): Promise<GridAddress | null> {
    const result = await FmoGrid.gridToAddress({ grid })
    return result ?? null
  }
  async clearCache(): Promise<void> {
    await FmoGrid.clearCache()
  }
}
