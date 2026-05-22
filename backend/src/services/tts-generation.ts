/**
 * TTS 语音合成服务
 * 支持 MiniMax TTS (hex 音频响应) 和 OpenAI 兼容 /audio/speech
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { getConfigForModelAsync } from './ai.js'
import { getTTSAdapter } from './adapters/registry.js'
import { chargeCreditsAsync } from './credits.js'
import { logTaskError, logTaskPayload, logTaskProgress, logTaskStart, logTaskSuccess, redactUrl } from '../utils/task-logger.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const STORAGE_ROOT = process.env.STORAGE_PATH || path.resolve(__dirname, '../../../data/static')

interface TTSParams {
  text: string
  voice: string
  model?: string
  speed?: number
  emotion?: string
  configId?: number | null
  modelConfigId?: number | null
  userId?: string
  relatedTaskId?: string | number | null
  taskType?: string
}

/**
 * 生成 TTS 音频，返回本地文件路径
 */
export async function generateTTS(params: TTSParams): Promise<string> {
  const config = await getConfigForModelAsync('audio', params.model, params.modelConfigId ?? params.configId ?? null, params.userId)
  if (!config) throw new Error('No active audio AI config — 请在后台模型配置中设置音频默认模型')
  const adapter = getTTSAdapter(config.provider)
  await chargeCreditsAsync({
    userId: params.userId,
    serviceType: 'audio',
    model: params.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    quantity: 1,
    taskType: params.taskType || 'audio',
    relatedTaskId: params.relatedTaskId || null,
    description: '音频生成消费',
    validateOnly: true,
    metadata: {
      voice: params.voice,
      textLength: params.text.length,
    },
  })

  logTaskStart('AudioTask', 'tts-generate', {
    provider: config.provider,
    voice: params.voice,
    model: params.model || config.model,
    textPreview: params.text.slice(0, 50),
    textLength: params.text.length,
  })
  logTaskPayload('AudioTask', 'tts params', {
    config: {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
    },
    params,
  })

  const { url, method, headers, body } = adapter.buildGenerateRequest(config, params)
  logTaskProgress('AudioTask', 'request', {
    provider: config.provider,
    voice: params.voice,
    method,
    url: redactUrl(url),
    model: params.model || config.model,
  })
  logTaskPayload('AudioTask', 'request payload', {
    method,
    url,
    headers,
    body,
  })

  const resp = await fetch(url, {
    method,
    headers,
    body: JSON.stringify(body),
  })

  if (!resp.ok) {
    const errText = await resp.text()
    logTaskError('AudioTask', 'tts-generate', { provider: config.provider, voice: params.voice, status: resp.status, error: errText })
    throw new Error(`TTS API error ${resp.status}: ${errText}`)
  }

  const result = await resp.json()
  const parsed = adapter.parseResponse(result)

  // 将 hex 解码为二进制
  const buffer = Buffer.from(parsed.audioHex, 'hex')

  // 保存到本地
  const audioDir = path.join(STORAGE_ROOT, 'audio')
  fs.mkdirSync(audioDir, { recursive: true })
  const filename = `${uuid()}.${parsed.format || 'mp3'}`
  const filePath = path.join(audioDir, filename)
  fs.writeFileSync(filePath, buffer)

  const relativePath = `static/audio/${filename}`
  await chargeCreditsAsync({
    userId: params.userId,
    serviceType: 'audio',
    model: params.model || config.model,
    modelConfigId: config.modelConfigId,
    billable: config.billable,
    resourceMode: config.resourceMode,
    quantity: 1,
    taskType: params.taskType || 'audio',
    relatedTaskId: params.relatedTaskId || relativePath,
    description: '音频生成消费（已确认）',
    metadata: {
      voice: params.voice,
      textLength: params.text.length,
      audioMs: parsed.audioLength,
    },
  })
  logTaskSuccess('AudioTask', 'tts-saved', {
    provider: config.provider,
    voice: params.voice,
    path: relativePath,
    bytes: buffer.length,
    audioMs: parsed.audioLength,
  })
  return relativePath
}

/**
 * 为角色生成试听音频
 */
export async function generateVoiceSample(characterName: string, voiceId: string, configId?: number | null, userId?: string, relatedTaskId?: string | number | null): Promise<string> {
  const sampleText = `你好，我是${characterName}。很高兴认识你，这是我的声音试听。`
  return generateTTS({ text: sampleText, voice: voiceId, configId, userId, relatedTaskId, taskType: 'voice_sample' })
}
