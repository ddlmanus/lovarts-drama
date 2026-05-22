import { Hono } from 'hono'
import { desc, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, created, mysqlDateTime, notFound, now, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'
import { activateOrder, buildOrderNo, expireOrderIfNeeded, isAllinpayMethod, normalizePaymentMethod, ORDER_STATUS, parsePaymentCallback, paymentAvailability, startPayment, validatePaymentCallback } from '../services/payment.js'
import { toSnakeCase } from '../utils/transform.js'

const app = new Hono()

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function stringifyJson(value: any) {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'string') return value
  return JSON.stringify(value)
}

function clampInt(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(max, Math.max(min, Math.floor(parsed)))
}

function pagination(c: any) {
  return {
    page: clampInt(c.req.query('page'), 1, 1, 100000),
    pageSize: clampInt(c.req.query('page_size') || c.req.query('pageSize'), 20, 1, 100),
  }
}

async function ensureUser(userId: string) {
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  if (row) return row
  const ts = now()
  await db.insert(schema.aiUsers).values({
    id: userId,
    name: userId,
    role: 'user',
    credits: 0,
    membershipStatus: 'none',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  return (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
}

function serializeOrder(row: typeof schema.orders.$inferSelect) {
  return { ...toSnakeCase(row), metadata: parseJson(row.metadata, {}) }
}

function serializeMembershipPlan(row: typeof schema.membershipPlans.$inferSelect) {
  return { ...toSnakeCase(row), metadata: parseJson(row.metadata, {}) }
}

function resolveClientIp(c: any) {
  const forwarded = c.req.header('x-forwarded-for') || ''
  if (forwarded) return forwarded.split(',')[0]?.trim() || '127.0.0.1'
  return c.req.header('x-real-ip') || c.req.header('cf-connecting-ip') || '127.0.0.1'
}

function orderExpiresAt() {
  const d = new Date()
  d.setMinutes(d.getMinutes() + 30)
  return mysqlDateTime(d)
}

function callbackOk(c: any, channel: string, protocol?: string) {
  if (channel === 'alipay' || channel === 'zpay') return c.text('success')
  if (String(channel || '').startsWith('allinpay')) return c.text('success', 200, { 'content-type': 'text/plain; charset=utf-8' })
  if (channel === 'wechat') {
    if (protocol === 'V2') return c.body('<xml><return_code><![CDATA[SUCCESS]]></return_code><return_msg><![CDATA[OK]]></return_msg></xml>', 200, { 'content-type': 'application/xml; charset=utf-8' })
    return success(c, { code: 'SUCCESS', message: '成功' })
  }
  return success(c)
}

function callbackFail(c: any, channel: string, message: string, status = 500, protocol?: string) {
  if (channel === 'alipay') return c.text('failure', status)
  if (channel === 'zpay') return c.text(status >= 500 ? 'fail' : 'success', 200)
  if (String(channel || '').startsWith('allinpay')) return c.text('fail', 200, { 'content-type': 'text/plain; charset=utf-8' })
  if (channel === 'wechat') {
    if (protocol === 'V2') return c.body(`<xml><return_code><![CDATA[FAIL]]></return_code><return_msg><![CDATA[${message}]]></return_msg></xml>`, 200, { 'content-type': 'application/xml; charset=utf-8' })
    return c.json({ code: 'FAIL', message }, status)
  }
  return c.text('fail', status)
}

app.get('/membership-plans', async (c) => {
  const rows = await db.select().from(schema.membershipPlans)
    .where(eq(schema.membershipPlans.isActive, true))
    .orderBy(schema.membershipPlans.sortOrder, schema.membershipPlans.id)
    .execute()
  return success(c, rows.map(serializeMembershipPlan))
})

app.get('/credit-packages', async (c) => {
  const rows = await db.select().from(schema.creditPackages)
    .where(eq(schema.creditPackages.isActive, true))
    .orderBy(schema.creditPackages.sortOrder, schema.creditPackages.id)
    .execute()
  return success(c, rows.map(toSnakeCase))
})

app.get('/membership/status', async (c) => {
  const user = await ensureUser(currentAuthUserId(c))
  if (user.membershipStatus === 'active' && user.membershipExpiresAt && new Date(user.membershipExpiresAt) <= new Date()) {
    await db.update(schema.aiUsers).set({ membershipStatus: 'expired', updatedAt: now() }).where(eq(schema.aiUsers.id, user.id)).execute()
    const updated = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, user.id)).execute())[0]
    return success(c, toSnakeCase(updated))
  }
  return success(c, toSnakeCase(user))
})

