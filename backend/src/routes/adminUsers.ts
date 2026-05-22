import { Hono } from 'hono'
import { and, eq, like, or, sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, notFound, now, success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { adjustUserCredits, ensureMembershipSchema, runMembershipJobs } from '../services/membership.js'

const app = new Hono()

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function pageParams(c: any) {
  return {
    page: clampInt(c.req.query('page'), 1, 1, 100000),
    pageSize: clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100),
  }
}

function currentOperator(c: any) {
  return String(c.get('authUserId') || c.get('authUser')?.id || 'admin')
}

function loginIp(c: any) {
  return String(c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '').split(',')[0]?.trim() || ''
}

function serializeUser(row: typeof schema.aiUsers.$inferSelect) {
  return toSnakeCase(row)
}

function nullableDateInput(value: any, fallback: any = null) {
  if (value === undefined) return fallback
  if (value === null || value === '') return null
  return value
}

function pickDateInput(body: any, snakeKey: string, camelKey: string, fallback: any = null) {
  if (body[snakeKey] !== undefined) return nullableDateInput(body[snakeKey], fallback)
  if (body[camelKey] !== undefined) return nullableDateInput(body[camelKey], fallback)
  return fallback
}

function userPayload(body: any, fallback?: typeof schema.aiUsers.$inferSelect) {
  return {
    name: body.name ?? fallback?.name ?? '',
    account: body.account ?? body.account_id ?? fallback?.account ?? null,
    phone: body.phone ?? fallback?.phone ?? null,
    email: body.email ?? fallback?.email ?? null,
    inviteCode: body.invite_code ?? body.inviteCode ?? fallback?.inviteCode ?? null,
    credits: Number(body.credits ?? fallback?.credits ?? 0),
    membershipCredits: Number(body.membership_credits ?? body.membershipCredits ?? fallback?.membershipCredits ?? 0),
    membershipPeriodCredits: Number(body.membership_period_credits ?? body.membershipPeriodCredits ?? fallback?.membershipPeriodCredits ?? 0),
    membershipPlanId: body.membership_plan_id ?? body.membershipPlanId ?? fallback?.membershipPlanId ?? null,
    membershipStatus: body.membership_status ?? body.membershipStatus ?? fallback?.membershipStatus ?? 'none',
    membershipStartedAt: pickDateInput(body, 'membership_started_at', 'membershipStartedAt', fallback?.membershipStartedAt ?? null),
    membershipExpiresAt: pickDateInput(body, 'membership_expires_at', 'membershipExpiresAt', fallback?.membershipExpiresAt ?? null),
    membershipNextGrantAt: pickDateInput(body, 'membership_next_grant_at', 'membershipNextGrantAt', fallback?.membershipNextGrantAt ?? null),
    membershipLastGrantAt: pickDateInput(body, 'membership_last_grant_at', 'membershipLastGrantAt', fallback?.membershipLastGrantAt ?? null),
    wxOpenid: body.wx_openid ?? body.wxOpenid ?? fallback?.wxOpenid ?? null,
    wxUnionid: body.wx_unionid ?? body.wxUnionid ?? fallback?.wxUnionid ?? null,
    wxNickname: body.wx_nickname ?? body.wxNickname ?? fallback?.wxNickname ?? null,
    wxAvatar: body.wx_avatar ?? body.wxAvatar ?? fallback?.wxAvatar ?? null,
    wxBoundAt: pickDateInput(body, 'wx_bound_at', 'wxBoundAt', fallback?.wxBoundAt ?? null),
    role: body.role ?? fallback?.role ?? 'user',
    isActive: body.is_active ?? body.isActive ?? fallback?.isActive ?? true,
  }
}

