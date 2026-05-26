import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import dramas from './routes/dramas.js'
import episodes from './routes/episodes.js'
import storyboards from './routes/storyboards.js'
import scenes from './routes/scenes.js'
import characters from './routes/characters.js'
import images from './routes/images.js'
import videos from './routes/videos.js'
import upload from './routes/upload.js'
import aiConfigs, { aiProviders } from './routes/aiConfigs.js'
import aiModels from './routes/aiModels.js'
import adminCommerce from './routes/adminCommerce.js'
import adminSystem from './routes/adminSystem.js'
import adminUsers from './routes/adminUsers.js'
import site from './routes/site.js'
import billing, { handlePaymentCallback } from './routes/billing.js'
import agentConfigs from './routes/agentConfigs.js'
import agent from './routes/agent.js'
import compose from './routes/compose.js'
import merge from './routes/merge.js'
import grid from './routes/grid.js'
import skills from './routes/skills.js'
import webhooks from './routes/webhooks.js'
import aiVoices from './routes/aiVoices.js'
import tasks from './routes/tasks.js'
import creations from './routes/creations.js'
import multimodal from './routes/multimodal.js'
import embeddings from './routes/embeddings.js'
import auth from './routes/auth.js'
import chatHistory from './routes/chatHistory.js'
import codexWorkspace from './routes/codexWorkspace.js'
import events from './routes/events.js'
import canvasProjects from './routes/canvasProjects.js'
import { requestLogger, errorHandler } from './middleware/logger.js'
import { requireAdmin, requireAuth } from './utils/auth.js'
import { ensureMembershipSchema, startMembershipScheduler } from './services/membership.js'
import { ensureDefaultAdmin } from './services/default-admin.js'
import { ensureCanvasProjectsSchema } from './services/canvas-projects.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')

const app = new Hono()

// Middleware
app.use('*', cors({
  origin: ['http://localhost:3013', 'http://localhost:3000', 'http://localhost:5679'],
  credentials: true,
}))
app.use('*', requestLogger)
app.use('*', errorHandler)

// Health check
app.get('/api/v1/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }))
app.all('/api/payments/callback/:channel', handlePaymentCallback)
app.all('/api/v1/payments/callback/:channel', handlePaymentCallback)

// API routes
const api = new Hono()
api.use('/upload', requireAuth)
api.use('/upload/*', requireAuth)
api.use('/images', requireAuth)
api.use('/images/*', requireAuth)
api.use('/videos', requireAuth)
api.use('/videos/*', requireAuth)
api.use('/multimodal', requireAuth)
api.use('/multimodal/*', requireAuth)
api.use('/embeddings', requireAuth)
api.use('/embeddings/*', requireAuth)
api.use('/creations', requireAuth)
api.use('/creations/*', requireAuth)
api.use('/events', requireAuth)
api.use('/events/*', requireAuth)
api.use('/chat-history', requireAuth)
api.use('/chat-history/*', requireAuth)
api.use('/codex', requireAuth)
api.use('/codex/*', requireAuth)
api.use('/canvas-projects', requireAuth)
api.use('/canvas-projects/*', requireAuth)
api.use('/billing', requireAuth)
api.use('/billing/*', requireAuth)
api.use('/ai-models/user', requireAuth)
api.use('/ai-models/user/*', requireAuth)
api.use('/admin', requireAdmin)
api.use('/admin/*', requireAdmin)
api.use('/ai-models/admin/*', requireAdmin)
api.use('/ai-configs', requireAdmin)
api.use('/ai-configs/*', requireAdmin)
api.use('/ai-providers', requireAdmin)
api.use('/ai-providers/*', requireAdmin)
api.use('/agent-configs', requireAdmin)
api.use('/agent-configs/*', requireAdmin)
api.use('/ai-voices/sync', requireAdmin)
api.use('/skills', requireAdmin)
api.use('/skills/*', requireAdmin)
api.route('/dramas', dramas)
api.route('/episodes', episodes)
api.route('/storyboards', storyboards)
api.route('/scenes', scenes)
api.route('/characters', characters)
api.route('/images', images)
api.route('/videos', videos)
api.route('/upload', upload)
api.route('/ai-configs', aiConfigs)
api.route('/ai-providers', aiProviders)
api.route('/ai-models', aiModels)
api.route('/admin/commerce', adminCommerce)
api.route('/admin/system', adminSystem)
api.route('/admin/users', adminUsers)
api.route('/site', site)
api.route('/billing', billing)
api.route('/agent-configs', agentConfigs)
api.route('/agent', agent)
api.route('/compose', compose)
api.route('/merge', merge)
api.route('/grid', grid)
api.route('/skills', skills)
api.route('/ai-voices', aiVoices)
api.route('/tasks', tasks)
api.route('/creations', creations)
api.route('/multimodal', multimodal)
api.route('/embeddings', embeddings)
api.route('/auth', auth)
api.route('/chat-history', chatHistory)
api.route('/codex', codexWorkspace)
api.route('/events', events)
api.route('/canvas-projects', canvasProjects)

app.route('/api/v1', api)

// Webhook callbacks (Vidu, etc.) - outside /api/v1
app.route('/webhooks', webhooks)

// Serve static files (storage)
app.use('/static/*', serveStatic({ root: path.join(projectRoot, 'data') }))

// Serve frontend (production build)
const nuxtPublicPath = path.join(projectRoot, 'frontend', '.output', 'public')
const legacyDistPath = path.join(projectRoot, 'frontend', 'dist')
const frontendDistPath = fs.existsSync(nuxtPublicPath) ? nuxtPublicPath : legacyDistPath

if (fs.existsSync(frontendDistPath)) {
  app.use('*', serveStatic({ root: frontendDistPath }))
  app.get('*', serveStatic({ root: frontendDistPath, path: 'index.html' }))
} else {
  console.warn(`Frontend static build not found, skipped static serving: ${frontendDistPath}`)
}

const port = Number(process.env.PORT || 5679)
console.log(`🚀 Huobao Drama TS server on http://localhost:${port}`)
const membershipSchemaReady = ensureMembershipSchema()
membershipSchemaReady
  .then(() => ensureDefaultAdmin())
  .catch(error => console.error('default admin init failed:', error))
ensureCanvasProjectsSchema().catch(error => console.error('canvas projects schema init failed:', error))
membershipSchemaReady
  .then(() => startMembershipScheduler())
  .catch(error => console.error('membership scheduler failed:', error))
serve({ fetch: app.fetch, port })
