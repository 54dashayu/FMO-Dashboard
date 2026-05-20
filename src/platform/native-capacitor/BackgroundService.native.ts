import type { IBackgroundService } from '../interfaces/IBackgroundService'
import { BackgroundMode as BackgroundModeRaw } from '@anuradev/capacitor-background-mode'

// 插件类型声明与实际运行期 API 不同步（缺 setSettings 等），统一当作 any 处理。
const BackgroundMode = BackgroundModeRaw as any

const DEFAULT_SETTINGS = {
  title: 'FMO 音频播放中',
  text: '正在播放音频流...',
  subText: 'FMO Logs',
  bigText: true,
  resume: true,
  silent: true,
  hidden: false,
  color: '#1a73e8',
  channelName: 'FMO 音频播放',
  channelDescription: '保持音频流在后台持续播放',
  allowClose: true,
  closeTitle: '停止播放',
  showWhen: true,
  visibility: 'public' as const,
  disableWebViewOptimization: true
}

export class NativeBackgroundService implements IBackgroundService {
  async enable(): Promise<void> {
    try {
      await BackgroundMode.setSettings(DEFAULT_SETTINGS)
      await BackgroundMode.enable()
      await BackgroundMode.disableWebViewOptimizations()
    } catch (e) {
      console.debug('[NativeBackgroundService] enable 失败:', e)
    }
  }

  async disable(): Promise<void> {
    try {
      await BackgroundMode.enableWebViewOptimizations()
    } catch {
      // 忽略
    }
    try {
      await BackgroundMode.disable()
    } catch (e) {
      console.debug('[NativeBackgroundService] disable 失败:', e)
    }
  }
}
