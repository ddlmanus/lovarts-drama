<template>
  <!-- Text node wrapper | 文本节点包裹层 -->
  <div class="text-node-wrapper" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
    <!-- Text node | 文本节点 -->
    <div
      class="text-node bg-[var(--bg-secondary)] rounded-xl border min-w-[280px] max-w-[350px] relative transition-all duration-200"
      :class="data.selected ? 'border-1 border-blue-500 shadow-lg shadow-blue-500/20' : 'border border-[var(--border-color)]'">
      <!-- Header | 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
        <span
          v-if="!isEditingLabel"
          @dblclick="startEditLabel"
          class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
          title="双击编辑名称"
        >{{ data.label }}</span>
        <input
          v-else
          ref="labelInputRef"
          v-model="editingLabelValue"
          @blur="finishEditLabel"
          @keydown.enter="finishEditLabel"
          @keydown.escape="cancelEditLabel"
          class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-blue-500"
        />
        <div class="flex items-center gap-1">
          <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="复制节点">
            <n-icon :size="14">
              <CopyOutline />
            </n-icon>
          </button>
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="删除节点">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
          <!-- <button class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" title="展开">
            <n-icon :size="14">
              <ExpandOutline />
            </n-icon>
          </button> -->
        </div>
      </div>

      <!-- Content | 内容 -->
      <div class="p-3">
        <div class="textarea-wrapper" ref="textareaWrapper">
          <!-- 可编辑的文本区域（支持 @ 引用图片显示）参考 MaterialInput -->
          <div
            ref="editorRef"
            class="editor-content"
            contenteditable="true"
            @input="handleInput"
            @keydown="handleKeydown"
            @paste="handlePaste"
            @blur="updateContent"
            @wheel.stop
            @mousedown.stop
            :data-placeholder="placeholder"
          ></div>
        </div>
        <!-- Polish button | 润色按钮 -->
        <button
          @click="handlePolish"
          :disabled="isPolishing || !plainText.trim()"
          class="mt-2 px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--accent-color)] hover:text-white border border-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <n-spin v-if="isPolishing" :size="12" />
          <span v-else>✨</span>
          AI 润色
        </button>
      </div>

      <!-- Handles | 连接点 -->
      <NodeHandleMenu :nodeId="id" nodeType="text" :visible="showHandleMenu" :operations="operations" @select="handleSelect" />
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />

    </div>

    <!-- Mentions picker | @ 选择器 -->
    <MentionsPicker
      v-model:visible="showMentionsPicker"
      :position="mentionsPosition"
      context="text"
      @select="handleMentionSelect"
    />
  </div>
</template>

<script setup>
/**
 * Text node component | 文本节点组件
 * Allows user to input and edit text content
 */
import { ref, watch, nextTick, computed, onMounted } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin } from 'naive-ui'
import { TrashOutline, ExpandOutline, CopyOutline, ImageOutline, VideocamOutline, ChatbubbleOutline, CreateOutline } from '@vicons/ionicons5'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import MentionsPicker from '../MentionsPicker.vue'
import { useChat } from '../../hooks'
import { useModelStore } from '../../stores/pinia'
import { parseMentions } from '../../hooks/useNodeRef'

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config state | API 配置状态
const modelStore = useModelStore()
const isApiConfigured = computed(() => !!modelStore.currentApiKey)

// Chat hook for polish | 润色用的 Chat hook
const { send: sendChat } = useChat({
  systemPrompt: '你是一个专业的AI绘画提示词专家。将用户输入的内容美化成高质量的生图提示词，包含风格、光线、構图、细节等要素。直接返回提示词，不要其他解释。',
  model: 'gpt-4o-mini'
})

// Local content state | 本地内容状态
const showHandleMenu = ref(false)
const content = ref(props.data?.content || '')
const placeholder = '请输入文本内容，输入 @ 可引用图片节点...'

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Polish loading state | 润色加载状态
const isPolishing = ref(false)

// Mentions picker state | @ 选择器状态
const showMentionsPicker = ref(false)
const mentionsPosition = ref({ x: 0, y: 0 })
const editorRef = ref(null)
const textareaWrapper = ref(null)
const mentionSearchStart = ref(-1)  // @ 触发搜索的起始位置
const lastContent = ref('')  // 上一次的内容，用于检测变化

// ============ 参考 MaterialInput 的逻辑 ============

