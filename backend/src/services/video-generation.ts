import { schema } from '../db/index.js'
import { getConfigForModelAsync } from './ai.js'
import { now } from '../utils/response.js'
import { downloadFile, readImageAsCompressedDataUrl } from '../utils/storage.js'
import { getVideoAdapterForConfig } from './adapters/registry'
import type { AIConfig } from './adapters/types'
import { generateZenmuxVideoDirect, shouldUseZenmuxDirect } from './zenmux-direct.js'
import { chargeCreditsAsync } from './credits.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess, logTaskWarn, redactUrl } from '../utils/task-logger.js'
import { findVideoGeneration, insertVideoGeneration, updateGeneratedStoryboard, updateVideoGeneration } from '../repositories/generations.js'

interface GenerateVideoParams {
  storyboardId?: number
  dramaId?: number
  prompt?: string
  model?: string
  referenceMode?: string
  imageUrl?: string
  firstFrameUrl?: string
  lastFrameUrl?: string
  referenceImageUrls?: string[]
  referenceVideoUrls?: string[]
  referenceAudioUrls?: string[]
  duration?: number
  fps?: number
  mode?: string
  resolution?: string
  quality?: string
  aspectRatio?: string
  frames?: number
  seed?: number
  generateAudio?: boolean
  audioSetting?: string
  cameraFixed?: boolean
  watermark?: boolean
  returnLastFrame?: boolean
  serviceTier?: string
  executionExpiresAfter?: number
  callbackUrl?: string
  draft?: boolean
  draftTaskId?: string
  tools?: any
  negativePrompt?: string
  enhancePrompt?: boolean
  personGeneration?: string
  numberOfVideos?: number
  configId?: number
  userProviderId?: number
  userId?: string
}

interface VideoRuntimeOptions {
  generateAudio?: boolean
  audioSetting?: string
  cameraFixed?: boolean
  watermark?: boolean
  returnLastFrame?: boolean
  serviceTier?: string
  executionExpiresAfter?: number
  callbackUrl?: string
  draft?: boolean
  draftTaskId?: string
  tools?: any
  negativePrompt?: string
  enhancePrompt?: boolean
  personGeneration?: string
  numberOfVideos?: number
}

