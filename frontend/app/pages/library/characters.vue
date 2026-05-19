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
        </div>
        <div class="card-body">
          <h3>{{ item.name || '未命名角色' }}</h3>
          <p class="card-meta">{{ [item.gender, item.age, item.role].filter(Boolean).join(' · ') || '角色' }}</p>
          <p class="card-desc">{{ item.description || item.appearance || '暂无角色描述' }}</p>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { Loader2, Plus, Search, UserRound } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { characterAPI } from '~/composables/useApi'

const keyword = ref('')
const items = ref([])
const loading = ref(false)

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

function createCharacter() {
  navigateTo('/drama/1/episode/1?create=character')
}

onMounted(load)
</script>

<style scoped>
.library-page {
  min-height: 100%;
  padding: 32px;
  background: var(--chatfire-bg-primary);
  color: var(--chatfire-text-primary);
}
.library-hero {
  height: 128px;
  border-radius: 16px;
  background: #2b2e36;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 42px;
}
.library-title-wrap {
  display: flex;
  align-items: center;
  gap: 22px;
}
.library-title-wrap h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1.2;
}
.library-title-wrap p,
.library-stat span {
  margin: 6px 0 0;
  color: rgba(255,255,255,0.52);
  font-size: 14px;
}
.library-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.library-stat strong {
  margin-top: 8px;
  font-size: 30px;
}
.library-search {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 28px;
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
  margin-top: 28px;
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
</style>