app.get('/points/logs', async (c) => {
  const userId = currentAuthUserId(c)
  await ensureUser(userId)
  const type = String(c.req.query('type') || '').trim()
  const { page, pageSize } = pagination(c)
  const allRows = (await db.select().from(schema.pointsLogs).where(eq(schema.pointsLogs.userId, userId)).orderBy(desc(schema.pointsLogs.id)).execute())
  const filtered = type ? allRows.filter(row => row.type === type || (type === 'consume' ? row.amount < 0 : row.amount > 0)) : allRows
  return success(c, {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(toSnakeCase),
    pagination: { page, page_size: pageSize, total: filtered.length, total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
  })
})

app.get('/payment-methods', async (c) => {
  return success(c, await paymentAvailability())
})

app.get('/orders', async (c) => {
  const userId = currentAuthUserId(c)
  await ensureUser(userId)
  const type = String(c.req.query('type') || '').trim()
  const { page, pageSize } = pagination(c)
  const allRows = await db.select().from(schema.orders).where(eq(schema.orders.userId, userId)).orderBy(desc(schema.orders.id)).execute()
  const filtered = type ? allRows.filter(row => row.type === type) : allRows
  return success(c, {
    items: filtered.slice((page - 1) * pageSize, page * pageSize).map(serializeOrder),
    pagination: { page, page_size: pageSize, total: filtered.length, total_pages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
  })
})

app.post('/orders', async (c) => {
  const userId = currentAuthUserId(c)
  await ensureUser(userId)
  const body = await c.req.json()
  const type = String(body.type || '').trim()
  const itemId = Number(body.item_id || body.itemId || 0)
  if (!type || !itemId) return badRequest(c, 'type and item_id are required')

  const ts = now()
  let itemName = ''
  let amount = 0
  let credits = 0
  if (type === 'membership') {
    const plan = (await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, itemId)).execute())[0]
    if (!plan || !plan.isActive) return notFound(c, 'membership plan not found')
    itemName = plan.name
    amount = Number(plan.price || 0)
    credits = Number(plan.credits || 0)
  } else if (type === 'credit') {
    const pack = (await db.select().from(schema.creditPackages).where(eq(schema.creditPackages.id, itemId)).execute())[0]
    if (!pack || !pack.isActive) return notFound(c, 'credit package not found')
    itemName = pack.name
    amount = Number(pack.price || 0)
    credits = Number(pack.credits || 0) + Number(pack.bonusCredits || 0)
  } else {
    return badRequest(c, 'unsupported order type')
  }

  const result = await db.insert(schema.orders).values({
    orderNo: buildOrderNo(),
    userId,
    type,
    itemId,
    itemName,
    amount,
    credits,
    status: ORDER_STATUS.PENDING,
    metadata: stringifyJson({ source: 'user' }),
    expiresAt: orderExpiresAt(),
    createdAt: ts,
    updatedAt: ts,
  }).execute()
  const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, Number(result.insertId))).execute())[0]
  if (amount <= 0) {
    const activated = await activateOrder(order.id, { paymentMethod: 'free', paymentRef: order.orderNo, paymentData: { channel: 'FREE' } })
    return created(c, serializeOrder(activated))
  }
  return created(c, serializeOrder(order))
})

app.get('/orders/:id', async (c) => {
  const userId = currentAuthUserId(c)
  const id = Number(c.req.param('id'))
  const order = await expireOrderIfNeeded((await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0])
  if (!order || order.userId !== userId) return notFound(c, 'order not found')
  return success(c, serializeOrder(order))
})

