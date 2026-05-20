/**
 * 标准化地址，移除协议前缀和尾部斜杠
 * @param {string} address - 原始地址
 * @returns {string} - 标准化后的主机名
 */
export function normalizeHost(address) {
  if (!address) return ''
  return address
    .trim()
    .replace(/^(https?|wss?):?\/\//, '')
    .replace(/\/+$/, '')
}
