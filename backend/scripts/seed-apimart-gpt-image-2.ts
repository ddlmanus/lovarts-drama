import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const aspectRatios = [
  'auto',
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '5:4',
  '4:5',
  '16:9',
  '9:16',
  '2:1',
  '1:2',
  '3:1',
  '1:3',
  '21:9',
  '9:21',
]

const resolutions = ['1k', '2k', '4k']
const qualities = ['auto', 'low', 'medium', 'high']
const outputFormats = ['png', 'jpeg', 'webp']
const backgrounds = ['auto', 'opaque']
const moderations = ['auto', 'low']

const defaultImageCredits: Record<string, number> = {
  '1k': 8,
  '2k': 16,
  '4k': 32,
}

async function upsertProvider() {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'apimart'))
    .execute())[0]

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
    presetModels: json(['gpt-image-2', 'gpt-image-2-official']),
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
  const key = 'apimart-gpt-image-2'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]
  const values = {
    key,
    name: 'APIMart GPT-Image-2 图片参数',
    serviceType: 'image',
    description: 'APIMart GPT-Image-2：异步文生图、图生图、多参考图融合，size 表示比例或像素尺寸，resolution 表示 1k/2k/4k 档位。',
    parameters: json({
      endpoint: '/v1/images/generations',
      query_endpoint: '/v1/tasks/{task_id}',
      input_field: 'image_urls',
      output_field: 'data.result.images[].url[]',
      max_reference_images: 16,
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
  const add = (type: string, label: string, value: string, config?: unknown) => {
    items.push({ type, label, value, config })
  }

  add('METHOD', '文生图', 'text2image', { image_urls: { min: 0, max: 0 } })
  add('METHOD', '图生图', 'image2image', { image_urls: { min: 1, max: 16 } })
  add('METHOD', '多参考图融合', 'multi_image_fusion', { image_urls: { min: 2, max: 16 } })
  aspectRatios.forEach(value => add('ASPECT_RATIO', value === 'auto' ? '自动' : value, value))
  resolutions.forEach(value => add('SAMPLE_IMAGE_SIZE', value, value))
  add('OFFICIAL_FALLBACK', '不使用官方兜底', 'false')
  add('OFFICIAL_FALLBACK', '使用官方兜底', 'true')
  qualities.forEach(value => add('QUALITY', value, value))
  outputFormats.forEach(value => add('FORMAT', value, value))
  backgrounds.forEach(value => add('BACKGROUND', value, value))
  moderations.forEach(value => add('MODERATION', value, value))

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
  defaults: Record<string, any>
  capabilities: Record<string, any>
  priority: number
  fallbackCost: number
  fallbackCredits: Record<string, number>
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
    defaults: json(spec.defaults),
    capabilities: json(spec.capabilities),
    cost: existing?.cost ? Number(existing.cost) : spec.fallbackCost,
    imageCreditByResolution: existing?.imageCreditByResolution || existing?.image_credit_by_resolution || json(spec.fallbackCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'image',
      default_resolution: spec.defaults.resolution || '1k',
      image_credit_by_resolution: spec.fallbackCredits,
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
    modelId: 'gpt-image-2',
    name: 'GPT-Image-2',
    description: 'APIMart GPT-Image-2 asynchronous image generation model with text-to-image and image-to-image support.',
    defaults: {
      size: '1:1',
      resolution: '1k',
      n: 1,
      official_fallback: false,
    },
    capabilities: {
      text2image: true,
      image2image: true,
      multi_image_input: true,
      async: true,
      image_urls: true,
      max_reference_images: 16,
      max_images: 1,
      aspectRatios,
      resolutions,
      official_fallback: true,
    },
    priority: 300,
    fallbackCost: 16,
    fallbackCredits: defaultImageCredits,
  })
  await upsertModel(providerId, profileId, {
    modelId: 'gpt-image-2-official',
    name: 'GPT-Image-2 Official',
    description: 'APIMart OpenAI official GPT-Image-2 image generation with text-to-image, image-to-image and mask inpainting.',
    defaults: {
      size: '1:1',
      resolution: '1k',
      quality: 'auto',
      output_format: 'png',
      background: 'auto',
      moderation: 'auto',
      n: 1,
    },
    capabilities: {
      text2image: true,
      image2image: true,
      inpainting: true,
      mask_url: true,
      multi_image_input: true,
      async: true,
      image_urls: true,
      max_reference_images: 16,
      max_images: 4,
      aspectRatios,
      resolutions,
      qualities,
      outputFormats,
      backgrounds: [...backgrounds, 'transparent'],
      moderation: moderations,
    },
    priority: 310,
    fallbackCost: 20,
    fallbackCredits: { '1k': 10, '2k': 20, '4k': 40 },
  })
  console.log('APIMart GPT-Image-2 image model profile seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
