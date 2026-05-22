<template>
  <div v-if="admin.itemDrawer" class="overlay item-overlay" @click.self="admin.closeItemDrawer">
    <aside class="drawer item-drawer">
      <header class="drawer-head">
        <div>
          <h2>{{ admin.selectedParameter?.name || '参数项' }}</h2>
          <p>{{ admin.selectedParameter?.key || '' }}</p>
        </div>
        <button type="button" class="icon-btn" @click="admin.closeItemDrawer">×</button>
      </header>
      <div class="item-head compact">
        <p>维护该参数配置下可供前端选择的参数项。</p>
        <button class="btn primary" :disabled="!admin.selectedParameter" @click="admin.openParameterItem()">新增参数项</button>
      </div>
      <div class="item-list">
        <div v-for="item in admin.parameterItems" :key="item.id" class="item-row">
          <div>
            <strong>{{ item.label }}</strong>
            <span>{{ item.type }} · {{ item.value }}</span>
          </div>
          <div class="ops">
            <button @click="admin.openParameterItem(item)">编辑</button>
            <button class="danger-link" @click="admin.removeParameterItem(item.id)">删除</button>
          </div>
        </div>
        <div v-if="!admin.parameterItems.length" class="empty">暂无参数项</div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
defineProps<{ admin: any }>()
</script>
