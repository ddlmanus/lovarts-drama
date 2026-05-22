<template>
  <section class="panel">
    <div class="model-filter provider-filter">
      <label>查询<input v-model.trim="filters.keyword" placeholder="充值包名称 / Code / 说明" @keyup.enter="$emit('apply')" /></label>
      <label>状态<select v-model="filters.active" @change="$emit('apply')"><option value="">全部状态</option><option value="1">启用</option><option value="0">停用</option></select></label>
      <div class="filter-actions"><button class="btn primary" :disabled="loading" @click="$emit('apply')">查询</button><button class="btn ghost" :disabled="loading" @click="$emit('reset')">重置</button></div>
    </div>
    <div class="table credit-package-table">
      <div class="tr th"><span>充值包</span><span>价格</span><span>基础积分</span><span>赠送积分</span><span>排序</span><span>状态</span><span>操作</span></div>
      <div v-for="p in packages" :key="p.id" class="tr">
        <span><strong>{{ p.name }}</strong><em>{{ p.code }} · {{ p.description || '-' }}</em></span>
        <span>¥{{ p.price || 0 }}</span>
        <span>{{ p.credits || 0 }}</span>
        <span>{{ p.bonus_credits || 0 }}</span>
        <span>{{ p.sort_order || 0 }}</span>
        <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
        <span class="ops"><button @click="$emit('edit', p)">编辑</button><button class="danger-link" @click="$emit('delete', p.id)">删除</button></span>
      </div>
      <div v-if="!loading && !packages.length" class="empty">没有匹配的积分充值包</div>
      <div v-if="loading" class="empty">正在加载积分充值包...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({ packages: { type: Array, default: () => [] }, filters: { type: Object, required: true }, pagination: { type: Object, required: true }, totalPages: { type: Number, required: true }, loading: { type: Boolean, default: false } })
defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete'])
</script>
