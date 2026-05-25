# FMO仪表盘

这个项目的初衷，是把 FmoLogs 做成一个更好用、更直观的 **FMO 实时仪表盘**。

相比只把 FMOlogs 当作“日志查看器”，这个增强版更关注正在通联时的现场信息：当前发言呼号、对方位置、相对方位、距离、最近通联、中继状态和声音提示。打开页面后优先进入仪表盘，让操作者能一眼看到当前网络里正在发生什么。

本项目基于 **BH5HSJ 后视镜** 开发并开源的 FmoLogs 修改，采用 MIT 许可证，并保留原项目版权与致谢。

📦 [项目仓库](https://github.com/54dashayu/FMO-Dashboard) · 🐛 [问题反馈](https://github.com/54dashayu/FMO-Dashboard/issues)

本增强版基于原作者 BH5HSJ 后视镜的 [dingle1122/FmoLogs](https://github.com/dingle1122/FmoLogs) 项目修改，感谢原作者的优秀开源项目。

## 🎯 这个增强版做了什么

- 将 **仪表盘设为默认首页**，打开后优先显示实时通联状态。
- 在当前通联区域突出显示 **呼号、时间、QTH、相对方位和距离**。
- 最近通联列表实时刷新，按呼号去重，最新一次发言优先显示。
- 已经出现在通联日志中的呼号，会在最近通联列表中显示小星星。
- 支持中继名称点击切换，已收藏中继显示星标。
- 增加声音模式：新呼号提示、通联播报、关闭所有播报。
- 呼号播报增加内置离线语音兜底，默认使用 NATO 字母解释法，例如 `BH1JSS` 播报为 `Bravo Hotel One Juliet Sierra Sierra`。
- 按历史新呼号、今日新呼号、10 分钟未出现呼号播放不同提示音，且不会播报自己的呼号。
- 增加诊断日志页面，方便排查 APK 闪退、FMO 连接异常、语音播报失败等问题。
- 针对手机浏览器优化仪表盘布局，方便局域网内手机查看。
- 提供 Windows x64 便携包和 EXE 启动器，无需安装开发环境。

## 🆕 V1.0.0 更新说明

- **实时通联状态更稳**：启动、重连和前后台恢复时主动补偿刷新正在通联状态，减少“当前无人发言”的误显示。
- **呼号卡片直达**：最近通联列表中带星标的老朋友呼号可直接打开通联卡片。
- **新呼号标记**：当前通联大号呼号后会为从未通联过的呼号显示“新”标记。
- **呼号播报去重**：减少同一次发言在网页版和 Win64 便携版中偶发重复播报的问题。
- **FMO 地址更稳**：统一规范化 `fmo.local`、完整 URL 和 `/ws` 路径输入，提升刷新和同步稳定性。
- **Win64 便携版体验优化**：EXE 启动器改为便携启动语义，避免表现得像传统安装向导。

## 🌐 网页版

- [https://fmo.bh1jss.net/](https://fmo.bh1jss.net/)

## 📦 Win64 便携版

最新版便携包在 GitHub Release 中下载。推荐普通用户下载 `.exe` 版本，双击即可自动解压并启动：

- [FMO-Dashboard-Windows-Portable-v1.0.0.exe](https://github.com/54dashayu/FMO-Dashboard/releases/download/v1.0.0/FMO-Dashboard-Windows-Portable-v1.0.0.exe)
- [FMO-Dashboard-Windows-Portable-v1.0.0.zip](https://github.com/54dashayu/FMO-Dashboard/releases/download/v1.0.0/FMO-Dashboard-Windows-Portable-v1.0.0.zip)

`.exe` 使用方式：

1. 下载 `FMO-Dashboard-Windows-Portable-v1.0.0.exe`。
2. 双击运行，浏览器会自动打开本机页面。
3. 同一局域网内的手机也可以访问启动页面中显示的局域网地址。

## 📚 项目文档

- [项目交接文档](docs/project-handover.md)：整理当前成果、发布物、部署方式和后续待办。
- [Codex 长对话摘要](docs/codex-archived-thread-summary.md)：从归档对话中提炼出的项目演进脉络。
- [VPS 访问统计说明](docs/vps-stats.md)：私有统计页的部署思路和安全注意事项。
- [FMO 中继控制说明](doc/fmo-station-control.md)：中继切换、QRZ 跳转和实时仪表盘早期实现记录。





###############以下为BH5HSJ后视镜老师原Fmolos项目说明：####################

## ✨ 主要功能

### 📁 数据导入与导出

- **导入 FMO 日志**：支持导入一个或多个 `.db` 格式的日志文件
- **FMO 同步**：
  - **自动同步**：配置 FMO 地址后，自动检测并提示同步今日消息
  - **手动同步**：一键同步今日通联记录
- **数据持久化**：使用 IndexedDB 存储，刷新页面数据不丢失
- **数据导出**：将当前查看的日志数据导出为 `.db` 文件
- **日志备份**：一键从 FMO 设备下载完整的日志备份文件

### 📡 服务器与设备管理

- **服务器列表**：查看所有可用服务器（Station）状态
- **服务器切换**：支持切换当前连接的服务器（上一台/下一台/列表选择）
- **实时监控**：
  - **发言状态**：实时显示当前正在发言的呼号及发言历史
  - **状态监控**：标题栏显示服务器连接状态
- **APRS 远程控制**：集成专业的 APRS 远程控制面板，支持 FMO 设备远程管理
  - **智能填充**：自动从 FMO 配置中填充登录呼号，简化操作流程
  - **安全校验**：严格的呼号、Passcode 和密钥格式校验，防止误操作
  - **服务器管理**：支持添加、编辑、删除自定义远程控制服务器
  - **多模式控制**：支持普通模式、待机模式、软重启三种控制指令
  - **操作记录**：完整的操作历史记录，支持中文状态显示（普通模式、待机模式、软重启）
  - **自动断开**：发送指令后 60 秒自动断开连接，节省资源
  - **状态反馈**：实时显示连接状态和指令执行结果，直观可靠

### 📊 数据查询模式

#### 1. 实时仪表盘

- **当前通联突出显示**：显示正在通联的呼号、时间、QTH、相对方位和距离
- **移动端优化**：当前通联、方位距离、当前中继和刷新按钮在手机屏幕中更紧凑易读
- **实时最近通联**：自动刷新最近通联列表，按呼号去重并优先显示最新发言
- **QTH 显示**：根据网格或精确坐标显示省、市、区级地址
- **历史标识**：已出现在通联日志中的呼号在最近通联列表中显示星标
- **声音模式**：支持播报呼号+提示、通联结束后播报、仅通联、关闭所有声音
- **呼号播报**：优先使用女声慢速播报，并按历史新呼号、今日新呼号、10 分钟未出现呼号播放不同提示
- **中继快捷切换**：列表中的中继名称可点击切换，已收藏中继显示星标

#### 2. 通联日志

- **全量记录**：按时间倒序展示所有通联日志
- **智能搜索**：支持按接收方呼号实时模糊搜索
- **当日序号**：高亮显示当日通联序号（前三名金银铜色高亮）
- **详细信息**：展示呼号、网格、频率、模式、中继及留言信息

#### 3. 排行榜

- **多维统计**：接收方呼号、网格、中继使用频率的 TOP20 排名
- **数据筛选**：支持按发送方呼号筛选统计结果

#### 4. 老朋友

- **卡片展示**：以卡片形式展示历史通联过的友台
- **状态标识**：今日通联过的友台显示绿色高亮
- **历史回溯**：点击卡片即可查看与该友台的所有历史通联记录

### 🛠️ 实用工具

- **FMO 地址配置**：支持 IP 或 `fmo.local` 域名（自动处理 mDNS）
- **友情链接**：内置 FMO 地图、实践分享等常用资源链接
- **暗色模式**：自动跟随系统主题，提供舒适的夜间使用体验
- **回到顶部**：移动端长列表滚动时，右下角自动浮现回到顶部按钮

## 🚀 使用指南

### 快速开始

1. **配置设备**：点击右上角设置图标，输入 FMO 设备地址（如 `fmo.local` 或 IP）
2. **同步数据**：点击"同步今日通联"获取最新数据，或手动导入 `.db` 文件
3. **开始使用**：默认首页为实时仪表盘，可查看当前通联、方位距离、最近通联和当前中继

### mDNS 支持

- **桌面端**：推荐使用 `fmo.local` 直接连接
- **移动端**：部分设备可能需要输入具体 IP 地址

### 常见操作

- **切换服务器**：在"发言状态条"点击服务器名称，或在"发言历史"弹框中切换
- **导出/备份**：
  - **导出数据文件**：将当前网页中查看到的日志保存到本地
  - **备份 FMO 日志**：从 FMO 设备下载原始日志文件

## 💻 本地开发

### 环境要求

- Node.js 16+
- npm 或 yarn

### 快速开始

```bash
# 克隆仓库
git clone https://github.com/54dashayu/FMO-Dashboard.git
cd FMO-Dashboard

# 安装依赖
npm install

# 启动开发服务器（支持局域网访问）
npm run dev -- --host

# 代码格式化
npm run format

# 代码检查
npm run lint
```

## 📝 技术栈

- **核心框架**：Vue 3 (Composition API) + Vite 7
- **状态管理**：Pinia
- **数据存储**：SQLite (sql.js) + IndexedDB
- **通信协议**：WebSocket (实时事件) + HTTP/HTTPS
- **路由管理**：Vue Router
- **加密算法**：crypto-js (HMAC-SHA1)
- **代码规范**：ESLint + Prettier

## 📦 构建部署

```bash
# 构建生产版本
npm run build

# 本地预览构建产物
npm run preview
```

构建产物位于 `dist/` 目录，可部署至任何静态文件服务器（如 Nginx、Apache、GitHub Pages、Vercel 等）。

## 📂 项目结构

```
src/
├── components/              # Vue 组件
│   ├── common/             # 通用组件
│   │   ├── ConfirmDialog.vue    # 确认对话框
│   │   ├── DatePicker.vue       # 日期选择器
│   │   ├── StatusHints.vue      # 状态提示
│   │   └── ToastContainer.vue   # Toast 提示容器
│   └── home/               # 主页组件
│       ├── AppHeader.vue        # 应用头部
│       ├── LogDataTable.vue     # 日志数据表格
│       ├── OldFriendsList.vue   # 老朋友列表
│       ├── PaginationControl.vue # 分页控制
│       ├── QuerySection.vue     # 查询区域
│       ├── SpeakingBar.vue      # 发言状态栏
│       ├── StationControl.vue   # 站点控制
│       ├── Top20Summary.vue     # 排行榜统计
│       ├── constants.js         # 常量定义
│       └── modals/             # 弹窗组件
│           ├── AprsRemoteControl.vue    # APRS 远程控制
│           ├── CallsignRecordsModal.vue # 呼号记录弹窗
│           ├── DetailModal.vue          # 详情弹窗
│           ├── SettingsModal.vue        # 设置弹窗
│           ├── SpeakingHistoryModal.vue # 发言历史弹窗
│           └── StationListModal.vue     # 服务器列表弹窗
├── composables/            # 组合式 API（业务逻辑）
│   ├── useAprsControl.js    # APRS 远程控制
│   ├── useConfirm.js        # 确认对话框
│   ├── useDataQuery.js      # 数据查询
│   ├── useDbManager.js      # 数据库管理
│   ├── useFmoSync.js        # FMO 同步
│   ├── useSettings.js       # 应用设置
│   ├── useSpeakingStatus.js # 发言状态
│   └── useToast.js          # 提示消息
├── services/               # 服务层
│   ├── db.js               # IndexedDB 操作
│   └── fmoApi.js           # FMO API 封装
├── stores/                 # Pinia 状态管理
├── router/                 # 路由配置
├── utils/                  # 工具函数
└── views/                  # 页面视图
    ├── MainLayout.vue      # 主布局
    ├── LogsView.vue        # 通联日志页
    ├── Top20View.vue       # 排行榜页
    └── OldFriendsView.vue  # 老朋友页
```

## 🙏 特别感谢

- **BG5ESN**：提供完美的 FMO 硬件平台
- **BG9JYT**：提供甘肃集群服务器，并提供被控支持
- **BG2LRU、BD6JDU、BI3SQP 等各位友台**：提供宝贵的想法和建议

## 📄 开源许可

本项目采用 [MIT License](./LICENSE) 开源许可证。

## 👨‍💻 贡献者

- **BH5HSJ 后视镜**：项目创建与主要开发
- **BG9JYT**：APRS 远程控制功能开发

欢迎提交 Issue 和 Pull Request！
