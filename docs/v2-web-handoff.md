# FMO 仪表盘 V2 Web 版交接文档

更新时间：2026-06-06

本文用于把当前会话中完成的 V2 Web 版结果交付给后续「V2.0 Android / iOS」会话。新会话请先阅读本文，再阅读项目根目录 `AGENTS.md`。

## 当前结论

Web V2 版已基本封版，当前线上地址：

- `https://fmo.bh1jss.net/v2/`
- Dashboard：`https://fmo.bh1jss.net/v2/dashboard`

V2 部署在 VPS 的独立路径 `/v2/`，没有覆盖旧版 `/stats/` 统计页，也没有替换站点根目录旧内容。

## 已完成的 Web V2 重点

### 1. Dashboard 首屏重做

Dashboard 已从传统列表/导航式页面，改为“仪表盘第一屏”：

- 顶部一行命令栏，包含：
  - 图标
  - `FMO 仪表盘`
  - 当前通联/守听状态
  - 星标数量
  - 好友数量
  - 今日通联数量
  - 播报下拉
  - 主题切换
  - 下载 1.0
  - 微信群
  - 语言切换
  - 设置
- 点击图标或 `FMO 仪表盘` 可返回 Dashboard。
- Dashboard 页面在桌面端隐藏旧的全局 AppHeader，使用独立命令栏。
- 主要导航放在首屏按钮区：
  - 日志
  - 好友
  - 排行榜
  - 消息
  - 设置
  - FMO 控制
  - 愿望墙
  - 更多

### 2. 当前呼叫 / 守听逻辑

- 有实时发言时：显示当前呼号和 `正在通联` / `On Air`。
- 无人发言时：显示用户配置的自己呼号，例如 `BH1JSS 正在守听`。
- 英文守听状态使用更专业的 `Standing By`。
- 英文无人发言大标题也使用 `Standing By`，并做了防折行处理，避免 `No active speaker` 这类长文本撑开版式。

### 3. FMO 地址与外网安全提示

FMO 地址和“刷新现场”按钮已从顶部移动到当前呼叫卡片内。

显示策略：

- 局域网、localhost、`.local`：不暴露完整地址，只显示 `ws://局域网地址` / `ws://Local network`。
- 外网/DDNS/公网访问：不显示完整域名或 IP，只显示 `ws://外网访问` / `ws://External access`。
- 外网访问时显示安全提示：
  - 中文：`正在使用外网访问，请注意隐私安全`
  - 英文：`External access. Privacy.`

注意：完整地址只保留在 `title` 提示或内部配置中，页面主视觉不直接暴露完整 DDNS。

### 4. 收藏中继 / 服务器列表

Dashboard 右侧收藏中继列表已改为更接近 V1 的列表风格：

- 收藏优先显示。
- 框内可滚动。
- 默认露出约 6 个。
- 保留“中继列表 / 搜索”入口。
- 原先右侧底部的“当前 xxx #uid”提示已取消。

### 5. 最近 10 个通联

最近通联区域已改为完整表格展示：

- 标题简化为 `最近10个通联` / `Recent 10 contacts`。
- 表格行高压缩，桌面端更紧凑。
- 表头字体和内容字体做了区分。
- Dashboard 底部页脚不再覆盖表格。

### 6. 中英文切换

已新增 `src/composables/useLocale.js`，用于 Web 版中英文切换：

- 语言保存在 `localStorage` 的 `fmo_locale`。
- 会同步设置 `document.documentElement.lang`。
- 当前已覆盖：
  - 顶部栏
  - Dashboard 主要文本
  - 导航项
  - 下载弹窗
  - 微信群弹窗
  - 更多页部分文案
  - 全局页脚

注意：这不是完整 i18n 框架，仍有部分旧页面细节文案保持中文。后续移动端如果要完整国际化，建议继续扩展这个字典，而不是另起一套。

英文版特别处理：

