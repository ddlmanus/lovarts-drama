<template>
  <section class="panel system-settings-panel">
    <div v-if="admin.systemSettingsLoading" class="empty">正在加载系统设置...</div>
    <AdminSystemSettingsForm v-else :admin="admin" />
  </section>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
