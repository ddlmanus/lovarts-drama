import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { hashPassword } from '../utils/auth.js'
import { now } from '../utils/response.js'

const DEFAULT_ADMIN_ID = 'admin'
const DEFAULT_ADMIN_ACCOUNT = 'admin'
const DEFAULT_ADMIN_PASSWORD = 'Admin@123456'

export async function ensureDefaultAdmin() {
  const account = String(process.env.ADMIN_ACCOUNT || DEFAULT_ADMIN_ACCOUNT).trim()
  const password = String(process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD)
  const name = String(process.env.ADMIN_NAME || '系统管理员').trim()
  if (!account || !password) return null

  const existing = (await db.select().from(schema.aiUsers).where(eq(schema.aiUsers.account, account)).execute())[0]
  const ts = now()

  if (!existing) {
    const id = account === DEFAULT_ADMIN_ACCOUNT ? DEFAULT_ADMIN_ID : `admin_${account}`
    await db.insert(schema.aiUsers).values({
      id,
      account,
      name,
      passwordHash: hashPassword(password),
      role: 'admin',
      isActive: true,
      loginChannel: 'password',
      createdAt: ts,
      updatedAt: ts,
    }).execute()
    console.log(`Default admin ensured: ${account}`)
    return { account, created: true }
  }

  const patch: Partial<typeof schema.aiUsers.$inferInsert> = {
    role: 'admin',
    isActive: true,
    updatedAt: ts,
  }

  if (!existing.passwordHash || process.env.RESET_DEFAULT_ADMIN_PASSWORD === '1') {
    patch.passwordHash = hashPassword(password)
  }

  await db.update(schema.aiUsers).set(patch).where(eq(schema.aiUsers.id, existing.id)).execute()
  console.log(`Default admin ensured: ${account}`)
  return { account, created: false }
}
