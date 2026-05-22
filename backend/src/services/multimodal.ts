import { getConfigForModelAsync, getTextConfigAsync, getTextProviderBaseUrl, type AIConfig } from './ai.js'
import { joinProviderUrl } from './adapters/url.js'
import { logTaskPayload, logTaskProgress } from '../utils/task-logger.js'

export type MultimodalAssetType = 'image' | 'pdf' | 'audio' | 'video' | 'file'

export interface MultimodalAsset {
  type?: MultimodalAssetType | string
  url?: string
  data?: string
  mimeType?: string
  mime_type?: string
  filename?: string
  format?: string
}

export interface MultimodalAnalyzeParams {
  model?: string
  prompt: string
  assets?: MultimodalAsset[]
  messages?: any[]
  tools?: any[]
  toolChoice?: any
  systemPrompt?: string
  cachedContext?: string | Array<string | Record<string, any>>
  cacheControl?: Record<string, any> | boolean
  reasoningEffort?: string
  reasoning?: Record<string, any>
  maxCompletionTokens?: number
  thinking?: Record<string, any>
  thinkingConfig?: Record<string, any>
  webSearch?: boolean
  webSearchOptions?: Record<string, any>
  userLocation?: Record<string, any>
  searchContextSize?: 'low' | 'medium' | 'high' | string
  context1m?: boolean
  headers?: Record<string, string>
  betas?: string[]
  configId?: number | null
  userProviderId?: number | null
  userId?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
}

function normalizeMimeType(asset: MultimodalAsset) {
  const explicit = String(asset.mimeType || asset.mime_type || '').trim()
  if (explicit) return explicit
  const type = String(asset.type || '').toLowerCase()
  const filename = String(asset.filename || asset.url || '').toLowerCase()
  if (type === 'pdf' || filename.endsWith('.pdf')) return 'application/pdf'
  if (type === 'audio' || /\.(mp3|wav|aac|ogg|flac|aiff)$/i.test(filename)) return filename.endsWith('.wav') ? 'audio/wav' : 'audio/mp3'
  if (type === 'video' || /\.(mp4|mov|avi|mkv|webm)$/i.test(filename)) return 'video/mp4'
  if (filename.endsWith('.webp')) return 'image/webp'
  if (filename.endsWith('.png')) return 'image/png'
  return 'image/jpeg'
}

function dataOrUrl(asset: MultimodalAsset) {
  return String(asset.url || asset.data || '').trim()
}

function audioFormat(asset: MultimodalAsset) {
  const explicit = String(asset.format || '').trim()
  if (explicit) return explicit
  const mime = normalizeMimeType(asset)
  const [, subtype = 'mp3'] = mime.split('/')
  return subtype === 'mpeg' ? 'mp3' : subtype
}

function buildOpenAIChatContent(prompt: string, assets: MultimodalAsset[]) {
  const content: any[] = [{ type: 'text', text: prompt }]
  for (const asset of assets) {
    const type = String(asset.type || '').toLowerCase()
    const value = dataOrUrl(asset)
    if (!value) continue
    if (type === 'audio') {
      const data = value.startsWith('data:') ? value.split(',').pop() || value : value
      content.push({
        type: 'input_audio',
        input_audio: {
          data,
          format: audioFormat(asset),
        },
      })
      continue
    }
    if (type === 'pdf' || type === 'video' || type === 'file' || normalizeMimeType(asset) === 'application/pdf') {
      content.push({
        type: 'file',
        file: {
          filename: asset.filename || (type === 'video' ? 'video.mp4' : 'file'),
          file_data: value,
        },
      })
      continue
    }
    content.push({
      type: 'image_url',
      image_url: { url: value },
    })
  }
  return content
}

function normalizeCacheControl(value: MultimodalAnalyzeParams['cacheControl']) {
  if (value === false || value === null) return undefined
  if (value && typeof value === 'object') return value
  return { type: 'ephemeral' }
}

