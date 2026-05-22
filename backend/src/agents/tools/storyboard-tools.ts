/**
 * 分镜拆解 Agent 工具
 * 工厂函数模式 — 注入 episodeId + dramaId
 */
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db, schema } from '../../db/index.js'
import { eq } from 'drizzle-orm'
import { now } from '../../utils/response.js'
import { logTaskProgress, logTaskSuccess } from '../../utils/task-logger.js'
import { updateAgentTask } from '../task-progress.js'

async function syncStoryboardCharacters(storyboardId: number, characterIds: number[]) {
  await db.delete(schema.storyboardCharacters)
    .where(eq(schema.storyboardCharacters.storyboardId, storyboardId))
    .execute()

  const uniqueIds = [...new Set(characterIds.filter(Boolean))]
  if (!uniqueIds.length) return

  for (const characterId of uniqueIds) {
    await db.insert(schema.storyboardCharacters).values({
      storyboardId,
      characterId,
    }).execute()
  }
}

async function getEpisodeSceneIds(episodeId: number) {
  const links = await db.select().from(schema.episodeScenes)
    .where(eq(schema.episodeScenes.episodeId, episodeId)).execute()
  return new Set(
    links.map(link => link.sceneId),
  )
}

async function getEpisodeCharacterIds(episodeId: number) {
  const links = await db.select().from(schema.episodeCharacters)
    .where(eq(schema.episodeCharacters.episodeId, episodeId)).execute()
  return new Set(
    links.map(link => link.characterId),
  )
}

async function validateStoryboardBindings(episodeId: number, sceneId: number | null | undefined, characterIds: number[] | undefined) {
  const episodeSceneIds = await getEpisodeSceneIds(episodeId)
  const episodeCharacterIds = await getEpisodeCharacterIds(episodeId)

  if (sceneId != null && !episodeSceneIds.has(sceneId)) {
    throw new Error(`scene_id ${sceneId} 不属于当前集`)
  }

  const invalidCharacterIds = (characterIds || []).filter(id => !episodeCharacterIds.has(id))
  if (invalidCharacterIds.length) {
    throw new Error(`character_ids 不属于当前集: ${invalidCharacterIds.join(', ')}`)
  }
}

const SHOT_TYPE_MAP: Record<string, string> = {
  CLOSE_UP: 'CLOSE_UP',
  EXTREME_CLOSE_UP: 'EXTREME_CLOSE_UP',
  MEDIUM_SHOT: 'MEDIUM_SHOT',
  MEDIUM_CLOSE_UP: 'MEDIUM_CLOSE_UP',
  LONG_SHOT: 'LONG_SHOT',
  EXTREME_LONG_SHOT: 'EXTREME_LONG_SHOT',
  WIDE_SHOT: 'FULL_SHOT',
  ESTABLISHING_SHOT: 'EXTREME_LONG_SHOT',
  FULL_SHOT: 'FULL_SHOT',
  TWO_SHOT: 'TWO_SHOT',
  THREE_SHOT: 'THREE_SHOT',
  GROUP_SHOT: 'GROUP_SHOT',
  OVER_SHOULDER: 'OVER_SHOULDER',
  POV: 'POV',
  AERIAL: 'AERIAL',
  大远景: 'EXTREME_LONG_SHOT',
  大全景: 'EXTREME_LONG_SHOT',
  远景: 'LONG_SHOT',
  全景: 'FULL_SHOT',
  全身: 'FULL_SHOT',
  中景: 'MEDIUM_SHOT',
  中近景: 'MEDIUM_CLOSE_UP',
  近景: 'MEDIUM_CLOSE_UP',
  特写: 'CLOSE_UP',
  大特写: 'EXTREME_CLOSE_UP',
  双人镜头: 'TWO_SHOT',
  三人镜头: 'THREE_SHOT',
  群像: 'GROUP_SHOT',
  过肩: 'OVER_SHOULDER',
  主观视角: 'POV',
  航拍: 'AERIAL',
  运动镜头: 'TRACKING',
}

