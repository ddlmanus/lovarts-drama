import { Hono } from 'hono'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest, now } from '../utils/response.js'
import { toSnakeCase, toSnakeCaseArray } from '../utils/transform.js'
import { generateVoiceSample } from '../services/tts-generation.js'
import { generateImage } from '../services/image-generation.js'
import { logTaskError, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { ensureOwnedDrama, ensureOwnedEpisode, ownedRow, requestUserId } from '../utils/dramaAccess.js'
import { appendStylePrompt, getDramaStyleProfile } from '../services/drama-style.js'

const app = new Hono()

function limitText(value: string | null | undefined, maxLength: number) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

function collectCharacterScriptContext(script: string, characterName: string) {
  const lines = script.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const hitIndexes = lines
    .map((line, index) => line.includes(characterName) ? index : -1)
    .filter(index => index >= 0)
  if (!hitIndexes.length) return limitText(script, 1200)

  const selected = new Set<number>()
  for (const index of hitIndexes.slice(0, 6)) {
    for (let offset = -2; offset <= 2; offset += 1) {
      const next = index + offset
      if (next >= 0 && next < lines.length) selected.add(next)
    }
  }
  return limitText([...selected].sort((a, b) => a - b).map(index => lines[index]).join('\n'), 1500)
}

function buildCharacterImagePrompt(char: typeof schema.characters.$inferSelect, episode?: typeof schema.episodes.$inferSelect | null) {
  const scriptText = episode ? String(episode.scriptContent || episode.content || episode.description || '') : ''
  const scriptContext = scriptText ? collectCharacterScriptContext(scriptText, char.name) : ''
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
    scriptContext ? `当前集剧本中与该角色相关的描述：\n${scriptContext}` : '',
    '请根据以上角色卡片信息生成单人角色形象图。',
    '形象生成优先级：项目风格类型锁定 > 当前集剧本中的角色描写 > 角色卡字段。若角色卡与剧本冲突，以剧本和项目风格为准。',
    '要求：角色主体清晰，正面或半身构图，人物特征稳定，服装、气质、时代背景与角色设定一致，高质量，细节丰富，干净背景，不要出现文字、水印、多人或无关元素。',
  ].filter(Boolean).join('\n')
}

// GET /characters/library
app.get('/library', async (c) => {
  const q = String(c.req.query('q') || '').trim().toLowerCase()
  const userId = requestUserId(c)
  const rows = (await db.select().from(schema.characterLibrary).execute())
    .filter(row => row.userId === userId && !row.deletedAt)
    .filter(row => {
      if (!q) return true
      return [row.name, row.role, row.description, row.appearance, row.personality]
        .some(value => String(value || '').toLowerCase().includes(q))
    })
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return success(c, toSnakeCaseArray(rows))
})

// POST /characters/library
app.post('/library', async (c) => {
  const body = await c.req.json()
  const userId = requestUserId(c)
  const name = String(body.name || '').trim()
  if (!name) return badRequest(c, 'name is required')

  const ts = now()
  const result = await db.insert(schema.characterLibrary).values({
    userId,
    name,
    age: body.age || '',
    gender: body.gender || '',
    role: body.role || '',
    description: body.description || '',
    appearance: body.appearance || '',
    personality: body.personality || '',
    voiceStyle: body.voice_style ?? body.voiceStyle ?? '',
    imageUrl: body.image_url ?? body.imageUrl ?? '',
    referenceImages: body.reference_images ?? body.referenceImages ?? '',
    sourceCharacterId: body.source_character_id ?? body.sourceCharacterId ?? null,
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()
  const [row] = await db.select().from(schema.characterLibrary).where(eq(schema.characterLibrary.id, Number(result.insertId))).execute()
  return success(c, toSnakeCase(row))
})

// PUT /characters/library/:id
app.put('/library/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const userId = requestUserId(c)
  const [item] = await db.select().from(schema.characterLibrary).where(eq(schema.characterLibrary.id, id)).execute()
  if (!ownedRow(item, userId)) return badRequest(c, 'Library character not found')

  const updates: Record<string, any> = { updatedAt: now(), updatedBy: userId }
  for (const key of ['name', 'age', 'gender', 'role', 'description', 'appearance', 'personality', 'voiceStyle', 'imageUrl', 'referenceImages']) {
    const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
    if (snakeKey in body) updates[key] = body[snakeKey]
    else if (key in body) updates[key] = body[key]
  }
  if (!String(updates.name ?? item.name ?? '').trim()) return badRequest(c, 'name is required')

  await db.update(schema.characterLibrary).set(updates).where(and(eq(schema.characterLibrary.id, id), eq(schema.characterLibrary.userId, userId))).execute()
  const [row] = await db.select().from(schema.characterLibrary).where(eq(schema.characterLibrary.id, id)).execute()
  return success(c, toSnakeCase(row))
})

// DELETE /characters/library/:id
app.delete('/library/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = requestUserId(c)
  await db.update(schema.characterLibrary)
    .set({ deletedAt: now(), deletedBy: userId, updatedAt: now(), updatedBy: userId })
    .where(and(eq(schema.characterLibrary.id, id), eq(schema.characterLibrary.userId, userId)))
    .execute()
  return success(c)
})

