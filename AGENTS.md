# AGENTS.md

## Commands

```bash
npm run dev          # Vite dev server (binds 0.0.0.0, LAN-accessible)
npm run build        # Vite production build → dist/
npm run lint         # ESLint (flat config) + Prettier, auto-fix
npm run format       # Prettier only (src/)
npm run typecheck    # vue-tsc --noEmit
npm run tauri:dev    # Tauri desktop dev
npm run tauri:build  # Tauri desktop release build
npm run cap:build    # Build frontend + Capacitor sync (prereq for Android)
npm run android:deploy  # Full Android build + install + launch
```

**Verification order**: `lint` → `typecheck` → `build`. TypeScript is not checked at build time.

## Architecture

Three-layer design with platform abstraction:

```
Views (platform-agnostic, .vue)
  → Stores (Pinia Setup Syntax, .ts)
    → Core (pure functions, no Vue/Pinia deps)
    → Platform (interfaces + web/native impls)
```

- **`src/core/`** — pure business logic. Must NOT import Vue, Pinia, or platform code.
- **`src/stores/`** — all stores use `defineStore(id, () => { ... })` (Setup Syntax), never Options API.
- **`src/platform/`** — `getPlatform()` (singleton) returns `Platform`. If `Capacitor.isNativePlatform() && platform === 'android'` → native; otherwise → web. Tauri desktop uses the web path.
- **`src/services/`** — `messageService.js` and `gridService.js` are **facades** wrapping stores/platform. Do NOT add new logic here; put it in stores or core.

## TypeScript

- `strict: false`, `allowJs: true`, `checkJs: false` — progressive migration from JS.
- Only `.ts`, `.d.ts`, `.vue` files are typechecked. `.js` files are NOT.
- Path alias `@` → `src/` is configured in both `vite.config.js` and `tsconfig.json`.

## Platform-specific code

- `/location-report` route is defined **only when** `getPlatform().capabilities.hasNativeLocation` (Android only). Tests/web won't have it.
- `src/platform/web/` is used for both browser and Tauri desktop.
- Android native plugins live in `android/app/src/main/java/` (Java) and `src/platform/native-capacitor/` (TypeScript wrappers).

## Android prerequisites

- Java 21 (Zulu SDK), managed via `sdkman` (`.sdkmanrc` at repo root).
- Icons require ImageMagick (`convert` command) for generation.

## Conventions

- Prettier: `semi: false`, `singleQuote: true`, `trailingComma: "none"`, `printWidth: 100`.
- ESLint flat config (`eslint.config.js`), rule: `vue/multi-word-component-names: off`.
- No pre-commit hooks.
- ES modules (`"type": "module"` in `package.json`).
- UI language is Chinese (zh-CN); code comments are mixed Chinese/English.
