<template>
  <div class="app-shell">
    <button class="mobile-menu" type="button" aria-label="打开菜单" @click="sidebarOpen = true">
      <Menu :size="22" />
    </button>

    <div v-if="sidebarOpen" class="mobile-backdrop" @click="sidebarOpen = false"></div>

    <aside class="floating-sidebar" :class="{ 'is-open': sidebarOpen }">
      <div class="sidebar-container">
        <button class="logo-section" type="button" @click="goHome">
          <div class="logo-left">
            <div class="logo-mark">
              <img v-if="showBrandImage" :src="brandLogo" alt="AI 火宝" @error="showBrandImage = false" />
              <span v-else>火</span>
            </div>
            <div class="logo-copy">
              <strong>AI 火宝</strong>
            </div>
          </div>
          <PanelLeftClose class="collapse-icon" :size="24" />
        </button>

        <nav class="menu-list" aria-label="主导航">
          <p class="menu-category">问答</p>
          <button class="menu-item" type="button" @click="comingSoon('问答')">
            <MessageSquareText :size="20" />
            <span>问答</span>
          </button>

          <p class="menu-category">AI 创作</p>
          <NuxtLink to="/home" class="menu-item" :class="{ active: route.path === '/home' }" @click="sidebarOpen = false">
            <House :size="20" />
            <span>灵感</span>
          </NuxtLink>
          <NuxtLink to="/generate" class="menu-item" :class="{ active: route.path === '/generate' }" @click="sidebarOpen = false">
            <Lightbulb :size="20" />
            <span>创作</span>
          </NuxtLink>
          <a href="/canvas" target="_blank" rel="noopener noreferrer" class="menu-item" @click="sidebarOpen = false">
            <Presentation :size="20" />
            <span>画布</span>
          </a>
          <button class="menu-item" type="button" @click="comingSoon('资产')">
            <Folder :size="20" />
            <span>资产</span>
          </button>
          <NuxtLink to="/library/characters" class="menu-item" :class="{ active: route.path === '/library/characters' }" @click="sidebarOpen = false">
            <UserRound :size="20" />
            <span>角色库</span>
          </NuxtLink>
          <NuxtLink to="/library/scenes" class="menu-item" :class="{ active: route.path === '/library/scenes' }" @click="sidebarOpen = false">
            <Mountain :size="20" />
            <span>场景库</span>
          </NuxtLink>

          <p class="menu-category">账户管理</p>
          <button class="menu-item" type="button" @click="comingSoon('套餐')">
            <CircleUserRound :size="20" />
            <span>套餐</span>
          </button>
          <button class="menu-item" type="button" @click="comingSoon('交易记录')">
            <ScrollText :size="20" />
            <span>交易记录</span>
          </button>
          <button class="menu-item" type="button" @click="comingSoon('邀请好友')">
            <Gift :size="20" />
            <span>邀请好友</span>
          </button>

          <NuxtLink to="/" class="menu-item" :class="{ active: route.path === '/' }" @click="sidebarOpen = false">
            <SquarePlay :size="20" />
            <span>火宝短剧</span>
          </NuxtLink>
          <button class="menu-item" type="button" @click="openModelConfig">
            <FileCode2 :size="20" />
            <span>开放平台</span>
          </button>
        </nav>

        <div class="sidebar-bottom">
          <button class="bottom-item" type="button" @click="comingSoon('联系我们')">
            <CircleHelp :size="20" />
            <span>联系我们</span>
          </button>
          <button class="bottom-item" type="button">
            <CircleUserRound :size="20" />
            <span>用户3184_937</span>
          </button>
        </div>
      </div>
    </aside>

    <main class="content-wrapper">
      <div class="content-area">
        <div class="content-container">
          <slot />
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import {
  CircleHelp,
  CircleUserRound,
  FileCode2,
  Folder,
  Gift,
  House,
  Lightbulb,
  Menu,
  MessageSquareText,
  Mountain,
  PanelLeftClose,
  Presentation,
  ScrollText,
  SquarePlay,
  UserRound,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import brandLogo from '~/assets/huobao-logo.png'

const route = useRoute()
const sidebarOpen = ref(false)
const showBrandImage = ref(true)

function goHome() {
  sidebarOpen.value = false
  navigateTo('/home')
}

function openModelConfig() {
  sidebarOpen.value = false
  navigateTo('/settings')
}

function comingSoon(name) {
  sidebarOpen.value = false
  toast.info(`${name}模块即将开放`)
}

</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #1f1f1f;
  color: var(--chatfire-text-primary);
}

