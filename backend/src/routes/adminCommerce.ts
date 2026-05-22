import { Hono } from 'hono'
import { and, eq, like, or, sql } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, mysqlDateTime, notFound, now, success } from '../utils/response.js'
import { toSnakeCase } from '../utils/transform.js'
import { activateOrder, ORDER_STATUS } from '../services/payment.js'

const app = new Hono()

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function stringifyJson(value: any) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    try {
      JSON.parse(trimmed)
      return trimmed
    } catch {
      return JSON.stringify({ value: trimmed })
    }
  }
  return JSON.stringify(value)
}

function normalizeNullableDateTime(value: any, fallback: string | null = null) {
  if (value === undefined) return fallback
  if (value === null || value === '') return null
  return mysqlDateTime(value) || fallback
}

function pageParams(c: any) {
  return {
    page: clampInt(c.req.query('page'), 1, 1, 100000),
    pageSize: clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100),
  }
}

function paged(c: any, items: any[], total: number, page: number, pageSize: number) {
  return success(c, {
    items,
    pagination: { page, page_size: pageSize, total, total_pages: Math.max(1, Math.ceil(total / pageSize)) },
  })
}

function codeFrom(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || `item_${Date.now()}`
}

function serializePaymentConfig(row: typeof schema.paymentConfigs.$inferSelect) {
  return {
    ...toSnakeCase(row),
    api_key: row.apiKey ? '********' : '',
    api_secret: row.apiSecret ? '********' : '',
    config: parseJson(row.config, {}),
  }
}

function serializeOrder(row: typeof schema.orders.$inferSelect) {
  return {
    ...toSnakeCase(row),
    metadata: parseJson(row.metadata, {}),
  }
}

function serializeMembershipPlan(row: typeof schema.membershipPlans.$inferSelect) {
  return {
    ...toSnakeCase(row),
    metadata: parseJson(row.metadata, {}),
  }
}

function membershipPayload(body: any, fallback?: typeof schema.membershipPlans.$inferSelect) {
  return {
    name: body.name || fallback?.name || '',
    code: codeFrom(body.code || fallback?.code || body.name || fallback?.name || ''),
    description: body.description ?? fallback?.description ?? '',
    planType: body.plan_type ?? body.planType ?? fallback?.planType ?? 'creator',
    billingCycle: body.billing_cycle ?? body.billingCycle ?? fallback?.billingCycle ?? 'yearly',
    price: Number(body.price ?? fallback?.price ?? 0),
    originalPrice: Number(body.original_price ?? body.originalPrice ?? fallback?.originalPrice ?? 0),
    credits: Number(body.credits ?? fallback?.credits ?? 0),
    durationDays: Number(body.duration_days ?? body.durationDays ?? fallback?.durationDays ?? 30),
    badge: body.badge ?? fallback?.badge ?? '',
    subtitle: body.subtitle ?? fallback?.subtitle ?? '',
    metadata: stringifyJson(body.metadata ?? fallback?.metadata ?? {}),
    sortOrder: Number(body.sort_order ?? body.sortOrder ?? fallback?.sortOrder ?? 0),
    isActive: body.is_active ?? body.isActive ?? fallback?.isActive ?? true,
  }
}

app.get('/membership-plans', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const active = c.req.query('active')
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = []
  if (active === '1' || active === 'true') conditions.push(eq(schema.membershipPlans.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.membershipPlans.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.membershipPlans.name, pattern),
      like(schema.membershipPlans.code, pattern),
      like(schema.membershipPlans.description, pattern),
    )!)
  }
  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = (await db.select().from(schema.membershipPlans).where(where).orderBy(schema.membershipPlans.sortOrder, schema.membershipPlans.id).execute())
    return success(c, rows.map(serializeMembershipPlan))
  }
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.membershipPlans).where(where).execute()
  const rows = await db.select().from(schema.membershipPlans).where(where).orderBy(schema.membershipPlans.sortOrder, schema.membershipPlans.id).limit(pageSize).offset((page - 1) * pageSize).execute()
  return paged(c, rows.map(serializeMembershipPlan), Number(total || 0), page, pageSize)
})

app.post('/membership-plans', async (c) => {
  const body = await c.req.json()
  const name = String(body.name || '').trim()
  if (!name) return badRequest(c, 'name is required')
  const ts = now()
  const payload = membershipPayload(body)
  const result = await db.insert(schema.membershipPlans).values({
    ...payload,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, Number(result.insertId))).execute())[0]
  return created(c, serializeMembershipPlan(row))
})

