import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'
import type { ServiceType } from './ai.js'
import { findModelConfigById, listBillingRules, listModelConfigs } from '../repositories/models.js'
import { consumeUserCredits, ensureUser, findUserById, isActiveMember as repoIsActiveMember } from '../repositories/users.js'
import { mysqlExec, mysqlOne, stringifyJson as repoStringifyJson, toMysqlDateTime, useMysql } from '../repositories/runtime.js'
import { publishCreditBalanceChanged } from './credit-events.js'

type BillingModel = any

export interface CreditChargeRequest {
  userId?: string | null
  serviceType: ServiceType
  model?: string | null
  modelConfigId?: number | null
  resolution?: string | null
  duration?: number | null
  quantity?: number | null
  taskType?: string | null
  relatedTaskId?: string | number | null
  description?: string | null
  metadata?: Record<string, any>
  validateOnly?: boolean
  billable?: boolean
  resourceMode?: string | null
}

export interface CreditChargeResult {
  charged: boolean
  skipped?: boolean
  logId?: number
  amount: number
  balance: number
  userId?: string | null
}

const DEFAULT_USER_ID = 'default'
const SYSTEM_USER_IDS = new Set(['', DEFAULT_USER_ID])

function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try { return JSON.parse(value) } catch { return fallback }
}

function stringifyJson(value: any) {
  if (value === undefined || value === null || value === '') return null
  return JSON.stringify(value)
}

function normalizeKey(value: unknown) {
  return String(value || '').trim().toLowerCase()
}

function normalizeResolution(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  return raw.toLowerCase().replace(/\s+/g, '').replace('*', 'x').replace('×', 'x')
}

function normalizeParameterType(value: unknown) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
}

function readNumberMap(value: string | null | undefined) {
  const raw = parseJson(value, {})
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  return raw as Record<string, any>
}

function readBillingRuleMap(_model: BillingModel | null | undefined, _parameterType: string) {
  throw new Error('readBillingRuleMap is async-only after MySQL migration')
}

async function readBillingRuleMapAsync(model: BillingModel | null | undefined, parameterType: string) {
  if (!model?.id) return {}
  const rows = await listBillingRules(model.id, parameterType)
  return Object.fromEntries(rows.map((row: any) => [row.parameter_value || row.parameterValue, row.credits || 0]))
}

async function readBillingRuleMapsAsync(model: BillingModel | null | undefined, parameterTypes: string[]) {
  if (!model?.id) return {}
  const wanted = new Set(parameterTypes.map(normalizeParameterType))
  const rows = await listBillingRules(model.id)
  return Object.fromEntries(
    rows
      .filter((row: any) => wanted.has(normalizeParameterType(row.parameter_type || row.parameterType)))
      .map((row: any) => [row.parameter_value || row.parameterValue, row.credits || 0]),
  )
}

function pickMappedCost(map: Record<string, any>, key: string) {
  const normalizedKey = normalizeResolution(key)
  if (!normalizedKey) return null
  for (const [rawKey, rawValue] of Object.entries(map)) {
    const value = Number(rawValue)
    if (!Number.isFinite(value)) continue
    const currentKey = normalizeResolution(rawKey)
    if (currentKey === normalizedKey) return value
  }
  return null
}

function rowUserScore(rowUserId: string | null, currentUserId: string) {
  if (rowUserId === currentUserId && currentUserId !== DEFAULT_USER_ID) return 3
  if (rowUserId === DEFAULT_USER_ID) return 2
  if (!rowUserId) return 1
  return 0
}

function getBillingModel(_params: CreditChargeRequest): BillingModel | null {
  throw new Error('getBillingModel is async-only after MySQL migration')
}

async function getBillingModelAsync(params: CreditChargeRequest): Promise<BillingModel | null> {
  if (params.modelConfigId) {
    const row = await findModelConfigById(Number(params.modelConfigId))
    if (row) return row as BillingModel
  }
  const model = String(params.model || '').trim()
  const rows = await listModelConfigs({
    serviceType: params.serviceType,
    modelId: model || null,
    userId: params.userId || DEFAULT_USER_ID,
  })
  return (rows[0] || null) as BillingModel | null
}

function isActiveMember(_userId: string) {
  throw new Error('isActiveMember is async-only after MySQL migration')
}

