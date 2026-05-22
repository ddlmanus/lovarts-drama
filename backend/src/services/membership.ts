import { mysqlExec, mysqlOne, mysqlRows, parseJson, stringifyJson } from '../repositories/runtime.js'
import { now } from '../utils/response.js'
import { publishCreditBalanceChanged } from './credit-events.js'

type UserRow = Record<string, any>
type PlanRow = Record<string, any>

const userColumnSql: Record<string, string> = {
  membership_credits: "INT NOT NULL DEFAULT 0 COMMENT '会员积分余额'",
  membership_period_credits: "INT NOT NULL DEFAULT 0 COMMENT '会员每期发放积分'",
  membership_started_at: "DATETIME NULL COMMENT '会员开始时间'",
  membership_next_grant_at: "DATETIME NULL COMMENT '会员下次积分发放时间'",
  membership_last_grant_at: "DATETIME NULL COMMENT '会员上次积分发放时间'",
  wx_openid: "VARCHAR(128) NULL COMMENT '微信OpenID'",
  wx_unionid: "VARCHAR(128) NULL COMMENT '微信UnionID'",
  wx_nickname: "VARCHAR(120) NULL COMMENT '微信昵称'",
  wx_avatar: "VARCHAR(1000) NULL COMMENT '微信头像'",
  wx_bound_at: "DATETIME NULL COMMENT '微信绑定时间'",
  last_login_at: "DATETIME NULL COMMENT '最后登录时间'",
  last_login_ip: "VARCHAR(64) NULL COMMENT '最后登录IP'",
  login_channel: "VARCHAR(32) NOT NULL DEFAULT 'password' COMMENT '登录渠道'",
  resource_mode: "VARCHAR(32) NOT NULL DEFAULT 'unset' COMMENT '资源模式：unset/user_api/platform/mixed'",
  onboarding_completed_at: "DATETIME NULL COMMENT '首次资源选择完成时间'",
}

const pointColumnSql: Record<string, string> = {
  before_balance: "INT NOT NULL DEFAULT 0 COMMENT '调整前积分'",
  after_balance: "INT NOT NULL DEFAULT 0 COMMENT '调整后积分'",
  operator_id: "VARCHAR(64) NULL COMMENT '操作人ID'",
  source: "VARCHAR(64) NULL COMMENT '来源'",
}

const imageGenerationColumnSql: Record<string, string> = {
  mask: "LONGTEXT NULL COMMENT '局部编辑蒙版图'",
  output_format: "VARCHAR(255) NULL COMMENT '图片输出格式'",
  response_format: "VARCHAR(255) NULL COMMENT '图片响应格式'",
  watermark: "TINYINT(1) NULL COMMENT '是否添加水印'",
  stream: "TINYINT(1) NULL COMMENT '是否流式输出'",
  official_fallback: "TINYINT(1) NULL COMMENT 'APIMart 是否使用官方渠道兜底'",
  output_compression: "INT NULL COMMENT '图片输出压缩强度 0-100'",
  background: "VARCHAR(255) NULL COMMENT '图片背景模式'",
  moderation: "VARCHAR(255) NULL COMMENT '图片审核强度'",
  google_search: "TINYINT(1) NULL COMMENT '是否启用 Google 文字搜索增强'",
  google_image_search: "TINYINT(1) NULL COMMENT '是否启用 Google 图片搜索增强'",
  sequential_image_generation: "VARCHAR(255) NULL COMMENT '组图生成模式'",
  sequential_image_generation_options: "JSON NULL COMMENT '组图生成选项'",
  optimize_prompt_options: "JSON NULL COMMENT '提示词优化选项'",
  tools: "JSON NULL COMMENT '图片生成工具配置'",
}

const videoGenerationColumnSql: Record<string, string> = {
  reference_video_urls: "JSON NULL COMMENT '参考视频URL列表'",
  reference_audio_urls: "JSON NULL COMMENT '参考音频URL列表'",
  frames: "INT NULL COMMENT '输出帧数'",
  generate_audio: "TINYINT(1) NULL COMMENT '是否生成音频'",
  camera_fixed: "TINYINT(1) NULL COMMENT '是否固定镜头'",
  watermark: "TINYINT(1) NULL COMMENT '是否添加水印'",
  return_last_frame: "TINYINT(1) NULL COMMENT '是否返回尾帧'",
  service_tier: "VARCHAR(255) NULL COMMENT '推理服务层级'",
  execution_expires_after: "INT NULL COMMENT '任务执行过期秒数'",
  callback_url: "VARCHAR(1000) NULL COMMENT '任务回调地址'",
  draft: "TINYINT(1) NULL COMMENT '是否草稿模式'",
  draft_task_id: "VARCHAR(255) NULL COMMENT '草稿任务ID'",
  tools: "JSON NULL COMMENT '视频生成工具配置'",
}