app.get('/orders/:id/payment-methods', async (c) => {
  const userId = currentAuthUserId(c)
  const id = Number(c.req.param('id'))
  const row = (await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0]
  if (!row || row.userId !== userId) return notFound(c, 'order not found')
  const order = await expireOrderIfNeeded(row)
  const availability = await paymentAvailability()
  const methods = availability
    .filter(item => item.ready || item.offline_ready)
    .map(item => ({
      id: item.method,
      method: item.method,
      label: ({ offline: '线下支付', zpay_wxpay: '第三方微信支付', wechat: '微信支付', alipay: '支付宝', allinpay: '通联支付', allinpay_wxpay: '通联微信支付', allinpay_alipay: '通联支付宝' } as Record<string, string>)[item.method] || item.name,
      enabled: true,
      is_default: item.is_default,
    }))
  const offline = methods.some(item => item.method === 'offline') ? availability.find(item => item.method === 'offline') : null
  return success(c, {
    order: serializeOrder(order),
    methods,
    requires_payment: Number(order.amount || 0) > 0,
    recommended_method: methods.find(item => item.is_default)?.method || methods[0]?.method || null,
    offline,
  })
})

app.post('/orders/:id/pay', async (c) => {
  const userId = currentAuthUserId(c)
  const id = Number(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const order = await expireOrderIfNeeded((await db.select().from(schema.orders).where(eq(schema.orders.id, id)).execute())[0])
  if (!order || order.userId !== userId) return notFound(c, 'order not found')
  if (order.status === ORDER_STATUS.PAID) return badRequest(c, 'order already paid')
  if (order.status === ORDER_STATUS.CANCELED) return badRequest(c, 'order expired')
  const method = normalizePaymentMethod(body.payment_method || body.paymentMethod)
  if (!method) return badRequest(c, 'payment method is invalid')

  const payment = await startPayment(order, method, {
    clientIp: resolveClientIp(c),
    voucherUrl: body.voucher_url || body.voucherUrl || '',
    voucherRemark: body.voucher_remark || body.voucherRemark || '',
  })
  await db.update(schema.orders).set({
    paymentProvider: payment.method,
    paymentChannel: payment.method,
    transactionId: payment.paymentRef || order.transactionId,
    metadata: stringifyJson(payment.paymentData || {}),
    offlineVoucherUrl: body.voucher_url || body.voucherUrl || order.offlineVoucherUrl,
    offlineRemark: method === 'offline' ? (body.voucher_remark || body.voucherRemark || order.offlineRemark) : order.offlineRemark,
    status: payment.status,
    updatedAt: now(),
  }).where(eq(schema.orders.id, order.id)).execute()
  const updated = (await db.select().from(schema.orders).where(eq(schema.orders.id, order.id)).execute())[0]
  return success(c, { order: serializeOrder(updated), payment: payment.paymentData || {} })
})

export async function handlePaymentCallback(c: any) {
  const channel = c.req.param('channel')
  try {
    const rawBody = await c.req.text()
    const query = Object.fromEntries(new URL(c.req.url).searchParams.entries())
    const callback = await parsePaymentCallback(channel, rawBody, c.req.raw.headers, query)
    const method = normalizePaymentMethod(channel === 'zpay' ? 'zpay_wxpay' : channel) || channel
    const protocol = String((callback.raw as any)?.protocol || 'V2')
    if (!callback.orderNo) return callbackFail(c, channel, 'orderNo required', 400, protocol)
    const order = await expireOrderIfNeeded((await db.select().from(schema.orders).where(eq(schema.orders.orderNo, callback.orderNo)).execute())[0])
    if (!order) return callbackFail(c, channel, 'Order not found', 404, protocol)
    if (order.status === ORDER_STATUS.PAID) return callbackOk(c, channel, protocol)
    if (order.status !== ORDER_STATUS.PAID && callback.success) {
      try {
        await validatePaymentCallback(order, callback, method)
      } catch (error) {
        return callbackFail(c, channel, error instanceof Error ? error.message : 'callback invalid', 400, protocol)
      }
      const paymentMethod = method === 'allinpay' && isAllinpayMethod(order.paymentProvider) ? order.paymentProvider : method
      await activateOrder(order.id, { paymentMethod, paymentRef: callback.paymentRef, paymentData: callback.raw })
    } else if (!callback.success) {
      await db.update(schema.orders).set({ status: ORDER_STATUS.FAILED, metadata: stringifyJson(callback.raw), updatedAt: now() }).where(eq(schema.orders.id, order.id)).execute()
      return callbackFail(c, channel, 'payment failed', 200, protocol)
    }
    return callbackOk(c, channel, protocol)
  } catch (error) {
    console.error('Payment callback failed:', error)
    return callbackFail(c, channel, error instanceof Error ? error.message : 'callback failed', 500)
  }
}

app.all('/payments/callback/:channel', handlePaymentCallback)

export default app
