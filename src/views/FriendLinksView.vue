<template>
  <div class="friend-links-view">
    <div class="links-card-grid">
      <a
        v-for="link in friendLinksList"
        :key="link.id"
        :href="link.url"
        target="_blank"
        rel="noopener noreferrer"
        class="link-card"
        :class="{ disabled: link.disabled }"
        :title="link.description"
      >
        <div class="link-icon">
          <template v-if="link.icon.type === 'emoji'">
            {{ link.icon.content }}
          </template>
          <template v-else-if="link.icon.type === 'svg'">
            <span v-html="link.icon.content"></span>
          </template>
          <template v-else-if="link.icon.type === 'url'">
            <img :src="link.icon.content" :alt="link.name" />
          </template>
        </div>
        <div class="link-info">
          <div class="link-name">
            {{ link.name }}
            <span
              v-if="link.tag"
              class="link-tag"
              :class="link.tagType ? `tag-${link.tagType}` : 'tag-info'"
            >
              {{ link.tag }}
            </span>
          </div>
          <div class="link-url">{{ link.displayUrl }}</div>
        </div>
        <div class="link-arrow">&rarr;</div>
      </a>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getProcessedLinks } from '../components/home/modals/friendLinks'

const props = defineProps({
  fmoAddress: {
    type: String,
    default: ''
  }
})

const friendLinksList = computed(() => getProcessedLinks(props.fmoAddress))
</script>

<style scoped>
.friend-links-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.links-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.link-card {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-secondary);
  border-radius: 12px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.link-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-primary);
  box-shadow: 0 8px 16px var(--shadow-card);
  background: var(--bg-table-hover);
}

.link-card.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  pointer-events: none;
}

.link-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-input);
  border-radius: 10px;
  font-size: 1.4rem;
  margin-right: 1rem;
  flex-shrink: 0;
  border: 1px solid var(--border-light);
  overflow: hidden;
}

.link-icon svg {
  width: 100%;
  height: 100%;
}

.link-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
  margin-bottom: 0.2rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.link-tag {
  font-size: 0.65rem;
  font-weight: 500;
  padding: 0.15rem 0.4rem;
  border-radius: 3px;
  flex-shrink: 0;
  border: 1px solid;
}

.link-tag.tag-info {
  background: rgba(64, 158, 255, 0.1);
  color: var(--color-primary);
  border-color: rgba(64, 158, 255, 0.3);
}

.link-tag.tag-warn {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.3);
}

.link-tag.tag-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.3);
}

.link-url {
  font-size: 0.8rem;
  color: var(--text-tertiary);
  font-family: monospace;
}

.link-arrow {
  font-size: 1.2rem;
  color: var(--text-disabled);
  transition: all 0.3s;
  margin-left: 0.5rem;
  opacity: 0.3;
}

.link-card:hover .link-arrow {
  color: var(--color-primary);
  transform: translateX(3px);
  opacity: 1;
}
</style>
