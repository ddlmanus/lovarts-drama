import { toast } from 'vue-sonner'
import { agentAPI, api } from './useApi'

export function useAgent() {
  const running = ref(false)
  const runningType = ref<string | null>(null)
  const taskId = ref<string | null>(null)
  const taskProgress = ref(0)
  const taskMessage = ref('')
  const taskStep = ref('')
  const taskDetails = ref<Record<string, any> | null>(null)
  let pollTimer: ReturnType<typeof window.setInterval> | null = null

  function makeTaskId(type: string) {
    const randomPart = Math.random().toString(36).slice(2, 10)
    return `${type}-${Date.now()}-${randomPart}`
  }

  function clearPollTimer() {
    if (pollTimer) {
      window.clearInterval(pollTimer)
      pollTimer = null
    }
  }

  function applyTask(task: any) {
    if (!task) return
    taskProgress.value = Number(task.progress || 0)
    taskMessage.value = task.message || ''
    taskStep.value = task.step || ''
    taskDetails.value = task.details || null
  }

  function startPolling(nextTaskId: string) {
    clearPollTimer()
    pollTimer = window.setInterval(async () => {
      try {
        const task = await agentAPI.task(nextTaskId)
        applyTask(task)
        if (task?.status === 'completed' || task?.status === 'failed') clearPollTimer()
      } catch {}
    }, 900)
  }

  async function run(type: string, msg: string, dramaId: number, episodeId: number, onDone?: () => void, options?: { model?: string }) {
    if (running.value) { toast.warning('操作执行中'); return }
    const nextTaskId = makeTaskId(type)
    running.value = true
    runningType.value = type
    taskId.value = nextTaskId
    taskProgress.value = 3
    taskMessage.value = type === 'storyboard_breaker' ? '正在启动分镜拆解...' : '正在启动任务...'
    taskStep.value = 'started'
    taskDetails.value = null
    startPolling(nextTaskId)
    try {
      const data = await api.post<any>(`/agent/${type}/chat`, {
        message: msg,
        drama_id: dramaId,
        episode_id: episodeId,
        model: options?.model,
        task_id: nextTaskId,
      })
      if (data?.taskId) {
        try {
          const task = await agentAPI.task(data.taskId)
          applyTask(task)
        } catch {}
      }
      toast.success('完成')
      onDone?.()
      return data
    } catch (err: any) {
      toast.error(err.message)
      throw err
    } finally {
      clearPollTimer()
      running.value = false
      runningType.value = null
    }
  }

  return { running, runningType, taskId, taskProgress, taskMessage, taskStep, taskDetails, run }
}
