/**
 * Provider Adapter 注册表
 * 根据 provider 名称返回对应的 Adapter 实例
 */
import { MiniMaxImageAdapter } from './minimax-image'
import { MiniMaxVideoAdapter } from './minimax-video'
import { MiniMaxTTSAdapter } from './minimax-tts'
import { OpenAIImageAdapter } from './openai-image'
import { ZenMuxImageAdapter } from './zenmux-image'
import { GeminiImageAdapter } from './gemini-image'
import { ApimartImageAdapter } from './apimart-image'
import { ApimartVideoAdapter } from './apimart-video'
import { VolcEngineImageAdapter } from './volcengine-image'
import { VolcEngineVideoAdapter } from './volcengine-video'
import { ViduVideoAdapter } from './vidu-video'
import { AliImageAdapter } from './ali-image'
import { AliVideoAdapter } from './ali-video'
import { ZenMuxVideoAdapter } from './zenmux-video'
import type { AIConfig, ImageProviderAdapter, VideoProviderAdapter, TTSProviderAdapter } from './types'

// 图片 Adapter 注册表
export const imageAdapters: Record<string, ImageProviderAdapter> = {
  minimax: new MiniMaxImageAdapter(),
  apimart: new ApimartImageAdapter(),
  zenmux: new ZenMuxImageAdapter(),
  openai: new OpenAIImageAdapter(),
  'openai-compatible-image': new OpenAIImageAdapter(),
  gemini: new GeminiImageAdapter(),
  volcengine: new VolcEngineImageAdapter(),
  ali: new AliImageAdapter(),
  // Chatfire - 待确认 API 格式，暂用 OpenAI
  chatfire: new OpenAIImageAdapter(),
}

// 视频 Adapter 注册表
export const videoAdapters: Record<string, VideoProviderAdapter> = {
  minimax: new MiniMaxVideoAdapter(),
  apimart: new ApimartVideoAdapter(),
  volcengine: new VolcEngineVideoAdapter(),
  vidu: new ViduVideoAdapter(),
  ali: new AliVideoAdapter(),
  zenmux: new ZenMuxVideoAdapter(),
  // Chatfire 视频 - 待确认 API 格式
}

// TTS Adapter 注册表
export const ttsAdapters: Record<string, TTSProviderAdapter> = {
  minimax: new MiniMaxTTSAdapter(),
  chatfire: new MiniMaxTTSAdapter(),
}

export function getTTSAdapter(provider: string): TTSProviderAdapter {
  return ttsAdapters[provider.toLowerCase()] || ttsAdapters['minimax']
}

/**
 * 获取图片 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter，未知厂商返回 MiniMax 默认
 */
export function getImageAdapter(provider: string): ImageProviderAdapter {
  return imageAdapters[provider.toLowerCase()] || imageAdapters['minimax']
}

function configuredProtocol(config?: Pick<AIConfig, 'modelDefaults' | 'modelCapabilities'> | null) {
  return String(
    config?.modelDefaults?.protocol ||
    config?.modelDefaults?.apiProtocol ||
    config?.modelDefaults?.api_protocol ||
    config?.modelCapabilities?.protocol ||
    config?.modelCapabilities?.apiProtocol ||
    config?.modelCapabilities?.api_protocol ||
    '',
  ).trim().toLowerCase().replace(/_/g, '-')
}

export function getImageAdapterForConfig(config: AIConfig): ImageProviderAdapter {
  if (configuredProtocol(config) === 'openai-image') return imageAdapters['openai']
  return getImageAdapter(config.provider)
}

/**
 * 获取视频 Adapter
 * @param provider 厂商名称
 * @returns 对应的 Adapter，未知厂商返回 MiniMax 默认
 */
export function getVideoAdapter(provider: string): VideoProviderAdapter {
  return videoAdapters[provider.toLowerCase()] || videoAdapters['minimax']
}
