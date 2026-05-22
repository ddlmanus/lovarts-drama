<template>
  <div class="generate-container">
    <div ref="feedScrollRef" class="max-box content">
      <div class="resource-grid-container">
        <div class="load-trigger"></div>
        <div v-if="creationGroups.length" class="creation-feed">
          <article v-for="group in creationGroups" :key="group.key" class="creation-group">
            <div class="group-header">
              <img v-if="group.references[0]" :src="group.references[0]" alt="" class="group-thumb" />
              <div class="group-copy">
                <p class="group-prompt">{{ group.prompt }}</p>
                <div class="group-meta">
                  <span>编辑描述词</span>
                  <span>{{ group.model || '-' }}</span>
                  <span>{{ group.ratio || 'auto' }}</span>
                  <span>{{ group.resolution || 'auto' }}</span>
                  <span>{{ group.time }}</span>
                </div>
              </div>
            </div>
            <div class="group-assets">
              <div v-for="slot in group.slots" :key="slot.key" class="asset-frame">
                <template v-if="slot.task?.status === 'completed' && slot.task.resultUrl">
                  <video
                    v-if="slot.task.type === 'video'"
                    :src="slot.task.resultUrl"
                    class="asset-media"
                    controls
                    playsinline
                  ></video>
                  <button v-else class="asset-preview-button" type="button" @click="openPreview(slot.task.resultUrl, group.prompt)">
                    <img :src="slot.task.resultUrl" :alt="group.prompt" class="asset-media" />
                  </button>
                </template>
                <div v-else class="placeholder">
                  <div class="placeholder-glow"></div>
                  <span>{{ slot.task?.status === 'failed' ? '生成失败' : `${group.progress}%生成中...` }}</span>
                </div>
              </div>
            </div>
            <div class="group-actions">
              <button type="button" @click="editGroup(group)">重新编辑</button>
              <button type="button" @click="regenerateGroup(group)">再次生成</button>
              <button type="button" aria-label="下载" :disabled="!group.downloadUrl" @click="downloadGroup(group)">
                <span>下载</span>
              </button>
              <button type="button" aria-label="删除" @click="deleteGroup(group)">
                <span>删除</span>
              </button>
            </div>
            <p v-if="group.errorMsg" class="error-text">{{ group.errorMsg }}</p>
          </article>
        </div>
        <div v-else class="empty-state">
          <div class="empty-content">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" class="empty-icon" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="1.5" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
              <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <p class="empty-title">暂无创作内容</p>
            <p class="empty-text">开始创作你的第一个作品吧</p>
          </div>
        </div>
      </div>
    </div>
    <MaterialInput v-model="prompt" @submitted="handleSubmitted" />
    <div v-if="previewImage" class="preview-overlay" @click.self="closePreview">
      <button class="preview-close" type="button" aria-label="关闭" @click="closePreview">×</button>
      <img :src="previewImage.url" :alt="previewImage.alt" class="preview-image" />
    </div>
  </div>
</template>

<script setup>
import { useCreationTasks } from '~/composables/useCreationTasks'
import { toast } from 'vue-sonner'

const prompt = ref('')
const progressNow = ref(Date.now())
const previewImage = ref(null)
const feedScrollRef = ref(null)
const progressStartedAt = new Map()
let progressTimer = null
const { creationTasks, createGeneration, deleteGeneration, loadRecentCompleted } = useCreationTasks()
const creationGroups = computed(() => {
  return creationTasks.value.map((task) => {
    const results = Array.isArray(task.results) ? task.results : []
    const firstPending = !['completed', 'failed'].includes(task.status)
    const slots = Array.from({ length: Math.max(Number(task.expectedCount || 1), results.length, 1) }, (_, index) => ({
      key: `${task.groupKey}-${index}`,
      task: results[index]
        ? { ...task, status: results[index].status || 'completed', resultUrl: results[index].resultUrl, errorMsg: results[index].error_msg || task.errorMsg }
        : (firstPending || task.status === 'failed' ? task : null),
    }))
    return {
      key: task.groupKey,
      sourceId: task.sourceId,
      type: task.type,
      prompt: task.prompt,
      model: task.model,
      ratio: task.size,
      resolution: task.sampleImageSize,
      references: task.references,
      createdAt: task.createdAt,
      slots,
      progress: displayProgress(task, progressNow.value),
      errorMsg: task.errorMsg || '',
      downloadUrl: slots.find(slot => slot.task?.resultUrl)?.task?.resultUrl || '',
      downloadUrls: slots.map(slot => slot.task?.resultUrl).filter(Boolean),
      time: formatChinaDateTime(task.createdAt),
    }
  })
})

