/**
 * Canvas store | 画布状态管理
 * Manages nodes, edges and canvas state
 */
import { ref, watch } from 'vue'
import { updateProjectCanvas, getProjectCanvas } from './projects'
import { IMAGE_MODELS, VIDEO_MODELS, CHAT_MODELS, DEFAULT_IMAGE_MODEL, DEFAULT_VIDEO_MODEL, DEFAULT_CHAT_MODEL } from '../config/models'

// Node ID counter | 节点ID计数器
let nodeId = 0
const getNodeId = () => `node_${nodeId++}`

// Current project ID | 当前项目ID
export const currentProjectId = ref(null)

// Nodes and edges | 节点和边
export const nodes = ref([])
export const edges = ref([])

// Viewport state | 视口状态
export const canvasViewport = ref({ x: 100, y: 50, zoom: 0.8 })

// Selected node | 选中的节点
export const selectedNode = ref(null)

// Auto-save flag | 自动保存标志
let autoSaveEnabled = false
let saveTimeout = null

// History for undo/redo | 撤销/重做历史
const history = ref([])
const historyIndex = ref(-1)
const MAX_HISTORY = 50
let isRestoring = false

// Position change threshold for history | 位置变化阈值
const POSITION_THRESHOLD = 10

// Batch operation tracking | 批量操作跟踪
let isBatchOperation = false
let batchStartState = null

/**
 * Save current state to history | 保存当前状态到历史
 * @param {boolean} force - Force save even if batch operation | 强制保存，即使在批量操作中
 */
const saveToHistory = (force = false) => {
  if (isRestoring) return

  // If in batch operation and not forced, don't save | 如果在批量操作中且未强制保存，则不保存
  if (isBatchOperation && !force) return

  const state = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }

  // Remove future history if we're not at the end | 如果不在末尾，删除未来历史
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1)
  }

  // Add new state | 添加新状态
  history.value.push(state)

  // Limit history size | 限制历史大小
  if (history.value.length > MAX_HISTORY) {
    history.value.shift()
  } else {
    historyIndex.value++
  }
}

/**
 * Start batch operation | 开始批量操作
 * Records the starting state for batch operations
 */
export const startBatchOperation = () => {
  isBatchOperation = true
  batchStartState = {
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }
}

/**
 * End batch operation and save to history | 结束批量操作并保存到历史
 * Compares with start state to decide if save is needed
 */
export const endBatchOperation = () => {
  if (!isBatchOperation || !batchStartState) {
    isBatchOperation = false
    return
  }

  // Check if there are significant changes | 检查是否有显著变化
  const hasSignificantChanges = checkSignificantChanges(batchStartState, {
    nodes: nodes.value,
    edges: edges.value
  })

  if (hasSignificantChanges) {
    saveToHistory(true)
  }

  isBatchOperation = false
  batchStartState = null
}

/**
 * Check if changes are significant enough to save | 检查变化是否足够显著需要保存
 * @param {object} oldState - Previous state | 之前的状态
 * @param {object} newState - New state | 新状态
 * @returns {boolean} - Whether changes should be saved | 是否应该保存变化
 */
const checkSignificantChanges = (oldState, newState) => {
  const oldNodes = oldState.nodes || []
  const newNodes = newState.nodes || []

  // Check for added or removed nodes | 检查添加或删除的节点
  if (oldNodes.length !== newNodes.length) {
    return true
  }

  // Check for new nodes (by comparing IDs) | 检查新节点
  const oldNodeIds = new Set(oldNodes.map(n => n.id))
  const newNodeIds = new Set(newNodes.map(n => n.id))

  // Nodes added | 添加的节点
  for (const id of newNodeIds) {
    if (!oldNodeIds.has(id)) {
      return true
    }
  }

  // Nodes removed | 删除的节点
  for (const id of oldNodeIds) {
    if (!newNodeIds.has(id)) {
      return true
    }
  }

  // Check position changes for existing nodes | 检查现有节点的位置变化
  for (const newNode of newNodes) {
    const oldNode = oldNodes.find(n => n.id === newNode.id)
    if (oldNode) {
      const dx = Math.abs(newNode.position.x - oldNode.position.x)
      const dy = Math.abs(newNode.position.y - oldNode.position.y)

      // If any node moved beyond threshold, save | 如果任何节点移动超过阈值，则保存
      if (dx > POSITION_THRESHOLD || dy > POSITION_THRESHOLD) {
        return true
      }
    }
  }

  // Check for edge changes | 检查边的变化
  const oldEdges = oldState.edges || []
  const newEdges = newState.edges || []

  if (oldEdges.length !== newEdges.length) {
    return true
  }

  return false
}

