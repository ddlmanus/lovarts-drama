import { ref } from 'vue'
import { aiModelAPI, getAuthUser } from '~/composables/useApi'

const imageModels = ref([])
const videoModels = ref([])
const textModels = ref([])
const loading = ref(false)
const error = ref(null)
let loaded = false

export const modelOptionKey = (item) => String(item?.model_config_id || item?.id || item?.value || item?.model_id || '')

export const matchesModelOption = (item, value) => {
  const target = String(value || '')
  if (!target) return false
  return [
    modelOptionKey(item),
    item?.model_id,
    item?.value,
    item?.id,
    item?.model_config_id
  ].some(candidate => String(candidate || '') === target)
}

export const findModelOption = (items, value) => items.find(item => matchesModelOption(item, value)) || null

export const modelPayload = (item, fallbackKey = '') => ({
  model: item?.model_id || item?.value || fallbackKey,
  model_config_id: item?.model_config_id || item?.id || undefined,
  user_provider_id: item?.user_provider_id || undefined,
  provider: item?.provider || undefined
})

export const isUserApiModel = (item) => String(item?.resource_mode || '').toLowerCase() === 'user_api' || Boolean(item?.user_provider_id)

export const isOfficialModel = (item) => {
  return !isUserApiModel(item) && (
    String(item?.resource_mode || '').toLowerCase() === 'platform' ||
    Boolean(item?.is_platform_model)
  )
}

export const modelLabel = (item) => {
  const name = item?.name || item?.display_name || item?.model_name || item?.config_name || item?.label || item?.model_id || item?.value || ''
  if (!name) return ''
  const suffixes = []
  if (isOfficialModel(item)) suffixes.push('官网')
  if (item?.member_only || item?.memberOnly) suffixes.push('VIP')
  if (suffixes.length) return `${name}（${suffixes.join(' · ')}）`
  return name
}

const uniqueOptions = (items) => {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

const parameterItems = (modelConfig) => {
  const params = modelConfig?.parameter_profile?.items || modelConfig?.parameter_profile?.parameters || modelConfig?.parameters?.items || []
  return Array.isArray(params) ? params : []
}

const isAspectRatioValue = (value) => /^\d{1,2}\s*:\s*\d{1,2}$/.test(String(value || '').trim())
const isImagePixelSizeValue = (value) => /^\d{2,5}\s*x\s*\d{2,5}$/i.test(String(value || '').trim())
const isResolutionValue = (value) => /^(\d+k|\d+p)$/i.test(String(value || '').trim())
const isDurationValue = (value) => /^\d+(\.\d+)?$/.test(String(value || '').trim())
const optionFromValue = (value) => {
  const normalized = String(value || '').trim()
  return normalized ? { label: normalized, key: normalized, value: normalized } : null
}

const profileOptions = (modelConfig, predicate) => parameterItems(modelConfig)
  .filter(item => predicate(String(item.value || '').trim(), String(item.type || '').toUpperCase()))
  .map(item => ({ label: item.label || item.value, key: item.value, value: item.value }))

export const buildImageSizeOptions = (modelConfig) => {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => type === 'ASPECT_RATIO' || type === 'SIZE' || isAspectRatioValue(value) || isImagePixelSizeValue(value))
  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  return uniqueOptions([
    ...fromProfile,
    defaults.size,
    defaults.imageSize,
    defaults.image_size,
    ...(Array.isArray(capabilities.sizes) ? capabilities.sizes : []),
    ...(Array.isArray(capabilities.imageSizes) ? capabilities.imageSizes : []),
    ...(Array.isArray(capabilities.image_sizes) ? capabilities.image_sizes : []),
  ].map(item => typeof item === 'object' ? item : optionFromValue(item)).filter(Boolean))
}

export const buildAspectRatioOptions = (modelConfig) => {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => type === 'ASPECT_RATIO' || isAspectRatioValue(value))
  if (fromProfile.length) return uniqueOptions(fromProfile)
  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  return uniqueOptions([
    defaults.aspect_ratio,
    defaults.aspectRatio,
    defaults.ratio,
    ...(Array.isArray(capabilities.aspectRatios) ? capabilities.aspectRatios : [])
  ].map(optionFromValue).filter(Boolean))
}

export const buildResolutionOptions = (modelConfig, serviceType = 'image') => {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => {
    if (type === 'SAMPLE_IMAGE_SIZE') return true
    if (serviceType === 'video' && type === 'RESOLUTION') return isResolutionValue(value)
    return isResolutionValue(value)
  })
  if (fromProfile.length) return uniqueOptions(fromProfile)
  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  return uniqueOptions([
    ...(Array.isArray(capabilities.resolutions) ? capabilities.resolutions : []),
    defaults.sampleImageSize,
    defaults.sample_image_size,
    defaults.imageSizeLevel,
    defaults.image_size_level,
    defaults.resolution
  ].map(optionFromValue).filter(Boolean))
}

export const buildQualityOptions = (modelConfig) => {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (_value, type) => type === 'QUALITY' || type === 'MODE')
  if (fromProfile.length) return uniqueOptions(fromProfile)
  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  return uniqueOptions([
    defaults.quality,
    capabilities.quality,
    ...(Array.isArray(capabilities.qualities) ? capabilities.qualities : [])
  ].map(optionFromValue).filter(Boolean))
}

export const buildDurationOptions = (modelConfig) => {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => type === 'DURATION' && isDurationValue(value))
  if (fromProfile.length) {
    return uniqueOptions(fromProfile.map(item => ({
      ...item,
      label: item.label || `${item.value}s`,
      key: Number(item.value),
      value: Number(item.value)
    })))
  }
  const defaults = modelConfig.defaults || {}
  const duration = defaults.duration || defaults.dur
  return duration ? [{ label: `${duration} 秒`, key: Number(duration), value: Number(duration) }] : []
}

export const pickOption = (options, preferredValues = []) => {
  for (const preferred of preferredValues.filter(Boolean)) {
    const found = options.find(item => item.value === preferred || item.key === preferred)
    if (found) return found.value || found.key
  }
  return options[0]?.value || options[0]?.key || ''
}

export const useUserModelOptions = () => {
  const loadModels = async (force = false) => {
    if (loaded && !force) return { imageModels: imageModels.value, videoModels: videoModels.value, textModels: textModels.value }
    loading.value = true
    error.value = null
    try {
      const params = getAuthUser()?.id ? {} : { scope: 'public' }
      const [images, videos, texts] = await Promise.all([
        aiModelAPI.options('image', params),
        aiModelAPI.options('video', params),
        aiModelAPI.options('text', params)
      ])
      imageModels.value = Array.isArray(images) ? images : []
      videoModels.value = Array.isArray(videos) ? videos : []
      textModels.value = Array.isArray(texts) ? texts : []
      loaded = true
      return { imageModels: imageModels.value, videoModels: videoModels.value, textModels: textModels.value }
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    imageModels,
    videoModels,
    textModels,
    loading,
    error,
    loadModels
  }
}
