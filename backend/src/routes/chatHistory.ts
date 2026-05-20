import fs from 'node:fs'
import path from 'node:path'
import { Hono } from 'hono'
import { badRequest, success, now } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()
const DATA_PATH = path.resolve(process.cwd(), '../data/chat-history.json')

interface ChatSession {
  id: string
  userId: string
  title: string
  model?: string
  messages: any[]
  createdAt: string
  updatedAt: string
}

function ensureStoreDir() {
  fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true })
}

function readStore(): { sessions: ChatSession[] } {
  ensureStoreDir()
  if (!fs.existsSync(DATA_PATH)) return { sessions: [] }
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'))
    return { sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [] }
  } catch {
    return { sessions: [] }
  }
}

function writeStore(store: { sessions: ChatSession[] }) {
  ensureStoreDir()
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2))
}

function makeId() {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function normalizeSession(session: ChatSession) {
  return {
    id: session.id,
    title: session.title,
    model: session.model || '',
    messages: Array.isArray(session.messages) ? session.messages : [],
    created_at: session.createdAt,
    updated_at: session.updatedAt,
  }
}

app.get('/', (c) => {
  const userId = currentAuthUserId(c)
  const store = readStore()
  const sessions = store.sessions
    .filter(session => session.userId === userId)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .map(normalizeSession)
  return success(c, sessions)
})

app.post('/', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const ts = now()
  const store = readStore()
  const session: ChatSession = {
    id: makeId(),
    userId,
    title: String(body.title || '新对话').trim().slice(0, 80) || '新对话',
    model: body.model ? String(body.model) : '',
    messages: Array.isArray(body.messages) ? body.messages : [],
    createdAt: ts,
    updatedAt: ts,
  }
  store.sessions.push(session)
  writeStore(store)
  return success(c, normalizeSession(session))
})

app.put('/:id', async (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const store = readStore()
  const session = store.sessions.find(item => item.id === id && item.userId === userId)
  if (!session) return badRequest(c, 'chat session not found')

  if (body.title !== undefined) session.title = String(body.title || '新对话').trim().slice(0, 80) || '新对话'
  if (body.model !== undefined) session.model = String(body.model || '')
  if (Array.isArray(body.messages)) session.messages = body.messages
  session.updatedAt = now()
  writeStore(store)
  return success(c, normalizeSession(session))
})

app.delete('/:id', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const store = readStore()
  const before = store.sessions.length
  store.sessions = store.sessions.filter(item => !(item.id === id && item.userId === userId))
  if (store.sessions.length === before) return badRequest(c, 'chat session not found')
  writeStore(store)
  return success(c)
})

export default app