.floating-sidebar {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 100;
  width: 180px;
  height: calc(100vh - 16px);
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.3s cubic-bezier(.25,.46,.45,.94);
}

.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #252527;
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 60px;
  padding: 12px;
  color: var(--chatfire-text-primary);
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  text-align: left;
}

.logo-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  min-width: 0;
}

.logo-mark {
  display: grid;
  place-items: center;
  width: 40px;
  height: 32px;
  overflow: hidden;
  border-radius: 12px;
  background: transparent;
  color: #fff;
  font-weight: 800;
}

.logo-mark img {
  width: 40px;
  height: 32px;
  object-fit: contain;
}

.logo-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  max-width: 80px;
  min-width: 0;
  margin-left: 8px;
  overflow: hidden;
}

.logo-copy strong {
  font-size: 17px;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-icon {
  flex-shrink: 0;
  color: #f2f6fb;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.menu-list::-webkit-scrollbar {
  display: none;
}

.menu-category {
  padding: 8px 16px;
  font-size: 11px;
  color: #737373;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  height: 40px;
  margin: 4px 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--chatfire-text-primary);
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(.25,.46,.45,.94);
}

.menu-item:hover,
.bottom-item:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.menu-item.active {
  position: relative;
  overflow: hidden;
  background: linear-gradient(90deg, #0078ff, #5b4fff);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 120, 255, 0.3);
}

.menu-item.active::before {
  position: absolute;
  top: 8px;
  left: 0;
  width: 3px;
  height: 24px;
  border-radius: 0 4px 4px 0;
  background: #fff;
  content: "";
}

.sidebar-bottom {
  margin-top: auto;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.bottom-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  height: 40px;
  margin: 4px 8px;
  padding: 0 16px;
  border: 0;
  background: transparent;
  color: var(--chatfire-text-primary);
  font-size: 14px;
  border-radius: 8px;
  white-space: nowrap;
}

.bottom-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.content-wrapper {
  position: relative;
  height: 100vh;
  width: 100vw;
  padding-left: 190px;
  transition: padding-left 0.3s cubic-bezier(.25,.46,.45,.94);
}

.content-area {
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  padding: 8px;
  background: #1f1f1f;
}

.content-container {
  min-height: calc(100vh - 16px);
  height: calc(100vh - 16px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #1f1f1f;
}

.mobile-menu,
.mobile-backdrop {
  display: none;
}

@media (max-width: 768px) {
  .mobile-menu {
    position: fixed;
    top: 16px;
    left: 16px;
    z-index: 90;
    display: grid;
    place-items: center;
    width: 48px;
    height: 48px;
    border: 0;
    border-radius: 12px;
    background: var(--chatfire-bg-elevated);
    color: var(--chatfire-text-primary);
    box-shadow: var(--chatfire-shadow);
  }

  .mobile-backdrop {
    position: fixed;
    inset: 0;
    z-index: 95;
    display: block;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(4px);
  }

  .floating-sidebar {
    z-index: 100;
    width: 280px;
    top: 0;
    left: 0;
    height: 100vh;
    border-radius: 0 8px 8px 0;
    transform: translateX(-100%);
  }

  .floating-sidebar.is-open {
    transform: translateX(0);
  }

  .content-wrapper {
    padding-left: 0;
  }

  .content-area {
    padding: 8px;
    padding-top: 80px;
  }

  .content-container {
    min-height: calc(100vh - 88px);
    height: calc(100vh - 88px);
    border-radius: 8px;
  }
}
</style>
