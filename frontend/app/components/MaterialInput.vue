<template>
  <section class="material-input-container shadow-sm" aria-label="生成输入">
    <div class="toggle-bar">
      <div class="toggle-handle"></div>
    </div>
    <div class="input-wrapper">
      <div class="upload-row">
        <div class="image-upload-stack">
          <div class="popover-content">
            <div class="image-wrapper image-wrapper-common">
              <button class="upload-image-seat" type="button" @click="toast.info('上传功能即将开放')">
                <svg class="upload-plus-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75" />
                </svg>
                <span>上传</span>
                <span>0 / 4</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <button class="prompt-polish-button" type="button" aria-label="智能优化提示词" @click="polishPrompt">
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="2" d="M15 19c1.2-3.678 2.526-5.005 6-6c-3.474-.995-4.8-2.322-6-6c-1.2 3.678-2.526 5.005-6 6c3.474.995 4.8 2.322 6 6Zm-8-9c.6-1.84 1.263-2.503 3-3c-1.737-.497-2.4-1.16-3-3c-.6 1.84-1.263 2.503-3 3c1.737.497 2.4 1.16 3 3Zm1.5 10c.3-.92.631-1.251 1.5-1.5c-.869-.249-1.2-.58-1.5-1.5c-.3.92-.631 1.251-1.5 1.5c.869.249 1.2.58 1.5 1.5Z" />
        </svg>
      </button>
      <div class="input-with-mention">
        <div
          ref="promptEditable"
          class="prompt-input-editable"
          contenteditable="true"
          data-placeholder="请输入图片生成的提示词，例如：做一张“情人节”海报"
          @input="handlePromptInput"
        ></div>
      </div>
    </div>
    <div class="footer">
      <div class="action-buttons">
        <button class="model-select-button" type="button" @click="typeMenuOpen = !typeMenuOpen; modelMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z" />
          </svg>
          <span>{{ activeTypeLabel }}</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="typeMenuOpen" class="select-popover">
            <button v-for="item in typeOptions" :key="item.value" type="button" :class="{ active: activeType === item.value }" @click.stop="selectType(item.value)">
              {{ item.label }}
            </button>
          </div>
        </button>
        <button class="model-select-button model-picker-button" type="button" @click="modelMenuOpen = !modelMenuOpen; typeMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false">
          <img src="https://ffile.chatfire.site/cf/chatfire-media/icon/dark/google-color.png" alt="" class="model-icon" />
          <span>{{ selectedModelLabel }}</span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="modelMenuOpen" class="select-popover model-popover">
            <button
              v-for="item in activeModels"
              :key="item.model_id || item.value"
              type="button"
              :class="{ active: selectedModel === (item.model_id || item.value) }"
              @click.stop="selectModel(item.model_id || item.value)"
            >
              <span>{{ item.name || item.label || item.model_id }}</span>
              <em>{{ item.model_id || item.value }}</em>
            </button>
            <div v-if="!activeModels.length" class="empty-option">当前用户没有可用{{ activeTypeLabel }}模型</div>
          </div>
        </button>
        <button class="illustration-button" type="button" aria-label="风格设置">
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 22A10 10 0 0 1 2 12A10 10 0 0 1 12 2c5.5 0 10 4 10 9a6 6 0 0 1-6 6h-1.8c-.3 0-.5.2-.5.5c0 .1.1.2.1.3c.4.5.6 1.1.6 1.7c.1 1.4-1 2.5-2.4 2.5m0-18a8 8 0 0 0-8 8a8 8 0 0 0 8 8c.3 0 .5-.2.5-.5c0-.2-.1-.3-.1-.4c-.4-.5-.6-1-.6-1.6c0-1.4 1.1-2.5 2.5-2.5H16a4 4 0 0 0 4-4c0-3.9-3.6-7-8-7m-5.5 6c.8 0 1.5.7 1.5 1.5S7.3 13 6.5 13S5 12.3 5 11.5S5.7 10 6.5 10m3-4c.8 0 1.5.7 1.5 1.5S10.3 9 9.5 9S8 8.3 8 7.5S8.7 6 9.5 6m5 0c.8 0 1.5.7 1.5 1.5S15.3 9 14.5 9S13 8.3 13 7.5S13.7 6 14.5 6m3 4c.8 0 1.5.7 1.5 1.5s-.7 1.5-1.5 1.5s-1.5-.7-1.5-1.5s.7-1.5 1.5-1.5" />
          </svg>
        </button>
      </div>
      <div class="footer-right">
        <button class="parameter-button" type="button" @click="imageSizeMenuOpen = !imageSizeMenuOpen; resolutionMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
          <span>{{ selectedImageSizeLabel }}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="imageSizeMenuOpen" class="select-popover size-popover">
            <div v-if="imageSizeOptions.length" class="option-group-title">{{ imageSizeGroupTitle }}</div>
            <button
              v-for="item in imageSizeOptions"
              :key="item.value"
              type="button"
              :class="{ active: selectedImageSize === item.value }"
              @click.stop="selectImageSize(item.value)"
            >
              {{ item.label }}
            </button>
            <div v-if="!imageSizeOptions.length" class="empty-option">当前模型没有可选{{ imageSizeGroupTitle }}</div>
          </div>
        </button>
        <button class="parameter-button" type="button" @click="resolutionMenuOpen = !resolutionMenuOpen; imageSizeMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
          <span>{{ selectedResolutionLabel }}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="resolutionMenuOpen" class="select-popover size-popover">
            <div v-if="resolutionOptions.length" class="option-group-title">分辨率</div>
            <button
              v-for="item in resolutionOptions"
              :key="item.value"
              type="button"
              :class="{ active: selectedResolution === item.value }"
              @click.stop="selectResolution(item.value)"
            >
              {{ item.label }}
            </button>
            <div v-if="!resolutionOptions.length" class="empty-option">当前模型没有可选分辨率</div>
          </div>
        </button>
        <span class="credit-cost-display">
          <svg class="credit-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z" />
          </svg>
          <span class="credit-text">40</span>
        </span>
        <button class="submit-button" type="button" aria-label="生成" @click="submitPrompt">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m5 12l-.604-5.437C4.223 5.007 5.825 3.864 7.24 4.535l11.944 5.658c1.525.722 1.525 2.892 0 3.614L7.24 19.466c-1.415.67-3.017-.472-2.844-2.028zm0 0h7" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { aiModelAPI, imageAPI, videoAPI } from '~/composables/useApi'

