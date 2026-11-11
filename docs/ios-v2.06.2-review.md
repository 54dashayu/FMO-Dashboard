# iOS V2.06.2 审核资料

## 本次更新

本次更新优化通联位置与手机显示体验：

- 优先使用本次 FMO 通联携带的网格或经纬度；缺少时显示 APRS 最近位置，无位置保持“-”。
- 简化位置来源标注，APRS 最近位置不代表当前实时位置。
- 自动识别 Passport、M5（ESP32）、RedDV 等接入模式，改善模式与中继列表排版。
- 修复 iPhone 竖屏“上个通联”地址被裁切、英文待机文字拥挤的问题，并优化 iPad 显示。

保留 iOS/iPadOS 不启用自动定位或后台持续定位的设置。

## 提审前基线纠正

App Store Connect 的已发布版 2.06.1（20803）说明包含 iOS 27 启动修复、App 备案号以及关闭定位。本地旧工程重新打包出的 20802 不完整：注册了定位插件、开启定位能力和后台定位声明，且缺少备案号。20802 已上传但未提交审核，不能用它替代现有公开版。

本轮重新打包为 2.06.2（20804）：不注册 iOS 原生定位插件、不在桥接启动时实例化 CLLocationManager；iOS 使用无操作定位服务并关闭定位页面能力；移除定位用途及后台定位声明，恢复 App 底部备案号展示。需重新完成 iOS 27 启动验收并上传后，关联 20804。

实测进一步发现旧 UIKit 生命周期在 iOS 27 上 SIGTRAP 退出。按 Apple TN3187 增加 UIApplicationSceneManifest 和 SceneDelegate，Main storyboard 自动创建窗口，并将 URL/Universal Link 路由和音频恢复转接到 scene 生命周期。最终归档为 output/ios/v2.06.2-20804-scene/FMO-Dashboard.xcarchive，未采用先前的无 scene 归档。官方依据：https://developer.apple.com/documentation/technotes/tn3187-migrating-to-the-uikit-scene-based-life-cycle 。

## 审核备注

本 App 无需账号登录，用于连接用户自己的 FMO 设备，或查看导入的 FMO 通联日志。可在“更多/设置”中添加 FMO 地址，或导入 FMO 日志数据库。

V2.06.2 优化 QTH 位置优先级、APRS 最近位置回退、接入模式识别和 iPhone 竖屏布局。包内网格或经纬度优先，缺少时才使用后台缓存的 APRS 最近位置，不代表对方当前位置。客户端不内置 APRS 密钥。

iOS/iPadOS 不启用自动定位或后台持续定位，不提供无线电发射功能。App 底部展示中国大陆 App 备案号：鲁ICP备2026051181号-2A；联网服务域名：fmo.bh1jss.net。

## 构建与模拟器验收记录（2026-11-12）

- 最终构建：2.06.2（20804），scene 归档编译成功，01:15 Apple 上传成功（EXPORT SUCCEEDED），随后进入 Apple 处理。
- 专用 iPhone 14 Pro Max / iOS 27.0 模拟器冷启动成功，仪表盘、更多、关于均正常打开；关于显示 V2.06.2，底部备案号可见，没有自动定位入口或启动定位授权弹窗。
- 截图：`output/ios/v262-20804-scene-ios27.png`。此前 iOS 26.5 的 iPhone/iPad 版式测试另有截图保留。
- 20802 不用于提交；最终关联与审核状态以下续记为准。

### 最终构建递增至 20805

20804 经 Apple 处理完成，但收到 90683 定位用途声明警告：未启用的 FmoLocationPlugin 仍属于编译源。20805 从 iOS Sources 编译阶段排除该文件（保留源码），没有为消除警告重新启用定位或增加用途声明。归档和模拟器构建均成功；归档二进制 strings 检查未再检出 FmoLocationPlugin、CLLocationManager 或两项定位授权调用。

最终归档：`output/ios/v2.06.2-20805/FMO-Dashboard.xcarchive`。专用 iOS 27 / iPhone 14 Pro Max 模拟器覆盖安装并冷启动后，仪表盘正常加载，无定位授权弹窗；截图 `output/ios/v262-20805-ios27-dashboard.png`。上传与审核状态继续下记。

## 发布设置

用户于 2026-11-12 明确授权填写资料、提交审核、审核通过后自动发布。选择“自动发布此版本”，立即向所有用户发布更新；不重设评分，不修改定价或销售地区。沿用既有 iPhone/iPad 各六张截图，保留既有联系信息和不需要登录的设置。
