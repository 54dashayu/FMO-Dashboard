<template>
  <div class="more-view">
    <div class="menu-list">
      <router-link
        v-for="route in MORE_ROUTES"
        :key="route.path"
        :to="route.path"
        class="menu-item"
      >
        <div class="menu-icon">
          <SvgIcon :name="route.icon" :size="20" />
        </div>
        <div class="menu-content">
          <div class="menu-label">{{ route.label }}</div>
          <div v-if="route.description" class="menu-desc">{{ route.description }}</div>
        </div>
        <svg
          class="menu-arrow"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { MORE_ROUTES } from '../components/home/constants'
import SvgIcon from '../components/common/SvgIcon.vue'
</script>

<style scoped>
.more-view {
  height: 100%;
  overflow-y: auto;
  padding: 1.5rem;
}

.menu-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: 12px;
  text-decoration: none;
  color: var(--text-primary);
  transition: all 0.2s ease;
  cursor: pointer;
}

.menu-item:hover {
  border-color: var(--color-success);
  background: var(--bg-table-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--shadow-card);
}

.menu-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(103, 194, 58, 0.12);
  color: var(--color-success);
  border-radius: 10px;
  flex-shrink: 0;
}

.menu-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.menu-label {
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-primary);
}

.menu-desc {
  font-size: 0.75rem;
  font-weight: 400;
  color: var(--text-tertiary);
  letter-spacing: 0.02em;
  line-height: 1.4;
}

.menu-arrow {
  width: 18px;
  height: 18px;
  color: var(--text-disabled);
  flex-shrink: 0;
  transition: color 0.2s;
}

.menu-item:hover .menu-arrow {
  color: var(--color-success);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .more-view {
    padding: 1rem;
  }

  .menu-list {
    grid-template-columns: 1fr;
  }

  .menu-item {
    padding: 0.875rem 1rem;
  }

  .menu-icon {
    width: 36px;
    height: 36px;
  }
}
</style>
