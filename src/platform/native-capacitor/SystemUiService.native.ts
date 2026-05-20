import { registerPlugin } from '@capacitor/core'

/**
 * 安全区 inset 数据，单位 dp（与 WebView CSS px 一致）。
 * Java 侧已经用 displayMetrics.density 做过 px → dp 转换。
 */
export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

interface FmoSystemUiPlugin {
  getSafeAreaInsets(): Promise<SafeAreaInsets>
  addListener(
    event: 'safeAreaChanged',
    callback: (data: SafeAreaInsets) => void
  ): Promise<{ remove: () => void }>
}

const FmoSystemUi = registerPlugin<FmoSystemUiPlugin>('FmoSystemUi')

/**
 * 将安全区 inset 写入 :root CSS 变量。
 * - Android：从原生插件获取真实 WindowInsets
 * - 降级：插件调用失败时使用估算值
 */
export async function applySafeAreaInsets(): Promise<void> {
  try {
    const insets = await FmoSystemUi.getSafeAreaInsets()
    setCssVariables(insets)
  } catch (e) {
    console.warn('[FmoSystemUi] getSafeAreaInsets failed, using fallback:', e)
    setCssVariables({ top: 36, bottom: 84, left: 0, right: 0 })
  }

  // 监听动态变化（手势/三键导航切换、折叠屏展开/折叠）
  FmoSystemUi.addListener('safeAreaChanged', (insets) => {
    setCssVariables(insets)
  })
}

function setCssVariables(insets: SafeAreaInsets): void {
  const root = document.documentElement.style
  root.setProperty('--safe-inset-top', `${insets.top}px`)
  root.setProperty('--safe-inset-bottom', `${insets.bottom}px`)
  root.setProperty('--safe-inset-left', `${insets.left}px`)
  root.setProperty('--safe-inset-right', `${insets.right}px`)
}
