import { Hono } from 'hono'
import { and, eq, isNull, like, or, sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, notFound, now, success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { currentAuthUserId } from '../utils/auth.js'
import { isPlatformUserId } from '../repositories/models.js'

const app = new Hono()
const DEFAULT_USER_ID = 'default'
type ProviderRow = typeof schema.aiServiceProviders.$inferSelect
type ModelConfigRow = typeof schema.aiModelConfigs.$inferSelect
type ParameterProfileRow = typeof schema.aiModelParameterProfiles.$inferSelect

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function stringifyJson(value: any) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      return JSON.stringify(trimmed)
    }
  }
  return JSON.stringify(value)
}

function stringifyConfig(value: any) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      return JSON.stringify({ value: trimmed })
    }
  }
  return JSON.stringify(value)
}

function isEmptyObject(value: any) {
  return !value || (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0)
}

function firstNonEmptyObject(...values: any[]) {
  for (const value of values) {
    if (!isEmptyObject(value)) return value
  }
  return {}
}

function mergeObjects(...values: any[]) {
  const result: Record<string, any> = {}
  for (const value of values) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue
    Object.assign(result, value)
  }
  return result
}

function normalizeParameterType(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function isBillingRuleType(row: typeof schema.aiModelBillingRules.$inferSelect, types: string[]) {
  const normalized = normalizeParameterType(row.parameterType)
  return types.map(normalizeParameterType).includes(normalized)
}

type BillingRuleRow = typeof schema.aiModelBillingRules.$inferSelect

function nullableDateInput(value: any, fallback: any = null) {
  if (value === undefined) return fallback
  if (value === null || value === '') return null
  return value
}

function pickDateInput(body: any, snakeKey: string, camelKey: string, fallback: any = null) {
  if (body[snakeKey] !== undefined) return nullableDateInput(body[snakeKey], fallback)
  if (body[camelKey] !== undefined) return nullableDateInput(body[camelKey], fallback)
  return fallback
}

function serviceFromType(type: string) {
  const value = String(type || '').toUpperCase()
  if (value === 'CHAT' || value === 'TEXT') return 'text'
  if (value === 'VIDEO') return 'video'
  if (value === 'AUDIO') return 'audio'
  if (value === 'EMBEDDING' || value === 'EMBEDDINGS') return 'embedding'
  return 'image'
}

function typeFromService(serviceType: string) {
  if (serviceType === 'text') return 'CHAT'
  if (serviceType === 'embedding') return 'EMBEDDING'
  return serviceType.toUpperCase()
}

function providerKey(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'provider'
}

function serializeProvider(row: typeof schema.aiServiceProviders.$inferSelect) {
  const snake = toSnakeCase(row)
  delete snake.support_open_a_i
  return {
    ...snake,
    key: row.provider,
    display_name: row.displayName || row.name,
    support_open_ai: Boolean(row.supportOpenAI),
    is_third_party: Boolean(row.isThirdParty),
    has_api_key: false,
    preset_models: parseJson(row.presetModels, []),
  }
}

async function serializeModel(row: typeof schema.aiModelConfigs.$inferSelect, provider?: any) {
  const parameterProfile = row.parameterProfileId
    ? (await db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, row.parameterProfileId)).execute())[0]
    : null
  return {
    ...toSnakeCase(row),
    type: typeFromService(row.serviceType),
    parameters: parseJson(row.parameters, {}),
    defaults: parseJson(row.defaults, {}),
    capabilities: parseJson(row.capabilities, {}),
    image_credit_by_resolution: parseJson(row.imageCreditByResolution, {}),
    video_credit_per_second_by_resolution: parseJson(row.videoCreditPerSecondByResolution, {}),
    billing_config: parseJson(row.billingConfig, {}),
    billing_rules: await serializeBillingRules(row.id),
    is_free: Boolean(row.isFree),
    member_only: Boolean(row.memberOnly),
    provider: provider ? serializeProvider(provider) : row.provider,
    parameter_profile: parameterProfile ? await serializeParameterProfile(parameterProfile) : null,
  }
}

function serializeBillingRule(row: typeof schema.aiModelBillingRules.$inferSelect) {
  return {
    ...toSnakeCase(row),
    credits: Number(row.credits || 0),
  }
}

async function serializeBillingRules(modelConfigId: number) {
  return (await db.select().from(schema.aiModelBillingRules)
    .where(eq(schema.aiModelBillingRules.modelConfigId, modelConfigId))
    .execute())
    .filter(row => !row.deletedAt)
    .sort((a, b) => a.parameterType.localeCompare(b.parameterType) || a.parameterValue.localeCompare(b.parameterValue) || a.id - b.id)
    .map(serializeBillingRule)
}

async function billingRuleCreditMap(modelConfigId: number | null | undefined, parameterTypes: string[]) {
  if (!modelConfigId) return {}
  const rows = (await db.select().from(schema.aiModelBillingRules)
    .where(eq(schema.aiModelBillingRules.modelConfigId, modelConfigId))
    .execute())
    .filter(row => !row.deletedAt)
    .filter(row => isBillingRuleType(row, parameterTypes))
  return Object.fromEntries(rows.map(row => [row.parameterValue, Number(row.credits || 0)]))
}

