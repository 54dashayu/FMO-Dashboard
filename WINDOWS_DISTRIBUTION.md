# FMO仪表盘 Windows 分发方案

## 目标

Windows 正式版使用 Tauri 桌面应用，不再打开系统默认浏览器。程序启动后进入自己的应用窗口，前端资源打包在应用内，避免默认浏览器自动升级、安全连接策略、HTTPS/HTTP 混用、证书缓存和用户本机浏览器差异导致的不可控问题。

## 发布包分层

| 包 | 面向用户 | 说明 |
| --- | --- | --- |
| `FMO-Dashboard-Windows-Desktop-x64-Setup-vX.Y.Z.exe` | Win10/Win11 64 位用户 | 主推版本，不依赖默认浏览器 |
| `FMO-Dashboard-Windows-Desktop-x86-Setup-vX.Y.Z.exe` | 32 位 Windows 用户 | Win32 桌面安装包，不依赖默认浏览器 |
| `FMO-Dashboard-Windows-Portable-x64-vX.Y.Z.zip` | 需要局域网共享或桌面版异常的用户 | 备用包，会打开默认浏览器 |
| `FMO-Dashboard-Windows-Legacy-Win7-x86-vX.Y.Z.zip` | Win7/旧机器用户 | 兼容兜底包，会打开默认浏览器，不承诺长期维护 |

桌面版仍依赖 Windows WebView2 Runtime，但不是默认浏览器。安装器会嵌入 WebView2 bootstrapper，并在需要时静默安装/修复运行时。

## 构建命令

```bash
npm run win:desktop:x64
npm run win:desktop:x86
```

正式发布：

```bash
WINDOWS_SIGN_CERT_P12=/path/to/cert.p12 \
WINDOWS_SIGN_CERT_PASSWORD='***' \
npm run win:release
```

本地无签名测试：

```bash
REQUIRE_WINDOWS_SIGNING=0 npm run win:release
```

便携浏览器备用包：

```bash
npm run win:portable:x64
npm run win:portable:x86
npm run win:legacy
npm run win:portable:release
```

桌面安装包需要在 Windows 虚拟机、Windows 实体机或 GitHub Actions Windows runner 上构建。macOS 本机默认不生成 Windows Tauri 安装包。

## 签名策略

正式发布的 EXE 必须签名。未签名 EXE 很容易触发 Windows SmartScreen 或安全软件拦截，尤其是新项目、下载量少、发布者信誉尚未建立时。

当前签名脚本：

```bash
scripts/sign-windows-artifact.sh
```

脚本会优先使用 `osslsigncode`，在 Windows 构建机上可自动改用 `signtool.exe`。

需要环境变量：

```bash
WINDOWS_SIGN_CERT_P12=/path/to/cert.p12
WINDOWS_SIGN_CERT_PASSWORD='证书密码'
WINDOWS_SIGN_TIMESTAMP_URL=http://timestamp.digicert.com
```

建议使用 OV 或 EV 代码签名证书，并保留时间戳。时间戳能让证书过期后，历史版本仍可证明是在证书有效期内签名。

GitHub Actions 自动签名需要配置仓库 secrets：

```text
WINDOWS_SIGN_CERT_P12_BASE64
WINDOWS_SIGN_CERT_PASSWORD
```

`WINDOWS_SIGN_CERT_P12_BASE64` 是 P12/PFX 证书文件的 base64 内容。在 macOS/Linux 上生成：

```bash
base64 -i cert.p12 | pbcopy
```

在 Windows PowerShell 上生成：

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("cert.p12")) | Set-Clipboard
```

签名验证：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\verify-windows-signatures.ps1
```

## Win7 边界

Win7 已经不适合作为主线支持目标。Microsoft Edge 和 WebView2 对 Windows 7/8/8.1 的新版本支持已经结束，Edge/WebView2 109 是这些系统的最后支持版本。Win7 用户只能使用 legacy 包，并且可能受 TLS、系统补丁、杀软和旧浏览器能力影响。桌面版的主线测试目标是 Win10/Win11。

发布页建议写法：

> Win7 用户请下载 Legacy-Win7 兼容包。该包仅用于旧系统兜底，推荐升级到 Win10/Win11 以获得更稳定的 WebView、证书和安全更新支持。

## 用户遇到拦截时

1. 优先下载签名后的 `Desktop-x64-Setup.exe`。
2. 32 位系统下载 `Desktop-x86-Setup.exe`。
3. 如果桌面安装包被拦截，先用 SHA256 校验，再检查签名状态。
4. 如果桌面版仍无法运行，再改用便携 zip 备用包。
5. 用发布页 `SHA256SUMS-windows-desktop-vX.Y.Z.txt` 校验文件。

PowerShell 校验：

```powershell
Get-FileHash .\FMO-Dashboard-Windows-Desktop-x64-Setup-vX.Y.Z.exe -Algorithm SHA256
```

## 参考

- Tauri WebView 说明：https://v2.tauri.app/reference/webview-versions/
- Tauri Windows 签名说明：https://tauri.app/distribute/sign/windows/
- Microsoft Edge/WebView2 Win7/8 支持结束说明：https://blogs.windows.com/msedgedev/2022/12/09/microsoft-edge-and-webview2-ending-support-for-windows-7-and-windows-8-8-1/
- Node.js 22 archive 仍提供 x86/x64/arm64 Windows zip：https://nodejs.org/en/download/archive/v22.22.3
