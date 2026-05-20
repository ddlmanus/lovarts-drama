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
          <p class="menu-category">Codex</p>
          <a href="/chat" target="_blank" rel="noopener noreferrer" class="menu-item" :class="{ active: route.path === '/chat' }" @click="sidebarOpen = false">
            <MessageSquareText :size="20" />
            <span>Codex</span>
          </a>

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
          <a href="/admin" target="_blank" rel="noopener noreferrer" class="menu-item" @click="sidebarOpen = false">
            <FileCode2 :size="20" />
            <span>后台管理</span>
          </a>
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
          <button class="bottom-item" type="button" @click="openAuthDialog">
            <CircleUserRound :size="20" />
            <span>{{ currentUser?.name || '登录 / 注册' }}</span>
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

    <div v-if="authDialogOpen" class="auth-overlay" @click.self="closeAuthDialog">
      <div class="auth-dialog">
        <button class="auth-close" type="button" @click="closeAuthDialog">×</button>
        <form v-if="authMode === 'register'" class="login-form register" @submit.prevent="submitRegister">
          <div class="form-header"><h2 class="form-title">注册账号</h2></div>
          <div class="form-content">
            <div class="form-group"><div class="input-prefix"><UserRound :size="18" /><input v-model="registerForm.account" type="text" placeholder="输入账号" maxlength="32" /></div></div>
            <div class="form-group"><div class="input-prefix"><LockKeyhole :size="18" /><input v-model="registerForm.password" type="password" placeholder="设置密码（不少于6位）" /></div></div>
            <div class="form-group"><div class="input-prefix"><ShieldCheck :size="18" /><input v-model="registerForm.confirmPassword" type="password" placeholder="确认密码" /></div></div>
            <div class="form-group verification-code">
              <div class="input-prefix"><Hash :size="18" /><input v-model="registerForm.captcha" type="text" placeholder="输入图形验证码" maxlength="4" /></div>
              <button class="captcha-image" type="button" @click="refreshCaptcha">{{ captchaText }}</button>
            </div>
            <div class="form-group"><div class="input-prefix"><Ticket :size="18" /><input v-model="registerForm.inviteCode" type="text" placeholder="邀请码（可选）" maxlength="8" /></div></div>
            <div class="agreement"><label>注册即表示您已同意<span class="link">用户协议</span>和<span class="link">隐私政策</span></label></div>
            <button class="login-btn" type="submit" :disabled="authLoading">{{ authLoading ? '注册中...' : '注册' }}</button>
            <div class="actions"><button type="button" @click="authMode = 'login'">返回登录</button></div>
          </div>
        </form>

        <form v-else-if="authMode === 'provider'" class="login-form provider-form" @submit.prevent="saveProvider">
          <div class="form-header">
            <h2 class="form-title">选择供应商</h2>
            <p class="form-subtitle">填写你的 Base URL 和 API Key，后续模型调用会优先使用你的密钥。</p>
          </div>
          <div class="form-content">
            <div class="form-group">
              <select v-model.number="providerForm.providerId">
                <option disabled :value="0">选择供应商</option>
                <option v-for="p in activeProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option>
              </select>
            </div>
            <div class="form-group"><div class="input-prefix"><LinkIcon :size="18" /><input v-model="providerForm.baseUrl" type="text" placeholder="Base URL，例如 https://zenmux.ai/api/v1" /></div></div>
            <div class="form-group"><div class="input-prefix"><KeyRound :size="18" /><input v-model="providerForm.apiKey" type="password" placeholder="API Key" /></div></div>
            <button class="login-btn" type="submit" :disabled="authLoading">{{ authLoading ? '保存中...' : '保存并开始使用' }}</button>
            <div class="actions"><button type="button" @click="closeAuthDialog">稍后设置</button></div>
          </div>
        </form>

        <form v-else class="login-form" @submit.prevent="submitLogin">
          <div class="tabs">
            <div class="tab">验证码登录</div>
            <div class="tab active">密码登录 <div class="tab__line"></div></div>
          </div>
          <div class="form-content">
            <div class="form-group"><div class="input-prefix"><UserRound :size="18" /><input v-model="loginForm.account" type="text" placeholder="输入账号" /></div></div>
            <div class="form-group"><div class="input-prefix"><LockKeyhole :size="18" /><input v-model="loginForm.password" type="password" placeholder="输入密码" /></div></div>
            <div class="form-group verification-code">
              <div class="input-prefix"><Hash :size="18" /><input v-model="loginForm.captcha" type="text" placeholder="输入图形验证码" maxlength="4" /></div>
              <button class="captcha-image" type="button" @click="refreshCaptcha">{{ captchaText }}</button>
            </div>
            <div class="agreement"><label>登录即表示您已同意<span class="link">用户协议</span>和<span class="link">隐私政策</span>，未注册的手机号将自动注册</label></div>
            <button class="login-btn" type="submit" :disabled="authLoading">{{ authLoading ? '登录中...' : '登录' }}</button>
            <div class="actions"><span></span><button type="button" @click="authMode = 'register'">立即注册</button></div>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  CircleHelp,
  CircleUserRound,
  FileCode2,
  Folder,
  Gift,
  Hash,
  House,
  KeyRound,
  Lightbulb,
  LinkIcon,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Mountain,
  PanelLeftClose,
  Presentation,
  ScrollText,
  ShieldCheck,
  SquarePlay,
  Ticket,
  UserRound,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import brandLogo from '~/assets/huobao-logo.png'
