import crypto from 'node:crypto'
import { and, eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'
import { activateMembershipForUser } from './membership.js'

export const PAYMENT_METHOD = {
  OFFLINE: 'offline',
  ZPAY_WXPAY: 'zpay_wxpay',
  ALIPAY: 'alipay',
  WECHAT: 'wechat',
  ALLINPAY: 'allinpay',
  ALLINPAY_WXPAY: 'allinpay_wxpay',
  ALLINPAY_ALIPAY: 'allinpay_alipay',
} as const

export const ORDER_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  CLOSED: 'closed',
  CANCELED: 'canceled',
  FAILED: 'failed',
  OFFLINE_PENDING: 'offline_pending',
  REFUNDED: 'refunded',
} as const

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

function md5Hex(text: string) {
  return crypto.createHash('md5').update(text, 'utf8').digest('hex')
}

function normalizePem(raw: string) {
  return String(raw || '').replace(/\\n/g, '\n').trim()
}

function splitPemBodyLines(body: string) {
  const pure = body.replace(/\s+/g, '')
  return pure.match(/.{1,64}/g)?.join('\n') || pure
}

function wrapPem(body: string, begin: string, end: string) {
  return `${begin}\n${splitPemBodyLines(body)}\n${end}`
}

function buildPrivateKeyCandidates(raw: string) {
  const normalized = normalizePem(raw)
  if (!normalized) return []
  if (normalized.includes('BEGIN')) return [normalized]
  return [
    wrapPem(normalized, '-----BEGIN PRIVATE KEY-----', '-----END PRIVATE KEY-----'),
    wrapPem(normalized, '-----BEGIN RSA PRIVATE KEY-----', '-----END RSA PRIVATE KEY-----'),
  ]
}

function buildPublicKeyCandidates(raw: string) {
  const normalized = normalizePem(raw)
  if (!normalized) return []
  if (normalized.includes('BEGIN')) return [normalized]
  return [
    wrapPem(normalized, '-----BEGIN PUBLIC KEY-----', '-----END PUBLIC KEY-----'),
    wrapPem(normalized, '-----BEGIN RSA PUBLIC KEY-----', '-----END RSA PUBLIC KEY-----'),
  ]
}

function assertFields(values: Record<string, string>) {
  const missing = Object.keys(values).filter(key => !values[key])
  if (missing.length) throw new Error(`支付配置缺失: ${missing.join(', ')}`)
}

function sortAndJoin(params: Record<string, string>, excludeSignType = false) {
  return Object.keys(params)
    .filter(key => params[key] !== '' && key !== 'sign' && (!excludeSignType || key !== 'sign_type'))
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
}

function rsaSign(content: string, privateKey: string) {
  let lastError: unknown = null
  for (const candidate of buildPrivateKeyCandidates(privateKey)) {
    try {
      const signer = crypto.createSign('RSA-SHA256')
      signer.update(content, 'utf8')
      signer.end()
      return signer.sign(candidate, 'base64')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`私钥解析失败: ${lastError instanceof Error ? lastError.message : String(lastError || '')}`)
}

function rsaVerify(content: string, sign: string, publicKey: string) {
  let lastError: unknown = null
  for (const candidate of buildPublicKeyCandidates(publicKey)) {
    try {
      const verifier = crypto.createVerify('RSA-SHA256')
      verifier.update(content, 'utf8')
      verifier.end()
      return verifier.verify(candidate, sign, 'base64')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`公钥解析失败: ${lastError instanceof Error ? lastError.message : String(lastError || '')}`)
}

function nowTimestamp() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function buildWechatV2Sign(params: Record<string, string>, mchKey: string) {
  assertFields({ WECHAT_MCH_KEY: mchKey })
  return crypto.createHash('md5').update(`${sortAndJoin(params)}&key=${mchKey}`, 'utf8').digest('hex').toUpperCase()
}

function buildWechatXml(params: Record<string, string>) {
  return `<xml>${Object.keys(params).map(key => `<${key}><![CDATA[${params[key]}]]></${key}>`).join('')}</xml>`
}

function parseWechatXml(rawXml: string) {
  const payload: Record<string, string> = {}
  const regex = /<(\w+)><!\[CDATA\[([\s\S]*?)\]\]><\/\1>|<(\w+)>([^<]*)<\/\3>/g
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(rawXml)) !== null) {
    const key = match[1] || match[3] || ''
    if (!key || key === 'xml') continue
    payload[key] = String(match[2] ?? match[4] ?? '').trim()
  }
  return payload
}

