/**
 * 火山引擎 veImageX 图片生成 Adapter
 * 端点: /api/v3/images/generations (注意 /api/v3 前缀)
 * 响应格式: { data: [{ url: "..." }] }
 */
import type {
  ImageProviderAdapter,
  ProviderRequest,
  AIConfig,
  ImageGenerationRecord,
  ImageGenResponse,
  ImagePollResponse,
} from './types'
import { joinProviderUrl } from './url'

export class VolcEngineImageAdapter implements ImageProviderAdapter {
  provider = 'volcengine'

  buildGenerateRequest(config: AIConfig, record: ImageGenerationRecord): ProviderRequest {
    const model = record.model || config.model || 'doubao-seedream-5-0-260128'
    const images = this.parseJsonArray(record.referenceImages)

    const body: any = {
      model,
      prompt: record.prompt,
    }
    this.setIfPresent(body, 'image', images.length === 1 ? images[0] : (images.length ? images : undefined))
    this.setIfPresent(body, 'size', record.size || record.sampleImageSize)
    this.setIfPresent(body, 'output_format', record.outputFormat)
    this.setIfPresent(body, 'response_format', record.responseFormat || 'url')
    this.setIfPresent(body, 'watermark', record.watermark)
    this.setIfPresent(body, 'stream', record.stream)
    this.setIfPresent(body, 'sequential_image_generation', record.sequentialImageGeneration)
    const sequentialOptions = this.parseJsonObject(record.sequentialImageGenerationOptions)
    if (Object.keys(sequentialOptions).length) body.sequential_image_generation_options = sequentialOptions
    const optimizeOptions = this.parseJsonObject(record.optimizePromptOptions)
    if (Object.keys(optimizeOptions).length) body.optimize_prompt_options = optimizeOptions
    const tools = this.parseJsonArray(record.tools, true)
    if (tools.length) body.tools = tools

    if (images.length > 14) throw new Error('VolcEngine Seedream supports up to 14 reference images')
    if (record.stream) throw new Error('当前后端任务执行器暂不支持火山 Seedream 流式图片输出，请关闭 stream')

    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', '/images/generations'),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body,
    }
  }

  parseGenerateResponse(result: any): ImageGenResponse {
    // 火山引擎可能返回 task_id 进行轮询
    if (result.task_id || result.id) {
      return { isAsync: true, taskId: result.task_id || result.id }
    }
    // 同步返回
    const imageUrl = result.data?.[0]?.url || result.url
    if (imageUrl) {
      return { isAsync: false, imageUrl }
    }
    const b64 = result.data?.[0]?.b64_json || result.b64_json
    if (b64) return { isAsync: false }
    throw new Error('No image URL in response')
  }

  buildPollRequest(config: AIConfig, taskId: string): ProviderRequest {
    return {
      url: joinProviderUrl(config.baseUrl, '/api/v3', `/images/generations/${taskId}`),
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: undefined,
    }
  }

  parsePollResponse(result: any): ImagePollResponse {
    const status = result.status
    if (status === 'succeeded') {
      return {
        status: 'completed',
        imageUrl: result.data?.[0]?.url || result.image_url,
      }
    }
    if (status === 'failed') {
      return { status: 'failed', error: this.errorMessage(result.error) || 'Generation failed' }
    }
    return { status: status || 'processing' }
  }

  extractImageUrl(result: any): string | null {
    return result.data?.[0]?.url || result.image_url || null
  }

  extractImageBase64(result: any): { data: string; mimeType: string } | null {
    const data = String(result.data?.[0]?.b64_json || result.b64_json || '').trim()
    if (!data) return null
    return { data, mimeType: this.mimeType(result) }
  }

  extractImageUrls(result: any): string[] {
    const urls = Array.isArray(result.data)
      ? result.data.map((item: any) => String(item?.url || '').trim()).filter(Boolean)
      : []
    const single = String(result.image_url || result.url || '').trim()
    return urls.length ? urls : (single ? [single] : [])
  }

  extractImageBase64List(result: any): Array<{ data: string; mimeType: string }> {
    const mimeType = this.mimeType(result)
    if (!Array.isArray(result.data)) return []
    return result.data
      .map((item: any) => String(item?.b64_json || '').trim())
      .filter(Boolean)
      .map((data: string) => ({ data, mimeType }))
  }

  private setIfPresent(body: Record<string, any>, key: string, value: any) {
    if (value !== undefined && value !== null && value !== '') body[key] = value
  }

  private parseJsonArray(value?: string | null, allowObjects = false): any[] {
    if (!value) return []
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      if (!Array.isArray(parsed)) return []
      return parsed
        .map(item => allowObjects ? item : String(item || '').trim())
        .filter(item => allowObjects ? Boolean(item) : Boolean(String(item || '').trim()))
    } catch {
      return []
    }
  }

  private parseJsonObject(value?: string | null): Record<string, any> {
    if (!value) return {}
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  private mimeType(result: any) {
    const format = String(result.output_format || result.data?.[0]?.output_format || '').toLowerCase()
    return format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/png'
  }

  private errorMessage(error: any): string | null {
    if (!error) return null
    if (typeof error === 'string') return error
    return error.message || error.msg || JSON.stringify(error)
  }
}
