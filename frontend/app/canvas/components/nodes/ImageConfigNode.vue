<template>
  <!-- Image config node wrapper | 文生图配置节点包裹层 -->
  <div class="image-config-node-wrapper" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
    <NodeTitle
      :label="data.label"
      :icon="ColorPaletteOutline"
      :editing="isEditingLabel"
      v-model="editingLabelValue"
      @start-edit="startEditLabel"
      @finish-edit="finishEditLabel"
      @cancel-edit="cancelEditLabel"
    />

    <!-- Image config node | 文生图配置节点 -->
    <div
      class="image-config-node canvas-node-card rounded-xl min-w-[300px] transition-all duration-200"
      :class="{ 'is-selected': data.selected }">
      <!-- Config options | 配置选项 -->
      <div class="p-3 space-y-3">
        <!-- Model selector | 模型选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">模型</span>
          <n-dropdown :options="modelOptions" :render-label="renderModelOptionLabel" @select="handleModelSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              <span class="canvas-model-label">
                <span>{{ displayModelName }}</span>
                <span v-if="isPlatformModel(currentModelConfig)" class="canvas-model-badge official">官网</span>
                <span v-if="isVipModel(currentModelConfig)" class="canvas-model-badge vip">VIP</span>
              </span>
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Quality selector | 画质选择 -->
        <div v-if="hasQualityOptions" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">画质</span>
          <n-dropdown :options="qualityOptions" scrollable :menu-props="limitedDropdownMenuProps" @select="handleQualitySelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayQuality }}
              <n-icon :size="12"><ChevronForwardOutline /></n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Size selector | 尺寸选择 -->
        <div v-if="hasSizeOptions" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">尺寸</span>
          <div class="flex items-center gap-2">
            <n-dropdown :options="sizeOptions" scrollable :menu-props="limitedDropdownMenuProps" @select="handleSizeSelect">
              <button
                class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
                {{ displaySize }}
                <n-icon :size="12">
                  <ChevronForwardOutline />
                </n-icon>
              </button>
            </n-dropdown>
          </div>
        </div>

        <!-- Resolution selector | 分辨率选择 -->
        <div v-if="resolutionOptions.length" class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">分辨率</span>
          <n-dropdown :options="resolutionOptions" scrollable :menu-props="limitedDropdownMenuProps" @select="handleResolutionSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayResolution }}
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Model tips | 模型提示 -->
        <div v-if="currentModelConfig?.tips" class="text-xs text-[var(--text-tertiary)] bg-[var(--bg-tertiary)] rounded px-2 py-1">
          💡 {{ currentModelConfig.tips }}
        </div>

        <!-- Connected inputs indicator | 连接输入指示 -->
        <div
          class="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-1 border-t border-[var(--border-color)]">
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedPrompts.length > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            提示词 {{ connectedPrompts.length > 0 ? `${connectedPrompts.length}个` : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedRefImages.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考图 {{ connectedRefImages.length > 0 ? `${connectedRefImages.length}张` : '○' }}
          </span>
        </div>

        <!-- Generate button | 生成按钮 -->
        <div v-if="hasConnectedImageWithContent" class="flex gap-2">
          <!-- Create new (primary) | 新建节点（主按钮） -->
          <button @click="handleGenerate('new')" :disabled="loading || !isConfigured"
            class="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <n-spin v-if="loading" :size="14" />
            <template v-else>
              <n-icon :size="14"><AddOutline /></n-icon>
              新建生成
            </template>
          </button>
          <!-- Replace existing (secondary) | 替换现有（次按钮） -->
          <button @click="handleGenerate('replace')" :disabled="loading || !isConfigured"
            class="flex-shrink-0 flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)] hover:text-[var(--accent-color)] text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            <n-spin v-if="loading" :size="14" />
            <template v-else>
              <n-icon :size="14"><RefreshOutline /></n-icon>
              替换
            </template>
          </button>
        </div>
        <button v-else @click="handleGenerate('auto')" :disabled="loading || !isConfigured"
          class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <n-spin v-if="loading" :size="14" />
          <template v-else>
            <span
              class="text-[var(--accent-color)] bg-white rounded-full w-4 h-4 flex items-center justify-center text-xs">◆</span>
            立即生成
          </template>
        </button>

        <!-- Error message | 错误信息 -->
        <div v-if="error" class="text-xs text-red-500 mt-2">
          {{ error.message || '生成失败' }}
        </div>

        <!-- Generated images preview | 生成图片预览 -->
        <!-- <div v-if="generatedImages.length > 0" class="mt-3 space-y-2">
        <div class="text-xs text-[var(--text-secondary)]">生成结果:</div>
        <div class="grid grid-cols-2 gap-2 max-w-[240px]">
          <div 
            v-for="(img, idx) in generatedImages" 
            :key="idx"
            class="aspect-square rounded-lg overflow-hidden bg-[var(--bg-tertiary)] max-w-[110px]"
          >
            <img :src="img.url" class="w-full h-full object-cover" />
          </div>
        </div>
      </div> -->
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
      <NodeHandleMenu :nodeId="id" nodeType="imageConfig" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
    </div>

  </div>
</template>

<script setup>
/**
 * Image config node component | 文生图配置节点组件
 * Configuration panel for text-to-image generation with API integration
 */
import { ref, computed, watch, onMounted, nextTick, h } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin } from 'naive-ui'
import { ChevronDownOutline, ChevronForwardOutline, RefreshOutline, AddOutline, ImageOutline, ColorPaletteOutline } from '@vicons/ionicons5'
import { useImageGeneration } from '../../hooks'
import { updateNode, addNode, addEdge, nodes, edges } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import NodeTitle from './NodeTitle.vue'
import { parseMentions } from '../../hooks/useNodeRef'
import {
  buildImageSizeOptions,
  buildQualityOptions,
  buildResolutionOptions,
  findModelOption,
  isOfficialModel,
  modelOptionKey,
  modelPayload,
  pickOption,
  useUserModelOptions
} from '../../utils/modelOptions'

const props = defineProps({
  id: String,
  data: Object
})

const limitedDropdownMenuProps = () => ({
  style: {
    maxHeight: '152px'
  }
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// Image generation hook | 图片生成 hook
const { loading, error, images: generatedImages, generate } = useImageGeneration()
const { imageModels, loadModels } = useUserModelOptions()

// Local state | 本地状态
const showHandleMenu = ref(false)
const localModel = ref(props.data?.modelKey || props.data?.model_config_id || props.data?.model || '')
const localSize = ref(props.data?.size || '')
const localResolution = ref(props.data?.resolution || props.data?.image_size || props.data?.sample_image_size || '')
const localQuality = ref(props.data?.quality || '')

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')

// ImageConfig node menu operations | 图片配置节点菜单操作
const operations = [
  // { type: 'imageConfig', label: '图生图', icon: ImageOutline, action: 'imageConfig_imageConfig' }
]

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const action = item.action

  if (action === 'imageConfig_imageConfig') {
    // Image-to-image (create new image node for editing) | 图生图（创建新图片节点用于编辑）
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    // Create new image node for editing
    const imageNodeId = addNode('image', { x: nodeX + 400, y: nodeY }, {
      label: '图片编辑'
    })

    // Connect current config to new image node
    addEdge({
      source: props.id,
      target: imageNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })

    setTimeout(() => updateNodeInternals(imageNodeId), 50)
    window.$message?.success('已创建图片编辑节点')
  }
}

// Get current model config | 获取当前模型配置
const currentModelConfig = computed(() => findModelOption(imageModels.value, localModel.value))

// Model options from user providers | 从用户供应商获取模型选项
const modelOptions = computed(() => imageModels.value.map(m => ({
  label: modelBaseName(m),
  key: modelOptionKey(m)
})))

const isConfigured = computed(() => modelOptions.value.length > 0 && Boolean(currentModelConfig.value))

// Display model name | 显示模型名称
const displayModelName = computed(() => {
  const model = currentModelConfig.value
  return modelBaseName(model) || '选择模型'
})

function modelBaseName(model) {
  return model?.name || model?.display_name || model?.model_name || model?.config_name || model?.label || model?.model_id || model?.value || ''
}

function isPlatformModel(model) {
  return isOfficialModel(model)
}

function isVipModel(model) {
  return Boolean(model?.member_only || model?.memberOnly)
}

function renderModelOptionLabel(option) {
  const model = imageModels.value.find(item => modelOptionKey(item) === option.key)
  return h('span', { class: 'canvas-model-option-label' }, [
    h('span', { class: 'canvas-model-option-name' }, option.label),
    isPlatformModel(model) ? h('span', { class: 'canvas-model-badge official' }, '官网') : null,
    isVipModel(model) ? h('span', { class: 'canvas-model-badge vip' }, 'VIP') : null,
  ].filter(Boolean))
}

// Quality options based on model | 基于模型的画质选项
const qualityOptions = computed(() => {
  return buildQualityOptions(currentModelConfig.value)
})

// Check if model has quality options | 检查模型是否有画质选项
const hasQualityOptions = computed(() => {
  return qualityOptions.value && qualityOptions.value.length > 0
})

// Display quality | 显示画质
const displayQuality = computed(() => {
  const option = qualityOptions.value.find(o => (o.value || o.key) === localQuality.value)
  return option?.label || localQuality.value || '画质'
})

// Size options based on model and quality | 基于模型和画质的尺寸选项
const sizeOptions = computed(() => {
  return buildImageSizeOptions(currentModelConfig.value)
})

const resolutionOptions = computed(() => buildResolutionOptions(currentModelConfig.value, 'image'))

// Check if model has size options | 检查模型是否有尺寸选项
const hasSizeOptions = computed(() => {
  return sizeOptions.value.length > 0
})

// Display size with label | 显示尺寸（带标签）
const displaySize = computed(() => {
  const option = sizeOptions.value.find(o => (o.value || o.key) === localSize.value)
  return option?.label || localSize.value || '比例'
})

const displayResolution = computed(() => {
  const option = resolutionOptions.value.find(o => (o.value || o.key) === localResolution.value)
  return option?.label || localResolution.value || '分辨率'
})

const ensureSelectedParams = () => {
  const defaults = currentModelConfig.value?.defaults || {}
  if (!localSize.value || !sizeOptions.value.some(item => (item.value || item.key) === localSize.value)) {
    localSize.value = pickOption(sizeOptions.value, [defaults.aspect_ratio, defaults.aspectRatio, defaults.ratio, defaults.size])
  }
  if (!localResolution.value || !resolutionOptions.value.some(item => (item.value || item.key) === localResolution.value)) {
    localResolution.value = pickOption(resolutionOptions.value, [
      defaults.sampleImageSize,
      defaults.sample_image_size,
      defaults.imageSizeLevel,
      defaults.image_size_level,
      defaults.resolution
    ])
  }
  if (!localQuality.value || !qualityOptions.value.some(item => (item.value || item.key) === localQuality.value)) {
    localQuality.value = pickOption(qualityOptions.value, [defaults.quality])
  }
}

const ensureSelectedModel = () => {
  const preferred = imageModels.value.find(item => item.is_default) || imageModels.value[0]
  const matched = findModelOption(imageModels.value, localModel.value)
  localModel.value = matched ? modelOptionKey(matched) : (preferred ? modelOptionKey(preferred) : '')
  ensureSelectedParams()
  if (localModel.value) {
    updateNode(props.id, {
      modelKey: localModel.value,
      model: currentModelConfig.value?.model_id || localModel.value,
      model_config_id: currentModelConfig.value?.model_config_id || currentModelConfig.value?.id,
      user_provider_id: currentModelConfig.value?.user_provider_id,
      provider: currentModelConfig.value?.provider,
      size: localSize.value,
      resolution: localResolution.value,
      quality: localQuality.value
    })
  }
}

const normalizeOpenAIImageSize = (value) => {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw || raw === 'auto') return raw
  const ratioMatch = raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/)
  if (!ratioMatch) return raw
  const widthRatio = Number(ratioMatch[1])
  const heightRatio = Number(ratioMatch[2])
  if (!widthRatio || !heightRatio) return raw
  const ratio = widthRatio / heightRatio
  if (ratio < 1 / 3 || ratio > 3) return raw
  const roundTo16 = (size) => Math.max(16, Math.round(size / 16) * 16)
  return ratio >= 1 ? `${roundTo16(1024 * ratio)}x1024` : `1024x${roundTo16(1024 / ratio)}`
}

