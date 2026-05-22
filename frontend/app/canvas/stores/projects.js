/**
 * Projects store | 项目状态管理
 * Persists canvas projects through the backend MySQL API.
 */
import { ref, computed } from 'vue'
import { canvasProjectAPI } from '../../composables/useApi'

const generateId = () => `project_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

export const projects = ref([])
export const currentProjectId = ref(null)
export const projectsLoading = ref(false)
export const projectsLoaded = ref(false)
const persistQueues = new Map()

export const currentProject = computed(() => {
  return projects.value.find(p => p.id === currentProjectId.value) || null
})

const normalizeProject = (project) => ({
  ...project,
  thumbnail: project.thumbnail || '',
  canvasData: project.canvasData || { nodes: [], edges: [], viewport: { x: 100, y: 50, zoom: 0.8 } },
  createdAt: project.createdAt ? new Date(project.createdAt) : new Date(),
  updatedAt: project.updatedAt ? new Date(project.updatedAt) : new Date()
})

const defaultCanvasData = () => ({
  nodes: [],
  edges: [],
  viewport: { x: 100, y: 50, zoom: 0.8 }
})

const cleanNodeForStorage = (node) => {
  const cleanedNode = {
    id: node.id,
    type: node.type,
    position: node.position || { x: 0, y: 0 },
    data: node.data || {}
  }
  if (node.parentNode) cleanedNode.parentNode = node.parentNode
  if (node.extent) cleanedNode.extent = node.extent
  if (node.zIndex !== undefined) cleanedNode.zIndex = node.zIndex
  if (!cleanedNode.data) return cleanedNode

  const cleanedData = { ...cleanedNode.data }

  if (cleanedData.base64) delete cleanedData.base64
  if (cleanedData.url?.startsWith?.('data:')) delete cleanedData.url
  if (cleanedData.maskData) delete cleanedData.maskData

  return { ...cleanedNode, data: cleanedData }
}

const cleanProjectForStorage = (project) => ({
  ...project,
  canvasData: project.canvasData ? {
    ...project.canvasData,
    nodes: project.canvasData.nodes?.map(cleanNodeForStorage) || [],
    edges: project.canvasData.edges || [],
    viewport: project.canvasData.viewport || { x: 100, y: 50, zoom: 0.8 }
  } : defaultCanvasData(),
  thumbnail: project.thumbnail?.startsWith?.('data:') ? '' : project.thumbnail || ''
})

const upsertLocalProject = (project, moveTop = true) => {
  const normalized = normalizeProject(project)
  const index = projects.value.findIndex(p => p.id === normalized.id)
  if (index === -1) {
    projects.value = moveTop ? [normalized, ...projects.value] : [...projects.value, normalized]
    return normalized
  }

  const next = [...projects.value]
  next[index] = { ...next[index], ...normalized }
  if (moveTop) {
    const [updated] = next.splice(index, 1)
    projects.value = [updated, ...next]
  } else {
    projects.value = next
  }
  return normalized
}

export const persistProject = async (project) => {
  const payload = cleanProjectForStorage(project)
  const request = () => canvasProjectAPI.update(project.id, {
    name: payload.name,
    thumbnail: payload.thumbnail,
    canvasData: payload.canvasData
  })
  const previous = persistQueues.get(project.id) || Promise.resolve()
  const next = previous.catch(() => null).then(request)
  persistQueues.set(project.id, next)
  try {
    const saved = await next
    upsertLocalProject(saved, false)
    return saved
  } finally {
    if (persistQueues.get(project.id) === next) {
      persistQueues.delete(project.id)
    }
  }
}

export const loadProjects = async () => {
  projectsLoading.value = true
  try {
    const rows = await canvasProjectAPI.list()
    projects.value = Array.isArray(rows) ? rows.map(normalizeProject) : []
    projectsLoaded.value = true
    return projects.value
  } catch (err) {
    console.error('Failed to load projects:', err)
    projects.value = []
    window.$message?.error('加载画布项目失败')
    throw err
  } finally {
    projectsLoading.value = false
  }
}

export const loadProjectById = async (id) => {
  const projectId = String(id || '').trim()
  if (!projectId) return null
  const project = await canvasProjectAPI.get(projectId)
  return upsertLocalProject(project, false)
}

export const saveProjects = async () => {
  await Promise.all(projects.value.map(project => persistProject(project)))
}

export const createProject = async (name = '未命名项目', canvasData = defaultCanvasData(), requestedId = '') => {
  const now = new Date()
  const newProject = {
    id: String(requestedId || '').trim() || generateId(),
    name,
    thumbnail: '',
    createdAt: now,
    updatedAt: now,
    canvasData
  }

  upsertLocalProject(newProject)
  try {
    const saved = await canvasProjectAPI.create(cleanProjectForStorage(newProject))
    upsertLocalProject(saved)
    return saved.id
  } catch (err) {
    projects.value = projects.value.filter(p => p.id !== newProject.id)
    console.error('Failed to create canvas project:', err)
    window.$message?.error('创建画布项目失败')
    throw err
  }
}

export const ensureProject = async (id, name = '未命名项目') => {
  const projectId = String(id || '').trim()
  if (!projectId || projectId === 'new') return createProject(name)
  const existing = projects.value.find(p => p.id === projectId)
  if (existing) return existing.id
  try {
    const loaded = await loadProjectById(projectId)
    if (loaded?.id) return loaded.id
  } catch (err) {
    const message = String(err?.message || '')
    if (!message.includes('not found') && !message.includes('不存在')) {
      throw err
    }
  }
  return createProject(name, defaultCanvasData(), projectId)
}

export const updateProject = async (id, data) => {
  const index = projects.value.findIndex(p => p.id === id)
  if (index === -1) return false

  const updated = {
    ...projects.value[index],
    ...data,
    updatedAt: new Date()
  }
  upsertLocalProject(updated)

  try {
    await persistProject(updated)
    return true
  } catch (err) {
    console.error('Failed to update canvas project:', err)
    window.$message?.error('保存项目失败')
    throw err
  }
}

export const updateProjectCanvas = async (id, canvasData) => {
  const project = projects.value.find(p => p.id === id)
  if (!project) return false

  project.canvasData = {
    ...project.canvasData,
    ...canvasData
  }
  project.updatedAt = new Date()

  if (canvasData.nodes) {
    const mediaNodes = canvasData.nodes
      .filter(node => (node.type === 'image' || node.type === 'video') && node.data?.url)
      .sort((a, b) => {
        const aTime = a.data?.updatedAt || a.data?.createdAt || 0
        const bTime = b.data?.updatedAt || b.data?.createdAt || 0
        return bTime - aTime
      })
    if (mediaNodes.length > 0) {
      const latestNode = mediaNodes[0]
      project.thumbnail = latestNode.type === 'video'
        ? latestNode.data.thumbnail || latestNode.data.url
        : latestNode.data.url
    }
  }

  try {
    await persistProject(project)
    return true
  } catch (err) {
    console.error('Failed to save canvas project:', err)
    window.$message?.error('画布自动保存失败，请检查网络或登录状态')
    throw err
  }
}

export const getProjectCanvas = (id) => {
  const project = projects.value.find(p => p.id === id)
  return project?.canvasData || null
}

export const deleteProject = async (id) => {
  const previous = [...projects.value]
  projects.value = projects.value.filter(p => p.id !== id)
  try {
    await canvasProjectAPI.del(id)
    return true
  } catch (err) {
    projects.value = previous
    console.error('Failed to delete canvas project:', err)
    window.$message?.error('删除项目失败')
    throw err
  }
}

export const duplicateProject = async (id) => {
  const source = projects.value.find(p => p.id === id)
  if (!source) return null

  const newId = await createProject(`${source.name} (副本)`, JSON.parse(JSON.stringify(source.canvasData || defaultCanvasData())))
  const duplicated = projects.value.find(p => p.id === newId)
  if (duplicated) {
    duplicated.thumbnail = source.thumbnail || ''
    await persistProject(duplicated)
  }
  return newId
}

export const renameProject = (id, name) => {
  return updateProject(id, { name })
}

export const updateProjectThumbnail = (id, thumbnail) => {
  return updateProject(id, { thumbnail })
}

export const getSortedProjects = (sortBy = 'updatedAt', order = 'desc') => {
  return computed(() => {
    const sorted = [...projects.value]
    sorted.sort((a, b) => {
      let valueA = a[sortBy]
      let valueB = b[sortBy]

      if (valueA instanceof Date) {
        valueA = valueA.getTime()
        valueB = valueB.getTime()
      }

      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase()
        valueB = valueB.toLowerCase()
      }

      return order === 'asc'
        ? (valueA > valueB ? 1 : -1)
        : (valueA < valueB ? 1 : -1)
    })
    return sorted
  })
}

export const initProjectsStore = async (force = false) => {
  if (projectsLoaded.value && !force) return projects.value
  return loadProjects()
}

if (typeof window !== 'undefined') {
  window.__aiCanvasProjects = {
    projects,
    loadProjects,
    saveProjects,
    createProject,
    deleteProject
  }
}
