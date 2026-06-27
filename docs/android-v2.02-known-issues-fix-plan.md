# Android V2.02 已知问题排查与修改方案

更新时间：2026-06-22

本文用于记录 Android V2.02 发布后的已知问题、当前已验证事实、疑似原因和后续修改顺序。当前阶段先做排查与修复方案记录，不直接改动代码或重新打包。

## 背景

Android V2.02 是在 V2.01 基础上继续处理老 Android、车机、小爱音箱、鸿蒙兼容层和小分辨率横屏场景的补丁版本。

已发布版本信息：

- Android 包名：`net.bh1jss.fmodashboard`
- `versionCode`：`20200`
- `versionName`：`V2.02`
- 最低安装门槛：Android 7.0 / API 24
- APK 文件名：`FMO-Dashboard-Android-V2.02.apk`
- SHA256：`4405f90ef7932c2cffdafc499f917570c105dc48abee6dbc3465a31a19c9af90`

V2.02 设计目标：

- 保留 V2.01 的 TX/RX 频率显示。
- 增加 legacy/nomodule 构建路径，兼容更旧 WebView。
- 为低版本 WebView 增加 `sql.js` asm.js 回退路径。
- 避免 Android 11 以下调用高版本 `WindowInsets.Type.*` API 导致原生崩溃。
- 优化 800x480 等小分辨率横屏界面。

## 当前反馈

目前发布后需要重点处理的反馈：

1. 有用户反馈 Android V2.02 在某些设备上安装不了。
2. 部分老 Android / 车机 / 音箱设备可能仍存在启动白屏、启动后崩溃或系统提示应用屡次停止运行。
3. 下载页已保留 V2.01 回退版，但 V2.02 自身仍需要继续定位具体失败原因。
4. Windows 版深色模式下，日志列表前几位高亮行背景过白、对比度过高。
5. Windows 版深色模式下，老友卡片高亮背景过白、对比度过高。
6. Windows 版深色模式下，老友卡片详情弹窗内非超链接文字过白或过浅，可读性差。
7. 上述深色高亮问题在 Android V2.02 的部分老旧 Android 设备上也会出现，但新设备上不明显。
8. 切换服务器后出现的“已切换到 xxx”等 toast / 状态提示在深色模式下也可能背景过白；预计其他提示块也有同类问题。
9. 仪表盘“最近20个通联”疑似把实时发言事件与日志页最近记录混在一起，导致除少数实时发言呼号外，其余条目像是来自日志页面。
10. 通联播报容易中途断掉，建议重点检查 WS 协议下 `/audio` 语音流、音频 WebSocket 自动重连、AudioContext 恢复和页面可见性切换。

如果后续拿到用户设备信息，应优先补充：

- 设备型号；
- Android / 鸿蒙版本；
- WebView / Chrome 版本；
- 是首次安装失败，还是从 V2.01 覆盖升级失败；
- 安装器错误提示原文；
- 是否允许安装未知来源应用；
- 是否可通过 `adb install -r` 复现，并记录完整错误；
- 如能启动后崩溃，提供 `adb logcat` 关键堆栈。

## 已验证事实

### APK 校验值一致

本地已确认以下三处 V2.02 APK SHA256 一致：

- `release/android/FMO-Dashboard-Android-V2.02.apk`
- `deploy/downloads/FMO-Dashboard-Android-V2.02.apk`
- `deploy/aliyun-site/downloads/FMO-Dashboard-Android-V2.02.apk`

校验值均为：

```text
4405f90ef7932c2cffdafc499f917570c105dc48abee6dbc3465a31a19c9af90
```

结论：本地发布目录与部署目录中的 V2.02 文件没有漂移。若线上下载仍失败，需另查 VPS/CDN/浏览器缓存/下载不完整。

### V2.01 与 V2.02 签名一致

已使用 `apksigner verify --print-certs` 对比：

- `FMO-Dashboard-Android-V2.01.apk`
- `FMO-Dashboard-Android-V2.02.apk`

两者证书一致：

