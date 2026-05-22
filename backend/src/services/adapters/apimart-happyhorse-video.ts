/**
 * APIMart HappyHorse 1.0 video generation adapter.
 * This model has its own request protocol and must not share Seedance fields.
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

const MODEL_ID = 'happyhorse-1.0'
const ALLOWED_RESOLUTIONS = new Set(['720P', '1080P'])
const ALLOWED_SIZES = new Set(['16:9', '9:16', '1:1', '4:3', '3:4'])

function normalizeResolution(value?: string | null): string {
  const raw = String(value || '').trim().toUpperCase()
  return ALLOWED_RESOLUTIONS.has(raw) ? raw : '1080P'
}

function normalizeSize(value?: string | null): string {
  const raw = String(value || '').trim()
  return ALLOWED_SIZES.has(raw) ? raw : '16:9'
}

function normalizeDuration(value?: number | null): number {
  const parsed = Math.round(Number(value || 5))
  if (!Number.isFinite(parsed)) return 5
  return Math.min(15, Math.max(3, parsed))
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
  return item?.task_id || result?.task_id || result?.id || null
}

function extractVideoUrl(result: any): string | null {
  const data = unwrapData(result)
  const videos = data?.result?.videos || result?.result?.videos
  const first = Array.isArray(videos) ? videos[0] : null
  const rawUrl = first?.url || first?.video_url || data?.result?.video_url || data?.video_url || result?.video_url
  if (Array.isArray(rawUrl)) return rawUrl[0] || null
  return typeof rawUrl === 'string' ? rawUrl : null
}

function readAudioSetting(record: VideoGenerationRecord): 'auto' | 'origin' | null {
  const direct = String(record.audioSetting || '').trim().toLowerCase()
  if (direct === 'auto' || direct === 'origin') return direct
  try {
    const tools = record.tools ? JSON.parse(record.tools) : null
    const fromTools = String(tools?.audio_setting || tools?.audioSetting || '').trim().toLowerCase()
    if (fromTools === 'auto' || fromTools === 'origin') return fromTools
  } catch {}
  if (record.generateAudio === false) return 'origin'
  if (record.generateAudio === true) return 'auto'
  return null
}

export class ApimartHappyHorseVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const referenceImages = parseStringArray(record.referenceImageUrls)
    const referenceVideos = parseStringArray(record.referenceVideoUrls)
    const videoUrl = referenceVideos[0] || null
    const firstFrameImage = record.firstFrameUrl || record.imageUrl || null

    const body: any = {
      model: record.model || config.model || MODEL_ID,
      prompt: record.prompt || '',
      resolution: normalizeResolution(record.resolution),
      size: normalizeSize(record.aspectRatio),
      duration: normalizeDuration(record.duration),
      watermark: record.watermark ?? false,
    }

    if (record.seed !== undefined && record.seed !== null) body.seed = record.seed

    if (videoUrl) {
      body.video_url = videoUrl
      const editRefs = referenceImages.slice(0, 5)
      if (editRefs.length > 0) body.image_urls = editRefs
      const audioSetting = readAudioSetting(record)
      if (audioSetting) body.audio_setting = audioSetting
    } else if (firstFrameImage) {
      body.first_frame_image = firstFrameImage
    } else {
      const refs = referenceImages.slice(0, 9)
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

    throw new Error(result?.error?.message || 'No APIMart HappyHorse task_id in video generation response')
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
