import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const flashAspectRatios = [
  '1:1',
  '1:4',
  '1:8',
  '2:3',
  '3:2',
  '3:4',
  '4:1',
  '4:3',
  '4:5',
  '5:4',
  '8:1',
  '9:16',
  '16:9',
  '21:9',
]
const proAspectRatios = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9']
const flashResolutions = ['512', '1K', '2K', '4K']
const proResolutions = ['1K', '2K', '4K']
const legacyResolutions = ['1K']

async function upsertProvider() {
  const ts = nowSql()
  const provider = 'gemini'
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, provider))
    .execute())[0]
  const presetModels = [
    'gemini-3.1-flash-image-preview',
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
  ]
  const values = {
    name: 'Google Gemini',
    displayName: 'Google Gemini 图片',
    serviceType: 'all',
    provider,
    defaultUrl: 'https://generativelanguage.googleapis.com',
    icon: '',
    website: 'https://ai.google.dev/gemini-api/docs/image-generation',
    rank: 55,
    isThirdParty: false,
    supportOpenAI: false,
    presetModels: json(presetModels),
    description: 'Google Gemini 原生图片生成（Nano Banana）REST 协议，支持文生图、图像编辑、多参考图和 Google Search grounding。',
    isActive: true,
    updatedAt: ts,
  }

  if (existing) {
    await db.update(schema.aiServiceProviders).set(values).where(eq(schema.aiServiceProviders.id, existing.id)).execute()
    return existing.id
  }
  return Number((await db.insert(schema.aiServiceProviders).values({ ...values, createdAt: ts }).execute()).insertId)
}

async function upsertProfile(spec: {
  key: string
  name: string
  description: string
  aspectRatios: string[]
  resolutions: string[]
  googleSearch?: boolean
  googleImageSearch?: boolean
}) {
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
      endpoint: '/v1beta/models/{model}:generateContent',
      protocol: 'gemini-image',
      response: 'candidates[].content.parts[].inlineData.data',
      async: false,
      max_reference_images: 14,
    }),
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }
  const id = existing
    ? (await db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute(), existing.id)
    : Number((await db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute()).insertId)

  await db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items: Array<{ type: string; label: string; value: string; config?: unknown; rank: number }> = []
  let rank = 10
  const add = (type: string, label: string, value: string, config?: unknown) => {
    items.push({ type, label, value, config, rank })
    rank += 10
  }
  add('METHOD', '文生图', 'text2image', { reference_images: { min: 0, max: 0 } })
  add('METHOD', '图生图/图像编辑', 'image2image', { reference_images: { min: 1, max: 14 } })
  add('METHOD', '多参考图', 'multi_reference', { reference_images: { min: 2, max: 14 } })
  spec.aspectRatios.forEach(value => add('ASPECT_RATIO', value, value))
  spec.resolutions.forEach(value => add('SAMPLE_IMAGE_SIZE', value, value))
  if (spec.googleSearch) {
    add('GOOGLE_SEARCH', '关闭 Google 搜索', 'false')
    add('GOOGLE_SEARCH', '开启 Google 搜索', 'true')
  }
  if (spec.googleImageSearch) {
    add('GOOGLE_IMAGE_SEARCH', '关闭 Google 图片搜索', 'false')
    add('GOOGLE_IMAGE_SEARCH', '开启 Google 图片搜索', 'true')
  }

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