```text
Signer #1 certificate DN: C=US, O=Android, CN=Android Debug
Signer #1 certificate SHA-256 digest: 51e9937f3fec464214a5e68f80f79ba9b24a9e98abf3770090eddc509f8217b5
```

结论：从 V2.01 覆盖安装 V2.02 时，签名不一致不是当前主要嫌疑。

注意：当前公开 APK 仍是 debug 证书签名。它可以用于公开下载测试，但不适合作为应用市场正式提交包。后续若切换正式 keystore，会导致已安装 debug 签名版本无法直接覆盖安装，需要用户卸载旧版或使用同一正式签名重新发布整条版本线。

### 包名、版本号和 SDK 门槛正确

已使用 `aapt dump badging` 对比：

V2.01：

```text
package: name='net.bh1jss.fmodashboard' versionCode='20100' versionName='V2.01'
sdkVersion:'24'
targetSdkVersion:'36'
```

V2.02：

```text
package: name='net.bh1jss.fmodashboard' versionCode='20200' versionName='V2.02'
sdkVersion:'24'
targetSdkVersion:'36'
```

结论：

- 包名一致；
- V2.02 `versionCode` 高于 V2.01；
- 理论上支持 Android 7.0/API 24 及以上安装；
- 如果用户从 V2.01 升级失败，原因更可能来自设备 ROM、安装来源限制、APK 下载损坏、存储空间、ABI/manifest 兼容、权限策略或安装器具体错误，而不是基础版本号配置。

## 疑似问题分层

### A. 安装阶段失败

优先级：高

典型表现：

- 点击 APK 后提示“无法安装”；
- 覆盖安装失败；
- 安装器没有详细错误；
- `adb install -r` 返回 `INSTALL_FAILED_*`。

当前已排除：

- V2.01 到 V2.02 的签名不一致；
- V2.02 `versionCode` 未递增；
- `minSdkVersion` 高于 Android 7；
- 本地发布文件和部署文件 SHA 不一致。

下一步需要用户或测试设备提供：

```bash
adb install -r release/android/FMO-Dashboard-Android-V2.02.apk
```

重点记录错误：

- `INSTALL_FAILED_VERSION_DOWNGRADE`
- `INSTALL_FAILED_UPDATE_INCOMPATIBLE`
- `INSTALL_FAILED_INVALID_APK`
- `INSTALL_FAILED_NO_MATCHING_ABIS`
- `INSTALL_FAILED_OLDER_SDK`
- `INSTALL_FAILED_INSUFFICIENT_STORAGE`
- `INSTALL_PARSE_FAILED_*`

可能修改方向：

- 如果是下载损坏：重新生成 VPS 下载页校验说明，增加 SHA256 对照提示。
- 如果是未知来源限制：在下载页增加安装授权提示。
- 如果是系统安装器解析失败：检查 APK Signature Scheme、targetSdk、manifest 权限和旧 ROM 对新权限的兼容性。
- 如果是应用市场/厂商安装器限制：后续单独准备正式签名 release 包或 AAB。

### B. 启动阶段原生崩溃

优先级：高

典型表现：

- 安装成功，打开即闪退；
- 系统提示“应用屡次停止运行”；
- 没有进入 WebView 兼容提示页。

重点嫌疑：

- 原生插件启动期调用了低系统不支持的 Android API；
- AndroidX/Capacitor 依赖在某些旧 ROM 上触发兼容问题；
- 前台服务、通知、定位、音频服务在旧系统或特殊 ROM 上初始化行为异常；
- `targetSdkVersion = 36` 与老 ROM/厂商安装器组合出现边缘兼容问题。

当前需要重点复核的代码区域：

- `android/app/src/main/java/net/bh1jss/fmodashboard/FmoSystemUiPlugin.java`
- `android/app/src/main/java/net/bh1jss/fmodashboard/FmoAudioPlugin.java`
- `android/app/src/main/java/net/bh1jss/fmodashboard/FmoLocationPlugin.java`
- `android/app/src/main/AndroidManifest.xml`
- `android/variables.gradle`

后续修改原则：

