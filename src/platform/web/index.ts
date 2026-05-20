import type { Platform } from '../index'
import { webCapabilities } from './Capabilities.web'
import { WebGridService } from './GridService.web'
import { WebAprsService } from './AprsService.web'
import { WebAudioService } from './AudioService.web'
import { WebBackgroundService } from './BackgroundService.web'
import { WebEventsService } from './EventsService.web'
import { WebLocationService } from './LocationService.web'
import { WebStorageService } from './StorageService.web'

export function createWebPlatform(): Platform {
  return {
    events: new WebEventsService(),
    audio: new WebAudioService(),
    aprs: new WebAprsService(),
    grid: new WebGridService(),
    background: new WebBackgroundService(),
    location: new WebLocationService(),
    storage: new WebStorageService(),
    capabilities: webCapabilities
  }
}
