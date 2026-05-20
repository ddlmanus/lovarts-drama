import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFile, spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import net from 'node:net'
import * as pty from 'node-pty'
import { Hono } from 'hono'
import { badRequest, now, serverError, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

const DATA_ROOT = path.resolve(process.cwd(), '../data/codex')
const WORKSPACE_ROOT = path.join(DATA_ROOT, 'workspaces')
const LOG_ROOT = path.join(DATA_ROOT, 'logs')
const PROJECTS_PATH = path.join(DATA_ROOT, 'projects.json')
const TASKS_PATH = path.join(DATA_ROOT, 'tasks.json')
const CONFIGS_PATH = path.join(DATA_ROOT, 'configs.json')
const CODEX_BIN = path.resolve(process.cwd(), 'node_modules/.bin/codex')
const APP_SERVER_TOKENS_ROOT = path.join(DATA_ROOT, 'app-server-tokens')
const APP_SERVER_HOMES_ROOT = path.join(DATA_ROOT, 'homes')

type CodexProject = {
  id: string
  userId: string
  name: string
  slug: string
  path: string
  source?: 'managed' | 'local' | 'github'
  repoUrl?: string
  createdAt: string
  updatedAt: string
}

type CodexTaskEvent = {
  ts: string
  stream: 'stdout' | 'stderr' | 'system'
  type?: string
  role?: 'user' | 'assistant' | 'system' | 'tool'
  text: string
  raw?: string
}

type CodexSelectedContext = {
  id?: string
  name: string
  type: 'skill' | 'mention'
  path: string
}

type CodexTask = {
  id: string
  userId: string
  projectId: string
  projectName: string
  projectPath: string
  prompt: string
  model: string
  reasoningEffort?: string
  sandbox?: string
  images?: string[]
  selectedContext?: CodexSelectedContext | null
  threadId?: string
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'
  pid?: number
  exitCode?: number | null
  signal?: NodeJS.Signals | null
  runtime?: 'app-server' | 'exec'
  outputTail: CodexTaskEvent[]
  createdAt: string
  updatedAt: string
}

type CodexUserConfig = {
  userId: string
  baseUrl?: string
  apiKey?: string
  model?: string
  updatedAt: string
}

type AppServerState = {
  process: ChildProcessWithoutNullStreams | null
  url: string
  token: string
  configSignature?: string
  starting: Promise<{ url: string; token: string }> | null
}

type CodexApproval = {
  id: string
  userId: string
  taskId: string
  requestId: string | number
  method: string
  kind: 'command' | 'file' | 'permissions'
  params: any
  createdAt: string
}

type TerminalSession = {
  id: string
  userId: string
  projectId: string
  projectName: string
  projectPath: string
  terminal: pty.IPty
  outputSeq: number
  output: Array<{ seq: number; ts: string; stream: 'stdout' | 'stderr' | 'system'; text: string }>
  createdAt: string
  updatedAt: string
  closedAt?: string
}

const running = new Map<string, ChildProcessWithoutNullStreams>()
const activeAppTurns = new Map<string, { ws: any; threadId?: string; turnId?: string }>()
const appServers = new Map<string, AppServerState>()
const pendingApprovals = new Map<string, CodexApproval>()
const terminalSessions = new Map<string, TerminalSession>()

function ensureDirs() {
  fs.mkdirSync(DATA_ROOT, { recursive: true })
  fs.mkdirSync(WORKSPACE_ROOT, { recursive: true })
  fs.mkdirSync(LOG_ROOT, { recursive: true })
  fs.mkdirSync(APP_SERVER_TOKENS_ROOT, { recursive: true })
  fs.mkdirSync(APP_SERVER_HOMES_ROOT, { recursive: true })
}

function readJsonFile<T>(file: string, fallback: T): T {
  ensureDirs()
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

function writeJsonFile(file: string, value: unknown) {
  ensureDirs()
  fs.writeFileSync(file, JSON.stringify(value, null, 2))
}

function projectsStore() {
  return readJsonFile<{ projects: CodexProject[] }>(PROJECTS_PATH, { projects: [] })
}

function writeProjectsStore(store: { projects: CodexProject[] }) {
  writeJsonFile(PROJECTS_PATH, store)
}

function tasksStore() {
  return readJsonFile<{ tasks: CodexTask[] }>(TASKS_PATH, { tasks: [] })
}

function writeTasksStore(store: { tasks: CodexTask[] }) {
  writeJsonFile(TASKS_PATH, store)
}

function configsStore() {
  return readJsonFile<{ configs: CodexUserConfig[] }>(CONFIGS_PATH, { configs: [] })
}

function writeConfigsStore(store: { configs: CodexUserConfig[] }) {
  writeJsonFile(CONFIGS_PATH, store)
}

function safeSegment(value: string, fallback: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return normalized || fallback
}

function publicConfig(config: CodexUserConfig | null) {
  const apiKey = config?.apiKey || ''
  return {
    base_url: config?.baseUrl || '',
    model: config?.model || '',
    api_key_set: Boolean(apiKey),
    api_key_preview: apiKey ? `...${apiKey.slice(-4)}` : '',
    updated_at: config?.updatedAt || '',
  }
}

function userConfig(userId: string) {
  return configsStore().configs.find(config => config.userId === userId) || null
}

function normalizeConfigModel(value: unknown) {
  return String(value || '').trim().slice(0, 120)
}

function normalizeBaseUrl(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const parsed = new URL(raw)
    if (parsed.hostname.toLowerCase().includes('zenmux.ai')) {
      parsed.pathname = '/api/v1'
      parsed.search = ''
      parsed.hash = ''
      return parsed.toString().replace(/\/+$/, '')
    }
  } catch {}
  return raw.replace(/\/+$/, '')
}

function isHtmlResponse(text: string) {
  return /^\s*<!doctype html/i.test(text) || /^\s*<html[\s>]/i.test(text)
}

function responseErrorMessage(prefix: string, text: string, json: any, status: number) {
  if (isHtmlResponse(text)) {
    return `${prefix}：Base URL 返回了网页 HTML，请填写 API 地址，例如 https://zenmux.ai/api/v1`
  }
  const message = json?.error?.message || json?.message || text || `HTTP ${status}`
  return `${prefix}：${String(message).slice(0, 600)}`
}

function validateBaseUrl(value: string) {
  if (!value) return 'Base URL 不能为空'
  try {
    const parsed = new URL(value)
    if (!['http:', 'https:'].includes(parsed.protocol)) return 'Base URL 必须是 http 或 https 地址'
  } catch {
    return 'Base URL 格式不正确'
  }
  return ''
}

async function testCodexConnection(input: { baseUrl: string; apiKey: string; model: string }) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 25_000)
  try {
    const modelsResp = await fetch(`${input.baseUrl}/models`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    })
    const modelsText = await modelsResp.text()
    let modelsJson: any = null
    try {
      modelsJson = modelsText ? JSON.parse(modelsText) : null
    } catch {}
    if (!modelsResp.ok) {
      throw new Error(responseErrorMessage('连接失败', modelsText, modelsJson, modelsResp.status))
    }
    const models = Array.isArray(modelsJson?.data) ? modelsJson.data.map((item: any) => String(item?.id || '')).filter(Boolean) : []
    if (input.model && models.length && !models.includes(input.model)) {
      throw new Error(`连接成功，但模型列表里没有 ${input.model}`)
    }

    const generationResp = await fetch(`${input.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({
        model: input.model,
        input: 'Reply with OK.',
        max_output_tokens: 8,
        stream: true,
      }),
      signal: controller.signal,
    })
    if (!generationResp.ok) {
      const text = await generationResp.text().catch(() => '')
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {}
      throw new Error(responseErrorMessage('生成接口不可用', text, json, generationResp.status))
    }
    if (generationResp.body) {
      const reader = generationResp.body.getReader()
      const decoder = new TextDecoder()
      let received = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        received += decoder.decode(value, { stream: true })
        if (received.includes('response.completed') || received.includes('[DONE]')) break
        if (received.includes('"type":"error"') || received.includes('event: error')) {
          throw new Error(`生成接口返回错误：${received.slice(0, 500)}`)
        }
      }
    }
    return {
      ok: true,
      models: models.slice(0, 80),
      checked_model: input.model,
      message: '连接成功，生成接口可用。请点击应用后再发送任务',
    }
  } finally {
    clearTimeout(timer)
  }
}

function publicProject(project: CodexProject) {
  return {
    id: project.id,
    name: project.name,
    slug: project.slug,
    path: project.path,
    source: project.source || 'managed',
    repo_url: project.repoUrl || '',
    created_at: project.createdAt,
    updated_at: project.updatedAt,
  }
}

function publicTask(task: CodexTask) {
  return {
    id: task.id,
    project_id: task.projectId,
    project_name: task.projectName,
    project_path: task.projectPath,
    prompt: task.prompt,
    model: task.model,
    reasoning_effort: task.reasoningEffort,
    sandbox: task.sandbox,
    images: task.images || [],
    selected_context: task.selectedContext || null,
    thread_id: task.threadId,
    status: task.status,
    pid: task.pid,
    exit_code: task.exitCode,
    signal: task.signal,
    runtime: task.runtime,
    output_tail: task.outputTail,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

function extractEvent(line: string, stream: 'stdout' | 'stderr'): CodexTaskEvent {
  const trimmed = line.trimEnd()
  if (!trimmed) {
    return { ts: now(), stream, text: '' }
  }

  try {
    const parsed = JSON.parse(trimmed)
    const text = parsed.message
      || parsed.text
      || parsed.delta
      || parsed.output
      || parsed.item?.text
      || parsed.event?.message
      || JSON.stringify(parsed)
    return {
      ts: now(),
      stream,
      type: parsed.type || parsed.event || parsed.kind,
      text: String(text),
      raw: trimmed,
    }
  } catch {
    return { ts: now(), stream, text: trimmed, raw: trimmed }
  }
}

function parseThreadId(event: CodexTaskEvent) {
  if (!event.raw) return ''
  try {
    const parsed = JSON.parse(event.raw)
    return parsed?.type === 'thread.started' && parsed?.thread_id ? String(parsed.thread_id) : ''
  } catch {
    return ''
  }
}

function updateTask(taskId: string, patch: Partial<CodexTask>) {
  const store = tasksStore()
  const task = store.tasks.find(item => item.id === taskId)
  if (!task) return null
  Object.assign(task, patch, { updatedAt: now() })
  writeTasksStore(store)
  return task
}

function appendTaskEvent(taskId: string, event: CodexTaskEvent) {
  const store = tasksStore()
  const task = store.tasks.find(item => item.id === taskId)
  if (!task) return
  task.outputTail.push(event)
  const threadId = parseThreadId(event)
  if (threadId) task.threadId = threadId
  task.outputTail = task.outputTail.slice(-300)
  task.updatedAt = now()
  writeTasksStore(store)
  fs.appendFileSync(path.join(LOG_ROOT, `${taskId}.jsonl`), `${JSON.stringify(event)}\n`)
}

function appendUserMessage(taskId: string, prompt: string) {
  appendTaskEvent(taskId, {
    ts: now(),
    stream: 'system',
    type: 'user_message',
    role: 'user',
    text: prompt,
  })
}

function approvalKind(method: string): CodexApproval['kind'] | null {
  if (method === 'item/commandExecution/requestApproval') return 'command'
  if (method === 'item/fileChange/requestApproval') return 'file'
  if (method === 'item/permissions/requestApproval') return 'permissions'
  return null
}

function publicApproval(approval: CodexApproval) {
  return {
    id: approval.id,
    task_id: approval.taskId,
    method: approval.method,
    kind: approval.kind,
    params: approval.params,
    created_at: approval.createdAt,
  }
}

function storeApproval(userId: string, taskId: string, message: any) {
  const kind = approvalKind(message?.method)
  if (!kind || message?.id === undefined || message?.id === null) return null
  const requestId = message.id
  const id = `${taskId}:${String(requestId)}`
  const approval: CodexApproval = {
    id,
    userId,
    taskId,
    requestId,
    method: message.method,
    kind,
    params: message.params || {},
    createdAt: now(),
  }
  pendingApprovals.set(id, approval)
  appendTaskEvent(taskId, {
    ts: approval.createdAt,
    stream: 'system',
    type: 'app.approval_request',
    role: 'system',
    text: JSON.stringify({ kind, params: approval.params }),
    raw: JSON.stringify(message),
  })
  return approval
}

function approvalResponseFor(approval: CodexApproval, decision: string, scope = 'turn') {
  const allow = decision === 'accept' || decision === 'acceptForSession'
  const commandDecision = decision === 'acceptForSession' ? 'acceptForSession' : allow ? 'accept' : 'decline'
  const fileDecision = decision === 'acceptForSession' ? 'acceptForSession' : allow ? 'accept' : 'decline'
  if (approval.kind === 'permissions') {
    if (!allow) {
      return {
        error: {
          code: -32000,
          message: '用户拒绝授权',
        },
      }
    }
    return {
      result: {
        permissions: approval.params.permissions || {},
        scope: scope === 'session' ? 'session' : 'turn',
        strictAutoReview: false,
      },
    }
  }
  return {
    result: {
      decision: approval.kind === 'file' ? fileDecision : commandDecision,
    },
  }
}

function resolveApproval(userId: string, approvalId: string, decision: string, scope?: string) {
  const approval = pendingApprovals.get(approvalId)
  if (!approval || approval.userId !== userId) return null
  const active = activeAppTurns.get(approval.taskId)
  if (!active?.ws) throw new Error('Codex 任务连接已断开')
  const payload = {
    jsonrpc: '2.0',
    id: approval.requestId,
    ...approvalResponseFor(approval, decision, scope),
  }
  active.ws.send(JSON.stringify(payload))
  pendingApprovals.delete(approvalId)
  appendTaskEvent(approval.taskId, {
    ts: now(),
    stream: 'system',
    type: 'app.approval_resolved',
    role: 'system',
    text: decision === 'accept' || decision === 'acceptForSession' ? '用户已授权' : '用户已拒绝授权',
  })
  return approval
}

function deleteTaskLog(taskId: string) {
  const logPath = path.join(LOG_ROOT, `${taskId}.jsonl`)
  if (fs.existsSync(logPath)) fs.unlinkSync(logPath)
}

function stopTaskRuntime(taskId: string) {
  const child = running.get(taskId)
  const activeTurn = activeAppTurns.get(taskId)
  if (child && !child.killed) child.kill('SIGTERM')
  running.delete(taskId)
  if (activeTurn?.ws) {
    if (activeTurn.threadId && activeTurn.turnId) {
      activeTurn.ws.send(JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'turn/interrupt',
        params: { threadId: activeTurn.threadId, turnId: activeTurn.turnId },
      }))
    }
    activeTurn.ws.close()
  }
  activeAppTurns.delete(taskId)
  for (const [approvalId, approval] of pendingApprovals) {
    if (approval.taskId === taskId) pendingApprovals.delete(approvalId)
  }
}

function normalizeReasoningEffort(value: unknown) {
  const effort = String(value || '').trim()
  return ['minimal', 'low', 'medium', 'high', 'xhigh'].includes(effort) ? effort : ''
}

function normalizeSandbox(value: unknown) {
  const sandbox = String(value || '').trim()
  return ['read-only', 'workspace-write', 'danger-full-access'].includes(sandbox) ? sandbox : 'workspace-write'
}

function pushCodexConfigArgs(args: string[], options: { reasoningEffort?: string }) {
  if (options.reasoningEffort) {
    args.push('-c', `model_reasoning_effort="${options.reasoningEffort}"`)
  }
}

function findProject(userId: string, projectId: string) {
  return projectsStore().projects.find(project => project.userId === userId && project.id === projectId)
}

function execGit(cwd: string, args: string[], timeout = 20_000) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile('git', args, { cwd, timeout }, (err, stdout, stderr) => {
      const out = String(stdout || '')
      const errorOut = String(stderr || '')
      if (err) {
        reject(new Error(errorOut.trim() || err.message))
        return
      }
      resolve({ stdout: out, stderr: errorOut })
    })
  })
}

function execOptional(cwd: string, command: string, args: string[], timeout = 10_000) {
  return new Promise<{ ok: boolean; stdout: string; stderr: string }>((resolve) => {
    execFile(command, args, { cwd, timeout }, (err, stdout, stderr) => {
      resolve({
        ok: !err,
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
      })
    })
  })
}

function parseGitNumstat(text: string) {
  return String(text || '').split(/\r?\n/).filter(Boolean).reduce((acc, line) => {
    const [added, removed] = line.split(/\s+/)
    const addedNumber = Number(added)
    const removedNumber = Number(removed)
    return {
      added: acc.added + (Number.isFinite(addedNumber) ? addedNumber : 0),
      removed: acc.removed + (Number.isFinite(removedNumber) ? removedNumber : 0),
    }
  }, { added: 0, removed: 0 })
}

function publicGitRemote(value: string) {
  const remote = String(value || '').trim()
  if (!remote) return ''
  const github = remote.match(/github\.com[:/]([^/\s]+\/[^/\s.]+)(?:\.git)?$/i)
  if (github) return github[1]
  return remote.replace(/^https?:\/\//, '').replace(/\.git$/, '')
}

function normalizeGitHubRepoUrl(value: unknown) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^git@github\.com:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i.test(raw)) {
    return raw.endsWith('.git') ? raw : `${raw}.git`
  }

  const shorthand = raw.match(/^([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)$/)
  if (shorthand) return `https://github.com/${shorthand[1]}.git`

  try {
    const url = new URL(raw)
    if (url.hostname.toLowerCase() !== 'github.com') return ''
    const parts = url.pathname.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '').split('/')
    if (parts.length < 2 || !parts[0] || !parts[1]) return ''
    return `https://github.com/${parts[0]}/${parts[1]}.git`
  } catch {
    return ''
  }
}

