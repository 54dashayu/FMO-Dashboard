<template>
  <div v-if="totalPages >= 1" class="pagination">
    <button
      :disabled="disabled || currentPage === 1"
      class="page-btn nav-btn"
      @click="$emit('page-change', 1)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="14"
        height="14"
      >
        <polyline points="11 17 6 12 11 7" />
        <polyline points="18 17 13 12 18 7" />
      </svg>
    </button>
    <button
      :disabled="disabled || currentPage === 1"
      class="page-btn"
      @click="$emit('page-change', currentPage - 1)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="14"
        height="14"
      >
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>
    <div class="page-info">
      <input
        type="number"
        class="page-jump-input"
        :value="currentPage"
        :min="1"
        :max="totalPages"
        :disabled="disabled"
        @change="handleJump"
        @focus="$event.target.select()"
      />
      <span class="page-sep">/</span>
      <span class="page-total">{{ totalPages }}</span>
      <template v-if="totalRecords !== undefined">
        <span class="page-total-records">共 {{ totalRecords }} 条</span>
      </template>
    </div>
    <button
      :disabled="disabled || currentPage === totalPages || totalPages === 0"
      class="page-btn"
      @click="$emit('page-change', currentPage + 1)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="14"
        height="14"
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
    <button
      :disabled="disabled || currentPage === totalPages || totalPages === 0"
      class="page-btn nav-btn"
      @click="$emit('page-change', totalPages)"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        width="14"
        height="14"
      >
        <polyline points="13 17 18 12 13 7" />
        <polyline points="6 17 11 12 6 7" />
      </svg>
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  },
  totalRecords: {
    type: Number,
    default: undefined
  },
  disabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['page-change'])

function handleJump(event) {
  const val = parseInt(event.target.value, 10)
  if (!isNaN(val) && val >= 1 && val <= props.totalPages) {
    emit('page-change', val)
  } else {
    event.target.value = props.currentPage
  }
}
</script>

<style scoped>
.pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.75rem 0;
  background: var(--bg-container);
  border-top: 1px solid var(--border-light);
  flex-wrap: nowrap;
  min-height: 50px;
}

.page-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--border-primary);
  background: var(--bg-container);
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  color: var(--text-secondary);
  transition: all 0.15s;
}

.page-btn:hover:not(:disabled) {
  background: var(--bg-table-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.page-info {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  margin: 0 0.5rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.page-jump-input {
  width: 42px;
  height: 30px;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: inherit;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-input);
  color: var(--text-primary);
  padding: 0 0.2rem;
  -moz-appearance: textfield;
  appearance: textfield;
}

.page-jump-input::-webkit-outer-spin-button,
.page-jump-input::-webkit-inner-spin-button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
}

.page-jump-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--shadow-primary);
}

.page-jump-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.page-sep {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

.page-total {
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 0.9rem;
}

.page-total-records {
  color: var(--text-tertiary);
  font-size: 0.8rem;
  margin-left: 0.35rem;
}

@media (max-width: 768px) {
  .pagination {
    display: none;
  }

  .nav-btn {
    display: none;
  }
}

@media (max-width: 480px) {
  .page-info {
    font-size: 0.8rem;
    margin: 0 0.3rem;
  }

  .page-jump-input {
    width: 36px;
    height: 28px;
    font-size: 0.85rem;
  }

  .page-total-records {
    display: none;
  }
}
</style>