const shouldUseOpenAIImageSize = (modelConfig) => {
  const provider = String(modelConfig?.provider || '').toLowerCase()
  const protocol = String(
    modelConfig?.defaults?.protocol ||
    modelConfig?.defaults?.apiProtocol ||
    modelConfig?.defaults?.api_protocol ||
    modelConfig?.capabilities?.protocol ||
    modelConfig?.capabilities?.apiProtocol ||
    modelConfig?.capabilities?.api_protocol ||
    ''
  ).toLowerCase().replace(/_/g, '-')
  const modelId = String(modelConfig?.model_id || modelConfig?.value || localModel.value || '').toLowerCase()
  return protocol === 'openai-image' || provider === 'openai' || (provider === 'zenmux' && (protocol === 'openai-image' || modelId.startsWith('openai/') || modelId.includes('gpt-image-')))
}

const requestSizeForModel = (modelConfig) => {
  return shouldUseOpenAIImageSize(modelConfig) ? normalizeOpenAIImageSize(localSize.value) : localSize.value
}

// Initialize on mount | 挂载时初始化
onMounted(async () => {
  try {
    await loadModels()
    ensureSelectedModel()
  } catch (err) {
    window.$message?.error(err.message || '模型加载失败')
  }
})

// 解析 textNode 内容中的 @ 引用，转换为简短引用（如 图 1）并收集图片
const resolveTextMentionsForImage = (textNode) => {
  const content = textNode.data?.content || ''
  const mentions = parseMentions(content)

  if (mentions.length === 0) {
    return { resolvedContent: content, refImages: [] }
  }

  // 收集引用的图片节点
  const imageMentions = []
  for (const mention of mentions) {
    const referencedNode = nodes.value.find(n => n.id === mention.nodeId)
    if (referencedNode?.type === 'image') {
      const imageData = referencedNode.data?.base64 || referencedNode.data?.url
      if (imageData) {
        imageMentions.push({
          order: mention.order,
          nodeId: mention.nodeId,
          imageData
        })
      }
    }
  }

  if (imageMentions.length === 0) {
    return { resolvedContent: content, refImages: [] }
  }

  // 按出现顺序排序
  imageMentions.sort((a, b) => a.order - b.order)

  // 替换 @[nodeId] 为按顺序的 "图1"、"图2" 等
  let resolvedContent = content
  for (let i = 0; i < imageMentions.length; i++) {
    const mention = imageMentions[i]
    const placeholder = `@[${mention.nodeId}]`
    // 按排序后的索引替换为 "图1"、"图2" 等
    resolvedContent = resolvedContent.replace(placeholder, `图${i + 1}`)
  }

  // 返回解析后的内容和图片数组（按引用顺序）
  const refImages = imageMentions.map(m => m.imageData)

  return { resolvedContent, refImages }
}

