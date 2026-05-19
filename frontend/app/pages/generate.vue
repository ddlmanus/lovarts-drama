<template>
  <div class="generate-container">
    <div class="max-box content">
      <div class="resource-grid-container">
        <div class="load-trigger"></div>
        <div class="empty-state">
          <div class="empty-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" class="empty-icon" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <p class="empty-title">暂无创作内容</p>
            <p class="empty-text">开始创作你的第一个作品吧</p>
          </div>
        </div>
      </div>
    </div>
    <MaterialInput v-model="prompt" />
  </div>
</template>

<script setup>
const prompt = ref('')
</script>

<style scoped>
.generate-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: #1f1f1f;
  color: var(--chatfire-text-primary);
}

.max-box.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 190px;
}

.resource-grid-container {
  position: relative;
  min-height: 100%;
}

.load-trigger {
  height: 1px;
}

.empty-state {
  display: grid;
  min-height: calc(100vh - 206px);
  place-items: center;
  color: #737373;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transform: translateY(-42px);
}

.empty-icon {
  color: #6f6f78;
}

.empty-title {
  margin: 4px 0 0;
  color: #8a8a8f;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.empty-text {
  margin: 0;
  color: #76767d;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .max-box.content {
    padding-bottom: 230px;
  }

  .empty-state {
    min-height: calc(100vh - 280px);
  }
}
</style>
