import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { Context } from 'hono'

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

export function currentAuthUserId(c: Context): string {
  const authorization = c.req.header('authorization') || ''
  const bearer = authorization.toLowerCase().startsWith('bearer ') ? authorization.slice(7).trim() : ''
  return verifyAuthToken(bearer) || String(c.req.header('x-user-id') || c.req.query('user_id') || 'default').trim() || 'default'
}
