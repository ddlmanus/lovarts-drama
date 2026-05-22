const TRANSIENT_MYSQL_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'PROTOCOL_CONNECTION_LOST',
  'EPIPE',
  'ECONNREFUSED',
])

function mysqlErrorCode(error: any): string {
  return String(error?.code || error?.errno || '').trim()
}

export function isTransientMysqlError(error: any): boolean {
  if (!error) return false
  const code = mysqlErrorCode(error)
  if (TRANSIENT_MYSQL_CODES.has(code)) return true
  if (error.fatal && (error.syscall === 'read' || error.syscall === 'write')) return true
  return isTransientMysqlError(error.cause) || isTransientMysqlError(error.originalError)
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function withMysqlRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: any
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      if (attempt >= attempts || !isTransientMysqlError(error)) throw error
      await sleep(150 * attempt)
    }
  }
  throw lastError
}
