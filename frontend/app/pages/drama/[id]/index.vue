<template>
  <div v-if="drama" class="project-overview-container">
    <section class="immersive-header" :class="{ 'has-cover': coverSrc }">
      <button class="home-btn" type="button" aria-label="返回短剧列表" @click="navigateTo('/drama')">
        <Home :size="22" />
      </button>

      <div class="header-left">
        <div v-if="coverSrc" class="cover-bg">
          <img :src="coverSrc" :alt="drama.title" />
          <div class="cover-gradient"></div>
        </div>
        <div v-else class="cover-placeholder">
          <button class="placeholder-content" type="button" @click.stop>
            <Sparkles :size="48" />
            <span class="placeholder-text">AI 生成</span>
          </button>
          <div class="placeholder-gradient"></div>
        </div>
      </div>

      <div class="header-right">
        <div class="project-meta">
          <h1 class="project-title">{{ drama.title || '未命名项目' }}</h1>
          <p v-if="drama.description" class="project-description">{{ drama.description }}</p>
          <div class="project-tags">
            <span class="tag">{{ drama.style || '通用' }}</span>
            <span class="tag">{{ drama.aspect_ratio || drama.aspectRatio || '9:16' }}</span>
            <span class="tag">{{ episodes.length }} 集</span>
          </div>
        </div>

        <div class="cover-action-wrapper">
          <button class="action-btn primary no-shadow" type="button" @click.stop>
            <Pencil :size="18" />
            编辑项目
          </button>
          <button class="cover-icon-btn" type="button" aria-label="封面设置">
            <ImageIcon :size="20" />
          </button>
          <div class="cover-dropdown">
            <button class="dropdown-item" type="button">
              <Upload :size="16" />
              <span>上传封面</span>
            </button>
            <button class="dropdown-item" type="button">
              <Sparkles :size="16" />
              <span>AI生成</span>
            </button>
            <button class="dropdown-item disabled" type="button" disabled>
              <Download :size="16" />
              <span>下载封面</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <section class="overview-content">
      <div class="resources-section">
        <div class="section-header">
          <h3 class="section-title">项目内容</h3>
        </div>

        <div class="tabs">
          <div class="tabs-rail">
            <span class="tabs-capsule" :style="capsuleStyle"></span>
            <button
              v-for="tab in tabs"
              :key="tab.name"
              class="tab-button"
              :class="{ active: activeTab === tab.name }"
              type="button"
              @click="activeTab = tab.name"
            >
              <component :is="tab.icon" :size="18" />
              <span>{{ tab.label }}</span>
              <span class="tab-count">{{ tab.count }}</span>
            </button>
          </div>
        </div>

        <div v-if="activeTab === 'episodes'" class="episodes-list">
          <article
            v-for="episode in episodes"
            :key="episode.id || episodeNumber(episode)"
            class="episode-card"
            @click="openEpisode(episode)"
          >
            <div class="episode-header">
              <div class="episode-number-badge">第 {{ episodeNumber(episode) }} 集</div>
            </div>
            <div class="episode-body">
              <h4 class="episode-title">{{ episode.title || `第${episodeNumber(episode)}章` }}</h4>
              <p v-if="episode.description" class="episode-description">{{ episode.description }}</p>
              <div class="episode-meta">
                <span class="meta-item">
                  <Clock :size="14" />
                  {{ episodeMinutes(episode) }} 分钟
                </span>
              </div>
            </div>
            <div class="episode-footer">
              <button class="edit-btn" type="button" @click.stop="openEpisode(episode)">
                <Play :size="16" fill="currentColor" />
                进入制作
              </button>
            </div>
          </article>

          <article class="episode-card add-episode-card" @click="openAddEpisode">
            <div class="add-episode-content">
              <div class="add-icon">
                <Plus :size="48" />
              </div>
              <h4 class="add-title">新增一集</h4>
              <p class="add-description">继续创作你的短剧故事</p>
            </div>
          </article>
        </div>

        <div v-else-if="activeTab === 'characters'" class="characters-grid">
          <article v-for="character in characters" :key="character.id || character.name" class="character-card">
            <div class="character-header">
              <div class="character-avatar" :class="{ 'has-image': character.image_url || character.imageUrl }">
                <img v-if="character.image_url || character.imageUrl" :src="character.image_url || character.imageUrl" :alt="character.name" />
                <UserRound v-else :size="30" class="avatar-placeholder" />
              </div>
              <div class="character-title-wrapper">
                <h4 class="character-name">{{ character.name || '未命名角色' }}</h4>
                <div class="character-meta">
                  <span v-if="character.gender" class="meta-tag">{{ character.gender }}</span>
                  <span v-if="character.age" class="meta-tag">{{ character.age }}</span>
                </div>
              </div>
            </div>
            <div class="character-body">
              <p class="character-description" :class="{ empty: !character.description }">
                {{ character.description || '暂无角色描述' }}
              </p>
            </div>
          </article>
          <div v-if="!characters.length" class="empty-state small">
            <Users :size="42" class="empty-icon" />
            <p class="empty-description">暂无角色</p>
          </div>
        </div>

        <div v-else class="scenes-grid">
          <article v-for="scene in scenes" :key="scene.id || scene.location" class="scene-card">
            <div class="scene-header">
              <h4 class="scene-name">{{ scene.location || scene.name || '未命名场景' }}</h4>
              <div class="scene-meta">
                <span v-if="scene.time" class="meta-tag">{{ scene.time }}</span>
              </div>
            </div>
            <div class="scene-image">
              <img v-if="scene.image_url || scene.imageUrl" :src="scene.image_url || scene.imageUrl" :alt="scene.location || scene.name" />
              <Mountain v-else :size="42" class="image-placeholder" />
            </div>
            <div class="scene-body">
              <p class="scene-description" :class="{ empty: !scene.description }">
                {{ scene.description || '暂无场景描述' }}
              </p>
            </div>
          </article>
          <div v-if="!scenes.length" class="empty-state small">
            <Mountain :size="42" class="empty-icon" />
            <p class="empty-description">暂无场景</p>
          </div>
        </div>
      </div>
    </section>

    <div v-if="addDialog" class="dialog-mask" @click.self="addDialog = false">
      <div class="dialog">
        <div class="dialog-head">
          <div class="dialog-head-copy">
            <div class="dialog-title-row">
              <div class="dialog-title">创建新集</div>
              <span class="dialog-badge">配置将锁定</span>
            </div>
            <div class="dialog-sub">为这一集预先锁定图片、视频和音频生成服务。</div>
          </div>
          <button class="dialog-close" type="button" @click="addDialog = false">取消</button>
        </div>

        <div class="dialog-body">
          <label class="field">
            <span class="field-label">标题</span>
            <input v-model="newEpisodeTitle" class="input" placeholder="默认按集数自动命名" />
          </label>
          <div class="config-grid">
            <label class="field">
              <span class="field-label">图片配置</span>
              <BaseSelect v-model="newEpisodeImageConfigId" :options="imageConfigOptions" placeholder="选择图片服务" searchable />
            </label>
            <label class="field">
              <span class="field-label">视频配置</span>
              <BaseSelect v-model="newEpisodeVideoConfigId" :options="videoConfigOptions" placeholder="选择视频服务" searchable />
            </label>
            <label class="field">
              <span class="field-label">音频配置</span>
              <BaseSelect v-model="newEpisodeAudioConfigId" :options="audioConfigOptions" placeholder="选择音频服务" searchable />
            </label>
          </div>
        </div>

        <div class="dialog-foot">
          <button class="action-btn primary no-shadow" type="button" :disabled="creatingEpisode || !canCreateEpisode" @click="addEpisode">
            {{ creatingEpisode ? '创建中...' : '创建并进入制作' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import {
  Clapperboard,
  Clock,
  Download,
  Home,
  Image as ImageIcon,
  Mountain,
  Pencil,
  Play,
  Plus,
  Sparkles,
  Upload,
  UserRound,
  Users,
} from 'lucide-vue-next'
import { aiModelAPI, dramaAPI, episodeAPI, getAuthUser } from '~/composables/useApi'

const route = useRoute()
const drama = ref(null)
const dramaId = Number(route.params.id)
const addDialog = ref(false)
const creatingEpisode = ref(false)
const activeTab = ref('episodes')
const newEpisodeTitle = ref('')
const imageConfigs = ref([])
const videoConfigs = ref([])
const audioConfigs = ref([])
const newEpisodeImageConfigId = ref(null)
const newEpisodeVideoConfigId = ref(null)
const newEpisodeAudioConfigId = ref(null)

const episodes = computed(() => {
  const items = Array.isArray(drama.value?.episodes) ? [...drama.value.episodes] : []
  return items.sort((a, b) => episodeNumber(a) - episodeNumber(b))
})
const characters = computed(() => Array.isArray(drama.value?.characters) ? drama.value.characters : [])
const scenes = computed(() => Array.isArray(drama.value?.scenes) ? drama.value.scenes : [])
const coverSrc = computed(() => drama.value?.thumbnail || drama.value?.cover_url || drama.value?.coverImageUrl || '')

const tabs = computed(() => [
  { name: 'episodes', label: '分集列表', count: episodes.value.length, icon: Clapperboard },
  { name: 'characters', label: '角色', count: characters.value.length, icon: Users },
  { name: 'scenes', label: '场景', count: scenes.value.length, icon: Mountain },
])

const capsuleStyle = computed(() => {
  const index = tabs.value.findIndex(tab => tab.name === activeTab.value)
  return { '--tab-index': Math.max(index, 0) }
})

function episodeNumber(ep) {
  return Number(ep?.episode_number || ep?.episodeNumber || 1)
}

function episodeMinutes(ep) {
  const seconds = Number(ep?.duration || ep?.duration_seconds || ep?.durationSeconds || 0)
  return seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0
}

function configLabel(config) {
  if (!config) return ''
  const modelName = getConfigModelName(config)
  const provider = config.provider_name || config.provider || ''
  const name = config.name || config.label || modelName
  return modelName ? `${name} · ${modelName} (${provider})` : `${name} (${provider})`
}

function getConfigModelName(config) {
  if (config.model_id || config.value) return config.model_id || config.value
  try {
    const model = JSON.parse(config.model || '[]')
    return Array.isArray(model) ? (model[0] || '') : (model || '')
  } catch {
    return config.model || ''
  }
}

function normalizeModelConfig(config) {
  const modelName = config.model_id || config.value || config.model || ''
  return {
    ...config,
    id: config.model_config_id || config.id,
    name: config.name || config.label || modelName,
    model: JSON.stringify([modelName]),
    provider: config.provider || config.provider_name || '',
    provider_name: config.provider_name || config.provider || '',
    priority: Number(config.priority || 0),
  }
}

function normalizeModelConfigs(configs) {
  return Array.isArray(configs) ? configs.map(normalizeModelConfig) : []
}

const imageConfigOptions = computed(() => imageConfigs.value.map(c => ({ label: configLabel(c), value: c.id })))
const videoConfigOptions = computed(() => videoConfigs.value.map(c => ({ label: configLabel(c), value: c.id })))
const audioConfigOptions = computed(() => audioConfigs.value.map(c => ({ label: configLabel(c), value: c.id })))
const canCreateEpisode = computed(() => !!(newEpisodeImageConfigId.value && newEpisodeVideoConfigId.value && newEpisodeAudioConfigId.value))

async function load() {
  try {
    drama.value = await dramaAPI.get(dramaId)
  } catch (e) {
    toast.error(e.message)
  }
}

async function loadConfigs() {
  try {
    const modelScope = getAuthUser()?.id ? {} : { scope: 'public' }
    const [imgs, vids, auds] = await Promise.all([
      aiModelAPI.options('image', modelScope),
      aiModelAPI.options('video', modelScope),
      aiModelAPI.options('audio', modelScope),
    ])
    imageConfigs.value = normalizeModelConfigs(imgs)
    videoConfigs.value = normalizeModelConfigs(vids)
    audioConfigs.value = normalizeModelConfigs(auds)
    if (!newEpisodeImageConfigId.value && imageConfigs.value.length) newEpisodeImageConfigId.value = imageConfigs.value[0].id
    if (!newEpisodeVideoConfigId.value && videoConfigs.value.length) newEpisodeVideoConfigId.value = videoConfigs.value[0].id
    if (!newEpisodeAudioConfigId.value && audioConfigs.value.length) newEpisodeAudioConfigId.value = audioConfigs.value[0].id
  } catch (e) {
    toast.error(e.message)
  }
}

function openEpisode(ep) {
  navigateTo(`/drama/${drama.value.id}/episode/${episodeNumber(ep)}`)
}

function openAddEpisode() {
  newEpisodeTitle.value = ''
  addDialog.value = true
}

async function addEpisode() {
  try {
    creatingEpisode.value = true
    const episode = await episodeAPI.create({
      drama_id: dramaId,
      title: newEpisodeTitle.value || undefined,
      image_config_id: newEpisodeImageConfigId.value,
      video_config_id: newEpisodeVideoConfigId.value,
      audio_config_id: newEpisodeAudioConfigId.value,
    })
    toast.success('已添加新集')
    addDialog.value = false
    await load()
    const number = episode?.episode_number || episode?.episodeNumber || episodes.value.length
    navigateTo(`/drama/${dramaId}/episode/${number}`)
  } catch (e) {
    toast.error(e.message)
  } finally {
    creatingEpisode.value = false
  }
}

onMounted(() => {
  load()
  loadConfigs()
})
</script>

<style scoped>
.project-overview-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: var(--chatfire-bg-primary);
  padding: 16px 24px;
  position: relative;
}

.immersive-header {
  position: relative;
  display: flex;
  min-height: 320px;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  background: var(--chatfire-bg-secondary);
}

.immersive-header.has-cover {
  min-height: 360px;
}

.home-btn {
  position: absolute;
  top: 16px;
  left: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: rgba(0,0,0,0.5);
  border-radius: 10px;
  color: rgba(255,255,255,0.85);
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
}

.home-btn:hover {
  background: rgba(0,0,0,0.7);
  color: #fff;
  transform: scale(1.05);
}

.header-left {
  flex: 0 0 80%;
  position: relative;
  overflow: hidden;
}

.header-right {
  flex: 0 0 20%;
  display: flex;
  flex-direction: column;
  padding: 28px 32px;
  background: var(--chatfire-bg-secondary);
  z-index: 2;
}

.cover-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.cover-bg img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(to left, var(--chatfire-bg-secondary) 0%, rgba(0,0,0,0) 40%);
}