const CAMERA_ANGLE_MAP: Record<string, string> = {
  HIGH_ANGLE: 'HIGH_ANGLE',
  LOW_ANGLE: 'LOW_ANGLE',
  EYE_LEVEL: 'EYE_LEVEL',
  BIRD_EYE: 'BIRD_EYE',
  DUTCH_ANGLE: 'DUTCH_ANGLE',
  OVER_SHOULDER: 'OVER_SHOULDER',
  POV: 'POV',
  平视: 'EYE_LEVEL',
  正面: 'EYE_LEVEL',
  俯视: 'HIGH_ANGLE',
  俯拍: 'HIGH_ANGLE',
  仰视: 'LOW_ANGLE',
  仰拍: 'LOW_ANGLE',
  鸟瞰: 'BIRD_EYE',
  航拍: 'BIRD_EYE',
  倾斜: 'DUTCH_ANGLE',
  斜侧: 'DUTCH_ANGLE',
  侧拍: 'EYE_LEVEL',
  背拍: 'EYE_LEVEL',
  过肩: 'OVER_SHOULDER',
  主观视角: 'POV',
}

const CAMERA_MOVEMENT_MAP: Record<string, string> = {
  STATIC: 'STATIC',
  PAN: 'PAN',
  TILT: 'TILT',
  DOLLY: 'DOLLY',
  TRACKING: 'TRACKING',
  ZOOM: 'ZOOM',
  PUSH_IN: 'PUSH_IN',
  PULL_OUT: 'PULL_OUT',
  HANDHELD: 'HANDHELD',
  CRANE: 'CRANE',
  固定: 'STATIC',
  静止: 'STATIC',
  摇镜: 'PAN',
  横摇: 'PAN',
  俯仰: 'TILT',
  移镜: 'DOLLY',
  跟拍: 'TRACKING',
  跟随: 'TRACKING',
  变焦: 'ZOOM',
  推镜: 'PUSH_IN',
  推进: 'PUSH_IN',
  拉镜: 'PULL_OUT',
  拉远: 'PULL_OUT',
  手持: 'HANDHELD',
  升降: 'CRANE',
  环绕: 'DOLLY',
}

function normalizeEnum(value: any, map: Record<string, string>) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return map[raw] || map[raw.toUpperCase()] || raw.toUpperCase().replace(/[\s-]+/g, '_')
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

function pickFirst(...values: any[]) {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim() !== '') return value
  }
  return ''
}

function clampDuration(value: any) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 4
  return Math.max(2, Math.min(8, Math.round(numeric)))
}

function compactText(value: any, fallback = '') {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  return text || fallback
}

function normalizeGeneratedStoryboard(raw: any, index: number) {
  const description = compactText(pickFirst(raw.visual_description, raw.visualDescription, raw.description, raw.image_prompt, raw.imagePrompt))
  const action = compactText(raw.action)
  const title = compactText(raw.title, `镜头${index + 1}`).slice(0, 24)
  const location = compactText(raw.location)
  const time = compactText(pickFirst(raw.time, raw.time_of_day, raw.timeOfDay))
  const shotType = normalizeEnum(pickFirst(raw.shot_type, raw.shotType), SHOT_TYPE_MAP)
  const angle = normalizeEnum(pickFirst(raw.angle, raw.camera_angle, raw.cameraAngle), CAMERA_ANGLE_MAP)
  const movement = normalizeEnum(pickFirst(raw.movement, raw.camera_movement, raw.cameraMovement), CAMERA_MOVEMENT_MAP)
  const sceneId = pickFirst(raw.scene_id, raw.sceneId)
  const characterIds = normalizeIdArray(pickFirst(raw.character_ids, raw.characterIds, raw.characters_in_shot, raw.charactersInShot))
  const imagePrompt = compactText(pickFirst(raw.image_prompt, raw.imagePrompt, raw.ai_prompt, raw.aiPrompt, description))
  const videoPrompt = compactText(pickFirst(raw.video_prompt, raw.videoPrompt, [description, action].filter(Boolean).join('，')))

  return {
    shot_number: Number(pickFirst(raw.shot_number, raw.shotNumber)) || index + 1,
    title,
    shot_type: shotType || 'MEDIUM_SHOT',
    angle: angle || 'EYE_LEVEL',
    movement: movement || 'STATIC',
    location,
    time,
    action: action || description || title,
    dialogue: compactText(raw.dialogue),
    description: description || action || title,
    result: compactText(raw.result),
    atmosphere: compactText(raw.atmosphere),
    image_prompt: imagePrompt,
    video_prompt: videoPrompt,
    bgm_prompt: compactText(pickFirst(raw.bgm_prompt, raw.bgmPrompt, raw.background_music, raw.backgroundMusic)),
    sound_effect: compactText(pickFirst(raw.sound_effect, raw.soundEffect, raw.sound_effects, raw.soundEffects)),
    duration: clampDuration(pickFirst(raw.duration, raw.duration_seconds, raw.durationSeconds)),
    scene_id: sceneId === '' ? null : Number(sceneId),
    character_ids: characterIds,
  }
}

