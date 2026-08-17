import type {
  IStationLocationService,
  StationLocation
} from '../interfaces/IStationLocationService'

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

  async getLatest(rawCallsign: string): Promise<StationLocation | null> {
    const callsign = rawCallsign.trim().toUpperCase()
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
        this.cache.set(callsign, { value: null, expiresAt: Date.now() + CACHE_TTL_MS })
        return null
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      if (
        !data.fresh ||
        typeof data.latitude !== 'number' ||
        typeof data.longitude !== 'number' ||
        typeof data.receivedAt !== 'number'
      ) {
        return null
      }
      const value: StationLocation = {
        callsign,
        latitude: data.latitude,
        longitude: data.longitude,
        receivedAt: data.receivedAt,
        ageSeconds: Number(data.ageSeconds || 0),
        source: 'APRS-IS',
        address: data.address || undefined
      }
      this.cache.set(callsign, { value, expiresAt: Date.now() + CACHE_TTL_MS })
      return value
    } catch (err) {
      console.warn(`[StationLocation] APRS 位置查询失败: ${callsign}`, err)
      return null
    } finally {
      window.clearTimeout(timeoutId)
    }
  }
}
