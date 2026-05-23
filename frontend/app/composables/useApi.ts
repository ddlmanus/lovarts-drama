const BASE = '/api/v1'
const TOKEN_KEY = 'huobao_auth_token'
const USER_KEY = 'huobao_auth_user'

export function getAuthToken() {
  if (typeof localStorage === 'undefined') return ''
  return localStorage.getItem(TOKEN_KEY) || ''
}

export function getAuthUser() {
  if (typeof localStorage === 'undefined') return null
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

export function setAuthSession(token: string, user: any) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user || null))
  window.dispatchEvent(new CustomEvent('huobao-auth-change'))
}

export function updateAuthUser(user: any) {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(USER_KEY, JSON.stringify(user || null))
  window.dispatchEvent(new CustomEvent('huobao-auth-change'))
}

export function clearAuthSession() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  window.dispatchEvent(new CustomEvent('huobao-auth-change'))
}

async function req<T = any>(method: string, path: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  const user = getAuthUser()
  if (token) headers.Authorization = `Bearer ${token}`
  if (user?.id) headers['x-user-id'] = user.id
  const opts: RequestInit = { method, headers }
  if (body) opts.body = JSON.stringify(body)

  const start = performance.now()
  console.log(`%c[API] %c${method} %c${path}`, 'color:#888', 'color:#4fc3f7;font-weight:bold', 'color:#ccc', body || '')

  try {
    const resp = await fetch(`${BASE}${path}`, opts)
    const text = await resp.text()
    let json: any = null
    try {
      json = text ? JSON.parse(text) : null
    } catch {
      json = { code: resp.status, message: text || resp.statusText || `${resp.status}` }
    }
    const ms = Math.round(performance.now() - start)

    if (!resp.ok || (json.code && json.code >= 400)) {
      console.log(`%c[API] %c${method} ${path} %c${resp.status} %c${ms}ms`, 'color:#888', 'color:#ef5350', 'color:#ef5350;font-weight:bold', 'color:#888', json.message || '')
      throw new Error(json.message || `${resp.status}`)
    }

    console.log(`%c[API] %c${method} ${path} %c${resp.status} %c${ms}ms`, 'color:#888', 'color:#66bb6a', 'color:#66bb6a;font-weight:bold', 'color:#888')
    return json.data ?? json
  } catch (err: any) {
    if (!err.message?.match(/^\d{3}$/)) {
      const ms = Math.round(performance.now() - start)
      console.log(`%c[API] %c${method} ${path} %cERROR %c${ms}ms`, 'color:#888', 'color:#ef5350', 'color:#ef5350;font-weight:bold', 'color:#888', err.message)
    }
    throw err
  }
}

export const api = {
  get: <T = any>(p: string) => req<T>('GET', p),
  post: <T = any>(p: string, b?: any) => req<T>('POST', p, b),
  put: <T = any>(p: string, b?: any) => req<T>('PUT', p, b),
  del: <T = any>(p: string) => req<T>('DELETE', p),
}

export function codexAttachmentUrl(projectId: string, filePath: string) {
  const params = new URLSearchParams({ path: filePath })
  const user = getAuthUser()
  if (user?.id) params.set('user_id', user.id)
  return `${BASE}/codex/projects/${encodeURIComponent(projectId)}/attachments/view?${params.toString()}`
}

export function codexProjectFileViewUrl(projectId: string, filePath: string) {
  const params = new URLSearchParams({ path: filePath })
  const user = getAuthUser()
  if (user?.id) params.set('user_id', user.id)
  return `${BASE}/codex/projects/${encodeURIComponent(projectId)}/files/view?${params.toString()}`
}

export const agentAPI = {
  task: (taskId: string) => api.get(`/agent/tasks/${encodeURIComponent(taskId)}`),
}

