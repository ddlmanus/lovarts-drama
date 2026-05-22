import { mysqlPool } from '../db/mysql.js'
import { withMysqlRetry } from '../db/mysql-retry.js'

export const useMysql = true

export async function mysqlRows<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const [rows] = await withMysqlRetry(() => mysqlPool.execute(sql, params))
  return rows as T[]
}

export async function mysqlOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await mysqlRows<T>(sql, params)
  return rows[0] || null
}

export async function mysqlExec(sql: string, params: any[] = []) {
  const [result] = await withMysqlRetry(() => mysqlPool.execute(sql, params))
  return result as any
}

export function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0)
}

export function parseJson(value: string | null | undefined, fallback: any) {
  if (!value) return fallback
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return fallback
  }
}

export function stringifyJson(value: any) {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function toMysqlDateTime(value: any) {
  if (!value) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 19).replace('T', ' ')
}

export function toIso(value?: string | Date | null) {
  if (!value) return null
  if (value instanceof Date) return value.toISOString()
  return new Date(value).toISOString()
}

export function fromMysqlModel(row: any) {
  if (!row) return null
  return {
    id: Number(row.id),
    userId: row.user_id ?? null,
    providerId: row.provider_id == null ? null : Number(row.provider_id),
    sourceModelId: row.source_model_id == null ? null : Number(row.source_model_id),
    parameterProfileId: row.parameter_profile_id == null ? null : Number(row.parameter_profile_id),
    serviceType: row.service_type,
    provider: row.provider,
    modelId: row.model_id,
    name: row.name,
    description: row.description,
    baseUrl: row.base_url,
    endpoint: row.endpoint,
    queryEndpoint: row.query_endpoint,
    parameters: row.parameters,
    defaults: row.defaults,
    capabilities: row.capabilities,
    cost: Number(row.cost || 0),
    isFree: Boolean(row.is_free),
    memberOnly: Boolean(row.member_only),
    imageCreditByResolution: row.image_credit_by_resolution,
    videoCreditPerSecondByResolution: row.video_credit_per_second_by_resolution,
    billingConfig: row.billing_config,
    priority: Number(row.priority || 0),
    isDefault: Boolean(row.is_default),
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at) || '',
    updatedAt: toIso(row.updated_at) || '',
  }
}

export function fromMysqlUser(row: any) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    account: row.account,
    phone: row.phone,
    email: row.email,
    passwordHash: row.password_hash,
    inviteCode: row.invite_code,
    credits: Number(row.credits || 0),
    balance: Number(row.balance || 0),
    membershipCredits: Number(row.membership_credits || 0),
    membershipPeriodCredits: Number(row.membership_period_credits || 0),
    membershipPlanId: row.membership_plan_id == null ? null : Number(row.membership_plan_id),
    membershipStatus: row.membership_status || 'none',
    membershipStartedAt: toIso(row.membership_started_at),
    membershipExpiresAt: toIso(row.membership_expires_at),
    membershipNextGrantAt: toIso(row.membership_next_grant_at),
    membershipLastGrantAt: toIso(row.membership_last_grant_at),
    wxOpenid: row.wx_openid,
    wxUnionid: row.wx_unionid,
    wxNickname: row.wx_nickname,
    wxAvatar: row.wx_avatar,
    wxBoundAt: toIso(row.wx_bound_at),
    lastLoginAt: toIso(row.last_login_at),
    lastLoginIp: row.last_login_ip,
    loginChannel: row.login_channel || 'password',
    role: row.role || 'user',
    isActive: Boolean(row.is_active),
    createdAt: toIso(row.created_at) || '',
    updatedAt: toIso(row.updated_at) || '',
  }
}
