/**
 * ZenMux image generation adapter.
 * Endpoint: /api/v1/images/generations
 * Response format: { data: [{ b64_json: "..." }] } or { data: [{ url: "..." }] }
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

function normalizeSize(size?: string | null): string {
  const value = String(size || '').trim().toLowerCase()
  if (value === 'auto') return value
  const match = value.match(/^(\d+)x(\d+)$/)
  if (match) {
    const width = Number(match[1])
    const height = Number(match[2])
    const ratio = width / height
    if (width % 16 === 0 && height % 16 === 0 && ratio >= 1 / 3 && ratio <= 3) {
      return value
    }
  }
  return '1024x1024'
}

function extractB64(result: any): string | null {
  return result?.data?.[0]?.b64_json || result?.b64_json || null
}

function parseReferenceImages(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    return refs.map(item => String(item || '').trim()).filter(Boolean).slice(0, 16)
  } catch {
    return []
  }
}

export class ZenMuxImageAdapter implements ImageProviderAdapter {
  provider = 'zenmux'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const referenceImages = parseReferenceImages(record.referenceImages)
    const body = {
      model: record.model || config.model || DEFAULT_MODEL,
      prompt: record.prompt,
      n: 1,
      size: normalizeSize(record.size),
      ...(referenceImages.length > 0
        ? { images: referenceImages.map(imageUrl => ({ image_url: imageUrl })) }
        : {}),
    }

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', referenceImages.length > 0 ? '/images/edits' : '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const taskId = result?.task_id || result?.id
    if (taskId) return { isAsync: true, taskId }

    const imageUrl = result?.data?.[0]?.url || result?.url
    if (imageUrl) return { isAsync: false, imageUrl }

    if (extractB64(result)) return { isAsync: false, imageUrl: undefined }

    throw new Error(result?.error?.message || 'No ZenMux image data in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v1', `/images/generations/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const status = result?.status
    const imageUrl = result?.data?.[0]?.url || result?.url

    if (status === 'completed' || status === 'succeeded') {
      return { status: 'completed', imageUrl }
    }
    if (status === 'failed') {
      return { status: 'failed', error: result?.error?.message || 'Generation failed' }
    }
    return { status: status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result?.data?.[0]?.url || result?.url || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const b64 = extractB64(result)
    return b64 ? { data: b64, mimeType: 'image/png' } : null
  }
}