export function assertModelBillingAllowed(params: CreditChargeRequest) {
  throw new Error('assertModelBillingAllowed is async-only after MySQL migration; use calculateCreditCostAsync/chargeCreditsAsync')
}

export function calculateCreditCost(params: CreditChargeRequest) {
  throw new Error('calculateCreditCost is async-only after MySQL migration; use calculateCreditCostAsync')
}

export async function calculateCreditCostAsync(params: CreditChargeRequest) {
  const model = await getBillingModelAsync(params)
  if (model?.memberOnly) {
    const userId = String(params.userId || '').trim()
    if (!(await repoIsActiveMember(userId))) throw new Error(`模型「${model.name || model.modelId}」仅付费会员可用，请先开通会员`)
  }
  if (model?.isFree) return { amount: 0, model }

  const billing = parseJson(model?.billingConfig, {})
  const quantity = Math.max(1, Math.floor(Number(params.quantity || 1)))
  let unitCost = Number(billing.cost ?? billing.credits ?? model?.cost ?? 0)

  if (params.serviceType === 'image') {
    const map = {
      ...readNumberMap(model?.imageCreditByResolution),
      ...(await readBillingRuleMapsAsync(model, ['resolution', 'sample_image_size'])),
      ...(billing.image_credit_by_resolution || billing.imageCreditByResolution || {}),
    }
    unitCost = pickMappedCost(map, params.resolution || billing.default_resolution || '') ?? unitCost
  }

  if (params.serviceType === 'video') {
    const map = {
      ...readNumberMap(model?.videoCreditPerSecondByResolution),
      ...(await readBillingRuleMapsAsync(model, ['resolution'])),
      ...(billing.video_credit_per_second_by_resolution || billing.videoCreditPerSecondByResolution || {}),
    }
    const perSecond = pickMappedCost(map, params.resolution || billing.default_resolution || '') ?? unitCost
    const duration = Math.max(1, Math.ceil(Number(params.duration || billing.default_duration || 1)))
    unitCost = perSecond * duration
  }

  return { amount: Math.max(0, Math.ceil(unitCost * quantity)), model }
}

export function chargeCredits(_params: CreditChargeRequest): CreditChargeResult {
  throw new Error('chargeCredits is async-only after MySQL migration; use chargeCreditsAsync')
}

