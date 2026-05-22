import { Hono } from 'hono'
import { currentAuthUserId } from '../utils/auth.js'
import { getRedisClient } from '../services/redis.js'

const app = new Hono()

app.get('/credits', async (c) => {
  const userId = currentAuthUserId(c)
  const redis = getRedisClient()
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let closed = false
      let timer: ReturnType<typeof setInterval> | null = null
      let subscriber: NonNullable<ReturnType<typeof getRedisClient>> | null = null

      const send = (payload: any) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`))
        } catch {
          closed = true
        }
      }
      const cleanup = async () => {
        if (closed) return
        closed = true
        if (timer) clearInterval(timer)
        if (subscriber) {
          await subscriber.unsubscribe(`credits:${userId}`).catch(() => undefined)
          subscriber.disconnect()
        }
        try {
          controller.close()
        } catch {
          // The client may already have closed the stream.
        }
      }

      send({ type: 'connected', userId, ts: new Date().toISOString() })

      if (!redis) {
        timer = setInterval(() => send({ type: 'heartbeat', ts: new Date().toISOString() }), 25000)
        c.req.raw.signal.addEventListener('abort', () => { void cleanup() }, { once: true })
        return
      }

      subscriber = redis.duplicate()
      await subscriber.connect()
      await subscriber.subscribe(`credits:${userId}`, (message: any) => {
        const raw = typeof message === 'string' ? message : ''
        try {
          send(JSON.parse(raw))
        } catch {
          send({ type: 'credits.changed', raw })
        }
      })
      timer = setInterval(() => send({ type: 'heartbeat', ts: new Date().toISOString() }), 25000)
      c.req.raw.signal.addEventListener('abort', () => { void cleanup() }, { once: true })
    },
    async cancel() {
      // Cleanup is driven by the request abort signal above.
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
})

export default app
