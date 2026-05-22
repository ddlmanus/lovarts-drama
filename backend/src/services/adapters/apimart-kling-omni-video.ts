/**
 * APIMart Kling v3 Omni video generation adapter.
 * Uses Kling's mode/image reference/audio protocol, separated by model/protocol.
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

const MODEL_ID = 'kling-v3-omni'
const ALLOWED_MODES = new Set(['std', 'pro', '4k'])
const ALLOWED_ASPECT_RATIOS = new Set(['16:9', '9:16', '1:1'])

function normalizeMode(record: VideoGenerationRecord): string {
  const raw = String(record.mode || record.resolution || '').trim().toLowerCase()
  if (ALLOWED_MODES.has(raw)) return raw
  if (raw === '720p') return 'std'
  if (raw === '1080p') return 'pro'
  return 'std'
}

function normalizeAspectRatio(value?: string | null): string {
  const raw = String(value || '').trim()
  return ALLOWED_ASPECT_RATIOS.has(raw) ? raw : '16:9'
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

function withImageReferencePrompt(prompt: string, imageUrls: string[]): string {
  if (imageUrls.length === 0 || /<<<image_\d+>>>/.test(prompt)) return prompt
  return `<<<image_1>>>${prompt || ''}`.trim()
}

function normalizeVideoList(input: any[], fallbackUrls: string[], referenceMode?: string | null): Array<{ video_url: string; refer_type: string; keep_original_sound: string }> {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .map((item) => {
        const videoUrl = String(item?.video_url || item?.videoUrl || item?.url || '').trim()
        if (!videoUrl) return null
        const referType = String(item?.refer_type || item?.referType || 'base').trim().toLowerCase()
        const keepOriginalSound = String(item?.keep_original_sound || item?.keepOriginalSound || 'no').trim().toLowerCase()
        return {
          video_url: videoUrl,
          refer_type: referType === 'feature' ? 'feature' : 'base',
          keep_original_sound: keepOriginalSound === 'yes' ? 'yes' : 'no',
        }
      })
      .filter((item): item is { video_url: string; refer_type: string; keep_original_sound: string } => !!item)
      .slice(0, 1)
  }

  if (fallbackUrls.length === 0) return []
  const referType = String(referenceMode || '').toLowerCase() === 'feature' ? 'feature' : 'base'
  return [{
    video_url: fallbackUrls[0],
    refer_type: referType,
    keep_original_sound: 'no',
  }]
}

function normalizeRoleImages(input: any[]): Array<{ url: string; role: string }> {
  if (!Array.isArray(input)) return []
  return input
    .map((item) => {
      const url = String(item?.url || item?.image_url || item?.imageUrl || '').trim()
      if (!url) return null
      const role = String(item?.role || 'reference').trim().toLowerCase()
      return {
        url,
        role: ['first_frame', 'last_frame', 'reference'].includes(role) ? role : 'reference',
      }
    })
    .filter((item): item is { url: string; role: string } => !!item)
}

export class ApimartKlingOmniVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const tools = parseTools(record.tools)
    const referenceImages = parseStringArray(record.referenceImageUrls)
    const referenceVideos = parseStringArray(record.referenceVideoUrls)
    const videoList = normalizeVideoList(tools.video_list || tools.videoList || [], referenceVideos, record.referenceMode)
    const firstFrame = record.firstFrameUrl || record.imageUrl || ''
    const lastFrame = record.lastFrameUrl || ''
    const explicitRoleImages = normalizeRoleImages(tools.image_with_roles || tools.imageWithRoles || [])

    if (lastFrame && !firstFrame) throw new Error('Kling v3 Omni last_frame requires first_frame')
    if (videoList.some(item => item.refer_type === 'base') && (firstFrame || lastFrame)) {
      throw new Error('Kling v3 Omni video_list.refer_type=base cannot be combined with first/last frame images')
    }

    const roleImages = explicitRoleImages.length > 0
      ? explicitRoleImages
      : [
          ...(firstFrame ? [{ url: firstFrame, role: 'first_frame' }] : []),
          ...(lastFrame ? [{ url: lastFrame, role: 'last_frame' }] : []),
          ...referenceImages.filter(url => url !== firstFrame && url !== lastFrame).map(url => ({ url, role: 'reference' })),
        ]

    const body: any = {
      model: record.model || config.model || MODEL_ID,
      prompt: record.prompt || '',
      mode: normalizeMode(record),
      duration: normalizeDuration(record.duration),
      aspect_ratio: normalizeAspectRatio(record.aspectRatio),
    }

    const negativePrompt = record.negativePrompt || tools.negative_prompt || tools.negativePrompt
    if (negativePrompt) body.negative_prompt = String(negativePrompt)
    if (record.watermark !== undefined && record.watermark !== null) body.watermark = record.watermark

    if (videoList.length > 0) {
      body.video_list = videoList
    } else if (roleImages.some(item => item.role === 'first_frame' || item.role === 'last_frame')) {
      body.image_with_roles = roleImages
    } else {
      const imageUrls = roleImages.map(item => item.url)
      if (imageUrls.length > 0) {
        body.image_urls = Array.from(new Set(imageUrls))
        body.prompt = withImageReferencePrompt(body.prompt, body.image_urls)
      }
    }

    if (videoList.length === 0 && (record.generateAudio === true || tools.audio === true)) body.audio = true

    if (tools.multi_shot ?? tools.multiShot) {
      body.multi_shot = true
      if (tools.shot_type || tools.shotType) body.shot_type = tools.shot_type || tools.shotType
      if (Array.isArray(tools.multi_prompt || tools.multiPrompt)) body.multi_prompt = tools.multi_prompt || tools.multiPrompt
    }
    if (Array.isArray(tools.element_list || tools.elementList)) body.element_list = tools.element_list || tools.elementList

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

    throw new Error(result?.error?.message || 'No APIMart Kling v3 Omni task_id in video generation response')
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