- 所有 Android 版本相关 API 调用必须有 `Build.VERSION.SDK_INT` 分支保护。
- 旧系统兜底分支应捕获 `Throwable`，避免 `NoSuchMethodError`、`NoClassDefFoundError` 等绕过 `Exception`。
- 原生插件 `load()` 阶段只做低风险初始化，避免任何失败杀死整个进程。

### C. WebView 启动白屏或 watchdog 页面

优先级：中高

典型表现：

- 安装成功；
- 打开后白屏；
- 进入兼容失败提示页；
- 点击重试仍无法进入主界面。

当前 V2.02 已有设计：

- legacy/nomodule 构建路径；
- WebView 61 以上尽量放行；
- 旧 WebView 语法探测错误忽略；
- 低版本 WebView 使用 `sql.js` asm.js 回退；
- 启动 watchdog 避免长时间纯白屏。

下一步需要验证：

- V2.02 实际 APK 内是否包含 `nomodule` legacy 入口；
- legacy 首入口是否仍避开 `BigInt`、`WebAssembly`、`sql-wasm.wasm`；
- 小爱音箱 / Android 8 / WebView61 设备是否仍进 watchdog；
- watchdog 记录的 `window.__fmoBootErrors` 是否能被导出或显示。

建议新增诊断：

- watchdog 页面展示最近 3 条启动错误的简短文本；
- 增加复制/导出诊断信息按钮；
- 将 WebView UA、Android 版本、legacy 接管状态写入页面可见区域。

### D. 小分辨率横屏布局问题

优先级：中

典型表现：

- 800x480 车机首屏信息被挤压；
- 顶栏、当前呼号、方位卡片、最近通联列表重叠或不可读；
- 横屏无法快速看到核心值守信息。

V2.02 已做过小横屏压缩优化。后续如果仍有反馈，应使用固定视口复测：

- 800x480 横屏；
- 1024x600 横屏；
- 390x844 竖屏；
- 桌面宽屏。

修改原则：

- 不新增说明性大段文字；
- 首屏优先保留当前呼号、方位、频率、最近通联；
- 次要入口可折叠或移入菜单；
- 按钮和卡片尺寸必须稳定，不因文字变化造成布局跳动。

### E. 深色模式下高亮块过白、非链接文字过浅

优先级：高

影响平台：

- Windows 桌面版深色模式；
- Android V2.02 的部分老旧 Android / 车机 / 音箱 WebView；
- 新 Android 设备目前未明显复现。

用户反馈：

1. Windows 版本深色模式下，日志显示样式中前几位高亮对比度过高，背景过白。
2. Windows 版本深色模式下，老友卡片的高亮对比度过高，背景过白。
3. Windows 版本深色模式下，老友卡片进入详情后，非超链接字体过白或过浅，可读性差。
4. 切换服务器后，出现的“已切换到 xxx”提示也有类似问题。
5. 预计其他成功、警告、错误、同步状态、筛选状态等提示也可能出现同类浅色背景。

图片现象：

- 日志列表顶部 `dailyIndex` 前几名高亮行仍呈现接近浅色主题的米白 / 浅粉背景。
- 老友卡片在深色页面上大量显示浅色卡片背景，与周围暗色容器对比突兀。
- 老友详情弹窗中，呼号链接为蓝色尚可识别，但普通文字、日期、网格、留言等内容在浅色卡片上偏淡。

当前定位：

- 相关样式变量位于 `src/style.css`。
- 系统跟随深色模式的 `@media (prefers-color-scheme: dark)` 中定义了深色版特殊变量：
  - `--bg-friend-card`
  - `--border-friend-card`
  - `--bg-today-card`
  - `--bg-today-row`
  - `--bg-today-index`
  - `--bg-today-index-neutral`
  - `--border-today-row`
  - `--border-today-card`
  - `--bg-rank-1`
  - `--bg-rank-2`
  - `--bg-rank-3`
  - `--bg-record-card`
  - `--border-record-card`
