export type ZenMuxProtocol = 'openai-chat' | 'openai-image' | 'vertex-image' | 'vertex-video' | 'vertex-gemini'

function trimTrailingSlashes(value: string): string {
  return value.replace(/\/+$/, '')
}

function parseUrlSafely(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

export function isZenmuxProviderKey(value?: string | null): boolean {
  const normalized = String(value || '').trim().toLowerCase()
  return normalized === 'zenmux' || normalized === 'zenmux_ai' || normalized === 'zenmux-ai'
}

export function isZenmuxBaseUrl(value?: string | null): boolean {
  return String(value || '').trim().toLowerCase().includes('zenmux.ai')
}

export function isZenmuxProvider(provider?: { provider?: string | null; baseUrl?: string | null } | null): boolean {
  return isZenmuxProviderKey(provider?.provider) || isZenmuxBaseUrl(provider?.baseUrl)
}

export function normalizeZenmuxOpenAIBaseUrl(url?: string | null): string {
  const raw = String(url || '').trim() || 'https://zenmux.ai/api/v1'
  const parsed = parseUrlSafely(raw)
  if (!parsed) return isZenmuxBaseUrl(raw) ? 'https://zenmux.ai/api/v1' : trimTrailingSlashes(raw)
  if (!parsed.hostname.toLowerCase().includes('zenmux.ai')) return trimTrailingSlashes(parsed.toString())
  parsed.pathname = '/api/v1'
  parsed.search = ''
  parsed.hash = ''
  return trimTrailingSlashes(parsed.toString())
}

export function normalizeZenmuxVertexBaseUrl(url?: string | null): string {
  const raw = String(url || '').trim() || 'https://zenmux.ai/api/vertex-ai'
  const parsed = parseUrlSafely(raw)
  if (!parsed) return isZenmuxBaseUrl(raw) ? 'https://zenmux.ai/api/vertex-ai' : trimTrailingSlashes(raw)
  if (!parsed.hostname.toLowerCase().includes('zenmux.ai')) return trimTrailingSlashes(parsed.toString())
  parsed.pathname = '/api/vertex-ai'
  parsed.search = ''
  parsed.hash = ''
  return trimTrailingSlashes(parsed.toString())
}

export function getCanonicalZenmuxModelId(value?: string | null): string {
  const normalized = String(value || '').trim()
  if (!normalized) return ''
  const parts = normalized.split('/').filter(Boolean)
  return parts[parts.length - 1] || normalized
}

export function isZenmuxVideoModel(modelId?: string | null): boolean {
  const normalized = String(modelId || '').trim().toLowerCase()
  const canonical = getCanonicalZenmuxModelId(normalized)
  return (
    canonical.startsWith('veo-') ||
    normalized.startsWith('skyreels/') ||
    normalized.includes('generate-preview') ||
    normalized.includes('video')
  )
}

export function isZenmuxGeminiImageModel(modelId?: string | null): boolean {
  const normalized = String(modelId || '').trim().toLowerCase()
  const canonical = getCanonicalZenmuxModelId(normalized)
  return (
    normalized.startsWith('google/') &&
    (
      canonical.includes('image-preview') ||
      canonical.includes('image_generation') ||
      canonical.includes('image-generation') ||
      canonical.includes('-image')
    )
  )
}

export function resolveZenmuxProtocol(
  modelId: string,
  outputType: 'image' | 'video' | 'chat' | 'audio' | '3d' = 'image',
): ZenMuxProtocol {
  if (outputType === 'chat' || outputType === 'audio' || outputType === '3d') return 'openai-chat'
  if (outputType === 'video' || isZenmuxVideoModel(modelId)) return 'vertex-video'
  if (isZenmuxGeminiImageModel(modelId)) return 'vertex-gemini'
  return 'vertex-image'
}

export function normalizeZenmuxProtocolOverride(value?: string | null): ZenMuxProtocol | undefined {
  const raw = String(value || '').trim().toLowerCase().replace(/_/g, '-')
  if (!raw) return undefined
  if (raw === 'openai-image' || raw === 'openai-images' || raw === 'images') return 'openai-image'
  if (raw === 'openai-chat' || raw === 'chat') return 'openai-chat'
  if (raw === 'vertex-image' || raw === 'vertex-images') return 'vertex-image'
  if (raw === 'vertex-video' || raw === 'vertex-videos') return 'vertex-video'
  if (raw === 'vertex-gemini' || raw === 'gemini') return 'vertex-gemini'
  return undefined
}

export function resolveConfiguredZenmuxProtocol(
  modelId: string,
  outputType: 'image' | 'video' | 'chat' | 'audio' | '3d' = 'image',
  defaults?: Record<string, any> | null,
  capabilities?: Record<string, any> | null,
): ZenMuxProtocol {
  const override = normalizeZenmuxProtocolOverride(
    defaults?.protocol ||
    defaults?.apiProtocol ||
    defaults?.api_protocol ||
    capabilities?.protocol ||
    capabilities?.apiProtocol ||
    capabilities?.api_protocol,
  )
  return override || resolveZenmuxProtocol(modelId, outputType)
}

export function normalizeZenmuxAspectRatio(value?: string | null, fallback = '1:1'): string {
  const raw = String(value || '').trim()
  if (!raw) return fallback
  const match = raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/)
  return match ? `${match[1]}:${match[2]}` : fallback
}

export function normalizeZenmuxImageSize(value?: string | null): '1K' | '2K' | '4K' {
  const raw = String(value || '').trim().toUpperCase()
  if (raw === '4K') return '4K'
  if (raw === '2K') return '2K'
  return '1K'
}

export function normalizeZenmuxOpenAIImageSize(value?: string | null): string | undefined {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return undefined
  if (raw === 'auto') return 'auto'
  const ratioMatch = raw.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/)
  if (ratioMatch) {
    const widthRatio = Number(ratioMatch[1])
    const heightRatio = Number(ratioMatch[2])
    if (widthRatio > 0 && heightRatio > 0) {
      const ratio = widthRatio / heightRatio
      if (ratio >= 1 / 3 && ratio <= 3) {
        const roundTo16 = (size: number) => Math.max(16, Math.round(size / 16) * 16)
        if (ratio >= 1) return `${roundTo16(1024 * ratio)}x1024`
        return `1024x${roundTo16(1024 / ratio)}`
      }
    }
  }
  const match = raw.match(/^(\d+)x(\d+)$/)
  if (!match) return raw
  const width = Number(match[1])
  const height = Number(match[2])
  if (!width || !height) return raw
  return `${width}x${height}`
}

export function normalizeZenmuxImageQuality(value?: string | null): string | undefined {
  const raw = String(value || '').trim().toLowerCase()
  return raw || undefined
}

export function normalizeZenmuxImageMimeType(value?: string | null): string {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === 'image/jpeg' || raw === 'jpeg' || raw === 'jpg') return 'image/jpeg'
  if (raw === 'image/webp' || raw === 'webp') return 'image/webp'
  return 'image/png'
}

export function normalizeZenmuxVideoResolution(value?: string | null): '720p' | '1080p' | '4k' {
  const raw = String(value || '').trim().toLowerCase()
  if (raw === '4k') return '4k'
  if (raw === '1080p' || raw === 'fhd') return '1080p'
  return '720p'
}

export function normalizeZenmuxVideoDuration(value?: string | number | null): 4 | 6 | 8 {
  const numeric = typeof value === 'number' ? value : Number(String(value || '').replace(/[^\d]/g, ''))
  if (numeric === 4) return 4
  if (numeric === 6) return 6
  return 8
}
