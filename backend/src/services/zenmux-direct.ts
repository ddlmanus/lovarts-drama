import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { GoogleGenAI, Modality, RawReferenceImage, createPartFromBase64, type GeneratedImage } from '@google/genai'
import type { AIConfig } from './adapters/types'
import { getAbsolutePath, parseDataUrl, saveBase64Image } from '../utils/storage.js'
import {
  getCanonicalZenmuxModelId,
  normalizeZenmuxAspectRatio,
  normalizeZenmuxImageMimeType,
  normalizeZenmuxImageQuality,
  normalizeZenmuxImageSize,
  normalizeZenmuxOpenAIBaseUrl,
  normalizeZenmuxOpenAIImageSize,
  normalizeZenmuxVertexBaseUrl,
  normalizeZenmuxVideoDuration,
  normalizeZenmuxVideoResolution,
  resolveConfiguredZenmuxProtocol,
} from './adapters/zenmux-utils.js'

export function shouldUseZenmuxDirect(serviceType: 'image' | 'video', config: AIConfig, model?: string | null): boolean {
  if (String(config.provider || '').toLowerCase() !== 'zenmux') return false
  const protocol = resolveConfiguredZenmuxProtocol(
    model || config.model,
    serviceType,
    config.modelDefaults,
    config.modelCapabilities,
  )
  return serviceType === 'image' || protocol !== 'openai-chat'
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

function normalizeAspectRatioFromSize(value?: string | null, fallback = '1:1'): string {
  const raw = String(value || '').trim()
  if (/^\d{1,2}\s*:\s*\d{1,2}$/.test(raw)) return raw.replace(/\s+/g, '')
  const [width, height] = raw.split('x').map(Number)
  if (!width || !height) return fallback
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))
  const divisor = gcd(width, height)
  return `${width / divisor}:${height / divisor}`
}

function clientFor(config: AIConfig) {
  return new GoogleGenAI({
    apiKey: config.apiKey,
    vertexai: true,
    httpOptions: {
      apiVersion: 'v1',
      baseUrl: normalizeZenmuxVertexBaseUrl(config.baseUrl),
    },
  })
}

function extractGeminiInlineImages(response: any): Array<{ data: string; mimeType: string }> {
  const candidates = Array.isArray(response?.candidates) ? response.candidates : []
  const parts = [
    ...(Array.isArray(response?.parts) ? response.parts : []),
    ...candidates.flatMap((candidate: any) => candidate?.content?.parts || []),
  ]
  const images: Array<{ data: string; mimeType: string }> = []
  for (const part of parts) {
    const inline = part?.inlineData || part?.inline_data
    const data = String(inline?.data || '').trim()
    if (data) {
      images.push({
        data,
        mimeType: normalizeZenmuxImageMimeType(inline?.mimeType || inline?.mime_type),
      })
    }
  }
  return images
}

function withGeminiImageCountPrompt(prompt: string, count: number) {
  if (count <= 1) return prompt
  return `${prompt}\n\n请一次性生成 ${count} 张不同版本的图片，保持同一主题和规格，但构图、细节或风格要有明显差异。`
}

async function fetchRemoteBuffer(url: string, timeoutMs = 30000): Promise<{ buffer: Buffer; mimeType: string }> {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
  if (!response.ok) throw new Error(`Failed to fetch remote asset: ${response.status}`)
  const mimeType = String(response.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim()
  return { buffer: Buffer.from(await response.arrayBuffer()), mimeType }
}

async function resolveImageAsset(value: string): Promise<{ base64Data: string; mimeType: string }> {
  const raw = String(value || '').trim()
  if (!raw) throw new Error('Reference image is empty')
  const parsed = parseDataUrl(raw)
  if (parsed) return { base64Data: parsed.data, mimeType: parsed.mimeType }
  if (raw.startsWith('static/') || raw.startsWith('/static/')) {
    const absolute = getAbsolutePath(raw.startsWith('/static/') ? raw.slice(1) : raw)
    const buffer = fs.readFileSync(absolute)
    const ext = path.extname(absolute).toLowerCase()
    const mimeType = ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : ext === '.webp' ? 'image/webp' : 'image/png'
    return { base64Data: buffer.toString('base64'), mimeType }
  }
  if (!/^https?:\/\//i.test(raw)) throw new Error(`Unsupported ZenMux image input: ${raw}`)
  const fetched = await fetchRemoteBuffer(raw)
  return { base64Data: fetched.buffer.toString('base64'), mimeType: fetched.mimeType || 'image/png' }
}

async function saveGeneratedVideoFromUri(client: GoogleGenAI, uri: string): Promise<string> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'zenmux-video-'))
  const extension = path.extname(new URL(uri).pathname) || '.mp4'
  const filename = path.join(tempDir, `video${extension}`)
  try {
    await client.files.download({
      file: { uri },
      downloadPath: filename,
    } as any)
    const buffer = await readFile(filename)
    const outputDir = path.dirname(getAbsolutePath('static/videos/.keep'))
    fs.mkdirSync(outputDir, { recursive: true })
    const outputName = `${randomUUID()}${extension}`
    fs.writeFileSync(path.join(outputDir, outputName), buffer)
    return `static/videos/${outputName}`
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => {})
  }
}