app.get('/', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const role = c.req.query('role')
  const active = c.req.query('active')
  const membershipStatus = c.req.query('membership_status') || c.req.query('membershipStatus')
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = []

  if (role) conditions.push(eq(schema.aiUsers.role, role))
  if (membershipStatus) conditions.push(eq(schema.aiUsers.membershipStatus, membershipStatus))
  if (active === '1' || active === 'true') conditions.push(eq(schema.aiUsers.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.aiUsers.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.aiUsers.id, pattern),
      like(schema.aiUsers.name, pattern),
      like(schema.aiUsers.account, pattern),
      like(schema.aiUsers.phone, pattern),
      like(schema.aiUsers.email, pattern),
      like(schema.aiUsers.wxOpenid, pattern),
      like(schema.aiUsers.wxUnionid, pattern),
      like(schema.aiUsers.wxNickname, pattern),
    )!)
  }

  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = await db.select().from(schema.aiUsers).where(where).orderBy(sql`${schema.aiUsers.createdAt} desc`).execute()
    return success(c, rows.map(serializeUser))
  }

  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.aiUsers).where(where).execute()
  const rows = await db.select().from(schema.aiUsers)
    .where(where)
    .orderBy(sql`${schema.aiUsers.createdAt} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()
  return success(c, {
    items: rows.map(serializeUser),
    pagination: { page, page_size: pageSize, total: Number(total || 0), total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)) },
  })
})

app.post('/', async (c) => {
  await ensureMembershipSchema()
  const body = await c.req.json()
  const id = String(body.id || body.account || body.phone || body.email || '').trim()
  if (!id) return badRequest(c, 'id is required')
  const ts = now()
  const operator = currentOperator(c)
  try {
    const result = await db.insert(schema.aiUsers).values({
      id,
      ...userPayload(body),
      lastLoginIp: loginIp(c) || null,
      createdBy: operator,
      createdAt: ts,
      updatedBy: operator,
      updatedAt: ts,
    }).execute()
    const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
    return created(c, serializeUser(row || { id: Number(result.insertId) } as any))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.get('/:id', async (c) => {
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, c.req.param('id'))).execute())[0]
  if (!row) return notFound(c, 'user not found')
  return success(c, serializeUser(row))
})

app.put('/:id', async (c) => {
  await ensureMembershipSchema()
  const id = c.req.param('id')
  const body = await c.req.json()
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
  if (!row) return notFound(c, 'user not found')
  const operator = currentOperator(c)
  await db.update(schema.aiUsers).set({
    ...userPayload(body, row),
    updatedBy: operator,
    updatedAt: now(),
  }).where(eq(schema.aiUsers.id, id)).execute()
  return success(c, serializeUser((await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]))
})

app.patch('/:id/status', async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]
  if (!row) return notFound(c, 'user not found')
  const isActive = body.is_active ?? body.isActive
  if (typeof isActive !== 'boolean') return badRequest(c, 'is_active is required')
  await db.update(schema.aiUsers).set({
    isActive,
    updatedBy: currentOperator(c),
    updatedAt: now(),
  }).where(eq(schema.aiUsers.id, id)).execute()
  return success(c, serializeUser((await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, id)).execute())[0]))
})

app.post('/:id/credits/adjust', async (c) => {
  await ensureMembershipSchema()
  const id = c.req.param('id')
  const body = await c.req.json()
  const amount = Number(body.amount || 0)
  if (!Number.isFinite(amount) || Math.trunc(amount) === 0) return badRequest(c, 'amount is required')
  try {
    const user = await adjustUserCredits({
      userId: id,
      amount,
      operatorId: currentOperator(c),
      description: body.description || body.reason || '后台调整积分',
      source: 'admin',
      membershipPart: Boolean(body.membership_part ?? body.membershipPart ?? false),
      metadata: { ip: loginIp(c), remark: body.remark || '' },
    })
    return success(c, serializeUser(user as any))
  } catch (error: any) {
    return badRequest(c, String(error.message || error))
  }
})

app.get('/:id/points/logs', async (c) => {
  const id = c.req.param('id')
  const type = String(c.req.query('type') || '').trim()
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = [eq(schema.pointsLogs.userId, id)]
  if (type) conditions.push(eq(schema.pointsLogs.type, type))
  const where = and(...conditions)
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.pointsLogs).where(where).execute()
  const rows = await db.select().from(schema.pointsLogs)
    .where(where)
    .orderBy(sql`${schema.pointsLogs.createdAt} desc`, sql`${schema.pointsLogs.id} desc`)
    .limit(pageSize)
    .offset((page - 1) * pageSize)
    .execute()
  return success(c, {
    items: rows.map(toSnakeCase),
    pagination: { page, page_size: pageSize, total: Number(total || 0), total_pages: Math.max(1, Math.ceil(Number(total || 0) / pageSize)) },
  })
})

app.post('/membership/jobs/run', async (c) => {
  await ensureMembershipSchema()
  return success(c, await runMembershipJobs())
})

export default app