// 从 contenteditable 中提取纯文本（将 chip 转为 @label）
const getEditableText = () => {
  const el = editorRef.value
  if (!el) return ''
  let text = ''
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList?.contains('mention-chip')) {
        text += `@[${node.dataset.nodeId}]`
      } else if (node.tagName === 'BR') {
        text += '\n'
      } else {
        node.childNodes.forEach(walk)
      }
    }
  }
  el.childNodes.forEach(walk)
  return text
}

// 根据 DOM 光标位置计算纯文本中的位置（考虑 mention-chip 的转换）
const getTextPositionBeforeCursor = (editor, range) => {
  const container = editor
  let textLength = 0
  let found = false

  const walk = (node) => {
    if (found) return

    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.textContent.length
      if (range.startContainer === node) {
        textLength += range.startOffset
        found = true
        return
      }
      textLength += nodeLength
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.classList?.contains('mention-chip')) {
        // mention-chip 在纯文本中算作 @[nodeId]
        const replacement = `@[${node.dataset.nodeId || ''}]`
        if (range.startContainer === node || isNodeInside(node, range.startContainer)) {
          // 光标在 mention-chip 内部
          found = true
          return
        }
        textLength += replacement.length
      } else if (node.tagName === 'BR') {
        textLength += 1
      } else {
        for (const child of node.childNodes) {
          walk(child)
          if (found) return
        }
      }
    }
  }

  walk(container)
  return textLength
}

// 检查节点是否在父节点内部
const isNodeInside = (parent, child) => {
  let node = child
  while (node) {
    if (node === parent) return true
    node = node.parentNode
  }
  return false
}

// 创建 mention chip 元素
const createMentionChip = (node) => {
  const chip = document.createElement('span')
  chip.className = 'mention-chip'
  chip.contentEditable = 'false'
  chip.dataset.nodeId = node.id
  chip.dataset.label = node.data?.publicProps?.name || node.data?.label || '图片'

  if (node.data?.url) {
    const img = document.createElement('img')
    img.src = node.data.url
    img.className = 'mention-chip-thumb'
    chip.appendChild(img)
  } else {
    const iconWrap = document.createElement('span')
    iconWrap.className = 'mention-chip-icon'
    iconWrap.textContent = '📷'
    chip.appendChild(iconWrap)
  }

  const label = document.createElement('span')
  label.className = 'mention-chip-label'
  label.textContent = chip.dataset.label
  chip.appendChild(label)

  return chip
}

// 在 contenteditable 中插入 mention chip（替换 @searchText）
const insertMentionChipDOM = (node) => {
  const el = editorRef.value
  if (!el) return

  // 遍历文本节点，找到最后一个 @
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let lastAtNode = null
  let lastAtOffset = -1

  while (walker.nextNode()) {
    const idx = walker.currentNode.textContent.lastIndexOf('@')
    if (idx !== -1) {
      lastAtNode = walker.currentNode
      lastAtOffset = idx
    }
  }

  if (!lastAtNode || lastAtOffset === -1) return

  const chip = createMentionChip(node)
  const spaceNode = document.createTextNode('\u00A0')
  const beforeText = lastAtNode.textContent.substring(0, lastAtOffset)

  if (beforeText) {
    lastAtNode.textContent = beforeText
    lastAtNode.parentNode.insertBefore(chip, lastAtNode.nextSibling)
    lastAtNode.parentNode.insertBefore(spaceNode, chip.nextSibling)
  } else {
    const parent = lastAtNode.parentNode
    parent.insertBefore(chip, lastAtNode)
    parent.insertBefore(spaceNode, chip.nextSibling)
    parent.removeChild(lastAtNode)
  }

  // 光标移到空格之后
  const range = document.createRange()
  range.setStartAfter(spaceNode)
  range.collapse(true)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)

  // 同步文本
  isInternalUpdate = true
  content.value = getEditableText()
  lastContent.value = content.value
  nextTick(() => { isInternalUpdate = false })
}

// 设置 contenteditable 内容（纯文本）
const setEditableContent = (text) => {
  if (!editorRef.value) return
  editorRef.value.innerHTML = ''
  if (text) {
    editorRef.value.textContent = text
  }
}