const model = defineModel({ type: String, default: '' })
const promptEditable = ref(null)
const typeOptions = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
]
const activeType = ref('image')
const selectedModel = ref('')
const selectedImageSize = ref('')
const selectedResolution = ref('')
const typeMenuOpen = ref(false)
const modelMenuOpen = ref(false)
const imageSizeMenuOpen = ref(false)
const resolutionMenuOpen = ref(false)
const imageModels = ref([])
const videoModels = ref([])
const activeModels = computed(() => activeType.value === 'video' ? videoModels.value : imageModels.value)
const activeTypeLabel = computed(() => typeOptions.find(item => item.value === activeType.value)?.label || '图片')
const selectedModelLabel = computed(() => {
  const found = activeModels.value.find(item => (item.model_id || item.value) === selectedModel.value)
  return found?.name || found?.label || found?.model_id || '选择模型'
})
const selectedModelConfig = computed(() => activeModels.value.find(item => (item.model_id || item.value) === selectedModel.value) || null)
const imageSizeOptions = computed(() => activeType.value === 'video' ? buildAspectRatioOptions(selectedModelConfig.value) : buildImageSizeOptions(selectedModelConfig.value))
const resolutionOptions = computed(() => buildResolutionOptions(selectedModelConfig.value))
const selectedImageSizeLabel = computed(() => imageSizeOptions.value.find(item => item.value === selectedImageSize.value)?.label || imageSizeOptions.value[0]?.label || imageSizeGroupTitle.value)
const selectedResolutionLabel = computed(() => resolutionOptions.value.find(item => item.value === selectedResolution.value)?.label || resolutionOptions.value[0]?.label || '分辨率')
const imageSizeGroupTitle = computed(() => activeType.value === 'video' ? '画面比例' : '图片尺寸')

function handlePromptInput(event) {
  model.value = event.currentTarget?.textContent || ''
}

async function loadModels() {
  const [images, videos] = await Promise.all([
    aiModelAPI.options('image'),
    aiModelAPI.options('video'),
  ])
  imageModels.value = images
  videoModels.value = videos
  ensureSelectedModel()
}

function ensureSelectedModel() {
  const preferred = activeModels.value.find(item => item.is_default) || activeModels.value[0]
  if (!selectedModel.value || !activeModels.value.some(item => (item.model_id || item.value) === selectedModel.value)) {
    selectedModel.value = preferred?.model_id || preferred?.value || ''
  }
  ensureSelectedParams()
}

