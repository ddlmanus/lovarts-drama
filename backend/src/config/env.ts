import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const index = trimmed.indexOf('=')
    if (index <= 0) continue
    const key = trimmed.slice(0, index).trim()
    let value = trimmed.slice(index + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(path.resolve(__dirname, '../../../.env'))
loadEnvFile(path.resolve(__dirname, '../../.env'))

function parseMysqlUrl(rawUrl?: string) {
  if (!rawUrl) return null
  try {
    const url = new URL(rawUrl)
    if (!['mysql:', 'mysql2:'].includes(url.protocol)) return null
    return {
      host: url.hostname || undefined,
      port: url.port ? Number(url.port) : undefined,
      user: decodeURIComponent(url.username || ''),
      password: decodeURIComponent(url.password || ''),
      database: decodeURIComponent(url.pathname.replace(/^\/+/, '') || ''),
      ssl: ['true', '1', 'yes'].includes(String(url.searchParams.get('ssl') || url.searchParams.get('useSSL') || '').toLowerCase()),
      timezone: normalizeMysqlTimezone(url.searchParams.get('serverTimezone') || undefined),
      connectTimeout: url.searchParams.get('connectTimeout') ? Number(url.searchParams.get('connectTimeout')) : undefined,
    }
  } catch {
    return null
  }
}

function normalizeMysqlTimezone(value?: string) {
  if (!value) return undefined
  if (value === 'Asia/Shanghai') return '+08:00'
  return value
}

const databaseUrl = parseMysqlUrl(process.env.DATABASE_URL)

export const env = {
  database: {
    driver: process.env.DB_DRIVER || 'mysql',
    mysql: {
      host: process.env.MYSQL_HOST || process.env.DB_HOST || databaseUrl?.host || '127.0.0.1',
      port: Number(process.env.MYSQL_PORT || process.env.DB_PORT || databaseUrl?.port || 3306),
      user: process.env.MYSQL_USER || process.env.DB_USER || databaseUrl?.user || 'root',
      password: process.env.MYSQL_PASSWORD || process.env.DB_PASSWORD || databaseUrl?.password || '',
      database: process.env.MYSQL_DATABASE || process.env.DB_NAME || databaseUrl?.database || 'huobao',
      connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
      connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT || databaseUrl?.connectTimeout || 60000),
      ssl: ['1', 'true', 'yes'].includes(String(process.env.MYSQL_SSL || databaseUrl?.ssl || '').toLowerCase()),
      timezone: normalizeMysqlTimezone(process.env.MYSQL_TIMEZONE) || databaseUrl?.timezone || '+08:00',
    },
  },
  redis: {
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB || 0),
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'huobao:',
    connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT || 30000),
    tls: ['1', 'true', 'yes'].includes(String(process.env.REDIS_TLS || '').toLowerCase()),
    maxRetriesPerRequest: Number(process.env.REDIS_MAX_RETRIES_PER_REQUEST || 2),
  },
  storage: {
    driver: process.env.STORAGE_DRIVER || 'local',
    publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || process.env.OSS_PUBLIC_BASE_URL || '',
    aliyunOss: {
      region: process.env.OSS_REGION || process.env.ALIYUN_OSS_REGION || '',
      bucket: process.env.OSS_BUCKET || process.env.ALIYUN_OSS_BUCKET || '',
      endpoint: process.env.OSS_ENDPOINT || process.env.ALIYUN_OSS_ENDPOINT || '',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID || process.env.ALIYUN_ACCESS_KEY_ID || '',
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET || process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    },
  },
}
