import { Hono } from 'hono'
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success } from '../utils/response.js'
import { listAgentTasks } from '../agents/task-progress.js'
import { requestUserId } from '../utils/dramaAccess.js'
import { syncImageGenerationTask } from '../services/image-generation.js'

const app = new Hono()

type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

const CATEGORY_LABELS: Record<string, string> = {
  text: '文本提取',
  image: '图片生成',
  video: '视频生成',
  audio: '语音生成',
  edit: '视频编辑',
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: '等待中',
  processing: '进行中',
  completed: '已完成',
  failed: '失败',
}

const AGENT_TASK_LABELS: Record<string, string> = {
  extractor: '角色场景提取',
  storyboard_breaker: '分镜提取',
  script_rewriter: '剧本改写',
  voice_assigner: '音色分配',
  grid_prompt_generator: '提示词生成',
}

function normalizeStatus(value?: string | null): TaskStatus {
  const raw = String(value || '').toLowerCase()
  if (['completed', 'complete', 'done', 'success', 'succeeded', 'compose_completed'].includes(raw)) return 'completed'
  if (['failed', 'fail', 'error', 'compose_failed'].includes(raw)) return 'failed'
  if (raw.includes('processing') || raw.includes('running') || raw.includes('compose_processing')) return 'processing'
  return raw ? 'pending' : 'pending'
}

function formatSceneName(scene?: any) {
  if (!scene) return '-'
  return `${scene.location || ''}${scene.time ? '-' + scene.time : ''}` || '-'
}

function formatStoryboardName(storyboard?: any) {
  if (!storyboard) return '-'
  return storyboard.title || `镜头${storyboard.storyboardNumber || storyboard.id}`
}

function parseFrameTypeLabel(frameType?: string | null) {
  const labels: Record<string, string> = {
    key_frame: '关键帧',
    first_frame: '首帧',
    last_frame: '尾帧',
    action_sequence: '动作序列',
  }
  return labels[String(frameType || '')] || ''
}

function sortTasks(a: any, b: any) {
  return new Date(b.createdAt || b.updatedAt || 0).getTime() - new Date(a.createdAt || a.updatedAt || 0).getTime()
}

function withLabels(task: any) {
  const status = normalizeStatus(task.status)
  return {
    ...task,
    status,
    statusLabel: STATUS_LABELS[status],
    taskCategoryLabel: task.taskCategoryLabel || CATEGORY_LABELS[task.category] || task.category,
  }
}

async function syncVisibleImageTasks(userId: string, filters: { dramaId?: number | null; episodeId?: number | null }) {
  const rows = await db.select().from(schema.imageGenerations)
    .where(and(
      eq(schema.imageGenerations.createdBy, userId),
      inArray(schema.imageGenerations.status, ['pending', 'processing']),
    ))
    .execute()
  let candidates = rows.filter(row => row.taskId)
  if (filters.dramaId) candidates = candidates.filter(row => row.dramaId === filters.dramaId)
  if (filters.episodeId) {
    const storyboards = await db.select().from(schema.storyboards)
      .where(eq(schema.storyboards.episodeId, filters.episodeId))
      .execute()
    const storyboardIds = new Set(storyboards.map(item => item.id))
    candidates = candidates.filter(row => row.storyboardId && storyboardIds.has(row.storyboardId))
  }

  for (const row of candidates.slice(0, 20)) {
    await syncImageGenerationTask(row.id, userId)
  }
}

