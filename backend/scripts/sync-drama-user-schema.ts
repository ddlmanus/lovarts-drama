import { mysqlPool } from '../src/db/mysql.js'

async function hasColumn(table: string, column: string) {
  const [rows] = await mysqlPool.query<any[]>(
    `SELECT COUNT(*) AS count
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  )
  return Number(rows?.[0]?.count || 0) > 0
}

async function ensureUserColumn(table: string) {
  if (!(await hasColumn(table, 'user_id'))) {
    await mysqlPool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`user_id\` VARCHAR(64) NULL COMMENT '用户ID' AFTER \`id\``)
  }
  await mysqlPool.query(`UPDATE \`${table}\` SET user_id = created_by WHERE (user_id IS NULL OR user_id = '') AND created_by IS NOT NULL AND created_by <> ''`)
  await mysqlPool.query(`CREATE INDEX idx_${table}_user_deleted ON \`${table}\` (user_id, deleted_at)`)
    .catch((error: any) => {
      if (!String(error?.message || '').includes('Duplicate key name')) throw error
    })
}

for (const table of ['dramas', 'episodes', 'characters', 'character_library', 'scenes', 'scene_library', 'storyboards']) {
  await ensureUserColumn(table)
}

console.log('drama user schema synced')
await mysqlPool.end()
