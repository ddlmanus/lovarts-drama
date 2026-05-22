import Redis from 'ioredis'
import { env } from '../config/env.js'

let client: Redis | null | undefined

export function getRedisClient() {
  if (client !== undefined) return client
  if (!env.redis.url && !process.env.REDIS_HOST) {
    client = null
    return client
  }

  const options = {
    keyPrefix: env.redis.keyPrefix,
    lazyConnect: true,
    connectTimeout: env.redis.connectTimeout,
    maxRetriesPerRequest: env.redis.maxRetriesPerRequest,
    tls: env.redis.tls ? {} : undefined,
  }

  client = env.redis.url
    ? new Redis(env.redis.url, options)
    : new Redis({
        ...options,
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password || undefined,
        db: env.redis.db,
      })

  client.on('error', (err) => {
    console.warn('[redis] connection error:', err.message)
  })
  return client
}

export async function connectRedis() {
  const redis = getRedisClient()
  if (!redis || redis.status === 'ready') return redis
  await redis.connect()
  return redis
}

export async function redisGetJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient()
  if (!redis) return null
  if (redis.status !== 'ready') await redis.connect()
  const raw = await redis.get(key)
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

export async function redisSetJson(key: string, value: unknown, ttlSeconds?: number) {
  const redis = getRedisClient()
  if (!redis) return
  if (redis.status !== 'ready') await redis.connect()
  const raw = JSON.stringify(value)
  if (ttlSeconds && ttlSeconds > 0) await redis.set(key, raw, 'EX', ttlSeconds)
  else await redis.set(key, raw)
}
