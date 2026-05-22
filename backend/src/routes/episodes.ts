import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound, badRequest, now } from '../utils/response.js'
import { toSnakeCaseArray, toSnakeCase } from '../utils/transform.js'
import { ensureOwnedDrama, ensureOwnedEpisode, requestUserId } from '../utils/dramaAccess.js'

const app = new Hono()

// POST /episodes — Create a new episode
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.drama_id) return badRequest(c, 'drama_id required')
  const userId = requestUserId(c)
  const drama = await ensureOwnedDrama(c, Number(body.drama_id))
  if (!drama) return notFound(c, '剧本不存在')
  if (!body.image_config_id || !body.video_config_id || !body.audio_config_id) {
    return badRequest(c, 'image_config_id, video_config_id and audio_config_id are required')
  }
  const ts = now()

  // Get next episode number
  const existing = await db.select().from(schema.episodes)
    .where(eq(schema.episodes.dramaId, body.drama_id))
    .orderBy(schema.episodes.episodeNumber).execute()
  const nextNum = existing.length ? Math.max(...existing.map(e => e.episodeNumber)) + 1 : 1

  const res = await db.insert(schema.episodes).values({
    userId,
    dramaId: body.drama_id,
    episodeNumber: nextNum,
    title: body.title || `第${nextNum}集`,
    imageConfigId: body.image_config_id,
    videoConfigId: body.video_config_id,
    audioConfigId: body.audio_config_id,
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()

  const [ep] = await db.select().from(schema.episodes)
    .where(eq(schema.episodes.id, Number(res.insertId))).execute()
  return success(c, {
    id: ep.id,
    episode_number: ep.episodeNumber,
    title: ep.title,
    image_config_id: ep.imageConfigId,
    video_config_id: ep.videoConfigId,
    audio_config_id: ep.audioConfigId,
  })
})

// PUT /episodes/:id - Update episode fields
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const userId = requestUserId(c)
  const ep = await ensureOwnedEpisode(c, id)
  if (!ep) return notFound(c, 'Episode not found')

  const allowed = ['content', 'script_content', 'title', 'description', 'status']
  const updates: Record<string, any> = {}
  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }
  if (Object.keys(updates).length === 0) return badRequest(c, 'no valid fields')

  // Map snake_case to camelCase for drizzle
  const drizzleUpdates: Record<string, any> = { updatedAt: now(), updatedBy: userId }
  if ('content' in updates) drizzleUpdates.content = updates.content
  if ('script_content' in updates) drizzleUpdates.scriptContent = updates.script_content
  if ('title' in updates) drizzleUpdates.title = updates.title
  if ('description' in updates) drizzleUpdates.description = updates.description
  if ('status' in updates) drizzleUpdates.status = updates.status

  await db.update(schema.episodes).set(drizzleUpdates).where(eq(schema.episodes.id, id)).execute()
  return success(c)
})

// GET /episodes/:id/characters — characters linked to this episode
app.get('/:id/characters', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const ep = await ensureOwnedEpisode(c, episodeId)
  if (!ep) return notFound(c, 'Episode not found')
  const links = await db.select().from(schema.episodeCharacters)
    .where(eq(schema.episodeCharacters.episodeId, episodeId)).execute()
  const charIds = links.map(l => l.characterId)
  if (!charIds.length) return success(c, [])
  const allChars = await db.select().from(schema.characters).where(eq(schema.characters.userId, requestUserId(c))).execute()
  const result = allChars.filter(ch => charIds.includes(ch.id) && !ch.deletedAt)
  return success(c, toSnakeCaseArray(result))
})

// GET /episodes/:id/scenes — scenes linked to this episode
app.get('/:id/scenes', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const ep = await ensureOwnedEpisode(c, episodeId)
  if (!ep) return notFound(c, 'Episode not found')
  const links = await db.select().from(schema.episodeScenes)
    .where(eq(schema.episodeScenes.episodeId, episodeId)).execute()
  const sceneIds = links.map(l => l.sceneId)
  if (!sceneIds.length) return success(c, [])
  const allScenes = await db.select().from(schema.scenes).where(eq(schema.scenes.userId, requestUserId(c))).execute()
  const result = allScenes.filter(sc => sceneIds.includes(sc.id) && !sc.deletedAt)
  return success(c, toSnakeCaseArray(result))
})