export const taskAPI = {
  list: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/tasks${query.toString() ? `?${query.toString()}` : ''}`)
  },
}

export const uploadAPI = {
  image: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch(`${BASE}/upload/image`, {
      method: 'POST',
      headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : undefined,
      body: form,
    })
    const json = await resp.json()
    if (!resp.ok || (json.code && json.code >= 400)) {
      throw new Error(json.message || `${resp.status}`)
    }
    return json.data ?? json
  },
  media: async (file: File) => {
    const form = new FormData()
    form.append('file', file)
    const resp = await fetch(`${BASE}/upload/media`, {
      method: 'POST',
      headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : undefined,
      body: form,
    })
    const json = await resp.json()
    if (!resp.ok || (json.code && json.code >= 400)) {
      throw new Error(json.message || `${resp.status}`)
    }
    return json.data ?? json
  },
}

async function uploadCodexAttachment(projectId: string, file: File) {
  const form = new FormData()
  form.append('file', file)
  const headers: Record<string, string> = {}
  const token = getAuthToken()
  const user = getAuthUser()
  if (token) headers.Authorization = `Bearer ${token}`
  if (user?.id) headers['x-user-id'] = user.id
  const resp = await fetch(`${BASE}/codex/projects/${encodeURIComponent(projectId)}/attachments`, {
    method: 'POST',
    headers,
    body: form,
  })
  const json = await resp.json()
  if (!resp.ok || (json.code && json.code >= 400)) {
    throw new Error(json.message || `${resp.status}`)
  }
  return json.data ?? json
}

export const dramaAPI = {
  list: () => api.get<{ items: any[] }>('/dramas'),
  get: (id: number) => api.get(`/dramas/${id}`),
  create: (data: any) => api.post('/dramas', data),
  update: (id: number, data: any) => api.put(`/dramas/${id}`, data),
  del: (id: number) => api.del(`/dramas/${id}`),
}

export const episodeAPI = {
  create: (data: any) => api.post('/episodes', data),
  update: (id: number, data: any) => api.put(`/episodes/${id}`, data),
  characters: (id: number) => api.get(`/episodes/${id}/characters`),
  scenes: (id: number) => api.get(`/episodes/${id}/scenes`),
  storyboards: (id: number) => api.get(`/episodes/${id}/storyboards`),
  pipelineStatus: (id: number) => api.get(`/episodes/${id}/pipeline-status`),
}

export const storyboardAPI = {
  create: (data: any) => api.post('/storyboards', data),
  update: (id: number, data: any) => api.put(`/storyboards/${id}`, data),
  generateTTS: (id: number) => api.post(`/storyboards/${id}/generate-tts`),
  del: (id: number) => api.del(`/storyboards/${id}`),
}

function modelPayload(model?: any) {
  if (!model || typeof model !== 'object') return { model }
  return {
    model: model.model_id || model.model || model.value,
    model_config_id: model.model_config_id || model.id,
    user_provider_id: model.user_provider_id,
  }
}

export const characterAPI = {
  create: (data: any) => api.post('/characters', data),
  update: (id: number, data: any) => api.put(`/characters/${id}`, data),
  del: (id: number) => api.del(`/characters/${id}`),
  library: (q = '') => api.get(`/characters/library${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createLibrary: (data: any) => api.post('/characters/library', data),
  updateLibrary: (id: number, data: any) => api.put(`/characters/library/${id}`, data),
  deleteLibrary: (id: number) => api.del(`/characters/library/${id}`),
  saveToLibrary: (id: number) => api.post(`/characters/${id}/save-to-library`),
  applyFromLibrary: (id: number, data: any) => api.post(`/characters/library/${id}/apply`, data),
  voiceSample: (id: number, episodeId: number) => api.post(`/characters/${id}/generate-voice-sample`, { episode_id: episodeId }),
  generateImage: (id: number, episodeId: number, model?: any) => api.post(`/characters/${id}/generate-image`, { episode_id: episodeId, ...modelPayload(model) }),
  batchImages: (ids: number[], episodeId: number, model?: any) => api.post('/characters/batch-generate-images', { character_ids: ids, episode_id: episodeId, ...modelPayload(model) }),
}

export const sceneAPI = {
  create: (data: any) => api.post('/scenes', data),
  update: (id: number, data: any) => api.put(`/scenes/${id}`, data),
  del: (id: number, episodeId?: number) => api.post(`/scenes/${id}/delete`, episodeId ? { episode_id: episodeId } : {}),
  library: (q = '') => api.get(`/scenes/library${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  createLibrary: (data: any) => api.post('/scenes/library', data),
  updateLibrary: (id: number, data: any) => api.put(`/scenes/library/${id}`, data),
  deleteLibrary: (id: number) => api.del(`/scenes/library/${id}`),
  saveToLibrary: (id: number) => api.post(`/scenes/${id}/save-to-library`),
  applyFromLibrary: (id: number, data: any) => api.post(`/scenes/library/${id}/apply`, data),
  generateImage: (id: number, episodeId: number, model?: any) => api.post(`/scenes/${id}/generate-image`, { episode_id: episodeId, ...modelPayload(model) }),
  batchImages: (ids: number[], episodeId: number, model?: any) => api.post('/scenes/batch-generate-images', { scene_ids: ids, episode_id: episodeId, ...modelPayload(model) }),
}

export const imageAPI = {
  generate: (d: any) => api.post('/images', d),
  get: (id: number) => api.get(`/images/${id}`),
  list: (params?: { drama_id?: number; storyboard_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.drama_id) query.set('drama_id', String(params.drama_id))
    if (params?.storyboard_id) query.set('storyboard_id', String(params.storyboard_id))
    return api.get(`/images${query.size ? `?${query.toString()}` : ''}`)
  },
}
export const gridAPI = {
  prompt: (d: any) => api.post('/grid/prompt', d),
  generate: (d: any) => api.post('/grid/generate', d),
  status: (id: number) => api.get(`/grid/status/${id}`),
  split: (d: any) => api.post('/grid/split', d),
}
export const videoAPI = {
  generate: (d: any) => api.post('/videos', d),
  get: (id: number) => api.get(`/videos/${id}`),
  list: (params?: { drama_id?: number; storyboard_id?: number }) => {
    const query = new URLSearchParams()
    if (params?.drama_id) query.set('drama_id', String(params.drama_id))
    if (params?.storyboard_id) query.set('storyboard_id', String(params.storyboard_id))
    return api.get(`/videos${query.size ? `?${query.toString()}` : ''}`)
  },
}
export const creationAPI = {
  create: (d: any) => api.post('/creations', d),
  list: () => api.get('/creations'),
  get: (id: number) => api.get(`/creations/${id}`),
  del: (id: number) => api.del(`/creations/${id}`),
}
export const chatAPI = {
  ask: (d: any) => api.post('/multimodal/analyze', d),
  history: () => api.get('/chat-history'),
  createHistory: (d: any) => api.post('/chat-history', d),
  updateHistory: (id: string, d: any) => api.put(`/chat-history/${encodeURIComponent(id)}`, d),
  deleteHistory: (id: string) => api.del(`/chat-history/${encodeURIComponent(id)}`),
}
export const canvasProjectAPI = {
  list: () => api.get('/canvas-projects'),
  get: (id: string) => api.get(`/canvas-projects/${encodeURIComponent(id)}`),
  create: (d: any) => api.post('/canvas-projects', d),
  update: (id: string, d: any) => api.put(`/canvas-projects/${encodeURIComponent(id)}`, d),
  del: (id: string) => api.del(`/canvas-projects/${encodeURIComponent(id)}`),
}
export const codexAPI = {
  status: () => api.get('/codex/status'),
  config: () => api.get('/codex/config'),
  skills: () => api.get('/codex/skills'),
  deleteSkill: (id: string) => api.del(`/codex/skills?skill_id=${encodeURIComponent(id)}`),
  installPlugin: (id: string) => api.post('/codex/plugins/install', { plugin_id: id }),
  photoshopConfig: () => api.get('/codex/plugins/photoshop/config'),
  testPhotoshopConfig: (d: any) => api.post('/codex/plugins/photoshop/config/test', d),
  updatePhotoshopConfig: (d: any) => api.put('/codex/plugins/photoshop/config', d),
  approvals: () => api.get('/codex/approvals'),
  respondApproval: (id: string, d: any) => api.post(`/codex/approvals/${encodeURIComponent(id)}/respond`, d),
  testConfig: (d: any) => api.post('/codex/config/test', d),
  updateConfig: (d: any) => api.put('/codex/config', d),
  deleteConfig: () => api.del('/codex/config'),
  projects: () => api.get('/codex/projects'),
  directories: (path?: string) => api.get(`/codex/project-directories${path ? `?path=${encodeURIComponent(path)}` : ''}`),
  pickDirectory: () => api.post('/codex/project-directories/pick', {}),
  createProject: (d: any) => api.post('/codex/projects', d),
  projectFile: (projectId: string, filePath: string) => api.get(`/codex/projects/${encodeURIComponent(projectId)}/files?path=${encodeURIComponent(filePath)}`),
  openProjectFile: (projectId: string, filePath: string) => api.post(`/codex/projects/${encodeURIComponent(projectId)}/open-file`, { path: filePath }),
  projectGitStatus: (projectId: string) => api.get(`/codex/projects/${encodeURIComponent(projectId)}/git`),
  projectGitCommit: (projectId: string, d: any) => api.post(`/codex/projects/${encodeURIComponent(projectId)}/git/commit`, d),
  projectGitPush: (projectId: string) => api.post(`/codex/projects/${encodeURIComponent(projectId)}/git/push`, {}),
  undoPatch: (projectId: string, patch: string) => api.post(`/codex/projects/${encodeURIComponent(projectId)}/patches/undo`, { patch }),
  projectTerminals: (projectId: string) => api.get(`/codex/projects/${encodeURIComponent(projectId)}/terminals`),
  createTerminal: (projectId: string) => api.post(`/codex/projects/${encodeURIComponent(projectId)}/terminals`, {}),
  terminal: (terminalId: string, afterSeq = 0) => api.get(`/codex/terminals/${encodeURIComponent(terminalId)}${afterSeq ? `?after_seq=${encodeURIComponent(String(afterSeq))}` : ''}`),
  terminalInput: (terminalId: string, input: string) => api.post(`/codex/terminals/${encodeURIComponent(terminalId)}/input`, { input }),
  terminalInterrupt: (terminalId: string) => api.post(`/codex/terminals/${encodeURIComponent(terminalId)}/interrupt`, {}),
  terminalResize: (terminalId: string, cols: number, rows: number) => api.post(`/codex/terminals/${encodeURIComponent(terminalId)}/resize`, { cols, rows }),
  deleteTerminal: (terminalId: string) => api.del(`/codex/terminals/${encodeURIComponent(terminalId)}`),
  uploadAttachment: uploadCodexAttachment,
  tasks: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/codex/tasks${query.toString() ? `?${query.toString()}` : ''}`)
  },
  task: (id: string) => api.get(`/codex/tasks/${encodeURIComponent(id)}`),
  taskLogs: (id: string) => api.get(`/codex/tasks/${encodeURIComponent(id)}/logs`),
  nativeThreads: () => api.get('/codex/threads/native'),
  nativeThread: (threadId: string) => api.get(`/codex/threads/${encodeURIComponent(threadId)}/native`),
  nativeThreadTurns: (threadId: string) => api.get(`/codex/threads/${encodeURIComponent(threadId)}/turns/native`),
  createTask: (d: any) => api.post('/codex/tasks', d),
  sendMessage: (id: string, d: any) => api.post(`/codex/tasks/${encodeURIComponent(id)}/messages`, d),
  cancelTask: (id: string) => api.post(`/codex/tasks/${encodeURIComponent(id)}/cancel`, {}),
  deleteTask: (id: string) => api.del(`/codex/tasks/${encodeURIComponent(id)}`),
  deleteProject: (id: string) => api.del(`/codex/projects/${encodeURIComponent(id)}`),
}
export const composeAPI = {
  shot: (id: number) => api.post(`/compose/storyboards/${id}/compose`),
  all: (epId: number) => api.post(`/compose/episodes/${epId}/compose-all`),
  status: (epId: number) => api.get(`/compose/episodes/${epId}/compose-status`),
}
export const mergeAPI = {
  merge: (epId: number) => api.post(`/merge/episodes/${epId}/merge`),
  status: (epId: number) => api.get(`/merge/episodes/${epId}/merge`),
}
export const aiConfigAPI = {
  list: (t?: string) => api.get(`/ai-configs${t ? `?service_type=${t}` : ''}`),
  create: (d: any) => api.post('/ai-configs', d),
  update: (id: number, d: any) => api.put(`/ai-configs/${id}`, d),
  del: (id: number) => api.del(`/ai-configs/${id}`),
  test: (d: any) => api.post('/ai-configs/test', d),
  huobaoPreset: (apiKey: string) => api.post('/ai-configs/huobao-preset', { api_key: apiKey }),
}

