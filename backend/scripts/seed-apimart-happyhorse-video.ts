import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const aspectRatios = ['16:9', '9:16', '1:1', '4:3', '3:4']
const resolutions = ['720P', '1080P']
const videoCredits: Record<string, number> = {
  '720P': 8,
  '1080P': 16,
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
    'happyhorse-1.0',
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
  const key = 'apimart-happyhorse-video'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart HappyHorse 1.0 视频参数',
    serviceType: 'video',
    description: 'HappyHorse 1.0：文生视频、首帧图生视频、参考图生视频和视频编辑，按分辨率与秒数计费。',
    parameters: json({
      protocol: 'apimart-happyhorse-video',
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      max_reference_images: 9,
      edit_max_reference_images: 5,
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
  add('METHOD', '参考图生视频', 'reference', { reference_mode: 'multiple', imageUrls: { min: 1, max: 9 }, request_field: 'image_urls' })
  add('METHOD', '视频编辑', 'edit', { reference_mode: 'edit', videoUrls: { min: 1, max: 1 }, imageUrls: { min: 0, max: 5 }, request_field: 'video_url' })
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  resolutions.forEach(value => add('RESOLUTION', value, value))
  for (let second = 3; second <= 15; second += 1) add('DURATION', `${second}s`, String(second), { min: second, max: second })
  add('AUDIO_SETTING', '自动生成音频', 'auto')
  add('AUDIO_SETTING', '保留原视频音轨', 'origin')
  add('WATERMARK', '添加水印', 'true')
  add('WATERMARK', '不添加水印', 'false')
  add('SEED', '随机种子', 'seed', { field: 'seed', type: 'number', min: 0, max: 2147483647 })

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
  const modelId = 'happyhorse-1.0'
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
    name: 'HappyHorse 1.0',
    description: 'APIMart 阿里云百炼 HappyHorse 1.0 视频生成模型，支持 T2V/I2V/R2V/EDIT 统一入口。',
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/videos/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      protocol: 'apimart-happyhorse-video',
      resolution: '1080P',
      aspect_ratio: '16:9',
      duration: 5,
      watermark: false,
    }),
    capabilities: json({
      protocol: 'apimart-happyhorse-video',
      text2video: true,
      first_frame: true,
      reference: true,
      edit: true,
      first_frame_image: true,
      image_urls: true,
      video_url: true,
      audio_setting: ['auto', 'origin'],
      max_reference_images: 9,
      edit_max_reference_images: 5,
      resolutions,
      aspectRatios,
      duration: { min: 3, max: 15 },
      watermark: true,
    }),
    cost: existing?.cost ? Number(existing.cost) : 16,
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(videoCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '1080P',
      video_credit_per_second_by_resolution: videoCredits,
    }),
    priority: existing?.priority ?? 310,
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
  console.log('APIMart HappyHorse video model profile seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
