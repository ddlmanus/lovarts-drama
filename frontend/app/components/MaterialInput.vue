<template>
  <section class="material-input-container shadow-sm" aria-label="生成输入">
    <div class="toggle-bar">
      <div class="toggle-handle"></div>
    </div>
    <div class="input-wrapper" :class="{ 'has-uploaded-images': leftUploadSlots.length > 1 || uploadedImages.length, 'has-frame-slots': leftUploadSlots.length > 1 }">
      <div class="upload-row">
        <div class="image-upload-stack">
          <div v-if="activeType === 'image' && uploadedImages.length" class="stack-container" @click="triggerUpload">
            <div
              v-for="(image, index) in visibleStackImages"
              :key="image.url"
              class="image-item"
              :style="stackItemStyle(index)"
            >
              <img :src="image.preview" alt="" class="stack-preview-image" />
              <button class="remove-image-button" type="button" aria-label="移除图片" @click.stop="removeImage(image.url)">×</button>
              <div v-if="index === 0" class="stack-indicator">{{ uploadedImages.length }}</div>
            </div>
          </div>
          <div class="popover-content" :class="{ 'frame-upload-content': leftUploadSlots.length > 1 }">
            <template v-for="(slot, index) in leftUploadSlots" :key="slot.key">
              <div v-if="index > 0" class="frame-upload-arrow" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="currentColor" d="m21.7 9.3l-4-4a1 1 0 0 0-1.4 1.4L18.6 9H7a1 1 0 1 0 0 2h14a1 1 0 0 0 .7-1.7M17 13H3a1 1 0 0 0-.7 1.7l4 4a1 1 0 0 0 1.4-1.4L5.4 15H17a1 1 0 1 0 0-2" />
                </svg>
              </div>
              <div class="image-wrapper image-wrapper-common">
                <button class="upload-image-seat" type="button" :disabled="uploading || slot.disabled" @click="triggerUploadSlot(slot)">
                  <template v-if="slot.asset">
                    <img v-if="slot.asset.type === 'image'" :src="slot.asset.preview" alt="" class="slot-preview-image" />
                    <span v-else class="slot-file-preview">{{ slot.asset.type === 'video' ? '视频' : '音频' }}</span>
                    <span class="slot-label">{{ slot.label }}</span>
                  </template>
                  <template v-else>
                <svg class="upload-plus-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M12 5.25a.75.75 0 0 1 .75.75v5.25H18a.75.75 0 0 1 0 1.5h-5.25V18a.75.75 0 0 1-1.5 0v-5.25H6a.75.75 0 0 1 0-1.5h5.25V6a.75.75 0 0 1 .75-.75" />
                </svg>
                    <span>{{ uploading ? '上传中' : slot.label }}</span>
                    <span v-if="slot.count">{{ slot.count }}</span>
                  </template>
                </button>
              </div>
            </template>
              <input
                ref="fileInput"
                class="upload-file-input"
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                @change="handleFileChange"
              />
          </div>
        </div>
      </div>
      <div v-if="assetPickerOpen" class="asset-picker-popover" :style="assetPickerStyle">
        <div v-if="availableAssets.length" class="asset-picker-list">
          <button
            v-for="asset in availableAssets"
            :key="asset.id"
            type="button"
            class="asset-picker-item"
            @click="insertAssetReference(asset)"
          >
            <img v-if="asset.type === 'image'" :src="asset.preview" alt="" />
            <span v-else class="asset-file-icon">{{ asset.type === 'video' ? '视频' : '音频' }}</span>
            <em>{{ asset.label }}</em>
          </button>
        </div>
        <div v-else class="asset-picker-empty">暂无素材</div>
      </div>
      <input
        ref="mediaInput"
        class="upload-file-input"
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/mp4,audio/m4a"
        multiple
        @change="handleMediaFileChange"
      />
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
          @keydown="handlePromptKeydown"
        ></div>
      </div>
    </div>
    <div class="footer">
      <div class="action-buttons">
        <button class="model-select-button" type="button" @click="typeMenuOpen = !typeMenuOpen; modelMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false; durationMenuOpen = false; countMenuOpen = false">
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
        <button class="model-select-button model-picker-button" type="button" @click="modelMenuOpen = !modelMenuOpen; typeMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false; durationMenuOpen = false; countMenuOpen = false">
          <img src="https://ffile.chatfire.site/cf/chatfire-media/icon/dark/google-color.png" alt="" class="model-icon" />
          <span class="selected-model-text">
            <span>{{ selectedModelLabel }}</span>
            <span v-if="isOfficialModel(selectedModelConfig)" class="model-badge official">官网</span>
            <span v-if="isVipModel(selectedModelConfig)" class="model-badge vip">VIP</span>
          </span>
          <svg class="arrow" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="modelMenuOpen" class="select-popover model-popover">
            <button
              v-for="item in activeModels"
              :key="modelOptionKey(item)"
              type="button"
              :class="{ active: selectedModel === modelOptionKey(item) }"
              @click.stop="selectModel(modelOptionKey(item))"
            >
              <span class="model-option-title">
                <span>{{ modelDisplayName(item) }}</span>
                <span v-if="isOfficialModel(item)" class="model-badge official">官网</span>
                <span v-if="isVipModel(item)" class="model-badge vip">VIP</span>
              </span>
              <em>{{ item.description || item.provider_name || item.model_id || item.value }}</em>
            </button>
            <div v-if="!activeModels.length" class="empty-option">当前用户没有可用{{ activeTypeLabel }}模型</div>
          </div>
        </button>
        <button v-if="activeType === 'video'" class="model-select-button mode-picker-button" type="button" @click="modeMenuOpen = !modeMenuOpen; typeMenuOpen = false; modelMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false; durationMenuOpen = false; countMenuOpen = false">
          <span>{{ selectedModeLabel }}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="modeMenuOpen" class="select-popover mode-popover">
            <button
              v-for="item in modeOptions"
              :key="item.value"
              type="button"
              :class="{ active: selectedMode === item.value }"
              @click.stop="selectMode(item.value)"
            >
              <span>{{ item.label }}</span>
              <em>{{ item.desc }}</em>
            </button>
          </div>
        </button>
      </div>
      <div class="footer-right">
        <button v-if="activeType === 'image'" class="parameter-button count-button" type="button" @click="countMenuOpen = !countMenuOpen; imageSizeMenuOpen = false; resolutionMenuOpen = false; durationMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
          <span>{{ selectedCount }} 张</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="countMenuOpen" class="select-popover count-popover">
            <div class="option-group-title">生成数量</div>
            <button
              v-for="item in countOptions"
              :key="item"
              type="button"
              :class="{ active: selectedCount === item }"
              @click.stop="selectCount(item)"
            >
              {{ item }} 张
            </button>
          </div>
        </button>
        <button class="parameter-button" type="button" @click="imageSizeMenuOpen = !imageSizeMenuOpen; countMenuOpen = false; resolutionMenuOpen = false; durationMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
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
        <button v-if="activeType === 'video'" class="parameter-button" type="button" @click="durationMenuOpen = !durationMenuOpen; countMenuOpen = false; imageSizeMenuOpen = false; resolutionMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
          <span>{{ selectedDurationLabel }}</span>
          <svg class="arrow" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="m12 15.4l-6-6L7.4 8l4.6 4.6L16.6 8L18 9.4z" />
          </svg>
          <div v-if="durationMenuOpen" class="select-popover size-popover">
            <div v-if="durationOptions.length" class="option-group-title">视频时长</div>
            <button
              v-for="item in durationOptions"
              :key="item.value"
              type="button"
              :class="{ active: selectedDuration === item.value }"
              @click.stop="selectDuration(item.value)"
            >
              {{ item.label }}
            </button>
            <div v-if="!durationOptions.length" class="empty-option">当前模型没有可选时长</div>
          </div>
        </button>
        <button class="parameter-button" type="button" @click="resolutionMenuOpen = !resolutionMenuOpen; countMenuOpen = false; imageSizeMenuOpen = false; durationMenuOpen = false; typeMenuOpen = false; modelMenuOpen = false">
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
        <span v-if="shouldShowCreditCost" class="credit-cost-display">
          <svg class="credit-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M11 15H6l7-14v8h5l-7 14z" />
          </svg>
          <span class="credit-text">{{ estimatedCreditCost }}</span>
        </span>
        <button class="submit-button" type="button" aria-label="生成" :disabled="submitting" @click="submitPrompt">
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
import { billingAPI, uploadAPI } from '~/composables/useApi'
import { useCreationTasks } from '~/composables/useCreationTasks'
import { useModelCatalog } from '~/composables/useModelCatalog'