function parseCreditMapJson(value: string | null | undefined) {
  const raw = parseJson(value, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return Object.fromEntries(
    Object.entries(raw)
      .filter(([key]) => String(key || '').trim())
      .map(([key, credits]) => [String(key).trim(), Math.max(0, Number(credits) || 0)]),
  )
}

async function replaceBillingRulesFromMap(
  modelConfigId: number,
  serviceType: string,
  parameterTypes: string[],
  creditMap: Record<string, number>,
  unit: string,
) {
  const ts = now()
  const rows = await db.select().from(schema.aiModelBillingRules)
    .where(eq(schema.aiModelBillingRules.modelConfigId, modelConfigId))
    .execute()
  const targetRows = rows.filter(row => isBillingRuleType(row, parameterTypes))
  const targetRowsByKey = new Map<string, BillingRuleRow>(targetRows.map(row => [`${normalizeParameterType(row.parameterType)}:${row.parameterValue}`, row]))
  const nextValues = new Set(Object.keys(creditMap).map(parameterValue => `${normalizeParameterType(parameterTypes[0] || 'resolution')}:${parameterValue}`))

  for (const row of targetRows) {
    const key = `${normalizeParameterType(row.parameterType)}:${row.parameterValue}`
    if (nextValues.has(key)) continue
    await db.update(schema.aiModelBillingRules)
      .set({ deletedAt: ts, isDeleted: true, updatedAt: ts })
      .where(eq(schema.aiModelBillingRules.id, row.id))
      .execute()
  }

  const parameterType = parameterTypes[0] || 'resolution'
  for (const [parameterValue, credits] of Object.entries(creditMap)) {
    const existing = targetRowsByKey.get(`${normalizeParameterType(parameterType)}:${parameterValue}`)
    if (existing) {
      await db.update(schema.aiModelBillingRules).set({
        serviceType,
        credits,
        unit,
        deletedAt: null,
        isDeleted: false,
        updatedAt: ts,
      }).where(eq(schema.aiModelBillingRules.id, existing.id)).execute()
      continue
    }

    await db.insert(schema.aiModelBillingRules).values({
      modelConfigId,
      serviceType,
      parameterType,
      parameterValue,
      credits,
      unit,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
  }
}

async function syncModelBillingRules(modelConfigId: number, values: Awaited<ReturnType<typeof normalizeModelBody>>) {
  if ('error' in values) return
  if (values.serviceType === 'image') {
    await replaceBillingRulesFromMap(
      modelConfigId,
      values.serviceType,
      ['sample_image_size', 'resolution'],
      parseCreditMapJson(values.imageCreditByResolution),
      'request',
    )
  } else if (values.serviceType === 'video') {
    await replaceBillingRulesFromMap(
      modelConfigId,
      values.serviceType,
      ['resolution'],
      parseCreditMapJson(values.videoCreditPerSecondByResolution),
      'second',
    )
  }
}

async function serializeParameterProfile(row: typeof schema.aiModelParameterProfiles.$inferSelect) {
  const items = (await db.select().from(schema.aiModelParameterProfileItems)
    .where(eq(schema.aiModelParameterProfileItems.profileId, row.id))
    .execute())
    .sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.id - b.id)
  return {
    ...toSnakeCase(row),
    model_type: typeFromService(row.serviceType),
    parameters: items.map(serializeParameterItem),
    items: items.map(serializeParameterItem),
    item_count: items.length,
  }
}

function serializeParameterItem(row: typeof schema.aiModelParameterProfileItems.$inferSelect) {
  return {
    ...toSnakeCase(row),
    config: parseJson(row.config, {}),
  }
}

function serializeParameterProfileWithItems(
  row: typeof schema.aiModelParameterProfiles.$inferSelect,
  allItems: Array<typeof schema.aiModelParameterProfileItems.$inferSelect>,
) {
  const items = allItems
    .filter(item => item.profileId === row.id && !item.deletedAt)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.id - b.id)
  return {
    ...toSnakeCase(row),
    model_type: typeFromService(row.serviceType),
    parameters: items.map(serializeParameterItem),
    items: items.map(serializeParameterItem),
    item_count: items.length,
  }
}

function currentUserId(c: any) {
  return currentAuthUserId(c)
}

async function ensureUser(userId: string) {
  const [row] = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())
  if (row) return row
  const ts = now()
  await db.insert(schema.aiUsers).values({
    id: userId,
    name: userId === DEFAULT_USER_ID ? '默认用户' : userId,
    role: 'user',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  return (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
}

async function publicModels() {
  return (await db.select().from(schema.aiModelConfigs).where(isNull(schema.aiModelConfigs.userId)).execute())
}

async function userModels(userId: string) {
  return await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.userId, userId)).execute()
}

async function providerById(id: number) {
  return (await db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.id, id)).execute())[0]
}

async function providerForModel(model: typeof schema.aiModelConfigs.$inferSelect) {
  if (model.providerId) return providerById(model.providerId)
  return (await db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.provider, model.provider)).execute())[0]
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

async function normalizeModelBody(body: any, scope: 'public' | 'user') {
  const serviceType = String(body.service_type || body.serviceType || serviceFromType(body.type)).trim()
  const providerId = Number(body.provider_id ?? body.providerId ?? 0) || null
  const providerRow = providerId ? await providerById(providerId) : null
  const provider = String(body.provider || providerRow?.provider || '').trim()
  const modelId = String(body.model_id || body.modelId || '').trim()
  const name = String(body.name || modelId || '').trim()
  if (!serviceType || !provider || !modelId) {
    return { error: 'service_type, provider and model_id are required' }
  }
  return {
    userId: scope === 'user' ? String(body.user_id || body.userId || DEFAULT_USER_ID) : null,
    providerId,
    sourceModelId: body.source_model_id ?? body.sourceModelId ?? null,
    parameterProfileId: body.parameter_profile_id ?? body.parameterProfileId ?? null,
    serviceType,
    provider,
    modelId,
    name,
    description: body.description ?? null,
    baseUrl: body.base_url ?? body.baseUrl ?? null,
    endpoint: body.endpoint ?? null,
    queryEndpoint: body.query_endpoint ?? body.queryEndpoint ?? null,
    parameters: stringifyJson(body.parameters),
    defaults: stringifyJson(body.defaults),
    capabilities: stringifyJson(body.capabilities),
    cost: Number(body.cost || 0),
    isFree: Boolean(body.is_free ?? body.isFree ?? false),
    memberOnly: Boolean(body.member_only ?? body.memberOnly ?? false),
    imageCreditByResolution: stringifyJson(body.image_credit_by_resolution ?? body.imageCreditByResolution),
    videoCreditPerSecondByResolution: stringifyJson(body.video_credit_per_second_by_resolution ?? body.videoCreditPerSecondByResolution),
    billingConfig: stringifyJson(body.billing_config ?? body.billingConfig),
    priority: Number(body.priority || body.rank || 0),
    isDefault: Boolean(body.is_default ?? body.isDefault ?? false),
    isActive: Boolean(body.is_active ?? body.isActive ?? true),
  }
}

async function clearDefaultForService(serviceType: string, userId?: string | null, exceptId?: number) {
  let rows = await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.serviceType, serviceType)).execute()
  rows = rows.filter(row => (userId ? row.userId === userId : !row.userId))
  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue
    if (!row.isDefault) continue
    await db.update(schema.aiModelConfigs).set({ isDefault: false, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, row.id)).execute()
  }
}