// 扫描 contenteditable 文本节点，将 @label 或 @[nodeId] 自动转为 chip
const convertTextMentionsToChips = () => {
  const el = editorRef.value
  if (!el) return

  // 获取所有可引用的图片节点（需要公开的）
  const imageNodes = nodes.value.filter(n => n.type === 'image' && n.data?.publicProps?.name)
  if (imageNodes.length === 0) return

  // 快速检查：无 @ 直接跳过
  if (!el.textContent.includes('@')) return

  // 优先匹配 @[nodeId] 格式
  const nodeIdPattern = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g

  // 收集需要替换的文本节点（跳过 chip 内部）
  const targets = []
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  while (walker.nextNode()) {
    const node = walker.currentNode
    if (node.parentElement?.closest('.mention-chip')) continue
    nodeIdPattern.lastIndex = 0
    if (nodeIdPattern.test(node.textContent)) {
      targets.push(node)
    }
  }
  if (targets.length === 0) return

  // 替换文本节点为 chip + 文本片段
  targets.forEach(textNode => {
    const text = textNode.textContent
    nodeIdPattern.lastIndex = 0
    const fragment = document.createDocumentFragment()
    let lastIdx = 0
    let match

    while ((match = nodeIdPattern.exec(text)) !== null) {
      if (match.index > lastIdx) {
        fragment.appendChild(document.createTextNode(text.slice(lastIdx, match.index)))
      }

      // 通过 nodeId 查找节点
      const nodeId = match[1]
      const node = imageNodes.find(n => n.id === nodeId)

      if (node) {
        fragment.appendChild(createMentionChip(node))
        fragment.appendChild(document.createTextNode('\u00A0'))
      } else {
        fragment.appendChild(document.createTextNode(match[0]))
      }
      lastIdx = nodeIdPattern.lastIndex
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.slice(lastIdx)))
    }

    textNode.parentNode.replaceChild(fragment, textNode)
  })
}

// 防抖版本（用于输入事件，避免频繁 DOM 操作）
let _convertTimer = null
const debouncedConvertMentions = () => {
  if (_convertTimer) clearTimeout(_convertTimer)
  _convertTimer = setTimeout(convertTextMentionsToChips, 300)
}

// 聚焦 contenteditable 并将光标移到末尾
const focusEditableEnd = () => {
  const el = editorRef.value
  if (!el) return
  el.focus()
  const range = document.createRange()
  range.selectNodeContents(el)
  range.collapse(false)
  const sel = window.getSelection()
  sel.removeAllRanges()
  sel.addRange(range)
}

// Handle paste - 参考 MaterialInput，纯文本粘贴
const handlePaste = (e) => {
  // 纯文本粘贴（防止粘入富文本）
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  document.execCommand('insertText', false, text)
}

// 内部更新标志
let isInternalUpdate = false

// @ 提及预览列表（已移除，改为在 editor 中直接显示）

// 获取纯文本（用于 AI 润色）
const plainText = computed(() => {
  return content.value
})

// 将 @[nodeId] 转换为带图片的 HTML
const editorHtml = computed(() => {
  let html = content.value
  // 转义 HTML 特殊字符
  html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // 替换 @[nodeId] 为图片
  html = html.replace(/@\[([^\]|]+)(?:\|([^\]]+))?\]/g, (match, nodeId) => {
    const node = nodes.value.find(n => n.id === nodeId)
    if (node?.type === 'image' && node.data?.url) {
      const displayName = node.data?.publicProps?.name || node.data?.label || '图片'
      return `<span class="mention-inline" data-node-id="${nodeId}"><img src="${node.data.url}" alt="${displayName}" />${displayName}</span>`
    }
    return match
  })

  // 换行符转换为 <br>
  html = html.replace(/\n/g, '<br>')

  return html
})

// Text node menu operations | 文本节点菜单操作
const operations = [
  { type: 'imageConfig', label: '生图', icon: ImageOutline },
  { type: 'videoConfig', label: '生视频', icon: VideocamOutline },
  { type: 'llmConfig', label: 'LLM', icon: ChatbubbleOutline }
]

