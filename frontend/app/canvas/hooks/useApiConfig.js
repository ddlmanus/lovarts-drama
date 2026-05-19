/**
 * API Config Hook | API 配置 Hook
 */

import { ref, computed, watch } from 'vue'
import { setBaseUrl as setRequestBaseUrl } from '~/canvas/utils'
import { DEFAULT_API_BASE_URL, STORAGE_KEYS } from '~/canvas/utils'

/**
 * Get stored value from localStorage | 从 localStorage 获取存储值
 */
const getStored = (key, defaultValue = '') => {
  try {
    return localStorage.getItem(key) || defaultValue
  } catch {
    return defaultValue
  }
}

/**
 * Set stored value to localStorage | 设置存储值到 localStorage
 */
const setStored = (key, value) => {
  try {
    if (value) {
      localStorage.setItem(key, value)
    } else {
      localStorage.removeItem(key)
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * API Configuration Hook | API 配置 Hook
 */
export const useApiConfig = () => {
  const apiKey = ref(getStored(STORAGE_KEYS.API_KEY))
  const baseUrl = ref(getStored(STORAGE_KEYS.BASE_URL, DEFAULT_API_BASE_URL))
  
  const isConfigured = computed(() => !!apiKey.value)

  // Watch and sync changes | 监听并同步变化
  watch(apiKey, (newKey) => {
    setStored(STORAGE_KEYS.API_KEY, newKey)
  })

  watch(baseUrl, (newUrl) => {
    setRequestBaseUrl(newUrl)
    setStored(STORAGE_KEYS.BASE_URL, newUrl)
  })

  const setApiKey = (key) => {
    apiKey.value = key
    setStored(STORAGE_KEYS.API_KEY, key)
  }

  const setBaseUrl = (url) => {
    baseUrl.value = url
    setStored(STORAGE_KEYS.BASE_URL, url)
  }

  const configure = (config) => {
    if (config.apiKey) setApiKey(config.apiKey)
    if (config.baseUrl) setBaseUrl(config.baseUrl)
  }

  const clear = () => {
    apiKey.value = ''
    baseUrl.value = DEFAULT_API_BASE_URL
  }

  return {
    apiKey,
    baseUrl,
    isConfigured,
    setApiKey,
    setBaseUrl,
    configure,
    clear
  }
}