function projectNameFromRepoUrl(value: string) {
  const label = publicGitRemote(value)
  const name = label.split('/').filter(Boolean).pop() || ''
  return name.replace(/\.git$/i, '') || 'GitHub 项目'
}

async function projectGitStatus(project: CodexProject) {
  if (!fs.existsSync(project.path)) {
    throw new Error('project path not found')
  }

  try {
    const inside = await execGit(project.path, ['rev-parse', '--is-inside-work-tree'], 8_000)
    if (inside.stdout.trim() !== 'true') {
      return { is_repo: false, message: '当前项目不是 Git 仓库' }
    }
  } catch {
    return { is_repo: false, message: '当前项目不是 Git 仓库' }
  }

  const [branchResult, rootResult, statusResult, unstagedResult, stagedResult, remoteResult, ghResult] = await Promise.all([
    execGit(project.path, ['branch', '--show-current'], 8_000).catch(() => ({ stdout: '', stderr: '' })),
    execGit(project.path, ['rev-parse', '--show-toplevel'], 8_000).catch(() => ({ stdout: project.path, stderr: '' })),
    execGit(project.path, ['status', '--porcelain=v1'], 10_000),
    execGit(project.path, ['diff', '--numstat'], 15_000).catch(() => ({ stdout: '', stderr: '' })),
    execGit(project.path, ['diff', '--cached', '--numstat'], 15_000).catch(() => ({ stdout: '', stderr: '' })),
    execGit(project.path, ['remote', 'get-url', 'origin'], 8_000).catch(() => ({ stdout: '', stderr: '' })),
    execOptional(project.path, 'gh', ['auth', 'status'], 8_000),
  ])

  let branch = branchResult.stdout.trim()
  if (!branch) {
    const head = await execGit(project.path, ['rev-parse', '--short', 'HEAD'], 8_000).catch(() => ({ stdout: '', stderr: '' }))
    branch = head.stdout.trim() ? `HEAD ${head.stdout.trim()}` : '无分支'
  }

  const unstaged = parseGitNumstat(unstagedResult.stdout)
  const staged = parseGitNumstat(stagedResult.stdout)
  const statusLines = statusResult.stdout.split(/\r?\n/).filter(Boolean)
  const remote = remoteResult.stdout.trim()
  const ghOutput = `${ghResult.stdout}\n${ghResult.stderr}`.trim()
  const githubAuthenticated = ghResult.ok && /Logged in|Token scopes|github\.com/i.test(ghOutput)

  return {
    is_repo: true,
    local: true,
    branch,
    root: rootResult.stdout.trim() || project.path,
    remote,
    remote_label: publicGitRemote(remote),
    changed_files: statusLines.length,
    additions: unstaged.added + staged.added,
    deletions: unstaged.removed + staged.removed,
    github_authenticated: githubAuthenticated,
    github_status: ghResult.ok
      ? (githubAuthenticated ? 'GitHub CLI 已登录' : 'GitHub CLI 未确认登录')
      : 'GitHub CLI 未登录或未安装',
    status: statusLines.map(line => ({
      code: line.slice(0, 2).trim(),
      path: line.slice(3).trim(),
    })),
  }
}

function findTask(userId: string, taskId: string) {
  return tasksStore().tasks.find(task => task.userId === userId && task.id === taskId)
}

function appendTerminalOutput(session: TerminalSession, stream: TerminalSession['output'][number]['stream'], text: string) {
  session.outputSeq += 1
  session.output.push({ seq: session.outputSeq, ts: now(), stream, text })
  session.output = session.output.slice(-2000)
  session.updatedAt = now()
}