app.get('/', async (c) => {
  const category = c.req.query('category') || ''
  const status = c.req.query('status') || ''
  const dramaId = c.req.query('drama_id') ? Number(c.req.query('drama_id')) : null
  const episodeId = c.req.query('episode_id') ? Number(c.req.query('episode_id')) : null
  const limit = Math.max(1, Math.min(200, Number(c.req.query('limit') || 100)))
  const userId = requestUserId(c)

  await syncVisibleImageTasks(userId, { dramaId, episodeId })

  const dramas = ((await db.select().from(schema.dramas).where(eq(schema.dramas.userId, userId)).execute()) as any[]).filter(item => !item.deletedAt)
  const episodes = ((await db.select().from(schema.episodes).where(eq(schema.episodes.userId, userId)).execute()) as any[]).filter(item => !item.deletedAt)
  const storyboards = ((await db.select().from(schema.storyboards).where(eq(schema.storyboards.userId, userId)).execute()) as any[]).filter(item => !item.deletedAt)
  const scenes = ((await db.select().from(schema.scenes).where(eq(schema.scenes.userId, userId)).execute()) as any[]).filter(item => !item.deletedAt)
  const characters = ((await db.select().from(schema.characters).where(eq(schema.characters.userId, userId)).execute()) as any[]).filter(item => !item.deletedAt)

  const dramaById = new Map<number, any>(dramas.map(item => [item.id, item]))
  const episodeById = new Map<number, any>(episodes.map(item => [item.id, item]))
  const storyboardById = new Map<number, any>(storyboards.map(item => [item.id, item]))
  const sceneById = new Map<number, any>(scenes.map(item => [item.id, item]))
  const characterById = new Map<number, any>(characters.map(item => [item.id, item]))

  const tasks: any[] = []

  for (const task of listAgentTasks()) {
    const ep = task.episodeId ? episodeById.get(task.episodeId) : (episodeId ? episodeById.get(episodeId) : episodes.find(item => item.dramaId === dramaId) || null)
    const drama = ep ? dramaById.get(ep.dramaId) : (dramaId ? dramaById.get(dramaId) : null)
    if (!ep && !drama) continue
    const taskCategoryLabel = AGENT_TASK_LABELS[task.agentType] || task.agentType
    tasks.push(withLabels({
      id: `agent-${task.taskId}`,
      source: 'agent',
      sourceId: task.taskId,
      category: 'text',
      taskCategoryLabel,
      bizName: '-',
      aiModel: '-',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: task.status === 'running' ? 'processing' : task.status,
      progress: task.progress,
      message: task.message,
      errorMsg: task.error || '',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    }))
  }

  for (const ep of episodes) {
    const drama = dramaById.get(ep.dramaId)
    if (!drama) continue
    const episodeChars = characters.filter(char => char.dramaId === ep.dramaId && !char.deletedAt)
    const episodeScenes = scenes.filter(scene => scene.dramaId === ep.dramaId && !scene.deletedAt)
    const episodeStoryboards = storyboards.filter(sb => sb.episodeId === ep.id && !sb.deletedAt)
    if (episodeChars.length) {
      tasks.push(withLabels({
        id: `extract-characters-${ep.id}`,
        source: 'derived',
        sourceId: ep.id,
        category: 'text',
        taskCategoryLabel: '角色提取',
        bizName: '-',
        aiModel: '-',
        projectName: drama.title,
        episodeTitle: ep.title,
        status: 'completed',
        progress: 100,
        message: `${episodeChars.length} 个角色`,
        errorMsg: '',
        createdAt: ep.updatedAt || ep.createdAt,
        updatedAt: ep.updatedAt,
      }))
    }
    if (episodeScenes.length) {
      tasks.push(withLabels({
        id: `extract-scenes-${ep.id}`,
        source: 'derived',
        sourceId: ep.id,
        category: 'text',
        taskCategoryLabel: '场景提取',
        bizName: '-',
        aiModel: '-',
        projectName: drama.title,
        episodeTitle: ep.title,
        status: 'completed',
        progress: 100,
        message: `${episodeScenes.length} 个场景`,
        errorMsg: '',
        createdAt: ep.updatedAt || ep.createdAt,
        updatedAt: ep.updatedAt,
      }))
    }
    if (episodeStoryboards.length) {
      tasks.push(withLabels({
        id: `extract-storyboards-${ep.id}`,
        source: 'derived',
        sourceId: ep.id,
        category: 'text',
        taskCategoryLabel: '分镜提取',
        bizName: episodeStoryboards[0]?.title || '-',
        aiModel: '-',
        projectName: drama.title,
        episodeTitle: ep.title,
        status: 'completed',
        progress: 100,
        message: `${episodeStoryboards.length} 个分镜`,
        errorMsg: '',
        createdAt: episodeStoryboards[episodeStoryboards.length - 1]?.updatedAt || ep.updatedAt || ep.createdAt,
        updatedAt: episodeStoryboards[episodeStoryboards.length - 1]?.updatedAt || ep.updatedAt,
      }))
    }
  }

  for (const row of (await db.select().from(schema.imageGenerations).where(eq(schema.imageGenerations.createdBy, userId)).execute())) {
    const sb = row.storyboardId ? storyboardById.get(row.storyboardId) : null
    const scene = row.sceneId ? sceneById.get(row.sceneId) : (sb?.sceneId ? sceneById.get(sb.sceneId) : null)
    const char = row.characterId ? characterById.get(row.characterId) : null
    const ep = sb ? episodeById.get(sb.episodeId) : null
    const drama = (ep ? dramaById.get(ep.dramaId) : null) || (row.dramaId ? dramaById.get(row.dramaId) : null) || (scene ? dramaById.get(scene.dramaId) : null) || (char ? dramaById.get(char.dramaId) : null)
    tasks.push(withLabels({
      id: `image-${row.id}`,
      source: 'image',
      sourceId: row.id,
      category: 'image',
      taskCategoryLabel: row.sceneId ? '场景图片生成' : row.characterId ? '角色图片生成' : row.storyboardId ? `镜头图片生成${parseFrameTypeLabel(row.frameType) ? '-' + parseFrameTypeLabel(row.frameType) : ''}` : '图片生成',
      bizName: char?.name || formatSceneName(scene) || formatStoryboardName(sb),
      aiModel: row.model || row.provider || '-',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: row.status,
      progress: normalizeStatus(row.status) === 'completed' || normalizeStatus(row.status) === 'failed' ? 100 : 35,
      message: row.localPath || row.imageUrl || '',
      errorMsg: row.errorMsg || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    }))
  }

  for (const row of (await db.select().from(schema.videoGenerations).where(eq(schema.videoGenerations.createdBy, userId)).execute())) {
    const sb = row.storyboardId ? storyboardById.get(row.storyboardId) : null
    const ep = sb ? episodeById.get(sb.episodeId) : null
    const drama = (ep ? dramaById.get(ep.dramaId) : null) || (row.dramaId ? dramaById.get(row.dramaId) : null)
    tasks.push(withLabels({
      id: `video-${row.id}`,
      source: 'video',
      sourceId: row.id,
      category: 'video',
      taskCategoryLabel: '视频生成',
      bizName: formatStoryboardName(sb),
      aiModel: row.model || row.provider || '-',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: row.status,
      progress: normalizeStatus(row.status) === 'completed' || normalizeStatus(row.status) === 'failed' ? 100 : 45,
      message: row.localPath || row.videoUrl || '',
      errorMsg: row.errorMsg || '',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
    }))
  }

  for (const sb of storyboards.filter(item => item.ttsAudioUrl)) {
    const ep = episodeById.get(sb.episodeId)
    const drama = ep ? dramaById.get(ep.dramaId) : null
    tasks.push(withLabels({
      id: `tts-${sb.id}`,
      source: 'tts',
      sourceId: sb.id,
      category: 'audio',
      taskCategoryLabel: '语音生成',
      bizName: formatStoryboardName(sb),
      aiModel: '-',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: 'completed',
      progress: 100,
      message: sb.ttsAudioUrl,
      errorMsg: '',
      createdAt: sb.updatedAt || sb.createdAt,
      updatedAt: sb.updatedAt,
      completedAt: sb.updatedAt,
    }))
  }

  for (const sb of storyboards.filter(item => item.status?.startsWith('compose_') || item.composedVideoUrl)) {
    const ep = episodeById.get(sb.episodeId)
    const drama = ep ? dramaById.get(ep.dramaId) : null
    tasks.push(withLabels({
      id: `compose-${sb.id}`,
      source: 'compose',
      sourceId: sb.id,
      category: 'edit',
      taskCategoryLabel: '视频编辑',
      bizName: formatStoryboardName(sb),
      aiModel: 'FFmpeg',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: sb.composedVideoUrl ? 'completed' : sb.status,
      progress: sb.composedVideoUrl || sb.status === 'compose_failed' ? 100 : 50,
      message: sb.composedVideoUrl || '',
      errorMsg: sb.status === 'compose_failed' ? '视频合成失败，请检查素材' : '',
      createdAt: sb.updatedAt || sb.createdAt,
      updatedAt: sb.updatedAt,
      completedAt: sb.composedVideoUrl ? sb.updatedAt : null,
    }))
  }

  for (const row of (await db.select().from(schema.videoMerges).where(eq(schema.videoMerges.createdBy, userId)).execute())) {
    const ep = row.episodeId ? episodeById.get(row.episodeId) : null
    const drama = (ep ? dramaById.get(ep.dramaId) : null) || (row.dramaId ? dramaById.get(row.dramaId) : null)
    tasks.push(withLabels({
      id: `merge-${row.id}`,
      source: 'merge',
      sourceId: row.id,
      category: 'edit',
      taskCategoryLabel: '作品合成',
      bizName: row.title || '全集视频',
      aiModel: row.model || row.provider || 'FFmpeg',
      projectName: drama?.title || '-',
      episodeTitle: ep?.title || '-',
      status: row.status,
      progress: normalizeStatus(row.status) === 'completed' || normalizeStatus(row.status) === 'failed' ? 100 : 60,
      message: row.mergedUrl || '',
      errorMsg: row.errorMsg || '',
      createdAt: row.createdAt,
      updatedAt: row.completedAt || row.createdAt,
      completedAt: row.completedAt,
    }))
  }

  let filtered = tasks
  if (category) filtered = filtered.filter(item => item.category === category)
  if (status) filtered = filtered.filter(item => item.status === status)
  if (dramaId) filtered = filtered.filter(item => dramas.find(d => d.title === item.projectName)?.id === dramaId || item.projectName === dramaById.get(dramaId)?.title)
  if (episodeId) filtered = filtered.filter(item => item.episodeTitle === episodeById.get(episodeId)?.title)

  filtered = filtered.sort(sortTasks)
  return success(c, {
    items: filtered.slice(0, limit),
    total: filtered.length,
    categories: Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
    statuses: Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
  })
})

export default app
