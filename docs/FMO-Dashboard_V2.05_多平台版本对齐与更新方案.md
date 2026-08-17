# FMO-Dashboard V2.05 多平台版本对齐与更新方案

更新时间：2026-08-17

适用范围：Web、Android、iOS/iPadOS、Windows、macOS、tvOS 试验线及 bh1jss.net 下载区。

## 一、结论摘要

本项目最终统一为以下版本体系：

- 用户展示版本：`V2.05`
- npm、Web、Windows、macOS 工程版本：`2.0.5`
- Android：`versionName V2.05`，`versionCode 20500`
- iOS/iPadOS：`MARKETING_VERSION 2.0.5`，构建号以 `20500` 为基线
- Web：页面显示 `V2.05`，发布记录同时保存 Git commit

功能统一以 Android V2.03.02 的完整核心功能为基线；Android 端单独保留原生能力、旧 WebView 和小屏适配。iOS V2.04 → V2.05 主要修正 QTH 显示问题，该修正进入共用前端逻辑。Web V2.05 应等于“Android V2.03.02 核心功能 + V2.05 QTH 修正”，只排除 Android 原生和设备适配代码。

版本统一以 `2.0.5 / V2.05` 为目标，将共用前端源码收敛后，再从同一冻结提交分别重建 Web、Android、Windows 和 macOS。

iOS V2.05 已提交审核的状态目前来自用户说明。本次对齐不撤回、不替换审核中的版本；只有审核失败、发现阻断缺陷或用户明确授权时，才考虑更换构建。

官网和下载页必须最后切换：只有新产物、校验文件和公网链接全部验证通过后，才将用户入口改为 V2.05。

## 二、当前版本审计

### 2.1 当前工作区状态

- 当前分支：`codex/ios-v2.04-aprs-location`
- 工作区存在大量未提交修改，包含：
  - iOS 原生定位与自动位置上报
  - APRS-IS 精确位置优先反查 QTH
  - tvOS Hash 路由及电视端适配
  - Dashboard、频率和移动端界面调整
- 这些改动尚未形成干净、可追溯的统一发布基线。
- 后续更新必须保留并审阅现有修改，不能使用旧发布分支直接覆盖。

### 2.2 已发现的版本分裂

| 平台或版本面 | 当前状态 | 主要问题 |
| --- | --- | --- |
| 共用源码 | `package.json` 已为 `2.0.5` | “关于”页仍显示 `V2.04` |
| iOS/iPadOS | 工程为 `2.0.5 / 20500` | 用户称已提交审核，实际状态仍需在 App Store Connect 复核 |
| Android | 本地最新 APK 为 `V2.03.02 / 20302` | 当前 Gradle 却声明 `V2.03 / 20300` |
| Web | 公网 `/v2/` 为 `V2.03.1` | 兼容提示、下载弹层和发布脚本仍含旧版文案 |
| Windows | 公开包为 `2.0.3` | 源码版本已到 2.0.5，但安装包没有重建 |
| macOS | 公开 Universal DMG 为 `2.0.3` | 需要重建并重新签名、公证、staple |
| bh1jss.net 下载区 | 多数入口为 V2.03 | iOS 文案仍显示 V2.01，入口与实际版本不一致 |
| tvOS Preview | `0.1 / build 1` | 仍属于试验线，尚未达到正式发布门槛 |

### 2.3 Android 发布资产异常

本地 `release/android/FMO-Dashboard-Android-V2.03.02.apk` 的实际元数据为：

```text
package: net.bh1jss.fmodashboard
versionName: V2.03.02
versionCode: 20302
minSdkVersion: 24
targetSdkVersion: 36
SHA256: 68ed36e064f202935692a69bf6b39703f7e41447033316d229e51ddb71e6593b
```

但公网不存在 `FMO-Dashboard-Android-V2.03.02.apk`，实际下载入口指向 V2.03。

同时，`release` 与 `deploy/downloads` 中的同名 V2.03 APK 校验值不同：

```text
release/android/FMO-Dashboard-Android-V2.03.apk
412ac8a4ab0f4b53b72e237ddc2d414c9015d5370703fee162cc8de68e2bdd2d

deploy/downloads/FMO-Dashboard-Android-V2.03.apk
bb401ff9d118ea929082de441d1828aa28e125d5c2db7bd56de3f4a64724eeaf
```

这说明 Android 发布资产链已经分叉。V2.05 起必须保证一个正式文件名只对应一个确定的产物和 SHA256。

### 2.4 公网实测状态

2026-08-17 实测：

- `https://bh1jss.net/`：仍列出 Android V2.03、Windows/macOS v2.0.3
- `https://fmo.bh1jss.net/`：跳转至 bh1jss.net 首页
- `https://fmo.bh1jss.net/v2/`：显示 Web V2.03.1
- `FMO-Dashboard-Android-V2.03.02.apk`：HTTP 404
- `FMO-Dashboard-Android-V2.03.apk`：HTTP 200

## 三、V2.05 功能基线

### 3.1 所有正式平台必须一致的功能

