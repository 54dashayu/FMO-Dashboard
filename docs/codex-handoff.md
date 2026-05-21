# Codex 交接说明

本文档用于未来继续让 Codex 维护 FMO仪表盘 时快速恢复上下文。

## 项目定位

FMO仪表盘 是基于 BH5HSJ 后视镜的 FmoLogs 改进而来的独立项目。目标是做一个更适合实时守听和电台旁查看的 FMO 网页工具，重点围绕：

- 实时仪表盘
- 当前通联呼号、位置、方位、距离
- 最近通联列表
- 中继切换
- 通联日志
- 语音播报和新呼号提醒
- Win64 便携版和 Android APK

## 仓库与路径

本地工作目录：

```text
/Users/bh1jss/Documents/Codex/2026-05-13/FMO-Dashboard
```

GitHub 仓库：

```text
https://github.com/54dashayu/FMO-Dashboard
```

线上站点：

```text
https://fmo.bh1jss.net/
https://fmolog.bh1jss.net/
```

VPS 部署目录：

```text
/var/www/fmologs
```

不要在文档或代码中写入 VPS root 密码、证书私钥、面板密码等敏感信息。

## 当前版本

当前正式版本：`0.99.0`

GitHub Release：

```text
https://github.com/54dashayu/FMO-Dashboard/releases/tag/v0.99.0
```

本地发布产物：

```text
release/FMO-Dashboard-Windows-Portable.exe
release/FMO-Dashboard-Windows-Portable.zip
release/android/FMO-Dashboard-Android-v0.99.0.apk
```

## 关键功能上下文

### 仪表盘

主要文件：

```text
src/views/DashboardView.vue
src/components/home/SpeakingBar.vue
src/stores/speakingStore.ts
```

重要行为：

- 当前通联卡片显示当前或最后发言。
- 发言过短时保留最后发言约 5 秒。
- 最近通联列表按呼号去重。
- 自己的呼号标记为“您”。
- 已出现在通联日志中的呼号显示星标。

### 语音播报

主要文件：

```text
src/services/callsignSpeech.js
src/views/DashboardView.vue
src/views/SettingsView.vue
android/app/src/main/java/net/bh1jss/fmodashboard/FmoSpeechPlugin.java
```

重要行为：

- 优先播放内置离线呼号语音。
- 内置语音位于 `public/speech/callsign/en/`。
- 字母使用 NATO 字母解释法。
- Android 原生 TTS 作为备选和诊断信息来源。
- 设置页“语音测试”可填写任意呼号测试播报。

### 诊断日志

主要文件：

```text
src/services/diagnosticLog.js
src/views/DiagnosticView.vue
```

用于排查：

- APK 闪退
- FMO 连接失败
- WebSocket 异常
- 语音播报失败

### Win64 便携版

主要文件：

```text
scripts/portable-server.mjs
scripts/build-windows-portable.sh
scripts/build-windows-portable-exe.sh
scripts/windows-portable-exe.nsi
scripts/start-windows.bat
scripts/stop-windows.bat
scripts/start-windows-hidden.vbs
```

重要行为：

- 便携包内置 Node。
- 启动后打开本地浏览器。
- 浏览器关闭后，本地服务延迟退出。
- 重复启动时复用已有实例，避免端口冲突。

### Android APK

主要文件：

```text
android/app/build.gradle
android/app/src/main/java/net/bh1jss/fmodashboard/
capacitor.config.json
```

注意：

- 包名已与原 FmoLogs 区分。
- 版本号从 `package.json` 读取。
- 构建前需要执行 `npx cap sync android`。

## 常用命令

检查：

```bash
npm run typecheck
npm run build
```

Win64 打包：

```bash
bash scripts/build-windows-portable-exe.sh
```

Android 打包：

```bash
npx cap sync android
JAVA_HOME="/path/to/jdk" \
ANDROID_HOME="/path/to/android-sdk" \
./android/gradlew -p android assembleRelease
```

查看 Release 下载量：

```bash
gh release view v0.99.0 --repo 54dashayu/FMO-Dashboard \
  --json assets \
  --jq '.assets[] | [.name, .downloadCount, .size] | @tsv'
```

## 发布文档

发布流程见：

```text
docs/release-checklist.md
```

VPS 部署见：

```text
docs/deploy-vps.md
```

VPS 统计页见：

```text
docs/vps-stats.md
```

## 后续可做事项

- 继续优化 Android 机型兼容性和闪退日志收集。
- 考虑设置“简短拼读 / NATO 拼读”可选。
- 继续优化移动端仪表盘布局。
- 评估正式 Android 签名和发布渠道。
- iOS 版本如需分发，优先考虑 TestFlight。
