import { Hono } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, notFound, now, success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()
const DEFAULT_USER_ID = 'default'

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
  delete snake.default_url
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

function serializeModel(row: typeof schema.aiModelConfigs.$inferSelect, provider?: any) {
  const parameterProfile = row.parameterProfileId
    ? db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, row.parameterProfileId)).all()[0]
    : null
  return {
    ...toSnakeCase(row),
    type: typeFromService(row.serviceType),
    parameters: parseJson(row.parameters, {}),
    defaults: parseJson(row.defaults, {}),
    capabilities: parseJson(row.capabilities, {}),
    provider: provider ? serializeProvider(provider) : row.provider,
    parameter_profile: parameterProfile ? serializeParameterProfile(parameterProfile) : null,
  }
}

function serializeParameterProfile(row: typeof schema.aiModelParameterProfiles.$inferSelect) {
  const items = db.select().from(schema.aiModelParameterProfileItems)
    .where(eq(schema.aiModelParameterProfileItems.profileId, row.id))
    .all()
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

function currentUserId(c: any) {
  return currentAuthUserId(c)
}

function ensureUser(userId: string) {
  const [row] = db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).all()
  if (row) return row
  const ts = now()
  db.insert(schema.aiUsers).values({
    id: userId,
    name: userId === DEFAULT_USER_ID ? '默认用户' : userId,
    role: 'user',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).run()
  return db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).all()[0]
}

function publicModels() {
  return db.select().from(schema.aiModelConfigs).where(isNull(schema.aiModelConfigs.userId)).all()
}

function userModels(userId: string) {
  return db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.userId, userId)).all()
}

function providerById(id: number) {
  return db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.id, id)).all()[0]
}

function providerForModel(model: typeof schema.aiModelConfigs.$inferSelect) {
  if (model.providerId) return providerById(model.providerId)
  return db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.provider, model.provider)).all()[0]
}

function normalizeModelBody(body: any, scope: 'public' | 'user') {
  const serviceType = String(body.service_type || body.serviceType || serviceFromType(body.type)).trim()
  const providerId = Number(body.provider_id ?? body.providerId ?? 0) || null
  const providerRow = providerId ? providerById(providerId) : null
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
    priority: Number(body.priority || body.rank || 0),
    isDefault: Boolean(body.is_default ?? body.isDefault ?? false),
    isActive: Boolean(body.is_active ?? body.isActive ?? true),
  }
}

async function clearDefaultForService(serviceType: string, userId?: string | null, exceptId?: number) {
  let rows = db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.serviceType, serviceType)).all()
  rows = rows.filter(row => (userId ? row.userId === userId : !row.userId))
  for (const row of rows) {
    if (exceptId && row.id === exceptId) continue
    if (!row.isDefault) continue
    db.update(schema.aiModelConfigs).set({ isDefault: false, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, row.id)).run()
  }
}

