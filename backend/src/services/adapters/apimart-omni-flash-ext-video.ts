/**
 * APIMart Omni-Flash-Ext video generation adapter.
 * Keeps Omni-Flash-Ext on its own APIMart request protocol.
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

const MODEL_ID = 'Omni-Flash-Ext'
const ALLOWED_DURATIONS = new Set([4, 6, 8, 10])
const ALLOWED_RESOLUTIONS = new Set(['720p', '1080p', '4k'])

function normalizeDuration(value?: number | null): number {
  const parsed = Math.round(Number(value || 6))
  return ALLOWED_DURATIONS.has(parsed) ? parsed : 6
}

function normalizeResolution(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase()
  return ALLOWED_RESOLUTIONS.has(raw) ? raw : '720p'
}

function normalizeAspectRatio(value?: string | null): string {
  const raw = String(value || '').trim()
  return raw || '16:9'
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

function buildImageUrls(record: VideoGenerationRecord): string[] {
  const imageUrls = [
    record.firstFrameUrl || record.imageUrl || '',
    record.lastFrameUrl || '',
    ...parseStringArray(record.referenceImageUrls),
  ].map(item => String(item || '').trim()).filter(Boolean)

  const uniqueImageUrls = Array.from(new Set(imageUrls))
  if (uniqueImageUrls.length === 0 || uniqueImageUrls.length === 1 || uniqueImageUrls.length === 3) {
    return uniqueImageUrls
  }

  throw new Error('Omni-Flash-Ext supports exactly 0, 1, or 3 image_urls')
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

export class ApimartOmniFlashExtVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const aspectRatio = normalizeAspectRatio(record.aspectRatio)
    const imageUrls = buildImageUrls(record)
    const body: any = {
      model: MODEL_ID,
      prompt: record.prompt || '',
      duration: normalizeDuration(record.duration),
      resolution: normalizeResolution(record.resolution),
      aspect_ratio: aspectRatio,
      size: aspectRatio,
    }

    if (imageUrls.length > 0) body.image_urls = imageUrls

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

    throw new Error(result?.error?.message || 'No APIMart Omni-Flash-Ext task_id in video generation response')
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
