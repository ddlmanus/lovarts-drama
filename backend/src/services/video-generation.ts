import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { getConfigForModel } from './ai.js'
import { now } from '../utils/response.js'
import { downloadFile, readImageAsCompressedDataUrl } from '../utils/storage.js'
import { getVideoAdapter } from './adapters/registry'
import type { AIConfig } from './adapters/types'
import { generateZenmuxVideoDirect, shouldUseZenmuxDirect } from './zenmux-direct.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess, logTaskWarn, redactUrl } from '../utils/task-logger.js'

interface GenerateVideoParams {
  storyboardId?: number
  dramaId?: number
  prompt: string
  model?: string
  referenceMode?: string
  imageUrl?: string
  firstFrameUrl?: string
  lastFrameUrl?: string
  referenceImageUrls?: string[]
  duration?: number
  fps?: number
  resolution?: string
  aspectRatio?: string
  seed?: number
  generateAudio?: boolean
  negativePrompt?: string
  enhancePrompt?: boolean
  personGeneration?: string
  numberOfVideos?: number
  configId?: number
  userId?: string
}

interface VideoRuntimeOptions {
  generateAudio?: boolean
  negativePrompt?: string
  enhancePrompt?: boolean
  personGeneration?: string
  numberOfVideos?: number
}

export async function generateVideo(params: GenerateVideoParams): Promise<number> {
  const ts = now()
  const config = getConfigForModel('video', params.model, params.configId, params.userId)
  if (!config) throw new Error('No active video AI config')
  const defaults = config.modelDefaults || {}

  const res = db.insert(schema.videoGenerations).values({
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    prompt: params.prompt,
    model: params.model || config.model,
    provider: config.provider,
    referenceMode: params.referenceMode || 'none',
    imageUrl: params.imageUrl,
    firstFrameUrl: params.firstFrameUrl,
    lastFrameUrl: params.lastFrameUrl,
    referenceImageUrls: params.referenceImageUrls ? JSON.stringify(params.referenceImageUrls) : null,
    duration: params.duration || defaults.duration || 5,
    fps: params.fps ?? defaults.fps ?? null,
    resolution: params.resolution || defaults.resolution || '720p',
    aspectRatio: params.aspectRatio || defaults.aspect_ratio || defaults.aspectRatio || '16:9',
    seed: params.seed ?? defaults.seed ?? null,
    status: 'processing',
    createdAt: ts,
    updatedAt: ts,
  }).run()

  const lastId = Number(res.lastInsertRowid)
  logTaskStart('VideoTask', 'enqueue', {
    id: lastId,
    provider: config.provider,
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    referenceMode: params.referenceMode || 'none',
    duration: params.duration || defaults.duration || 5,
  })
  logTaskPayload('VideoTask', 'enqueue params', {
    id: lastId,
    config: {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
    },
    params,
  })
  const runtimeOptions: VideoRuntimeOptions = {
    generateAudio: params.generateAudio ?? defaults.generate_audio ?? defaults.generateAudio,
    negativePrompt: params.negativePrompt || defaults.negative_prompt || defaults.negativePrompt,
    enhancePrompt: params.enhancePrompt ?? defaults.enhance_prompt ?? defaults.enhancePrompt,
    personGeneration: params.personGeneration || defaults.person_generation || defaults.personGeneration,
    numberOfVideos: params.numberOfVideos ?? defaults.number_of_videos ?? defaults.numberOfVideos ?? defaults.sample_count ?? defaults.sampleCount,
  }

  processVideoGeneration(lastId, config, runtimeOptions).catch(err => {
    logTaskError('VideoTask', 'process', { id: lastId, error: err.message })
    console.error(`Video generation ${lastId} failed:`, err)
  })
  return lastId
}