- 但手动深色主题 `html[data-theme='dark']` 当前只定义了基础背景、文字、边框、主色和少量 surface 变量，缺少上述卡片 / 排名 / 今日通联特殊变量。
- 因此当 Windows 桌面版或旧 Android WebView 走 `html[data-theme='dark']` 路径时，部分特殊变量会回落到 `:root` 浅色默认值，造成深色界面里出现大面积过白卡片和高亮行。

涉及组件：

- `src/components/home/LogDataTable.vue`
  - `rank-bg-1` / `rank-bg-2` / `rank-bg-3`
  - `row-today`
  - `today-index`
- `src/components/home/OldFriendsList.vue`
  - `friend-card`
  - `today-contact`
- `src/components/home/modals/CallsignRecordsModal.vue`
  - `record-card`
  - `today-record`
  - `record-label`
  - `record-value`
  - `address-line`
- 共用提示 / 状态块：
  - `src/components/common/ToastContainer.vue`
  - `src/components/common/StatusHints.vue`
  - `src/components/common/DatePicker.vue`
  - `src/components/home/QuerySection.vue`
  - `src/views/MessageView.vue`
  - `src/views/WishWallView.vue`
  - `src/components/home/modals/AprsRemoteControl.vue`

建议修复方向：

1. 补齐 `html[data-theme='dark']` 中缺失的深色特殊变量，先让手动深色主题与系统深色主题保持一致。
2. 补齐成功、警告、错误、主色轻背景等共用提示 token，避免 toast 和状态提示继续回落到浅色默认值：

```css
html[data-theme='dark'] {
  --bg-success-light: #1f3a1f;
  --bg-warning-light: #3a2e1f;
  --bg-error-light: #3a1f1f;
  --bg-primary-light: #1a2a3a;
  --color-success-border: #2d5a2d;
  --color-warning-border: #5a4a2d;
}
```

3. 为日志排名高亮和老友卡片建立更克制的暗色 token，避免使用接近白色的浅底：

```css
html[data-theme='dark'] {
  --bg-friend-card: #3a2e1f;
  --border-friend-card: #5a4a2d;
  --bg-today-card: #1f3a1f;
  --bg-today-row: #1a241a;
  --bg-today-index: #1e2e1e;
  --bg-today-index-neutral: #1a281a;
  --border-today-row: #263626;
  --border-today-card: #2d5a2d;
  --bg-rank-1: #3d3520;
  --bg-rank-2: #3a3d42;
  --bg-rank-3: #3d2e20;
  --bg-record-card: #20241f;
  --border-record-card: #3f463f;
}
```

4. 复核详情弹窗的非链接文字颜色：
   - `record-label` 继续使用 `--text-tertiary` 可能偏浅或偏灰；
   - `record-value` 应确认使用 `--text-primary`；
   - 地址、留言等次要内容可使用 `--text-secondary`，避免在浅底或暗底上都发虚。
5. 尽量避免在这些兼容路径使用 `color-mix()`、复杂透明叠加或依赖新 CSS 特性的颜色推导，旧 WebView/Windows WebView2 上直接使用确定的 hex / rgba 值更稳。

验证方法：

- Windows 桌面版手动切到深色模式，打开：
  - 日志列表；
  - 老友列表；
  - 老友详情弹窗。
- 触发以下提示：
  - 日志页点击中继切换，观察“已切换到 xxx”toast；
  - 自动同步成功提示；
  - 查询筛选选中状态；
  - 消息页错误 / 成功提示；
  - 愿望墙状态标签；
  - APRS 远程控制错误提示。
- Android V2.02 老设备或 WebView61 测试包同样检查上述三处。
- 对比新 Android 设备，确保新设备上原本正常的深色表现不被改坏。
- 检查浅色模式不受影响。

预期修复结果：

- 深色模式下不再出现大面积米白 / 粉白高亮块。
- 日志前几名仍可识别，但背景应是暗金 / 暗银 / 暗铜而不是浅色块。
- 今日通联仍有绿色提示，但保持暗色底。
- 老友详情弹窗中，普通文字在暗色卡片上清晰，链接仍用蓝色强调。

### F. 仪表盘最近 20 个通联混入日志页记录

优先级：高

参考文档：

