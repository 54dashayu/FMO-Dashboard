# macOS V2.06.2 发布记录

2026-11-12，产品显示 V2.06.2，安装包标准版本 2.6.2。

- 源码提交：fba0dfa7，分支 codex/win64-v2.06.2；保留用户 index.html 和 docs/v2.0-tofix.md 的未提交修改，不纳入 Git 提交。
- GitHub Actions： https://github.com/54dashayu/FMO-Dashboard/actions/runs/43122140534 ，签名 Universal 构建、公证、装订和 DMG 打包全部成功。
- 文件：FMO-Dashboard-macOS-Universal-v2.6.2.dmg。
- SHA-256：12eb66e1de0e34a7d549dfc1fd92211ee74d15c5f97ee567736512264ee758cc。
- 下载：https://fmo.bh1jss.net/downloads/v2.6.2/FMO-Dashboard-macOS-Universal-v2.6.2.dmg 。
- 源码修改范围 ESLint → typecheck → build 通过，另生成 /v2/ base 的网页下载入口。
- 实际从 DMG 挂载的应用启动，进程路径为 /Volumes/FMO仪表盘/FMO仪表盘.app/Contents/MacOS/fmo-dashboard；非旧安装应用。macOS 26.7.2 / arm64 上仪表盘与设置正常渲染，已有 FMO 地址保留。
- Info.plist 版本 2.6.2；lipo 确认 x86_64、arm64。spctl 返回 accepted / Notarized Developer ID；stapler validate 通过。
- 仅完成 Apple 芯片本机启动冒烟；未宣称 Intel 真机运行、完整数据同步、长时间通联、全新安装和覆盖安装验收通过。
- 官网旧 V2.05 DMG 不删除；首页和 Nginx 配置备份追加 .before-mac262-20261112。网页版原链接 ../20261112-v262-win64 保留，可切回；未更改其他产品下载。
- 本次是 macOS 官网 DMG 分发，不是 Mac App Store 提交。

## 发布后复核

- 公网完整下载 DMG 后 SHA-256 与上述值一致；app.bh1jss.net 下载别名 HTTP 200，Content-Length 15284649。
- 官网首页读回“Web / Android / Win64 / macOS · V2.06.2”和“Universal DMG · V2.06.2”，其他产品入口保留。
- 网页切至 /www/wwwroot/fmo.bh1jss.net/releases/20261112-v262-macos，公开与本地 index.html SHA-256 都为 f84ecacb6cd02e980bbfb674ea62b1c5447080399bc5b105ae3d84401f71bb2c。
- GitHub Release：https://github.com/54dashayu/FMO-Dashboard/releases/tag/macos-v2.6.2 ，包含 DMG 与校验文件。独立 macOS 标签，不覆盖既有多平台 Release；源码同步在 codex/win64-v2.06.2 发布分支，未合并 main。
