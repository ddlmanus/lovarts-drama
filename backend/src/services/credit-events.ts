import { connectRedis, getRedisClient } from './redis.js'

export interface CreditBalanceEvent {
  userId: string
  credits: number
  amount?: number
  reason?: string
  taskType?: string | null
  relatedTaskId?: string | null
}

export async function publishCreditBalanceChanged(event: CreditBalanceEvent) {
  const redis = getRedisClient()
  if (!redis) return
  await connectRedis()
  await redis.publish(`credits:${event.userId}`, JSON.stringify({
    type: 'credits.changed',
    ...event,
    ts: new Date().toISOString(),
  }))
}
