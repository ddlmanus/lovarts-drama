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
        <button class="search-btn secondary" type="button" @click="createScene">
          <Plus :size="18" />
          新增场景
        </button>
      </section>

      <section v-if="loading" class="library-empty">
        <Loader2 :size="54" class="spin" />
        <p>加载中...</p>
      </section>

      <section v-else-if="!items.length" class="library-empty">
        <Mountain :size="84" />
        <h2>场景库为空</h2>
        <p>直接创建场景，或在项目中创建后保存到公共库</p>
        <button class="empty-create-btn" type="button" @click="createScene">新增场景</button>
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
              <button class="icon-btn" type="button" title="编辑场景" @click="editScene(item)">
                <Pencil :size="18" />
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

    <div v-if="formOpen" class="role-modal-overlay" @click.self="closeForm">
      <section class="role-design-modal" role="dialog" aria-modal="true" aria-label="场景设计">
        <button class="role-modal-close" type="button" aria-label="关闭" @click="closeForm">
          <X :size="22" />
        </button>
        <h2 class="role-modal-title">{{ editingId ? '场景设计' : '自定义场景' }}</h2>
        <div class="role-modal-content">
          <div class="role-modal-image">
            <label v-if="form.image_url" class="role-modal-image-upload">
              <img :src="assetUrl(form.image_url)" alt="" />
              <input type="file" accept="image/*" @change="uploadImage" />
            </label>
            <div v-else class="role-modal-image-placeholder">
              <ImageIcon :size="34" />
              <label class="role-upload-btn">
                {{ uploading ? '上传中...' : '手动上传' }}
                <input type="file" accept="image/*" :disabled="uploading" @change="uploadImage" />
              </label>
            </div>
          </div>
          <form class="role-modal-form" @submit.prevent="saveScene">
            <label class="role-field">
              <span>地点</span>
              <input v-model.trim="form.location" type="text" required placeholder="请输入场景地点" />
            </label>
            <label class="role-field">
              <span>时间</span>
              <input v-model.trim="form.time" type="text" placeholder="请输入时间段" />
            </label>
            <label class="role-field">
              <span>场景描述</span>
              <textarea v-model.trim="form.prompt" rows="8" placeholder="请输入场景描述"></textarea>
            </label>
          </form>
        </div>
        <div class="role-modal-actions">
          <button class="role-modal-text-btn" type="button" @click="closeForm">取消</button>
          <button class="role-modal-primary-btn" type="button" :disabled="saving || uploading" @click="saveScene">
            <Loader2 v-if="saving || uploading" :size="15" class="spin" />
            <span v-else>确认</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { Clock, Eye, Folder, ImageIcon, Loader2, Mountain, Pencil, Plus, Search, Trash2, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { sceneAPI, uploadAPI } from '~/composables/useApi'

const keyword = ref('')
const items = ref([])
const loading = ref(false)
const previewScene = ref(null)
const formOpen = ref(false)
const saving = ref(false)
const uploading = ref(false)
const editingId = ref(null)
const emptyForm = () => ({ location: '', time: '', prompt: '', image_url: '' })
const form = reactive(emptyForm())

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

function resetForm(values = {}) {
  Object.assign(form, emptyForm(), values)
}

function createScene() {
  editingId.value = null
  resetForm()
  formOpen.value = true
}

function editScene(scene) {
  editingId.value = scene.id
  resetForm({
    location: scene.location || '',
    time: scene.time || '',
    prompt: scene.prompt || '',
    image_url: scene.image_url || scene.imageUrl || '',
  })
  formOpen.value = true
}

function closeForm() {
  formOpen.value = false
  editingId.value = null
}

async function uploadImage(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  uploading.value = true
  try {
    const result = await uploadAPI.image(file)
    form.image_url = result.url || result.path || ''
  } catch (e) {
    toast.error(e.message || '上传失败')
  } finally {
    uploading.value = false
  }
}

async function saveScene() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) await sceneAPI.updateLibrary(editingId.value, payload)
    else await sceneAPI.createLibrary(payload)
    toast.success('已保存到场景库')
    closeForm()
    await load()
  } catch (e) {
    toast.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteScene(scene) {
  if (!confirm(`确定删除「${sceneTitle(scene)}」？此操作不会影响已使用到项目中的场景。`)) return
  try {
    await sceneAPI.deleteLibrary(scene.id)
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
  background: transparent;
  color: var(--chatfire-text-primary);
}
.library-panel {
  min-height: calc(100vh - 28px);
  border-radius: 0;
  background: transparent;
  padding: 4px 16px 18px;
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
.search-btn.secondary {
  min-width: 112px;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.14);
  color: rgba(255,255,255,0.86);
}
.empty-create-btn {
  margin-top: 18px;
  height: 36px;
  padding: 0 18px;
  border: 0;
  border-radius: 4px;
  background: #1688ff;
  color: #fff;
  font-size: 14px;
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
.role-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.54);
}
.role-design-modal {
  position: relative;
  width: min(760px, calc(100vw - 48px));
  height: auto;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  padding: 16px 28px 20px;
  border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.09);
  background: linear-gradient(180deg, #2c2c32 0%, #3a4254 100%);
  color: rgba(255,255,255,0.86);
  box-shadow: 0 24px 72px rgba(0,0,0,0.42);
}
.role-modal-close {
  position: absolute;
  top: 20px;
  right: 26px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: rgba(255,255,255,0.52);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.role-modal-close:hover {
  background: rgba(255,255,255,0.12);
}
.role-modal-title {
  margin: 0 0 8px;
  color: rgba(255,255,255,0.92);
  font-size: 18px;
  line-height: 1;
  font-weight: 500;
}
.role-modal-content {
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}
.role-modal-image {
  height: 460px;
  min-height: 460px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(180deg, #1f2027 0%, #252936 100%);
}
.role-modal-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.role-modal-image-placeholder {
  width: 100%;
  height: 100%;
  min-height: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255,255,255,0.48);
}
.role-modal-image-upload {
  position: relative;
  display: block;
  width: 100%;
  height: 100%;
  cursor: pointer;
}
.role-modal-image-upload input,
.role-upload-btn input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.role-upload-btn {
  position: relative;
  min-height: 30px;
  border: 0;
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  background: #9bd9ff;
  color: #07111c;
}
.role-modal-form {
  min-height: 0;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.role-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  font-weight: 400;
}
.role-field input,
.role-field textarea {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.86);
  outline: none;
  font-size: 15px;
  font-family: inherit;
}
.role-field input {
  height: 40px;
  padding: 0 14px;
}
.role-field textarea {
  min-height: 80px;
  resize: vertical;
  padding: 8px 12px;
  line-height: 1.6;
}
.role-field input:focus,
.role-field textarea:focus {
  border-color: #409cff;
  box-shadow: 0 0 8px rgba(10,132,255,0.3);
  background: rgba(10,132,255,0.1);
}
.role-modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  flex-shrink: 0;
}
.role-modal-text-btn,
.role-modal-primary-btn {
  height: 32px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.role-modal-text-btn {
  background: transparent;
  color: rgba(255,255,255,0.9);
}
.role-modal-primary-btn {
  background: #9bd9ff;
  color: #06101a;
}
.role-modal-primary-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
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
    padding: 4px 0 18px;
    border-radius: 0;
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
  .role-modal-overlay {
    padding: 12px;
  }
  .role-design-modal {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
    padding: 16px 20px 20px;
  }
  .role-modal-content {
    grid-template-columns: 1fr;
  }
  .role-modal-image,
  .role-modal-image-placeholder {
    min-height: 280px;
    height: 280px;
  }
}
</style>