- `/Users/bh1jss/Documents/HAM点名软件/docs/realtime-qso-feed-design.md`

用户反馈：

- 仪表盘页面实时显示最后 20 个通联的逻辑似乎有问题。
- 除了某个服务器上实时发言的几个呼号，其他条目似乎来自日志页面。
- 另一个项目中已经通过“实时候选列表 + 历史库补全”的方式避免类似问题。
- FMO-Dashboard 为保持首屏内容完整，可以做产品层妥协：如果软件打开后暂时没有新的实时事件，允许用上次最后的通联日志补全最近 20。

参考设计要点：

- FMO 实时列表应优先使用 `/events` 或等价 WebSocket 实时事件。
- 日志/API 只用于补全 QTH、留言、中继、历史通联标记等信息。
- 首次打开 FMO 地址时，列表可以从空开始逐步累积，不要用日志页一次性填满并伪装成实时。
- 结合 FMO-Dashboard 的首屏完整性要求，可以允许“日志补位”：实时事件候选始终排在前面，日志只在实时不足 20 条时填充剩余行。
- 多监听源进入 UI 前应归一化成统一候选对象，再排序、去重、截取最近 20 条。
- 列表首位代表当前最应关注的呼叫，`isSpeaking=true` 的候选优先。

当前代码定位：

- 文件：`src/views/DashboardView.vue`
- 主要逻辑：`displayRecords`
- 相关状态：
  - `speakingHistory`：主地址实时发言历史；
  - `allSpeakingHistories`：多地址实时发言历史；
  - `records`：`refreshDashboard()` 从 `client.getQsoList(0, 20, ...)` 读取的最近日志记录。

已确认的问题点：

1. `displayRecords` 原逻辑先从 `speakingHistory` 生成实时行，但使用了 `.filter((item) => item.endTime)`，导致正在发言的记录被排除。模板里虽然有 `record.isSpeaking` 和“正在发言”徽标，但实际列表不会显示当前发言行。
2. `displayRecords` 随后把 `records.value` 中的日志行作为 `qsoRows` 合并进最近 20，并按时间排序。这会让仪表盘实时列表被日志页最近记录补满。
3. 多地址模式下，Dashboard 最近 20 使用主地址 `speakingHistory`，没有优先消费 `allSpeakingHistories`，因此只容易看到某个服务器上的实时发言。

建议修复方向：

1. `displayRecords` 的候选来源改为实时事件历史：
   - 多地址有数据时使用 `allSpeakingHistories`；
   - 否则使用主地址 `speakingHistory`。
2. `records.value` 仍通过 `findMatchingLog()` 补全同呼号、近时间窗口的实时候选：
   - QTH / Grid；
   - 留言；
   - 中继名 / 管理员；
   - 是否已经在日志中。
3. 为保持首屏完整性，允许从 `records.value` 生成日志补位行，但必须满足：
   - 实时事件行永远排在日志补位行之前；
   - 同一呼号已有实时事件时，不再加入日志补位行；
   - 日志补位行只用于补足 20 条，不标记为 `isSpeaking`。
4. 排序规则：
   - `isSpeaking=true` 置顶；
   - 其次是实时事件时间倒序；
   - 再其次是日志补位记录时间倒序；
   - 同一呼号保留最新一条；
   - 截取前 20 条。
5. 空状态只在实时和日志都没有数据时显示；如果已有上次日志，则可展示日志补位内容。

本地修复记录：

- `src/style.css`
  - 补齐 `html[data-theme='dark']` 相对 `@media (prefers-color-scheme: dark)` 缺失的深色变量。
  - 覆盖成功 / 警告 / 错误 / 主色轻背景、老友卡片、今日通联、日志排名、详情卡片、发言条、遮罩和提示层。
  - 让 toast、自动同步提示、筛选状态、愿望墙状态、消息页提示等共用组件不再回落到浅色默认背景。