async function serializeModelOption(row: typeof schema.aiModelConfigs.$inferSelect, userProvider?: typeof schema.aiUserProviderConfigs.$inferSelect | null) {
  const defaults = parseJson(row.defaults, {})
  const provider = await providerForModel(row)
  const sourceModel = row.sourceModelId
    ? (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, row.sourceModelId)).execute())[0]
    : null
  const publicFallback = row.userId
    ? (await db.select().from(schema.aiModelConfigs)
        .where(and(
          isNull(schema.aiModelConfigs.userId),
          eq(schema.aiModelConfigs.serviceType, row.serviceType),
          eq(schema.aiModelConfigs.provider, row.provider),
          eq(schema.aiModelConfigs.modelId, row.modelId),
        ))
        .execute())[0]
    : null
  const ownImageCredits = parseJson(row.imageCreditByResolution, {})
  const sourceImageCredits = parseJson(sourceModel?.imageCreditByResolution, {})
  const fallbackImageCredits = parseJson(publicFallback?.imageCreditByResolution, {})
  const ownImageRuleCredits = await billingRuleCreditMap(row.id, ['resolution', 'sample_image_size'])
  const sourceImageRuleCredits = await billingRuleCreditMap(sourceModel?.id, ['resolution', 'sample_image_size'])
  const fallbackImageRuleCredits = await billingRuleCreditMap(publicFallback?.id, ['resolution', 'sample_image_size'])
  const ownVideoCredits = parseJson(row.videoCreditPerSecondByResolution, {})
  const sourceVideoCredits = parseJson(sourceModel?.videoCreditPerSecondByResolution, {})
  const fallbackVideoCredits = parseJson(publicFallback?.videoCreditPerSecondByResolution, {})
  const ownVideoRuleCredits = await billingRuleCreditMap(row.id, ['resolution'])
  const sourceVideoRuleCredits = await billingRuleCreditMap(sourceModel?.id, ['resolution'])
  const fallbackVideoRuleCredits = await billingRuleCreditMap(publicFallback?.id, ['resolution'])
  const ownBillingConfig = parseJson(row.billingConfig, {})
  const sourceBillingConfig = parseJson(sourceModel?.billingConfig, {})
  const fallbackBillingConfig = parseJson(publicFallback?.billingConfig, {})
  const imageCredits = mergeObjects(
    fallbackImageCredits,
    sourceImageCredits,
    ownImageCredits,
    fallbackImageRuleCredits,
    sourceImageRuleCredits,
    ownImageRuleCredits,
  )
  const videoCredits = mergeObjects(
    fallbackVideoCredits,
    sourceVideoCredits,
    ownVideoCredits,
    fallbackVideoRuleCredits,
    sourceVideoRuleCredits,
    ownVideoRuleCredits,
  )
  const parameterProfile = row.parameterProfileId
    ? await serializeParameterProfile((await db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, row.parameterProfileId)).execute())[0])
    : null
  const billingRules = await serializeBillingRules(row.id)
  const isUserProvider = Boolean(userProvider?.userId && !isPlatformUserId(userProvider.userId))
  return {
    label: row.name || row.modelId,
    value: row.modelId,
    id: row.id,
    model_config_id: row.id,
    model_id: row.modelId,
    name: row.name,
    description: row.description,
    provider: row.provider,
    provider_id: row.providerId,
    provider_name: userProvider?.name || provider?.displayName || provider?.name || row.provider,
    user_provider_id: isUserProvider ? userProvider?.id || null : null,
    resource_mode: isUserProvider ? 'user_api' : 'platform',
    is_platform_model: !isUserProvider,
    is_official: String(row.modelId || '').toLowerCase().includes('official') || String(row.name || '').includes('官方'),
    billing_required: !isUserProvider && !row.isFree,
    service_type: row.serviceType,
    user_id: row.userId,
    parameters: parseJson(row.parameters, {}),
    defaults,
    capabilities: parseJson(row.capabilities, {}),
    image_credit_by_resolution: imageCredits,
    video_credit_per_second_by_resolution: videoCredits,
    billing_config: firstNonEmptyObject(ownBillingConfig, sourceBillingConfig, fallbackBillingConfig),
    billing_rules: billingRules,
    is_free: Boolean(row.isFree),
    member_only: Boolean(row.memberOnly),
    parameter_profile: parameterProfile,
    default_aspect_ratio: defaults.aspect_ratio || defaults.aspectRatio || '',
    default_resolution: defaults.resolution || defaults.sample_image_size || defaults.sampleImageSize || '',
    is_default: row.isDefault,
  }
}

function billingRuleCreditMapFromRows(
  rows: Array<typeof schema.aiModelBillingRules.$inferSelect>,
  modelConfigId: number | null | undefined,
  parameterTypes: string[],
) {
  if (!modelConfigId) return {}
  return Object.fromEntries(rows
    .filter(row => row.modelConfigId === modelConfigId)
    .filter(row => !row.deletedAt)
    .filter(row => isBillingRuleType(row, parameterTypes))
    .map(row => [row.parameterValue, Number(row.credits || 0)]))
}

function serializeBillingRulesFromRows(rows: Array<typeof schema.aiModelBillingRules.$inferSelect>, modelConfigId: number) {
  return rows
    .filter(row => row.modelConfigId === modelConfigId)
    .filter(row => !row.deletedAt)
    .sort((a, b) => a.parameterType.localeCompare(b.parameterType) || a.parameterValue.localeCompare(b.parameterValue) || a.id - b.id)
    .map(serializeBillingRule)
}

