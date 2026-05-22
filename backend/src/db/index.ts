import { mysqlDb, mysqlPool } from './mysql.js'
import * as schema from './schema.js'
import { withMysqlRetry } from './mysql-retry.js'

export function dbInsertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0)
}

function withMysqlExecute<T>(value: T): T {
  if (!value || typeof value !== 'object') return value
  return new Proxy(value as any, {
    get(target, prop, receiver) {
      if (prop === 'execute') {
        return async (...args: any[]) => {
          const result = await withMysqlRetry(() => target.execute(...args))
          if (Array.isArray(result) && result[0] && typeof result[0] === 'object' && 'insertId' in result[0]) return result[0]
          return result
        }
      }
      const raw = Reflect.get(target, prop, receiver)
      if (typeof raw !== 'function') return withMysqlExecute(raw)
      return (...args: any[]) => withMysqlExecute(raw.apply(target, args))
    },
  })
}

export const db = withMysqlExecute(mysqlDb) as any
export { mysqlPool, schema }
