/**
 * APIMart SkyReels V4 video generation adapter.
 * SkyReels has its own I2V/Omni field set and must stay separated by protocol/model.
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

const ALLOWED_MODELS = new Set(['skyreels-v4-fast', 'skyreels-v4-std'])
const ALLOWED_RESOLUTIONS = new Set(['480p', '720p', '1080p'])
const ALLOWED_ASPECT_RATIOS = new Set(['16:9', '4:3', '1:1', '9:16', '3:4'])

function normalizeModel(config: AIConfig, record: VideoGenerationRecord): string {
  const model = String(record.model || config.model || 'skyreels-v4-fast').trim()
  return ALLOWED_MODELS.has(model) ? model : 'skyreels-v4-fast'
}

function normalizeResolution(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase()
  return ALLOWED_RESOLUTIONS.has(raw) ? raw : '1080p'
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

function ensureTag(tag: string, fallback: string): string {
  const raw = String(tag || '').trim()
  if (!raw) return fallback
  return raw.startsWith('@') ? raw : `@${raw}`
}

function promptWithTags(prompt: string, tags: string[]): string {
  const missing = tags.filter(tag => tag && !prompt.includes(tag))
  if (missing.length === 0) return prompt
  return `${missing.map(tag => `Use ${tag} as a visual reference.`).join(' ')} ${prompt}`.trim()
}

function normalizeMidFrames(input: any[], duration: number): Array<{ tag: string; image_url: string; time_stamp?: number }> {
  return input
    .map((item, index) => {
      const imageUrl = String(item?.image_url || item?.imageUrl || item?.url || '').trim()
      if (!imageUrl) return null
      const tag = ensureTag(item?.tag, `@image${index + 1}`)
      const rawTimestamp = Number(item?.time_stamp ?? item?.timeStamp ?? -1)
      const timeStamp = Number.isFinite(rawTimestamp) && rawTimestamp > 0 && rawTimestamp < duration ? Math.floor(rawTimestamp) : -1
      return { tag, image_url: imageUrl, time_stamp: timeStamp }
    })
    .filter((item): item is { tag: string; image_url: string; time_stamp: number } => !!item)
    .slice(0, 6)
}

function normalizeRefImages(input: any[], fallbackUrls: string[]): Array<{ tag: string; type: 'image' | 'grid'; image_urls: string[]; audio_url?: string }> {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .map((item, index) => {
        const imageUrls = Array.isArray(item?.image_urls || item?.imageUrls)
          ? (item.image_urls || item.imageUrls).map((url: any) => String(url || '').trim()).filter(Boolean)
          : []
        const type = String(item?.type || 'image').trim().toLowerCase() === 'grid' ? 'grid' : 'image'
        if (imageUrls.length === 0) return null
        return {
          tag: ensureTag(item?.tag, `@image_${index + 1}`),
          type,
          image_urls: type === 'grid' ? imageUrls.slice(0, 1) : imageUrls.slice(0, 5),
          ...(item?.audio_url || item?.audioUrl ? { audio_url: String(item.audio_url || item.audioUrl).trim() } : {}),
        }
      })
      .filter((item): item is { tag: string; type: 'image' | 'grid'; image_urls: string[]; audio_url?: string } => !!item)
      .slice(0, 3)
  }

  return fallbackUrls.slice(0, 3).map((url, index) => ({
    tag: `@image_${index + 1}`,
    type: 'image',
    image_urls: [url],
  }))
}

function normalizeRefVideos(input: any[], fallbackUrls: string[], referenceMode?: string | null): Array<{ tag: string; type: 'reference' | 'extend'; video_url: string }> {
  if (Array.isArray(input) && input.length > 0) {
    return input
      .map((item, index) => {
        const videoUrl = String(item?.video_url || item?.videoUrl || item?.url || '').trim()
        if (!videoUrl) return null
        const type = String(item?.type || '').trim().toLowerCase() === 'extend' ? 'extend' : 'reference'
        return { tag: ensureTag(item?.tag, `@video_${index + 1}`), type, video_url: videoUrl }
      })
      .filter((item): item is { tag: string; type: 'reference' | 'extend'; video_url: string } => !!item)
      .slice(0, 1)
  }

  const fallbackType = String(referenceMode || '').toLowerCase() === 'extend' ? 'extend' : 'reference'
  return fallbackUrls.slice(0, 1).map((url, index) => ({
    tag: `@video_${index + 1}`,
    type: fallbackType,
    video_url: url,
  }))
}

export class ApimartSkyReelsVideoAdapter implements VideoProviderAdapter {
  provider = 'apimart'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const tools = parseTools(record.tools)
    const duration = normalizeDuration(record.duration)
    const body: any = {
      model: normalizeModel(config, record),
      prompt: record.prompt || '',
      duration,
      resolution: normalizeResolution(record.resolution),
      aspect_ratio: normalizeAspectRatio(record.aspectRatio),
      prompt_optimizer: tools.prompt_optimizer ?? tools.promptOptimizer ?? record.enhancePrompt ?? true,
    }

    const firstFrameImage = record.firstFrameUrl || record.imageUrl || null
    const endFrameImage = record.lastFrameUrl || tools.end_frame_image || tools.endFrameImage || null
    const midFrames = normalizeMidFrames(tools.mid_frame_images || tools.midFrameImages || [], duration)
    const referenceImages = parseStringArray(record.referenceImageUrls)
    const referenceVideos = parseStringArray(record.referenceVideoUrls)
    const explicitRefImages = tools.ref_images || tools.refImages || []
    const explicitRefVideos = tools.ref_videos || tools.refVideos || []
    const fallbackReferenceImages = firstFrameImage ? referenceImages.filter(url => url !== firstFrameImage) : referenceImages
    const refImages = normalizeRefImages(explicitRefImages, fallbackReferenceImages)
    const refVideos = normalizeRefVideos(explicitRefVideos, referenceVideos, record.referenceMode)

    const hasI2V = Boolean(firstFrameImage || endFrameImage || midFrames.length)
    const hasOmni = Boolean(refImages.length || refVideos.length)

    if (hasI2V && hasOmni) {
      throw new Error('SkyReels V4 I2V fields cannot be combined with ref_images/ref_videos')
    } else if (hasI2V) {
      if (firstFrameImage) body.first_frame_image = firstFrameImage
      if (endFrameImage) body.end_frame_image = endFrameImage
      if (midFrames.length > 0) {
        body.mid_frame_images = midFrames
        body.prompt = promptWithTags(body.prompt, midFrames.map(item => item.tag))
      }
    } else if (hasOmni) {
      const videoIsExtend = refVideos.some(item => item.type === 'extend')
      if (videoIsExtend && refImages.length > 0) {
        throw new Error('SkyReels V4 ref_videos.type=extend cannot be combined with ref_images')
      }
      if (refImages.length > 0) body.ref_images = refImages
      if (refVideos.length > 0) body.ref_videos = refVideos
      body.prompt = promptWithTags(body.prompt, [
        ...refImages.map(item => item.tag),
        ...refVideos.map(item => item.tag),
      ])
    }

    Object.keys(body).forEach(key => body[key] === undefined && delete body[key])

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

    throw new Error(result?.error?.message || 'No APIMart SkyReels task_id in video generation response')
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
