<template>
  <div class="app-shell">
    <button class="mobile-menu" type="button" aria-label="打开菜单" @click="sidebarOpen = true">
      <Menu :size="22" />
    </button>

    <div v-if="sidebarOpen" class="mobile-backdrop" @click="sidebarOpen = false"></div>

    <aside class="floating-sidebar" :class="{ 'is-open': sidebarOpen, 'is-collapsed': sidebarCollapsed }">
      <div class="sidebar-container">
        <div class="logo-section">
          <button class="logo-home" type="button" @click="goHome" aria-label="回到首页">
            <div class="logo-copy">
              <strong>{{ siteName }}</strong>
            </div>
          </button>
          <button class="sidebar-collapse-btn" type="button" :aria-label="sidebarCollapsed ? '展开侧边栏' : '收起侧边栏'" @click="toggleSidebarCollapsed">
            <PanelLeftClose class="collapse-icon" :size="24" />
          </button>
        </div>

        <nav class="menu-list" aria-label="主导航">
          <p class="menu-category">Codex</p>
          <a href="/chat" target="_blank" rel="noopener noreferrer" class="menu-item" :class="{ active: route.path === '/chat' }" @click="sidebarOpen = false">
            <MessageSquareText :size="20" />
            <span>Codex</span>
          </a>

          <p class="menu-category">AI 创作</p>
          <NuxtLink to="/" class="menu-item" :class="{ active: route.path === '/' }" @click="sidebarOpen = false">
            <House :size="20" />
            <span>灵感</span>
          </NuxtLink>
          <NuxtLink to="/generate" class="menu-item" :class="{ active: route.path === '/generate' }" @click="sidebarOpen = false">
            <Lightbulb :size="20" />
            <span>创作</span>
          </NuxtLink>
          <NuxtLink to="/canvas" class="menu-item" :class="{ active: route.path.startsWith('/canvas') }" @click="sidebarOpen = false">
            <Presentation :size="20" />
            <span>画布</span>
          </NuxtLink>
          <NuxtLink to="/drama" class="menu-item" :class="{ active: route.path === '/drama' || route.path.startsWith('/drama/') }" @click="sidebarOpen = false">
            <SquarePlay :size="20" />
            <span>AI短剧</span>
          </NuxtLink>
          <NuxtLink to="/library/characters" class="menu-item" :class="{ active: route.path === '/library/characters' }" @click="sidebarOpen = false">
            <UserRound :size="20" />
            <span>角色库</span>
          </NuxtLink>
          <NuxtLink to="/library/scenes" class="menu-item" :class="{ active: route.path === '/library/scenes' }" @click="sidebarOpen = false">
            <Mountain :size="20" />
            <span>场景库</span>
          </NuxtLink>

          <p class="menu-category">账户管理</p>
          <NuxtLink to="/account" class="menu-item" :class="{ active: route.path === '/account' }" @click="sidebarOpen = false">
            <CircleUserRound :size="20" />
            <span>会员套餐</span>
          </NuxtLink>
          <NuxtLink to="/transactions" class="menu-item" :class="{ active: route.path === '/transactions' }" @click="sidebarOpen = false">
            <ScrollText :size="20" />
            <span>交易记录</span>
          </NuxtLink>
        </nav>

        <div class="sidebar-bottom">
          <button class="bottom-item" type="button" @click="openAuthDialog">
            <CircleUserRound :size="20" />
            <span>{{ currentUser?.name || '登录 / 注册' }}</span>
          </button>
        </div>
      </div>
    </aside>

    <main class="content-wrapper" :class="{ 'sidebar-collapsed': sidebarCollapsed }">
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

        <section v-else-if="authMode === 'profile'" class="login-form profile-card">
          <div class="profile-head">
            <div class="profile-avatar">{{ userInitial }}</div>
            <div>
              <h2 class="form-title">{{ currentUser?.name || '未命名用户' }}</h2>
              <p class="form-subtitle">{{ currentUser?.account || currentUser?.email || currentUser?.id || '-' }}</p>
            </div>
          </div>
          <div class="profile-list">
            <div class="profile-row"><span>用户 ID</span><strong>{{ currentUser?.id || '-' }}</strong></div>
            <div class="profile-row"><span>名称</span><strong>{{ currentUser?.name || '-' }}</strong></div>
            <div class="profile-row"><span>账号</span><strong>{{ currentUser?.account || '-' }}</strong></div>
            <div class="profile-row"><span>邮箱</span><strong>{{ currentUser?.email || '-' }}</strong></div>
            <div class="profile-row"><span>积分</span><strong>{{ billingStatus?.credits ?? currentUser?.credits ?? 0 }}</strong></div>
            <div class="profile-row"><span>会员状态</span><strong>{{ membershipStatusLabel }}</strong></div>
            <div class="profile-row"><span>角色</span><strong>{{ roleLabel }}</strong></div>
          </div>
          <div class="profile-actions">
            <button v-if="isAdminUser" class="secondary-action" type="button" @click="enterAdmin">
              <FileCode2 :size="17" />
              <span>进入后台</span>
            </button>
            <button class="secondary-action" type="button" @click="openProviderSettings">供应商设置</button>
            <button class="logout-btn" type="button" @click="logout">
              <LogOut :size="17" />
              <span>退出登录</span>
            </button>
          </div>
        </section>

        <section v-else-if="authMode === 'resourceMode'" class="login-form resource-mode-card">
          <div class="form-header">
            <h2 class="form-title">选择使用方式</h2>
            <p class="form-subtitle">你可以接入自己的供应商 API，也可以使用平台模型并通过会员/积分消费。</p>
          </div>
          <div class="resource-options">
            <button type="button" class="resource-option" @click="chooseUserApiMode">
              <strong>我有自己的 API</strong>
              <span>使用你自己的供应商密钥调用模型，默认不扣平台积分。</span>
            </button>
            <button type="button" class="resource-option accent" @click="choosePlatformMode">
              <strong>我没有 API，使用平台资源</strong>
              <span>使用平台配置的图片、视频、文本和音频模型，购买会员或积分后消费。</span>
            </button>
          </div>
        </section>

        <form v-else-if="authMode === 'provider'" class="login-form provider-form" @submit.prevent="saveProvider">
          <div class="form-header">
            <h2 class="form-title">选择供应商</h2>
            <p class="form-subtitle">填写你的 Base URL 和 API Key，可以为同一账号添加多个供应商密钥。</p>
          </div>
          <div class="form-content">
            <div class="form-group">
              <select v-model.number="providerForm.providerId" @change="syncSelectedProviderDefaults">
                <option disabled :value="0">选择供应商</option>
                <option v-for="p in activeProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option>
              </select>
            </div>
            <div class="form-group"><div class="input-prefix"><SettingsIcon :size="18" /><input v-model="providerForm.name" type="text" placeholder="配置名称，例如 Gemini 官方 / ZenMux 主账号" /></div></div>
            <div class="form-group"><div class="input-prefix"><LinkIcon :size="18" /><input v-model="providerForm.baseUrl" type="text" placeholder="Base URL，例如 https://zenmux.ai/api/v1" /></div></div>
            <div class="form-group"><div class="input-prefix"><KeyRound :size="18" /><input v-model="providerForm.apiKey" type="password" placeholder="API Key" /></div></div>
            <button class="login-btn" type="submit" :disabled="authLoading">{{ authLoading ? '保存中...' : '添加并开始使用' }}</button>
            <div class="actions"><button type="button" @click="authMode = 'resourceMode'">返回选择</button></div>
          </div>
        </form>

        <section v-else-if="authMode === 'providerSaved'" class="login-form provider-saved-card">
          <div class="form-header">
            <h2 class="form-title">供应商已添加</h2>
            <p class="form-subtitle">是否继续添加其他供应商密钥？完成后会刷新页面，重新获取你的所有供应商模型和平台模型。</p>
          </div>
          <div class="provider-saved-actions">
            <button class="login-btn" type="button" :disabled="authLoading" @click="continueAddingProvider">继续添加</button>
            <button class="secondary-action full" type="button" :disabled="authLoading" @click="finishProviderSetup">完成并刷新</button>
          </div>
        </section>

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
  CircleUserRound,
  FileCode2,
  Hash,
  House,
  KeyRound,
  Lightbulb,
  LinkIcon,
  LogOut,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Mountain,
  PanelLeftClose,
  Presentation,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  SquarePlay,
  Ticket,
  UserRound,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { aiModelAPI, authAPI, billingAPI, clearAuthSession, getAuthUser, setAuthSession, siteAPI, subscribeCreditEvents, updateAuthUser } from '~/composables/useApi'