function modelIdOf(item) {
  return item?.model_id || item?.value || ''
}

function uniqueOptions(items) {
  const seen = new Set()
  return items.filter((item) => {
    if (!item?.value || seen.has(item.value)) return false
    seen.add(item.value)
    return true
  })
}

function parameterItems(modelConfig) {
  const params = modelConfig?.parameter_profile?.items || modelConfig?.parameter_profile?.parameters || modelConfig?.parameters?.items || []
  return Array.isArray(params) ? params : []
}

function isDimensionValue(value) {
  return /^\d+x\d+$/i.test(String(value || '').trim())
}

function isAspectRatioValue(value) {
  return /^\d{1,2}\s*:\s*\d{1,2}$/.test(String(value || '').trim())
}

function isResolutionValue(value) {
  return /^(\d+k|\d+p)$/i.test(String(value || '').trim())
}

function modelProtocol(modelConfig) {
  return String(modelConfig?.capabilities?.protocol || modelConfig?.defaults?.protocol || '').toLowerCase()
}

function optionFromValue(value) {
  const normalized = String(value || '').trim()
  return normalized ? { label: normalized, value: normalized } : null
}

function profileOptions(modelConfig, predicate) {
  return parameterItems(modelConfig)
    .filter(item => predicate(String(item.value || '').trim(), String(item.type || '').toUpperCase()))
    .map(item => ({ label: item.label || item.value, value: item.value }))
}

function buildImageSizeOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => {
    if (type === 'ASPECT_RATIO' || type === 'SAMPLE_IMAGE_SIZE' || type === 'QUALITY' || type === 'MODE') return false
    return isDimensionValue(value) || value.toLowerCase() === 'auto'
  })
  if (fromProfile.length) return uniqueOptions(fromProfile)

  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  const modelId = modelIdOf(modelConfig)
  const explicit = [
    ...(Array.isArray(capabilities.sizes) ? capabilities.sizes : []),
    defaults.size,
    defaults.imageSize,
    defaults.image_size,
    defaults.resolution,
  ]
    .filter(value => isDimensionValue(value) || String(value || '').trim().toLowerCase() === 'auto')
    .map(optionFromValue)
    .filter(Boolean)
  if (explicit.length) return uniqueOptions(explicit)
  if (modelId.includes('gpt-image') || modelId.includes('qwen-image')) {
    return [
      { label: 'auto', value: 'auto' },
      { label: '1024x1024', value: '1024x1024' },
      { label: '1536x1024', value: '1536x1024' },
      { label: '1024x1536', value: '1024x1536' },
      { label: '1920x1080', value: '1920x1080' },
      { label: '1080x1920', value: '1080x1920' },
    ]
  }
  return [
    { label: '1024x1024', value: '1024x1024' },
    { label: '1536x1024', value: '1536x1024' },
    { label: '1024x1536', value: '1024x1536' },
  ]
}

function buildAspectRatioOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => type === 'ASPECT_RATIO' || isAspectRatioValue(value))
  if (fromProfile.length) return uniqueOptions(fromProfile)

  const defaults = modelConfig.defaults || {}
  const explicit = [defaults.aspect_ratio, defaults.aspectRatio, defaults.ratio, ...(Array.isArray(modelConfig.capabilities?.aspectRatios) ? modelConfig.capabilities.aspectRatios : [])]
    .filter(isAspectRatioValue)
    .map(optionFromValue)
    .filter(Boolean)
  if (explicit.length) return uniqueOptions(explicit)
  return [
    { label: '1:1', value: '1:1' },
    { label: '16:9', value: '16:9' },
    { label: '9:16', value: '9:16' },
  ]
}

function buildResolutionOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => {
    if (type === 'SAMPLE_IMAGE_SIZE') return true
    if (activeType.value === 'video' && type === 'RESOLUTION') return isResolutionValue(value)
    return isResolutionValue(value)
  })
  if (fromProfile.length) return uniqueOptions(fromProfile)

  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  const explicit = [
    ...(Array.isArray(capabilities.resolutions) ? capabilities.resolutions : []),
    defaults.sampleImageSize,
    defaults.sample_image_size,
    defaults.imageSizeLevel,
    defaults.image_size_level,
    defaults.resolution,
  ]
    .filter(isResolutionValue)
    .map(optionFromValue)
    .filter(Boolean)
  if (explicit.length) return uniqueOptions(explicit)
  if (activeType.value === 'video') {
    return [
      { label: '720p', value: '720p' },
      { label: '1080p', value: '1080p' },
    ]
  }
  if (modelProtocol(modelConfig).includes('openai-image')) return []
  return [
    { label: '1K', value: '1K' },
    { label: '2K', value: '2K' },
    { label: '4K', value: '4K' },
  ]
}

