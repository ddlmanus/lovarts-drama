import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, badRequest, now } from '../utils/response.js'
import { toSnakeCaseArray } from '../utils/transform.js'
import { generateImage } from '../services/image-generation.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

function buildSceneImagePrompt(scene: typeof schema.scenes.$inferSelect) {
  const parts = [
    scene.location ? `场景地点：${scene.location}` : '',
    scene.time ? `时间：${scene.time}` : '',
    scene.prompt ? `场景描述与画面要求：${scene.prompt}` : '',
  ].filter(Boolean)

  return [
    parts.join('\n'),
    '请根据以上场景卡片信息生成影视级场景背景图。',
    '要求：空间环境清晰，符合地点、时间、光线、氛围和美术风格，电影级构图，高质量，细节丰富，不要出现文字、水印、人物特写或无关元素。',
  ].join('\n')
}

// GET /scenes/library
app.get('/library', async (c) => {
  const q = String(c.req.query('q') || '').trim().toLowerCase()
  const rows = db.select().from(schema.sceneLibrary).all()
    .filter(row => !row.deletedAt)
    .filter(row => {
      if (!q) return true
      return [row.location, row.time, row.prompt]
        .some(value => String(value || '').toLowerCase().includes(q))
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return success(c, toSnakeCaseArray(rows))
})

// POST /scenes
app.post('/', async (c) => {
  const body = await c.req.json()
  const ts = now()
  const res = db.insert(schema.scenes).values({
    dramaId: body.drama_id,
    episodeId: body.episode_id,
    location: body.location,
    time: body.time || '',
    prompt: body.prompt || body.location,
    createdAt: ts,
    updatedAt: ts,
  }).run()
  const sceneId = Number(res.lastInsertRowid)
  if (body.episode_id) {
    db.insert(schema.episodeScenes).values({
      episodeId: Number(body.episode_id),
      sceneId,
      createdAt: ts,
    }).run()
  }
  const [result] = db.select().from(schema.scenes)
    .where(eq(schema.scenes.id, sceneId)).all()
  return created(c, result)
})

// POST /scenes/:id/save-to-library
app.post('/:id/save-to-library', async (c) => {
  const id = Number(c.req.param('id'))
  const [scene] = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).all()
  if (!scene || scene.deletedAt) return badRequest(c, 'Scene not found')

  const ts = now()
  const result = db.insert(schema.sceneLibrary).values({
    location: scene.location,
    time: scene.time || '',
    prompt: scene.prompt || '',
    imageUrl: scene.imageUrl || '',
    sourceSceneId: scene.id,
    createdAt: ts,
    updatedAt: ts,
  }).run()
  return success(c, { id: Number(result.lastInsertRowid) })
})

// POST /scenes/library/:id/apply
app.post('/library/:id/apply', async (c) => {
  const libraryId = Number(c.req.param('id'))
  const body = await c.req.json()
  const dramaId = Number(body.drama_id ?? body.dramaId)
  const episodeId = Number(body.episode_id ?? body.episodeId)
  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (!episodeId) return badRequest(c, 'episode_id is required')

  const [item] = db.select().from(schema.sceneLibrary).where(eq(schema.sceneLibrary.id, libraryId)).all()
  if (!item || item.deletedAt) return badRequest(c, 'Library scene not found')

  const ts = now()
  const result = db.insert(schema.scenes).values({
    dramaId,
    episodeId,
    location: item.location,
    time: item.time || '',
    prompt: item.prompt || item.location,
    imageUrl: item.imageUrl || '',
    createdAt: ts,
    updatedAt: ts,
  }).run()
  const sceneId = Number(result.lastInsertRowid)
  db.insert(schema.episodeScenes).values({
    episodeId,
    sceneId,
    createdAt: ts,
  }).run()
  return success(c, { id: sceneId })
})

// PUT /scenes/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: Record<string, any> = { updatedAt: now() }
  if (body.location !== undefined) updates.location = body.location
  if (body.time !== undefined) updates.time = body.time
  if (body.prompt !== undefined) updates.prompt = body.prompt
  if (body.image_url !== undefined) updates.imageUrl = body.image_url
  else if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl
  db.update(schema.scenes).set(updates).where(eq(schema.scenes.id, id)).run()
  return success(c)
})