async function serializeModelOptions(rows: Array<{
  model: typeof schema.aiModelConfigs.$inferSelect
  userProvider: typeof schema.aiUserProviderConfigs.$inferSelect | null
}>) {
  const [allProviders, allModels, allBillingRules, allProfiles, allProfileItems] = await Promise.all([
    db.select().from(schema.aiServiceProviders).execute(),
    db.select().from(schema.aiModelConfigs).execute(),
    db.select().from(schema.aiModelBillingRules).execute(),
    db.select().from(schema.aiModelParameterProfiles).execute(),
    db.select().from(schema.aiModelParameterProfileItems).execute(),
  ])
  const providersById = new Map<number, ProviderRow>(allProviders.map(row => [row.id, row]))
  const providersByKey = new Map<string, ProviderRow>(allProviders.map(row => [row.provider, row]))
  const modelsById = new Map<number, ModelConfigRow>(allModels.map(row => [row.id, row]))
  const publicFallbackByKey = new Map<string, ModelConfigRow>(
    allModels
      .filter(row => !row.userId)
      .map(row => [`${row.serviceType}:${row.provider}:${row.modelId}`, row]),
  )
  const profilesById = new Map<number, ParameterProfileRow>(allProfiles.map(row => [row.id, row]))

  return rows.map(({ model: row, userProvider }) => {
    const defaults = parseJson(row.defaults, {})
    const provider = row.providerId ? providersById.get(row.providerId) : providersByKey.get(row.provider)
    const sourceModel = row.sourceModelId ? modelsById.get(row.sourceModelId) : null
    const publicFallback = row.userId ? publicFallbackByKey.get(`${row.serviceType}:${row.provider}:${row.modelId}`) : null
    const ownImageCredits = parseJson(row.imageCreditByResolution, {})
    const sourceImageCredits = parseJson(sourceModel?.imageCreditByResolution, {})
    const fallbackImageCredits = parseJson(publicFallback?.imageCreditByResolution, {})
    const ownImageRuleCredits = billingRuleCreditMapFromRows(allBillingRules, row.id, ['resolution', 'sample_image_size'])
    const sourceImageRuleCredits = billingRuleCreditMapFromRows(allBillingRules, sourceModel?.id, ['resolution', 'sample_image_size'])
    const fallbackImageRuleCredits = billingRuleCreditMapFromRows(allBillingRules, publicFallback?.id, ['resolution', 'sample_image_size'])
    const ownVideoCredits = parseJson(row.videoCreditPerSecondByResolution, {})
    const sourceVideoCredits = parseJson(sourceModel?.videoCreditPerSecondByResolution, {})
    const fallbackVideoCredits = parseJson(publicFallback?.videoCreditPerSecondByResolution, {})
    const ownVideoRuleCredits = billingRuleCreditMapFromRows(allBillingRules, row.id, ['resolution'])
    const sourceVideoRuleCredits = billingRuleCreditMapFromRows(allBillingRules, sourceModel?.id, ['resolution'])
    const fallbackVideoRuleCredits = billingRuleCreditMapFromRows(allBillingRules, publicFallback?.id, ['resolution'])
    const ownBillingConfig = parseJson(row.billingConfig, {})
    const sourceBillingConfig = parseJson(sourceModel?.billingConfig, {})
    const fallbackBillingConfig = parseJson(publicFallback?.billingConfig, {})
    const imageCredits = mergeObjects(
      fallbackImageCredits,
      sourceImageCredits,
      ownImageCredits,
      fallbackImageRuleCredits,
      sourceImageRuleCredits,
      ownImageRuleCredits,
    )
    const videoCredits = mergeObjects(
      fallbackVideoCredits,
      sourceVideoCredits,
      ownVideoCredits,
      fallbackVideoRuleCredits,
      sourceVideoRuleCredits,
      ownVideoRuleCredits,
    )
    const profile = row.parameterProfileId ? profilesById.get(row.parameterProfileId) : null
    const isUserProvider = Boolean(userProvider?.userId && !isPlatformUserId(userProvider.userId))

    return {
      label: row.name || row.modelId,
      value: row.modelId,
      id: row.id,
      model_config_id: row.id,
      model_id: row.modelId,
      name: row.name,
      description: row.description,
      provider: row.provider,
      provider_id: row.providerId,
      provider_name: userProvider?.name || provider?.displayName || provider?.name || row.provider,
      user_provider_id: isUserProvider ? userProvider?.id || null : null,
      resource_mode: isUserProvider ? 'user_api' : 'platform',
      is_platform_model: !isUserProvider,
      is_official: String(row.modelId || '').toLowerCase().includes('official') || String(row.name || '').includes('官方'),
      billing_required: !isUserProvider && !row.isFree,
      service_type: row.serviceType,
      user_id: row.userId,
      parameters: parseJson(row.parameters, {}),
      defaults,
      capabilities: parseJson(row.capabilities, {}),
      image_credit_by_resolution: imageCredits,
      video_credit_per_second_by_resolution: videoCredits,
      billing_config: firstNonEmptyObject(ownBillingConfig, sourceBillingConfig, fallbackBillingConfig),
      billing_rules: serializeBillingRulesFromRows(allBillingRules, row.id),
      is_free: Boolean(row.isFree),
      member_only: Boolean(row.memberOnly),
      parameter_profile: profile ? serializeParameterProfileWithItems(profile, allProfileItems) : null,
      default_aspect_ratio: defaults.aspect_ratio || defaults.aspectRatio || '',
      default_resolution: defaults.resolution || defaults.sample_image_size || defaults.sampleImageSize || '',
      is_default: row.isDefault,
    }
  })
}

// User creation options: active user providers -> public platform models under each provider.
app.get('/options', async (c) => {
  const userId = currentUserId(c)
  const serviceType = c.req.query('service_type')
  const publicOnly = c.req.query('scope') === 'public' || userId === DEFAULT_USER_ID
  if (!publicOnly) await ensureUser(userId)
  const publicModelRows = await publicModels()

  const userProviders = publicOnly
    ? []
    : (await db.select().from(schema.aiUserProviderConfigs)
      .where(eq(schema.aiUserProviderConfigs.userId, userId))
      .execute())
      .filter(row => row.isActive)
      .filter(row => !isPlatformUserId(row.userId))

  const rows: Array<{
    model: typeof schema.aiModelConfigs.$inferSelect
    userProvider: typeof schema.aiUserProviderConfigs.$inferSelect | null
  }> = []
  const seen = new Set<string>()
  for (const userProvider of userProviders) {
    const providerModels = publicModelRows
      .filter(row => row.isActive)
      .filter(row => !serviceType || row.serviceType === serviceType)
      .filter(row => row.providerId === userProvider.providerId || row.provider === userProvider.provider)
      .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.priority || 0) - (a.priority || 0))

    for (const model of providerModels) {
      const key = `${userProvider.id}:${model.serviceType}:${model.provider}:${model.modelId}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ model, userProvider })
    }
  }
  const platformModels = publicModelRows
    .filter(row => row.isActive)
    .filter(row => !serviceType || row.serviceType === serviceType)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || (b.priority || 0) - (a.priority || 0))
  for (const model of platformModels) {
    const key = `platform:${model.serviceType}:${model.provider}:${model.modelId}:${model.id}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ model, userProvider: null })
  }

  rows.sort((a, b) =>
    Number(Boolean(b.userProvider)) - Number(Boolean(a.userProvider)) ||
    ((a.userProvider?.id || 0) - (b.userProvider?.id || 0)) ||
    Number(b.model.isDefault) - Number(a.model.isDefault) ||
    (b.model.priority || 0) - (a.model.priority || 0)
  )

  return success(c, await serializeModelOptions(rows))
})

