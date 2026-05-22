import { fromMysqlModel, mysqlRows, mysqlOne, parseJson } from './runtime.js'

export type ServiceType = 'text' | 'image' | 'video' | 'audio' | 'embedding'

const DEFAULT_USER_ID = 'default'
const PLATFORM_USER_IDS = new Set(['', DEFAULT_USER_ID, 'admin'])

export function isPlatformUserId(value: unknown) {
  return PLATFORM_USER_IDS.has(String(value || '').trim())
}

function rowUserScore(rowUserId: string | null, currentUserId: string) {
  if (rowUserId === currentUserId && !isPlatformUserId(currentUserId)) return 3
  if (isPlatformUserId(rowUserId)) return 2
  if (!rowUserId) return 1
  return 0
}

export async function listModelConfigs(params: {
  serviceType: ServiceType
  modelId?: string | null
  modelConfigId?: number | null
  userId?: string
}) {
  const userId = params.userId || DEFAULT_USER_ID
  const clauses = ['service_type = ?', 'is_active = 1', 'is_deleted = 0', '(user_id IS NULL OR user_id = ? OR user_id = ?)']
  const values: any[] = [params.serviceType, userId, DEFAULT_USER_ID]
  if (params.modelConfigId) {
    clauses.push('id = ?')
    values.push(params.modelConfigId)
  }
  if (params.modelId) {
    clauses.push('model_id = ?')
    values.push(params.modelId)
  }
  const rows = await mysqlRows(`SELECT * FROM ai_model_configs WHERE ${clauses.join(' AND ')}`, values)
  return rows.map(fromMysqlModel).filter(Boolean).sort((a: any, b: any) => {
    const aExact = params.modelConfigId && a.id === params.modelConfigId ? 1 : 0
    const bExact = params.modelConfigId && b.id === params.modelConfigId ? 1 : 0
    return bExact - aExact ||
      rowUserScore(b.userId, userId) - rowUserScore(a.userId, userId) ||
      Number(b.isDefault) - Number(a.isDefault) ||
      (b.priority || 0) - (a.priority || 0)
  })
}

export async function findModelConfigById(id: number) {
  return fromMysqlModel(await mysqlOne('SELECT * FROM ai_model_configs WHERE id = ? AND is_deleted = 0 LIMIT 1', [id]))
}

export async function listParameterProfileItems(profileId: number) {
  return mysqlRows(`
    SELECT id, profile_id AS profileId, type, label, value, rank, config
    FROM ai_model_parameter_profile_items
    WHERE profile_id = ? AND is_deleted = 0
    ORDER BY rank ASC, id ASC
  `, [profileId])
}

export async function findUserProvider(params: {
  userId: string
  provider: string
  providerId?: number | null
  userProviderId?: number | null
  allowPlatform?: boolean
}) {
  const clauses = [params.allowPlatform ? '(user_id = ? OR user_id IS NULL)' : 'user_id = ?', 'provider = ?', 'is_active = 1', 'is_deleted = 0']
  const values: any[] = [params.userId, params.provider]
  if (params.providerId) {
    clauses.push('provider_id = ?')
    values.push(params.providerId)
  }
  if (params.userProviderId) {
    clauses.push('id = ?')
    values.push(params.userProviderId)
  }
  const order = params.allowPlatform ? 'ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END ASC, id DESC' : 'ORDER BY id DESC'
  if (params.allowPlatform) values.push(params.userId)
  return mysqlOne(`SELECT * FROM ai_user_provider_configs WHERE ${clauses.join(' AND ')} ${order} LIMIT 1`, values)
}

export async function findPlatformProvider(params: {
  provider: string
  providerId?: number | null
}) {
  const clauses = [
    `(up.user_id IS NULL OR up.user_id IN (?, ?) OR u.role = 'admin')`,
    'up.provider = ?',
    'up.is_active = 1',
    'up.is_deleted = 0',
  ]
  const values: any[] = [DEFAULT_USER_ID, 'admin', params.provider]
  if (params.providerId) {
    clauses.push('up.provider_id = ?')
    values.push(params.providerId)
  }
  return mysqlOne(`
    SELECT up.*, 1 AS __platform_provider
      FROM ai_user_provider_configs up
      LEFT JOIN ai_users u ON u.id = up.user_id AND u.is_deleted = 0
     WHERE ${clauses.join(' AND ')}
     ORDER BY
       CASE
         WHEN up.user_id IS NULL THEN 0
         WHEN up.user_id = ? THEN 1
         WHEN u.role = 'admin' THEN 2
         ELSE 3
       END ASC,
       up.id DESC
     LIMIT 1
  `, [...values, DEFAULT_USER_ID])
}

export async function findServiceConfig(serviceType: ServiceType, provider?: string | null, configId?: number | null) {
  const clauses = ['service_type = ?', 'is_active = 1', 'is_deleted = 0']
  const values: any[] = [serviceType]
  if (provider) {
    clauses.push('provider = ?')
    values.push(provider)
  }
  if (configId) {
    clauses.push('id = ?')
    values.push(configId)
  }
  return mysqlOne(`SELECT * FROM ai_service_configs WHERE ${clauses.join(' AND ')} ORDER BY priority DESC, id DESC LIMIT 1`, values)
}

export async function listBillingRules(modelConfigId: number, parameterType?: string) {
  const clauses = ['model_config_id = ?', 'is_deleted = 0']
  const values: any[] = [modelConfigId]
  if (parameterType) {
    clauses.push('parameter_type = ?')
    values.push(parameterType)
  }
  return mysqlRows(`SELECT * FROM ai_model_billing_rules WHERE ${clauses.join(' AND ')}`, values)
}

export function parseModelJson(value: string | null | undefined, fallback: any) {
  return parseJson(value, fallback)
}
