import { Hono } from 'hono'
import { desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, now, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'
import { getConfigForModelSelectionAsync } from '../services/ai.js'
import { generateZenmuxImageDirect, shouldUseZenmuxDirect } from '../services/zenmux-direct.js'
import { chargeCreditsAsync } from '../services/credits.js'
import { generateImage } from '../services/image-generation.js'
import { generateVideo } from '../services/video-generation.js'

const app = new Hono()

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function normalizeAssetUrl(value?: string | null) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/.test(raw) || raw.startsWith('/')) return raw
  return `/${raw}`
}

function normalizeStringArray(value: any) {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean)
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean)
    } catch {}
    return value.split(',').map(item => item.trim()).filter(Boolean)
  }
  return []
}

function normalizeCount(value: unknown, model: string, defaults: Record<string, any> = {}) {
  const requested = Number(value)
  const fallback = Number(defaults.numberOfImages ?? defaults.number_of_images ?? defaults.sampleCount ?? defaults.sample_count ?? 1)
  const count = Number.isFinite(requested) ? Math.floor(requested) : Math.floor(Number.isFinite(fallback) ? fallback : 1)
  return Math.max(1, Math.min(4, count || 1))
}

function serializeTask(row: typeof schema.creationTasks.$inferSelect, historyRows: Array<typeof schema.creationHistory.$inferSelect>) {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    provider: row.provider,
    model: row.model,
    prompt: row.prompt,
    status: row.status,
    progress: row.progress || 0,
    expected_count: row.expectedCount || 1,
    completed_count: row.completedCount || historyRows.length,
    aspect_ratio: row.aspectRatio,
    resolution: row.resolution,
    reference_images: parseJson(row.referenceImages, []),
    error_msg: row.errorMsg,
    created_at: row.createdAt,
    updated_at: row.updatedAt,
    completed_at: row.completedAt,
    results: historyRows.map(item => ({
      id: item.id,
      task_id: item.taskId,
      type: item.type,
      status: item.status,
      result_url: normalizeAssetUrl(item.localPath || item.resultUrl),
      local_path: item.localPath,
      mime_type: item.mimeType,
      sort_order: item.sortOrder || 0,
      error_msg: item.errorMsg,
      created_at: item.createdAt,
    })),
  }
}

async function getTask(id: number) {
  let [task] = await db.select().from(schema.creationTasks).where(eq(schema.creationTasks.id, id)).execute()
  if (!task) return null
  if (task.type === 'video') {
    await syncVideoTaskResult(task)
    ;[task] = await db.select().from(schema.creationTasks).where(eq(schema.creationTasks.id, id)).execute()
  }
  const history = (await db.select().from(schema.creationHistory)
    .where(eq(schema.creationHistory.taskId, id))
    .execute())
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || a.id - b.id)
  return serializeTask(task, history)
}

async function syncVideoTaskResult(task: typeof schema.creationTasks.$inferSelect) {
  const payload = parseJson(task.requestPayload, {})
  const genId = Number(payload.video_generation_id || 0)
  if (!genId || ['completed', 'failed'].includes(String(task.status))) return
  const [video] = await db.select().from(schema.videoGenerations).where(eq(schema.videoGenerations.id, genId)).execute()
  if (!video) return
  if (video.status === 'completed' && video.videoUrl) {
    const existing = (await db.select().from(schema.creationHistory).where(eq(schema.creationHistory.taskId, task.id)).execute())[0]
    const ts = now()
    if (!existing) {
      await db.insert(schema.creationHistory).values({
        taskId: task.id,
        userId: task.userId,
        type: 'video',
        provider: video.provider,
        model: video.model,
        prompt: video.prompt || task.prompt,
        resultUrl: video.videoUrl,
        localPath: video.videoUrl,
        mimeType: 'video/mp4',
        sortOrder: 0,
        status: 'completed',
        createdAt: ts,
      }).execute()
    }
    await updateTask(task.id, { status: 'completed', progress: 100, completedCount: 1, completedAt: ts, errorMsg: null })
  } else if (video.status === 'failed') {
    await updateTask(task.id, { status: 'failed', progress: 100, errorMsg: video.errorMsg || '视频生成失败', completedAt: now() })
  } else if (task.status !== 'processing') {
    await updateTask(task.id, { status: 'processing', progress: 45 })
  }
}