// Handle menu select | 处理菜单选择
const handleSelect = (item) => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  const defaultData = {
    imageConfig: { model: 'doubao-seedream-4-5-251128', size: '2048x2048', label: '文生图' },
    videoConfig: { label: '视频生成' },
    llmConfig: { label: 'LLM文本生成' }
  }

  const newId = addNode(item.type, { x: nodeX + 400, y: nodeY }, defaultData[item.type] || {})

  addEdge({
    source: props.id,
    target: newId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  setTimeout(() => updateNodeInternals(newId), 50)
  window.$message?.success(`已创建${item.label}节点`)
}

// Handle input for @ trigger | 处理 @ 触发输入（参考 MaterialInput）
const handleInput = (e) => {
  const editor = e.target
  isInternalUpdate = true
  content.value = getEditableText()
  lastContent.value = content.value
  nextTick(() => { isInternalUpdate = false })

  // 触发文本到 chip 的转换
  debouncedConvertMentions()

  // 获取光标位置
  const selection = window.getSelection()
  if (!selection.rangeCount) return

  const range = selection.getRangeAt(0)
  // 使用辅助函数计算纯文本中的光标位置
  const cursorPos = getTextPositionBeforeCursor(editor, range)
  const fullText = getEditableText()
  const textBeforeCursor = fullText.slice(0, cursorPos)

  // Check if cursor is after @ character | 检查光标是否在 @ 字符后
  const lastAtIndex = textBeforeCursor.lastIndexOf('@')

  if (lastAtIndex !== -1) {
    // Check if there's a space after @ (meaning user finished typing mention) | 检查 @ 后面是否有空格（用户已完成输入）
    const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1)

    // Check if there's a complete @[...] mention | 检查是否有完整的 @[...] 配对
    const bracketMatch = textAfterAt.match(/\[([^\]]*)\]/)
    const hasCompleteMention = bracketMatch !== null

    // Show picker only if: @ exists, no space after @, and not part of a complete @[...] mention
    if (!textAfterAt.includes(' ') && !hasCompleteMention) {
      // Calculate position | 计算位置
      showMentionsPicker.value = true
      mentionSearchStart.value = lastAtIndex

      // Get editor position relative to viewport | 获取 editor 相对于视口的位置
      const rect = editor.getBoundingClientRect()
      mentionsPosition.value = {
        x: rect.left + 10,
        y: rect.bottom + 5
      }
      return
    }
  }

  // Hide picker if conditions not met | 如果条件不满足，隐藏选择器
  showMentionsPicker.value = false
}

// Handle keydown for mentions and Shift+Enter | 处理 @ 选择器和 Shift+Enter 换行
const handleKeydown = (e) => {
  // 处理 @ 选择器
  if (showMentionsPicker.value) {
    // 回车键选中当前高亮的项
    if (e.key === 'Enter') {
      e.preventDefault()
      // 触发 MentionsPicker 的选择事件，需要通过自定义事件来处理
      // 由于无法直接访问 MentionsPicker 的内部状态，这里暂时不做处理
      // 让事件继续传播到 MentionsPicker
      return
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      showMentionsPicker.value = false
      // Remove the incomplete @ | 移除不完整的 @
      const selection = window.getSelection()
      if (!selection.rangeCount) return

      const range = selection.getRangeAt(0)
      const editor = editorRef.value
      const cursorPos = range.startOffset
      const textBeforeCursor = content.value.slice(0, cursorPos)
      const lastAtIndex = textBeforeCursor.lastIndexOf('@')

      if (lastAtIndex !== -1) {
        content.value = textBeforeCursor.slice(0, lastAtIndex) + content.value.slice(cursorPos)
        lastContent.value = content.value
        // Update editor content | 更新 editor 内容
        nextTick(() => {
          editor.innerHTML = editorHtml.value
          // Set cursor position | 设置光标位置
          const newRange = document.createRange()
          newRange.setStart(editor.firstChild || editor, lastAtIndex)
          newRange.collapse(true)
          selection.removeAllRanges()
          selection.addRange(newRange)
        })
      }
    }
    return
  }

  // 规范化 Shift+Enter 插入换行
  if (e.key === 'Enter' && e.shiftKey) {
    e.preventDefault()
    document.execCommand('insertLineBreak')
  }
}

// Handle mention selection | 处理 @ 引用选择（参考 MaterialInput）
const handleMentionSelect = ({ nodeId }) => {
  // 找到对应的图片节点
  const node = nodes.value.find(n => n.id === nodeId)
  if (!node) {
    showMentionsPicker.value = false
    return
  }

  // 插入 mention chip 到 DOM
  insertMentionChipDOM(node)

  // 更新 store
  updateContent()
  showMentionsPicker.value = false
}

