import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest, now } from '../utils/response.js'
import { toSnakeCaseArray } from '../utils/transform.js'
import { generateVoiceSample } from '../services/tts-generation.js'
import { generateImage } from '../services/image-generation.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

function buildCharacterImagePrompt(char: typeof schema.characters.$inferSelect) {
  const parts = [
    `角色名称：${char.name}`,
    char.gender ? `性别：${char.gender}` : '',
    char.age ? `年龄阶段：${char.age}` : '',
    char.role ? `角色身份：${char.role}` : '',
    char.appearance ? `人物外貌与画面描述：${char.appearance}` : '',
    char.description ? `背景故事与人物设定：${char.description}` : '',
    char.personality ? `性格气质：${char.personality}` : '',
  ].filter(Boolean)

  return [
    parts.join('\n'),
    '请根据以上角色卡片信息生成单人角色形象图。',
    '要求：角色主体清晰，正面或半身构图，人物特征稳定，服装、气质、时代背景与角色设定一致，高质量，细节丰富，干净背景，不要出现文字、水印、多人或无关元素。',
  ].join('\n')
}

// GET /characters/library
app.get('/library', async (c) => {
  const q = String(c.req.query('q') || '').trim().toLowerCase()
  const rows = db.select().from(schema.characterLibrary).all()
    .filter(row => !row.deletedAt)
    .filter(row => {
      if (!q) return true
      return [row.name, row.role, row.description, row.appearance, row.personality]
        .some(value => String(value || '').toLowerCase().includes(q))
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return success(c, toSnakeCaseArray(rows))
})

// POST /characters
app.post('/', async (c) => {
  const body = await c.req.json()
  const dramaId = Number(body.drama_id ?? body.dramaId)
  const episodeId = Number(body.episode_id ?? body.episodeId)
  const name = String(body.name || '').trim()
  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (!episodeId) return badRequest(c, 'episode_id is required')
  if (!name) return badRequest(c, 'name is required')

  const ts = now()
  const result = db.insert(schema.characters).values({
    dramaId,
    name,
    age: body.age || '',
    gender: body.gender || '',
    role: body.role || '',
    description: body.description || '',
    appearance: body.appearance || '',
    personality: body.personality || '',
    createdAt: ts,
    updatedAt: ts,
  }).run()
  const characterId = Number(result.lastInsertRowid)
  db.insert(schema.episodeCharacters).values({
    episodeId,
    characterId,
    createdAt: ts,
  }).run()
  return success(c, { id: characterId })
})

// POST /characters/:id/save-to-library
app.post('/:id/save-to-library', async (c) => {
  const id = Number(c.req.param('id'))
  const [char] = db.select().from(schema.characters).where(eq(schema.characters.id, id)).all()
  if (!char || char.deletedAt) return badRequest(c, 'Character not found')

  const ts = now()
  const result = db.insert(schema.characterLibrary).values({
    name: char.name,
    age: char.age || '',
    gender: char.gender || '',
    role: char.role || '',
    description: char.description || '',
    appearance: char.appearance || '',
    personality: char.personality || '',
    voiceStyle: char.voiceStyle || '',
    imageUrl: char.imageUrl || '',
    referenceImages: char.referenceImages || '',
    sourceCharacterId: char.id,
    createdAt: ts,
    updatedAt: ts,
  }).run()
  return success(c, { id: Number(result.lastInsertRowid) })
})

// POST /characters/library/:id/apply
app.post('/library/:id/apply', async (c) => {
  const libraryId = Number(c.req.param('id'))
  const body = await c.req.json()
  const dramaId = Number(body.drama_id ?? body.dramaId)
  const episodeId = Number(body.episode_id ?? body.episodeId)
  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (!episodeId) return badRequest(c, 'episode_id is required')

  const [item] = db.select().from(schema.characterLibrary).where(eq(schema.characterLibrary.id, libraryId)).all()
  if (!item || item.deletedAt) return badRequest(c, 'Library character not found')

  const ts = now()
  const result = db.insert(schema.characters).values({
    dramaId,
    name: item.name,
    age: item.age || '',
    gender: item.gender || '',
    role: item.role || '',
    description: item.description || '',
    appearance: item.appearance || '',
    personality: item.personality || '',
    voiceStyle: item.voiceStyle || '',
    imageUrl: item.imageUrl || '',
    referenceImages: item.referenceImages || '',
    createdAt: ts,
    updatedAt: ts,
  }).run()
  const characterId = Number(result.lastInsertRowid)
  db.insert(schema.episodeCharacters).values({
    episodeId,
    characterId,
    createdAt: ts,
  }).run()
  return success(c, { id: characterId })
})

// PUT /characters/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: Record<string, any> = { updatedAt: now() }
  for (const key of ['name', 'age', 'gender', 'role', 'description', 'appearance', 'personality', 'voiceStyle', 'voiceProvider', 'imageUrl', 'localPath']) {
    const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
    if (snakeKey in body) updates[key] = body[snakeKey]
    else if (key in body) updates[key] = body[key]
  }
  if ('voice_style' in body || 'voiceStyle' in body) {
    updates.voiceSampleUrl = null
  }
  db.update(schema.characters).set(updates).where(eq(schema.characters.id, id)).run()
  return success(c)
})

