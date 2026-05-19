<template>
  <!-- Image node wrapper for hover area | 图片节点包裹层，扩展悬浮区域 -->
  <div class="image-node-wrapper" @mouseenter="showActions = true; showHandleMenu = true" @mouseleave="showActions = false; showHandleMenu = false">
    <!-- Image node | 图片节点 -->
    <div
      class="image-node bg-[var(--bg-secondary)] rounded-xl border min-w-[200px] max-w-[280px] relative transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="px-3 py-2 border-b border-[var(--border-color)]">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              v-if="!isEditingLabel"
              @dblclick="startEditLabel"
              class="text-sm font-medium text-[var(--text-primary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
              title="双击编辑名称"
            >{{ data.label || '图像生成结果' }}</span>
            <input
              v-else
              ref="labelInputRef"
              v-model="editingLabelValue"
              @blur="finishEditLabel"
              @keydown.enter="finishEditLabel"
              @keydown.escape="cancelEditLabel"
              class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-1 rounded outline-none border border-blue-500"
            />
            <!-- Public switch | 公开开关 -->
            <n-tooltip trigger="hover">
              <template #trigger>
                <button
                  class="flex items-center"
                  title="设置公开（可被 @ 引用）"
                >
                  <n-switch
                    :value="isPublic"
                    @update:value="handleTogglePublic"
                    size="small"
                  />
                </button>
              </template>
              {{ isPublic ? '已公开: ' + (data.label || '图片') : '点击公开（可被 @ 引用）' }}
            </n-tooltip>
          </div>
          <div class="flex items-center gap-1">
            <!-- Replace button | 替换按钮 -->
            <n-tooltip trigger="hover">
              <template #trigger>
                <button @click="showReplaceModal = true" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <n-icon :size="14">
                    <SwapHorizontalOutline />
                  </n-icon>
                </button>
              </template>
              替换图片
            </n-tooltip>
            <n-tooltip v-if="data.url" trigger="hover">
              <template #trigger>
                <button @click="handlePreview" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <n-icon :size="14">
                    <EyeOutline />
                  </n-icon>
                </button>
              </template>
              预览
            </n-tooltip>
            <n-tooltip v-if="data.url" trigger="hover">
              <template #trigger>
                <button @click="handleDownload" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <n-icon :size="14">
                    <DownloadOutline />
                  </n-icon>
                </button>
              </template>
              下载
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <n-icon :size="14">
                    <CopyOutline />
                  </n-icon>
                </button>
              </template>
              复制节点
            </n-tooltip>
            <n-tooltip trigger="hover">
              <template #trigger>
                <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors">
                  <n-icon :size="14">
                    <TrashOutline />
                  </n-icon>
                </button>
              </template>
              删除节点
            </n-tooltip>
          </div>
        </div>
        <!-- Model name | 模型名称 -->
        <div v-if="data.model" class="mt-1 text-xs text-[var(--text-secondary)] truncate">
          {{ data.model }}
        </div>
      </div>

      <!-- Image preview area | 图片预览区域 -->
      <div class="p-3">
        <!-- Loading state | 加载状态 -->
        <div v-if="data.loading"
          class="aspect-square rounded-xl bg-gradient-to-br from-cyan-400 via-blue-300 to-amber-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          <!-- Animated gradient overlay | 动画渐变遮罩 -->
          <div
            class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-400/20 to-amber-300/20 animate-pulse">
          </div>

          <!-- Loading image | 加载图片 -->
          <div class="relative z-10">
            <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
          </div>

          <span class="text-sm text-white font-medium relative z-10">创作中</span>
        </div>

        <!-- Error state | 错误状态 -->
        <div v-else-if="data.error"
          class="aspect-square rounded-xl bg-red-50 dark:bg-red-900/20 flex flex-col items-center justify-center gap-2 border border-red-200 dark:border-red-800">
          <n-icon :size="32" class="text-red-500">
            <CloseCircleOutline />
          </n-icon>
          <span class="text-sm text-red-600 dark:text-red-400 text-center px-2">{{ data.error }}</span>
        </div>

        <!-- Image display | 图片显示 -->
        <div 
          v-else-if="data.url" 
          class="rounded-xl overflow-hidden relative" 
          ref="imageContainerRef"
        >
          <img 
            :src="data.url" 
            :alt="data.label" 
            class="w-full h-auto object-cover"
            :class="{ 'pointer-events-none': isInpaintMode }"
          />
          
          <!-- Inpaint canvas with events | 涂抹画布（带事件） -->
          <canvas 
            v-if="isInpaintMode"
            ref="canvasRef"
            class="absolute inset-0 w-full h-full cursor-none z-10"
            @mousedown.stop.prevent="onCanvasPaint"
            @mousemove.stop="onCanvasMove"
            @mouseup.stop="onPaintEnd"
            @mouseleave="onPaintEnd"
          />
          
          <!-- Brush cursor | 画笔光标 -->
          <div 
            v-show="brushCursor.visible && isInpaintMode"
            class="absolute pointer-events-none border-2 border-purple-500 rounded-full bg-purple-400/30 transition-none"
            :style="{
              width: brushSize * 2 + 'px',
              height: brushSize * 2 + 'px',
              left: brushCursor.x - brushSize + 'px',
              top: brushCursor.y - brushSize + 'px'
            }"
          />
          
          <!-- Inpaint toolbar | 涂抹工具栏 -->
          <div 
            v-show="isInpaintMode"
            class="absolute top-1.5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2 py-1 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm rounded-full shadow-md border border-gray-200/80 dark:border-gray-700 z-[9999]"
            @mousedown.stop
            @click.stop
          >
            <!-- Mode indicator | 模式指示 -->
            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 pr-1.5 border-r border-gray-200 dark:border-gray-600">
              <n-icon :size="12"><BrushOutline /></n-icon>
              <span>擦除</span>
            </div>
            
            <!-- Size slider | 大小滑块 -->
            <div class="flex items-center gap-1 w-16">
              <div class="w-1.5 h-1.5 rounded-full bg-purple-400"></div>
              <input 
                type="range" 
                v-model="brushSize" 
                min="10" 
                max="80" 
                class="w-full h-0.5 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
              />
              <div class="w-2.5 h-2.5 rounded-full bg-purple-400"></div>
            </div>
            
            <!-- Reset button | 重置按钮 -->
            <button 
              @click="clearMask"
              class="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="清除"
            >
              <n-icon :size="12" class="text-gray-400"><RefreshOutline /></n-icon>
            </button>
            
            <!-- Apply button | 应用按钮 -->
            <button 
              @click="applyInpaint"
              class="px-2 py-0.5 bg-purple-500 hover:bg-purple-600 text-white text-xs rounded transition-colors"
            >
              应用
            </button>
          </div>
        </div>

        <!-- URL Loading state | URL 加载状态 -->
        <div v-else-if="urlLoading"
          class="aspect-square rounded-xl bg-gradient-to-br from-cyan-400 via-blue-300 to-amber-200 flex flex-col items-center justify-center gap-3 relative overflow-hidden">
          <div class="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-400/20 to-amber-300/20 animate-pulse"></div>
          <div class="relative z-10">
            <img src="../../assets/loading.webp" alt="Loading" class="w-14 h-12" />
          </div>
          <span class="text-sm text-white font-medium relative z-10">加载中...</span>
        </div>

        <!-- Upload placeholder | 上传占位 -->
        <div v-else class="rounded-xl bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-color)] p-3">
          <!-- Upload area | 上传区域 -->
          <div class="aspect-video flex flex-col items-center justify-center gap-2 relative cursor-pointer hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
            <n-icon :size="32" class="text-[var(--text-secondary)]">
              <ImageOutline />
            </n-icon>
            <span class="text-sm text-[var(--text-secondary)] text-center">拖放图片或点击上传</span>
            <input type="file" accept="image/*" class="absolute inset-0 opacity-0 cursor-pointer"
              @change="handleFileUpload" />
          </div>
          
          <!-- Divider | 分割线 -->
          <div class="flex items-center gap-2 my-3">
            <div class="flex-1 h-px bg-[var(--border-color)]"></div>
            <span class="text-xs text-[var(--text-secondary)]">或</span>
            <div class="flex-1 h-px bg-[var(--border-color)]"></div>
          </div>
          
          <!-- URL input | URL 输入 -->
          <div class="flex gap-2">
            <input 
              v-model="urlInput"
              type="text" 
              placeholder="输入图片地址..."
              class="flex-1 px-2 py-1 text-sm bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
              @keydown.enter="handleUrlSubmit"
            />
            <button 
              @click="handleUrlSubmit"
              :disabled="!urlInput.trim()"
              class="px-3 py-2 text-xs bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              预览
            </button>
          </div>
        </div>
      </div>

      <!-- Handles | 连接点 -->
      <NodeHandleMenu :nodeId="id" nodeType="image" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    </div>
  </div>

  <!-- Image preview dialog | 图片预览弹窗 -->
  <n-image-preview
    v-model:show="showRef"
    :src="props.data?.url"
  />

  <!-- Replace image modal | 替换图片弹窗 -->
  <n-modal v-model:show="showReplaceModal" preset="card" title="替换图片" class="w-[400px]" :mask-closable="true">
    <div class="space-y-4">
      <!-- Upload area | 上传区域 -->
      <div
        class="border-2 border-dashed border-[var(--border-color)] rounded-xl p-4 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors"
        @click="replaceFileInputRef?.click()"
      >
        <div class="flex flex-col items-center gap-2">
          <n-icon :size="32" class="text-[var(--text-secondary)]">
            <ImageOutline />
          </n-icon>
          <span class="text-sm text-[var(--text-secondary)]">点击上传图片</span>
          <input
            ref="replaceFileInputRef"
            type="file"
            accept="image/*"
            class="hidden"
            @change="handleReplaceFileUpload"
          />
        </div>
      </div>

      <!-- Divider | 分割线 -->
      <div class="flex items-center gap-2">
        <div class="flex-1 h-px bg-[var(--border-color)]"></div>
        <span class="text-xs text-[var(--text-secondary)]">或</span>
        <div class="flex-1 h-px bg-[var(--border-color)]"></div>
      </div>

      <!-- URL input | URL 输入 -->
      <div class="flex gap-2">
        <input
          v-model="replaceUrlInput"
          type="text"
          placeholder="输入图片地址..."
          class="flex-1 px-3 py-2 text-sm bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg outline-none focus:border-[var(--accent-color)] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
          @keydown.enter="handleReplaceUrlSubmit"
        />
        <n-button type="primary" size="small" :disabled="!replaceUrlInput.trim()" @click="handleReplaceUrlSubmit">
          确认
        </n-button>
      </div>
    </div>
  </n-modal>
