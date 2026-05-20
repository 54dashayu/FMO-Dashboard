import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import prettier from 'eslint-plugin-prettier/recommended'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.{js,vue}'],
    languageOptions: {
      globals: {
        window: 'readonly',
        console: 'readonly',
        document: 'readonly',
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
        URL: 'readonly'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**']
  }
]
