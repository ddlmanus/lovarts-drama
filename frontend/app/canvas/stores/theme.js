/**
 * Theme store | 主题状态管理
 * Handles dark/light mode switching
 */
import { ref, watch } from 'vue'

// Get initial theme from localStorage or system preference | 从本地存储或系统偏好获取初始主题
const getInitialTheme = () => {
  if (typeof window === 'undefined') return true
  const stored = localStorage.getItem('theme')
  if (stored) return stored === 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export const isDark = ref(getInitialTheme())

// Watch and apply theme changes | 监听并应用主题变化
watch(isDark, (value) => {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', value)
  localStorage.setItem('theme', value ? 'dark' : 'light')
}, { immediate: true })

// Toggle theme | 切换主题
export const toggleTheme = () => {
  isDark.value = !isDark.value
}