</template>

<script setup>
/**
 * Image node component | 图片节点组件
 * Displays and manages image content with loading state
 */
import { ref, nextTick, computed } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NTooltip, NSwitch, NImagePreview, NModal, NButton } from 'naive-ui'
import { TrashOutline, ExpandOutline, ImageOutline, CloseCircleOutline, CopyOutline, VideocamOutline, DownloadOutline, EyeOutline, BrushOutline, RefreshOutline, ColorWandOutline, SwapHorizontalOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// Hover state | 悬浮状态
const showActions = ref(true)
const showHandleMenu = ref(false)

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// URL input state | URL 输入状态
const urlInput = ref('')
const urlLoading = ref(false)

// Replace modal state | 替换弹窗状态
const showReplaceModal = ref(false)
const replaceUrlInput = ref('')
const replaceFileInputRef = ref(null)

// Inpainting state | 涂抹重绘状态
const isInpaintMode = ref(false)
const brushSize = ref(40)
const isDrawing = ref(false)
const canvasRef = ref(null)
const imageContainerRef = ref(null)
const interactionLayerRef = ref(null)
const brushCursor = ref({ x: 0, y: 0, visible: false })
const maskData = ref(null)


// Computed public props status | 计算是否公开
const isPublic = computed(() => {
  return props.data?.publicProps?.name != null && props.data?.publicProps?.name !== ''
})

// Handle toggle public | 处理切换公开状态
const handleTogglePublic = (value) => {
  if (value) {
    // 公开：使用节点名称
    const name = props.data?.label || '图片'
    updateNode(props.id, {
      publicProps: { name }
    })
  } else {
    // 取消公开
    updateNode(props.id, {
      publicProps: {}
    })
  }
}

// Image node menu operations | 图片节点菜单操作
const operations = [
  { type: 'imageConfig', label: '图生图', icon: ImageOutline, action: 'image_imageConfig' },
  { type: 'videoConfig', label: '生视频', icon: VideocamOutline, action: 'image_videoConfig' }
]

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const action = item.action

  if (action === 'image_imageConfig') {
    // Image-to-image workflow | 图生图工作流
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0
    const sourceUrl = currentNode?.data?.url

    if (!sourceUrl) {
      window.$message?.warning('当前图片节点没有图片')
      return
    }

    // Create text node for prompt
    const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
      content: '',
      label: '提示词'
    })

    // Create imageConfig node
    const configNodeId = addNode('imageConfig', { x: nodeX + 900, y: nodeY }, {
      model: 'doubao-seedream-4-5-251128',
      size: '2048x2048',
      label: '生图配置'
    })

    // Connect edges
    addEdge({ source: props.id, target: configNodeId, sourceHandle: 'right', targetHandle: 'left' })
    addEdge({ source: textNodeId, target: configNodeId, sourceHandle: 'right', targetHandle: 'left' })

    setTimeout(() => updateNodeInternals([textNodeId, configNodeId]), 50)
    window.$message?.success('已创建图生图工作流')
  } else if (action === 'image_videoConfig') {
    // Video generation workflow | 视频生成工作流
    const currentNode = nodes.value.find(n => n.id === props.id)
    const nodeX = currentNode?.position?.x || 0
    const nodeY = currentNode?.position?.y || 0

    // Create text node for prompt
    const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
      content: '',
      label: '提示词'
    })

    // Create videoConfig node
    const configNodeId = addNode('videoConfig', { x: nodeX + 600, y: nodeY }, {
      label: '视频生成'
    })

    // Connect image to videoConfig
    addEdge({
      source: props.id,
      target: configNodeId,
      sourceHandle: 'right',
      targetHandle: 'left',
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' }
    })

    // Connect text to videoConfig
    addEdge({
      source: textNodeId,
      target: configNodeId,
      sourceHandle: 'right',
      targetHandle: 'left'
    })

    setTimeout(() => updateNodeInternals([textNodeId, configNodeId]), 50)
    window.$message?.success('已创建视频生成工作流')
  }
}

