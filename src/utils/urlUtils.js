/**
 * 标准化地址，移除协议前缀和尾部斜杠
 * @param {string} address - 原始地址
 * @returns {string} - 标准化后的主机名
 */
export function normalizeHost(address) {
  if (!address) return ''
  let value = String(address)
    .trim()
    .replace(/：/g, ':')
    .replace(/^(https?|wss?):?\/\//i, '')
    .replace(/\/+$/, '')

  value = value.replace(/[?#].*$/, '')
  value = value.replace(/\/(ws|events)\/?$/i, '')
  value = value.replace(/\/.*$/, '')
  return value
}

/**
 * 检查是否为有效的 IPv4 或域名地址（可带端口号）。
 * 允许 DDNS 常见的短标签域名，例如 a.example.com、x.yz.net。
 */
export function isValidHostAddress(address) {
  if (!address) return false

  let host = normalizeHost(address)
  let port = null

  const portMatch = host.match(/^(.+):(\d+)$/)
  if (portMatch) {
    host = portMatch[1]
    port = parseInt(portMatch[2], 10)

    if (port < 1 || port > 65535) {
      return false
    }
  }

  const ipv4Regex =
    /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  if (ipv4Regex.test(host)) return true

  // DDNS 厂商和自建网关偶尔会使用下划线或单标签内网主机名。
  // 这里仍拒绝空白、协议残片和明显的 URL 分隔符，但不再强制按公网 DNS 标签规则卡死。
  if (
    host.length <= 253 &&
    !/\s/.test(host) &&
    !/[/?#@]/.test(host) &&
    /^[a-zA-Z0-9._-]+$/.test(host) &&
    /^[a-zA-Z0-9]/.test(host) &&
    /[a-zA-Z0-9]$/.test(host)
  ) {
    return true
  }

  const labels = host.split('.')
  return labels.every((label) => {
    return (
      label.length >= 1 &&
      label.length <= 63 &&
      /^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(label)
    )
  })
}

export function getProtocolFromAddress(address, fallback = 'ws') {
  const value = String(address || '').trim()
  if (/^(wss|https):\/\//i.test(value)) return 'wss'
  if (/^(ws|http):\/\//i.test(value)) return 'ws'
  return fallback === 'wss' || fallback === 'https' ? 'wss' : 'ws'
}

export function getEffectiveWebSocketProtocol(host, protocol = 'ws') {
  return protocol === 'wss' || protocol === 'https' ? 'wss' : 'ws'
}

export function buildWebSocketUrl(host, protocol = 'ws', path = '/ws') {
  const normalizedHost = normalizeHost(host)
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const wsProtocol = getEffectiveWebSocketProtocol(normalizedHost, protocol)
  return `${wsProtocol}://${normalizedHost}${normalizedPath}`
}

export function getBlockedInsecureWebSocketMessage(host, protocol = 'ws') {
  const normalizedProtocol = protocol === 'wss' || protocol === 'https' ? 'wss' : 'ws'
  if (
    typeof window !== 'undefined' &&
    window.location?.protocol === 'https:' &&
    normalizedProtocol === 'ws'
  ) {
    return '当前页面是 HTTPS，浏览器不能连接 ws:// 地址。请改用 http://fmo.bh1jss.net/ 或本地版本访问普通 ws:// FMO；只有目标已配置 TLS WebSocket 时才选择 wss://。'
  }
  return ''
}
