/**
 * APIMart image generation adapter.
 * Endpoint: /v1/images/generations
 * Async response: { code: 200, data: [{ status: "submitted", task_id: "..." }] }
 * Polling: GET /v1/tasks/{task_id}
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

const DEFAULT_MODEL = 'gpt-image-2'
const OFFICIAL_MODEL = 'gpt-image-2-official'
const GPT_IMAGE_MODELS = new Set(['gpt-image-2', OFFICIAL_MODEL])
const GEMINI_FLASH_IMAGE_MODELS = new Set(['gemini-3.1-flash-image-preview', 'gemini-3.1-flash-image-preview-official'])
const GEMINI_PRO_IMAGE_MODELS = new Set(['gemini-3-pro-image-preview', 'gemini-3-pro-image-preview-official'])
const GEMINI_IMAGE_MODELS = new Set([...GEMINI_FLASH_IMAGE_MODELS, ...GEMINI_PRO_IMAGE_MODELS])
const GPT_IMAGE_SIZES = new Set([
  'auto',
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '5:4',
  '4:5',
  '16:9',
  '9:16',
  '2:1',
  '1:2',
  '3:1',
  '1:3',
  '21:9',
  '9:21',
])
const GEMINI_IMAGE_SIZES = new Set([
  '1:1',
  '3:2',
  '2:3',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '5:4',
  '4:5',
  '21:9',
  '1:4',
  '4:1',
  '1:8',
  '8:1',
])
const GEMINI_PRO_IMAGE_SIZES = new Set([
  '1:1',
  '2:3',
  '3:2',
  '3:4',
  '4:3',
  '4:5',
  '5:4',
  '9:16',
  '16:9',
  '21:9',
])
const GPT_IMAGE_RESOLUTIONS = new Set(['1k', '2k', '4k'])
const GEMINI_FLASH_IMAGE_RESOLUTIONS = new Set(['0.5k', '1k', '2k', '4k'])
const GEMINI_PRO_IMAGE_RESOLUTIONS = new Set(['1k', '2k', '4k'])
const SUPPORTED_QUALITIES = new Set(['auto', 'low', 'medium', 'high'])
const SUPPORTED_BACKGROUNDS = new Set(['auto', 'opaque', 'transparent'])
const SUPPORTED_MODERATIONS = new Set(['auto', 'low'])
const SUPPORTED_OUTPUT_FORMATS = new Set(['png', 'jpeg', 'webp'])
const PIXEL_SIZE_RE = /^\d{2,5}x\d{2,5}$/i

function isGeminiImageModel(model: string) {
  return GEMINI_IMAGE_MODELS.has(model)
}

function isGeminiProImageModel(model: string) {
  return GEMINI_PRO_IMAGE_MODELS.has(model)
}

function normalizeSize(size: string | null | undefined, model: string): string {
  const value = String(size || '').trim().toLowerCase()
  if (!value) return '1:1'
  const supported = isGeminiProImageModel(model) ? GEMINI_PRO_IMAGE_SIZES : isGeminiImageModel(model) ? GEMINI_IMAGE_SIZES : GPT_IMAGE_SIZES
  if (supported.has(value) || (!isGeminiImageModel(model) && PIXEL_SIZE_RE.test(value))) return value
  throw new Error(`APIMart ${model} size 不支持: ${size}`)
}

function normalizeResolution(value: string | null | undefined, model: string): string {
  const normalized = String(value || '').trim().toLowerCase()
  const supported = isGeminiProImageModel(model) ? GEMINI_PRO_IMAGE_RESOLUTIONS : isGeminiImageModel(model) ? GEMINI_FLASH_IMAGE_RESOLUTIONS : GPT_IMAGE_RESOLUTIONS
  if (!normalized) return isGeminiImageModel(model) ? '1K' : '1k'
  if (supported.has(normalized)) return isGeminiImageModel(model) ? normalized.toUpperCase() : normalized
  throw new Error(`APIMart ${model} resolution 不支持: ${value}`)
}

function isOfficialModel(model: string) {
  return model === OFFICIAL_MODEL || model === 'gemini-3.1-flash-image-preview-official' || model === 'gemini-3-pro-image-preview-official'
}

function normalizeEnum(value: unknown, supported: Set<string>, field: string, defaultValue?: string): string | undefined {
  const normalized = String(value ?? '').trim().toLowerCase()
  if (!normalized) return defaultValue
  if (supported.has(normalized)) return normalized
  throw new Error(`APIMart GPT-Image-2 ${field} 不支持: ${value}`)
}

function normalizeCompression(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`APIMart GPT-Image-2 output_compression 必须是 0-100 的整数: ${value}`)
  return Math.max(0, Math.min(100, Math.floor(parsed)))
}

function normalizeCount(value: unknown, model: string): number {
  if (!isOfficialModel(model) && !isGeminiImageModel(model)) return 1
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  return Math.max(1, Math.min(4, Math.floor(parsed)))
}

function parseReferenceImages(raw?: string | null, model?: string): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    const maxRefs = GPT_IMAGE_MODELS.has(String(model)) ? 16 : 14
    const normalized = refs.map(item => String(item || '').trim()).filter(Boolean)
    if (normalized.length > maxRefs) throw new Error(`APIMart GPT-Image-2 image_urls exceeds max ${maxRefs}`)
    return normalized
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('APIMart GPT-Image-2')) throw error
    throw new Error('APIMart GPT-Image-2 image_urls 必须是字符串数组')
  }
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  const text = String(value).trim().toLowerCase()
  if (text === 'true') return true
  if (text === 'false') return false
  return undefined
}

function unwrapData(result: any) {
  return result?.data ?? result
}

function extractApimartImageUrl(result: any): string | null {
  return extractApimartImageUrls(result)[0] || null
}

function extractApimartImageUrls(result: any): string[] {
  const data = unwrapData(result)
  const images = data?.result?.images || result?.result?.images
  if (!Array.isArray(images)) return []
  return images.flatMap((image: any) => {
    if (Array.isArray(image?.url)) return image.url
    if (typeof image?.url === 'string') return [image.url]
    return []
  }).filter(Boolean)
}

export class ApimartImageAdapter implements ImageProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const model = record.model || config.model || DEFAULT_MODEL
    const body: any = {
      model,
      prompt: record.prompt,
      n: normalizeCount(record.numberOfImages ?? config.modelDefaults?.n ?? config.modelDefaults?.number_of_images ?? config.modelDefaults?.numberOfImages, model),
      size: normalizeSize(record.size, model),
      resolution: normalizeResolution(record.sampleImageSize || config.modelDefaults?.resolution || config.modelDefaults?.sample_image_size, model),
    }

    const referenceImages = parseReferenceImages(record.referenceImages, model)
    if (referenceImages.length > 0) body.image_urls = referenceImages
    if (model === OFFICIAL_MODEL) {
      body.quality = normalizeEnum(record.quality ?? config.modelDefaults?.quality, SUPPORTED_QUALITIES, 'quality', 'auto')
      body.output_format = normalizeEnum(record.outputFormat ?? config.modelDefaults?.output_format ?? config.modelDefaults?.outputFormat, SUPPORTED_OUTPUT_FORMATS, 'output_format', 'png')
      const background = normalizeEnum(record.background ?? config.modelDefaults?.background, SUPPORTED_BACKGROUNDS, 'background')
      if (background) body.background = background
      const moderation = normalizeEnum(record.moderation ?? config.modelDefaults?.moderation, SUPPORTED_MODERATIONS, 'moderation')
      if (moderation) body.moderation = moderation
      const compression = normalizeCompression(record.outputCompression ?? config.modelDefaults?.output_compression ?? config.modelDefaults?.outputCompression)
      if (compression !== undefined) body.output_compression = compression
      if (record.mask) body.mask_url = record.mask
    } else if (!isGeminiImageModel(model)) {
      const officialFallback = normalizeBoolean(record.officialFallback ?? config.modelDefaults?.official_fallback ?? config.modelDefaults?.officialFallback)
      if (officialFallback !== undefined) body.official_fallback = officialFallback
    }
    if (isGeminiImageModel(model)) {
      const googleSearch = normalizeBoolean(record.googleSearch ?? config.modelDefaults?.google_search ?? config.modelDefaults?.googleSearch)
      const googleImageSearch = normalizeBoolean(record.googleImageSearch ?? config.modelDefaults?.google_image_search ?? config.modelDefaults?.googleImageSearch)
      if (googleSearch !== undefined) body.google_search = googleSearch
      if (googleImageSearch !== undefined) body.google_image_search = googleImageSearch
      if (!isOfficialModel(model)) {
        const officialFallback = normalizeBoolean(record.officialFallback ?? config.modelDefaults?.official_fallback ?? config.modelDefaults?.officialFallback)
        if (officialFallback !== undefined) body.official_fallback = officialFallback
      }
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const item = Array.isArray(result?.data) ? result.data[0] : result?.data
    const taskId = item?.task_id || result?.task_id || result?.id
    if (taskId) return { isAsync: true, taskId }

    const imageUrl = extractApimartImageUrl(result)
    if (imageUrl) return { isAsync: false, imageUrl }

    throw new Error(result?.error?.message || `No APIMart task_id in image generation response: ${JSON.stringify(result)}`)
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const data = unwrapData(result)
    const status = data?.status || result?.status

    if (status === 'completed') {
      return {
        status: 'completed',
        imageUrl: extractApimartImageUrl(result) || undefined,
      }
    }

    if (status === 'failed') {
      return {
        status: 'failed',
        error: data?.error?.message || result?.error?.message || 'Generation failed',
      }
    }

    if (status === 'submitted') return { status: 'pending' }
    return { status: 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return extractApimartImageUrl(result)
  }

  extractImageUrls(result: any): string[] {
    return extractApimartImageUrls(result)
  }

  extractImageBase64(): { data: string; mimeType: string } | null {
    return null
  }
}
