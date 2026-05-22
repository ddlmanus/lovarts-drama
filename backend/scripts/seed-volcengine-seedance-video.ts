import { eq } from 'drizzle-orm'
import { db, mysqlPool, schema } from '../src/db/index.js'

const nowIso = () => new Date().toISOString().slice(0, 19).replace('T', ' ')
const json = (value: unknown) => JSON.stringify(value)

type ProfileSpec = {
  key: string
  name: string
  description: string
  durationMax: number
  resolutions: string[]
  supportsDraft?: boolean
  supportsSeedance2Modes?: boolean
}

const defaultVideoCreditPerSecond = {
  '480p': 4,
  '720p': 8,
  '1080p': 16,
}

async function upsertProvider() {
  const ts = nowIso()
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
      'doubao-seedance-2-0-260128',
      'doubao-seedance-2-0-fast-260128',
      'doubao-seedance-1-5-pro-251215',
      'doubao-seedance-1-0-pro-250528',
      'doubao-seedance-1-0-pro-fast-251015',
    ]),
    description: '火山引擎方舟 Ark 视频生成，Seedance 系列模型。',
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
  const ts = nowIso()
  const existing = (await db.select().from(schema.aiModelParameterProfiles)
    .where(eq(schema.aiModelParameterProfiles.key, spec.key))
    .execute())[0]
  const values = {
    key: spec.key,
    name: spec.name,
    serviceType: 'video',
    description: spec.description,
    parameters: json({
      endpoint: '/contents/generations/tasks',
      poll_endpoint: '/contents/generations/tasks/{id}',
      content_types: ['text', 'image_url', 'video_url', 'audio_url', 'draft_task'],
      output_field: 'content.video_url',
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

  add('METHOD', '文生视频', 'text2video', { reference_mode: 'text2video', required: ['prompt'] })
  add('METHOD', '首帧图生视频', 'first_frame', { reference_mode: 'first_frame', imageUrls: { min: 1, max: 1 } })
  add('METHOD', '首尾帧生视频', 'start_end', { reference_mode: 'first_last', imageUrls: { min: 2, max: 2 }, roles: ['first_frame', 'last_frame'] })
  if (spec.supportsSeedance2Modes) {
    add('METHOD', '全能参考生视频', 'reference', {
      reference_mode: 'reference',
      imageUrls: { min: 0, max: 9 },
      videoUrls: { min: 0, max: 3 },
      audioUrls: { min: 0, max: 3 },
      requiresAny: ['imageUrls', 'videoUrls', 'audioUrls'],
    })
    add('METHOD', '视频编辑', 'edit', { reference_mode: 'edit', videoUrls: { min: 1, max: 3 }, imageUrls: { min: 0, max: 9 }, audioUrls: { min: 0, max: 3 } })
    add('METHOD', '视频延长', 'extend', { reference_mode: 'extend', videoUrls: { min: 1, max: 3 }, audioUrls: { min: 0, max: 3 } })
  }
  if (spec.supportsDraft) add('METHOD', 'Draft 预览', 'draft_task', { reference_mode: 'draft_task', required: ['draft_task_id'] })

  ;['21:9', '16:9', '4:3', '1:1', '3:4', '9:16', 'adaptive'].forEach(value => add('ASPECT_RATIO', value, value))
  spec.resolutions.forEach(value => add('RESOLUTION', value, value))
  for (let second = spec.durationMax === 15 ? 4 : 4; second <= spec.durationMax; second += 1) {
    add('DURATION', `${second}s`, String(second), { min: second, max: second })
  }
  add('AUDIO', '生成音频', 'true')
  add('AUDIO', '不生成音频', 'false')
  add('RETURN_LAST_FRAME', '返回尾帧', 'true')
  add('RETURN_LAST_FRAME', '不返回尾帧', 'false')
  add('SERVICE_TIER', '在线推理', 'default')
  add('SERVICE_TIER', '离线推理', 'flex')
  add('WATERMARK', '添加水印', 'true')
  add('WATERMARK', '不添加水印', 'false')
  add('CAMERA_FIXED', '固定镜头', 'true')
  add('CAMERA_FIXED', '不固定镜头', 'false')
  add('SEED', '随机种子', 'seed', { field: 'seed', type: 'number' })

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
  const ts = nowIso()
  const existing = (await db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.modelId, modelId))
    .execute())
    .find((row: any) => row.serviceType === 'video' && row.provider === 'volcengine' && (!row.userId || row.userId === 'default'))
  const values = {
    userId: 'default',
    providerId,
    parameterProfileId: profileId,
    serviceType: 'video',
    provider: 'volcengine',
    modelId,
    name,
    description: '火山引擎 Ark Doubao Seedance 视频生成模型。',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    endpoint: '/contents/generations/tasks',
    queryEndpoint: '/contents/generations/tasks/{id}',
    parameters: null,
    defaults: json(defaults),
    capabilities: json({
      text2video: true,
      first_frame: true,
      first_last: true,
      reference: modelId.includes('seedance-2-0'),
      edit: modelId.includes('seedance-2-0'),
      extend: modelId.includes('seedance-2-0'),
      generate_audio: modelId.includes('seedance-2-0') || modelId.includes('seedance-1-5'),
      return_last_frame: true,
    }),
    cost: existing?.cost ? Number(existing.cost) : 8,
    videoCreditPerSecondByResolution: existing?.videoCreditPerSecondByResolution || existing?.video_credit_per_second_by_resolution || json(defaultVideoCreditPerSecond),
    billingConfig: existing?.billingConfig || existing?.billing_config || json({
      unit: 'second',
      default_resolution: '720p',
      video_credit_per_second_by_resolution: defaultVideoCreditPerSecond,
    }),
    priority,
    isDefault: modelId === 'doubao-seedance-2-0-260128',
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
  const seedance20 = await upsertProfile({
    key: 'volcengine-seedance-2-0',
    name: '火山 Seedance 2.0 视频参数',
    description: 'Doubao Seedance 2.0：文生视频、首帧、首尾帧、全能参考、视频编辑、视频延长。',
    durationMax: 15,
    resolutions: ['480p', '720p', '1080p'],
    supportsSeedance2Modes: true,
  })
  const seedance15 = await upsertProfile({
    key: 'volcengine-seedance-1-5-pro',
    name: '火山 Seedance 1.5 Pro 视频参数',
    description: 'Doubao Seedance 1.5 Pro：文生视频、首帧、首尾帧、生成音频、样片模式。',
    durationMax: 12,
    resolutions: ['480p', '720p', '1080p'],
    supportsDraft: true,
  })
  await upsertModel(providerId, seedance20, 'doubao-seedance-2-0-260128', 'Doubao Seedance 2.0', { ratio: '16:9', duration: 5, resolution: '720p' }, 300)
  await upsertModel(providerId, seedance20, 'doubao-seedance-2-0-fast-260128', 'Doubao Seedance 2.0 Fast', { ratio: '16:9', duration: 5, resolution: '720p' }, 290)
  await upsertModel(providerId, seedance15, 'doubao-seedance-1-5-pro-251215', 'Doubao Seedance 1.5 Pro', { ratio: '16:9', duration: 5, resolution: '720p' }, 250)
  console.log('VolcEngine Seedance video model profiles seeded.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
}).finally(async () => {
  await mysqlPool.end()
})
