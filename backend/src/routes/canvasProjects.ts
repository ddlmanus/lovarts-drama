import { Hono } from 'hono'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, now, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'
import { ensureCanvasProjectsSchema } from '../services/canvas-projects.js'

const app = new Hono()

function makeId() {
  return `project_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function stringifyCanvasData(value: any) {
  const canvasData = value && typeof value === 'object' ? value : {}
  return JSON.stringify({
    nodes: Array.isArray(canvasData.nodes) ? canvasData.nodes : [],
    edges: Array.isArray(canvasData.edges) ? canvasData.edges : [],
    viewport: canvasData.viewport && typeof canvasData.viewport === 'object'
      ? canvasData.viewport
      : { x: 100, y: 50, zoom: 0.8 },
  })
}

function cleanName(value: unknown) {
  return String(value || '未命名项目').trim().slice(0, 120) || '未命名项目'
}

function serialize(row: typeof schema.canvasProjects.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    thumbnail: row.thumbnail || '',
    canvasData: parseJson(row.canvasData, { nodes: [], edges: [], viewport: { x: 100, y: 50, zoom: 0.8 } }),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function projectWhere(userId: string, id: string) {
  return and(
    eq(schema.canvasProjects.id, id),
    eq(schema.canvasProjects.userId, userId),
    isNull(schema.canvasProjects.deletedAt),
  )
}

app.use('*', async (_c, next) => {
  await ensureCanvasProjectsSchema()
  await next()
})

app.get('/', async (c) => {
  const userId = currentAuthUserId(c)
  const rows = await db.select().from(schema.canvasProjects)
    .where(and(eq(schema.canvasProjects.userId, userId), isNull(schema.canvasProjects.deletedAt)))
    .orderBy(desc(schema.canvasProjects.updatedAt))
    .execute()
  return success(c, rows.map(serialize))
})

app.get('/:id', async (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const [row] = await db.select().from(schema.canvasProjects).where(projectWhere(userId, id)).execute()
  if (!row) return badRequest(c, 'canvas project not found')
  return success(c, serialize(row))
})

app.post('/', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const ts = now()
  const id = String(body.id || makeId()).trim().slice(0, 64)
  const [existing] = await db.select().from(schema.canvasProjects).where(eq(schema.canvasProjects.id, id)).execute()
  if (existing) return badRequest(c, 'canvas project id already exists')

  await db.insert(schema.canvasProjects).values({
    id,
    userId,
    name: cleanName(body.name),
    thumbnail: String(body.thumbnail || '').slice(0, 1000),
    canvasData: stringifyCanvasData(body.canvasData),
    createdBy: userId,
    createdAt: ts,
    updatedBy: userId,
    updatedAt: ts,
  }).execute()

  const [row] = await db.select().from(schema.canvasProjects).where(projectWhere(userId, id)).execute()
  return created(c, serialize(row))
})

app.put('/:id', async (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const [row] = await db.select().from(schema.canvasProjects).where(projectWhere(userId, id)).execute()
  if (!row) return badRequest(c, 'canvas project not found')

  const patch: Partial<typeof schema.canvasProjects.$inferInsert> = {
    updatedBy: userId,
    updatedAt: now(),
  }
  if (body.name !== undefined) patch.name = cleanName(body.name)
  if (body.thumbnail !== undefined) patch.thumbnail = String(body.thumbnail || '').slice(0, 1000)
  if (body.canvasData !== undefined) patch.canvasData = stringifyCanvasData(body.canvasData)

  await db.update(schema.canvasProjects).set(patch).where(projectWhere(userId, id)).execute()
  const [updated] = await db.select().from(schema.canvasProjects).where(projectWhere(userId, id)).execute()
  return success(c, serialize(updated))
})

app.delete('/:id', async (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const [row] = await db.select().from(schema.canvasProjects).where(projectWhere(userId, id)).execute()
  if (!row) return badRequest(c, 'canvas project not found')
  await db.update(schema.canvasProjects).set({
    deletedBy: userId,
    deletedAt: now(),
    isDeleted: true,
    updatedBy: userId,
    updatedAt: now(),
  }).where(projectWhere(userId, id)).execute()
  return success(c)
})

export default app
