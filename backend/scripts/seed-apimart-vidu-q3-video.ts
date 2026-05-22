import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const modelIds = ['viduq3-pro', 'viduq3-turbo']
const resolutions = ['540p', '720p', '1080p']
const aspectRatios = ['16:9', '9:16', '4:3', '3:4', '1:1']
const proCredits: Record<string, number> = {
  '540p': 8,
  '720p': 14,
  '1080p': 24,
}
const turboCredits: Record<string, number> = {
  '540p': 5,
  '720p': 9,
  '1080p': 16,
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
  const key = 'apimart-vidu-q3-video'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Vidu Q3 视频参数',
    serviceType: 'video',
    description: 'Vidu Q3 Pro/Turbo：文生视频、单图生视频、首尾帧生视频，支持 540p/720p/1080p 和音频直出。',
    parameters: json({
      protocol: 'apimart-vidu-q3-video',
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      input_field: 'image_urls',
      max_reference_images: 2,
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

  add('METHOD', '文生视频', 'text2video', { reference_mode: 'text2video', imageUrls: { min: 0, max: 0 } })
  add('METHOD', '图生视频', 'image2video', { reference_mode: 'single', imageUrls: { min: 1, max: 1 }, request_field: 'image_urls' })
  add('METHOD', '首尾帧生视频', 'first_last', { reference_mode: 'first_last', imageUrls: { min: 2, max: 2 }, request_field: 'image_urls' })
  resolutions.forEach(value => add('RESOLUTION', value, value))
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value, { text2video_only: true }))
  for (let second = 1; second <= 16; second += 1) add('DURATION', `${second}s`, String(second), { min: second, max: second })
  add('AUDIO', '生成音频', 'true')
  add('AUDIO', '静音视频', 'false')
  add('SEED', '随机种子', 'seed', { field: 'seed', type: 'number', min: -1, max: 4294967295 })

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
  isDefault?: boolean
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
      protocol: 'apimart-vidu-q3-video',
      resolution: '720p',
      aspect_ratio: '16:9',
      duration: 5,
      audio: true,
    }),
    capabilities: json({
      protocol: 'apimart-vidu-q3-video',
      text2video: true,
      image2video: true,
      first_last: true,
      image_urls: true,
      max_reference_images: 2,
      audio: true,
      seed: true,
      resolutions,
      aspectRatios,
      duration: { min: 1, max: 16 },
    }),
    cost: existing?.cost ? Number(existing.cost) : spec.credits['720p'],
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(spec.credits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '720p',
      video_credit_per_second_by_resolution: spec.credits,
    }),
    priority: spec.priority,
    isDefault: existing?.isDefault ?? spec.isDefault ?? false,
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
    modelId: 'viduq3-pro',
    name: 'Vidu Q3 Pro',
    description: 'APIMart Vidu Q3 Pro 视频生成模型，质量优先，支持文生视频、图生视频和首尾帧。',
    credits: proCredits,
    priority: 322,
  })
  await upsertModel(providerId, profileId, {
    modelId: 'viduq3-turbo',
    name: 'Vidu Q3 Turbo',
    description: 'APIMart Vidu Q3 Turbo 视频生成模型，速度优先，支持文生视频、图生视频和首尾帧。',
    credits: turboCredits,
    priority: 321,
  })
  console.log('APIMart Vidu Q3 video model profiles seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
