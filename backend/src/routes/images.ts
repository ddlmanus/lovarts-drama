import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, badRequest, notFound } from '../utils/response.js'
import { generateImage } from '../services/image-generation.js'
import { logTaskError, logTaskPayload, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

// POST /images — Generate image
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.prompt) return badRequest(c, 'prompt is required')
  const userId = currentAuthUserId(c)

  try {
    let configId: number | undefined = body.model_config_id ?? body.modelConfigId ?? body.config_id
    if (body.storyboard_id) {
      const [sb] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, Number(body.storyboard_id))).execute()
      if (sb) {
        const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).execute()
        if (ep?.imageConfigId != null) configId = ep.imageConfigId
      }
    }

    logTaskStart('ImageAPI', 'generate', {
      storyboardId: body.storyboard_id,
      sceneId: body.scene_id,
      characterId: body.character_id,
      dramaId: body.drama_id,
      frameType: body.frame_type,
    })
    logTaskPayload('ImageAPI', 'request body', body)
    const id = await generateImage({
      storyboardId: body.storyboard_id,
      dramaId: body.drama_id,
      sceneId: body.scene_id,
      characterId: body.character_id,
      prompt: body.prompt,
      model: body.model,
      size: body.size,
      sampleImageSize: body.sample_image_size ?? body.sampleImageSize ?? body.resolution ?? body.image_size ?? body.imageSize,
      quality: body.quality,
      style: body.style,
      referenceImages: body.reference_images ?? body.image_urls ?? body.imageUrls,
      mask: body.mask_url || body.maskUrl || body.mask || body.mask_image || body.maskImage,
      numberOfImages: body.number_of_images ?? body.numberOfImages ?? body.sample_count ?? body.sampleCount,
      outputFormat: body.output_format ?? body.outputFormat,
      outputCompression: body.output_compression ?? body.outputCompression,
      background: body.background,
      moderation: body.moderation,
      inputFidelity: body.input_fidelity ?? body.inputFidelity,
      partialImages: body.partial_images ?? body.partialImages,
      responseFormat: body.response_format ?? body.responseFormat,
      watermark: body.watermark,
      stream: body.stream,
      officialFallback: body.official_fallback ?? body.officialFallback,
      googleSearch: body.google_search ?? body.googleSearch,
      googleImageSearch: body.google_image_search ?? body.googleImageSearch,
      sequentialImageGeneration: body.sequential_image_generation ?? body.sequentialImageGeneration,
      sequentialImageGenerationOptions: body.sequential_image_generation_options ?? body.sequentialImageGenerationOptions,
      optimizePromptOptions: body.optimize_prompt_options ?? body.optimizePromptOptions,
      tools: body.tools,
      frameType: body.frame_type,
      configId,
      userProviderId: body.user_provider_id ?? body.userProviderId,
      userId,
    })

    const [record] = await db.select().from(schema.imageGenerations)
      .where(eq(schema.imageGenerations.id, id)).execute()
    logTaskSuccess('ImageAPI', 'generate', { generationId: id, provider: record?.provider })
    return created(c, record)
  } catch (err: any) {
    logTaskError('ImageAPI', 'generate', { error: err.message })
    return badRequest(c, err.message)
  }
})

// GET /images/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const [row] = await db.select().from(schema.imageGenerations)
    .where(eq(schema.imageGenerations.id, id)).execute()
  if (!row || row.createdBy !== userId) return notFound(c, 'image not found')
  return success(c, row)
})

// GET /images — List by storyboard_id or drama_id
app.get('/', async (c) => {
  const storyboardId = c.req.query('storyboard_id')
  const dramaId = c.req.query('drama_id')
  const userId = currentAuthUserId(c)

  let rows = await db.select().from(schema.imageGenerations).execute()
  rows = rows.filter(r => r.createdBy === userId)

  if (storyboardId) rows = rows.filter(r => r.storyboardId === Number(storyboardId))
  if (dramaId) rows = rows.filter(r => r.dramaId === Number(dramaId))

  return success(c, rows)
})

// DELETE /images/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = currentAuthUserId(c)
  const [row] = await db.select().from(schema.imageGenerations)
    .where(eq(schema.imageGenerations.id, id)).execute()
  if (!row || row.createdBy !== userId) return notFound(c, 'image not found')
  await db.delete(schema.imageGenerations).where(eq(schema.imageGenerations.id, id)).execute()
  return success(c)
})

export default app