async function processVideoGeneration(id: number, config: AIConfig, runtimeOptions: VideoRuntimeOptions = {}) {
  const adapter = getVideoAdapter(config.provider)

  try {
    const rows = db.select().from(schema.videoGenerations).where(eq(schema.videoGenerations.id, id)).all()
    const record = rows[0]
    if (!record) return
    logTaskProgress('VideoTask', 'build-request', {
      id,
      provider: config.provider,
      storyboardId: record.storyboardId,
      referenceMode: record.referenceMode,
    })

    const prefersPublicImageUrls = config.provider.toLowerCase() === 'apimart'
    const resolvedImageUrl = await normalizeVideoReferenceUrl(record.imageUrl, prefersPublicImageUrls)
    const resolvedFirstFrameUrl = await normalizeVideoReferenceUrl(record.firstFrameUrl, prefersPublicImageUrls)
    const resolvedLastFrameUrl = await normalizeVideoReferenceUrl(record.lastFrameUrl, prefersPublicImageUrls)
    const resolvedReferenceImageUrls = await normalizeVideoReferenceUrls(record.referenceImageUrls, prefersPublicImageUrls)

    if (shouldUseZenmuxDirect('video', config, record.model)) {
      logTaskProgress('VideoTask', 'zenmux-direct-start', {
        id,
        provider: config.provider,
        model: record.model || config.model,
      })
      const result = await generateZenmuxVideoDirect(config, {
        model: record.model,
        prompt: record.prompt,
        imageUrl: resolvedImageUrl,
        firstFrameUrl: resolvedFirstFrameUrl,
        lastFrameUrl: resolvedLastFrameUrl,
        referenceImageUrls: resolvedReferenceImageUrls,
        duration: record.duration,
        aspectRatio: record.aspectRatio,
        resolution: record.resolution,
        fps: record.fps,
        seed: record.seed,
        generateAudio: runtimeOptions.generateAudio,
        negativePrompt: runtimeOptions.negativePrompt,
        enhancePrompt: runtimeOptions.enhancePrompt,
        personGeneration: runtimeOptions.personGeneration,
        numberOfVideos: runtimeOptions.numberOfVideos,
      })
      await handleVideoCompleteLocal(id, result.localPath, result.duration, record.storyboardId)
      return
    }

    // 使用 Adapter 构建请求
    const { url, method, headers, body } = adapter.buildGenerateRequest(config, {
      id: record.id,
      model: record.model,
      prompt: record.prompt,
      referenceMode: record.referenceMode,
      imageUrl: resolvedImageUrl,
      firstFrameUrl: resolvedFirstFrameUrl,
      lastFrameUrl: resolvedLastFrameUrl,
      referenceImageUrls: resolvedReferenceImageUrls ? JSON.stringify(resolvedReferenceImageUrls) : null,
      duration: record.duration,
      fps: record.fps,
      resolution: record.resolution,
      aspectRatio: record.aspectRatio,
      seed: record.seed,
      generateAudio: runtimeOptions.generateAudio,
      negativePrompt: runtimeOptions.negativePrompt,
      enhancePrompt: runtimeOptions.enhancePrompt,
      personGeneration: runtimeOptions.personGeneration,
      numberOfVideos: runtimeOptions.numberOfVideos,
    })
    logTaskProgress('VideoTask', 'request', {
      id,
      provider: config.provider,
      method,
      url: redactUrl(url),
      model: record.model,
      referenceMode: record.referenceMode,
    })
    logTaskPayload('VideoTask', 'request payload', {
      id,
      method,
      url,
      headers,
      body,
    })

    const resp = await fetch(url, {
      method,
      headers,
      body: JSON.stringify(body),
    })

    if (!resp.ok) throw new Error(`API error ${resp.status}: ${await resp.text()}`)
    const result = await resp.json() as any

    const { isAsync, taskId, videoUrl } = adapter.parseGenerateResponse(result)

    if (!isAsync && videoUrl) {
      logTaskProgress('VideoTask', 'sync-complete', { id, videoUrl })
      // 同步模式
      await handleVideoComplete(id, videoUrl, record.duration)
      return
    }

    // 异步模式：更新 taskId，开始轮询
    db.update(schema.videoGenerations)
      .set({ taskId, status: 'processing', updatedAt: now() })
      .where(eq(schema.videoGenerations.id, id))
      .run()
    logTaskProgress('VideoTask', 'poll-start', { id, taskId, provider: config.provider })

    // Vidu 没有轮询端点，跳过轮询（依赖 Webhook 回调）
    if (adapter.provider === 'vidu') {
      logTaskProgress('VideoTask', 'webhook-wait', { id, taskId, provider: adapter.provider })
      return
    }

    pollVideoTask(id, config, taskId!, record.storyboardId)
  } catch (err: any) {
    logTaskError('VideoTask', 'process', { id, provider: config.provider, error: err.message })
    db.update(schema.videoGenerations)
      .set({ status: 'failed', errorMsg: err.message, updatedAt: now() })
      .where(eq(schema.videoGenerations.id, id))
      .run()
  }
}

