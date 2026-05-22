import { schema } from '../db/index.js'
import { getConfigForModelAsync } from './ai.js'
import { now } from '../utils/response.js'
import { downloadFile, readImageAsCompressedDataUrl, saveBase64Image } from '../utils/storage.js'
import { getImageAdapter } from './adapters/registry'
import type { AIConfig } from './adapters/types'
import { generateZenmuxImageDirect, shouldUseZenmuxDirect } from './zenmux-direct.js'
import { chargeCreditsAsync } from './credits.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess, logTaskWarn, redactUrl } from '../utils/task-logger.js'
import { findImageGeneration, insertImageGeneration, updateGeneratedCharacter, updateGeneratedScene, updateGeneratedStoryboard, updateImageGeneration } from '../repositories/generations.js'

interface GenerateImageParams {
  storyboardId?: number
  dramaId?: number
  sceneId?: number
  characterId?: number
  prompt: string
  model?: string
  size?: string
  sampleImageSize?: string
  quality?: string
  style?: string
  referenceImages?: string[]
  mask?: string
  numberOfImages?: number
  outputFormat?: string
  outputCompression?: number
  background?: string
  moderation?: string
  responseFormat?: string
  watermark?: boolean
  stream?: boolean
  officialFallback?: boolean
  googleSearch?: boolean
  googleImageSearch?: boolean
  sequentialImageGeneration?: string
  sequentialImageGenerationOptions?: any
  optimizePromptOptions?: any
  tools?: any[]
  frameType?: string
  configId?: number
  userProviderId?: number
  userId?: string
}

const SERIAL_IMAGE_PROVIDERS = new Set(['zenmux'])
const imageProviderQueues = new Map<string, Promise<void>>()
const IMAGE_FETCH_TIMEOUT_MS = 1_200_000
const IMAGE_FETCH_MAX_ATTEMPTS = 3

function normalizeNumberOfImages(value: unknown) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(4, Math.floor(parsed)))
}

export async function generateImage(params: GenerateImageParams): Promise<number> {
  const ts = now()
  const config = await getConfigForModelAsync('image', params.model, params.configId, params.userId, params.userProviderId)
  if (!config) throw new Error('No active image AI config')
  const defaults = config.modelDefaults || {}
  const sequentialOptions = params.sequentialImageGenerationOptions || defaults.sequential_image_generation_options || defaults.sequentialImageGenerationOptions || null
  const sequentialMaxImages = sequentialOptions && typeof sequentialOptions === 'object' ? sequentialOptions.max_images ?? sequentialOptions.maxImages : undefined
  const numberOfImages = normalizeNumberOfImages(params.numberOfImages ?? sequentialMaxImages ?? defaults.numberOfImages ?? defaults.number_of_images ?? defaults.sampleCount ?? defaults.sample_count)

  const lastId = await insertImageGeneration({
    storyboardId: params.storyboardId,
    dramaId: params.dramaId,
    sceneId: params.sceneId,
    characterId: params.characterId,
    prompt: params.prompt,
    model: params.model || config.model,
    provider: config.provider,
    size: params.size || defaults.size || defaults.aspect_ratio || '1920x1080',
    sampleImageSize: params.sampleImageSize || defaults.resolution || defaults.sampleImageSize || defaults.sample_image_size || defaults.imageSizeLevel || defaults.image_size_level || null,
    quality: params.quality || defaults.quality || null,
    style: params.style || defaults.style || null,
    steps: numberOfImages,
    outputFormat: params.outputFormat || defaults.output_format || defaults.outputFormat || null,
    outputCompression: params.outputCompression ?? defaults.output_compression ?? defaults.outputCompression ?? null,
    background: params.background || defaults.background || null,
    moderation: params.moderation || defaults.moderation || null,
    responseFormat: params.responseFormat || defaults.response_format || defaults.responseFormat || 'url',
    watermark: params.watermark ?? defaults.watermark ?? null,
    stream: params.stream ?? defaults.stream ?? null,
    officialFallback: params.officialFallback ?? defaults.official_fallback ?? defaults.officialFallback ?? null,
    googleSearch: params.googleSearch ?? defaults.google_search ?? defaults.googleSearch ?? null,
    googleImageSearch: params.googleImageSearch ?? defaults.google_image_search ?? defaults.googleImageSearch ?? null,
    sequentialImageGeneration: params.sequentialImageGeneration || defaults.sequential_image_generation || defaults.sequentialImageGeneration || null,
    sequentialImageGenerationOptions: JSON.stringify(params.sequentialImageGenerationOptions || defaults.sequential_image_generation_options || defaults.sequentialImageGenerationOptions || {}),
    optimizePromptOptions: JSON.stringify(params.optimizePromptOptions || defaults.optimize_prompt_options || defaults.optimizePromptOptions || {}),
    tools: JSON.stringify(params.tools || defaults.tools || []),
    frameType: params.frameType,
    referenceImages: params.referenceImages ? JSON.stringify(params.referenceImages) : null,
    status: 'processing',
    createdAt: ts,
    updatedAt: ts,
  }, params.userId)
  try {
    await chargeCreditsAsync(buildImageChargeRequest(lastId, params, config, defaults, numberOfImages, true))
  } catch (error) {
    await updateImageGeneration(lastId, { status: 'failed', errorMsg: error instanceof Error ? error.message : String(error), updatedAt: now() }, params.userId)
    throw error
  }
  logTaskStart('ImageTask', 'enqueue', {
    id: lastId,
    provider: config.provider,
    storyboardId: params.storyboardId,
    sceneId: params.sceneId,
    characterId: params.characterId,
    frameType: params.frameType,
    model: params.model || config.model,
  })
  logTaskPayload('ImageTask', 'enqueue params', {
    id: lastId,
    config: {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
    },
    params,
  })
  processImageGeneration(lastId, config, params.userId).catch(err => {
    logTaskError('ImageTask', 'process', { id: lastId, error: err.message })
    console.error(`Image generation ${lastId} failed:`, err)
  })
  return lastId
}

