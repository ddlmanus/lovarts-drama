<template>
  <section class="panel">
    <div class="model-filter user-provider-filter">
      <label>查询<input v-model.trim="filters.keyword" placeholder="订单号 / 用户 / 商品 / 交易号" @keyup.enter="$emit('apply')" /></label>
      <label>用户<select v-model="filters.user_id" @change="$emit('apply')"><option value="">全部用户</option><option v-for="u in userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option></select></label>
      <label>类型<select v-model="filters.type" @change="$emit('apply')"><option value="">全部类型</option><option value="membership">会员</option><option value="credit">积分</option></select></label>
      <label>状态<select v-model="filters.status" @change="$emit('apply')"><option value="">全部状态</option><option value="pending">待支付</option><option value="paid">已支付</option><option value="closed">已关闭</option><option value="refunded">已退款</option></select></label>
      <div class="filter-actions"><button class="btn primary" :disabled="loading" @click="$emit('apply')">查询</button><button class="btn ghost" :disabled="loading" @click="$emit('reset')">重置</button></div>
    </div>
    <div class="table order-table">
      <div class="tr th"><span>订单</span><span>用户</span><span>类型</span><span>金额/积分</span><span>支付</span><span>状态</span><span>操作</span></div>
      <div v-for="o in orders" :key="o.id" class="tr">
        <span><strong>{{ o.order_no }}</strong><em>{{ o.item_name || '-' }}</em></span>
        <span class="mono">{{ o.user_id }}</span>
        <span>{{ o.type }}</span>
        <span>¥{{ o.amount || 0 }} / {{ o.credits || 0 }}</span>
        <span><strong>{{ o.payment_provider || '-' }}</strong><em>{{ o.transaction_id || '-' }}</em></span>
        <span><b :class="o.status === 'paid' ? 'ok' : 'muted'">{{ o.status }}</b></span>
        <span class="ops"><button @click="$emit('edit', o)">编辑</button><button class="danger-link" @click="$emit('delete', o.id)">删除</button></span>
      </div>
      <div v-if="!loading && !orders.length" class="empty">没有匹配的订单</div>
      <div v-if="loading" class="empty">正在加载订单...</div>
    </div>
    <AdminPagination :pagination="pagination" :total-pages="totalPages" :loading="loading" @page="$emit('page', $event)" @page-size="$emit('page-size')" />
  </section>
</template>

<script setup>
defineProps({ orders: { type: Array, default: () => [] }, filters: { type: Object, required: true }, pagination: { type: Object, required: true }, totalPages: { type: Number, required: true }, loading: { type: Boolean, default: false }, userOptions: { type: Array, default: () => [] } })
defineEmits(['apply', 'reset', 'page', 'page-size', 'edit', 'delete'])
</script>
