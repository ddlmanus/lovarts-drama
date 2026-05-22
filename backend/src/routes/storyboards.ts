import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, created, now, badRequest } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { generateTTS } from '../services/tts-generation.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

const IGNORE_TTS_SPEAKERS = /^(环境音|环境声|音效|效果音|sfx|sound ?effect|bgm|背景音|背景音乐|ambient)$/i
const IGNORE_TTS_TEXT = /^(无|无对白|无台词|无旁白|无需配音|无需对白|none|null|n\/a|na|环境音|环境声|音效|效果音|纯音效|纯环境音|只有环境音|仅环境音|背景音|背景音乐|bgm|sfx|ambient)$/i

function parseDialogueForTTS(dialogue?: string | null) {
  const raw = dialogue?.trim() || ''
  if (!raw) return { speaker: '', pureText: '', ignorable: true }
  const speakerMatch = raw.match(/^(.+?)[:：]/)
  const speaker = speakerMatch ? speakerMatch[1].replace(/[（(].+?[)）]/g, '').trim() : ''
  const pureText = raw.replace(/^.+?[:：]\s*/, '').replace(/[（(].+?[)）]/g, '').trim()
  const ignorable = (!!speaker && IGNORE_TTS_SPEAKERS.test(speaker)) || !pureText || IGNORE_TTS_TEXT.test(pureText)
  return { speaker, pureText, ignorable }
}

function syncStoryboardCharacters(storyboardId: number, characterIds: number[]) {
  db.delete(schema.storyboardCharacters)
    .where(eq(schema.storyboardCharacters.storyboardId, storyboardId))
    .execute()

  const uniqueIds = [...new Set((characterIds || []).filter(Boolean))]
  if (!uniqueIds.length) return

  for (const characterId of uniqueIds) {
    db.insert(schema.storyboardCharacters).values({
      storyboardId,
      characterId,
    }).execute()
  }
}

function getStoryboardCharacterIds(storyboardId: number) {
  return db.select().from(schema.storyboardCharacters)
    .where(eq(schema.storyboardCharacters.storyboardId, storyboardId)).execute()
    .map(link => link.characterId)
}

function normalizeIdArray(value: any) {
  if (Array.isArray(value)) return value.map(Number).filter(Boolean)
  if (typeof value === 'number') return [value]
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed.map(Number).filter(Boolean)
  } catch {}
  return trimmed.split(',').map(item => Number(item.trim())).filter(Boolean)
}

function validateStoryboardBindings(episodeId: number, sceneId: number | null | undefined, characterIds: number[] | undefined) {
  const episodeSceneIds = new Set(
    db.select().from(schema.episodeScenes)
      .where(eq(schema.episodeScenes.episodeId, episodeId)).execute()
      .map(link => link.sceneId),
  )
  const episodeCharacterIds = new Set(
    db.select().from(schema.episodeCharacters)
      .where(eq(schema.episodeCharacters.episodeId, episodeId)).execute()
      .map(link => link.characterId),
  )

  if (sceneId != null && !episodeSceneIds.has(sceneId)) {
    throw new Error('scene_id 必须来自当前集已关联场景')
  }

  const invalidCharacterIds = (characterIds || []).filter(id => !episodeCharacterIds.has(id))
  if (invalidCharacterIds.length) {
    throw new Error('character_ids 必须来自当前集已关联角色')
  }
}