const systemSettingColumns: Record<string, string> = {
  id: "BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID'",
  setting_key: "VARCHAR(120) NOT NULL COMMENT '设置键'",
  setting_value: "LONGTEXT NULL COMMENT '设置值'",
  group_name: "VARCHAR(64) NOT NULL DEFAULT 'system' COMMENT '分组名称'",
  label: "VARCHAR(120) NULL COMMENT '标签'",
  value_type: "VARCHAR(32) NOT NULL DEFAULT 'string' COMMENT '值类型'",
  is_secret: "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否敏感'",
  created_by: "VARCHAR(64) NOT NULL DEFAULT 'system' COMMENT '创建人'",
  created_at: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'",
  updated_by: "VARCHAR(64) NOT NULL DEFAULT 'system' COMMENT '修改人'",
  updated_at: "DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间'",
  deleted_by: "VARCHAR(64) NULL COMMENT '删除人'",
  deleted_at: "DATETIME NULL COMMENT '删除时间'",
  is_deleted: "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除'",
}

function sqlDate(value?: Date | string | null) {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 19).replace('T', ' ')
}

function addMonths(date: Date, months = 1) {
  const next = new Date(date)
  const day = next.getDate()
  next.setMonth(next.getMonth() + months)
  if (next.getDate() < day) next.setDate(0)
  return next
}

function nextGrantAfter(start: Date, expiresAt: Date, nowDate = new Date()) {
  let next = addMonths(start, 1)
  while (next <= nowDate && next < expiresAt) next = addMonths(next, 1)
  return next < expiresAt ? next : null
}

function isYearlyPlan(plan: PlanRow | null | undefined) {
  if (!plan) return false
  const cycle = String(plan.billing_cycle || '').toLowerCase()
  return cycle === 'yearly' || Number(plan.duration_days || 0) >= 360
}

async function columnExists(table: string, column: string) {
  const row = await mysqlOne<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  return Number(row?.count || 0) > 0
}

async function ensureColumn(table: string, column: string, definition: string) {
  if (await columnExists(table, column)) return
  await mysqlExec(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`)
}

async function ensurePlatformProviderSchema() {
  const tableExists = await mysqlOne<{ count: number }>(
    `SELECT COUNT(*) AS count
       FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ai_user_provider_configs'`,
  )
  if (!Number(tableExists?.count || 0)) return
  await mysqlExec("ALTER TABLE `ai_user_provider_configs` MODIFY COLUMN `user_id` VARCHAR(64) NULL COMMENT '用户ID，NULL 表示平台供应商'")
}

export async function ensureMembershipSchema() {
  await mysqlExec(`
    CREATE TABLE IF NOT EXISTS system_settings (
      ${Object.entries(systemSettingColumns).map(([name, def]) => `\`${name}\` ${def}`).join(',\n      ')},
      PRIMARY KEY (\`id\`),
      UNIQUE KEY \`uk_system_settings_key\` (\`setting_key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统设置表'
  `)
  for (const [column, definition] of Object.entries(userColumnSql)) {
    await ensureColumn('ai_users', column, definition)
  }
  for (const [column, definition] of Object.entries(pointColumnSql)) {
    await ensureColumn('points_logs', column, definition)
  }
  for (const [column, definition] of Object.entries(imageGenerationColumnSql)) {
    await ensureColumn('image_generations', column, definition)
  }
  for (const [column, definition] of Object.entries(videoGenerationColumnSql)) {
    await ensureColumn('video_generations', column, definition)
  }
  await ensurePlatformProviderSchema()
}

