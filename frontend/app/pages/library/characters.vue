<template>
  <div class="library-page">
    <section class="library-hero">
      <div class="library-title-wrap">
        <UserRound :size="32" />
        <div>
          <h1>我的角色库</h1>
          <p>管理和复用你的角色资源</p>
        </div>
      </div>
      <div class="library-stat">
        <span>总角色数</span>
        <strong>{{ items.length }}</strong>
      </div>
    </section>

    <section class="library-search">
      <div class="search-input">
        <Search :size="22" />
        <input v-model="keyword" type="text" placeholder="搜索角色名称、身份或描述..." @keydown.enter.prevent="load" />
      </div>
      <button class="search-btn secondary" type="button" @click="createCharacter">
        <Plus :size="18" />
        新增角色
      </button>
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
      <UserRound :size="74" />
      <h2>角色库为空</h2>
      <p>直接创建角色，或在项目中创建后保存到公共库</p>
      <button class="empty-create-btn" type="button" @click="createCharacter">新增角色</button>
    </section>

    <section v-else class="library-grid">
      <article v-for="item in items" :key="item.id" class="library-card">
        <div class="card-cover">
          <img v-if="item.image_url || item.imageUrl" :src="assetUrl(item.image_url || item.imageUrl)" alt="" />
          <UserRound v-else :size="42" />
          <div class="card-actions">
            <button class="icon-btn" type="button" title="编辑角色" @click="editCharacter(item)">
              <Pencil :size="17" />
            </button>
            <button class="icon-btn danger" type="button" title="删除角色" @click="deleteCharacter(item)">
              <Trash2 :size="17" />
            </button>
          </div>
        </div>
        <div class="card-body">
          <h3>{{ item.name || '未命名角色' }}</h3>
          <p class="card-meta">{{ [item.gender, item.age, item.role].filter(Boolean).join(' · ') || '角色' }}</p>
          <p class="card-desc">{{ item.description || item.appearance || '暂无角色描述' }}</p>
        </div>
      </article>
    </section>

    <div v-if="formOpen" class="role-modal-overlay" @click.self="closeForm">
      <section class="role-design-modal" role="dialog" aria-modal="true" aria-label="角色设计">
        <button class="role-modal-close" type="button" aria-label="关闭" @click="closeForm">
          <X :size="20" />
        </button>
        <h2 class="role-modal-title">{{ editingId ? '角色设计' : '自定义角色' }}</h2>
        <div class="role-modal-content">
          <div class="role-modal-image">
            <label v-if="form.image_url" class="role-modal-image-upload">
              <img v-if="form.image_url" :src="assetUrl(form.image_url)" alt="" />
              <input type="file" accept="image/*" @change="uploadImage" />
            </label>
            <div v-else class="role-modal-image-placeholder">
              <UserRound :size="34" />
              <label class="role-upload-btn">
                {{ uploading ? '上传中...' : '手动上传' }}
                <input type="file" accept="image/*" :disabled="uploading" @change="uploadImage" />
              </label>
            </div>
          </div>
          <form class="role-modal-form" @submit.prevent="saveCharacter">
            <label class="role-field">
              <span>名称</span>
              <input v-model.trim="form.name" type="text" required placeholder="请输入角色名称" />
            </label>
            <label class="role-field">
              <span>年龄</span>
              <BaseSelect v-model="form.age" :options="roleAgeOptions" placeholder="请选择年龄" class="role-form-select" dropdown-class="role-form-select-dropdown" />
            </label>
            <label class="role-field">
              <span>性别</span>
              <BaseSelect v-model="form.gender" :options="roleGenderOptions" placeholder="请选择性别" class="role-form-select" dropdown-class="role-form-select-dropdown" />
            </label>
            <label class="role-field">
              <span>人物描述</span>
              <textarea v-model.trim="form.appearance" rows="5" placeholder="请输入人物描述"></textarea>
            </label>
            <label class="role-field">
              <span>背景故事</span>
              <textarea v-model.trim="form.description" rows="4" placeholder="请输入背景故事"></textarea>
            </label>
          </form>
        </div>
        <div class="role-modal-actions">
          <button class="role-modal-text-btn" type="button" @click="closeForm">取消</button>
          <button class="role-modal-primary-btn" type="button" :disabled="saving || uploading" @click="saveCharacter">
            <Loader2 v-if="saving || uploading" :size="15" class="spin" />
            <span v-else>确认</span>
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { Loader2, Pencil, Plus, Search, Trash2, UserRound, X } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { characterAPI, uploadAPI } from '~/composables/useApi'

