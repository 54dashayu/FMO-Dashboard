import type {
  IStationLocationService,
  StationLocation
} from '../interfaces/IStationLocationService'
import { stationIdentity } from '../../core/stationIdentity'

const API_URL = import.meta.env.DEV
  ? '/aprs/api/position'
  : 'https://fmo.bh1jss.net/aprs/api/position'
const CACHE_TTL_MS = 5 * 60 * 1000
const REQUEST_TIMEOUT_MS = 3000

interface CacheEntry {
  value: StationLocation | null
  expiresAt: number
}

export class WebStationLocationService implements IStationLocationService {
  private cache = new Map<string, CacheEntry>()
  private statuses = new Map<string, string>()

  getStatus(raw: string): string {
    const identity = stationIdentity(raw)
    if (identity.mode === 'AI') return 'AI 服务，不套用个人位置'
    return this.statuses.get(identity.aprsCallsign) || '暂无可用 APRS 位置'
  }

  async getLatest(rawCallsign: string): Promise<StationLocation | null> {
    const callsign = stationIdentity(rawCallsign).aprsCallsign
    if (!/^[A-Z0-9]{3,6}(?:-[A-Z0-9]{1,2})?$/.test(callsign)) return null

    const cached = this.cache.get(callsign)
    if (cached && cached.expiresAt > Date.now()) return cached.value

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
    try {
      const response = await fetch(`${API_URL}?callsign=${encodeURIComponent(callsign)}`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      })
      if (response.status === 404) {
        this.statuses.set(callsign, 'APRS 无位置记录')
        this.cache.set(callsign, { value: null, expiresAt: Date.now() + CACHE_TTL_MS })
        return null
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (
        typeof data.latitude !== 'number' ||
        typeof data.longitude !== 'number' ||
        typeof data.receivedAt !== 'number' ||
        !Number.isFinite(data.latitude) ||
        Math.abs(data.latitude) > 90 ||
        !Number.isFinite(data.longitude) ||
        Math.abs(data.longitude) > 180 ||
        !Number.isFinite(data.receivedAt) ||
        data.receivedAt <= 0
      ) {
        return null
      }
      const value: StationLocation = {
        callsign: data.callsign || callsign,
        latitude: data.latitude,
        longitude: data.longitude,
        receivedAt: data.receivedAt < 1e12 ? data.receivedAt * 1000 : data.receivedAt,
        ageSeconds: Number(data.ageSeconds || 0),
        source: data.source === 'aprs.fi' ? 'aprs.fi' : 'APRS-IS',
        address: data.address || undefined
      }
      this.cache.set(callsign, { value, expiresAt: Date.now() + CACHE_TTL_MS })
      return value
    } catch (err) {
      this.statuses.set(callsign, 'APRS 查询失败，稍后重试')
      console.warn(`[StationLocation] APRS 位置查询失败: ${callsign}`, err)
      return null
    } finally {
      window.clearTimeout(timeoutId)
    }
  }
}