.cover-placeholder {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 30% 20%, rgba(59,130,246,0.15) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.1) 0%, transparent 50%),
    linear-gradient(135deg, #1e232d, #141923);
  overflow: hidden;
}

.cover-placeholder::before {
  content: "";
  position: absolute;
  inset: 0;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 50px, rgba(255,255,255,0.01) 50px, rgba(255,255,255,0.01) 51px),
    repeating-linear-gradient(90deg, transparent, transparent 50px, rgba(255,255,255,0.01) 50px, rgba(255,255,255,0.01) 51px);
}

.placeholder-content {
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 32px;
  border: 1px dashed rgba(255,255,255,0.1);
  border-radius: 16px;
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.3);
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}

.placeholder-content:hover {
  background: rgba(255,255,255,0.05);
  border-color: rgba(59,130,246,0.3);
  color: rgba(255,255,255,0.5);
}

.placeholder-text {
  font-size: 13px;
  color: rgba(255,255,255,0.4);
}

.placeholder-gradient {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 1;
  width: 120px;
  height: 100%;
  background: linear-gradient(to right, transparent 0%, var(--chatfire-bg-secondary) 100%);
}

.project-meta {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.project-title {
  margin: 0;
  font-size: 34px;
  font-weight: 700;
  line-height: 1.3;
  color: var(--chatfire-text-primary);
  word-break: break-word;
}

.project-description {
  margin: 0;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.project-tags .tag {
  padding: 3px 10px;
  background: rgba(59,130,246,0.12);
  border-radius: 12px;
  color: var(--chatfire-text-secondary);
  font-size: 16px;
}

.cover-action-wrapper {
  position: absolute;
  right: 20px;
  bottom: 20px;
  z-index: 10;
  display: flex;
  gap: 10px;
}

.cover-action-wrapper:hover .cover-dropdown,
.cover-action-wrapper:focus-within .cover-dropdown {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 42px;
  padding: 8px 16px;
  border: 0;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.action-btn.primary {
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
}

.action-btn.no-shadow {
  box-shadow: none;
}

.cover-icon-btn {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.9);
  backdrop-filter: blur(12px);
  transition: all 0.25s ease;
}

.cover-icon-btn:hover {
  background: rgba(0,0,0,0.65);
  border-color: rgba(255,255,255,0.25);
}

.cover-dropdown {
  position: absolute;
  right: 0;
  bottom: calc(100% + 6px);
  min-width: 130px;
  padding: 4px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  background: rgba(30,30,30,0.95);
  box-shadow: 0 8px 24px rgba(0,0,0,0.3);
  opacity: 0;
  visibility: hidden;
  transform: translateY(8px);
  transition: all 0.2s ease;
  backdrop-filter: blur(16px);
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(255,255,255,0.85);
  font-size: 12px;
  text-align: left;
  white-space: nowrap;
}

.dropdown-item:hover:not(.disabled) {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.dropdown-item.disabled {
  opacity: 0.4;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.resources-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  margin: 0;
  color: var(--chatfire-text-primary);
  font-size: 20px;
  font-weight: 600;
}

.tabs {
  width: 500px;
  max-width: 100%;
  border-radius: 10px;
}

.tabs-rail {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 165px);
  width: 500px;
  max-width: 100%;
  height: 33px;
  padding: 0;
  overflow: hidden;
  border-radius: 10px;
  background: rgba(255,255,255,0.1);
}

.tabs-capsule {
  position: absolute;
  top: 0;
  left: 0;
  width: 165px;
  height: 33px;
  border-radius: 10px;
  background: rgba(255,255,255,0.14);
  transform: translateX(calc(var(--tab-index, 0) * 165px));
  transition: transform 0.2s cubic-bezier(.4, 0, .2, 1);
}

.tab-button {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
  height: 33px;
  padding: 0 8px;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.82);
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
}

.tab-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  border-radius: 10px;
  background: rgba(59,130,246,0.4);
  font-size: 12px;
  font-weight: 600;
}

