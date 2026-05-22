/**
 * Gemini 图片生成 Adapter
 * 认证: 同时兼容两种方式
 * 1. URL Query 参数 ?key=
 * 2. Header 认证（x-goog-api-key / Authorization: Bearer）
 * 请求: Google REST 风格的 contents[].parts[] 结构
 * 响应: base64 编码在 inlineData.data 中，无 URL
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationRecord,
  ImageGenResponse,
  ImagePollResponse,
} from './types'
import { joinProviderUrl } from './url'
import { parseDataUrl } from '../../utils/storage.js'

const DEFAULT_MODEL = 'gemini-3.1-flash-image-preview'
const RATIO_RE = /^(\d{1,2})\s*:\s*(\d{1,2})$/
const PIXEL_SIZE_RE = /^(\d{2,5})x(\d{2,5})$/i
const GEMINI_3_FLASH_IMAGE = 'gemini-3.1-flash-image-preview'
const GEMINI_3_PRO_IMAGE = 'gemini-3-pro-image-preview'
const GEMINI_25_FLASH_IMAGE = 'gemini-2.5-flash-image'
const FLASH_ASPECT_RATIOS = new Set(['1:1', '1:4', '1:8', '2:3', '3:2', '3:4', '4:1', '4:3', '4:5', '5:4', '8:1', '9:16', '16:9', '21:9'])
const PRO_ASPECT_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'])
const LEGACY_ASPECT_RATIOS = new Set(['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'])
const FLASH_IMAGE_SIZES = new Set(['512', '1K', '2K', '4K'])
const PRO_IMAGE_SIZES = new Set(['1K', '2K', '4K'])

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return undefined
}

function firstBoolean(...values: Array<unknown>): boolean | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return undefined
}

function cleanUndefined<T extends Record<string, any>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined || value[key] === null || value[key] === '') delete value[key]
  }
  return value
}

function parseReferenceImages(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    return refs.map(item => String(item || '').trim()).filter(Boolean).slice(0, 14)
  } catch {
    return []
  }
}

export class GeminiImageAdapter implements ImageProviderAdapter {
  provider = 'gemini'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const defaults = config.modelDefaults || {}
    const capabilities = config.modelCapabilities || {}
    // Gemini 模型名格式: "models/gemini-2.5-flash-image" 或直接 "gemini-2.5-flash-image"
    const modelName = record.model || config.model || DEFAULT_MODEL
    const model = modelName.startsWith('models/') ? modelName : `models/${modelName}`
    const bareModel = model.replace(/^models\//, '')

    // Google REST 风格请求体
    const parts: any[] = [{ text: record.prompt || 'Generate an image' }]
    const refs = parseReferenceImages(record.referenceImages)
    for (const ref of refs) {
      const parsed = parseDataUrl(ref)
      if (parsed) {
        parts.push({
          inline_data: {
            mime_type: parsed.mimeType,
            data: parsed.data,
          },
        })
      }
    }

    const imageConfig: Record<string, any> = {
      aspectRatio: this.normalizeAspectRatio(firstString(
        record.size,
        defaults.size,
        defaults.aspectRatio,
        defaults.aspect_ratio,
      ), bareModel),
    }
    const imageSize = this.normalizeImageSize(firstString(
      record.sampleImageSize,
      defaults.resolution,
      defaults.sampleImageSize,
      defaults.sample_image_size,
      defaults.imageSize,
      defaults.image_size,
    ), bareModel)
    if (imageSize) imageConfig.imageSize = imageSize

    const generationConfig: Record<string, any> = cleanUndefined({
      responseModalities: ['TEXT', 'IMAGE'],
      responseFormat: {
        image: imageConfig,
      },
    })
    const thinkingLevel = firstString(record.quality, defaults.thinking_level, defaults.thinkingLevel)
    if (thinkingLevel && bareModel === GEMINI_3_FLASH_IMAGE) {
      generationConfig.thinkingConfig = {
        thinkingLevel: thinkingLevel.toLowerCase() === 'high' ? 'High' : 'minimal',
        includeThoughts: Boolean(defaults.include_thoughts ?? defaults.includeThoughts ?? false),
      }
    }

    const body: Record<string, any> = {
      contents: [{ parts }],
      generationConfig,
    }

    const googleSearch = firstBoolean(
      record.googleSearch,
      defaults.google_search,
      defaults.googleSearch,
      capabilities.google_search,
      capabilities.googleSearch,
    )
    const googleImageSearch = firstBoolean(
      record.googleImageSearch,
      defaults.google_image_search,
      defaults.googleImageSearch,
      capabilities.google_image_search,
      capabilities.googleImageSearch,
    )
    if (googleSearch || googleImageSearch) {
      body.tools = [{ google_search: {} }]
    }

    if (record.tools) {
      try {
        const customTools = JSON.parse(record.tools)
        if (Array.isArray(customTools) && customTools.length) {
          body.tools = customTools
        }
      } catch {}
    }

    const url = new URL(joinProviderUrl(config.baseUrl, '/v1beta', `/${model}:generateContent`))
    url.searchParams.set('key', config.apiKey)

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-goog-api-key': config.apiKey,
    }
    try {
      const hostname = new URL(config.baseUrl).hostname
      if (!/(\.|^)googleapis\.com$/i.test(hostname)) {
        headers.Authorization = `Bearer ${config.apiKey}`
      }
    } catch {}

    return {
      url: url.toString(),
      method: 'POST',
      headers,
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const firstCandidate = result?.candidates?.[0]
    const finishReason = firstCandidate?.finishReason || firstCandidate?.finish_reason
    const finishMessage = firstCandidate?.finishMessage || firstCandidate?.finish_message

    if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
      throw new Error(finishMessage || `Gemini generation stopped: ${finishReason}`)
    }

    if (this.extractImageUrl(result)) {
      return { isAsync: false, imageUrl: this.extractImageUrl(result) || undefined }
    }

    if (this.extractImageBase64(result)) {
      return { isAsync: false, imageUrl: undefined }
    }

    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id }
    }

    if (result.error) {
      throw new Error(result.error.message || 'Gemini generation failed')
    }
    throw new Error('No image data in Gemini response')
  }

  parsePollResponse(result: any): ImagePollResponse {
    // Gemini 是同步的，通常不会走到这里
    return { status: 'completed' }
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    // Gemini 不需要轮询，但实现接口以保持一致
    const url = new URL(joinProviderUrl(config.baseUrl, '/v1beta', `/${taskId}`))
    url.searchParams.set('key', config.apiKey)
    return {
      url: url.toString(),
      method: 'GET',
      headers: {
        'x-goog-api-key': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  extractImageUrl(result: any): string | null {
    return result?.data?.[0]?.url
      || result?.image_url
      || result?.url
      || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    return this.extractImageBase64List(result)[0] || null
  }

  extractImageBase64List(result: any): Array<{ data: string; mimeType: string }> {
    const b64 = result?.data?.[0]?.b64_json
    if (b64) {
      return [{ data: b64, mimeType: 'image/png' }]
    }

    const parts = result.candidates?.[0]?.content?.parts || []
    const images: Array<{ data: string; mimeType: string }> = []
    for (const part of parts) {
      if (part.thought === true) continue
      if (part.inlineData || part.inline_data) {
        const inline = part.inlineData || part.inline_data
        if (!inline?.data) continue
        images.push({
          data: inline.data,
          mimeType: inline.mimeType || inline.mime_type || 'image/png',
        })
      }
    }
    return images
  }

  private normalizeAspectRatio(value: string | undefined, model: string): string {
    const ratio = this.toAspectRatio(value) || '1:1'
    const supported = model === GEMINI_3_FLASH_IMAGE
      ? FLASH_ASPECT_RATIOS
      : model === GEMINI_3_PRO_IMAGE
        ? PRO_ASPECT_RATIOS
        : LEGACY_ASPECT_RATIOS
    if (supported.has(ratio)) return ratio
    throw new Error(`Gemini Image aspectRatio 不支持: ${value}`)
  }

  private normalizeImageSize(value: string | undefined, model: string): string | undefined {
    if (model === GEMINI_25_FLASH_IMAGE) return undefined
    const normalized = this.toImageSize(value) || '1K'
    const supported = model === GEMINI_3_PRO_IMAGE ? PRO_IMAGE_SIZES : FLASH_IMAGE_SIZES
    if (supported.has(normalized)) return normalized
    throw new Error(`Gemini Image imageSize 不支持: ${value}`)
  }

  private toAspectRatio(value?: string): string | null {
    const raw = String(value || '').trim()
    if (!raw) return null
    const ratioMatch = raw.match(RATIO_RE)
    if (ratioMatch) return `${Number(ratioMatch[1])}:${Number(ratioMatch[2])}`
    const pixelMatch = raw.toLowerCase().match(PIXEL_SIZE_RE)
    if (!pixelMatch) return null
    const w = Number(pixelMatch[1])
    const h = Number(pixelMatch[2])
    if (!w || !h) return null
    const gcd = this.gcd(w, h)
    return `${w / gcd}:${h / gcd}`
  }

  private toImageSize(value?: string): string | null {
    const raw = String(value || '').trim()
    if (!raw) return null
    const lower = raw.toLowerCase()
    if (lower === '0.5k' || raw === '512') return '512'
    if (lower === '1k') return '1K'
    if (lower === '2k') return '2K'
    if (lower === '4k') return '4K'
    const pixelMatch = lower.match(PIXEL_SIZE_RE)
    if (!pixelMatch) return null
    const maxSide = Math.max(Number(pixelMatch[1]), Number(pixelMatch[2]))
    if (maxSide >= 4096) return '4K'
    if (maxSide >= 2048) return '2K'
    if (maxSide >= 1024) return '1K'
    return '512'
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b)
  }
}