function buildImageChargeRequest(
  id: number,
  params: GenerateImageParams,
  config: AIConfig,
  defaults: Record<string, any>,
  numberOfImages: number,
  validateOnly = false,
) {
  return {
    userId: params.userId,
    serviceType: 'image' as const,
    model: params.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    resolution: params.sampleImageSize || defaults.resolution || defaults.sampleImageSize || defaults.sample_image_size || defaults.imageSizeLevel || defaults.image_size_level || params.size || defaults.size || defaults.aspect_ratio,
    quantity: numberOfImages,
    taskType: 'image',
    relatedTaskId: id,
    description: '图片生成消费',
    validateOnly,
    metadata: {
      storyboardId: params.storyboardId || null,
      sceneId: params.sceneId || null,
      characterId: params.characterId || null,
    },
  }
}

async function processImageGeneration(id: number, config: AIConfig, userId?: string) {
  const provider = (config.provider || '').toLowerCase()
  if (!SERIAL_IMAGE_PROVIDERS.has(provider)) {
    await processImageGenerationNow(id, config, userId)
    return
  }

  const previous = imageProviderQueues.get(provider) || Promise.resolve()
  const queued = previous.catch(() => undefined).then(() => processImageGenerationNow(id, config, userId))
  const tracked = queued.finally(() => {
    if (imageProviderQueues.get(provider) === tracked) imageProviderQueues.delete(provider)
  })
  imageProviderQueues.set(provider, tracked)
  await tracked
}