- 避免长单词撑开 Dashboard 布局。
- 播报下拉英文压缩为：
  - `New call`
  - `Voice`
  - `Off`
- 方位卡英文压缩为：
  - `No bearing`
  - `No location`
- 刷新提示压缩为：
  - `Refresh {time}`

### 7. 主题与全局顶部

除 Dashboard 外，其他 Web 页面也统一使用新版顶部样式，并保持：

- 左侧图标 + 软件名可返回 Dashboard。
- 右侧保留主题切换、语言切换、设置等必要入口。
- 手机浏览器下也保留主题切换入口。

### 8. 下载 1.0 与微信群入口

公网部署时右上角保留：

- `下载 1.0`
- 微信群按钮

下载弹窗提供稳定版 1.0：

- Windows EXE
- Windows ZIP
- Android APK
- iOS App Store

iOS 下载地址：

`https://apps.apple.com/cn/app/fmo-dashboard/id6772919070`

微信群按钮使用微信图标，二维码图片位于：

`public/wechat-group.jpg`

App 图标已替换为压缩后的：

`public/app-icon.png`

### 9. 关于页面与友情链接

关于页面已从 FMOLogs 介绍转为 FMO 仪表盘 V1/V2 功能介绍：

- 去掉大部分 FMOLogs 内容。
- 保留“请作者喝杯咖啡”、二维码、贡献说明。
- 暂时取消致谢用户列表。

友情链接页面：

1. `BG5ESN 的网站`
   - 标注：`FMO 硬件原作者 · 永远的神！`
2. `BH5HSJ 后视镜面板`
   - 地址：`https://fmologs.lzyike.cn/logs`

### 10. 愿望墙机制

当前愿望墙是本地功能，不是公网共享后台：

- Web 使用 localStorage。
- Android/iOS 走平台 storage。
- 用户贴的愿望默认只有自己能看到。

已新增两个“发送给作者”的思路：

- `导出卡片`：导出一个 `.txt` 愿望卡片，用户可另存为文件发给作者。
- `发送给 BH1JSS`：通过当前 FMO 设备向 `BH1JSS-1` 发送愿望文本消息。

这不是公共愿望墙后台。若后续要做所有用户互相可见，需要新增服务端 API、数据库、身份/管理权限。

## 关键文件

后续移动端会话重点看这些文件：

- `src/views/DashboardView.vue`
  - Dashboard V2 首屏、当前呼叫、收藏中继、最近 10 个通联、外网安全提示。
- `src/views/MainLayout.vue`
  - 全局布局、页脚、移动端底部导航、非 Dashboard 页顶部逻辑。
- `src/components/home/AppHeader.vue`
  - 非 Dashboard 页面顶部栏。
- `src/components/home/PublicSiteTools.vue`
  - 公网下载 1.0、微信群弹窗。
- `src/composables/useLocale.js`
  - 当前中英文切换字典。
- `src/views/AboutView.vue`
  - 关于页面。
- `src/views/FriendLinksView.vue`
  - 友情链接页面。
- `src/components/home/modals/friendLinks.js`
  - 友情链接数据。
- `src/views/WishWallView.vue`
  - 愿望墙 UI、导出卡片、发送给 BH1JSS。
- `src/stores/wishWallStore.ts`
  - 愿望墙本地存储。
- `src/style.css`
  - 全局主题变量。
- `public/app-icon.png`
  - 压缩后的 App 图标。
- `public/wechat-group.jpg`
  - 微信群二维码。

## VPS 部署方式

Web V2 构建时必须带 `/v2/` base：

```bash
npm run build -- --base=/v2/
```

打包：

```bash
rm -f /tmp/fmo-dashboard-v2.tar.gz
COPYFILE_DISABLE=1 tar -czf /tmp/fmo-dashboard-v2.tar.gz -C dist .
```

上传到 VPS：

