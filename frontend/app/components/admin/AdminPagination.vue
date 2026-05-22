<template>
  <div class="pagination-bar">
    <span>共 {{ pagination.total }} 条，第 {{ pagination.page }} / {{ totalPages }} 页</span>
    <label>每页
      <select v-model.number="pagination.page_size" @change="$emit('page-size')">
        <option :value="10">10</option>
        <option :value="20">20</option>
        <option :value="50">50</option>
        <option :value="100">100</option>
      </select>
    </label>
    <div class="pager-actions">
      <button class="btn ghost" :disabled="loading || pagination.page <= 1" @click="$emit('page', pagination.page - 1)">上一页</button>
      <button class="btn ghost" :disabled="loading || pagination.page >= totalPages" @click="$emit('page', pagination.page + 1)">下一页</button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})

defineEmits(['page', 'page-size'])
</script>
