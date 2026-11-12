# Win64 V2.06.2 发布记录

日期：2026-11-12。

- 产品版本 V2.06.2，Tauri/安装器标准版本 2.6.2。
- 构建源码：GitHub 分支 codex/win64-v2.06.2，提交 fedbc28；没有覆盖 main 或提交用户的 index.html、docs/v2.0-tofix.md 等其他未提交改动。
- GitHub Actions Windows Desktop Release：运行 43059323455 成功，目标 x86_64-pc-windows-msvc，仅构建 Win64，不再构建或上传 Win32。
- 下载：https://fmo.bh1jss.net/downloads/v2.6.2/FMO-Dashboard-Windows-Desktop-x64-Setup-v2.6.2.exe
- SHA256：98da4ddc3bc638b07ff802540b539b9c37b8c3990ba6ee5fbe7a91123b1309dc；已完整公网下载并比对。
- 现有流程未配置 Windows 签名证书，安装器未签名；可能触发 SmartScreen。不将 NSIS 外层的 PE32 引导程序误认为应用是 Win32，实际构建目标为 x86_64。
- 用户明确要求不操作正在运行的 Windows ARM 虚拟机，因此未安装或验证启动、升级和真实设备通联，不宣称 Windows 运行验收通过。

## Win32 停止维护

撤下应用内下载入口、官网入口；官网当前及已发现的历史 x86/Win7 安装包、ZIP 直链返回 HTTP 410。文件保留备份，不删除。GitHub 历史 Release 是旧发布记录，本轮未永久删除其历史附件。

官网 Nginx 和首页变更前备份名追加 .before-win262-20261112。旧 Win64 V2.05 文件保留，仍可用于回退。未构建或替换 macOS 安装包。

网页版同步了 Win64 新链接和 Win32 撤下，部署目录 /www/wwwroot/fmo.bh1jss.net/releases/20261112-v262-win64；index.html 公开/本地 SHA256 均为 ec4f461338b1c167968e81037fa69a869bbdeb70d78ad9157471cb88ded824a4。上一个链接目标 ../20261112-v262-20802 保留作回退。