export async function generateVideo(params: GenerateVideoParams): Promise<number> {
  const ts = now()
  const config = await getConfigForModelAsync('video', params.model, params.configId, params.userId, params.userProviderId)
  if (!config) throw new Error('No active video AI config')
  const defaults = config.modelDefaults || {}
  const duration = params.duration === 0 ? 0 : Number(params.duration || defaults.duration || 5)
  const resolution = params.mode || params.resolution || params.quality || defaults.mode || defaults.resolution || defaults.quality || '720p'

  const lastId = await insertVideoGeneration({
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
    referenceVideoUrls: params.referenceVideoUrls ? JSON.stringify(params.referenceVideoUrls) : null,
    referenceAudioUrls: params.referenceAudioUrls ? JSON.stringify(params.referenceAudioUrls) : null,
    duration,
    fps: params.fps ?? defaults.fps ?? null,
    resolution,
    aspectRatio: params.aspectRatio || defaults.aspect_ratio || defaults.aspectRatio || '16:9',
    frames: params.frames ?? defaults.frames ?? null,
    generateAudio: params.generateAudio ?? defaults.generate_audio ?? defaults.generateAudio ?? null,
    cameraFixed: params.cameraFixed ?? defaults.camera_fixed ?? defaults.cameraFixed ?? null,
    watermark: params.watermark ?? defaults.watermark ?? null,
    returnLastFrame: params.returnLastFrame ?? defaults.return_last_frame ?? defaults.returnLastFrame ?? null,
    serviceTier: params.serviceTier || defaults.service_tier || defaults.serviceTier || null,
    executionExpiresAfter: params.executionExpiresAfter ?? defaults.execution_expires_after ?? defaults.executionExpiresAfter ?? null,
    callbackUrl: params.callbackUrl || defaults.callback_url || defaults.callbackUrl || null,
    draft: params.draft ?? defaults.draft ?? null,
    draftTaskId: params.draftTaskId || defaults.draft_task_id || defaults.draftTaskId || null,
    tools: params.tools ? JSON.stringify(params.tools) : (defaults.tools ? JSON.stringify(defaults.tools) : null),
    seed: params.seed ?? defaults.seed ?? null,
    status: 'processing',
    createdAt: ts,
    updatedAt: ts,
  }, params.userId)
  try {
    await chargeCreditsAsync(buildVideoChargeRequest(lastId, params, config, resolution, duration, defaults, true))
  } catch (error) {
    await updateVideoGeneration(lastId, { status: 'failed', errorMsg: error instanceof Error ? error.message : String(error), updatedAt: now() }, params.userId)
    throw error
  }
  logTaskStart('VideoTask', 'enqueue', {
    id: lastId,
    provider: config.provider,
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    referenceMode: params.referenceMode || 'none',
    duration,
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
    audioSetting: params.audioSetting || defaults.audio_setting || defaults.audioSetting,
    cameraFixed: params.cameraFixed ?? defaults.camera_fixed ?? defaults.cameraFixed,
    watermark: params.watermark ?? defaults.watermark,
    returnLastFrame: params.returnLastFrame ?? defaults.return_last_frame ?? defaults.returnLastFrame,
    serviceTier: params.serviceTier || defaults.service_tier || defaults.serviceTier,
    executionExpiresAfter: params.executionExpiresAfter ?? defaults.execution_expires_after ?? defaults.executionExpiresAfter,
    callbackUrl: params.callbackUrl || defaults.callback_url || defaults.callbackUrl,
    draft: params.draft ?? defaults.draft,
    draftTaskId: params.draftTaskId || defaults.draft_task_id || defaults.draftTaskId,
    tools: params.tools ?? defaults.tools,
    negativePrompt: params.negativePrompt || defaults.negative_prompt || defaults.negativePrompt,
    enhancePrompt: params.enhancePrompt ?? defaults.enhance_prompt ?? defaults.enhancePrompt,
    personGeneration: params.personGeneration || defaults.person_generation || defaults.personGeneration,
    numberOfVideos: params.numberOfVideos ?? defaults.number_of_videos ?? defaults.numberOfVideos ?? defaults.sample_count ?? defaults.sampleCount,
  }

  processVideoGeneration(lastId, config, runtimeOptions, params.userId).catch(err => {
    logTaskError('VideoTask', 'process', { id: lastId, error: err.message })
    console.error(`Video generation ${lastId} failed:`, err)
  })
  return lastId
}

function buildVideoChargeRequest(
  id: number,
  params: GenerateVideoParams,
  config: AIConfig,
  resolution: string,
  duration: number,
  defaults: Record<string, any>,
  validateOnly = false,
) {
  return {
    userId: params.userId,
    serviceType: 'video' as const,
    model: params.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    resolution,
    duration,
    quantity: params.numberOfVideos ?? defaults.number_of_videos ?? defaults.numberOfVideos ?? defaults.sample_count ?? defaults.sampleCount ?? 1,
    taskType: 'video',
    relatedTaskId: id,
    description: '视频生成消费',
    validateOnly,
    metadata: {
      storyboardId: params.storyboardId || null,
      dramaId: params.dramaId || null,
      referenceMode: params.referenceMode || 'none',
    },
  }
}

async function processVideoGeneration(id: number, config: AIConfig, runtimeOptions: VideoRuntimeOptions = {}, userId?: string) {
  const adapter = getVideoAdapterForConfig(config)

  try {
    const record = await findVideoGeneration(id)
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
    const resolvedReferenceVideoUrls = normalizeMediaReferenceUrls(record.referenceVideoUrls)
    const resolvedReferenceAudioUrls = normalizeMediaReferenceUrls(record.referenceAudioUrls)

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
        referenceVideoUrls: resolvedReferenceVideoUrls,
        referenceAudioUrls: resolvedReferenceAudioUrls,
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
      await handleVideoCompleteLocal(id, config, result.localPath, result.duration, record.storyboardId, userId)
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
      referenceVideoUrls: resolvedReferenceVideoUrls ? JSON.stringify(resolvedReferenceVideoUrls) : null,
      referenceAudioUrls: resolvedReferenceAudioUrls ? JSON.stringify(resolvedReferenceAudioUrls) : null,
      duration: record.duration,
      fps: record.fps,
      mode: record.resolution,
      resolution: record.resolution,
      quality: record.resolution,
      aspectRatio: record.aspectRatio,
      frames: record.frames,
      seed: record.seed,
      generateAudio: record.generateAudio ?? runtimeOptions.generateAudio,
      audioSetting: runtimeOptions.audioSetting,
      cameraFixed: record.cameraFixed ?? runtimeOptions.cameraFixed,
      watermark: record.watermark ?? runtimeOptions.watermark,
      returnLastFrame: record.returnLastFrame ?? runtimeOptions.returnLastFrame,
      serviceTier: record.serviceTier || runtimeOptions.serviceTier,
      executionExpiresAfter: record.executionExpiresAfter ?? runtimeOptions.executionExpiresAfter,
      callbackUrl: record.callbackUrl || runtimeOptions.callbackUrl,
      draft: record.draft ?? runtimeOptions.draft,
      draftTaskId: record.draftTaskId || runtimeOptions.draftTaskId,
      tools: record.tools || (runtimeOptions.tools ? JSON.stringify(runtimeOptions.tools) : null),
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

    const { isAsync, taskId, videoUrl, lastFrameUrl } = adapter.parseGenerateResponse(result)

    if (!isAsync && videoUrl) {
      logTaskProgress('VideoTask', 'sync-complete', { id, videoUrl })
      // 同步模式
      await handleVideoComplete(id, config, videoUrl, record.duration, record.storyboardId, userId, lastFrameUrl)
      return
    }

    // 异步模式：更新 taskId，开始轮询
    await updateVideoGeneration(id, { taskId, status: 'processing', updatedAt: now() }, userId)
    logTaskProgress('VideoTask', 'poll-start', { id, taskId, provider: config.provider })

    // Vidu 没有轮询端点，跳过轮询（依赖 Webhook 回调）
    if (adapter.provider === 'vidu') {
      logTaskProgress('VideoTask', 'webhook-wait', { id, taskId, provider: adapter.provider })
      return
    }

    pollVideoTask(id, config, taskId!, record.storyboardId, userId)
  } catch (err: any) {
    logTaskError('VideoTask', 'process', { id, provider: config.provider, error: err.message })
    await updateVideoGeneration(id, { status: 'failed', errorMsg: err.message, updatedAt: now() }, userId)
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

function normalizeMediaReferenceUrls(raw: string | null | undefined): string[] {
  if (!raw) return []
  let refs: string[] = []
  try {
    refs = JSON.parse(raw)
  } catch {
    refs = []
  }
  return Array.from(new Set(refs.map((item) => String(item || '').trim()).filter(Boolean)))
}

async function pollVideoTask(id: number, config: AIConfig, taskId: string, storyboardId?: number | null, userId?: string) {
  const adapter = getVideoAdapterForConfig(config)

  for (let i = 0; i < 300; i++) {
    await new Promise(r => setTimeout(r, 10000))
    try {
      const record = await findVideoGeneration(id)
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
        await handleVideoComplete(id, config, pollResp.videoUrl, null, storyboardId, userId, pollResp.lastFrameUrl)
        return
      }
      if (pollResp.status === 'failed') {
        logTaskError('VideoTask', 'poll-failed', { id, taskId, error: pollResp.error || 'Video generation failed' })
        throw new Error(pollResp.error || 'Video generation failed')
      }
    } catch (err: any) {
      if (i === 299) {
        logTaskError('VideoTask', 'poll-timeout', { id, taskId, error: err.message })
        await updateVideoGeneration(id, { status: 'failed', errorMsg: `Timeout: ${err.message}`, updatedAt: now() }, userId)
        return
      }
      logTaskWarn('VideoTask', 'poll-retry', { id, taskId, attempt: i + 1, error: err.message })
    }
  }
}

async function chargeCompletedVideo(id: number, config: AIConfig, record: any, userId?: string) {
  if (!record) return
  await chargeCreditsAsync({
    userId,
    serviceType: 'video',
    model: record.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    resolution: record.resolution,
    duration: record.duration || 1,
    quantity: 1,
    taskType: 'video',
    relatedTaskId: id,
    description: '视频生成消费（已确认）',
    metadata: {
      storyboardId: record.storyboardId || null,
      dramaId: record.dramaId || null,
      referenceMode: record.referenceMode || 'none',
    },
  })
}

async function handleVideoComplete(id: number, config: AIConfig, videoUrl: string, duration: number | null | undefined, storyboardId?: number | null, userId?: string, lastFrameUrl?: string | null) {
  const localPath = await downloadFile(videoUrl, 'videos')
  const localLastFramePath = lastFrameUrl ? await downloadFile(lastFrameUrl, 'images').catch(() => null) : null
  const record = await findVideoGeneration(id)
  await chargeCompletedVideo(id, config, record, userId)
  await updateVideoGeneration(id, { videoUrl, localPath, status: 'completed', completedAt: now(), updatedAt: now() }, userId)
  logTaskSuccess('VideoTask', 'downloaded', { id, localPath, storyboardId, duration })

  if (storyboardId) {
    await updateGeneratedStoryboard(storyboardId, { videoUrl: localPath, lastFrameImage: localLastFramePath || undefined, duration: duration || undefined, updatedAt: now() }, userId)
  }
}

async function handleVideoCompleteLocal(id: number, config: AIConfig, localPath: string, duration: number | null | undefined, storyboardId?: number | null, userId?: string) {
  const record = await findVideoGeneration(id)
  await chargeCompletedVideo(id, config, record, userId)
  await updateVideoGeneration(id, { localPath, status: 'completed', completedAt: now(), updatedAt: now() }, userId)
  logTaskSuccess('VideoTask', 'saved-local', { id, localPath, storyboardId, duration })

  if (storyboardId) {
    await updateGeneratedStoryboard(storyboardId, { videoUrl: localPath, duration: duration || undefined, updatedAt: now() }, userId)
  }
}
