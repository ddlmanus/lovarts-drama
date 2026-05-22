import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const modelId = 'wan2.7-videoedit'
const resolutions = ['720P', '1080P']
const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4']
const videoCredits: Record<string, number> = {
  '720P': 12,
  '1080P': 22,
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
    modelId,
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
  const key = 'apimart-wan-video-edit'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Wan2.7 视频编辑参数',
    serviceType: 'video',
    description: 'Wan2.7-VideoEdit：基于已有视频进行风格迁移、内容替换、元素添加，支持参考图和音频处理。',
    parameters: json({
      protocol: 'apimart-wan-video-edit',
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      input_field: 'video_urls',
      max_reference_images: 4,
      max_video_urls: 1,
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

  add('METHOD', '视频编辑', 'edit', { reference_mode: 'edit', videoUrls: { min: 1, max: 1 }, imageUrls: { min: 0, max: 4 }, request_field: 'video_urls' })
  resolutions.forEach(value => add('RESOLUTION', value, value))
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  add('DURATION', '保留原视频时长', '0', { min: 0, max: 0 })
  for (let second = 2; second <= 10; second += 1) add('DURATION', `${second}s`, String(second), { min: second, max: second })
  add('PROMPT_EXTEND', '开启 Prompt 改写', 'true')
  add('PROMPT_EXTEND', '关闭 Prompt 改写', 'false')
  add('AUDIO_SETTING', 'AI 自动重配音频', 'auto')
  add('AUDIO_SETTING', '保留原视频音频', 'origin')
  add('WATERMARK', '添加水印', 'true')
  add('WATERMARK', '不添加水印', 'false')
  add('SEED', '随机种子', 'seed', { field: 'seed', type: 'number', min: 0 })

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

async function upsertModel(providerId: number, profileId: number) {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.modelId, modelId))
    .execute())
    .find((row: any) => row.serviceType === 'video' && row.provider === 'apimart' && (!row.userId || row.userId === 'default'))
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'video',
    provider: 'apimart',
    modelId,
    name: 'Wan2.7 VideoEdit',
    description: 'APIMart 阿里云万相 2.7 视频编辑模型，基于已有视频进行风格迁移、内容替换和元素添加。',
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/videos/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      protocol: 'apimart-wan-video-edit',
      resolution: '1080P',
      duration: 0,
      prompt_extend: true,
      watermark: false,
      audio_setting: 'auto',
    }),
    capabilities: json({
      protocol: 'apimart-wan-video-edit',
      edit: true,
      video_urls: true,
      image_urls: true,
      max_video_urls: 1,
      max_reference_images: 4,
      prompt_extend: true,
      audio_setting: ['auto', 'origin'],
      resolutions,
      aspectRatios,
      duration: { min: 0, max: 10 },
    }),
    cost: existing?.cost ? Number(existing.cost) : videoCredits['1080P'],
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(videoCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '1080P',
      default_duration: 5,
      video_credit_per_second_by_resolution: videoCredits,
    }),
    priority: existing?.priority ?? 318,
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
  await upsertModel(providerId, profileId)
  console.log('APIMart Wan2.7 VideoEdit model profile seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