function publicTerminalSession(session: TerminalSession, afterSeq = 0) {
  const alive = !session.closedAt
  return {
    id: session.id,
    project_id: session.projectId,
    project_name: session.projectName,
    project_path: session.projectPath,
    cwd: session.projectPath,
    running: alive,
    pid: session.terminal.pid,
    output_seq: session.outputSeq,
    created_at: session.createdAt,
    updated_at: session.updatedAt,
    closed_at: session.closedAt || '',
    output: session.output.filter(item => item.seq > afterSeq),
  }
}

function findTerminalSession(userId: string, sessionId: string) {
  const session = terminalSessions.get(sessionId)
  return session && session.userId === userId ? session : null
}

function terminalShell() {
  if (process.platform === 'win32') return { command: 'cmd.exe', args: [] }
  const candidates = [
    String(process.env.SHELL || ''),
    '/bin/zsh',
    '/bin/bash',
    '/bin/sh',
  ].filter(Boolean)
  const command = candidates.find((candidate) => {
    try {
      fs.accessSync(candidate, fs.constants.X_OK)
      return true
    } catch {
      return false
    }
  }) || '/bin/sh'
  return { command, args: ['-l'] }
}

function createTerminalSession(userId: string, project: CodexProject) {
  const shell = terminalShell()
  let terminal: pty.IPty
  try {
    terminal = pty.spawn(shell.command, shell.args, {
      name: 'xterm-256color',
      cols: 100,
      rows: 24,
      cwd: project.path,
      env: { ...process.env, SHELL: shell.command, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    })
  } catch (err: any) {
    throw new Error(`终端启动失败：${err?.message || 'PTY 启动失败'}，shell=${shell.command}`)
  }
  const ts = now()
  const session: TerminalSession = {
    id: `terminal_${randomUUID()}`,
    userId,
    projectId: project.id,
    projectName: project.name,
    projectPath: project.path,
    terminal,
    outputSeq: 0,
    output: [],
    createdAt: ts,
    updatedAt: ts,
  }
  terminalSessions.set(session.id, session)
  terminal.onData(data => appendTerminalOutput(session, 'stdout', data))
  terminal.onExit(({ exitCode, signal }) => {
    session.closedAt = now()
    appendTerminalOutput(session, 'system', `\r\n终端已退出：code=${exitCode ?? 'null'} signal=${signal ?? 'null'}\r\n`)
  })
  return session
}

function userThreadIds(userId: string) {
  return new Set(tasksStore().tasks
    .filter(task => task.userId === userId && task.threadId)
    .map(task => task.threadId as string))
}

function publicThreadTask(task: CodexTask) {
  return {
    task_id: task.id,
    thread_id: task.threadId,
    project_id: task.projectId,
    project_name: task.projectName,
    prompt: task.prompt,
    status: task.status,
    runtime: task.runtime,
    created_at: task.createdAt,
    updated_at: task.updatedAt,
  }
}

function threadItemId(item: any) {
  return String(item?.id || item?.threadId || item?.thread_id || item?.thread?.id || '')
}

function filterNativeThreads(result: any, allowed: Set<string>) {
  if (Array.isArray(result)) return result.filter(item => allowed.has(threadItemId(item)))
  if (Array.isArray(result?.threads)) {
    return { ...result, threads: result.threads.filter((item: any) => allowed.has(threadItemId(item))) }
  }
  if (Array.isArray(result?.items)) {
    return { ...result, items: result.items.filter((item: any) => allowed.has(threadItemId(item))) }
  }
  if (Array.isArray(result?.data)) {
    return { ...result, data: result.data.filter((item: any) => allowed.has(threadItemId(item))) }
  }
  return null
}

function projectContainsFile(projectPath: string, filePath: string) {
  const resolvedProject = path.resolve(projectPath)
  const resolvedFile = path.resolve(filePath)
  return resolvedFile === resolvedProject || resolvedFile.startsWith(`${resolvedProject}${path.sep}`)
}

function resolveProjectFilePath(project: CodexProject, requestedPath: string) {
  const root = path.resolve(project.path)
  const raw = String(requestedPath || '').trim()
  if (!raw) return null
  const target = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw)
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) return null
  return target
}

function detectLanguage(filePath: string) {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '')
  const map: Record<string, string> = {
    cjs: 'javascript',
    css: 'css',
    html: 'html',
    js: 'javascript',
    json: 'json',
    jsx: 'javascript',
    md: 'markdown',
    mjs: 'javascript',
    py: 'python',
    ts: 'typescript',
    tsx: 'typescript',
    vue: 'vue',
    yaml: 'yaml',
    yml: 'yaml',
  }
  return map[ext] || ext || 'text'
}

function pathContains(parentPath: string, childPath: string) {
  const parent = path.resolve(parentPath)
  const child = path.resolve(childPath)
  return child === parent || child.startsWith(`${parent}${path.sep}`)
}

function realPath(value: string) {
  return fs.realpathSync(path.resolve(value))
}

function requestHostname(c: any) {
  try {
    return new URL(c.req.url).hostname.toLowerCase()
  } catch {
    const host = String(c.req.header('host') || '').trim().toLowerCase()
    if (host.startsWith('[')) {
      const end = host.indexOf(']')
      return end > 0 ? host.slice(1, end) : host
    }
    return host.split(':')[0]
  }
}

function isLocalProjectAccessAllowed(c: any) {
  const explicit = String(process.env.CODEX_ENABLE_LOCAL_PROJECTS || '').toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(explicit)) return true
  const host = requestHostname(c)
  return host === 'localhost' || host === '127.0.0.1' || host === '::1' || host.endsWith('.localhost')
}

function localProjectPathError(userId: string, requestedPath: string, store = projectsStore()) {
  if (!requestedPath) return 'local project path required'
  const resolvedPath = path.resolve(requestedPath)
  if (!fs.existsSync(resolvedPath)) return 'local project path not found'
  if (!fs.statSync(resolvedPath).isDirectory()) return 'local project path must be a directory'

  const projectPath = realPath(resolvedPath)
  const roots = localDirectoryRoots()
  if (!roots.some(root => pathContains(root, projectPath))) {
    return 'local project path is outside the allowed local roots'
  }
  const appRoot = realPath(path.resolve(process.cwd(), '..'))
  if (pathContains(appRoot, projectPath) || pathContains(projectPath, appRoot)) {
    return 'cannot bind the Huobao application directory'
  }
  if (store.projects.some((project) => {
    if (project.userId !== userId) return false
    try {
      return realPath(project.path) === projectPath
    } catch {
      return path.resolve(project.path) === projectPath
    }
  })) {
    return 'local project path already added'
  }
  return ''
}

function localDirectoryRoots() {
  const configured = String(process.env.CODEX_LOCAL_PROJECT_ROOTS || '')
    .split(/[,:]/)
    .map(item => item.trim())
    .filter(Boolean)
  const candidates = configured.length
    ? configured
    : [os.homedir(), '/private/tmp', '/Volumes'].filter(Boolean)
  return [...new Set(candidates)]
    .filter(item => fs.existsSync(item))
    .map(item => realPath(item))
}

function pickMacDirectory() {
  return new Promise<string>((resolve, reject) => {
    execFile('osascript', [
      '-e',
      'POSIX path of (choose folder with prompt "选择要导入 Codex 的本地项目文件夹")',
    ], { timeout: 120_000 }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
        return
      }
      resolve(String(stdout || '').trim())
    })
  })
}

function normalizeImagePaths(project: CodexProject, value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map(item => String(item || '').trim())
    .filter(Boolean)
    .map(item => path.isAbsolute(item) ? item : path.join(project.path, item))
    .map(item => path.resolve(item))
    .filter(item => projectContainsFile(project.path, item) && fs.existsSync(item))
    .slice(0, 8)
}

function resolveSelectedContext(userId: string, value: unknown): CodexSelectedContext | null {
  if (!value || typeof value !== 'object') return null
  const input = value as Record<string, unknown>
  const name = String(input.name || '').trim()
  const rawType = String(input.type || '').trim()
  const type: CodexSelectedContext['type'] = rawType === 'skill' ? 'skill' : 'mention'
  if (!name) return null

  if (type === 'skill') {
    const requestedPath = String(input.path || '').trim()
    const skill = listUserSkills(userId).find((item) => {
      return item.name === name
        || item.id === input.id
        || (requestedPath && path.resolve(item.path) === path.resolve(requestedPath))
    })
    if (!skill || !fs.existsSync(path.join(skill.path, 'SKILL.md'))) return null
    return {
      id: String(input.id || skill.id || name),
      name: skill.name,
      type: 'skill',
      path: path.join(skill.path, 'SKILL.md'),
    }
  }

  const requestedPath = String(input.path || '').trim()
  const plugin = listUserPlugins(userId).find((item) => {
    return item.name === name
      || item.id === input.id
      || (requestedPath && path.resolve(item.path) === path.resolve(requestedPath))
  })
  const pluginName = plugin?.name || name
  return {
    id: String(input.id || plugin?.id || pluginName),
    name: pluginName,
    type: 'mention',
    path: requestedPath.startsWith('plugin://') || requestedPath.startsWith('app://')
      ? requestedPath
      : `plugin://${pluginName}`,
  }
}

function pushImageArgs(args: string[], images: string[]) {
  images.forEach(imagePath => args.push('--image', imagePath))
}

function pushPromptArg(args: string[], prompt: string) {
  args.push('--', prompt)
}

function isPortAvailable(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = net.createServer()
    server.once('error', () => resolve(false))
    server.once('listening', () => server.close(() => resolve(true)))
    server.listen(port, '127.0.0.1')
  })
}

async function findFreePort(start = 5791) {
  for (let port = start; port < start + 80; port++) {
    if (await isPortAvailable(port)) return port
  }
  throw new Error('no free app-server port')
}

function appServerKey(userId: string) {
  return safeSegment(userId, 'user')
}

function userAppServerHome(userId: string) {
  return path.join(APP_SERVER_HOMES_ROOT, appServerKey(userId))
}

function userAppServerTokenPath(userId: string) {
  return path.join(APP_SERVER_TOKENS_ROOT, `${appServerKey(userId)}.token`)
}

function userSkillsPath(userId: string) {
  return path.join(userAppServerHome(userId), 'skills')
}

function userPluginsPath(userId: string) {
  return path.join(userAppServerHome(userId), 'plugins')
}

function userMarketplacePath(userId: string) {
  return path.join(userAppServerHome(userId), '.agents', 'plugins', 'marketplace.json')
}

function codexProviderKey(config: CodexUserConfig) {
  return String(config.baseUrl || '').toLowerCase().includes('zenmux.ai') ? 'zenmux' : 'custom'
}

function codexProviderEnvKey(config: CodexUserConfig) {
  return codexProviderKey(config) === 'zenmux' ? 'ZENMUX_API_KEY' : 'CODEX_API_KEY'
}