export const aiModelAPI = {
  list: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models${query.toString() ? `?${query.toString()}` : ''}`)
  },
  options: (serviceType?: string, params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    if (serviceType) query.set('service_type', serviceType)
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/options${query.toString() ? `?${query.toString()}` : ''}`)
  },
  providers: (serviceType?: string) => api.get(`/ai-models/providers${serviceType ? `?service_type=${encodeURIComponent(serviceType)}` : ''}`),
  create: (d: any) => api.post('/ai-models', d),
  update: (id: number, d: any) => api.put(`/ai-models/${id}`, d),
  del: (id: number) => api.del(`/ai-models/${id}`),
  seedFromConfigs: () => api.post('/ai-models/seed-from-configs', {}),
  adminProviders: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/admin/providers${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createAdminProvider: (d: any) => api.post('/ai-models/admin/providers', d),
  updateAdminProvider: (id: number, d: any) => api.put(`/ai-models/admin/providers/${id}`, d),
  deleteAdminProvider: (id: number) => api.del(`/ai-models/admin/providers/${id}`),
  adminModels: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/admin/models${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createAdminModel: (d: any) => api.post('/ai-models/admin/models', d),
  updateAdminModel: (id: number, d: any) => api.put(`/ai-models/admin/models/${id}`, d),
  deleteAdminModel: (id: number) => api.del(`/ai-models/admin/models/${id}`),
  adminParameters: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/admin/model-parameters${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createAdminParameter: (d: any) => api.post('/ai-models/admin/model-parameters', d),
  updateAdminParameter: (id: number, d: any) => api.put(`/ai-models/admin/model-parameters/${id}`, d),
  deleteAdminParameter: (id: number) => api.del(`/ai-models/admin/model-parameters/${id}`),
  parameterItems: (profileId: number) => api.get(`/ai-models/admin/model-parameters/${profileId}/items`),
  createParameterItem: (profileId: number, d: any) => api.post(`/ai-models/admin/model-parameters/${profileId}/items`, d),
  updateParameterItem: (itemId: number, d: any) => api.put(`/ai-models/admin/model-parameters/items/${itemId}`, d),
  deleteParameterItem: (itemId: number) => api.del(`/ai-models/admin/model-parameters/items/${itemId}`),
  users: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/admin/users${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createUser: (d: any) => api.post('/ai-models/admin/users', d),
  updateUser: (id: string, d: any) => api.put(`/ai-models/admin/users/${encodeURIComponent(id)}`, d),
  deleteUser: (id: string) => api.del(`/ai-models/admin/users/${encodeURIComponent(id)}`),
  adminUserProviders: (params: Record<string, any> = {}) => {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
    })
    return api.get(`/ai-models/admin/user-providers${query.toString() ? `?${query.toString()}` : ''}`)
  },
  createAdminUserProvider: (d: any) => api.post('/ai-models/admin/user-providers', d),
  updateAdminUserProvider: (id: number, d: any) => api.put(`/ai-models/admin/user-providers/${id}`, d),
  deleteUserProvider: (id: number) => api.del(`/ai-models/admin/user-providers/${id}`),
  userProviders: (userId?: string) => api.get(`/ai-models/user/providers${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`),
  connectUserProvider: (d: any, userId?: string) => api.post(`/ai-models/user/providers/connect${userId ? `?user_id=${encodeURIComponent(userId)}` : ''}`, d),
}

function buildQuery(params: Record<string, any> = {}) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const adminCommerceAPI = {
  membershipPlans: (params: Record<string, any> = {}) => api.get(`/admin/commerce/membership-plans${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  createMembershipPlan: (d: any) => api.post('/admin/commerce/membership-plans', d),
  updateMembershipPlan: (id: number, d: any) => api.put(`/admin/commerce/membership-plans/${id}`, d),
  deleteMembershipPlan: (id: number) => api.del(`/admin/commerce/membership-plans/${id}`),
  creditPackages: (params: Record<string, any> = {}) => api.get(`/admin/commerce/credit-packages${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  createCreditPackage: (d: any) => api.post('/admin/commerce/credit-packages', d),
  updateCreditPackage: (id: number, d: any) => api.put(`/admin/commerce/credit-packages/${id}`, d),
  deleteCreditPackage: (id: number) => api.del(`/admin/commerce/credit-packages/${id}`),
  orders: (params: Record<string, any> = {}) => api.get(`/admin/commerce/orders${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  createOrder: (d: any) => api.post('/admin/commerce/orders', d),
  updateOrder: (id: number, d: any) => api.put(`/admin/commerce/orders/${id}`, d),
  deleteOrder: (id: number) => api.del(`/admin/commerce/orders/${id}`),
  paymentConfigs: (params: Record<string, any> = {}) => api.get(`/admin/commerce/payment-configs${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  createPaymentConfig: (d: any) => api.post('/admin/commerce/payment-configs', d),
  updatePaymentConfig: (id: number, d: any) => api.put(`/admin/commerce/payment-configs/${id}`, d),
  deletePaymentConfig: (id: number) => api.del(`/admin/commerce/payment-configs/${id}`),
}

export const adminSystemAPI = {
  settings: () => api.get('/admin/system/settings'),
  updateSettings: (d: any) => api.put('/admin/system/settings', d),
}

export const siteAPI = {
  settings: () => api.get('/site/settings'),
}

export const billingAPI = {
  membershipStatus: () => api.get('/billing/membership/status'),
  membershipPlans: () => api.get('/billing/membership-plans'),
  creditPackages: () => api.get('/billing/credit-packages'),
  pointLogs: (params: Record<string, any> = {}) => api.get(`/billing/points/logs${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  paymentMethods: () => api.get('/billing/payment-methods'),
  orders: (params: Record<string, any> = {}) => api.get(`/billing/orders${buildQuery(params) ? `?${buildQuery(params)}` : ''}`),
  createOrder: (d: any) => api.post('/billing/orders', d),
  order: (id: number) => api.get(`/billing/orders/${id}`),
  orderPaymentMethods: (id: number) => api.get(`/billing/orders/${id}/payment-methods`),
  payOrder: (id: number, d: any) => api.post(`/billing/orders/${id}/pay`, d),
}

export function subscribeCreditEvents(onMessage: (event: any) => void) {
  if (typeof EventSource === 'undefined') return null
  const token = getAuthToken()
  const user = getAuthUser()
  const query = new URLSearchParams()
  if (user?.id) query.set('user_id', user.id)
  if (token) query.set('token', token)
  const source = new EventSource(`${BASE}/events/credits${query.toString() ? `?${query.toString()}` : ''}`)
  source.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data))
    } catch {
      onMessage({ type: 'raw', data: event.data })
    }
  }
  return source
}

export const authAPI = {
  register: (d: any) => api.post('/auth/register', d),
  login: (d: any) => api.post('/auth/login', d),
  me: () => api.get('/auth/me'),
  setResourceMode: (d: any) => api.post('/auth/onboarding/resource-mode', d),
  adminMe: () => api.get('/auth/admin/me'),
}

export const agentConfigAPI = {
  list: () => api.get('/agent-configs'),
  get: (id: number) => api.get(`/agent-configs/${id}`),
  create: (d: any) => api.post('/agent-configs', d),
  update: (id: number, d: any) => api.put(`/agent-configs/${id}`, d),
  del: (id: number) => api.del(`/agent-configs/${id}`),
}

export const skillsAPI = {
  list: () => api.get('/skills'),
  get: (id: string) => api.get(`/skills/${id}`),
  create: (data: { id: string; name: string; description?: string }) => api.post('/skills', data),
  update: (id: string, content: string) => api.put(`/skills/${id}`, { content }),
  del: (id: string) => api.del(`/skills/${id}`),
}

export const voicesAPI = {
  list: (provider?: string) => api.get(`/ai-voices${provider ? `?provider=${provider}` : ''}`),
  sync: () => api.post('/ai-voices/sync', {}),
}
