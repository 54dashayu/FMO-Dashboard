/**
 * APRS 数据包编码：呼号解析、HMAC 签名、计数器、完整 packet 构造。
 * 与平台无关；计数器的持久化通过注入 Storage 抽象实现。
 */
import CryptoJS from 'crypto-js'

export interface CallsignParsed {
  call: string
  ssid: number
}

export function parseCallsignSsid(callsignWithSsid: string): CallsignParsed {
  const s = (callsignWithSsid || '').trim().toUpperCase()
  if (!s) throw new Error('呼号为空')
  if (s.includes('-')) {
    const [call, ssidStr] = s.split('-')
    if (!call) throw new Error('呼号缺失')
    const ssid = parseInt(ssidStr, 10)
    if (isNaN(ssid) || ssid < 0 || ssid > 15) {
      throw new Error('SSID 必须是 0-15 的数字')
    }
    return { call, ssid }
  }
  return { call: s, ssid: 0 }
}

export function formatAddressee(toCall: string, toSsid: number): string {
  const addr = toSsid && toSsid !== 0 ? `${toCall}-${toSsid}` : toCall
  if (addr.length > 9) throw new Error(`目标呼号过长: ${addr}`)
  return addr.padEnd(9, ' ')
}

export function calcSignature(
  fromCall: string,
  fromSsid: number,
  typeStr: string,
  actionStr: string,
  timeSlot: number,
  counter: number,
  secret: string
): string {
  const raw = `${fromCall}${fromSsid}${typeStr}${actionStr}${timeSlot}${counter}`
  const hash = CryptoJS.HmacSHA1(raw, secret)
  return hash.toString(CryptoJS.enc.Hex).substring(0, 16).toUpperCase()
}

/**
 * 计数器状态（同一 time_slot 内单调递增）。调用方负责持久化。
 */
export interface CounterState {
  time_slot: number
  counter: number
}

export function nextCounter(prev: CounterState | null, timeSlot: number): {
  counter: number
  next: CounterState
} {
  let counter: number
  if (prev && prev.time_slot === timeSlot) {
    counter = prev.counter + 1
  } else {
    counter = 0
  }
  return {
    counter,
    next: { time_slot: timeSlot, counter }
  }
}

/**
 * 构造完整的 APRS 数据包（CONTROL 指令）。
 * 调用方需提供 counter（通过 nextCounter 拿到）。
 */
export function buildAPRSPacket(params: {
  mycall: string
  mySSID: number
  tocall: string
  toSSID: number
  action: string
  secret: string
  timeSlot: number
  counter: number
}): string {
  const { mycall, mySSID, tocall, toSSID, action, secret, timeSlot, counter } = params
  const sig = calcSignature(mycall, mySSID, 'CONTROL', action, timeSlot, counter, secret)
  const addressee = formatAddressee(tocall, toSSID)
  const payload = `CONTROL,${action},${timeSlot},${counter},${sig}`
  return `${mycall}-${mySSID}>APFMO0,TCPIP*::${addressee}:${payload}`
}