function isPending(task) {
  return !['completed', 'failed'].includes(task.status)
}

function statusText(task) {
  if (task.status === 'completed') return '已完成'
  if (task.status === 'failed') return '失败'
  if (task.status === 'processing') return '生成中'
  return '排队中'
}

function parseServerDateTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return new Date(NaN)
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) return new Date(raw)
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${raw.replace(' ', 'T')}Z`)
  }
  return new Date(raw)
}

function formatChinaDateTime(value) {
  const date = parseServerDateTime(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = value => String(value).padStart(2, '0')
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value
    return acc
  }, {})
  return `${parts.year}-${parts.month}-${parts.day}:${parts.hour}:${parts.minute}:${parts.second}`
}

function displayProgress(task, nowTs = Date.now()) {
  if (!task || ['completed', 'failed'].includes(task.status)) return 100
  const existing = Number(task.progress || 0)
  const baseline = existing > 0 && existing < 99 ? Math.max(1, Math.floor(existing)) : 1
  const key = task.sourceId || task.clientId || task.groupKey
  if (!progressStartedAt.has(key)) progressStartedAt.set(key, nowTs)
  const start = progressStartedAt.get(key)
  const estimatedDuration = task.type === 'video'
    ? Math.max(1, Number(task.expectedCount || 1)) * 2 * 60 * 1000
    : 2 * 60 * 1000
  const estimated = Math.floor(((nowTs - start) / estimatedDuration) * 100)
  return Math.max(baseline, Math.min(99, estimated))
}

function scrollToBottom(smooth = true) {
  nextTick(() => {
    const el = feedScrollRef.value
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' })
  })
}

function handleSubmitted() {
  scrollToBottom()
}

function editGroup(group) {
  prompt.value = group.prompt || ''
  toast.success('已回填提示词')
}

async function regenerateGroup(group) {
  if (!group?.prompt) return
  try {
    await createGeneration({
      type: group.type || 'image',
      prompt: group.prompt,
      model: group.model,
      size: group.ratio || undefined,
      aspect_ratio: group.ratio || undefined,
      resolution: group.resolution || undefined,
      sample_image_size: group.resolution || undefined,
      reference_images: group.references || [],
      image_urls: group.references || [],
    })
    toast.success('已重新提交生成')
  } catch (err) {
    toast.error(err.message || '再次生成失败')
  }
}

function openPreview(url, alt = '') {
  previewImage.value = { url, alt }
}

function closePreview() {
  previewImage.value = null
}

async function downloadGroup(group) {
  const urls = Array.from(new Set(group.downloadUrls || []))
  if (!urls.length) {
    toast.info('暂无可下载结果')
    return
  }
  try {
    const files = await Promise.all(urls.map(async (url, index) => {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`下载素材失败：${resp.status}`)
      const blob = await resp.blob()
      const data = new Uint8Array(await blob.arrayBuffer())
      return {
        name: `image-${String(index + 1).padStart(2, '0')}${fileExtension(url, blob.type)}`,
        data,
      }
    }))
    const zipBlob = createZipBlob(files)
    triggerBlobDownload(zipBlob, `huobao-${group.sourceId || Date.now()}.zip`)
  } catch (err) {
    toast.error(err.message || '打包下载失败')
  }
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function fileExtension(url, mimeType = '') {
  const clean = String(url || '').split('?')[0].split('#')[0]
  const match = clean.match(/\.(png|jpe?g|webp|gif|mp4|webm|mov)$/i)
  if (match) return `.${match[1].toLowerCase().replace('jpeg', 'jpg')}`
  if (mimeType.includes('png')) return '.png'
  if (mimeType.includes('webp')) return '.webp'
  if (mimeType.includes('gif')) return '.gif'
  if (mimeType.includes('video/mp4')) return '.mp4'
  return '.jpg'
}

function createZipBlob(files) {
  const encoder = new TextEncoder()
  const chunks = []
  const central = []
  let offset = 0
  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const crc = crc32(file.data)
    chunks.push(fileHeader(nameBytes, file.data.byteLength, crc))
    chunks.push(file.data)
    central.push({ nameBytes, size: file.data.byteLength, crc, offset })
    offset += 30 + nameBytes.length + file.data.byteLength
  }
  const centralStart = offset
  for (const entry of central) {
    const header = centralHeader(entry.nameBytes, entry.size, entry.crc, entry.offset)
    chunks.push(header)
    offset += header.byteLength
  }
  chunks.push(endOfCentralDirectory(central.length, offset - centralStart, centralStart))
  return new Blob(chunks, { type: 'application/zip' })
}

function fileHeader(nameBytes, size, crc) {
  const buffer = new ArrayBuffer(30 + nameBytes.length)
  const view = new DataView(buffer)
  writeZipHeader(view, 0x04034b50, crc, size, nameBytes.length)
  new Uint8Array(buffer, 30).set(nameBytes)
  return buffer
}

function centralHeader(nameBytes, size, crc, offset) {
  const buffer = new ArrayBuffer(46 + nameBytes.length)
  const view = new DataView(buffer)
  view.setUint32(0, 0x02014b50, true)
  view.setUint16(4, 20, true)
  view.setUint16(6, 20, true)
  view.setUint16(8, 0, true)
  view.setUint16(10, 0, true)
  view.setUint16(12, 0, true)
  view.setUint16(14, 0, true)
  view.setUint32(16, crc, true)
  view.setUint32(20, size, true)
  view.setUint32(24, size, true)
  view.setUint16(28, nameBytes.length, true)
  view.setUint16(30, 0, true)
  view.setUint16(32, 0, true)
  view.setUint16(34, 0, true)
  view.setUint16(36, 0, true)
  view.setUint32(38, 0, true)
  view.setUint32(42, offset, true)
  new Uint8Array(buffer, 46).set(nameBytes)
  return buffer
}

function writeZipHeader(view, signature, crc, size, nameLength, base = 0) {
  view.setUint32(base, signature, true)
  view.setUint16(base + 4, 20, true)
  view.setUint16(base + 6, 0, true)
  view.setUint16(base + 8, 0, true)
  view.setUint16(base + 10, 0, true)
  view.setUint16(base + 12, 0, true)
  view.setUint32(base + 14, crc, true)
  view.setUint32(base + 18, size, true)
  view.setUint32(base + 22, size, true)
  view.setUint16(base + 26, nameLength, true)
  view.setUint16(base + 28, 0, true)
}

function endOfCentralDirectory(count, centralSize, centralStart) {
  const buffer = new ArrayBuffer(22)
  const view = new DataView(buffer)
  view.setUint32(0, 0x06054b50, true)
  view.setUint16(8, count, true)
  view.setUint16(10, count, true)
  view.setUint32(12, centralSize, true)
  view.setUint32(16, centralStart, true)
  return buffer
}

function crc32(bytes) {
  let crc = -1
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

async function deleteGroup(group) {
  if (!group?.sourceId) return
  try {
    await deleteGeneration(group.sourceId)
    toast.success('已删除')
  } catch (err) {
    toast.error(err.message || '删除失败')
  }
}

onMounted(() => {
  loadRecentCompleted().then(() => scrollToBottom(false)).catch(() => undefined)
  progressTimer = window.setInterval(() => {
    progressNow.value = Date.now()
  }, 1000)
})

watch(() => creationTasks.value.length, () => scrollToBottom())

onBeforeUnmount(() => {
  if (progressTimer) window.clearInterval(progressTimer)
})
</script>

<style scoped>
.generate-container {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  overflow: hidden;
  border-radius: 8px;
  background: #1f1f1f;
  color: var(--chatfire-text-primary);
}

.max-box.content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 190px;
}

.resource-grid-container {
  position: relative;
  min-height: 100%;
}

.load-trigger {
  height: 1px;
}

.creation-feed {
  display: flex;
  flex-direction: column;
  gap: 34px;
  max-width: 1770px;
  margin: 0 auto;
  padding: 26px 32px 40px;
}

.creation-group {
  color: #f4f4f5;
}

.group-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 18px;
}

.group-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
}

.group-copy {
  min-width: 0;
  flex: 1;
}

.group-prompt {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #f4f4f5;
  font-size: 18px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.group-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  margin-top: 6px;
  color: #a7abb3;
  font-size: 14px;
  line-height: 1.4;
}

.group-meta span + span::before {
  content: "|";
  margin: 0 10px;
  color: #5f636b;
}

.group-assets {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.asset-frame {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: #26282d;
}

.asset-preview-button {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.asset-media {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 42px;
  background: rgba(0, 0, 0, 0.82);
}

.preview-image {
  max-width: min(92vw, 1440px);
  max-height: 88vh;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
}

.preview-close {
  position: fixed;
  top: 24px;
  right: 30px;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 50%;
  background: rgba(31, 31, 31, 0.9);
  color: #fff;
  font-size: 26px;
  line-height: 1;
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  overflow: hidden;
  color: #d8dce3;
  background:
    radial-gradient(circle at 18% 14%, rgba(255, 255, 255, 0.055), transparent 24%),
    #26282d;
}

.placeholder-glow {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(110deg, transparent 18%, rgba(255, 255, 255, 0.08) 42%, transparent 64%),
    repeating-linear-gradient(135deg, rgba(255, 255, 255, 0.045) 0 1px, transparent 1px 14px);
  animation: placeholder-sweep 1.4s linear infinite;
}

.placeholder span {
  position: relative;
  z-index: 1;
  margin: 12px;
  padding: 4px 10px;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(20, 22, 26, 0.82);
  font-size: 13px;
  font-weight: 700;
}

.group-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.group-actions button {
  height: 38px;
  padding: 0 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #2c2f35;
  color: #f4f4f5;
  font: inherit;
  font-size: 15px;
  font-weight: 700;
  box-shadow: none;
}

.group-actions button:hover {
  border-color: rgba(255, 255, 255, 0.18);
  background: #363a42;
}

.group-actions button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.error-text {
  margin: 10px 0 0;
  color: #ff6b75;
  font-size: 13px;
  line-height: 1.4;
}

@keyframes placeholder-sweep {
  from {
    transform: translateX(-60%);
  }
  to {
    transform: translateX(60%);
  }
}

.empty-state {
  display: grid;
  min-height: calc(100vh - 206px);
  place-items: center;
  color: #737373;
}

@media (max-width: 1180px) {
  .group-assets {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .creation-feed {
    padding: 18px 14px 34px;
  }

  .group-assets {
    grid-template-columns: 1fr;
  }
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  transform: translateY(-42px);
}

.empty-icon {
  color: #6f6f78;
}

.empty-title {
  margin: 4px 0 0;
  color: #8a8a8f;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.empty-text {
  margin: 0;
  color: #76767d;
  font-size: 14px;
  line-height: 1.5;
}

@media (max-width: 768px) {
  .max-box.content {
    padding-bottom: 230px;
  }

  .empty-state {
    min-height: calc(100vh - 280px);
  }
}
</style>