// Computed connected prompts (sorted by order) | 计算连接的提示词（按顺序排列）
const connectedPrompts = computed(() => {
  return getConnectedInputs().prompts
})

// Computed connected reference images | 计算连接的参考图
const connectedRefImages = computed(() => {
  return getConnectedInputs().refImages
})

// 已连接的文本节点 ID 列表（用于 @ 提及时过滤）
const connectedTextNodeIds = computed(() => {
  const incomingEdges = edges.value.filter(e => e.target === props.id)
  const connectedIds = []
  for (const edge of incomingEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'text') {
      connectedIds.push(sourceNode.id)
    }
  }
  return connectedIds
})

// Get connected nodes | 获取连接的节点
const getConnectedInputs = () => {
  // 1. First check @ mentions | 首先检查 @ 引用
  // Only check connected TextNodes | 只检查已连接的 TextNode
  const textNodes = nodes.value.filter(n => n.type === 'text' && connectedTextNodeIds.value.includes(n.id))
  const mentionsPrompts = []
  const mentionsRefImages = []

  for (const textNode of textNodes) {
    const { resolvedContent, refImages: nodeRefImages } = resolveTextMentionsForImage(textNode)

    // 如果有解析出图片引用
    if (nodeRefImages.length > 0) {
      // 添加解析后的提示词内容
      mentionsPrompts.push({
        order: mentionsPrompts.length,
        content: resolvedContent,
        nodeId: textNode.id
      })

      // 添加参考图
      for (const imageData of nodeRefImages) {
        mentionsRefImages.push({
          order: mentionsRefImages.length,
          imageData,
          nodeId: textNode.id
        })
      }
    }
  }

  // 2. Get edge-connected ImageNodes | 获取边连接的 ImageNode
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  const edgeRefImages = [] // Array of { order, imageData, nodeId } | 参考图数组

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'image') {
      // Prefer base64, fallback to url | 优先使用 base64，回退到 url
      const imageData = sourceNode.data?.base64 || sourceNode.data?.url
      if (imageData) {
        // Get order from edge data, default to 1 | 从边数据获取顺序，默认为1
        // Add offset of @ mentions count | 加上 @ 提及图片数量的偏移
        const baseOrder = edge.data?.imageOrder || 1
        const order = mentionsRefImages.length + baseOrder
        edgeRefImages.push({ order, imageData, nodeId: sourceNode.id })
      }
    }
  }

  // 3. Merge and sort refImages | 合并并排序参考图
  // Combine @ mentions refImages and edge-connected refImages | 合并 @ 提及和边连接的图片
  const allRefImages = [...mentionsRefImages, ...edgeRefImages]
  // Sort by order | 按顺序排序
  allRefImages.sort((a, b) => a.order - b.order)
  const sortedRefImages = allRefImages.map(r => r.imageData)

  // 4. If there are @ mentions, use them | 如果有 @ 提及，使用它们
  if (mentionsPrompts.length > 0) {
    // Sort prompts by order | 按顺序排序提示词
    mentionsPrompts.sort((a, b) => a.order - b.order)
    const combinedPrompt = mentionsPrompts.map(p => p.content).join('\n\n')

    return {
      prompt: combinedPrompt,
      prompts: mentionsPrompts,
      refImages: sortedRefImages,
      refImagesWithOrder: allRefImages,
      fromMentions: true
    }
  }

  // 5. Fallback to edge connections | 降级到边的连接
  // (only prompts, no @ mentions) （只有提示词，没有 @ 提及）
  const prompts = [] // Array of { order, content } | 提示词数组

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'text') {
      const content = sourceNode.data?.content || ''
      if (content) {
        // Get order from edge data, default to 1 | 从边数据获取顺序，默认为1
        const order = edge.data?.promptOrder || 1
        prompts.push({ order, content, nodeId: sourceNode.id })
      }
    } else if (sourceNode.type === 'llmConfig') {
      // LLM node output as prompt | LLM 节点输出作为提示词
      const content = sourceNode.data?.outputContent || ''
      if (content) {
        const order = edge.data?.promptOrder || 1
        prompts.push({ order, content, nodeId: sourceNode.id })
      }
    }
    // Note: ImageNode handling moved to step 2 above | 注意：ImageNode 处理已移至步骤 2
  }

  // Sort prompts by order and concatenate | 按顺序排序并拼接
  prompts.sort((a, b) => a.order - b.order)
  const combinedPrompt = prompts.map(p => p.content).join('\n\n')

  // Use edge-connected refImages (already sorted above) | 使用边连接的参考图（已在上面排序）
  return { prompt: combinedPrompt, prompts, refImages: sortedRefImages, refImagesWithOrder: allRefImages, fromMentions: false }
}

