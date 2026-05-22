<template>
  <template v-if="admin.dialog === 'creditPackage'">
    <label>充值包名称<input v-model="admin.creditPackageForm.name" required /></label>
    <label>Code<input v-model="admin.creditPackageForm.code" placeholder="credits_1000" /></label>
    <label>说明<textarea v-model="admin.creditPackageForm.description" rows="3" /></label>
    <div class="form-grid">
      <label>价格<input v-model.number="admin.creditPackageForm.price" type="number" step="0.01" /></label>
      <label>基础积分<input v-model.number="admin.creditPackageForm.credits" type="number" /></label>
    </div>
    <div class="form-grid">
      <label>赠送积分<input v-model.number="admin.creditPackageForm.bonus_credits" type="number" /></label>
      <label>排序<input v-model.number="admin.creditPackageForm.sort_order" type="number" /></label>
    </div>
    <label class="check"><input v-model="admin.creditPackageForm.is_active" type="checkbox" /> 启用</label>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
