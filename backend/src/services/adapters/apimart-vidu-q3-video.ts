/**
 * APIMart Vidu Q3 video generation adapter.
 * This is different from the native Vidu adapter: APIMart uses Bearer auth and /v1/videos/generations.
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

const ALLOWED_MODELS = new Set(['viduq3-pro', 'viduq3-turbo'])
const ALLOWED_RESOLUTIONS = new Set(['540p', '720p', '1080p'])
const ALLOWED_ASPECT_RATIOS = new Set(['16:9', '9:16', '4:3', '3:4', '1:1'])

function normalizeModel(config: AIConfig, record: VideoGenerationRecord): string {
  const model = String(record.model || config.model || 'viduq3-pro').trim()
  return ALLOWED_MODELS.has(model) ? model : 'viduq3-pro'
}

function normalizeDuration(value?: number | null): number {
  const parsed = Math.round(Number(value || 5))
  if (!Number.isFinite(parsed)) return 5
  return Math.min(16, Math.max(1, parsed))
}

function normalizeResolution(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase()
  return ALLOWED_RESOLUTIONS.has(raw) ? raw : '720p'
}

function normalizeAspectRatio(value?: string | null): string {
  const raw = String(value || '').trim()
  return ALLOWED_ASPECT_RATIOS.has(raw) ? raw : '16:9'
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

export class ApimartViduQ3VideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const imageUrls = [
      record.firstFrameUrl || record.imageUrl || '',
      record.lastFrameUrl || '',
      ...parseStringArray(record.referenceImageUrls),
    ].map(item => String(item || '').trim()).filter(Boolean)
    const uniqueImageUrls = Array.from(new Set(imageUrls)).slice(0, 2)

    const body: any = {
      model: normalizeModel(config, record),
      prompt: record.prompt || '',
      duration: normalizeDuration(record.duration),
      resolution: normalizeResolution(record.resolution),
      audio: record.generateAudio ?? true,
    }

    if (uniqueImageUrls.length > 0) {
      body.image_urls = uniqueImageUrls
    } else if (record.aspectRatio) {
      body.aspect_ratio = normalizeAspectRatio(record.aspectRatio)
    }

    if (record.seed !== undefined && record.seed !== null) body.seed = record.seed

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

    throw new Error(result?.error?.message || 'No APIMart Vidu Q3 task_id in video generation response')
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