.episodes-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.episode-card {
  min-height: 200px;
  padding: 20px;
  border: 1px solid var(--chatfire-border-color);
  border-radius: 12px;
  background: var(--chatfire-card-bg);
  cursor: pointer;
  transition: all 0.2s;
}

.episode-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.episode-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.episode-number-badge {
  padding: 4px 10px;
  border: 1px solid var(--chatfire-border-color);
  border-radius: 4px;
  background: var(--chatfire-bg-secondary);
  color: var(--chatfire-text-secondary);
  font-size: 12px;
  font-weight: 500;
}

.episode-body {
  margin-bottom: 16px;
}

.episode-title {
  margin: 0 0 8px;
  color: var(--chatfire-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.episode-description {
  margin: 0 0 12px;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.episode-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--chatfire-text-secondary);
  font-size: 12px;
}

.episode-footer {
  display: flex;
  justify-content: flex-end;
  padding-top: 12px;
  border-top: 1px solid var(--chatfire-border-light);
}

.edit-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  transition: opacity 0.2s;
}

.edit-btn:hover {
  opacity: 0.7;
}

.add-episode-card {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--chatfire-border-color);
  background: transparent;
}

.add-episode-card:hover {
  background: rgba(59,130,246,0.02);
}

.add-episode-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 20px;
}

