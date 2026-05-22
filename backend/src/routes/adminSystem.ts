import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { now, success } from '../utils/response.js'
import { ensureRewardSettings, rewardSettingKeys } from '../services/reward-settings.js'

const app = new Hono()

const groups = {
  site: ['site_name', 'site_title', 'site_description', 'site_keywords'],
  brand: ['site_logo_url', 'default_avatar_url'],
  storage: ['storage_driver', 'oss_region', 'oss_bucket', 'oss_endpoint', 'oss_access_key_id', 'oss_access_key_secret', 'oss_public_base_url'],
  rewards: rewardSettingKeys,
}

async function publicSettings() {
  await ensureRewardSettings()
  const rows = (await db.select().from(schema.systemSettings).execute())
  return Object.fromEntries(rows.map(row => [row.key, row.isSecret && row.value ? '********' : row.value || '']))
}

export async function publicBrandSettings() {
  const settings = await publicSettings()
  return {
    site_name: settings.site_name || 'Lovarts短剧平台',
    site_title: settings.site_title || settings.site_name || 'Lovarts短剧平台',
    site_logo_url: settings.site_logo_url || '',
    default_avatar_url: settings.default_avatar_url || '',
  }
}

function allowedKeys() {
  return new Set(Object.values(groups).flat())
}

app.get('/settings', async (c) => {
  return success(c, await publicSettings())
})

app.get('/public-settings', async (c) => {
  return success(c, await publicBrandSettings())
})

app.put('/settings', async (c) => {
  const body = await c.req.json()
  await ensureRewardSettings()
  const keys = allowedKeys()
  const ts = now()

  for (const key of keys) {
    if (!(key in body)) continue
    const existing = (await db.select().from(schema.systemSettings).where(eq(schema.systemSettings.key, key)).execute())[0]
    const next = String(body[key] ?? '').trim()
    if (existing?.isSecret && !next) continue
    if (existing) {
      await db.update(schema.systemSettings)
        .set({ value: next, updatedAt: ts })
        .where(eq(schema.systemSettings.key, key))
        .execute()
    }
  }

  return success(c, await publicSettings())
})

export default app
