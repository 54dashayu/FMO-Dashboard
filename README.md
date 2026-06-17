# FMO 仪表盘

FMO 仪表盘是面向 FMO 用户的实时通联看板，基于 FmoLogs 数据与 FMO WebSocket 接口增强而来。它把常用信息放在第一屏：当前发言、最近通联、友台位置、相对方位、距离、服务器状态、播报模式和通联统计。

项目当前以 V2 为主线，覆盖 Web、Android、iOS、Windows 和 macOS。Windows / macOS 桌面版基于 Tauri 打包，不依赖外部浏览器，适合遇到浏览器自动 HTTPS、安全连接策略或环境兼容问题的用户。

[项目仓库](https://github.com/54dashayu/FMO-Dashboard) · [GitHub Release](https://github.com/54dashayu/FMO-Dashboard/releases/tag/v2.0.2) · [问题反馈](https://github.com/54dashayu/FMO-Dashboard/issues)

## 主要功能

- 实时仪表盘：显示当前/最后发言呼号、QTH、网格、方位、距离和服务器信息。
- 最近通联：展示最近 20 个通联，按呼号去重并实时刷新。
- 日志管理：支持同步 FMO 通联记录、导入/导出日志、按呼号检索和查看详情。
- 多地址同步：支持多个 FMO 地址、主服务器和多选同步。
- 服务器控制：支持服务器列表、收藏服务器、最近活跃服务器切换。
- 语音播报：支持新呼号提示、通联播报、呼号 NATO 读法和离线语音兜底。
- 移动端适配：针对手机浏览器和 Android App 优化布局、导航和安全区域。
- 桌面端适配：提供 Windows Win64/Win32 安装包和 macOS Universal DMG，减少浏览器环境差异。

## 下载

安装包统一从 GitHub Release 下载：

- [FMO 仪表盘 Android V2.02 Release](https://github.com/54dashayu/FMO-Dashboard/releases/tag/v2.0.2)

### iOS

iPhone / iPad 用户可在 Apple App Store 搜索 `FMO-Dashboard` 下载。

### macOS

- [FMO-Dashboard-macOS-Universal-v2.0.1.dmg](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.1/FMO-Dashboard-macOS-Universal-v2.0.1.dmg)
- [SHA256SUMS-macos-v2.0.1.txt](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.1/SHA256SUMS-macos-v2.0.1.txt)

macOS DMG 为 Universal 版本，同时支持 Apple Silicon 和 Intel Mac。V2.01 起已完成 Developer ID 签名与 Apple 公证。

### Android

- [FMO-Dashboard-Android-V2.02.apk](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.2/FMO-Dashboard-Android-V2.02.apk)
- [SHA256SUMS-android-V2.02.txt](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.2/SHA256SUMS-android-V2.02.txt)

Android V2.02 主要针对更低版本 Android 和特殊车机/音箱系统增强兼容，已测试 Android 8、小爱音箱、鸿蒙 6 等环境；高版本 Android 会自动使用现代 WebView 与系统能力。该版本加入旧 WebView 启动失败兜底、低版本 WebView 的数据库加载回退、Android 11 以下安全区修复，并优化 800x480 等小分辨率横屏显示。

### Windows 桌面版

推荐 Win10 / Win11 64 位用户下载 Win64 安装包：

- [FMO-Dashboard-Windows-Desktop-x64-Setup-v2.0.1.exe](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.1/FMO-Dashboard-Windows-Desktop-x64-Setup-v2.0.1.exe)
- [FMO-Dashboard-Windows-Desktop-x86-Setup-v2.0.1.exe](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.1/FMO-Dashboard-Windows-Desktop-x86-Setup-v2.0.1.exe)
- [SHA256SUMS-windows-desktop-v2.0.1.txt](https://github.com/54dashayu/FMO-Dashboard/releases/download/v2.0.1/SHA256SUMS-windows-desktop-v2.0.1.txt)

Win7 不再作为桌面版主支持目标。普通用户建议使用 Win10 / Win11 64 位版本；32 位 Windows 可使用 Win32 备用安装包。

Windows 下添加本地 FMO 地址时，建议填写设备局域网 IP，例如 `192.168.x.x`。部分 Windows 环境无法解析 `fmo.local` 这类 `.local` 地址。

## V2 变化

- Dashboard 第一屏重新设计，信息密度更高，移动端更紧凑。
- 顶部导航、实时通联条和播报模式控制统一整理。
- 最近活跃服务器切换入口加入 Dashboard。
- 英文界面中面向用户的“中继”统一为 Server。
- Logs、Friends、About、Settings 等页面做了窄屏和浅色模式优化。
- Android V2.02 已补充老 Android WebView、Android 11 以下原生安全区和小分辨率横屏兼容优化。
- Windows Desktop v2.0.1、macOS Desktop v2.0.1 与 Web V2 同步发布。

## 本地开发

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

常用平台命令：

```bash
npm run tauri:dev
npm run tauri:build
npm run cap:build
npm run android:deploy
```

## 技术栈

- Vue 3 + Vite
- Pinia
- Vue Router
- IndexedDB + sql.js
- WebSocket
- Capacitor Android
- Tauri Windows Desktop

## 文档

- [Windows 分发说明](WINDOWS_DISTRIBUTION.md)
- [macOS 签名与公证说明](docs/macos-signing.md)
- [项目交接文档](docs/project-handover.md)
- [VPS 访问统计说明](docs/vps-stats.md)
- [FMO 中继控制说明](doc/fmo-station-control.md)

## 致谢

这个项目最初不是从零开始的。它基于 BH5HSJ 后视镜开源的 [dingle1122/FmoLogs](https://github.com/dingle1122/FmoLogs) 修改而来，原项目为 FMO 日志读取、数据展示和基础交互打下了重要基础。没有这份开源工作，FMO 仪表盘也不会这么快进入可用状态。

在这个基础上，FMO 仪表盘逐步从“日志查看器”扩展为实时通联看板：重新设计 Dashboard 第一屏，加入当前发言、最近通联、友台方位距离、服务器切换、语音播报、多地址同步、移动端适配、Android 打包、Windows 桌面版和 macOS DMG 分发。V2 也是在持续测试、反馈、修正和重新打包中完成的。

特别说明：本项目 V2 的大量整理、重构、跨平台适配、Windows / macOS 打包流程、Release 说明、VPS 下载页同步和 README 更新，都是在人工智能 Codex 的大力协助下完成的。Codex 参与了代码阅读、实现修改、构建验证、GitHub Actions 调试、发布资产上传和文档整理等工作，让一个个人维护项目可以更快完成 Web、Android、iOS、Windows、macOS 多平台发布。

也感谢 FMO硬件原作者BG5ESN，以及所有参与测试和提出建议的各位友台。很多细节来自实际使用中的反馈，包括移动端布局、Windows 连接问题、DDNS远程连接测试、Win32/Win64 兼容测试和 Win7 Legacy 简易包验证。

## 许可证

本项目采用 [MIT License](./LICENSE) 开源。