import { useModelCatalog } from '~/composables/useModelCatalog'

const route = useRoute()
const sidebarOpen = ref(false)
const sidebarCollapsed = ref(false)
const siteName = ref('Lovarts短剧平台')
const authDialogOpen = ref(false)
const authMode = ref('login')
const authLoading = ref(false)
const currentUser = ref(null)
const billingStatus = ref(null)
const captchaText = ref('')
const providers = ref([])
const { loadModelCatalog, resetModelCatalog } = useModelCatalog()
let creditEventSource = null
const loginForm = reactive({ account: '', password: '', captcha: '' })
const registerForm = reactive({ account: '', password: '', confirmPassword: '', captcha: '', inviteCode: '' })
const providerForm = reactive({ providerId: 0, name: '', baseUrl: 'https://zenmux.ai/api/v1', apiKey: '' })
const activeProviders = computed(() => (Array.isArray(providers.value) ? providers.value : []).filter(p => p.is_active !== false))
const userInitial = computed(() => String(currentUser.value?.name || currentUser.value?.account || currentUser.value?.id || 'U').trim().slice(0, 1).toUpperCase())
const membershipStatusLabel = computed(() => {
  const status = String(billingStatus.value?.membership_status || currentUser.value?.membership_status || 'none').toLowerCase()
  const labels = {
    active: '付费会员',
    none: '未开通',
    expired: '已过期',
    cancelled: '已取消',
    canceled: '已取消',
    pending: '待生效',
  }
  return labels[status] || status || '-'
})
const roleLabel = computed(() => {
  const role = String(currentUser.value?.role || 'user').toLowerCase()
  const labels = {
    admin: '管理员',
    user: '普通用户',
  }
  return labels[role] || role || '-'
})
const isAdminUser = computed(() => String(currentUser.value?.role || '').toLowerCase() === 'admin')