function pickOption(options, preferredValues) {
  for (const preferred of preferredValues) {
    const found = options.find(item => item.value === preferred)
    if (found) return found.value
  }
  return options[0]?.value || ''
}

function ensureSelectedParams() {
  const defaults = selectedModelConfig.value?.defaults || {}
  const sizeOptions = imageSizeOptions.value
  const resOptions = resolutionOptions.value
  if (!selectedImageSize.value || !sizeOptions.some(item => item.value === selectedImageSize.value)) {
    selectedImageSize.value = pickOption(sizeOptions, activeType.value === 'video'
      ? [defaults.aspect_ratio, defaults.aspectRatio, defaults.ratio]
      : [defaults.size, defaults.imageSize, defaults.image_size, defaults.resolution])
  }
  if (!selectedResolution.value || !resOptions.some(item => item.value === selectedResolution.value)) {
    selectedResolution.value = pickOption(resOptions, [defaults.sampleImageSize, defaults.sample_image_size, defaults.imageSizeLevel, defaults.image_size_level, defaults.resolution])
  }
}

function selectType(value) {
  activeType.value = value
  typeMenuOpen.value = false
  ensureSelectedModel()
}

function selectModel(value) {
  selectedModel.value = value
  modelMenuOpen.value = false
  ensureSelectedParams()
}

function selectImageSize(value) {
  selectedImageSize.value = value
  imageSizeMenuOpen.value = false
}

function selectResolution(value) {
  selectedResolution.value = value
  resolutionMenuOpen.value = false
}

function syncPromptEditable() {
  nextTick(() => {
    if (promptEditable.value && promptEditable.value.textContent !== model.value) {
      promptEditable.value.textContent = model.value
    }
  })
}

function polishPrompt() {
  if (!model.value.trim()) {
    toast.info('请先输入提示词')
    return
  }
  model.value = `${model.value.trim()}，画面细节丰富，光影自然，高品质成片。`
  syncPromptEditable()
  toast.success('已优化提示词')
}

function submitPrompt() {
  if (!model.value.trim()) {
    toast.info('请输入提示词')
    return
  }
  if (!selectedModel.value) {
    toast.info(`当前用户没有可用${activeTypeLabel.value}模型，请先在后台配置供应商`)
    return
  }
  const payload = {
    prompt: model.value.trim(),
    model: selectedModel.value,
  }
  const request = activeType.value === 'video'
    ? videoAPI.generate({ ...payload, duration: 8, aspect_ratio: selectedImageSize.value || '16:9', resolution: selectedResolution.value || undefined })
    : imageAPI.generate({ ...payload, size: selectedImageSize.value || '1024x1024', image_size: selectedResolution.value || undefined, sample_image_size: selectedResolution.value || undefined })
  request
    .then(() => toast.success('任务已提交'))
    .catch((err) => toast.error(err.message || '提交失败'))
}

watch(model, syncPromptEditable)
watch(activeType, ensureSelectedModel)
watch(selectedModelConfig, ensureSelectedParams)
onMounted(() => {
  syncPromptEditable()
  loadModels().catch(err => toast.error(err.message || '模型加载失败'))
})
</script>

<style scoped>
.material-input-container {
  position: fixed;
  left: calc(50vw + 95px);
  right: auto;
  bottom: 18px;
  z-index: 10;
  width: min(1118px, calc(100vw - 190px - 320px));
  min-width: 720px;
  max-width: calc(100vw - 190px - 96px);
  margin: 0 auto;
  padding: 0 16px 13px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  background: #242424;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
  transform: translateX(-50%);
}

.toggle-bar {
  display: flex;
  justify-content: center;
  height: 18px;
  margin-bottom: 0;
  align-items: center;
}

.toggle-handle {
  width: 36px;
  height: 4px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.68);
}

.input-wrapper {
  position: relative;
  min-height: 108px;
  padding-left: 88px;
  border-radius: 10px;
  background: transparent;
}

