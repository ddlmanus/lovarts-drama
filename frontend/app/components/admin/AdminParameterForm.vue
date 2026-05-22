<template>
  <template v-if="admin.dialog === 'parameter'">
    <label>名称<input v-model="admin.parameterForm.name" required /></label>
    <label>Key<input v-model="admin.parameterForm.key" required /></label>
    <label>模型类型
      <select v-model="admin.parameterForm.service_type">
        <option v-for="s in admin.serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
    </label>
    <label>说明<textarea v-model="admin.parameterForm.description" rows="3" /></label>
    <div class="check-grid compact-check-grid">
      <label class="check"><input v-model="admin.parameterForm.is_builtin" type="checkbox" /> 内置配置</label>
      <label class="check"><input v-model="admin.parameterForm.is_active" type="checkbox" /> 启用</label>
    </div>
  </template>

  <template v-else-if="admin.dialog === 'parameterItem'">
    <label>参数类型
      <select v-model="admin.parameterItemForm.type" required>
        <option v-for="t in admin.parameterTypes" :key="t" :value="t">{{ t }}</option>
      </select>
    </label>
    <label>显示名称<input v-model="admin.parameterItemForm.label" required placeholder="例如 1:1 / 高清 / 5 秒" /></label>
    <label>参数值<input v-model="admin.parameterItemForm.value" required placeholder="例如 1:1 / 1080p / 5" /></label>
    <label>排序<input v-model.number="admin.parameterItemForm.rank" type="number" /></label>
  </template>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
