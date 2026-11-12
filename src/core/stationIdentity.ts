import { validateGrid } from './gridValidator'
import { coordinatesToMaidenhead } from './maidenhead'

/** Display transport identity separately from the personal callsign used for APRS. */
export function stationIdentity(raw: string) {
  const identity = String(raw || '')
    .trim()
    .toUpperCase()
  if (identity.startsWith('AI-')) return { mode: 'AI', aprsCallsign: '' }
  let callsign = identity
  const modes: string[] = []
  if (callsign.startsWith('M.')) {
    modes.push('M5 (ESP32)')
    callsign = callsign.slice(2)
  } else if (callsign.startsWith('P.')) {
    modes.push('Passport')
    callsign = callsign.slice(2)
  }
  if (callsign.endsWith('.R')) {
    modes.push('RedDV')
    callsign = callsign.slice(0, -2)
  }
  return {
    mode: modes.join(' / '),
    aprsCallsign: /^[A-Z0-9]{3,6}(?:-[A-Z0-9]{1,2})?$/.test(callsign) ? callsign : ''
  }
}

/** Only accept explicit, valid coordinate pairs; never infer coordinates from a callsign. */
export function eventCoordinates(data: any) {
  const latitude = data?.latitude ?? data?.lat
  const longitude = data?.longitude ?? data?.lon ?? data?.lng
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 ||
    Math.abs(longitude) > 180
  )
    return null
  return { latitude, longitude }
}

/** Grid and coordinates are the same packet-location tier. Keep a supplied grid
 * as a stable display representation when both are valid; APRS is a separate fallback. */
export function getEventGrid(data: any): string {
  const grid = validateGrid(typeof data?.grid === 'string' ? data.grid : '')
  if (grid.valid) return grid.grid
  const coordinates = eventCoordinates(data)
  return coordinates ? coordinatesToMaidenhead(coordinates.latitude, coordinates.longitude, 8) : ''
}
