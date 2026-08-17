import type { Platform } from '../index'
import { WebAprsService } from '../web/AprsService.web'
import { WebAudioService } from '../web/AudioService.web'
import { WebBackgroundService } from '../web/BackgroundService.web'
import { WebEventsService } from '../web/EventsService.web'
import { WebGridService } from '../web/GridService.web'
import { WebStationLocationService } from '../web/StationLocationService.web'
import { WebStorageService } from '../web/StorageService.web'
import { iosCapabilities } from './Capabilities.ios'
import { NativeLocationService } from './LocationService.native'

export function createIosPlatform(): Platform {
  return {
    events: new WebEventsService(),
    audio: new WebAudioService(),
    aprs: new WebAprsService(),
    grid: new WebGridService(),
    background: new WebBackgroundService(),
    location: new NativeLocationService(),
    stationLocation: new WebStationLocationService(),
    storage: new WebStorageService(),
    capabilities: iosCapabilities
  }
}