function textPart(text: string, cacheControl?: Record<string, any>) {
  return {
    type: 'text',
    text,
    ...(cacheControl ? { cache_control: cacheControl } : {}),
  }
}

function normalizeCachedContext(value: MultimodalAnalyzeParams['cachedContext'], cacheControl?: Record<string, any>) {
  if (!value) return []
  const items = Array.isArray(value) ? value : [value]
  return items
    .map((item, index) => {
      const isLast = index === items.length - 1
      if (typeof item === 'string') return textPart(item, isLast ? cacheControl : undefined)
      if (item && typeof item === 'object') {
        return {
          type: 'text',
          ...item,
          ...(isLast && cacheControl && !(item as any).cache_control ? { cache_control: cacheControl } : {}),
        }
      }
      return null
    })
    .filter(Boolean)
}

function buildMessages(params: MultimodalAnalyzeParams) {
  const cacheControl = normalizeCacheControl(params.cacheControl)
  if (Array.isArray(params.messages) && params.messages.length > 0) {
    const messages = [...params.messages]
    const systemContent = [
      ...(params.systemPrompt ? [textPart(params.systemPrompt)] : []),
      ...normalizeCachedContext(params.cachedContext, cacheControl),
    ]
    if (systemContent.length > 0 && !messages.some(message => message.role === 'system')) {
      messages.unshift({
        role: 'system',
        content: systemContent,
      })
    }
    return messages
  }

  const messages: any[] = []
  const systemContent = [
    ...(params.systemPrompt ? [textPart(params.systemPrompt)] : []),
    ...normalizeCachedContext(params.cachedContext, cacheControl),
  ]
  if (systemContent.length > 0) {
    messages.push({
      role: 'system',
      content: systemContent,
    })
  }
  messages.push({
    role: 'user',
    content: buildOpenAIChatContent(params.prompt, params.assets || []),
  })
  return messages
}

function extractChatText(payload: any) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((item) => typeof item === 'string' ? item : item?.text || item?.content || '')
      .filter(Boolean)
      .join('\n')
  }
  return ''
}

function extractReasoning(payload: any) {
  const message = payload?.choices?.[0]?.message
  return message?.reasoning || message?.reasoning_content || message?.thinking || null
}

function extractAnnotations(payload: any) {
  const message = payload?.choices?.[0]?.message
  return Array.isArray(message?.annotations) ? message.annotations : []
}

function extractCitations(payload: any) {
  return extractAnnotations(payload)
    .filter((annotation: any) => annotation?.type === 'url_citation' && annotation?.url_citation)
    .map((annotation: any) => ({
      title: annotation.url_citation.title || '',
      url: annotation.url_citation.url || '',
      startIndex: annotation.url_citation.start_index ?? annotation.url_citation.startIndex ?? null,
      endIndex: annotation.url_citation.end_index ?? annotation.url_citation.endIndex ?? null,
    }))
}

function extractToolCalls(payload: any) {
  const toolCalls = payload?.choices?.[0]?.message?.tool_calls
  return Array.isArray(toolCalls) ? toolCalls : []
}

function extractFinishReason(payload: any) {
  return payload?.choices?.[0]?.finish_reason || null
}

function buildWebSearchOptions(params: MultimodalAnalyzeParams) {
  if (params.webSearchOptions) return params.webSearchOptions
  if (!params.webSearch) return undefined
  return {
    search_context_size: params.searchContextSize || 'medium',
    ...(params.userLocation ? {
      user_location: {
        type: 'approximate',
        ...params.userLocation,
      },
    } : {}),
  }
}

async function resolveTextConfig(params: MultimodalAnalyzeParams): Promise<AIConfig> {
  if (params.model) return await getConfigForModelAsync('text', params.model, params.configId, params.userId, params.userProviderId) || await getTextConfigAsync()
  return params.configId ? (await getConfigForModelAsync('text', null, params.configId, params.userId, params.userProviderId) || await getTextConfigAsync()) : await getTextConfigAsync()
}

