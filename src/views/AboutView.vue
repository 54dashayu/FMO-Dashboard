<template>
  <div class="about-view">
    <section class="about-intro">
      <img src="/app-icon-384.png" :alt="t('app.name', 'FMO仪表盘')" class="about-logo" />
      <div>
        <div class="title-line">
          <h1>{{ t('app.name', 'FMO 仪表盘') }}</h1>
          <span>{{ appVersion }}</span>
        </div>
        <p>{{ t('about.intro', aboutIntroFallback) }}</p>
        <div class="intro-links">
          <a
            href="https://fmo.bh1jss.net/v2/"
            target="_blank"
            rel="noopener noreferrer"
            @click="handleExternalLinkClick($event, 'https://fmo.bh1jss.net/v2/')"
            >{{ t('about.v2Web', 'V2 网页版') }}</a
          >
          <a
            href="https://github.com/54dashayu/FMO-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            @click="handleExternalLinkClick($event, 'https://github.com/54dashayu/FMO-Dashboard')"
          >
            GitHub
          </a>
          <a
            href="https://github.com/54dashayu/FMO-Dashboard/issues"
            target="_blank"
            rel="noopener noreferrer"
            @click="
              handleExternalLinkClick($event, 'https://github.com/54dashayu/FMO-Dashboard/issues')
            "
          >
            {{ t('about.feedback', '问题反馈') }}
          </a>
        </div>
      </div>
    </section>

    <section class="version-section">
      <div class="version-heading">
        <span class="version-mark preview">V2</span>
        <div>
          <h2>{{ t('about.v2Title', 'V2 网页版新体验') }}</h2>
          <p>{{ t('about.v2Subtitle', '以桌面网页版为第一阶段，重新组织高频信息与操作入口。') }}</p>
        </div>
      </div>
      <div class="feature-grid">
        <article v-for="feature in v2Features" :key="feature.title">
          <span>{{ feature.icon }}</span>
          <div>
            <h3>{{ feature.title }}</h3>
            <p>{{ feature.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="coffee-section">
      <button type="button" class="coffee-toggle" @click="showCoffee = !showCoffee">
        <span>{{ t('about.coffee', '请作者喝杯咖啡') }}</span>
        <span aria-hidden="true">{{ showCoffee ? '−' : '+' }}</span>
      </button>
      <div v-if="showCoffee" class="coffee-content">
        <p>
          {{
            t(
              'about.coffeeBody',
              '如果 FMO 仪表盘对你有所帮助，欢迎通过收款二维码支持项目持续维护。'
            )
          }}
        </p>
        <div class="coffee-codes">
          <figure>
            <img src="/coffee/wechat.png" :alt="t('about.wechatPay', '微信支付')" />
            <figcaption>{{ t('about.wechatPay', '微信支付') }}</figcaption>
          </figure>
          <figure>
            <img src="/coffee/alipay.png" :alt="t('about.alipay', '支付宝')" />
            <figcaption>{{ t('about.alipay', '支付宝') }}</figcaption>
          </figure>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useLocale } from '../composables/useLocale'
import { handleExternalLinkClick } from '../utils/desktopBridge'

const appVersion = 'V2.05'
const showCoffee = ref(false)
const { t } = useLocale()
const aboutIntroFallback =
  '面向 FMO 守听、通联和日志管理的多端控制台。它将实时呼叫、当前中继、方位距离和最近通联放在第一屏，让电脑、平板与移动设备都能快速掌握通联现场。'

const v2Features = computed(() => [
  {
    icon: '▰',
    title: t('about.v2FirstScreen', '第一屏重新设计'),
    description: t(
      'about.v2FirstScreenDesc',
      '当前呼叫、上个通联、收藏中继和最近二十个通联集中呈现。'
    )
  },
  {
    icon: '↗',
    title: t('about.v2QuickActions', '高频入口前置'),
    description: t(
      'about.v2QuickActionsDesc',
      '日志、好友、排行榜、消息、设置和 FMO 控制可从首页直接进入。'
    )
  },
  {
    icon: '≡',
    title: t('about.v2TopBar', '统一单行顶部栏'),
    description: t(
      'about.v2TopBarDesc',
      '软件状态、通联统计、播报模式、主题、语言和设置集中在一行。'
    )
  },
  {
    icon: '★',
    title: t('about.v2FavoriteRelays', '收藏中继优先'),
    description: t(
      'about.v2FavoriteRelaysDesc',
      '服务器列表收藏项置顶，首页可直接滚动查看并切换中继。'
    )
  },
  {
    icon: '438',
    title: t('about.v2FmoDetails', 'FMO 详情增强'),
    description: t(
      'about.v2FmoDetailsDesc',
      '展示服务器编号，并从 FMO 通联详情读取真实频率与模式。'
    )
  },
  {
    icon: '◐',
    title: t('about.v2Themes', '全局主题系统'),
    description: t('about.v2ThemesDesc', 'Dashboard 与其他页面共享明暗主题和统一的界面视觉语言。')
  }
])
</script>

<style scoped>
.about-view {
  width: min(100%, 1080px);
  margin: 0 auto;
  padding: 1rem;
  box-sizing: border-box;
}

.about-intro,
.version-section,
.coffee-section {
  border: 1px solid var(--border-light);
  border-radius: 8px;
  background: var(--bg-card);
}

.about-intro {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
  padding: 1.2rem;
}

.about-intro > div,
.version-heading > div,
.feature-grid article > div {
  min-width: 0;
}

.about-logo {
  width: 72px;
  height: 72px;
  border-radius: 8px;
}

.title-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  align-items: center;
}

