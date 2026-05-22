<template>
  <section class="panel">
    <div class="model-filter user-provider-filter">
      <label>查询
        <input v-model.trim="filters.keyword" placeholder="用户 / 供应商 / Base URL" @keyup.enter="$emit('apply')" />
      </label>
      <label>用户
        <select v-model="filters.user_id" @change="$emit('apply')">
          <option value="">全部用户</option>
          <option value="__platform__">平台供应商</option>
          <option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option>
        </select>
      </label>
      <label>供应商
        <select v-model="filters.provider" @change="$emit('apply')">
          <option value="">全部供应商</option>
          <option v-for="p in sortedProviders" :key="p.id" :value="p.key">{{ p.display_name || p.name }}</option>
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
    <div class="table user-provider-table">
      <div class="tr th"><span>用户</span><span>供应商</span><span>Base URL</span><span>API Key</span><span>状态</span><span>操作</span></div>
      <div v-for="p in userProviders" :key="p.id" class="tr">
        <span class="mono">{{ p.user_id || '平台供应商' }}</span>
        <span>{{ p.name }}</span>
        <span class="mono truncate">{{ p.base_url }}</span>
        <span class="mono">{{ p.api_key }}</span>
        <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
        <span class="ops">
          <button class="link" @click="$emit('edit', p)">编辑</button>
          <button class="danger-link" @click="$emit('delete', p.id)">删除</button>
        </span>
      </div>
      <div v-if="!loading && !userProviders.length" class="empty">没有匹配的供应商密钥</div>
      <div v-if="loading" class="empty">正在加载供应商密钥...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({
  userProviders: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  userOptions: { type: Array, default: () => [] },
  sortedProviders: { type: Array, default: () => [] },
})

defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete'])
</script>
