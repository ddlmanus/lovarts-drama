<template>
  <template v-if="admin.dialog === 'user'">
    <label>用户 ID<input v-model="admin.userForm.id" required :disabled="Boolean(admin.editId)" /></label>
    <label>名称<input v-model="admin.userForm.name" required /></label>
    <label>账号<input v-model="admin.userForm.account" /></label>
    <div class="form-grid">
      <label>手机号<input v-model="admin.userForm.phone" /></label>
      <label>Email<input v-model="admin.userForm.email" /></label>
    </div>
    <div class="form-grid">
      <label>积分<input v-model.number="admin.userForm.credits" type="number" /></label>
      <label>会员状态
        <select v-model="admin.userForm.membership_status">
          <option value="none">none</option>
          <option value="active">active</option>
          <option value="expired">expired</option>
          <option value="disabled">disabled</option>
        </select>
      </label>
    </div>
    <div class="form-grid">
      <label>会员套餐
        <select v-model.number="admin.userForm.membership_plan_id">
          <option :value="0">无</option>
          <option v-for="p in admin.membershipPlans" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </label>
      <label>会员到期时间<input v-model="admin.userForm.membership_expires_at" placeholder="2026-12-31T23:59:59.000Z" /></label>
    </div>
    <div class="form-grid">
      <label>角色
        <select v-model="admin.userForm.role">
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
      </label>
      <label class="check"><input v-model="admin.userForm.is_active" type="checkbox" /> 启用</label>
    </div>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
