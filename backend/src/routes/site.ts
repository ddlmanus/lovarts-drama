import { Hono } from 'hono'
import { publicBrandSettings } from './adminSystem.js'
import { success } from '../utils/response.js'

const app = new Hono()

app.get('/settings', async (c) => {
  return success(c, await publicBrandSettings())
})

export default app