export async function adjustUserCredits(params: {
  userId: string
  amount: number
  operatorId?: string | null
  description?: string | null
  source?: string | null
  membershipPart?: boolean
  metadata?: Record<string, any>
}) {
  const user = await mysqlOne<UserRow>('SELECT * FROM ai_users WHERE id = ? AND is_deleted = 0 LIMIT 1', [params.userId])
  if (!user) throw new Error('用户不存在')
  const amount = Math.trunc(Number(params.amount || 0))
  if (!amount) throw new Error('调整积分不能为 0')
  const beforeBalance = Number(user.credits || 0)
  const beforeMembershipCredits = Number(user.membership_credits || 0)
  const afterBalance = beforeBalance + amount
  if (afterBalance < 0) throw new Error('调整后积分不能小于 0')
  const afterMembershipCredits = params.membershipPart
    ? Math.max(0, beforeMembershipCredits + amount)
    : beforeMembershipCredits
  const ts = now()
  await mysqlExec(`
    UPDATE ai_users
       SET credits = ?,
           membership_credits = ?,
           updated_by = ?,
           updated_at = ?
     WHERE id = ? AND is_deleted = 0
  `, [afterBalance, afterMembershipCredits, params.operatorId || 'system', ts, params.userId])
  const result = await mysqlExec(`
    INSERT INTO points_logs
    (user_id, amount, balance, before_balance, after_balance, type, description, status, metadata, operator_id, source, created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?, 0)
  `, [
    params.userId,
    amount,
    afterBalance,
    beforeBalance,
    afterBalance,
    amount > 0 ? 'ADMIN_ADD' : 'ADMIN_DEDUCT',
    params.description || '后台调整积分',
    stringifyJson(params.metadata || {}),
    params.operatorId || null,
    params.source || 'admin',
    params.operatorId || 'system',
    ts,
    params.operatorId || 'system',
    ts,
  ])
  await publishCreditBalanceChanged({
    userId: params.userId,
    credits: afterBalance,
    amount,
    reason: params.description || '后台调整积分',
    taskType: 'admin',
    relatedTaskId: String(result.insertId || ''),
  })
  return mysqlOne<UserRow>('SELECT * FROM ai_users WHERE id = ? LIMIT 1', [params.userId])
}

export function membershipGrantCredits(plan: PlanRow | null | undefined) {
  return Math.max(0, Math.trunc(Number(plan?.credits || 0)))
}

export async function activateMembershipForUser(params: {
  userId: string
  plan: PlanRow
  orderId?: number | null
  operatorId?: string | null
}) {
  const user = await mysqlOne<UserRow>('SELECT * FROM ai_users WHERE id = ? AND is_deleted = 0 LIMIT 1', [params.userId])
  if (!user) throw new Error('用户不存在')
  const ts = now()
  const currentExpiresAt = user.membership_expires_at ? new Date(user.membership_expires_at) : null
  const base = currentExpiresAt && currentExpiresAt > new Date() ? currentExpiresAt : new Date()
  const expiresAt = new Date(base)
  expiresAt.setDate(expiresAt.getDate() + Number(params.plan.duration_days || 30))
  const periodCredits = membershipGrantCredits(params.plan)
  const nextGrant = isYearlyPlan(params.plan) ? nextGrantAfter(base, expiresAt) : null
  const beforeBalance = Number(user.credits || 0)
  const afterBalance = beforeBalance + periodCredits
  const beforeMembershipCredits = Number(user.membership_credits || 0)
  const afterMembershipCredits = beforeMembershipCredits + periodCredits
  await mysqlExec(`
    UPDATE ai_users
       SET credits = ?,
           membership_credits = ?,
           membership_period_credits = ?,
           membership_plan_id = ?,
           membership_status = 'active',
           membership_started_at = COALESCE(membership_started_at, ?),
           membership_expires_at = ?,
           membership_next_grant_at = ?,
           membership_last_grant_at = ?,
           updated_by = ?,
           updated_at = ?
     WHERE id = ? AND is_deleted = 0
  `, [
    afterBalance,
    afterMembershipCredits,
    periodCredits,
    params.plan.id,
    sqlDate(base),
    sqlDate(expiresAt),
    sqlDate(nextGrant),
    ts,
    params.operatorId || 'system',
    ts,
    params.userId,
  ])
  if (periodCredits > 0) {
    await mysqlExec(`
      INSERT INTO points_logs
      (user_id, amount, balance, before_balance, after_balance, type, description, related_order_id, status, metadata, source, created_by, created_at, updated_by, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, 'MEMBERSHIP_GRANT', ?, ?, 'completed', ?, 'membership', ?, ?, ?, ?, 0)
    `, [
      params.userId,
      periodCredits,
      afterBalance,
      beforeBalance,
      afterBalance,
      `${params.plan.name || '会员'} 首期积分发放`,
      params.orderId || null,
      stringifyJson({ planId: params.plan.id, billingCycle: params.plan.billing_cycle || '', grantType: 'initial' }),
      params.operatorId || 'system',
      ts,
      params.operatorId || 'system',
      ts,
    ])
    await publishCreditBalanceChanged({ userId: params.userId, credits: afterBalance, amount: periodCredits, reason: '会员积分发放', taskType: 'membership' })
  }
  return mysqlOne<UserRow>('SELECT * FROM ai_users WHERE id = ? LIMIT 1', [params.userId])
}

