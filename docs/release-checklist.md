# 发布检查清单

本文档用于每次发布新版本前逐项检查。

## 1. 确定版本号

示例：发布 V0.99：

```bash
npm version 0.99.0 --no-git-tag-version
```

确认这些位置会随版本更新：

- `package.json`
- `package-lock.json`
- 关于页版本显示
- README 下载链接
- APK 文件名
- GitHub Release tag

## 2. 更新文档

检查并更新：

- `README.md`
- `CHANGELOG.md`
- Release notes
- 必要时更新 `docs/` 下的开发、部署、交接说明

## 3. 本地检查

```bash
npm run typecheck
npm run build
```

必要时在本地浏览器检查：

- 仪表盘页面
- 设置页语音测试
- 关于页版本号
- 诊断日志页

## 4. 打包 Win64

```bash
bash scripts/build-windows-portable-exe.sh
```

确认产物：

```text
release/FMO-Dashboard-Windows-Portable.exe
release/FMO-Dashboard-Windows-Portable.zip
```

## 5. 打包 Android

```bash
npx cap sync android
JAVA_HOME="/path/to/jdk" \
ANDROID_HOME="/path/to/android-sdk" \
./android/gradlew -p android assembleRelease
mkdir -p release/android
cp android/app/build/outputs/apk/release/app-release.apk \
  release/android/FMO-Dashboard-Android-v0.99.0.apk
```

确认 APK 可安装，并且包名与原 FmoLogs 不冲突。

## 6. 生成校验值

```bash
shasum -a 256 \
  release/FMO-Dashboard-Windows-Portable.exe \
  release/FMO-Dashboard-Windows-Portable.zip \
  release/android/FMO-Dashboard-Android-v0.99.0.apk
```

## 7. 提交与打标签

```bash
git status --short
git add .
git commit -m "Release v0.99"
git tag -a v0.99.0 -m "FMO仪表盘 V0.99"
git push
git push origin v0.99.0
```

如果 tag 已存在，先确认是否应编辑现有 Release，而不是强推。

## 8. 创建 GitHub Release

示例：

```bash
gh release create v0.99.0 \
  release/FMO-Dashboard-Windows-Portable.exe \
  release/FMO-Dashboard-Windows-Portable.zip \
  release/android/FMO-Dashboard-Android-v0.99.0.apk \
  --repo 54dashayu/FMO-Dashboard \
  --title "FMO仪表盘 V0.99" \
  --notes-file /path/to/release-notes.md
```

发布后检查下载附件：

```bash
gh release view v0.99.0 --repo 54dashayu/FMO-Dashboard \
  --json assets,url \
  --jq '.url, (.assets[] | [.name, .size, .downloadCount] | @tsv)'
```

## 9. 部署 VPS

参考 `docs/deploy-vps.md`。

部署后检查：

```bash
curl -L -s https://fmo.bh1jss.net/ | rg '<title>|FMO仪表盘'
```

## 10. 发布后检查

- GitHub Release 说明是否完整。
- README 下载链接是否指向新 tag。
- 本地 `git status --short` 是否干净。
- VPS 首页是否正常打开。
- APK、Win64 EXE、Win64 ZIP 是否为新版本。
