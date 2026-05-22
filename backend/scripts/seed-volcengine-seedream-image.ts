import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

type ProfileSpec = {
  key: string
  name: string
  description: string
  sizes: string[]
  outputFormats: string[]
  optimizeModes: string[]
  supportsWebSearch?: boolean
}

const defaultImageCredits: Record<string, number> = {
  '1K': 4,
  '2K': 8,
  '3K': 14,
  '4K': 20,
  '1024x1024': 4,
  '2048x2048': 8,
  '3072x3072': 14,
  '4096x4096': 20,
}

async function upsertProvider() {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, 'volcengine'))
    .execute())[0]
  const values = {
    name: 'VolcEngine',
    displayName: '火山引擎方舟',
    serviceType: 'all',
    provider: 'volcengine',
    defaultUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    icon: '',
    website: 'https://www.volcengine.com/product/ark',
    rank: 20,
    isThirdParty: false,
    supportOpenAI: true,
    presetModels: json([
      'doubao-seedream-5-0-260128',
      'doubao-seedream-5-0-lite-260128',
      'doubao-seedream-4-5-251128',
      'doubao-seedream-4-0-250828',
    ]),
    description: '火山引擎方舟 Ark 图片/视频生成，Seedream 与 Seedance 系列模型。',
    isActive: true,
    updatedAt: ts,
  }
  if (existing) {
    await db.update(schema.aiServiceProviders).set(values).where(eq(schema.aiServiceProviders.id, existing.id)).execute()
    return existing.id
  }
  return Number((await db.insert(schema.aiServiceProviders).values({ ...values, createdAt: ts }).execute()).insertId)
}

async function upsertProfile(spec: ProfileSpec) {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, spec.key))
    .execute())[0]
  const values = {
    key: spec.key,
    name: spec.name,
    serviceType: 'image',
    description: spec.description,
    parameters: json({
      endpoint: '/images/generations',
      input_field: 'image',
      output_field: 'data[].url',
      max_reference_images: 14,
      total_input_output_images_max: 15,
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
  const items: Array<{ type: string; label: string; value: string; rank: number; config?: any }> = []
  const add = (type: string, label: string, value: string, config?: any) => {
    items.push({ type, label, value, rank: items.length * 10 + 10, config })
  }

  add('METHOD', '文生图', 'text2image', { referenceImages: { min: 0, max: 0 }, sequential_image_generation: 'disabled' })
  add('METHOD', '单/多图生图', 'image2image', { referenceImages: { min: 1, max: 14 }, sequential_image_generation: 'disabled' })
  add('METHOD', '文生组图', 'text2images', { referenceImages: { min: 0, max: 0 }, sequential_image_generation: 'auto', max_images: 14 })
  add('METHOD', '单/多图生组图', 'image2images', { referenceImages: { min: 1, max: 14 }, sequential_image_generation: 'auto', max_images: 14 })
  spec.sizes.forEach(value => add('RESOLUTION', value, value))
  spec.outputFormats.forEach(value => add('FORMAT', value, value))
  add('RESPONSE_FORMAT', 'URL', 'url')
  add('RESPONSE_FORMAT', 'Base64', 'b64_json')
  add('SEQUENTIAL_IMAGE_GENERATION', '关闭组图', 'disabled')
  add('SEQUENTIAL_IMAGE_GENERATION', '自动组图', 'auto')
  ;[1, 2, 3, 4, 6, 8, 10, 14].forEach(value => add('MAX_IMAGES', `${value} 张`, String(value), { max_images: value }))
  spec.optimizeModes.forEach(value => add('OPTIMIZE_PROMPT_MODE', value, value, { optimize_prompt_options: { mode: value } }))
  if (spec.supportsWebSearch) add('TOOLS', '联网搜索', 'web_search', { tools: [{ type: 'web_search' }] })
  add('WATERMARK', '添加水印', 'true')
  add('WATERMARK', '不添加水印', 'false')
  add('STREAM', '流式输出', 'true')
  add('STREAM', '非流式输出', 'false')

  for (const item of items) {
    await db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: item.config ? json(item.config) : null,
      rank: item.rank,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }
  return id
}

async function upsertModel(providerId: number, profileId: number, modelId: string, name: string, defaults: Record<string, any>, priority: number) {
  const ts = nowSql()
  const existing = (await db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.modelId, modelId))
    .execute())
    .find((row: any) => row.serviceType === 'image' && row.provider === 'volcengine' && (!row.userId || row.userId === 'default'))
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'image',
    provider: 'volcengine',
    modelId,
    name,
    description: '火山引擎 Ark Doubao Seedream 图片生成模型。',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    endpoint: '/images/generations',
    queryEndpoint: null,
    parameters: null,
    defaults: json(defaults),
    capabilities: json({
      text2image: true,
      image2image: true,
      multi_image_input: true,
      sequential_image_generation: true,
      web_search: modelId.includes('seedream-5-0'),
      stream: true,
      max_reference_images: 14,
    }),
    cost: existing?.cost ? Number(existing.cost) : 8,
    imageCreditByResolution: existing?.imageCreditByResolution || existing?.image_credit_by_resolution || json(defaultImageCredits),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'image',
      default_resolution: defaults.size || '2K',
      image_credit_by_resolution: defaultImageCredits,
    }),
    priority,
    isDefault: modelId === 'doubao-seedream-5-0-260128',
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
  const seedream50 = await upsertProfile({
    key: 'volcengine-seedream-5-0',
    name: '火山 Seedream 5.0 图片参数',
    description: 'Seedream 5.0 lite：文生图、单/多图生图、组图、流式输出、联网搜索。',
    sizes: ['2K', '3K', '4K', '2048x2048', '3072x3072', '4096x4096'],
    outputFormats: ['png', 'jpeg'],
    optimizeModes: ['standard'],
    supportsWebSearch: true,
  })
  const seedream45 = await upsertProfile({
    key: 'volcengine-seedream-4-5',
    name: '火山 Seedream 4.5 图片参数',
    description: 'Seedream 4.5：文生图、单/多图生图、组图、流式输出。',
    sizes: ['2K', '4K', '2048x2048', '4096x4096'],
    outputFormats: ['jpeg'],
    optimizeModes: ['standard'],
  })
  const seedream40 = await upsertProfile({
    key: 'volcengine-seedream-4-0',
    name: '火山 Seedream 4.0 图片参数',
    description: 'Seedream 4.0：文生图、单/多图生图、组图、流式输出、standard/fast 提示词优化。',
    sizes: ['1K', '2K', '4K', '1024x1024', '2048x2048', '4096x4096'],
    outputFormats: ['jpeg'],
    optimizeModes: ['standard', 'fast'],
  })
  await upsertModel(providerId, seedream50, 'doubao-seedream-5-0-260128', 'Doubao Seedream 5.0 Lite', { size: '2K', output_format: 'png', response_format: 'url', watermark: false }, 400)
  await upsertModel(providerId, seedream50, 'doubao-seedream-5-0-lite-260128', 'Doubao Seedream 5.0 Lite', { size: '2K', output_format: 'png', response_format: 'url', watermark: false }, 390)
  await upsertModel(providerId, seedream45, 'doubao-seedream-4-5-251128', 'Doubao Seedream 4.5', { size: '2K', output_format: 'jpeg', response_format: 'url', watermark: false }, 350)
  await upsertModel(providerId, seedream40, 'doubao-seedream-4-0-250828', 'Doubao Seedream 4.0', { size: '2K', output_format: 'jpeg', response_format: 'url', watermark: false }, 320)
  console.log('VolcEngine Seedream image model profiles seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
