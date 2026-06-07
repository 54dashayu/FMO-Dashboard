<template>
  <template v-if="isPublicVps">
    <button
      class="public-tool-btn download-tool-btn"
      type="button"
      :title="t('public.download', '下载 1.0')"
      :aria-label="t('public.download', '下载')"
      @click="showDownloads = true"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14" />
      </svg>
      <span>{{ t('public.download', '下载') }}</span>
    </button>
    <button
      class="public-tool-btn"
      type="button"
      :title="t('public.wechat', '微信群二维码')"
      :aria-label="t('public.wechat', '微信群二维码')"
      @click="showWechat = true"
    >
      <svg class="wechat-icon" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M10.2 4.4c-4 0-7.2 2.6-7.2 5.8 0 1.8 1 3.4 2.7 4.5l-.7 2.2 2.6-1.3c.8.2 1.7.4 2.6.4h.4a5.8 5.8 0 0 1-.3-1.8c0-3.4 3.2-6.1 7.1-6.1h.2c-1-2.2-3.9-3.7-7.4-3.7Z"
        />
        <path
          d="M21.5 14.3c0-2.7-2.7-4.9-6-4.9s-6 2.2-6 4.9 2.7 4.9 6 4.9c.8 0 1.5-.1 2.2-.3l2.1 1-.6-1.8c1.4-.9 2.3-2.3 2.3-3.8Z"
        />
        <circle cx="7.7" cy="9.5" r=".7" />
        <circle cx="12.2" cy="9.5" r=".7" />
        <circle cx="13.4" cy="13.7" r=".6" />
        <circle cx="17.3" cy="13.7" r=".6" />
      </svg>
    </button>

    <Teleport to="body">
      <div v-if="showDownloads" class="wechat-overlay" @click.self="showDownloads = false">
        <section class="download-dialog" role="dialog" aria-modal="true">
          <button
            class="wechat-close"
            type="button"
            :aria-label="t('common.close', '关闭')"
            @click="showDownloads = false"
          >
            ×
          </button>
          <div class="download-heading">
            <strong>V2.00</strong>
            <div>
              <h2>{{ t('public.downloadTitle', 'FMO 仪表盘下载') }}</h2>
              <p>
                {{ t('public.downloadHint', '请选择适合设备的安装包。') }}
              </p>
            </div>
          </div>
          <div class="download-list">
            <a
              v-for="item in downloads"
              :key="item.url"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="download-platform">{{ item.icon }}</span>
              <span>
                <strong>{{ t(item.titleKey, item.title) }}</strong>
                <small>{{ t(item.hintKey, item.hint) }}</small>
              </span>
              <b>↓</b>
            </a>
          </div>
        </section>
      </div>

      <div v-if="showWechat" class="wechat-overlay" @click.self="showWechat = false">
        <section class="wechat-dialog" role="dialog" aria-modal="true">
          <button
            class="wechat-close"
            type="button"
            :aria-label="t('common.close', '关闭')"
            @click="showWechat = false"
          >
            ×
          </button>
          <h2>{{ t('public.wechatTitle', 'FMO 仪表盘软件测试群') }}</h2>
          <img src="/wechat-group.jpg" :alt="t('public.wechat', '微信群二维码')" />
          <p>{{ t('public.wechatHint', '请使用微信扫码入群，二维码可能会定期更新。') }}</p>
        </section>
      </div>
    </Teleport>
  </template>
</template>

<script setup>
import { ref } from 'vue'
import { useLocale } from '../../composables/useLocale'