export async function chargeCreditsAsync(params: CreditChargeRequest): Promise<CreditChargeResult> {
  const userId = String(params.userId || '').trim()
  if (SYSTEM_USER_IDS.has(userId)) return { charged: false, amount: 0, balance: 0, userId }
  if (params.billable === false || params.resourceMode === 'user_api') {
    const user = await ensureUser(userId)
    return { charged: false, skipped: true, amount: 0, balance: Number(user?.credits || 0), userId }
  }

  const cost = await calculateCreditCostAsync(params)
  if (cost.model?.userId && cost.model.userId === userId) {
    const user = await ensureUser(userId)
    return { charged: false, skipped: true, amount: 0, balance: Number(user?.credits || 0), userId }
  }
  const user = await ensureUser(userId)
  const currentBalance = Number(user?.credits || 0)
  if (!cost.amount) return { charged: false, amount: 0, balance: currentBalance, userId }
  if (currentBalance < cost.amount) throw new Error(`积分不足，当前 ${currentBalance}，本次需要 ${cost.amount}`)
  if (params.validateOnly) return { charged: false, skipped: true, amount: cost.amount, balance: currentBalance, userId }

  const relatedTaskId = params.relatedTaskId == null ? null : String(params.relatedTaskId)
  const taskType = params.taskType || params.serviceType
  if (relatedTaskId) {
    if (useMysql) {
      const existing = await mysqlOne<any>(
        'SELECT * FROM points_logs WHERE user_id = ? AND type = ? AND status = ? AND related_task_id = ? AND task_type = ? AND is_deleted = 0 LIMIT 1',
        [userId, 'CONSUME', 'completed', relatedTaskId, taskType],
      )
      if (existing) return { charged: false, skipped: true, logId: Number(existing.id), amount: Math.abs(Number(existing.amount || 0)), balance: Number(existing.balance || currentBalance), userId }
    } else {
      const existing = await db.select().from(schema.pointsLogs).execute()
        .find(item => item.userId === userId && item.type === 'CONSUME' && item.status === 'completed' && item.relatedTaskId === relatedTaskId && item.taskType === taskType)
      if (existing) return { charged: false, skipped: true, logId: existing.id, amount: Math.abs(Number(existing.amount || 0)), balance: Number(existing.balance || currentBalance), userId }
    }
  }

  const ts = now()
  const updatedUser = await consumeUserCredits(userId, cost.amount)
  const nextBalance = Number(updatedUser?.credits || 0)
  const metadata = {
    serviceType: params.serviceType,
    resolution: params.resolution || '',
    duration: params.duration || null,
    quantity: params.quantity || 1,
    modelConfigId: cost.model?.id || params.modelConfigId || null,
    ...(params.metadata || {}),
  }

  let logId: number | undefined
  if (useMysql) {
    const result = await mysqlExec(`
      INSERT INTO points_logs
      (user_id, amount, balance, type, description, related_task_id, task_type, model, status, metadata, created_by, created_at, updated_by, updated_at, is_deleted)
      VALUES (?, ?, ?, 'CONSUME', ?, ?, ?, ?, 'completed', CAST(? AS JSON), 'system', ?, 'system', ?, 0)
    `, [
      userId,
      -cost.amount,
      nextBalance,
      params.description || `${params.serviceType} 生成消费`,
      relatedTaskId,
      taskType,
      params.model || cost.model?.modelId || '',
      repoStringifyJson(metadata),
      toMysqlDateTime(ts),
      toMysqlDateTime(ts),
    ])
    logId = Number(result.insertId || 0)
  } else {
    const result = db.insert(schema.pointsLogs).values({
      userId,
      amount: -cost.amount,
      balance: nextBalance,
      type: 'CONSUME',
      description: params.description || `${params.serviceType} 生成消费`,
      relatedTaskId,
      taskType,
      model: params.model || cost.model?.modelId || '',
      status: 'completed',
      metadata: stringifyJson(metadata),
      createdAt: ts,
    }).execute()
    logId = Number(result.insertId)
  }

  await publishCreditBalanceChanged({
    userId,
    credits: nextBalance,
    amount: -cost.amount,
    reason: params.description || `${params.serviceType} 生成消费`,
    taskType,
    relatedTaskId,
  })

  return { charged: true, logId, amount: cost.amount, balance: nextBalance, userId }
}

export async function refundCredits(logId: number | null | undefined, reason = '任务失败，积分退回') {
  if (!logId) return null
  const log = (await db.select().from(schema.pointsLogs).where(eq(schema.pointsLogs.id, Number(logId))).execute())[0]
  if (!log || log.amount >= 0) return null

  const ts = now()
  const logMetadata = parseJson(log.metadata, {})
  const rollbackDescription = String(log.description || reason).includes('已回滚')
    ? String(log.description || reason)
    : `${log.description || reason}（已回滚）`
  await db.update(schema.pointsLogs)
    .set({
      status: 'canceled',
      description: rollbackDescription,
      metadata: stringifyJson({ ...logMetadata, refundedAt: ts, refundReason: reason }),
    })
    .where(eq(schema.pointsLogs.id, log.id))
    .execute()

  const existing = (await db.select().from(schema.pointsLogs).execute())
    .find(item => item.type === 'REFUND' && item.metadata && normalizeKey(parseJson(item.metadata, {}).sourceLogId) === normalizeKey(log.id))
  if (existing) return existing

  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, log.userId)).execute())[0]
  if (!user) return null
  const refundAmount = Math.abs(Number(log.amount || 0))
  const nextBalance = Number(user.credits || 0) + refundAmount
  await db.update(schema.aiUsers)
    .set({ credits: nextBalance, updatedAt: ts })
    .where(eq(schema.aiUsers.id, log.userId))
    .execute()
  const result = await db.insert(schema.pointsLogs).values({
    userId: log.userId,
    amount: refundAmount,
    balance: nextBalance,
    type: 'REFUND',
    description: reason,
    relatedOrderId: log.relatedOrderId,
    relatedTaskId: log.relatedTaskId,
    taskType: log.taskType,
    model: log.model,
    status: 'completed',
    metadata: stringifyJson({ sourceLogId: log.id }),
    createdAt: ts,
  }).execute()
  return (await db.select().from(schema.pointsLogs).where(eq(schema.pointsLogs.id, Number(result.insertId))).execute())[0]
}