onMounted(() => {
  currentUser.value = getAuthUser()
  preloadModels()
  loadSiteSettings()
  refreshCaptcha()
  window.addEventListener('huobao-auth-change', syncAuthUser)
  window.addEventListener('huobao-model-config-change', reloadModelCatalog)
  connectCreditEvents()
})

onBeforeUnmount(() => {
  window.removeEventListener('huobao-auth-change', syncAuthUser)
  window.removeEventListener('huobao-model-config-change', reloadModelCatalog)
  disconnectCreditEvents()
})

function syncAuthUser() {
  currentUser.value = getAuthUser()
  reloadModelCatalog()
  loadBillingStatus()
  connectCreditEvents()
}

async function preloadModels() {
  try {
    await loadModelCatalog()
  } catch (err) {
    toast.error(err.message || '模型加载失败')
  }
}

async function reloadModelCatalog() {
  resetModelCatalog()
  await preloadModels()
}

async function loadSiteSettings() {
  try {
    const settings = await siteAPI.settings()
    const name = String(settings?.site_name || settings?.site_title || '').trim()
    if (name) siteName.value = name
  } catch {}
}

function updateCurrentUser(user) {
  currentUser.value = {
    ...(currentUser.value || {}),
    ...(user || {}),
  }
  if (currentUser.value?.id) updateAuthUser(currentUser.value)
}

async function loadCurrentUser() {
  if (!getAuthUser()?.id) {
    currentUser.value = null
    billingStatus.value = null
    return null
  }
  try {
    const user = await authAPI.me()
    if (user) updateCurrentUser(user)
    return user
  } catch {
    return null
  }
}

function disconnectCreditEvents() {
  if (creditEventSource) {
    creditEventSource.close()
    creditEventSource = null
  }
}

function connectCreditEvents() {
  disconnectCreditEvents()
  if (!getAuthUser()?.id) return
  creditEventSource = subscribeCreditEvents((event) => {
    if (event?.type !== 'credits.changed') return
    billingStatus.value = {
      ...(billingStatus.value || {}),
      credits: event.credits,
    }
    currentUser.value = {
      ...(currentUser.value || {}),
      credits: event.credits,
    }
  })
}

function goHome() {
  sidebarOpen.value = false
  navigateTo('/')
}

function toggleSidebarCollapsed() {
  sidebarCollapsed.value = !sidebarCollapsed.value
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
  const result = await aiModelAPI.providers()
  providers.value = Array.isArray(result) ? result : (result?.items || [])
  const zenmux = providers.value.find(p => p.key === 'zenmux' || p.provider === 'zenmux')
  if (zenmux && !providerForm.providerId) providerForm.providerId = zenmux.id
  syncSelectedProviderDefaults()
}

function syncSelectedProviderDefaults() {
  const selected = providers.value.find(p => Number(p.id) === Number(providerForm.providerId))
  if (!selected) return
  providerForm.name = providerForm.name || selected.display_name || selected.name || ''
  providerForm.baseUrl = selected.default_url || selected.defaultUrl || providerForm.baseUrl || ''
}