// DELETE /characters/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  db.update(schema.characters).set({ deletedAt: now() }).where(eq(schema.characters.id, id)).run()
  return success(c)
})

// POST /characters/:id/generate-voice-sample — 生成角色音色试听
app.post('/:id/generate-voice-sample', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const [char] = db.select().from(schema.characters).where(eq(schema.characters.id, id)).all()
  if (!char) return badRequest(c, 'Character not found')
  if (!char.voiceStyle) return badRequest(c, '请先分配音色')
  if (!body.episode_id) return badRequest(c, 'episode_id is required')

  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).all()
  if (!ep) return badRequest(c, 'Episode not found')

  try {
    logTaskStart('VoiceSample', 'generate', { characterId: id, characterName: char.name, episodeId: ep.id, voice: char.voiceStyle })
    const audioPath = await generateVoiceSample(char.name, char.voiceStyle, ep.audioConfigId ?? undefined)
    db.update(schema.characters)
      .set({ voiceSampleUrl: audioPath, updatedAt: now() })
      .where(eq(schema.characters.id, id)).run()
    logTaskSuccess('VoiceSample', 'generate', { characterId: id, path: audioPath })
    return success(c, { voice_sample_url: audioPath })
  } catch (err: any) {
    logTaskError('VoiceSample', 'generate', { characterId: id, error: err.message })
    return badRequest(c, `TTS 生成失败: ${err.message}`)
  }
})

// POST /characters/:id/generate-image
app.post('/:id/generate-image', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const [char] = db.select().from(schema.characters).where(eq(schema.characters.id, id)).all()
  if (!char) return badRequest(c, 'Character not found')
  if (!body.episode_id) return badRequest(c, 'episode_id is required')

  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).all()
  if (!ep) return badRequest(c, 'Episode not found')

  const prompt = buildCharacterImagePrompt(char)
  try {
    logTaskStart('CharacterImage', 'generate', { characterId: id, episodeId: ep.id, dramaId: char.dramaId })
    const genId = await generateImage({
      characterId: id,
      dramaId: char.dramaId,
      prompt,
      model: body.model,
      configId: body.config_id ?? ep.imageConfigId ?? undefined,
      userId: currentAuthUserId(c),
    })
    logTaskSuccess('CharacterImage', 'generate', { characterId: id, generationId: genId })
    return success(c, { image_generation_id: genId })
  } catch (err: any) {
    logTaskError('CharacterImage', 'generate', { characterId: id, error: err.message })
    return badRequest(c, err.message)
  }
})

// POST /characters/batch-generate-images
app.post('/batch-generate-images', async (c) => {
  const body = await c.req.json()
  const ids: number[] = body.character_ids || []
  if (!body.episode_id) return badRequest(c, 'episode_id is required')
  const [ep] = db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).all()
  if (!ep) return badRequest(c, 'Episode not found')
  const results: Array<{ character_id: number; image_generation_id: number }> = []
  const failed: Array<{ character_id: number; message: string }> = []
  for (const cid of ids) {
    const [char] = db.select().from(schema.characters).where(eq(schema.characters.id, cid)).all()
    if (!char) {
      failed.push({ character_id: cid, message: 'Character not found' })
      continue
    }
    const prompt = buildCharacterImagePrompt(char)
    try {
      const genId = await generateImage({
        characterId: cid,
        dramaId: char.dramaId,
        prompt,
        model: body.model,
        configId: body.config_id ?? ep.imageConfigId ?? undefined,
        userId: currentAuthUserId(c),
      })
      results.push({ character_id: cid, image_generation_id: genId })
    } catch (err: any) {
      failed.push({ character_id: cid, message: err.message || 'Generation failed' })
    }
  }
  logTaskSuccess('CharacterImage', 'batch-generate', { episodeId: ep.id, requested: ids.length, started: results.length, failed: failed.length })
  return success(c, {
    count: results.length,
    ids: results.map(item => item.image_generation_id),
    items: results,
    failed,
  })
})

export default app
