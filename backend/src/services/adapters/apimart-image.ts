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
const RATIO_BY_PIXELS: Record<string, string> = {
  '1920x1080': '16:9',
  '1080x1920': '9:16',
  '1024x1024': '1:1',
  '2048x2048': '1:1',
  '1280x720': '16:9',
  '720x1280': '9:16',
  '1536x1024': '3:2',
  '1024x1536': '2:3',
  '1024x768': '4:3',
  '768x1024': '3:4',
}

function normalizeSize(size?: string | null): string {
  const value = String(size || '').trim()
  if (!value) return '16:9'
  if (value === 'auto' || value.includes(':')) return value
  return RATIO_BY_PIXELS[value.toLowerCase()] || value
}

function normalizeResolution(model: string): string {
  return model === 'gpt-image-2' ? '2k' : '2K'
}

function parseReferenceImages(raw?: string | null, model?: string): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    const maxRefs = model === 'gpt-image-2' ? 16 : 14
    return refs.map(item => String(item || '').trim()).filter(Boolean).slice(0, maxRefs)
  } catch {
    return []
  }
}

function unwrapData(result: any) {
  return result?.data ?? result
}

function extractApimartImageUrl(result: any): string | null {
  const data = unwrapData(result)
  const images = data?.result?.images || result?.result?.images
  const firstUrl = images?.[0]?.url
  if (Array.isArray(firstUrl)) return firstUrl[0] || null
  if (typeof firstUrl === 'string') return firstUrl
  return null
}

export class ApimartImageAdapter implements ImageProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const model = record.model || config.model || DEFAULT_MODEL
    const body: any = {
      model,
      prompt: record.prompt,
      n: 1,
      size: normalizeSize(record.size),
      resolution: normalizeResolution(model),
    }

    const referenceImages = parseReferenceImages(record.referenceImages, model)
    if (referenceImages.length > 0) body.image_urls = referenceImages

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

    throw new Error(result?.error?.message || 'No APIMart task_id in image generation response')
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

  extractImageBase64(): { data: string; mimeType: string } | null {
    return null
  }
}