const model = defineModel({ type: String, default: '' })
const props = defineProps({
  externalReferenceImage: {
    type: Object,
    default: null,
  },
})
const emit = defineEmits(['submitted'])
const router = useRouter()
const { createGeneration } = useCreationTasks()
const promptEditable = ref(null)
const fileInput = ref(null)
const mediaInput = ref(null)
const typeOptions = [
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
]
const activeType = ref('image')
const selectedModel = ref('')
const selectedImageSize = ref('')
const selectedResolution = ref('')
const selectedQuality = ref('')
const selectedDuration = ref('')
const selectedCount = ref(1)
const selectedMode = ref('none')
const countOptions = [1, 2, 3, 4]
const fallbackModeOptions = [
  { label: '文生视频', value: 'none', desc: '不引用素材' },
  { label: '首帧', value: 'first_frame', desc: '使用 1 张图片作为首帧' },
  { label: '首尾帧', value: 'first_last', desc: '使用 2 张图片控制首尾帧' },
  { label: '多图参考', value: 'reference', desc: '引用多张图片生成视频' },
  { label: '全能参考', value: 'multimodal_reference', desc: '图片、视频、音频混合参考' },
  { label: '视频编辑', value: 'video_edit', desc: '基于视频素材编辑' },
]
const typeMenuOpen = ref(false)
const modelMenuOpen = ref(false)
const imageSizeMenuOpen = ref(false)
const resolutionMenuOpen = ref(false)
const durationMenuOpen = ref(false)
const countMenuOpen = ref(false)
const modeMenuOpen = ref(false)
const assetPickerOpen = ref(false)
const assetPickerStyle = ref({})
const mentionRange = ref(null)
const uploadedImages = ref([])
const uploadedAssets = ref([])
const uploading = ref(false)
const submitting = ref(false)
const pendingUploadRole = ref('')
const editingPrompt = ref(false)
const assetCounters = reactive({ image: 0, video: 0, audio: 0 })
const { imageModels, videoModels, loadModelCatalog } = useModelCatalog()
const activeModels = computed(() => activeType.value === 'video' ? videoModels.value : imageModels.value)
const activeTypeLabel = computed(() => typeOptions.find(item => item.value === activeType.value)?.label || '图片')
const selectedModelLabel = computed(() => {
  const found = activeModels.value.find(item => modelOptionKey(item) === selectedModel.value)
  return found ? modelDisplayName(found) : '选择模型'
})
const selectedModelConfig = computed(() => activeModels.value.find(item => modelOptionKey(item) === selectedModel.value) || null)
const selectedModelUsesUserApi = computed(() => isUserApiModel(selectedModelConfig.value))
const isApimartGptImage2 = computed(() => {
  const config = selectedModelConfig.value
  const provider = String(config?.provider || '').toLowerCase()
  const modelId = String(config?.model_id || config?.value || '').toLowerCase()
  return provider === 'apimart' && modelId === 'gpt-image-2'
})
const isApimartOfficialImage = computed(() => {
  const config = selectedModelConfig.value
  const provider = String(config?.provider || '').toLowerCase()
  const modelId = String(config?.model_id || config?.value || '').toLowerCase()
  return provider === 'apimart' && modelId === 'gpt-image-2-official'
})
const isOpenAIImageProtocol = computed(() => {
  const config = selectedModelConfig.value
  const protocol = String(
    config?.defaults?.protocol ||
    config?.defaults?.apiProtocol ||
    config?.defaults?.api_protocol ||
    config?.capabilities?.protocol ||
    config?.capabilities?.apiProtocol ||
    config?.capabilities?.api_protocol ||
    ''
  ).toLowerCase().replace(/_/g, '-')
  const modelId = String(config?.model_id || config?.value || '').toLowerCase()
  return protocol === 'openai-image' || modelId === 'gpt-image-2' || modelId === 'gpt-image-2-2026-04-21'
})
const isApimartGeminiImage = computed(() => {
  const config = selectedModelConfig.value
  const provider = String(config?.provider || '').toLowerCase()
  const modelId = String(config?.model_id || config?.value || '').toLowerCase()
  return provider === 'apimart' && modelId.startsWith('gemini-3.1-flash-image-preview')
})
const isGeminiImageProtocol = computed(() => {
  const config = selectedModelConfig.value
  const provider = String(config?.provider || '').toLowerCase()
  const modelId = String(config?.model_id || config?.value || '').toLowerCase()
  const protocol = String(
    config?.defaults?.protocol ||
    config?.defaults?.apiProtocol ||
    config?.defaults?.api_protocol ||
    config?.capabilities?.protocol ||
    config?.capabilities?.apiProtocol ||
    config?.capabilities?.api_protocol ||
    ''
  ).toLowerCase().replace(/_/g, '-')
  return protocol === 'gemini-image' || provider === 'gemini' || modelId.startsWith('gemini-3.1-flash-image-preview') || modelId.startsWith('gemini-3-pro-image-preview') || modelId.startsWith('gemini-2.5-flash-image')
})
const maxUploads = computed(() => {
  const config = selectedModelConfig.value
  const capabilityMax = Number(config?.capabilities?.max_reference_images || config?.capabilities?.maxReferenceImages || 0)
  if (Number.isFinite(capabilityMax) && capabilityMax > 0) return capabilityMax
  const profileMax = parameterItems(config).reduce((max, item) => {
    const itemConfig = item?.config || {}
    const refMax = Number(itemConfig?.referenceImages?.max || itemConfig?.reference_images?.max || itemConfig?.max_reference_images || 0)
    return Number.isFinite(refMax) ? Math.max(max, refMax) : max
  }, 0)
  if (profileMax > 0) return profileMax
  if (isApimartGeminiImage.value || isGeminiImageProtocol.value) return 14
  return (isApimartGptImage2.value || isApimartOfficialImage.value || isOpenAIImageProtocol.value) ? 16 : 4
})
const imageSizeOptions = computed(() => activeType.value === 'video' ? buildAspectRatioOptions(selectedModelConfig.value) : buildImageSizeOptions(selectedModelConfig.value))
const resolutionOptions = computed(() => buildResolutionOptions(selectedModelConfig.value))
const durationOptions = computed(() => activeType.value === 'video' ? buildDurationOptions(selectedModelConfig.value) : [])
const qualityOptions = computed(() => buildQualityOptions(selectedModelConfig.value))
const modeOptions = computed(() => buildVideoModeOptions(selectedModelConfig.value))
const selectedImageSizeLabel = computed(() => imageSizeOptions.value.find(item => item.value === selectedImageSize.value)?.label || imageSizeOptions.value[0]?.label || imageSizeGroupTitle.value)
const selectedResolutionLabel = computed(() => resolutionOptions.value.find(item => item.value === selectedResolution.value)?.label || resolutionOptions.value[0]?.label || '分辨率')
const selectedDurationLabel = computed(() => durationOptions.value.find(item => item.value === selectedDuration.value)?.label || durationOptions.value[0]?.label || '时长')
const imageSizeGroupTitle = computed(() => '画面比例')
const visibleStackImages = computed(() => uploadedImages.value.slice(0, 3))
const selectedModeLabel = computed(() => modeOptions.value.find(item => item.value === selectedMode.value)?.label || modeOptions.value[0]?.label || '模式')
const activeAssets = computed(() => activeType.value === 'image' ? uploadedImages.value.map(imageToAsset) : uploadedAssets.value)
const availableAssets = computed(() => activeType.value === 'image' ? activeAssets.value.filter(item => item.type === 'image') : activeAssets.value)
const firstFrameAsset = computed(() => uploadedAssets.value.find(item => item.role === 'first_frame') || uploadedAssets.value.filter(item => item.type === 'image')[0] || null)
const lastFrameAsset = computed(() => uploadedAssets.value.find(item => item.role === 'last_frame') || uploadedAssets.value.filter(item => item.type === 'image')[1] || null)
const leftUploadSlots = computed(() => {
  if (activeType.value === 'image') {
    return [{
      key: 'image',
      label: uploadedImages.value.length ? '上传' : '上传',
      count: `${uploadedImages.value.length} / ${maxUploads.value}`,
      accept: 'image',
      disabled: uploadedImages.value.length >= maxUploads.value,
    }]
  }
  if (selectedMode.value === 'first_last') {
    return [
      { key: 'first_frame', label: '首帧', accept: 'image', role: 'first_frame', asset: firstFrameAsset.value },
      { key: 'last_frame', label: '尾帧', accept: 'image', role: 'last_frame', asset: lastFrameAsset.value },
    ]
  }
  return [{
    key: 'reference_assets',
    label: '上传素材',
    count: uploadedAssets.value.length ? `${uploadedAssets.value.length} 个` : '',
    accept: 'media',
    asset: uploadedAssets.value[0] || null,
  }]
})
const estimatedCreditCost = computed(() => {
  const config = selectedModelConfig.value || {}
  if (isUserApiModel(config) || config.is_free) return 0
  const quantity = activeType.value === 'image' ? Number(selectedCount.value || 1) : 1
  const unitCost = costForSelectedResolution(config)
  const durationMultiplier = activeType.value === 'video' ? Number(selectedDuration.value || config.defaults?.duration || 1) : 1
  return Math.max(0, Math.ceil(unitCost * quantity * Math.max(1, durationMultiplier || 1)))
})
const shouldShowCreditCost = computed(() => !selectedModelUsesUserApi.value)

