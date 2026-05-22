/**
 * APIMart Grok Imagine 1.0 video generation adapter.
 * Uses Grok's size/quality/image_urls protocol, separated by model/protocol.
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'
import { joinProviderUrl } from './url'

const MODEL_ID = 'grok-imagine-1.0-video-apimart'
const ALLOWED_SIZES = new Set(['16:9', '9:16', '1:1', '3:2', '2:3'])
const ALLOWED_QUALITIES = new Set(['480p', '720p'])

function normalizeSize(value?: string | null): string {
  const raw = String(value || '').trim()
  return ALLOWED_SIZES.has(raw) ? raw : '16:9'
}

function normalizeDuration(value?: number | null): number {
  const parsed = Math.round(Number(value || 6))
  if (!Number.isFinite(parsed)) return 6
  return Math.min(30, Math.max(6, parsed))
}

function normalizeQuality(record: VideoGenerationRecord): string {
  const raw = String(record.quality || record.resolution || '').trim().toLowerCase()
  return ALLOWED_QUALITIES.has(raw) ? raw : '480p'
}

function parseStringArray(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(item => String(item || '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

function unwrapData(result: any) {
  return result?.data ?? result
}

function extractTaskId(result: any): string | null {
  const data = result?.data
  const item = Array.isArray(data) ? data[0] : data
  return item?.task_id || item?.id || result?.task_id || result?.id || null
}

function extractVideoUrl(result: any): string | null {
  const data = unwrapData(result)
  const videos = data?.result?.videos || result?.result?.videos
  const first = Array.isArray(videos) ? videos[0] : null
  const rawUrl = first?.url || first?.video_url || data?.result?.video_url || data?.video_url || result?.video_url
  if (Array.isArray(rawUrl)) return rawUrl[0] || null
  return typeof rawUrl === 'string' ? rawUrl : null
}

export class ApimartGrokImagineVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const imageUrls = [
      record.firstFrameUrl || record.imageUrl || '',
      ...parseStringArray(record.referenceImageUrls),
    ].map(item => String(item || '').trim()).filter(Boolean)

    const body: any = {
      model: record.model || config.model || MODEL_ID,
      prompt: record.prompt || '',
      size: normalizeSize(record.aspectRatio),
      duration: normalizeDuration(record.duration),
      quality: normalizeQuality(record),
    }

    if (imageUrls.length > 0) body.image_urls = Array.from(new Set(imageUrls)).slice(0, 7)

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', '/videos/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const taskId = extractTaskId(result)
    if (taskId) return { isAsync: true, taskId }

    const videoUrl = extractVideoUrl(result)
    if (videoUrl) return { isAsync: false, videoUrl }

    throw new Error(result?.error?.message || 'No APIMart Grok Imagine task id in video generation response')
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

  parsePollResponse(result: any): VideoPollResponse {
    const data = unwrapData(result)
    const status = String(data?.status || result?.status || '').toLowerCase()

    if (['completed', 'succeeded', 'success'].includes(status)) {
      return {
        status: 'completed',
        videoUrl: extractVideoUrl(result) || undefined,
      }
    }

    if (['failed', 'fail', 'error'].includes(status)) {
      return {
        status: 'failed',
        error: data?.error?.message || result?.error?.message || 'Video generation failed',
      }
    }

    if (status === 'submitted' || status === 'pending') return { status: 'pending' }
    return { status: 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return extractVideoUrl(result)
  }
}
