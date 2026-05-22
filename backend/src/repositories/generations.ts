import { schema } from '../db/index.js'
import { insertId, mysqlExec, mysqlOne, stringifyJson, toIso, toMysqlDateTime } from './runtime.js'

function cleanUndefined<T extends Record<string, any>>(value: T) {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T
}

function fromMysqlImage(row: any) {
  if (!row) return null
  return {
    id: Number(row.id),
    storyboardId: row.storyboard_id == null ? null : Number(row.storyboard_id),
    dramaId: row.drama_id == null ? null : Number(row.drama_id),
    sceneId: row.scene_id == null ? null : Number(row.scene_id),
    characterId: row.character_id == null ? null : Number(row.character_id),
    propId: row.prop_id == null ? null : Number(row.prop_id),
    imageType: row.image_type,
    frameType: row.frame_type,
    provider: row.provider,
    prompt: row.prompt,
    negativePrompt: row.negative_prompt,
    model: row.model,
    size: row.size,
    sampleImageSize: row.sample_image_size,
    quality: row.quality,
    style: row.style,
    steps: row.steps == null ? null : Number(row.steps),
    cfgScale: row.cfg_scale == null ? null : Number(row.cfg_scale),
    seed: row.seed == null ? null : Number(row.seed),
    outputFormat: row.output_format,
    responseFormat: row.response_format,
    watermark: row.watermark == null ? null : Boolean(row.watermark),
    stream: row.stream == null ? null : Boolean(row.stream),
    officialFallback: row.official_fallback == null ? null : Boolean(row.official_fallback),
    outputCompression: row.output_compression == null ? null : Number(row.output_compression),
    background: row.background,
    moderation: row.moderation,
    inputFidelity: row.input_fidelity,
    partialImages: row.partial_images == null ? null : Number(row.partial_images),
    googleSearch: row.google_search == null ? null : Boolean(row.google_search),
    googleImageSearch: row.google_image_search == null ? null : Boolean(row.google_image_search),
    sequentialImageGeneration: row.sequential_image_generation,
    sequentialImageGenerationOptions: typeof row.sequential_image_generation_options === 'string' ? row.sequential_image_generation_options : stringifyJson(row.sequential_image_generation_options),
    optimizePromptOptions: typeof row.optimize_prompt_options === 'string' ? row.optimize_prompt_options : stringifyJson(row.optimize_prompt_options),
    tools: typeof row.tools === 'string' ? row.tools : stringifyJson(row.tools),
    imageUrl: row.image_url,
    minioUrl: row.minio_url,
    localPath: row.local_path,
    status: row.status,
    taskId: row.task_id,
    errorMsg: row.error_msg,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    referenceImages: typeof row.reference_images === 'string' ? row.reference_images : stringifyJson(row.reference_images),
    mask: row.mask,
    createdAt: toIso(row.created_at) || '',
    updatedAt: toIso(row.updated_at) || '',
    completedAt: toIso(row.completed_at),
  }
}

function fromMysqlVideo(row: any) {
  if (!row) return null
  return {
    id: Number(row.id),
    storyboardId: row.storyboard_id == null ? null : Number(row.storyboard_id),
    dramaId: row.drama_id == null ? null : Number(row.drama_id),
    provider: row.provider,
    prompt: row.prompt,
    model: row.model,
    imageGenId: row.image_gen_id == null ? null : Number(row.image_gen_id),
    referenceMode: row.reference_mode,
    imageUrl: row.image_url,
    firstFrameUrl: row.first_frame_url,
    lastFrameUrl: row.last_frame_url,
    referenceImageUrls: typeof row.reference_image_urls === 'string' ? row.reference_image_urls : stringifyJson(row.reference_image_urls),
    referenceVideoUrls: typeof row.reference_video_urls === 'string' ? row.reference_video_urls : stringifyJson(row.reference_video_urls),
    referenceAudioUrls: typeof row.reference_audio_urls === 'string' ? row.reference_audio_urls : stringifyJson(row.reference_audio_urls),
    duration: row.duration == null ? null : Number(row.duration),
    fps: row.fps == null ? null : Number(row.fps),
    resolution: row.resolution,
    aspectRatio: row.aspect_ratio,
    frames: row.frames == null ? null : Number(row.frames),
    generateAudio: row.generate_audio == null ? null : Boolean(row.generate_audio),
    cameraFixed: row.camera_fixed == null ? null : Boolean(row.camera_fixed),
    watermark: row.watermark == null ? null : Boolean(row.watermark),
    returnLastFrame: row.return_last_frame == null ? null : Boolean(row.return_last_frame),
    serviceTier: row.service_tier,
    executionExpiresAfter: row.execution_expires_after == null ? null : Number(row.execution_expires_after),
    callbackUrl: row.callback_url,
    draft: row.draft == null ? null : Boolean(row.draft),
    draftTaskId: row.draft_task_id,
    tools: typeof row.tools === 'string' ? row.tools : stringifyJson(row.tools),
    style: row.style,
    motionLevel: row.motion_level == null ? null : Number(row.motion_level),
    cameraMotion: row.camera_motion,
    seed: row.seed == null ? null : Number(row.seed),
    videoUrl: row.video_url,
    minioUrl: row.minio_url,
    localPath: row.local_path,
    status: row.status,
    taskId: row.task_id,
    errorMsg: row.error_msg,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    createdAt: toIso(row.created_at) || '',
    updatedAt: toIso(row.updated_at) || '',
    completedAt: toIso(row.completed_at),
  }
}