.title-line h1,
.version-heading h2 {
  margin: 0;
  color: var(--text-primary);
  letter-spacing: 0;
}

.title-line h1 {
  font-size: 1.45rem;
}

.title-line span {
  padding: 0.15rem 0.45rem;
  border: 1px solid var(--border-light);
  border-radius: 5px;
  color: var(--text-tertiary);
  font-size: 0.7rem;
}

.about-intro p,
.version-heading p,
.feature-grid p {
  color: var(--text-secondary);
  max-width: 100%;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: normal;
}

.about-intro p {
  max-width: 760px;
  margin: 0.45rem 0 0.75rem;
  font-size: 0.86rem;
  line-height: 1.65;
}

.intro-links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.intro-links a {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--border-light);
  border-radius: 6px;
  color: var(--color-primary);
  background: var(--bg-table-stripe);
  font-size: 0.76rem;
  text-decoration: none;
}

.version-section {
  margin-top: 0.75rem;
  padding: 1rem;
}

.version-heading {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--border-light);
}

.version-heading h2 {
  font-size: 1rem;
}

.version-heading p {
  margin: 0.18rem 0 0;
  font-size: 0.78rem;
  line-height: 1.55;
}

.version-mark {
  display: grid;
  min-width: 2.6rem;
  height: 2.1rem;
  place-items: center;
  border-radius: 6px;
  font-size: 0.76rem;
  font-weight: 800;
}

.version-mark.preview {
  color: var(--color-primary);
  background: var(--surface-accent);
}

.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem;
  margin-top: 0.85rem;
}

.feature-grid article {
  display: grid;
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.55rem;
  min-width: 0;
  max-width: 100%;
  padding: 0.7rem;
  border: 1px solid var(--border-light);
  border-radius: 7px;
  background: var(--bg-table-stripe);
  box-sizing: border-box;
}

.feature-grid article > span {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 6px;
  color: var(--color-primary);
  background: var(--surface-accent);
  font-size: 0.8rem;
  font-weight: 800;
}

.feature-grid h3 {
  margin: 0;
  color: var(--text-primary);
  font-size: 0.82rem;
  letter-spacing: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}

.feature-grid p {
  margin: 0.2rem 0 0;
  font-size: 0.72rem;
  line-height: 1.55;
}

.coffee-section {
  margin-top: 0.75rem;
  overflow: hidden;
}

.coffee-toggle {
  display: flex;
  width: 100%;
  min-height: 3.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  border: 0;
  color: var(--text-primary);
  background: transparent;
  font: inherit;
  font-size: 1rem;
  font-weight: 750;
  cursor: pointer;
}

.coffee-toggle:hover {
  background: var(--bg-table-stripe);
}

.coffee-content {
  padding: 0.85rem 1rem 1rem;
  border-top: 1px solid var(--border-light);
}

.coffee-content p {
  margin: 0 0 0.85rem;
  color: var(--text-tertiary);
  font-size: 0.76rem;
  text-align: center;
}

.coffee-codes {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.coffee-codes figure {
  margin: 0;
  text-align: center;
}

.coffee-codes img {
  display: block;
  width: 150px;
  height: 150px;
  padding: 6px;
  border-radius: 7px;
  background: #ffffff;
  object-fit: contain;
  box-sizing: border-box;
}

.coffee-codes figcaption {
  margin-top: 0.4rem;
  color: var(--text-secondary);
  font-size: 0.72rem;
}

@media (max-width: 800px) {
  .feature-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 520px) {
  .about-view {
    padding: 0.5rem;
  }

  .about-intro {
    grid-template-columns: 1fr;
  }

  .about-logo {
    width: 56px;
    height: 56px;
  }

  .feature-grid {
    grid-template-columns: 1fr;
  }

  .coffee-codes {
    gap: 0.75rem;
  }

  .coffee-codes img {
    width: 128px;
    height: 128px;
  }
}
</style>
