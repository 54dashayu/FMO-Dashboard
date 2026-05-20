/**
 * 友情链接配置
 * 添加新友链时，在此数组中添加配置对象即可
 */
export const friendLinks = [
  {
    id: 'fmo-map',
    name: 'FMO 地图',
    url: 'https://map.fmo.net.cn/',
    displayUrl: 'map.fmo.net.cn',
    icon: {
      type: 'emoji',
      content: '🗺️'
    }
  },
  {
    id: 'fmodeck',
    name: 'FMODECK',
    url: 'https://fmologs.wh0am1i.com/logs',
    displayUrl: 'fmologs.wh0am1i.com',
    description: '业余无线电 FMO 平台的日志与控制台 · 战术 HUD 主题',
    icon: {
      type: 'url',
      content: 'https://fmologs.wh0am1i.com/icon.svg'
    }
  },
  {
    id: 'fmo-docs',
    name: 'FMO实践分享',
    url: 'https://bg5esn.com/docs/fmo-user-shares/',
    displayUrl: 'bg5esn.com',
    icon: {
      type: 'emoji',
      content: '📖'
    }
  },
  {
    id: 'bg5esn',
    name: '大船地下室',
    url: 'https://bg5esn.com/',
    displayUrl: 'bg5esn.com',
    icon: {
      type: 'emoji',
      content: '⚓'
    }
  },
  {
    id: 'fmoc',
    name: 'FMOC',
    tag: '未知',
    tagType: 'warn',
    url: 'http://fmo.bg5eit.cn/',
    displayUrl: 'fmo.bg5eit.cn',
    icon: {
      type: 'svg',
      content: `<svg width="44" height="44" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
        <rect width="44" height="44" rx="10" fill="#ff9800" />
        <text x="22" y="30" font-size="24" font-weight="bold" fill="white" text-anchor="middle" font-family="Arial, sans-serif">F</text>
      </svg>`
    }
  }
]

import { normalizeHost } from '../../../utils/urlUtils'

/**
 * 获取处理后的友链列表
 * @param {string} rawAddress - 当前FMO原始地址，用于动态生成远程控制链接
 * @returns {Array} 处理后的友链数组
 */
export function getProcessedLinks(rawAddress = '') {
  const host = rawAddress ? normalizeHost(rawAddress) : ''

  return friendLinks.map((link) => {
    const processed = { ...link }

    // 如果定义了 getUrl 方法，调用它生成 URL
    if (link.getUrl) {
      processed.url = link.getUrl(host)
    }

    // 如果定义了 getDisplayUrl 方法，调用它生成显示文本
    if (link.getDisplayUrl) {
      processed.displayUrl = link.getDisplayUrl(host)
    }

    // 如果 url 是 # 或未设置，标记为禁用
    if (processed.url === '#' || !processed.url) {
      processed.disabled = true
    }

    return processed
  })
}