function modelOptionKey(item) {
  return String(item?.model_config_id || item?.id || item?.value || item?.model_id || '')
}

function isUserApiModel(item) {
  return String(item?.resource_mode || '').toLowerCase() === 'user_api' || Boolean(item?.user_provider_id)
}

function isOfficialModel(item) {
  return !isUserApiModel(item) && (
    String(item?.resource_mode || '').toLowerCase() === 'platform' ||
    Boolean(item?.is_platform_model)
  )
}

function modelDisplayName(item) {
  const name = item?.name || item?.label || item?.model_id || item?.value || '选择模型'
  return name
}

function isVipModel(item) {
  return Boolean(item?.member_only || item?.memberOnly)
}

function isActiveMembershipStatus(status) {
  return String(status || '').toLowerCase() === 'active'
}

async function assertSelectedModelAllowed() {
  if (!isVipModel(selectedModelConfig.value)) return
  const status = await billingAPI.membershipStatus()
  if (!isActiveMembershipStatus(status?.membership_status || status?.membershipStatus)) {
    throw new Error('该模型为 VIP 会员模型，请先开通会员后使用')
  }
}

function handlePromptInput(event) {
  editingPrompt.value = true
  const target = event.currentTarget
  model.value = target?.textContent || ''
  updateMentionState(target)
  nextTick(() => { editingPrompt.value = false })
}