// Handle model selection | 处理模型选择
const handleModelSelect = (key) => {
  localModel.value = key
  localSize.value = ''
  localResolution.value = ''
  localQuality.value = ''
  ensureSelectedParams()
  const payload = modelPayload(currentModelConfig.value, key)

  // 更新节点数据
  updateNode(props.id, {
    modelKey: key,
    ...payload,
    quality: localQuality.value,
    size: localSize.value,
    resolution: localResolution.value
  })
}

// Handle quality selection | 处理画质选择
const handleQualitySelect = (quality) => {
  localQuality.value = quality
  updateNode(props.id, { quality })
}

// Handle size selection | 处理尺寸选择
const handleSizeSelect = (size) => {
  localSize.value = size
  updateNode(props.id, { size })
}

const handleResolutionSelect = (resolution) => {
  localResolution.value = resolution
  updateNode(props.id, { resolution })
}

// Update size from manual input | 更新手动输入的尺寸
const updateSize = () => {
  updateNode(props.id, { size: localSize.value })
}

// Created image node ID | 创建的图片节点 ID
const createdImageNodeId = ref(null)

// Find connected output image node | 查找已连接的输出图片节点
const findConnectedOutputImageNode = (onlyEmpty = true) => {
  // Find edges where this node is the source | 查找以当前节点为源的边
  const outputEdges = edges.value.filter(e => e.source === props.id)
  
  for (const edge of outputEdges) {
    const targetNode = nodes.value.find(n => n.id === edge.target)
    if (targetNode?.type === 'image') {
      if (onlyEmpty) {
        // Check if target is an image node with empty or no url | 检查目标是否为空白图片节点
        if (!targetNode.data?.url || targetNode.data?.url === '') {
          return targetNode.id
        }
      } else {
        // Return any connected image node | 返回任意连接的图片节点
        return targetNode.id
      }
    }
  }
  return null
}

