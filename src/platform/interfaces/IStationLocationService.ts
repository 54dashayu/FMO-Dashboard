export interface StationLocation {
  callsign: string
  latitude: number
  longitude: number
  receivedAt: number
  ageSeconds: number
  source: 'APRS-IS'
  address?: {
    country?: string
    province?: string
    city?: string
    district?: string
    township?: string
    displayName?: string
    source?: string
  }
}

export interface IStationLocationService {
  getLatest(callsign: string): Promise<StationLocation | null>
}
