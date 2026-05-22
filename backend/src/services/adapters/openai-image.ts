/**
 * OpenAI Images API adapter.
 * Endpoint: /v1/images/generations or /v1/images/edits when reference images are provided.
 * Response: { data: [{ url }] } for DALL-E URL mode, or { data: [{ b64_json }] } for GPT image models.
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

const DEFAULT_MODEL = 'gpt-image-2'
const GPT_IMAGE_MODEL_RE = /^gpt-image-/i
const PIXEL_SIZE_RE = /^(\d{2,5})x(\d{2,5})$/i
const RATIO_SIZE_RE = /^(\d{1,2})\s*:\s*(\d{1,2})$/
const SUPPORTED_OUTPUT_FORMATS = new Set(['png', 'jpeg', 'webp'])
const SUPPORTED_GPT_QUALITIES = new Set(['auto', 'low', 'medium', 'high'])
const SUPPORTED_DALLE_QUALITIES = new Set(['standard', 'hd'])
const SUPPORTED_BACKGROUNDS = new Set(['auto', 'opaque', 'transparent'])
const SUPPORTED_MODERATIONS = new Set(['auto', 'low'])
const SUPPORTED_STYLES = new Set(['vivid', 'natural'])
const SUPPORTED_INPUT_FIDELITY = new Set(['high', 'low'])
const EDIT_SIZES = new Set(['auto', '1024x1024', '1536x1024', '1024x1536'])

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
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

function firstBoolean(...values: Array<unknown>): boolean | undefined {
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    const normalized = String(value).trim().toLowerCase()
    if (normalized === 'true' || normalized === '1') return true
    if (normalized === 'false' || normalized === '0') return false
  }
  return undefined
}

function cleanUndefined<T extends Record<string, any>>(value: T): T {
  for (const key of Object.keys(value)) {
    if (value[key] === undefined || value[key] === null || value[key] === '') delete value[key]
  }
  return value
}

function isGptImageModel(model: string) {
  return GPT_IMAGE_MODEL_RE.test(model)
}

function normalizeEnum(value: unknown, supported: Set<string>, field: string): string | undefined {
  const normalized = String(value || '').trim().toLowerCase()
  if (!normalized) return undefined
  if (supported.has(normalized)) return normalized
  throw new Error(`OpenAI Images ${field} 不支持: ${value}`)
}

function normalizeOutputFormat(value: unknown): string | undefined {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return undefined
  if (raw === 'jpg' || raw === 'image/jpeg') return 'jpeg'
  if (raw === 'image/png') return 'png'
  if (raw === 'image/webp') return 'webp'
  if (SUPPORTED_OUTPUT_FORMATS.has(raw)) return raw
  throw new Error(`OpenAI Images output_format 不支持: ${value}`)
}

function normalizeCompression(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`OpenAI Images output_compression 必须是 0-100 的整数: ${value}`)
  return Math.max(0, Math.min(100, Math.floor(parsed)))
}

function normalizeCount(value: unknown, model: string) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 1
  const max = model === 'dall-e-3' ? 1 : 10
  return Math.max(1, Math.min(max, Math.floor(parsed)))
}

function roundTo16(value: number) {
  return Math.max(16, Math.round(value / 16) * 16)
}

function ratioBaseFromResolution(value: unknown) {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === '4k') return 2160
  if (raw === '2k') return 1440
  return 1024
}

function normalizeGptImageSize(size: unknown, resolution?: unknown) {
  const raw = String(size || '').trim().toLowerCase()
  if (!raw || raw === 'auto') return raw || '1024x1024'
  const ratioMatch = raw.match(RATIO_SIZE_RE)
  if (ratioMatch) {
    const widthRatio = Number(ratioMatch[1])
    const heightRatio = Number(ratioMatch[2])
    if (!widthRatio || !heightRatio) throw new Error(`OpenAI Images size 不支持: ${size}`)
    const ratio = widthRatio / heightRatio
    if (ratio < 1 / 3 || ratio > 3) throw new Error(`OpenAI Images size 比例必须在 1:3 到 3:1 之间: ${size}`)
    const base = ratioBaseFromResolution(resolution)
    return ratio >= 1 ? `${roundTo16(base * ratio)}x${roundTo16(base)}` : `${roundTo16(base)}x${roundTo16(base / ratio)}`
  }
  const pixelMatch = raw.match(PIXEL_SIZE_RE)
  if (!pixelMatch) return raw
  const width = Number(pixelMatch[1])
  const height = Number(pixelMatch[2])
  const ratio = width / height
  if (width % 16 !== 0 || height % 16 !== 0 || ratio < 1 / 3 || ratio > 3) {
    throw new Error(`OpenAI Images size 必须宽高都能被 16 整除，比例在 1:3 到 3:1 之间: ${size}`)
  }
  return `${width}x${height}`
}

function normalizeDalleSize(size: unknown, model: string) {
  const raw = String(size || '').trim().toLowerCase()
  if (!raw) return '1024x1024'
  if (model === 'dall-e-2') {
    if (['256x256', '512x512', '1024x1024'].includes(raw)) return raw
    throw new Error(`OpenAI DALL-E 2 size 不支持: ${size}`)
  }
  if (model === 'dall-e-3') {
    if (['1024x1024', '1792x1024', '1024x1792'].includes(raw)) return raw
    throw new Error(`OpenAI DALL-E 3 size 不支持: ${size}`)
  }
  return raw || '1024x1024'
}

function normalizeGptImageEditSize(size: unknown) {
  const raw = String(size || '').trim().toLowerCase()
  if (!raw || raw === 'auto') return raw || '1024x1024'
  if (EDIT_SIZES.has(raw)) return raw

  const ratioMatch = raw.match(RATIO_SIZE_RE)
  if (ratioMatch) {
    const widthRatio = Number(ratioMatch[1])
    const heightRatio = Number(ratioMatch[2])
    if (!widthRatio || !heightRatio) return '1024x1024'
    if (widthRatio > heightRatio) return '1536x1024'
    if (heightRatio > widthRatio) return '1024x1536'
    return '1024x1024'
  }

  const pixelMatch = raw.match(PIXEL_SIZE_RE)
  if (pixelMatch) {
    const width = Number(pixelMatch[1])
    const height = Number(pixelMatch[2])
    if (width > height) return '1536x1024'
    if (height > width) return '1024x1536'
  }
  return '1024x1024'
}

function mimeTypeFromResult(result: any) {
  const outputFormat = String(result?.output_format || result?.data?.[0]?.output_format || '').toLowerCase()
  if (outputFormat === 'jpeg' || outputFormat === 'jpg') return 'image/jpeg'
  if (outputFormat === 'webp') return 'image/webp'
  return 'image/png'
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

function dataUrlToBlob(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  const bytes = Buffer.from(match[2], 'base64')
  return new Blob([bytes], { type: match[1] })
}

function appendFormValue(form: FormData, key: string, value: unknown) {
  if (value === undefined || value === null || value === '') return
  form.append(key, typeof value === 'boolean' || typeof value === 'number' ? String(value) : String(value))
}

function buildEditFormData(body: Record<string, any>, referenceImages: string[]) {
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) {
    if (key === 'images' || key === 'mask') continue
    appendFormValue(form, key, value)
  }
  referenceImages.forEach((image, index) => {
    const blob = dataUrlToBlob(image)
    if (blob) form.append('image[]', blob, `reference-${index + 1}.jpg`)
    else form.append('images[]', JSON.stringify(/^file-[a-zA-Z0-9_-]+$/.test(image) ? { file_id: image } : { image_url: image }))
  })
  const mask = String(body.mask?.image_url || body.mask?.file_id || '')
  if (mask) {
    const blob = dataUrlToBlob(mask)
    if (blob) form.append('mask', blob, 'mask.png')
    else form.append('mask', JSON.stringify(/^file-[a-zA-Z0-9_-]+$/.test(mask) ? { file_id: mask } : { image_url: mask }))
  }
  return form
}

function buildImageReference(value: string) {
  if (/^file-[a-zA-Z0-9_-]+$/.test(value)) return { file_id: value }
  return { image_url: value }
}

export class OpenAIImageAdapter implements ImageProviderAdapter {
  provider = 'openai'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const defaults = config.modelDefaults || {}
    const capabilities = config.modelCapabilities || {}
    const model = record.model || config.model || DEFAULT_MODEL
    const isGptImage = isGptImageModel(model)
    const referenceImages = parseReferenceImages(record.referenceImages)
    const isEdit = referenceImages.length > 0
    const outputFormat = normalizeOutputFormat(firstString(
      record.outputFormat,
      defaults.outputFormat,
      defaults.output_format,
      capabilities.outputFormat,
      capabilities.output_format,
    ))
    const background = normalizeEnum(firstString(record.background, defaults.background, capabilities.background), SUPPORTED_BACKGROUNDS, 'background')

    const body: any = {
      model,
      prompt: record.prompt,
      size: isGptImage
        ? isEdit
          ? normalizeGptImageEditSize(firstString(record.size, defaults.size, defaults.imageSize, defaults.image_size))
          : normalizeGptImageSize(firstString(record.size, defaults.size, defaults.imageSize, defaults.image_size), firstString(record.sampleImageSize, defaults.resolution, defaults.sampleImageSize, defaults.sample_image_size))
        : normalizeDalleSize(firstString(record.size, defaults.size, defaults.imageSize, defaults.image_size), model),
      n: normalizeCount(firstNumber(record.numberOfImages, defaults.n, defaults.numberOfImages, defaults.number_of_images), model),
    }

    if (isEdit) {
      body.images = referenceImages.map(buildImageReference)
      if (record.mask) body.mask = buildImageReference(record.mask)
      const inputFidelity = normalizeEnum(firstString(record.inputFidelity, defaults.inputFidelity, defaults.input_fidelity), SUPPORTED_INPUT_FIDELITY, 'input_fidelity')
      if (inputFidelity) body.input_fidelity = inputFidelity
    }

    if (isGptImage) {
      body.quality = normalizeEnum(firstString(record.quality, defaults.quality, capabilities.quality), SUPPORTED_GPT_QUALITIES, 'quality') || 'auto'
      if (outputFormat) body.output_format = outputFormat
      if (background) body.background = background
      const moderation = normalizeEnum(firstString(record.moderation, defaults.moderation, capabilities.moderation), SUPPORTED_MODERATIONS, 'moderation')
      if (moderation) body.moderation = moderation
      const outputCompression = normalizeCompression(firstNumber(record.outputCompression, defaults.outputCompression, defaults.output_compression))
      if (outputCompression !== undefined) body.output_compression = outputCompression
      const stream = firstBoolean(record.stream, defaults.stream)
      if (stream !== undefined) body.stream = stream
      const partialImages = firstNumber(record.partialImages, defaults.partialImages, defaults.partial_images)
      if (stream && partialImages !== undefined) body.partial_images = Math.max(0, Math.min(3, Math.floor(partialImages)))
    } else {
      body.response_format = normalizeEnum(firstString(record.responseFormat, defaults.responseFormat, defaults.response_format), new Set(['url', 'b64_json']), 'response_format') || 'url'
      if (model === 'dall-e-3') {
        body.quality = normalizeEnum(firstString(record.quality, defaults.quality), SUPPORTED_DALLE_QUALITIES, 'quality') || 'standard'
        const style = normalizeEnum(firstString(record.style, defaults.style), SUPPORTED_STYLES, 'style')
        if (style) body.style = style
      }
    }
    cleanUndefined(body)

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${config.apiKey}`,
    }
    if (!isEdit) headers['Content-Type'] = 'application/json'

    return {
      url: joinProviderUrl(config.baseUrl, '/v1', isEdit ? '/images/edits' : '/images/generations'),
      method: 'POST',
      headers,
      body: isEdit ? buildEditFormData(body, referenceImages) : body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    // OpenAI DALL-E 3 目前是同步返回，但规范上也有异步 task 模式
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id }
    }
    const imageUrl = result.data?.[0]?.url || result.url
    if (imageUrl) {
      return { isAsync: false, imageUrl }
    }
    // b64_json 模式
    const b64 = result.data?.[0]?.b64_json
    if (b64) {
      return { isAsync: false, imageUrl: undefined }
    }
    throw new Error('No image URL in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/v1', `/images/task/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    if (result.status === 'completed') {
      return {
        status: 'completed',
        imageUrl: result.image_url || result.data?.[0]?.url || null,
      }
    }
    if (result.status === 'failed') {
      return { status: 'failed', error: result.error?.message || 'Generation failed' }
    }
    return { status: result.status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result.data?.[0]?.url || result.image_url || null
  }

  extractImageUrls(result: any): string[] {
    if (Array.isArray(result?.data)) return result.data.map((item: any) => item?.url).filter(Boolean)
    return this.extractImageUrl(result) ? [this.extractImageUrl(result)!] : []
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const b64 = result.data?.[0]?.b64_json
    if (b64) {
      return { data: b64, mimeType: mimeTypeFromResult(result) }
    }
    return null
  }

  extractImageBase64List(result: any): Array<{ data: string; mimeType: string }> {
    if (!Array.isArray(result?.data)) {
      const one = this.extractImageBase64(result)
      return one ? [one] : []
    }
    const mimeType = mimeTypeFromResult(result)
    return result.data.map((item: any) => item?.b64_json).filter(Boolean).map((data: string) => ({ data, mimeType }))
  }
}
