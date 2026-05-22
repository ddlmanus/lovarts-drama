import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mysqlPool } from '../src/db/mysql.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const sqlPath = path.resolve(__dirname, '../sql/mysql-init.sql')

function splitSql(raw: string) {
  return raw
    .split(/;\s*(?:\r?\n|$)/)
    .map(item => item.trim())
    .filter(Boolean)
}

const raw = await fs.readFile(sqlPath, 'utf8')
const conn = await mysqlPool.getConnection()
try {
  for (const statement of splitSql(raw)) {
    await conn.query(statement)
  }
  console.log(`MySQL schema initialized from ${sqlPath}`)
} finally {
  conn.release()
  await mysqlPool.end()
}
