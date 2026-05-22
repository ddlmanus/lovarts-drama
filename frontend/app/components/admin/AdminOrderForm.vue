<template>
  <template v-if="admin.dialog === 'order'">
    <label>订单号<input v-model="admin.orderForm.order_no" placeholder="留空自动生成" /></label>
    <label>用户<select v-model="admin.orderForm.user_id"><option v-for="u in admin.userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option></select></label>
    <div class="form-grid">
      <label>类型<select v-model="admin.orderForm.type"><option value="membership">会员</option><option value="credit">积分</option></select></label>
      <label>状态<select v-model="admin.orderForm.status"><option value="pending">待支付</option><option value="paid">已支付</option><option value="closed">已关闭</option><option value="refunded">已退款</option></select></label>
    </div>
    <label>商品名称<input v-model="admin.orderForm.item_name" /></label>
    <div class="form-grid">
      <label>商品 ID<input v-model.number="admin.orderForm.item_id" type="number" /></label>
      <label>金额<input v-model.number="admin.orderForm.amount" type="number" step="0.01" /></label>
    </div>
    <div class="form-grid">
      <label>积分<input v-model.number="admin.orderForm.credits" type="number" /></label>
    <label>支付渠道<input v-model="admin.orderForm.payment_provider" placeholder="wechat / zpay_wxpay / allinpay_wxpay / allinpay_alipay / alipay / offline" /></label>
    </div>
    <label>交易号<input v-model="admin.orderForm.transaction_id" /></label>
    <label>支付时间<input v-model="admin.orderForm.paid_at" placeholder="2026-05-20T12:00:00.000Z" /></label>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