function handlePromptKeydown(event) {
  if (event.key === '@') {
    nextTick(() => updateMentionState(promptEditable.value))
  }
  if (event.key === 'Escape') assetPickerOpen.value = false
}

function getCaretTextOffset(root) {
  const selection = window.getSelection?.()
  if (!root || !selection?.rangeCount) return (root?.textContent || '').length
  const range = selection.getRangeAt(0)
  if (!root.contains(range.endContainer)) return (root.textContent || '').length
  const preCaretRange = range.cloneRange()
  preCaretRange.selectNodeContents(root)
  preCaretRange.setEnd(range.endContainer, range.endOffset)
  return preCaretRange.toString().length
}

function caretRectWithin(root) {
  const selection = window.getSelection?.()
  if (!root || !selection?.rangeCount) return null
  const range = selection.getRangeAt(0).cloneRange()
  if (!root.contains(range.endContainer)) return null
  range.collapse(false)
  let rect = range.getBoundingClientRect()
  if (!rect || (!rect.width && !rect.height)) {
    const marker = document.createElement('span')
    marker.textContent = '\u200b'
    range.insertNode(marker)
    rect = marker.getBoundingClientRect()
    marker.parentNode?.removeChild(marker)
    selection.removeAllRanges()
    selection.addRange(range)
  }
  return rect
}

function updateAssetPickerPosition(root) {
  const rect = caretRectWithin(root)
  const wrapperRect = root?.closest?.('.input-wrapper')?.getBoundingClientRect()
  if (!rect || !wrapperRect) {
    assetPickerStyle.value = {}
    return
  }
  assetPickerStyle.value = {
    left: `${Math.max(12, rect.right - wrapperRect.left + 8)}px`,
    top: `${Math.max(8, rect.top - wrapperRect.top - 10)}px`,
  }
}

function updateMentionState(root) {
  const text = root?.textContent || model.value || ''
  const caretOffset = getCaretTextOffset(root)
  const beforeCursor = text.slice(0, caretOffset)
  const match = beforeCursor.match(/@(?:图片|视频|音频)?\d*$/)
  if (!match) {
    mentionRange.value = null
    assetPickerOpen.value = false
    return
  }
  mentionRange.value = { start: caretOffset - match[0].length, end: caretOffset }
  updateAssetPickerPosition(root)
  assetPickerOpen.value = true
}

function imageToAsset(image) {
  return {
    id: image.id || image.url,
    type: 'image',
    label: image.label || `图片${uploadedImages.value.findIndex(item => item.url === image.url) + 1}`,
    url: image.url,
    preview: image.preview || image.url,
  }
}

function nextAssetLabel(type) {
  const key = type === 'video' ? 'video' : type === 'audio' ? 'audio' : 'image'
  assetCounters[key] += 1
  const prefix = key === 'video' ? '视频' : key === 'audio' ? '音频' : '图片'
  return `${prefix}${assetCounters[key]}`
}

