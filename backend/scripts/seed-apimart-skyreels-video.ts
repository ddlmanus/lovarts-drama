import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const modelIds = ['skyreels-v4-fast', 'skyreels-v4-std']
const aspectRatios = ['16:9', '4:3', '1:1', '9:16', '3:4']
const resolutions = ['480p', '720p', '1080p']
const fastCredits: Record<string, number> = {
  '480p': 5,
  '720p': 10,
  '1080p': 20,
}
const stdCredits: Record<string, number> = {
  '480p': 7,
  '720p': 13,
  '1080p': 26,
}

function parseJson(value: unknown, fallback: any) {
  if (!value) return fallback
  try {
    return JSON.parse(String(value))
  } catch {
    return fallback
  }
}

async function upsertProvider() {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'apimart'))
    .execute())[0]
  const existingPresetModels = parseJson(existing?.presetModels, [])
  const presetModels = Array.from(new Set([
    ...existingPresetModels,
    ...modelIds,
  ]))
  const values = {
    name: existing?.name || 'APIMart',
    displayName: existing?.displayName || 'APIMart',
    serviceType: 'all',
    provider: 'apimart',
    defaultUrl: 'https://api.apimart.ai',
    icon: existing?.icon || '',
    website: existing?.website || 'https://apimart.ai',
    rank: existing?.rank ?? 30,
    isThirdParty: true,
    supportOpenAI: true,
    presetModels: json(presetModels),
    description: existing?.description || 'APIMart API provider.',
    isActive: true,
    updatedAt: ts,
  }
  if (existing) {
    await db.update(schema.aiServiceProviders).set(values).where(eq(schema.aiServiceProviders.id, existing.id)).execute()
    return existing.id
  }
  return Number((await db.insert(schema.aiServiceProviders).values({ ...values, createdAt: ts }).execute()).insertId)
}

async function upsertProfile() {
  const ts = nowSql()
  const key = 'apimart-skyreels-v4-video'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart SkyReels V4 视频参数',
    serviceType: 'video',
    description: 'SkyReels V4：文生视频、首尾/关键帧图生视频、Omni 多模态参考，支持 Fast/Std 两档。',
    parameters: json({
      protocol: 'apimart-skyreels-v4-video',
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      i2v_fields: ['first_frame_image', 'end_frame_image', 'mid_frame_images'],
      omni_fields: ['ref_images', 'ref_videos'],
    }),
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }
  let id: number
  if (existing) {
    await db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute()
    id = existing.id
  } else {
    id = Number((await db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute()).insertId)
  }

  await db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items: Array<{ type: string; label: string; value: string; config?: unknown }> = []
  const add = (type: string, label: string, value: string, config?: unknown) => items.push({ type, label, value, config })

  add('METHOD', '文生视频', 'text2video', { reference_mode: 'text2video', required: ['prompt'] })
  add('METHOD', '首帧图生视频', 'first_frame', { reference_mode: 'first_frame', imageUrls: { min: 1, max: 1 }, request_field: 'first_frame_image' })
  add('METHOD', '首尾帧图生视频', 'first_last', { reference_mode: 'first_last', imageUrls: { min: 1, max: 2 }, request_fields: ['first_frame_image', 'end_frame_image'] })
  add('METHOD', '关键帧图生视频', 'mid_frames', { reference_mode: 'mid_frames', midFrameImages: { min: 1, max: 6 }, request_field: 'mid_frame_images' })
  add('METHOD', 'Omni 参考图', 'omni_images', { reference_mode: 'multiple', refImages: { min: 1, max: 3 }, request_field: 'ref_images' })
  add('METHOD', 'Omni 参考视频', 'omni_video', { reference_mode: 'reference', refVideos: { min: 1, max: 1 }, request_field: 'ref_videos' })
  add('METHOD', 'Omni 视频扩展', 'extend', { reference_mode: 'extend', refVideos: { min: 1, max: 1 }, request_field: 'ref_videos' })
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  resolutions.forEach(value => add('RESOLUTION', value, value))
  for (let second = 3; second <= 15; second += 1) add('DURATION', `${second}s`, String(second), { min: second, max: second })
  add('PROMPT_OPTIMIZER', '开启 Prompt 优化', 'true')
  add('PROMPT_OPTIMIZER', '关闭 Prompt 优化', 'false')

  for (const [index, item] of items.entries()) {
    await db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: item.config ? json(item.config) : null,
      rank: (index + 1) * 10,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }

  return id
}

async function upsertModel(providerId: number, profileId: number, spec: {
  modelId: string
  name: string
  description: string
  credits: Record<string, number>
  priority: number
}) {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.modelId, spec.modelId))
    .execute())
    .find((row: any) => row.serviceType === 'video' && row.provider === 'apimart' && (!row.userId || row.userId === 'default'))
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'video',
    provider: 'apimart',
    modelId: spec.modelId,
    name: spec.name,
    description: spec.description,
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/videos/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      protocol: 'apimart-skyreels-v4-video',
      resolution: '1080p',
      aspect_ratio: '16:9',
      duration: 5,
      prompt_optimizer: true,
    }),
    capabilities: json({
      protocol: 'apimart-skyreels-v4-video',
      text2video: true,
      first_frame: true,
      first_last: true,
      mid_frame_images: true,
      omni: true,
      ref_images: true,
      ref_videos: true,
      extend: true,
      prompt_optimizer: true,
      max_mid_frame_images: 6,
      max_ref_images: 3,
      max_ref_image_urls_per_item: 5,
      max_ref_videos: 1,
      resolutions,
      aspectRatios,
      duration: { min: 3, max: 15 },
    }),
    cost: existing?.cost ? Number(existing.cost) : spec.credits['720p'],
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(spec.credits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '1080p',
      video_credit_per_second_by_resolution: spec.credits,
      ref_video_multiplier: 1.75,
    }),
    priority: spec.priority,
    isDefault: existing?.isDefault ?? false,
    isActive: true,
    updatedAt: ts,
  }
  if (existing) {
    await db.update(schema.aiModelConfigs).set(values).where(eq(schema.aiModelConfigs.id, existing.id)).execute()
    return existing.id
  }
  return Number((await db.insert(schema.aiModelConfigs).values({ ...values, createdAt: ts }).execute()).insertId)
}

async function main() {
  const providerId = await upsertProvider()
  const profileId = await upsertProfile()
  await upsertModel(providerId, profileId, {
    modelId: 'skyreels-v4-fast',
    name: 'SkyReels V4 Fast',
    description: 'APIMart SkyReels V4 Fast，速度优先的视频生成模型，支持 T2V/I2V/Omni。',
    credits: fastCredits,
    priority: 330,
  })
  await upsertModel(providerId, profileId, {
    modelId: 'skyreels-v4-std',
    name: 'SkyReels V4 Std',
    description: 'APIMart SkyReels V4 Std，质量优先的视频生成模型，支持 T2V/I2V/Omni。',
    credits: stdCredits,
    priority: 320,
  })
  console.log('APIMart SkyReels V4 video model profiles seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
