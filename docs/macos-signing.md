# macOS Developer ID 签名与公证

本项目的 macOS DMG 使用 Tauri 构建。未签名 DMG 可以测试，但用户首次打开时会被 macOS Gatekeeper 拦截。正式分发建议使用 Apple Developer ID Application 证书签名并做 notarization 公证。

## 前提

- 需要有效的 Apple Developer 账号。
- 需要创建 `Developer ID Application` 证书，用于 App Store 之外分发 macOS App。
- 需要 Apple ID 的 app-specific password，用于 notarization。

## 证书准备

1. 准备 Certificate Signing Request。
   - 本仓库已提供一个本机生成好的 CSR：`~/Desktop/FMO-Dashboard-DeveloperIDApplication.csr`
   - 私钥保存在 `build/macos-signing/DeveloperIDApplication.key`，不要上传或发给别人。
2. 登录 Apple Developer，进入 Certificates, Identifiers & Profiles。
3. 创建 `Developer ID Application` 证书并下载。
4. 使用脚本把下载的 `.cer` 转成 GitHub Secrets 需要的 `.p12` 和 base64 文本：

```bash
scripts/prepare-macos-signing-secrets.sh ~/Downloads/developerID_application.cer
```

脚本会输出两个 GitHub Secret 值：

- `APPLE_CERTIFICATE_P12_BASE64`：复制 `build/macos-signing/DeveloperIDApplication.p12.base64.txt` 的完整内容。
- `APPLE_CERTIFICATE_PASSWORD`：复制脚本输出的随机密码。

也可以自己指定 `.p12` 密码：

```bash
scripts/prepare-macos-signing-secrets.sh ~/Downloads/developerID_application.cer 'your-p12-password'
```

## GitHub Secrets

在 GitHub 仓库：

`Settings` -> `Secrets and variables` -> `Actions` -> `New repository secret`

添加以下必需 secrets：

- `APPLE_ID`：Apple ID 邮箱。
- `APPLE_APP_SPECIFIC_PASSWORD`：Apple ID 的 app-specific password。
- `APPLE_TEAM_ID`：Apple Developer Team ID。
- `APPLE_CERTIFICATE_P12_BASE64`：上面生成的 `.p12.base64.txt` 文件内容。
- `APPLE_CERTIFICATE_PASSWORD`：导出 `.p12` 时设置的密码。

可选 secrets：

- `APPLE_PROVIDER_SHORT_NAME`：如果 Apple ID 关联多个团队，可填写 provider short name。
- `APPLE_SIGNING_IDENTITY`：通常不需要填写，Tauri 可从证书推断；只有多个证书冲突时再指定。

## 构建签名公证版 DMG

进入 GitHub Actions，选择 `macOS Desktop Release` workflow，手动运行：

- `require_notarization` 选择 `true`
- 首次构建建议 `skip_stapling` 选择 `true`，避免 Apple notarization 等待数小时导致 GitHub Actions 超时。

当五个必需 secrets 都配置完整时，workflow 会构建 Developer ID signed Universal DMG。`skip_stapling=true` 时，构建不会等待 Apple notarization 完成并 stapling，因此不会被长时间公证队列卡住。后续需要完整 stapled DMG 时，可再次运行 workflow，并将 `skip_stapling` 选择 `false`。

如果需要临时构建未签名测试包，可将 `require_notarization` 选择 `false`。

## 验证

下载 DMG 后，普通双击打开不应再出现“Apple 无法验证是否包含恶意软件”的强拦截提示。若 `skip_stapling=true`，首次打开时 macOS 可能需要联网向 Apple 查询公证状态。

也可在 macOS 上检查签名：

```bash
codesign -dv --verbose=4 /Applications/FMO仪表盘.app
spctl -a -vv /Applications/FMO仪表盘.app
```
