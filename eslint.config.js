import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier/recommended'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{js,mjs,vue}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        console: 'readonly',
        document: 'readonly',
        process: 'readonly',
        indexedDB: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        WebSocket: 'readonly',
        alert: 'readonly',
        navigator: 'readonly',
        IDBKeyRange: 'readonly',
        localStorage: 'readonly',
        Blob: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        AbortSignal: 'readonly',
        TextDecoder: 'readonly',
        TextEncoder: 'readonly',
        history: 'readonly',
        location: 'readonly',
        FileReader: 'readonly',
        atob: 'readonly'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'off'
    }
  },
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'android/**',
      'ios/**',
      'release/**',
      '.xcode-derived-data/**'
    ]
  }
]
