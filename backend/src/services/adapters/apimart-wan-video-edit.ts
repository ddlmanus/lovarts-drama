/**
 * APIMart Wan2.7 video edit adapter.
 * Dedicated video-edit protocol: video_urls + optional reference images and metadata.
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

const MODEL_ID = 'wan2.7-videoedit'
const ALLOWED_RESOLUTIONS = new Set(['720P', '1080P'])
const ALLOWED_SIZES = new Set(['16:9', '9:16', '1:1', '4:3', '3:4'])

function normalizeResolution(value?: string | null): string {
  const raw = String(value || '').trim().toUpperCase()
  return ALLOWED_RESOLUTIONS.has(raw) ? raw : '1080P'
}

function normalizeDuration(value?: number | null): number {
  if (value === 0) return 0
  const parsed = Math.round(Number(value ?? 0))
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.min(10, Math.max(2, parsed))
}

function normalizeSize(value?: string | null): string | null {
  const raw = String(value || '').trim()
  return ALLOWED_SIZES.has(raw) ? raw : null
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

function parseTools(raw?: string | null): Record<string, any> {
  if (!raw) return {}
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
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

function readAudioSetting(record: VideoGenerationRecord, tools: Record<string, any>): 'auto' | 'origin' | null {
  const raw = String(
    record.audioSetting ||
    tools.metadata?.audio_setting ||
    tools.metadata?.audioSetting ||
    tools.audio_setting ||
    tools.audioSetting ||
    '',
  ).trim().toLowerCase()
  if (raw === 'auto' || raw === 'origin') return raw
  if (record.generateAudio === false) return 'origin'
  if (record.generateAudio === true) return 'auto'
  return null
}

export class ApimartWanVideoEditAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const tools = parseTools(record.tools)
    const videoUrls = parseStringArray(record.referenceVideoUrls).slice(0, 1)
    if (videoUrls.length === 0) throw new Error('Wan2.7-VideoEdit requires video_urls')

    const referenceImages = parseStringArray(record.referenceImageUrls).slice(0, 4)
    const body: any = {
      model: record.model || config.model || MODEL_ID,
      video_urls: videoUrls,
      prompt: record.prompt || '',
      resolution: normalizeResolution(record.resolution),
      duration: normalizeDuration(record.duration),
      prompt_extend: tools.prompt_extend ?? tools.promptExtend ?? record.enhancePrompt ?? true,
      watermark: record.watermark ?? false,
    }

    const negativePrompt = record.negativePrompt || tools.negative_prompt || tools.negativePrompt
    if (negativePrompt) body.negative_prompt = String(negativePrompt)
    if (referenceImages.length > 0) body.image_urls = referenceImages
    const size = normalizeSize(record.aspectRatio)
    if (size) body.size = size
    if (record.seed !== undefined && record.seed !== null) body.seed = record.seed
    const audioSetting = readAudioSetting(record, tools)
    if (audioSetting) body.metadata = { audio_setting: audioSetting }

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

    throw new Error(result?.error?.message || 'No APIMart Wan2.7 video edit task_id in response')
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
