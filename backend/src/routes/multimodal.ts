import { Hono } from 'hono'
import { analyzeMultimodal, streamMultimodal } from '../services/multimodal.js'
import { badRequest, success } from '../utils/response.js'
import { currentAuthUserId } from '../utils/auth.js'

const app = new Hono()

app.post('/analyze', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const prompt = String(body.prompt || body.text || '').trim()
  if (!prompt && !Array.isArray(body.messages)) return badRequest(c, 'prompt or messages is required')

  try {
    const params = {
      model: body.model,
      prompt,
      assets: Array.isArray(body.assets) ? body.assets : [],
      messages: Array.isArray(body.messages) ? body.messages : undefined,
      tools: Array.isArray(body.tools) ? body.tools : undefined,
      toolChoice: body.tool_choice ?? body.toolChoice,
      systemPrompt: body.system_prompt ?? body.systemPrompt,
      cachedContext: body.cached_context ?? body.cachedContext,
      cacheControl: body.cache_control ?? body.cacheControl,
      reasoningEffort: body.reasoning_effort ?? body.reasoningEffort,
      reasoning: body.reasoning,
      maxCompletionTokens: body.max_completion_tokens ?? body.maxCompletionTokens,
      thinking: body.thinking,
      thinkingConfig: body.thinking_config ?? body.thinkingConfig,
      webSearch: Boolean(body.web_search ?? body.webSearch),
      webSearchOptions: body.web_search_options ?? body.webSearchOptions,
      userLocation: body.user_location ?? body.userLocation,
      searchContextSize: body.search_context_size ?? body.searchContextSize,
      context1m: Boolean(body.context_1m ?? body.context1m),
      headers: body.headers,
      betas: Array.isArray(body.betas) ? body.betas : undefined,
      configId: body.model_config_id ?? body.modelConfigId ?? body.config_id ?? body.configId ?? null,
      userProviderId: body.user_provider_id ?? body.userProviderId ?? null,
      userId: currentAuthUserId(c),
      maxTokens: body.max_tokens ?? body.maxTokens,
      temperature: body.temperature,
      stream: Boolean(body.stream),
    }
    if (params.stream) {
      const upstream = await streamMultimodal(params)
      return new Response(upstream.body, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    }
    const result = await analyzeMultimodal({
      ...params,
      stream: false,
    })
    return success(c, result)
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

app.post('/tool-result', async (c) => {
  const body = await c.req.json().catch(() => ({}))
  const messages = Array.isArray(body.messages) ? [...body.messages] : []
  const toolResults = Array.isArray(body.tool_results || body.toolResults)
    ? (body.tool_results || body.toolResults)
    : []
  if (!messages.length) return badRequest(c, 'messages is required')
  if (!toolResults.length) return badRequest(c, 'tool_results is required')

  for (const item of toolResults) {
    messages.push({
      role: 'tool',
      tool_call_id: item.tool_call_id ?? item.toolCallId ?? item.id,
      name: item.name,
      content: typeof item.content === 'string'
        ? item.content
        : JSON.stringify(item.content ?? item.result ?? {}),
    })
  }

  try {
    const result = await analyzeMultimodal({
      model: body.model,
      prompt: '',
      messages,
      tools: Array.isArray(body.tools) ? body.tools : undefined,
      toolChoice: body.tool_choice ?? body.toolChoice,
      context1m: Boolean(body.context_1m ?? body.context1m),
      headers: body.headers,
      betas: Array.isArray(body.betas) ? body.betas : undefined,
      configId: body.model_config_id ?? body.modelConfigId ?? body.config_id ?? body.configId ?? null,
      userProviderId: body.user_provider_id ?? body.userProviderId ?? null,
      userId: currentAuthUserId(c),
      maxTokens: body.max_tokens ?? body.maxTokens,
      temperature: body.temperature,
      stream: false,
    })
    return success(c, result)
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

export default app
