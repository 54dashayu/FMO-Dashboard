# iOS 打包说明

本项目的 iOS 版本使用 Capacitor 生成 Xcode 工程。当前 iOS 端默认走 Web 平台能力：
Android 专属的定位上报、APRS 原生直连、后台音频前台服务等能力暂未移植到 iOS 原生插件。

## 本机准备

1. 安装完整 Xcode，而不是只安装 Command Line Tools。
2. 打开 Xcode，登录 Apple ID，并准备 Apple Developer Team。
3. 首次打开工程时，让 Xcode 完成 Swift Package 解析。

## 常用命令

```bash
npm run ios:sync  # 构建前端并同步到 ios/
npm run ios:open  # 同步后打开 Xcode 工程
npm run ios:sim   # 构建、安装并启动 iPhone 模拟器
```

也可以手动打开：

```bash
open ios/App/App.xcodeproj
```

## Xcode 内打包

1. 选择 `App` target。
2. 在 Signing & Capabilities 中选择 Team。
3. 确认 Bundle Identifier 为 `net.bh1jss.fmodashboard`，如需上架或真机安装，按你的开发者账号要求调整。
4. 选择真机或 Any iOS Device 作为目标。
5. 使用 Product -> Archive 生成归档。
6. 在 Organizer 中选择 Distribute App，按 TestFlight、App Store 或本地导出流程继续。

## 已知提醒

- `@anuradev/capacitor-background-mode` 在当前同步时提示没有 `Package.swift`。如果 Xcode 构建因此失败，可以先评估 iOS 是否需要该后台能力；不需要时可考虑改为按平台加载或替换为支持 iOS/Swift Package 的方案。
- 当前机器如果只有 Command Line Tools，会无法运行 `xcodebuild` 归档；需要安装完整 Xcode 后再打包。