function assertStoryboardQuality(storyboards: ReturnType<typeof normalizeGeneratedStoryboard>[]) {
  if (!storyboards.length) throw new Error('至少需要生成 1 个分镜')
  const errors: string[] = []
  storyboards.forEach((sb, index) => {
    if (sb.shot_number !== index + 1) errors.push(`第 ${index + 1} 条 shot_number 应连续递增`)
    if (!sb.description || sb.description.length < 12) errors.push(`第 ${index + 1} 条缺少足够具体的 visualDescription/description`)
    if (!sb.action || sb.action.length < 8) errors.push(`第 ${index + 1} 条缺少动作表演 action`)
    if (!sb.sound_effect) errors.push(`第 ${index + 1} 条缺少 soundEffects/sound_effect`)
    if (!sb.bgm_prompt) errors.push(`第 ${index + 1} 条缺少 backgroundMusic/bgm_prompt`)
    if (!sb.atmosphere) errors.push(`第 ${index + 1} 条缺少 atmosphere`)
    if (sb.duration < 2 || sb.duration > 8) errors.push(`第 ${index + 1} 条时长应在 2-8 秒`)
    if (!sb.scene_id) errors.push(`第 ${index + 1} 条缺少 sceneId/scene_id`)
  })
  if (errors.length) throw new Error(`分镜质量校验失败：${errors.slice(0, 8).join('；')}`)
}