function buildRequestHeaders(config: AIConfig, params: MultimodalAnalyzeParams) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.apiKey}`,
    ...(params.headers || {}),
  }
  const customBetaHeader = Object.entries(headers).find(([key]) => key.toLowerCase() === 'anthropic-beta')
  if (customBetaHeader && customBetaHeader[0] !== 'anthropic-beta') {
    delete headers[customBetaHeader[0]]
  }
  const betaValues = [
    ...(params.context1m ? ['context-1m-2025-08-07'] : []),
    ...(Array.isArray(params.betas) ? params.betas : []),
    ...(customBetaHeader ? String(customBetaHeader[1]).split(',').map(item => item.trim()).filter(Boolean) : []),
  ]
  if (betaValues.length > 0) {
    headers['anthropic-beta'] = Array.from(new Set(betaValues)).join(',')
  }
  return headers
}

async function buildChatCompletionRequest(params: MultimodalAnalyzeParams, stream: boolean) {
  const config = await resolveTextConfig(params)
  const model = params.model || config.model
  const baseUrl = getTextProviderBaseUrl(config)
  const url = joinProviderUrl(baseUrl, '/v1', '/chat/completions')
  const body = {
    model,
    stream,
    messages: buildMessages(params),
    ...(params.tools ? { tools: params.tools } : {}),
    ...(params.toolChoice ? { tool_choice: params.toolChoice } : {}),
    max_tokens: params.maxTokens || config.modelDefaults?.max_tokens || config.modelDefaults?.maxTokens || 2048,
    ...(params.maxCompletionTokens ? { max_completion_tokens: params.maxCompletionTokens } : {}),
    ...(params.reasoningEffort ? { reasoning_effort: params.reasoningEffort } : {}),
    ...(params.reasoning ? { reasoning: params.reasoning } : {}),
    ...(params.thinking ? { thinking: params.thinking } : {}),
    ...(params.thinkingConfig ? { thinking_config: params.thinkingConfig } : {}),
    ...(buildWebSearchOptions(params) ? { web_search_options: buildWebSearchOptions(params) } : {}),
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
  }
  logTaskProgress('Multimodal', 'request', {
    provider: config.provider,
    model,
    assetCount: params.assets?.length || 0,
    stream,
    context1m: Boolean(params.context1m),
  })
  logTaskPayload('Multimodal', 'request payload', {
    url,
    body: {
      ...body,
      messages: body.messages.map(message => ({
        ...message,
        content: Array.isArray(message.content)
          ? message.content.map((part: any) => part.type === 'text' ? part : { type: part.type })
          : message.content,
      })),
      tools: body.tools ? '[redacted-tools]' : undefined,
    },
  })
  return { config, model, url, body, headers: buildRequestHeaders(config, params) }
}

export async function analyzeMultimodal(params: MultimodalAnalyzeParams) {
  const { config, model, url, body, headers } = await buildChatCompletionRequest(params, false)
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  })
  const text = await response.text()
  const payload = text ? JSON.parse(text) : {}
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Multimodal API error ${response.status}: ${text}`)
  }
  return {
    provider: config.provider,
    model,
    text: extractChatText(payload),
    reasoning: extractReasoning(payload),
    finishReason: extractFinishReason(payload),
    toolCalls: extractToolCalls(payload),
    toolCallRequired: extractFinishReason(payload) === 'tool_calls' || extractToolCalls(payload).length > 0,
    annotations: extractAnnotations(payload),
    citations: extractCitations(payload),
    raw: payload,
  }
}

export async function streamMultimodal(params: MultimodalAnalyzeParams) {
  const { url, body, headers } = await buildChatCompletionRequest(params, true)
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(300_000),
  })
  if (!response.ok) {
    const text = await response.text()
    let message = text
    try {
      const payload = JSON.parse(text)
      message = payload?.error?.message || text
    } catch {}
    throw new Error(`Multimodal stream API error ${response.status}: ${message}`)
  }
  if (!response.body) throw new Error('Multimodal stream response body is empty')
  return response
}