async function upsertModel(providerId: number, profileId: number, spec: {
  modelId: string
  name: string
  description: string
  priority: number
  aspectRatios: string[]
  resolutions: string[]
  credits: Record<string, number>
  defaults: Record<string, any>
  capabilities: Record<string, any>
}) {
  const ts = nowSql()
  const provider = 'gemini'
  const rows = (await db.select().from(schema.aiModelConfigs).execute())
    .filter((row: any) => row.serviceType === 'image' && row.provider === provider && row.modelId === spec.modelId && !row.isDeleted)
  const existing = rows.find((row: any) => row.userId === 'default') || rows.find((row: any) => !row.userId)
  const defaults = {
    protocol: 'gemini-image',
    size: '1:1',
    resolution: spec.resolutions[0] || '1K',
    n: 1,
    ...spec.defaults,
  }
  const capabilities = {
    protocol: 'gemini-image',
    text2image: true,
    image2image: true,
    image_edit: true,
    multi_image_input: true,
    max_reference_images: 14,
    max_images: 4,
    async: false,
    inline_base64: true,
    aspectRatios: spec.aspectRatios,
    resolutions: spec.resolutions,
    ...spec.capabilities,
  }
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'image',
    provider,
    modelId: spec.modelId,
    name: spec.name,
    description: spec.description,
    baseUrl: 'https://generativelanguage.googleapis.com',
    endpoint: '/v1beta/models/{model}:generateContent',
    queryEndpoint: null,
    parameters: null,
    defaults: json(defaults),
    capabilities: json(capabilities),
    cost: existing?.cost ? Number(existing.cost) : Object.values(spec.credits)[0] || 8,
    imageCreditByResolution: json(spec.credits),
    billingConfig: json({
      unit: 'image',
      default_resolution: defaults.resolution,
      image_credit_by_resolution: spec.credits,
    }),
    priority: spec.priority,
    isDefault: existing?.isDefault ?? false,
    isActive: true,
    updatedAt: ts,
  }

  if (existing) {
    await db.update(schema.aiModelConfigs).set(values).where(eq(schema.aiModelConfigs.id, existing.id)).execute()
  } else {
    await db.insert(schema.aiModelConfigs).values({ ...values, createdAt: ts }).execute()
  }

  for (const row of rows) {
    if (row.id === existing?.id) continue
    await db.update(schema.aiModelConfigs).set({
      providerId,
      parameterProfileId: profileId,
      baseUrl: values.baseUrl,
      endpoint: values.endpoint,
      queryEndpoint: null,
      defaults: values.defaults,
      capabilities: values.capabilities,
      imageCreditByResolution: values.imageCreditByResolution,
      billingConfig: values.billingConfig,
      updatedAt: ts,
    }).where(eq(schema.aiModelConfigs.id, row.id)).execute()
  }
}

async function main() {
  const providerId = await upsertProvider()
  const flashProfileId = await upsertProfile({
    key: 'google-gemini-3-1-flash-image',
    name: 'Google Gemini 3.1 Flash Image 参数',
    description: 'Nano Banana 2：Gemini 3.1 Flash Image Preview，支持 512/1K/2K/4K、极宽比例、最多 14 张参考图和 Google Search grounding。',
    aspectRatios: flashAspectRatios,
    resolutions: flashResolutions,
    googleSearch: true,
    googleImageSearch: true,
  })
  const proProfileId = await upsertProfile({
    key: 'google-gemini-3-pro-image',
    name: 'Google Gemini 3 Pro Image 参数',
    description: 'Nano Banana Pro：Gemini 3 Pro Image Preview，面向专业资产生产，支持 1K/2K/4K、最多 14 张参考图和 Google Search grounding。',
    aspectRatios: proAspectRatios,
    resolutions: proResolutions,
    googleSearch: true,
  })
  const legacyProfileId = await upsertProfile({
    key: 'google-gemini-2-5-flash-image',
    name: 'Google Gemini 2.5 Flash Image 参数',
    description: 'Nano Banana：Gemini 2.5 Flash Image，低延迟 1024px 图片生成和图像编辑。',
    aspectRatios: proAspectRatios,
    resolutions: legacyResolutions,
  })

  await upsertModel(providerId, flashProfileId, {
    modelId: 'gemini-3.1-flash-image-preview',
    name: 'Nano Banana 2（Gemini 3.1 Flash Image）',
    description: 'Google 官方 Gemini 3.1 Flash Image Preview，速度和成本均衡，支持文生图、图像编辑、4K、极宽比例、Google Search grounding。',
    priority: 360,
    aspectRatios: flashAspectRatios,
    resolutions: flashResolutions,
    credits: { '512': 3, '1K': 6, '2K': 12, '4K': 24 },
    defaults: { size: '1:1', resolution: '1K', google_search: false, google_image_search: false },
    capabilities: { google_search: true, google_image_search: true, thinking_level: ['minimal', 'high'] },
  })
  await upsertModel(providerId, proProfileId, {
    modelId: 'gemini-3-pro-image-preview',
    name: 'Nano Banana Pro（Gemini 3 Pro Image）',
    description: 'Google 官方 Gemini 3 Pro Image Preview，适合专业资产生产、复杂指令和高保真文字渲染。',
    priority: 350,
    aspectRatios: proAspectRatios,
    resolutions: proResolutions,
    credits: { '1K': 8, '2K': 16, '4K': 32 },
    defaults: { size: '1:1', resolution: '1K', google_search: false },
    capabilities: { google_search: true, professional_assets: true },
  })
  await upsertModel(providerId, legacyProfileId, {
    modelId: 'gemini-2.5-flash-image',
    name: 'Nano Banana（Gemini 2.5 Flash Image）',
    description: 'Google 官方 Gemini 2.5 Flash Image，适合高吞吐、低延迟图片生成和编辑。',
    priority: 340,
    aspectRatios: proAspectRatios,
    resolutions: legacyResolutions,
    credits: { '1K': 6 },
    defaults: { size: '1:1', resolution: '1K' },
    capabilities: { max_reference_images: 3 },
  })
  console.log('Google Gemini Nano Banana image models seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