// GET /episodes/:episode_id/storyboards
app.get('/:episode_id/storyboards', async (c) => {
  const episodeId = Number(c.req.param('episode_id'))
  const ep = await ensureOwnedEpisode(c, episodeId)
  if (!ep) return notFound(c, 'Episode not found')
  const rows = await db.select().from(schema.storyboards)
    .where(eq(schema.storyboards.episodeId, episodeId))
    .orderBy(schema.storyboards.storyboardNumber)
    .execute()
  const links = await db.select().from(schema.storyboardCharacters).execute()
  const charIdsByStoryboard = new Map<number, number[]>()
  for (const link of links) {
    const arr = charIdsByStoryboard.get(link.storyboardId) || []
    arr.push(link.characterId)
    charIdsByStoryboard.set(link.storyboardId, arr)
  }

  const episodeCharIds = (await db.select().from(schema.episodeCharacters)
    .where(eq(schema.episodeCharacters.episodeId, episodeId)).execute()
    ).map(link => link.characterId)
  const allChars = (await db.select().from(schema.characters).where(eq(schema.characters.userId, requestUserId(c))).execute())
    .filter(ch => episodeCharIds.includes(ch.id) && !ch.deletedAt)
  const episodeSceneIds = (await db.select().from(schema.episodeScenes)
    .where(eq(schema.episodeScenes.episodeId, episodeId)).execute()
    ).map(link => link.sceneId)
  const allScenes = (await db.select().from(schema.scenes).where(eq(schema.scenes.userId, requestUserId(c))).execute())
    .filter(scene => episodeSceneIds.includes(scene.id) && !scene.deletedAt)

  return success(c, rows.map((row) => ({
    ...toSnakeCase(row),
    shot_number: row.storyboardNumber,
    shotNumber: row.storyboardNumber,
    sceneId: row.sceneId,
    shotType: row.shotType,
    cameraAngle: row.angle,
    cameraMovement: row.movement,
    durationSeconds: row.duration,
    visualDescription: row.description,
    soundEffects: row.soundEffect,
    backgroundMusic: row.bgmPrompt,
    charactersInShot: JSON.stringify(charIdsByStoryboard.get(row.id) || []),
    character_ids: charIdsByStoryboard.get(row.id) || [],
    aiPrompt: row.imagePrompt,
    referenceImageUrl: row.composedImage || row.firstFrameImage || null,
    generatedVideoUrl: row.videoUrl,
    generationStatus: row.status,
    characters: allChars
      .filter(ch => (charIdsByStoryboard.get(row.id) || []).includes(ch.id))
      .map(ch => ({
        ...toSnakeCase(ch),
        characterName: ch.name,
        characterType: ch.role,
        ageRange: ch.age,
        appearanceDescription: ch.appearance,
        aiPaintingPrompt: ch.appearance || ch.description,
        personalityTraits: ch.personality,
        backgroundStory: ch.description,
        voiceStyle: ch.voiceStyle,
        avatarImageUrl: ch.imageUrl,
        referenceImages: ch.referenceImages,
      })),
    scene: row.sceneId
      ? (() => {
          const scene = allScenes.find(sc => sc.id === row.sceneId)
          return scene
            ? {
                ...toSnakeCase(scene),
                sceneName: `${scene.location}${scene.time ? '-' + scene.time : ''}`,
                scene_name: `${scene.location}${scene.time ? '-' + scene.time : ''}`,
                sceneImageUrl: scene.imageUrl,
                scene_image_url: scene.imageUrl,
                generationPrompt: scene.prompt,
                generation_prompt: scene.prompt,
                timeOfDay: scene.time,
                time_of_day: scene.time,
                moodAtmosphere: scene.prompt,
                mood_atmosphere: scene.prompt,
                generationStatus: scene.status,
                generation_status: scene.status,
              }
            : null
        })()
      : null,
  })))
})

// GET /episodes/:id/pipeline-status — 流水线进度
app.get('/:id/pipeline-status', async (c) => {
  const episodeId = Number(c.req.param('id'))
  const ep = await ensureOwnedEpisode(c, episodeId)
  if (!ep) return notFound(c, 'Episode not found')

  const userId = requestUserId(c)
  const chars = await db.select().from(schema.characters).where(eq(schema.characters.userId, userId)).execute()
  const scenes = await db.select().from(schema.scenes).where(eq(schema.scenes.userId, userId)).execute()
  const sbs = await db.select().from(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId)).execute()
  const merges = await db.select().from(schema.videoMerges).where(eq(schema.videoMerges.episodeId, episodeId)).execute()

  const charsWithVoice = chars.filter(c => c.voiceStyle)
  const charsWithSample = chars.filter(c => c.voiceSampleUrl)
  const sbsWithImage = sbs.filter(s => s.composedImage)
  const sbsWithVideo = sbs.filter(s => s.videoUrl)
  const sbsComposed = sbs.filter(s => s.composedVideoUrl)
  const latestMerge = merges[merges.length - 1]

  function stepStatus(done: boolean, partial?: boolean) {
    if (done) return 'done'
    if (partial) return 'partial'
    return 'pending'
  }

  return success(c, {
    episode_id: episodeId,
    steps: {
      script_rewrite: { status: ep.scriptContent ? 'done' : (ep.content ? 'ready' : 'pending') },
      extract_characters: { status: stepStatus(chars.length > 0), count: chars.length },
      extract_scenes: { status: stepStatus(scenes.length > 0), count: scenes.length },
      assign_voices: { status: stepStatus(charsWithVoice.length === chars.length && chars.length > 0, charsWithVoice.length > 0), assigned: charsWithVoice.length, total: chars.length },
      generate_voice_samples: { status: stepStatus(charsWithSample.length === charsWithVoice.length && charsWithVoice.length > 0, charsWithSample.length > 0), completed: charsWithSample.length, total: charsWithVoice.length },
      extract_storyboards: { status: stepStatus(sbs.length > 0), count: sbs.length },
      generate_images: { status: stepStatus(sbsWithImage.length === sbs.length && sbs.length > 0, sbsWithImage.length > 0), completed: sbsWithImage.length, total: sbs.length },
      generate_videos: { status: stepStatus(sbsWithVideo.length === sbs.length && sbs.length > 0, sbsWithVideo.length > 0), completed: sbsWithVideo.length, total: sbs.length },
      compose_shots: { status: stepStatus(sbsComposed.length === sbs.length && sbs.length > 0, sbsComposed.length > 0), completed: sbsComposed.length, total: sbs.length },
      merge_episode: { status: latestMerge?.status === 'completed' ? 'done' : (latestMerge ? latestMerge.status : 'pending'), merged_url: latestMerge?.mergedUrl },
    },
  })
})

export default app