// Add a new node | 添加新节点
export const addNode = (type, position = { x: 100, y: 100 }, data = {}) => {
  const id = getNodeId()
  const now = Date.now()
  const newNode = {
    id,
    type,
    position,
    data: {
      ...getDefaultNodeData(type),
      ...data,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now
    }
  }
  nodes.value = [...nodes.value, newNode]
  saveToHistory() // Save after adding node | 添加节点后保存
  return id
}

/**
 * Add multiple nodes in batch | 批量添加多个节点
 * Uses batch operation to group all node additions into one history entry
 * @param {Array} nodeSpecs - Array of node specs [{ type, position, data }, ...]
 * @param {boolean} autoBatch - Whether to auto-manage batch operation (default: true)
 * @returns {Array} - Array of created node IDs | 创建的节点ID数组
 */
export const addNodes = (nodeSpecs, autoBatch = true) => {
  if (!nodeSpecs || nodeSpecs.length === 0) return []

  // Start batch operation if auto | 如果自动管理则开始批量操作
  if (autoBatch) {
    startBatchOperation()
  }

  const ids = []
  const now = Date.now()

  nodeSpecs.forEach(spec => {
    const { type, position = { x: 100, y: 100 }, data = {} } = spec
    const id = getNodeId()
    const newNode = {
      id,
      type,
      position,
      data: {
        ...getDefaultNodeData(type),
        ...data,
        createdAt: data.createdAt || now,
        updatedAt: data.updatedAt || now
      }
    }
    nodes.value = [...nodes.value, newNode]
    ids.push(id)
  })

  // End batch operation if auto | 如果自动管理则结束批量操作并保存到历史
  if (autoBatch) {
    endBatchOperation()
  }

  return ids
}

// Get default data for node type | 获取节点类型的默认数据
const getDefaultNodeData = (type) => {
  switch (type) {
    case 'text':
      return {
        content: '',
        label: '文本输入',
        publicProps: {}  // 公共属性（可被 @ 引用）
      }
    case 'imageConfig': {
      const imageModel = IMAGE_MODELS.find(m => m.key === DEFAULT_IMAGE_MODEL) || IMAGE_MODELS[0]
      return {
        prompt: '',
        model: DEFAULT_IMAGE_MODEL,
        size: imageModel?.defaultParams?.size || '1x1',
        quality: imageModel?.defaultParams?.quality || 'standard',
        label: '文生图'
      }
    }
    case 'videoConfig': {
      const videoModel = VIDEO_MODELS.find(m => m.key === DEFAULT_VIDEO_MODEL) || VIDEO_MODELS[0]
      return {
        prompt: '',
        ratio: videoModel?.defaultParams?.ratio || '16:9',
        duration: videoModel?.defaultParams?.duration || 5,
        model: DEFAULT_VIDEO_MODEL,
        label: '图生视频'
      }
    }
    case 'video':
      return {
        url: '',
        duration: 0,
        label: '视频节点'
      }
    case 'image':
      return {
        url: '',
        label: '图片节点',
        publicProps: { name: '图片' }  // 公共属性（可被 @ 引用）
      }
    case 'llmConfig':
      return {
        systemPrompt: '',
        model: DEFAULT_CHAT_MODEL,
        outputFormat: 'text',
        outputContent: '',
        label: 'LLM文本生成',
        publicProps: {}  // 公共属性（可被 @ 引用）
      }
    default:
      return {}
  }
}

