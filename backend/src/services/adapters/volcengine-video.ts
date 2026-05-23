/**
 * 火山引擎 Seedance 视频生成 Adapter
 * 端点: /api/v3/contents/generations/tasks (注意 /api/v3 前缀)
 * 响应: { id: "task-xxx" } -> 轮询获取状态
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

export class VolcEngineVideoAdapter implements VideoProviderAdapter {
  provider = 'volcengine'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model || 'doubao-seedance-2-0-260128'
    const content = this.buildContent(record)
    const seedance20 = this.isSeedance20Model(model)

    const body: any = { model, content }
    this.setIfPresent(body, 'generate_audio', record.generateAudio ?? (seedance20 ? true : undefined))
    this.setIfPresent(body, 'ratio', record.aspectRatio)
    this.setIfPresent(body, 'duration', this.normalizeDuration(record.duration, model))
    this.setIfPresent(body, 'frames', record.frames)
    this.setIfPresent(body, 'resolution', record.resolution)
    this.setIfPresent(body, 'seed', record.seed)
    this.setIfPresent(body, 'camera_fixed', record.cameraFixed)
    this.setIfPresent(body, 'watermark', record.watermark ?? (seedance20 ? false : undefined))
    this.setIfPresent(body, 'return_last_frame', record.returnLastFrame ?? (seedance20 ? true : undefined))
    this.setIfPresent(body, 'service_tier', record.serviceTier)
    this.setIfPresent(body, 'execution_expires_after', record.executionExpiresAfter)
    this.setIfPresent(body, 'callback_url', record.callbackUrl)
    this.setIfPresent(body, 'draft', record.draft)
    const tools = this.parseJsonArray(record.tools)
    if (tools.length) body.tools = tools

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/contents/generations/tasks'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    if (result.id) {
      return { isAsync: true, taskId: result.id }
    }
    // 同步返回
    const videoUrl = result.video_url || result.content?.video_url || result.data?.video_url
    if (videoUrl) {
      return { isAsync: false, videoUrl, lastFrameUrl: this.extractLastFrameUrl(result) }
    }
    throw new Error('No task_id or video_url in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', `/contents/generations/tasks/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    const status = result.status
    if (status === 'succeeded') {
      const videoUrl = result.video_url || result.content?.video_url || result.data?.video_url
      const lastFrameUrl = this.extractLastFrameUrl(result)
      return {
        status: 'completed',
        videoUrl,
        lastFrameUrl,
      }
    }
    if (status === 'failed') {
      return { status: 'failed', error: this.errorMessage(result.error) || 'Video generation failed' }
    }
    return { status: status || 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return result.video_url || result.content?.video_url || result.data?.video_url || null
  }

  private extractLastFrameUrl(result: any): string | undefined {
    const candidates = [
      result.last_frame_url,
      result.lastFrameUrl,
      result.content?.last_frame_url,
      result.content?.lastFrameUrl,
      result.data?.last_frame_url,
      result.data?.lastFrameUrl,
      result.data?.result?.last_frame_url,
      result.data?.result?.lastFrameUrl,
      result.result?.last_frame_url,
      result.result?.lastFrameUrl,
    ]
    const direct = candidates.find(value => typeof value === 'string' && value.trim())
    if (direct) return direct.trim()
    const images = result.images || result.data?.images || result.content?.images || result.result?.images || result.data?.result?.images
    if (Array.isArray(images)) {
      const item = images.find((image: any) => String(image?.role || image?.type || '').toLowerCase().includes('last'))
        || images[images.length - 1]
      const url = item?.url || item?.image_url || item?.imageUrl
      if (typeof url === 'string' && url.trim()) return url.trim()
    }
    return undefined
  }

  private buildContent(record: VideoGenerationRecord): any[] {
    const mode = String(record.referenceMode || 'none').trim().toLowerCase()
    if (mode === 'draft_task') {
      const draftTaskId = String(record.draftTaskId || '').trim()
      if (!draftTaskId) throw new Error('VolcEngine draft_task mode requires draft_task_id')
      return [{ type: 'draft_task', draft_task: { id: draftTaskId } }]
    }

    const content: any[] = []
    const prompt = String(record.prompt || '').trim()
    if (prompt) content.push({ type: 'text', text: prompt })
    if (!prompt) throw new Error('VolcEngine video prompt is required')

    const imageRefs = this.collectImageRefs(record)
    const videoRefs = this.parseJsonArray(record.referenceVideoUrls)
    const audioRefs = this.parseJsonArray(record.referenceAudioUrls)

    if (this.isTextMode(mode)) return content

    if (this.isFirstFrameMode(mode)) {
      if (imageRefs.length !== 1) throw new Error('VolcEngine first_frame mode requires exactly 1 image')
      content.push(this.imageItem(imageRefs[0]))
      return content
    }

    if (this.isFirstLastMode(mode)) {
      const first = String(record.firstFrameUrl || imageRefs[0] || '').trim()
      const last = String(record.lastFrameUrl || imageRefs[1] || '').trim()
      if (!first || !last) throw new Error('VolcEngine first_last mode requires first_frame_url and last_frame_url')
      content.push(this.imageItem(first, 'first_frame'), this.imageItem(last, 'last_frame'))
      return content
    }

    if (this.isReferenceMode(mode)) {
      if (imageRefs.length > 9) throw new Error('VolcEngine Seedance 2.0 reference mode supports up to 9 images')
      if (videoRefs.length > 3) throw new Error('VolcEngine Seedance 2.0 reference mode supports up to 3 videos')
      if (audioRefs.length > 3) throw new Error('VolcEngine Seedance 2.0 reference mode supports up to 3 audios')
      if (!imageRefs.length && !videoRefs.length && !audioRefs.length) {
        throw new Error('VolcEngine reference mode requires at least one image, video, or audio reference')
      }
      imageRefs.forEach(url => content.push(this.imageItem(url)))
      videoRefs.forEach(url => content.push({ type: 'video_url', video_url: { url } }))
      audioRefs.forEach(url => content.push({ type: 'audio_url', audio_url: { url } }))
      return content
    }

    if (mode === 'edit' || mode === 'video_edit') {
      if (!videoRefs.length) throw new Error('VolcEngine video edit mode requires reference_video_urls')
      videoRefs.forEach(url => content.push({ type: 'video_url', video_url: { url } }))
      imageRefs.slice(0, 9).forEach(url => content.push(this.imageItem(url)))
      audioRefs.slice(0, 3).forEach(url => content.push({ type: 'audio_url', audio_url: { url } }))
      return content
    }

    if (mode === 'extend' || mode === 'video_extend') {
      if (!videoRefs.length) throw new Error('VolcEngine video extend mode requires reference_video_urls')
      if (videoRefs.length > 3) throw new Error('VolcEngine video extend mode supports up to 3 videos')
      videoRefs.forEach(url => content.push({ type: 'video_url', video_url: { url } }))
      audioRefs.slice(0, 3).forEach(url => content.push({ type: 'audio_url', audio_url: { url } }))
      return content
    }

    throw new Error(`Unsupported VolcEngine video reference_mode: ${record.referenceMode}`)
  }

  private collectImageRefs(record: VideoGenerationRecord): string[] {
    return Array.from(new Set([
      record.imageUrl,
      record.firstFrameUrl,
      record.lastFrameUrl,
      ...this.parseJsonArray(record.referenceImageUrls),
    ].map(item => String(item || '').trim()).filter(Boolean)))
  }

  private isTextMode(mode: string) {
    return !mode || mode === 'none' || mode === 'text' || mode === 'text2video'
  }

  private isFirstFrameMode(mode: string) {
    return mode === 'single' || mode === 'image' || mode === 'image2video' || mode === 'first_frame'
  }

  private isFirstLastMode(mode: string) {
    return mode === 'first_last' || mode === 'start_end' || mode === 'first_last_frame'
  }

  private isReferenceMode(mode: string) {
    return mode === 'multiple' || mode === 'reference' || mode === 'multimodal_reference'
  }

  private isSeedance20Model(model: string) {
    const value = String(model || '').toLowerCase()
    return value.includes('seedance') && (value.includes('2.0') || value.includes('2-0') || value.includes('2_0'))
  }

  private imageItem(url: string, role?: 'first_frame' | 'last_frame') {
    return {
      type: 'image_url',
      image_url: { url },
      ...(role ? { role } : {}),
    }
  }

  private setIfPresent(body: Record<string, any>, key: string, value: any) {
    if (value !== undefined && value !== null && value !== '') body[key] = value
  }

  private parseJsonArray(value?: string | null): string[] {
    if (!value) return []
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      if (!Array.isArray(parsed)) return []
      return parsed.map(item => String(item || '').trim()).filter(Boolean)
    } catch {
      return []
    }
  }

  private normalizeDuration(duration: number | null | undefined, model: string): number | undefined {
    if (duration === undefined || duration === null) return undefined
    const parsed = Math.round(Number(duration))
    if (!Number.isFinite(parsed)) return undefined
    const lower = model.includes('seedance-1-0') ? 2 : 4
    const upper = model.includes('seedance-2-0') ? 15 : 12
    return Math.min(upper, Math.max(lower, parsed))
  }

  private errorMessage(error: any): string | null {
    if (!error) return null
    if (typeof error === 'string') return error
    return error.message || error.msg || JSON.stringify(error)
  }
}