export async function generateZenmuxImageDirect(config: AIConfig, params: {
  model?: string | null
  prompt?: string | null
  negativePrompt?: string | null
  size?: string | null
  sampleImageSize?: string | null
  quality?: string | null
  style?: string | null
  seed?: number | null
  cfgScale?: number | null
  referenceImages?: string[]
  mask?: string | null
  numberOfImages?: number | null
  outputFormat?: string | null
  stream?: boolean | null
}): Promise<{ localPath: string; localPaths?: string[]; imageUrl?: string; mimeType: string }> {
  const client = clientFor(config)
  const model = String(params.model || config.model || '').trim()
  const prompt = params.prompt || 'Generate an image'
  const requestedRefs = (params.referenceImages || []).map(item => String(item || '').trim()).filter(Boolean)
  const defaults = config.modelDefaults || {}
  const capabilities = config.modelCapabilities || {}
  const protocol = resolveConfiguredZenmuxProtocol(model, 'image', defaults, capabilities)
  const refs = requestedRefs.slice(0, protocol === 'openai-image' ? 16 : 8)
  if (requestedRefs.length > refs.length) {
    throw new Error(`ZenMux ${protocol} 参考图最多支持 ${refs.length} 张`)
  }
  const canonicalModel = getCanonicalZenmuxModelId(model).toLowerCase()
  const isOpenAIImageModel = model.toLowerCase().startsWith('openai/') || canonicalModel.startsWith('gpt-image-')
  const aspectRatio = normalizeAspectRatioFromSize(firstString(
    defaults.aspectRatio,
    defaults.aspect_ratio,
    defaults.ratio,
    params.size,
  ), refs.length > 0 ? '1:1' : '3:4')
  const imageSize = normalizeZenmuxOpenAIImageSize(firstString(
    params.size,
    defaults.imageSize,
    defaults.image_size,
    defaults.size,
    defaults.resolution,
  ))
  const quality = normalizeZenmuxImageQuality(firstString(params.quality, defaults.quality, capabilities.quality))
  const sampleImageSize = normalizeZenmuxImageSize(firstString(
    params.sampleImageSize,
    defaults.sampleImageSize,
    defaults.sample_image_size,
    defaults.imageSizeLevel,
    defaults.image_size_level,
    params.size,
  ))
  const outputMimeType = normalizeZenmuxImageMimeType(firstString(
    defaults.outputMimeType,
    defaults.output_mime_type,
    defaults.outputFormat,
    defaults.output_format,
  ))
  const outputCompressionQuality = Number(defaults.outputCompressionQuality ?? defaults.output_compression_quality ?? 0) || undefined
  const numberOfImages = Math.max(1, Math.min(4, firstNumber(params.numberOfImages, defaults.numberOfImages, defaults.number_of_images, defaults.sampleCount, defaults.sample_count) || 1))
  const seed = firstNumber(params.seed, defaults.seed)
  const guidanceScale = firstNumber(params.cfgScale, defaults.guidanceScale, defaults.guidance_scale)
  const negativePrompt = firstString(params.negativePrompt, defaults.negativePrompt, defaults.negative_prompt)

  if (protocol === 'openai-image') {
    return generateZenmuxOpenAIImage({
      config,
      model,
      prompt,
      refs,
      mask: params.mask,
      numberOfImages,
      size: imageSize,
      quality,
      outputFormat: firstString(defaults.outputFormat, defaults.output_format, defaults.outputMimeType, defaults.output_mime_type),
      outputCompression: firstNumber(defaults.outputCompression, defaults.output_compression, defaults.outputCompressionQuality, defaults.output_compression_quality),
      background: firstString(defaults.background, capabilities.background),
      moderation: firstString(defaults.moderation, capabilities.moderation),
      stream: firstBoolean(defaults.stream),
      partialImages: firstNumber(defaults.partialImages, defaults.partial_images),
    })
  }

  const extraBody = {
    ...(isOpenAIImageModel && imageSize ? { imageSize } : {}),
    ...(isOpenAIImageModel && quality ? { quality } : {}),
    ...(!isOpenAIImageModel && sampleImageSize ? { sampleImageSize } : {}),
  }
  const vertexImageConfig = cleanUndefinedDeep({
    numberOfImages,
    negativePrompt,
    aspectRatio,
    outputMimeType,
    outputCompressionQuality,
    seed,
    enhancePrompt: firstBoolean(defaults.enhancePrompt, defaults.enhance_prompt),
    personGeneration: firstString(defaults.personGeneration, defaults.person_generation),
    safetyFilterLevel: firstString(defaults.safetyFilterLevel, defaults.safety_filter_level),
    includeRaiReason: firstBoolean(defaults.includeRaiReason, defaults.include_rai_reason),
    addWatermark: firstBoolean(defaults.addWatermark, defaults.add_watermark),
    guidanceScale,
    httpOptions: {
      extraBody,
    },
  })

  if (protocol === 'vertex-gemini') {
    const contents: any[] = [withGeminiImageCountPrompt(prompt, numberOfImages)]
    for (const ref of refs) {
      const asset = await resolveImageAsset(ref)
      contents.push(createPartFromBase64(asset.base64Data, asset.mimeType))
    }
    const response = await client.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
        imageConfig: cleanUndefinedDeep({
          aspectRatio,
          imageSize: normalizeZenmuxImageSize(firstString(params.sampleImageSize, defaults.sampleImageSize, defaults.sample_image_size)),
        }),
      },
    })
    const inlineImages = extractGeminiInlineImages(response).slice(0, numberOfImages)
    if (!inlineImages.length) throw new Error('ZenMux Gemini image response contained no inline image data')
    const localPaths: string[] = []
    for (const image of inlineImages) {
      localPaths.push(await saveBase64Image(image.data, image.mimeType, 'images'))
    }
    const mimeType = inlineImages[0]?.mimeType || 'image/png'
    return { localPath: localPaths[0], localPaths, mimeType }
  }

  if (refs.length > 0) {
    const referenceImages = await Promise.all(refs.map(async (ref, index) => {
      const asset = await resolveImageAsset(ref)
      const referenceImage = new RawReferenceImage()
      referenceImage.referenceId = index + 1
      referenceImage.referenceImage = {
        imageBytes: asset.base64Data,
        mimeType: asset.mimeType,
      }
      return referenceImage
    }))
    const response = await client.models.editImage({
      model,
      prompt,
      referenceImages,
      config: vertexImageConfig as any,
    })
    const generatedImages: GeneratedImage[] = response.generatedImages || []
    const localPaths: string[] = []
    let mimeType = 'image/png'
    for (const generated of generatedImages.slice(0, numberOfImages)) {
      const imageBytes = String(generated?.image?.imageBytes || '').trim()
      mimeType = normalizeZenmuxImageMimeType(generated?.image?.mimeType)
      if (imageBytes) localPaths.push(await saveBase64Image(imageBytes, mimeType, 'images'))
    }
    if (!localPaths.length) throw new Error('ZenMux image edit returned no image bytes')
    return { localPath: localPaths[0], localPaths, mimeType }
  }

  const response = await client.models.generateImages({
    model,
    prompt,
    config: vertexImageConfig as any,
  })
  const generatedImages: GeneratedImage[] = response.generatedImages || []
  const localPaths: string[] = []
  let mimeType = 'image/png'
  for (const generated of generatedImages.slice(0, numberOfImages)) {
    const imageBytes = String(generated?.image?.imageBytes || '').trim()
    mimeType = normalizeZenmuxImageMimeType(generated?.image?.mimeType)
    if (imageBytes) localPaths.push(await saveBase64Image(imageBytes, mimeType, 'images'))
  }
  if (!localPaths.length) throw new Error('ZenMux image generation returned no images')
  return { localPath: localPaths[0], localPaths, mimeType }
}

