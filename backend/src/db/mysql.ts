import mysql from 'mysql2/promise'
import { drizzle } from 'drizzle-orm/mysql2'
import { env } from '../config/env.js'

export const mysqlPool = mysql.createPool({
  host: env.database.mysql.host,
  port: env.database.mysql.port,
  user: env.database.mysql.user,
  password: env.database.mysql.password,
  database: env.database.mysql.database,
  waitForConnections: true,
  connectionLimit: env.database.mysql.connectionLimit,
  namedPlaceholders: true,
  connectTimeout: env.database.mysql.connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  timezone: env.database.mysql.timezone,
  ssl: env.database.mysql.ssl ? {} : undefined,
})

export const mysqlDb = drizzle(mysqlPool)

export async function pingMysql() {
  const conn = await mysqlPool.getConnection()
  try {
    await conn.ping()
  } finally {
    conn.release()
  }
}
