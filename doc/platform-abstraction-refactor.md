# 三层架构重构实施记录

## 目标

将 Web、Tauri 桌面、Capacitor Android 三端统一为同一份 Vue 代码基，通过平台抽象层屏蔽差异，并把所有跨视图共享状态下沉到 Pinia store。

## 架构分层

```
src/
├── views/, components/           ← Vue 展示层（平台无关）
├── stores/                       ← Pinia 状态层（平台无关）
│   ├── audioPlayerStore.ts
│   ├── settingsStore.ts
│   ├── syncStore.ts
│   ├── messageStore.ts
│   ├── speakingStore.ts
│   ├── aprsStore.ts
│   └── index.js
├── core/                         ← 纯函数业务逻辑（与 Vue 解耦）
│   ├── sync/syncEngine.ts
│   └── aprs/aprsCodec.ts
├── platform/
│   ├── interfaces/               ← 平台能力接口
│   │   ├── IAudioService.ts
│   │   ├── IStorageService.ts
│   │   ├── IGridService.ts
│   │   ├── IEventsService.ts
│   │   ├── IAprsService.ts
│   │   └── IBackgroundService.ts
│   ├── web/                      ← Web/Tauri 实现（WebSocket/WebAudio）
│   │   ├── AudioService.web.ts
│   │   ├── StorageService.web.ts
│   │   ├── GridService.web.ts
│   │   ├── EventsService.web.ts
│   │   ├── AprsService.web.ts
│   │   └── BackgroundService.web.ts
│   ├── native-capacitor/         ← Android 实现（Capacitor 插件 / Preferences）
│   │   ├── AudioService.native.ts
│   │   ├── StorageService.native.ts
│   │   ├── GridService.native.ts
│   │   ├── EventsService.native.ts
│   │   ├── AprsService.native.ts
│   │   └── BackgroundService.native.ts
│   └── index.ts                  ← getPlatform() 工厂（Capacitor.isNativePlatform）
└── services/                     ← 轻量 API 客户端 / 数据库
    ├── audioPlayer.js            ← WebAudio 底层（被 AudioService.web 引用）
    ├── db.js                     ← IndexedDB 封装
    ├── fmoApi.js                 ← HTTP REST 客户端
    ├── gridService.js            ← 兼容薄层（re-export platform.grid）
    └── messageService.js         ← messageStore facade（保持 getMessageService() 原签名）
```

## PR 实施清单

| PR | 范围 | 关键产物 |
| --- | --- | --- |
| PR-0 | 基建 | tsconfig、Pinia 挂载、`platform/` 骨架 |
| PR-0.5 | 桥接 | `main.js` 预热 `getPlatform()` |
| PR-1 | Grid | `IGridService` + Web/Native 实现，`gridService.js` 降级为薄层 |
| PR-2 | APRS | `aprsCodec` 提纯 + `IAprsService` + `aprsStore` |
| PR-2a | APRS 收尾 | `AprsService.native` 直调 Capacitor 插件，删除 `fmoNativeAprs.js`/`useAprsControl.js`/`aprsUtils.js` |
| PR-3 | Events | `IEventsService` + `speakingStore`（WebSocket 多连接管理） |
| PR-4 | Audio + Background | `IAudioService` + `IBackgroundService` + `audioPlayerStore` |
| PR-5 | Settings + Storage | `IStorageService`（Native 用 `@capacitor/preferences`）+ `settingsStore` |
| PR-6 | Sync | `core/sync/syncEngine.ts` 纯函数 + `syncStore`（setContext/teardown 生命周期） |
| PR-7 | Message | `messageStore` 承载 WebSocket/请求队列，`messageService.js` 降级为 facade |
| PR-8 | 收尾 | 删除 4 个 composable 薄层（useSettings/useSpeakingStatus/useFmoSync/useAudioPlayer），MainLayout.vue 直连 store |

## PR-8 清理成果

删除的文件：
- `src/composables/useSettings.js`
- `src/composables/useSpeakingStatus.js`
- `src/composables/useFmoSync.js`
- `src/composables/useAudioPlayer.js`
- `src/services/fmoNativeAprs.js`
- `src/services/fmoNativeAudio.js`
- `src/services/fmoNativeEvents.js`
- `src/services/fmoNativeGrid.js`
- `src/utils/aprsUtils.js`

改造的唯一调用方：`src/views/MainLayout.vue` 在 `<script setup>` 顶部直接用 `useXxxStore()` + `storeToRefs`，构造与原 composable 同名同字段的本地对象，使下游所有 `settings.xxx.value` / `speakingStatus.xxx.value` / `fmoSync.xxx.value` 调用点零修改。

附带删除死代码 `speakingStatus.stopSpeakingHistoryCleanup()`（该方法从未实现），由 `_syncStore.teardown()` 替代于 `onUnmounted` 中清理 sync timer。

## 关键约束

1. **TypeScript 渐进迁移**：`tsconfig.json` 采用 `strict: false` + `allowJs: true`，平台层/核心逻辑用 `.ts`，视图层保持 `.js` / `.vue`。
2. **Pinia 使用 Setup Syntax**：`defineStore(id, () => { ... })` 返回 ref/computed/action，响应性通过 `storeToRefs` 保留。
3. **平台接口优先**：新功能必须先定义接口，然后 Web/Native 分别实现；store 只依赖接口。
4. **纯函数与状态分离**：`core/` 下禁止引用 Vue/Pinia，仅导出纯函数 + TS 类型。
5. **facade 兼容**：`services/messageService.js`、`services/gridService.js` 保留作为外部 API 边界，内部转调 store/platform，避免调用方改动。