function buildZpayMd5Sign(params: Record<string, string>, pkey: string) {
  assertFields({ ZPAY_PKEY: pkey })
  return md5Hex(`${sortAndJoin(params, true)}${pkey}`)
}

function normalizeZpayBaseUrl(raw: string) {
  return String(raw || 'https://zpayz.cn').trim().replace(/\/+$/, '')
}

function randomString(size = 32) {
  return crypto.randomBytes(Math.max(16, Math.ceil(size / 2))).toString('hex').slice(0, size)
}

function joinForAllinpaySign(params: Record<string, string>) {
  return Object.keys(params)
    .filter(key => key !== 'sign' && String(params[key] ?? '') !== '')
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&')
}

function rsaSha1Sign(content: string, privateKey: string) {
  let lastError: unknown = null
  for (const candidate of buildPrivateKeyCandidates(privateKey)) {
    try {
      const signer = crypto.createSign('RSA-SHA1')
      signer.update(content, 'utf8')
      signer.end()
      return signer.sign(candidate, 'base64')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`通联私钥解析或签名失败: ${lastError instanceof Error ? lastError.message : String(lastError || '')}`)
}

function rsaSha1Verify(content: string, sign: string, publicKey: string) {
  let lastError: unknown = null
  for (const candidate of buildPublicKeyCandidates(publicKey)) {
    try {
      const verifier = crypto.createVerify('RSA-SHA1')
      verifier.update(content, 'utf8')
      verifier.end()
      return verifier.verify(candidate, sign, 'base64')
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`通联公钥解析失败: ${lastError instanceof Error ? lastError.message : String(lastError || '')}`)
}

export function isAllinpayMethod(method: string | null | undefined) {
  return method === PAYMENT_METHOD.ALLINPAY || method === PAYMENT_METHOD.ALLINPAY_WXPAY || method === PAYMENT_METHOD.ALLINPAY_ALIPAY
}

function normalizeAllinpayBaseUrl(raw: string) {
  return String(raw || 'https://vsp.allinpay.com').trim().replace(/\/+$/, '') || 'https://vsp.allinpay.com'
}

function resolveAllinpayConfig(config: Awaited<ReturnType<typeof getPaymentConfig>>) {
  const extra = (config?.config || {}) as any
  return {
    baseUrl: normalizeAllinpayBaseUrl(extra.base_url || extra.baseUrl || extra.allinpayBaseUrl || ''),
    orgid: String(extra.org_id || extra.orgid || extra.allinpayOrgId || '').trim(),
    cusid: String(config?.merchantId || extra.cusid || extra.allinpayCusid || '').trim(),
    appid: String(config?.appId || extra.appid || extra.allinpayAppid || '').trim(),
    version: String(extra.version || extra.allinpayVersion || '11').trim() || '11',
    signtype: String(extra.signtype || extra.sign_type || extra.allinpaySigntype || 'RSA').trim().toUpperCase() === 'SM2' ? 'SM2' : 'RSA',
    privateKey: String(config?.apiSecret || extra.private_key || extra.privateKey || extra.allinpayPrivateKey || '').trim(),
    publicKey: String(config?.apiKey || extra.public_key || extra.publicKey || extra.allinpayPublicKey || '').trim(),
    notifyUrl: String(config?.notifyUrl || extra.notify_url || extra.notifyUrl || extra.allinpayNotifyUrl || '').trim(),
  }
}

function assertAllinpayReady(config: Awaited<ReturnType<typeof getPaymentConfig>>) {
  const resolved = resolveAllinpayConfig(config)
  const missing = [
    !resolved.cusid ? '商户号(cusid)' : '',
    !resolved.appid ? '应用ID(appid)' : '',
    !resolved.privateKey ? '商户私钥' : '',
    !resolved.publicKey ? '通联公钥' : '',
  ].filter(Boolean)
  if (missing.length) throw new Error(`通联支付配置缺失: ${missing.join(', ')}`)
  if (resolved.signtype !== 'RSA') throw new Error('当前仅支持通联 RSA 签名模式')
  return resolved
}

function sanitizeAllinpayRemark(raw?: string | null) {
  return String(raw || '').replace(/[+\s/?%#&=]/g, '').slice(0, 300)
}

async function getAllinpayConfig(method: string) {
  const candidates = method === PAYMENT_METHOD.ALLINPAY
    ? [PAYMENT_METHOD.ALLINPAY, PAYMENT_METHOD.ALLINPAY_WXPAY, PAYMENT_METHOD.ALLINPAY_ALIPAY]
    : [method, PAYMENT_METHOD.ALLINPAY]
  for (const provider of candidates) {
    const config = await getPaymentConfig(provider)
    if (config) return config
  }
  return null
}

async function postAllinpay(path: string, params: Record<string, string>, config: Awaited<ReturnType<typeof getPaymentConfig>>) {
  const resolved = assertAllinpayReady(config)
  const signedParams: Record<string, string> = {
    ...params,
    cusid: resolved.cusid,
    appid: resolved.appid,
    signtype: resolved.signtype,
    randomstr: params.randomstr || randomString(32),
  }
  if (resolved.orgid) signedParams.orgid = resolved.orgid
  if (!signedParams.version) signedParams.version = resolved.version

  signedParams.sign = rsaSha1Sign(joinForAllinpaySign(signedParams), resolved.privateKey)
  const res = await fetch(`${resolved.baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', Accept: 'application/json, text/plain, */*' },
    body: new URLSearchParams(signedParams),
  })
  const text = await res.text()
  let json: Record<string, any>
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`通联接口响应不是有效 JSON: ${text.slice(0, 200)}`)
  }
  if (!res.ok) throw new Error(String(json.retmsg || json.errmsg || `通联接口请求失败: HTTP ${res.status}`))
  if (String(json.retcode || '') === 'SUCCESS' && json.sign) {
    const payload = Object.fromEntries(Object.entries(json).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)]))
    if (!rsaSha1Verify(joinForAllinpaySign(payload), String(json.sign || ''), resolved.publicKey)) throw new Error('通联响应验签失败')
  }
  return { ok: String(json.retcode || '') === 'SUCCESS', response: json }
}

async function createAllinpayOrder(order: typeof schema.orders.$inferSelect, method: string, request?: { clientIp?: string }) {
  const config = await getAllinpayConfig(method)
  if (!config) throw new Error('通联支付配置不存在')
  const resolved = assertAllinpayReady(config)
  if (!resolved.notifyUrl) throw new Error('通联下单缺少通知地址')
  const paytype = method === PAYMENT_METHOD.ALLINPAY_ALIPAY ? 'A01' : 'W01'
  const clientIp = String(request?.clientIp || '').trim()
  const result = await postAllinpay('/apiweb/unitorder/pay', {
    version: resolved.version,
    trxamt: String(Math.round(Number(order.amount || 0) * 100)),
    reqsn: order.orderNo,
    paytype,
    body: String(order.itemName || '积分订单').slice(0, 100),
    notify_url: resolved.notifyUrl,
    validtime: '15',
    remark: sanitizeAllinpayRemark(String(order.id)),
    ...(clientIp && !clientIp.includes(':') && clientIp.length <= 16 ? { cusip: clientIp } : {}),
  }, config)
  if (!result.ok) throw new Error(String(result.response.retmsg || result.response.errmsg || '通联统一下单失败'))
  const qrCodeUrl = String(result.response.payinfo || '').trim()
  if (!qrCodeUrl) throw new Error(String(result.response.errmsg || result.response.retmsg || '通联统一下单未返回支付串'))
  return {
    method: method === PAYMENT_METHOD.ALLINPAY ? PAYMENT_METHOD.ALLINPAY_WXPAY : method,
    status: ORDER_STATUS.PENDING,
    paymentRef: String(result.response.trxid || order.orderNo),
    paymentData: {
      channel: paytype === 'A01' ? 'ALLINPAY_ALIPAY' : 'ALLINPAY_WXPAY',
      qrCodeUrl,
      paytype,
      trxid: String(result.response.trxid || ''),
      chnltrxid: String(result.response.chnltrxid || ''),
      reqsn: String(result.response.reqsn || order.orderNo),
      allinpayTrxid: String(result.response.trxid || ''),
      raw: result.response,
    },
  }
}

export function buildOrderNo() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  return `ORD${date}${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

export function normalizePaymentMethod(raw?: string | null) {
  const value = String(raw || '').trim().toLowerCase()
  return Object.values(PAYMENT_METHOD).includes(value as any) ? value : null
}

export function isOrderExpired(order: Pick<typeof schema.orders.$inferSelect, 'expiresAt' | 'status'>) {
  if (!order.expiresAt) return false
  if (order.status !== ORDER_STATUS.PENDING && order.status !== ORDER_STATUS.OFFLINE_PENDING) return false
  return new Date(order.expiresAt).getTime() <= Date.now()
}

export async function expireOrderIfNeeded<T extends typeof schema.orders.$inferSelect>(order: T): Promise<T> {
  if (!isOrderExpired(order)) return order
  await db.update(schema.orders)
    .set({ status: ORDER_STATUS.CANCELED, updatedAt: now() })
    .where(eq(schema.orders.id, order.id))
    .execute()
  return (await db.select().from(schema.orders).where(eq(schema.orders.id, order.id)).execute())[0] as T
}

export async function getPaymentConfig(provider: string) {
  const rows = await db.select().from(schema.paymentConfigs)
    .where(and(eq(schema.paymentConfigs.provider, provider), eq(schema.paymentConfigs.isActive, true)))
    .execute()
  const row = rows.find(item => item.isDefault) || rows[0]
  if (!row) return null
  return {
    ...row,
    config: parseJson(row.config, {}),
  }
}

export async function paymentAvailability() {
  const rows = (await db.select().from(schema.paymentConfigs).where(eq(schema.paymentConfigs.isActive, true)).execute())
  const configs = rows.map(row => ({ ...row, config: parseJson(row.config, {}) }))
  const list = configs.map(row => {
    const extra = row.config as any
    const ready = (() => {
      if (row.provider === PAYMENT_METHOD.OFFLINE) return Boolean(extra.offline_qr_code_url || row.notifyUrl)
      if (row.provider === PAYMENT_METHOD.ZPAY_WXPAY) return Boolean((row.merchantId || extra.pid) && (row.apiSecret || row.apiKey || extra.pkey) && (row.notifyUrl || extra.notify_url))
      if (row.provider === PAYMENT_METHOD.ALIPAY) return Boolean(row.appId && row.apiSecret && row.notifyUrl)
      if (row.provider === PAYMENT_METHOD.WECHAT) return Boolean(row.appId && row.merchantId && (row.apiSecret || row.apiKey) && row.notifyUrl)
      if (isAllinpayMethod(row.provider)) {
        const resolved = resolveAllinpayConfig(row as any)
        return Boolean(resolved.cusid && resolved.appid && resolved.privateKey && resolved.publicKey && resolved.notifyUrl)
      }
      return false
    })()
    return {
      method: row.provider,
      name: row.name,
      is_default: row.isDefault,
      offline_ready: row.provider === PAYMENT_METHOD.OFFLINE && ready,
      ready,
    }
  })
  const allinpayBase = list.find(item => item.method === PAYMENT_METHOD.ALLINPAY && item.ready)
  const hasAllinpayWxpay = list.some(item => item.method === PAYMENT_METHOD.ALLINPAY_WXPAY)
  const hasAllinpayAlipay = list.some(item => item.method === PAYMENT_METHOD.ALLINPAY_ALIPAY)
  if (allinpayBase && !hasAllinpayWxpay) {
    list.push({ method: PAYMENT_METHOD.ALLINPAY_WXPAY, name: '通联微信支付', is_default: false, offline_ready: false, ready: true })
  }
  if (allinpayBase && !hasAllinpayAlipay) {
    list.push({ method: PAYMENT_METHOD.ALLINPAY_ALIPAY, name: '通联支付宝', is_default: false, offline_ready: false, ready: true })
  }
  return list
}

export async function activateOrder(orderId: number, params: { paymentMethod?: string | null, paymentRef?: string | null, paymentData?: any } = {}) {
  const order = (await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).execute())[0]
  if (!order) throw new Error('订单不存在')
  if (order.status === ORDER_STATUS.PAID) return order
  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, order.userId)).execute())[0]
  if (!user) throw new Error('用户不存在')
  const ts = now()
  let membershipPlan: typeof schema.membershipPlans.$inferSelect | null = null
  if (order.type === 'membership' && order.itemId) {
    membershipPlan = (await db.select().from(schema.membershipPlans).where(eq(schema.membershipPlans.id, order.itemId)).execute())[0] || null
  }
  const creditRechargeAmount = order.type === 'membership' ? 0 : Number(order.credits || 0)
  const nextCredits = Number(user.credits || 0) + creditRechargeAmount
  await db.update(schema.orders).set({
    status: ORDER_STATUS.PAID,
    paymentProvider: params.paymentMethod ?? order.paymentProvider,
    transactionId: params.paymentRef ?? order.transactionId,
    metadata: params.paymentData === undefined ? order.metadata : stringifyJson(params.paymentData),
    paidAt: ts,
    updatedAt: ts,
  }).where(eq(schema.orders.id, order.id)).execute()
  if (membershipPlan) {
    await activateMembershipForUser({ userId: order.userId, plan: membershipPlan, orderId: order.id })
  } else {
    await db.update(schema.aiUsers).set({
      credits: nextCredits,
      updatedAt: ts,
    }).where(eq(schema.aiUsers.id, order.userId)).execute()
  }
  if (creditRechargeAmount !== 0) {
    await db.insert(schema.pointsLogs).values({
      userId: order.userId,
      amount: creditRechargeAmount,
      balance: nextCredits,
      type: 'CREDIT_RECHARGE',
      description: `${order.itemName || order.type} 支付到账`,
      relatedOrderId: order.id,
      createdAt: ts,
    }).execute()
  }
  return (await db.select().from(schema.orders).where(eq(schema.orders.id, orderId)).execute())[0]
}

export async function startPayment(order: typeof schema.orders.$inferSelect, method: string, request?: { clientIp?: string, voucherUrl?: string, voucherRemark?: string }) {
  if (isOrderExpired(order)) throw new Error('订单已过期')
  if (method === PAYMENT_METHOD.OFFLINE) {
    const config = await getPaymentConfig(PAYMENT_METHOD.OFFLINE)
    if (!config) throw new Error('线下支付配置不存在')
    if (!request?.voucherUrl) throw new Error('请上传支付凭证后再提交')
    const data = {
      channel: 'OFFLINE',
      instruction: (config?.config as any)?.offline_instruction || '请线下转账后联系管理员审核。',
      offlineQrCodeUrl: (config?.config as any)?.offline_qr_code_url || '',
      offlineAccountName: (config?.config as any)?.offline_account_name || '',
      offlineAccountNo: (config?.config as any)?.offline_account_no || '',
      voucherUrl: request?.voucherUrl || '',
      voucherRemark: request?.voucherRemark || '',
    }
    return { method, status: ORDER_STATUS.OFFLINE_PENDING, paymentData: data }
  }

  if (method === PAYMENT_METHOD.ZPAY_WXPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ZPAY_WXPAY)
    if (!config) throw new Error('ZPAY支付配置不存在')
    const extra = config.config as any
    const params: Record<string, string> = {
      pid: String(config.merchantId || extra.pid || ''),
      type: 'wxpay',
      out_trade_no: order.orderNo,
      notify_url: config.notifyUrl || extra.notify_url || '',
      return_url: config.returnUrl || extra.return_url || '',
      name: order.itemName || '积分订单',
      money: Number(order.amount || 0).toFixed(2),
      clientip: request?.clientIp || '127.0.0.1',
      device: 'pc',
      param: String(order.id),
      sign_type: 'MD5',
    }
    if (extra.cid) params.cid = String(extra.cid)
    params.sign = buildZpayMd5Sign(params, config.apiSecret || config.apiKey || extra.pkey || '')
    const res = await fetch(`${normalizeZpayBaseUrl(extra.base_url || '')}/mapi.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: new URLSearchParams(params),
    })
    const json = await res.json().catch(() => null as any)
    if (!res.ok || !json || (json.code !== 1 && json.code !== '1')) throw new Error(String(json?.msg || 'ZPAY下单失败'))
    const qrImageUrl = String(json.img || '').trim()
    const payUrl = String(json.payurl || json.payurl2 || json.qrcode || '').trim()
    const qrCodeUrl = qrImageUrl || payUrl
    if (!qrCodeUrl) throw new Error('ZPAY未返回二维码/跳转链接')
    return {
      method,
      status: ORDER_STATUS.PENDING,
      paymentRef: String(json.trade_no || order.orderNo),
      paymentData: { channel: 'ZPAY_WXPAY', qrCodeUrl, payUrl: payUrl || null, img: qrImageUrl || null, raw: json },
    }
  }

  if (method === PAYMENT_METHOD.ALIPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ALIPAY)
    if (!config) throw new Error('支付宝配置不存在')
    assertFields({ ALIPAY_APP_ID: config.appId || '', ALIPAY_PRIVATE_KEY: config.apiSecret || '', ALIPAY_NOTIFY_URL: config.notifyUrl || '' })
    const params: Record<string, string> = {
      app_id: config.appId || '',
      method: 'alipay.trade.precreate',
      format: 'JSON',
      charset: 'UTF-8',
      sign_type: 'RSA2',
      timestamp: nowTimestamp(),
      version: '1.0',
      notify_url: config.notifyUrl || '',
      biz_content: JSON.stringify({ out_trade_no: order.orderNo, total_amount: Number(order.amount || 0).toFixed(2), subject: order.itemName || '积分订单' }),
    }
    params.sign = rsaSign(sortAndJoin(params), config.apiSecret || '')
    const res = await fetch((config.config as any)?.gateway || 'https://openapi.alipay.com/gateway.do', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      body: new URLSearchParams(params),
    })
    const json = await res.json()
    const response = json.alipay_trade_precreate_response
    if (response?.code !== '10000') throw new Error(String(response?.sub_msg || response?.msg || '支付宝下单失败'))
    return {
      method,
      status: ORDER_STATUS.PENDING,
      paymentRef: response.out_trade_no,
      paymentData: { channel: 'ALIPAY', qrCodeUrl: response.qr_code, raw: response },
    }
  }

  if (method === PAYMENT_METHOD.WECHAT) {
    const config = await getPaymentConfig(PAYMENT_METHOD.WECHAT)
    if (!config) throw new Error('微信支付配置不存在')
    assertFields({ WECHAT_MCH_ID: config.merchantId || '', WECHAT_APP_ID: config.appId || '', WECHAT_NOTIFY_URL: config.notifyUrl || '', WECHAT_MCH_KEY: config.apiSecret || config.apiKey || '' })
    const params: Record<string, string> = {
      appid: config.appId || '',
      mch_id: config.merchantId || '',
      nonce_str: crypto.randomBytes(16).toString('hex'),
      body: order.itemName || '积分订单',
      out_trade_no: order.orderNo,
      total_fee: String(Math.round(Number(order.amount || 0) * 100)),
      spbill_create_ip: request?.clientIp || '127.0.0.1',
      notify_url: config.notifyUrl || '',
      trade_type: 'NATIVE',
    }
    params.sign = buildWechatV2Sign(params, config.apiSecret || config.apiKey || '')
    const res = await fetch('https://api.mch.weixin.qq.com/pay/unifiedorder', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body: buildWechatXml(params),
    })
    const payload = parseWechatXml(await res.text())
    if (!res.ok || payload.return_code !== 'SUCCESS' || payload.result_code !== 'SUCCESS') throw new Error(payload.err_code_des || payload.return_msg || '微信下单失败')
    return {
      method,
      status: ORDER_STATUS.PENDING,
      paymentRef: order.orderNo,
      paymentData: { channel: 'WECHAT', qrCodeUrl: payload.code_url, prepayId: payload.prepay_id || null, protocol: 'V2' },
    }
  }

  if (isAllinpayMethod(method)) {
    return createAllinpayOrder(order, method, request)
  }

  throw new Error('不支持的支付方式')
}

export async function parsePaymentCallback(channel: string, rawBody: string, headers: Headers, query: Record<string, string>) {
  const method = normalizePaymentMethod(channel === 'zpay' ? PAYMENT_METHOD.ZPAY_WXPAY : channel)
  if (!method) throw new Error('Unsupported channel')
  if (method === PAYMENT_METHOD.ALIPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ALIPAY)
    if (!config) throw new Error('支付宝配置不存在')
    const payload = Object.fromEntries(new URLSearchParams(rawBody).entries())
    const sign = String(payload.sign || '').replace(/ /g, '+')
    if (!sign) throw new Error('支付宝回调缺少签名')
    const verified = rsaVerify(sortAndJoin(Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v)])), true), sign, config.apiKey || '')
    if (!verified) throw new Error('支付宝回调验签失败')
    return { orderNo: payload.out_trade_no || '', paymentRef: payload.trade_no || null, success: payload.trade_status === 'TRADE_SUCCESS' || payload.trade_status === 'TRADE_FINISHED', raw: payload }
  }
  if (method === PAYMENT_METHOD.ZPAY_WXPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ZPAY_WXPAY)
    if (!config) throw new Error('ZPAY配置不存在')
    const payload = { ...query, ...Object.fromEntries(new URLSearchParams(rawBody).entries()) }
    delete (payload as any).merchantId
    const sign = String(payload.sign || '').trim().toLowerCase()
    const expected = buildZpayMd5Sign(Object.fromEntries(Object.entries(payload).map(([k, v]) => [k, String(v ?? '')])), config.apiSecret || config.apiKey || (config.config as any).pkey || '')
    if (!sign || sign !== expected) throw new Error('ZPAY回调验签失败')
    return { orderNo: String(payload.out_trade_no || ''), paymentRef: String(payload.trade_no || '') || null, success: String(payload.trade_status || '') === 'TRADE_SUCCESS', raw: payload }
  }
  if (method === PAYMENT_METHOD.WECHAT) {
    const config = await getPaymentConfig(PAYMENT_METHOD.WECHAT)
    if (!config) throw new Error('微信配置不存在')
    const payload = parseWechatXml(rawBody)
    const expected = buildWechatV2Sign(payload, config.apiSecret || config.apiKey || '')
    if (expected !== String(payload.sign || '').trim().toUpperCase()) throw new Error('微信回调验签失败')
    return { orderNo: payload.out_trade_no || '', paymentRef: payload.transaction_id || null, success: payload.return_code === 'SUCCESS' && payload.result_code === 'SUCCESS', raw: { ...payload, protocol: 'V2' } }
  }
  if (isAllinpayMethod(method)) {
    const payload = { ...query, ...Object.fromEntries(new URLSearchParams(rawBody).entries()) }
    const config = await getAllinpayConfig(method)
    if (!config) throw new Error('通联支付配置不存在')
    const resolved = assertAllinpayReady(config)
    const normalizedPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)]))
    const sign = String(normalizedPayload.sign || '').trim()
    if (!sign) throw new Error('通联回调缺少签名')
    const signtype = String(normalizedPayload.signtype || 'MD5').trim().toUpperCase()
    if (signtype !== 'RSA') throw new Error(`当前仅支持通联 RSA 回调验签，收到 signtype=${signtype || 'MD5'}`)
    if (!rsaSha1Verify(joinForAllinpaySign(normalizedPayload), sign, resolved.publicKey)) throw new Error('通联回调验签失败')
    const trxstatus = String(normalizedPayload.trxstatus || '').trim()
    return {
      orderNo: String(normalizedPayload.cusorderid || normalizedPayload.reqsn || '').trim(),
      paymentRef: String(normalizedPayload.trxid || '').trim() || null,
      success: trxstatus === '0000',
      raw: normalizedPayload,
    }
  }
  throw new Error('Unsupported channel')
}

export async function validatePaymentCallback(order: typeof schema.orders.$inferSelect, callback: { raw?: any; paymentRef?: string | null; success?: boolean }, method: string) {
  const raw = callback.raw || {}
  if (method === PAYMENT_METHOD.ALIPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ALIPAY)
    const appId = String(raw.app_id || '')
    if (appId && config?.appId && appId !== config.appId) throw new Error('app_id mismatch')
    const amount = Number(raw.total_amount ?? NaN)
    if (Number.isFinite(amount) && amount > 0 && Math.abs(amount - Number(order.amount || 0)) > 0.000001) throw new Error('amount mismatch')
  }
  if (method === PAYMENT_METHOD.ZPAY_WXPAY) {
    const config = await getPaymentConfig(PAYMENT_METHOD.ZPAY_WXPAY)
    const pid = String(raw.pid || '')
    const expectedPid = String(config?.merchantId || (config?.config as any)?.pid || '')
    if (pid && expectedPid && pid !== expectedPid) throw new Error('pid mismatch')
    const amount = Number(raw.money ?? NaN)
    if (Number.isFinite(amount) && amount > 0 && Math.abs(amount - Number(order.amount || 0)) > 0.000001) throw new Error('amount mismatch')
  }
  if (method === PAYMENT_METHOD.WECHAT) {
    const config = await getPaymentConfig(PAYMENT_METHOD.WECHAT)
    const mchId = String(raw.mch_id || raw.mchid || '')
    if (mchId && config?.merchantId && mchId !== config.merchantId) throw new Error('mchid mismatch')
    const amountFen = Number(raw.total_fee ?? raw.amount?.total ?? NaN)
    if (Number.isFinite(amountFen) && amountFen > 0 && amountFen !== Math.round(Number(order.amount || 0) * 100)) throw new Error('amount mismatch')
  }
  if (isAllinpayMethod(method)) {
    const config = await getAllinpayConfig(method)
    const resolved = resolveAllinpayConfig(config)
    const cusid = String(raw.cusid || '')
    if (cusid && resolved.cusid && cusid !== resolved.cusid) throw new Error('cusid mismatch')
    const appid = String(raw.appid || '')
    if (appid && resolved.appid && appid !== resolved.appid) throw new Error('appid mismatch')
    const amountFen = Number(raw.trxamt ?? NaN)
    if (Number.isFinite(amountFen) && amountFen > 0 && amountFen !== Math.round(Number(order.amount || 0) * 100)) throw new Error('amount mismatch')
  }
}
