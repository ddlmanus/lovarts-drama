<template>
  <template v-if="admin.dialog === 'connect'">
    <label>归属
      <select v-model="admin.connectForm.user_id">
        <option value="">平台供应商（用户无 API 时使用）</option>
        <option v-for="u in admin.userOptions" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option>
      </select>
    </label>
    <label>公共供应商
      <select v-model.number="admin.connectForm.provider_id" required>
        <option :value="0">请选择</option>
        <option v-for="p in admin.sortedProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option>
      </select>
    </label>
    <label>显示名称<input v-model="admin.connectForm.name" placeholder="留空使用供应商名称" /></label>
    <label>Base URL<input v-model="admin.connectForm.base_url" required placeholder="https://api.example.com" /></label>
    <label>API Key<input v-model="admin.connectForm.api_key" type="password" :required="!admin.editId" placeholder="编辑时留空则不修改" /></label>
    <label class="check">
      <input v-model="admin.connectForm.is_active" type="checkbox" />
      启用
    </label>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