// Check if there's a connected image node with content | 检查是否有已连接且有内容的图片节点
const hasConnectedImageWithContent = computed(() => {
  const outputEdges = edges.value.filter(e => e.source === props.id)
  
  for (const edge of outputEdges) {
    const targetNode = nodes.value.find(n => n.id === edge.target)
    if (targetNode?.type === 'image' && targetNode.data?.url && targetNode.data.url !== '') {
      return true
    }
  }
  return false
})

// Handle generate action | 处理生成操作
// mode: 'auto' = 自动判断, 'replace' = 替换现有, 'new' = 新建节点
const handleGenerate = async (mode = 'auto') => {
  const { prompt, prompts, refImages, refImagesWithOrder } = getConnectedInputs()

  if (!prompt && refImages.length === 0) {
    window.$message?.warning('请连接文本节点（提示词）或图片节点（参考图）')
    return
  }
  
  // Log prompt order for debugging | 记录提示词顺序用于调试
  if (prompts.length > 1) {
    console.log('[ImageConfigNode] 拼接提示词顺序:', prompts.map(p => `${p.order}: ${p.content.substring(0, 20)}...`))
  }
  
  // Log image order for debugging | 记录图片顺序用于调试
  if (refImagesWithOrder && refImagesWithOrder.length > 1) {
    console.log('[ImageConfigNode] 参考图顺序:', refImagesWithOrder.map(r => `${r.order}: ${r.nodeId}`))
  }

  if (!isConfigured.value) {
    window.$message?.warning('暂无可用图片模型，请联系管理员配置平台模型')
    return
  }

  let imageNodeId = null
  
  if (mode === 'replace') {
    // Replace mode: find any connected image node | 替换模式：查找任意连接的图片节点
    imageNodeId = findConnectedOutputImageNode(false)
    if (imageNodeId) {
      updateNode(imageNodeId, { loading: true, url: '' })
    }
  } else if (mode === 'new') {
    // New mode: always create new node | 新建模式：始终创建新节点
    imageNodeId = null
  } else {
    // Auto mode: check for empty connected node first | 自动模式：先检查空白连接节点
    imageNodeId = findConnectedOutputImageNode(true)
    if (imageNodeId) {
      updateNode(imageNodeId, { loading: true })
    }
  }
  
  if (!imageNodeId) {
    // Get current node position | 获取当前节点位置
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0
    
    // Calculate Y offset if creating new node alongside existing | 如果是新建节点，计算Y偏移
    let yOffset = 0
    if (mode === 'new') {
      const outputEdges = edges.value.filter(e => e.source === props.id)
      yOffset = outputEdges.length * 280 // Stack below existing outputs | 在现有输出下方堆叠
    }

    // Create image node with loading state | 创建带加载状态的图片节点
    imageNodeId = addNode('image', { x: nodeX + 400, y: nodeY + yOffset }, {
      url: '',
      loading: true,
      label: '图像生成结果'
    })

    // Auto-connect imageConfig → image | 自动连接 生图配置 → 图片
    addEdge({
      source: props.id,
      target: imageNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })
  }
  
  createdImageNodeId.value = imageNodeId

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(imageNodeId)
  }, 50)

  try {
    // Build request params | 构建请求参数
    const selectedConfig = currentModelConfig.value
    const requestSize = requestSizeForModel(selectedConfig)
    const params = {
      ...modelPayload(selectedConfig, localModel.value),
      prompt: prompt,
      size: requestSize,
      image_size: localResolution.value || undefined,
      sample_image_size: localResolution.value || undefined,
      resolution: localResolution.value || undefined,
      quality: localQuality.value,
      n: 1,
      output_format: selectedConfig?.defaults?.output_format || selectedConfig?.defaults?.outputFormat || undefined,
      output_compression: selectedConfig?.defaults?.output_compression ?? selectedConfig?.defaults?.outputCompression ?? undefined,
      background: selectedConfig?.defaults?.background || undefined,
      moderation: selectedConfig?.defaults?.moderation || undefined,
      official_fallback: selectedConfig?.defaults?.official_fallback ?? selectedConfig?.defaults?.officialFallback ?? undefined,
      google_search: selectedConfig?.defaults?.google_search ?? selectedConfig?.defaults?.googleSearch ?? undefined,
      google_image_search: selectedConfig?.defaults?.google_image_search ?? selectedConfig?.defaults?.googleImageSearch ?? undefined
    }

    // Add reference image if provided | 如果有参考图则添加
    if (refImages.length > 0) {
      params.image = refImages
    }

    const result = await generate(params)

    // Update image node with generated URL | 更新图片节点 URL
    if (result && result.length > 0) {
      updateNode(imageNodeId, {
        url: result[0].url,
        loading: false,
        label: '文生图',
        model: selectedConfig?.model_id || localModel.value,
        updatedAt: Date.now()
      })
      
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: imageNodeId })
    }
    window.$message?.success('图片生成成功')
  } catch (err) {
    // Update node to show error | 更新节点显示错误
    updateNode(imageNodeId, {
      loading: false,
      error: err.message || '生成失败',
      updatedAt: Date.now()
    })
    window.$message?.error(err.message || '图片生成失败')
  }
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || ''
  isEditingLabel.value = true
}