// POST /storyboards
app.post('/', async (c) => {
  const body = await c.req.json()
  const characterIds = normalizeIdArray(body.character_ids ?? body.characterIds ?? body.characters_in_shot ?? body.charactersInShot)
  const sceneId = body.scene_id ?? body.sceneId
  const storyboardNumber = body.storyboard_number ?? body.shot_number ?? body.shotNumber ?? 1
  const ts = now()
  logTaskStart('StoryboardAPI', 'create', {
    episodeId: body.episode_id,
    shotNumber: storyboardNumber,
    sceneId,
    characterIds,
  })
  logTaskPayload('StoryboardAPI', 'create body', body)
  validateStoryboardBindings(body.episode_id, sceneId, characterIds)
  const res = db.insert(schema.storyboards).values({
    episodeId: body.episode_id,
    storyboardNumber,
    title: body.title,
    description: body.description ?? body.visual_description ?? body.visualDescription,
    action: body.action,
    dialogue: body.dialogue,
    sceneId,
    shotType: body.shot_type ?? body.shotType,
    angle: body.angle ?? body.camera_angle ?? body.cameraAngle,
    movement: body.movement ?? body.camera_movement ?? body.cameraMovement,
    location: body.location,
    time: body.time ?? body.time_of_day ?? body.timeOfDay,
    atmosphere: body.atmosphere,
    imagePrompt: body.image_prompt ?? body.imagePrompt ?? body.ai_prompt ?? body.aiPrompt,
    videoPrompt: body.video_prompt ?? body.videoPrompt,
    bgmPrompt: body.bgm_prompt ?? body.bgmPrompt ?? body.background_music ?? body.backgroundMusic,
    soundEffect: body.sound_effect ?? body.soundEffect ?? body.sound_effects ?? body.soundEffects,
    duration: body.duration ?? body.duration_seconds ?? body.durationSeconds ?? 4,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  syncStoryboardCharacters(Number(res.insertId), characterIds)
  const [result] = db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.id, Number(res.insertId))).execute()
  logTaskSuccess('StoryboardAPI', 'create', {
    storyboardId: result.id,
    episodeId: result.episodeId,
    shotNumber: result.storyboardNumber,
  })
  return created(c, {
    ...toSnakeCase(result),
    character_ids: getStoryboardCharacterIds(result.id),
  })
})

// PUT /storyboards/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const [storyboard] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).execute()
  if (!storyboard) return badRequest(c, '镜头不存在')
  logTaskStart('StoryboardAPI', 'update', {
    storyboardId: id,
    episodeId: storyboard.episodeId,
    fields: Object.keys(body),
  })
  logTaskPayload('StoryboardAPI', 'update body', body)

  const fieldMap: Record<string, string> = {
    storyboard_number: 'storyboardNumber', shot_number: 'storyboardNumber', shotNumber: 'storyboardNumber',
    title: 'title', description: 'description', visual_description: 'description', visualDescription: 'description',
    shot_type: 'shotType', shotType: 'shotType',
    angle: 'angle', camera_angle: 'angle', cameraAngle: 'angle',
    movement: 'movement', camera_movement: 'movement', cameraMovement: 'movement',
    action: 'action',
    dialogue: 'dialogue', duration: 'duration', video_prompt: 'videoPrompt',
    duration_seconds: 'duration', durationSeconds: 'duration',
    image_prompt: 'imagePrompt', imagePrompt: 'imagePrompt', ai_prompt: 'imagePrompt', aiPrompt: 'imagePrompt',
    videoPrompt: 'videoPrompt',
    scene_id: 'sceneId', sceneId: 'sceneId', location: 'location',
    time: 'time', time_of_day: 'time', timeOfDay: 'time', atmosphere: 'atmosphere', result: 'result',
    bgm_prompt: 'bgmPrompt', bgmPrompt: 'bgmPrompt', background_music: 'bgmPrompt', backgroundMusic: 'bgmPrompt',
    sound_effect: 'soundEffect', soundEffect: 'soundEffect', sound_effects: 'soundEffect', soundEffects: 'soundEffect',
  }

  const updates: Record<string, any> = { updatedAt: now() }
  for (const [snakeKey, camelKey] of Object.entries(fieldMap)) {
    if (snakeKey in body) updates[camelKey] = body[snakeKey]
  }

  if ('dialogue' in body) {
    updates.ttsAudioUrl = null
    updates.subtitleUrl = null
  }

  validateStoryboardBindings(
    storyboard.episodeId,
    'scene_id' in body ? body.scene_id : ('sceneId' in body ? body.sceneId : storyboard.sceneId),
    ('character_ids' in body || 'characterIds' in body || 'characters_in_shot' in body || 'charactersInShot' in body)
      ? normalizeIdArray(body.character_ids ?? body.characterIds ?? body.characters_in_shot ?? body.charactersInShot)
      : getStoryboardCharacterIds(id),
  )

  await db.update(schema.storyboards).set(updates).where(eq(schema.storyboards.id, id)).execute()
  if ('character_ids' in body || 'characterIds' in body || 'characters_in_shot' in body || 'charactersInShot' in body) {
    syncStoryboardCharacters(id, normalizeIdArray(body.character_ids ?? body.characterIds ?? body.characters_in_shot ?? body.charactersInShot))
  }
  logTaskSuccess('StoryboardAPI', 'update', {
    storyboardId: id,
    updatedFields: Object.keys(updates),
    characterIds: body.character_ids,
  })
  return success(c)
})