app.put('/membership-plans/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const row = (await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, id)).execute())[0]
  if (!row) return notFound(c, 'membership plan not found')
  db.update(schema.membershipPlans).set({
    ...membershipPayload(body, row),
    updatedAt: now(),
  }).where(eq(schema.membershipPlans.id, id)).execute()
  return success(c, serializeMembershipPlan((await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, id)).execute())[0]))
})

app.delete('/membership-plans/:id', async (c) => {
  await db.delete(schema.membershipPlans).where(eq(schema.membershipPlans.id, Number(c.req.param('id')))).execute()
  return success(c)
})

app.get('/credit-packages', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const active = c.req.query('active')
  const all = c.req.query('all') === '1' || c.req.query('all') === 'true'
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = []
  if (active === '1' || active === 'true') conditions.push(eq(schema.creditPackages.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.creditPackages.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.creditPackages.name, pattern),
      like(schema.creditPackages.code, pattern),
      like(schema.creditPackages.description, pattern),
    )!)
  }
  const where = conditions.length ? and(...conditions) : undefined
  if (all) {
    const rows = (await db.select().from(schema.creditPackages).where(where).orderBy(schema.creditPackages.sortOrder, schema.creditPackages.id).execute())
    return success(c, rows.map(toSnakeCase))
  }
  const [{ total }] = await db.select({ total: sql<number>`count(*)` }).from(schema.creditPackages).where(where).execute()
  const rows = await db.select().from(schema.creditPackages).where(where).orderBy(schema.creditPackages.sortOrder, schema.creditPackages.id).limit(pageSize).offset((page - 1) * pageSize).execute()
  return paged(c, rows.map(toSnakeCase), Number(total || 0), page, pageSize)
})

app.post('/credit-packages', async (c) => {
  const body = await c.req.json()
  const name = String(body.name || '').trim()
  if (!name) return badRequest(c, 'name is required')
  const ts = now()
  const result = await db.insert(schema.creditPackages).values({
    name,
    code: codeFrom(body.code || name),
    description: body.description || '',
    price: Number(body.price || 0),
    credits: Number(body.credits || 0),
    bonusCredits: Number(body.bonus_credits ?? body.bonusCredits ?? 0),
    sortOrder: Number(body.sort_order ?? body.sortOrder ?? 0),
    isActive: body.is_active ?? body.isActive ?? true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.creditPackages).where(eq(schema.creditPackages.id, Number(result.insertId))).execute())[0]
  return created(c, toSnakeCase(row))
})

app.put('/credit-packages/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const row = (await db.select().from(schema.creditPackages).where(eq(schema.creditPackages.id, id)).execute())[0]
  if (!row) return notFound(c, 'credit package not found')
  db.update(schema.creditPackages).set({
    name: body.name || row.name,
    code: codeFrom(body.code || row.code),
    description: body.description ?? row.description,
    price: Number(body.price ?? row.price ?? 0),
    credits: Number(body.credits ?? row.credits ?? 0),
    bonusCredits: Number(body.bonus_credits ?? body.bonusCredits ?? row.bonusCredits ?? 0),
    sortOrder: Number(body.sort_order ?? body.sortOrder ?? row.sortOrder ?? 0),
    isActive: body.is_active ?? body.isActive ?? row.isActive ?? true,
    updatedAt: now(),
  }).where(eq(schema.creditPackages.id, id)).execute()
  return success(c, toSnakeCase((await db.select().from(schema.creditPackages).where(eq(schema.creditPackages.id, id)).execute())[0]))
})

app.delete('/credit-packages/:id', async (c) => {
  await db.delete(schema.creditPackages).where(eq(schema.creditPackages.id, Number(c.req.param('id')))).execute()
  return success(c)
})

app.get('/orders', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const userId = c.req.query('user_id')
  const type = c.req.query('type')
  const status = c.req.query('status')
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = []
  if (userId) conditions.push(eq(schema.orders.userId, userId))
  if (type) conditions.push(eq(schema.orders.type, type))
  if (status) conditions.push(eq(schema.orders.status, status))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.orders.orderNo, pattern),
      like(schema.orders.userId, pattern),
      like(schema.orders.itemName, pattern),
      like(schema.orders.transactionId, pattern),
    )!)
  }
  const where = conditions.length ? and(...conditions) : undefined
  const [{ total }] = (await db.select({ total: sql<number>`count(*)` }).from(schema.orders).where(where).execute())
  const rows = await db.select().from(schema.orders).where(where).orderBy(sql`${schema.orders.id} desc`).limit(pageSize).offset((page - 1) * pageSize).execute()
  return paged(c, rows.map(serializeOrder), Number(total || 0), page, pageSize)
})

