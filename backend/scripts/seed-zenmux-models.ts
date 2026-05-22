import { eq } from 'drizzle-orm'
import { db, schema } from '../src/db/index.js'

const nowIso = () => new Date().toISOString()

function json(value: unknown) {
  return JSON.stringify(value)
}

function upsertProvider() {
  const ts = nowIso()
  const existing = db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'zenmux'))
    .execute()[0]

  const values = {
    name: 'ZenMux',
    displayName: 'ZenMux',
    serviceType: 'all',
    provider: 'zenmux',
    defaultUrl: '',
    icon: '',
    website: 'https://zenmux.ai',
    rank: 10,
    isThirdParty: true,
    supportOpenAI: true,
    presetModels: json([
      'openai/gpt-5.2',
      'moonshotai/kimi-k2',
      'google/gemini-2.5-pro',
      'openai/text-embedding-3-small',
      'google/gemini-3-pro-image-preview',
      'openai/gpt-image-2',
      'gpt-image-2',
      'openai/gpt-image-1.5',
      'gpt-image-1.5',
      'qwen/qwen-image-2.0',
      'google/veo-3.1-generate-001',
      'volcengine/doubao-seedance-1.5-pro',
      'volcengine/doubao-seedance-2',
    ]),
    description: 'ZenMux public provider template. Users configure their own Base URL and API Key in user providers.',
    isActive: true,
    updatedAt: ts,
  }

  if (existing) {
    db.update(schema.aiServiceProviders).set(values).where(eq(schema.aiServiceProviders.id, existing.id)).execute()
    return existing.id
  }

  const result = db.insert(schema.aiServiceProviders).values({
    ...values,
    createdAt: ts,
  }).execute()
  return Number(result.insertId)
}

function upsertProfile() {
  const ts = nowIso()
  const key = 'zenmux-image-vertex'
  const existing = db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute()[0]
  const values = {
    key,
    name: 'ZenMux Vertex 图片参数',
    serviceType: 'image',
    description: 'ZenMux Vertex AI image generation parameters. imageSize and quality are passed through httpOptions.extraBody.',
    parameters: null,
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }
  const id = existing
    ? (db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute(), existing.id)
    : Number(db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute().insertId)

  db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items = [
    { type: 'RESOLUTION', label: '1024x1024', value: '1024x1024', rank: 10 },
    { type: 'RESOLUTION', label: '1536x1024', value: '1536x1024', rank: 20 },
    { type: 'RESOLUTION', label: '1024x1536', value: '1024x1536', rank: 30 },
    { type: 'RESOLUTION', label: '1920x1080', value: '1920x1080', rank: 40 },
    { type: 'RESOLUTION', label: '1080x1920', value: '1080x1920', rank: 50 },
    { type: 'RESOLUTION', label: '3840x2160', value: '3840x2160', rank: 60 },
    { type: 'MODE', label: 'low', value: 'low', rank: 70 },
    { type: 'MODE', label: 'medium', value: 'medium', rank: 80 },
    { type: 'MODE', label: 'high', value: 'high', rank: 90 },
    { type: 'MODE', label: 'auto', value: 'auto', rank: 100 },
    { type: 'ASPECT_RATIO', label: '1:1', value: '1:1', rank: 110 },
    { type: 'ASPECT_RATIO', label: '4:3', value: '4:3', rank: 120 },
    { type: 'ASPECT_RATIO', label: '3:4', value: '3:4', rank: 130 },
    { type: 'ASPECT_RATIO', label: '16:9', value: '16:9', rank: 140 },
    { type: 'ASPECT_RATIO', label: '9:16', value: '9:16', rank: 150 },
    { type: 'SAMPLE_IMAGE_SIZE', label: '1K', value: '1K', rank: 160 },
    { type: 'SAMPLE_IMAGE_SIZE', label: '2K', value: '2K', rank: 170 },
    { type: 'SAMPLE_IMAGE_SIZE', label: '4K', value: '4K', rank: 180 },
    { type: 'FORMAT', label: 'image/png', value: 'image/png', rank: 190 },
    { type: 'FORMAT', label: 'image/jpeg', value: 'image/jpeg', rank: 200 },
  ]
  for (const item of items) {
    db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: null,
      rank: item.rank,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }

  return id
}

