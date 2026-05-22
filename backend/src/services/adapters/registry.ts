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
import { ApimartHappyHorseVideoAdapter } from './apimart-happyhorse-video'
import { ApimartSkyReelsVideoAdapter } from './apimart-skyreels-video'
import { ApimartGrokImagineVideoAdapter } from './apimart-grok-imagine-video'
import { ApimartKlingOmniVideoAdapter } from './apimart-kling-omni-video'
import { ApimartViduQ3VideoAdapter } from './apimart-vidu-q3-video'
import { ApimartWanVideoEditAdapter } from './apimart-wan-video-edit'
import { ApimartOmniFlashExtVideoAdapter } from './apimart-omni-flash-ext-video'
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

const apimartHappyHorseVideoAdapter = new ApimartHappyHorseVideoAdapter()
const apimartSkyReelsVideoAdapter = new ApimartSkyReelsVideoAdapter()
const apimartGrokImagineVideoAdapter = new ApimartGrokImagineVideoAdapter()
const apimartKlingOmniVideoAdapter = new ApimartKlingOmniVideoAdapter()
const apimartViduQ3VideoAdapter = new ApimartViduQ3VideoAdapter()
const apimartWanVideoEditAdapter = new ApimartWanVideoEditAdapter()
const apimartOmniFlashExtVideoAdapter = new ApimartOmniFlashExtVideoAdapter()

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
  const protocol = configuredProtocol(config)
  if (protocol === 'openai-image') return imageAdapters['openai']
  if (protocol === 'gemini-image' || protocol === 'google-gemini-image') return imageAdapters['gemini']
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

export function getVideoAdapterForConfig(config: AIConfig): VideoProviderAdapter {
  const protocol = configuredProtocol(config)
  const provider = String(config.provider || '').trim().toLowerCase()
  const model = String(config.model || '').trim().toLowerCase()
  if (provider === 'apimart' && (protocol === 'apimart-happyhorse-video' || model === 'happyhorse-1.0')) {
    return apimartHappyHorseVideoAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-skyreels-v4-video' || model === 'skyreels-v4-fast' || model === 'skyreels-v4-std')) {
    return apimartSkyReelsVideoAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-grok-imagine-video' || model === 'grok-imagine-1.0-video-apimart')) {
    return apimartGrokImagineVideoAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-kling-v3-omni-video' || model === 'kling-v3-omni')) {
    return apimartKlingOmniVideoAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-vidu-q3-video' || model === 'viduq3-pro' || model === 'viduq3-turbo')) {
    return apimartViduQ3VideoAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-wan-video-edit' || model === 'wan2.7-videoedit')) {
    return apimartWanVideoEditAdapter
  }
  if (provider === 'apimart' && (protocol === 'apimart-omni-flash-ext-video' || model === 'omni-flash-ext')) {
    return apimartOmniFlashExtVideoAdapter
  }
  return getVideoAdapter(config.provider)
}
