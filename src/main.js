import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './stores'
import { useLocationStore } from './stores/locationStore'
import { getPlatform } from './platform'
import { applySafeAreaInsets } from './platform/native-capacitor/SystemUiService.native'
import { installDiagnosticLog } from './services/diagnosticLog'
import './style.css'

installDiagnosticLog()

if (Capacitor.isNativePlatform()) {
  document.documentElement.classList.add(`native-${Capacitor.getPlatform()}`)
}

// Windows 便携版使用本地内置服务。桌面浏览器关闭后通知服务延迟退出，
// 下次双击不会遗留旧 Node 进程或端口冲突提示。
if (
  window.location.hostname === '127.0.0.1' &&
  window.location.port &&
  window.location.port !== '5173'
) {
  window.addEventListener('pagehide', () => {
    navigator.sendBeacon?.('/__portable-client-closed')
  })
}

//  Android 原生平台：env(safe-area-inset-*) 在许多厂商 ROM 上返回 0px，
// 需要通过原生 WindowInsets API 动态获取真实值并写入 CSS 变量。
// 降级值：状态栏约 36px，导航栏约 48px（在 WebView CSS 坐标中 1dp ≈ 1px）。
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
  applySafeAreaInsets()
}

// 提前实例化平台单例，保证后续模块以统一入口访问能力
getPlatform()

const app = createApp(App)

app.use(pinia)
app.use(router)

// 深度链接：点击定位上报通知直接打开自动定位页面
if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('appUrlOpen', (data) => {
    try {
      const url = new URL(data.url)
      if (url.host === 'location-report') {
        router.push('/location-report')
      }
    } catch {
      /* ignore invalid URL */
    }
  })
}

app.mount('#app')

// 冷启动自动恢复定位上报（如果之前已开启）
const locationStore = useLocationStore()
locationStore.init()
