<template>
  <main class="admin-login-page">
    <section class="login-panel">
      <div class="brand-block">
        <span class="brand-mark">H</span>
        <div>
          <h1>后台管理登录</h1>
          <p>使用管理员账号进入模型、用户、计费和系统配置后台。</p>
        </div>
      </div>

      <form class="login-form" @submit.prevent="submit">
        <label>
          <span>账号</span>
          <input v-model.trim="form.account" autocomplete="username" placeholder="管理员账号 / 手机 / 邮箱" />
        </label>
        <label>
          <span>密码</span>
          <input v-model="form.password" autocomplete="current-password" type="password" placeholder="输入密码" />
        </label>
        <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>
        <button type="submit" :disabled="loading">{{ loading ? '登录中...' : '登录后台' }}</button>
      </form>
    </section>
  </main>
</template>

<script setup>
import { authAPI, setAuthSession } from '~/composables/useApi'

definePageMeta({ layout: false })

const router = useRouter()
const route = useRoute()
const form = reactive({ account: '', password: '' })
const loading = ref(false)
const errorMessage = ref('')

async function submit() {
  errorMessage.value = ''
  if (!form.account || !form.password) {
    errorMessage.value = '请输入账号和密码'
    return
  }
  loading.value = true
  try {
    const result = await authAPI.login({ account: form.account, password: form.password })
    if (result?.user?.role !== 'admin') {
      errorMessage.value = '当前账号不是管理员'
      return
    }
    setAuthSession(result.token, result.user)
    await router.replace(String(route.query.redirect || '/admin'))
  } catch (error) {
    errorMessage.value = error?.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.admin-login-page {
  display: grid;
  min-height: 100vh;
  place-items: center;
  padding: 24px;
  background: #17181c;
  color: #f5f7fb;
}

.login-panel {
  width: min(440px, 100%);
  padding: 28px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #22242a;
  box-shadow: 0 18px 56px rgba(0, 0, 0, 0.38);
}

.brand-block {
  display: flex;
  gap: 14px;
  align-items: center;
  margin-bottom: 28px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 8px;
  background: #0a84ff;
  font-weight: 800;
}

h1 {
  margin: 0 0 6px;
  font-size: 24px;
  letter-spacing: 0;
}

p {
  margin: 0;
  color: #aab2c0;
  font-size: 14px;
  line-height: 1.6;
}

.login-form {
  display: grid;
  gap: 16px;
}

label {
  display: grid;
  gap: 8px;
  color: #cfd5df;
  font-size: 14px;
}

input {
  width: 100%;
  height: 44px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  padding: 0 12px;
  outline: none;
  background: #17181c;
  color: #f5f7fb;
  font-size: 15px;
}

input:focus {
  border-color: #0a84ff;
}

button {
  height: 44px;
  border: 0;
  border-radius: 6px;
  background: #0a84ff;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.error-message {
  color: #ff7b7b;
}
</style>