.upload-row {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  width: 74px;
  height: 100%;
  padding: 0;
}

.image-upload-stack,
.popover-content,
.image-wrapper {
  width: 100%;
  height: 100%;
}

.upload-image-seat {
  display: flex;
  width: 100%;
  height: 100%;
  min-height: 88px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #666363;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.03);
  color: #8b95a5;
  font: inherit;
  font-size: 10px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.upload-image-seat:hover {
  border-color: #7c8797;
  transform: scale(1.08);
}

.prompt-polish-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #d4d4d4;
}

.input-with-mention {
  min-height: 108px;
  width: 100%;
}

.prompt-input-editable {
  width: 100%;
  min-height: 108px;
  padding: 18px 42px 12px 16px;
  outline: none;
  color: rgba(255, 255, 255, 0.82);
  font-size: clamp(12px, 0.78vw, 14px);
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.prompt-input-editable:empty::before {
  color: #6b7280;
  content: attr(data-placeholder);
  pointer-events: none;
}

.footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

.action-buttons,
.footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.model-select-button,
.parameter-button,
.illustration-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.78);
  font: inherit;
  font-size: 13px;
  white-space: nowrap;
}

.parameter-button {
  min-width: 78px;
  justify-content: space-between;
}

.model-picker-button {
  max-width: 260px;
}

.model-picker-button > span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.select-popover {
  position: absolute;
  left: 0;
  bottom: calc(100% + 8px);
  z-index: 20;
  min-width: 136px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #2b2b2d;
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.45);
}

.select-popover button {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-height: 38px;
  padding: 8px 12px;
  border: 0;
  background: transparent;
  color: rgba(255, 255, 255, 0.82);
  text-align: left;
}

.select-popover button.active,
.select-popover button:hover {
  background: rgba(10, 132, 255, 0.22);
  color: #fff;
}

.select-popover em {
  max-width: 260px;
  overflow: hidden;
  color: #9ca3af;
  font-size: 11px;
  font-style: normal;
  text-overflow: ellipsis;
}

.model-popover {
  min-width: 280px;
  max-height: 300px;
  overflow-y: auto;
}

.size-popover {
  right: 0;
  left: auto;
  min-width: 220px;
  max-height: 300px;
  overflow-y: auto;
}

.option-group-title {
  padding: 10px 12px 4px;
  color: #a1a1aa;
  font-size: 12px;
}

.empty-option {
  padding: 12px;
  color: #9ca3af;
  font-size: 12px;
}

.illustration-button {
  width: 34px;
  padding: 0;
  justify-content: center;
}

.model-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
}

.credit-cost-display {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #d9e4f2;
  font-weight: 700;
}

.credit-icon {
  color: #d7a629;
}

.submit-button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  background: #0a84ff;
  color: #fff;
}

button:hover {
  filter: brightness(1.08);
}

@media (max-width: 1180px) {
  .material-input-container {
    left: calc(50vw + 95px);
    width: calc(100vw - 190px - 64px);
    min-width: 0;
    max-width: 960px;
  }
}

@media (max-width: 860px) {
  .material-input-container {
    padding: 0 12px 10px;
  }

  .input-wrapper {
    min-height: 92px;
    padding-left: 76px;
  }

  .upload-row {
    width: 66px;
  }

  .upload-image-seat {
    min-height: 78px;
  }

  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .footer {
    align-items: stretch;
    flex-direction: column;
  }

  .action-buttons,
  .footer-right {
    flex-wrap: wrap;
  }
}

@media (max-width: 768px) {
  .material-input-container {
    left: 18px;
    right: 18px;
    bottom: 12px;
    width: auto;
    min-width: 0;
    max-width: none;
    transform: none;
  }
}

@media (max-width: 560px) {
  .input-wrapper {
    min-height: 150px;
    padding-top: 58px;
    padding-left: 0;
  }

  .upload-row {
    width: 100%;
    height: 50px;
    padding: 0;
  }

  .upload-image-seat {
    min-height: 48px;
  }

  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .model-select-button:nth-child(2) span:not(.model-icon) {
    max-width: 132px;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

@media (max-height: 760px) and (min-width: 861px) {
  .material-input-container {
    width: min(980px, calc(100vw - 190px - 96px));
    max-width: 920px;
  }

  .input-wrapper,
  .input-with-mention,
  .prompt-input-editable {
    min-height: 92px;
  }

  .upload-image-seat {
    min-height: 78px;
  }
}
</style>