async function processImageGenerationNow(id: number, config: AIConfig, userId?: string) {
  const adapter = getImageAdapter(config.provider)

  try {
    const record = await findImageGeneration(id)
    if (!record) return
    const resolvedReferenceImages = await normalizeReferenceImages(record.referenceImages)
    if (shouldUseZenmuxDirect('image', config, record.model)) {
      logTaskProgress('ImageTask', 'zenmux-direct-start', {
        id,
        provider: config.provider,
        model: record.model || config.model,
      })
      const result = await generateZenmuxImageDirect(config, {
        model: record.model,
        prompt: record.prompt,
        negativePrompt: record.negativePrompt,
        size: record.size,
        sampleImageSize: record.sampleImageSize,
        quality: record.quality,
        style: record.style,
        seed: record.seed,
        cfgScale: record.cfgScale,
        referenceImages: resolvedReferenceImages,
        mask: record.mask || undefined,
        numberOfImages: record.steps,
        outputFormat: record.outputFormat,
        stream: record.stream,
      })
      await handleImageCompleteLocalMany(id, config, result.localPaths || [result.localPath], userId)
      return
    }
    logTaskProgress('ImageTask', 'build-request', {
      id,
      provider: config.provider,
      storyboardId: record.storyboardId,
      sceneId: record.sceneId,
      characterId: record.characterId,
      frameType: record.frameType,
    })

    // 使用 Adapter 构建请求
    const { url, method, headers, body } = adapter.buildGenerateRequest(config, {
      id: record.id,
      model: record.model,
      prompt: record.prompt,
      negativePrompt: record.negativePrompt,
      size: record.size,
      sampleImageSize: record.sampleImageSize,
      quality: record.quality,
      style: record.style,
      seed: record.seed,
      cfgScale: record.cfgScale,
      frameType: record.frameType,
      referenceImages: resolvedReferenceImages ? JSON.stringify(resolvedReferenceImages) : null,
      mask: record.mask,
      numberOfImages: record.steps,
      outputFormat: record.outputFormat,
      outputCompression: record.outputCompression,
      background: record.background,
      moderation: record.moderation,
      responseFormat: record.responseFormat,
      watermark: record.watermark,
      stream: record.stream,
      officialFallback: record.officialFallback,
      googleSearch: record.googleSearch,
      googleImageSearch: record.googleImageSearch,
      sequentialImageGeneration: record.sequentialImageGeneration,
      sequentialImageGenerationOptions: record.sequentialImageGenerationOptions,
      optimizePromptOptions: record.optimizePromptOptions,
      tools: record.tools,
    })
    logTaskProgress('ImageTask', 'request', {
      id,
      provider: config.provider,
      method,
      url: redactUrl(url),
      model: record.model,
    })
    logTaskPayload('ImageTask', 'request payload', {
      id,
      method,
      url,
      headers,
      body,
    })

    const result = await fetchProviderJson(url, {
      method,
      headers,
      body: JSON.stringify(body),
    }, {
      id,
      provider: config.provider,
      url,
    })
    logTaskPayload('ImageTask', 'response payload', {
      id,
      provider: config.provider,
      result,
    })

    const { isAsync, taskId, imageUrl } = adapter.parseGenerateResponse(result)

    if (!isAsync && imageUrl) {
      logTaskProgress('ImageTask', 'sync-complete', { id, imageUrl })
      await handleImageCompleteMany(id, config, extractImageUrls(adapter, result, imageUrl), userId)
      return
    }

    if (!isAsync && !imageUrl) {
      // 同步模式但无 URL（Gemini 等返回 base64）
      const b64List = extractImageBase64List(adapter, result)
      if (b64List.length) {
        logTaskProgress('ImageTask', 'sync-base64-complete', { id, count: b64List.length, mimeType: b64List[0]?.mimeType })
        await handleImageCompleteBase64Many(id, config, b64List, userId)
        return
      }
      throw new Error('No image URL or base64 data in response')
    }

    // 异步模式：更新 taskId，开始轮询
    await updateImageGeneration(id, { taskId, status: 'processing', updatedAt: now() }, userId)
    logTaskProgress('ImageTask', 'poll-start', { id, taskId, provider: config.provider })
    pollImageTask(id, config, taskId!, userId)
  } catch (err: any) {
    logTaskError('ImageTask', 'process', { id, provider: config.provider, error: err.message })
    await updateImageGeneration(id, { status: 'failed', errorMsg: err.message, updatedAt: now() }, userId)
  }
}

async function fetchProviderJson(
  url: string,
  init: RequestInit,
  context: { id: number; provider: string; url: string },
) {
  let lastError: any
  for (let attempt = 1; attempt <= IMAGE_FETCH_MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url, {
        ...init,
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      })
      const text = await resp.text()
      if (!resp.ok) {
        const error: any = new Error(`API error ${resp.status}: ${text}`)
        error.status = resp.status
        if (!isRetryableStatus(resp.status) || attempt >= IMAGE_FETCH_MAX_ATTEMPTS) throw error
        lastError = error
        logTaskWarn('ImageTask', 'request-retry', {
          id: context.id,
          provider: context.provider,
          attempt,
          status: resp.status,
          url: redactUrl(context.url),
        })
        await sleep(retryDelayMs(attempt))
        continue
      }
      return text ? JSON.parse(text) : {}
    } catch (err: any) {
      lastError = err
      if (!isTransientFetchError(err) || attempt >= IMAGE_FETCH_MAX_ATTEMPTS) throw err
      logTaskWarn('ImageTask', 'request-retry', {
        id: context.id,
        provider: context.provider,
        attempt,
        error: err.message,
        cause: err.cause?.message || err.cause?.code,
        url: redactUrl(context.url),
      })
      await sleep(retryDelayMs(attempt))
    }
  }
  throw lastError
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 425 || status === 429 || status >= 500
}