app.post('/orders', async (c) => {
  const body = await c.req.json()
  const userId = String(body.user_id || body.userId || '').trim()
  const type = String(body.type || '').trim()
  if (!userId || !type) return badRequest(c, 'user_id and type are required')
  const ts = now()
  const result = await db.insert(schema.orders).values({
    orderNo: body.order_no || body.orderNo || `ORD${Date.now()}`,
    userId,
    type,
    itemId: body.item_id ?? body.itemId ?? null,
    itemName: body.item_name ?? body.itemName ?? '',
    amount: Number(body.amount || 0),
    credits: Number(body.credits || 0),
    status: body.status || 'pending',
    paymentProvider: body.payment_provider ?? body.paymentProvider ?? '',
    paymentChannel: body.payment_channel ?? body.paymentChannel ?? '',
    transactionId: body.transaction_id ?? body.transactionId ?? '',
    metadata: stringifyJson(body.metadata),
    paidAt: normalizeNullableDateTime(body.paid_at ?? body.paidAt, null),
    expiresAt: normalizeNullableDateTime(body.expires_at ?? body.expiresAt, null),
    offlineVoucherUrl: body.offline_voucher_url ?? body.offlineVoucherUrl ?? null,
    offlineRemark: body.offline_remark ?? body.offlineRemark ?? null,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.orders).where(eq(schema.orders.id, Number(result.insertId))).execute())[0]
  return created(c, serializeOrder(row))
})

app.put('/orders/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const row = (await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0]
  if (!row) return notFound(c, 'order not found')
  const nextStatus = body.status ?? row.status
  if (nextStatus === ORDER_STATUS.PAID && row.status !== ORDER_STATUS.PAID) {
    const activated = await activateOrder(id, {
      paymentMethod: body.payment_provider ?? body.paymentProvider ?? row.paymentProvider,
      paymentRef: body.transaction_id ?? body.transactionId ?? row.transactionId,
      paymentData: body.metadata === undefined ? parseJson(row.metadata, {}) : body.metadata,
    })
    return success(c, serializeOrder(activated))
  }
  await db.update(schema.orders).set({
    userId: body.user_id ?? body.userId ?? row.userId,
    type: body.type ?? row.type,
    itemId: body.item_id ?? body.itemId ?? row.itemId,
    itemName: body.item_name ?? body.itemName ?? row.itemName,
    amount: Number(body.amount ?? row.amount ?? 0),
    credits: Number(body.credits ?? row.credits ?? 0),
    status: nextStatus,
    paymentProvider: body.payment_provider ?? body.paymentProvider ?? row.paymentProvider,
    paymentChannel: body.payment_channel ?? body.paymentChannel ?? row.paymentChannel,
    transactionId: body.transaction_id ?? body.transactionId ?? row.transactionId,
    metadata: body.metadata === undefined ? row.metadata : stringifyJson(body.metadata),
    paidAt: normalizeNullableDateTime(body.paid_at ?? body.paidAt, row.paidAt),
    expiresAt: normalizeNullableDateTime(body.expires_at ?? body.expiresAt, row.expiresAt),
    offlineVoucherUrl: body.offline_voucher_url ?? body.offlineVoucherUrl ?? row.offlineVoucherUrl,
    offlineRemark: body.offline_remark ?? body.offlineRemark ?? row.offlineRemark,
    updatedAt: now(),
  }).where(eq(schema.orders.id, id)).execute()
  return success(c, serializeOrder((await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0]))
})

app.delete('/orders/:id', async (c) => {
  await db.delete(schema.orders).where(eq(schema.orders.id, Number(c.req.param('id')))).execute()
  return success(c)
})

