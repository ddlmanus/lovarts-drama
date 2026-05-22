import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, notFound, created, badRequest, now } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { joinProviderUrl } from '../services/adapters/url.js'
import { redactUrl, logTaskError, logTaskProgress, logTaskSuccess } from '../utils/task-logger.js'

const app = new Hono()

const HUOBAO_PRESET_SERVICES = [
  { serviceType: 'text', label: '文本', provider: 'chatfire', baseUrl: 'https://api.chatfire.site', model: 'gemini-3.1-pro-preview', priority: 100 },
  { serviceType: 'image', label: '图片', provider: 'chatfire', baseUrl: 'https://api.chatfire.site', model: 'doubao-seedream-4-5-251128', priority: 99 },
  { serviceType: 'video', label: '视频', provider: 'volcengine', baseUrl: 'https://api.chatfire.site/volcengine', model: 'doubao-seedance-1-5-pro-251215', priority: 98 },
  { serviceType: 'audio', label: '音频', provider: 'chatfire', baseUrl: 'https://api.chatfire.site/minimax', model: 'speech-2.8-hd', priority: 97 },
] as const

const HUOBAO_AGENT_DEFAULTS = [
  { agentType: 'script_rewriter', name: '剧本改写' },
  { agentType: 'extractor', name: '角色场景提取' },
  {
    agentType: 'storyboard_breaker',
    name: '分镜拆解',
    systemPrompt: `你是短剧影视分镜导演。必须把剧本拆成可直接用于图片、视频、配音、音效和合成流程的结构化分镜，而不是只生成 video_prompt。

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
- video_prompt：动态视频提示词，要包含主体、动作、运镜、光线、场景连续性。`,
  },
  { agentType: 'voice_assigner', name: '音色分配' },
  { agentType: 'grid_prompt_generator', name: '图片提示词生成' },
] as const

const HUOBAO_AGENT_MODEL = 'gemini-3.1-pro-preview'

function serializeConfig(row: typeof schema.aiServiceConfigs.$inferSelect) {
  return {
    ...toSnakeCase(row),
    api_key: row.apiKey ? '********' : '',
    model: row.model ? JSON.parse(row.model) : [],
  }
}

function bearerHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

function geminiHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {}
  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`
    headers['x-goog-api-key'] = apiKey
  }
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

function viduHeaders(apiKey?: string, withJson = false) {
  const headers: Record<string, string> = {}
  if (apiKey) headers.Authorization = `Token ${apiKey}`
  if (withJson) headers['Content-Type'] = 'application/json'
  return headers
}

function buildProbe(serviceType: string, provider: string, baseUrl: string, model?: string, apiKey?: string) {
  const p = provider.toLowerCase()
  const m = model || ''

  if (p === 'gemini') {
    const url = new URL(joinProviderUrl(baseUrl, '/v1beta', `/models/${m || 'gemini-2.5-flash'}:generateContent`))
    if (apiKey) url.searchParams.set('key', apiKey)
    return { method: 'POST', url: url.toString(), headers: geminiHeaders(apiKey, true), body: {} }
  }

  if (p === 'chatfire' && serviceType === 'audio') {
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/v1', '/t2a_v2'),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'openai' || p === 'openrouter' || p === 'chatfire') {
    return {
      method: 'GET',
      url: joinProviderUrl(baseUrl, '/v1', '/models'),
      headers: bearerHeaders(apiKey),
      body: undefined,
    }
  }

  if (p === 'apimart') {
    if (serviceType === 'image' || serviceType === 'video') {
      return {
        method: 'GET',
        url: joinProviderUrl(baseUrl, '/v1', '/tasks/__probe__'),
        headers: bearerHeaders(apiKey),
        body: undefined,
      }
    }
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/v1', '/chat/completions'),
      headers: bearerHeaders(apiKey, true),
      body: {
        model: m || HUOBAO_AGENT_MODEL,
        stream: false,
        messages: [
          { role: 'user', content: 'ping' },
        ],
        max_tokens: 4,
      },
    }
  }

  if (p === 'zenmux') {
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/api/v1', '/images/generations'),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'ali') {
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/api/v1', serviceType === 'video'
        ? '/services/aigc/video-generation/video-synthesis'
        : '/services/aigc/image-generation/generation'),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'volcengine') {
    const path = serviceType === 'video'
      ? '/contents/generations/tasks'
      : '/images/generations'
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/api/v3', path),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'minimax') {
    const path = serviceType === 'audio'
      ? '/t2a_v2'
      : serviceType === 'video'
        ? '/video_generation'
        : '/image_generation'
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '/v1', path),
      headers: bearerHeaders(apiKey, true),
      body: {},
    }
  }

  if (p === 'vidu') {
    return {
      method: 'POST',
      url: joinProviderUrl(baseUrl, '', '/ent/v2/img2video'),
      headers: viduHeaders(apiKey, true),
      body: {},
    }
  }

  return {
    method: 'GET',
    url: joinProviderUrl(baseUrl, '', m ? `/${m}` : '/'),
    headers: bearerHeaders(apiKey),
    body: undefined,
  }
}

// GET /ai-configs?service_type=text
app.get('/', async (c) => {
  const serviceType = c.req.query('service_type')
  let rows = await db.select().from(schema.aiServiceConfigs).execute()
  if (serviceType) rows = rows.filter(r => r.serviceType === serviceType)

  const parsed = rows.map(serializeConfig)
  return success(c, parsed)
})

// POST /ai-configs
app.post('/', async (c) => {
  const body = await c.req.json()
  const ts = now()

  // 验证必填字段
  if (!body.service_type || !body.provider) {
    return badRequest(c, 'service_type and provider are required')
  }

  const res = db.insert(schema.aiServiceConfigs).values({
    serviceType: body.service_type,
    provider: body.provider,
    name: body.name || `${body.provider}-${body.service_type}`,
    baseUrl: body.base_url || '',
    apiKey: body.api_key || '',
    model: JSON.stringify(body.model || []),
    priority: body.priority || 0,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()

  const [row] = db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.id, Number(res.insertId))).execute()

  return created(c, serializeConfig(row))
})

// POST /ai-configs/huobao-preset
app.post('/huobao-preset', async (c) => {
  const body = await c.req.json()
  const apiKey = String(body.api_key || '').trim()
  if (!apiKey) return badRequest(c, 'api_key is required')

  const ts = now()

  for (const preset of HUOBAO_PRESET_SERVICES) {
    const [existing] = await db.select().from(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.serviceType, preset.serviceType)).execute()
      .filter(row => row.provider === preset.provider)

    const values = {
      serviceType: preset.serviceType,
      provider: preset.provider,
      name: `Lovarts短剧平台默认${preset.label}服务`,
      baseUrl: preset.baseUrl,
      apiKey,
      model: JSON.stringify([preset.model]),
      priority: preset.priority,
      isActive: true,
      updatedAt: ts,
    }

    if (existing) {
      await db.update(schema.aiServiceConfigs).set(values).where(eq(schema.aiServiceConfigs.id, existing.id)).execute()
    } else {
      db.insert(schema.aiServiceConfigs).values({
        ...values,
        createdAt: ts,
      }).execute()
    }
  }

  for (const agent of HUOBAO_AGENT_DEFAULTS) {
    const [existing] = await db.select().from(schema.agentConfigs).where(eq(schema.agentConfigs.agentType, agent.agentType)).execute()
    const values = {
      name: agent.name,
      model: HUOBAO_AGENT_MODEL,
      isActive: true,
      updatedAt: ts,
    }

    if (existing) {
      await db.update(schema.agentConfigs).set(values).where(eq(schema.agentConfigs.id, existing.id)).execute()
    } else {
      db.insert(schema.agentConfigs).values({
        agentType: agent.agentType,
        description: '',
        model: HUOBAO_AGENT_MODEL,
        name: agent.name,
        systemPrompt: 'systemPrompt' in agent ? agent.systemPrompt : '',
        temperature: 0.7,
        maxTokens: 4096,
        maxIterations: 10,
        isActive: true,
        createdAt: ts,
        updatedAt: ts,
      }).execute()
    }
  }

  const configs = (await db.select().from(schema.aiServiceConfigs).execute()).map(serializeConfig)
  const agents = await db.select().from(schema.agentConfigs).execute().map(row => toSnakeCase(row))

  logTaskSuccess('AIConfig', 'huobao-preset-applied', {
    serviceCount: HUOBAO_PRESET_SERVICES.length,
    agentCount: HUOBAO_AGENT_DEFAULTS.length,
  })

  return success(c, {
    configs,
    agents,
    agent_model: HUOBAO_AGENT_MODEL,
  })
})

// POST /ai-configs/test
app.post('/test', async (c) => {
  const body = await c.req.json()
  if (!body.service_type || !body.provider || !body.base_url) {
    return badRequest(c, 'service_type, provider and base_url are required')
  }

  const model = Array.isArray(body.model) ? body.model[0] : body.model
  const probe = buildProbe(body.service_type, body.provider, body.base_url, model, body.api_key)
  const probeUrl = redactUrl(probe.url)

  logTaskProgress('AIConfig', 'probe-start', {
    serviceType: body.service_type,
    provider: body.provider,
    method: probe.method,
    url: probeUrl,
  })

  try {
    const resp = await fetch(probe.url, {
      method: probe.method,
      headers: probe.headers,
      body: probe.body ? JSON.stringify(probe.body) : undefined,
    })
    const text = await resp.text()
    const reachable = [200, 204, 400, 401, 403, 404].includes(resp.status)
    const payload = {
      ok: resp.ok,
      reachable,
      status: resp.status,
      status_text: resp.statusText,
      method: probe.method,
      url: probeUrl,
      message: reachable
        ? (resp.ok ? '端点可访问，认证与路径基本正常' : '端点已响应，请根据状态码判断认证或路径是否正确')
        : '端点未按预期响应，请检查 Base URL 和代理前缀',
      response_preview: text.slice(0, 240),
    }
    if (reachable) {
      logTaskSuccess('AIConfig', 'probe-done', {
        provider: body.provider,
        status: resp.status,
        url: probeUrl,
      })
    } else {
      logTaskError('AIConfig', 'probe-unexpected', {
        provider: body.provider,
        status: resp.status,
        url: probeUrl,
      })
    }
    return success(c, payload)
  } catch (error: any) {
    logTaskError('AIConfig', 'probe-failed', {
      provider: body.provider,
      url: probeUrl,
      error: error.message,
    })
    return success(c, {
      ok: false,
      reachable: false,
      method: probe.method,
      url: probeUrl,
      message: error.message || '请求失败',
      response_preview: '',
    })
  }
})

// GET /ai-configs/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, id)).execute()
  if (!row) return notFound(c)
  return success(c, serializeConfig(row))
})

// PUT /ai-configs/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: Record<string, any> = { updatedAt: now() }

  if ('provider' in body) updates.provider = body.provider
  if ('name' in body) updates.name = body.name
  if ('base_url' in body) updates.baseUrl = body.base_url
  if ('api_key' in body) updates.apiKey = body.api_key
  if ('model' in body) updates.model = JSON.stringify(body.model)
  if ('priority' in body) updates.priority = body.priority
  if ('is_active' in body) updates.isActive = body.is_active

  await db.update(schema.aiServiceConfigs).set(updates).where(eq(schema.aiServiceConfigs.id, id)).execute()
  return success(c)
})

// DELETE /ai-configs/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(schema.aiServiceConfigs).where(eq(schema.aiServiceConfigs.id, id)).execute()
  return success(c)
})

// GET /ai-providers
export const aiProviders = new Hono()
aiProviders.get('/', async (c) => {
  const rows = await db.select().from(schema.aiServiceProviders).execute()
  const parsed = rows.map(r => ({
    ...toSnakeCase(r),
    preset_models: r.presetModels ? JSON.parse(r.presetModels) : [],
  }))
  return success(c, parsed)
})

export default app
