import type {
  IStationLocationService,
  StationLocation
} from '../interfaces/IStationLocationService'

/**
 * 本轮只启用网页版。Android 保持原有行为，后续可接入原生 APRS-IS。
 */
export class NativeStationLocationService implements IStationLocationService {
  async getLatest(_callsign: string): Promise<StationLocation | null> {
    return null
  }
}
