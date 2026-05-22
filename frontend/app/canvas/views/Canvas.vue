<template>
  <!-- Canvas page | 画布页面 -->
  <div class="canvas-scope canvas-page h-full w-full flex flex-col">
    <!-- Header | 顶部导航 -->
    <AppHeader
      class="canvas-header canvas-compact-header"
      compact
      :show-github="false"
      :show-theme-toggle="false"
    >
      <template #left>
        <button 
          @click="goBack"
          class="p-1 canvas-icon-btn rounded-md transition-colors"
        >
          <n-icon :size="16"><ChevronBackOutline /></n-icon>
        </button>
        <n-dropdown :options="projectOptions" @select="handleProjectAction">
          <button class="flex items-center gap-1 canvas-icon-btn px-1.5 py-1 rounded-md transition-colors text-sm">
            <span class="font-medium canvas-text-primary">{{ projectName }}</span>
            <n-icon class="canvas-text-secondary" :size="13"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </template>
      <template #right>
        <button
          @click="handleManualSave"
          class="canvas-save-button"
          :class="{ 'is-saving': saveStatus === 'saving', 'is-error': saveStatus === 'error' }"
          :disabled="saveStatus === 'saving'"
          :title="saveButtonTitle"
        >
          <n-spin v-if="saveStatus === 'saving'" :size="12" />
          <n-icon v-else :size="14">
            <CheckmarkCircleOutline v-if="saveStatus === 'saved'" />
            <CloudUploadOutline v-else />
          </n-icon>
          <span>{{ saveStatusText }}</span>
        </button>
        <button 
          @click="showDownloadModal = true"
          class="p-1 canvas-icon-btn rounded-md transition-colors"
          :class="{ 'text-[var(--accent-color)]': hasDownloadableAssets }"
          title="批量下载素材"
        >
          <n-icon :size="16"><DownloadOutline /></n-icon>
        </button>
      </template>
    </AppHeader>

    <!-- Main canvas area | 主画布区域 -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Vue Flow canvas | Vue Flow 画布 -->
      <div
        v-if="isProjectLoading"
        class="absolute inset-0 z-40 flex items-center justify-center bg-[var(--bg-primary)]"
      >
        <div class="canvas-card rounded-xl px-5 py-4 flex items-center gap-3">
          <n-spin :size="18" />
          <span class="text-sm canvas-text-secondary">项目加载中</span>
        </div>
      </div>

      <VueFlow
        v-else
        :key="flowKey"
        v-model:nodes="nodes"
        v-model:edges="edges"
        v-model:viewport="viewport"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-viewport="canvasViewport"
        :min-zoom="0.1"
        :max-zoom="2"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        :zoom-on-scroll="false"
        :pan-on-scroll="true"
        :pan-on-scroll-speed="0.9"
        pan-on-scroll-mode="free"
        :zoom-on-pinch="true"
        :pan-on-drag="true"
        @connect="onConnect"
        @node-click="onNodeClick"
        @node-context-menu="onNodeContextMenu"
        @pane-click="onPaneClick"
        @viewport-change="handleViewportChange"
        @edges-change="onEdgesChange"
        class="canvas-flow"
      >
        <Background v-if="showGrid" :gap="20" :size="1" />
        <MiniMap 
          v-if="!isMobile"
          position="bottom-right"
          :pannable="true"
          :zoomable="true"
          @click="handleMiniMapClick"
          @node-click="handleMiniMapNodeClick"
        />
      </VueFlow>

      <!-- Node context menu | 节点右键菜单 -->
      <div
        v-if="nodeContextMenu.visible"
        class="node-context-menu"
        :style="{ left: `${nodeContextMenu.x}px`, top: `${nodeContextMenu.y}px` }"
        @click.stop
        @pointerdown.stop
        @contextmenu.prevent
      >
        <button class="node-context-menu-item" @click="handleNodeContextAction('duplicate')">
          <n-icon :size="16"><CopyOutline /></n-icon>
          <span>复制</span>
        </button>
        <button class="node-context-menu-item danger" @click="handleNodeContextAction('delete')">
          <n-icon :size="16"><TrashOutline /></n-icon>
          <span>删除</span>
        </button>
      </div>

      <!-- Left toolbar | 左侧工具栏 -->
      <aside class="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 canvas-panel rounded-xl z-10">
        <button 
          @click="showNodeMenu = !showNodeMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl canvas-btn-accent text-white transition-colors"
          title="添加节点"
        >
          <n-icon :size="20"><AddOutline /></n-icon>
        </button>
        <div class="w-full h-px canvas-divider my-1"></div>
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          @click="tool.action"
          :disabled="tool.disabled && tool.disabled()"
          class="w-10 h-10 flex items-center justify-center rounded-lg canvas-icon-btn transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :title="tool.name"
        >
          <n-icon :size="20"><component :is="tool.icon" /></n-icon>
        </button>
      </aside>

      <!-- Node menu popup | 节点菜单弹窗 -->
      <div 
        v-if="showNodeMenu"
        class="absolute left-20 top-1/2 -translate-y-1/2 canvas-panel rounded-xl p-2 z-20"
      >
        <button 
          v-for="nodeType in nodeTypeOptions" 
          :key="nodeType.type"
          @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg canvas-icon-btn transition-colors text-left"
        >
          <n-icon :size="20" :color="nodeType.color"><component :is="nodeType.icon" /></n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>

      <!-- Bottom controls | 底部控制 -->
      <div class="absolute bottom-4 left-4 flex items-center gap-2 canvas-panel rounded-lg p-1">
        <!-- <button 
          @click="showGrid = !showGrid" 
          :class="showGrid ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-tertiary)]'"
          class="p-2 rounded transition-colors"
          title="切换网格"
        >
          <n-icon :size="16"><GridOutline /></n-icon>
        </button> -->
        <button 
          @click="fitView({ padding: 0.2 })" 
          class="p-2 canvas-icon-btn rounded transition-colors"
          title="适应视图"
        >
          <n-icon :size="16"><LocateOutline /></n-icon>
        </button>
        <div class="flex items-center gap-1 px-2">
          <button @click="zoomOut" class="p-1 canvas-icon-btn rounded transition-colors">
            <n-icon :size="14"><RemoveOutline /></n-icon>
          </button>
          <span class="text-xs min-w-[40px] text-center canvas-text-secondary">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button @click="zoomIn" class="p-1 canvas-icon-btn rounded transition-colors">
            <n-icon :size="14"><AddOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Bottom input panel (floating) | 底部输入面板（悬浮） -->
      <div class="absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <!-- Processing indicator | 处理中指示器 -->
        <div 
          v-if="isProcessing" 
          class="mb-3 p-3 canvas-card rounded-xl border border-[var(--accent-color)] animate-pulse"
        >
          <div class="flex items-center gap-2 text-sm text-[var(--accent-color)] mb-2">
            <n-spin :size="14" />
            <span>正在生成提示词...</span>
          </div>
          <div v-if="currentResponse" class="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {{ currentResponse }}
          </div>
        </div>

        <div class="canvas-card rounded-xl p-3">
          <textarea
            v-model="chatInput"
            :placeholder="inputPlaceholder"
            :disabled="isProcessing"
            class="w-full bg-transparent resize-none outline-none canvas-text-primary placeholder:canvas-text-tertiary min-h-[40px] max-h-[120px] disabled:opacity-50"
            rows="1"
            @keydown.enter.exact="handleEnterKey"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-2">
              <button 
                @click="handlePolish"
                :disabled="isProcessing || !chatInput.trim()"
                class="px-3 py-1.5 text-xs rounded-lg canvas-btn-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="AI 润色提示词"
              >
                ✨ AI 润色
              </button>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm canvas-text-secondary">
                <n-switch v-model:value="autoExecute" size="small" />
                自动执行
              </label>
              <button 
                @click="sendMessage"
                :disabled="isProcessing"
                class="w-8 h-8 rounded-xl canvas-btn-accent flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <n-spin v-if="isProcessing" :size="16" />
                <n-icon v-else :size="20" color="white"><SendOutline /></n-icon>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Quick suggestions | 快捷建议 -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span class="text-xs canvas-text-tertiary">推荐：</span>
          <button 
            v-for="tag in suggestions" 
            :key="tag"
            @click="chatInput = tag"
            class="px-2 py-0.5 text-xs rounded-full canvas-tag transition-colors"
          >
            {{ tag }}
          </button>
          <button class="p-1 canvas-icon-btn rounded-lg transition-colors">
            <n-icon :size="14"><RefreshOutline /></n-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Rename Modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal | 删除确认弹窗 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除项目" type="warning">
      <p>确定要删除项目「{{ projectName }}」吗？此操作不可恢复。</p>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" @click="confirmDelete">删除</n-button>
      </template>
    </n-modal>

    <!-- Download Modal | 下载弹窗 -->
    <DownloadModal v-model:show="showDownloadModal" />

    <!-- Workflow Panel | 工作流面板 -->
    <WorkflowPanel v-model:show="showWorkflowPanel" @add-workflow="handleAddWorkflow" />
  </div>