const { t } = useLocale()
const showWechat = ref(false)
const showDownloads = ref(false)
const isPublicVps = window.location.hostname === 'fmo.bh1jss.net'
const releaseBase = 'https://github.com/54dashayu/FMO-Dashboard/releases/download/v1.0.0'
const vpsDownloadBase = 'https://fmo.bh1jss.net/downloads'
const downloads = [
  {
    icon: 'WIN',
    titleKey: 'public.windowsExe',
    title: 'Windows 便携版 EXE',
    hintKey: 'public.windowsExeHint',
    hint: '推荐下载，下载后直接运行。',
    url: `${releaseBase}/FMO-Dashboard-Windows-Portable-v1.0.0.exe`
  },
  {
    icon: 'ZIP',
    titleKey: 'public.windowsZip',
    title: 'Windows 便携版 ZIP',
    hintKey: 'public.windowsZipHint',
    hint: '解压后运行，适合 EXE 下载被拦截时使用。',
    url: `${releaseBase}/FMO-Dashboard-Windows-Portable-v1.0.0.zip`
  },
  {
    icon: 'APK',
    titleKey: 'public.androidApk',
    title: 'Android APK V2.00',
    hintKey: 'public.androidApkHint',
    hint: 'V2.00 移动版，适用于安卓手机和平板。',
    url: `${vpsDownloadBase}/FMO-Dashboard-Android-V2.00.apk`
  },
  {
    icon: 'iOS',
    titleKey: 'public.iosApp',
    title: 'iOS App Store',
    hintKey: 'public.iosAppHint',
    hint: '前往 App Store 下载 FMO Dashboard。',
    url: 'https://apps.apple.com/cn/app/fmo-dashboard/id6772919070'
  }
]
</script>

<style scoped>
.public-tool-btn {
  display: flex;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--text-secondary);
  background: var(--bg-table-stripe);
  box-sizing: border-box;
  cursor: pointer;
}

.download-tool-btn {
  width: auto;
  gap: 0.35rem;
  padding: 0 0.65rem;
  font: inherit;
  font-size: 0.76rem;
  font-weight: 700;
  white-space: nowrap;
}

.public-tool-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.public-tool-btn svg {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.public-tool-btn .wechat-icon {
  width: 1.2rem;
  height: 1.2rem;
  fill: #20c66b;
  stroke: none;
}

.wechat-overlay {
  position: fixed;
  z-index: 10000;
  display: grid;
  inset: 0;
  place-items: center;
  padding: 1rem;
  background: rgb(0 0 0 / 72%);
}

.wechat-dialog {
  position: relative;
  width: min(92vw, 390px);
  max-height: 90vh;
  overflow: auto;
  padding: 1rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--bg-card);
  box-sizing: border-box;
  box-shadow: 0 18px 50px rgb(0 0 0 / 35%);
}

.download-dialog {
  position: relative;
  width: min(92vw, 520px);
  padding: 1rem;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  color: var(--text-primary);
  background: var(--bg-card);
  box-sizing: border-box;
  box-shadow: 0 18px 50px rgb(0 0 0 / 35%);
}

.download-heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
  padding-right: 2rem;
}

.download-heading > strong {
  display: grid;
  width: 3.25rem;
  height: 3.25rem;
  place-items: center;
  border: 1px solid var(--color-primary);
  border-radius: 7px;
  color: var(--color-primary);
  background: var(--surface-accent);
  font-size: 1rem;
}

.download-heading h2,
.download-heading p {
  margin: 0;
}

.download-heading h2 {
  font-size: 1rem;
}

.download-heading p {
  margin-top: 0.25rem;
  color: var(--text-tertiary);
  font-size: 0.72rem;
  line-height: 1.45;
}

.download-list {
  display: grid;
  gap: 0.5rem;
  margin-top: 1rem;
}

.download-list a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  color: var(--text-primary);
  background: var(--bg-table-stripe);
  text-decoration: none;
}

.download-list a:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.download-list a span:nth-child(2) {
  display: grid;
  gap: 0.2rem;
}

.download-list small {
  color: var(--text-tertiary);
  font-size: 0.7rem;
  line-height: 1.4;
}

.download-platform {
  min-width: 2.4rem;
  padding: 0.25rem 0.35rem;
  border-radius: 5px;
  color: var(--text-primary);
  background: var(--surface-accent);
  font-size: 0.65rem;
  font-weight: 800;
  text-align: center;
}

.wechat-dialog h2 {
  margin: 0 2rem 0.8rem 0;
  font-size: 1rem;
}

.wechat-dialog img {
  display: block;
  width: 100%;
  border-radius: 6px;
}

.wechat-dialog p {
  margin: 0.8rem 0 0;
  color: var(--text-tertiary);
  font-size: 0.75rem;
  line-height: 1.5;
}

.wechat-close {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  display: grid;
  width: 2rem;
  height: 2rem;
  min-width: 2rem;
  min-height: 2rem;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--text-secondary);
  background: var(--bg-table-stripe);
  box-sizing: border-box;
  font:
    400 1.2rem/1 Arial,
    sans-serif;
  text-align: center;
  cursor: pointer;
}

.wechat-close:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
</style>
