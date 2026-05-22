<template>
  <section class="panel">
    <div class="model-filter user-filter">
      <label>查询
        <input v-model.trim="filters.keyword" placeholder="用户名 / ID / 账号 / 邮箱" @keyup.enter="$emit('apply')" />
      </label>
      <label>角色
        <select v-model="filters.role" @change="$emit('apply')">
          <option value="">全部角色</option>
          <option value="user">user</option>
          <option value="admin">admin</option>
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
    <div class="table user-table">
      <div class="tr th"><span>用户</span><span>ID</span><span>账号</span><span>积分/会员</span><span>状态</span><span>操作</span></div>
      <div v-for="u in users" :key="u.id" :class="['tr', { selected: selectedUserId === u.id }]" @click="$emit('select', u.id)">
        <span><strong>{{ u.name }}</strong></span>
        <span class="mono">{{ u.id }}</span>
        <span>{{ u.account || u.email || '-' }}</span>
        <span>
          <strong>{{ u.credits || 0 }} 积分</strong>
          <em>{{ u.membership_status || 'none' }}</em>
        </span>
        <span><b :class="u.is_active ? 'ok' : 'muted'">{{ u.is_active ? '启用' : '停用' }}</b></span>
        <span class="ops" @click.stop>
          <button @click="$emit('edit', u)">编辑</button>
          <button class="danger-link" @click="$emit('delete', u.id)">删除</button>
        </span>
      </div>
      <div v-if="!loading && !users.length" class="empty">没有匹配的用户</div>
      <div v-if="loading" class="empty">正在加载用户...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({
  users: { type: Array, default: () => [] },
  filters: { type: Object, required: true },
  pagination: { type: Object, required: true },
  totalPages: { type: Number, required: true },
  loading: { type: Boolean, default: false },
  selectedUserId: { type: String, default: '' },
})

defineEmits(['apply', 'reset', 'page', 'page-size', 'select', 'edit', 'delete'])
</script>
