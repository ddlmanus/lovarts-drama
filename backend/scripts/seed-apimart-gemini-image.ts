import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const aspectRatios = [
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '5:4',
  '4:5',
  '21:9',
  '1:4',
  '4:1',
  '1:8',
  '8:1',
]

const proAspectRatios = [
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
]

const resolutions = ['0.5K', '1K', '2K', '4K']
const proResolutions = ['1K', '2K', '4K']
const defaultImageCredits: Record<string, number> = {
  '0.5K': 3,
  '1K': 6,
  '2K': 12,
  '4K': 24,
}
const proImageCredits: Record<string, number> = {
  '1K': 8,
  '2K': 16,
  '4K': 32,
}

async function upsertProvider() {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'apimart'))
    .execute())[0]
  const presetModels = [
    'gpt-image-2',
    'gpt-image-2-official',
    'gemini-3.1-flash-image-preview',
    'gemini-3.1-flash-image-preview-official',
    'gemini-3-pro-image-preview',
    'gemini-3-pro-image-preview-official',
  ]
  const values = {
    name: 'APIMart',
    displayName: 'APIMart',
    serviceType: 'all',
    provider: 'apimart',
    defaultUrl: 'https://api.apimart.ai',
    icon: '',
    website: 'https://apimart.ai',
    rank: 30,
    isThirdParty: true,
    supportOpenAI: true,
    presetModels: json(presetModels),
    description: 'APIMart Images API provider.',
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
  const key = 'apimart-gemini-3-1-flash-image'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Gemini 3.1 Flash Image 参数',
    serviceType: 'image',
    description: 'Gemini-3.1-Flash-Image-preview：文生图、图生图、最高 4K、最多 14 张参考图、Google Search 增强。',
    parameters: json({
      endpoint: '/v1/images/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      input_field: 'image_urls',
      output_field: 'data.result.images[].url[]',
      max_reference_images: 14,
      async: true,
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
  add('METHOD', '文生图', 'text2image', { image_urls: { min: 0, max: 0 } })
  add('METHOD', '图生图', 'image2image', { image_urls: { min: 1, max: 14 } })
  add('METHOD', '多参考图一致性', 'multi_reference', { image_urls: { min: 2, max: 14 } })
  aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  resolutions.forEach(value => add('SAMPLE_IMAGE_SIZE', value, value))
  add('GOOGLE_SEARCH', '关闭 Google 文字搜索', 'false')
  add('GOOGLE_SEARCH', '开启 Google 文字搜索', 'true')
  add('GOOGLE_IMAGE_SEARCH', '关闭 Google 图片搜索', 'false')
  add('GOOGLE_IMAGE_SEARCH', '开启 Google 图片搜索', 'true')
  add('OFFICIAL_FALLBACK', '不使用官方兜底', 'false')
  add('OFFICIAL_FALLBACK', '使用官方兜底', 'true')

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

async function upsertProProfile() {
  const ts = nowSql()
  const key = 'apimart-gemini-3-pro-image'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart Gemini 3 Pro Image 参数',
    serviceType: 'image',
    description: 'Gemini-3-Pro-Image-preview：异步高质量专业图像生成、图生图、最多 14 张参考图。',
    parameters: json({
      endpoint: '/v1/images/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      input_field: 'image_urls',
      output_field: 'data.result.images[].url[]',
      max_reference_images: 14,
      async: true,
      url_expires_in_hours: 24,
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
  add('METHOD', '文生图', 'text2image', { image_urls: { min: 0, max: 0 } })
  add('METHOD', '图生图/图像编辑', 'image2image', { image_urls: { min: 1, max: 14 } })
  proAspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  proResolutions.forEach(value => add('SAMPLE_IMAGE_SIZE', value, value))
  add('OFFICIAL_FALLBACK', '不使用官方兜底', 'false')
  add('OFFICIAL_FALLBACK', '使用官方兜底', 'true')

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
  official: boolean
  priority: number
  aspectRatios: string[]
  resolutions: string[]
  credits: Record<string, number>
  defaults?: Record<string, any>
  capabilities?: Record<string, any>
}) {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.modelId, spec.modelId))
    .execute())
    .find((row: any) => row.serviceType === 'image' && row.provider === 'apimart' && (!row.userId || row.userId === 'default'))
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'image',
    provider: 'apimart',
    modelId: spec.modelId,
    name: spec.name,
    description: spec.description,
    baseUrl: 'https://api.apimart.ai',
    endpoint: '/v1/images/generations',
    queryEndpoint: '/v1/tasks/{task_id}',
    parameters: null,
    defaults: json({
      size: spec.defaults?.size || '1:1',
      resolution: '1K',
      n: 1,
      ...spec.defaults,
      ...(spec.official ? {} : { official_fallback: false }),
    }),
    capabilities: json({
      text2image: true,
      image2image: true,
      multi_image_input: true,
      async: true,
      image_urls: true,
      max_reference_images: 14,
      max_images: 4,
      aspectRatios: spec.aspectRatios,
      resolutions: spec.resolutions,
      official: spec.official,
      ...spec.capabilities,
      ...(spec.official ? {} : { official_fallback: true }),
    }),
    cost: existing?.cost ? Number(existing.cost) : 12,
    imageCreditByResolution: existing?.imageCreditByResolution || existing?.image_credit_by_resolution || json(spec.credits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'image',
      default_resolution: '1K',
      image_credit_by_resolution: spec.credits,
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
  const proProfileId = await upsertProProfile()
  await upsertModel(providerId, profileId, {
    modelId: 'gemini-3.1-flash-image-preview',
    name: 'Gemini 3.1 Flash Image Preview',
    description: 'APIMart Gemini 3.1 Flash Image preview model with text-to-image, image-to-image, 4K output and Google Search enhancement.',
    official: false,
    priority: 320,
    aspectRatios,
    resolutions,
    credits: defaultImageCredits,
    defaults: { size: '16:9', google_search: false, google_image_search: false },
    capabilities: { google_search: true, google_image_search: true, extreme_aspect_ratios: ['1:4', '4:1', '1:8', '8:1'] },
  })
  await upsertModel(providerId, profileId, {
    modelId: 'gemini-3.1-flash-image-preview-official',
    name: 'Gemini 3.1 Flash Image Preview Official',
    description: 'APIMart Gemini 3.1 Flash Image preview official model with text-to-image, image-to-image, 4K output and Google Search enhancement.',
    official: true,
    priority: 330,
    aspectRatios,
    resolutions,
    credits: defaultImageCredits,
    defaults: { size: '16:9', google_search: false, google_image_search: false },
    capabilities: { google_search: true, google_image_search: true, extreme_aspect_ratios: ['1:4', '4:1', '1:8', '8:1'] },
  })
  await upsertModel(providerId, proProfileId, {
    modelId: 'gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image Preview',
    description: 'APIMart Gemini 3 Pro Image preview high-quality professional image generation model.',
    official: false,
    priority: 340,
    aspectRatios: proAspectRatios,
    resolutions: proResolutions,
    credits: proImageCredits,
  })
  await upsertModel(providerId, proProfileId, {
    modelId: 'gemini-3-pro-image-preview-official',
    name: 'Gemini 3 Pro Image Preview Official',
    description: 'APIMart Gemini 3 Pro Image preview official high-quality professional image generation model.',
    official: true,
    priority: 350,
    aspectRatios: proAspectRatios,
    resolutions: proResolutions,
    credits: proImageCredits,
  })
  console.log('APIMart Gemini image model profiles seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