async function generateZenmuxOpenAIImage(params: {
  config: AIConfig
  model: string
  prompt: string
  refs: string[]
  mask?: string | null
  numberOfImages: number
  size?: string
  quality?: string
  outputFormat?: string
  outputCompression?: number
  background?: string
  moderation?: string
  stream?: boolean
  partialImages?: number
}): Promise<{ localPath: string; localPaths?: string[]; mimeType: string }> {
  if (params.stream) throw new Error('当前后端任务执行器暂不支持 OpenAI Image 流式图片事件，请关闭 stream')
  const baseUrl = normalizeZenmuxOpenAIBaseUrl(params.config.baseUrl)
  const commonFields = cleanUndefinedDeep({
    model: params.model,
    prompt: params.prompt,
    n: params.numberOfImages,
    size: params.size,
    quality: params.quality,
    output_format: normalizeOpenAIOutputFormat(params.outputFormat),
    output_compression: params.outputCompression,
    background: params.background,
    moderation: params.moderation,
    partial_images: params.partialImages,
  })
  const headers = { Authorization: `Bearer ${params.config.apiKey}` }
  const hasEditInput = params.refs.length > 0 || Boolean(params.mask)
  if (params.mask && !params.refs.length) {
    throw new Error('OpenAI Image mask 局部编辑必须同时提供 image 参考图')
  }
  const response = hasEditInput
    ? await fetch(`${baseUrl}/images/edits`, {
        method: 'POST',
        headers,
        body: await buildOpenAIImageEditForm(commonFields, params.refs, params.mask),
        signal: AbortSignal.timeout(1_200_000),
      })
    : await fetch(`${baseUrl}/images/generations`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(commonFields),
        signal: AbortSignal.timeout(1_200_000),
      })
  const text = await response.text()
  if (!response.ok) throw new Error(`ZenMux OpenAI Image API error ${response.status}: ${text}`)
  const result = text ? JSON.parse(text) : {}
  const images = extractOpenAIImageResponse(result)
  if (!images.length) throw new Error('ZenMux OpenAI Image response contained no image data')
  const localPaths: string[] = []
  for (const image of images.slice(0, params.numberOfImages)) {
    localPaths.push(await saveBase64Image(image.data, image.mimeType, 'images'))
  }
  return { localPath: localPaths[0], localPaths, mimeType: images[0]?.mimeType || 'image/png' }
}

