import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { badRequest, forbidden, success, now } from '../utils/response.js'
import { createAuthToken, currentAuthUser, currentAuthUserId, hashPassword, verifyPassword } from '../utils/auth.js'

const app = new Hono()

function serializeUser(row: typeof schema.aiUsers.$inferSelect) {
  return {
    id: row.id,
    account: row.account || row.id,
    name: row.name,
    phone: row.phone || '',
    email: row.email || '',
    credits: Number(row.credits || 0),
    membership_credits: Number(row.membershipCredits || 0),
    membership_status: row.membershipStatus || 'none',
    membership_expires_at: row.membershipExpiresAt || null,
    resource_mode: row.resourceMode || 'unset',
    onboarding_completed_at: row.onboardingCompletedAt || null,
    needs_onboarding: !row.onboardingCompletedAt && !['user_api', 'platform', 'mixed'].includes(String(row.resourceMode || '').toLowerCase()),
    wx_openid: row.wxOpenid || '',
    wx_unionid: row.wxUnionid || '',
    wx_nickname: row.wxNickname || '',
    wx_avatar: row.wxAvatar || '',
    wx_bound_at: row.wxBoundAt || null,
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
  const phone = String(body.phone || '').trim()
  const password = String(body.password || '')
  const confirmPassword = String(body.confirm_password || body.confirmPassword || password)
  const captcha = String(body.captcha || '').trim()
  const captchaId = String(body.captcha_id || body.captchaId || '').trim()
  const inviteCode = String(body.invite_code || body.inviteCode || '').trim()
  if (!/^[A-Za-z0-9_]{3,32}$/.test(account)) return badRequest(c, '账号需为 3-32 位字母、数字或下划线')
  if (password.length < 6) return badRequest(c, '密码不少于 6 位')
  if (password !== confirmPassword) return badRequest(c, '两次密码不一致')
  if (captchaId && captcha !== captchaId.slice(-4)) return badRequest(c, '验证码错误')

  const existing = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.account, account)).execute())[0]
  if (existing) return badRequest(c, '账号已存在')

  const ts = now()
  const userId = randomUserId(account)
  await db.insert(schema.aiUsers).values({
    id: userId,
    account,
    name: account,
    phone,
    passwordHash: hashPassword(password),
    inviteCode,
    role: 'user',
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  }).execute()

  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  return success(c, { token: createAuthToken(userId), user: serializeUser(user), needs_onboarding: true })
})

app.post('/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const account = String(body.account || body.username || '').trim()
  const password = String(body.password || '')
  const captcha = String(body.captcha || '').trim()
  const captchaId = String(body.captcha_id || body.captchaId || '').trim()
  if (captchaId && captcha !== captchaId.slice(-4)) return badRequest(c, '验证码错误')
  const users = await db.select().from(schema.aiUsers).execute()
  const user = users.find(row => row.account === account || row.phone === account || row.email === account)
  if (!user || !verifyPassword(password, user.passwordHash)) return badRequest(c, '账号或密码错误')
  if (!user.isActive) return badRequest(c, '账号已停用')
  await db.update(schema.aiUsers).set({
    lastLoginAt: now(),
    lastLoginIp: String(c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '').split(',')[0]?.trim() || null,
    loginChannel: 'password',
    updatedAt: now(),
  }).where(eq(schema.aiUsers.id, user.id)).execute()
  return success(c, { token: createAuthToken(user.id), user: serializeUser(user) })
})

app.post('/wechat/bind', async (c) => {
  const userId = currentAuthUserId(c)
  if (!userId || userId === 'default') return badRequest(c, '请先登录')
  const body = await c.req.json().catch(() => ({}))
  const openid = String(body.openid || body.wx_openid || body.wxOpenid || '').trim()
  const unionid = String(body.unionid || body.wx_unionid || body.wxUnionid || '').trim()
  if (!openid && !unionid) return badRequest(c, 'openid or unionid is required')
  const ts = now()
  await db.update(schema.aiUsers).set({
    wxOpenid: openid || null,
    wxUnionid: unionid || null,
    wxNickname: body.nickname || body.wx_nickname || body.wxNickname || null,
    wxAvatar: body.avatar || body.wx_avatar || body.wxAvatar || null,
    wxBoundAt: ts,
    updatedAt: ts,
  }).where(eq(schema.aiUsers.id, userId)).execute()
  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  return success(c, serializeUser(user))
})

app.post('/wechat/login', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const openid = String(body.openid || body.wx_openid || body.wxOpenid || '').trim()
  const unionid = String(body.unionid || body.wx_unionid || body.wxUnionid || '').trim()
  if (!openid && !unionid) return badRequest(c, 'openid or unionid is required')
  const rows = await db.select().from(schema.aiUsers).execute()
  let user = rows.find(row => (openid && row.wxOpenid === openid) || (unionid && row.wxUnionid === unionid))
  const ts = now()
  if (!user) {
    const userId = `wx_${unionid || openid}_${Math.random().toString(36).slice(2, 8)}`
    await db.insert(schema.aiUsers).values({
      id: userId,
      account: userId,
      name: body.nickname || '微信用户',
      wxOpenid: openid || null,
      wxUnionid: unionid || null,
      wxNickname: body.nickname || null,
      wxAvatar: body.avatar || null,
      wxBoundAt: ts,
      loginChannel: 'wechat',
      role: 'user',
      isActive: true,
      createdAt: ts,
      updatedAt: ts,
    }).execute()
    user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  }
  if (!user.isActive) return badRequest(c, '账号已停用')
  await db.update(schema.aiUsers).set({
    lastLoginAt: ts,
    lastLoginIp: String(c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || '').split(',')[0]?.trim() || null,
    loginChannel: 'wechat',
    updatedAt: ts,
  }).where(eq(schema.aiUsers.id, user.id)).execute()
  const updated = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, user.id)).execute())[0]
  return success(c, { token: createAuthToken(user.id), user: serializeUser(updated) })
})

app.get('/me', async (c) => {
  const userId = currentAuthUserId(c)
  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  return success(c, user ? serializeUser(user) : null)
})

app.post('/onboarding/resource-mode', async (c) => {
  const userId = currentAuthUserId(c)
  if (!userId || userId === 'default') return badRequest(c, '请先登录')
  const body = await c.req.json().catch(() => ({}))
  const mode = String(body.resource_mode || body.resourceMode || '').trim().toLowerCase()
  if (!['user_api', 'platform', 'mixed'].includes(mode)) return badRequest(c, 'resource_mode is invalid')
  const ts = now()
  await db.update(schema.aiUsers).set({
    resourceMode: mode,
    onboardingCompletedAt: ts,
    updatedAt: ts,
  }).where(eq(schema.aiUsers.id, userId)).execute()
  const user = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.id, userId)).execute())[0]
  return success(c, serializeUser(user))
})

app.get('/admin/me', async (c) => {
  const user = await currentAuthUser(c)
  if (!user) return forbidden(c, '请先登录管理员账号')
  if (user.role !== 'admin') return forbidden(c, '需要管理员权限')
  return success(c, serializeUser(user))
})

export default app