- 仪表盘实时通联状态
- 最近 20 个通联
- 上个通联次数 `+1` 提示
- TX/RX/单频显示修复
- 日志同步、搜索、好友和老友功能
- 深色模式及中英文界面
- FMO 官方备份 ZIP 导出与恢复
- ADIF 导出
- ADIF 转 FMO 官方备份包
- APRS-IS 精确坐标优先反查 QTH
- 精确位置不可用时回退梅登海德网格
- 关于页、启动兼容提示、下载弹层和发布说明统一显示 V2.05

### 3.2 允许保留的平台差异

| 能力 | Web/Windows/macOS | Android | iOS/iPadOS |
| --- | --- | --- | --- |
| FMO 连接 | WebSocket/HTTP，受浏览器或桌面 WebView 限制 | Capacitor 与 Android 原生能力 | Capacitor 与 iOS 局域网权限 |
| 自动定位上报 | 不显示原生定位入口 | 原生定位及后台能力 | V2.05 新增原生定位，后台行为需真机验证 |
| 老旧环境兼容 | 现代浏览器或 Tauri WebView | 保留 legacy/nomodule 和 WebView 61 兜底 | iOS 15+，不引入 Android 专用兼容逻辑 |
| 文件导入导出 | 浏览器下载或桌面文件选择器 | Android 文件与分享流程 | 文件 App、Share 和 Blob 下载需重点回归 |

## 四、统一版本规则

| 版本层级 | V2.05 规则 | 说明 |
| --- | --- | --- |
| 用户展示 | `V2.05` | 关于页、官网、下载卡片和发布说明统一使用 |
| SemVer | `2.0.5` | `package.json` 作为语义版本源，Tauri 读取该版本 |
| Android | `V2.05 / 20500` | 不再使用 V2.05.01、V2.05.02 等临时公开版本名 |
| iOS/iPadOS | `2.0.5 / 20500+` | 若 20500 已占用，只递增 build，不改显示版本 |
| Web | `V2.05 + commit` | 页面显示产品版本，交接记录目标 commit 和部署时间 |
| 发布产物 | 文件名包含 `V2.05` 或 `v2.0.5` | APK、EXE、DMG、校验文件和下载链接必须一致 |

补丁版本原则：

- 同一个公开文件名不得重新上传不同二进制。
- V2.05 上线后的普通修复应发布 `2.0.6 / V2.06`。
- 如应用市场要求只递增内部构建号，可以递增 build/versionCode，但对外展示仍保持 2.0.5，且必须记录产物差异。

## 五、实施顺序

### 阶段 1：冻结 V2.05 功能基线

1. 保留现有未提交修改。
2. 审阅 iOS 定位、APRS QTH、Dashboard/Frequency、tvOS 和 UI 相关 diff。
3. 检查历史 Android 小屏、旧 WebView 和桌面频率修复是否发生回退。
4. 明确 tvOS 是纳入 V2.05 Preview，还是延期处理。
5. 建立可追溯的 V2.05 冻结提交。

### 阶段 2：统一源码版本面

需要对齐：

- `package.json`、`package-lock.json`
- `src/views/AboutView.vue`
- `android/app/build.gradle`
- iOS Xcode 工程版本
- tvOS Info.plist（仅在纳入 V2.05 Preview 时）
- `index.html` 旧 WebView 兼容提示
- Web/VPS 打包脚本
- 官网下载组件和多语言文案
- README、发布说明和下载页

统一后运行版本扫描，区分：

- 应当替换的当前版本文案
- 可以保留的历史发布记录
- 属于 FMO伴侣屏等独立产品线的版本号

### 阶段 3：基础验证

按项目规定顺序执行：

```bash
npm run lint
npm run typecheck
npm run build
```

另外验证：

- `/v2/` base path 生产构建
- Android legacy/nomodule 构建
- iOS Capacitor 同步
- 平台条件路由
- 文件导入、导出和恢复流程

### 阶段 4：更新 Android

1. 设置 `versionName V2.05`、`versionCode 20500`。
2. 使用 Java 21 和正式签名构建 V2.05 APK。
3. 用 `aapt` 核对包名、版本号、minSdk 和 targetSdk。
4. 核对与旧正式包的签名连续性。
5. 拆包确认 legacy bundle、polyfill 和 `nomodule` 入口存在。
6. 生成 SHA256。
7. 完成：
   - 全新安装
   - 从 V2.03/V2.03.02 覆盖安装
   - 当前 Android 真机测试
   - Android 8、小爱音箱或同类旧 WebView 测试
   - 手机竖屏和低分辨率横屏测试
8. 保留 Android V2.02 回退入口。

### 阶段 5：更新 Web

1. 使用 `/v2/` base 构建 Web V2.05。
2. 本地验证主路由、子路由和刷新 fallback。
3. 备份 VPS 当前 `/v2/` 目录。
4. 上传 V2.05 Web 资源。
5. 验证公网：
   - 页面版本号
   - 静态资源路径
   - WebSocket/FMO 连接
   - APRS 精确 QTH 与网格回退
   - 日志备份、恢复和文件下载
   - 下载弹层