export async function insertImageGeneration(values: typeof schema.imageGenerations.$inferInsert, userId?: string) {
  const result = await mysqlExec(`
    INSERT INTO image_generations
    (storyboard_id, drama_id, scene_id, character_id, prop_id, image_type, frame_type, provider, prompt, negative_prompt, model, size,
     sample_image_size, quality, style, steps, cfg_scale, seed, output_format, response_format, watermark, stream, official_fallback,
     output_compression, background, moderation, input_fidelity, partial_images, google_search, google_image_search,
     sequential_image_generation, sequential_image_generation_options, optimize_prompt_options, tools,
     image_url, local_path, status, task_id, error_msg, reference_images, mask,
     created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON),
      ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, 0)
  `, [
    values.storyboardId ?? null, values.dramaId ?? null, values.sceneId ?? null, values.characterId ?? null, values.propId ?? null,
    values.imageType ?? null, values.frameType ?? null, values.provider ?? null, values.prompt ?? null, values.negativePrompt ?? null,
    values.model ?? null, values.size ?? null, values.sampleImageSize ?? null, values.quality ?? null, values.style ?? null,
    values.steps ?? null, values.cfgScale ?? null, values.seed ?? null,
    (values as any).outputFormat ?? null, (values as any).responseFormat ?? null, (values as any).watermark ?? null, (values as any).stream ?? null,
    (values as any).officialFallback ?? null,
    (values as any).outputCompression ?? null, (values as any).background ?? null, (values as any).moderation ?? null,
    (values as any).inputFidelity ?? null, (values as any).partialImages ?? null,
    (values as any).googleSearch ?? null, (values as any).googleImageSearch ?? null,
    (values as any).sequentialImageGeneration ?? null, (values as any).sequentialImageGenerationOptions || '{}',
    (values as any).optimizePromptOptions || '{}', (values as any).tools || '[]',
    values.imageUrl ?? null, values.localPath ?? null,
    values.status ?? 'pending', values.taskId ?? null, values.errorMsg ?? null, values.referenceImages || '[]', (values as any).mask ?? null,
    userId || 'system', toMysqlDateTime(values.createdAt), userId || 'system', toMysqlDateTime(values.updatedAt),
  ])
  return insertId(result)
}

