import { creationAPI } from '~/composables/useApi'

type CreationType = 'image' | 'video'

interface CreationTask {
  clientId: string
  type: CreationType
  sourceId: number
  prompt: string
  model: string
  status: string
  progress: number
  resultUrl: string
  errorMsg: string
  references: string[]
  groupKey: string
  size: string
  sampleImageSize: string
  results: any[]
  expectedCount: number
  createdAt: string
  updatedAt: string
}

const tasks = ref<CreationTask[]>([])
let pollTimer: ReturnType<typeof window.setInterval> | null = null
const ESTIMATED_MS_PER_IMAGE = 2 * 60 * 1000
const clientProgressStartedAt = new Map<number, number>()

function isClient() {
  return typeof window !== 'undefined'
}

function normalizeStatus(value?: string | null) {
  const raw = String(value || '').toLowerCase()
  if (['completed', 'complete', 'done', 'success', 'succeeded'].includes(raw)) return 'completed'
  if (['failed', 'fail', 'error'].includes(raw)) return 'failed'
  if (raw.includes('processing') || raw.includes('running')) return 'processing'
  return raw || 'pending'
}

function estimateDurationMs(type: CreationType, expectedCount?: number | null) {
  if (type === 'image') return ESTIMATED_MS_PER_IMAGE
  return Math.max(1, Number(expectedCount || 1)) * ESTIMATED_MS_PER_IMAGE
}

function estimatedProgress(status: string, type: CreationType, sourceId: number, expectedCount?: number | null, value?: number | null) {
  if (status === 'completed' || status === 'failed') return 100
  const baseline = typeof value === 'number' && value > 0 && value < 100
    ? Math.max(1, Math.min(99, Math.floor(value)))
    : 1
  const start = clientProgressStartedAt.get(sourceId) || Date.now()
  clientProgressStartedAt.set(sourceId, start)
  const duration = estimateDurationMs(type, expectedCount)
  const elapsed = Date.now() - start
  return Math.max(baseline, Math.min(99, Math.floor((elapsed / duration) * 100)))
}

function cleanErrorMessage(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.includes('https://apimart.ai/v1/') || raw.includes('This page could not be found')) {
    return 'APIMart 接口地址错误：base_url 不能填官网 https://apimart.ai，请改为 https://api.apimart.ai'
  }
  if (/<\/?[a-z][\s\S]*>/i.test(raw)) {
    const status = raw.match(/\b(4\d{2}|5\d{2})\b/)?.[1]
    return status ? `接口请求失败：HTTP ${status}` : '接口请求失败'
  }
  return raw.length > 220 ? `${raw.slice(0, 220)}...` : raw
}

export function creationAssetUrl(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/.test(raw)) return raw
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const assetBaseUrl = String(useRuntimeConfig().public.assetBaseUrl || '').replace(/\/+$/, '')
  if (assetBaseUrl && path.startsWith('/static/')) return `${assetBaseUrl}${path}`
  return path
}

function parseServerTime(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return 0
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw).getTime()
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw.replace(' ', 'T')}Z`).getTime()
  }
  return new Date(raw).getTime()
}

function taskFromRecord(record: any): CreationTask {
  const status = normalizeStatus(record?.status)
  const results = Array.isArray(record?.results) ? record.results : []
  const firstResult = results.find((item: any) => item?.result_url) || results[0] || {}
  const references = Array.isArray(record?.reference_images) ? record.reference_images.map(creationAssetUrl) : []
  const now = new Date().toISOString()
  const expectedCount = Number(record?.expected_count || results.length || 1)
  const createdAt = String(record?.created_at || now)
  const type = record?.type === 'video' ? 'video' : 'image'
  const sourceId = Number(record?.id || 0)
  if (sourceId && !['completed', 'failed'].includes(status) && !clientProgressStartedAt.has(sourceId)) {
    clientProgressStartedAt.set(sourceId, Date.now())
  }
  if (sourceId && ['completed', 'failed'].includes(status)) {
    clientProgressStartedAt.delete(sourceId)
  }
  return {
    clientId: `creation-${record?.id || Date.now()}`,
    type,
    sourceId,
    prompt: String(record?.prompt || ''),
    model: String(record?.model || ''),
    status,
    progress: estimatedProgress(status, type, sourceId, expectedCount, record?.progress),
    resultUrl: creationAssetUrl(firstResult?.result_url),
    errorMsg: cleanErrorMessage(record?.error_msg || firstResult?.error_msg),
    references,
    groupKey: `creation-${record?.id || now}`,
    size: String(record?.aspect_ratio || ''),
    sampleImageSize: String(record?.resolution || ''),
    results: results.map((item: any) => ({
      ...item,
      resultUrl: creationAssetUrl(item?.result_url),
    })),
    expectedCount,
    createdAt,
    updatedAt: String(record?.updated_at || now),
  }
}

function replaceAll(records: any[]) {
  tasks.value = records.map(taskFromRecord)
    .sort((a, b) => parseServerTime(a.createdAt) - parseServerTime(b.createdAt))
}

function upsert(record: any) {
  const task = taskFromRecord(record)
  const index = tasks.value.findIndex(item => item.sourceId === task.sourceId)
  if (index >= 0) tasks.value[index] = task
  else tasks.value.push(task)
  tasks.value.sort((a, b) => parseServerTime(a.createdAt) - parseServerTime(b.createdAt))
  return task
}

function removeLocal(id: number) {
  clientProgressStartedAt.delete(id)
  tasks.value = tasks.value.filter(item => item.sourceId !== id)
}

async function refreshTask(task: CreationTask) {
  const record = await creationAPI.get(task.sourceId)
  if (record) upsert(record)
}

function startPolling() {
  if (!isClient() || pollTimer) return
  pollTimer = window.setInterval(() => {
    const pending = tasks.value.filter(item => !['completed', 'failed'].includes(normalizeStatus(item.status)))
    pending.forEach(item => {
      refreshTask(item).catch(() => undefined)
    })
  }, 3000)
}

async function loadRecentCompleted() {
  const records = await creationAPI.list()
  replaceAll(Array.isArray(records) ? records : [])
}

export function useCreationTasks() {
  if (isClient()) startPolling()

  return {
    creationTasks: tasks,
    async createGeneration(payload: any) {
      const record = await creationAPI.create(payload)
      return upsert(record)
    },
    async deleteGeneration(id: number) {
      await creationAPI.del(id)
      removeLocal(id)
    },
    refreshTask,
    loadRecentCompleted,
  }
}