// Update node data | 更新节点数据
export const updateNode = (id, data) => {
  nodes.value = nodes.value.map(node => 
    node.id === id ? { ...node, data: { ...node.data, ...data } } : node
  )
}

// Remove node | 删除节点
export const removeNode = (id) => {
  nodes.value = nodes.value.filter(node => node.id !== id)
  edges.value = edges.value.filter(edge => edge.source !== id && edge.target !== id)
  saveToHistory() // Save after removing node | 删除节点后保存
}

// Duplicate node | 复制节点
export const duplicateNode = (id) => {
  const sourceNode = nodes.value.find(node => node.id === id)
  if (!sourceNode) return null
  
  const newId = getNodeId()
  
  // Calculate max z-index | 计算最大层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  
  const newNode = {
    id: newId,
    type: sourceNode.type,
    position: {
      x: sourceNode.position.x + 50,
      y: sourceNode.position.y + 50
    },
    data: { ...sourceNode.data },
    zIndex: maxZIndex + 1
  }
  nodes.value = [...nodes.value, newNode]
  saveToHistory() // Save after duplicating node | 复制节点后保存
  return newId
}

// Add edge | 添加边
export const addEdge = (params) => {
  const newEdge = {
    id: `edge_${params.source}_${params.target}`,
    ...params
  }
  edges.value = [...edges.value, newEdge]
  saveToHistory() // Save after adding edge | 添加连线后保存
}

/**
 * Add multiple edges in batch | 批量添加多条边
 * Uses batch operation to group all edge additions into one history entry
 * @param {Array} edgeSpecs - Array of edge specs [{ source, target, sourceHandle, targetHandle, type, data }, ...]
 * @param {boolean} autoBatch - Whether to auto-manage batch operation (default: true)
 * @returns {Array} - Array of created edge IDs | 创建的边ID数组
 */
export const addEdges = (edgeSpecs, autoBatch = true) => {
  if (!edgeSpecs || edgeSpecs.length === 0) return []

  // Start batch operation if auto | 如果自动管理则开始批量操作
  if (autoBatch) {
    startBatchOperation()
  }

  const ids = []

  edgeSpecs.forEach(params => {
    const newEdge = {
      id: `edge_${params.source}_${params.target}`,
      ...params
    }
    edges.value = [...edges.value, newEdge]
    ids.push(newEdge.id)
  })

  // End batch operation if auto | 如果自动管理则结束批量操作并保存到历史
  if (autoBatch) {
    endBatchOperation()
  }

  return ids
}

// Update edge data | 更新边数据
export const updateEdge = (id, data) => {
  edges.value = edges.value.map(edge => 
    edge.id === id ? { ...edge, data: { ...edge.data, ...data } } : edge
  )
  saveToHistory() // Save after updating edge | 更新连线后保存
}

// Remove edge | 删除边
export const removeEdge = (id) => {
  edges.value = edges.value.filter(edge => edge.id !== id)
  saveToHistory() // Save after removing edge | 删除连线后保存
}

// Clear canvas | 清空画布
export const clearCanvas = () => {
  nodes.value = []
  edges.value = []
  nodeId = 0
}

// Initialize with sample data | 使用示例数据初始化
export const initSampleData = () => {
  clearCanvas()
  
  // Add text node | 添加文本节点
  addNode('text', { x: 150, y: 150 }, {
    content: '一只金毛寻回犬在草地上奔跑，摇着尾巴，脸上带着快乐的表情。它的毛发在阳光下闪耀，眼神充满了对自由的渴望，全身散发着阳光、友善的气息。',
    label: '文本输入'
  })
  
  // Add image config node | 添加文生图配置节点
  addNode('imageConfig', { x: 450, y: 150 }, {
    prompt: '',
    model: 'doubao-seedream-4-5-251128',
    ratio: '16:9 | 4张 | 高清',
    label: '文生图'
  })
  
  // Add edge between nodes | 添加节点之间的边
  addEdge({
    source: 'node_0',
    target: 'node_1',
    sourceHandle: 'right',
    targetHandle: 'left'
  })
}

