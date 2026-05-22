/**
 * API Hooks | API Hooks
 * Simplified hooks for open source version | 开源版简化 hooks
 */

import { ref, reactive, onUnmounted } from 'vue'
import { chatAPI, imageAPI, videoAPI } from '~/composables/useApi'

const assetUrl = (value) => {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (/^(https?:|data:|blob:)/.test(raw) || raw.startsWith('/')) return raw
  return `/${raw}`
}

const normalizeStatus = (value) => {
  const raw = String(value || '').toLowerCase()
  if (['completed', 'complete', 'done', 'success', 'succeeded'].includes(raw)) return 'completed'
  if (['failed', 'fail', 'error'].includes(raw)) return 'failed'
  if (raw.includes('processing') || raw.includes('running')) return 'processing'
  return raw || 'pending'
}

const firstMediaUrl = (record, type) => {
  const direct = type === 'video'
    ? record?.videoUrl || record?.video_url || record?.localPath || record?.local_path || record?.url
    : record?.imageUrl || record?.image_url || record?.localPath || record?.local_path || record?.url
  return assetUrl(direct)
}

/**
 * Base API state hook | 基础 API 状态 Hook
 */
export const useApiState = () => {
  const loading = ref(false)
  const error = ref(null)
  const status = ref('idle')

  const reset = () => {
    loading.value = false
    error.value = null
    status.value = 'idle'
  }

  const setLoading = (isLoading) => {
    loading.value = isLoading
    status.value = isLoading ? 'running' : status.value
  }

  const setError = (err) => {
    error.value = err
    status.value = 'error'
    loading.value = false
  }

  const setSuccess = () => {
    status.value = 'success'
    loading.value = false
    error.value = null
  }

  return { loading, error, status, reset, setLoading, setError, setSuccess }
}

/**
 * Chat composable | 问答组合式函数
 */
export const useChat = (options = {}) => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const messages = ref([])
  const currentResponse = ref('')
  let abortController = null

  const send = async (content, stream = true, chatOptions = {}) => {
    setLoading(true)
    currentResponse.value = ''

    try {
      // 构建用户消息内容（支持参考图片）
      let userContent
      const images = chatOptions.images || options.images || []

      if (images.length > 0) {
        // 多模态消息：文本 + 图片
        userContent = [
          { type: 'text', text: content },
          ...images.map(img => ({
            type: 'image_url',
            image_url: { url: img.url || img }
          }))
        ]
      } else {
        userContent = content
      }

      const msgList = [
        ...(options.systemPrompt ? [{ role: 'system', content: options.systemPrompt }] : []),
        ...messages.value,
        { role: 'user', content: userContent }
      ]

      status.value = stream ? 'streaming' : 'running'
      abortController = new AbortController()
      const response = await chatAPI.ask({
        model: options.model,
        model_config_id: options.model_config_id,
        user_provider_id: options.user_provider_id,
        provider: options.provider,
        messages: msgList,
        stream: false
      })

      const fullResponse = response?.text || response?.content || response?.message || ''
      currentResponse.value = fullResponse
      messages.value.push({ role: 'user', content })
      messages.value.push({ role: 'assistant', content: fullResponse })
      setSuccess()
      return fullResponse
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(err)
        throw err
      }
    }
  }

  const stop = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
  }

  const clear = () => {
    messages.value = []
    currentResponse.value = ''
    reset()
  }

  onUnmounted(() => stop())

  return { loading, error, status, messages, currentResponse, send, stop, clear, reset }
}

/**
 * Image generation composable | 图片生成组合式函数
 * Simplified for open source - fixed input/output format
 */
export const useImageGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const images = ref([])
  const currentImage = ref(null)

  /**
   * Generate image with fixed params | 固定参数生成图片
   * @param {Object} params - { model, prompt, size, n, image (optional ref image) }
   */
  const generate = async (params) => {
    setLoading(true)
    images.value = []
    currentImage.value = null

    try {
      // Build request data | 构建请求数据
      const requestData = {
        model: params.model,
        model_config_id: params.model_config_id,
        user_provider_id: params.user_provider_id,
        provider: params.provider,
        prompt: params.prompt,
        size: params.size || undefined,
        image_size: params.image_size || params.resolution || undefined,
        sample_image_size: params.sample_image_size || params.resolution || undefined,
        resolution: params.resolution || undefined,
        quality: params.quality || undefined,
        number_of_images: params.number_of_images || params.count || params.n || 1,
        count: params.count || params.n || 1,
        n: params.n || params.count || 1,
        output_format: params.output_format,
        output_compression: params.output_compression,
        background: params.background,
        moderation: params.moderation,
        official_fallback: params.official_fallback,
        google_search: params.google_search,
        google_image_search: params.google_image_search
      }

      // Add reference image if provided | 添加参考图
      if (params.image) {
        const refImages = Array.isArray(params.image) ? params.image : [params.image]
        requestData.reference_images = refImages
        requestData.image_urls = refImages
      }

      const record = await imageAPI.generate(requestData)
      const result = await pollImageTask(record?.id, (attempt, percentage) => {
        status.value = 'polling'
      })
      const adaptedData = [{ ...result, url: firstMediaUrl(result, 'image') }]

      images.value = adaptedData.filter(item => item?.url)
      currentImage.value = images.value[0] || null
      setSuccess()
      return images.value
    } catch (err) {
      setError(err)
      throw err
    }
  }

  /**
   * Poll backend image generation record | 轮询后端图片生成记录
   */
  const pollImageTask = async (pollTaskId, onProgress = () => {}) => {
    if (!pollTaskId) throw new Error('未获取到图片任务 ID')
    const maxAttempts = 120
    const interval = 5000

    for (let i = 0; i < maxAttempts; i++) {
      onProgress(i + 1, Math.min(Math.round((i / maxAttempts) * 100), 99))
      const result = await imageAPI.get(pollTaskId)
      const normalized = normalizeStatus(result?.status)

      if (normalized === 'completed') {
        const url = firstMediaUrl(result, 'image')
        if (url) return { ...result, url }
      }

      if (normalized === 'failed') {
        throw new Error(result?.errorMsg || result?.error_msg || result?.message || '图片生成失败')
      }

      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('图片生成超时')
  }

  return { loading, error, status, images, currentImage, generate, reset, pollImageTask }
}