function isTransientFetchError(error: any) {
  if (error?.name === 'AbortError' || error?.name === 'TimeoutError') return true
  if (error?.message === 'fetch failed') return true
  const code = error?.cause?.code || error?.code
  return ['UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_BODY_TIMEOUT', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)
}

function retryDelayMs(attempt: number) {
  return attempt * 10_000
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function normalizeReferenceImages(raw: string | null | undefined): Promise<string[]> {
  if (!raw) return []
  let refs: string[] = []
  try {
    refs = JSON.parse(raw)
  } catch {
    refs = []
  }

  const deduped = Array.from(
    new Set(
      refs
        .map((item) => String(item || '').trim())
        .filter(Boolean),
    ),
  )

  const normalized = await Promise.all(deduped.map(async (value) => {
    if (value.startsWith('data:image/')) return value
    if (value.startsWith('static/') || value.startsWith('/static/')) {
      const localPath = value.startsWith('/static/') ? value.slice(1) : value
      try {
        return await readImageAsCompressedDataUrl(localPath, {
          maxWidth: 768,
          maxHeight: 768,
          quality: 68,
        })
      } catch (err) {
        logTaskWarn('ImageTask', 'reference-read-failed', { path: localPath, error: (err as Error).message })
        return null
      }
    }
    if (/^https?:\/\//i.test(value)) return value
    logTaskWarn('ImageTask', 'reference-ignored-unsupported', { value })
    return null
  }))

  return normalized.filter((item): item is string => !!item).slice(0, 16)
}

async function pollImageTask(id: number, config: AIConfig, taskId: string, userId?: string) {
  const adapter = getImageAdapter(config.provider)
  const startedAt = Date.now()
  const maxDurationMs = 600_000

  for (let i = 0; i < 120; i++) {
    if (Date.now() - startedAt >= maxDurationMs) {
      logTaskError('ImageTask', 'poll-timeout', { id, taskId, error: 'Polling exceeded 10 minutes' })
      await updateImageGeneration(id, { status: 'failed', errorMsg: 'Timeout: Polling exceeded 10 minutes', updatedAt: now() }, userId)
      return
    }
    await new Promise(r => setTimeout(r, 5000))
    if (Date.now() - startedAt >= maxDurationMs) {
      logTaskError('ImageTask', 'poll-timeout', { id, taskId, error: 'Polling exceeded 10 minutes' })
      await updateImageGeneration(id, { status: 'failed', errorMsg: 'Timeout: Polling exceeded 10 minutes', updatedAt: now() }, userId)
      return
    }
    try {
      const { url, method, headers } = adapter.buildPollRequest(config, taskId)
      logTaskProgress('ImageTask', 'poll-request', {
        id,
        taskId,
        provider: config.provider,
        method,
        url: redactUrl(url),
        attempt: i + 1,
      })
      const remainingMs = Math.max(1_000, maxDurationMs - (Date.now() - startedAt))
      const resp = await fetch(url, {
        method,
        headers,
        signal: AbortSignal.timeout(remainingMs),
      })
      if (!resp.ok) continue
      const result = await resp.json() as any

      const pollResp = adapter.parsePollResponse(result)

      if (pollResp.status === 'completed' && pollResp.imageUrl) {
        logTaskSuccess('ImageTask', 'poll-complete', { id, taskId, imageUrl: pollResp.imageUrl })
        await handleImageCompleteMany(id, config, extractImageUrls(adapter, result, pollResp.imageUrl), userId)
        return
      }
      if (pollResp.status === 'completed' && adapter.provider === 'gemini') {
        // Gemini 可能返回 base64
        const b64List = extractImageBase64List(adapter, result)
        if (b64List.length) {
          logTaskSuccess('ImageTask', 'poll-base64-complete', { id, taskId, count: b64List.length, mimeType: b64List[0]?.mimeType })
          await handleImageCompleteBase64Many(id, config, b64List, userId)
          return
        }
      }
      if (pollResp.status === 'failed') {
        logTaskError('ImageTask', 'poll-failed', { id, taskId, error: pollResp.error || 'Generation failed' })
        throw new Error(pollResp.error || 'Generation failed')
      }
    } catch (err: any) {
      if (i === 119 || Date.now() - startedAt >= maxDurationMs) {
        logTaskError('ImageTask', 'poll-timeout', { id, taskId, error: err.message })
        await updateImageGeneration(id, { status: 'failed', errorMsg: `Timeout: ${err.message}`, updatedAt: now() }, userId)
        return
      }
      logTaskWarn('ImageTask', 'poll-retry', { id, taskId, attempt: i + 1, error: err.message })
    }
  }
}

function extractImageUrls(adapter: ReturnType<typeof getImageAdapter>, result: any, fallback?: string): string[] {
  const urls = adapter.extractImageUrls?.(result) || []
  return urls.length ? urls : (fallback ? [fallback] : [])
}

function extractImageBase64List(adapter: ReturnType<typeof getImageAdapter>, result: any): Array<{ data: string; mimeType: string }> {
  const list = adapter.extractImageBase64List?.(result) || []
  if (list.length) return list
  const one = adapter.extractImageBase64(result)
  return one ? [one] : []
}

async function cloneImageRecord(id: number, localPath: string, imageUrl: string | null, provider: string, userId?: string, status = 'completed') {
  const record = await findImageGeneration(id)
  if (!record) return null
  const ts = now()
  return insertImageGeneration({
    storyboardId: record.storyboardId,
    dramaId: record.dramaId,
    sceneId: record.sceneId,
    characterId: record.characterId,
    propId: record.propId,
    imageType: record.imageType,
    frameType: record.frameType,
    provider,
    prompt: record.prompt,
    negativePrompt: record.negativePrompt,
    model: record.model,
    size: record.size,
    sampleImageSize: record.sampleImageSize,
    quality: record.quality,
    style: record.style,
    steps: record.steps,
    cfgScale: record.cfgScale,
    seed: record.seed,
    imageUrl,
    localPath,
    status,
    referenceImages: record.referenceImages,
    createdAt: record.createdAt || ts,
    updatedAt: ts,
    completedAt: ts,
  }, userId)
}

async function chargeCompletedImage(id: number, config: AIConfig, record: any | null | undefined, userId?: string) {
  if (!record) return
  await chargeCreditsAsync({
    userId,
    serviceType: 'image',
    model: record.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    resolution: record.sampleImageSize || record.size,
    quantity: record.steps || 1,
    taskType: 'image',
    relatedTaskId: id,
    description: '图片生成消费（已确认）',
    metadata: {
      storyboardId: record.storyboardId || null,
      sceneId: record.sceneId || null,
      characterId: record.characterId || null,
    },
  })
}

async function handleImageCompleteMany(id: number, config: AIConfig, imageUrls: string[], userId?: string) {
  const urls = imageUrls.length ? imageUrls : []
  if (!urls.length) throw new Error('No image URLs in response')
  const localPaths = await Promise.all(urls.map(url => downloadFile(url, 'images')))
  await handleImageCompleteLocal(id, config, localPaths[0], urls[0], userId)
  for (let i = 1; i < localPaths.length; i++) {
    await cloneImageRecord(id, localPaths[i], urls[i] || null, config.provider, userId)
  }
}

async function handleImageCompleteBase64Many(id: number, config: AIConfig, images: Array<{ data: string; mimeType: string }>, userId?: string) {
  if (!images.length) throw new Error('No base64 images in response')
  const localPaths = await Promise.all(images.map(image => saveBase64Image(image.data, image.mimeType, 'images')))
  await handleImageCompleteLocal(id, config, localPaths[0], null, userId)
  for (let i = 1; i < localPaths.length; i++) {
    await cloneImageRecord(id, localPaths[i], null, config.provider, userId)
  }
}

async function handleImageCompleteLocalMany(id: number, config: AIConfig, localPaths: string[], userId?: string) {
  if (!localPaths.length) throw new Error('No local images in response')
  await handleImageCompleteLocal(id, config, localPaths[0], null, userId)
  for (let i = 1; i < localPaths.length; i++) {
    await cloneImageRecord(id, localPaths[i], null, config.provider, userId)
  }
}

async function handleImageComplete(id: number, provider: string, imageUrl: string) {
  const localPath = await downloadFile(imageUrl, 'images')
  const record = await findImageGeneration(id)

  await updateImageGeneration(id, { imageUrl, localPath, status: 'completed', updatedAt: now() })
  logTaskSuccess('ImageTask', 'downloaded', { id, provider, localPath })

  // 更新关联表
  if (record?.storyboardId) {
    const sbUpdate: Record<string, any> = { updatedAt: now() }
    if (record.frameType === 'first_frame') sbUpdate.firstFrameImage = localPath
    else if (record.frameType === 'last_frame') sbUpdate.lastFrameImage = localPath
    else if (record.frameType === 'key_frame' || record.frameType === 'action_sequence') sbUpdate.composedImage = localPath
    else sbUpdate.composedImage = localPath
    await updateGeneratedStoryboard(record.storyboardId, sbUpdate)
  }
  if (record?.characterId) {
    await updateGeneratedCharacter(record.characterId, { imageUrl: localPath, updatedAt: now() })
  }
  if (record?.sceneId) {
    await updateGeneratedScene(record.sceneId, { imageUrl: localPath, status: 'completed', updatedAt: now() })
  }
}

async function handleImageCompleteBase64(id: number, provider: string, base64Data: string, mimeType: string) {
  const localPath = await saveBase64Image(base64Data, mimeType, 'images')
  const record = await findImageGeneration(id)

  await updateImageGeneration(id, { localPath, status: 'completed', updatedAt: now() })
  logTaskSuccess('ImageTask', 'saved-base64', { id, provider, mimeType, localPath })

  // 更新关联表
  if (record?.storyboardId) {
    const sbUpdate: Record<string, any> = { updatedAt: now() }
    if (record.frameType === 'first_frame') sbUpdate.firstFrameImage = localPath
    else if (record.frameType === 'last_frame') sbUpdate.lastFrameImage = localPath
    else if (record.frameType === 'key_frame' || record.frameType === 'action_sequence') sbUpdate.composedImage = localPath
    else sbUpdate.composedImage = localPath
    await updateGeneratedStoryboard(record.storyboardId, sbUpdate)
  }
  if (record?.characterId) {
    await updateGeneratedCharacter(record.characterId, { imageUrl: localPath, updatedAt: now() })
  }
  if (record?.sceneId) {
    await updateGeneratedScene(record.sceneId, { imageUrl: localPath, status: 'completed', updatedAt: now() })
  }
}

async function handleImageCompleteLocal(id: number, config: AIConfig, localPath: string, imageUrl?: string | null, userId?: string) {
  const record = await findImageGeneration(id)
  await chargeCompletedImage(id, config, record, userId)

  await updateImageGeneration(id, { imageUrl: imageUrl || undefined, localPath, status: 'completed', updatedAt: now(), completedAt: now() }, userId)
  logTaskSuccess('ImageTask', 'saved-local', { id, provider: config.provider, localPath })

  if (record?.storyboardId) {
    const sbUpdate: Record<string, any> = { updatedAt: now() }
    if (record.frameType === 'first_frame') sbUpdate.firstFrameImage = localPath
    else if (record.frameType === 'last_frame') sbUpdate.lastFrameImage = localPath
    else if (record.frameType === 'key_frame' || record.frameType === 'action_sequence') sbUpdate.composedImage = localPath
    else sbUpdate.composedImage = localPath
    await updateGeneratedStoryboard(record.storyboardId, sbUpdate, userId)
  }
  if (record?.characterId) {
    await updateGeneratedCharacter(record.characterId, { imageUrl: localPath, updatedAt: now() }, userId)
  }
  if (record?.sceneId) {
    await updateGeneratedScene(record.sceneId, { imageUrl: localPath, status: 'completed', updatedAt: now() }, userId)
  }
}