import { aiModelAPI, authAPI, getAuthUser, setAuthSession } from '~/composables/useApi'

const route = useRoute()
const sidebarOpen = ref(false)
const showBrandImage = ref(true)
const authDialogOpen = ref(false)
const authMode = ref('login')
const authLoading = ref(false)
const currentUser = ref(null)
const captchaText = ref('')
const providers = ref([])
const loginForm = reactive({ account: '', password: '', captcha: '' })
const registerForm = reactive({ account: '', password: '', confirmPassword: '', captcha: '', inviteCode: '' })
const providerForm = reactive({ providerId: 0, baseUrl: 'https://zenmux.ai/api/v1', apiKey: '' })
const activeProviders = computed(() => providers.value.filter(p => p.is_active !== false))

onMounted(() => {
  currentUser.value = getAuthUser()
  refreshCaptcha()
  window.addEventListener('huobao-auth-change', syncAuthUser)
})

onBeforeUnmount(() => {
  window.removeEventListener('huobao-auth-change', syncAuthUser)
})

function syncAuthUser() {
  currentUser.value = getAuthUser()
}

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

function refreshCaptcha() {
  captchaText.value = String(Math.floor(1000 + Math.random() * 9000))
}

async function loadProviders() {
  if (providers.value.length) return
  providers.value = await aiModelAPI.adminProviders()
  const zenmux = providers.value.find(p => p.key === 'zenmux' || p.provider === 'zenmux')
  if (zenmux) providerForm.providerId = zenmux.id
}

async function openAuthDialog() {
  sidebarOpen.value = false
  authMode.value = currentUser.value ? 'provider' : 'login'
  refreshCaptcha()
  if (currentUser.value) await loadProviders()
  authDialogOpen.value = true
}

function closeAuthDialog() {
  authDialogOpen.value = false
}

function assertCaptcha(value) {
  if (String(value || '').trim() !== captchaText.value) {
    refreshCaptcha()
    throw new Error('验证码错误')
  }
}

async function submitLogin() {
  try {
    authLoading.value = true
    assertCaptcha(loginForm.captcha)
    const result = await authAPI.login({ ...loginForm, captcha_id: captchaText.value })
    setAuthSession(result.token, result.user)
    currentUser.value = result.user
    toast.success('登录成功')
    closeAuthDialog()
  } catch (err) {
    toast.error(err.message || '登录失败')
  } finally {
    authLoading.value = false
  }
}

