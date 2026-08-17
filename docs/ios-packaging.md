# iOS 打包说明

> 2026-06-09 更新：iOS V2.0 已通过 App Store 审核并发布，当前封版状态请以
> `docs/v2.0-ios-release-handoff.md` 为准。本文保留为 iOS 打包与 V2 发布前准备过程的历史说明。

本项目的 iOS 版本使用 Capacitor 生成 Xcode 工程。当前 iOS 端默认走 Web 平台能力：
Android 专属的定位上报、APRS 原生直连、后台音频前台服务等能力暂未移植到 iOS 原生插件。

## 当前 V2 接手状态

截至 2026-06-08，Web V2 与 Android V2.00 已发布。iOS V2 会话应先阅读：

1. `docs/v2-web-handoff.md`
2. `AGENTS.md`
3. 本文件

当前 V2 基线包含这些移动端交互：

- 顶部显示通联数量 `✨166/5` 和好友数量。
- 面向用户的英文“中继”统一为 `Server`。
- “上个 / 下个活跃中继”入口放在 Dashboard 第一屏的“频率 / 模式”卡片。
- 英文浮层按钮为两行：
  - `Previous active` / `server`
  - `Next active` / `server`
- Android V2.00 APK 已验证包含上述文案，iOS 同步后也应保持一致。

当前工作区仍有 iOS 相关未提交改动，iOS 会话不要直接丢弃：

- `ios/App/App/AppDelegate.swift`：回到前台时重新配置 audio session。
- `ios/App/App/Info.plist`：增加 WKWebView/local network 相关 ATS 配置。
- `src/views/SettingsView.vue`：iOS 设置页横向溢出约束。

建议 iOS 会话先审阅这些 diff，再执行同步与 Xcode 验证。

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
- iOS 要回归局域网和 DDNS 访问：`fmo.local`、局域网 IP、裸域名、`ws://`、`wss://` 都要验证保存和连接行为。
- iOS 要回归语音播报：语音开关、App 回前台、静音开关状态、系统语音不可用时的兜底行为。