```bash
scp /tmp/fmo-dashboard-v2.tar.gz root@192.3.105.200:/tmp/fmo-dashboard-v2.tar.gz
```

VPS 上替换目录：

```bash
rm -rf /var/www/fmologs/dist/v2.new
mkdir -p /var/www/fmologs/dist/v2.new
tar -xzf /tmp/fmo-dashboard-v2.tar.gz -C /var/www/fmologs/dist/v2.new
rm -rf /var/www/fmologs/dist/v2.old
mv /var/www/fmologs/dist/v2 /var/www/fmologs/dist/v2.old
mv /var/www/fmologs/dist/v2.new /var/www/fmologs/dist/v2
rm -f /tmp/fmo-dashboard-v2.tar.gz
```

部署验证：

```bash
curl -sS --max-time 15 https://fmo.bh1jss.net/v2/ | rg -o '/v2/assets/index-[^"]+'
```

最近一次远端部署资源：

- `/v2/assets/index-x5aH1Dvb.js`
- `/v2/assets/index-Bbe1WLtl.css`

验证过远端 JS 内包含：

- `Standing By`
- `FMO Dashboard contributed by BH1JSS`
- `External access. Privacy.`
- `Open source`
- `Share freely`

## 验证状态

最近一次执行：

```bash
npm run lint
npm run typecheck
npm run build -- --base=/v2/
```

结果：

- `lint`：通过，但保留 17 个历史 warning。
- `typecheck`：通过。
- `build --base=/v2/`：通过。

这些 warning 是既有问题，不是本轮新增阻塞：

- 部分 Vue prop 未设置 default。
- `FriendLinksView.vue` 使用 `v-html`。
- `MainLayout.vue` 模板变量 `route` shadow 外层变量。

## 来自历史文档的 V2 优先项

本节来自以下两个文档的整理：

- `docs/future-software-todo.md`
- `docs/v1.0-tofix.md`

新会话不要只看当前 Web V2 视觉结果，还要把这些历史反馈作为 Android / iOS V2 的优先级依据。

### A. V2 必须继承的产品方向

这些方向已经在 Web V2 中部分落地，移动端 V2 应继续沿用，而不是回退到 V1 信息结构。

- 仪表盘第一屏必须优先回答“现在正在发生什么”。
  - 当前呼叫、连接状态、当前中继 / 服务器、高频操作入口优先于历史统计。
  - 移动端第一屏应服务“看得清、连得上、控得动、找得到人”。
- 当前呼叫 + 上一个呼号展示必须保留。
  - 当前呼叫是第一视觉中心。
  - 上个通联显示同类信息，但权重低于当前呼叫。
  - 信息应尽量包括 QTH、距离、方位、网格、中继信息。
- 高频功能入口要前置。
  - 日志、好友、排行榜、消息、设置、FMO 控制、愿望墙 / 定位、更多等入口应方便触达。
  - 移动端和车机端可按场景调整入口：移动端重视定位与消息，车机端重视当前呼叫、上个通联和控制入口。
- “更多”页面和静态页面要继续精简。
  - 旧 FMOLogs 项目中与当前产品定位关系较弱的页面应弱化。
  - 有保留价值的信息合并到关于、友情链接或低层级帮助入口。
- 中英文切换应继续补全。
  - 当前只是基础字典，不是完整 i18n。
  - 后续应覆盖设置页、日志页、消息页、愿望墙、关于页等更多细节。
  - 注意英文不要为了版式随意削弱信息，只在会撑开布局的表格、窄按钮、徽标等位置做防溢出。

### B. 移动端 V2 必须优先修正 / 回归的 Bug

这些来自 `docs/v1.0-tofix.md`，即使部分已在 Web 或当前代码中处理，新会话仍要在 Android / iOS V2 真机或模拟器中回归。

