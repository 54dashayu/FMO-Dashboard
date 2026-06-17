# FMO 仪表盘 Android V2.02 发布说明

## 主要更新

Android V2.02 是面向更低版本 Android、特殊车机/音箱系统和小分辨率横屏场景的兼容性补丁。版本号已递增为 `versionCode 20200` / `versionName V2.02`，可覆盖安装 V2.01。

本版本已针对 Android 8、小爱音箱、鸿蒙 6 等环境做过测试；在更高版本 Android 系统上，会自动使用现代 WebView 与系统能力。

- 增强老 Android WebView 启动兜底：启动 12 秒内未完成加载时显示中文兼容失败提示，并提供“重试启动 / 退出应用”按钮，避免设备长时间白屏。
- 放宽旧 WebView 预检测门槛到 Chrome/WebView 61，并针对 WebView 64 以下设备忽略 legacy 探测阶段的预期语法错误，让 legacy/nomodule 入口继续接管。
- 为低版本 WebView 增加 `sql.js` asm.js 回退路径，WebAssembly 初始化失败时自动切换到 asm 版本。
- 修复 Android 11 以下设备调用高版本 `WindowInsets.Type.*` API 可能导致原生进程崩溃的问题。
- 优化 800x480 等小分辨率横屏界面，压缩顶部栏、当前呼号卡片、方位卡片和最近通联列表的占用空间。
- 保留 V2.01 已加入的 FMO 屏幕风格 TX/RX 频率显示。

## 下载资产

- `FMO-Dashboard-Android-V2.02.apk`
- `SHA256SUMS-android-V2.02.txt`

## 校验值

```text
4405f90ef7932c2cffdafc499f917570c105dc48abee6dbc3465a31a19c9af90  FMO-Dashboard-Android-V2.02.apk
```

## 安装与兼容说明

- Android 包名：`net.bh1jss.fmodashboard`
- 最低安装门槛：Android 7.0 / API 24
- 已测试环境：Android 8、小爱音箱、鸿蒙 6 等低版本或特殊 Android 环境
- 高版本 Android：自动使用现代 WebView 与系统能力，无需用户手动切换
- Android 10 以下设备的稳定性仍会受厂商 ROM、WebView 内核版本和是否支持现代 Web 能力影响。
- 如果车机或老设备无法升级 WebView，建议改用 Android 10+ 设备、网页版或桌面版。

## 验证状态

- 本地 APK 与发布目录 APK SHA256 一致。
- `release/android/`、`deploy/downloads/`、`deploy/aliyun-site/downloads/` 三处 V2.02 APK 校验一致。
- `npm run typecheck` 通过。
- 源文件 ESLint 聚焦检查通过，当前仅保留既有 warning，无 error。
- VPS 首页、APK 下载和 SHA256 校验文件已完成公网 HTTP 验证。