// Watch for external data changes | 监听外部数据变化
watch(() => props.data?.content, (newVal) => {
  if (newVal !== content.value) {
    content.value = newVal || ''
    lastContent.value = content.value
    // Sync to editor | 同步到 editor
    setEditableContent(content.value)
    // 立即将文本中的 @label 转为 chip
    nextTick(() => convertTextMentionsToChips())
  }
})

// Watch content changes and sync to editor | 监听内容变化并同步到编辑器
watch(content, (newVal) => {
  if (isInternalUpdate) return
  setEditableContent(newVal)
  // 立即将文本中的 @label 转为 chip
  nextTick(() => convertTextMentionsToChips())
  lastContent.value = newVal
})

// Initialize editor content | 初始化 editor 内容
onMounted(() => {
  if (editorRef.value) {
    if (props.data?.content) {
      content.value = props.data.content
    }
    lastContent.value = content.value
    // 使用 setEditableContent + convertTextMentionsToChips 确保正确创建 mention-chip
    setEditableContent(content.value)
    nextTick(() => convertTextMentionsToChips())
  }
})

// Update content in store | 更新存储中的内容
const updateContent = () => {
  updateNode(props.id, { content: content.value })
}

// Handle AI polish | 处理 AI 润色
const handlePolish = async () => {
  const input = content.value.trim()
  if (!input) return
  
  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    return
  }

  isPolishing.value = true
  const originalContent = content.value

  try {
    // Call chat API to polish the prompt | 调用 AI 润色提示词
    const result = await sendChat(input, true)
    
    if (result) {
      content.value = result
      updateNode(props.id, { content: result })
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    content.value = originalContent
    window.$message?.error(err.message || '润色失败')
  } finally {
    isPolishing.value = false
  }
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || ''
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
  const newNodeId = duplicateNode(props.id)
  window.$message?.success('节点已复制')
  if (newNodeId) {
    setTimeout(() => {
      updateNodeInternals(newNodeId)
    }, 50)
  }
}

// Handle image generation | 处理图片生成
const handleImageGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create imageConfig node | 创建text生图配置节点
  const configNodeId = addNode('imageConfig', { x: nodeX + 400, y: nodeY }, {
    model: 'doubao-seedream-4-5-251128',
    size: '2048x2048',
    label: '文生图'
  })

  // Auto connect | 自动连接
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(configNodeId)
  }, 50)
}

// Handle video generation | 处理视频生成
const handleVideoGen = () => {
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create videoConfig node | 创建视频配置节点
  const configNodeId = addNode('videoConfig', { x: nodeX + 400, y: nodeY }, {
    label: '视频生成'
  })

  // Auto connect | 自动连接
  addEdge({
    source: props.id,
    target: configNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(configNodeId)
  }, 50)
}
</script>

<style scoped>
.text-node-wrapper {
  padding-right: 50px;
  padding-top: 20px;
  position: relative;
}

.text-node {
  cursor: default;
  position: relative;
}

/* Textarea wrapper - 参考 MaterialInput input-with-mention */
.textarea-wrapper {
  position: relative;
}

/* Editor styles | 编辑器样式 - 参考 MaterialInput */
.editor-content {
  min-height: 60px;
  max-height: 120px;
  padding: 8px 10px;
  border: none;
  border-radius: 8px;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  overflow-y: auto;
  word-break: break-word;
  white-space: pre-wrap;
}

.editor-content:focus {
  background: var(--bg-tertiary);
}

.editor-content:empty::before {
  content: attr(data-placeholder);
  color: var(--text-secondary);
  opacity: 0.5;
  pointer-events: none;
}

</style>
<style>

/* Inline mention in editor | editor 中内联提及 */
.editor-content :deep(.mention-inline) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
}

.editor-content :deep(.mention-inline img) {
  width: 16px;
  height: 16px;
  border-radius: 2px;
  object-fit: cover;
}

/* Mentions preview | @ 提及预览 */
.mentions-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--border-color);
}

/* Mention chip - 参考 MaterialInput 样式 */
.mention-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px 2px 2px;
  margin: 0 2px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  vertical-align: middle;
  cursor: default;
  user-select: none;
  line-height: 1.4;
  color: var(--text-primary);
}

.mention-chip img {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  object-fit: cover;
}

.mention-placeholder {
  font-size: 12px;
}

.mention-name {
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>