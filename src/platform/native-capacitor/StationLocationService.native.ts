import { WebStationLocationService } from '../web/StationLocationService.web'

/**
 * Native WebView uses the same read-only APRS HTTP fallback and identity safeguards.
 */
export class NativeStationLocationService extends WebStationLocationService {}