async function normalizeVideoReferenceUrl(value: string | null | undefined, preferPublicUrl = false): Promise<string | null> {
  const raw = String(value || '').trim()
  if (!raw) return null
  if (raw.startsWith('data:image/')) return raw
  if (raw.startsWith('static/') || raw.startsWith('/static/')) {
    const localPath = raw.startsWith('/static/') ? raw.slice(1) : raw
    if (preferPublicUrl) return toPublicStaticUrl(localPath)
    try {
      return await readImageAsCompressedDataUrl(localPath, {
        maxWidth: 768,
        maxHeight: 768,
        quality: 68,
      })
    } catch (err) {
      logTaskWarn('VideoTask', 'reference-read-failed', { path: localPath, error: (err as Error).message })
      return null
    }
  }
  return raw
}

function toPublicStaticUrl(localPath: string): string {
  const publicBase = process.env.API_PUBLIC_URL || process.env.PUBLIC_URL || process.env.STORAGE_BASE_URL || ''
  if (!publicBase) return `/${localPath}`
  return `${publicBase.replace(/\/+$/, '')}/${localPath.replace(/^\/+/, '')}`
}

async function normalizeVideoReferenceUrls(raw: string | null | undefined, preferPublicUrl = false): Promise<string[]> {
  if (!raw) return []
  let refs: string[] = []
  try {
    refs = JSON.parse(raw)
  } catch {
    refs = []
  }
  const uniqueRefs = Array.from(new Set(refs.map((item) => String(item || '').trim()).filter(Boolean)))
  const normalized = await Promise.all(
    uniqueRefs.map((item) => normalizeVideoReferenceUrl(item, preferPublicUrl)),
  )
  return normalized.filter((item): item is string => !!item)
}

async function pollVideoTask(id: number, config: AIConfig, taskId: string, storyboardId?: number | null) {
  const adapter = getVideoAdapter(config.provider)

  for (let i = 0; i < 300; i++) {
    await new Promise(r => setTimeout(r, 10000))
    try {
      const [record] = db.select().from(schema.videoGenerations).where(eq(schema.videoGenerations.id, id)).all()
      const { url, method, headers, body } = adapter.buildPollRequest(config, taskId, record?.model)
      logTaskProgress('VideoTask', 'poll-request', {
        id,
        taskId,
        provider: config.provider,
        method,
        url: redactUrl(url),
        attempt: i + 1,
      })
      const resp = await fetch(url, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      })
      if (!resp.ok) continue
      const result = await resp.json() as any

      const pollResp = adapter.parsePollResponse(result)

      if (pollResp.status === 'completed' && pollResp.videoUrl) {
        logTaskSuccess('VideoTask', 'poll-complete', { id, taskId, videoUrl: pollResp.videoUrl })
        await handleVideoComplete(id, pollResp.videoUrl, null, storyboardId)
        return
      }
      if (pollResp.status === 'failed') {
        logTaskError('VideoTask', 'poll-failed', { id, taskId, error: pollResp.error || 'Video generation failed' })
        throw new Error(pollResp.error || 'Video generation failed')
      }
    } catch (err: any) {
      if (i === 299) {
        logTaskError('VideoTask', 'poll-timeout', { id, taskId, error: err.message })
        db.update(schema.videoGenerations)
          .set({ status: 'failed', errorMsg: `Timeout: ${err.message}`, updatedAt: now() })
          .where(eq(schema.videoGenerations.id, id))
          .run()
        return
      }
      logTaskWarn('VideoTask', 'poll-retry', { id, taskId, attempt: i + 1, error: err.message })
    }
  }
}

async function handleVideoComplete(id: number, videoUrl: string, duration: number | null | undefined, storyboardId?: number | null) {
  const localPath = await downloadFile(videoUrl, 'videos')
  db.update(schema.videoGenerations)
    .set({ videoUrl, localPath, status: 'completed', completedAt: now(), updatedAt: now() })
    .where(eq(schema.videoGenerations.id, id))
    .run()
  logTaskSuccess('VideoTask', 'downloaded', { id, localPath, storyboardId, duration })

  if (storyboardId) {
    db.update(schema.storyboards)
      .set({ videoUrl: localPath, duration: duration || undefined, updatedAt: now() })
      .where(eq(schema.storyboards.id, storyboardId))
      .run()
  }
}

async function handleVideoCompleteLocal(id: number, localPath: string, duration: number | null | undefined, storyboardId?: number | null) {
  db.update(schema.videoGenerations)
    .set({ localPath, status: 'completed', completedAt: now(), updatedAt: now() })
    .where(eq(schema.videoGenerations.id, id))
    .run()
  logTaskSuccess('VideoTask', 'saved-local', { id, localPath, storyboardId, duration })

  if (storyboardId) {
    db.update(schema.storyboards)
      .set({ videoUrl: localPath, duration: duration || undefined, updatedAt: now() })
      .where(eq(schema.storyboards.id, storyboardId))
      .run()
  }
}
