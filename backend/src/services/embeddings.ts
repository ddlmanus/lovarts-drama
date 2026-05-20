import { getActiveConfig, getConfigForModel, getTextConfig, getTextProviderBaseUrl, type AIConfig } from './ai.js'
import { joinProviderUrl } from './adapters/url.js'
import { logTaskPayload, logTaskProgress } from '../utils/task-logger.js'

export interface CreateEmbeddingParams {
  model?: string
  input: string | string[]
  dimensions?: number
  encodingFormat?: string
  user?: string
  userId?: string
  configId?: number | null
}

function resolveEmbeddingConfig(params: CreateEmbeddingParams): AIConfig {
  if (params.model) {
    const modelConfig = getConfigForModel('embedding', params.model, params.configId, params.userId)
    if (modelConfig) return modelConfig
  }
  const active = params.configId
    ? getConfigForModel('embedding', null, params.configId, params.userId)
    : getActiveConfig('embedding')
  if (active) return params.model ? { ...active, model: params.model } : active

  const textConfig = params.model
    ? getConfigForModel('text', params.model, params.configId, params.userId) || getTextConfig()
    : getTextConfig()
  return {
    ...textConfig,
    model: params.model || 'openai/text-embedding-3-small',
  }
}

export async function createEmbedding(params: CreateEmbeddingParams) {
  const config = resolveEmbeddingConfig(params)
  const baseUrl = getTextProviderBaseUrl(config)
  const url = joinProviderUrl(baseUrl, '/v1', '/embeddings')
  const body = {
    model: params.model || config.model || 'openai/text-embedding-3-small',
    input: params.input,
    ...(params.dimensions ? { dimensions: params.dimensions } : {}),
    ...(params.encodingFormat ? { encoding_format: params.encodingFormat } : {}),
    ...(params.user ? { user: params.user } : {}),
  }

  logTaskProgress('Embeddings', 'request', {
    provider: config.provider,
    model: body.model,
    inputCount: Array.isArray(params.input) ? params.input.length : 1,
    dimensions: params.dimensions,
  })
  logTaskPayload('Embeddings', 'request payload', {
    url,
    body: {
      ...body,
      input: Array.isArray(params.input) ? `[${params.input.length} items]` : '[text]',
    },
  })

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Embeddings API error ${response.status}: ${text}`)
  }

  return {
    provider: config.provider,
    model: body.model,
    dimensions: Array.isArray(payload?.data) ? payload.data.map((item: any) => item?.embedding?.length || 0) : [],
    raw: payload,
  }
}
