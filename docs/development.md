# 本地开发与打包说明

本文档记录 FMO仪表盘 的本地开发、检查和打包流程。

## 环境要求

- macOS 开发机。
- Node.js 和 npm。
- Android 打包需要 Android SDK、JDK 和 Gradle 环境。
- Win64 便携版打包依赖项目脚本和本地缓存的 Windows Node 包。

## 本地运行

安装依赖：

```bash
npm install
```

启动开发服务：

```bash
npm run dev -- --host
```

常用访问地址：

- 本机：`http://localhost:5173`
- 局域网：终端输出中的 `http://局域网IP:5173`

## 检查与构建

类型检查：

```bash
npm run typecheck
```

正式构建：

```bash
npm run build
```

构建产物位于 `dist/`。

## Android APK

同步 Web 资源到 Android 工程：

```bash
npx cap sync android
```

构建 Release APK：

```bash
JAVA_HOME="/path/to/jdk" \
ANDROID_HOME="/path/to/android-sdk" \
./android/gradlew -p android assembleRelease
```

当前项目常用输出位置：

```text
android/app/build/outputs/apk/release/app-release.apk
release/android/FMO-Dashboard-Android-v0.99.0.apk
```

打包后复制：

```bash
mkdir -p release/android
cp android/app/build/outputs/apk/release/app-release.apk \
  release/android/FMO-Dashboard-Android-v0.99.0.apk
```

## Win64 便携版

生成 Win64 ZIP 和 EXE：

```bash
bash scripts/build-windows-portable-exe.sh
```

当前输出位置：

```text
release/FMO-Dashboard-Windows-Portable.exe
release/FMO-Dashboard-Windows-Portable.zip
```

Win64 便携版包含本地 Node 运行环境。用户双击 EXE 后会启动本地服务并打开浏览器。关闭浏览器后，本地服务会延迟退出，避免下次启动出现旧进程或端口冲突。

## 校验文件

发布前建议计算 SHA256：

```bash
shasum -a 256 \
  release/FMO-Dashboard-Windows-Portable.exe \
  release/FMO-Dashboard-Windows-Portable.zip \
  release/android/FMO-Dashboard-Android-v0.99.0.apk
```

## 语音播报资源

内置离线呼号语音位于：

```text
public/speech/callsign/en/
```

当前使用 NATO 字母解释法，例如：

- `B` = `Bravo`
- `H` = `Hotel`
- `J` = `Juliet`
- `S` = `Sierra`

数字继续使用普通英文数字读法。

这些资源会随 Web、Win64 便携版和 Android APK 一起打包。
