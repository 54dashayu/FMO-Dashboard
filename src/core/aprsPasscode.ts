/**
 * APRS passcode 计算与校验（纯函数，与平台无关）。
 */

export function calculateAPRS(callsign: string): number {
  if (!callsign) return 0
  const stophere = callsign.indexOf('-')
  if (stophere !== -1) callsign = callsign.substring(0, stophere)
  const realcall = callsign.toUpperCase().substring(0, 10)

  let hash = 0x73e2
  let i = 0
  const len = realcall.length
  while (i < len) {
    hash ^= realcall.charCodeAt(i) << 8
    if (i + 1 < len) {
      hash ^= realcall.charCodeAt(i + 1)
    }
    i += 2
  }
  return hash & 0x7fff
}

export function validateAPRS(callsign: string, passcode: string | number): boolean {
  if (!callsign || passcode === undefined || passcode === null || passcode === '') {
    return false
  }
  const expected = calculateAPRS(callsign)
  const input = typeof passcode === 'number' ? passcode : parseInt(passcode, 10)
  if (isNaN(input)) return false
  return expected === input
}