// POST /storyboards/:id/generate-tts
app.post('/:id/generate-tts', async (c) => {
  const id = Number(c.req.param('id'))
  const [sb] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, id)).execute()
  if (!sb) return badRequest(c, '镜头不存在')
  const parsedDialogue = parseDialogueForTTS(sb.dialogue)
  if (parsedDialogue.ignorable) return badRequest(c, '该镜头没有可生成的对白或旁白')
  logTaskStart('StoryboardAPI', 'generate-tts', {
    storyboardId: id,
    episodeId: sb.episodeId,
    dialoguePreview: (sb.dialogue || '').slice(0, 40),
  })
  logTaskPayload('StoryboardAPI', 'generate-tts input', {
    storyboardId: id,
    episodeId: sb.episodeId,
    dialogue: sb.dialogue,
  })

  let voiceId = 'alloy'
  const speaker = parsedDialogue.speaker

  if (speaker) {
    if (!/^(旁白|画外音|narrator)$/i.test(speaker)) {
      const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).execute()
      if (ep) {
        const chars = await db.select().from(schema.characters).where(eq(schema.characters.dramaId, ep.dramaId)).execute()
        const found = chars.find((char) => char.name === speaker)
        if (found?.voiceStyle) voiceId = found.voiceStyle
      }
    }
  }

  const pureDialogue = parsedDialogue.pureText
  if (!pureDialogue) return badRequest(c, '未提取到可合成的文本')

  const [ep] = await db.select().from(schema.episodes).where(eq(schema.episodes.id, sb.episodeId)).execute()
  try {
    const audioPath = await generateTTS({
      text: pureDialogue,
      voice: voiceId,
      configId: ep?.audioConfigId || null,
      userId: currentAuthUserId(c),
      relatedTaskId: id,
      taskType: 'storyboard_tts',
    })
  db.update(schema.storyboards)
    .set({ ttsAudioUrl: audioPath, updatedAt: now() })
    .where(eq(schema.storyboards.id, id))
    .execute()

    logTaskSuccess('StoryboardAPI', 'generate-tts', {
      storyboardId: id,
      voiceId,
      path: audioPath,
      textLength: pureDialogue.length,
    })
    return success(c, { tts_audio_url: audioPath, voice_id: voiceId, text: pureDialogue })
  } catch (err: any) {
    logTaskError('StoryboardAPI', 'generate-tts', { storyboardId: id, voiceId, error: err.message })
    return badRequest(c, err.message)
  }
})

// DELETE /storyboards/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  logTaskStart('StoryboardAPI', 'delete', { storyboardId: id })
  await db.delete(schema.storyboardCharacters).where(eq(schema.storyboardCharacters.storyboardId, id)).execute()
  await db.delete(schema.storyboards).where(eq(schema.storyboards.id, id)).execute()
  logTaskSuccess('StoryboardAPI', 'delete', { storyboardId: id })
  return success(c)
})

export default app