async function updateTask(id: number, patch: Partial<typeof schema.creationTasks.$inferInsert>) {
  await db.update(schema.creationTasks)
    .set({ ...patch, updatedAt: now() })
    .where(eq(schema.creationTasks.id, id))
    .execute()
}

function numberParam(...values: unknown[]) {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return Math.floor(parsed)
  }
  return null
}

function dispatchImageGeneration(config: any, body: any) {
  const provider = String(config.provider || '').trim().toLowerCase()
  if (provider === 'zenmux') {
    return generateZenmuxImageDirect(config, {
      model: config.model,
      prompt: body.prompt,
      size: body.size,
      sampleImageSize: body.sample_image_size ?? body.sampleImageSize ?? body.image_size ?? body.imageSize,
      quality: body.quality,
      style: body.style,
      referenceImages: body.reference_images,
      mask: body.mask || body.mask_image || body.maskImage || null,
      numberOfImages: body.number_of_images ?? body.numberOfImages ?? body.sample_count ?? body.sampleCount ?? body.count ?? body.n,
    })
  }
  throw new Error(`创作页图片生成暂未接入供应商 ${config.provider}`)
}

function supportsBatchImageGeneration(config: any) {
  const provider = String(config?.provider || '').toLowerCase()
  const model = String(config?.model || '').toLowerCase()
  if (provider === 'zenmux') return true
  return false
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function waitForImageGenerationRecords(genId: number, expectedCount: number) {
  let anchor: typeof schema.imageGenerations.$inferSelect | null = null
  for (let attempt = 0; attempt < 144; attempt++) {
    const [current] = await db.select().from(schema.imageGenerations).where(eq(schema.imageGenerations.id, genId)).execute()
    if (current) anchor = current
    if (current?.status === 'failed') throw new Error(current.errorMsg || '图片生成失败')
    if (current?.status === 'completed' && current.localPath) {
      const rows = (await db.select().from(schema.imageGenerations).execute())
        .filter(row =>
          row.provider === current.provider &&
          row.model === current.model &&
          row.prompt === current.prompt &&
          row.createdAt === current.createdAt &&
          row.status === 'completed' &&
          row.localPath,
        )
        .sort((a, b) => a.id - b.id)
      if (rows.length >= Math.max(1, Math.min(expectedCount, 4))) return rows.slice(0, expectedCount)
      if (rows.length) return rows
    }
    await sleep(5000)
  }
  throw new Error(anchor?.errorMsg || '图片生成超时')
}

async function runImageGenerationJob(config: any, body: any, userId: string, numberOfImages: number) {
  const genId = await generateImage({
    prompt: body.prompt,
    model: config.model,
    size: body.size,
    sampleImageSize: body.sample_image_size ?? body.sampleImageSize ?? body.resolution ?? body.image_size ?? body.imageSize,
    quality: body.quality,
    referenceImages: body.reference_images ?? body.image_urls ?? body.imageUrls,
    mask: body.mask_url || body.maskUrl || body.mask || body.mask_image || body.maskImage,
    numberOfImages,
    outputFormat: body.output_format ?? body.outputFormat,
    outputCompression: body.output_compression ?? body.outputCompression,
    background: body.background,
    moderation: body.moderation,
    inputFidelity: body.input_fidelity ?? body.inputFidelity,
    partialImages: body.partial_images ?? body.partialImages,
    responseFormat: body.response_format ?? body.responseFormat,
    officialFallback: body.official_fallback ?? body.officialFallback,
    googleSearch: body.google_search ?? body.googleSearch,
    googleImageSearch: body.google_image_search ?? body.googleImageSearch,
    configId: numberParam(body.model_config_id, body.modelConfigId) || undefined,
    userProviderId: numberParam(body.user_provider_id, body.userProviderId) || undefined,
    userId,
  })
  return waitForImageGenerationRecords(genId, numberOfImages)
}

async function processImageTask(taskId: number, body: any, userId: string) {
  try {
    await updateTask(taskId, { status: 'processing', progress: 1 })
    const config = await getConfigForModelSelectionAsync({
      serviceType: 'image',
      modelId: body.model,
      modelConfigId: numberParam(body.model_config_id, body.modelConfigId),
      userProviderId: numberParam(body.user_provider_id, body.userProviderId),
      userId,
    })
    if (!config) throw new Error('No active image AI config')
    const requestedCount = normalizeCount(body.number_of_images ?? body.numberOfImages ?? body.count ?? body.n, config.model, config.modelDefaults || {})
    if (!shouldUseZenmuxDirect('image', config, config.model)) {
      await updateTask(taskId, {
        provider: config.provider,
        model: config.model,
        status: 'processing',
        progress: 1,
        errorMsg: null,
      })
      const jobCounts = supportsBatchImageGeneration(config)
        ? [requestedCount]
        : Array.from({ length: requestedCount }, () => 1)
      const jobResults = await Promise.allSettled(
        jobCounts.map(count => runImageGenerationJob(config, body, userId, count)),
      )
      const ts = now()
      const records = jobResults
        .filter((result): result is PromiseFulfilledResult<Array<typeof schema.imageGenerations.$inferSelect>> => result.status === 'fulfilled')
        .flatMap(result => result.value)
        .slice(0, requestedCount)
      for (const [index, row] of records.entries()) {
        await db.insert(schema.creationHistory).values({
          taskId,
          userId,
          type: 'image',
          provider: row.provider || config.provider,
          model: row.model || config.model,
          prompt: row.prompt || body.prompt,
          localPath: row.localPath,
          resultUrl: row.localPath || row.imageUrl,
          sortOrder: index,
          status: 'completed',
          createdAt: ts,
        }).execute()
      }
      const failed = jobResults.filter(result => result.status === 'rejected') as PromiseRejectedResult[]
      if (!records.length && failed.length) throw new Error(failed[0].reason?.message || '图片生成失败')
      await updateTask(taskId, {
        provider: config.provider,
        model: config.model,
        status: records.length >= requestedCount ? 'completed' : 'failed',
        progress: 100,
        completedCount: records.length,
        completedAt: ts,
        errorMsg: records.length >= requestedCount ? null : `已完成 ${records.length}/${requestedCount} 张，${failed[0]?.reason?.message || '部分图片生成失败'}`,
      })
      return
    }
    await chargeCreditsAsync({
      userId,
      serviceType: 'image',
      model: config.model,
      modelConfigId: config.modelConfigId,
      billable: config.billable,
      resourceMode: config.resourceMode,
      resolution: body.sample_image_size ?? body.sampleImageSize ?? body.image_size ?? body.imageSize ?? body.size,
      quantity: requestedCount,
      taskType: 'creation_image',
      relatedTaskId: taskId,
      description: '创作页图片生成消费',
      validateOnly: true,
      metadata: {
        provider: config.provider,
        userProviderId: config.userProviderId || null,
      },
    })
    const result = await dispatchImageGeneration(config, body)
    const paths = (result.localPaths || [result.localPath]).slice(0, requestedCount)
    const ts = now()
    await chargeCreditsAsync({
      userId,
      serviceType: 'image',
      model: config.model,
      modelConfigId: config.modelConfigId,
      billable: config.billable,
      resourceMode: config.resourceMode,
      resolution: body.sample_image_size ?? body.sampleImageSize ?? body.image_size ?? body.imageSize ?? body.size,
      quantity: paths.length,
      taskType: 'creation_image',
      relatedTaskId: taskId,
      description: '创作页图片生成消费（已确认）',
      metadata: {
        provider: config.provider,
        userProviderId: config.userProviderId || null,
        actualCount: paths.length,
      },
    })
    for (const [index, localPath] of paths.entries()) {
      await db.insert(schema.creationHistory).values({
        taskId,
        userId,
        type: 'image',
        provider: config.provider,
        model: config.model,
        prompt: body.prompt,
        localPath,
        resultUrl: localPath,
        mimeType: result.mimeType,
        sortOrder: index,
        status: 'completed',
        createdAt: ts,
      }).execute()
    }
    await updateTask(taskId, {
      provider: config.provider,
      model: config.model,
      status: 'completed',
      progress: 100,
      completedCount: paths.length,
      completedAt: ts,
      errorMsg: null,
    })
  } catch (err: any) {
    const message = err?.message || '生成失败'
    await db.insert(schema.creationHistory).values({
      taskId,
      userId,
      type: 'image',
      provider: '',
      model: body.model,
      prompt: body.prompt,
      status: 'failed',
      errorMsg: message,
      sortOrder: 0,
      createdAt: now(),
    }).execute()
    await updateTask(taskId, {
      status: 'failed',
      progress: 100,
      errorMsg: message,
      completedAt: now(),
    })
  }
}

async function processVideoTask(taskId: number, body: any, userId: string) {
  try {
    await updateTask(taskId, { status: 'processing', progress: 25 })
    const genId = await generateVideo({
      prompt: body.prompt,
      model: body.model,
      referenceMode: body.reference_mode ?? body.referenceMode,
      imageUrl: body.image_url ?? body.imageUrl,
      firstFrameUrl: body.first_frame_url ?? body.firstFrameUrl,
      lastFrameUrl: body.last_frame_url ?? body.lastFrameUrl,
      referenceImageUrls: normalizeStringArray(body.reference_image_urls ?? body.image_urls ?? body.imageUrls ?? body.referenceImageUrls),
      referenceVideoUrls: normalizeStringArray(body.reference_video_urls ?? body.video_urls ?? body.videoUrls ?? body.video_url ?? body.videoUrl ?? body.referenceVideoUrls),
      referenceAudioUrls: normalizeStringArray(body.reference_audio_urls ?? body.audio_urls ?? body.referenceAudioUrls),
      duration: numberParam(body.duration) || undefined,
      fps: numberParam(body.fps) || undefined,
      mode: body.mode,
      resolution: body.resolution ?? body.quality ?? body.mode,
      aspectRatio: body.aspect_ratio ?? body.aspectRatio ?? body.size,
      frames: numberParam(body.frames) || undefined,
      seed: numberParam(body.seed) || undefined,
      generateAudio: body.generate_audio ?? body.generateAudio,
      audioSetting: body.audio_setting ?? body.audioSetting,
      cameraFixed: body.camera_fixed ?? body.cameraFixed,
      watermark: body.watermark,
      returnLastFrame: body.return_last_frame ?? body.returnLastFrame,
      serviceTier: body.service_tier ?? body.serviceTier,
      executionExpiresAfter: numberParam(body.execution_expires_after, body.executionExpiresAfter) || undefined,
      draft: body.draft,
      draftTaskId: body.draft_task_id ?? body.draftTaskId,
      tools: {
        ...(body.tools && typeof body.tools === 'object' ? body.tools : {}),
        ...(body.metadata ? { metadata: body.metadata } : {}),
        ...(body.prompt_extend !== undefined ? { prompt_extend: body.prompt_extend } : {}),
        ...(body.promptExtend !== undefined ? { promptExtend: body.promptExtend } : {}),
      },
      negativePrompt: body.negative_prompt ?? body.negativePrompt,
      enhancePrompt: body.enhance_prompt ?? body.enhancePrompt ?? body.prompt_optimizer ?? body.promptOptimizer,
      personGeneration: body.person_generation ?? body.personGeneration,
      numberOfVideos: numberParam(body.number_of_videos, body.numberOfVideos, body.sample_count, body.sampleCount) || undefined,
      configId: numberParam(body.model_config_id, body.modelConfigId) || undefined,
      userProviderId: numberParam(body.user_provider_id, body.userProviderId) || undefined,
      userId,
    })
    await updateTask(taskId, {
      status: 'processing',
      progress: 45,
      errorMsg: null,
      requestPayload: JSON.stringify({ ...body, video_generation_id: genId }),
    })
  } catch (err: any) {
    const message = err?.message || '视频生成失败'
    await db.insert(schema.creationHistory).values({
      taskId,
      userId,
      type: 'video',
      provider: '',
      model: body.model,
      prompt: body.prompt,
      status: 'failed',
      errorMsg: message,
      sortOrder: 0,
      createdAt: now(),
    }).execute()
    await updateTask(taskId, {
      status: 'failed',
      progress: 100,
      errorMsg: message,
      completedAt: now(),
    })
  }
}

app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.prompt) return badRequest(c, 'prompt is required')
  const type = String(body.type || 'image')
  if (!['image', 'video'].includes(type)) return badRequest(c, 'type is invalid')
  const userId = currentAuthUserId(c)
  const ts = now()
  const modelConfigId = numberParam(body.model_config_id, body.modelConfigId)
  const userProviderId = numberParam(body.user_provider_id, body.userProviderId)
  const selectedConfig = await getConfigForModelSelectionAsync({
    serviceType: type === 'image' ? 'image' : 'video',
    modelId: body.model,
    modelConfigId,
    userProviderId,
    userId,
  })
  if (!selectedConfig) return badRequest(c, '当前用户没有可用的模型供应商配置')
  const expectedCount = type === 'image'
    ? normalizeCount(body.number_of_images ?? body.numberOfImages ?? body.count ?? body.n, selectedConfig.model, selectedConfig.modelDefaults || {})
    : Number(body.number_of_videos ?? body.numberOfVideos ?? body.sample_count ?? body.sampleCount ?? 1) || 1
  const result = await db.insert(schema.creationTasks).values({
    userId,
    type,
    provider: selectedConfig.provider,
    model: selectedConfig.model,
    prompt: body.prompt,
    status: 'pending',
    progress: 10,
    expectedCount,
    completedCount: 0,
    aspectRatio: body.size || body.aspect_ratio || body.aspectRatio || '1:1',
    resolution: body.sample_image_size ?? body.sampleImageSize ?? body.image_size ?? body.imageSize ?? body.resolution ?? '1K',
    referenceImages: JSON.stringify(body.reference_images || body.reference_image_urls || []),
    requestPayload: JSON.stringify({ ...body, model: selectedConfig.model, model_config_id: modelConfigId, user_provider_id: userProviderId }),
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const id = Number(result.insertId)
  if (type === 'image') {
    processImageTask(id, { ...body, model: selectedConfig.model, model_config_id: modelConfigId, user_provider_id: userProviderId, number_of_images: expectedCount }, userId).catch(() => undefined)
  } else {
    processVideoTask(id, { ...body, model: selectedConfig.model, model_config_id: modelConfigId, user_provider_id: userProviderId }, userId).catch(() => undefined)
  }
  return created(c, await getTask(id))
})

app.get('/', async (c) => {
  const userId = currentAuthUserId(c)
  const rows = (await db.select().from(schema.creationTasks)
    .where(isNull(schema.creationTasks.deletedAt))
    .orderBy(desc(schema.creationTasks.createdAt))
    .execute())
    .filter(row => row.userId === userId)
    .slice(0, 80)
  return success(c, (await Promise.all(rows.map(row => getTask(row.id)))).filter(Boolean))
})

app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const task = await getTask(id)
  if (!task || task.userId !== userId) return success(c, null)
  return success(c, task)
})

app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const task = await getTask(id)
  if (!task || task.userId !== userId) return success(c)
  await updateTask(id, { deletedAt: now() })
  return success(c)
})

export default app