// Toggle inpaint mode | 切换涂抹模式
const toggleInpaintMode = () => {
  isInpaintMode.value = !isInpaintMode.value
  if (isInpaintMode.value) {
    nextTick(() => initCanvas())
  } else {
    clearMask()
  }
}

// Initialize canvas | 初始化画布
const initCanvas = () => {
  setTimeout(() => {
    const canvas = canvasRef.value
    if (!canvas) return
    
    // Set canvas internal size to match its CSS rendered size | 设置画布内部尺寸匹配 CSS 渲染尺寸
    // clientWidth/clientHeight give the CSS box size
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
    
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
  }, 100)
}

// Ensure canvas size matches display | 确保画布尺寸匹配显示
const syncCanvasSize = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
  }
}

// Canvas paint handlers | 画布绘制处理器
const onCanvasPaint = (e) => {
  syncCanvasSize()
  isDrawing.value = true
  paintAt(e.offsetX, e.offsetY)
  brushCursor.value = { x: e.offsetX, y: e.offsetY, visible: true }
}

const onCanvasMove = (e) => {
  brushCursor.value = { x: e.offsetX, y: e.offsetY, visible: true }
  if (isDrawing.value) {
    paintAt(e.offsetX, e.offsetY)
  }
}

const onPaintEnd = () => {
  isDrawing.value = false
  brushCursor.value.visible = false
}

