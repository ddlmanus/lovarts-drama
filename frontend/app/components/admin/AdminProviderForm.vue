<template>
  <template v-if="admin.dialog === 'provider'">
    <label>供应商名称<input v-model="admin.providerForm.name" required /></label>
    <label>Key<input v-model="admin.providerForm.provider" placeholder="openai / apimart / gemini" /></label>
    <label>图标 URL<input v-model="admin.providerForm.icon" placeholder="https://..." /></label>
    <label>官网<input v-model="admin.providerForm.website" placeholder="https://..." /></label>
    <label>说明<textarea v-model="admin.providerForm.description" rows="3" /></label>
    <div class="form-grid">
      <label>排序<input v-model.number="admin.providerForm.rank" type="number" /></label>
      <label>类型
        <select v-model="admin.providerForm.service_type">
          <option value="all">全部</option>
          <option v-for="s in admin.serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
    </div>
    <div class="check-grid compact-check-grid">
      <label class="check"><input v-model="admin.providerForm.support_open_ai" type="checkbox" /> OpenAI 兼容接口</label>
      <label class="check"><input v-model="admin.providerForm.is_third_party" type="checkbox" /> 第三方供应商</label>
      <label class="check"><input v-model="admin.providerForm.is_active" type="checkbox" /> 启用</label>
    </div>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