- `src/views/DashboardView.vue`
  - `displayRecords` 改为使用 `allSpeakingHistories` / `speakingHistory` 构造实时候选。
  - 包含当前正在发言记录，不再过滤掉 `endTime == null` 的行。
  - 日志记录改为补位来源：实时不足 20 条时，用 `records.value` 的最近日志补齐首屏。
  - 日志补位行不覆盖同呼号实时事件，也不会排在实时事件前面。
  - 排序改为正在发言优先，其次按实时事件时间倒序，再按日志补位时间倒序。
  - 空状态文案从“暂无通联数据”调整为“等待实时事件”；有日志补位时仍显示补位内容。

后续验证项：

- 单地址模式：
  - 刚打开仪表盘时，如果没有实时事件但有最近日志，最近 20 可显示日志补位内容；
  - 如果实时和日志都没有数据，显示等待实时事件；
  - 收到发言开始事件后，该呼号进入最近 20 首位并显示正在发言；
  - 收到结束事件后保留为最近发言。
- 多地址模式：
  - 已选多个 FMO 地址时，多个服务器的实时事件都应进入最近 20；
  - 主地址以外的发言不应被日志页记录覆盖或挤到日志补位之后。
- 日志补全：
  - 如果实时事件附近存在同呼号日志，仍应显示 QTH、留言、中继和已记录星标；
  - 如果没有匹配日志，仍显示实时呼号、时间和来源中继；
  - 日志补位行可点击查看通联卡片，但不能显示“正在发言”。

## 建议修改顺序

### 第 1 步：补齐安装失败证据

目标：先判断“安装不了”到底是安装器阶段还是启动阶段。

待做：

1. 让反馈用户确认是否已经安装过 V2.01 或更早版本。
2. 让用户记录安装器错误截图。
3. 如可连接电脑，执行：

```bash
adb install -r FMO-Dashboard-Android-V2.02.apk
```

4. 将 `INSTALL_FAILED_*` 或 `INSTALL_PARSE_FAILED_*` 原文写回本文档。

### 第 2 步：做一个 V2.02.1 诊断增强测试包

目标：不急于改公开下载主包，先让失败设备能提供信息。

建议内容：

- watchdog 页面显示最近启动错误；
- 原生插件启动期增加更保守的 `Throwable` 保护；
- 诊断日志增加设备 ABI、SDK、WebView UA、legacy 接管状态；
- 安装包文件名使用测试命名，例如：
  `FMO-Dashboard-Android-V2.02.1-Diagnostic-Test.apk`

### 第 3 步：按错误类型定向修复

如果是安装错误：

- 根据 `adb install` 错误修 manifest、签名、SDK、权限或发布包。

如果是原生崩溃：

- 根据 `logcat` 堆栈修 Java 插件；
- 对所有启动期原生能力做版本保护和降级。

如果是 WebView 白屏：

- 优先修 legacy 首入口、动态导入和 wasm/BigInt 规避；
- 增强 watchdog 诊断，不让用户只看到“失败”。

如果是布局问题：

- 单独做小横屏 CSS 回归，不和安装/崩溃修复混在一起。

如果是深色高亮问题：

- 优先补齐 `html[data-theme='dark']` 的特殊卡片 / 排名 / 今日通联变量；
- 再按截图检查 `LogDataTable.vue`、`OldFriendsList.vue`、`CallsignRecordsModal.vue` 的实际渲染；
- 如仍偏白，再下调对应 token 亮度，而不是在组件里硬编码浅色覆盖。

如果是仪表盘最近 20 实时列表问题：

- 优先让最近 20 消费实时事件候选；
- 日志/API 作为补全资料来源，并可在实时不足 20 条时补位；
- 多地址模式下使用 `allSpeakingHistories` 归一化后的候选；
- 日志补位不能排在实时事件前，也不能覆盖同呼号实时事件。

### 第 4 步：决定是否发布 V2.03

如果修复影响公开 APK，应使用新版本号，不覆盖 V2.02 已发布资产。

建议：

- Android `versionCode`：`20300`
- Android `versionName`：`V2.03`
- APK：`FMO-Dashboard-Android-V2.03.apk`
- 下载页继续保留 V2.01 回退版，直到确认 V2.03 覆盖更多设备。

## 验证命令

基础验证顺序：

```bash
npm run lint
npm run typecheck
npm run build
```

