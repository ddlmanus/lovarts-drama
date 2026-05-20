/**
 * AI 服务抽象层 — 从数据库配置中获取 provider 和 API key
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'
import { joinProviderUrl } from './adapters/url.js'
import { normalizeZenmuxOpenAIBaseUrl } from './adapters/zenmux-utils.js'

export type ServiceType = 'text' | 'image' | 'video' | 'audio' | 'embedding'

export interface AIConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  modelDefaults?: Record<string, any>
  modelParameters?: Record<string, any>
  modelCapabilities?: Record<string, any>
}

const APIMART_DEFAULT_BASE_URL = 'https://api.apimart.ai'
const APIMART_DEFAULT_MODEL = 'gpt-5'
const APIMART_DEFAULT_IMAGE_MODEL = 'gpt-image-2'
const APIMART_DEFAULT_VIDEO_MODEL = 'doubao-seedance-2.0'
const DEFAULT_USER_ID = 'default'

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function getModelParameters(model: typeof schema.aiModelConfigs.$inferSelect) {
  const explicit = parseJson(model.parameters, {})
  if (!model.parameterProfileId) return explicit
  const items = db.select().from(schema.aiModelParameterProfileItems)
    .where(eq(schema.aiModelParameterProfileItems.profileId, model.parameterProfileId))
    .all()
    .filter(item => item.type && item.value)
    .sort((a, b) => (a.rank || 0) - (b.rank || 0) || a.id - b.id)
  return {
    ...explicit,
    profileId: model.parameterProfileId,
    items: items.map(item => ({
      type: item.type,
      label: item.label,
      value: item.value,
      config: parseJson(item.config, {}),
      rank: item.rank || 0,
    })),
  }
}

function serviceConfigToAIConfig(row: typeof schema.aiServiceConfigs.$inferSelect, model?: string): AIConfig {
  const models = row.model ? parseJson(row.model, []) : []
  return {
    provider: row.provider || '',
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    model: model || models[0] || '',
  }
}

function rowUserScore(rowUserId: string | null, currentUserId: string) {
  if (rowUserId === currentUserId && currentUserId !== DEFAULT_USER_ID) return 3
  if (rowUserId === DEFAULT_USER_ID) return 2
  if (!rowUserId) return 1
  return 0
}

export function getTextProviderBaseUrl(config: AIConfig) {
  const provider = config.provider.toLowerCase()

  if (provider === 'openai' || provider === 'openrouter' || provider === 'chatfire' || provider === 'apimart') {
    return joinProviderUrl(config.baseUrl, '/v1', '')
  }

  if (provider === 'zenmux') {
    return normalizeZenmuxOpenAIBaseUrl(config.baseUrl)
  }

  if (provider === 'volcengine') {
    return joinProviderUrl(config.baseUrl, '/api/v3', '')
  }

  if (provider === 'ali') {
    return joinProviderUrl(config.baseUrl, '/api/v1', '')
  }

  return config.baseUrl
}

export function getActiveConfig(serviceType: ServiceType): AIConfig | null {
  const rows = db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.serviceType, serviceType))
    .all()
    .filter(r => r.isActive)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0)) // 高优先级优先

  const active = rows[0]
  if (!active) {
    if (serviceType === 'image' || serviceType === 'video') {
      const apiKey = process.env.APIMART_API_KEY || process.env.AI_API_KEY || ''
      if (apiKey) {
        const model = serviceType === 'video'
          ? process.env.APIMART_VIDEO_MODEL || APIMART_DEFAULT_VIDEO_MODEL
          : process.env.APIMART_IMAGE_MODEL || APIMART_DEFAULT_IMAGE_MODEL
        logTaskProgress('AIConfig', `apimart-${serviceType}-env-fallback`, {
          provider: 'apimart',
          model,
        })
        return {
          provider: 'apimart',
          baseUrl: process.env.APIMART_BASE_URL || APIMART_DEFAULT_BASE_URL,
          apiKey,
          model,
        }
      }
    }
    logTaskWarn('AIConfig', 'active-config-missing', { serviceType })
    return null
  }

  const models = active.model ? parseJson(active.model, []) : []
  logTaskProgress('AIConfig', 'active-config-selected', {
    serviceType,
    configId: active.id,
    provider: active.provider,
    model: models[0] || '',
    priority: active.priority,
  })
  return serviceConfigToAIConfig(active)
}

export function getTextConfig(): AIConfig {
  const config = getActiveConfig('text')
  if (!config) {
    const apiKey = process.env.APIMART_API_KEY || process.env.AI_API_KEY || ''
    if (apiKey) {
      logTaskProgress('AIConfig', 'apimart-env-fallback', {
        provider: 'apimart',
        model: process.env.APIMART_TEXT_MODEL || APIMART_DEFAULT_MODEL,
      })
      return {
        provider: 'apimart',
        baseUrl: process.env.APIMART_BASE_URL || APIMART_DEFAULT_BASE_URL,
        apiKey,
        model: process.env.APIMART_TEXT_MODEL || APIMART_DEFAULT_MODEL,
      }
    }
    throw new Error('No active text AI config — 请在设置中添加 APIMart 文本服务，或设置 APIMART_API_KEY')
  }
  return config
}

export function getAudioConfig(): AIConfig {
  const config = getActiveConfig('audio')
  if (!config) throw new Error('No active audio AI config — 请在设置中添加音频服务')
  return config
}

export function getAudioConfigById(id?: number | null): AIConfig {
  if (id) {
    const config = getConfigById(id)
    if (config) return config
  }
  return getAudioConfig()
}

export function getConfigById(id: number): AIConfig | null {
  const [row] = db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.id, id)).all()
  if (!row || !row.isActive) {
    logTaskWarn('AIConfig', 'config-by-id-missing', { configId: id })
    return null
  }
  const models = row.model ? parseJson(row.model, []) : []
  logTaskProgress('AIConfig', 'config-by-id-selected', {
    configId: id,
    provider: row.provider,
    model: models[0] || '',
    serviceType: row.serviceType,
  })
  return serviceConfigToAIConfig(row)
}

export function getConfigForModel(serviceType: ServiceType, modelId?: string | null, configId?: number | null, userId = DEFAULT_USER_ID): AIConfig | null {
  if (!modelId && configId) return getConfigById(configId)

  const modelRows = db.select().from(schema.aiModelConfigs)
    .where(eq(schema.aiModelConfigs.serviceType, serviceType))
    .all()
    .filter(row => row.isActive && (!modelId || row.modelId === modelId))
    .filter(row => !row.userId || row.userId === userId || row.userId === DEFAULT_USER_ID)
    .sort((a, b) => {
      const aScore = rowUserScore(a.userId, userId)
      const bScore = rowUserScore(b.userId, userId)
      return bScore - aScore || Number(b.isDefault) - Number(a.isDefault) || (b.priority || 0) - (a.priority || 0)
    })

  const modelConfig = modelRows[0]
  if (!modelConfig) {
    const fallback = configId ? getConfigById(configId) : getActiveConfig(serviceType)
    return fallback ? { ...fallback, model: modelId || fallback.model } : null
  }

  const userProvider = modelConfig.userId
    ? db.select().from(schema.aiUserProviderConfigs)
      .where(eq(schema.aiUserProviderConfigs.userId, modelConfig.userId))
      .all()
      .filter(row => row.isActive && row.provider === modelConfig.provider)
      .find(row => !modelConfig.providerId || row.providerId === modelConfig.providerId)
    : null

  if (userProvider) {
    return {
      provider: userProvider.provider,
      baseUrl: userProvider.baseUrl,
      apiKey: userProvider.apiKey,
      model: modelConfig.modelId,
      modelDefaults: parseJson(modelConfig.defaults, {}),
      modelParameters: getModelParameters(modelConfig),
      modelCapabilities: parseJson(modelConfig.capabilities, {}),
    }
  }

  const serviceConfig = db.select().from(schema.aiServiceConfigs)
    .where(eq(schema.aiServiceConfigs.serviceType, serviceType))
    .all()
    .filter(row => row.isActive)
    .filter(row => !configId || row.id === configId)
    .filter(row => (row.provider || '') === modelConfig.provider)
    .sort((a, b) => (b.priority || 0) - (a.priority || 0))[0]

  if (!serviceConfig && modelConfig.userId) {
    logTaskWarn('AIConfig', 'user-provider-config-missing', {
      serviceType,
      model: modelId,
      provider: modelConfig.provider,
      userId: modelConfig.userId,
    })
  }

  if (!serviceConfig) {
    logTaskWarn('AIConfig', 'model-provider-config-missing', {
      serviceType,
      model: modelId,
      provider: modelConfig.provider,
    })
    return configId ? getConfigById(configId) : getActiveConfig(serviceType)
  }

  const config = serviceConfigToAIConfig(serviceConfig, modelConfig.modelId)
  return {
    ...config,
    baseUrl: modelConfig.baseUrl || config.baseUrl,
    modelDefaults: parseJson(modelConfig.defaults, {}),
    modelParameters: getModelParameters(modelConfig),
    modelCapabilities: parseJson(modelConfig.capabilities, {}),
  }
}