1. 切换中继后第一条通联仍显示在旧中继。
   - 状态：已有修复记录，但必须跨平台回归。
   - 重点：切换中继成功后，第一条实时通联不能继续沿用旧 `serverInfo` / station 缓存。
   - 相关文件：`src/services/stationControl.js`、`src/stores/speakingStore.ts`、`src/views/DashboardView.vue`、`src/views/MainLayout.vue`。
2. Android 通联日志页通联次数徽标压住呼号文字。
   - 状态：已有修复记录，但 Android WebView 字体渲染仍需真机确认。
   - 重点：长呼号、通联次数徽标、网格 / 地址不能重叠。
   - 相关文件：`src/components/home/LogDataTable.vue`、`src/views/LogsView.vue`。
3. DDNS / 远程地址添加与连接。
   - 状态：已有统一方向，V2 移动端必须继承。
   - 要求：地址格式合法即可保存，不因保存前一次 WebSocket 探测失败而阻止保存。
   - 要求：支持裸 DDNS、域名端口、完整 URL、全角冒号、`ws/wss/http/https` 意图保留。
   - 要求：普通 `ws://` 不应被自动错误升级为 `wss://`。
   - 相关文件：`src/utils/urlUtils.js`、`src/services/fmoApi.js`、`src/views/SettingsView.vue`、`src/stores/settingsStore.ts`。
4. iOS 通联声音 / 呼号播报。
   - 状态：已有 iOS 处理，但必须真机回归。
   - 重点：静音开关开 / 关、iOS 18.x 和更旧版本、系统语音取消后的内置音频兜底。
   - 相关文件：`ios/App/App/AppDelegate.swift`、`src/services/callsignSpeech.js`。
5. iOS 添加 FMO 地址默认值。
   - 状态：已有处理。
   - 重点：新增本地 FMO 地址时默认应有 `fmo.local`，同时支持局域网 IP 和 DDNS。
   - 相关文件：`src/views/SettingsView.vue`、`src/stores/settingsStore.ts`。
6. iOS 设置页横向撑开。
   - 状态：已有移动端宽度、换行和 `overflow-x` 约束，但必须回归。
   - 重点：多次进入 / 退出设置页、横竖屏切换后不应横向溢出。
   - 相关文件：`src/views/SettingsView.vue`、`src/views/MainLayout.vue`、`src/style.css`。

### C. V2 移动端建议优先实现

这些来自 `future-software-todo.md`，适合作为 V2.0 Android / iOS 的实际开发顺序。

1. 手机竖屏 Dashboard 适配。
   - 第一屏做成“通联现场屏”。
   - 当前呼叫、上个通联、连接状态、快捷操作优先展示。
   - 字号、按钮尺寸、表格密度按手机浏览器和 Android/iOS WebView 分别验证。
2. 手机横屏 / 平板 / 车机横屏适配。
   - 横屏不只是拉宽竖屏。
   - 可考虑左侧当前呼叫，右侧上个通联、连接状态、收藏中继，底部最近通联横向通栏。
   - 车机按钮、字号、表格区域必须避免交错和横向溢出。
3. 主题模式继续整理。
   - 当前已有深浅主题。
   - 后续可考虑车机高对比主题，但先不要做复杂自定义主题系统。
4. 本地收藏服务器 / 好友。
   - 收藏常用 FMO / 中继 / 服务器。
   - 支持备注、排序、最近使用。
   - 好友收藏可与当前通讯展示联动。
5. 远程连接助手基础版。
   - 一个 FMO 配置多个入口：局域网、DDNS、内网穿透、VPN 等。
   - 显示当前使用本地入口还是远程入口。
   - 记录上次成功连接时间。
6. 连接诊断与多入口检测。
   - 检测域名解析、HTTP/API、WebSocket、远程控制接口。
   - 将失败原因翻译为用户能理解的提示。
   - 这是 P3，不应阻塞 V2.0 首版，但要保留设计空间。

### D. 暂不主动投入的项目

