import { now } from '../utils/response.js'
import { fromMysqlUser, mysqlExec, mysqlOne, toMysqlDateTime } from './runtime.js'

export async function findUserById(userId: string) {
  const row = await mysqlOne('SELECT * FROM ai_users WHERE id = ? AND is_deleted = 0 LIMIT 1', [userId])
  return fromMysqlUser(row)
}

export async function ensureUser(userId: string) {
  const existing = await findUserById(userId)
  if (existing) return existing
  const ts = now()
  await mysqlExec(`
    INSERT INTO ai_users (id, name, role, credits, membership_credits, membership_period_credits, membership_status, is_active, created_by, created_at, updated_by, updated_at, is_deleted)
    VALUES (?, ?, 'user', 0, 0, 0, 'none', 1, 'system', ?, 'system', ?, 0)
  `, [userId, userId, toMysqlDateTime(ts), toMysqlDateTime(ts)])
  return findUserById(userId)
}

export async function isActiveMember(userId: string) {
  const user = await findUserById(userId)
  if (!user || user.membershipStatus !== 'active') return false
  if (!user.membershipExpiresAt) return true
  return new Date(user.membershipExpiresAt).getTime() > Date.now()
}

export async function updateUserCredits(userId: string, credits: number) {
  const ts = now()
  await mysqlExec('UPDATE ai_users SET credits = ?, updated_by = ?, updated_at = ? WHERE id = ? AND is_deleted = 0', [credits, 'system', toMysqlDateTime(ts), userId])
  return findUserById(userId)
}

export async function consumeUserCredits(userId: string, amount: number) {
  const user = await findUserById(userId)
  if (!user) throw new Error('用户不存在')
  const currentCredits = Number(user.credits || 0)
  const currentMembershipCredits = Number(user.membershipCredits || 0)
  if (currentCredits < amount) throw new Error(`积分不足，当前 ${currentCredits}，本次需要 ${amount}`)
  const membershipDeduct = Math.min(currentMembershipCredits, amount)
  const ts = now()
  await mysqlExec(`
    UPDATE ai_users
       SET credits = ?,
           membership_credits = ?,
           updated_by = 'system',
           updated_at = ?
     WHERE id = ? AND is_deleted = 0
  `, [currentCredits - amount, currentMembershipCredits - membershipDeduct, toMysqlDateTime(ts), userId])
  return findUserById(userId)
}
