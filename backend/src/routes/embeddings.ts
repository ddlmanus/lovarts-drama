import { Hono } from 'hono'
import { createEmbedding } from '../services/embeddings.js'
import { badRequest, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

app.post('/', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const input = body.input
  const validInput = typeof input === 'string' || (Array.isArray(input) && input.every(item => typeof item === 'string'))
  if (!validInput) return badRequest(c, 'input must be a string or string array')

  try {
    const result = await createEmbedding({
      model: body.model,
      input,
      dimensions: body.dimensions ? Number(body.dimensions) : undefined,
      encodingFormat: body.encoding_format ?? body.encodingFormat,
      user: body.user,
      userId: currentAuthUserId(c),
      configId: body.config_id ?? body.configId ?? null,
    })
    return success(c, result)
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

export default app