- 华为 / 荣耀 HarmonyOS 4.0 老机型启动闪退。
  - `v1.0-tofix.md` 已决定不主动适配。
  - 新会话只保留问题记录和用户提示。
  - 如用户提供完整 `adb logcat` 崩溃栈，再评估是否低成本修复。
- Win64 便携版未签名。
  - 这是 Windows 发布工程问题，不是 Android / iOS V2 主线。
  - 已有 SHA256、签名脚本、发布说明方向。
  - 除非新会话同时处理 Win64 发布，否则不应占用移动端 V2 适配时间。
- 需要 FMO 固件 / 协议配合的能力。
  - 例如设备能力接口、读取 FMO 网络设置、服务器互相拉取、远程收藏同步、好友上线结构化事件。
  - 软件端可预留入口，但 V2 移动端不应单方面承诺完成。

## 给 Android / iOS V2 会话的建议

### 1. 不建议另起一套 UI

移动端 V2 建议基于当前 Web V2 的 Dashboard 信息架构继续适配，而不是重新设计一套页面。

原因：

- Web V2 已稳定。
- Dashboard 的数据源、状态展示、导航逻辑已经成型。
- Capacitor 本身就是复用前端 Web 代码。

### 2. Android V2 重点

Android 主要处理：

- Capacitor 构建兼容性。
- DDNS/外网地址配置体验。
- WebSocket/HTTP 混合访问策略。
- Android 权限和网络安全配置。
- 图标、启动图、版本号。
- APK/AAB 打包。
- 手机屏幕下 Dashboard 是否仍可读、可点、不卡顿。

重点验证：

- 手机浏览器宽度。
- Android WebView 宽度。
- 横屏/竖屏。
- 外网访问安全提示是否不暴露完整 DDNS。
- 主题切换、语言切换是否存在且可点。

### 3. iOS V2 重点

iOS 主要处理：

- Capacitor iOS 构建。
- App Store 版本号与 bundle 配置。
- WKWebView 下 localStorage / storage 行为。
- WebSocket 访问策略。
- iOS 安全策略与 ATS。
- 图标、启动图。
- TestFlight / App Store 包。

iOS 当前已有 App Store 地址用于 1.0 下载，不代表 V2 已发布。

### 4. 车机版建议

车机版暂时不建议单独开发原生安装包。

更现实的路线：

1. 优先用 Web 版：
   - 车机浏览器直接打开局域网或 DDNS 地址。
2. 或使用手机投屏：
   - 手机运行 Android/iOS 版，车机只做显示。
3. 后续如果确认某类车机允许安装 APK，再考虑单独做横屏/大屏布局。

车机适配重点：

- 横屏 1024/1280/1920 宽度。
- 字体大、按钮大。
- 少交互、少输入。
- Dashboard 第一屏尽量无需滚动即可读到核心状态。

## 新会话建议开场任务

建议新会话这样开始：

> 请阅读 `docs/v2-web-handoff.md` 和 `AGENTS.md`，在当前 Web V2 基础上规划 Android/iOS V2.0 适配。先检查 Capacitor 配置、现有 Android/iOS 项目状态和构建命令，不要改 Web 功能逻辑。

然后分三步：

1. 移动端现状审计：
   - `package.json`
   - `capacitor.config.*`
   - `android/`
   - `ios/`
   - 当前构建脚本
2. 分辨率适配：
   - 手机竖屏
   - 手机横屏
   - 平板
   - 车机横屏参考
3. 平台打包：
   - Android APK/AAB
   - iOS/TestFlight 准备

## 注意事项

- 当前工作树是 dirty 状态，包含多轮已有改动。新会话不要随意 revert。
- 如果要继续部署 Web V2，必须使用 `--base=/v2/`。
- 不要把 VPS 密码写入文档、命令历史或提交。
- Web V2 目前可以视作基线版本，移动端适配应尽量保持功能一致。