app.get('/payment-configs', async (c) => {
  const keyword = String(c.req.query('keyword') || '').trim()
  const provider = c.req.query('provider')
  const active = c.req.query('active')
  const { page, pageSize } = pageParams(c)
  const conditions: any[] = []
  if (provider) conditions.push(eq(schema.paymentConfigs.provider, provider))
  if (active === '1' || active === 'true') conditions.push(eq(schema.paymentConfigs.isActive, true))
  if (active === '0' || active === 'false') conditions.push(eq(schema.paymentConfigs.isActive, false))
  if (keyword) {
    const pattern = `%${keyword}%`
    conditions.push(or(
      like(schema.paymentConfigs.name, pattern),
      like(schema.paymentConfigs.provider, pattern),
      like(schema.paymentConfigs.appId, pattern),
      like(schema.paymentConfigs.merchantId, pattern),
    )!)
  }
  const where = conditions.length ? and(...conditions) : undefined
  const [{ total }] = (await db.select({ total: sql<number>`count(*)` }).from(schema.paymentConfigs).where(where).execute())
  const rows = await db.select().from(schema.paymentConfigs).where(where).orderBy(sql`${schema.paymentConfigs.isDefault} desc`, schema.paymentConfigs.provider, schema.paymentConfigs.id).limit(pageSize).offset((page - 1) * pageSize).execute()
  return paged(c, rows.map(serializePaymentConfig), Number(total || 0), page, pageSize)
})

app.post('/payment-configs', async (c) => {
  const body = await c.req.json()
  const provider = String(body.provider || '').trim()
  const name = String(body.name || '').trim()
  if (!provider || !name) return badRequest(c, 'provider and name are required')
  const ts = now()
  if (body.is_default || body.isDefault) {
    await db.update(schema.paymentConfigs).set({ isDefault: false, updatedAt: ts }).where(eq(schema.paymentConfigs.provider, provider)).execute()
  }
  const result = await db.insert(schema.paymentConfigs).values({
    provider,
    name,
    appId: body.app_id ?? body.appId ?? '',
    merchantId: body.merchant_id ?? body.merchantId ?? '',
    apiKey: body.api_key && body.api_key !== '********' ? body.api_key : '',
    apiSecret: body.api_secret && body.api_secret !== '********' ? body.api_secret : '',
    notifyUrl: body.notify_url ?? body.notifyUrl ?? '',
    returnUrl: body.return_url ?? body.returnUrl ?? '',
    config: stringifyJson(body.config),
    isDefault: body.is_default ?? body.isDefault ?? false,
    isActive: body.is_active ?? body.isActive ?? true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const row = (await db.select().from(schema.paymentConfigs).where(eq(schema.paymentConfigs.id, Number(result.insertId))).execute())[0]
  return created(c, serializePaymentConfig(row))
})

app.put('/payment-configs/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const body = await c.req.json()
  const row = (await db.select().from(schema.paymentConfigs).where(eq(schema.paymentConfigs.id, id)).execute())[0]
  if (!row) return notFound(c, 'payment config not found')
  const provider = String(body.provider || row.provider).trim()
  if (body.is_default || body.isDefault) {
    await db.update(schema.paymentConfigs).set({ isDefault: false, updatedAt: now() }).where(eq(schema.paymentConfigs.provider, provider)).execute()
  }
  db.update(schema.paymentConfigs).set({
    provider,
    name: body.name || row.name,
    appId: body.app_id ?? body.appId ?? row.appId,
    merchantId: body.merchant_id ?? body.merchantId ?? row.merchantId,
    apiKey: body.api_key && body.api_key !== '********' ? body.api_key : row.apiKey,
    apiSecret: body.api_secret && body.api_secret !== '********' ? body.api_secret : row.apiSecret,
    notifyUrl: body.notify_url ?? body.notifyUrl ?? row.notifyUrl,
    returnUrl: body.return_url ?? body.returnUrl ?? row.returnUrl,
    config: body.config === undefined ? row.config : stringifyJson(body.config),
    isDefault: body.is_default ?? body.isDefault ?? row.isDefault ?? false,
    isActive: body.is_active ?? body.isActive ?? row.isActive ?? true,
    updatedAt: now(),
  }).where(eq(schema.paymentConfigs.id, id)).execute()
  return success(c, serializePaymentConfig((await db.select().from(schema.paymentConfigs).where(eq(schema.paymentConfigs.id, id)).execute())[0]))
})

app.delete('/payment-configs/:id', async (c) => {
  await db.delete(schema.paymentConfigs).where(eq(schema.paymentConfigs.id, Number(c.req.param('id')))).execute()
  return success(c)
})

export default app
