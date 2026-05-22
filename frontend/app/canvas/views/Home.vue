<template>
  <div class="min-h-screen h-screen overflow-y-auto bg-[var(--bg-primary)]">
    <main class="max-w-5xl mx-auto px-4 py-8 md:py-16">
      <section class="text-center mb-12">
        <div class="flex items-center justify-center gap-4 mb-8">
          <h1 class="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">Lovarts.短剧无限画布</h1>
        </div>
      </section>

      <section ref="projectsSection">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的项目</h2>
          <div class="flex items-center gap-2">
            <button class="canvas-home-btn" @click="toggleFullscreen">
              <n-icon :size="16"><ExpandOutline /></n-icon>
              全屏
            </button>
            <button class="canvas-home-btn" :disabled="projectsLoading" @click="refreshProjects">
              <n-icon :size="16"><RefreshOutline /></n-icon>
              刷新
            </button>
            <button class="canvas-home-btn" :disabled="creatingProject" @click="createNewProject">
              <n-icon :size="16"><AddOutline /></n-icon>
              新建项目
            </button>
          </div>
        </div>

        <div v-if="projectsLoading" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-spin :size="28" />
          <p class="text-[var(--text-secondary)] mt-3">加载项目中</p>
        </div>

        <div v-else-if="projects.length === 0" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><FolderOutline /></n-icon>
          <p class="text-[var(--text-secondary)] mb-4">还没有项目，创建一个开始吧</p>
          <button
            class="px-4 py-2 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
            :disabled="creatingProject"
            @click="createNewProject"
          >
            创建第一个项目
          </button>
        </div>

        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div
            v-for="project in projects"
            :key="project.id"
            class="group relative"
          >
            <NuxtLink
              class="cursor-pointer block"
              :to="canvasProjectUrl(project.id)"
              @click="handleOpenProject(project, $event)"
            >
              <div
                class="aspect-video rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2 border border-[var(--border-color)] relative"
                @mouseenter="handleThumbnailHover(project, true)"
                @mouseleave="handleThumbnailHover(project, false)"
              >
                <template v-if="project.thumbnail">
                  <video
                    v-if="isVideoUrl(project.thumbnail)"
                    :ref="el => setVideoRef(project.id, el)"
                    :src="project.thumbnail"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    playsinline
                  />
                  <img
                    v-else
                    :src="project.thumbnail"
                    :alt="project.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </template>
                <div v-else class="w-full h-full flex items-center justify-center">
                  <n-icon :size="32" class="text-[var(--text-secondary)]"><DocumentOutline /></n-icon>
                </div>

                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-sm">打开项目</span>
                </div>
              </div>
              <p class="text-sm text-[var(--text-primary)] truncate">{{ project.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">{{ formatDate(project.updatedAt) }}</p>
            </NuxtLink>

            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="getProjectActions(project)" placement="bottom-end" @select="(key) => handleProjectAction(key, project)">
                <button
                  class="p-1.5 bg-white/90 dark:bg-gray-800/90 rounded-lg shadow hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  @click.stop
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>
    </main>

    <aside class="fixed left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <button
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="新建项目"
        @click="createNewProject"
      >
        <n-icon :size="20"><DocumentOutline /></n-icon>
      </button>
      <button
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        title="我的项目"
        @click="scrollToProjects"
      >
        <n-icon :size="20"><FolderOutline /></n-icon>
      </button>
    </aside>

    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { h, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NDropdown, NModal, NInput, NButton, NSpin, useDialog } from 'naive-ui'
import {
  AddOutline,
  RefreshOutline,
  DocumentOutline,
  FolderOutline,
  EllipsisHorizontalOutline,
  CreateOutline,
  CopyOutline,
  TrashOutline,
  ExpandOutline
} from '@vicons/ionicons5'
import {
  projects,
  projectsLoading,
  initProjectsStore,
  loadProjects,
  createProject,
  deleteProject,
  duplicateProject,
  renameProject
} from '../stores/projects'

const router = useRouter()
const dialog = useDialog()
const canvasProjectUrl = (id) => `/canvas/${encodeURIComponent(id)}`

const videoRefs = new Map()
const showRenameModal = ref(false)
const renameValue = ref('')
const renameTargetId = ref(null)
const creatingProject = ref(false)
const projectsSection = ref(null)

const setVideoRef = (projectId, el) => {
  if (el) {
    videoRefs.set(projectId, el)
  } else {
    videoRefs.delete(projectId)
  }
}

const handleThumbnailHover = (project, isHovering) => {
  if (!isVideoUrl(project.thumbnail)) return
  const video = videoRefs.get(project.id)
  if (!video) return
  if (isHovering) {
    video.play().catch(() => {})
  } else {
    video.pause()
    video.currentTime = 0
  }
}

const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const diff = Date.now() - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const getProjectActions = () => [
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

const handleProjectAction = async (key, project) => {
  switch (key) {
    case 'rename':
      renameTargetId.value = project.id
      renameValue.value = project.name
      showRenameModal.value = true
      break
    case 'duplicate': {
      const newId = await duplicateProject(project.id)
      if (newId) window.$message?.success('项目已复制')
      break
    }
    case 'delete':
      dialog.warning({
        title: '删除项目',
        content: `确定要删除项目「${project.name}」吗？此操作不可恢复。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
          await deleteProject(project.id)
          window.$message?.success('项目已删除')
        }
      })
      break
  }
}

const confirmRename = async () => {
  if (renameTargetId.value && renameValue.value.trim()) {
    await renameProject(renameTargetId.value, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
  renameTargetId.value = null
  renameValue.value = ''
}

const createNewProject = async () => {
  if (creatingProject.value) return
  creatingProject.value = true
  try {
    const id = await createProject('未命名项目')
    router.push(canvasProjectUrl(id))
  } finally {
    creatingProject.value = false
  }
}

const handleOpenProject = (project, event) => {
  if (!project?.id) {
    event.preventDefault()
    window.$message?.error('项目 ID 不存在，无法打开')
  }
}

const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  return ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'].some(ext => url.toLowerCase().includes(ext))
}

const scrollToProjects = () => {
  projectsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

const refreshProjects = async () => {
  await loadProjects()
}

const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.()
  } else {
    document.exitFullscreen?.()
  }
}

onMounted(async () => {
  await initProjectsStore()
})
</script>

<style scoped>
.canvas-home-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 14px;
  border-radius: 10px;
  background: #fff;
  color: #111827;
  font-size: 14px;
  line-height: 1;
  transition: opacity 0.15s ease, transform 0.15s ease, background-color 0.15s ease;
}

.canvas-home-btn:hover {
  background: #f3f4f6;
}

.canvas-home-btn:active {
  transform: translateY(1px);
}

.canvas-home-btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
</style>