/**
 * Load project data | 加载项目数据
 * @param {string} projectId - Project ID | 项目ID
 */
export const loadProject = (projectId) => {
  autoSaveEnabled = false
  isRestoring = true
  currentProjectId.value = projectId
  
  const canvasData = getProjectCanvas(projectId)
  
  if (canvasData) {
    // Restore nodes | 恢复节点
    nodes.value = canvasData.nodes || []
    edges.value = canvasData.edges || []
    canvasViewport.value = canvasData.viewport || { x: 100, y: 50, zoom: 0.8 }
    
    // Update node ID counter | 更新节点ID计数器
    const maxId = nodes.value.reduce((max, node) => {
      const match = node.id.match(/node_(\d+)/)
      if (match) {
        return Math.max(max, parseInt(match[1], 10))
      }
      return max
    }, -1)
    nodeId = maxId + 1
  } else {
    // Empty project | 空项目
    clearCanvas()
  }
  
  // Initialize history with current state | 用当前状态初始化历史
  history.value = [{
    nodes: JSON.parse(JSON.stringify(nodes.value)),
    edges: JSON.parse(JSON.stringify(edges.value))
  }]
  historyIndex.value = 0
  
  // Enable auto-save after loading | 加载后启用自动保存
  setTimeout(() => {
    autoSaveEnabled = true
    isRestoring = false
  }, 100)
}

/**
 * Save current project | 保存当前项目
 */
export const saveProject = () => {
  if (!currentProjectId.value) return
  updateProjectCanvas(currentProjectId.value, {
    nodes: nodes.value,
    edges: edges.value,
    viewport: canvasViewport.value
  })
}

/**
 * Debounced auto-save | 防抖动自动保存
 */
const debouncedSave = () => {
  if (!autoSaveEnabled || !currentProjectId.value) return
  
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  saveTimeout = setTimeout(() => {
    saveProject()
  }, 500)
}

/**
 * Update viewport and save | 更新视口并保存
 */
export const updateViewport = (viewport) => {
  canvasViewport.value = viewport
  debouncedSave()
}

/**
 * Undo last action | 撤销上一步操作
 */
export const undo = () => {
  if (historyIndex.value <= 0) {
    window.$message?.info('没有可撤销的操作')
    return false
  }
  
  historyIndex.value--
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Redo last undone action | 重做上一步撤销的操作
 */
export const redo = () => {
  if (historyIndex.value >= history.value.length - 1) {
    window.$message?.info('没有可重做的操作')
    return false
  }
  
  historyIndex.value++
  restoreState(history.value[historyIndex.value])
  return true
}

/**
 * Restore state from history | 从历史恢复状态
 */
const restoreState = (state) => {
  isRestoring = true
  nodes.value = JSON.parse(JSON.stringify(state.nodes))
  edges.value = JSON.parse(JSON.stringify(state.edges))
  setTimeout(() => {
    isRestoring = false
  }, 100)
}

/**
 * Check if can undo | 检查是否可以撤销
 */
export const canUndo = () => historyIndex.value > 0

/**
 * Check if can redo | 检查是否可以重做
 */
export const canRedo = () => historyIndex.value < history.value.length - 1

/**
 * Manually save current state to history | 手动保存当前状态到历史
 * Used for edge deletions and other operations not covered by automatic saves
 */
export const manualSaveHistory = () => {
  saveToHistory()
}

// Watch for changes and auto-save (only save to project, not history) | 监听变化并自动保存（仅保存项目，不保存历史）
watch([nodes, edges], () => {
  debouncedSave()
}, { deep: true })