function appServerConfigSignature(config: CodexUserConfig) {
  return JSON.stringify({
    provider: codexProviderKey(config),
    baseUrl: normalizeBaseUrl(config.baseUrl),
    model: normalizeConfigModel(config.model),
  })
}

function tomlString(value: string) {
  return JSON.stringify(String(value || ''))
}

function preservedProjectConfig(home: string) {
  const configPath = path.join(home, 'config.toml')
  if (!fs.existsSync(configPath)) return ''
  const lines = fs.readFileSync(configPath, 'utf8').split(/\r?\n/)
  const start = lines.findIndex(line => /^\s*\[projects\./.test(line))
  return start >= 0 ? lines.slice(start).join('\n').trim() : ''
}

function writeCodexUserConfig(userId: string, config: CodexUserConfig) {
  const home = userAppServerHome(userId)
  fs.mkdirSync(home, { recursive: true })
  fs.mkdirSync(userSkillsPath(userId), { recursive: true })
  fs.mkdirSync(userPluginsPath(userId), { recursive: true })
  fs.mkdirSync(path.dirname(userMarketplacePath(userId)), { recursive: true })
  const provider = codexProviderKey(config)
  const envKey = codexProviderEnvKey(config)
  const preservedProjects = preservedProjectConfig(home)
  const content = [
    `model_provider = ${tomlString(provider)}`,
    `model = ${tomlString(normalizeConfigModel(config.model) || 'openai/gpt-5.2-codex')}`,
    '',
    `[model_providers.${provider}]`,
    `name = ${tomlString(provider === 'zenmux' ? 'ZenMux' : 'Custom')}`,
    `base_url = ${tomlString(normalizeBaseUrl(config.baseUrl))}`,
    `env_key = ${tomlString(envKey)}`,
    'wire_api = "responses"',
    preservedProjects ? `\n${preservedProjects}` : '',
    '',
  ].filter(item => item !== '').join('\n')
  fs.writeFileSync(path.join(home, 'config.toml'), content, { mode: 0o600 })
}

function readFrontmatterValue(content: string, key: string) {
  const line = content.split(/\r?\n/).find(item => item.trim().toLowerCase().startsWith(`${key.toLowerCase()}:`))
  if (!line) return ''
  return line
    .replace(new RegExp(`^\\s*${key}\\s*:`, 'i'), '')
    .trim()
    .replace(/^['"]|['"]$/g, '')
}

function readSkillMeta(skillDir: string) {
  const skillPath = path.join(skillDir, 'SKILL.md')
  if (!fs.existsSync(skillPath)) return { name: path.basename(skillDir), description: '' }
  const content = fs.readFileSync(skillPath, 'utf8')
  const lines = content.split(/\r?\n/)
  const description = readFrontmatterValue(content, 'description')
    || lines.find(line => line.trim() && !line.trim().startsWith('#') && line.trim() !== '---')?.trim()
    || ''
  return {
    name: readFrontmatterValue(content, 'name') || path.basename(skillDir),
    description,
  }
}

function ensureBuiltInSkills(userId: string) {
  const skillCreatorDir = path.join(userSkillsPath(userId), '.system', 'skill-creator')
  const skillCreatorPath = path.join(skillCreatorDir, 'SKILL.md')
  if (!fs.existsSync(skillCreatorPath)) {
    fs.mkdirSync(skillCreatorDir, { recursive: true })
    fs.writeFileSync(skillCreatorPath, [
      '---',
      'name: Skill Creator',
      'description: Create or install Codex skills only for the current Huobao user.',
      '---',
      '',
      'You help create, update, and install Codex skills for the current Huobao user only.',
      'Install skills under this isolated CODEX_HOME skills directory. Do not write to global ~/.codex/skills.',
      'When the user gives a GitHub repository, inspect it and install the requested skill into the current user skills directory.',
      'When the user describes a new capability, create a focused SKILL.md with clear trigger rules and workflow instructions.',
      '',
    ].join('\n'))
  }
}

function listUserSkills(userId: string) {
  const root = userSkillsPath(userId)
  fs.mkdirSync(root, { recursive: true })
  ensureBuiltInSkills(userId)
  const skills: Array<{ id: string; name: string; description: string; path: string; scope: string }> = []
  const visit = (dir: string, depth = 0) => {
    if (depth > 4 || !fs.existsSync(dir)) return
    if (fs.existsSync(path.join(dir, 'SKILL.md'))) {
      const meta = readSkillMeta(dir)
      skills.push({
        id: path.relative(root, dir) || meta.name,
        name: meta.name,
        description: meta.description,
        path: dir,
        scope: path.relative(root, dir).startsWith('.system') ? 'system' : 'user',
      })
      return
    }
    fs.readdirSync(dir, { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .forEach(entry => visit(path.join(dir, entry.name), depth + 1))
  }
  visit(root)
  return skills
    .sort((a, b) => a.name.localeCompare(b.name))
}

function listUserPlugins(userId: string) {
  const root = userPluginsPath(userId)
  fs.mkdirSync(root, { recursive: true })
  const plugins = new Map<string, { id: string; name: string; description: string; path: string; scope: string }>()
  const addPlugin = (pluginDir: string) => {
    const manifestPath = path.join(pluginDir, '.codex-plugin', 'plugin.json')
    if (!fs.existsSync(manifestPath)) return
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
      const name = String(manifest.name || path.basename(pluginDir))
      plugins.set(name, {
        id: name,
        name,
        description: String(manifest.description || manifest.interface?.description || ''),
        path: pluginDir,
        scope: 'user',
      })
    } catch {}
  }
  fs.readdirSync(root, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .forEach(entry => addPlugin(path.join(root, entry.name)))

  const marketplacePath = userMarketplacePath(userId)
  if (fs.existsSync(marketplacePath)) {
    try {
      const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'))
      const entries = Array.isArray(marketplace.plugins) ? marketplace.plugins : []
      entries.forEach((entry: any) => {
        const name = String(entry?.name || '').trim()
        if (!name) return
        const sourcePath = entry?.source?.source === 'local' ? String(entry.source.path || '') : ''
        const pluginDir = sourcePath
          ? path.resolve(path.dirname(marketplacePath), '..', '..', sourcePath)
          : path.join(root, name)
        plugins.set(name, {
          id: name,
          name,
          description: String(entry?.description || entry?.category || ''),
          path: pluginDir,
          scope: 'user',
        })
      })
    } catch {}
  }
  return [...plugins.values()].sort((a, b) => a.name.localeCompare(b.name))
}

function stopUserAppServer(userId: string) {
  const key = appServerKey(userId)
  const state = appServers.get(key)
  if (state?.process && !state.process.killed) {
    state.process.kill('SIGTERM')
  }
  appServers.delete(key)
}

function appServerEnv(userId: string, config: CodexUserConfig) {
  const env: NodeJS.ProcessEnv = { ...process.env }
  delete env.OPENAI_API_KEY
  delete env.OPENAI_BASE_URL
  delete env.OPENAI_API_BASE
  delete env.CODEX_HOME
  delete env.ANTHROPIC_API_KEY
  delete env.ZENMUX_API_KEY
  delete env.CODEX_API_KEY
  const envKey = codexProviderEnvKey(config)
  return {
    ...env,
    CI: '1',
    NO_COLOR: '1',
    CODEX_HOME: userAppServerHome(userId),
    [envKey]: config.apiKey || '',
  }
}

async function waitForAppServerReady(url: string) {
  const deadline = Date.now() + 15_000
  const readyUrl = `${url.replace('ws://', 'http://')}/readyz`
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(readyUrl)
      if (resp.ok) return
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250))
  }
  throw new Error('codex app-server is not ready')
}

async function ensureAppServer(userId: string) {
  const config = userConfig(userId)
  if (!config?.apiKey) {
    throw new Error('请先在 Codex 设置中填写 API Key')
  }
  const key = appServerKey(userId)
  const signature = appServerConfigSignature(config)
  const existing = appServers.get(key)
  if (existing?.url && existing.token && existing.process && !existing.process.killed && existing.configSignature === signature) {
    return { url: existing.url, token: existing.token }
  }
  if (existing?.process && !existing.process.killed && existing.configSignature !== signature) {
    stopUserAppServer(userId)
  }
  if (existing?.starting) return existing.starting

  const state: AppServerState = { process: null, url: '', token: '', configSignature: signature, starting: null }
  appServers.set(key, state)

  state.starting = (async () => {
    ensureDirs()
    writeCodexUserConfig(userId, config)
    const port = await findFreePort()
    const token = randomUUID()
    const tokenPath = userAppServerTokenPath(userId)
    fs.writeFileSync(tokenPath, token, { mode: 0o600 })
    const url = `ws://127.0.0.1:${port}`
    const child = spawn(CODEX_BIN, [
      'app-server',
      '--listen',
      url,
      '--ws-auth',
      'capability-token',
      '--ws-token-file',
      tokenPath,
    ], {
      cwd: process.cwd(),
      env: appServerEnv(userId, config),
    })

    state.process = child
    state.url = url
    state.token = token

    child.stdout.on('data', (chunk) => {
      String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => console.log(`[codex app-server:${key}] ${line}`))
    })
    child.stderr.on('data', (chunk) => {
      String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => console.warn(`[codex app-server:${key}] ${line}`))
    })
    child.on('exit', () => {
      state.process = null
      state.url = ''
      state.token = ''
    })

    await waitForAppServerReady(url)
    return { url, token }
  })()

  try {
    return await state.starting
  } finally {
    state.starting = null
  }
}

function appServerRequest(ws: any, idRef: { value: number }, method: string, params: unknown) {
  const id = idRef.value++
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
  return id
}

async function appServerRpc(userId: string, method: string, params: unknown = {}) {
  const { url, token } = await ensureAppServer(userId)
  const WebSocketCtor = WebSocket as unknown as new (url: string, options?: { headers?: Record<string, string> }) => any
  return new Promise<any>((resolve, reject) => {
    const ws = new WebSocketCtor(url, { headers: { Authorization: `Bearer ${token}` } })
    const idRef = { value: 1 }
    let targetId = 0
    let settled = false
    const finish = (err: Error | null, result?: any) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      try { ws.close() } catch {}
      if (err) reject(err)
      else resolve(result)
    }
    const timer = setTimeout(() => {
      finish(new Error(`Codex app-server request timeout: ${method}`))
    }, 15_000)

    ws.onopen = () => {
      appServerRequest(ws, idRef, 'initialize', {
        clientInfo: { name: 'huobao', title: 'Huobao', version: '0.1.0' },
        capabilities: { experimentalApi: true, requestAttestation: false },
      })
    }
    ws.onerror = () => {
      finish(new Error('Codex app-server WebSocket 连接失败'))
    }
    ws.onmessage = (event: any) => {
      const message = JSON.parse(String(event.data))
      if (message.id === 1 && message.error) {
        finish(new Error(message.error.message || JSON.stringify(message.error)))
        return
      }
      if (message.id === 1 && message.result) {
        targetId = appServerRequest(ws, idRef, method, params)
        return
      }
      if (targetId && message.id === targetId) {
        if (message.error) {
          finish(new Error(message.error.message || JSON.stringify(message.error)))
        } else {
          finish(null, message.result ?? null)
        }
      }
    }
    ws.onclose = () => {
      if (!settled) finish(new Error(`Codex app-server connection closed during ${method}`))
    }
  })
}

