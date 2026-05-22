import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const modelId = 'Omni-Flash-Ext'
const protocol = 'apimart-omni-flash-ext-video'
const resolutions = ['720p', '1080p', '4k']
const aspectRatios = ['16:9', '9:16']
const durations = [4, 6, 8, 10]
const videoCredits: Record<string, number> = {
  '720p': 10,
  '1080p': 18,
  '4k': 40,
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
  const key = protocol
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Omni-Flash-Ext 视频参数',
    serviceType: 'video',
    description: 'Omni-Flash-Ext：文生视频、单图生视频和 3 张参考图融合，支持 720p/1080p/4k 与 4/6/8/10 秒时长。',
    parameters: json({
      protocol,
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      input_field: 'image_urls',
      allowed_image_counts: [0, 1, 3],
      max_reference_images: 3,
      base64_images: true,
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

  add('METHOD', '文生视频', 'text2video', { reference_mode: 'text2video', imageUrls: { min: 0, max: 0 }, required: ['prompt'] })
  add('METHOD', '单图生视频', 'image2video', { reference_mode: 'single', imageUrls: { min: 1, max: 1 }, request_field: 'image_urls' })
  add('METHOD', '3 张参考图融合', 'reference_fusion', { reference_mode: 'multiple', imageUrls: { min: 3, max: 3 }, request_field: 'image_urls' })
  resolutions.forEach(value => add('RESOLUTION', value, value))
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  durations.forEach(second => add('DURATION', `${second}s`, String(second), { min: second, max: second }))

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
    name: 'Omni-Flash-Ext',
    description: 'APIMart Omni-Flash-Ext 视频生成模型，支持文生视频、单图生视频和 3 张参考图融合。',
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/videos/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      protocol,
      resolution: '720p',
      aspect_ratio: '16:9',
      duration: 6,
    }),
    capabilities: json({
      protocol,
      text2video: true,
      image2video: true,
      reference_fusion: true,
      image_urls: true,
      allowed_image_counts: [0, 1, 3],
      max_reference_images: 3,
      base64_images: true,
      resolutions,
      aspectRatios,
      durations,
      duration: { values: durations },
    }),
    cost: existing?.cost ? Number(existing.cost) : videoCredits['720p'],
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(videoCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '720p',
      video_credit_per_second_by_resolution: videoCredits,
    }),
    priority: existing?.priority ?? 314,
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
  console.log('APIMart Omni-Flash-Ext video model profile seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