async function buildOpenAIImageEditForm(fields: Record<string, any>, refs: string[], mask?: string | null) {
  const form = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null || value === '') continue
    form.append(key, String(value))
  }
  for (const ref of refs) {
    const file = await resolveImageAssetFile(ref, 'reference.png')
    form.append('image[]', file)
  }
  if (mask) {
    const file = await resolveImageAssetFile(mask, 'mask.png')
    form.append('mask', file)
  }
  return form
}

async function resolveImageAssetFile(value: string, fallbackName: string) {
  const asset = await resolveImageAsset(value)
  const buffer = Buffer.from(asset.base64Data, 'base64')
  const ext = asset.mimeType === 'image/jpeg' ? '.jpg' : asset.mimeType === 'image/webp' ? '.webp' : '.png'
  return new File([buffer], fallbackName.replace(/\.[^.]+$/, ext), { type: asset.mimeType })
}

function normalizeOpenAIOutputFormat(value?: string) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return undefined
  if (raw === 'image/png') return 'png'
  if (raw === 'image/jpeg' || raw === 'jpg') return 'jpeg'
  if (raw === 'image/webp') return 'webp'
  return raw
}

function extractOpenAIImageResponse(result: any): Array<{ data: string; mimeType: string }> {
  if (!Array.isArray(result?.data)) return []
  const outputFormat = normalizeOpenAIOutputFormat(result?.output_format || result?.data?.[0]?.output_format)
  const mimeType = outputFormat === 'jpeg'
    ? 'image/jpeg'
    : outputFormat === 'webp'
      ? 'image/webp'
      : 'image/png'
  return result.data
    .map((item: any) => String(item?.b64_json || '').trim())
    .filter(Boolean)
    .map((data: string) => ({ data, mimeType }))
}

function cleanUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cleanUndefinedDeep) as T
  if (!value || typeof value !== 'object') return value
  for (const key of Object.keys(value as Record<string, any>)) {
    const current = (value as Record<string, any>)[key]
    if (current === undefined || current === null || current === '') {
      delete (value as Record<string, any>)[key]
    } else {
      ;(value as Record<string, any>)[key] = cleanUndefinedDeep(current)
      if (
        (value as Record<string, any>)[key] &&
        typeof (value as Record<string, any>)[key] === 'object' &&
        !Array.isArray((value as Record<string, any>)[key]) &&
        Object.keys((value as Record<string, any>)[key]).length === 0
      ) {
        delete (value as Record<string, any>)[key]
      }
    }
  }
  return value
}

export async function generateZenmuxVideoDirect(config: AIConfig, params: {
  model?: string | null
  prompt?: string | null
  imageUrl?: string | null
  firstFrameUrl?: string | null
  lastFrameUrl?: string | null
  referenceImageUrls?: string[]
  referenceVideoUrls?: string[]
  referenceAudioUrls?: string[]
  duration?: number | null
  aspectRatio?: string | null
  resolution?: string | null
  fps?: number | null
  seed?: number | null
  generateAudio?: boolean | null
  negativePrompt?: string | null
  enhancePrompt?: boolean | null
  personGeneration?: string | null
  numberOfVideos?: number | null
}): Promise<{ localPath: string; duration: number; aspectRatio: string; resolution: string }> {
  const client = clientFor(config)
  const model = String(params.model || config.model || '').trim()
  const refs = [
    params.imageUrl,
    params.firstFrameUrl,
    ...(params.referenceImageUrls || []),
  ].map(item => String(item || '').trim()).filter(Boolean)
  const firstImage = refs[0] ? await resolveImageAsset(refs[0]) : undefined
  const lastFrame = params.lastFrameUrl ? await resolveImageAsset(params.lastFrameUrl) : undefined

  let operation = await client.models.generateVideos({
    model,
    prompt: params.prompt || '',
    ...(firstImage ? {
      image: {
        imageBytes: firstImage.base64Data,
        mimeType: firstImage.mimeType,
      },
    } : {}),
    config: {
      numberOfVideos: firstNumber(params.numberOfVideos) || 1,
      aspectRatio: normalizeZenmuxAspectRatio(params.aspectRatio, '16:9'),
      durationSeconds: normalizeZenmuxVideoDuration(params.duration),
      resolution: normalizeZenmuxVideoResolution(params.resolution),
      ...(lastFrame ? {
        lastFrame: {
          imageBytes: lastFrame.base64Data,
          mimeType: lastFrame.mimeType,
        },
      } : {}),
      ...(firstNumber(params.fps) ? { fps: firstNumber(params.fps) } : {}),
      ...(firstNumber(params.seed) !== undefined ? { seed: firstNumber(params.seed) } : {}),
      ...(params.generateAudio !== undefined && params.generateAudio !== null ? { generateAudio: params.generateAudio } : {}),
      ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
      ...(params.enhancePrompt !== undefined && params.enhancePrompt !== null ? { enhancePrompt: params.enhancePrompt } : {}),
      ...(params.personGeneration ? { personGeneration: params.personGeneration } : {}),
    } as any,
  })

  const maxAttempts = 48
  for (let attempt = 0; attempt < maxAttempts && !operation.done; attempt += 1) {
    await new Promise(resolve => setTimeout(resolve, 10000))
    operation = await client.operations.getVideosOperation({ operation })
  }

  if (!operation.done) throw new Error('ZenMux video generation timed out')
  if (operation.error) throw new Error(`ZenMux video generation failed: ${JSON.stringify(operation.error)}`)
  const uri = String(operation.response?.generatedVideos?.[0]?.video?.uri || '').trim()
  if (!uri) throw new Error('ZenMux video generation completed without a video uri')

  return {
    localPath: await saveGeneratedVideoFromUri(client, uri),
    duration: normalizeZenmuxVideoDuration(params.duration),
    aspectRatio: normalizeZenmuxAspectRatio(params.aspectRatio, '16:9'),
    resolution: normalizeZenmuxVideoResolution(params.resolution),
  }
}