function sandboxForAppServer(sandbox: string) {
  return sandbox === 'danger-full-access' || sandbox === 'read-only' ? sandbox : 'workspace-write'
}

function approvalPolicyForTask(task: CodexTask) {
  return task.sandbox === 'danger-full-access' ? 'never' : 'on-request'
}

function shouldAutoApprove(task: CodexTask) {
  return task.sandbox === 'danger-full-access'
}

function buildUserInput(task: CodexTask) {
  const skillInstruction = [
    'Huobao Codex runtime note:',
    'If the user asks to install, create, update, or use a Codex skill, install it only for the current Huobao user under this isolated CODEX_HOME skills directory.',
    'Do not install skills into the machine global ~/.codex/skills directory or any shared user directory.',
    'After installing a skill, use it only in this current user workspace.',
  ].join('\n')
  const workspaceInstruction = [
    'Current Huobao Codex workspace:',
    `Project name: ${task.projectName}`,
    `Current working directory (cwd): ${task.projectPath}`,
    'When asked about the current working directory, answer with this cwd.',
    'Run commands and resolve relative file paths from this cwd unless the user explicitly asks otherwise.',
    'This workspace context is for execution accuracy; do not repeat it unless it is directly relevant to the user request.',
  ].join('\n')
  const input: Array<Record<string, unknown>> = [
    { type: 'text', text: skillInstruction, text_elements: [] },
    { type: 'text', text: workspaceInstruction, text_elements: [] },
  ]
  if (task.selectedContext?.name && task.selectedContext.path) {
    input.push({
      type: task.selectedContext.type,
      name: task.selectedContext.name,
      path: task.selectedContext.path,
    })
  }
  input.push(
    { type: 'text', text: task.prompt, text_elements: [] },
    ...(task.images || []).map(imagePath => ({ type: 'localImage', path: imagePath })),
  )
  return input
}

function normalizeAppServerEvent(message: any): CodexTaskEvent | null {
  const method = message?.method
  const params = message?.params || {}
  const item = params.item || {}

  if (appServerMessageWillRetry(message)) return null

  if (method === 'item/started') {
    if (item.type === 'commandExecution') {
      return {
        ts: now(),
        stream: 'stdout',
        type: 'app.command_started',
        role: 'tool',
        text: item.command || '',
        raw: JSON.stringify(message),
      }
    }
    if (item.type === 'webSearch') {
      return {
        ts: now(),
        stream: 'stdout',
        type: 'app.webSearch',
        role: 'tool',
        text: JSON.stringify(item),
        raw: JSON.stringify(message),
      }
    }
    if (item.type === 'reasoning') return null
  }

  if (method === 'item/completed') {
    if (item.type === 'userMessage') {
      const textParts = (item.content || [])
        .map((part: any) => part.type === 'text' ? part.text : part.type === 'localImage' ? `[图片] ${part.path}` : '')
        .filter(Boolean)
      const text = textParts[textParts.length - 1] || ''
      return { ts: now(), stream: 'system', type: 'user_message', role: 'user', text, raw: JSON.stringify(message) }
    }
    if (item.type === 'agentMessage') {
      return { ts: now(), stream: 'stdout', type: 'app.agent_message', role: 'assistant', text: item.text || '', raw: JSON.stringify(message) }
    }
    if (item.type === 'commandExecution') {
      return {
        ts: now(),
        stream: 'stdout',
        type: 'app.command',
        role: 'tool',
        text: `${item.command || ''}${item.aggregatedOutput ? `\n${item.aggregatedOutput}` : ''}`,
        raw: JSON.stringify(message),
      }
    }
    if (item.type === 'webSearch') {
      return {
        ts: now(),
        stream: 'stdout',
        type: 'app.webSearch',
        role: 'tool',
        text: JSON.stringify(item),
        raw: JSON.stringify(message),
      }
    }
    if (item.type === 'fileChange') {
      return {
        ts: now(),
        stream: 'stdout',
        type: 'app.fileChange',
        role: 'tool',
        text: JSON.stringify(item),
        raw: JSON.stringify(message),
      }
    }
    if (item.type === 'reasoning') return null
    return { ts: now(), stream: 'stdout', type: `app.${item.type || 'item'}`, role: 'tool', text: item.text || item.command || JSON.stringify(item), raw: JSON.stringify(message) }
  }

  if (method === 'item/agentMessage/delta') {
    return { ts: now(), stream: 'stdout', type: 'app.agent_delta', role: 'assistant', text: params.delta || '', raw: JSON.stringify(message) }
  }

  if (method === 'item/commandExecution/outputDelta') {
    return { ts: now(), stream: 'stdout', type: 'app.command_delta', role: 'tool', text: params.delta || params.output || '', raw: JSON.stringify(message) }
  }

  if (method === 'item/fileChange/outputDelta') {
    return { ts: now(), stream: 'stdout', type: 'app.file_delta', role: 'tool', text: params.delta || params.output || '', raw: JSON.stringify(message) }
  }

  if (method === 'item/fileChange/patchUpdated') {
    const file = params.path || params.filePath || params.item?.path || ''
    const patch = params.patch || params.diff || params.item?.patch || ''
    return { ts: now(), stream: 'stdout', type: 'app.patch', role: 'tool', text: `${file ? `${file}\n` : ''}${patch}`, raw: JSON.stringify(message) }
  }

  if (method === 'turn/diff/updated') {
    return {
      ts: now(),
      stream: 'stdout',
      type: 'app.diff',
      role: 'tool',
      text: JSON.stringify(params.diff || params.patch || params),
      raw: JSON.stringify(message),
    }
  }

  if (method === 'turn/plan/updated') {
    const plan = params.plan || params.items || []
    const text = Array.isArray(plan)
      ? plan.map((step: any) => `${step.status ? `[${step.status}] ` : ''}${step.step || step.text || step.title || JSON.stringify(step)}`).join('\n')
      : JSON.stringify(plan)
    return { ts: now(), stream: 'system', type: 'app.plan', role: 'system', text, raw: JSON.stringify(message) }
  }

  if (method === 'item/reasoning/delta' || method === 'item/reasoning/summaryDelta') {
    return { ts: now(), stream: 'stdout', type: 'app.reasoning_delta', role: 'assistant', text: params.delta || params.text || '', raw: JSON.stringify(message) }
  }

  if (method === 'turn/started') return { ts: now(), stream: 'system', type: 'app.turn_started', text: 'Codex 开始处理', raw: JSON.stringify(message) }
  if (method === 'turn/completed') return { ts: now(), stream: 'system', type: 'app.turn_completed', text: '本轮完成', raw: JSON.stringify(message) }
  if (method === 'turn/failed') return { ts: now(), stream: 'stderr', type: 'app.turn_failed', text: params.error?.message || params.message || '本轮失败', raw: JSON.stringify(message) }
  if (method === 'thread/started') return { ts: now(), stream: 'system', type: 'app.thread_started', text: `线程已连接 ${params.thread?.id || ''}`, raw: JSON.stringify(message) }
  if (method === 'thread/status/changed') return { ts: now(), stream: 'system', type: 'app.thread_status', text: `线程状态 ${params.status?.type || ''}`, raw: JSON.stringify(message) }
  if (method === 'thread/tokenUsage/updated') {
    const usage = params.tokenUsage?.last || params.tokenUsage?.total || {}
    return {
      ts: now(),
      stream: 'system',
      type: 'app.token_usage',
      text: `用量 输入 ${usage.inputTokens ?? 0} / 输出 ${usage.outputTokens ?? 0}`,
      raw: JSON.stringify(message),
    }
  }
  if (method === 'error' || message?.error) {
    return { ts: now(), stream: 'stderr', type: 'app.error', text: message.error?.message || params.message || JSON.stringify(message.error || params), raw: JSON.stringify(message) }
  }
  return null
}

function appServerMessageWillRetry(message: any) {
  return Boolean(
    message?.willRetry
    || message?.error?.willRetry
    || message?.params?.willRetry
    || message?.params?.error?.willRetry
  )
}

