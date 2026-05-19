export type AgentTaskStatus = 'running' | 'completed' | 'failed'

export interface AgentTaskProgress {
  taskId: string
  agentType: string
  status: AgentTaskStatus
  dramaId?: number
  episodeId?: number
  step: string
  message: string
  progress: number
  details?: Record<string, any>
  error?: string
  createdAt: string
  updatedAt: string
}

const tasks = new Map<string, AgentTaskProgress>()

function clampProgress(progress: number) {
  return Math.max(0, Math.min(100, Math.round(progress)))
}

export function createAgentTask(taskId: string, agentType: string, message: string, progress = 3, context?: { dramaId?: number; episodeId?: number }) {
  const timestamp = new Date().toISOString()
  const task: AgentTaskProgress = {
    taskId,
    agentType,
    dramaId: context?.dramaId,
    episodeId: context?.episodeId,
    status: 'running',
    step: 'started',
    message,
    progress: clampProgress(progress),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  tasks.set(taskId, task)
  return task
}

export function updateAgentTask(
  taskId: string | undefined,
  patch: Partial<Omit<AgentTaskProgress, 'taskId' | 'agentType' | 'createdAt'>>,
) {
  if (!taskId) return null
  const current = tasks.get(taskId)
  if (!current) return null
  const next: AgentTaskProgress = {
    ...current,
    ...patch,
    progress: patch.progress == null ? current.progress : clampProgress(patch.progress),
    updatedAt: new Date().toISOString(),
  }
  tasks.set(taskId, next)
  return next
}

export function getAgentTask(taskId: string) {
  return tasks.get(taskId) || null
}

export function listAgentTasks() {
  return Array.from(tasks.values())
}

export function finishAgentTask(taskId: string | undefined, message = '完成') {
  return updateAgentTask(taskId, {
    status: 'completed',
    step: 'completed',
    message,
    progress: 100,
  })
}

export function failAgentTask(taskId: string | undefined, error: string) {
  return updateAgentTask(taskId, {
    status: 'failed',
    step: 'failed',
    message: '执行失败',
    progress: 100,
    error,
  })
}
