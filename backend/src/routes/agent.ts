/**
 * Agent 聊天路由 — 非流式版本
 */
import { Hono } from 'hono'
import { randomUUID } from 'node:crypto'
import { createAgent, validAgentTypes } from '../agents/index.js'
import { createAgentTask, failAgentTask, finishAgentTask, getAgentTask, updateAgentTask } from '../agents/task-progress.js'
import { success, badRequest } from '../utils/response.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess } from '../utils/task-logger.js'

const app = new Hono()

const AGENT_START_MESSAGES: Record<string, string> = {
  extractor: '正在读取剧本，准备提取角色和场景...',
  storyboard_breaker: '正在启动分镜拆解...',
  script_rewriter: '正在改写剧本...',
  voice_assigner: '正在分配角色音色...',
  grid_prompt_generator: '正在生成宫格提示词...',
}

function normalizeToolName(entry: any) {
  return entry?.toolName
    || entry?.tool?.toolName
    || entry?.tool?.id
    || entry?.name
    || entry?.type
    || null
}

function normalizeToolResult(entry: any) {
  const result = entry?.result ?? entry?.output ?? entry?.data ?? null
  return typeof result === 'string' ? result : JSON.stringify(result)
}

// POST /agent/:type/chat — 非流式 Agent 对话
app.post('/:type/chat', async (c) => {
  const agentType = c.req.param('type')
  if (!validAgentTypes.includes(agentType)) {
    return badRequest(c, `Invalid agent type: ${agentType}`)
  }

  const body = await c.req.json()
  const { message, drama_id, episode_id, model, task_id } = body
  const taskId = typeof task_id === 'string' && task_id.trim() ? task_id.trim() : randomUUID()

  logTaskStart('Agent', agentType, {
    dramaId: drama_id,
    episodeId: episode_id,
    message,
  })
  logTaskPayload('Agent', `${agentType} input`, body)

  if (!episode_id || !drama_id) {
    logTaskError('Agent', agentType, { reason: 'missing drama_id or episode_id' })
    return badRequest(c, 'drama_id and episode_id are required')
  }

  createAgentTask(taskId, agentType, AGENT_START_MESSAGES[agentType] || '正在执行任务...', 3, {
    dramaId: Number(drama_id),
    episodeId: Number(episode_id),
  })
  updateAgentTask(taskId, { step: 'model_request', message: '正在请求文本模型...', progress: 8 })

  const agent = await createAgent(agentType, episode_id, drama_id, model, taskId)
  if (!agent) {
    failAgentTask(taskId, 'Agent not found')
    logTaskError('Agent', agentType, { reason: 'agent not found' })
    return badRequest(c, 'Agent not found')
  }

  const startTime = performance.now()

  try {
    const result = await agent.generate(
      [{ role: 'user', content: message }],
      {
        maxSteps: 20,
        onStepFinish: (step: any) => {
          const toolNames = (step?.toolCalls || []).map((tc: any) => normalizeToolName(tc)).filter(Boolean)
          if (!toolNames.length) return
          updateAgentTask(taskId, {
            step: 'tool_calls',
            message: `后端正在执行：${toolNames.join('、')}`,
            progress: 35,
            details: { toolCalls: toolNames },
          })
        },
      } as any,
    )

    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
    logTaskSuccess('Agent', agentType, { elapsedSeconds: elapsed })

    // 收集所有 tool calls 和 results
    const toolCalls = result.toolCalls || []
    const toolResults = result.toolResults || []
    const normalizedToolCalls = toolCalls.map((tc: any) => ({
      toolName: normalizeToolName(tc),
      args: tc?.args ?? tc?.input ?? null,
    }))
    const normalizedToolResults = toolResults.map((tr: any) => ({
      toolName: normalizeToolName(tr),
      result: normalizeToolResult(tr),
    }))

    logTaskProgress('Agent', 'tool-summary', {
      agentType,
      toolCalls: normalizedToolCalls.map((tc: any) => tc.toolName),
      toolResults: normalizedToolResults.map((tr: any) => tr.toolName),
    })
    logTaskPayload('Agent', `${agentType} tool-results`, normalizedToolResults)
    finishAgentTask(taskId, agentType === 'storyboard_breaker' ? '分镜脚本已生成' : '任务完成')

    return success(c, {
      type: 'done',
      taskId,
      text: result.text || '',
      toolCalls: normalizedToolCalls,
      toolResults: normalizedToolResults,
    })
  } catch (err: any) {
    const elapsed = ((performance.now() - startTime) / 1000).toFixed(1)
    failAgentTask(taskId, err.message || 'Agent execution failed')
    logTaskError('Agent', agentType, { elapsedSeconds: elapsed, error: err.message })
    console.error(err.stack || err)
    return badRequest(c, err.message || 'Agent execution failed')
  }
})

// GET /agent/tasks/:taskId — 查询 Agent 后端执行进度
app.get('/tasks/:taskId', async (c) => {
  const taskId = c.req.param('taskId')
  const task = getAgentTask(taskId)
  if (!task) return badRequest(c, 'Task not found')
  return success(c, task)
})

// GET /agent/:type/debug
app.get('/:type/debug', async (c) => {
  const agentType = c.req.param('type')
  if (!validAgentTypes.includes(agentType)) return badRequest(c, 'Invalid agent type')
  return success(c, { agent_type: agentType, valid: true })
})

export default app