async function runCodexAppTurn(task: CodexTask, options: { resumeThreadId?: string }) {
  const { url, token } = await ensureAppServer(task.userId)
  const WebSocketCtor = WebSocket as unknown as new (url: string, options?: { headers?: Record<string, string> }) => any
  const ws = new WebSocketCtor(url, { headers: { Authorization: `Bearer ${token}` } })
  const idRef = { value: 1 }
  let threadId = options.resumeThreadId || task.threadId || ''
  let turnStarted = false
  let assistantDelta = ''
  let sawRetryableDisconnect = false
  const workspaceRoots = [task.projectPath, userSkillsPath(task.userId)]

  activeAppTurns.set(task.id, { ws, threadId })
  appendTaskEvent(task.id, { ts: now(), stream: 'system', type: 'app.connect', text: `连接 Codex app-server：${url}` })

  ws.onmessage = (event: any) => {
    const message = JSON.parse(String(event.data))
    if (approvalKind(message?.method)) {
      if (shouldAutoApprove(task)) {
        const approval = storeApproval(task.userId, task.id, message)
        if (approval) {
          const payload = {
            jsonrpc: '2.0',
            id: approval.requestId,
            ...approvalResponseFor(approval, 'acceptForSession', 'session'),
          }
          ws.send(JSON.stringify(payload))
          pendingApprovals.delete(approval.id)
          appendTaskEvent(task.id, {
            ts: now(),
            stream: 'system',
            type: 'app.approval_resolved',
            role: 'system',
            text: '完全控制权限已自动授权',
          })
        }
      } else {
        storeApproval(task.userId, task.id, message)
      }
      return
    }
    if (appServerMessageWillRetry(message)) {
      sawRetryableDisconnect = true
      return
    }
    const normalized = normalizeAppServerEvent(message)
    if (message?.result?.thread?.id) {
      threadId = message.result.thread.id
      updateTask(task.id, { threadId })
      const active = activeAppTurns.get(task.id)
      if (active) active.threadId = threadId
    }
    if (message?.result?.turn?.id) {
      const active = activeAppTurns.get(task.id)
      if (active) active.turnId = message.result.turn.id
    }
    if (message.method === 'item/agentMessage/delta') {
      assistantDelta += message.params?.delta || ''
      if (message.params?.delta && normalized) appendTaskEvent(task.id, normalized)
      return
    }
    if (message.method === 'item/completed' && message.params?.item?.type === 'agentMessage') {
      assistantDelta = ''
    }
    if (normalized) appendTaskEvent(task.id, normalized)

    if (message.id === 1 && message.result) {
      if (threadId) {
        appServerRequest(ws, idRef, 'thread/resume', {
          threadId,
          cwd: task.projectPath,
          runtimeWorkspaceRoots: workspaceRoots,
          approvalPolicy: approvalPolicyForTask(task),
          approvalsReviewer: 'user',
          config: task.reasoningEffort ? { model_reasoning_effort: task.reasoningEffort } : null,
          includeTurnHistory: false,
        })
      } else {
        appServerRequest(ws, idRef, 'thread/start', {
          cwd: task.projectPath,
          runtimeWorkspaceRoots: workspaceRoots,
          model: task.model || null,
          sandbox: sandboxForAppServer(task.sandbox || 'workspace-write'),
          approvalPolicy: approvalPolicyForTask(task),
          approvalsReviewer: 'user',
          config: task.reasoningEffort ? { model_reasoning_effort: task.reasoningEffort } : null,
          experimentalRawEvents: false,
          persistExtendedHistory: false,
        })
      }
    } else if ((message.id === 2 || message.id === 3) && message.result && threadId && !turnStarted) {
      turnStarted = true
      appServerRequest(ws, idRef, 'turn/start', {
        threadId,
        input: buildUserInput(task),
        model: task.model || null,
        effort: task.reasoningEffort || null,
        cwd: task.projectPath,
        runtimeWorkspaceRoots: workspaceRoots,
        approvalPolicy: approvalPolicyForTask(task),
        approvalsReviewer: 'user',
      })
    }

    if (message.method === 'turn/completed') {
      if (assistantDelta) {
        appendTaskEvent(task.id, { ts: now(), stream: 'stdout', type: 'app.agent_message', role: 'assistant', text: assistantDelta })
      }
      updateTask(task.id, { status: 'completed', exitCode: 0, signal: null })
      activeAppTurns.delete(task.id)
      for (const [approvalId, approval] of pendingApprovals) {
        if (approval.taskId === task.id) pendingApprovals.delete(approvalId)
      }
      ws.close()
    }
    if (message.method === 'turn/failed' && !appServerMessageWillRetry(message)) {
      updateTask(task.id, { status: 'failed', exitCode: 1, signal: null })
      activeAppTurns.delete(task.id)
      for (const [approvalId, approval] of pendingApprovals) {
        if (approval.taskId === task.id) pendingApprovals.delete(approvalId)
      }
      ws.close()
    }
    if ((message.method === 'error' || message.error) && !appServerMessageWillRetry(message)) {
      updateTask(task.id, { status: 'failed', exitCode: 1, signal: null })
      activeAppTurns.delete(task.id)
      for (const [approvalId, approval] of pendingApprovals) {
        if (approval.taskId === task.id) pendingApprovals.delete(approvalId)
      }
      ws.close()
    }
  }

  ws.onopen = () => {
    updateTask(task.id, { status: 'running', runtime: 'app-server' })
    appServerRequest(ws, idRef, 'initialize', {
      clientInfo: { name: 'huobao', title: 'Huobao', version: '0.1.0' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    })
  }
  ws.onerror = () => {
    if (sawRetryableDisconnect) return
    appendTaskEvent(task.id, { ts: now(), stream: 'stderr', type: 'app.error', text: 'Codex app-server WebSocket 连接失败' })
    updateTask(task.id, { status: 'failed', exitCode: 1 })
    activeAppTurns.delete(task.id)
    for (const [approvalId, approval] of pendingApprovals) {
      if (approval.taskId === task.id) pendingApprovals.delete(approvalId)
    }
  }
  ws.onclose = () => {
    const current = findTask(task.userId, task.id)
    if (current?.status === 'running' && !sawRetryableDisconnect) {
      updateTask(task.id, { status: 'failed', exitCode: 1 })
    }
    if (!sawRetryableDisconnect) activeAppTurns.delete(task.id)
    if (!sawRetryableDisconnect) {
      for (const [approvalId, approval] of pendingApprovals) {
        if (approval.taskId === task.id) pendingApprovals.delete(approvalId)
      }
    }
  }
}

function attachCodexProcess(task: CodexTask, args: string[]) {
  appendTaskEvent(task.id, {
    ts: now(),
    stream: 'system',
    text: `启动 Codex：${CODEX_BIN} ${args.map(arg => JSON.stringify(arg)).join(' ')}`,
  })

  const config = userConfig(task.userId)
  if (!config?.apiKey) throw new Error('请先在 Codex 设置中填写 API Key')

  const child = spawn(CODEX_BIN, args, {
    cwd: task.projectPath,
    env: appServerEnv(task.userId, config),
  })
  child.stdin.end()
  running.set(task.id, child)
  updateTask(task.id, { pid: child.pid, status: 'running' })

  child.stdout.on('data', (chunk) => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => appendTaskEvent(task.id, extractEvent(line, 'stdout')))
  })
  child.stderr.on('data', (chunk) => {
    String(chunk).split(/\r?\n/).filter(Boolean).forEach(line => appendTaskEvent(task.id, extractEvent(line, 'stderr')))
  })
  child.on('error', (err) => {
    appendTaskEvent(task.id, { ts: now(), stream: 'system', text: err.message })
    updateTask(task.id, { status: 'failed' })
    running.delete(task.id)
  })
  child.on('exit', (code, signal) => {
    const current = tasksStore().tasks.find(item => item.id === task.id)
    const wasCancelled = current?.status === 'cancelled'
    appendTaskEvent(task.id, {
      ts: now(),
      stream: 'system',
      text: wasCancelled ? '任务已取消' : `Codex 退出：code=${code ?? 'null'} signal=${signal ?? 'null'}`,
    })
    updateTask(task.id, {
      status: wasCancelled ? 'cancelled' : code === 0 ? 'completed' : 'failed',
      exitCode: code,
      signal,
    })
    running.delete(task.id)
  })

  return child
}

app.get('/config', (c) => {
  const userId = currentAuthUserId(c)
  return success(c, publicConfig(userConfig(userId)))
})

app.get('/skills', (c) => {
  const userId = currentAuthUserId(c)
  return success(c, {
    skills: listUserSkills(userId),
    plugins: listUserPlugins(userId),
    skills_path: userSkillsPath(userId),
    plugins_path: userPluginsPath(userId),
  })
})

app.delete('/skills', (c) => {
  const userId = currentAuthUserId(c)
  const skillId = String(c.req.query('skill_id') || c.req.query('id') || '').trim()
  if (!skillId) return badRequest(c, 'skill id is required')

  const root = realPath(userSkillsPath(userId))
  const skill = listUserSkills(userId).find(item => item.id === skillId)
  if (!skill) return badRequest(c, 'skill not found')
  if (skill.scope === 'system') return badRequest(c, '内置技能不能卸载')

  let target = ''
  try {
    target = realPath(skill.path)
  } catch {
    return badRequest(c, 'skill path not found')
  }
  if (!pathContains(root, target) || target === root) return badRequest(c, 'invalid skill path')

  fs.rmSync(target, { recursive: true, force: true })
  return success(c, {
    id: skill.id,
    deleted: true,
    skills: listUserSkills(userId),
  })
})

app.get('/approvals', (c) => {
  const userId = currentAuthUserId(c)
  return success(c, [...pendingApprovals.values()]
    .filter(approval => approval.userId === userId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(publicApproval))
})

app.post('/approvals/:id/respond', async (c) => {
  const userId = currentAuthUserId(c)
  const id = decodeURIComponent(c.req.param('id'))
  const body = await c.req.json().catch(() => ({}))
  const decision = String(body.decision || '').trim()
  const scope = String(body.scope || '').trim()
  if (!['accept', 'acceptForSession', 'decline'].includes(decision)) {
    return badRequest(c, 'invalid approval decision')
  }
  try {
    const approval = resolveApproval(userId, id, decision, scope)
    if (!approval) return badRequest(c, 'approval request not found')
    return success(c, { id, decision })
  } catch (err: any) {
    return badRequest(c, err.message || 'approval response failed')
  }
})

app.put('/config', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const baseUrl = normalizeBaseUrl(body.base_url ?? body.baseUrl)
  const inputApiKey = String(body.api_key ?? body.apiKey ?? '').trim()
  const model = normalizeConfigModel(body.model)
  const existing = userConfig(userId)
  const apiKey = inputApiKey || existing?.apiKey || ''

  const baseUrlError = validateBaseUrl(baseUrl)
  if (baseUrlError) return badRequest(c, baseUrlError)
  if (!apiKey) return badRequest(c, 'API Key 不能为空')
  if (!model) return badRequest(c, '模型不能为空')

  const store = configsStore()
  const current = store.configs.find(config => config.userId === userId)
  const next: CodexUserConfig = {
    userId,
    baseUrl,
    apiKey,
    model,
    updatedAt: now(),
  }
  if (current) Object.assign(current, next)
  else store.configs.push(next)
  writeConfigsStore(store)
  stopUserAppServer(userId)
  return success(c, publicConfig(next))
})

app.post('/config/test', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const baseUrl = normalizeBaseUrl(body.base_url ?? body.baseUrl)
  const inputApiKey = String(body.api_key ?? body.apiKey ?? '').trim()
  const model = normalizeConfigModel(body.model)
  const existing = userConfig(userId)
  const apiKey = inputApiKey || existing?.apiKey || ''
  const baseUrlError = validateBaseUrl(baseUrl)
  if (baseUrlError) return badRequest(c, baseUrlError)
  if (!apiKey) return badRequest(c, 'API Key 不能为空')
  if (!model) return badRequest(c, '模型不能为空')

  try {
    return success(c, await testCodexConnection({ baseUrl, apiKey, model }))
  } catch (err: any) {
    return badRequest(c, err?.message || '连接测试失败')
  }
})

app.delete('/config', (c) => {
  const userId = currentAuthUserId(c)
  const store = configsStore()
  store.configs = store.configs.filter(config => config.userId !== userId)
  writeConfigsStore(store)
  stopUserAppServer(userId)
  return success(c, publicConfig(null))
})

