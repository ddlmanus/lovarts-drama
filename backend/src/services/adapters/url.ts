export function joinProviderUrl(baseUrl: string, requiredPrefix: string, path: string) {
  const normalizedBase = normalizeProviderBaseUrl(baseUrl).replace(/\/+$/, '')
  const normalizedPrefix = normalizeSegment(requiredPrefix)
  const normalizedPath = normalizeSegment(path)

  if (!normalizedBase) {
    return `${normalizedPrefix}${normalizedPath}`
  }

  try {
    const url = new URL(normalizedBase)
    const currentPath = url.pathname.replace(/\/+$/, '')
    const mergedPrefix = currentPath.endsWith(normalizedPrefix)
      ? currentPath
      : `${currentPath}${normalizedPrefix}`

    url.pathname = `${mergedPrefix}${normalizedPath}`.replace(/\/{2,}/g, '/')
    return url.toString()
  } catch {
    const basePath = normalizedBase.endsWith(normalizedPrefix)
      ? normalizedBase
      : `${normalizedBase}${normalizedPrefix}`
    return `${basePath}${normalizedPath}`
  }
}

function normalizeProviderBaseUrl(baseUrl: string) {
  const value = String(baseUrl || '').trim()
  if (/^https?:\/\/(www\.)?apimart\.ai\/?$/i.test(value)) return 'https://api.apimart.ai'
  return value
}

function normalizeSegment(segment: string) {
  if (!segment) return ''
  return segment.startsWith('/') ? segment : `/${segment}`
}