export async function runMembershipJobs() {
  const ts = now()
  const activeUsers = await mysqlRows<UserRow>(`
    SELECT * FROM ai_users
     WHERE membership_status = 'active'
       AND is_deleted = 0
       AND is_active = 1
       AND membership_expires_at IS NOT NULL
  `)
  let expired = 0
  let granted = 0
  for (const user of activeUsers) {
    const expiresAt = new Date(user.membership_expires_at)
    if (expiresAt <= new Date()) {
      const beforeBalance = Number(user.credits || 0)
      const clearCredits = Math.max(0, Math.min(beforeBalance, Number(user.membership_credits || 0)))
      const afterBalance = beforeBalance - clearCredits
      await mysqlExec(`
        UPDATE ai_users
           SET credits = ?,
               membership_credits = 0,
               membership_period_credits = 0,
               membership_status = 'expired',
               membership_next_grant_at = NULL,
               updated_by = 'system',
               updated_at = ?
         WHERE id = ? AND is_deleted = 0
      `, [afterBalance, ts, user.id])
      if (clearCredits > 0) {
        await mysqlExec(`
          INSERT INTO points_logs
          (user_id, amount, balance, before_balance, after_balance, type, description, status, metadata, source, created_by, created_at, updated_by, updated_at, is_deleted)
          VALUES (?, ?, ?, ?, ?, 'MEMBERSHIP_EXPIRE_CLEAR', '会员到期清空会员积分', 'completed', ?, 'membership_job', 'system', ?, 'system', ?, 0)
        `, [user.id, -clearCredits, afterBalance, beforeBalance, afterBalance, stringifyJson({ expiredAt: user.membership_expires_at }), ts, ts])
        await publishCreditBalanceChanged({ userId: user.id, credits: afterBalance, amount: -clearCredits, reason: '会员到期清空会员积分', taskType: 'membership' })
      }
      expired += 1
      continue
    }
    const nextGrantAt = user.membership_next_grant_at ? new Date(user.membership_next_grant_at) : null
    if (!nextGrantAt || nextGrantAt > new Date()) continue
    const plan = await mysqlOne<PlanRow>('SELECT * FROM membership_plans WHERE id = ? AND is_deleted = 0 LIMIT 1', [user.membership_plan_id])
    if (!isYearlyPlan(plan)) continue
    const grantCredits = Math.max(0, Number(user.membership_period_credits || plan?.credits || 0))
    if (grantCredits <= 0) continue
    const beforeBalance = Number(user.credits || 0)
    const afterBalance = beforeBalance + grantCredits
    const afterMembershipCredits = Number(user.membership_credits || 0) + grantCredits
    const following = nextGrantAfter(nextGrantAt, expiresAt)
    await mysqlExec(`
      UPDATE ai_users
         SET credits = ?,
             membership_credits = ?,
             membership_last_grant_at = ?,
             membership_next_grant_at = ?,
             updated_by = 'system',
             updated_at = ?
       WHERE id = ? AND is_deleted = 0
    `, [afterBalance, afterMembershipCredits, ts, sqlDate(following), ts, user.id])
    await mysqlExec(`
      INSERT INTO points_logs
      (user_id, amount, balance, before_balance, after_balance, type, description, status, metadata, source, created_by, created_at, updated_by, updated_at, is_deleted)
      VALUES (?, ?, ?, ?, ?, 'MEMBERSHIP_MONTHLY_GRANT', '年会员月度积分发放', 'completed', ?, 'membership_job', 'system', ?, 'system', ?, 0)
    `, [user.id, grantCredits, afterBalance, beforeBalance, afterBalance, stringifyJson({ planId: plan?.id || user.membership_plan_id, grantAt: sqlDate(nextGrantAt) }), ts, ts])
    await publishCreditBalanceChanged({ userId: user.id, credits: afterBalance, amount: grantCredits, reason: '年会员月度积分发放', taskType: 'membership' })
    granted += 1
  }
  return { expired, granted }
}

let membershipJobTimer: NodeJS.Timeout | null = null
let membershipJobRunning = false

async function runMembershipJobsOnce() {
  if (membershipJobRunning) return
  membershipJobRunning = true
  try {
    await runMembershipJobs()
  } catch (error) {
    console.error('membership job failed:', error)
  } finally {
    membershipJobRunning = false
  }
}

export async function startMembershipScheduler() {
  await ensureMembershipSchema()
  await runMembershipJobsOnce()
  if (membershipJobTimer) return
  const intervalMs = Math.max(60_000, Number(process.env.MEMBERSHIP_JOB_INTERVAL_MS || 10 * 60_000))
  membershipJobTimer = setInterval(() => {
    runMembershipJobsOnce()
  }, intervalMs)
  membershipJobTimer.unref?.()
}

export function membershipMetadata(value: string | null | undefined) {
  return parseJson(value, {})
}