export function createStoryboardTools(episodeId: number, dramaId: number, taskId?: string) {
  const readStoryboardContext = createTool({
    id: 'read_storyboard_context',
    description: 'Read the screenplay, characters, and scenes for storyboard breakdown.',
    inputSchema: z.object({}),
    execute: async () => {
      updateAgentTask(taskId, {
        step: 'read_storyboard_context',
        message: '正在读取剧本、角色列表和场景列表...',
        progress: 18,
      })
      const [ep] = await db.select().from(schema.episodes)
        .where(eq(schema.episodes.id, episodeId)).execute()
      if (!ep) return { error: 'Episode not found' }
      const script = ep.scriptContent || ep.content
      if (!script) return { error: 'Episode has no script' }

      const charLinks = await db.select().from(schema.episodeCharacters)
        .where(eq(schema.episodeCharacters.episodeId, episodeId)).execute()
      const sceneLinks = await db.select().from(schema.episodeScenes)
        .where(eq(schema.episodeScenes.episodeId, episodeId)).execute()

      const linkedCharacterIds = new Set(charLinks.map(link => link.characterId))
      const linkedSceneIds = new Set(sceneLinks.map(link => link.sceneId))

      const chars = await db.select().from(schema.characters)
        .where(eq(schema.characters.dramaId, dramaId)).execute()
      const scns = await db.select().from(schema.scenes)
        .where(eq(schema.scenes.dramaId, dramaId)).execute()
      const existingStoryboards = await db.select().from(schema.storyboards)
        .where(eq(schema.storyboards.episodeId, episodeId)).execute()
      const storyboardCharacterLinks = await db.select().from(schema.storyboardCharacters).execute()

      const characters = chars
        .filter(c => !c.deletedAt)
        .filter(c => !linkedCharacterIds.size || linkedCharacterIds.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          character_name: c.name,
          role: c.role || '',
          character_type: c.role || '',
          gender: c.gender || '',
          age_range: c.age || '',
          description: c.description || '',
          background_story: c.description || '',
          appearance: c.appearance || '',
          appearance_description: c.appearance || '',
          ai_painting_prompt: c.appearance || c.description || '',
          personality: c.personality || '',
          personality_traits: c.personality || '',
          voice_style: c.voiceStyle || '',
          image_url: c.imageUrl || '',
          avatar_image_url: c.imageUrl || '',
          reference_images: c.referenceImages || '',
        }))

      const scenes = scns
        .filter(s => !s.deletedAt)
        .filter(s => !linkedSceneIds.size || linkedSceneIds.has(s.id))
        .map(s => ({
          id: s.id,
          scene_name: `${s.location}${s.time ? '-' + s.time : ''}`,
          location: s.location,
          time: s.time,
          time_of_day: s.time,
          prompt: s.prompt || '',
          generation_prompt: s.prompt || '',
          mood_atmosphere: s.prompt || '',
          image_url: s.imageUrl || '',
          scene_image_url: s.imageUrl || '',
          generation_status: s.status || '',
          storyboard_count: s.storyboardCount || 0,
        }))

      const payload = {
        storyboard_quality_guide: {
          output_contract: '调用 save_storyboards 保存 storyboards 数组。每条分镜必须接近接口字段：shotNumber、title、shotType、cameraAngle、cameraMovement、durationSeconds、visualDescription、action、dialogue、soundEffects、backgroundMusic、atmosphere、charactersInShot、sceneId；也兼容 snake_case。',
          enum_contract: {
            shotType: ['FULL_SHOT', 'CLOSE_UP', 'LONG_SHOT', 'MEDIUM_SHOT', 'EXTREME_CLOSE_UP', 'EXTREME_LONG_SHOT', 'MEDIUM_CLOSE_UP', 'TWO_SHOT', 'THREE_SHOT', 'GROUP_SHOT', 'OVER_SHOULDER', 'POV', 'AERIAL'],
            cameraAngle: ['EYE_LEVEL', 'HIGH_ANGLE', 'LOW_ANGLE', 'BIRD_EYE', 'DUTCH_ANGLE', 'OVER_SHOULDER', 'POV'],
            cameraMovement: ['STATIC', 'ZOOM', 'PAN', 'TILT', 'DOLLY', 'TRACKING', 'PUSH_IN', 'PULL_OUT', 'HANDHELD', 'CRANE'],
          },
          shot_count: '按剧情密度生成 12-24 个短视频镜头；简单片段可少一些；不要把多个重大动作塞进同一个镜头。',
          duration_seconds: '短剧默认单镜头 2-5 秒，转场/大远景可到 8 秒。',
          required_fields: ['title', 'shot_type或shotType', 'angle或cameraAngle', 'movement或cameraMovement', 'description或visualDescription', 'action', 'sound_effect或soundEffects', 'bgm_prompt或backgroundMusic', 'atmosphere', 'duration或durationSeconds', 'scene_id或sceneId', 'character_ids或charactersInShot'],
          visual_description: '画面描述要写构图、景别、光线、材质、空间、环境细节，不能只写动作。',
          action: '动作只写角色动作、表情、表演节奏和镜头内变化。',
          bindings: 'scene_id 必须来自 scenes；character_ids 必须来自 characters，空镜头可以传空数组。',
          examples: {
            charactersInShot: '[13043,13044] 或 [13043]；没有角色用 []',
            sceneId: '必须使用 scenes 中的 id',
            durationSeconds: '2、3、4、5，转场空镜最多 8',
          },
        },
        episode: {
          id: ep.id,
          title: ep.title,
          episode_number: ep.episodeNumber,
          description: ep.description || '',
        },
        script,
        characters,
        scenes,
        existing_storyboards: existingStoryboards
          .filter(sb => !sb.deletedAt)
          .map(sb => ({
            id: sb.id,
            shot_number: sb.storyboardNumber,
            title: sb.title || '',
            scene_id: sb.sceneId,
            character_ids: storyboardCharacterLinks
              .filter(link => link.storyboardId === sb.id)
              .map(link => link.characterId),
            shot_type: sb.shotType || '',
            duration: sb.duration || 0,
          })),
      }
      logTaskSuccess('StoryboardTool', 'read-context', {
        episodeId,
        dramaId,
        characters: characters.length,
        scenes: scenes.length,
        existingStoryboards: payload.existing_storyboards.length,
        scriptLength: script.length,
      })
      updateAgentTask(taskId, {
        step: 'storyboard_context_loaded',
        message: `已读取 ${characters.length} 个角色、${scenes.length} 个场景，正在让模型拆解镜头...`,
        progress: 32,
        details: {
          characters: characters.length,
          scenes: scenes.length,
          existingStoryboards: payload.existing_storyboards.length,
        },
      })
      return payload
    },
  })

  const saveStoryboards = createTool({
    id: 'save_storyboards',
    description: 'Save generated storyboards. Replaces all existing storyboards for this episode.',
    inputSchema: z.object({
      storyboards: z.array(z.object({
        shot_number: z.number().optional(),
        shotNumber: z.number().optional(),
        title: z.string().optional(),
        shot_type: z.string().optional(),
        shotType: z.string().optional(),
        angle: z.string().optional(),
        camera_angle: z.string().optional(),
        cameraAngle: z.string().optional(),
        movement: z.string().optional(),
        camera_movement: z.string().optional(),
        cameraMovement: z.string().optional(),
        location: z.string().optional(),
        time: z.string().optional(),
        time_of_day: z.string().optional(),
        timeOfDay: z.string().optional(),
        action: z.string().optional(),
        dialogue: z.string().nullable().optional(),
        description: z.string().optional(),
        visual_description: z.string().optional(),
        visualDescription: z.string().optional(),
        result: z.string().optional(),
        atmosphere: z.string().optional(),
        image_prompt: z.string().optional(),
        imagePrompt: z.string().optional(),
        ai_prompt: z.string().nullable().optional(),
        aiPrompt: z.string().nullable().optional(),
        video_prompt: z.string().optional(),
        videoPrompt: z.string().optional(),
        bgm_prompt: z.string().optional(),
        bgmPrompt: z.string().optional(),
        background_music: z.string().optional(),
        backgroundMusic: z.string().optional(),
        sound_effect: z.string().optional(),
        soundEffect: z.string().optional(),
        sound_effects: z.string().optional(),
        soundEffects: z.string().optional(),
        duration: z.number().optional(),
        duration_seconds: z.number().optional(),
        durationSeconds: z.number().optional(),
        scene_id: z.number().nullable().optional(),
        sceneId: z.number().nullable().optional(),
        character_ids: z.array(z.number()).optional(),
        characterIds: z.array(z.number()).optional(),
        characters_in_shot: z.union([z.array(z.number()), z.string()]).optional(),
        charactersInShot: z.union([z.array(z.number()), z.string()]).optional(),
      })),
    }),
    execute: async ({ storyboards: rawStoryboards }) => {
      const storyboards = rawStoryboards
        .map((sb, index) => normalizeGeneratedStoryboard(sb, index))
        .sort((a, b) => a.shot_number - b.shot_number)
        .map((sb, index) => ({ ...sb, shot_number: index + 1 }))
      assertStoryboardQuality(storyboards)
      const ts = now()
      updateAgentTask(taskId, {
        step: 'save_storyboards',
        message: `正在保存 ${storyboards.length} 个分镜...`,
        progress: 82,
        details: { storyboardCount: storyboards.length },
      })
      logTaskProgress('StoryboardTool', 'save-begin', {
        episodeId,
        dramaId,
        count: storyboards.length,
        shotNumbers: storyboards.map(sb => sb.shot_number).join(','),
      })
      const existingStoryboardIds = (await db.select().from(schema.storyboards)
        .where(eq(schema.storyboards.episodeId, episodeId)).execute())
        .map(sb => sb.id)
      for (const storyboardId of existingStoryboardIds) {
        await db.delete(schema.storyboardCharacters)
          .where(eq(schema.storyboardCharacters.storyboardId, storyboardId))
          .execute()
      }
      await db.delete(schema.storyboards).where(eq(schema.storyboards.episodeId, episodeId)).execute()

      let totalDuration = 0
      for (const sb of storyboards) {
        await validateStoryboardBindings(episodeId, sb.scene_id, sb.character_ids)
        const res = await db.insert(schema.storyboards).values({
          episodeId,
          storyboardNumber: sb.shot_number,
          title: sb.title, shotType: sb.shot_type,
          angle: sb.angle, movement: sb.movement,
          location: sb.location, time: sb.time,
          action: sb.action, dialogue: sb.dialogue,
          description: sb.description, result: sb.result,
          atmosphere: sb.atmosphere, imagePrompt: sb.image_prompt,
          videoPrompt: sb.video_prompt, bgmPrompt: sb.bgm_prompt,
          soundEffect: sb.sound_effect,
          sceneId: sb.scene_id, duration: sb.duration || 10,
          createdAt: ts, updatedAt: ts,
        }).execute()
        await syncStoryboardCharacters(Number(res.insertId), sb.character_ids || [])
        totalDuration += sb.duration || 10
      }

      await db.update(schema.episodes)
        .set({ duration: Math.ceil(totalDuration / 60), updatedAt: ts })
        .where(eq(schema.episodes.id, episodeId)).execute()

      logTaskSuccess('StoryboardTool', 'save-complete', {
        episodeId,
        count: storyboards.length,
        totalDuration,
      })
      updateAgentTask(taskId, {
        step: 'storyboards_saved',
        message: `已保存 ${storyboards.length} 个分镜，正在刷新分镜列表...`,
        progress: 96,
        details: { storyboardCount: storyboards.length, totalDuration },
      })
      return { message: `Saved ${storyboards.length} storyboards`, count: storyboards.length, total_duration: totalDuration }
    },
  })

  const updateStoryboard = createTool({
    id: 'update_storyboard',
    description: 'Update a specific storyboard shot.',
    inputSchema: z.object({
      storyboard_id: z.number(),
      title: z.string().optional(),
      shot_type: z.string().optional(),
      angle: z.string().optional(),
      movement: z.string().optional(),
      location: z.string().optional(),
      time: z.string().optional(),
      action: z.string().optional(),
      result: z.string().optional(),
      atmosphere: z.string().optional(),
      image_prompt: z.string().optional(),
      video_prompt: z.string().optional(),
      bgm_prompt: z.string().optional(),
      sound_effect: z.string().optional(),
      description: z.string().optional(),
      dialogue: z.string().optional(),
      scene_id: z.number().nullable().optional(),
      character_ids: z.array(z.number()).optional(),
      duration: z.number().optional(),
    }),
    execute: async ({ storyboard_id, ...fields }) => {
      const [storyboard] = await db.select().from(schema.storyboards).where(eq(schema.storyboards.id, storyboard_id)).execute()
      if (!storyboard) return { error: `Storyboard ${storyboard_id} not found` }
      logTaskProgress('StoryboardTool', 'update-begin', {
        episodeId,
        storyboardId: storyboard_id,
        fields: Object.keys(fields),
      })

      const linkedCharacters = await db.select().from(schema.storyboardCharacters)
        .where(eq(schema.storyboardCharacters.storyboardId, storyboard_id)).execute()
      await validateStoryboardBindings(
        episodeId,
        'scene_id' in fields ? fields.scene_id : storyboard.sceneId,
        'character_ids' in fields
          ? fields.character_ids
          : linkedCharacters.map(link => link.characterId),
      )

      const updates: Record<string, any> = { updatedAt: now() }
      if ('title' in fields) updates.title = fields.title
      if ('shot_type' in fields) updates.shotType = fields.shot_type
      if ('angle' in fields) updates.angle = fields.angle
      if ('movement' in fields) updates.movement = fields.movement
      if ('location' in fields) updates.location = fields.location
      if ('time' in fields) updates.time = fields.time
      if ('action' in fields) updates.action = fields.action
      if ('result' in fields) updates.result = fields.result
      if ('atmosphere' in fields) updates.atmosphere = fields.atmosphere
      if ('image_prompt' in fields) updates.imagePrompt = fields.image_prompt
      if ('video_prompt' in fields) updates.videoPrompt = fields.video_prompt
      if ('bgm_prompt' in fields) updates.bgmPrompt = fields.bgm_prompt
      if ('sound_effect' in fields) updates.soundEffect = fields.sound_effect
      if ('description' in fields) updates.description = fields.description
      if ('dialogue' in fields) updates.dialogue = fields.dialogue
      if ('scene_id' in fields) updates.sceneId = fields.scene_id
      if ('duration' in fields) updates.duration = fields.duration
      await db.update(schema.storyboards).set(updates).where(eq(schema.storyboards.id, storyboard_id)).execute()
      if ('character_ids' in fields) await syncStoryboardCharacters(storyboard_id, fields.character_ids || [])
      logTaskSuccess('StoryboardTool', 'update-complete', {
        episodeId,
        storyboardId: storyboard_id,
        updatedFields: Object.keys(updates),
        characterIds: 'character_ids' in fields ? (fields.character_ids || []).join(',') : undefined,
      })
      return { message: `Storyboard ${storyboard_id} updated` }
    },
  })

  // 为宫格图生成整体提示词（分析选中镜头的描述，生成一个连贯的画格布局描述）
  const generateGridPrompt = createTool({
    id: 'generate_grid_prompt',
    description: '为宫格图生成整体画面描述。根据选中的镜头列表及其描述，生成一个连贯的宫格图提示词，用于一次性生成完整的宫格拼图。',
    inputSchema: z.object({
      shots: z.array(z.object({
        shot_number: z.number(),
        description: z.string(),
        shot_type: z.string().optional(),
        dialogue: z.string().optional(),
      })),
      rows: z.number(),
      cols: z.number(),
      mode: z.string(), // 'first_frame' | 'first_last' | 'multi_ref'
    }),
    execute: async ({ shots, rows, cols, mode }) => {
      if (!shots.length) return { error: 'No shots provided' }
      logTaskProgress('StoryboardTool', 'grid-prompt-begin', {
        episodeId,
        shots: shots.length,
        rows,
        cols,
        mode,
      })

      if (mode === 'multi_ref') {
        const sb = shots[0]
        const payload = {
          grid_prompt: `电影级高质量参考图，${sb.description}，专业摄影，电影质感，4K分辨率，${rows}x${cols} 宫格统一风格参考图`,
          cell_prompts: shots.map(s => ({
            shot_number: s.shot_number,
            frame_type: 'reference',
            prompt: `电影级高质量参考图，${s.description}，专业摄影，电影质感，4K分辨率，统一风格`,
          })),
        }
        logTaskSuccess('StoryboardTool', 'grid-prompt-complete', { episodeId, cells: payload.cell_prompts.length, mode })
        return payload
      }

      if (mode === 'first_last') {
        const cellPrompts: Array<{ shot_number: number; frame_type: string; prompt: string }> = []
        for (const s of shots) {
          cellPrompts.push({
            shot_number: s.shot_number,
            frame_type: 'first_frame',
            prompt: `电影级高质量首帧，${s.description}，${s.shot_type || ''}，专业摄影，${rows}x${cols} 宫格风格统一`,
          })
          cellPrompts.push({
            shot_number: s.shot_number,
            frame_type: 'last_frame',
            prompt: `电影级高质量尾帧，${s.description}，${s.shot_type || ''}，专业摄影，${rows}x${cols} 宫格风格统一`,
          })
        }
        const payload = {
          grid_prompt: `${shots.length}个镜头首尾帧拼图，${shots.map(s => s.description).join(' | ')}，电影级画面，专业摄影，${rows}行${cols}列风格统一`,
          cell_prompts: cellPrompts,
        }
        logTaskSuccess('StoryboardTool', 'grid-prompt-complete', { episodeId, cells: payload.cell_prompts.length, mode })
        return payload
      }

      // first_frame mode
      const cellPrompts = shots.slice(0, rows * cols).map(s => ({
        shot_number: s.shot_number,
        frame_type: 'first_frame',
        prompt: `电影级高质量首帧，${s.description}，${s.shot_type || ''}，专业摄影，${rows}x${cols} 宫格风格统一`,
      }))
      const payload = {
        grid_prompt: `${shots.length}个镜头首帧拼图，${shots.map(s => s.description).join(' | ')}，电影级画面，专业摄影，${rows}行${cols}列风格统一`,
        cell_prompts: cellPrompts,
      }
      logTaskSuccess('StoryboardTool', 'grid-prompt-complete', { episodeId, cells: payload.cell_prompts.length, mode })
      return payload
    },
  })

  return { readStoryboardContext, saveStoryboards, updateStoryboard, generateGridPrompt }
}