// POST /characters
app.post('/', async (c) => {
  const body = await c.req.json()
  const dramaId = Number(body.drama_id ?? body.dramaId)
  const episodeId = Number(body.episode_id ?? body.episodeId)
  const name = String(body.name || '').trim()
  const userId = requestUserId(c)
  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (!episodeId) return badRequest(c, 'episode_id is required')
  if (!name) return badRequest(c, 'name is required')
  if (!(await ensureOwnedDrama(c, dramaId)) || !(await ensureOwnedEpisode(c, episodeId))) return badRequest(c, 'Project not found')

  const ts = now()
  const result = await db.insert(schema.characters).values({
    userId,
    dramaId,
    name,
    age: body.age || '',
    gender: body.gender || '',
    role: body.role || '',
    description: body.description || '',
    appearance: body.appearance || '',
    personality: body.personality || '',
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()
  const characterId = Number(result.insertId)
  await db.insert(schema.episodeCharacters).values({
    episodeId,
    characterId,
    createdAt: ts,
  }).execute()
  return success(c, { id: characterId })
})

// POST /characters/:id/save-to-library
app.post('/:id/save-to-library', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = requestUserId(c)
  const [char] = await db.select().from(schema.characters).where(eq(schema.characters.id, id)).execute()
  if (!ownedRow(char, userId)) return badRequest(c, 'Character not found')

  const ts = now()
  const result = await db.insert(schema.characterLibrary).values({
    userId,
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
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()
  return success(c, { id: Number(result.insertId) })
})

// POST /characters/library/:id/apply
app.post('/library/:id/apply', async (c) => {
  const libraryId = Number(c.req.param('id'))
  const body = await c.req.json()
  const dramaId = Number(body.drama_id ?? body.dramaId)
  const episodeId = Number(body.episode_id ?? body.episodeId)
  const userId = requestUserId(c)
  if (!dramaId) return badRequest(c, 'drama_id is required')
  if (!episodeId) return badRequest(c, 'episode_id is required')
  if (!(await ensureOwnedDrama(c, dramaId)) || !(await ensureOwnedEpisode(c, episodeId))) return badRequest(c, 'Project not found')

  const [item] = await db.select().from(schema.characterLibrary).where(eq(schema.characterLibrary.id, libraryId)).execute()
  if (!ownedRow(item, userId)) return badRequest(c, 'Library character not found')

  const ts = now()
  const result = await db.insert(schema.characters).values({
    userId,
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
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()
  const characterId = Number(result.insertId)
  await db.insert(schema.episodeCharacters).values({
    episodeId,
    characterId,
    createdAt: ts,
  }).execute()
  return success(c, { id: characterId })
})

// PUT /characters/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const userId = requestUserId(c)
  const updates: Record<string, any> = { updatedAt: now(), updatedBy: userId }
  for (const key of ['name', 'age', 'gender', 'role', 'description', 'appearance', 'personality', 'voiceStyle', 'voiceProvider', 'imageUrl', 'localPath']) {
    const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase())
    if (snakeKey in body) updates[key] = body[snakeKey]
    else if (key in body) updates[key] = body[key]
  }
  if ('voice_style' in body || 'voiceStyle' in body) {
    updates.voiceSampleUrl = null
  }
  await db.update(schema.characters).set(updates).where(and(eq(schema.characters.id, id), eq(schema.characters.userId, userId))).execute()
  return success(c)
})

// DELETE /characters/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const userId = requestUserId(c)
  await db.update(schema.characters).set({ deletedAt: now(), deletedBy: userId, updatedAt: now(), updatedBy: userId }).where(and(eq(schema.characters.id, id), eq(schema.characters.userId, userId))).execute()
  return success(c)
})

