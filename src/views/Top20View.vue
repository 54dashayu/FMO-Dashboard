<template>
  <div class="top20-view">
    <!-- 状态提示 -->
    <StatusHints :sync-message="fmoSyncMessage" :loading="loading" :error="error" />

    <!-- TOP20汇总视图 -->
    <Top20Summary :top20-result="dataQuery.top20Result.value" :db-loaded="dbLoaded" />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'

// 组件
import StatusHints from '../components/common/StatusHints.vue'
import Top20Summary from '../components/home/Top20Summary.vue'

const props = defineProps({
  dbLoaded: Boolean,
  selectedFromCallsign: String,
  loading: Boolean,
  error: String,
  fmoSyncMessage: String,
  dataQuery: Object
})

const emit = defineEmits(['execute-query'])

// 初始化时确保查询类型正确并执行查询
onMounted(() => {
  if (props.dataQuery.currentQueryType.value !== 'top20Summary') {
    props.dataQuery.currentQueryType.value = 'top20Summary'
  }
  if (props.dbLoaded) {
    emit('execute-query')
  }
})
</script>

<style scoped>
.top20-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

@media (max-width: 768px) {
  .top20-view {
    height: auto;
    margin-top: 0.5rem;
  }
}
</style>
