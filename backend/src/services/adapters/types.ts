/**
 * 图片生成 Provider Adapter 接口
 */
export interface ImageProviderAdapter {
  /** 厂商标识 */
  provider: string

  /**
   * 构建图片生成请求
   * @param config AI 配置 { baseUrl, apiKey, model }
   * @param record 图片生成记录
   */
  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest

  /**
   * 解析生成响应，判断是同步还是异步
   */
  parseGenerateResponse(result: any): ImageGenResponse

  /**
   * 构建轮询请求
   * @param config AI 配置
   * @param taskId 任务 ID
   */
  buildPollRequest(config: AIConfig, taskId: string, model?: string | null): ProviderRequest

  /**
   * 解析轮询响应
   */
  parsePollResponse(result: any): ImagePollResponse

  /**
   * 从响应中提取图片 URL（用于直接下载）
   * 返回 null 表示图片数据是 base64 格式，需要用 extractImageBase64 处理
   */
  extractImageUrl(result: any): string | null

  /**
   * 从响应中提取 base64 图片数据
   * 仅用于 Gemini 等只返回 base64 的厂商
   */
  extractImageBase64(result: any): { data: string; mimeType: string } | null

  /**
   * Optional multi-image extraction for providers that can return multiple results.
   */
  extractImageUrls?(result: any): string[]
  extractImageBase64List?(result: any): Array<{ data: string; mimeType: string }>
}

/**
 * 视频生成 Provider Adapter 接口
 */
export interface VideoProviderAdapter {
  provider: string

  buildGenerateRequest(config: AIConfig, record: VideoGenerationRecord): ProviderRequest

  parseGenerateResponse(result: any): VideoGenResponse

  buildPollRequest(config: AIConfig, taskId: string, model?: string | null): ProviderRequest

  parsePollResponse(result: any): VideoPollResponse

  extractVideoUrl(result: any): string | null
}

// ============ 通用类型 ============

export interface ProviderRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: any
}

export interface AIConfig {
  provider: string
  baseUrl: string
  apiKey: string
  model: string
  modelConfigId?: number
  userProviderId?: number | null
  modelDefaults?: Record<string, any>
  modelParameters?: Record<string, any>
  modelCapabilities?: Record<string, any>
  resourceMode?: 'user_api' | 'platform'
  billable?: boolean
}

export interface ImageGenerationRecord {
  id: number
  model?: string | null
  prompt?: string | null
  negativePrompt?: string | null
  size?: string | null
  sampleImageSize?: string | null
  quality?: string | null
  style?: string | null
  seed?: number | null
  cfgScale?: number | null
  outputFormat?: string | null
  responseFormat?: string | null
  outputCompression?: number | null
  background?: string | null
  moderation?: string | null
  inputFidelity?: string | null
  partialImages?: number | null
  stream?: boolean | null
  officialFallback?: boolean | null
  googleSearch?: boolean | null
  googleImageSearch?: boolean | null
  watermark?: boolean | null
  sequentialImageGeneration?: string | null
  sequentialImageGenerationOptions?: string | null
  optimizePromptOptions?: string | null
  tools?: string | null
  mask?: string | null
  frameType?: string | null
  referenceImages?: string | null
  numberOfImages?: number | null
  // ... 其他字段
}

export interface VideoGenerationRecord {
  id: number
  model?: string | null
  prompt?: string | null
  referenceMode?: string | null
  imageUrl?: string | null
  firstFrameUrl?: string | null
  lastFrameUrl?: string | null
  referenceImageUrls?: string | null
  referenceVideoUrls?: string | null
  referenceAudioUrls?: string | null
  duration?: number | null
  fps?: number | null
  resolution?: string | null
  mode?: string | null
  quality?: string | null
  aspectRatio?: string | null
  frames?: number | null
  seed?: number | null
  generateAudio?: boolean | null
  audioSetting?: string | null
  cameraFixed?: boolean | null
  watermark?: boolean | null
  returnLastFrame?: boolean | null
  serviceTier?: string | null
  executionExpiresAfter?: number | null
  callbackUrl?: string | null
  draft?: boolean | null
  draftTaskId?: string | null
  tools?: string | null
  negativePrompt?: string | null
  enhancePrompt?: boolean | null
  personGeneration?: string | null
  numberOfVideos?: number | null
  // ... 其他字段
}

export interface ImageGenResponse {
  isAsync: boolean
  taskId?: string
  /** 同步模式下直接返回的图片 URL */
  imageUrl?: string
}

export interface ImagePollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  imageUrl?: string
  error?: string
}

export interface VideoGenResponse {
  isAsync: boolean
  taskId?: string
  videoUrl?: string
}

export interface VideoPollResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed'
  videoUrl?: string
  error?: string
}

/**
 * TTS 语音合成 Provider Adapter
 */
export interface TTSProviderAdapter {
  provider: string

  buildGenerateRequest(config: AIConfig, params: any): ProviderRequest

  parseResponse(result: any): {
    audioHex: string
    audioLength: number
    sampleRate: number
    bitrate: number
    format: string
    channel: number
  }
}