</template>

<script setup>
/**
 * Canvas view component | 画布视图组件
 * Main infinite canvas with Vue Flow integration
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { NIcon, NSwitch, NDropdown, NSpin, NModal, NInput, NButton } from 'naive-ui'
import { 
  ChevronBackOutline,
  ChevronDownOutline,
  AddOutline,
  ImageOutline,
  SendOutline,
  RefreshOutline,
  TextOutline,
  VideocamOutline,
  ColorPaletteOutline,
  GridOutline,
  LocateOutline,
  RemoveOutline,
  DownloadOutline,
  AppsOutline,
  ChatbubbleOutline,
  CopyOutline,
  TrashOutline,
  CheckmarkCircleOutline,
  CloudUploadOutline
} from '@vicons/ionicons5'
import { nodes, edges, addNode, addNodes, addEdge, addEdges, updateNode, removeNode, duplicateNode, applyProjectCanvas, flushProjectSave, canvasViewport, updateViewport, manualSaveHistory, startBatchOperation, endBatchOperation, saveStatus, lastSavedAt } from '../stores/canvas'
import { useChat, useWorkflowOrchestrator } from '../hooks'
import { projects, initProjectsStore, renameProject, deleteProject, loadProjectById as fetchProjectById } from '../stores/projects'
import {
  findModelOption,
  modelOptionKey,
  modelPayload,
  useUserModelOptions
} from '../utils/modelOptions'

import DownloadModal from '../components/DownloadModal.vue'
import WorkflowPanel from '../components/WorkflowPanel.vue'
import AppHeader from '../components/AppHeader.vue'

// Chat templates | 问答模板
const CHAT_TEMPLATES = {
  imagePrompt: {
    name: '生图提示词',
    systemPrompt: '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、構图、细节等要素。直接返回提示词，不要其他解释。'
  },
  videoPrompt: {
    name: '视频提示词',
    systemPrompt: '你是一个专业的AI视频提示词专家。将用户输入的内容美化成高质量的视频生成提示词，包含运动、场景、镜头等要素。直接返回提示词，不要其他解释。'
  }
}

// Current template | 当前模板
const currentTemplate = ref('imagePrompt')
const { textModels, loadModels } = useUserModelOptions()
const selectedTextModel = ref('')
const selectedTextModelConfig = computed(() => findModelOption(textModels.value, selectedTextModel.value))
const isTextModelConfigured = computed(() => textModels.value.length > 0 && Boolean(selectedTextModelConfig.value))

const ensureSelectedTextModel = () => {
  const preferred = textModels.value.find(item => item.is_default) || textModels.value[0]
  const matched = findModelOption(textModels.value, selectedTextModel.value)
  selectedTextModel.value = matched ? modelOptionKey(matched) : (preferred ? modelOptionKey(preferred) : '')
}

onMounted(async () => {
  try {
    await loadModels()
    ensureSelectedTextModel()
  } catch (err) {
    window.$message?.error(err.message || '模型加载失败')
  }
})

// Chat hook with image prompt template | 问答 hook
const { 
  loading: chatLoading, 
  status: chatStatus, 
  currentResponse, 
  send: sendChat 
} = useChat({
  systemPrompt: CHAT_TEMPLATES.imagePrompt.systemPrompt,
  get model() { return modelPayload(selectedTextModelConfig.value, selectedTextModel.value).model },
  get model_config_id() { return modelPayload(selectedTextModelConfig.value, selectedTextModel.value).model_config_id },
  get user_provider_id() { return modelPayload(selectedTextModelConfig.value, selectedTextModel.value).user_provider_id },
  get provider() { return modelPayload(selectedTextModelConfig.value, selectedTextModel.value).provider }
})

// Workflow orchestrator hook | 工作流编排 hook
const {
  isAnalyzing: workflowAnalyzing,
  isExecuting: workflowExecuting,
  currentStep: workflowStep,
  totalSteps: workflowTotalSteps,
  executionLog: workflowLog,
  analyzeIntent,
  executeWorkflow,
  createTextToImageWorkflow,
  createMultiAngleStoryboard,
  WORKFLOW_TYPES
} = useWorkflowOrchestrator()

// Custom node components | 自定义节点组件
import TextNode from '../components/nodes/TextNode.vue'
import ImageConfigNode from '../components/nodes/ImageConfigNode.vue'
import VideoNode from '../components/nodes/VideoNode.vue'
import ImageNode from '../components/nodes/ImageNode.vue'
import VideoConfigNode from '../components/nodes/VideoConfigNode.vue'
import LLMConfigNode from '../components/nodes/LLMConfigNode.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ImageOrderEdge from '../components/edges/ImageOrderEdge.vue'

const router = useRouter()
const route = useRoute()

const routeProjectId = computed(() => String(route.params.id || route.query.projectId || '').trim())
const canvasProjectUrl = (id) => `/canvas/${encodeURIComponent(id)}`

// Vue Flow instance | Vue Flow 实例
const { viewport, zoomIn, zoomOut, fitView, updateNodeInternals, setNodes, setEdges, setViewport, setCenter } = useVueFlow()

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  text: markRaw(TextNode),
  imageConfig: markRaw(ImageConfigNode),
  video: markRaw(VideoNode),
  image: markRaw(ImageNode),
  videoConfig: markRaw(VideoConfigNode),
  llmConfig: markRaw(LLMConfigNode)
}

// Register custom edge types | 注册自定义边类型
const edgeTypes = {
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge),
  imageOrder: markRaw(ImageOrderEdge)
}

// UI state | UI状态
const showNodeMenu = ref(false)
const chatInput = ref('')
const autoExecute = ref(false)
const isMobile = ref(false)
const showGrid = ref(true)
const isProcessing = ref(false)
const isProjectLoading = ref(true)

// Flow key for forcing re-render on project switch | 项目切换时强制重新渲染的 key
const flowKey = ref(Date.now())
let projectLoadSeq = 0

// Modal state | 弹窗状态
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showWorkflowPanel = ref(false)
const renameValue = ref('')
const nodeContextMenu = ref({
  visible: false,
  x: 0,
  y: 0,
  nodeId: null
})

// Check if has downloadable assets | 检查是否有可下载素材
const hasDownloadableAssets = computed(() => {
  return nodes.value.some(n => 
    (n.type === 'image' || n.type === 'video') && n.data?.url
  )
})

const saveStatusText = computed(() => {
  switch (saveStatus.value) {
    case 'saving':
      return '保存中'
    case 'pending':
      return '待保存'
    case 'error':
      return '保存失败'
    case 'saved':
    default:
      return '已保存'
  }
})

const saveButtonTitle = computed(() => {
  if (saveStatus.value === 'saved' && lastSavedAt.value) {
    return `已保存 ${lastSavedAt.value.toLocaleTimeString()}`
  }
  return saveStatusText.value
})

// Project info | 项目信息
const projectName = computed(() => {
  const project = projects.value.find(p => p.id === routeProjectId.value)
  return project?.name || '未命名项目'
})

// Project dropdown options | 项目下拉选项
const projectOptions = [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'duplicate' },
  { label: '删除', key: 'delete' }
]

// Toolbar tools | 工具栏工具
const tools = [
  { id: 'text', name: '文本', icon: TextOutline, action: () => addNewNode('text') },
  { id: 'image', name: '图片', icon: ImageOutline, action: () => addNewNode('image') },
  { id: 'imageConfig', name: '文生图', icon: ColorPaletteOutline, action: () => addNewNode('imageConfig') },
  { id: 'workflow', name: '工作流模板', icon: AppsOutline, action: () => { showWorkflowPanel.value = true } }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'llmConfig', name: 'LLM文本生成', icon: ChatbubbleOutline, color: '#a855f7' },
  { type: 'imageConfig', name: '文生图配置', icon: ColorPaletteOutline, color: '#22c55e' },
  { type: 'videoConfig', name: '视频生成配置', icon: VideocamOutline, color: '#f59e0b' },
  { type: 'image', name: '图片节点', icon: ImageOutline, color: '#8b5cf6' },
  { type: 'video', name: '视频节点', icon: VideocamOutline, color: '#ef4444' }
]

// Input placeholder | 输入占位符
const inputPlaceholder = '你可以试着说"帮我生成一个二次元的卡通角色"'

// Quick suggestions | 快捷建议
const suggestions = [
  '像个魔法森林',
  '三只不同的小猫',
  '生成多角度分镜',
  '夏日田野环绕漫步'
]

// Add new node | 添加新节点
const addNewNode = async (type) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom
  
  // Add node at viewport center | 在视口中心添加节点
  const nodeId = addNode(type, { x: viewportCenterX - 100, y: viewportCenterY - 100 })
  
  // Set highest z-index | 设置最高层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  updateNode(nodeId, { zIndex: maxZIndex + 1 })
  
  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(nodeId)
  }, 50)
  
  showNodeMenu.value = false
}

// Handle add workflow from panel | 处理从面板添加工作流
const handleAddWorkflow = ({ workflow, options }) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom

  // Create nodes from workflow template | 从工作流模板创建节点
  const startPosition = { x: viewportCenterX - 300, y: viewportCenterY - 200 }
  const { nodes: newNodes, edges: newEdges } = workflow.createNodes(startPosition, options)

  // Start batch operation manually | 手动开始批量操作
  startBatchOperation()

  // Add nodes to canvas in batch | 批量将节点添加到画布
  const nodeSpecs = newNodes.map(node => ({
    type: node.type,
    position: node.position,
    data: node.data
  }))
  const nodeIds = addNodes(nodeSpecs, false)

  // Map old node IDs to new IDs | 映射旧节点ID到新ID
  const idMap = {}
  newNodes.forEach((node, index) => {
    idMap[node.id] = nodeIds[index]
  })

  // Add edges to canvas in batch | 批量将边添加到画布
  const edgeSpecs = newEdges.map(edge => ({
    source: idMap[edge.source] || edge.source,
    target: idMap[edge.target] || edge.target,
    sourceHandle: edge.sourceHandle || 'right',
    targetHandle: edge.targetHandle || 'left',
    type: edge.type,
    data: edge.data
  }))

  // Add edges (autoBatch=false to use manual batch) | 添加边（autoBatch=false 以使用手动批量）
  addEdges(edgeSpecs, false)

  // End batch operation and save to history | 结束批量操作并保存到历史
  endBatchOperation()

  // Delay node internals update | 延迟节点内部更新
  setTimeout(() => {
    // Update node internals | 更新节点内部
    nodeIds.forEach(nodeId => {
      updateNodeInternals(nodeId)
    })
  }, 100)

  window.$message?.success(`已添加工作流: ${workflow.name}`)
}

// Handle connection | 处理连接
const onConnect = (params) => {
  // Check connection types | 检查连接类型
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)
  
  if (sourceNode?.type === 'image' && targetNode?.type === 'videoConfig') {
    // Use imageRole edge type | 使用图片角色边类型
    addEdge({
      ...params,
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
    })
  } else if (sourceNode?.type === 'text' && targetNode?.type === 'imageConfig') {
    // Use promptOrder edge type | 使用提示词顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingTextEdges = edges.value.filter(e => 
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1
    
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'image' && targetNode?.type === 'imageConfig') {
    // Use imageOrder edge type | 使用图片顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingImageEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'imageOrder'
    )

    // Get @ mentioned image count from connected TextNodes | 获取已连接 TextNode 中 @ 提及的图片数量
    let mentionedImageCount = 0
    const connectedTextEdges = edges.value.filter(e => e.target === params.target)
    for (const edge of connectedTextEdges) {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      if (sourceNode?.type === 'text') {
        const content = sourceNode.data?.content || ''
        // Count @ mentions of image nodes | 统计图片节点的 @ 提及
        const mentionRegex = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
        let match
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedNode = nodes.value.find(n => n.id === match[1])
          if (mentionedNode?.type === 'image') {
            mentionedImageCount++
          }
        }
      }
    }

    // Next order = existing edges + mentioned image count + 1 | 下一个序号 = 现有边数 + @提及图片数 + 1
    const nextOrder = existingImageEdges.length + mentionedImageCount + 1

    addEdge({
      ...params,
      type: 'imageOrder',
      data: { imageOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'imageConfig') {
    // LLM output as prompt for image generation | LLM 输出作为图片生成提示词
    const existingTextEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'promptOrder'
    )
    const nextOrder = existingTextEdges.length + 1

    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: nextOrder }
    })
  } else if (sourceNode?.type === 'llmConfig' && targetNode?.type === 'videoConfig') {
    // LLM output as prompt for video generation | LLM 输出作为视频生成提示词
    addEdge({
      ...params,
      type: 'promptOrder',
      data: { promptOrder: 1 }
    })
  } else {
    addEdge(params)
  }
}
const onNodeClick = (event) => {
  hideNodeContextMenu()
  // nodes.value.forEach(node => {
  //   updateNode(node.id, { selected: false })
  // })
  
  // // Select clicked node | 选中的节点
  // const clickedNode = nodes.value.find(n => n.id === event.node.id)
  // if (clickedNode) {
  //   updateNode(event.node.id, { selected: true })
  // }
}

// Handle node right-click menu | 处理节点右键菜单
const onNodeContextMenu = ({ event, node }) => {
  event.preventDefault()
  event.stopPropagation()
  showNodeMenu.value = false

  const menuWidth = 132
  const menuHeight = 88
  const padding = 12
  const x = Math.min(event.clientX, window.innerWidth - menuWidth - padding)
  const y = Math.min(event.clientY, window.innerHeight - menuHeight - padding)

  nodeContextMenu.value = {
    visible: true,
    x: Math.max(padding, x),
    y: Math.max(padding, y),
    nodeId: node.id
  }
}

const hideNodeContextMenu = () => {
  nodeContextMenu.value.visible = false
}

const handleNodeContextAction = (key) => {
  const nodeId = nodeContextMenu.value.nodeId
  if (!nodeId) return

  switch (key) {
    case 'duplicate': {
      const newNodeId = duplicateNode(nodeId)
      if (newNodeId) {
        setTimeout(() => updateNodeInternals(newNodeId), 50)
        window.$message?.success('节点已复制')
      }
      break
    }
    case 'delete':
      removeNode(nodeId)
      window.$message?.success('节点已删除')
      break
  }

  hideNodeContextMenu()
}

// Handle viewport change | 处理视口变化
const handleViewportChange = (newViewport) => {
  hideNodeContextMenu()
  updateViewport(newViewport)
}

const focusCanvasPoint = (x, y) => {
  hideNodeContextMenu()
  setCenter(x, y, {
    zoom: viewport.value.zoom,
    duration: 180
  })
}

const handleMiniMapClick = ({ position }) => {
  focusCanvasPoint(position.x, position.y)
}

const handleMiniMapNodeClick = ({ node }) => {
  const width = node.dimensions?.width || node.width || 0
  const height = node.dimensions?.height || node.height || 0
  focusCanvasPoint(node.position.x + width / 2, node.position.y + height / 2)
}

// Handle edges change | 处理边变化
const onEdgesChange = (changes) => {
  // Check if any edge is being removed | 检查是否有边被删除
  const hasRemoval = changes.some(change => change.type === 'remove')
  
  if (hasRemoval) {
    // Trigger history save after edge removal | 边删除后触发历史保存
    nextTick(() => {
      manualSaveHistory()
    })
  }
}

// Handle pane click | 处理画布点击
const onPaneClick = () => {
  showNodeMenu.value = false
  hideNodeContextMenu()
  // Clear all selections | 清除所有选中
  // nodes.value = nodes.value.map(node => ({
  //   ...node,
  //   selected: false
  // }))
}

// Handle project action | 处理项目操作
const handleProjectAction = (key) => {
  switch (key) {
    case 'rename':
      renameValue.value = projectName.value
      showRenameModal.value = true
      break
    case 'duplicate':
      // TODO: Implement duplicate
      window.$message?.info('复制功能开发中')
      break
    case 'delete':
      showDeleteModal.value = true
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = async () => {
  const projectId = routeProjectId.value
  if (renameValue.value.trim()) {
    await renameProject(projectId, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
}

// Confirm delete | 确认删除
const confirmDelete = async () => {
  const projectId = routeProjectId.value
  await deleteProject(projectId)
  showDeleteModal.value = false
  window.$message?.success('项目已删除')
  router.push('/canvas')
}

const handleManualSave = async () => {
  try {
    await flushProjectSave()
    window.$message?.success('画布已保存')
  } catch (err) {
    window.$message?.error(err.message || '保存失败')
  }
}

// Handle Enter key | 处理回车键
const handleEnterKey = (e) => {
  e.preventDefault()
  sendMessage()
}

// Handle AI polish | 处理 AI 润色
const handlePolish = async () => {
  const input = chatInput.value.trim()
  if (!input) return
  
  if (!isTextModelConfigured.value) {
    window.$message?.warning('暂无可用文本模型，请联系管理员配置平台模型')
    return
  }

  isProcessing.value = true
  const originalInput = chatInput.value

  try {
    // Call chat API to polish the prompt | 调用 AI 润色提示词
    const result = await sendChat(input, true)
    
    if (result) {
      chatInput.value = result
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    chatInput.value = originalInput
    window.$message?.error(err.message || '润色失败')
  } finally {
    isProcessing.value = false
  }
}

// Send message | 发送消息
const sendMessage = async () => {
  const input = chatInput.value.trim()
  if (!input) return

  if (!isTextModelConfigured.value) {
    window.$message?.warning('暂无可用文本模型，请联系管理员配置平台模型')
    return
  }

  isProcessing.value = true
  const content = chatInput.value
  chatInput.value = ''

  try {
    // Calculate position to avoid overlap | 计算位置避免重叠
    let maxY = 0
    if (nodes.value.length > 0) {
      maxY = Math.max(...nodes.value.map(n => n.position.y))
    }
    const baseX = 100
    const baseY = maxY + 200

    if (autoExecute.value) {
      // Auto-execute mode: analyze intent and execute workflow | 自动执行模式：分析意图并执行工作流
      window.$message?.info('正在分析工作流...')
      
      try {
        // Analyze user intent | 分析用户意图
        const result = await analyzeIntent(content)
        
        // Ensure we have valid workflow params | 确保有效的工作流参数
        const workflowParams = {
          workflow_type: result?.workflow_type || WORKFLOW_TYPES.TEXT_TO_IMAGE,
          image_prompt: result?.image_prompt || content,
          video_prompt: result?.video_prompt || content,
          character: result?.character,
          shots: result?.shots
        }
        
        window.$message?.info(`执行工作流: ${result?.description || '文生图'}`)
        
        // Execute the workflow | 执行工作流
        await executeWorkflow(workflowParams, { x: baseX, y: baseY })
        
        window.$message?.success('工作流已启动')
      } catch (err) {
        console.error('Workflow error:', err)
        // Fallback to simple text-to-image | 回退到文生图
        window.$message?.warning('使用默认文生图工作流')
        await createTextToImageWorkflow(content, { x: baseX, y: baseY })
      }
    } else {
      // Manual mode: just create nodes | 手动模式：仅创建节点
      const textNodeId = addNode('text', { x: baseX, y: baseY }, { 
        content: content, 
        label: '提示词' 
      })
      
      const imageConfigNodeId = addNode('imageConfig', { x: baseX + 400, y: baseY }, {
        label: '文生图'
      })
      
      addEdge({
        source: textNodeId,
        target: imageConfigNodeId,
        sourceHandle: 'right',
        targetHandle: 'left'
      })
    }
  } catch (err) {
    window.$message?.error(err.message || '创建失败')
  } finally {
    isProcessing.value = false
  }
}

// Go back to home | 返回首页
const goBack = () => {
  router.push('/')
}

// Check if mobile | 检测是否移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

const handleWindowPointerDown = () => {
  hideNodeContextMenu()
}

const handlePageBeforeUnload = () => {
  flushProjectSave().catch(err => console.error('Failed to flush canvas before unload:', err))
}

const handleVisibilityChange = () => {
  if (document.visibilityState === 'hidden') {
    flushProjectSave().catch(err => console.error('Failed to flush canvas on hide:', err))
  }
}

const syncVueFlowState = async () => {
  await nextTick()
  setNodes(nodes.value.map(node => ({ ...node })))
  setEdges(edges.value.map(edge => ({ ...edge })))
  await nextTick()
  setViewport({ ...canvasViewport.value })
  nodes.value.forEach(node => {
    updateNodeInternals(node.id)
  })
}

// Load project by ID | 根据ID加载项目
const loadProjectById = async (projectId) => {
  const loadSeq = projectLoadSeq + 1
  projectLoadSeq = loadSeq
  isProjectLoading.value = true
  
  if (projectId && projectId !== 'new') {
    if (route.query.projectId && route.path === '/canvas') {
      router.replace(canvasProjectUrl(projectId))
      return
    }
    const localProject = projects.value.find(project => project.id === projectId) || null
    let project = localProject
    try {
      project = await fetchProjectById(projectId)
    } catch (err) {
      if (!localProject) {
        window.$message?.error(err.message || '打开项目失败')
        router.replace('/canvas')
        isProjectLoading.value = false
        return
      }
      console.warn('Failed to refresh canvas project, using local project data:', err)
    }
    if (projectLoadSeq !== loadSeq) return
    if (!project?.id) {
      window.$message?.error('项目不存在')
      router.replace('/canvas')
      isProjectLoading.value = false
      return
    }
    applyProjectCanvas(project.id, project.canvasData)
  } else {
    router.replace('/canvas')
    isProjectLoading.value = false
    return
  }

  flowKey.value = Date.now()
  await syncVueFlowState()
  if (projectLoadSeq === loadSeq) {
    isProjectLoading.value = false
  }
}

// Watch for route changes | 监听路由变化
watch(
  () => routeProjectId.value,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Save current project before switching | 切换前保存当前项目
      if (oldId) {
        await flushProjectSave()
      }
      // Load new project | 加载新项目
      await loadProjectById(newId)
    }
  }
)

// Initialize | 初始化
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('pointerdown', handleWindowPointerDown)
  window.addEventListener('beforeunload', handlePageBeforeUnload)
  document.addEventListener('visibilitychange', handleVisibilityChange)
  
  // Initialize projects store | 初始化项目存储
  await initProjectsStore()
  
  // Load project data | 加载项目数据
  await loadProjectById(routeProjectId.value)
  
  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('ai-canvas-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('ai-canvas-initial-prompt')
    chatInput.value = initialPrompt
    // Auto-send the message | 自动发送消息
    nextTick(() => {
      sendMessage()
    })
  }
})

// Cleanup on unmount | 卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('pointerdown', handleWindowPointerDown)
  window.removeEventListener('beforeunload', handlePageBeforeUnload)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  // Save project before leaving | 离开前保存项目
  flushProjectSave().catch(err => console.error('Failed to flush canvas on unmount:', err))
})
</script>

<style>
.canvas-flow {
  width: 100%;
  height: 100%;
}

.canvas-save-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 28px;
  padding: 0 9px;
  border-radius: 6px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.canvas-save-button:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.canvas-save-button.is-saving {
  color: var(--accent-color);
}

.canvas-save-button.is-error {
  color: #ef4444;
}

.node-context-menu {
  position: fixed;
  z-index: 50;
  min-width: 128px;
  padding: 6px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-secondary);
  box-shadow: 0 18px 42px rgb(0 0 0 / 28%);
}

.node-context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.node-context-menu-item:hover {
  background: var(--bg-tertiary);
}

.node-context-menu-item.danger {
  color: #ef4444;
}

.node-context-menu-item.danger:hover {
  background: rgb(239 68 68 / 12%);
}
</style>