function addExternalReferenceImage(payload) {
  const url = String(payload?.url || payload?.image || '').trim()
  if (!url) return
  if (uploadedImages.value.some(item => item.url === url)) return
  if (uploadedImages.value.length >= maxUploads.value) {
    toast.info(`最多上传 ${maxUploads.value} 张参考图`)
    return
  }
  const label = nextAssetLabel('image')
  uploadedImages.value.push({
    id: payload?.id ? `external-${payload.id}` : `external-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: 'image',
    label,
    name: payload?.name || label,
    url,
    preview: url,
  })
  activeType.value = 'image'
}

function renderMentionHtml(text) {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/@(图片|视频|音频)(\d+)/g, '<span class="mention-token">@$1$2</span>')
}

function stackItemStyle(index) {
  const transforms = [
    'scale(1) translateX(0px) translateY(0px) rotate(0deg)',
    'scale(0.9) translateX(8px) translateY(6px) rotate(-3deg)',
    'scale(0.8) translateX(16px) translateY(12px) rotate(3deg)',
  ]
  return {
    zIndex: 3 - index,
    transform: transforms[index],
    boxShadow: index === 0 ? '0 4px 12px rgba(0, 0, 0, 0.2)' : '0 3px 8px rgba(0, 0, 0, 0.14)',
  }
}

function triggerUpload() {
  if (uploading.value) return
  if (uploadedImages.value.length >= maxUploads.value) {
    toast.info(`最多上传 ${maxUploads.value} 张参考图`)
    return
  }
  fileInput.value?.click()
}

async function handleFileChange(event) {
  const files = Array.from(event.target?.files || [])
  event.target.value = ''
  if (!files.length) return
  const remaining = maxUploads.value - uploadedImages.value.length
  const selected = files.slice(0, remaining)
  if (files.length > remaining) toast.info(`最多上传 ${maxUploads.value} 张参考图`)

  uploading.value = true
  try {
    for (const file of selected) {
      if (!file.type.startsWith('image/')) continue
      const preview = URL.createObjectURL(file)
      const result = await uploadAPI.image(file)
      const label = nextAssetLabel('image')
      const imageAsset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        label,
        url: result.url || `/${result.path}`,
        preview,
        type: 'image',
        role: pendingUploadRole.value || undefined,
      }
      if (activeType.value === 'video') uploadedAssets.value.push(imageAsset)
      else uploadedImages.value.push(imageAsset)
    }
    if (selected.length) toast.success(`已上传 ${selected.length} 张图片`)
  } catch (err) {
    toast.error(err.message || '上传失败')
  } finally {
    uploading.value = false
    pendingUploadRole.value = ''
  }
}

function removeImage(url) {
  const image = uploadedImages.value.find(item => item.url === url)
  if (image?.preview?.startsWith('blob:')) URL.revokeObjectURL(image.preview)
  uploadedImages.value = uploadedImages.value.filter(item => item.url !== url)
}

async function loadModels() {
  await loadModelCatalog()
  ensureSelectedModel()
}

async function reloadModels() {
  selectedModel.value = ''
  selectedImageSize.value = ''
  selectedResolution.value = ''
  selectedDuration.value = ''
  selectedQuality.value = ''
  try {
    await loadModelCatalog(true)
    ensureSelectedModel()
  } catch (err) {
    toast.error(err.message || '模型加载失败')
  }
}

function ensureSelectedModel() {
  const preferred = activeModels.value.find(item => item.is_default) || activeModels.value[0]
  if (!selectedModel.value || !activeModels.value.some(item => modelOptionKey(item) === selectedModel.value)) {
    selectedModel.value = modelOptionKey(preferred)
  }
  ensureSelectedParams()
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

function isAspectRatioValue(value) {
  return /^\d{1,2}\s*:\s*\d{1,2}$/.test(String(value || '').trim())
}

function normalizeResolutionKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '').replace('*', 'x').replace('×', 'x')
}

function mappedCost(map, key) {
  const normalizedKey = normalizeResolutionKey(key)
  if (!map || typeof map !== 'object' || Array.isArray(map) || !normalizedKey) return null
  for (const [rawKey, rawValue] of Object.entries(map)) {
    const amount = Number(rawValue)
    if (!Number.isFinite(amount)) continue
    if (normalizeResolutionKey(rawKey) === normalizedKey) return amount
  }
  return null
}

function costForSelectedResolution(config) {
  const billing = config.billing_config || config.billingConfig || {}
  const baseCost = Number(billing.cost ?? billing.credits ?? config.cost ?? 0)
  const map = activeType.value === 'image'
    ? {
        ...(config.image_credit_by_resolution || config.imageCreditByResolution || {}),
        ...(billing.image_credit_by_resolution || billing.imageCreditByResolution || {}),
      }
    : {
        ...(config.video_credit_per_second_by_resolution || config.videoCreditPerSecondByResolution || {}),
        ...(billing.video_credit_per_second_by_resolution || billing.videoCreditPerSecondByResolution || {}),
      }
  return mappedCost(map, selectedResolution.value || billing.default_resolution || billing.defaultResolution) ?? baseCost
}

function isResolutionValue(value) {
  return /^(\d+k|\d+p)$/i.test(String(value || '').trim())
}

function normalizeDurationValue(value) {
  const match = String(value || '').trim().match(/\d+/)
  return match ? String(Math.max(1, Number(match[0]) || 0)) : ''
}

function durationOptionFromValue(value) {
  const normalized = normalizeDurationValue(value)
  return normalized ? { label: `${normalized}s`, value: normalized } : null
}

function isApimartImageModel() {
  return isApimartGptImage2.value || isApimartOfficialImage.value || isApimartGeminiImage.value
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

function normalizeVideoModeValue(value) {
  const raw = String(value || '').trim().toLowerCase().replace(/-/g, '_')
  const aliases = {
    text2video: 'none',
    t2v: 'none',
    none: 'none',
    image2video: 'first_frame',
    i2v: 'first_frame',
    single: 'first_frame',
    first: 'first_frame',
    first_frame: 'first_frame',
    first_last: 'first_last',
    first_last_frame: 'first_last',
    start_end: 'first_last',
    reference: 'reference',
    multiple: 'reference',
    reference_fusion: 'reference',
    multimodal_reference: 'multimodal_reference',
    omni: 'multimodal_reference',
    video_edit: 'video_edit',
    edit: 'video_edit',
  }
  return aliases[raw] || raw
}

function videoModeMeta(value) {
  return {
    none: { label: '文生视频', desc: '不引用素材' },
    first_frame: { label: '首帧', desc: '使用 1 张图片作为首帧' },
    first_last: { label: '首尾帧', desc: '使用 2 张图片控制首尾帧' },
    reference: { label: '多图参考', desc: '引用多张图片生成视频' },
    multimodal_reference: { label: '全能参考', desc: '图片、视频、音频混合参考' },
    video_edit: { label: '视频编辑', desc: '基于视频素材编辑' },
  }[value] || { label: value, desc: '' }
}

function modeOption(value, label, desc) {
  const normalized = normalizeVideoModeValue(value)
  const meta = videoModeMeta(normalized)
  return { label: label || meta.label, value: normalized, desc: desc || meta.desc }
}

function buildVideoModeOptions(modelConfig) {
  if (!modelConfig) return fallbackModeOptions
  const methodItems = parameterItems(modelConfig).filter(item => String(item.type || '').toUpperCase() === 'METHOD')
  if (methodItems.length) {
    return uniqueOptions(methodItems.map((item) => {
      const config = item.config || {}
      const imageUrls = config.imageUrls || config.image_urls || {}
      const desc = item.description || item.desc || (imageUrls.min !== undefined || imageUrls.max !== undefined
        ? `需要 ${imageUrls.min ?? 0}-${imageUrls.max ?? imageUrls.min ?? 0} 张图片`
        : '')
      return modeOption(item.value, item.label, desc)
    }))
  }

  const capabilities = modelConfig.capabilities || {}
  const explicitModes = [
    ...(Array.isArray(capabilities.modes) ? capabilities.modes : []),
    ...(Array.isArray(capabilities.methods) ? capabilities.methods : []),
    ...(Array.isArray(capabilities.supported_modes) ? capabilities.supported_modes : []),
    ...(Array.isArray(capabilities.supportedModes) ? capabilities.supportedModes : []),
  ]
  if (explicitModes.length) return uniqueOptions(explicitModes.map(value => modeOption(value)))

  const inferred = []
  if (capabilities.text2video) inferred.push(modeOption('none'))
  if (capabilities.image2video) inferred.push(modeOption('first_frame'))
  if (capabilities.first_last || capabilities.firstLast) inferred.push(modeOption('first_last'))
  if (capabilities.reference_fusion || capabilities.referenceFusion || capabilities.image_urls || capabilities.imageUrls) inferred.push(modeOption('reference'))
  if (capabilities.omni || capabilities.multimodal_reference || capabilities.multimodalReference) inferred.push(modeOption('multimodal_reference'))
  if (capabilities.video_edit || capabilities.videoEdit) inferred.push(modeOption('video_edit'))
  return inferred.length ? uniqueOptions(inferred) : fallbackModeOptions
}

function buildImageSizeOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (value, type) => type === 'ASPECT_RATIO' || isAspectRatioValue(value))
  if (fromProfile.length) return uniqueOptions(fromProfile)
  return []
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
  return []
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
  return []
}

function buildDurationOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (_value, type) => type === 'DURATION')
    .map(item => ({ label: item.label || `${normalizeDurationValue(item.value)}s`, value: normalizeDurationValue(item.value) }))
    .filter(item => item.value)
  if (fromProfile.length) return uniqueOptions(fromProfile)

  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  const values = Array.isArray(capabilities.durations)
    ? capabilities.durations
    : Array.isArray(capabilities.duration?.values)
      ? capabilities.duration.values
      : []
  const explicit = [
    ...values,
    defaults.duration,
  ].map(durationOptionFromValue).filter(Boolean)
  if (explicit.length) return uniqueOptions(explicit)

  const min = Number(capabilities.duration?.min || capabilities.duration_min || capabilities.durationMin || 0)
  const max = Number(capabilities.duration?.max || capabilities.duration_max || capabilities.durationMax || 0)
  if (Number.isFinite(min) && Number.isFinite(max) && min > 0 && max >= min && max - min <= 30) {
    return Array.from({ length: max - min + 1 }, (_, index) => durationOptionFromValue(min + index)).filter(Boolean)
  }
  return []
}

function buildQualityOptions(modelConfig) {
  if (!modelConfig) return []
  const fromProfile = profileOptions(modelConfig, (_value, type) => type === 'QUALITY' || type === 'MODE')
  if (fromProfile.length) return uniqueOptions(fromProfile)
  const defaults = modelConfig.defaults || {}
  const capabilities = modelConfig.capabilities || {}
  const explicit = [
    defaults.quality,
    capabilities.quality,
    ...(Array.isArray(capabilities.qualities) ? capabilities.qualities : []),
  ]
    .map(optionFromValue)
    .filter(Boolean)
  return uniqueOptions(explicit)
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
      : [defaults.aspect_ratio, defaults.aspectRatio, defaults.ratio, defaults.size])
  }
  if (!selectedResolution.value || !resOptions.some(item => item.value === selectedResolution.value)) {
    selectedResolution.value = pickOption(resOptions, [defaults.sampleImageSize, defaults.sample_image_size, defaults.imageSizeLevel, defaults.image_size_level, defaults.resolution])
  }
  if (activeType.value === 'video' && (!selectedDuration.value || !durationOptions.value.some(item => item.value === selectedDuration.value))) {
    selectedDuration.value = pickOption(durationOptions.value, [defaults.duration])
  }
  if (!selectedQuality.value || !qualityOptions.value.some(item => item.value === selectedQuality.value)) {
    selectedQuality.value = pickOption(qualityOptions.value, [defaults.quality])
  }
  if (activeType.value === 'video' && (!selectedMode.value || !modeOptions.value.some(item => item.value === selectedMode.value))) {
    selectedMode.value = pickOption(modeOptions.value, [defaults.reference_mode, defaults.referenceMode, defaults.mode])
  }
}

function selectType(value) {
  activeType.value = value
  typeMenuOpen.value = false
  countMenuOpen.value = false
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

function selectDuration(value) {
  selectedDuration.value = value
  durationMenuOpen.value = false
}

function selectCount(value) {
  selectedCount.value = value
  countMenuOpen.value = false
}

function selectMode(value) {
  selectedMode.value = value
  modeMenuOpen.value = false
}

function triggerMediaUpload() {
  if (uploading.value) return
  mediaInput.value?.click()
}

function triggerUploadSlot(slot) {
  pendingUploadRole.value = slot?.role || ''
  if (activeType.value === 'image' || slot?.accept === 'image') triggerUpload()
  else triggerMediaUpload()
}

function inferAssetType(file, result) {
  const mime = String(result?.mime_type || result?.mimeType || file.type || '').toLowerCase()
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'file'
}

async function handleMediaFileChange(event) {
  const files = Array.from(event.target?.files || [])
  event.target.value = ''
  if (!files.length) return
  uploading.value = true
  try {
    let added = 0
    for (const file of files) {
      const type = inferAssetType(file, { mime_type: file.type })
      if (activeType.value === 'image' && type !== 'image') {
        toast.info('图片模式只能引用图片素材')
        continue
      }
      const preview = type === 'image' ? URL.createObjectURL(file) : ''
      const result = await uploadAPI.media(file)
      const assetType = inferAssetType(file, result)
      if (activeType.value === 'image' && assetType !== 'image') continue
      const asset = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: assetType,
        label: nextAssetLabel(assetType),
        name: result.name || file.name,
        url: result.url || `/${result.path}`,
        preview: preview || result.url || `/${result.path}`,
        mimeType: result.mime_type || file.type,
        role: pendingUploadRole.value || undefined,
      }
      uploadedAssets.value.push(asset)
      if (assetType === 'image' && activeType.value === 'image') uploadedImages.value.push(asset)
      added += 1
    }
    if (added) toast.success(`已上传 ${added} 个素材`)
  } catch (err) {
    toast.error(err.message || '素材上传失败')
  } finally {
    uploading.value = false
    pendingUploadRole.value = ''
  }
}

function insertAssetReference(asset) {
  const label = asset.label || nextAssetLabel(asset.type)
  const token = `@${label}`
  const current = model.value || ''
  const range = mentionRange.value
  if (range && range.start >= 0 && range.end >= range.start) {
    model.value = `${current.slice(0, range.start)}${token} ${current.slice(range.end)}`
  } else {
    model.value = `${current}${token} `
  }
  syncPromptEditable()
  nextTick(() => setEditableCaret(token.length + 1 + (range?.start ?? current.length)))
  assetPickerOpen.value = false
  mentionRange.value = null
}

function syncPromptEditable() {
  nextTick(() => {
    if (editingPrompt.value) return
    if (promptEditable.value && promptEditable.value.textContent !== model.value) {
      promptEditable.value.innerHTML = renderMentionHtml(model.value)
    }
  })
}

function setEditableCaret(textOffset) {
  const root = promptEditable.value
  if (!root) return
  const selection = window.getSelection?.()
  if (!selection) return
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let remaining = Math.max(0, textOffset)
  let node = walker.nextNode()
  while (node) {
    const length = node.textContent?.length || 0
    if (remaining <= length) {
      const range = document.createRange()
      range.setStart(node, remaining)
      range.collapse(true)
      selection.removeAllRanges()
      selection.addRange(range)
      root.focus()
      return
    }
    remaining -= length
    node = walker.nextNode()
  }
  const range = document.createRange()
  range.selectNodeContents(root)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
  root.focus()
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

async function submitPrompt() {
  if (!model.value.trim()) {
    toast.info('请输入提示词')
    return
  }
  if (uploading.value) {
    toast.info('图片还在上传中')
    return
  }
  if (submitting.value) return
  if (!selectedModel.value) {
    toast.info(`暂无可用${activeTypeLabel.value}模型，请联系管理员配置平台模型`)
    return
  }
  submitting.value = true
  const modelConfig = selectedModelConfig.value
  const payload = {
    prompt: model.value.trim(),
    model: modelConfig?.model_id || modelConfig?.value || selectedModel.value,
    model_config_id: modelConfig?.model_config_id || modelConfig?.id || undefined,
    user_provider_id: modelConfig?.user_provider_id || undefined,
    provider: modelConfig?.provider || undefined,
  }
  const referenceUrls = uploadedImages.value.map(item => item.url)
  const imageAssetUrls = activeAssets.value.filter(item => item.type === 'image').map(item => item.url)
  const videoAssetUrls = activeAssets.value.filter(item => item.type === 'video').map(item => item.url)
  const audioAssetUrls = activeAssets.value.filter(item => item.type === 'audio').map(item => item.url)
  try {
    await assertSelectedModelAllowed()
    if (activeType.value === 'video') {
      const mode = selectedMode.value === 'none' && (imageAssetUrls.length || videoAssetUrls.length || audioAssetUrls.length)
        ? 'multimodal_reference'
        : selectedMode.value
      const record = await createGeneration({
        type: 'video',
        ...payload,
        duration: Number(selectedDuration.value || modelConfig?.defaults?.duration || 5),
        aspect_ratio: selectedImageSize.value || '16:9',
        resolution: selectedResolution.value || undefined,
        reference_mode: mode,
        image_url: firstFrameAsset.value?.url || imageAssetUrls[0],
        first_frame_url: firstFrameAsset.value?.url || imageAssetUrls[0],
        last_frame_url: mode === 'first_last' ? (lastFrameAsset.value?.url || imageAssetUrls[1]) : undefined,
        reference_image_urls: imageAssetUrls,
        reference_video_urls: videoAssetUrls,
        reference_audio_urls: audioAssetUrls,
        generate_audio: Boolean(audioAssetUrls.length),
        watermark: false,
      })
      toast.success('视频任务已提交')
      emit('submitted', record)
      router.push('/generate')
      return
    }
    const record = await createGeneration({
      type: 'image',
      ...payload,
      size: selectedImageSize.value || undefined,
      number_of_images: selectedCount.value,
      count: selectedCount.value,
      n: selectedCount.value,
      image_size: selectedResolution.value || undefined,
      resolution: selectedResolution.value || undefined,
      sample_image_size: selectedResolution.value || undefined,
      quality: selectedQuality.value || undefined,
      output_format: selectedModelConfig.value?.defaults?.output_format || selectedModelConfig.value?.defaults?.outputFormat || undefined,
      output_compression: selectedModelConfig.value?.defaults?.output_compression ?? selectedModelConfig.value?.defaults?.outputCompression ?? undefined,
      background: selectedModelConfig.value?.defaults?.background || undefined,
      moderation: selectedModelConfig.value?.defaults?.moderation || undefined,
      input_fidelity: selectedModelConfig.value?.defaults?.input_fidelity || selectedModelConfig.value?.defaults?.inputFidelity || undefined,
      partial_images: selectedModelConfig.value?.defaults?.partial_images ?? selectedModelConfig.value?.defaults?.partialImages ?? undefined,
      reference_images: imageAssetUrls.length ? imageAssetUrls : referenceUrls,
      image_urls: isApimartImageModel() ? (imageAssetUrls.length ? imageAssetUrls : referenceUrls) : undefined,
      official_fallback: isApimartGptImage2.value ? (selectedModelConfig.value?.defaults?.official_fallback ?? selectedModelConfig.value?.defaults?.officialFallback ?? false) : undefined,
      google_search: isGeminiImageProtocol.value ? (selectedModelConfig.value?.defaults?.google_search ?? selectedModelConfig.value?.defaults?.googleSearch ?? false) : undefined,
      google_image_search: isGeminiImageProtocol.value ? (selectedModelConfig.value?.defaults?.google_image_search ?? selectedModelConfig.value?.defaults?.googleImageSearch ?? false) : undefined,
    })
    toast.success('任务已提交')
    emit('submitted', record)
    router.push('/generate')
  } catch (err) {
    toast.error(err.message || '提交失败')
  } finally {
    submitting.value = false
  }
}
watch(model, syncPromptEditable)
watch(() => props.externalReferenceImage, addExternalReferenceImage)
watch(activeType, () => {
  assetPickerOpen.value = false
  if (activeType.value === 'image') selectedMode.value = 'none'
  ensureSelectedModel()
})
watch(selectedModelConfig, ensureSelectedParams)
onMounted(() => {
  syncPromptEditable()
  loadModels()
  window.addEventListener('huobao-auth-change', reloadModels)
  window.addEventListener('huobao-model-config-change', reloadModels)
})

onBeforeUnmount(() => {
  window.removeEventListener('huobao-auth-change', reloadModels)
  window.removeEventListener('huobao-model-config-change', reloadModels)
  uploadedImages.value.forEach((image) => {
    if (image.preview?.startsWith('blob:')) URL.revokeObjectURL(image.preview)
  })
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

.input-wrapper.has-uploaded-images {
  padding-left: 160px;
}

.input-wrapper.has-frame-slots {
  padding-left: 164px;
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

.input-wrapper.has-uploaded-images .upload-row {
  width: 146px;
}

.input-wrapper.has-frame-slots .upload-row {
  width: 150px;
}

.image-upload-stack,
.popover-content,
.image-wrapper {
  position: relative;
  height: 100%;
}

.image-upload-stack {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  width: 100%;
}

.popover-content,
.image-wrapper {
  width: 64px;
  flex: 0 0 64px;
}

.frame-upload-content {
  display: flex;
  align-items: center;
  gap: 6px;
  width: auto;
  flex-basis: auto;
}

.frame-upload-arrow {
  display: grid;
  place-items: center;
  width: 14px;
  flex: 0 0 14px;
  color: rgba(255, 255, 255, 0.35);
}

.stack-container {
  position: relative;
  top: 6px;
  left: 0;
  z-index: 4;
  width: 64px;
  height: 76px;
  flex: 0 0 64px;
  cursor: pointer;
}

.image-item {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 7px;
  transform-origin: center center;
  background: #18181a;
}

.stack-preview-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.stack-indicator {
  position: absolute;
  right: 4px;
  bottom: 4px;
  display: grid;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.remove-image-button {
  position: absolute;
  top: 3px;
  right: 3px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border: 0;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.64);
  color: #fff;
  font-size: 15px;
  line-height: 1;
  opacity: 0;
  transition: opacity 0.16s ease;
}

.image-item:hover .remove-image-button {
  opacity: 1;
}

.upload-file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
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
  line-height: 1.2;
  white-space: nowrap;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.upload-image-seat:hover {
  border-color: #7c8797;
  transform: scale(1.08);
}

.upload-image-seat:disabled,
.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.62;
  filter: none;
}

.slot-preview-image,
.slot-file-preview {
  width: 100%;
  height: 100%;
  border-radius: 6px;
}

.slot-preview-image {
  object-fit: cover;
}

.slot-file-preview {
  display: grid;
  place-items: center;
  color: #d4d4d4;
  font-size: 12px;
  font-weight: 700;
  background: rgba(255, 255, 255, 0.08);
}

.slot-label {
  position: absolute;
  left: 4px;
  right: 4px;
  bottom: 4px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.66);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
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

.asset-picker-popover {
  position: absolute;
  bottom: auto;
  z-index: 30;
  min-width: 128px;
  max-width: min(190px, calc(100vw - 32px));
  padding: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  background: #2b2b2d;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.42);
}

.asset-picker-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 190px;
  overflow: auto;
}

.asset-picker-item {
  display: flex;
  width: 100%;
  min-width: 0;
  flex-direction: row;
  align-items: center;
  gap: 8px;
  padding: 5px 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #1677ff;
  text-align: left;
}

.asset-picker-item:hover {
  background: rgba(255, 255, 255, 0.08);
}

.asset-picker-item img,
.asset-file-icon {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  border-radius: 7px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.08);
}

.asset-file-icon {
  display: grid;
  place-items: center;
  color: #1677ff;
  font-size: 11px;
  font-weight: 700;
}

.asset-picker-item em {
  color: #4ea1ff;
  font-size: 13px;
  font-weight: 700;
  font-style: normal;
  line-height: 1.2;
  white-space: nowrap;
}

.mention-token {
  display: inline-flex;
  align-items: center;
  padding: 1px 5px;
  border-radius: 5px;
  background: rgba(10, 132, 255, 0.16);
  color: #4ea1ff;
  font-weight: 700;
}

.asset-picker-empty {
  padding: 8px 0;
  color: #64748b;
  font-size: 14px;
  text-align: center;
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
.parameter-button {
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

.mode-picker-button {
  max-width: 132px;
}

.mode-popover {
  width: 260px;
}

.mode-popover button {
  align-items: flex-start;
}

.parameter-button {
  min-width: 78px;
  justify-content: space-between;
}

.count-button {
  min-width: 72px;
}

.model-picker-button {
  max-width: 260px;
}

.model-picker-button > span,
.selected-model-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.selected-model-text,
.model-option-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
}

.selected-model-text > span:first-child,
.model-option-title > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-badge {
  flex: 0 0 auto;
  border-radius: 5px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.model-badge.official {
  background: rgba(10, 132, 255, 0.16);
  color: #60a5fa;
}

.model-badge.vip {
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
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

.count-popover {
  right: 0;
  left: auto;
  min-width: 116px;
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

  .input-wrapper.has-uploaded-images {
    padding-left: 144px;
  }

  .upload-row {
    width: 66px;
  }

  .input-wrapper.has-uploaded-images .upload-row {
    width: 132px;
  }

  .stack-container,
  .popover-content,
  .image-wrapper {
    width: 58px;
    flex-basis: 58px;
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

  .input-wrapper.has-uploaded-images {
    padding-left: 0;
  }

  .upload-row {
    width: 100%;
    height: 50px;
    padding: 0;
  }

  .input-wrapper.has-uploaded-images .upload-row {
    width: 100%;
  }

  .stack-container,
  .popover-content,
  .image-wrapper {
    width: 48px;
    height: 48px;
    flex-basis: 48px;
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