6. 若发现阻断问题，恢复部署前目录快照。

### 阶段 6：更新 Windows

从 V2.05 冻结提交重建：

- Windows x64 安装包 `2.0.5`
- Windows x86 安装包 `2.0.5`

必须验证：

- 全新安装和覆盖安装
- 应用内版本号
- 局域网 FMO 设备连接
- 日志和备份文件导入导出
- `.local`、局域网 IP、裸域名和 DDNS 地址
- Windows SmartScreen 提示说明

当前 Windows 包没有商业签名证书，发布页需要继续明确提示。

### 阶段 7：更新 macOS

1. 重建 macOS Universal `2.0.5` DMG。
2. 完成 Developer ID 签名。
3. 上传 Apple 公证。
4. 完成 stapling。
5. 验证签名、公证票据、DMG 挂载和应用启动。
6. 生成 SHA256。

签名或公证失败时，不得用新 DMG 替换当前正式下载包。

### 阶段 8：最后更新官网和下载区

只有前述产物全部验证通过后，才更新 bh1jss.net：

- Web V2.05
- Android V2.05 APK
- Windows x64/x86 2.0.5
- macOS Universal 2.0.5
- iOS/iPadOS V2.05 状态
- 各平台 SHA256 文件
- GitHub Release 链接

iOS 下载文案必须根据真实状态显示：

- 审核中：`V2.05 已提交 App Store 审核`
- 已通过但尚未上架：说明实际状态
- 已上架：`App Store 当前版本 V2.05`

不得在审核完成前提前声称 V2.05 已可下载。

## 六、发布门禁

| 区域 | 必须通过 | 阻断条件 |
| --- | --- | --- |
| 源码 | lint、typecheck、build、版本扫描 | 任一失败不得发布 |
| Web | `/v2/` base、主路由、刷新 fallback、核心连接 | 公网旧版本、404、资源错路径必须回滚 |
| Android | V2.05/20500、签名连续、全新/覆盖安装、legacy 资源 | 签名变化、白屏、布局裁切或权限异常 |
| iOS | 审核状态复核、真机局域网/定位/后台/文件流程 | 已提交审核不能等同于已上线 |
| Windows | x64/x86 启动、FMO 连接、文件流程、覆盖安装 | 包内版本错误或核心连接失败 |
| macOS | Universal、codesign、notary、staple、启动 | 签名或公证失败 |
| 发布面 | URL 200、远端 SHA256 与本地一致、回退入口可用 | 链接、版本、文件名或校验不一致 |

## 七、风险与回退方案

### 7.1 主要风险

- 当前工作区不是干净发布分支，错误清理可能丢失 iOS V2.05 相关改动。
- Android 同名 V2.03 APK 已出现不同 SHA256，必须重建统一资产链。
- iOS 新增定位、局域网和后台定位能力，需要真机权限和后台行为验证。
- Android V2.05 如果使用普通现代构建，可能再次丢失旧 WebView 兼容入口。
- Windows 包未签名，SmartScreen 风险仍然存在。
- macOS 每次重建都必须重新签名和公证。
- 官网缓存可能导致用户短时间仍看到旧版本，需要验证缓存策略。

### 7.2 回退方案

- Web：保留部署前 `/v2/` 目录快照，可原路径恢复。
- Android：保留明确标注的 V2.02 兼容回退版。
- Windows/macOS：保留 `v2.0.3` 独立下载目录。
- 官网：保留旧首页文件，必要时恢复旧 index 和链接。
- iOS：保持审核队列，不因其他平台尚未对齐而撤回。

## 八、不纳入本次统一改号的内容

FMO伴侣屏 M5Core 固件属于独立产品线，当前 V2.01 不随 FMO-Dashboard 强制改为 V2.05。

历史 Android V2.01、V2.02、WebView 测试包及桌面端旧版本可以继续作为历史资产保存，但不得在主下载入口中冒充最新版本。

tvOS 当前默认作为 Preview 处理，不阻塞 Web、Android、iOS、Windows 和 macOS 的 V2.05 主发布。

## 九、下一阶段交付物

- V2.05 统一版本源码修改
- 版本扫描报告
- Web V2.05 部署包
- Android V2.05 正式 APK
- Windows x64/x86 2.0.5 安装包
- macOS Universal 2.0.5 DMG
- 各平台 SHA256
- APK/安装包元数据验证记录
- Android 签名与 macOS 公证结果
- 平台测试矩阵和未验证风险
- 更新后的 bh1jss.net 首页及下载链接验证
- iOS V2.05 App Store 审核或上线状态记录

## 十、本轮操作边界

本轮只完成版本审计和解决方案文档。

尚未执行：

- 源码版本修改
- 平台构建或签名
- Git 提交或推送
- GitHub Release 更新
- VPS 上传或官网替换
- App Store 审核操作

下一阶段应从“冻结并审阅当前未提交改动”开始，再按照本文顺序更新滞后版本。
