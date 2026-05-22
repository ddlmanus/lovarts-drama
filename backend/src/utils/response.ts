import type { Context } from 'hono'

export function success(c: Context, data: any = null) {
  return c.json({ code: 200, success: true, data, message: 'success' })
}

export function created(c: Context, data: any = null) {
  return c.json({ code: 201, success: true, data, message: 'created' }, 201)
}

export function badRequest(c: Context, message = 'bad request') {
  return c.json({ code: 400, success: false, data: null, message }, 400)
}

export function unauthorized(c: Context, message = 'unauthorized') {
  return c.json({ code: 401, success: false, data: null, message }, 401)
}

export function forbidden(c: Context, message = 'forbidden') {
  return c.json({ code: 403, success: false, data: null, message }, 403)
}

export function notFound(c: Context, message = 'not found') {
  return c.json({ code: 404, success: false, data: null, message }, 404)
}

export function serverError(c: Context, message = 'internal error') {
  return c.json({ code: 500, success: false, data: null, message }, 500)
}

export function mysqlDateTime(value: Date | string | number = new Date()) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
  ].join('-') + ' ' + [
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join(':')
}

export function now() {
  return mysqlDateTime(new Date())!
}