// POST /scenes/:id/generate-image
app.post('/:id/generate-image', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const [scene] = db.select().from(schema.scenes).where(eq(schema.scenes.id, id)).all()
  if (!scene) return badRequest(c, 'Scene not found')
  if (!body.episode_id) return badRequest(c, 'episode_id is required')
  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).all()
  if (!ep) return badRequest(c, 'Episode not found')

  const prompt = buildSceneImagePrompt(scene)
  try {
    logTaskStart('SceneImage', 'generate', { sceneId: id, episodeId: ep.id, dramaId: scene.dramaId, location: scene.location })
    db.update(schema.scenes).set({ status: 'processing', updatedAt: now() }).where(eq(schema.scenes.id, id)).run()
    const genId = await generateImage({
      sceneId: id,
      dramaId: scene.dramaId,
      prompt,
      model: body.model,
      configId: body.config_id ?? ep.imageConfigId ?? undefined,
      userId: currentAuthUserId(c),
    })
    logTaskSuccess('SceneImage', 'generate', { sceneId: id, generationId: genId })
    return success(c, { image_generation_id: genId })
  } catch (err: any) {
    logTaskError('SceneImage', 'generate', { sceneId: id, error: err.message })
    db.update(schema.scenes).set({ status: 'failed', updatedAt: now() }).where(eq(schema.scenes.id, id)).run()
    return badRequest(c, err.message)
  }
})

// POST /scenes/batch-generate-images
app.post('/batch-generate-images', async (c) => {
  const body = await c.req.json()
  const ids: number[] = body.scene_ids || []
  if (!body.episode_id) return badRequest(c, 'episode_id is required')
  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).all()
  if (!ep) return badRequest(c, 'Episode not found')

  const results: Array<{ scene_id: number; image_generation_id: number }> = []
  const failed: Array<{ scene_id: number; message: string }> = []
  for (const sid of ids) {
    const [scene] = db.select().from(schema.scenes).where(eq(schema.scenes.id, sid)).all()
    if (!scene) {
      failed.push({ scene_id: sid, message: 'Scene not found' })
      continue
    }
    const prompt = buildSceneImagePrompt(scene)
    try {
      db.update(schema.scenes).set({ status: 'processing', updatedAt: now() }).where(eq(schema.scenes.id, sid)).run()
      const genId = await generateImage({
        sceneId: sid,
        dramaId: scene.dramaId,
        prompt,
        model: body.model,
        configId: body.config_id ?? ep.imageConfigId ?? undefined,
        userId: currentAuthUserId(c),
      })
      results.push({ scene_id: sid, image_generation_id: genId })
    } catch (err: any) {
      db.update(schema.scenes).set({ status: 'failed', updatedAt: now() }).where(eq(schema.scenes.id, sid)).run()
      failed.push({ scene_id: sid, message: err.message || 'Generation failed' })
    }
  }

  logTaskSuccess('SceneImage', 'batch-generate', { episodeId: ep.id, requested: ids.length, started: results.length, failed: failed.length })
  return success(c, {
    count: results.length,
    ids: results.map(item => item.image_generation_id),
    items: results,
    failed,
  })
})

// POST /scenes/:id/delete
app.post('/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const episodeId = Number(body.episode_id ?? body.episodeId)
  if (episodeId) {
    db.delete(schema.episodeScenes)
      .where(and(eq(schema.episodeScenes.sceneId, id), eq(schema.episodeScenes.episodeId, episodeId)))
      .run()
  }
  db.update(schema.scenes).set({ deletedAt: now(), updatedAt: now() }).where(eq(schema.scenes.id, id)).run()
  return success(c)
})

// DELETE /scenes/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  db.update(schema.scenes).set({ deletedAt: now(), updatedAt: now() }).where(eq(schema.scenes.id, id)).run()
  return success(c)
})

export default app
