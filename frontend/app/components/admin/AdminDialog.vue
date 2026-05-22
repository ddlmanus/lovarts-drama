<template>
  <div v-if="admin.dialog" class="overlay" @click.self="admin.closeDialog">
    <form class="drawer" @submit.prevent="admin.saveDialog">
      <header class="drawer-head">
        <h2>{{ admin.dialogTitle }}</h2>
        <button type="button" class="icon-btn" @click="admin.closeDialog">×</button>
      </header>

      <AdminProviderForm v-if="admin.dialog === 'provider'" :admin="admin" />
      <AdminModelForm v-else-if="admin.dialog === 'model'" :admin="admin" />
      <AdminParameterForm v-else-if="admin.dialog === 'parameter' || admin.dialog === 'parameterItem'" :admin="admin" />
      <AdminUserForm v-else-if="admin.dialog === 'user'" :admin="admin" />
      <AdminUserProviderForm v-else-if="admin.dialog === 'connect'" :admin="admin" />
      <AdminMembershipForm v-else-if="admin.dialog === 'membership'" :admin="admin" />
      <AdminCreditPackageForm v-else-if="admin.dialog === 'creditPackage'" :admin="admin" />
      <AdminOrderForm v-else-if="admin.dialog === 'order'" :admin="admin" />
      <AdminPaymentConfigForm v-else-if="admin.dialog === 'paymentConfig'" :admin="admin" />

      <div class="drawer-actions">
        <button type="button" class="btn ghost" @click="admin.closeDialog">取消</button>
        <button class="btn primary" type="submit">保存</button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
