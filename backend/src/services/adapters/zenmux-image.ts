/**
 * ZenMux image generation adapter.
 * Endpoint: /api/v1/images/generations
 * Response format: { data: [{ b64_json: "..." }] } or { data: [{ url: "..." }] }
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationRecord,
  ImageGenResponse,
  ImagePollResponse,
} from './types'
import { joinProviderUrl } from './url'
import {
  normalizeZenmuxOpenAIBaseUrl,
  normalizeZenmuxVertexBaseUrl,
  resolveConfiguredZenmuxProtocol,
} from './zenmux-utils'

const DEFAULT_MODEL = 'gpt-image-2'

function normalizeSize(size?: string | null): string {
  const value = String(size || '').trim().toLowerCase()
  if (value === 'auto') return value
  const match = value.match(/^(\d+)x(\d+)$/)
  if (match) {
    const width = Number(match[1])
    const height = Number(match[2])
    const ratio = width / height
    if (width % 16 === 0 && height % 16 === 0 && ratio >= 1 / 3 && ratio <= 3) {
      return value
    }
  }
  return '1024x1024'
}

function firstString(...values: Array<unknown>): string | undefined {
  for (const value of values) {
    const normalized = String(value || '').trim()
    if (normalized) return normalized
  }
  return undefined
}

function firstNumber(...values: Array<unknown>): number | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    const normalized = Number(value)
    if (Number.isFinite(normalized)) return normalized
  }
  return undefined
}

function firstBoolean(...values: Array<unknown>): boolean | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'boolean') return value
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return undefined
}

function normalizeOutputFormat(value?: string | null): string | undefined {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return undefined
  if (raw === 'image/jpeg' || raw === 'jpg') return 'jpeg'
  if (raw === 'image/png') return 'png'
  if (raw === 'image/webp') return 'webp'
  return raw
}

function cleanUndefined<T extends Record<string, any>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined || value[key] === null || value[key] === '') delete value[key]
  }
  return value
}

function extractB64(result: any): string | null {
  return result?.data?.[0]?.b64_json || result?.b64_json || null
}

function parseReferenceImages(raw?: string | null): string[] {
  if (!raw) return []
  try {
    const refs = JSON.parse(raw)
    if (!Array.isArray(refs)) return []
    return refs.map(item => String(item || '').trim()).filter(Boolean).slice(0, 16)
  } catch {
    return []
  }
}

function buildOpenAIImageOptions(config: AIConfig, record: ImageGenerationRecord): Record<string, any> {
  const defaults = config.modelDefaults || {}
  const capabilities = config.modelCapabilities || {}
  const outputFormat = normalizeOutputFormat(firstString(
    record.outputFormat,
    defaults.outputFormat,
    defaults.output_format,
    defaults.outputMimeType,
    defaults.output_mime_type,
    capabilities.outputFormat,
    capabilities.output_format,
  ))
  const outputCompression = firstNumber(
    record.outputCompression,
    defaults.outputCompression,
    defaults.output_compression,
    defaults.outputCompressionQuality,
    defaults.output_compression_quality,
    capabilities.outputCompression,
    capabilities.output_compression,
  )

  const stream = firstBoolean(record.stream, defaults.stream)
  return cleanUndefined({
    n: firstNumber(defaults.n, defaults.numberOfImages, defaults.number_of_images) || 1,
    size: normalizeSize(firstString(record.size, defaults.size, defaults.imageSize, defaults.image_size, defaults.resolution)),
    quality: firstString(record.quality, defaults.quality, capabilities.quality),
    output_format: outputFormat,
    output_compression: outputCompression,
    background: firstString(record.background, defaults.background, capabilities.background),
    moderation: firstString(record.moderation, defaults.moderation, capabilities.moderation),
    partial_images: stream ? firstNumber(record.partialImages, defaults.partialImages, defaults.partial_images) : undefined,
    stream,
    style: firstString(record.style, defaults.style),
    user: firstString(defaults.user),
  })
}

function buildJsonImageReference(imageUrl: string) {
  return { image_url: imageUrl }
}

export class ZenMuxImageAdapter implements ImageProviderAdapter {
  provider = 'zenmux'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const referenceImages = parseReferenceImages(record.referenceImages)
    const model = record.model || config.model || DEFAULT_MODEL
    const protocol = resolveConfiguredZenmuxProtocol(
      model,
      'image',
      config.modelDefaults,
      config.modelCapabilities,
    )
    if (protocol === 'vertex-gemini') {
      const parts: any[] = [{ text: record.prompt || 'Generate an image' }]
      for (const ref of referenceImages) {
        const parsed = String(ref || '').match(/^data:([^;]+);base64,(.+)$/)
        if (parsed) {
          parts.push({
            inline_data: {
              mime_type: parsed[1],
              data: parsed[2],
            },
          })
        }
      }

      return {
        url: joinProviderUrl(normalizeZenmuxVertexBaseUrl(config.baseUrl), '/v1', `/models/${model}:generateContent`),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.apiKey,
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: {
          contents: [{ parts }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: this.parseAspectRatio(record.size, referenceImages.length > 0 ? '1:1' : '3:4'),
              imageSize: this.parseImageSize(record.size),
            },
          },
        },
      }
    }

    const imageOptions = buildOpenAIImageOptions(config, record)
    const editOptions = referenceImages.length > 0
      ? cleanUndefined({
          ...imageOptions,
          input_fidelity: firstString(
            record.inputFidelity,
            config.modelDefaults?.inputFidelity,
            config.modelDefaults?.input_fidelity,
            config.modelCapabilities?.inputFidelity,
            config.modelCapabilities?.input_fidelity,
          ),
          mask: record.mask ? buildJsonImageReference(record.mask) : undefined,
        })
      : imageOptions

    const body = referenceImages.length > 0 ? {
      model,
      prompt: record.prompt,
      images: referenceImages.map(buildJsonImageReference),
      ...editOptions,
    } : {
      model,
      prompt: record.prompt,
      ...imageOptions,
    }

    return {
      url: joinProviderUrl(normalizeZenmuxOpenAIBaseUrl(config.baseUrl), '/api/v1', referenceImages.length > 0 ? '/images/edits' : '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    const taskId = result?.task_id || result?.id
    if (taskId) return { isAsync: true, taskId }

    const imageUrl = result?.data?.[0]?.url || result?.url
    if (imageUrl) return { isAsync: false, imageUrl }

    if (extractB64(result)) return { isAsync: false, imageUrl: undefined }

    if (this.extractImageBase64(result)) return { isAsync: false, imageUrl: undefined }

    throw new Error(result?.error?.message || 'No ZenMux image data in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(normalizeZenmuxOpenAIBaseUrl(config.baseUrl), '/api/v1', `/images/generations/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const status = result?.status
    const imageUrl = result?.data?.[0]?.url || result?.url

    if (status === 'completed' || status === 'succeeded') {
      return { status: 'completed', imageUrl }
    }
    if (status === 'failed') {
      return { status: 'failed', error: result?.error?.message || 'Generation failed' }
    }
    return { status: status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result?.data?.[0]?.url || result?.url || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const b64 = extractB64(result)
    if (b64) {
      const outputFormat = String(result?.output_format || result?.data?.[0]?.output_format || '').toLowerCase()
      const mimeType = outputFormat === 'jpeg' || outputFormat === 'jpg'
        ? 'image/jpeg'
        : outputFormat === 'webp'
          ? 'image/webp'
          : 'image/png'
      return { data: b64, mimeType }
    }

    const candidates = Array.isArray(result?.candidates) ? result.candidates : []
    const parts = [
      ...(Array.isArray(result?.parts) ? result.parts : []),
      ...candidates.flatMap((candidate: any) => candidate?.content?.parts || []),
    ]
    for (const part of parts) {
      const inline = part?.inlineData || part?.inline_data
      if (inline?.data) {
        return {
          data: inline.data,
          mimeType: inline.mimeType || inline.mime_type || 'image/png',
        }
      }
    }
    return null
  }

  private parseAspectRatio(size?: string | null, fallback = '1:1'): string {
    const raw = String(size || '').trim()
    if (/^\d{1,2}\s*:\s*\d{1,2}$/.test(raw)) return raw.replace(/\s+/g, '')
    const [w, h] = raw.split('x').map(Number)
    if (!w || !h) return fallback
    const gcd = this.gcd(w, h)
    return `${w / gcd}:${h / gcd}`
  }

  private parseImageSize(size?: string | null): string {
    const raw = String(size || '').trim().toUpperCase()
    if (raw === '1K' || raw === '2K' || raw === '4K') return raw
    const [w] = String(size || '').split('x').map(Number)
    if (!w) return '1K'
    if (w >= 2048) return '4K'
    if (w >= 1024) return '2K'
    return '1K'
  }

  private gcd(a: number, b: number): number {
    return b === 0 ? a : this.gcd(b, a % b)
  }
}