app.get('/providers', async (c) => {
  const serviceType = c.req.query('service_type')
  let rows = await db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.isActive, true)).execute()
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType || row.serviceType === 'all')
  rows.sort((a, b) => (a.rank || 0) - (b.rank || 0) || (a.displayName || a.name).localeCompare(b.displayName || b.name))
  return success(c, rows.map(serializeProvider))
})

// Legacy compatible model list. Defaults to user-visible rows.
app.get('/', async (c) => {
  const scope = c.req.query('scope') || 'user'
  const userId = currentUserId(c)
  const serviceType = c.req.query('service_type')
  const provider = c.req.query('provider')
  const activeOnly = c.req.query('active') !== '0'
  let rows = scope === 'public' ? await publicModels() : [...await userModels(userId), ...await publicModels()]
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType)
  if (provider) rows = rows.filter(row => row.provider === provider)
  if (activeOnly) rows = rows.filter(row => row.isActive)
  rows.sort((a, b) => Number(Boolean(b.userId)) - Number(Boolean(a.userId)) || a.serviceType.localeCompare(b.serviceType) || (b.priority || 0) - (a.priority || 0))
  return success(c, await Promise.all(rows.map(async row => serializeModel(row, await providerForModel(row)))))
})

// Admin users
app.get('/admin/users', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const role = c.req.query('role')
  const active = c.req.query('active')
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const page = clampInt(c.req.query('page'), 1, 1, 100000)
  const pageSize = clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100)
  const conditions: any[] = []

  if (role) conditions.push(eq(schema.aiUsers.role, role))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiUsers.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiUsers.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiUsers.id, pattern),
      like(schema.aiUsers.name, pattern),
      like(schema.aiUsers.email, pattern),
      like(schema.aiUsers.account, pattern),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = (await db.select().from(schema.aiUsers).where(where).orderBy(schema.aiUsers.createdAt, schema.aiUsers.id).execute())
    return success(c, rows.map(toSnakeCase))
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.aiUsers).where(where).execute()
  const rows = await db.select().from(schema.aiUsers)
    .where(where)
    .orderBy(schema.aiUsers.createdAt, schema.aiUsers.id)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  return success(c, {
    items: rows.map(toSnakeCase),
    pagination: { page, page_size: pageSize, total: Number(total || 0), total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)) },
  })
})