// Public model options used by creation pages. User copies win over platform templates.
app.get('/options', async (c) => {
  const userId = currentUserId(c)
  const serviceType = c.req.query('service_type')
  let rows = [...userModels(userId), ...publicModels()].filter(row => row.isActive)
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType)

  const seen = new Set<string>()
  rows = rows
    .sort((a, b) => Number(Boolean(b.userId)) - Number(Boolean(a.userId)) || Number(b.isDefault) - Number(a.isDefault) || (b.priority || 0) - (a.priority || 0))
    .filter(row => {
      const key = `${row.serviceType}:${row.provider}:${row.modelId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

  return success(c, rows.map(row => ({
    label: `${row.name || row.modelId} (${row.provider})`,
    value: row.modelId,
    model_id: row.modelId,
    provider: row.provider,
    service_type: row.serviceType,
    user_id: row.userId,
    parameters: parseJson(row.parameters, {}),
    defaults: parseJson(row.defaults, {}),
    capabilities: parseJson(row.capabilities, {}),
    parameter_profile: row.parameterProfileId
      ? serializeParameterProfile(db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, row.parameterProfileId)).all()[0])
      : null,
    default_aspect_ratio: parseJson(row.defaults, {}).aspect_ratio || parseJson(row.defaults, {}).aspectRatio || '',
    default_resolution: parseJson(row.defaults, {}).resolution || '',
    is_default: row.isDefault,
  })))
})

// Legacy compatible model list. Defaults to user-visible rows.
app.get('/', async (c) => {
  const scope = c.req.query('scope') || 'user'
  const userId = currentUserId(c)
  const serviceType = c.req.query('service_type')
  const provider = c.req.query('provider')
  const activeOnly = c.req.query('active') !== '0'
  let rows = scope === 'public' ? publicModels() : [...userModels(userId), ...publicModels()]
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType)
  if (provider) rows = rows.filter(row => row.provider === provider)
  if (activeOnly) rows = rows.filter(row => row.isActive)
  rows.sort((a, b) => Number(Boolean(b.userId)) - Number(Boolean(a.userId)) || a.serviceType.localeCompare(b.serviceType) || (b.priority || 0) - (a.priority || 0))
  return success(c, rows.map(row => serializeModel(row, providerForModel(row))))
})

// Admin users
app.get('/admin/users', (c) => {
  return success(c, db.select().from(schema.aiUsers).all().map(toSnakeCase))
})

app.post('/admin/users', async (c) => {
  const body = await c.req.json()
  const id = String(body.id || body.email || body.name || '').trim()
  if (!id) return badRequest(c, 'id is required')
  const ts = now()
  try {
    db.insert(schema.aiUsers).values({
      id,
      name: body.name || id,
      email: body.email || '',
      role: body.role || 'user',
      isActive: body.is_active ?? body.isActive ?? true,
      createdAt: ts,
      updatedAt: ts,
    }).run()
    return created(c, toSnakeCase(ensureUser(id)))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

// Admin provider templates
app.get('/admin/providers', (c) => {
  const activeOnly = c.req.query('active') === '1'
  let rows = db.select().from(schema.aiServiceProviders).all()
  if (activeOnly) rows = rows.filter(row => row.isActive)
  rows.sort((a, b) => (b.id || 0) - (a.id || 0))
  return success(c, rows.map(serializeProvider))
})

app.post('/admin/providers', async (c) => {
  const body = await c.req.json()
  const ts = now()
  const key = providerKey(body.key || body.provider || body.name)
  if (!body.name) return badRequest(c, 'name is required')
  try {
    const result = db.insert(schema.aiServiceProviders).values({
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
    }).run()
    const row = providerById(Number(result.lastInsertRowid))
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
  }).where(eq(schema.aiServiceProviders.id, id)).run()
  return success(c, serializeProvider(providerById(id)))
})

app.delete('/admin/providers/:id', (c) => {
  db.delete(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.id, Number(c.req.param('id')))).run()
  return success(c)
})

// Admin public model templates
app.get('/admin/models', (c) => {
  const serviceType = c.req.query('service_type')
  let rows = publicModels()
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType)
  rows.sort((a, b) => a.serviceType.localeCompare(b.serviceType) || (b.priority || 0) - (a.priority || 0))
  return success(c, rows.map(row => serializeModel(row, providerForModel(row))))
})

app.post('/admin/models', async (c) => {
  const body = await c.req.json()
  const values = normalizeModelBody(body, 'public')
  if ('error' in values) return badRequest(c, values.error)
  const ts = now()
  if (values.isDefault) await clearDefaultForService(values.serviceType, null)
  try {
    const result = db.insert(schema.aiModelConfigs).values({ ...values, userId: null, createdAt: ts, updatedAt: ts }).run()
    const row = db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, Number(result.lastInsertRowid))).all()[0]
    return created(c, serializeModel(row, providerForModel(row)))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.put('/admin/models/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const values = normalizeModelBody(body, 'public')
  if ('error' in values) return badRequest(c, values.error)
  if (values.isDefault) await clearDefaultForService(values.serviceType, null, id)
  db.update(schema.aiModelConfigs).set({ ...values, userId: null, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, id)).run()
  const row = db.select().from(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, id)).all()[0]
  return success(c, serializeModel(row, providerForModel(row)))
})

app.delete('/admin/models/:id', (c) => {
  db.delete(schema.aiModelConfigs).where(eq(schema.aiModelConfigs.id, Number(c.req.param('id')))).run()
  return success(c)
})

// Admin parameter profiles
app.get('/admin/model-parameters', (c) => {
  const serviceType = c.req.query('service_type')
  let rows = db.select().from(schema.aiModelParameterProfiles).all()
  if (serviceType) rows = rows.filter(row => row.serviceType === serviceType)
  rows.sort((a, b) => a.serviceType.localeCompare(b.serviceType) || a.name.localeCompare(b.name))
  return success(c, rows.map(serializeParameterProfile))
})

app.post('/admin/model-parameters', async (c) => {
  const body = await c.req.json()
  const ts = now()
  if (!body.key || !body.name) return badRequest(c, 'key and name are required')
  try {
    const result = db.insert(schema.aiModelParameterProfiles).values({
      key: body.key,
      name: body.name,
      serviceType: body.service_type || body.serviceType || serviceFromType(body.model_type || body.modelType),
      description: body.description || '',
      parameters: null,
      isBuiltin: body.is_builtin ?? body.isBuiltin ?? false,
      isActive: body.is_active ?? body.isActive ?? true,
      createdAt: ts,
      updatedAt: ts,
    }).run()
    const row = db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, Number(result.lastInsertRowid))).all()[0]
    return created(c, serializeParameterProfile(row))
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
  }).where(eq(schema.aiModelParameterProfiles.id, id)).run()
  const row = db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, id)).all()[0]
  return success(c, serializeParameterProfile(row))
})

app.delete('/admin/model-parameters/:id', (c) => {
  const id = Number(c.req.param('id'))
  db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.profileId, id)).run()
  db.delete(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, id)).run()
  return success(c)
})

app.get('/admin/model-parameters/:id/items', (c) => {
  const profileId = Number(c.req.param('id'))
  const rows = db.select().from(schema.aiModelParameterProfileItems)
    .where(eq(schema.aiModelParameterProfileItems.profileId, profileId))
    .all()
    .sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.id - b.id)
  return success(c, rows.map(serializeParameterItem))
})

app.post('/admin/model-parameters/:id/items', async (c) => {
  const profileId = Number(c.req.param('id'))
  const profile = db.select().from(schema.aiModelParameterProfiles).where(eq(schema.aiModelParameterProfiles.id, profileId)).all()[0]
  if (!profile) return notFound(c, 'parameter profile not found')
  const body = await c.req.json()
  const type = String(body.type || '').trim()
  const label = String(body.label || '').trim()
  const value = String(body.value || '').trim()
  if (!type || !label || !value) return badRequest(c, 'type, label and value are required')
  const ts = now()
  const result = db.insert(schema.aiModelParameterProfileItems).values({
    profileId,
    type,
    label,
    value,
    config: stringifyConfig(body.config),
    rank: Number(body.rank || 0),
    createdAt: ts,
    updatedAt: ts,
  }).run()
  const row = db.select().from(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, Number(result.lastInsertRowid))).all()[0]
  return created(c, serializeParameterItem(row))
})

app.put('/admin/model-parameters/items/:itemId', async (c) => {
  const id = Number(c.req.param('itemId'))
  const body = await c.req.json()
  const type = String(body.type || '').trim()
  const label = String(body.label || '').trim()
  const value = String(body.value || '').trim()
  if (!type || !label || !value) return badRequest(c, 'type, label and value are required')
  db.update(schema.aiModelParameterProfileItems).set({
    type,
    label,
    value,
    config: stringifyConfig(body.config),
    rank: Number(body.rank || 0),
    updatedAt: now(),
  }).where(eq(schema.aiModelParameterProfileItems.id, id)).run()
  const row = db.select().from(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, id)).all()[0]
  if (!row) return notFound(c, 'parameter item not found')
  return success(c, serializeParameterItem(row))
})

app.delete('/admin/model-parameters/items/:itemId', (c) => {
  db.delete(schema.aiModelParameterProfileItems).where(eq(schema.aiModelParameterProfileItems.id, Number(c.req.param('itemId')))).run()
  return success(c)
})

// User provider connection. Copies all public models under this provider to the user.
app.get('/user/providers', (c) => {
  const userId = currentUserId(c)
  ensureUser(userId)
  const rows = db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.userId, userId)).all()
  return success(c, rows.map(row => ({ ...toSnakeCase(row), api_key: row.apiKey ? '********' : '' })))
})

app.get('/admin/user-providers', (c) => {
  let rows = db.select().from(schema.aiUserProviderConfigs).all()
  const userId = c.req.query('user_id')
  if (userId) rows = rows.filter(row => row.userId === userId)
  rows.sort((a, b) => a.userId.localeCompare(b.userId) || (b.id || 0) - (a.id || 0))
  return success(c, rows.map(row => ({ ...toSnakeCase(row), api_key: row.apiKey ? '********' : '' })))
})

app.delete('/admin/user-providers/:id', (c) => {
  const id = Number(c.req.param('id'))
  const row = db.select().from(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).all()[0]
  if (!row) return notFound(c, 'user provider not found')
  db.delete(schema.aiUserProviderConfigs).where(eq(schema.aiUserProviderConfigs.id, id)).run()
  db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.userId, row.userId))
    .all()
    .filter(model => model.providerId === row.providerId || model.provider === row.provider)
    .forEach(model => {
      db.update(schema.aiModelConfigs).set({ isActive: false, updatedAt: now() }).where(eq(schema.aiModelConfigs.id, model.id)).run()
    })
  return success(c)
})

app.post('/user/providers/connect', async (c) => {
  const userId = currentUserId(c)
  ensureUser(userId)
  const body = await c.req.json()
  const providerId = Number(body.provider_id || body.providerId)
  const provider = providerById(providerId)
  if (!provider) return notFound(c, 'provider not found')
  const baseUrl = String(body.base_url || body.baseUrl || '').trim()
  const apiKey = String(body.api_key || body.apiKey || '').trim()
  if (!baseUrl || !apiKey) return badRequest(c, 'base_url and api_key are required')
  const ts = now()

  const existing = db.select().from(schema.aiUserProviderConfigs)
    .where(and(eq(schema.aiUserProviderConfigs.userId, userId), eq(schema.aiUserProviderConfigs.providerId, providerId))).all()[0]
  if (existing) {
    db.update(schema.aiUserProviderConfigs).set({
      name: provider.displayName || provider.name,
      provider: provider.provider,
      baseUrl,
      apiKey,
      isActive: true,
      updatedAt: ts,
    }).where(eq(schema.aiUserProviderConfigs.id, existing.id)).run()
  } else {
    db.insert(schema.aiUserProviderConfigs).values({
      userId,
      providerId,
      provider: provider.provider,
      name: provider.displayName || provider.name,
      baseUrl,
      apiKey,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    }).run()
  }

  const sourceModels = publicModels().filter(model => model.providerId === providerId || model.provider === provider.provider)
  let copied = 0
  for (const model of sourceModels) {
    const exists = userModels(userId).find(row => row.sourceModelId === model.id || (row.provider === model.provider && row.modelId === model.modelId && row.serviceType === model.serviceType))
    if (exists) {
      db.update(schema.aiModelConfigs).set({
        name: model.name,
        description: model.description,
        baseUrl: null,
        endpoint: model.endpoint,
        queryEndpoint: model.queryEndpoint,
        parameterProfileId: model.parameterProfileId,
        parameters: model.parameters,
        defaults: model.defaults,
        capabilities: model.capabilities,
        cost: model.cost,
        priority: model.priority,
        isActive: true,
        updatedAt: ts,
      }).where(eq(schema.aiModelConfigs.id, exists.id)).run()
      continue
    }
    db.insert(schema.aiModelConfigs).values({
      userId,
      providerId,
      sourceModelId: model.id,
      serviceType: model.serviceType,
      provider: model.provider,
      modelId: model.modelId,
      name: model.name,
      description: model.description,
      baseUrl: null,
      parameterProfileId: model.parameterProfileId,
      endpoint: model.endpoint,
      queryEndpoint: model.queryEndpoint,
      parameters: model.parameters,
      defaults: model.defaults,
      capabilities: model.capabilities,
      cost: model.cost,
      priority: model.priority,
      isDefault: model.isDefault,
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    }).run()
    copied += 1
  }

  return success(c, { provider: serializeProvider(provider), copied })
})

app.post('/seed-from-configs', async (c) => {
  const ts = now()
  const configs = db.select().from(schema.aiServiceConfigs).all()
  let createdCount = 0

  for (const config of configs) {
    const key = providerKey(config.provider || config.name)
    let provider = db.select().from(schema.aiServiceProviders).where(eq(schema.aiServiceProviders.provider, key)).all()[0]
    if (!provider) {
      const providerResult = db.insert(schema.aiServiceProviders).values({
        name: config.name || key,
        displayName: config.name || key,
        serviceType: config.serviceType,
        provider: key,
        defaultUrl: '',
        presetModels: config.model,
        isActive: Boolean(config.isActive),
        createdAt: ts,
        updatedAt: ts,
      }).run()
      provider = providerById(Number(providerResult.lastInsertRowid))
    }
    const models = parseJson(config.model, [])
    for (const model of Array.isArray(models) ? models : [models]) {
      const modelId = String(model || '').trim()
      if (!modelId) continue
      const exists = publicModels().find(row => row.provider === key && row.serviceType === config.serviceType && row.modelId === modelId)
      if (exists) continue
      db.insert(schema.aiModelConfigs).values({
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
      }).run()
      createdCount += 1
    }
  }

  return success(c, { created: createdCount })
})

export default app
