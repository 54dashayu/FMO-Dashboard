# FMO仪表盘项目交接文档

更新时间：2026-05-21
当前版本：v0.99.0
项目中文名：FMO仪表盘
GitHub 仓库：`54dashayu/FMO-Dashboard`

## 项目定位

FMO仪表盘是基于 BH5HSJ 后视镜开源项目 FmoLogs 继续发展而来的独立项目。项目目标从“查看 FMO 通联日志”扩展为“以实时仪表盘为核心的 FMO 网页工具”。

当前版本的核心使用场景是：

- 打开网页后第一眼看到当前或最近发言呼号。
- 看到对方 QTH、相对方位、距离和当前中继。
- 快速查看最近通联列表，并按呼号去重。
- 一键切换 FMO 中继。
- 在局域网、VPS、公网网页、Windows 便携版和 Android APK 中尽量保持一致体验。

## 最终成果清单

### 1. 实时仪表盘

- 仪表盘作为默认首页。
- 当前通联主卡片突出显示呼号。
- 发言中显示“当前通联”，发言结束后短时间保留为“最后发言”。
- 主卡片显示梅登海德网格、地址、相对方位和距离。
- 方位盘用于直观看到对方方向。
- 当前中继、FMO 地址和刷新按钮整合到仪表盘顶部区域。
- 最近通联列表实时刷新，按呼号去重，最新一次出现排在前面。
- 最近通联列表包含呼号、时间、QTH、留言、模式、中继等字段。
- 自己的呼号在最近通联中标记“您”。
- 已在历史日志中出现过的呼号显示星标。

### 2. QTH、距离与方位

- 支持从 FMO 日志、梅登海德网格或经纬度推断位置。
- QTH 显示收敛为省、市、区级别，避免过长影响手机布局。
- 支持相对方位中文表达，例如东南偏南等。
- 支持距离显示，用于判断通联对象与自己的大致位置关系。

### 3. FMO 中继控制

- 可读取当前中继。
- 可加载中继列表。
- 支持上一中继、下一中继、列表选择中继。
- 通联日志列表中的中继名称可以点击切换。
- 通联详情卡片中的中继名称可以点击切换。
- 仪表盘最近通联里的中继名称也可作为快捷切换入口。
- 已收藏中继显示星标。
- 当前固件未开放“添加收藏”接口，未收藏项只显示“添加收藏（功能尚未开放）”提示，不做真实写入。

### 4. 呼号与日志增强

- 通联详情卡片中的呼号支持跳转到 QRZ 查询。
- 最近通联列表按呼号去重，避免同一呼号多次占满列表。
- 日志同步、导入、导出仍继承原 FmoLogs 能力。
- 日志页和仪表盘围绕 FMO 使用场景做了中文化和移动端优化。

### 5. 声音与播报

当前版本将声音模式整理为更清晰的三类：

- 新呼号提示：只播报呼号和提示音，不播放通联语音。
- 通联播报：播放通联语音。
- 关闭所有播报。

新呼号提示逻辑：

- 历史日志从未出现的新呼号：播报呼号后播放三声提示。
- 当日未出现的新呼号：播报呼号后播放两声提示。
- 十分钟内未出现过的呼号：只播报呼号。
- 无论哪种逻辑，都不播报自己的呼号。

v0.99.0 的重点优化：

- 呼号播报改为 NATO 字母解释法，例如 `BH1JSS` 播报为 `Bravo Hotel One Juliet Sierra Sierra`。
- 保留内置离线语音兜底，降低浏览器或 Android TTS 不稳定导致无声的概率。
- 增加语音测试工具，便于在不同浏览器和手机上测试播报。

### 6. 诊断日志

- 增加诊断日志能力，用于记录连接异常、语音播报失败、APK 运行问题等。
- 主要服务于 Android 闪退、TTS 不工作、FMO 地址连接失败等问题排查。
- Android 端仍需要继续完善更易导出的日志收集方式。

### 7. 关于页与项目身份

- 应用名称改为“FMO仪表盘”。
- 版本号读取当前项目版本。
- 关于页说明主要功能和相对原 FmoLogs 的增强点。
- 感谢名单保留原 FmoLogs 项目作者 BH5HSJ，并加入相关贡献和想法来源。
- 赞助区支持“请作者喝杯咖啡”二维码。
- 项目作为独立仓库继续维护，同时保留 MIT 协议与原作者致谢。