// Paint at coordinates | 在坐标绘制
const paintAt = (x, y) => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  ctx.beginPath()
  ctx.arc(x, y, brushSize.value, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(139, 92, 246, 0.5)'
  ctx.fill()
}

// Hide brush cursor | 隐藏画笔光标
const hideBrushCursor = () => {
  brushCursor.value.visible = false
}

// Clear mask | 清除蒙版
const clearMask = () => {
  const canvas = canvasRef.value
  if (!canvas) return
  
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  maskData.value = null
}

// Apply inpaint and create workflow | 应用重绘并创建工作流
const applyInpaint = () => {
  const canvas = canvasRef.value
  if (!canvas || canvas.width === 0 || canvas.height === 0) {
    window.$message?.error('画布未初始化')
    return
  }
  
  // Get the original image and resize mask to match | 获取原图并调整蒙版大小匹配
  const container = imageContainerRef.value
  const img = container?.querySelector('img')
  if (!img) {
    window.$message?.error('未找到图片')
    return
  }
  
  // Create mask at original image resolution | 创建原图分辨率的蒙版
  const maskCanvas = document.createElement('canvas')
  const imgWidth = img.naturalWidth || img.width
  const imgHeight = img.naturalHeight || img.height
  maskCanvas.width = imgWidth
  maskCanvas.height = imgHeight
  const maskCtx = maskCanvas.getContext('2d')
  
  // Fill black background | 填充黑色背景
  maskCtx.fillStyle = '#000000'
  maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  
  // Scale factor from display to original | 从显示尺寸到原图的缩放因子
  const scaleX = imgWidth / canvas.width
  const scaleY = imgHeight / canvas.height
  
  // Get painted areas and scale to original resolution | 获取绑制区域并缩放到原图分辨率
  const originalData = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height)
  
  // Draw scaled white areas on mask | 在蒙版上绘制缩放后的白色区域
  maskCtx.fillStyle = '#FFFFFF'
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * 4
      if (originalData.data[i + 3] > 0) {
        // Scale and draw | 缩放并绘制
        maskCtx.fillRect(
          Math.floor(x * scaleX),
          Math.floor(y * scaleY),
          Math.ceil(scaleX),
          Math.ceil(scaleY)
        )
      }
    }
  }
  
  // Convert to base64 (remove data URL prefix for API) | 转换为 base64（移除前缀用于 API）
  const dataUrl = maskCanvas.toDataURL('image/png')
  const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
  maskData.value = base64Data
  
  // Create inpaint workflow | 创建重绘工作流
  createInpaintWorkflow()
}

