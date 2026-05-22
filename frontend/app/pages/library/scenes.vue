<template>
  <div class="library-page">
    <div class="library-panel">
      <section class="library-hero">
        <div class="library-title-wrap">
          <Mountain :size="36" />
          <div>
            <h1>我的场景库</h1>
            <p>管理和复用你的场景资源</p>
          </div>
        </div>
        <div class="library-stat">
          <span>总场景数</span>
          <strong>{{ items.length }}</strong>
        </div>
      </section>

      <section class="library-search">
        <div class="search-input">
          <Search :size="22" />
          <input v-model="keyword" type="text" placeholder="搜索场景名称或描述..." @keydown.enter.prevent="load" />
        </div>
        <button class="search-btn" type="button" @click="load">
          <Search :size="18" />
          搜索
        </button>
      </section>

      <section v-if="loading" class="library-empty">
        <Loader2 :size="54" class="spin" />
        <p>加载中...</p>
      </section>

      <section v-else-if="!items.length" class="library-empty">
        <Mountain :size="84" />
        <h2>场景库为空</h2>
        <p>在项目中创建场景后，可以保存到公共库以便复用</p>
      </section>

      <section v-else class="library-grid">
        <article v-for="item in items" :key="item.id" class="library-card">
          <div class="card-cover">
            <img v-if="sceneImage(item)" :src="sceneImage(item)" alt="场景图片" />
            <div v-else class="image-placeholder">
              <ImageIcon :size="46" />
            </div>
            <div class="card-actions">
              <button class="icon-btn" type="button" title="查看图片" @click="openPreview(item)">
                <Eye :size="18" />
              </button>
              <button class="icon-btn danger" type="button" title="删除场景" @click="deleteScene(item)">
                <Trash2 :size="18" />
              </button>
            </div>
          </div>
          <div class="card-body">
            <h3>{{ sceneTitle(item) }}</h3>
            <div class="scene-stats">
              <p class="card-meta">
                <Folder :size="14" />
                <span>来自: {{ item.source_name || item.sourceName || item.project_name || item.projectName || `项目${item.drama_id || item.dramaId || ''}` }}</span>
              </p>
              <p class="card-meta">
                <Clock :size="14" />
                <span>{{ formatTime(item.created_at || item.createdAt || item.updated_at || item.updatedAt) }}</span>
              </p>
            </div>
          </div>
        </article>
      </section>
    </div>

    <div v-if="previewScene" class="preview-overlay" @click.self="closePreview">
      <section class="preview-dialog" role="dialog" aria-modal="true" aria-label="查看场景图片">
        <button class="preview-close" type="button" aria-label="关闭" @click="closePreview">
          <X :size="22" />
        </button>
        <img v-if="sceneImage(previewScene)" :src="sceneImage(previewScene)" :alt="sceneTitle(previewScene)" />
        <div v-else class="preview-empty">
          <ImageIcon :size="54" />
          <span>暂无图片</span>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { Clock, Eye, Folder, ImageIcon, Loader2, Mountain, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { sceneAPI } from '~/composables/useApi'

const keyword = ref('')
const items = ref([])
const loading = ref(false)
const previewScene = ref(null)

function sceneTitle(scene) {
  return `${scene?.location || '未命名场景'}${scene?.time ? '-' + scene.time : ''}`
}

function assetUrl(path) {
  if (!path) return ''
  const value = String(path)
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

function sceneImage(scene) {
  return assetUrl(scene?.image_url || scene?.imageUrl)
}

function formatTime(value) {
  if (!value) return '暂无时间'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = n => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

async function load() {
  loading.value = true
  try {
    items.value = await sceneAPI.library(keyword.value.trim())
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

function openPreview(scene) {
  previewScene.value = scene
}

function closePreview() {
  previewScene.value = null
}

async function deleteScene(scene) {
  if (!confirm(`确定删除「${sceneTitle(scene)}」？此操作不可恢复。`)) return
  try {
    await sceneAPI.del(scene.id)
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e.message)
  }
}

onMounted(load)
</script>

<style scoped>
.library-page {
  min-height: 100%;
  padding: 14px;
  background: var(--chatfire-bg-primary);
  color: var(--chatfire-text-primary);
}
.library-panel {
  min-height: calc(100vh - 28px);
  border-radius: 10px;
  background: #151a20;
  padding: 18px 22px 28px;
  overflow: hidden;
}
.library-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 4px 2px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.library-title-wrap {
  display: flex;
  align-items: center;
  gap: 12px;
}
.library-title-wrap > svg {
  width: 22px;
  height: 22px;
  color: rgba(255,255,255,0.78);
}
.library-title-wrap h1 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
}
.library-title-wrap p,
.library-stat span {
  margin: 4px 0 0;
  color: rgba(255,255,255,0.52);
  font-size: 13px;
}
.library-stat {
  display: inline-flex;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  height: 32px;
  padding: 0 12px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 4px;
  background: rgba(255,255,255,0.04);
}
.library-stat strong {
  margin-top: 0;
  font-size: 16px;
  line-height: 1;
}
.library-search {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
}
.search-input {
  width: min(690px, 100%);
  height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.68);
}
.search-input input {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: rgba(255,255,255,0.9);
  font-size: 15px;
}
.search-input input::placeholder {
  color: rgba(255,255,255,0.38);
}
.search-btn {
  height: 40px;
  min-width: 92px;
  border: 0;
  border-radius: 4px;
  background: #1688ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
}
.library-empty {
  min-height: 430px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.42);
  text-align: center;
}
.library-empty h2 {
  margin: 18px 0 10px;
  color: rgba(255,255,255,0.86);
  font-size: 22px;
}
.library-empty p {
  margin: 0;
  color: rgba(255,255,255,0.42);
  font-size: 14px;
}
.spin {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
.library-grid {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 28px;
}
.library-card {
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #2c2e35;
  border: 1px solid rgba(255,255,255,0.08);
  min-width: 0;
}
.card-cover {
  position: relative;
  height: clamp(210px, 15vw, 280px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #30394a;
  color: rgba(255,255,255,0.42);
  overflow: hidden;
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  color: rgba(255,255,255,0.42);
  background: linear-gradient(180deg, #30394a 0%, #273141 100%);
}
.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-btn {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 8px;
  background: rgba(5,8,14,0.84);
  color: rgba(255,255,255,0.92);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.icon-btn:hover {
  background: rgba(18,24,34,0.95);
}
.icon-btn.danger:hover {
  color: #ff8f8f;
}
.card-body {
  padding: 22px 24px 24px;
}
.card-body h3 {
  margin: 0;
  color: rgba(255,255,255,0.92);
  font-size: clamp(20px, 1.3vw, 24px);
  line-height: 1.25;
  font-weight: 700;
}
.scene-stats {
  margin-top: 26px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.card-meta {
  margin: 0;
  color: rgba(255,255,255,0.56);
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}
.card-meta span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 36px;
  background: rgba(0,0,0,0.76);
  backdrop-filter: blur(8px);
}
.preview-dialog {
  position: relative;
  max-width: min(960px, 92vw);
  max-height: min(760px, 86vh);
  border-radius: 10px;
  background: #1d1f24;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 24px 80px rgba(0,0,0,0.55);
  overflow: hidden;
}
.preview-dialog img {
  display: block;
  max-width: min(960px, 92vw);
  max-height: min(760px, 86vh);
  object-fit: contain;
}
.preview-close {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 8px;
  background: rgba(0,0,0,0.56);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.preview-empty {
  width: min(520px, 80vw);
  height: 320px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: rgba(255,255,255,0.5);
}
@media (max-width: 1280px) {
  .library-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .library-page {
    padding: 10px;
  }
  .library-panel {
    min-height: calc(100vh - 20px);
    padding: 18px;
    border-radius: 14px;
  }
  .library-hero {
    align-items: flex-start;
    flex-direction: column;
    padding: 2px 0 14px;
    gap: 12px;
  }
  .library-search {
    align-items: stretch;
    flex-direction: column;
  }
  .search-input {
    width: 100%;
  }
  .library-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .card-cover {
    height: 210px;
  }
  .card-body h3 {
    font-size: 20px;
  }
}
</style>
