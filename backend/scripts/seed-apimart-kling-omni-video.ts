import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const modelId = 'kling-v3-omni'
const modes = ['std', 'pro', '4k']
const aspectRatios = ['16:9', '9:16', '1:1']
const videoCredits: Record<string, number> = {
  std: 10,
  pro: 18,
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
  const key = 'apimart-kling-v3-omni-video'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Kling v3 Omni 视频参数',
    serviceType: 'video',
    description: 'Kling v3 Omni：统一文生视频/图生视频，支持图片引用、首尾帧、参考视频、多镜头和有声视频。',
    parameters: json({
      protocol: 'apimart-kling-v3-omni-video',
      endpoint: '/v1/videos/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      output_field: 'data.result.videos[].url',
      async: true,
      image_reference_syntax: '<<<image_N>>>',
      max_video_list: 1,
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
  add('METHOD', '图片引用图生视频', 'image_reference', { reference_mode: 'multiple', imageUrls: { min: 1 }, request_field: 'image_urls', syntax: '<<<image_N>>>' })
  add('METHOD', '首尾帧图生视频', 'first_last', { reference_mode: 'first_last', request_field: 'image_with_roles', roles: ['first_frame', 'last_frame', 'reference'] })
  add('METHOD', '参考视频/视频编辑', 'video_reference', { reference_mode: 'edit', videoUrls: { min: 1, max: 1 }, request_field: 'video_list' })
  add('METHOD', '多镜头分镜', 'multi_shot', { multi_shot: true, multiPrompt: { min: 1, max: 6 } })
  modes.forEach(value => add('RESOLUTION', value, value, { request_field: 'mode' }))
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  for (let second = 3; second <= 15; second += 1) add('DURATION', `${second}s`, String(second), { min: second, max: second })
  add('AUDIO', '生成有声视频', 'true')
  add('AUDIO', '不生成有声视频', 'false')
  add('WATERMARK', '添加水印', 'true')
  add('WATERMARK', '不添加水印', 'false')

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
    name: 'Kling v3 Omni',
    description: 'APIMart Kling v3 Omni 视频生成模型，支持统一文生视频/图生视频、首尾帧、参考视频、有声视频和 4K 模式。',
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/videos/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      protocol: 'apimart-kling-v3-omni-video',
      mode: 'std',
      resolution: 'std',
      aspect_ratio: '16:9',
      duration: 5,
      audio: false,
      watermark: false,
    }),
    capabilities: json({
      protocol: 'apimart-kling-v3-omni-video',
      text2video: true,
      image2video: true,
      image_urls: true,
      image_with_roles: true,
      video_list: true,
      audio: true,
      multi_shot: true,
      element_list: true,
      modes,
      resolutions: modes,
      aspectRatios,
      duration: { min: 3, max: 15 },
      image_reference_syntax: '<<<image_N>>>',
      max_video_list: 1,
      max_multi_prompt: 6,
      max_element_list: 3,
    }),
    cost: existing?.cost ? Number(existing.cost) : videoCredits.std,
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(videoCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: 'std',
      video_credit_per_second_by_resolution: videoCredits,
    }),
    priority: existing?.priority ?? 325,
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
  console.log('APIMart Kling v3 Omni video model profile seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