// Create inpaint workflow | 创建重绘工作流
const createInpaintWorkflow = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0
  
  // Create text node for prompt | 创建文本节点用于提示词
  const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
    content: '请输入重绘提示词...',
    label: '重绘提示词'
  })
  
  // Create imageConfig node for inpainting | 创建图生图配置节点
  const configNodeId = addNode('imageConfig', { x: nodeX + 600, y: nodeY }, {
    model: 'doubao-seedream-4-5-251128',
    size: '2048x2048',
    label: '局部重绘',
    inpaintMode: true
  })
  
  // Update current node with mask data | 更新当前节点的蒙版数据
  updateNode(props.id, {
    maskData: maskData.value,
    hasInpaintMask: true
  })
  
  // Connect image node to config node | 连接图片节点到配置节点
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })
  
  // Connect text node to config node | 连接文本节点到配置节点
  addEdge({
    source: textNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })
  
  // Exit inpaint mode | 退出涂抹模式
  isInpaintMode.value = false
  
  // Force Vue Flow to recalculate | 强制重新计算
  setTimeout(() => {
    updateNodeInternals([textNodeId, configNodeId])
  }, 50)
  
  window.$message?.success('已创建局部重绘工作流')
}

// Convert file to base64 | 将文件转换为 base64
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Handle file upload | 处理文件上传
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      // Convert to base64 | 转换为 base64
      const base64 = await fileToBase64(file)
      // Store both display URL and base64 | 同时存储显示 URL 和 base64
      updateNode(props.id, {
        url: base64,  // Use base64 as display URL | 使用 base64 作为显示 URL
        base64: base64,  // Store base64 for API calls | 存储 base64 用于 API 调用
        fileName: file.name,
        fileType: file.type,
        label: '参考图',
        updatedAt: Date.now()
      })
    } catch (err) {
      console.error('File upload error:', err)
      window.$message?.error('图片上传失败')
    }
  }
}

// Handle URL submit | 处理 URL 提交
const handleUrlSubmit = () => {
  const url = urlInput.value.trim()
  if (!url) return
  
  // Validate URL format | 验证 URL 格式
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    window.$message?.warning('请输入有效的图片地址 (http:// 或 https://)')
    return
  }
  
  // Show loading state | 显示加载状态
  urlLoading.value = true
  
  // Preload image to check validity | 预加载图片检查有效性
  const img = new Image()
  img.onload = () => {
    // Update node with URL | 更新节点 URL
    updateNode(props.id, {
      url: url,
      label: '网络图片',
      updatedAt: Date.now()
    })
    urlInput.value = ''
    urlLoading.value = false
  }
  img.onerror = () => {
    window.$message?.error('图片加载失败，请检查地址是否正确')
    urlLoading.value = false
  }
  img.src = url
}