app.post('/admin/users', async (c) => {
  const body = await c.req.json()
  const id = String(body.id || body.email || body.name || '').trim()
  if (!id) return badRequest(c, 'id is required')
  const ts = now()
  try {
    await db.insert(schema.aiUsers).values({
      id,
      name: body.name || id,
      email: body.email || '',
      phone: body.phone || '',
      credits: Number(body.credits || 0),
      membershipPlanId: body.membership_plan_id ?? body.membershipPlanId ?? null,
      membershipStatus: body.membership_status ?? body.membershipStatus ?? 'none',
      membershipExpiresAt: pickDateInput(body, 'membership_expires_at', 'membershipExpiresAt', null),
      role: body.role || 'user',
      isActive: body.is_active ?? body.isActive ?? true,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
    return created(c, toSnakeCase(await ensureUser(id)))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.put('/admin/users/:id', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
  if (!row) return notFound(c, 'user not found')
  await db.update(schema.aiUsers).set({
    name: body.name || row.name,
    account: body.account ?? body.account_id ?? row.account,
    email: body.email ?? row.email ?? '',
    phone: body.phone ?? row.phone ?? '',
    credits: Number(body.credits ?? row.credits ?? 0),
    membershipPlanId: body.membership_plan_id ?? body.membershipPlanId ?? row.membershipPlanId,
    membershipStatus: body.membership_status ?? body.membershipStatus ?? row.membershipStatus ?? 'none',
    membershipExpiresAt: pickDateInput(body, 'membership_expires_at', 'membershipExpiresAt', row.membershipExpiresAt),
    role: body.role || row.role || 'user',
    isActive: body.is_active ?? body.isActive ?? row.isActive ?? true,
    updatedAt: now(),
  }).where(eq(schema.aiUsers.id, id)).execute()
  const updated = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
  return success(c, toSnakeCase(updated))
})

app.delete('/admin/users/:id', async (c) => {
  const id = c.req.param('id')
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
  if (!row) return notFound(c, 'user not found')
  await db.delete(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.userId, id)).execute()
  await db.delete(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.userId, id)).execute()
  await db.delete(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute()
  return success(c)
})

// Admin provider templates
app.get('/admin/providers', async (c) => {
  const serviceType = c.req.query('service_type')
  const active = c.req.query('active')
  const keyword = String(c.req.query('keyword') || '').trim()
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const page = clampInt(c.req.query('page'), 1, 1, 100000)
  const pageSize = clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100)
  const conditions: any[] = []

  if (serviceType) conditions.push(eq(schema.aiServiceProviders.serviceType, serviceType))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiServiceProviders.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiServiceProviders.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiServiceProviders.name, pattern),
      like(schema.aiServiceProviders.displayName, pattern),
      like(schema.aiServiceProviders.provider, pattern),
      like(schema.aiServiceProviders.website, pattern),
      like(schema.aiServiceProviders.description, pattern),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = await db.select().from(schema.aiServiceProviders)
      .where(where)
      .orderBy(sql`${schema.aiServiceProviders.rank} asc`, sql`${schema.aiServiceProviders.id} desc`)
      .execute()
    return success(c, rows.map(serializeProvider))
  }

  const [{ total }] = (await db.select({ total: sql<number>`count(*)` }).from(schema.aiServiceProviders).where(where).execute())
  const rows = await db.select().from(schema.aiServiceProviders)
    .where(where)
    .orderBy(sql`${schema.aiServiceProviders.rank} asc`, sql`${schema.aiServiceProviders.id} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  return success(c, {
    items: rows.map(serializeProvider),
    pagination: { page, page_size: pageSize, total: Number(total || 0), total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)) },
  })
})

app.post('/admin/providers', async (c) => {
  const body = await c.req.json()
  const ts = now()
  const key = providerKey(body.key || body.provider || body.name)
  if (!body.name) return badRequest(c, 'name is required')
  try {
    const result = await db.insert(schema.aiServiceProviders).values({
      name: body.name,
      displayName: body.display_name || body.displayName || body.name,
      serviceType: String(body.service_type || body.serviceType || 'all'),
      provider: key,
      defaultUrl: '',
      icon: body.icon || '',
      website: body.website || '',
      rank: Number(body.rank || 0),
      isThirdParty: body.is_third_party ?? body.isThirdParty ?? false,
      supportOpenAI: body.support_open_ai ?? body.supportOpenAI ?? false,
      presetModels: stringifyJson(body.preset_models || body.presetModels || []),
      description: body.description || '',
      isActive: body.is_active ?? body.isActive ?? true,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
    const row = await providerById(Number(result.insertId))
    return created(c, serializeProvider(row))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.put('/admin/providers/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.update(schema.aiServiceProviders).set({
    name: body.name,
    displayName: body.display_name ?? body.displayName ?? body.name,
    serviceType: body.service_type ?? body.serviceType ?? 'all',
    provider: providerKey(body.key || body.provider || body.name),
    defaultUrl: '',
    icon: body.icon || '',
    website: body.website || '',
    rank: Number(body.rank || 0),
    isThirdParty: body.is_third_party ?? body.isThirdParty ?? false,
    supportOpenAI: body.support_open_ai ?? body.supportOpenAI ?? false,
    presetModels: stringifyJson(body.preset_models || body.presetModels || []),
    description: body.description || '',
    isActive: body.is_active ?? body.isActive ?? true,
    updatedAt: now(),
  }).where(eq(schema.aiServiceProviders.id, id)).execute()
  return success(c, serializeProvider(await providerById(id)))
})

app.delete('/admin/providers/:id', async (c) => {
  await db.delete(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.id, Number(c.req.param('id')))).execute()
  return success(c)
})

// Admin public model templates
app.get('/admin/models', async (c) => {
  const serviceType = c.req.query('service_type')
  const provider = c.req.query('provider')
  const active = c.req.query('active')
  const keyword = String(c.req.query('keyword') || '').trim()
  const page = clampInt(c.req.query('page'), 1, 1, 100000)
  const pageSize = clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100)
  const conditions = [isNull(schema.aiModelConfigs.userId)]

  if (serviceType) conditions.push(eq(schema.aiModelConfigs.serviceType, serviceType))
  if (provider) conditions.push(eq(schema.aiModelConfigs.provider, provider))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiModelConfigs.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiModelConfigs.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiModelConfigs.name, pattern),
      like(schema.aiModelConfigs.modelId, pattern),
      like(schema.aiModelConfigs.provider, pattern),
      like(schema.aiModelConfigs.description, pattern),
    )!)
  }

  const where = and(...conditions)
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.aiModelConfigs)
    .where(where)
    .execute()
  const rows = await db.select()
    .from(schema.aiModelConfigs)
    .where(where)
    .orderBy(schema.aiModelConfigs.serviceType, sql`${schema.aiModelConfigs.priority} desc`, schema.aiModelConfigs.id)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  return success(c, {
    items: await Promise.all(rows.map(async row => serializeModel(row, await providerForModel(row)))),
    pagination: {
      page,
      page_size: pageSize,
      total: Number(total || 0),
      total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)),
    },
  })
})

app.post('/admin/models', async (c) => {
  const body = await c.req.json()
  const values = await normalizeModelBody(body, 'public')
  if ('error' in values) return badRequest(c, values.error)
  const ts = now()
  if (values.isDefault) await clearDefaultForService(values.serviceType, null)
  try {
    const result = await db.insert(schema.aiModelConfigs).values({ ...values, userId: null, createdAt: ts, updatedAt: ts }).execute()
    const row = (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, Number(result.insertId))).execute())[0]
    await syncModelBillingRules(row.id, values)
    const updated = (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, row.id)).execute())[0]
    return created(c, await serializeModel(updated, await providerForModel(updated)))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.put('/admin/models/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const values = await normalizeModelBody(body, 'public')
  if ('error' in values) return badRequest(c, values.error)
  if (values.isDefault) await clearDefaultForService(values.serviceType, null, id)
  await db.update(schema.aiModelConfigs).set({ ...values, userId: null, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, id)).execute()
  await syncModelBillingRules(id, values)
  const row = (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, id)).execute())[0]
  return success(c, await serializeModel(row, await providerForModel(row)))
})

app.delete('/admin/models/:id', async (c) => {
  await db.delete(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, Number(c.req.param('id')))).execute()
  return success(c)
})

app.get('/admin/models/:id/billing-rules', async (c) => {
  const id = Number(c.req.param('id'))
  const model = (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, id)).execute())[0]
  if (!model) return notFound(c, 'model not found')
  return success(c, await serializeBillingRules(id))
})

app.post('/admin/models/:id/billing-rules', async (c) => {
  const id = Number(c.req.param('id'))
  const model = (await db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, id)).execute())[0]
  if (!model) return notFound(c, 'model not found')
  const body = await c.req.json()
  const parameterType = String(body.parameter_type || body.parameterType || 'resolution').trim()
  const parameterValue = String(body.parameter_value || body.parameterValue || '').trim()
  if (!parameterType || !parameterValue) return badRequest(c, 'parameter_type and parameter_value are required')
  const ts = now()
  const result = await db.insert(schema.aiModelBillingRules).values({
    modelConfigId: id,
    serviceType: model.serviceType,
    parameterType,
    parameterValue,
    credits: Number(body.credits || 0),
    unit: body.unit || (model.serviceType === 'video' ? 'second' : 'request'),
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.aiModelBillingRules).where(eq(schema.aiModelBillingRules.id, Number(result.insertId))).execute())[0]
  return created(c, serializeBillingRule(row))
})

app.put('/admin/models/billing-rules/:ruleId', async (c) => {
  const id = Number(c.req.param('ruleId'))
  const row = (await db.select().from(schema.aiModelBillingRules).where(eq(schema.aiModelBillingRules.id, id)).execute())[0]
  if (!row) return notFound(c, 'billing rule not found')
  const body = await c.req.json()
  db.update(schema.aiModelBillingRules).set({
    parameterType: String(body.parameter_type || body.parameterType || row.parameterType).trim(),
    parameterValue: String(body.parameter_value || body.parameterValue || row.parameterValue).trim(),
    credits: Number(body.credits ?? row.credits ?? 0),
    unit: body.unit || row.unit || 'request',
    updatedAt: now(),
  }).where(eq(schema.aiModelBillingRules.id, id)).execute()
  const updated = (await db.select().from(schema.aiModelBillingRules).where(eq(schema.aiModelBillingRules.id, id)).execute())[0]
  return success(c, serializeBillingRule(updated))
})

app.delete('/admin/models/billing-rules/:ruleId', async (c) => {
  db.update(schema.aiModelBillingRules)
    .set({ deletedAt: now(), updatedAt: now() })
    .where(eq(schema.aiModelBillingRules.id, Number(c.req.param('ruleId'))))
    .execute()
  return success(c)
})

// Admin parameter profiles
app.get('/admin/model-parameters', async (c) => {
  const serviceType = c.req.query('service_type')
  const active = c.req.query('active')
  const keyword = String(c.req.query('keyword') || '').trim()
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const page = clampInt(c.req.query('page'), 1, 1, 100000)
  const pageSize = clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100)
  const conditions: any[] = []

  if (serviceType) conditions.push(eq(schema.aiModelParameterProfiles.serviceType, serviceType))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiModelParameterProfiles.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiModelParameterProfiles.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiModelParameterProfiles.key, pattern),
      like(schema.aiModelParameterProfiles.name, pattern),
      like(schema.aiModelParameterProfiles.description, pattern),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = await db.select().from(schema.aiModelParameterProfiles)
      .where(where)
      .orderBy(schema.aiModelParameterProfiles.serviceType, schema.aiModelParameterProfiles.name, schema.aiModelParameterProfiles.id)
      .execute()
    return success(c, await Promise.all(rows.map(serializeParameterProfile)))
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.aiModelParameterProfiles)
    .where(where)
    .execute()
  const rows = await db.select().from(schema.aiModelParameterProfiles)
    .where(where)
    .orderBy(schema.aiModelParameterProfiles.serviceType, schema.aiModelParameterProfiles.name, schema.aiModelParameterProfiles.id)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  return success(c, {
    items: await Promise.all(rows.map(serializeParameterProfile)),
    pagination: {
      page,
      page_size: pageSize,
      total: Number(total || 0),
      total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)),
    },
  })
})

app.post('/admin/model-parameters', async (c) => {
  const body = await c.req.json()
  const ts = now()
  if (!body.key || !body.name) return badRequest(c, 'key and name are required')
  try {
  const result = await db.insert(schema.aiModelParameterProfiles).values({
      key: body.key,
      name: body.name,
      serviceType: body.service_type || body.serviceType || serviceFromType(body.model_type || body.modelType),
      description: body.description || '',
      parameters: null,
      isBuiltin: body.is_builtin ?? body.isBuiltin ?? false,
      isActive: body.is_active ?? body.isActive ?? true,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
    const row = (await db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, Number(result.insertId))).execute())[0]
    return created(c, await serializeParameterProfile(row))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.put('/admin/model-parameters/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  db.update(schema.aiModelParameterProfiles).set({
    key: body.key,
    name: body.name,
    serviceType: body.service_type || body.serviceType || serviceFromType(body.model_type || body.modelType),
    description: body.description || '',
    parameters: null,
    isBuiltin: body.is_builtin ?? body.isBuiltin ?? false,
    isActive: body.is_active ?? body.isActive ?? true,
    updatedAt: now(),
  }).where(eq(schema.aiModelParameterProfiles.id, id)).execute()
  const row = (await db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, id)).execute())[0]
  return success(c, await serializeParameterProfile(row))
})

app.delete('/admin/model-parameters/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).execute()
  await db.delete(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, id)).execute()
  return success(c)
})

app.get('/admin/model-parameters/:id/items', async (c) => {
  const profileId = Number(c.req.param('id'))
  const rows = (await db.select().from(schema.aiModelParameterProfileItems)
    .where(eq(schema.aiModelParameterProfileItems.profileId, profileId))
    .execute())
    .sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.id - b.id)
  return success(c, rows.map(serializeParameterItem))
})

app.post('/admin/model-parameters/:id/items', async (c) => {
  const profileId = Number(c.req.param('id'))
  const profile = (await db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, profileId)).execute())[0]
  if (!profile) return notFound(c, 'parameter profile not found')
  const body = await c.req.json()
  const type = String(body.type || '').trim()
  const label = String(body.label || '').trim()
  const value = String(body.value || '').trim()
  if (!type || !label || !value) return badRequest(c, 'type, label and value are required')
  const ts = now()
  const result = await db.insert(schema.aiModelParameterProfileItems).values({
    profileId,
    type,
    label,
    value,
    config: stringifyConfig(body.config),
    rank: Number(body.rank || 0),
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, Number(result.insertId))).execute())[0]
  return created(c, serializeParameterItem(row))
})

app.put('/admin/model-parameters/items/:itemId', async (c) => {
  const id = Number(c.req.param('itemId'))
  const body = await c.req.json()
  const type = String(body.type || '').trim()
  const label = String(body.label || '').trim()
  const value = String(body.value || '').trim()
  if (!type || !label || !value) return badRequest(c, 'type, label and value are required')
  await db.update(schema.aiModelParameterProfileItems).set({
    type,
    label,
    value,
    config: stringifyConfig(body.config),
    rank: Number(body.rank || 0),
    updatedAt: now(),
  }).where(eq(schema.aiModelParameterProfileItems.id, id)).execute()
  const row = (await db.select().from(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, id)).execute())[0]
  if (!row) return notFound(c, 'parameter item not found')
  return success(c, serializeParameterItem(row))
})

app.delete('/admin/model-parameters/items/:itemId', async (c) => {
  await db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, Number(c.req.param('itemId')))).execute()
  return success(c)
})

// User provider connection. Copies all public models under this provider to the user.
app.get('/user/providers', async (c) => {
  const userId = currentUserId(c)
  await ensureUser(userId)
  const rows = (await db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.userId, userId)).execute())
    .filter(row => !row.isDeleted)
    .sort((a, b) => b.id - a.id)
  return success(c, rows.map(row => ({ ...toSnakeCase(row), api_key: row.apiKey ? '********' : '' })))
})

app.get('/admin/user-providers', async (c) => {
  const userId = c.req.query('user_id')
  const provider = c.req.query('provider')
  const active = c.req.query('active')
  const keyword = String(c.req.query('keyword') || '').trim()
  const page = clampInt(c.req.query('page'), 1, 1, 100000)
  const pageSize = clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100)
  const conditions: any[] = []

  if (userId === '__platform__') conditions.push(isNull(schema.aiUserProviderConfigs.userId))
  else if (userId) conditions.push(eq(schema.aiUserProviderConfigs.userId, userId))
  if (provider) conditions.push(eq(schema.aiUserProviderConfigs.provider, provider))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiUserProviderConfigs.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiUserProviderConfigs.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiUserProviderConfigs.userId, pattern),
      like(schema.aiUserProviderConfigs.name, pattern),
      like(schema.aiUserProviderConfigs.provider, pattern),
      like(schema.aiUserProviderConfigs.baseUrl, pattern),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.aiUserProviderConfigs).where(where).execute()
  const rows = await db.select().from(schema.aiUserProviderConfigs)
    .where(where)
    .orderBy(schema.aiUserProviderConfigs.userId, sql`${schema.aiUserProviderConfigs.id} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()

  return success(c, {
    items: rows.map(row => ({ ...toSnakeCase(row), api_key: row.apiKey ? '********' : '' })),
    pagination: { page, page_size: pageSize, total: Number(total || 0), total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)) },
  })
})