// POST /characters/:id/generate-voice-sample — 生成角色音色试听
app.post('/:id/generate-voice-sample', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const userId = requestUserId(c)
  const [char] = await db.select().from(schema.characters).where(eq(schema.characters.id, id)).execute()
  if (!ownedRow(char, userId)) return badRequest(c, 'Character not found')
  if (!char.voiceStyle) return badRequest(c, '请先分配音色')
  if (!body.episode_id) return badRequest(c, 'episode_id is required')

  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).execute()
  if (!ep) return badRequest(c, 'Episode not found')

  try {
    logTaskStart('VoiceSample', 'generate', { characterId: id, characterName: char.name, episodeId: ep.id, voice: char.voiceStyle })
    const audioPath = await generateVoiceSample(char.name, char.voiceStyle, ep.audioConfigId ?? undefined, userId, id)
    await db.update(schema.characters)
      .set({ voiceSampleUrl: audioPath, updatedAt: now() })
      .where(eq(schema.characters.id, id)).execute()
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
  const userId = requestUserId(c)
  const [char] = await db.select().from(schema.characters).where(eq(schema.characters.id, id)).execute()
  if (!ownedRow(char, userId)) return badRequest(c, 'Character not found')
  if (!body.episode_id) return badRequest(c, 'episode_id is required')

  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).execute()
  if (!ep) return badRequest(c, 'Episode not found')

  const prompt = buildCharacterImagePrompt(char, ep)
  const styleProfile = await getDramaStyleProfile(char.dramaId)
  try {
    logTaskStart('CharacterImage', 'generate', { characterId: id, episodeId: ep.id, dramaId: char.dramaId })
    const genId = await generateImage({
      characterId: id,
      dramaId: char.dramaId,
      prompt: appendStylePrompt(prompt, styleProfile, 'character'),
      model: body.model,
      configId: body.model_config_id ?? body.modelConfigId ?? body.config_id ?? ep.imageConfigId ?? undefined,
      userProviderId: body.user_provider_id ?? body.userProviderId ?? undefined,
      userId,
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
  const userId = requestUserId(c)
  if (!body.episode_id) return badRequest(c, 'episode_id is required')
  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, Number(body.episode_id))).execute()
  if (!ep) return badRequest(c, 'Episode not found')
  const results: Array<{ character_id: number; image_generation_id: number }> = []
  const failed: Array<{ character_id: number; message: string }> = []
  for (const cid of ids) {
    const [char] = await db.select().from(schema.characters).where(eq(schema.characters.id, cid)).execute()
    if (!ownedRow(char, userId)) {
      failed.push({ character_id: cid, message: 'Character not found' })
      continue
    }
    const prompt = buildCharacterImagePrompt(char, ep)
    const styleProfile = await getDramaStyleProfile(char.dramaId)
    try {
      const genId = await generateImage({
        characterId: cid,
        dramaId: char.dramaId,
        prompt: appendStylePrompt(prompt, styleProfile, 'character'),
        model: body.model,
        configId: body.model_config_id ?? body.modelConfigId ?? body.config_id ?? ep.imageConfigId ?? undefined,
        userProviderId: body.user_provider_id ?? body.userProviderId ?? undefined,
        userId,
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
