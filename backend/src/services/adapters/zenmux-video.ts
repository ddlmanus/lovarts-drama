/**
 * ZenMux video adapter.
 * Mirrors Ideart's routing rule: ZenMux video-like models use the Vertex-compatible
 * endpoint, while credentials still come from the user provider config.
 */
import type {
  AIConfig,
  ProviderRequest,
  VideoGenResponse,
  VideoGenerationRecord,
  VideoPollResponse,
  VideoProviderAdapter,
} from './types'
import { joinProviderUrl } from './url'
import {
  normalizeZenmuxAspectRatio,
  normalizeZenmuxVertexBaseUrl,
  normalizeZenmuxVideoDuration,
  normalizeZenmuxVideoResolution,
} from './zenmux-utils'

function splitVertexModelId(modelId?: string | null): { provider: string; model: string } {
  const raw = String(modelId || '').trim()
  const parts = raw.split('/').filter(Boolean)
  if (parts.length >= 2) {
    return {
      provider: parts[0],
      model: parts.slice(1).join('/'),
    }
  }
  return { provider: 'google', model: raw }
}

function parseReferenceImages(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    return refs.map(item => String(item || '').trim()).filter(Boolean)
  } catch {
    return []
  }
}

function parseDataImage(value?: string | null): { imageBytes: string; mimeType: string } | null {
  const match = String(value || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return { mimeType: match[1], imageBytes: match[2] }
}

function normalizePositiveNumber(value?: number | null): number | undefined {
  if (value === null || value === undefined) return undefined
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : undefined
}

function pickDefined<T extends Record<string, any>>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined && item !== null && item !== ''),
  ) as Partial<T>
}

export class ZenMuxVideoAdapter implements VideoProviderAdapter {
  provider = 'zenmux'

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest {
    const model = record.model || config.model
    const vertexModel = splitVertexModelId(model)
    const refs = [
      record.imageUrl,
      record.firstFrameUrl,
      ...parseReferenceImages(record.referenceImageUrls),
    ].map(item => String(item || '').trim()).filter(Boolean)
    const image = parseDataImage(refs[0])
    const lastFrame = parseDataImage(record.lastFrameUrl)
    const sampleCount = normalizePositiveNumber(record.numberOfVideos) || 1

    return {
      url: joinProviderUrl(
        normalizeZenmuxVertexBaseUrl(config.baseUrl),
        '/v1',
        `/publishers/${vertexModel.provider}/models/${vertexModel.model}:predictLongRunning`,
      ),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: {
        instances: [{
          prompt: record.prompt,
          ...(image ? { image } : {}),
          ...(lastFrame ? { lastFrame } : {}),
        }],
        parameters: pickDefined({
          sampleCount,
          aspectRatio: normalizeZenmuxAspectRatio(record.aspectRatio, '16:9'),
          durationSeconds: normalizeZenmuxVideoDuration(record.duration),
          resolution: normalizeZenmuxVideoResolution(record.resolution),
          generateAudio: record.generateAudio,
          negativePrompt: record.negativePrompt,
          enhancePrompt: record.enhancePrompt,
          personGeneration: record.personGeneration,
          seed: record.seed,
          fps: normalizePositiveNumber(record.fps),
        }),
      },
    }
  }

  parseGenerateResponse(result: any): VideoGenResponse {
    const videoUrl = this.extractVideoUrl(result)
    if (videoUrl) return { isAsync: false, videoUrl }

    const taskId = result?.name || result?.operation?.name || result?.id || result?.task_id
    if (taskId) return { isAsync: true, taskId }

    throw new Error(result?.error?.message || 'No ZenMux video task in response')
  }

  buildPollRequest(config: AIConfig, taskId: string, model?: string | null): ProviderRequest {
    const vertexModel = splitVertexModelId(model || config.model)
    return {
      url: joinProviderUrl(
        normalizeZenmuxVertexBaseUrl(config.baseUrl),
        '/v1',
        `/publishers/${vertexModel.provider}/models/${vertexModel.model}:fetchPredictOperation`,
      ),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': config.apiKey,
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: { operationName: taskId },
    }
  }

  parsePollResponse(result: any): VideoPollResponse {
    if (result?.error) {
      return { status: 'failed', error: result.error?.message || JSON.stringify(result.error) }
    }

    const videoUrl = this.extractVideoUrl(result)
    if (result?.done && videoUrl) return { status: 'completed', videoUrl }
    if (result?.done && !videoUrl) return { status: 'failed', error: 'ZenMux video operation completed without video url' }

    return { status: 'processing' }
  }

  extractVideoUrl(result: any): string | null {
    return result?.response?.generatedVideos?.[0]?.video?.uri
      || result?.response?.generated_videos?.[0]?.video?.uri
      || result?.response?.videos?.[0]?.gcsUri
      || result?.response?.videos?.[0]?.uri
      || result?.response?.videos?.[0]?.video?.uri
      || result?.generatedVideos?.[0]?.video?.uri
      || result?.data?.[0]?.url
      || result?.video_url
      || result?.url
      || null
  }
}