app.post('/admin/user-providers', async (c) => {
  const body = await c.req.json()
  const rawUserId = String(body.user_id ?? body.userId ?? '').trim()
  const userId = rawUserId || null
  const providerId = Number(body.provider_id || body.providerId)
  const provider = await providerById(providerId)
  if (!provider) return notFound(c, 'provider not found')
  const baseUrl = String(body.base_url || body.baseUrl || '').trim()
  const apiKey = String(body.api_key || body.apiKey || '').trim()
  if (!baseUrl || !apiKey) return badRequest(c, 'base_url and api_key are required')
  const ts = now()
  const result = await db.insert(schema.aiUserProviderConfigs).values({
    userId,
    providerId,
    provider: provider.provider,
    name: body.name || provider.displayName || provider.name,
    baseUrl,
    apiKey,
    isActive: body.is_active ?? body.isActive ?? true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, Number(result.insertId))).execute())[0]
  return created(c, { ...toSnakeCase(row), api_key: row.apiKey ? '********' : '' })
})

app.put('/admin/user-providers/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const row = (await db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).execute())[0]
  if (!row) return notFound(c, 'user provider not found')
  const rawUserId = body.user_id ?? body.userId
  const providerId = Number(body.provider_id || body.providerId || row.providerId)
  const provider = await providerById(providerId)
  if (!provider) return notFound(c, 'provider not found')
  const apiKey = String(body.api_key || body.apiKey || '').trim()
  await db.update(schema.aiUserProviderConfigs).set({
    userId: rawUserId === undefined ? row.userId : (String(rawUserId || '').trim() || null),
    providerId,
    provider: provider.provider,
    name: body.name || provider.displayName || provider.name,
    baseUrl: body.base_url || body.baseUrl || row.baseUrl,
    apiKey: apiKey && apiKey !== '********' ? apiKey : row.apiKey,
    isActive: body.is_active ?? body.isActive ?? row.isActive,
    updatedAt: now(),
  }).where(eq(schema.aiUserProviderConfigs.id, id)).execute()
  const updated = (await db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).execute())[0]
  return success(c, { ...toSnakeCase(updated), api_key: updated.apiKey ? '********' : '' })
})

