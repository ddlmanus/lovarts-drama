import { Hono } from 'hono'
import { success, badRequest } from '../utils/response.js'
import { saveUploadedFile } from '../utils/storage.js'

const app = new Hono()
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_FILE_BYTES || 20 * 1024 * 1024)
const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'])
const ALLOWED_MEDIA_TYPES = new Set([
  ...ALLOWED_IMAGE_TYPES,
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
])

function mediaKind(mimeType: string) {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  return 'file'
}

// POST /upload/image
app.post('/image', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return badRequest(c, 'file is required')
  }
  if (!ALLOWED_IMAGE_TYPES.has(String(file.type || '').toLowerCase())) {
    return badRequest(c, 'only png, jpg, webp and gif images are supported')
  }
  if (file.size > MAX_UPLOAD_BYTES) return badRequest(c, 'file is too large')

  const buffer = await file.arrayBuffer()
  try {
    const path = await saveUploadedFile(buffer, 'uploads', file.name)
    return success(c, { url: `/${path}`, path })
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

// POST /upload/media
app.post('/media', async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || !(file instanceof File)) {
    return badRequest(c, 'file is required')
  }
  const mimeType = String(file.type || '').toLowerCase()
  if (!ALLOWED_MEDIA_TYPES.has(mimeType)) {
    return badRequest(c, 'only image, video and audio files are supported')
  }
  if (file.size > MAX_UPLOAD_BYTES) return badRequest(c, 'file is too large')

  const buffer = await file.arrayBuffer()
  try {
    const path = await saveUploadedFile(buffer, 'uploads', file.name)
    return success(c, {
      url: `/${path}`,
      path,
      name: file.name,
      mime_type: mimeType,
      type: mediaKind(mimeType),
      size: file.size,
    })
  } catch (err: any) {
    return badRequest(c, err.message)
  }
})

export default app
