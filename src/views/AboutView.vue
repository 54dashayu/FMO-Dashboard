<template>
  <div class="about-view">
    <h1 class="page-title">关于</h1>
    <div class="about-header">
      <div class="about-left">
        <img src="/app-icon.png" alt="FMO仪表盘" class="about-logo" />
        <div class="about-title">FMO仪表盘</div>
        <div class="about-version">{{ appVersion }}</div>
      </div>
      <div class="about-description">
        <p>
          FMO仪表盘 是基于 FmoLogs 改进的 FMO 网页工具，目标是把“正在通联、当前中继、最近通联”
          放在最直观的位置，方便电台旁边的电脑、平板和手机快速查看。
        </p>
        <p>本版本保留原项目的日志查看能力，并围绕仪表盘、中继切换、呼号提醒和本地便携运行做了增强。</p>
        <p class="about-links-text">
          <a
            href="https://github.com/54dashayu/FMO-Dashboard"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-link"
          >
            GitHub 仓库
          </a>
          ·
          <a
            href="https://github.com/54dashayu/FMO-Dashboard/issues"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-link"
          >
            问题反馈
          </a>
        </p>
      </div>
    </div>

    <div class="about-section">
      <div class="section-title">主要功能</div>
      <ul class="feature-list">
        <li>仪表盘首页显示当前通联呼号、时间、QTH、相对方位和距离。</li>
        <li>最近通联列表实时刷新，支持呼号去重、已通联星标和本人呼号标记。</li>
        <li>中继名称可点击切换，远程控制页支持查看当前中继和收藏状态。</li>
        <li>呼号可跳转到 QRZ 查询页面，便于快速确认对方资料。</li>
        <li>新呼号提示可播放呼号和提示音，也可切换为通联播报或关闭所有播报。</li>
        <li>支持本地 Win64 便携包、安卓测试包和 VPS 部署访问。</li>
      </ul>
    </div>

    <div class="about-section">
      <div class="section-title">在 BH5HSJ 原项目基础上的改进</div>
      <ul class="feature-list">
        <li>将仪表盘作为更适合实时守听的入口，并调整导航顺序。</li>
        <li>增加 FMO 中继控制、日志中继快捷切换和收藏状态显示。</li>
        <li>优化移动端仪表盘排版，减少字体包体积，降低服务器流量。</li>
        <li>增加 VPS 统计页部署说明，便于了解访问量和大致流量。</li>
        <li>补充 Windows 便携运行说明，让不熟悉开发环境的用户也能解压即用。</li>
      </ul>
    </div>

    <div class="about-thanks">
      <div class="thanks-title">特别感谢</div>
      <div class="thanks-list">
        <div v-for="person in thanksList" :key="person.name" class="thanks-item">
          <strong>{{ person.name }}</strong> - {{ person.contribution }}
        </div>
      </div>
    </div>

    <div v-if="sponsorList.length > 0" class="about-sponsors">
      <div class="sponsors-title">赞助名单</div>
      <div class="sponsors-list">
        <span v-for="sponsor in sponsorList" :key="sponsor" class="sponsor-tag">{{ sponsor }}</span>
      </div>
    </div>

    <div class="about-coffee">
      <div class="coffee-toggle" @click="showCoffee = !showCoffee">
        <span>请作者喝杯咖啡</span>
      </div>
      <div v-if="showCoffee" class="coffee-content">
        <p class="coffee-hint">如果这个项目对你有帮助，欢迎支持一下</p>
        <div class="coffee-qrcode-list">
          <div class="coffee-item">
            <div class="coffee-qrcode-wrap">
              <img src="/coffee/wechat.png" alt="微信收款码" class="coffee-qrcode" />
            </div>
            <span class="coffee-label">微信支付</span>
          </div>
          <div class="coffee-item">
            <div class="coffee-qrcode-wrap">
              <img src="/coffee/alipay.png" alt="支付宝收款码" class="coffee-qrcode" />
            </div>
            <span class="coffee-label">支付宝</span>
          </div>
        </div>
      </div>
    </div>

    <div class="about-footer">
      <p>由 BH1JSS 机婶婶 贡献</p>
      <p>开源项目 · 欢迎贡献</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import packageInfo from '../../package.json'
import sponsorList from '../data/sponsors.json'
import thanksList from '../data/thanks.json'

const appVersion = computed(() => `v${packageInfo.version}`)

const showCoffee = ref(false)
</script>

<style scoped>
.about-view {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: 1.5rem;
}

.about-header {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  margin-bottom: 1.25rem;
  width: 100%;
  max-width: 500px;
}

.about-left {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
}

.about-logo {
  width: 64px;
  height: 64px;
}

.about-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
}

.about-version {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-family: monospace;
  background: var(--bg-input);
  padding: 0.15rem 0.5rem;
  border-radius: 12px;
}

.about-description {
  flex: 1;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.6;
  text-align: left;
}

.about-description p {
  margin: 0 0 0.6rem 0;
}

.about-description p:last-child {
  margin-bottom: 0;
}

.about-links-text {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-light);
}

.inline-link {
  color: var(--color-primary);
  text-decoration: none;
  transition: all 0.2s;
  font-weight: 500;
}

.inline-link:hover {
  color: var(--color-primary-hover);
  text-decoration: underline;
}

.about-section {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
  text-align: center;
}

.feature-list {
  margin: 0;
  padding-left: 1.15rem;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.65;
}

.feature-list li + li {
  margin-top: 0.35rem;
}

.about-thanks {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.25rem;
  background: var(--bg-table-header);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 1rem 1.25rem;
}

.thanks-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 1.2rem;
  text-align: center;
}

.thanks-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.thanks-item {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--text-secondary);
  margin-bottom: 0.3rem;
}

.thanks-item:last-child {
  margin-bottom: 0;
}

.about-coffee {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.25rem;
  background: transparent;
  border: 1px solid var(--border-light);
  border-radius: 12px;
  overflow: hidden;
}

.coffee-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.85rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.coffee-content {
  padding: 0 1.25rem 1.25rem;
}

.coffee-hint {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin: 0 0 0.75rem 0;
}

.coffee-qrcode-list {
  display: flex;
  justify-content: center;
  gap: 2rem;
}

.coffee-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.coffee-qrcode-wrap {
  width: 140px;
  height: 140px;
  border-radius: 8px;
  background: #ffffff;
  padding: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.coffee-qrcode {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.coffee-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.about-sponsors {
  width: 100%;
  max-width: 500px;
  margin-bottom: 1.25rem;
  text-align: center;
}

.sponsors-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 0.75rem;
}

.sponsors-list {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.sponsor-tag {
  font-size: 0.85rem;
  color: var(--text-secondary);
  background: var(--bg-table-header);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  padding: 0.3rem 0.75rem;
}

.about-footer {
  text-align: center;
  font-size: 0.8rem;
  color: var(--text-tertiary);
  margin-top: auto;
  padding-top: 0.75rem;
}
</style>