function upsertOpenAIImageProfile() {
  const ts = nowIso()
  const key = 'zenmux-openai-image'
  const existing = db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute()[0]
  const values = {
    key,
    name: 'ZenMux OpenAI Image 参数',
    serviceType: 'image',
    description: 'ZenMux OpenAI Images API parameters for /images/generations and /images/edits.',
    parameters: null,
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }
  const id = existing
    ? (db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute(), existing.id)
    : Number(db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute().insertId)

  db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items = [
    { type: 'RESOLUTION', label: 'auto', value: 'auto', rank: 5 },
    { type: 'RESOLUTION', label: '1024x1024', value: '1024x1024', rank: 10 },
    { type: 'RESOLUTION', label: '1536x1024', value: '1536x1024', rank: 20 },
    { type: 'RESOLUTION', label: '1024x1536', value: '1024x1536', rank: 30 },
    { type: 'RESOLUTION', label: '1920x1080', value: '1920x1080', rank: 40 },
    { type: 'RESOLUTION', label: '3840x2160', value: '3840x2160', rank: 50 },
    { type: 'QUALITY', label: 'auto', value: 'auto', rank: 60 },
    { type: 'QUALITY', label: 'low', value: 'low', rank: 70 },
    { type: 'QUALITY', label: 'medium', value: 'medium', rank: 80 },
    { type: 'QUALITY', label: 'high', value: 'high', rank: 90 },
    { type: 'FORMAT', label: 'png', value: 'png', rank: 100 },
    { type: 'FORMAT', label: 'jpeg', value: 'jpeg', rank: 110 },
    { type: 'FORMAT', label: 'webp', value: 'webp', rank: 120 },
    { type: 'BACKGROUND', label: 'auto', value: 'auto', rank: 130 },
    { type: 'BACKGROUND', label: 'transparent', value: 'transparent', rank: 140 },
    { type: 'BACKGROUND', label: 'opaque', value: 'opaque', rank: 150 },
  ]
  for (const item of items) {
    db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: null,
      rank: item.rank,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }

  return id
}

function upsertVideoProfile() {
  const ts = nowIso()
  const key = 'zenmux-video-vertex'
  const existing = db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute()[0]
  const values = {
    key,
    name: 'ZenMux Vertex 视频参数',
    serviceType: 'video',
    description: 'ZenMux Vertex AI video generation parameters for predictLongRunning/fetchPredictOperation.',
    parameters: null,
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }
  const id = existing
    ? (db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute(), existing.id)
    : Number(db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute().insertId)

  db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items = [
    { type: 'ASPECT_RATIO', label: '16:9', value: '16:9', rank: 10 },
    { type: 'ASPECT_RATIO', label: '9:16', value: '9:16', rank: 20 },
    { type: 'ASPECT_RATIO', label: '1:1', value: '1:1', rank: 30 },
    { type: 'RESOLUTION', label: '720p', value: '720p', rank: 40 },
    { type: 'RESOLUTION', label: '1080p', value: '1080p', rank: 50 },
    { type: 'DURATION', label: '5s', value: '5', rank: 60 },
    { type: 'DURATION', label: '8s', value: '8', rank: 70 },
    { type: 'DURATION', label: '10s', value: '10', rank: 80 },
    { type: 'AUDIO', label: 'Generate audio', value: 'true', rank: 90 },
  ]
  for (const item of items) {
    db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: null,
      rank: item.rank,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }

  return id
}

function upsertModel(providerId: number, profileId: number, model: {
  modelId: string
  name: string
  description: string
  serviceType?: string
  defaults?: Record<string, unknown>
  capabilities?: Record<string, unknown>
  priority: number
}) {
  const ts = nowIso()
  const existing = db.select().from(schema.aiModelConfigs).execute()
    .find(row => !row.userId && row.provider === 'zenmux' && row.serviceType === (model.serviceType || 'image') && row.modelId === model.modelId)
  const values = {
    userId: null,
    providerId,
    sourceModelId: null,
    parameterProfileId: model.serviceType === 'text' ? null : profileId,
    serviceType: model.serviceType || 'image',
    provider: 'zenmux',
    modelId: model.modelId,
    name: model.name,
    description: model.description,
    baseUrl: null,
    endpoint: null,
    queryEndpoint: null,
    parameters: null,
    defaults: json(model.defaults || {}),
    capabilities: json(model.capabilities || {}),
    cost: 1,
    priority: model.priority,
    isDefault: model.modelId === 'google/gemini-3-pro-image-preview',
    isActive: true,
    updatedAt: ts,
  }

  if (existing) {
    db.update(schema.aiModelConfigs).set(values).where(eq(schema.aiModelConfigs.id, existing.id)).execute()
    return
  }

  db.insert(schema.aiModelConfigs).values({
    ...values,
    createdAt: ts,
  }).execute()
}

