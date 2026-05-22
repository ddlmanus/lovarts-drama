import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Context } from 'hono'
import type { MiddlewareHandler } from 'hono'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { forbidden, unauthorized } from './response.js'

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000

function secret() {
  return process.env.AUTH_SECRET || process.env.JWT_SECRET || 'huobao-local-auth-secret'
}

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function signPayload(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function hashPassword(password: string, salt = randomBytes(16).toString('base64url')) {
  const hash = createHmac('sha256', `${secret()}:${salt}`).update(password).digest('base64url')
  return `${salt}.${hash}`
}

export function verifyPassword(password: string, stored?: string | null) {
  const [salt, expected] = String(stored || '').split('.')
  if (!salt || !expected) return false
  const actual = hashPassword(password, salt).split('.')[1]
  const a = Buffer.from(actual)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function createAuthToken(userId: string) {
  const payload = b64url(JSON.stringify({
    sub: userId,
    exp: Date.now() + TOKEN_TTL_MS,
  }))
  return `${payload}.${signPayload(payload)}`
}

export function verifyAuthToken(token?: string | null): string | null {
  const [payload, signature] = String(token || '').split('.')
  if (!payload || !signature || signPayload(payload) !== signature) return null
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'))
    if (!parsed?.sub || Number(parsed.exp || 0) < Date.now()) return null
    return String(parsed.sub)
  } catch {
    return null
  }
}

function tokenFromRequest(c: Context): string {
  const authorization = c.req.header('authorization') || ''
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : ''
  return bearer || c.req.query('token') || ''
}

export function optionalAuthUserId(c: Context): string | null {
  const verified = verifyAuthToken(tokenFromRequest(c))
  if (verified) return verified
  if (process.env.ALLOW_DEV_USER_HEADER === '1') {
    const devUserId = String(c.req.header('x-user-id') || '').trim()
    return devUserId || null
  }
  return null
}

export function currentAuthUserId(c: Context): string {
  return optionalAuthUserId(c) || 'default'
}

export async function currentAuthUser(c: Context) {
  const userId = optionalAuthUserId(c)
  if (!userId) return null
  const row = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  if (!row || !row.isActive || row.deletedAt || row.isDeleted) return null
  return row
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const user = await currentAuthUser(c)
  if (!user) return unauthorized(c, '请先登录')
  c.set('authUser', user)
  c.set('authUserId', user.id)
  await next()
}

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const user = await currentAuthUser(c)
  if (!user) return unauthorized(c, '请先登录')
  if (user.role !== 'admin') return forbidden(c, '需要管理员权限')
  c.set('authUser', user)
  c.set('authUserId', user.id)
  await next()
}
