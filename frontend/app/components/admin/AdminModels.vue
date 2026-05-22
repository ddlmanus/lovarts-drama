<template>
  <section class="panel">
    <div class="model-filter">
      <label>查询
        <input v-model.trim="filters.keyword" placeholder="模型名称 / ID / 供应商" @keyup.enter="$emit('apply')" />
      </label>
      <label>类型
        <select v-model="filters.service_type" @change="$emit('apply')">
          <option value="">全部类型</option>
          <option v-for="s in serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option>
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
    <div class="table model-table">
      <div class="tr th"><span>模型</span><span>类型</span><span>供应商</span><span>参数配置</span><span>计费</span><span>状态</span><span>操作</span></div>
      <div v-for="m in models" :key="m.id" class="tr">
        <span>
          <strong>{{ m.name }}</strong>
          <em class="mono">{{ m.model_id }}</em>
        </span>
        <span>{{ serviceLabel(m.service_type) }}</span>
        <span>{{ m.provider?.display_name || m.provider?.key || m.provider }}</span>
        <span>{{ m.parameter_profile?.name || '-' }}</span>
        <span>
          <strong>{{ m.is_free ? '免费' : `${m.cost || 0} 积分` }}</strong>
          <em>{{ m.member_only ? '仅付费会员' : '普通可用' }} · 排序 {{ m.priority || 0 }}</em>
        </span>
        <span><b :class="m.is_active ? 'ok' : 'muted'">{{ m.is_active ? '启用' : '停用' }}</b></span>
        <span class="ops">
          <button @click="$emit('edit', m)">编辑</button>
          <button class="danger-link" @click="$emit('delete', m.id)">删除</button>
        </span>
      </div>
      <div v-if="!loading && !models.length" class="empty">没有匹配的模型配置</div>
      <div v-if="loading" class="empty">正在加载模型配置...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({
  models: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  serviceTypes: { type: Array, default: () => [] },
  sortedProviders: { type: Array, default: () => [] },
  serviceLabel: { type: Function, required: true },
})

defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete'])
</script>
