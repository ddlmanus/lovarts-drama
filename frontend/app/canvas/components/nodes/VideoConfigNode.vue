<template>
  <!-- Video config node wrapper | 视频配置节点包裹层 -->
  <div class="video-config-node-wrapper relative" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
    <NodeTitle
      :label="data.label || '视频生成'"
      :icon="VideocamOutline"
      :editing="isEditingLabel"
      v-model="editingLabelValue"
      @start-edit="startEditLabel"
      @finish-edit="finishEditLabel"
      @cancel-edit="cancelEditLabel"
    />

    <!-- Video config node | 视频配置节点 -->
    <div class="video-config-node canvas-node-card rounded-xl min-w-[300px] transition-all duration-200"
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

        <!-- Aspect ratio selector | 宽高比选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">比例</span>
          <n-dropdown :options="ratioOptions" scrollable :menu-props="limitedDropdownMenuProps" @select="handleRatioSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ localRatio }}
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
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

        <!-- Duration selector | 时长选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">时长</span>
          <n-dropdown :options="durationOptions" scrollable :menu-props="limitedDropdownMenuProps" @select="handleDurationSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ localDuration }}s
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Connected inputs indicator | 连接输入指示 -->
        <div
          class="flex items-center gap-2 text-xs text-[var(--text-secondary)] py-1 border-t border-[var(--border-color)]">
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedPrompt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            提示词 {{ connectedPrompt ? '✓' : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.firstFrame ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            首帧 {{ imagesByRole.firstFrame ? '✓' : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.lastFrame ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            尾帧 {{ imagesByRole.lastFrame ? '✓' : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.referenceImages.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考图 {{ imagesByRole.referenceImages.length > 0 ? `✓ ${imagesByRole.referenceImages.length}` : '○' }}
          </span>
        </div>

        <!-- Progress bar | 进度条 -->
        <!-- <div v-if="status === 'polling'" class="space-y-1">
        <div class="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>生成中...</span>
          <span>{{ progress.percentage }}%</span>
        </div>
        <n-progress type="line" :percentage="progress.percentage" :show-indicator="false" :height="4" />
      </div> -->

        <!-- Generate button | 生成按钮 -->
        <button @click="handleGenerate" :disabled="isGenerating || !isConfigured"
          class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <n-spin v-if="isGenerating" :size="14" />
          <template v-else>
            <n-icon :size="16">
              <VideocamOutline />
            </n-icon>
            生成视频
          </template>
        </button>

        <!-- Error message | 错误信息 -->
        <div v-if="error" class="text-xs text-red-500 mt-2">
          {{ error.message || '生成失败' }}
        </div>

        <!-- Generated video preview | 生成视频预览 -->
        <!-- <div v-if="generatedVideo?.url" class="mt-3 space-y-2">
        <div class="text-xs text-[var(--text-secondary)]">生成结果:</div>
        <div class="aspect-video rounded-lg overflow-hidden bg-black">
          <video :src="generatedVideo.url" controls class="w-full h-full object-contain" />
        </div>
      </div> -->
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
      <NodeHandleMenu :nodeId="id" nodeType="videoConfig" :visible="showHandleMenu" :operations="[]" />
    </div>

  </div>
</template>

<script setup>
/**
 * Video config node component | 视频配置节点组件
 * Configuration panel for video generation with API integration
 */
import { ref, computed, watch, onMounted, nextTick, h } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin } from 'naive-ui'
import { ChevronForwardOutline, ChevronDownOutline, VideocamOutline } from '@vicons/ionicons5'
import { useVideoGeneration } from '../../hooks'
import { updateNode, addNode, addEdge, nodes, edges } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import NodeTitle from './NodeTitle.vue'
import {
  buildAspectRatioOptions,
  buildDurationOptions,
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

// Video generation hook | 视频生成 hook
const { loading, error, status, video: generatedVideo, progress, createVideoTaskOnly } = useVideoGeneration()
const { videoModels, loadModels } = useUserModelOptions()

// Local state | 本地状态
const showHandleMenu = ref(false)
const isGenerating = ref(false)  // 任务创建中状态
const localModel = ref(props.data?.modelKey || props.data?.model_config_id || props.data?.model || '')
const localRatio = ref(props.data?.ratio || props.data?.aspect_ratio || '')
const localResolution = ref(props.data?.resolution || '')
const localDuration = ref(props.data?.dur || 5)

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')

// Get connected images with roles | 获取连接的图片及其角色
const connectedImages = computed(() => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  const images = []

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image' && sourceNode.data?.url) {
      images.push({
        nodeId: sourceNode.id,
        edgeId: edge.id,
        url: sourceNode.data.url,
        base64: sourceNode.data.base64,
        role: edge.data?.imageRole || 'first_frame_image' // Default to first frame | 默认首帧
      })
    }
  }

  return images
})

// Get images by role | 按角色获取图片
const imagesByRole = computed(() => {
  const firstFrame = connectedImages.value.find(img => img.role === 'first_frame_image')
  const lastFrame = connectedImages.value.find(img => img.role === 'last_frame_image')
  const referenceImages = connectedImages.value.filter(img => img.role === 'input_reference')

  return {
    firstFrame,
    lastFrame,
    referenceImages
  }
})

// Get current model config | 获取当前模型配置
const currentModelConfig = computed(() => findModelOption(videoModels.value, localModel.value))

// Model options from user providers | 从用户供应商获取模型选项
const modelOptions = computed(() => videoModels.value.map(m => ({
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
  const model = videoModels.value.find(item => modelOptionKey(item) === option.key)
  return h('span', { class: 'canvas-model-option-label' }, [
    h('span', { class: 'canvas-model-option-name' }, option.label),
    isPlatformModel(model) ? h('span', { class: 'canvas-model-badge official' }, '官网') : null,
    isVipModel(model) ? h('span', { class: 'canvas-model-badge vip' }, 'VIP') : null,
  ].filter(Boolean))
}

// Ratio options based on model | 基于模型的比例选项
const ratioOptions = computed(() => {
  return buildAspectRatioOptions(currentModelConfig.value)
})

// Duration options based on model | 基于模型的时长选项
const durationOptions = computed(() => {
  return buildDurationOptions(currentModelConfig.value)
})

const resolutionOptions = computed(() => buildResolutionOptions(currentModelConfig.value, 'video'))

const displayResolution = computed(() => {
  const option = resolutionOptions.value.find(o => (o.value || o.key) === localResolution.value)
  return option?.label || localResolution.value || '分辨率'
})

const ensureSelectedParams = () => {
  const defaults = currentModelConfig.value?.defaults || {}
  if (!localRatio.value || !ratioOptions.value.some(item => (item.value || item.key) === localRatio.value)) {
    localRatio.value = pickOption(ratioOptions.value, [defaults.aspect_ratio, defaults.aspectRatio, defaults.ratio])
  }
  if (!localResolution.value || !resolutionOptions.value.some(item => (item.value || item.key) === localResolution.value)) {
    localResolution.value = pickOption(resolutionOptions.value, [defaults.resolution])
  }
  if (!localDuration.value) {
    localDuration.value = Number(pickOption(durationOptions.value, [defaults.duration, defaults.dur]) || 5)
  }
}

const ensureSelectedModel = () => {
  const preferred = videoModels.value.find(item => item.is_default) || videoModels.value[0]
  const matched = findModelOption(videoModels.value, localModel.value)
  localModel.value = matched ? modelOptionKey(matched) : (preferred ? modelOptionKey(preferred) : '')
  ensureSelectedParams()
  if (localModel.value) {
    updateNode(props.id, {
      modelKey: localModel.value,
      model: currentModelConfig.value?.model_id || localModel.value,
      model_config_id: currentModelConfig.value?.model_config_id || currentModelConfig.value?.id,
      user_provider_id: currentModelConfig.value?.user_provider_id,
      provider: currentModelConfig.value?.provider,
      ratio: localRatio.value,
      resolution: localResolution.value,
      dur: localDuration.value
    })
  }
}

// Handle model selection | 处理模型选择
const handleModelSelect = (key) => {
  localModel.value = key
  localRatio.value = ''
  localResolution.value = ''
  localDuration.value = 0
  ensureSelectedParams()
  updateNode(props.id, {
    modelKey: key,
    ...modelPayload(currentModelConfig.value, key),
    ratio: localRatio.value,
    resolution: localResolution.value,
    dur: localDuration.value
  })
}

// Handle ratio selection | 处理比例选择
const handleRatioSelect = (key) => {
  localRatio.value = key
  updateNode(props.id, { ratio: key })
}

// Handle duration selection | 处理时长选择
const handleDurationSelect = (key) => {
  localDuration.value = key
  updateNode(props.id, { dur: key })
}

const handleResolutionSelect = (key) => {
  localResolution.value = key
  updateNode(props.id, { resolution: key })
}

// Get connected inputs by role | 根据角色获取连接的输入
const getConnectedInputs = () => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)

  let prompt = ''
  let first_frame_image = ''
  let last_frame_image = ''
  const images = [] // input_reference images | 参考图

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'text') {
      prompt = sourceNode.data?.content || ''
    } else if (sourceNode.type === 'llmConfig') {
      // LLM node output as prompt | LLM 节点输出作为提示词
      const content = sourceNode.data?.outputContent || ''
      if (content) prompt = content
    } else if (sourceNode.type === 'image' && sourceNode.data?.url) {
      const imageData = sourceNode.data.base64 || sourceNode.data.url
      const role = edge.data?.imageRole || 'first_frame_image'

      if (role === 'first_frame_image') {
        first_frame_image = imageData
      } else if (role === 'last_frame_image') {
        last_frame_image = imageData
      } else if (role === 'input_reference') {
        images.push(imageData)
      }
    }
  }

  return { prompt, first_frame_image, last_frame_image, images }
}

// Computed connected prompt | 计算连接的提示词
const connectedPrompt = computed(() => {
  return getConnectedInputs().prompt
})

// Created video node ID | 创建的视频节点 ID
const createdVideoNodeId = ref(null)

// Handle generate action | 处理生成操作
const handleGenerate = async () => {
  // 设置生成中状态
  isGenerating.value = true

  const { prompt, first_frame_image, last_frame_image, images } = getConnectedInputs()

  const hasInput = prompt || first_frame_image || last_frame_image || images.length > 0
  if (!hasInput) {
    window.$message?.warning('请先连接文本节点或图片节点')
    isGenerating.value = false
    return
  }

  if (!isConfigured.value) {
    window.$message?.warning('暂无可用视频模型，请联系管理员配置平台模型')
    isGenerating.value = false
    return
  }

  // Get current node position | 获取当前节点位置
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create video node with loading state | 创建带加载状态的视频节点
  const videoNodeId = addNode('video', { x: nodeX + 350, y: nodeY }, {
    url: '',
    loading: true,
    label: '视频生成中...'
  })
  createdVideoNodeId.value = videoNodeId

  // Auto-connect videoConfig → video | 自动连接 视频配置 → 视频
  addEdge({
    source: props.id,
    target: videoNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(videoNodeId)
  }, 50)

  try {
    // Build request params (raw form data) | 构建请求参数（原始表单数据）
    // These will be transformed by inputTransform | 这些会被 inputTransform 转换
    const params = {
      ...modelPayload(currentModelConfig.value, localModel.value)
    }

    // Add prompt if provided | 如果有提示词则添加
    if (prompt) {
      params.prompt = prompt
    }

    // Add first frame image | 添加首帧图片
    if (first_frame_image) {
      params.first_frame_image = first_frame_image
    }

    // Add last frame image | 添加尾帧图片
    if (last_frame_image) {
      params.last_frame_image = last_frame_image
    }

    // Add reference images (input_reference) | 添加参考图
    if (images.length > 0) {
      params.images = images
    }

    // Add ratio/size | 添加比例参数
    if (localRatio.value) {
      params.ratio = localRatio.value
      params.aspect_ratio = localRatio.value
    }

    if (localResolution.value) {
      params.resolution = localResolution.value
    }

    // Add duration | 添加时长
    if (localDuration.value) {
      params.dur = localDuration.value
    }

    // 只创建任务，获取 taskId，不在这里轮询
    const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

    // 如果有直接 URL，更新视频节点
    if (url) {
      updateNode(videoNodeId, {
        url: url,
        loading: false,
        label: '视频生成',
        model: currentModelConfig.value?.model_id || localModel.value,
        updatedAt: Date.now()
      })
      window.$message?.success('视频生成成功')
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: videoNodeId })
    } else if (newTaskId) {
      // 需要轮询，传递 taskId 给 VideoNode
      updateNode(videoNodeId, {
        taskId: newTaskId,
        loading: true,
        label: '视频生成中...',
        model: currentModelConfig.value?.model_id || localModel.value,
        updatedAt: Date.now()
      })
      window.$message?.success('视频任务已创建')
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: videoNodeId })
    }
  } catch (err) {
    // Update node to show error | 更新节点显示错误
    updateNode(videoNodeId, {
      loading: false,
      error: err.message || '生成失败',
      label: '生成失败',
      updatedAt: Date.now()
    })
    window.$message?.error(err.message || '视频生成失败')
  } finally {
    isGenerating.value = false
  }
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || '视频生成'
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

// Initialize on mount | 挂载时初始化
onMounted(async () => {
  try {
    await loadModels()
    ensureSelectedModel()
  } catch (err) {
    window.$message?.error(err.message || '模型加载失败')
  }
})

// Watch for model changes from props | 监听 props 中模型变化
watch(() => props.data?.model, (newModel) => {
  const nextKey = props.data?.modelKey || props.data?.model_config_id || newModel
  if (nextKey && nextKey !== localModel.value) {
    localModel.value = String(nextKey)
    localRatio.value = props.data?.ratio || localRatio.value
    localResolution.value = props.data?.resolution || localResolution.value
    localDuration.value = props.data?.dur || localDuration.value
    ensureSelectedParams()
  }
})

// 修复 Vue Flow visibility: hidden 问题
// 当节点数据变化时，强制更新内部状态
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
.video-config-node-wrapper {
  position: relative;
  padding-top: 26px;
}

.video-config-node {
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