## 本地发布物

当前本地已有发布物：

- Windows 便携目录：`release/FMO-Dashboard-Windows-Portable/`
- Windows 便携 zip：`release/FMO-Dashboard-Windows-Portable.zip`
- Windows 便携 exe：`release/FMO-Dashboard-Windows-Portable.exe`
- Android v0.98 APK：`release/android/FMO-Dashboard-Android-v0.98.0.apk`
- Android v0.99 APK：`release/android/FMO-Dashboard-Android-v0.99.0.apk`

Windows 便携版特点：

- 内置 Windows 版 Node.js。
- 用户无需安装开发环境。
- 默认本机访问 `http://127.0.0.1:5180/`。
- 局域网手机可访问电脑局域网地址。
- 提供后台启动脚本和停止脚本。

Android APK 特点：

- 使用独立应用名称和包名，避免与原 FmoLogs APK 互相覆盖或降级冲突。
- 需要继续关注不同 Android 机型上的 TTS 和闪退问题。

## 常用命令

本项目约定验证顺序：

```bash
npm run lint
npm run typecheck
npm run build
```

常用开发命令：

```bash
npm run dev -- --host
npm run build
npm run typecheck
npm run cap:build
npm run android:deploy
```

打包相关：

```bash
bash scripts/build-windows-portable.sh
bash scripts/build-windows-portable-exe.sh
npm run cap:build
```

## VPS 部署成果

项目曾部署到自有 VPS，并讨论过以下域名：

- `fmolog.bh1jss.net`
- `fmo.bh1jss.net`

公网部署版的定位：

- 用户直接打开网页。
- 用户在网页设置中填写自己的本地 FMO 地址。
- 网页端从用户本地网络访问 FMO。
- VPS 主要承担静态网页托管，不保存用户通联内容。

相关说明见：

- `docs/vps-stats.md`

注意事项：

- 公网部署建议启用 HTTPS。
- Chrome 对 HTTPS 页面访问 HTTP 本地设备、混合内容、私有网络访问会越来越严格。
- 统计页必须做密码保护，不应公开暴露 IP、呼号、访问路径等信息。
- 不要把服务器密码、认证文件、私有路径写入仓库。

## 现有文档索引

- `README.md`：项目主页说明、功能介绍、下载链接、开发方式。
- `docs/project-handover.md`：当前项目交接总览。
- `docs/codex-archived-thread-summary.md`：从 Codex 归档长对话整理出的脉络摘要。
- `docs/vps-stats.md`：VPS 私有访问统计页部署说明。
- `doc/fmo-station-control.md`：中继控制、QRZ 跳转、实时仪表盘早期实现说明。
- `release/FMO-Dashboard-Windows-Portable/README.md`：Windows 便携版用户说明。
- `scripts/PORTABLE_README.md`：便携版打包模板说明。

## 当前风险与待办

### 高优先级

- Android 新呼号提示仍需重点验证，尤其“有提示音但无人声”的问题。
- Android 闪退日志导出能力需要继续完善。
- 移动端仪表盘布局还要在更多机型上测试。
- HTTPS 与本地 FMO 地址访问兼容性需要持续关注。

### 中优先级

- 将 GitHub Release 中的 Win64 exe、zip、Android APK 发布流程固定下来。
- README 中补充更清楚的“公网网页版、本地 Windows 版、Android APK”区别。
- 继续优化公网静态资源体积、缓存策略和访问流量。
- 对 VPS 访问统计页做更清楚的安装脚本或部署清单。

### 低优先级

- 后续可探索 Tauri 桌面版安装包。
- 可继续增强排行榜、老朋友、地图、通联统计等原 FmoLogs 能力。
- 可为常见问题做用户向 FAQ。

## 不写入仓库的信息

以下内容只应保存在个人安全位置，不应进入 Git 仓库：

- VPS root 密码。
- GitHub token 或登录凭据。
- 统计页 Basic Auth 密码。
- 私有服务器路径和完整日志。
- 用户上传的临时二维码源文件路径。
- 任何包含个人隐私的完整访问明细。