/**
 * Video generation composable | 视频生成组合式函数
 * Simplified for open source - fixed input/output format
 */

export const useVideoGeneration = () => {
  const { loading, error, status, reset, setLoading, setError, setSuccess } = useApiState()

  const video = ref(null)
  const taskId = ref(null)
  const progress = reactive({
    attempt: 0,
    maxAttempts: 120,
    percentage: 0
  })

  /**
   * Create video task only (no polling) | 仅创建视频任务（不轮询）
   */
  const createVideoTaskOnly = async (params) => {
    // Build request data | 构建请求数据
    const requestData = {
      model: params.model,
      model_config_id: params.model_config_id,
      user_provider_id: params.user_provider_id,
      provider: params.provider,
      prompt: params.prompt || '',
      type: 'video',
      aspect_ratio: params.aspect_ratio || params.ratio || undefined,
      resolution: params.resolution || undefined,
      duration: params.duration || params.dur || undefined,
      reference_mode: params.reference_mode || undefined,
      watermark: false
    }
    // Add optional params | 添加可选参数
    if (params.first_frame_image) {
      requestData.image_url = params.first_frame_image
      requestData.first_frame_url = params.first_frame_image
      requestData.reference_image_urls = [params.first_frame_image]
    }
    if (params.last_frame_image) requestData.last_frame_url = params.last_frame_image

    // Call API to create task | 调用 API 创建任务
    const task = await videoAPI.generate(requestData)

    // If has video URL directly, return | 如果直接有视频 URL，返回
    const directUrl = firstMediaUrl(task, 'video')
    if (directUrl) {
      return {
        taskId: null,
        url: directUrl
      }
    }

    // Get task ID | 获取任务 ID
    const newTaskId = task.id || task.task_id || task.taskId
    if (!newTaskId) {
      throw new Error('未获取到任务 ID')
    }

    return { taskId: newTaskId }
  }

  /**
   * Poll video task | 轮询视频任务
   */
  const pollVideoTask = async (pollTaskId, onProgress = () => {}) => {
    const maxAttempts = 120
    const interval = 5000

    for (let i = 0; i < maxAttempts; i++) {
      onProgress(i + 1, Math.min(Math.round((i / maxAttempts) * 100), 99))

      const result = await videoAPI.get(pollTaskId)
      const normalized = normalizeStatus(result?.status)

      // Check for completion | 检查是否完成
      if (normalized === 'completed') {
        const videoUrl = firstMediaUrl(result, 'video')
        if (videoUrl) return { ...result, url: videoUrl }
      }

      // Check for failure | 检查是否失败
      if (normalized === 'failed') {
        throw new Error(result?.errorMsg || result?.error_msg || result?.message || '视频生成失败')
      }

      // Wait before next poll | 等待下次轮询
      await new Promise(resolve => setTimeout(resolve, interval))
    }

    throw new Error('视频生成超时')
  }

  /**
   * Generate video with fixed params (includes polling) | 固定参数生成视频（含轮询）
   * @param {Object} params - { model, prompt, first_frame_image, last_frame_image, ratio, duration }
   */
  const generate = async (params) => {
    setLoading(true)
    video.value = null
    taskId.value = null
    progress.attempt = 0
    progress.percentage = 0

    try {
      // 创建任务
      const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

      // 如果有直接 URL，返回
      if (url) {
        video.value = { url }
        setSuccess()
        return video.value
      }

      // 需要轮询
      taskId.value = newTaskId
      status.value = 'polling'

      // 轮询获取结果
      const result = await pollVideoTask(newTaskId, (attempt, percentage) => {
        progress.attempt = attempt
        progress.percentage = percentage
      })

      video.value = result
      setSuccess()
      return result
    } catch (err) {
      setError(err)
      throw err
    }
  }

  return { loading, error, status, video, taskId, progress, generate, reset, createVideoTaskOnly, pollVideoTask }
}

/**
 * Combined API composable | 综合 API 组合式函数
 */
export const useApi = () => {
  const chat = useChat()
  const image = useImageGeneration()
  const videoGen = useVideoGeneration()

  return { chat, image, video: videoGen }
}
