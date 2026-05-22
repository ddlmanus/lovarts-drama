<template>
  <!-- Workflow panel | 工作流弹窗 -->
  <Transition name="panel-fade">
    <div v-if="visible" class="workflow-dialog-layer" @click.self="visible = false">
      <div class="workflow-panel">
        <!-- Header | 头部 -->
        <div class="panel-header">
          <div class="panel-tabs">
            <span 
              class="tab-item" 
              :class="{ active: activeTab === 'public' }"
              @click="activeTab = 'public'"
            >公共工作流</span>
            <span 
              class="tab-item" 
              :class="{ active: activeTab === 'my' }"
              @click="activeTab = 'my'"
            >我的工作流</span>
          </div>
          <button class="expand-btn" @click="visible = false">
            <n-icon :size="18"><CloseOutline /></n-icon>
          </button>
        </div>
        
        <!-- Content | 内容 -->
        <div class="panel-content">
          <!-- Public workflows | 公共工作流 -->
          <div v-if="activeTab === 'public'" class="workflow-grid">
            <div 
              v-for="workflow in publicWorkflows" 
              :key="workflow.id"
              class="workflow-card"
              @click="handleAddWorkflow(workflow)"
            >
              <div class="card-cover">
                <img v-if="workflow.cover" :src="workflow.cover" :alt="workflow.name" class="cover-img" />
                <n-icon v-else :size="36" class="cover-icon">
                  <component :is="getIcon(workflow.icon)" />
                </n-icon>
              </div>
              <div class="card-title">{{ workflow.name }}</div>
            </div>
          </div>
          
          <!-- My workflows | 我的工作流 -->
          <div v-else class="empty-state">
            <n-icon :size="36" class="text-gray-500">
              <FolderOpenOutline />
            </n-icon>
            <p class="text-gray-500 text-sm mt-2">暂无自定义工作流</p>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
/**
 * Workflow Panel Component | 工作流面板组件
 * 显示工作流模板列表，支持一键添加到画布
 */
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { 
  CloseOutline,
  GridOutline, 
  ImageOutline, 
  VideocamOutline,
  FolderOpenOutline,
  BookOutline,
  PersonOutline,
  CartOutline,
  ChatbubbleOutline
} from '@vicons/ionicons5'
import { WORKFLOW_TEMPLATES } from '../config/workflows'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['update:show', 'add-workflow'])

// Active tab | 当前标签
const activeTab = ref('public')

// Visible state | 显示状态
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// Public workflows | 公共工作流
const publicWorkflows = computed(() => WORKFLOW_TEMPLATES)

// Icon mapping | 图标映射
const iconMap = {
  GridOutline,
  ImageOutline,
  VideocamOutline,
  BookOutline,
  PersonOutline,
  ShoppingOutline: CartOutline,
  ChatbubbleOutline
}

const getIcon = (iconName) => {
  return iconMap[iconName] || GridOutline
}

// Handle add workflow | 处理添加工作流
const handleAddWorkflow = (workflow) => {
  // 直接添加工作流，节点内容由用户自己填写
  emit('add-workflow', { workflow, options: {} })
  visible.value = false
}

</script>

<style scoped>
/* Dialog layer | 弹窗遮罩 */
.workflow-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgb(0 0 0 / 46%);
}

/* Panel container | 面板容器 */
.workflow-panel {
  width: min(1080px, calc(100vw - 420px));
  min-width: 720px;
  max-height: min(82vh, 860px);
  background: var(--bg-secondary);
  backdrop-filter: blur(12px);
  border-radius: 16px;
  border: 1px solid var(--border-color);
  box-shadow: 0 24px 80px rgb(0 0 0 / 42%);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

:global(.dark) .workflow-panel {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Header | 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 16px;
  border-bottom: 1px solid var(--border-color);
}

.panel-tabs {
  display: flex;
  gap: 28px;
}

.tab-item {
  font-size: 18px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: color 0.2s;
  padding-bottom: 4px;
}

.tab-item:hover {
  color: var(--text-primary);
}

.tab-item.active {
  color: var(--text-primary);
  font-weight: 700;
}

.expand-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: none;
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

/* Content | 内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 22px 24px 28px;
}

/* Workflow grid | 工作流网格 */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 26px 34px;
}

/* Workflow card | 工作流卡片 */
.workflow-card {
  cursor: pointer;
  transition: transform 0.2s;
}

.workflow-card:hover {
  transform: translateY(-2px);
}

.workflow-card:hover .card-cover {
  border-color: var(--accent-color);
}

.card-cover {
  aspect-ratio: 1;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  transition: border-color 0.2s;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-icon {
  color: var(--text-secondary);
}

.card-title {
  margin-top: 12px;
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty state | 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--text-secondary);
}

/* Transition | 过渡动画 */
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: all 0.25s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.panel-fade-enter-from .workflow-panel,
.panel-fade-leave-to .workflow-panel {
  transform: translateY(10px) scale(0.98);
}

.workflow-panel {
  transition: transform 0.25s ease;
}

/* Scrollbar | 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

@media (max-width: 1180px) {
  .workflow-panel {
    width: min(920px, calc(100vw - 72px));
    min-width: 0;
  }

  .workflow-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 720px) {
  .workflow-dialog-layer {
    padding: 16px;
  }

  .workflow-panel {
    width: 100%;
    max-height: 86vh;
  }

  .workflow-grid {
    grid-template-columns: 1fr;
  }
}
</style>
