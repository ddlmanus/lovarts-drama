import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, badRequest, notFound } from '../utils/response.js'
import { generateVideo } from '../services/video-generation.js'
import { logTaskError, logTaskPayload, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

// POST /videos — Generate video
app.post('/', async (c) => {
  const body = await c.req.json()
  const referenceMode = String(body.reference_mode || body.referenceMode || '').toLowerCase()
  const hasVideoInput = Boolean(
    body.video_url ||
    body.videoUrl ||
    body.video_urls ||
    body.videoUrls ||
    body.reference_video_urls ||
    body.referenceVideoUrls,
  )
  if (!body.prompt && referenceMode !== 'draft_task' && !hasVideoInput) return badRequest(c, 'prompt is required')
  const userId = currentAuthUserId(c)

  try {
    let configId: number | undefined = body.model_config_id ?? body.modelConfigId ?? body.config_id
    if (!configId && body.storyboard_id) {
      const [sb] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, Number(body.storyboard_id))).execute()
      if (sb) {
        const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).execute()
        if (ep?.videoConfigId != null) configId = ep.videoConfigId
      }
    }

    logTaskStart('VideoAPI', 'generate', {
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      referenceMode: body.reference_mode,
      duration: body.duration,
    })
    logTaskPayload('VideoAPI', 'request body', body)
    const id = await generateVideo({
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      prompt: body.prompt,
      model: body.model,
      referenceMode: body.reference_mode ?? body.referenceMode,
      imageUrl: body.image_url,
      firstFrameUrl: body.first_frame_url,
      lastFrameUrl: body.last_frame_url,
      referenceImageUrls: body.reference_image_urls ?? body.image_urls ?? body.imageUrls ?? body.referenceImageUrls,
      referenceVideoUrls: body.reference_video_urls ?? body.video_urls ?? body.videoUrls ?? body.video_url ?? body.videoUrl ?? body.referenceVideoUrls,
      referenceAudioUrls: body.reference_audio_urls ?? body.audio_urls ?? body.referenceAudioUrls,
      duration: body.duration,
      fps: body.fps,
      mode: body.mode,
      resolution: body.resolution ?? body.quality ?? body.mode,
      aspectRatio: body.aspect_ratio,
      frames: body.frames,
      seed: body.seed,
      generateAudio: body.generate_audio ?? body.generateAudio,
      audioSetting: body.audio_setting ?? body.audioSetting,
      cameraFixed: body.camera_fixed ?? body.cameraFixed,
      watermark: body.watermark,
      returnLastFrame: body.return_last_frame ?? body.returnLastFrame,
      serviceTier: body.service_tier ?? body.serviceTier,
      executionExpiresAfter: body.execution_expires_after ?? body.executionExpiresAfter,
      callbackUrl: body.callback_url ?? body.callbackUrl,
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
      numberOfVideos: body.number_of_videos ?? body.numberOfVideos ?? body.sample_count ?? body.sampleCount,
      configId,
      userProviderId: body.user_provider_id ?? body.userProviderId,
      userId,
    })

    const [record] = await db.select().from(schema.videoGenerations)
      .where(eq(schema.videoGenerations.id, id)).execute()
    logTaskSuccess('VideoAPI', 'generate', { generationId: id, provider: record?.provider })
    return created(c, record)
  } catch (err: any) {
    logTaskError('VideoAPI', 'generate', { error: err.message })
    return badRequest(c, err.message)
  }
})

// GET /videos/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const [row] = await db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.id, id)).execute()
  if (!row || row.createdBy !== userId) return notFound(c, 'video not found')
  return success(c, row)
})

// GET /videos — List by storyboard_id or drama_id
app.get('/', async (c) => {
  const storyboardId = c.req.query('storyboard_id')
  const dramaId = c.req.query('drama_id')
  const userId = currentAuthUserId(c)

  let rows = await db.select().from(schema.videoGenerations).execute()
  rows = rows.filter(r => r.createdBy === userId)

  if (storyboardId) rows = rows.filter(r => r.storyboardId === Number(storyboardId))
  if (dramaId) rows = rows.filter(r => r.dramaId === Number(dramaId))

  return success(c, rows)
})

// DELETE /videos/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const [row] = await db.select().from(schema.videoGenerations)
    .where(eq(schema.videoGenerations.id, id)).execute()
  if (!row || row.createdBy !== userId) return notFound(c, 'video not found')
  await db.delete(schema.videoGenerations).where(eq(schema.videoGenerations.id, id)).execute()
  return success(c)
})

export default app