Android 构建与检查：

```bash
bash scripts/build-android-apk.sh --release
aapt dump badging release/android/FMO-Dashboard-Android-V2.03.apk
apksigner verify --print-certs release/android/FMO-Dashboard-Android-V2.03.apk
shasum -a 256 release/android/FMO-Dashboard-Android-V2.03.apk
```

真机安装：

```bash
adb install -r release/android/FMO-Dashboard-Android-V2.03.apk
adb logcat -c
adb shell monkey -p net.bh1jss.fmodashboard 1
adb logcat -d | grep -iE "fmodashboard|FmoSystemUi|FmoAudio|FmoLocation|AndroidRuntime|chromium|Capacitor"
```

## 发布注意事项

- 不直接替换已发布的 V2.02 APK，除非明确标记为同版本重打包并重新同步所有 SHA256。
- 更推荐发布 V2.03 或 V2.02.1 测试包，避免用户手里的校验值和线上说明不一致。
- 下载页应继续保留 V2.01 回退入口。
- 如果改用正式 keystore，必须在说明中提示 debug 签名旧版无法覆盖安装。
- 应用市场准备应单独走正式签名、隐私政策、权限说明和 AAB/APK 审核材料，不与公开测试 APK 混用。

## 2026-06-28 本会话补充记录

本轮在上述 V2.02 已知问题基础上继续修改，并先形成 Web V2.03 验证版。按用户要求，本轮改动暂不同步 Git。

### 深色模式显示问题

已处理范围：

- Windows 深色模式下日志列表前几位高亮背景过白。
- Windows 深色模式下老友卡片高亮过白。
- 老友卡片详情中非超链接文字过白 / 过浅。
- 切换服务器后的“已切换到 xxx”提示，以及其他 toast / 状态提示可能回退浅色背景的问题。
- 部分老旧 Android WebView 上同类浅色回退问题。

实现记录：

- `src/style.css` 补齐 `html[data-theme='dark']` 的深色变量。
- 成功 / 警告 / 错误 / 主色轻背景、老友卡片、今日通联、日志排名、详情卡片、发言条、遮罩和提示层统一使用深色 token。
- 优先修 token 和通用提示样式，不在单个业务组件里硬编码浅色覆盖。

### 仪表盘最近 20 通联

已按实时事件优先的方向修改：

- 多地址模式优先使用 `allSpeakingHistories`。
- 单地址模式使用主地址 `speakingHistory`。
- 当前正在发言的记录不再被 `endTime` 过滤掉，会进入列表并置顶。
- `records.value` 的日志记录只作为补全资料和首屏不足 20 条时的补位来源。
- 同一呼号已有实时事件时，不再加入日志补位行。
- 空状态文案调整为“等待实时事件”，避免误导用户以为列表完全来自日志。

### “上个通联”次数 +1

新增显示规则：

- 当某个呼号成为“上个通联”时，先锁定当时的历史次数基线。
- 后续只有在日志 / 同步 / 导入让同一呼号的真实通联次数增加后，才在次数标签中显示鲜艳 `+1`。
- 示例：原本显示 `历史 3 次`，确认新增一次后显示为 `历史 3 次+1`。
- 不在刚开始实时发言时立即显示 `+1`。
- 增量固定最多显示 `+1`，不显示 `+2` / `+3`。
- 基线按呼号保存，避免日志同步导致记录 ID / 时间变化后重置基线。

### FMO 官方备份 ZIP 与设置页入口

已参考官方日志维护工具 `qso.html` 和方案文档：

- 官方导入使用 `.zip` 文件，并通过 `POST /api/qso/restore` 上传。
- 官方导出备份使用 `POST /api/qso/backup` 触发、`/events` 监听进度、`GET /api/qso/backup` 下载。
- 官方 ADIF 导出使用 `POST /api/qso/adif` 触发、`GET /api/qso/adif` 下载。
- 方案文档确认备份 ZIP 根目录应包含 `logBook_v1_active.db`，数据库表为 `qso_logs`。

本项目已完成：

