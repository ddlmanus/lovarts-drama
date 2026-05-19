/**
 * APIMart doubao-seedance-2.0 video generation adapter.
 * Endpoint: /v1/videos/generations
 * Async response: { code: 200, data: [{ status: "submitted", task_id: "..." }] }
 * Polling: GET /v1/tasks/{task_id}
 */
import type {
  VideoProviderAdapter,
  ProviderRequest,
  AIConfig,
  VideoGenerationRecord,
  VideoGenResponse,
  VideoPollResponse,
} from './types'
import { joinProviderUrl } from './url'

const DEFAULT_MODEL = 'doubao-seedance-2.0'

function normalizeDuration(duration?: number | null): number {
  const parsed = Math.round(Number(duration || 5))
  if (!Number.isFinite(parsed)) return 5
  return Math.min(15, Math.max(4, parsed))
}

function normalizeSize(aspectRatio?: string | null): string {
  const value = String(aspectRatio || '').trim()
  if (!value) return '16:9'
  const allowed = new Set(['16:9', '9:16', '1:1', '4:3', '3:4', '21:9', 'adaptive'])
  return allowed.has(value) ? value : '16:9'
}

function parseReferenceImages(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    return refs.map(item => String(item || '').trim()).filter(Boolean).slice(0, 9)
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
  return item?.task_id || result?.task_id || result?.id || null
}

function extractVideoUrl(result: any): string | null {
  const data = unwrapData(result)
  const videos = data?.result?.videos || result?.result?.videos
  const first = videos?.[0]
  const rawUrl = first?.url || first?.video_url || data?.result?.video_url || data?.video_url || result?.video_url

  if (Array.isArray(rawUrl)) return rawUrl[0] || null
  if (typeof rawUrl === 'string') return rawUrl
  return null
}

export class ApimartVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const body: any = {
      model: record.model || config.model || DEFAULT_MODEL,
      prompt: record.prompt || '',
      resolution: '720p',
      size: normalizeSize(record.aspectRatio),
      duration: normalizeDuration(record.duration),
      generate_audio: true,
    }

    if (record.referenceMode === 'single' && record.imageUrl) {
      body.image_urls = [record.imageUrl]
    } else if (record.referenceMode === 'first_last') {
      const imageWithRoles: Array<{ url: string; role: string }> = []
      if (record.firstFrameUrl) imageWithRoles.push({ url: record.firstFrameUrl, role: 'first_frame' })
      if (record.lastFrameUrl) imageWithRoles.push({ url: record.lastFrameUrl, role: 'last_frame' })
      if (imageWithRoles.length > 0) body.image_with_roles = imageWithRoles
    } else if (record.referenceMode === 'multiple') {
      const refs = parseReferenceImages(record.referenceImageUrls)
      if (refs.length > 0) body.image_urls = refs
    }

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

    throw new Error(result?.error?.message || 'No APIMart task_id in video generation response')
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
    const status = data?.status || result?.status

    if (status === 'completed') {
      return {
        status: 'completed',
        videoUrl: extractVideoUrl(result) || undefined,
      }
    }

    if (status === 'failed') {
      return {
        status: 'failed',
        error: data?.error?.message || result?.error?.message || 'Video generation failed',
      }
    }

    if (status === 'submitted') return { status: 'pending' }
    return { status: 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return extractVideoUrl(result)
  }
}