// Handle replace file upload | 处理替换文件上传
const handleReplaceFileUpload = async (event) => {
  const file = event.target.files[0]
  if (file) {
    try {
      const base64 = await fileToBase64(file)
      updateNode(props.id, {
        url: base64,
        base64: base64,
        fileName: file.name,
        fileType: file.type,
        label: '参考图',
        updatedAt: Date.now()
      })
      showReplaceModal.value = false
      replaceUrlInput.value = ''
      window.$message?.success('图片已替换')
    } catch (err) {
      console.error('File upload error:', err)
      window.$message?.error('图片上传失败')
    }
  }
}

// Handle replace URL submit | 处理替换 URL 提交
const handleReplaceUrlSubmit = () => {
  const url = replaceUrlInput.value.trim()
  if (!url) return

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    window.$message?.warning('请输入有效的图片地址 (http:// 或 https://)')
    return
  }

  const img = new Image()
  img.onload = () => {
    updateNode(props.id, {
      url: url,
      label: '网络图片',
      updatedAt: Date.now()
    })
    showReplaceModal.value = false
    replaceUrlInput.value = ''
    window.$message?.success('图片已替换')
  }
  img.onerror = () => {
    window.$message?.error('图片加载失败，请检查地址是否正确')
  }
  img.src = url
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || '图像生成结果'
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
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

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) {
    // Clear selection and select the new node | 清除选中并选中新节点
    updateNode(props.id, { selected: false })
    updateNode(newId, { selected: true })
    window.$message?.success('节点已复制')
    setTimeout(() => {
      updateNodeInternals(newId)
    }, 50)
  }
}

// Handle image generation | 处理图片生图（图生图）
const handleImageGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create text node for prompt | 创建文本节点用于提示词
  const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
    content: '',
    label: '提示词'
  })

  // Create ImageNode for editing | 创建图片编辑节点
  const imageNodeId = addNode('image', { x: nodeX + 600, y: nodeY }, {
    url: props.data.url,  // Pass the current image as input
    label: '图生图',
    refImage: props.data.url  // Mark as reference image
  })

  // Create imageConfig node for generation | 创建生图配置节点
  const configNodeId = addNode('imageConfig', { x: nodeX + 900, y: nodeY }, {
    model: 'doubao-seedream-4-5-251128',
    size: '2048x2048',
    label: '生图配置'
  })

  // Connect image node to new image node | 连接当前图片节点到新图片节点
  addEdge({
    source: props.id,
    target: imageNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Connect new image node to config node | 连接新图片节点到配置节点
  addEdge({
    source: imageNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Connect text node to config node | 连接文本节点到配置节点
  addEdge({
    source: textNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals([textNodeId, imageNodeId, configNodeId])
  }, 50)

  window.$message?.success('已创建图生图工作流')
}

// Preview state | 预览状态
const showRef = ref(false)

// Handle preview | 处理预览
const handlePreview = () => {
  if (props.data.url) {
    showRef.value = true
  }
}

// Handle download | 处理下载
const handleDownload = () => {
  if (props.data.url) {
    const link = document.createElement('a')
    link.href = props.data.url
    link.download = props.data.fileName || `image_${Date.now()}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.$message?.success('图片下载中...')
  }
}

// Handle video generation | 处理视频生成
const handleVideoGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create text node for prompt | 创建文本节点用于提示词
  const textNodeId = addNode('text', { x: nodeX + 300, y: nodeY - 100 }, {
    content: '',
    label: '提示词'
  })

  // Create videoConfig node | 创建视频配置节点
  const configNodeId = addNode('videoConfig', { x: nodeX + 600, y: nodeY }, {
    label: '视频生成'
  })

  // Connect image node to config node with role | 连接图片节点到配置节点并设置角色
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left',
    type: 'imageRole',
    data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
  })

  // Connect text node to config node | 连接文本节点到配置节点
  addEdge({
    source: textNodeId,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals([textNodeId, configNodeId])
  }, 50)
}
</script>

<style scoped>
.image-node-wrapper {
  position: relative;
  padding-right: 50px;
  padding-top: 20px;
}

.image-node {
  cursor: default;
  position: relative;
}

/* Slider styling | 滑块样式 */
.slider-purple::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.slider-purple::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #8b5cf6;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Inpaint mode cursor | 涂抹模式光标 */
.cursor-none {
  cursor: none;
}
</style>