const keyword = ref('')
const items = ref([])
const loading = ref(false)
const formOpen = ref(false)
const saving = ref(false)
const uploading = ref(false)
const editingId = ref(null)
const emptyForm = () => ({ name: '', age: '', gender: '', role: '', description: '', appearance: '', image_url: '' })
const form = reactive(emptyForm())
const roleAgeOptions = [
  { label: '婴儿', value: '婴儿' },
  { label: '幼儿', value: '幼儿' },
  { label: '儿童', value: '儿童' },
  { label: '青少年', value: '青少年' },
  { label: '青年', value: '青年' },
  { label: '成年', value: '成年' },
  { label: '中年', value: '中年' },
  { label: '年长者', value: '年长者' },
  { label: '老年', value: '老年' },
]
const roleGenderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '其他', value: '其他' },
]

function assetUrl(path) {
  if (!path) return ''
  const value = String(path)
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

async function load() {
  loading.value = true
  try {
    items.value = await characterAPI.library(keyword.value.trim())
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

function resetForm(values = {}) {
  Object.assign(form, emptyForm(), values)
}

function createCharacter() {
  editingId.value = null
  resetForm()
  formOpen.value = true
}

function editCharacter(item) {
  editingId.value = item.id
  resetForm({
    name: item.name || '',
    age: item.age || '',
    gender: item.gender || '',
    role: item.role || '',
    description: item.description || '',
    appearance: item.appearance || '',
    image_url: item.image_url || item.imageUrl || '',
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

async function saveCharacter() {
  saving.value = true
  try {
    const payload = { ...form }
    if (editingId.value) await characterAPI.updateLibrary(editingId.value, payload)
    else await characterAPI.createLibrary(payload)
    toast.success('已保存到角色库')
    closeForm()
    await load()
  } catch (e) {
    toast.error(e.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function deleteCharacter(item) {
  if (!confirm(`确定删除「${item.name || '未命名角色'}」？此操作不会影响已使用到项目中的角色。`)) return
  try {
    await characterAPI.deleteLibrary(item.id)
    toast.success('已删除')
    await load()
  } catch (e) {
    toast.error(e.message || '删除失败')
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
  gap: 16px;
  margin-top: 18px;
}
.search-input {
  width: min(690px, 100%);
  height: 40px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-radius: 3px;
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
  min-width: 128px;
  border: 0;
  border-radius: 3px;
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
  border-radius: 3px;
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
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 18px;
}
.library-card {
  overflow: hidden;
  border-radius: 10px;
  background: #12161c;
  border: 1px solid rgba(255,255,255,0.08);
}
.card-cover {
  position: relative;
  height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #30333b;
  color: rgba(255,255,255,0.42);
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.card-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 8px;
}
.icon-btn {
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 6px;
  background: rgba(6,8,12,0.78);
  color: rgba(255,255,255,0.9);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.icon-btn.danger:hover {
  color: #ff9b9b;
}
.card-body {
  padding: 14px 16px 18px;
}
.card-body h3 {
  margin: 0;
  font-size: 18px;
}
.card-meta,
.card-desc {
  margin: 8px 0 0;
  color: rgba(255,255,255,0.56);
  font-size: 14px;
}
.card-desc {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
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
.role-form-select :deep(.base-select-trigger) {
  height: 40px;
  min-height: 40px;
  padding: 0 26px 0 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.86);
  font-size: 15px;
}
.role-form-select :deep(.base-select-trigger:hover),
.role-form-select :deep(.base-select-trigger.open) {
  border-color: #409cff;
  background: rgba(10,132,255,0.1);
}
.role-form-select :deep(.base-select-label) {
  font-weight: 600;
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
:global(.role-form-select-dropdown) {
  z-index: 10020;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: #22202d;
  box-shadow: none;
}
:global(.role-form-select-dropdown .base-select-option) {
  color: rgba(255,255,255,0.72);
}
:global(.role-form-select-dropdown .base-select-option:hover),
:global(.role-form-select-dropdown .base-select-option.highlighted) {
  background: rgba(255,255,255,0.08);
  color: #fff;
}
@media (max-width: 760px) {
  .library-search,
  .role-modal-content {
    flex-direction: column;
    align-items: stretch;
  }
  .search-input {
    width: 100%;
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
