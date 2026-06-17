import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import legacy from '@vitejs/plugin-legacy'
import { fileURLToPath, URL } from 'node:url'

const legacyAndroidBuild = process.env.FMO_LEGACY_ANDROID === '1'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacyAndroidBuild &&
      legacy({
        targets: ['Chrome >= 55', 'Android >= 7'],
        modernPolyfills: true,
        renderLegacyChunks: true
      })
  ].filter(Boolean),
  build: {
    target: ['chrome61', 'safari13'],
    cssTarget: 'chrome61'
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '0.0.0.0'
  }
})