export async function findImageGeneration(id: number) {
  return fromMysqlImage(await mysqlOne('SELECT * FROM image_generations WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]))
}

export async function updateImageGeneration(id: number, patch: Partial<typeof schema.imageGenerations.$inferInsert>, userId?: string) {
  const map: Record<string, any> = {
    imageUrl: 'image_url',
    localPath: 'local_path',
    status: 'status',
    taskId: 'task_id',
    errorMsg: 'error_msg',
    updatedAt: 'updated_at',
    completedAt: 'completed_at',
  }
  const entries = Object.entries(cleanUndefined(patch)).filter(([key]) => map[key])
  if (!entries.length) return
  await mysqlExec(`UPDATE image_generations SET ${entries.map(([key]) => `${map[key]} = ?`).join(', ')}, updated_by = ? WHERE id = ?`, [
    ...entries.map(([key, value]) => key.endsWith('At') ? toMysqlDateTime(value) : value ?? null),
    userId || 'system',
    id,
  ])
}

export async function insertVideoGeneration(values: typeof schema.videoGenerations.$inferInsert, userId?: string) {
  const result = await mysqlExec(`
    INSERT INTO video_generations
    (storyboard_id, drama_id, provider, prompt, model, reference_mode, image_url, first_frame_url, last_frame_url,
     reference_image_urls, reference_video_urls, reference_audio_urls, duration, fps, resolution, aspect_ratio, frames,
     generate_audio, camera_fixed, watermark, return_last_frame, service_tier, execution_expires_after, callback_url,
     draft, draft_task_id, tools, seed, status, task_id, error_msg,
     created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), CAST(? AS JSON),
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `, [
    values.storyboardId ?? null, values.dramaId ?? null, values.provider ?? null, values.prompt ?? null, values.model ?? null,
    values.referenceMode ?? null, values.imageUrl ?? null, values.firstFrameUrl ?? null, values.lastFrameUrl ?? null,
    values.referenceImageUrls || '[]', (values as any).referenceVideoUrls || '[]', (values as any).referenceAudioUrls || '[]',
    values.duration ?? null, values.fps ?? null, values.resolution ?? null, values.aspectRatio ?? null, (values as any).frames ?? null,
    (values as any).generateAudio ?? null, (values as any).cameraFixed ?? null, (values as any).watermark ?? null, (values as any).returnLastFrame ?? null,
    (values as any).serviceTier ?? null, (values as any).executionExpiresAfter ?? null, (values as any).callbackUrl ?? null,
    (values as any).draft ?? null, (values as any).draftTaskId ?? null, (values as any).tools || '[]',
    values.seed ?? null, values.status ?? 'pending', values.taskId ?? null, values.errorMsg ?? null,
    userId || 'system', toMysqlDateTime(values.createdAt), userId || 'system', toMysqlDateTime(values.updatedAt),
  ])
  return insertId(result)
}

export async function findVideoGeneration(id: number) {
  return fromMysqlVideo(await mysqlOne('SELECT * FROM video_generations WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]))
}

export async function updateVideoGeneration(id: number, patch: Partial<typeof schema.videoGenerations.$inferInsert>, userId?: string) {
  const map: Record<string, any> = {
    videoUrl: 'video_url',
    localPath: 'local_path',
    status: 'status',
    taskId: 'task_id',
    errorMsg: 'error_msg',
    updatedAt: 'updated_at',
    completedAt: 'completed_at',
  }
  const entries = Object.entries(cleanUndefined(patch)).filter(([key]) => map[key])
  if (!entries.length) return
  await mysqlExec(`UPDATE video_generations SET ${entries.map(([key]) => `${map[key]} = ?`).join(', ')}, updated_by = ? WHERE id = ?`, [
    ...entries.map(([key, value]) => key.endsWith('At') ? toMysqlDateTime(value) : value ?? null),
    userId || 'system',
    id,
  ])
}

export async function updateGeneratedStoryboard(id: number, patch: Record<string, any>, userId?: string) {
  const map: Record<string, string> = {
    firstFrameImage: 'first_frame_image',
    lastFrameImage: 'last_frame_image',
    composedImage: 'composed_image',
    videoUrl: 'video_url',
    duration: 'duration',
    ttsAudioUrl: 'tts_audio_url',
    updatedAt: 'updated_at',
  }
  const entries = Object.entries(cleanUndefined(patch)).filter(([key]) => map[key])
  if (!entries.length) return
  await mysqlExec(`UPDATE storyboards SET ${entries.map(([key]) => `${map[key]} = ?`).join(', ')}, updated_by = ? WHERE id = ?`, [
    ...entries.map(([key, value]) => key.endsWith('At') ? toMysqlDateTime(value) : value ?? null),
    userId || 'system',
    id,
  ])
}

export async function updateGeneratedCharacter(id: number, patch: Record<string, any>, userId?: string) {
  await mysqlExec('UPDATE characters SET image_url = COALESCE(?, image_url), voice_sample_url = COALESCE(?, voice_sample_url), updated_by = ?, updated_at = ? WHERE id = ?', [
    patch.imageUrl ?? null, patch.voiceSampleUrl ?? null, userId || 'system', patch.updatedAt, id,
  ])
}

export async function updateGeneratedScene(id: number, patch: Record<string, any>, userId?: string) {
  await mysqlExec('UPDATE scenes SET image_url = COALESCE(?, image_url), status = COALESCE(?, status), updated_by = ?, updated_at = ? WHERE id = ?', [
    patch.imageUrl ?? null, patch.status ?? null, userId || 'system', patch.updatedAt, id,
  ])
}
