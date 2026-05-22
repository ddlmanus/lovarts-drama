<template>
  <section class="panel">
    <div class="model-filter parameter-filter">
      <label>查询
        <input v-model.trim="filters.keyword" placeholder="参数配置名称 / Key / 说明" @keyup.enter="$emit('apply')" />
      </label>
      <label>类型
        <select v-model="filters.service_type" @change="$emit('apply')">
          <option value="">全部类型</option>
          <option v-for="s in serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label>状态
        <select v-model="filters.active" @change="$emit('apply')">
          <option value="">全部状态</option>
          <option value="1">启用</option>
          <option value="0">停用</option>
        </select>
      </label>
      <div class="filter-actions">
        <button class="btn primary" :disabled="loading" @click="$emit('apply')">查询</button>
        <button class="btn ghost" :disabled="loading" @click="$emit('reset')">重置</button>
      </div>
    </div>
    <div class="table profile-table">
      <div class="tr th"><span>Key</span><span>名称</span><span>类型</span><span>状态</span><span>参数项</span><span>说明</span><span>操作</span></div>
      <div v-for="p in parameters" :key="p.id" class="tr">
        <span class="mono wrap-cell">{{ p.key }}</span>
        <span>
          <strong>{{ p.name }}</strong>
          <em>{{ p.is_builtin ? '内置配置' : '自定义配置' }}</em>
        </span>
        <span>{{ serviceLabel(p.service_type) }}</span>
        <span><b :class="p.is_active ? 'ok status-pill' : 'muted status-pill'">{{ p.is_active ? '启用' : '停用' }}</b></span>
        <span>{{ p.item_count || p.items?.length || 0 }} 项</span>
        <span class="truncate">{{ p.description || '-' }}</span>
        <span class="ops">
          <button @click="$emit('edit', p)">编辑</button>
          <button class="danger-link" @click="$emit('delete', p.id)">删除</button>
          <button @click="$emit('items', p)">参数项</button>
        </span>
      </div>
      <div v-if="!loading && !parameters.length" class="empty">没有匹配的参数配置</div>
      <div v-if="loading" class="empty">正在加载参数配置...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({
  parameters: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  serviceTypes: { type: Array, default: () => [] },
  serviceLabel: { type: Function, required: true },
})

defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete', 'items'])
</script>
