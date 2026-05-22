import type { Context } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { currentAuthUserId } from './auth.js'

export function requestUserId(c: Context) {
  return currentAuthUserId(c)
}

export function ownedRow(row: any, userId: string) {
  return !!row && !row.deletedAt && !row.isDeleted && row.userId === userId
}

export async function getOwnedDrama(c: Context, dramaId: number) {
  const userId = requestUserId(c)
  const [drama] = await db.select().from(schema.dramas)
    .where(and(eq(schema.dramas.id, dramaId), eq(schema.dramas.userId, userId), isNull(schema.dramas.deletedAt)))
    .execute()
  return drama || null
}

export async function getOwnedEpisode(c: Context, episodeId: number) {
  const userId = requestUserId(c)
  const [episode] = await db.select().from(schema.episodes)
    .where(and(eq(schema.episodes.id, episodeId), eq(schema.episodes.userId, userId), isNull(schema.episodes.deletedAt)))
    .execute()
  return episode || null
}

export async function ensureOwnedDrama(c: Context, dramaId: number) {
  return getOwnedDrama(c, dramaId)
}

export async function ensureOwnedEpisode(c: Context, episodeId: number) {
  return getOwnedEpisode(c, episodeId)
}
