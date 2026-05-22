import { Hono } from 'hono'
import { eq, isNull, and } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { success, badRequest, now } from '../utils/response.js'
import { toSnakeCaseArray, toSnakeCase } from '../utils/transform.js'

const app = new Hono()

// GET /agent-configs
app.get('/', async (c) => {
  const rows = await db.select().from(schema.agentConfigs)
    .where(isNull(schema.agentConfigs.deletedAt)).execute()
  return success(c, toSnakeCaseArray(rows))
})

// GET /agent-configs/:id
app.get('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const [row] = await db.select().from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.id, id)).execute()
  if (!row) return badRequest(c, 'Not found')
  return success(c, toSnakeCase(row))
})

// POST /agent-configs (upsert by agent_type)
app.post('/', async (c) => {
  const body = await c.req.json()
  if (!body.agent_type) return badRequest(c, 'agent_type required')
  const ts = now()

  // Check if exists (including soft-deleted)
  const [existing] = await db.select().from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.agentType, body.agent_type)).execute()

  if (existing) {
    // Update existing
    await db.update(schema.agentConfigs).set({
      name: body.name || existing.name,
      model: body.model ?? existing.model,
      systemPrompt: body.system_prompt ?? existing.systemPrompt,
      temperature: body.temperature ?? existing.temperature,
      maxTokens: body.max_tokens ?? existing.maxTokens,
      maxIterations: body.max_iterations ?? existing.maxIterations,
      isActive: body.is_active ?? true,
      deletedAt: null,
      updatedAt: ts,
    }).where(eq(schema.agentConfigs.id, existing.id)).execute()
    const [row] = await db.select().from(schema.agentConfigs).where(eq(schema.agentConfigs.id, existing.id)).execute()
    return success(c, toSnakeCase(row))
  }

  const res = await db.insert(schema.agentConfigs).values({
    agentType: body.agent_type,
    name: body.name || '',
    description: body.description || '',
    model: body.model || '',
    systemPrompt: body.system_prompt || '',
    temperature: body.temperature ?? 0.7,
    maxTokens: body.max_tokens ?? 4096,
    maxIterations: body.max_iterations ?? 10,
    isActive: body.is_active ?? true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const [result] = await db.select().from(schema.agentConfigs)
    .where(eq(schema.agentConfigs.id, Number(res.insertId))).execute()
  return success(c, toSnakeCase(result))
})

// PUT /agent-configs/:id
app.put('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const updates: Record<string, any> = { updatedAt: now() }

  if ('model' in body) updates.model = body.model
  if ('temperature' in body) updates.temperature = body.temperature
  if ('max_tokens' in body) updates.maxTokens = body.max_tokens
  if ('max_iterations' in body) updates.maxIterations = body.max_iterations
  if ('is_active' in body) updates.isActive = body.is_active
  if ('system_prompt' in body) updates.systemPrompt = body.system_prompt
  if ('name' in body) updates.name = body.name
  if ('description' in body) updates.description = body.description

  await db.update(schema.agentConfigs).set(updates).where(eq(schema.agentConfigs.id, id)).execute()
  const [row] = await db.select().from(schema.agentConfigs).where(eq(schema.agentConfigs.id, id)).execute()
  return success(c, toSnakeCase(row))
})

// DELETE /agent-configs/:id
app.delete('/:id', async (c) => {
  const id = Number(c.req.param('id'))
  await db.update(schema.agentConfigs).set({ deletedAt: now() }).where(eq(schema.agentConfigs.id, id)).execute()
  return success(c)
})

export default app
