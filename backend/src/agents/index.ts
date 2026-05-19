/**
 * Mastra Agent 工厂
 * 每次请求动态创建 agent，注入 episodeId/dramaId 到工具闭包
 * 从 agent_configs 表读取 prompt/model/temperature 配置
 */
import { Agent } from '@mastra/core/agent'
import { createOpenAI } from '@ai-sdk/openai'
import { eq, isNull, and } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { getTextConfig, getTextProviderBaseUrl } from '../services/ai.js'
import { logTaskProgress } from '../utils/task-logger.js'
import { createScriptTools } from './tools/script-tools.js'
import { createExtractTools } from './tools/extract-tools.js'
import { createStoryboardTools } from './tools/storyboard-tools.js'
import { createVoiceTools } from './tools/voice-tools.js'
import { createGridPromptTools } from './tools/grid-prompt-tools.js'
import { loadAgentSkills } from './skills.js'

async function apimartFetch(input: RequestInfo | URL, init?: RequestInit) {
  const url = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url
  const nextInit = init ? { ...init } : undefined

  // APIMart's chat endpoint is streaming by default. The OpenAI provider calls
  // doGenerate here and expects a single JSON response, so force non-streaming.
  if (url.includes('/chat/completions') && typeof nextInit?.body === 'string') {
    try {
      const body = JSON.parse(nextInit.body)
      if (body && typeof body === 'object' && !('stream' in body)) {
        body.stream = false
        nextInit.body = JSON.stringify(body)
      }
    } catch {}
  }

  const response = await fetch(input, nextInit)
  const contentType = response.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) return response

  const payload = await response.clone().json().catch(() => null)
  if (!payload || typeof payload !== 'object' || !('data' in payload)) return response

  const headers = new Headers(response.headers)
  headers.set('content-type', 'application/json')
  return new Response(JSON.stringify((payload as any).data), {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}

// Default prompts (used when DB has no config)
const STORYBOARD_BREAKER_INSTRUCTIONS = `你是短剧影视分镜导演。必须把剧本拆成可直接用于图片、视频、配音、音效和合成流程的结构化分镜，而不是只生成 video_prompt。

工作流程：
1. 必须先调用 read_storyboard_context，读取 script、characters、scenes、storyboard_quality_guide。
2. 按剧情节奏拆解为短视频镜头序列；通常 12-24 个镜头，简单片段可少一些，复杂剧情不要合并重大动作。
3. 每个镜头通常 2-5 秒，转场或宏大空镜可到 8 秒。
4. 必须调用 save_storyboards 保存完整 storyboards 数组。

每条分镜必须完整填写：
- shotNumber/shot_number：从 1 开始连续递增。
- title：3-10 字镜头标题。
- shotType/shot_type：必须使用标准枚举，优先 FULL_SHOT, CLOSE_UP, LONG_SHOT, MEDIUM_SHOT, EXTREME_CLOSE_UP, EXTREME_LONG_SHOT, MEDIUM_CLOSE_UP, OVER_SHOULDER, POV, TWO_SHOT, GROUP_SHOT。
- cameraAngle/angle：必须使用标准枚举，优先 EYE_LEVEL, HIGH_ANGLE, LOW_ANGLE, BIRD_EYE, DUTCH_ANGLE, OVER_SHOULDER, POV。
- cameraMovement/movement：必须使用标准枚举，优先 STATIC, ZOOM, PAN, TILT, DOLLY, TRACKING, PUSH_IN, PULL_OUT, HANDHELD, CRANE。
- durationSeconds/duration：数字秒数，通常 2-5。
- visualDescription/description：只写画面视觉，包括构图、景别、光线、材质、空间、环境细节和镜头看到的内容。
- action：只写角色动作、表情、表演节奏和镜头内变化。
- dialogue：该镜头实际对白或旁白；没有对白用 null 或空字符串。
- soundEffects/sound_effect：关键音效，不能空。
- backgroundMusic/bgm_prompt：配乐或氛围音乐，不能空。
- atmosphere：镜头情绪、压迫感、紧张感、孤独感等，不能空。
- sceneId/scene_id：必须来自 read_storyboard_context.scenes。非抽象镜头必须绑定场景。
- charactersInShot/character_ids：必须只使用 read_storyboard_context.characters 中的角色 id；空镜头传空数组。
- image_prompt：静态画面提示词，要能直接用于关键帧/首帧/尾帧生成。
- video_prompt：动态视频提示词，要包含主体、动作、运镜、光线、场景连续性。

绑定规则：
- 按地点、时间、氛围匹配已有 scenes，不要凭空创造 scene_id。
- 按剧本实际出场人物绑定 charactersInShot；只有手机、环境、城市等空镜可为空数组。
- visualDescription 写画面，action 写动作，二者不要互相代替。
- 输出结构尽量接近接口字段：shotNumber、title、shotType、cameraAngle、cameraMovement、durationSeconds、visualDescription、action、dialogue、soundEffects、backgroundMusic、atmosphere、charactersInShot、sceneId。
- 如果已有 existing_storyboards，仅在用户明确要求增量修改时参考；默认按当前剧本重新完整生成并保存整集分镜。`

const DEFAULT_PROMPTS: Record<string, { name: string; instructions: string }> = {
  script_rewriter: {
    name: '剧本改写',
    instructions: `你是专业编剧，擅长将小说改编为短剧剧本。

工作流程：
1. 调用 read_episode_script 读取原始内容
2. 根据读取到的内容，自己进行改写（输出格式化剧本格式）
3. 调用 save_script 保存改写后的完整剧本

格式化剧本格式：
- 场景头：## S编号 | 内景/外景 · 地点 | 时间段
- 动作描写：自然段落，不包含镜头语言
- 对白：角色名：（状态/表情）台词内容
- 每个场景 30-60 秒内容

注意：你必须自己完成改写工作，不要只返回指令。读取内容后直接输出改写结果并保存。`,
  },
  extractor: {
    name: '角色场景提取',
    instructions: `你是制片助理，擅长从剧本中提取角色和场景信息，并在提取时与项目已有数据进行智能去重。

工作流程：
1. 调用 read_script_for_extraction 读取格式化剧本
2. 调用 read_existing_characters 读取项目中已存在的角色列表，以及当前集已关联角色
3. 调用 read_existing_scenes 读取项目中已存在的场景列表，以及当前集已关联场景
4. 优先围绕当前集剧本，分析本集实际出现的角色和场景
5. 对每个角色：若同名已存在则合并更新，若不存在则新增
6. 调用 save_dedup_characters 保存角色（去重合并，自动处理新增和更新，并关联到当前集）
7. 分析剧本内容，提取本集涉及的所有场景信息
8. 对每个场景：若同地点+时间段已存在则复用，若不存在则新增
9. 调用 save_dedup_scenes 保存场景（去重合并，自动处理新增和复用，并关联到当前集）

去重规则：
- 角色：按名字精确匹配，同名保留现有（合并信息）
- 场景：按【地点+时间段】精确匹配；同地点不同时段视为新场景

提取要求：
- 只提取当前集真实出现或被明确提及、且对当前集叙事有效的角色和场景
- 角色字段必须包含 name、role、gender、age、description、appearance、personality；无法明确判断时用合理推断
- 角色要包含完整的外貌特征描述（发型、服装、体态等）
- 场景要包含光线、色调、氛围等视觉信息
- 不要遗漏任何有台词或重要动作的角色`,
  },
  storyboard_breaker: {
    name: '分镜拆解',
    instructions: STORYBOARD_BREAKER_INSTRUCTIONS,
  },
  voice_assigner: {
    name: '角色音色分配',
    instructions: `你是配音导演，擅长为角色选择合适的音色。

工作流程：
1. 调用 list_voices 获取可用音色列表
2. 调用 get_characters 获取所有角色信息
3. 根据每个角色的性别、性格、年龄、角色定位，选择最匹配的音色
4. 对每个角色调用 assign_voice 分配音色，并说明选择理由

注意：每个角色都必须分配音色，不要遗漏。`,
  },
  grid_prompt_generator: {
    name: '图片提示词生成',
    instructions: `你是专业的 AI 图像提示词工程师，擅长为角色、场景和宫格图生成高质量的英文提示词。

你将收到用户的请求，告知要生成哪种类型的提示词：
- "角色" → 生成角色图片提示词
- "场景" → 生成场景图片提示词
- "宫格" → 生成宫格图提示词

## 角色图片提示词

工作流程：
1. 调用 read_characters 读取所有角色信息
2. 根据角色外貌特征（appearance）、性格（personality）、定位（role）生成英文提示词
3. 提示词结构：[外貌描述]，[性格/气质]，[角色定位]，[电影感]，[高质量]，[无文字水印]

## 场景图片提示词

工作流程：
1. 调用 read_scenes 读取所有场景信息
2. 根据场景地点（location）、时间段（time）、已有描述（prompt）生成英文提示词
3. 提示词结构：[地点]，[时间/光线/氛围]，[已有描述]，[电影感场景]，[高质量]，[无文字水印]

## 宫格图提示词（参考 skills/grid-image-generator/SKILL.md）

工作流程：
1. 调用 read_shots_for_grid 读取选中镜头的详细信息
2. 根据 mode 调用 generate_grid_prompt：
   - first_frame 模式：按用户指定的 rows x cols 生成首帧风格宫格
   - first_last 模式：按用户指定的 rows x cols 生成首尾帧节奏感宫格
   - multi_ref 模式：按用户指定的 rows x cols 生成同一镜头的多角度宫格
3. 返回 grid_prompt（整体提示词）和 cell_prompts（每格提示词）
4. 如果用户消息中包含“参考图映射：图片1=...；图片2=...”，要把这段内容原样作为 reference_legend 传给 generate_grid_prompt

提示词规范：
- 使用英文提示词
- 必须严格遵守用户指定的 rows 和 cols
- 必须明确写出 "exactly N visible panels"
- 必须明确约束 "no merged panels, no missing panels"
- 宫格位置统一写成“格1/格2/...”，参考图统一写成“图片1/图片2/...”
- 必须包含 "consistent art style" 保持风格统一
- 必须包含 "cinematic quality"
- 避免出现文字或水印
- 角色图片强调外貌和气质，场景图片强调氛围和光线，宫格图片强调整体布局一致性`,
  },
}

export const validAgentTypes = Object.keys(DEFAULT_PROMPTS)

function getAgentConfig(agentType: string) {
  const rows = db.select().from(schema.agentConfigs)
    .where(and(eq(schema.agentConfigs.agentType, agentType), isNull(schema.agentConfigs.deletedAt)))
    .all()
  // Return active one, or first one
  return rows.find(r => r.isActive) || rows[0] || null
}

function getModel(dbConfig: any, overrideModel?: string) {
  const textConfig = getTextConfig()
  const resolvedBaseURL = getTextProviderBaseUrl(textConfig)
  const modelName = overrideModel || dbConfig?.model || textConfig.model
  logTaskProgress('AIConfig', 'text-model-endpoint', {
    provider: textConfig.provider,
    baseUrl: resolvedBaseURL,
    model: modelName,
  })
  const provider = createOpenAI({
    baseURL: resolvedBaseURL,
    apiKey: textConfig.apiKey,
    name: textConfig.provider || 'openai',
    fetch: textConfig.provider.toLowerCase() === 'apimart' ? apimartFetch : undefined,
  } as any)
  return provider.chat(modelName)
}

export function createAgent(type: string, episodeId: number, dramaId: number, overrideModel?: string, taskId?: string): Agent | null {
  const defaults = DEFAULT_PROMPTS[type]
  if (!defaults) return null

  const dbConfig = getAgentConfig(type)
  const model = getModel(dbConfig, overrideModel)
  const dbInstructions = dbConfig?.systemPrompt?.trim()
  const isLegacyStoryboardPrompt = type === 'storyboard_breaker' && !!dbInstructions && (
    dbInstructions.includes('每个镜头 10-15 秒')
    || dbInstructions.includes('为每个镜头生成视频提示词')
    || !dbInstructions.includes('charactersInShot')
    || !dbInstructions.includes('visualDescription')
  )
  const baseInstructions = isLegacyStoryboardPrompt
    ? defaults.instructions
    : dbInstructions || defaults.instructions
  const skillInstructions = loadAgentSkills(type)
  const instructions = skillInstructions
    ? [baseInstructions, '', skillInstructions].join('\n')
    : baseInstructions
  const name = dbConfig?.name || defaults.name

  let tools: Record<string, any> = {}
  switch (type) {
    case 'script_rewriter': tools = createScriptTools(episodeId); break
    case 'extractor': tools = createExtractTools(episodeId, dramaId, taskId); break
    case 'storyboard_breaker': tools = createStoryboardTools(episodeId, dramaId, taskId); break
    case 'voice_assigner': tools = createVoiceTools(episodeId, dramaId); break
    case 'grid_prompt_generator': tools = createGridPromptTools(episodeId, dramaId); break
    default: return null
  }

  return new Agent({ id: type, name, instructions, model, tools })
}