.add-icon {
  color: var(--chatfire-text-secondary);
  transition: all 0.3s;
}

.add-title {
  margin: 0;
  color: var(--chatfire-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.add-description {
  margin: 0;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
  text-align: center;
}

.add-episode-card:hover .add-icon,
.add-episode-card:hover .add-title {
  color: #3b82f6;
}

.add-episode-card:hover .add-icon {
  transform: scale(1.1);
}

.characters-grid,
.scenes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
  margin-top: 20px;
}

.character-card,
.scene-card {
  border: 1px solid var(--chatfire-border-color);
  border-radius: 12px;
  background: var(--chatfire-card-bg);
  overflow: hidden;
  transition: all 0.2s;
}

.character-card {
  padding: 20px;
}

.character-card:hover,
.scene-card:hover {
  border-color: #3b82f6;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.character-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.character-avatar {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border: 2px solid rgba(59,130,246,0.2);
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.1));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  color: #3b82f6;
}

.character-title-wrapper {
  flex: 1;
  min-width: 0;
}

.character-name,
.scene-name {
  margin: 0;
  color: var(--chatfire-text-primary);
  font-size: 16px;
  font-weight: 600;
}

.character-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}

.meta-tag {
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(59,130,246,0.2);
  color: #60a5fa;
  font-size: 11px;
  font-weight: 500;
}