async function openProviderSettings() {
  authMode.value = 'provider'
  try {
    await loadProviders()
  } catch (err) {
    toast.error(err.message || '供应商加载失败')
  }
}

function enterAdmin() {
  closeAuthDialog()
  navigateTo('/admin')
}

async function openAuthDialog() {
  sidebarOpen.value = false
  authMode.value = currentUser.value ? 'profile' : 'login'
  if (currentUser.value) {
    await loadCurrentUser()
    await loadBillingStatus()
  }
  refreshCaptcha()
  authDialogOpen.value = true
}

async function loadBillingStatus() {
  if (!currentUser.value) {
    billingStatus.value = null
    return
  }
  try {
    const status = await billingAPI.membershipStatus()
    billingStatus.value = status
    updateCurrentUser(status)
  } catch {
    billingStatus.value = null
  }
}

function closeAuthDialog() {
  authDialogOpen.value = false
}

function logout() {
  clearAuthSession()
  currentUser.value = null
  closeAuthDialog()
  toast.success('已退出登录')
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
    toast.success('注册成功')
    authMode.value = 'resourceMode'
  } catch (err) {
    toast.error(err.message || '注册失败')
  } finally {
    authLoading.value = false
  }
}

async function chooseUserApiMode() {
  try {
    await loadProviders()
    authMode.value = 'provider'
  } catch (err) {
    toast.error(err.message || '供应商加载失败')
  }
}

async function choosePlatformMode() {
  try {
    authLoading.value = true
    const user = await authAPI.setResourceMode({ resource_mode: 'platform' })
    updateCurrentUser(user)
    toast.success('已切换为平台资源模式，可购买会员或积分后使用')
    closeAuthDialog()
    navigateTo('/account')
  } catch (err) {
    toast.error(err.message || '设置失败')
  } finally {
    authLoading.value = false
  }
}

async function saveProvider() {
  try {
    authLoading.value = true
    await aiModelAPI.connectUserProvider({
      provider_id: providerForm.providerId,
      name: providerForm.name,
      base_url: providerForm.baseUrl,
      api_key: providerForm.apiKey,
    })
    toast.success('供应商密钥已添加')
    providerForm.apiKey = ''
    const user = await loadCurrentUser()
    if (user) updateCurrentUser(user)
    window.dispatchEvent(new CustomEvent('huobao-model-config-change'))
    authMode.value = 'providerSaved'
  } catch (err) {
    toast.error(err.message || '保存失败')
  } finally {
    authLoading.value = false
  }
}

async function continueAddingProvider() {
  try {
    await loadProviders()
    providerForm.name = ''
    providerForm.apiKey = ''
    syncSelectedProviderDefaults()
    authMode.value = 'provider'
  } catch (err) {
    toast.error(err.message || '供应商加载失败')
  }
}

function finishProviderSetup() {
  closeAuthDialog()
  window.location.reload()
}

</script>

<style scoped>
.app-shell {
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
  background: #18191b;
  color: var(--chatfire-text-primary);
}

.floating-sidebar {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 100;
  width: 196px;
  height: calc(100vh - 20px);
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 16px 38px rgba(0, 0, 0, 0.28);
  transition: width 0.3s cubic-bezier(.25,.46,.45,.94), transform 0.3s cubic-bezier(.25,.46,.45,.94);
}

.floating-sidebar.is-collapsed {
  width: 64px;
}

.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(180deg, #26272a 0%, #202124 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(14px);
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  min-height: 60px;
  padding: 13px 14px;
  color: var(--chatfire-text-primary);
  border: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: transparent;
  text-align: left;
}

.logo-home,
.sidebar-collapse-btn {
  display: flex;
  align-items: center;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.logo-home {
  flex: 1;
  padding: 0;
  cursor: pointer;
}

.sidebar-collapse-btn {
  justify-content: center;
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  border-radius: 8px;
  cursor: pointer;
}

.sidebar-collapse-btn:hover {
  background: rgba(255,255,255,0.08);
}

.logo-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
  max-width: 132px;
  min-width: 0;
  overflow: hidden;
}