async function submitRegister() {
  try {
    authLoading.value = true
    assertCaptcha(registerForm.captcha)
    const result = await authAPI.register({
      account: registerForm.account,
      password: registerForm.password,
      confirm_password: registerForm.confirmPassword,
      captcha: registerForm.captcha,
      captcha_id: captchaText.value,
      invite_code: registerForm.inviteCode,
    })
    setAuthSession(result.token, result.user)
    currentUser.value = result.user
    await loadProviders()
    toast.success('注册成功，请配置供应商')
    authMode.value = 'provider'
  } catch (err) {
    toast.error(err.message || '注册失败')
  } finally {
    authLoading.value = false
  }
}

async function saveProvider() {
  try {
    authLoading.value = true
    await aiModelAPI.connectUserProvider({
      provider_id: providerForm.providerId,
      base_url: providerForm.baseUrl,
      api_key: providerForm.apiKey,
    })
    toast.success('供应商已保存')
    closeAuthDialog()
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    authLoading.value = false
  }
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

.auth-overlay {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: grid;
  place-items: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(8px);
}

.auth-dialog {
  position: relative;
  width: min(420px, calc(100vw - 32px));
}

.auth-close {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 2;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #737373;
  font-size: 22px;
}

.login-form {
  width: 100%;
  padding: 30px;
  border-radius: 8px;
  background: #fff;
  color: #171717;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
}

.login-form.register,
.provider-form {
  padding-top: 34px;
}

.form-header {
  text-align: center;
  margin-bottom: 22px;
}

.form-title {
  margin: 0;
  color: #171717;
  font-size: 24px;
  font-weight: 700;
}

.form-subtitle {
  margin: 8px 0 0;
  color: #737373;
  font-size: 13px;
  line-height: 1.6;
}

.tabs {
  display: flex;
  height: 44px;
  margin-bottom: 24px;
  border-bottom: 1px solid #ededed;
}

.tab {
  position: relative;
  flex: 1;
  display: grid;
  place-items: center;
  color: #737373;
  font-size: 15px;
}

.tab.active {
  color: #111;
  font-weight: 700;
}

.tab__line {
  position: absolute;
  left: 50%;
  bottom: -1px;
  width: 42px;
  height: 3px;
  border-radius: 4px;
  background: #111;
  transform: translateX(-50%);
}

.form-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-group {
  height: 46px;
}

.input-prefix,
.form-group select {
  display: flex;
  align-items: center;
  width: 100%;
  height: 46px;
  border: 1px solid #e5e5e5;
  border-radius: 8px;
  background: #fafafa;
}

.form-group select {
  padding: 0 12px;
  color: #171717;
  font-size: 14px;
}

.input-prefix svg {
  flex: 0 0 auto;
  margin-left: 13px;
  color: #737373;
}

.input-prefix input {
  min-width: 0;
  flex: 1;
  height: 100%;
  padding: 0 13px 0 10px;
  border: 0;
  outline: 0;
  background: transparent;
  color: #171717;
  font-size: 14px;
}

.verification-code {
  display: grid;
  grid-template-columns: 1fr 116px;
  gap: 10px;
}

.captcha-image {
  display: grid;
  place-items: center;
  height: 46px;
  border: 0;
  border-radius: 8px;
  background: repeating-linear-gradient(135deg, #f5f5f5 0 8px, #ededed 8px 16px);
  color: #1f1f1f;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
}

.agreement {
  color: #737373;
  font-size: 12px;
  line-height: 1.6;
}

.agreement .link {
  color: #111;
  font-weight: 600;
}

.login-btn {
  display: grid;
  place-items: center;
  width: 100%;
  height: 46px;
  border: 0;
  border-radius: 8px;
  background: #111;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
}

.login-btn:disabled {
  opacity: .65;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #737373;
  font-size: 13px;
}

.actions button {
  border: 0;
  background: transparent;
  color: #171717;
  font-size: 13px;
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