- 新增 `fflate` 依赖，用于浏览器端读取和生成 ZIP。
- `src/services/db.js` 支持从官方 ZIP 中读取 `logBook_v1_active.db` 并校验 `qso_logs`。
- 新增导出官方恢复包能力，生成根目录含 `logBook_v1_active.db` 的 ZIP。
- 本地导入文件选择支持 `.db`、`.adi`、`.adif`、`.zip`。
- Tauri 文件选择器增加 `zip` / “FMO 恢复包”过滤。
- 设置页数据管理入口调整为：
  - `导出数据库文件`
  - `导出ADIF`
  - `导出备份`
  - `导入备份到FMO`
- `导入备份到FMO` 使用蓝色主按钮。
- `清空通联日志` 与 `清理地址缓存` 保留，其中 `清空通联日志` 改为页面常驻显示，不再依赖 `dbLoaded`。

当前边界：

- `导入备份到FMO` 目前仍沿用本项目的本地导入链路，已能读取官方 ZIP 并恢复到仪表盘本地数据库。
- 若后续要真正“导入到 FMO 设备”，还需要新增对当前 FMO 地址的 `POST /api/qso/restore` 上传流程和结果提示。

### V2.03 网页版记录

- `package.json` / `package-lock.json` 版本更新为 `2.0.3`。
- 关于页显示版本更新为 `V2.03`。
- VPS 下载页文案更新为 Web V2.03；Android / Windows / macOS 安装包仍沿用既有 V2.02 资产，未在本轮重新打包。
- 已按用户要求将网页版上传到 VPS `/V2/`，后续用户反馈线上似乎已是同版内容。

### 通联播报断播问题

新增待查问题：

- 通联播报可能在 WS 协议下中途断掉。
- 重点排查 `/audio` WebSocket：
  - `onclose` / `onerror` 是否触发但没有足够诊断；
  - 自动重连后 `AudioContext` 是否仍处于 `suspended`；
  - 页面隐藏 / 恢复可见后是否只恢复了 AudioContext，未恢复已断开的音频流；
  - Windows WebView2、老 Android WebView、移动浏览器的自动播放策略是否导致恢复失败；
  - 与 `/events` 连接和本机发言自动静音逻辑是否有相互影响。

本轮先做暴露面调整：

- 每次打开应用默认进入“通联播报”模式。
- 若已有 FMO 地址，启动后会尝试自动打开 `/audio` WS 音频流。
- 用户仍可手动关闭播报，但下次重新打开应用会再次默认回到通联播报。

后续建议：

- 在 `src/services/audioPlayer.js` 或平台音频实现中增加断开原因、重连次数、最后收到音频包时间、AudioContext 状态的诊断日志。
- 在 Windows 桌面版和旧 Android 设备上长时间挂播，记录断播前后的 `audioStatus`、控制台日志和系统睡眠 / 锁屏状态。

### 本轮验证

- `npx eslint src/views/DashboardView.vue` 通过。
- `npx eslint src/views/SettingsView.vue` 通过。
- `npx eslint src/views/MainLayout.vue` 通过。
- `npx eslint src/services/db.js src/views/MainLayout.vue src/views/SettingsView.vue src/composables/useDbManager.js src/utils/desktopBridge.js` 通过，保留 `MainLayout.vue` 既有 `vue/no-template-shadow` warning。
- `npm run typecheck` 通过。
- `npm run build` 通过。
- 本地浏览器 `http://localhost:5174/settings` 确认：
  - `导入备份到FMO` 为蓝色主按钮；
  - `清空通联日志` 可见；
  - `清理地址缓存` 可见。

## 当前结论

截至本次文档生成，V2.02 的本地 APK 基础信息是自洽的：包名、版本递增、最低 SDK、签名延续和文件校验均未发现明显错误。

下一轮修复不应盲目猜测。最关键的分叉证据是：

- 安装失败时的 `adb install -r` 原始错误；
- 启动崩溃时的 `adb logcat` 堆栈；
- 白屏/watchdog 时的 WebView UA 和启动错误。

拿到上述任一证据后，再进入对应代码修改和重新打包。
