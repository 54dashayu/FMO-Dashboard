import type { GridAddress } from '../types/grid'

export interface IGridService {
  gridToAddress(grid: string): Promise<GridAddress | null>
  clearCache(): Promise<void>
}
