<template>
  <div class="shortvideo-container">
    <section class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">火爆短剧，就用Lovarts短剧平台</h1>
        <p class="hero-subtitle">AI Lovarts短剧平台轻松制作，让每一段故事都火起来</p>
        <div class="hero-actions">
          <button class="action-btn primary-action" type="button" @click="showCreate = true">
            <Film :size="24" />
            开始创作
          </button>
          <button class="action-btn secondary-action" type="button" @click="scrollToProjects">
            查看作品
          </button>
        </div>
      </div>

      <div class="hero-visual">
        <div class="banner-container">
          <div
            v-for="(banner, index) in banners"
            :key="banner.title"
            class="banner-slide"
            :class="{ active: index === activeBanner }"
          >
            <img class="banner-img" :src="banner.img" :alt="banner.title" />
            <div class="banner-overlay">
              <div class="banner-content">
                <h3>{{ banner.title }}</h3>
                <p>{{ banner.desc }}</p>
              </div>
            </div>
            <button class="carousel-arrow prev" type="button" aria-label="上一张" @click="prevBanner">
              <ChevronLeft :size="27" />
            </button>
            <button class="carousel-arrow next" type="button" aria-label="下一张" @click="nextBanner">
              <ChevronRight :size="27" />
            </button>
          </div>
          <div class="banner-dots" aria-hidden="true">
            <span v-for="(_, index) in banners" :key="index" :class="{ active: index === activeBanner }"></span>
          </div>
        </div>
      </div>
    </section>

    <section ref="projectsSection" class="section">
      <div class="section-header">
        <h2 class="section-title">我的项目</h2>
        <div class="section-actions">
          <button class="action-btn secondary-action small" type="button" @click="showCreate = true">
            <Plus :size="16" />
            新建项目
          </button>
        </div>
      </div>

      <div v-if="loading" class="project-grid">
        <div v-for="i in 6" :key="i" class="project-card skeleton-card"></div>
      </div>

      <div v-else-if="filteredDramas.length" class="project-grid">
        <article
          v-for="drama in filteredDramas"
          :key="drama.id"
          class="project-card"
          @click="navigateTo(`/drama/${drama.id}`)"
        >
          <div class="card-cover" :style="coverStyle(drama)">
            <div class="card-shade"></div>
            <div class="card-header">
              <button class="card-icon-btn ai-btn" type="button" title="AI生成封面" @click.stop>
                <Sparkles :size="16" />
              </button>
              <button class="card-icon-btn edit-btn" type="button" title="编辑项目" @click.stop="openEdit(drama)">
                <Pencil :size="16" />
              </button>
              <button class="card-icon-btn delete-btn" type="button" title="删除项目" @click.stop="delDrama(drama)">
                <Trash2 :size="16" />
              </button>
            </div>
            <div class="card-info">
              <div class="card-title">{{ drama.title }}</div>
              <div class="card-time">{{ fmtDate(drama.updated_at || drama.updatedAt || drama.created_at) }}</div>
            </div>
          </div>

          <div class="episodes-container">
            <div class="episodes-header">
              <span class="episodes-title">集数</span>
              <button class="add-episode-btn" type="button" title="新建集" @click.stop>
                <Plus :size="14" />
              </button>
            </div>
            <div class="episodes-grid">
              <button
                v-for="(episode, index) in visibleEpisodes(drama)"
                :key="episode.id || index"
                class="episode-item"
                :class="episodeClass(episode)"
                type="button"
                @click.stop="navigateTo(`/drama/${drama.id}/episode/${episode.episode_number || episode.episodeNumber || index + 1}`)"
              >
                <span class="episode-number">{{ index + 1 }}</span>
                <span class="episode-status">{{ episodeStatus(episode) }}</span>
              </button>
              <button v-if="episodesOf(drama).length > 5" class="episode-more" type="button" @click.stop>
                ...
              </button>
            </div>
          </div>
        </article>
      </div>

      <div v-else class="empty-state">
        <div class="empty-icon">
          <Clapperboard :size="48" />
        </div>
        <h3>还没有项目</h3>
        <p>创建你的第一个短剧项目，开始精彩的创作之旅</p>
        <button class="action-btn primary-action" type="button" @click="showCreate = true">
          <Plus :size="18" />
          创建新项目
        </button>
      </div>
    </section>

    <div v-if="showCreate" class="overlay" @click.self="closeCreate">
      <div class="create-dialog">
        <button class="dialog-close" type="button" aria-label="关闭" @click="closeCreate">
          <X :size="22" />
        </button>
        <div class="modal-header">
          <h2 class="modal-title">{{ editingDrama ? '编辑项目' : '创建新项目' }}</h2>
        </div>
        <form class="create-project-modal" @submit.prevent="submitDrama">
          <div class="modal-content">
            <div class="content-grid">
              <div class="left-panel">
                <section class="panel-section">
                  <div class="section-header modal-section-header">
                    <ListTodo :size="20" class="section-icon" />
                    <h3 class="modal-section-title">基本信息</h3>
                  </div>
                  <label class="form-section">
                    <span class="form-label">项目名称</span>
                    <div class="count-input">
                      <input v-model="form.title" maxlength="30" placeholder="请输入项目名称" required autofocus />
                      <span>{{ form.title.length }} / 30</span>
                    </div>
                  </label>
                  <div class="form-section">
                    <span class="form-label">视频比例</span>
                    <div class="ratio-options">
                      <button
                        v-for="ratio in ratioOptions"
                        :key="ratio.value"
                        type="button"
                        :class="['ratio-option', { active: form.ratio === ratio.value }]"
                        @click="form.ratio = ratio.value"
                      >
                        <span :class="['ratio-preview', ratio.value === '9:16' ? 'portrait' : 'landscape']"></span>
                        <span class="ratio-copy">
                          <strong>{{ ratio.label }}</strong>
                          <small>{{ ratio.value }}</small>
                        </span>
                      </button>
                    </div>
                  </div>
                </section>

                <section class="panel-section">
                  <div class="section-header modal-section-header">
                    <Clapperboard :size="20" class="section-icon" />
                    <h3 class="modal-section-title">剧集类型</h3>
                  </div>
                  <div class="selector-title">选择类型 <span>（最多选择3个）</span></div>
                  <div class="style-list">
                    <button
                      v-for="genre in genreOptions"
                      :key="genre"
                      type="button"
                      :class="['style-item', { active: form.genres.includes(genre) }]"
                      @click="toggleGenre(genre)"
                    >
                      <span>{{ genre }}</span>
                      <span v-if="form.genres.includes(genre)" class="check-mark">✓</span>
                    </button>
                  </div>
                </section>
              </div>

              <div class="right-panel">
                <section class="panel-section full-height">
                  <div class="section-header modal-section-header">
                    <Palette :size="20" class="section-icon" />
                    <h3 class="modal-section-title">艺术风格</h3>
                  </div>
                  <div class="category-tabs">
                    <button
                      v-for="category in artStyleCategories"
                      :key="category.name"
                      type="button"
                      :class="['category-tab', { active: activeArtCategory === category.name }]"
                      @click="activeArtCategory = category.name"
                    >
                      {{ category.name }}
                    </button>
                  </div>
                  <div class="styles-grid">
                    <button
                      v-for="style in activeArtStyles"
                      :key="style.value"
                      type="button"
                      :class="['style-btn', { active: form.style === style.value }]"
                      @click="form.style = style.value"
                    >
                      <span class="style-image">
                        <img :src="style.image" :alt="style.label" />
                        <span class="image-hover-overlay">
                          <span>{{ style.label }}</span>
                        </span>
                      </span>
                      <span class="style-caption">{{ style.label }}</span>
                      <span v-if="form.style === style.value" class="style-check">✓</span>
                    </button>
                  </div>
                </section>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="action-btn text-action" type="button" @click="closeCreate">取消</button>
            <button :class="['action-btn', 'primary-action', { disabled: !form.title.trim() }]" type="submit" :disabled="!form.title.trim()">
              {{ editingDrama ? '保存项目' : '创建项目' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { ChevronLeft, ChevronRight, Clapperboard, Film, ListTodo, Palette, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-vue-next'
import { dramaAPI } from '~/composables/useApi'

const dramas = ref([])
const loading = ref(false)
const showCreate = ref(false)
const editingDrama = ref(null)
const projectsSection = ref(null)
const activeBanner = ref(0)
let bannerTimer

const banners = [
  {
    title: 'AI短剧创作',
    desc: '用人工智能技术，轻松创作精彩短剧内容',
    img: 'https://ffile.chatfire.site/image/covers/banner01.png',
  },
  {
    title: 'AI短剧创作',
    desc: '用人工智能技术，轻松创作精彩短剧内容',
    img: 'https://ffile.chatfire.site/image/covers/banner02.png',
  },
]

const form = ref({ title: '', total_episodes: 1, style: 'minecraft', ratio: '16:9', genres: ['通用'], description: '' })
const activeArtCategory = ref('3D动画')
const genreOptions = ['通用', '言情', '悬疑', '喜剧', '动作', '古装', '现代', '科幻', '奇幻', '历史', '都市', '校园']
const ratioOptions = [
  { label: '横屏', value: '16:9' },
  { label: '竖屏', value: '9:16' },
]
const artStyleCategories = [
  {
    name: '3D动画',
    styles: [
      { label: '方块世界', value: 'minecraft', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/MINECRAFT_165c1642-3fb4-491f-b8cb-97fc38b4e7fe.jpg' },
      { label: '3D国创', value: 'xianxia_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/XIANXIA_3D_496787d9-21cb-41d8-ad08-bf0e5c36585f.jpg' },
      { label: '美式3D', value: 'pixar_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/PIXAR_3D_1bb85719-cbb5-48c9-abae-4ef1319be0e2.jpg' },
      { label: 'Q版3D', value: 'chibi_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CHIBI_3D_8f5c1e10-1c0f-4e60-b376-b5ca6d02937d.jpg' },
      { label: '粘土玩具', value: 'clay_toy', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CLAY_TOY_f64f689b-f760-48af-aa13-04e7c3f62571.jpg' },
      { label: '低多边形', value: 'low_poly', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/LOW_POLY_7c4b60ee-b9e4-4484-8d37-61df2ef7a3d0.jpg' },
      { label: '照片级3D', value: 'realistic_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/REALISTIC_3D_16a60b53-f3e1-4a42-afbf-6fbe935dbe88.jpg' },
      { label: '卡通渲染', value: 'toon_shader', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/TOON_SHADER_b0b2cf6e-727b-4534-bf7f-442533a41e8d.jpg' },
    ],
  },
  {
    name: '动漫风格',
    styles: [
      { label: '三渲二', value: 'stylized_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/STYLIZED_3D_e655af3f-912c-42bb-97d0-b2d4ea785e86.jpg' },
      { label: '吉卜力', value: 'ghibli', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/GHIBLI_e172df32-7859-4548-8658-66cc4f15c5de.jpg' },
      { label: '木叶村', value: 'naruto', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/NARUTO_49fdf767-bd7e-4d68-a509-f5be58d4c6c2.jpg' },
      { label: '名侦探阿楠', value: 'conan', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CONAN_601f4eda-4917-4fc9-bb7b-7a5a6f7baccb.jpg' },
      { label: '海贼王', value: 'one_piece', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/ONE_PIECE_64e0fa56-b662-4733-996f-481b69719996.jpg' },
      { label: '鬼灭之刃', value: 'demon_slayer', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/DEMON_SLAYER_da88cced-23fe-48df-8fb2-a4ccb44d32c0.jpg' },
      { label: 'JoJo', value: 'jojo', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/JOJO_39f98274-ff44-4cd6-aa3e-4056fe7e0fe8.jpg' },
      { label: '宝可梦', value: 'pokemon', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/POKEMON_b5c4c635-875b-4f4b-aa58-0a5549558838.jpg' },
      { label: '原神', value: 'genshin', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/GENSHIN_bff4e054-ee0b-4e22-857d-5e96587f8e1d.jpg' },
      { label: '2D动漫', value: 'anime_2d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/ANIME_2D_62467e16-dd17-4388-815b-a047e116f492.jpg' },
      { label: '3D动漫', value: 'anime_3d', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/ANIME_3D_0bded46f-a723-4969-b2c3-822da7261530.jpg' },
      { label: '赛璐璐', value: 'cel_shading', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CEL_SHADING_5e9514a7-f709-47aa-8f5a-ac6467651f86.jpg' },
      { label: '少女漫画', value: 'shoujo', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/SHOUJO_085e1817-af1b-47c9-904e-95235768361a.jpg' },
      { label: '少年漫画', value: 'shounen', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/SHOUNEN_2ba4b065-189c-419a-a6af-1e8a44fe54b5.jpg' },
    ],
  },
  {
    name: '可爱Q版',
    styles: [
      { label: '日系Q版', value: 'chibi_anime', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CHIBI_ANIME_157d7c34-12b5-4136-8c0d-d6e7e418d43b.jpg' },
      { label: '治愈Q萌', value: 'lofi_chibi', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/LOFI_CHIBI_e56b8c56-5699-48e3-b89c-552463dbbba2.jpg' },
    ],
  },
  {
    name: '插画艺术',
    styles: [
      { label: '空灵哥特', value: 'ethereal_gothic', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/ETHEREAL_GOTHIC_fdba349a-e588-438d-b5d8-3e15df7e8b2d.jpg' },
      { label: '温馨彩绘', value: 'cozy_watercolor', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/COZY_WATERCOLOR_b32d6f22-d4a9-4dd6-bb02-0802ed758078.jpg' },
      { label: '潮流都市', value: 'city_pop', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CITY_POP_7405aea0-84fd-4935-9cec-f1a72e52ca83.jpg' },
      { label: '复古海报', value: 'vintage_poster', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/VINTAGE_POSTER_fa62187a-944a-486e-9da7-2a96bc8486ee.jpg' },
      { label: '水墨风', value: 'ink_painting', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/INK_PAINTING_56a76de2-e113-4f41-84e9-f96fe0d85dac.jpg' },
      { label: '美式漫画', value: 'comic_book', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/COMIC_BOOK_a45eec26-b1e5-4c55-a7af-425add8beb1f.jpg' },
      { label: '蒸汽波', value: 'vaporwave', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/VAPORWAVE_8f4d67a2-d6c6-4916-b216-e82f5e147336.jpg' },
      { label: '像素艺术', value: 'pixel_art', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/PIXEL_ART_3aedb941-8cfd-4555-b496-e75c9acecf68.jpg' },
      { label: '童话绘本', value: 'storybook', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/STORYBOOK_dd8495cf-4892-4d06-ad76-2dc80c37c5bb.jpg' },
      { label: '黑白漫画', value: 'noir', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/NOIR_97cb4fbf-1b3b-4d97-ae6a-99a73ec7ba3c.jpg' },
      { label: '手绘草图', value: 'sketch', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/SKETCH_f11bbe87-eff4-46bd-b831-f18863fbf308.jpg' },
    ],
  },
  {
    name: '都市言情',
    styles: [
      { label: '女频漫画', value: 'shoujo_dream', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/SHOUJO_DREAM_80323597-b1ff-4ebd-ac11-1c3d33418caf.jpg' },
      { label: '韩系都市', value: 'k_drama', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/K_DRAMA_7fed36c7-5857-4281-a284-caaa34e61837.jpg' },
      { label: '都市言情', value: 'city_romance', image: 'https://cf.chatfire.site/chatfire-short-drama/art-styles/CITY_ROMANCE_060b3027-e469-44ad-8d87-5e8d030248f8.jpg' },
    ],
  },
  {
    name: '写实风格',
    styles: [
      { label: '电影写实', value: 'cinematic', image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=360&q=80' },
      { label: '照片写实', value: 'realistic', image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=360&q=80' },
      { label: '纪录片感', value: 'documentary', image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=360&q=80' },
    ],
  },
]
const activeArtStyles = computed(() => artStyleCategories.find(item => item.name === activeArtCategory.value)?.styles || artStyleCategories[0].styles)

const filteredDramas = computed(() => {
  return dramas.value
})

async function load() {
  loading.value = true
  try {
    const res = await dramaAPI.list()
    dramas.value = res.items || []
  } catch (e) {
    toast.error(e.message)
  } finally {
    loading.value = false
  }
}

async function submitDrama() {
  if (!form.value.title?.trim()) return
  try {
    const selectedStyle = artStyleCategories.flatMap(category => category.styles.map(style => ({
      ...style,
      category: category.name,
    }))).find(style => style.value === form.value.style)
    const payload = {
      title: form.value.title,
      total_episodes: editingDrama.value ? form.value.total_episodes : 1,
      genre: form.value.genres?.join('、') || '通用',
      style: form.value.style,
      description: buildProjectDescription(),
      metadata: JSON.stringify({
        ratio: form.value.ratio,
        genres: form.value.genres || ['通用'],
        style: form.value.style,
        style_label: selectedStyle?.label || form.value.style,
        style_category: selectedStyle?.category || activeArtCategory.value,
      }),
    }
    if (editingDrama.value) {
      await dramaAPI.update(editingDrama.value.id, payload)
      toast.success('已保存')
      closeCreate()
      await load()
      return
    }

    const drama = await dramaAPI.create(payload)
    closeCreate()
    navigateTo(`/drama/${drama.id}`)
  } catch (e) {
    toast.error(e.message)
  }
}

function buildProjectDescription() {
  const parts = []
  if (form.value.description?.trim()) parts.push(form.value.description.trim())
  if (form.value.genres?.length) parts.push(`类型：${form.value.genres.join('、')}`)
  if (form.value.ratio) parts.push(`视频比例：${form.value.ratio}`)
  return parts.join('\n')
}

function toggleGenre(genre) {
  const selected = form.value.genres || []
  if (selected.includes(genre)) {
    if (selected.length === 1) return
    form.value.genres = selected.filter(item => item !== genre)
    return
  }
  if (selected.length >= 3) {
    toast.info('最多选择 3 个剧集类型')
    return
  }
  form.value.genres = [...selected, genre]
}

function openEdit(drama) {
  editingDrama.value = drama
  form.value = {
    title: drama.title || '',
    total_episodes: episodesOf(drama).length || drama.total_episodes || 1,
    style: drama.style || 'minecraft',
    ratio: '16:9',
    genres: ['通用'],
    description: drama.description || '',
  }
  showCreate.value = true
}

function closeCreate() {
  showCreate.value = false
  editingDrama.value = null
  form.value = { title: '', total_episodes: 1, style: 'minecraft', ratio: '16:9', genres: ['通用'], description: '' }
}

async function delDrama(drama) {
  if (!confirm(`确定删除「${drama.title}」？此操作不可恢复。`)) return
  try {
    await dramaAPI.del(drama.id)
    toast.success('已删除')
    load()
  } catch (e) {
    toast.error(e.message)
  }
}

function scrollToProjects() {
  projectsSection.value?.scrollIntoView({ behavior: 'smooth' })
}

function nextBanner() {
  activeBanner.value = (activeBanner.value + 1) % banners.length
}

function prevBanner() {
  activeBanner.value = (activeBanner.value - 1 + banners.length) % banners.length
}

function episodesOf(drama) {
  return Array.isArray(drama.episodes) ? drama.episodes : []
}

function visibleEpisodes(drama) {
  return episodesOf(drama).slice(0, 5)
}

function episodeStatus(episode) {
  if (episode.video_url || episode.videoUrl) return '完成'
  if (episode.script_content || episode.scriptContent || episode.content) return '制作'
  return '待配'
}

function episodeClass(episode) {
  if (episode.video_url || episode.videoUrl) return 'configured'
  if (episode.script_content || episode.scriptContent || episode.content) return 'in-progress'
  return 'not-configured'
}

function coverStyle(drama) {
  const src = drama.thumbnail || drama.cover_url || drama.coverImageUrl
  if (src) return { backgroundImage: `url(${src})` }

  const palettes = [
    ['#0f7ad9', '#0a1929', '#65a9ff'],
    ['#6d28d9', '#151025', '#c084fc'],
    ['#047857', '#071f1a', '#5eead4'],
    ['#be123c', '#220913', '#fb7185'],
    ['#c2410c', '#21130b', '#fdba74'],
  ]
  const palette = palettes[Number(drama.id || 0) % palettes.length]
  return {
    background:
      `linear-gradient(180deg, rgba(55,65,81,0.92) 0%, rgba(17,24,39,0.94) 100%)`,
  }
}

function fmtDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

onMounted(() => {
  load()
  bannerTimer = window.setInterval(() => {
    nextBanner()
  }, 4000)
})

onBeforeUnmount(() => {
  if (bannerTimer) window.clearInterval(bannerTimer)
})
</script>

<style scoped>
.shortvideo-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
  background: transparent;
}

.hero-section {
  display: flex;
  align-items: center;
  gap: 40px;
  min-height: 280px;
  margin-bottom: 32px;
  padding: 32px 40px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--chatfire-bg-primary) 0%, var(--chatfire-bg-secondary) 100%);
}

.hero-content {
  flex: 0 0 400px;
}

.hero-title {
  margin: 0 0 16px;
  font-size: 42px;
  font-weight: 700;
  line-height: 1.2;
  color: var(--chatfire-text-primary);
  background: linear-gradient(135deg, #0f7ad9, var(--chatfire-color-accent));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  margin: 0 0 32px;
  color: #9ca3af;
  font-size: 18px;
  line-height: 1.6;
}

.hero-actions,
.section-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 24px;
  border: 0;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-btn.small {
  min-height: 44px;
  padding: 12px 24px;
  font-size: 16px;
}

.primary-action {
  background: linear-gradient(135deg, #e9e7ff 0%, #8bdcff 100%);
  color: #0f172a;
}

.primary-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 24px rgba(59,130,246,0.4);
}

.secondary-action {
  border: 1px solid var(--chatfire-border-light);
  background: var(--chatfire-bg-elevated);
  color: #f3f4f6;
}

.secondary-action:hover {
  background: var(--chatfire-bg-hover);
}

.hero-visual {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex: 1;
  min-width: 0;
}

.banner-container {
  position: relative;
  width: 100%;
  height: 320px;
  overflow: hidden;
  border-radius: 16px;
  box-shadow: none;
}

.banner-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.45s ease;
}

.banner-slide.active {
  opacity: 1;
}

.banner-img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.banner-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  padding: 24px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.3), rgba(0,0,0,0.7));
}

.banner-content {
  color: #fff;
}

.banner-content h3 {
  margin: 0 0 8px;
  font-size: 24px;
  font-weight: 700;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.banner-content p {
  margin: 0;
  margin-bottom: 16px;
  font-size: 16px;
  opacity: 0.9;
}

.banner-dots {
  position: absolute;
  left: 50%;
  bottom: 16px;
  display: flex;
  gap: 6px;
  transform: translateX(-50%);
}

.banner-dots span {
  width: 28px;
  height: 4px;
  border-radius: 4px;
  background: rgba(255,255,255,0.45);
}

.banner-dots span.active {
  background: #fff;
}

.carousel-arrow {
  position: absolute;
  right: 16px;
  bottom: 22px;
  z-index: 5;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: rgba(0,0,0,0.3);
  color: #fff;
}

.carousel-arrow.prev {
  right: 54px;
}

.section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-actions {
  position: static;
}

.section-title {
  margin: 0;
  color: var(--chatfire-text-primary);
  font-size: 28px;
  font-weight: 600;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.project-card {
  width: 100%;
  overflow: hidden;
  max-width: none;
  border-radius: 12px;
  background: #171f2d;
  cursor: pointer;
  transition: all 0.3s ease;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.4);
}

.card-cover {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  aspect-ratio: 16 / 9;
  padding: 12px;
  overflow: hidden;
  background-color: var(--chatfire-bg-tertiary);
  background-size: cover;
  background-position: center;
}

.card-shade {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.75) 100%);
}

.card-header,
.card-info {
  position: relative;
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.project-card:hover .card-header {
  opacity: 1;
}

.card-icon-btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 50%;
  background: rgba(255,255,255,0.1);
  color: #fff;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
}

.ai-btn:hover {
  background: rgba(139,92,246,0.8);
}

.edit-btn:hover {
  background: rgba(59,130,246,0.8);
}

.delete-btn:hover {
  background: rgba(239,68,68,0.8);
}

.card-title {
  width: 100%;
  margin-bottom: 4px;
  overflow: hidden;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  text-overflow: ellipsis;
  text-shadow: 0 1px 2px rgba(0,0,0,0.8);
  white-space: nowrap;
}

.card-time {
  color: var(--chatfire-text-secondary);
  font-size: 12px;
}

.episodes-container {
  width: 100%;
  padding: 12px;
  border-top: 1px solid var(--chatfire-border-color);
}

.episodes-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.episodes-title {
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.episodes-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 120px;
  overflow-y: auto;
  padding: 6px 0;
}

.add-episode-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 1px solid rgba(59,130,246,0.5);
  border-radius: 6px;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: #fff;
  box-shadow: 0 2px 8px rgba(59,130,246,0.3);
}

.episode-item,
.episode-more {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border: 2px solid var(--chatfire-card-episode-border);
  border-radius: 6px;
  background: var(--chatfire-card-episode-bg);
  color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: all 0.2s ease;
}

.episode-item:hover,
.episode-more:hover {
  transform: scale(1.05);
}

.episode-item.configured {
  background: var(--chatfire-episode-configured-bg);
  border-color: var(--chatfire-episode-configured-border);
}

.episode-item.in-progress {
  background: var(--chatfire-episode-progress-bg);
  border-color: var(--chatfire-episode-progress-border);
}

.episode-item.not-configured {
  background: var(--chatfire-episode-unconfigured-bg);
  border-color: var(--chatfire-episode-unconfigured-border);
}

.episode-number {
  font-size: 14px;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
}

.episode-status {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  padding: 1px 0;
  background: var(--chatfire-card-tag-bg);
  color: #fff;
  font-size: 7px;
  text-align: center;
  transform: translateY(100%);
  transition: transform 0.2s ease;
}

.episode-item:hover .episode-status {
  transform: translateY(0);
}

.episode-more {
  border: 0;
  background: var(--chatfire-card-episode-more-bg);
  font-size: 14px;
}

.empty-state {
  padding: 64px 24px;
  border: 2px dashed var(--chatfire-border);
  border-radius: 20px;
  background: var(--chatfire-bg-elevated);
  text-align: center;
}

.empty-icon {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
  color: var(--chatfire-text-tertiary);
}

.empty-state h3 {
  margin: 0 0 12px;
  color: var(--chatfire-text-primary);
  font-size: 24px;
  font-weight: 600;
}

.empty-state p {
  max-width: 400px;
  margin: 0 auto 32px;
  color: var(--chatfire-text-secondary);
  font-size: 16px;
}

.skeleton-card {
  min-height: 260px;
  background: linear-gradient(90deg, #1f2937 25%, #2b3545 50%, #1f2937 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

@keyframes shimmer {
  to { background-position: -200% 0; }
}

.overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0,0,0,0.62);
  backdrop-filter: blur(8px);
}

.create-dialog {
  position: relative;
  width: min(1040px, calc(100vw - 96px));
  max-height: min(780px, calc(100vh - 84px));
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,0.11);
  border-radius: 8px;
  background: #202224;
  color: #fff;
  box-shadow: 0 22px 70px rgba(0,0,0,0.56);
  overflow: hidden;
}
.dialog-close {
  position: absolute;
  top: 12px;
  right: 16px;
  z-index: 2;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(255,255,255,0.55);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.dialog-close:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.86);
}
.modal-header {
  height: 54px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.modal-title {
  margin: 0;
  font-size: 18px;
  font-weight: 650;
  color: rgba(255,255,255,0.9);
}
.create-project-modal {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}
.modal-content {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 20px 24px 16px;
}
.content-grid {
  display: grid;
  grid-template-columns: 330px minmax(0, 1fr);
  gap: 20px;
}
.left-panel,
.right-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.panel-section {
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  background: rgba(255,255,255,0.025);
  padding: 16px;
}
.panel-section.full-height {
  height: 100%;
  min-height: 468px;
}
.modal-section-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  margin-bottom: 13px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.section-icon {
  color: rgba(255,255,255,0.82);
}
.modal-section-title {
  margin: 0;
  color: rgba(255,255,255,0.88);
  font-size: 15px;
  font-weight: 650;
}
.form-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}
.form-section:last-child {
  margin-bottom: 0;
}
.form-label,
.selector-title {
  color: rgba(255,255,255,0.82);
  font-size: 13px;
  font-weight: 650;
}
.selector-title span {
  color: rgba(255,255,255,0.42);
  font-weight: 400;
}
.count-input,
.modal-input {
  height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.86);
}
.count-input {
  display: flex;
  align-items: center;
  padding: 0 14px;
}
.count-input input,
.modal-input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: rgba(255,255,255,0.86);
  font-size: 14px;
}
.modal-input {
  padding: 0 14px;
}
.count-input input::placeholder {
  color: rgba(255,255,255,0.38);
}
.count-input span {
  flex: 0 0 auto;
  color: rgba(255,255,255,0.52);
  font-size: 13px;
}
.count-input:focus-within,
.modal-input:focus {
  border-color: #409cff;
  background: rgba(10,132,255,0.1);
  box-shadow: 0 0 8px rgba(10,132,255,0.3);
}
.ratio-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.ratio-option {
  height: 52px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 6px;
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  cursor: pointer;
}
.ratio-option.active {
  border-color: #0a84ff;
  background: rgba(10,132,255,0.12);
}
.ratio-preview {
  width: 40px;
  height: 24px;
  border-radius: 4px;
  background: linear-gradient(135deg, #ffc6de, #8ad9ff);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28);
}
.ratio-preview.portrait {
  width: 22px;
  height: 36px;
}
.ratio-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  text-align: left;
}
.ratio-copy strong {
  font-size: 14px;
}
.ratio-copy small {
  color: rgba(255,255,255,0.52);
  font-size: 12px;
}
.style-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 12px;
}
.style-item {
  height: 36px;
  border: 1px solid transparent;
  border-radius: 6px;
  background: rgba(25,30,35,0.8);
  color: rgba(255,255,255,0.76);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
}
.style-item.active {
  border-color: #0a84ff;
  background: rgba(10,132,255,0.1);
  color: #9bd2ff;
}
.check-mark {
  color: #8bdcff;
  font-weight: 700;
}
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.category-tab {
  height: 32px;
  border: 1px solid rgba(255,255,255,0.16);
  border-radius: 7px;
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.78);
  padding: 0 14px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.category-tab.active {
  border-color: #0a84ff;
  color: #4aa3ff;
  background: rgba(10,132,255,0.08);
}
.styles-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  padding-top: 14px;
}
.style-btn {
  position: relative;
  border: 2px solid transparent;
  border-radius: 8px;
  background: rgba(255,255,255,0.045);
  padding: 0;
  overflow: hidden;
  cursor: pointer;
}
.style-btn.active {
  border-color: #0a84ff;
  box-shadow: 0 0 0 1px rgba(10,132,255,0.35);
}
.style-image {
  position: relative;
  display: block;
  aspect-ratio: 1 / 1.12;
  overflow: hidden;
  background: rgba(0,0,0,0.25);
}
.style-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.image-hover-overlay {
  position: absolute;
  inset: auto 0 0;
  min-height: 36px;
  display: flex;
  align-items: flex-end;
  padding: 8px;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  background: linear-gradient(180deg, transparent, rgba(0,0,0,0.62));
}
.style-caption {
  display: none;
}
.style-check {
  position: absolute;
  top: 7px;
  right: 7px;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: #0a84ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 800;
}
.modal-footer {
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px;
  border-top: 1px solid rgba(255,255,255,0.08);
}
.modal-footer .action-btn {
  min-height: 36px;
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
}
.text-action {
  min-height: 36px;
  background: transparent;
  color: rgba(255,255,255,0.86);
}
.primary-action.disabled,
.primary-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (max-width: 1024px) {
  .hero-section {
    flex-direction: column;
    align-items: stretch;
    min-height: auto;
    padding: 32px 24px;
    text-align: center;
  }

  .hero-content {
    flex: none;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-title {
    font-size: 36px;
  }

  .hero-visual {
    justify-content: center;
  }
}

@media (max-width: 768px) {
  .hero-section {
    padding: 24px 16px;
  }

  .hero-title {
    font-size: 28px;
  }

  .hero-subtitle {
    font-size: 16px;
  }

  .banner-container {
    height: 240px;
  }

  .section {
    padding: 0 16px;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .section-title {
    font-size: 24px;
  }

  .project-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  }

  .field-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .project-grid {
    grid-template-columns: 1fr;
  }
}
</style>