.character-description,
.scene-description {
  margin: 0;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.character-description.empty,
.scene-description.empty {
  color: var(--chatfire-text-tertiary);
  font-style: italic;
}

.scene-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px 12px;
}

.scene-image {
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, rgba(34,197,94,0.05), rgba(16,185,129,0.05));
  display: flex;
  align-items: center;
  justify-content: center;
}

.scene-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-placeholder {
  color: rgba(34,197,94,0.4);
}

.scene-body {
  padding: 12px 20px 16px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--chatfire-text-secondary);
}

.empty-state.small {
  min-height: 180px;
  padding: 40px 20px;
  border: 1px dashed var(--chatfire-border-color);
  border-radius: 12px;
}

.empty-icon {
  margin-bottom: 12px;
  color: var(--chatfire-text-tertiary);
  opacity: 0.5;
}

.empty-description {
  margin: 0;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(8px);
}

.dialog {
  width: min(720px, 100%);
  padding: 22px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  background: #1e1e1e;
  box-shadow: 0 16px 42px rgba(0,0,0,0.36);
}

.dialog-head,
.dialog-foot {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog-head-copy {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.dialog-title {
  color: var(--chatfire-text-primary);
  font-size: 20px;
  font-weight: 700;
}

.dialog-badge {
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(59,130,246,0.18);
  color: #93c5fd;
  font-size: 12px;
}

.dialog-sub {
  color: var(--chatfire-text-secondary);
  font-size: 13px;
}

.dialog-close {
  padding: 7px 12px;
  border: 1px solid var(--chatfire-border-color);
  border-radius: 8px;
  background: transparent;
  color: var(--chatfire-text-secondary);
  font-size: 13px;
}

.dialog-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin: 18px 0;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  color: var(--chatfire-text-secondary);
  font-size: 12px;
  font-weight: 600;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

@media (max-width: 1024px) {
  .immersive-header {
    min-height: auto;
    flex-direction: column;
  }

  .header-left {
    flex: none;
    min-height: 240px;
  }

  .header-right {
    flex: none;
    min-height: 180px;
  }

  .cover-action-wrapper {
    position: static;
    margin-top: auto;
  }
}

@media (max-width: 768px) {
  .project-overview-container {
    padding: 16px;
  }

  .project-title {
    font-size: 28px;
  }

  .tabs-rail {
    grid-template-columns: repeat(3, 1fr);
    width: 100%;
  }

  .tabs-capsule {
    width: 33.333%;
    transform: translateX(calc(var(--tab-index, 0) * 100%));
  }

  .tab-button {
    gap: 5px;
    font-size: 13px;
  }

  .episodes-list,
  .characters-grid,
  .scenes-grid {
    grid-template-columns: 1fr;
  }

  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