app.delete('/admin/user-providers/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const row = (await db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).execute())[0]
  if (!row) return notFound(c, 'user provider not found')
  await db.delete(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).execute()
  if (row.userId) {
    const modelsToDisable = (await db.select().from(schema.aiModelConfigs)
      .where(eq(schema.aiModelConfigs.userId, row.userId))
      .execute())
      .filter(model => model.providerId === row.providerId || model.provider === row.provider)
    for (const model of modelsToDisable) {
      await db.update(schema.aiModelConfigs).set({ isActive: false, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, model.id)).execute()
    }
  }
  return success(c)
})

app.post('/user/providers/connect', async (c) => {
  const userId = currentUserId(c)
  await ensureUser(userId)
  const body = await c.req.json()
  const providerId = Number(body.provider_id || body.providerId)
  const provider = await providerById(providerId)
  if (!provider) return notFound(c, 'provider not found')
  const baseUrl = String(body.base_url || body.baseUrl || '').trim()
  const apiKey = String(body.api_key || body.apiKey || '').trim()
  if (!baseUrl || !apiKey) return badRequest(c, 'base_url and api_key are required')
  const ts = now()

  const result = await db.insert(schema.aiUserProviderConfigs).values({
    userId,
    providerId,
    provider: provider.provider,
    name: String(body.name || '').trim() || provider.displayName || provider.name,
    baseUrl,
    apiKey,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const connected = (await db.select().from(schema.aiUserProviderConfigs)
    .where(eq(schema.aiUserProviderConfigs.id, Number(result.insertId)))
    .execute())[0]

  const availableModels = (await publicModels())
    .filter(model => model.isActive)
    .filter(model => model.providerId === providerId || model.provider === provider.provider)
    .length

  await db.update(schema.aiUsers).set({
    resourceMode: 'user_api',
    onboardingCompletedAt: ts,
    updatedAt: ts,
  }).where(eq(schema.aiUsers.id, userId)).execute()

  return success(c, {
    provider: serializeProvider(provider),
    user_provider: connected ? { ...toSnakeCase(connected), api_key: connected.apiKey ? '********' : '' } : null,
    copied: 0,
    available_models: availableModels,
  })
})

app.post('/seed-from-configs', async (c) => {
  const ts = now()
  const configs = (await db.select().from(schema.aiServiceConfigs).execute())
  let createdCount = 0

  for (const config of configs) {
    const key = providerKey(config.provider || config.name)
    let provider = (await db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.provider, key)).execute())[0]
    if (!provider) {
      const providerResult = await db.insert(schema.aiServiceProviders).values({
        name: config.name || key,
        displayName: config.name || key,
        serviceType: config.serviceType,
        provider: key,
        defaultUrl: '',
        presetModels: config.model,
        isActive: Boolean(config.isActive),
        createdAt: ts,
        updatedAt: ts,
      }).execute()
      provider = await providerById(Number(providerResult.insertId))
    }
    const models = parseJson(config.model, [])
    for (const model of Array.isArray(models) ? models : [models]) {
      const modelId = String(model || '').trim()
      if (!modelId) continue
      const exists = (await publicModels()).find(row => row.provider === key && row.serviceType === config.serviceType && row.modelId === modelId)
      if (exists) continue
      await db.insert(schema.aiModelConfigs).values({
        userId: null,
        providerId: provider.id,
        serviceType: config.serviceType,
        provider: key,
        modelId,
        name: modelId,
        baseUrl: null,
        priority: config.priority || 0,
        isDefault: Boolean(config.isDefault),
        isActive: Boolean(config.isActive),
        createdAt: ts,
        updatedAt: ts,
      }).execute()
      createdCount += 1
    }
  }

  return success(c, { created: createdCount })
})

export default app