// Finish editing label | 完成编辑 label
const finishEditLabel = () => {
  const newLabel = editingLabelValue.value.trim()
  if (newLabel && newLabel !== props.data?.label) {
    updateNode(props.id, { label: newLabel })
  }
  isEditingLabel.value = false
}

// Cancel editing label | 取消编辑 label
const cancelEditLabel = () => {
  isEditingLabel.value = false
}

// 监听模型变化，同步 Quality 和 Size
watch(() => props.data?.model, (newModel) => {
  const nextKey = props.data?.modelKey || props.data?.model_config_id || newModel
  if (nextKey && nextKey !== localModel.value) {
    localModel.value = String(nextKey)
    localSize.value = props.data?.size || localSize.value
    localResolution.value = props.data?.resolution || localResolution.value
    localQuality.value = props.data?.quality || localQuality.value
    ensureSelectedParams()
  }
})

// 修复 Vue Flow visibility: hidden 问题
watch(() => props.data, () => {
  nextTick(() => {
    updateNodeInternals(props.id)
  })
}, { deep: true })

// Watch for auto-execute flag | 监听自动执行标志
watch(
  () => props.data?.autoExecute,
  (shouldExecute) => {
    if (shouldExecute && !loading.value) {
      // Clear the flag first to prevent re-triggering | 先清除标志防止重复触发
      updateNode(props.id, { autoExecute: false })
      // Delay to ensure node connections are established | 延迟确保节点连接已建立
      setTimeout(() => {
        handleGenerate()
      }, 100)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.image-config-node-wrapper {
  position: relative;
  padding-top: 26px;
}

.image-config-node {
  cursor: default;
  position: relative;
  overflow: visible;
}

.canvas-model-label,
:global(.canvas-model-option-label) {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
}

.canvas-model-label > span:first-child,
:global(.canvas-model-option-name) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.canvas-model-badge,
:global(.canvas-model-badge) {
  flex: 0 0 auto;
  border-radius: 5px;
  padding: 1px 5px;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.35;
}

.canvas-model-badge.official,
:global(.canvas-model-badge.official) {
  background: rgba(10, 132, 255, 0.16);
  color: #60a5fa;
}

.canvas-model-badge.vip,
:global(.canvas-model-badge.vip) {
  background: rgba(245, 158, 11, 0.16);
  color: #fbbf24;
}
</style>
