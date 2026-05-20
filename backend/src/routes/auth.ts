import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, success, now } from '../utils/response.js'
import { createAuthToken, currentAuthUserId, hashPassword, verifyPassword } from '../utils/auth.js'

const app = new Hono()

function serializeUser(row: typeof schema.aiUsers.$inferSelect) {
  return {
    id: row.id,
    account: row.account || row.id,
    name: row.name,
    email: row.email || '',
    role: row.role || 'user',
    is_active: Boolean(row.isActive),
  }
}

function randomUserId(account: string) {
  return `user_${account}_${Math.random().toString(36).slice(2, 8)}`
}

app.post('/register', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const account = String(body.account || body.username || '').trim()
  const password = String(body.password || '')
  const confirmPassword = String(body.confirm_password || body.confirmPassword || password)
  const captcha = String(body.captcha || '').trim()
  const captchaId = String(body.captcha_id || body.captchaId || '').trim()
  const inviteCode = String(body.invite_code || body.inviteCode || '').trim()
  if (!/^[A-Za-z0-9_]{3,32}$/.test(account)) return badRequest(c, '账号需为 3-32 位字母、数字或下划线')
  if (password.length < 6) return badRequest(c, '密码不少于 6 位')
  if (password !== confirmPassword) return badRequest(c, '两次密码不一致')
  if (captchaId && captcha !== captchaId.slice(-4)) return badRequest(c, '验证码错误')

  const existing = db.select().from(schema.aiUsers).where(eq(schema.aiUsers.account, account)).all()[0]
  if (existing) return badRequest(c, '账号已存在')

  const ts = now()
  const userId = randomUserId(account)
  db.insert(schema.aiUsers).values({
    id: userId,
    account,
    name: account,
    passwordHash: hashPassword(password),
    inviteCode,
    role: 'user',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).run()

  const user = db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).all()[0]
  return success(c, { token: createAuthToken(userId), user: serializeUser(user), needs_provider: true })
})

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const account = String(body.account || body.username || '').trim()
  const password = String(body.password || '')
  const captcha = String(body.captcha || '').trim()
  const captchaId = String(body.captcha_id || body.captchaId || '').trim()
  if (captchaId && captcha !== captchaId.slice(-4)) return badRequest(c, '验证码错误')
  const user = db.select().from(schema.aiUsers).where(eq(schema.aiUsers.account, account)).all()[0]
  if (!user || !verifyPassword(password, user.passwordHash)) return badRequest(c, '账号或密码错误')
  if (!user.isActive) return badRequest(c, '账号已停用')
  return success(c, { token: createAuthToken(user.id), user: serializeUser(user) })
})

app.get('/me', (c) => {
  const userId = currentAuthUserId(c)
  const user = db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).all()[0]
  return success(c, user ? serializeUser(user) : null)
})

export default app