app.get('/projects', (c) => {
  const userId = currentAuthUserId(c)
  const projects = projectsStore().projects
    .filter(project => project.userId === userId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(publicProject)
  return success(c, projects)
})

app.get('/project-directories', (c) => {
  if (!isLocalProjectAccessAllowed(c)) {
    return badRequest(c, 'local project binding is only available when Huobao backend runs on this machine')
  }

  const userId = currentAuthUserId(c)
  const queryPath = String(c.req.query('path') || os.homedir()).trim()
  const roots = localDirectoryRoots()
  let currentPath = ''

  try {
    const resolved = realPath(queryPath || os.homedir())
    if (!roots.some(root => pathContains(root, resolved))) return badRequest(c, 'directory is outside the allowed local roots')
    if (!fs.statSync(resolved).isDirectory()) return badRequest(c, 'path must be a directory')
    currentPath = resolved
  } catch {
    return badRequest(c, 'directory not found')
  }

  const store = projectsStore()
  const appRoot = realPath(path.resolve(process.cwd(), '..'))
  const entries = fs.readdirSync(currentPath, { withFileTypes: true })
    .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
    .slice(0, 200)
    .map((entry) => {
      const entryPath = path.join(currentPath, entry.name)
      let fullPath = entryPath
      let selectable = false
      let reason = ''
      try {
        fullPath = realPath(entryPath)
        reason = localProjectPathError(userId, fullPath, store)
        selectable = !reason
      } catch {
        reason = 'directory not found'
      }
      return {
        name: entry.name,
        path: fullPath,
        selectable,
        reason,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  const parentPath = path.dirname(currentPath)
  return success(c, {
    path: currentPath,
    parent: parentPath !== currentPath && roots.some(root => pathContains(root, parentPath)) ? parentPath : '',
    roots,
    selectable: !localProjectPathError(userId, currentPath, store),
    reason: localProjectPathError(userId, currentPath, store),
    app_root: appRoot,
    entries,
  })
})

app.post('/project-directories/pick', async (c) => {
  if (!isLocalProjectAccessAllowed(c)) {
    return badRequest(c, 'local project binding is only available when Huobao backend runs on this machine')
  }
  if (process.platform !== 'darwin') {
    return badRequest(c, 'native folder picker is only available on macOS in this build')
  }

  const userId = currentAuthUserId(c)
  try {
    const pickedPath = await pickMacDirectory()
    if (!pickedPath) return badRequest(c, 'folder selection cancelled')
    const projectPath = realPath(pickedPath)
    const error = localProjectPathError(userId, projectPath)
    if (error) return badRequest(c, error)
    return success(c, {
      path: projectPath,
      name: path.basename(projectPath) || '本地项目',
    })
  } catch (err: any) {
    const message = String(err?.message || '')
    if (message.includes('User canceled') || message.includes('-128')) {
      return badRequest(c, 'folder selection cancelled')
    }
    return serverError(c, err)
  }
})

app.post('/projects', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const source = body.source === 'local' ? 'local' : body.source === 'github' ? 'github' : 'managed'
  const requestedPath = String(body.path || body.local_path || '').trim()
  const repoUrl = source === 'github' ? normalizeGitHubRepoUrl(body.repo_url || body.repoUrl || body.url) : ''
  const nameFallback = source === 'github' && repoUrl ? projectNameFromRepoUrl(repoUrl) : '新项目'
  const name = String(body.name || nameFallback).trim().slice(0, 80) || nameFallback
  const baseSlug = safeSegment(String(body.slug || name), 'project')
  const userSlug = safeSegment(userId, 'user')
  const store = projectsStore()
  let slug = baseSlug
  let i = 2
  while (store.projects.some(project => project.userId === userId && project.slug === slug)) {
    slug = `${baseSlug}-${i++}`
  }

  let projectPath = ''
  if (source === 'local') {
    if (!isLocalProjectAccessAllowed(c)) {
      return badRequest(c, 'local project binding is only available when Huobao backend runs on this machine')
    }
    const localError = localProjectPathError(userId, requestedPath, store)
    if (localError) return badRequest(c, localError)
    projectPath = realPath(requestedPath)
  } else if (source === 'github') {
    if (!repoUrl) return badRequest(c, '请输入有效的 GitHub 仓库地址')
    projectPath = path.join(WORKSPACE_ROOT, userSlug, slug)
    if (fs.existsSync(projectPath) && fs.readdirSync(projectPath).length) {
      return badRequest(c, '目标项目目录已存在')
    }
    fs.mkdirSync(path.dirname(projectPath), { recursive: true })
    try {
      await execGit(path.dirname(projectPath), ['clone', repoUrl, projectPath], 180_000)
    } catch (err: any) {
      if (fs.existsSync(projectPath) && !fs.readdirSync(projectPath).length) {
        fs.rmSync(projectPath, { recursive: true, force: true })
      }
      return badRequest(c, err.message || 'GitHub 仓库拉取失败')
    }
  } else {
    projectPath = path.join(WORKSPACE_ROOT, userSlug, slug)
    fs.mkdirSync(projectPath, { recursive: true })
  }

  const ts = now()
  const project: CodexProject = {
    id: `codex_project_${randomUUID()}`,
    userId,
    name,
    slug,
    path: projectPath,
    source,
    repoUrl,
    createdAt: ts,
    updatedAt: ts,
  }
  store.projects.push(project)
  writeProjectsStore(store)
  return success(c, publicProject(project))
})

app.delete('/projects/:id', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const store = projectsStore()
  const project = store.projects.find(item => item.userId === userId && item.id === id)
  if (!project) return badRequest(c, 'codex project not found')

  const taskStore = tasksStore()
  const deletedTasks = taskStore.tasks.filter(task => task.userId === userId && task.projectId === id)
  deletedTasks.forEach((task) => {
    stopTaskRuntime(task.id)
    deleteTaskLog(task.id)
  })
  for (const [sessionId, session] of terminalSessions) {
    if (session.userId === userId && session.projectId === id) {
      if (!session.closedAt) session.terminal.kill('SIGTERM')
      terminalSessions.delete(sessionId)
    }
  }
  taskStore.tasks = taskStore.tasks.filter(task => !(task.userId === userId && task.projectId === id))
  writeTasksStore(taskStore)
  store.projects = store.projects.filter(item => !(item.userId === userId && item.id === id))
  writeProjectsStore(store)

  return success(c, { id, deleted_tasks: deletedTasks.length })
})

app.get('/projects/:id/git', async (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  try {
    return success(c, await projectGitStatus(project))
  } catch (err: any) {
    return serverError(c, err.message || 'failed to read git status')
  }
})

app.post('/projects/:id/git/commit', async (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  const body = await c.req.json().catch(() => ({}))
  const message = String(body.message || '').trim()
  if (!message) return badRequest(c, '提交说明不能为空')

  const status = await projectGitStatus(project)
  if (!status.is_repo) return badRequest(c, status.message || '当前项目不是 Git 仓库')
  if (!status.changed_files) return badRequest(c, '没有可提交的变更')

  try {
    await execGit(project.path, ['add', '-A'], 30_000)
    const commit = await execGit(project.path, ['commit', '-m', message], 60_000)
    return success(c, {
      output: `${commit.stdout}${commit.stderr}`.trim(),
      git: await projectGitStatus(project),
    })
  } catch (err: any) {
    return badRequest(c, err.message || '提交失败')
  }
})

app.post('/projects/:id/git/push', async (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  const status = await projectGitStatus(project)
  if (!status.is_repo) return badRequest(c, status.message || '当前项目不是 Git 仓库')
  if (!status.remote) return badRequest(c, '当前仓库没有配置 origin remote')

  try {
    const push = await execGit(project.path, ['push'], 120_000)
    return success(c, {
      output: `${push.stdout}${push.stderr}`.trim(),
      git: await projectGitStatus(project),
    })
  } catch (err: any) {
    return badRequest(c, err.message || '推送失败')
  }
})

app.get('/projects/:id/files', (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  const requestedPath = String(c.req.query('path') || '').trim()
  const targetPath = resolveProjectFilePath(project, requestedPath)
  if (!targetPath) return badRequest(c, 'file path is outside project')
  if (!fs.existsSync(targetPath)) return badRequest(c, 'file not found')

  const stat = fs.statSync(targetPath)
  if (stat.isDirectory()) return badRequest(c, 'path is a directory')

  const maxBytes = 1024 * 1024
  const readBytes = Math.min(stat.size, maxBytes)
  const fd = fs.openSync(targetPath, 'r')
  try {
    const buffer = Buffer.alloc(readBytes)
    fs.readSync(fd, buffer, 0, readBytes, 0)
    const binary = buffer.includes(0)
    if (binary) {
      return success(c, {
        path: path.relative(project.path, targetPath),
        absolute_path: targetPath,
        content: '',
        size: stat.size,
        truncated: stat.size > maxBytes,
        binary: true,
        language: detectLanguage(targetPath),
      })
    }
    return success(c, {
      path: path.relative(project.path, targetPath),
      absolute_path: targetPath,
      content: buffer.toString('utf8'),
      size: stat.size,
      truncated: stat.size > maxBytes,
      binary: false,
      language: detectLanguage(targetPath),
    })
  } finally {
    fs.closeSync(fd)
  }
})

app.post('/projects/:id/open-file', async (c) => {
  if (!isLocalProjectAccessAllowed(c)) {
    return badRequest(c, 'opening local files is only available when Huobao backend runs on this machine')
  }
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  const body = await c.req.json().catch(() => ({}))
  const requestedPath = String(body.path || '').trim()
  const targetPath = resolveProjectFilePath(project, requestedPath)
  if (!targetPath) return badRequest(c, 'file path is outside project')
  if (!fs.existsSync(targetPath)) return badRequest(c, 'file not found')

  const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', targetPath] : [targetPath]
  await new Promise<void>((resolve, reject) => {
    execFile(opener, args, { timeout: 10_000 }, (err, _stdout, stderr) => {
      if (err) {
        reject(new Error(stderr || err.message))
        return
      }
      resolve()
    })
  })
  return success(c, {
    path: path.relative(project.path, targetPath),
    absolute_path: targetPath,
  })
})

app.post('/projects/:id/attachments', async (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  const body = await c.req.parseBody()
  const uploaded = body.file
  if (!uploaded || !(uploaded instanceof File)) return badRequest(c, 'file is required')
  if (!String(uploaded.type || '').startsWith('image/')) return badRequest(c, 'only image attachments are supported')

  const attachmentDir = path.join(project.path, '.codex-attachments')
  fs.mkdirSync(attachmentDir, { recursive: true })
  const ext = path.extname(uploaded.name || '') || '.png'
  const filename = `${randomUUID()}${ext}`
  const filePath = path.join(attachmentDir, filename)
  fs.writeFileSync(filePath, Buffer.from(await uploaded.arrayBuffer()))

  return success(c, {
    name: uploaded.name,
    type: uploaded.type,
    size: uploaded.size,
    path: filePath,
    relative_path: path.relative(project.path, filePath),
  })
})

app.get('/projects/:id/terminals', (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')

  return success(c, Array.from(terminalSessions.values())
    .filter(session => session.userId === userId && session.projectId === project.id)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .map(publicTerminalSession))
})

app.post('/projects/:id/terminals', (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.param('id')
  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')
  if (!fs.existsSync(project.path)) return badRequest(c, 'project path not found')

  const session = createTerminalSession(userId, project)
  return success(c, publicTerminalSession(session))
})

app.get('/terminals/:terminalId', (c) => {
  const userId = currentAuthUserId(c)
  const session = findTerminalSession(userId, c.req.param('terminalId'))
  if (!session) return badRequest(c, 'terminal session not found')
  const afterSeq = Number(c.req.query('after_seq') || c.req.query('afterSeq') || 0)
  return success(c, publicTerminalSession(session, Number.isFinite(afterSeq) ? afterSeq : 0))
})

app.post('/terminals/:terminalId/input', async (c) => {
  const userId = currentAuthUserId(c)
  const session = findTerminalSession(userId, c.req.param('terminalId'))
  if (!session) return badRequest(c, 'terminal session not found')
  if (session.closedAt) {
    return badRequest(c, 'terminal session is closed')
  }

  const body = await c.req.json().catch(() => ({}))
  const input = String(body.input ?? body.text ?? '')
  if (!input) return success(c, publicTerminalSession(session))
  session.terminal.write(input)
  session.updatedAt = now()
  return success(c, publicTerminalSession(session))
})

app.post('/terminals/:terminalId/interrupt', (c) => {
  const userId = currentAuthUserId(c)
  const session = findTerminalSession(userId, c.req.param('terminalId'))
  if (!session) return badRequest(c, 'terminal session not found')
  if (!session.closedAt) {
    session.terminal.write('\x03')
  }
  return success(c, publicTerminalSession(session))
})

app.post('/terminals/:terminalId/resize', async (c) => {
  const userId = currentAuthUserId(c)
  const session = findTerminalSession(userId, c.req.param('terminalId'))
  if (!session) return badRequest(c, 'terminal session not found')
  if (session.closedAt) return success(c, publicTerminalSession(session))
  const body = await c.req.json().catch(() => ({}))
  const cols = Math.max(20, Math.min(300, Number(body.cols || 100)))
  const rows = Math.max(6, Math.min(120, Number(body.rows || 24)))
  session.terminal.resize(cols, rows)
  session.updatedAt = now()
  return success(c, publicTerminalSession(session))
})

app.delete('/terminals/:terminalId', (c) => {
  const userId = currentAuthUserId(c)
  const sessionId = c.req.param('terminalId')
  const session = findTerminalSession(userId, sessionId)
  if (!session) return badRequest(c, 'terminal session not found')
  if (!session.closedAt) {
    session.terminal.kill('SIGTERM')
  }
  terminalSessions.delete(sessionId)
  return success(c, { id: sessionId })
})

app.get('/tasks', (c) => {
  const userId = currentAuthUserId(c)
  const projectId = c.req.query('project_id')
  let tasks = tasksStore().tasks.filter(task => task.userId === userId)
  if (projectId) tasks = tasks.filter(task => task.projectId === projectId)
  tasks = tasks.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return success(c, tasks.map(publicTask))
})

app.get('/tasks/:id', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const task = findTask(userId, id)
  if (!task) return badRequest(c, 'codex task not found')
  return success(c, publicTask(task))
})

app.delete('/tasks/:id', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const store = tasksStore()
  const task = store.tasks.find(item => item.userId === userId && item.id === id)
  if (!task) return badRequest(c, 'codex task not found')
  stopTaskRuntime(id)
  deleteTaskLog(id)
  store.tasks = store.tasks.filter(item => !(item.userId === userId && item.id === id))
  writeTasksStore(store)
  return success(c, { id })
})

