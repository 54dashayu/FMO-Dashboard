import type { Platform } from '../index'
import { nativeCapabilities } from './Capabilities.native'
import { NativeGridService } from './GridService.native'
import { NativeAprsService } from './AprsService.native'
import { NativeAudioService } from './AudioService.native'
import { NativeBackgroundService } from './BackgroundService.native'
import { NativeEventsService } from './EventsService.native'
import { NativeLocationService } from './LocationService.native'
import { NativeStorageService } from './StorageService.native'

export function createNativePlatform(): Platform {
  return {
    events: new NativeEventsService(),
    audio: new NativeAudioService(),
    aprs: new NativeAprsService(),
    grid: new NativeGridService(),
    background: new NativeBackgroundService(),
    location: new NativeLocationService(),
    storage: new NativeStorageService(),
    capabilities: nativeCapabilities
  }
}