.logo-copy strong {
  font-size: 16px;
  font-weight: 800;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.collapse-icon {
  flex-shrink: 0;
  color: #f2f6fb;
  transition: transform 0.2s ease;
}

.floating-sidebar.is-collapsed .collapse-icon {
  transform: rotate(180deg);
}

.floating-sidebar.is-collapsed .logo-section {
  justify-content: center;
  padding: 12px 8px;
}

.floating-sidebar.is-collapsed .logo-home {
  display: none;
}

.floating-sidebar.is-collapsed .sidebar-collapse-btn {
  width: 40px;
}

.floating-sidebar.is-collapsed .menu-category,
.floating-sidebar.is-collapsed .menu-item span,
.floating-sidebar.is-collapsed .bottom-item span {
  display: none;
}

.floating-sidebar.is-collapsed .menu-list {
  padding-top: 8px;
}

.floating-sidebar.is-collapsed .menu-item,
.floating-sidebar.is-collapsed .bottom-item {
  justify-content: center;
  width: 48px;
  margin: 4px 8px;
  padding: 0;
  gap: 0;
}

.menu-list {
  flex: 1;
  overflow-y: auto;
  padding: 10px 0;
}

.menu-list::-webkit-scrollbar {
  display: none;
}

.menu-category {
  padding: 10px 16px 6px;
  font-size: 11px;
  font-weight: 700;
  color: rgba(148, 163, 184, 0.58);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% - 16px);
  height: 42px;
  margin: 4px 8px;
  padding: 0 14px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(226, 232, 240, 0.82);
  font-size: 14px;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(.25,.46,.45,.94);
}

.menu-item:hover,
.bottom-item:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #fff;
}

.menu-item.active {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1d7cff, #675cff);
  color: #fff;
  font-weight: 600;
  box-shadow: 0 8px 18px rgba(0, 120, 255, 0.24);
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
  padding-left: 216px;
  transition: padding-left 0.3s cubic-bezier(.25,.46,.45,.94);
}

.content-wrapper.sidebar-collapsed {
  padding-left: 74px;
}

.content-area {
  height: 100%;
  overflow: auto;
  overflow-x: hidden;
  padding: 10px 10px 10px 0;
  background: #18191b;
}

.content-container {
  min-height: calc(100vh - 20px);
  height: calc(100vh - 20px);
  margin: 0 auto;
  overflow: hidden;
  border-radius: 8px;
  background: #1b1c1f;
  border: 1px solid rgba(255, 255, 255, 0.06);
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
.provider-form,
.provider-saved-card,
.resource-mode-card {
  padding-top: 34px;
}

.provider-saved-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.profile-card {
  padding-top: 28px;
}

.profile-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
}

.profile-avatar {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex-shrink: 0;
  border-radius: 50%;
  background: #111;
  color: #fff;
  font-size: 20px;
  font-weight: 800;
}

.profile-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid #ededed;
  border-bottom: 1px solid #ededed;
}

.profile-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
  border-top: 1px solid #ededed;
  color: #737373;
  font-size: 13px;
}

.profile-row:first-child {
  border-top: 0;
}

.profile-row strong {
  min-width: 0;
  color: #171717;
  font-size: 14px;
  font-weight: 700;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 20px;
}

.secondary-action,
.logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.secondary-action.full {
  width: 100%;
  letter-spacing: 0;
}

.secondary-action {
  flex: 1;
  border: 1px solid #e5e5e5;
  background: #fafafa;
  color: #171717;
}

.logout-btn {
  flex: 1;
  border: 0;
  background: #ef4444;
  color: #fff;
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

.resource-options {
  display: grid;
  gap: 12px;
}

.resource-option {
  display: grid;
  gap: 8px;
  width: 100%;
  padding: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #fafafa;
  color: #171717;
  text-align: left;
  cursor: pointer;
  transition: border-color .16s ease, background .16s ease;
}

.resource-option:hover {
  border-color: #9ca3af;
  background: #fff;
}

.resource-option.accent {
  border-color: rgba(10, 132, 255, .32);
  background: rgba(10, 132, 255, .08);
}

.resource-option strong {
  font-size: 15px;
}

.resource-option span {
  color: #71717a;
  font-size: 13px;
  line-height: 1.5;
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

  .floating-sidebar.is-collapsed {
    width: 280px;
  }

  .floating-sidebar.is-collapsed .logo-home {
    display: flex;
  }

  .floating-sidebar.is-collapsed .logo-section {
    justify-content: space-between;
    padding: 12px;
  }

  .floating-sidebar.is-collapsed .menu-category {
    display: block;
  }

  .floating-sidebar.is-collapsed .menu-item span,
  .floating-sidebar.is-collapsed .bottom-item span {
    display: inline;
  }

  .floating-sidebar.is-collapsed .menu-item,
  .floating-sidebar.is-collapsed .bottom-item {
    justify-content: flex-start;
    width: calc(100% - 16px);
    padding: 0 16px;
    gap: 12px;
  }

  .floating-sidebar.is-open {
    transform: translateX(0);
  }

  .content-wrapper,
  .content-wrapper.sidebar-collapsed {
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