app.get('/tasks/:id/logs', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const task = findTask(userId, id)
  if (!task) return badRequest(c, 'codex task not found')
  const logPath = path.join(LOG_ROOT, `${id}.jsonl`)
  if (!fs.existsSync(logPath)) return success(c, [])
  const events = fs.readFileSync(logPath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line)
      } catch {
        return null
      }
    })
    .filter(Boolean)
  return success(c, events)
})

app.get('/threads/native', async (c) => {
  const userId = currentAuthUserId(c)
  const allowed = userThreadIds(userId)
  if (!allowed.size) return success(c, { local: [], native: [] })
  try {
    const native = filterNativeThreads(await appServerRpc(userId, 'thread/list', {}), allowed)
    const local = tasksStore().tasks
      .filter(task => task.userId === userId && task.threadId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(publicThreadTask)
    return success(c, { local, native })
  } catch (err: any) {
    return serverError(c, err.message || 'Codex thread/list failed')
  }
})

app.get('/threads/:threadId/native', async (c) => {
  const userId = currentAuthUserId(c)
  const threadId = c.req.param('threadId')
  if (!userThreadIds(userId).has(threadId)) return badRequest(c, 'codex thread not found')
  try {
    const thread = await appServerRpc(userId, 'thread/read', { threadId })
    return success(c, thread)
  } catch (err: any) {
    return serverError(c, err.message || 'Codex thread/read failed')
  }
})

app.get('/threads/:threadId/turns/native', async (c) => {
  const userId = currentAuthUserId(c)
  const threadId = c.req.param('threadId')
  if (!userThreadIds(userId).has(threadId)) return badRequest(c, 'codex thread not found')
  try {
    const turns = await appServerRpc(userId, 'thread/turns/list', { threadId })
    return success(c, turns)
  } catch (err: any) {
    return serverError(c, err.message || 'Codex thread/turns/list failed')
  }
})

app.post('/tasks', async (c) => {
  const userId = currentAuthUserId(c)
  const body = await c.req.json().catch(() => ({}))
  const projectId = String(body.project_id || '')
  const prompt = String(body.prompt || '').trim()
  const config = userConfig(userId)
  const model = String(body.model || config?.model || '').trim()
  const reasoningEffort = normalizeReasoningEffort(body.reasoning_effort ?? body.reasoningEffort)
  const sandbox = normalizeSandbox(body.sandbox)
  const resumeTaskId = String(body.resume_task_id || '').trim()
  if (!prompt) return badRequest(c, 'prompt required')

  const project = findProject(userId, projectId)
  if (!project) return badRequest(c, 'codex project not found')
  if (!fs.existsSync(CODEX_BIN)) return badRequest(c, 'project Codex CLI is not installed')
  const images = normalizeImagePaths(project, body.images)
  const selectedContext = resolveSelectedContext(userId, body.selected_context ?? body.selectedContext)
  const resumeTask = resumeTaskId
    ? tasksStore().tasks.find(item => item.userId === userId && item.projectId === project.id && item.id === resumeTaskId)
    : null
  if (resumeTaskId && !resumeTask) return badRequest(c, 'codex thread not found')
  if (resumeTask && !resumeTask.threadId) return badRequest(c, 'codex thread has no session id yet')

  const ts = now()
  const task: CodexTask = {
    id: `codex_task_${randomUUID()}`,
    userId,
    projectId: project.id,
    projectName: project.name,
    projectPath: project.path,
    prompt,
    model,
    reasoningEffort,
    sandbox,
    images,
    selectedContext,
    threadId: resumeTask?.threadId,
    status: 'running',
    runtime: 'app-server',
    outputTail: [],
    createdAt: ts,
    updatedAt: ts,
  }

  const store = tasksStore()
  store.tasks.push(task)
  writeTasksStore(store)
  appendUserMessage(task.id, prompt)

  runCodexAppTurn(task, { resumeThreadId: resumeTask?.threadId }).catch((err) => {
    appendTaskEvent(task.id, { ts: now(), stream: 'stderr', type: 'app.error', text: err.message || 'Codex app-server 启动失败' })
    updateTask(task.id, { status: 'failed', exitCode: 1 })
  })

  return success(c, publicTask(updateTask(task.id, { status: 'running', runtime: 'app-server' }) || task))
})

app.post('/tasks/:id/messages', async (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}))
  const prompt = String(body.prompt || '').trim()
  const model = String(body.model || '').trim()
  if (!prompt) return badRequest(c, 'prompt required')

  const task = findTask(userId, id)
  if (!task) return badRequest(c, 'codex task not found')
  const config = userConfig(userId)
  const reasoningEffort = normalizeReasoningEffort(body.reasoning_effort ?? body.reasoningEffort) || task.reasoningEffort || ''
  const project = findProject(userId, task.projectId)
  if (!project) return badRequest(c, 'codex project not found')
  const images = normalizeImagePaths(project, body.images)
  const selectedContext = resolveSelectedContext(userId, body.selected_context ?? body.selectedContext)
  if (task.status === 'running') return badRequest(c, 'codex thread is already running')
  if (!task.threadId) {
    const ts = now()
    const newTask: CodexTask = {
      id: `codex_task_${randomUUID()}`,
      userId,
      projectId: project.id,
      projectName: project.name,
      projectPath: project.path,
      prompt,
      model: model || task.model || config?.model || '',
      reasoningEffort,
      sandbox: normalizeSandbox(body.sandbox || task.sandbox),
      images,
      selectedContext,
      status: 'running',
      runtime: 'app-server',
      outputTail: [],
      createdAt: ts,
      updatedAt: ts,
    }
    const store = tasksStore()
    store.tasks.push(newTask)
    writeTasksStore(store)
    appendUserMessage(newTask.id, prompt)
    runCodexAppTurn(newTask, {}).catch((err) => {
      appendTaskEvent(newTask.id, { ts: now(), stream: 'stderr', type: 'app.error', text: err.message || 'Codex app-server 启动失败' })
      updateTask(newTask.id, { status: 'failed', exitCode: 1 })
    })
    return success(c, publicTask(newTask))
  }

  updateTask(task.id, {
    prompt,
    model: model || task.model || config?.model || '',
    reasoningEffort,
    sandbox: normalizeSandbox(body.sandbox || task.sandbox),
    images,
    selectedContext,
    status: 'running',
    exitCode: null,
    signal: null,
  })
  appendUserMessage(task.id, prompt)

  const updated = tasksStore().tasks.find(item => item.id === id) || task
  runCodexAppTurn(updated, { resumeThreadId: task.threadId }).catch((err) => {
    appendTaskEvent(task.id, { ts: now(), stream: 'stderr', type: 'app.error', text: err.message || 'Codex app-server 续聊失败' })
    updateTask(task.id, { status: 'failed', exitCode: 1 })
  })
  return success(c, publicTask(updateTask(id, { status: 'running', runtime: 'app-server' }) || updated))
})

app.post('/tasks/:id/cancel', (c) => {
  const userId = currentAuthUserId(c)
  const id = c.req.param('id')
  const task = findTask(userId, id)
  if (!task) return badRequest(c, 'codex task not found')
  updateTask(id, { status: 'cancelled' })
  stopTaskRuntime(id)
  appendTaskEvent(id, { ts: now(), stream: 'system', text: '正在取消任务...' })
  return success(c, publicTask(updateTask(id, { status: 'cancelled' }) || task))
})

app.get('/status', (c) => {
  return success(c, {
    installed: fs.existsSync(CODEX_BIN),
    bin: CODEX_BIN,
    running: running.size,
    workspace_root: WORKSPACE_ROOT,
  })
})

export default app
