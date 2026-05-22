/**
 * AI 服务抽象层 — 从数据库配置中获取 provider 和 API key
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'
import { joinProviderUrl } from './adapters/url.js'
import { normalizeZenmuxOpenAIBaseUrl } from './adapters/zenmux-utils.js'
import { findPlatformProvider, findServiceConfig, findUserProvider, isPlatformUserId, listModelConfigs, listParameterProfileItems, parseModelJson } from '../repositories/models.js'
import { isActiveMember as repoIsActiveMember } from '../repositories/users.js'

export type ServiceType = 'text' | 'image' | 'video' | 'audio' | 'embedding'

export interface AIConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  modelConfigId?: number
  userProviderId?: number | null
  modelDefaults?: Record<string, any>
  modelParameters?: Record<string, any>
  modelCapabilities?: Record<string, any>
  isFree?: boolean
  memberOnly?: boolean
  resourceMode?: 'user_api' | 'platform'
  billable?: boolean
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

function getModelParameters(_model: any) {
  throw new Error('getModelParameters is async-only after MySQL migration')
}

async function getModelParametersAsync(model: any) {
  const explicit = parseModelJson(model.parameters, {})
  if (!model.parameterProfileId) return explicit
  const items = await listParameterProfileItems(model.parameterProfileId)
  return {
    ...explicit,
    profileId: model.parameterProfileId,
    items: items.map((item: any) => ({
      type: item.type,
      label: item.label,
      value: item.value,
      config: parseJson(item.config, {}),
      rank: item.rank || 0,
    })),
  }
}

function isActiveMember(_userId: string) {
  throw new Error('isActiveMember is async-only after MySQL migration')
}

function assertModelUsable(_modelConfig: any, _userId: string) {
  throw new Error('assertModelUsable is async-only after MySQL migration')
}

async function assertModelUsableAsync(modelConfig: any, userId: string) {
  if (modelConfig.memberOnly && !(await repoIsActiveMember(userId))) {
    throw new Error(`模型「${modelConfig.name || modelConfig.modelId}」仅付费会员可用，请先开通会员`)
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

function modelConfigToAIConfig(
  _modelConfig: any,
  _userProvider?: any,
  _serviceConfig?: any,
): AIConfig {
  throw new Error('modelConfigToAIConfig is async-only after MySQL migration')
}

async function modelConfigToAIConfigAsync(
  modelConfig: any,
  userProvider?: any,
  serviceConfig?: any,
): Promise<AIConfig> {
  const providerUserId = userProvider?.user_id || userProvider?.userId || ''
  const isUserProvider = Boolean(providerUserId && !isPlatformUserId(providerUserId) && !userProvider?.__platform_provider)
  const base = userProvider
    ? {
        provider: userProvider.provider,
        baseUrl: userProvider.base_url || userProvider.baseUrl,
        apiKey: userProvider.api_key || userProvider.apiKey,
        userProviderId: isUserProvider ? userProvider.id : null,
      }
    : serviceConfig
      ? {
          provider: serviceConfig.provider || modelConfig.provider,
          baseUrl: modelConfig.baseUrl || serviceConfig.base_url || serviceConfig.baseUrl,
          apiKey: serviceConfig.api_key || serviceConfig.apiKey,
          userProviderId: null,
        }
      : null

  if (!base) throw new Error('model provider config missing')
  return {
    ...base,
    model: modelConfig.modelId,
    modelConfigId: modelConfig.id,
    modelDefaults: parseModelJson(modelConfig.defaults, {}),
    modelParameters: await getModelParametersAsync(modelConfig),
    modelCapabilities: parseModelJson(modelConfig.capabilities, {}),
    isFree: Boolean(modelConfig.isFree),
    memberOnly: Boolean(modelConfig.memberOnly),
    resourceMode: isUserProvider ? 'user_api' : 'platform',
    billable: !isUserProvider,
  }
}

export async function getConfigForModelSelectionAsync(params: {
  serviceType: ServiceType
  modelId?: string | null
  modelConfigId?: number | null
  userProviderId?: number | null
  userId?: string
}): Promise<AIConfig | null> {
  const userId = params.userId || DEFAULT_USER_ID
  const explicitModelSelected = Boolean(params.modelConfigId || params.modelId)
  const modelRows = await listModelConfigs(params)
  const modelConfig = explicitModelSelected ? modelRows[0] : modelRows.find((row: any) => row.isDefault)
  if (!modelConfig) return null
  await assertModelUsableAsync(modelConfig, userId)

  const userProvider = await findUserProvider({
    userId,
    provider: modelConfig.provider,
    providerId: modelConfig.providerId,
    userProviderId: params.userProviderId,
    allowPlatform: false,
  })
  if (userProvider) return modelConfigToAIConfigAsync(modelConfig, userProvider)

  const platformProvider = await findPlatformProvider({
    provider: modelConfig.provider,
    providerId: modelConfig.providerId,
  })
  if (platformProvider) return modelConfigToAIConfigAsync(modelConfig, platformProvider)

  const serviceConfig = await findServiceConfig(params.serviceType, modelConfig.provider)
  if (!serviceConfig) {
    logTaskWarn('AIConfig', 'selected-model-provider-config-missing', {
      serviceType: params.serviceType,
      model: modelConfig.modelId,
      modelConfigId: modelConfig.id,
      provider: modelConfig.provider,
      userId,
    })
    return null
  }
  return modelConfigToAIConfigAsync(modelConfig, null, serviceConfig)
}

export function getConfigForModelSelection(_params: { serviceType: ServiceType; modelId?: string | null; modelConfigId?: number | null; userProviderId?: number | null; userId?: string }): AIConfig | null { throw new Error('getConfigForModelSelection is async-only after MySQL migration; use getConfigForModelSelectionAsync') }

export async function getConfigForModelAsync(serviceType: ServiceType, modelId?: string | null, configId?: number | null, userId = DEFAULT_USER_ID, userProviderId?: number | null): Promise<AIConfig | null> {
  const explicitModelSelected = Boolean(modelId || configId)
  const modelRows = await listModelConfigs({ serviceType, modelId, modelConfigId: configId, userId })
  const modelConfig = explicitModelSelected ? modelRows[0] : modelRows.find((row: any) => row.isDefault)
  if (!modelConfig) {
    if (!explicitModelSelected) throw new Error(`请先在后台为 ${serviceType} 类型设置默认模型`)
    const fallback = await getActiveConfigAsync(serviceType)
    return fallback ? { ...fallback, model: modelId || fallback.model } : null
  }
  await assertModelUsableAsync(modelConfig, userId)

  const userProvider = await findUserProvider({
    userId,
    provider: modelConfig.provider,
    providerId: modelConfig.providerId,
    userProviderId,
    allowPlatform: false,
  })
  if (userProvider) return modelConfigToAIConfigAsync(modelConfig, userProvider)

  const platformProvider = await findPlatformProvider({
    provider: modelConfig.provider,
    providerId: modelConfig.providerId,
  })
  if (platformProvider) return modelConfigToAIConfigAsync(modelConfig, platformProvider)

  const serviceConfig = await findServiceConfig(serviceType, modelConfig.provider, configId)
  if (!serviceConfig) {
    logTaskWarn('AIConfig', 'model-provider-config-missing', {
      serviceType,
      model: modelId,
      provider: modelConfig.provider,
    })
    return null
  }
  return modelConfigToAIConfigAsync(modelConfig, null, serviceConfig)
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

export function getActiveConfig(serviceType: ServiceType): AIConfig | null { throw new Error(`getActiveConfig() is async-only after MySQL migration; use getActiveConfigAsync`) }

export async function getActiveConfigAsync(serviceType: ServiceType): Promise<AIConfig | null> {
  const active = await findServiceConfig(serviceType)
  if (!active) {
    if (serviceType === 'image' || serviceType === 'video') {
      const apiKey = process.env.APIMART_API_KEY || process.env.AI_API_KEY || ''
      if (apiKey) {
        const model = serviceType === 'video'
          ? process.env.APIMART_VIDEO_MODEL || APIMART_DEFAULT_VIDEO_MODEL
          : process.env.APIMART_IMAGE_MODEL || APIMART_DEFAULT_IMAGE_MODEL
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
  return serviceConfigToAIConfig({
    provider: active.provider,
    baseUrl: active.base_url || active.baseUrl,
    apiKey: active.api_key || active.apiKey,
    model: active.model,
  } as any)
}

export function getTextConfig(): AIConfig { throw new Error('getTextConfig is async-only after MySQL migration; use getTextConfigAsync') }

export async function getTextConfigAsync(): Promise<AIConfig> {
  const config = await getActiveConfigAsync('text')
  if (!config) {
    const apiKey = process.env.APIMART_API_KEY || process.env.AI_API_KEY || ''
    if (apiKey) {
      return {
        provider: 'apimart',
        baseUrl: process.env.APIMART_BASE_URL || APIMART_DEFAULT_BASE_URL,
        apiKey,
        model: process.env.APIMART_TEXT_MODEL || APIMART_DEFAULT_MODEL,
      }
    }
    throw new Error('No active text AI config — 请在后台模型配置中设置文本默认模型')
  }
  return config
}

export function getAudioConfig(): AIConfig { throw new Error('getAudioConfig is async-only after MySQL migration; use getActiveConfigAsync') }

export function getAudioConfigById(id?: number | null): AIConfig { throw new Error(`getAudioConfigById() is async-only after MySQL migration`) }

export function getConfigById(id: number): AIConfig | null { throw new Error(`getConfigById() is async-only after MySQL migration`) }

export function getConfigForModel(serviceType: ServiceType, modelId?: string | null, configId?: number | null, userId = DEFAULT_USER_ID): AIConfig | null { throw new Error(`getConfigForModel(, , , ) is async-only after MySQL migration; use getConfigForModelAsync`) }
