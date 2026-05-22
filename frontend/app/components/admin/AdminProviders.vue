<template>
  <section class="panel">
    <div class="model-filter provider-filter">
      <label>查询
        <input v-model.trim="filters.keyword" placeholder="供应商名称 / Key / 官网 / 说明" @keyup.enter="$emit('apply')" />
      </label>
      <label>类型
        <select v-model="filters.service_type" @change="$emit('apply')">
          <option value="">全部类型</option>
          <option value="all">全部服务</option>
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
    <div class="table provider-table">
      <div class="tr th"><span>供应商</span><span>Key</span><span>官网</span><span>OpenAI 兼容</span><span>排序</span><span>状态</span><span>操作</span></div>
      <div v-for="p in providers" :key="p.id" class="tr">
        <span class="name-cell">
          <img v-if="p.icon" :src="p.icon" alt="" class="icon-img" />
          <span>
            <strong>{{ p.display_name || p.name }}</strong>
            <em>{{ p.description || '公共供应商模板' }}</em>
          </span>
        </span>
        <span class="mono">{{ p.key }}</span>
        <span class="truncate">{{ p.website || '-' }}</span>
        <span>{{ p.support_open_ai ? '是' : '否' }}</span>
        <span>{{ p.rank || 0 }}</span>
        <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
        <span class="ops">
          <button @click="$emit('edit', p)">编辑</button>
          <button class="danger-link" @click="$emit('delete', p.id)">删除</button>
        </span>
      </div>
      <div v-if="!loading && !providers.length" class="empty">没有匹配的供应商</div>
      <div v-if="loading" class="empty">正在加载供应商...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({
  providers: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  serviceTypes: { type: Array, default: () => [] },
})

defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete'])
</script>
