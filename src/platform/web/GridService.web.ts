import type { IGridService } from '../interfaces/IGridService'
import type { GridAddress } from '../types/grid'
import { normalizeGrid, validateGrid } from '../../core/gridValidator'

const GRID_DB_NAME = 'FmoGridCache'
const GRID_STORE_NAME = 'gridCache'
const GRID_DB_VERSION = 1
const API_BASE_URL = 'https://grid.lzyike.cn'

const MEMORY_CACHE_TTL = 30 * 60 * 1000
const MEMORY_CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000

interface MemEntry {
  data: Omit<GridAddress, 'grid'>
  timestamp: number
}

/**
 * Web/Tauri 桌面端 Grid 服务：内存 LRU → IndexedDB → 远程 API 三级缓存。
 * 包含 grid 级并发锁与全局 2 次/秒 频率限制。
 */
export class WebGridService implements IGridService {
  private dbInstance: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase> | null = null
  private memoryCache = new Map<string, MemEntry>()
  private gridLocks = new Map<string, Promise<void>>()
  private rateLimiter = {
    promise: Promise.resolve() as Promise<void>,
    lastTime: 0,
    minInterval: 600
  }

  constructor() {
    setInterval(() => this.cleanupMemoryCache(), MEMORY_CACHE_CLEANUP_INTERVAL)
  }

  private cleanupMemoryCache() {
    const now = Date.now()
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > MEMORY_CACHE_TTL) {
        this.memoryCache.delete(key)
      }
    }
  }

  private async acquireGridLock(grid: string): Promise<() => void> {
    while (this.gridLocks.has(grid)) {
      await this.gridLocks.get(grid)
    }
    let release!: () => void
    const promise = new Promise<void>((resolve) => {
      release = resolve
    })
    this.gridLocks.set(grid, promise)
    return () => {
      this.gridLocks.delete(grid)
      release()
    }
  }

  private async acquireRate(): Promise<void> {
    let resolveNext!: () => void
    const newPromise = new Promise<void>((resolve) => {
      resolveNext = resolve
    })
    const prevPromise = this.rateLimiter.promise
    this.rateLimiter.promise = newPromise
    await prevPromise
    const now = Date.now()
    const wait = Math.max(0, this.rateLimiter.lastTime + this.rateLimiter.minInterval - now)
    if (wait > 0) {
      await new Promise((r) => setTimeout(r, wait))
    }
    this.rateLimiter.lastTime = Date.now()
    resolveNext()
  }

  private openDatabase(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise
    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(GRID_DB_NAME, GRID_DB_VERSION)
      request.onerror = () => {
        this.dbPromise = null
        reject(request.error)
      }
      request.onsuccess = () => {
        this.dbInstance = request.result
        this.dbInstance.onversionchange = () => {
          this.dbInstance?.close()
          this.dbInstance = null
          this.dbPromise = null
        }
        resolve(this.dbInstance)
      }
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(GRID_STORE_NAME)) {
          db.createObjectStore(GRID_STORE_NAME, { keyPath: 'grid' })
        }
      }
    })
    return this.dbPromise
  }

  private async getCached(grid: string): Promise<Omit<GridAddress, 'grid'> | null> {
    const db = await this.openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GRID_STORE_NAME, 'readonly')
      const store = tx.objectStore(GRID_STORE_NAME)
      const request = store.get(grid)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const result = request.result
        if (result && result.data) resolve(result.data)
        else resolve(null)
      }
    })
  }

  private async saveCached(grid: string, data: Omit<GridAddress, 'grid'>): Promise<void> {
    const db = await this.openDatabase()
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GRID_STORE_NAME, 'readwrite')
      const store = tx.objectStore(GRID_STORE_NAME)
      const request = store.put({ grid, data, cachedAt: Date.now() })
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
    })
  }

  async gridToAddress(grid: string): Promise<GridAddress | null> {
    const validation = validateGrid(grid)
    if (!validation.valid) {
      throw new Error(`grid 格式错误: ${validation.error}`)
    }
    const normalizedGrid = validation.grid as string

    // 1. 无锁内存快速路径
    const mem0 = this.memoryCache.get(normalizedGrid)
    if (mem0) return { grid: normalizedGrid, ...mem0.data }

    // 2. 加锁
    const release = await this.acquireGridLock(normalizedGrid)
    try {
      // 3. 双检内存
      const mem1 = this.memoryCache.get(normalizedGrid)
      if (mem1) return { grid: normalizedGrid, ...mem1.data }

      // 4. IndexedDB
      try {
        const cached = await this.getCached(normalizedGrid)
        if (cached) {
          this.memoryCache.set(normalizedGrid, { data: cached, timestamp: Date.now() })
          return { grid: normalizedGrid, ...cached }
        }
      } catch (err) {
        console.warn('[WebGridService] 读取本地缓存失败:', err)
      }

      // 5. 频率限制
      await this.acquireRate()

      // 6. 远程 API
      let response: Response
      try {
        response = await fetch(
          `${API_BASE_URL}/api/grid2addr/${encodeURIComponent(normalizedGrid)}`,
          { method: 'GET', headers: { Accept: 'application/json' } }
        )
      } catch (err: any) {
        throw new Error(`grid 转换失败: 网络请求异常 (${err?.message ?? err})`)
      }

      if (response.status === 429) {
        throw new Error('请求过于频繁，请稍后再试')
      }
      if (!response.ok) {
        let errorMsg = `HTTP ${response.status}`
        try {
          const errorData = await response.json()
          if (errorData.retmsg) errorMsg = errorData.retmsg
        } catch {
          // ignore
        }
        throw new Error(`调用 grid2addr API 失败: ${errorMsg}`)
      }

      const result = await response.json()
      if (result.retcode !== 0 || !result.data) {
        throw new Error(result.retmsg || 'grid 转换失败')
      }

      // 7. 写缓存
      this.memoryCache.set(normalizedGrid, { data: result.data, timestamp: Date.now() })
      try {
        await this.saveCached(normalizedGrid, result.data)
      } catch (err) {
        console.warn('[WebGridService] 保存本地缓存失败:', err)
      }

      return { grid: normalizedGrid, ...result.data }
    } finally {
      release()
    }
  }

  async clearCache(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      if (this.dbInstance) {
        try {
          this.dbInstance.close()
        } catch {
          // ignore
        }
        this.dbInstance = null
      }
      this.dbPromise = null
      const request = indexedDB.deleteDatabase(GRID_DB_NAME)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve()
      request.onblocked = () => {
        console.warn('[WebGridService] 删除 Grid 缓存数据库被阻塞')
        resolve()
      }
    })
    this.memoryCache.clear()
  }
}

// 为避免重复使用 normalizeGrid，只做类型导出；上游可继续从 core/gridValidator 引用。
export { normalizeGrid }
