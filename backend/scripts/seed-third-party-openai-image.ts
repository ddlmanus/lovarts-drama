import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowSql = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

const aspectRatios = [
  'auto',
  '1:1',
  '16:9',
  '9:16',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '3:1',
  '1:3',
]
const resolutions = ['1k', '2k', '4k']
const qualities = ['auto', 'low', 'medium', 'high']
const outputFormats = ['png', 'jpeg', 'webp']
const backgrounds = ['auto', 'transparent', 'opaque']
const moderations = ['auto', 'low']
const partialImages = ['0', '1', '2', '3']

async function upsertProvider() {
  const ts = nowSql()
  const provider = 'openai-compatible-image'
  const existing = (await db.select().from(schema.aiServiceProviders)
    .where(eq(schema.aiServiceProviders.provider, provider))
    .execute())[0]

  const values = {
    name: '第三方 OpenAI Images',
    displayName: 'OpenAI Images 兼容',
    serviceType: 'image',
    provider,
    defaultUrl: 'https://api.openai.com',
    icon: '',
    website: 'https://platform.openai.com/docs/guides/images',
    rank: 60,
    isThirdParty: true,
    supportOpenAI: true,
    presetModels: json(['gpt-image-2', 'gpt-image-2-2026-04-21', 'gpt-image-1.5', 'gpt-image-1', 'gpt-image-1-mini']),
    description: '第三方 OpenAI Images API 兼容供应商模板，按官方 /v1/images/generations 和 /v1/images/edits 协议调用。',
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
  const key = 'third-party-openai-image'
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, key))
    .execute())[0]

  const values = {
    key,
    name: '第三方 OpenAI Images 参数',
    serviceType: 'image',
    description: 'OpenAI 官方 Images API 参数：size 表示比例，resolution 表示 1k/2k/4k 输出档位。',
    parameters: json({
      endpoint: '/v1/images/generations',
      edit_endpoint: '/v1/images/edits',
      protocol: 'openai-image',
      response: 'data[].b64_json',
      async: false,
      max_reference_images: 16,
    }),
    isBuiltin: true,
    isActive: true,
    updatedAt: ts,
  }

  const id = existing
    ? (await db.update(schema.aiModelParameterProfiles).set(values).where(eq(schema.aiModelParameterProfiles.id, existing.id)).execute(), existing.id)
    : Number((await db.insert(schema.aiModelParameterProfiles).values({ ...values, createdAt: ts }).execute()).insertId)

  await db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  const items: Array<{ type: string; label: string; value: string; rank: number }> = []
  let rank = 10
  const add = (type: string, values: string[]) => {
    for (const value of values) {
      items.push({ type, label: value, value, rank })
      rank += 10
    }
  }

  add('ASPECT_RATIO', aspectRatios)
  add('SAMPLE_IMAGE_SIZE', resolutions)
  add('QUALITY', qualities)
  add('FORMAT', outputFormats)
  add('BACKGROUND', backgrounds)
  add('MODERATION', moderations)
  add('PARTIAL_IMAGES', partialImages)

  for (const item of items) {
    await db.insert(schema.aiModelParameterProfileItems).values({
      profileId: id,
      type: item.type,
      label: item.label,
      value: item.value,
      config: null,
      rank: item.rank,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }

  return id
}

async function upsertModel(providerId: number, profileId: number) {
  const ts = nowSql()
  const provider = 'openai-compatible-image'
  const modelId = 'gpt-image-2'
  const rows = (await db.select().from(schema.aiModelConfigs).execute())
    .filter((row: any) => row.serviceType === 'image' && row.provider === provider && row.modelId === modelId && !row.isDeleted)
  const existing = rows.find((row: any) => row.userId === 'default') || rows.find((row: any) => !row.userId)

  const defaults = {
    protocol: 'openai-image',
    size: '1024x1024',
    resolution: '1k',
    quality: 'auto',
    output_format: 'png',
    background: 'auto',
    moderation: 'auto',
    n: 1,
    stream: false,
  }
  const capabilities = {
    protocol: 'openai-image',
    text2image: true,
    image2image: true,
    image_edit: true,
    mask_url: true,
    multi_image_input: true,
    max_reference_images: 16,
    max_images: 10,
    custom_size: true,
    arbitrary_resolution: true,
    max_resolution: '3840x2160',
    divisible_by: 16,
    aspect_ratio_min: '1:3',
    aspect_ratio_max: '3:1',
    aspectRatios,
    resolutions,
    qualities,
    outputFormats,
    backgrounds,
    moderation: moderations,
    input_fidelity: ['high', 'low'],
    streaming: true,
    partial_images: true,
  }
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'image',
    provider,
    modelId,
    name: 'GPT-Image-2（第三方 OpenAI 协议）',
    description: '第三方 OpenAI 兼容供应商的 GPT-Image-2，无参考图走 /v1/images/generations，有参考图走 /v1/images/edits。',
    baseUrl: 'https://api.openai.com',
    endpoint: '/v1/images/generations',
    queryEndpoint: '/v1/images/edits',
    parameters: null,
    defaults: json(defaults),
    capabilities: json(capabilities),
    cost: existing?.cost ? Number(existing.cost) : 20,
    imageCreditByResolution: json({
      '1k': 10,
      '2k': 20,
      '4k': 40,
    }),
    billingConfig: json({
      unit: 'image',
      default_resolution: '1k',
      image_credit_by_resolution: {
        '1k': 10,
        '2k': 20,
        '4k': 40,
      },
    }),
    priority: 260,
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
      parameterProfileId: profileId,
      endpoint: '/v1/images/generations',
      queryEndpoint: '/v1/images/edits',
      defaults: json(defaults),
      capabilities: json(capabilities),
      imageCreditByResolution: values.imageCreditByResolution,
      billingConfig: values.billingConfig,
      updatedAt: ts,
    }).where(eq(schema.aiModelConfigs.id, row.id)).execute()
  }
  return existing?.id
}

async function main() {
  const providerId = await upsertProvider()
  const profileId = await upsertProfile()
  await upsertModel(providerId, profileId)
  console.log('Third-party OpenAI Images gpt-image-2 model seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
}).finally(async () => {
  await mysqlPool.end()
})