const providerId = upsertProvider()
const profileId = upsertProfile()
const openAIImageProfileId = upsertOpenAIImageProfile()
const videoProfileId = upsertVideoProfile()
upsertModel(providerId, profileId, {
  modelId: 'openai/text-embedding-3-small',
  name: 'Text Embedding 3 Small',
  description: 'ZenMux OpenAI-compatible embeddings model.',
  serviceType: 'embedding',
  defaults: {
    protocol: 'openai-embeddings',
    dimensions: 1536,
  },
  capabilities: {
    protocol: 'openai-embeddings',
    embeddings: true,
    custom_dimensions: true,
    max_input_tokens: 8191,
  },
  priority: 120,
})
upsertModel(providerId, profileId, {
  modelId: 'openai/gpt-5.2',
  name: 'GPT 5.2',
  description: 'ZenMux OpenAI reasoning and web search model through Chat Completion API.',
  serviceType: 'text',
  defaults: {
    protocol: 'openai-chat',
    max_tokens: 4096,
    reasoning_effort: 'medium',
  },
  capabilities: {
    protocol: 'openai-chat',
    reasoning: true,
    web_search: true,
    prompt_cache: true,
  },
  priority: 110,
})
upsertModel(providerId, profileId, {
  modelId: 'moonshotai/kimi-k2',
  name: 'Kimi K2',
  description: 'ZenMux tool calling text model through OpenAI Chat Completion API.',
  serviceType: 'text',
  defaults: {
    protocol: 'openai-chat',
    max_tokens: 4096,
  },
  capabilities: {
    protocol: 'openai-chat',
    tool_calling: true,
    parallel_tool_calls: true,
    prompt_cache: true,
  },
  priority: 105,
})
upsertModel(providerId, profileId, {
  modelId: 'google/gemini-2.5-pro',
  name: 'Gemini 2.5 Pro',
  description: 'ZenMux multimodal text model through OpenAI Chat Completion API.',
  serviceType: 'text',
  defaults: { protocol: 'openai-chat', max_tokens: 2048 },
  capabilities: {
    protocol: 'openai-chat',
    multimodal: true,
    input_image: true,
    input_pdf: true,
    input_audio: true,
    input_video: true,
  },
  priority: 100,
})
upsertModel(providerId, profileId, {
  modelId: 'qwen/qwen3-max-preview',
  name: 'Qwen3 Max Preview',
  description: 'ZenMux reasoning text model through OpenAI Chat Completion API.',
  serviceType: 'text',
  defaults: {
    protocol: 'openai-chat',
    max_tokens: 4096,
    reasoning_effort: 'medium',
  },
  capabilities: {
    protocol: 'openai-chat',
    reasoning: true,
    reasoning_effort: true,
    reasoning_max_tokens: true,
  },
  priority: 90,
})
upsertModel(providerId, profileId, {
  modelId: 'anthropic/claude-sonnet-4.5',
  name: 'Claude Sonnet 4.5',
  description: 'ZenMux Claude reasoning model through OpenAI Chat Completion API with cache_control support.',
  serviceType: 'text',
  defaults: {
    protocol: 'openai-chat',
    max_tokens: 4096,
  },
  capabilities: {
    protocol: 'openai-chat',
    reasoning: true,
    thinking: true,
    prompt_cache: true,
    context_1m: true,
  },
  priority: 80,
})
upsertModel(providerId, profileId, {
  modelId: 'google/gemini-3-pro-image-preview',
  name: 'Gemini 3 Pro Image Preview',
  description: 'Google Gemini image model through ZenMux Vertex generateContent.',
  defaults: { output_mime_type: 'image/png' },
  capabilities: { protocol: 'vertex-gemini', text_image_response: true },
  priority: 100,
})
upsertModel(providerId, profileId, {
  modelId: 'openai/gpt-image-2',
  name: 'GPT Image 2',
  description: 'OpenAI image model through ZenMux Vertex generateImages/editImage.',
  defaults: { imageSize: '1024x1024', quality: 'high', output_mime_type: 'image/png' },
  capabilities: { protocol: 'vertex-image', image_edit: true, custom_size: true },
  priority: 90,
})
upsertModel(providerId, openAIImageProfileId, {
  modelId: 'gpt-image-2',
  name: 'GPT Image 2 (OpenAI Image)',
  description: 'OpenAI image model through ZenMux OpenAI Images API.',
  defaults: {
    protocol: 'openai-image',
    size: '1024x1024',
    quality: 'high',
    output_format: 'png',
  },
  capabilities: {
    protocol: 'openai-image',
    image_edit: true,
    custom_size: true,
    background: true,
    input_fidelity: true,
    stream: false,
  },
  priority: 85,
})
upsertModel(providerId, profileId, {
  modelId: 'openai/gpt-image-1.5',
  name: 'GPT Image 1.5',
  description: 'OpenAI image model through ZenMux Vertex generateImages/editImage.',
  defaults: { imageSize: '1024x1024', quality: 'auto', output_mime_type: 'image/png' },
  capabilities: { protocol: 'vertex-image', image_edit: true },
  priority: 80,
})
upsertModel(providerId, openAIImageProfileId, {
  modelId: 'gpt-image-1.5',
  name: 'GPT Image 1.5 (OpenAI Image)',
  description: 'OpenAI image model through ZenMux OpenAI Images API.',
  defaults: {
    protocol: 'openai-image',
    size: '1024x1024',
    quality: 'auto',
    output_format: 'png',
  },
  capabilities: {
    protocol: 'openai-image',
    image_edit: true,
    background: true,
    input_fidelity: true,
    stream: false,
  },
  priority: 75,
})
upsertModel(providerId, profileId, {
  modelId: 'qwen/qwen-image-2.0',
  name: 'Qwen Image 2.0',
  description: 'Qwen image model through ZenMux Vertex generateImages/editImage.',
  defaults: { imageSize: '1024x1024', quality: 'high', output_mime_type: 'image/png' },
  capabilities: { protocol: 'vertex-image', image_edit: true },
  priority: 70,
})
upsertModel(providerId, videoProfileId, {
  modelId: 'google/veo-3.1-generate-001',
  name: 'Google Veo 3.1',
  description: 'Google Veo 3.1 video generation through ZenMux Vertex AI predictLongRunning.',
  serviceType: 'video',
  defaults: {
    protocol: 'vertex-video',
    aspectRatio: '16:9',
    duration: 8,
    resolution: '720p',
    generateAudio: true,
    numberOfVideos: 1,
  },
  capabilities: {
    protocol: 'vertex-video',
    text_to_video: true,
    image_to_video: true,
    last_frame: true,
    audio: true,
    resolutions: ['720p', '1080p'],
    max_duration_seconds: 8,
  },
  priority: 95,
})
upsertModel(providerId, videoProfileId, {
  modelId: 'volcengine/doubao-seedance-1.5-pro',
  name: 'Doubao Seedance 1.5 Pro',
  description: 'ByteDance Seedance 1.5 Pro video generation through ZenMux Vertex AI protocol.',
  serviceType: 'video',
  defaults: {
    protocol: 'vertex-video',
    aspectRatio: '16:9',
    duration: 10,
    resolution: '720p',
    generateAudio: true,
    numberOfVideos: 1,
  },
  capabilities: {
    protocol: 'vertex-video',
    text_to_video: true,
    image_to_video: true,
    audio: true,
    resolutions: ['720p', '1080p'],
    max_duration_seconds: 10,
  },
  priority: 90,
})
upsertModel(providerId, videoProfileId, {
  modelId: 'volcengine/doubao-seedance-2',
  name: 'Doubao Seedance 2',
  description: 'ByteDance Seedance 2 video generation through ZenMux Vertex AI protocol.',
  serviceType: 'video',
  defaults: {
    protocol: 'vertex-video',
    aspectRatio: '16:9',
    duration: 10,
    resolution: '720p',
    generateAudio: true,
    numberOfVideos: 1,
  },
  capabilities: {
    protocol: 'vertex-video',
    text_to_video: true,
    image_to_video: true,
    audio: true,
    resolutions: ['720p', '1080p'],
    max_duration_seconds: 10,
  },
  priority: 85,
})

console.log(`Seeded ZenMux provider ${providerId}, parameter profiles ${profileId}/${openAIImageProfileId}/${videoProfileId}, text, embedding, image, and video models.`)
