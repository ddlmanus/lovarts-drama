/**
 * AI 服务抽象层 — 从数据库配置中获取 provider 和 API key
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { logTaskProgress, logTaskWarn } from '../utils/task-logger.js'
import { joinProviderUrl } from './adapters/url.js'

export type ServiceType = 'text' | 'image' | 'video' | 'audio'

export interface AIConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
}

const APIMART_DEFAULT_BASE_URL = 'https://api.apimart.ai'
const APIMART_DEFAULT_MODEL = 'gpt-5'
const APIMART_DEFAULT_IMAGE_MODEL = 'gpt-image-2'
const APIMART_DEFAULT_VIDEO_MODEL = 'doubao-seedance-2.0'

export function getTextProviderBaseUrl(config: AIConfig) {
  const provider = config.provider.toLowerCase()

  if (provider === 'openai' || provider === 'openrouter' || provider === 'chatfire' || provider === 'apimart') {
    return joinProviderUrl(config.baseUrl, '/v1', '')
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

  const models = active.model ? JSON.parse(active.model) : []
  logTaskProgress('AIConfig', 'active-config-selected', {
    serviceType,
    configId: active.id,
    provider: active.provider,
    model: models[0] || '',
    priority: active.priority,
  })
  return {
    provider: active.provider || '',
    baseUrl: active.baseUrl,
    apiKey: active.apiKey,
    model: models[0] || '',
  }
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
  const models = row.model ? JSON.parse(row.model) : []
  logTaskProgress('AIConfig', 'config-by-id-selected', {
    configId: id,
    provider: row.provider,
    model: models[0] || '',
    serviceType: row.serviceType,
  })
  return {
    provider: row.provider || '',
    baseUrl: row.baseUrl,
    apiKey: row.apiKey,
    model: models[0] || '',
  }
}
