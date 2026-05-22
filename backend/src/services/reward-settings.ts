import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now } from '../utils/response.js'
import { publishCreditBalanceChanged } from './credit-events.js'

export const rewardSettingDefaults = [
  { key: 'daily_login_bonus_credits', value: '0', group: 'rewards', label: '每天登录赠送积分', valueType: 'number' },
  { key: 'register_bonus_credits', value: '0', group: 'rewards', label: '用户注册赠送积分', valueType: 'number' },
  { key: 'invite_bonus_credits', value: '0', group: 'rewards', label: '每邀请一人赠送积分', valueType: 'number' },
] as const

export const rewardSettingKeys = rewardSettingDefaults.map(item => item.key)

function positiveInt(value: unknown) {
  const parsed = Math.trunc(Number(value || 0))
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function sameMysqlDay(left?: string | Date | null, right: Date = new Date()) {
  if (!left) return false
  const date = left instanceof Date ? left : new Date(left)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === right.getFullYear()
    && date.getMonth() === right.getMonth()
    && date.getDate() === right.getDate()
}

function localDayKey(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function ensureRewardSettings() {
  const ts = now()
  for (const item of rewardSettingDefaults) {
    const existing = (await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, item.key)).execute())[0]
    if (existing) continue
    await db.insert(schema.systemSettings).values({
      key: item.key,
      value: item.value,
      group: item.group,
      label: item.label,
      valueType: item.valueType,
      isSecret: false,
      createdBy: 'system',
      createdAt: ts,
      updatedBy: 'system',
      updatedAt: ts,
    }).execute()
  }
}

export async function rewardSettings() {
  await ensureRewardSettings()
  const rows = await db.select().from(schema.systemSettings).where(inArray(schema.systemSettings.key, rewardSettingKeys)).execute()
  const values = Object.fromEntries(rows.map(row => [row.key, row.value || '']))
  return {
    dailyLoginBonusCredits: positiveInt(values.daily_login_bonus_credits),
    registerBonusCredits: positiveInt(values.register_bonus_credits),
    inviteBonusCredits: positiveInt(values.invite_bonus_credits),
  }
}

async function addRewardCredits(params: {
  user: typeof schema.aiUsers.$inferSelect
  amount: number
  type: string
  description: string
  taskType?: string
  relatedTaskId?: string | null
  metadata?: Record<string, any>
}) {
  const amount = positiveInt(params.amount)
  if (!amount) return params.user

  const ts = now()
  const beforeBalance = Number(params.user.credits || 0)
  const nextBalance = beforeBalance + amount
  await db.update(schema.aiUsers)
    .set({ credits: nextBalance, updatedBy: 'system', updatedAt: ts })
    .where(eq(schema.aiUsers.id, params.user.id))
    .execute()
  await db.insert(schema.pointsLogs).values({
    userId: params.user.id,
    amount,
    balance: nextBalance,
    type: params.type,
    description: params.description,
    relatedTaskId: params.relatedTaskId || null,
    taskType: params.taskType || 'reward',
    status: 'completed',
    metadata: JSON.stringify({ beforeBalance, afterBalance: nextBalance, ...(params.metadata || {}) }),
    createdBy: 'system',
    createdAt: ts,
    updatedBy: 'system',
    updatedAt: ts,
  }).execute()
  await publishCreditBalanceChanged({
    userId: params.user.id,
    credits: nextBalance,
    amount,
    reason: params.description,
    taskType: params.taskType || 'reward',
    relatedTaskId: params.relatedTaskId || undefined,
  })
  return { ...params.user, credits: nextBalance, updatedAt: ts }
}

export async function grantRegisterRewards(user: typeof schema.aiUsers.$inferSelect, inviteCode = '') {
  const settings = await rewardSettings()
  let currentUser = await addRewardCredits({
    user,
    amount: settings.registerBonusCredits,
    type: 'REGISTER_BONUS',
    description: '用户注册赠送积分',
    taskType: 'register',
    relatedTaskId: user.id,
  })

  const normalizedInviteCode = String(inviteCode || '').trim()
  if (normalizedInviteCode && settings.inviteBonusCredits > 0) {
    const users = await db.select().from(schema.aiUsers).where(and(eq(schema.aiUsers.isDeleted, false), eq(schema.aiUsers.isActive, true))).execute()
    const inviter = users.find(row =>
      row.id !== user.id
      && [row.id, row.account, row.inviteCode].some(value => String(value || '').trim() === normalizedInviteCode),
    )
    if (inviter) {
      await addRewardCredits({
        user: inviter,
        amount: settings.inviteBonusCredits,
        type: 'INVITE_BONUS',
        description: '邀请用户注册赠送积分',
        taskType: 'invite',
        relatedTaskId: user.id,
        metadata: { invitedUserId: user.id, inviteCode: normalizedInviteCode },
      })
    }
  }

  return currentUser
}

export async function grantDailyLoginReward(user: typeof schema.aiUsers.$inferSelect) {
  const settings = await rewardSettings()
  if (!settings.dailyLoginBonusCredits) return user
  const today = localDayKey()
  const existing = (await db.select().from(schema.pointsLogs).where(and(
    eq(schema.pointsLogs.userId, user.id),
    eq(schema.pointsLogs.type, 'DAILY_LOGIN_BONUS'),
  )).execute()).find(row => row.relatedTaskId === today || sameMysqlDay(row.createdAt))
  if (existing) return user
  return addRewardCredits({
    user,
    amount: settings.dailyLoginBonusCredits,
    type: 'DAILY_LOGIN_BONUS',
    description: '每天登录赠送积分',
    taskType: 'daily_login',
    relatedTaskId: today,
  })
}
