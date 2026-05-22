/**
 * 文件存储工具 — 下载远程文件到本地
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { v4 as uuid } from 'uuid'
import OSS from 'ali-oss'
import { env } from '../config/env.js'
import dns from 'node:dns/promises'
import net from 'node:net'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_ROOT = process.env.STORAGE_PATH || path.resolve(__dirname, '../../../data/static')
const MAX_DOWNLOAD_BYTES = Number(process.env.MAX_REMOTE_FILE_BYTES || 25 * 1024 * 1024)
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_FILE_BYTES || 20 * 1024 * 1024)
let ossClient: OSS | null | undefined

function getStorageDriver() {
  return (process.env.STORAGE_DRIVER || env.storage.driver || 'local').toLowerCase()
}

function getOssClient() {
  if (ossClient !== undefined) return ossClient
  const config = env.storage.aliyunOss
  if (!config.region || !config.bucket || !config.accessKeyId || !config.accessKeySecret) {
    ossClient = null
    return ossClient
  }
  ossClient = new OSS({
    region: config.region,
    bucket: config.bucket,
    endpoint: config.endpoint || undefined,
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
  })
  return ossClient
}

function buildObjectKey(subDir: string, filename: string) {
  return `${subDir.replace(/^\/+|\/+$/g, '')}/${filename}`
}

function toPublicOssUrl(key: string, resultUrl?: string) {
  const base = env.storage.publicBaseUrl || process.env.OSS_PUBLIC_BASE_URL || ''
  if (base) return `${base.replace(/\/+$/, '')}/${key}`
  return resultUrl || key
}

async function saveBuffer(buffer: Buffer, subDir: string, filename: string) {
  const safeSubDir = sanitizeSubDir(subDir)
  const safeFilename = sanitizeFilename(filename)
  if (getStorageDriver() === 'aliyun_oss') {
    const client = getOssClient()
    if (!client) throw new Error('阿里云 OSS 未配置完整，请在系统设置中配置 region/bucket/accessKey')
    const key = buildObjectKey(safeSubDir, safeFilename)
    const result = await client.put(key, buffer)
    return toPublicOssUrl(key, result.url)
  }

  const dir = path.join(STORAGE_ROOT, safeSubDir)
  fs.mkdirSync(dir, { recursive: true })
  const filePath = path.join(dir, safeFilename)
  fs.writeFileSync(filePath, buffer)
  return `static/${safeSubDir}/${safeFilename}`
}

function sanitizeSubDir(value: string) {
  const clean = String(value || '').replace(/\\/g, '/').split('/').filter(Boolean)
    .map(part => part.replace(/[^a-zA-Z0-9_-]/g, ''))
    .filter(Boolean)
    .join('/')
  return clean || 'uploads'
}

function sanitizeFilename(value: string) {
  const ext = path.extname(value || '').toLowerCase()
  const base = path.basename(value || 'file', ext).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'file'
  return `${base}${allowedFileExt(ext) ? ext : '.bin'}`
}

function allowedFileExt(ext: string) {
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.mp4', '.webm', '.mov', '.mp3', '.wav', '.m4a', '.bin'].includes(ext)
}

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number)
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168)
      || (parts[0] === 169 && parts[1] === 254)
      || parts[0] === 0
  }
  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase()
    return normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80:')
  }
  return true
}

async function assertSafeRemoteUrl(rawUrl: string) {
  const parsed = new URL(rawUrl)
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('只允许 http/https 远程文件地址')
  if (!parsed.hostname) throw new Error('远程文件地址无效')
  const records = await dns.lookup(parsed.hostname, { all: true })
  if (!records.length || records.some(record => isPrivateIp(record.address))) {
    throw new Error('不允许下载内网或本机地址')
  }
}

/**
 * 下载远程文件到本地存储
 */
export async function downloadFile(url: string, subDir: string): Promise<string> {
  await assertSafeRemoteUrl(url)
  const ext = getExtFromUrl(url)
  const filename = `${uuid()}${ext}`

  const resp = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`)
  const contentLength = Number(resp.headers.get('content-length') || 0)
  if (contentLength > MAX_DOWNLOAD_BYTES) throw new Error('远程文件过大')

  const buffer = Buffer.from(await resp.arrayBuffer())
  if (buffer.byteLength > MAX_DOWNLOAD_BYTES) throw new Error('远程文件过大')
  return saveBuffer(buffer, subDir, filename)
}

/**
 * 保存上传的文件
 */
export async function saveUploadedFile(data: ArrayBuffer, subDir: string, originalName: string): Promise<string> {
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new Error('上传文件过大')
  const ext = path.extname(originalName).toLowerCase() || '.bin'
  if (!allowedFileExt(ext)) throw new Error('不支持的文件类型')
  const filename = `${uuid()}${ext}`
  return saveBuffer(Buffer.from(data), subDir, filename)
}

function getExtFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname
    const ext = path.extname(pathname)
    if (ext && ext.length <= 5) return ext
  } catch {}
  return '.bin'
}

/**
 * 获取本地文件的绝对路径
 */
export function getAbsolutePath(relativePath: string): string {
  if (/^https?:\/\//.test(relativePath)) return relativePath
  const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '')
  if (relativePath.startsWith('static/')) {
    return path.join(STORAGE_ROOT, '..', normalized)
  }
  return path.join(STORAGE_ROOT, normalized)
}

/**
 * 保存 Base64 编码的图片数据到本地存储
 * 用于 Gemini 等只返回 base64 数据的厂商
 */
export async function saveBase64Image(base64Data: string, mimeType: string, subDir: string): Promise<string> {
  // 从 mimeType 推断文件扩展名
  const ext = mimeTypeToExt(mimeType)
  const filename = `${uuid()}${ext}`

  const buffer = Buffer.from(base64Data, 'base64')
  if (buffer.byteLength > MAX_UPLOAD_BYTES) throw new Error('图片文件过大')
  return saveBuffer(buffer, subDir, filename)
}

export function readImageAsDataUrl(relativePath: string): string {
  if (/^https?:\/\//.test(relativePath)) {
    throw new Error('远程图片不能同步读取，请使用可公网访问 URL 直接传递给供应商')
  }
  const filePath = getAbsolutePath(relativePath)
  const buffer = fs.readFileSync(filePath)
  const ext = path.extname(filePath).toLowerCase()
  const mimeType = extToMimeType(ext)
  return `data:${mimeType};base64,${buffer.toString('base64')}`
}

export async function readImageAsCompressedDataUrl(
  relativePath: string,
  options: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  } = {},
): Promise<string> {
  if (/^https?:\/\//.test(relativePath)) return relativePath
  const filePath = getAbsolutePath(relativePath)
  const maxWidth = options.maxWidth ?? 768
  const maxHeight = options.maxHeight ?? 768
  const quality = options.quality ?? 68

  const resized = sharp(filePath).rotate().resize({
    width: maxWidth,
    height: maxHeight,
    fit: 'inside',
    withoutEnlargement: true,
  })
  const metadata = await resized.metadata()
  const output = metadata.hasAlpha
    ? await resized.flatten({ background: '#ffffff' }).jpeg({ quality, mozjpeg: true }).toBuffer()
    : await resized.jpeg({ quality, mozjpeg: true }).toBuffer()
  const mimeType = 'image/jpeg'
  return `data:${mimeType};base64,${output.toString('base64')}`
}

export function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    data: match[2],
  }
}

function mimeTypeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/jpg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
  }
  return map[mimeType] || '.png'
}

function extToMimeType(ext: string): string {
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  }
  return map[ext] || 'image/png'
}
