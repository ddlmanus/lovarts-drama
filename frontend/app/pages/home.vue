<template>
  <div class="inspiration-page">
    <section class="creative-grid">
      <div class="grid-main">
        <div class="left-banner" @mouseenter="pauseAuto = true" @mouseleave="pauseAuto = false">
          <div class="n-carousel n-carousel--bottom n-carousel--horizontal n-carousel--slide">
            <div
              class="n-carousel__slides"
              role="listbox"
              :style="{ transform: `translateX(-${activeBanner * 100}%)` }"
            >
              <div
                v-for="(banner, index) in banners"
                :key="banner.title"
                class="n-carousel__slide"
                :class="{
                  'n-carousel__slide--current': index === activeBanner,
                  'n-carousel__slide--prev': index === (activeBanner + banners.length - 1) % banners.length,
                  'n-carousel__slide--next': index === (activeBanner + 1) % banners.length,
                }"
                role="option"
                tabindex="-1"
                :aria-hidden="index === activeBanner ? 'false' : 'true'"
              >
                <div class="banner-item">
                  <img
                    :src="banner.image"
                    :alt="banner.title"
                    class="banner-img"
                    decoding="async"
                    :loading="index === activeBanner ? 'eager' : 'lazy'"
                    :fetchpriority="index === activeBanner ? 'high' : 'low'"
                  />
                </div>
              </div>
            </div>
            <div class="n-carousel__dots n-carousel__dots--dot" role="tablist">
              <button
                v-for="(_, index) in banners"
                :key="index"
                type="button"
                class="n-carousel__dot"
                :class="{ 'n-carousel__dot--active': index === activeBanner }"
                :aria-selected="index === activeBanner ? 'true' : 'false'"
                @click="activeBanner = index"
              ></button>
            </div>
          </div>
        </div>

        <div class="right-apps">
          <article v-for="app in quickApps" :key="app.title" class="app-card">
            <div class="card-bg" :style="{ backgroundImage: `url(${app.image})` }"></div>
            <div class="card-overlay"></div>
            <div class="card-content">
              <h3 class="card-title">{{ app.title }}</h3>
              <p class="card-desc">{{ app.desc }}</p>
            </div>
            <div class="card-actions">
              <button class="action-btn primary-btn" type="button" @click="usePrompt(app.prompt)">
                <Brush :size="15" />
                <span>画同款</span>
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section class="gallery-section">
      <div class="gallery-header">
        <h2>创作广场</h2>
        <div class="media-tabs" role="tablist" aria-label="创作类型">
          <button
            v-for="tab in mediaTabs"
            :key="tab"
            type="button"
            :class="{ active: activeTab === tab }"
            @click="activeTab = tab"
          >
            {{ tab }}
          </button>
        </div>
      </div>

      <div class="waterfall-shell">
        <div class="waterfall-container">
          <div v-for="(column, index) in waterfallColumns" :key="index" class="waterfall-column">
            <article
              v-for="item in column"
              :key="item.id"
              class="idea-card"
              :style="{ height: `${item.height}px` }"
            >
              <img :src="item.image" :alt="item.prompt" loading="lazy" decoding="async" />
              <div class="idea-overlay">
                <p>{{ item.prompt }}</p>
                <div class="idea-actions">
                  <button type="button" @click="copyPrompt(item.prompt)">
                    <Copy :size="14" />
                    <span>复制</span>
                  </button>
                  <button type="button" @click="createVariant(item)">
                    <WandSparkles :size="14" />
                    <span>二创</span>
                  </button>
                  <button type="button" @click="usePrompt(item.prompt)">
                    <Brush :size="14" />
                    <span>画同款</span>
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <MaterialInput v-model="prompt" :external-reference-image="externalReferenceImage" />
  </div>
</template>

<script setup>
import {
  Brush,
  Copy,
  WandSparkles,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'

const banners = [
  { title: '诗和远方', image: '/inspiration/banner02-1fad6df8.png' },
  { title: '疯狂动物城', image: '/inspiration/banner03-e0c5e3e9.png' },
  { title: '圣诞装扮', image: '/inspiration/banner01-2357139b.png' },
]

const quickApps = [
  {
    title: '戴个圣诞帽',
    desc: '一键为照片添加圣诞帽',
    image: '/inspiration/christmas-cover-289ca5fb.png',
    prompt: '保留原图质感，为图片添加圣诞帽，帽子方向向右。人物不要动',
  },
  {
    title: '疯狂动物城',
    desc: '与动物城明星合影',
    image: '/inspiration/cover01-9795e1da.png',
    prompt: '把人物放入疯狂动物城风格街景，与动物城明星自然合影，保持照片质感',
  },
  {
    title: '圣诞装扮',
    desc: '圣诞魔法，温馨变装',
    image: '/inspiration/sd1-985f634a.jpg',
    prompt: '圣诞主题温馨变装，柔和灯光，节日氛围，保留人物面部特征',
  },
  {
    title: '诗和远方',
    desc: '诗意旅程，自由浪漫',
    image: '/inspiration/p1-1-db910279.jpg',
    prompt: '诗意远方旅行大片，自由浪漫，电影质感，自然光，细腻色彩',
  },
]

const galleryItems = [
  {
    id: 1,
    type: '图片',
    height: 426.6,
    image: '/inspiration/f2211ac0bae6484898a0b340f43528e7_20251221_095955_26cd6c2e-8269a20a.png',
    prompt: '高定羊毛毡作品，巨大的红色萝卜房子，郁郁葱葱的花园，色彩鲜艳明快，温馨童话氛围，超高清细节。',
  },
  {
    id: 2,
    type: '图片',
    height: 284.4,
    image: '/inspiration/f4708e578e054f31ba3a0f90fc4c0edf_20251217_160656_132cf4eb-3e044e00.png',
    prompt: '保留原图质感，为图片添加圣诞帽，帽子方向向右。人物不要动。',
  },
  {
    id: 3,
    type: '图片',
    height: 284.4,
    image: '/inspiration/9ccaf4f0707b47c99d7b685bc710dddf_20250730_113041_a2f5a0d5-6906c221.jpg',
    prompt: '梅西的卡通图像，抽象夸张，高清细节，深蓝色背景，3D 卡通，伦勃朗光。',
  },
  {
    id: 4,
    type: '图片',
    height: 159.9,
    image: '/inspiration/8db982b2461343d0814f9f685115b837_20251217_233155_c3a7f5dc-a5f45f20.png',
    prompt: 'Anime magical girl warrior, vibrant colors, dynamic pose, fantasy setting, glowing magical aura.',
  },
  {
    id: 5,
    type: '图片',
    height: 189.7,
    image: '/inspiration/44ba9375b8b949e286b966b489ac566c_20250822_142807_1d7f83ff-759d3c69.png',
    prompt: '西安秦潮盛唐，大雁塔、钟楼、大明宫丹凤门同框，朱红鎏金与赛博青蓝，夜空丝路全息剪影。',
  },
  {
    id: 6,
    type: '图片',
    height: 284.4,
    image: '/inspiration/fca38735e3e54e26985531f244974384_20250730_112905_d5331fac-e83992e6.jpg',
    prompt: '9 宫格表情包，三维可爱风格，动作：打瞌睡、求抱抱、卖萌、微笑、生气、流泪、委屈、难过、激动。',
  },
  {
    id: 7,
    type: '图片',
    height: 505.6,
    image: '/inspiration/acacb0bc310944bab324c5a769a2260b_20251221_095655_45c5e32a-3ce1f610.png',
    prompt: '疯狂动物城城市风光，兔朱迪和狐尼克并排站在面前，表情生动，温暖可爱，3D 动画风格，电影级光线。',
  },
  {
    id: 8,
    type: '图片',
    height: 379.2,
    image: '/inspiration/42c39e98bf6a47f9b76788e32e229234_20251218_221855_ab30c284-c2230b7a.png',
    prompt: '给图中人物进行圣诞装扮，保留脸部特征，红丝绒圣诞服饰，暖黄色柔和灯光，高清特写，元气可爱风格。',
  },
  {
    id: 9,
    type: '图片',
    height: 189.7,
    image: '/inspiration/426260b9e1a448c5920bc183666a6077_20250822_145507_892da26e-43b68e9b.png',
    prompt: '厦门城市插画，鼓浪屿、厦门大学、南普陀寺、双子塔、环岛路等地标同框，初夏傍晚，色彩明亮。',
  },
  {
    id: 10,
    type: '图片',
    height: 159.9,
    image: '/inspiration/59239205f0244b5d9f13f1c41885c040_20251217_233355_626a5068-5c3e02d4.png',
    prompt: '白色狐仙在神秘仙境中翩翩起舞，九条尾巴梦幻摇曳，白色莲花与蝴蝶环绕，如梦如幻。',
  },
  {
    id: 11,
    type: '图片',
    height: 159.9,
    image: '/inspiration/ffa845fcf68848419d6a1d9bc8f34d3a_20250915_080024_d9e8ca50-30533bda.png',
    prompt: '变形金刚大战，金属质感，动态冲突场面，电影级光影。',
  },
  {
    id: 12,
    type: '图片',
    height: 284.4,
    image: '/inspiration/fe253bfe742b40fe8ce3cb47d41ed3b9_20250821_185907_1ffbc593-ccee1f68.png',
    prompt: 'Chinese ink-wash manga style, black and white, dramatic lighting, high contrast.',
  },
  {
    id: 13,
    type: '图片',
    height: 284.4,
    image: '/inspiration/11d445c7af784adcbaf279069a97ecb6_20250821_191109_db83c9e1-b9c9ee1e.png',
    prompt: '中国风侠客水墨风格，屋顶黑影掠过，盗贼剪影，月亮在背后，黑白高对比。',
  },
  {
    id: 14,
    type: '图片',
    height: 284.4,
    image: '/inspiration/0fdc4063e87d4a12bd3855e6be32f310_20250730_110724_473b3114-955538bb.jpg',
    prompt: '皮克斯与儿童读物插图风格，可爱人物特写，红色背景，羊毛毛毡织物艺术，高清细节。',
  },
  {
    id: 15,
    type: '图片',
    height: 284.4,
    image: '/inspiration/9c5de6faec18492caeee8109afcda45e_20250729_094603_68a685f1-399f1cd1.jpg',
    prompt: '治愈系卡通角色，由织物、棉花、毛毡毛绒组成，丑萌可爱，蓝天白云户外，证件照构图。',
  },
  {
    id: 16,
    type: '图片',
    height: 284.4,
    image: '/inspiration/f66ff5b3e5b0466dba51696fd38065fc_20250730_073500_c2fda4d1-6a4be035.jpg',
    prompt: '画图问答找Lovarts短剧平台，模型切换不用愁，复古印刷字体，彩色毛线缠绕，淡黄色绒布背景，温暖手工质感。',
  },
  {
    id: 17,
    type: '图片',
    height: 284.4,
    image: '/inspiration/9909203018eb474baec37426beed559e_20251218_152655_d9c0b45b-4469c0d4.png',
    prompt: '风格转换，动漫风格，氛围很棒，画面柔和。',
  },
  {
    id: 18,
    type: '图片',
    height: 426.6,
    image: '/inspiration/8d1c19d2547c44ff91ed7645f2282995_20250729_230939_9c2fa589-b24c32d4.jpg',
    prompt: '现代格斗角色，都市夜景背景，概念艺术，强烈轮廓光，高细节数字插画。',
  },
  {
    id: 19,
    type: '视频',
    height: 426.6,
    image: '/inspiration/8d1c19d2547c44ff91ed7645f2282995_20250729_230939_9c2fa589-b24c32d4.jpg',
    prompt: '都市动作短片首帧，现代格斗角色，强烈轮廓光，城市夜景，镜头缓慢推进。',
  },
  {
    id: 20,
    type: '视频',
    height: 284.4,
    image: '/inspiration/9c5de6faec18492caeee8109afcda45e_20250729_094603_68a685f1-399f1cd1.jpg',
    prompt: '治愈系卡通角色户外短片，蓝天白云，柔软毛绒质感，镜头轻微摇移。',
  },
  {
    id: 21,
    type: '视频',
    height: 189.7,
    image: '/inspiration/44ba9375b8b949e286b966b489ac566c_20250822_142807_1d7f83ff-759d3c69.png',
    prompt: '西安城市宣传视频首帧，赛博唐风夜景，镜头从钟楼推向大雁塔。',
  },
  {
    id: 22,
    type: '视频',
    height: 284.4,
    image: '/inspiration/fe253bfe742b40fe8ce3cb47d41ed3b9_20250821_185907_1ffbc593-ccee1f68.png',
    prompt: '黑白水墨武侠动画，强对比光影，人物从画面边缘掠过。',
  },
]

const mediaTabs = ['图片', '视频']
const activeTab = ref('图片')
const activeBanner = ref(0)
const pauseAuto = ref(false)
const prompt = ref('')
const externalReferenceImage = ref(null)

const columnCount = ref(5)
const filteredItems = computed(() => galleryItems.filter((item) => item.type === activeTab.value))
const waterfallColumns = computed(() => {
  const columns = Array.from({ length: columnCount.value }, () => ({ height: 0, items: [] }))

  filteredItems.value.forEach((item) => {
    const target = columns.reduce((min, column) => (column.height < min.height ? column : min), columns[0])
    target.items.push(item)
    target.height += item.height + 6
  })

  return columns.map((column) => column.items)
})

let timer

function syncColumnCount() {
  const width = window.innerWidth
  if (width <= 560) columnCount.value = 1
  else if (width <= 860) columnCount.value = 2
  else if (width <= 1180) columnCount.value = 3
  else if (width <= 1500) columnCount.value = 4
  else columnCount.value = 5
}

function nextBanner() {
  activeBanner.value = (activeBanner.value + 1) % banners.length
}

function prevBanner() {
  activeBanner.value = (activeBanner.value + banners.length - 1) % banners.length
}

function usePrompt(text) {
  prompt.value = text
  toast.success('已填入提示词')
}

function createVariant(item) {
  prompt.value = item.prompt
  externalReferenceImage.value = {
    id: `${item.id}-${Date.now()}`,
    url: item.image,
    name: `参考图${item.id}`,
  }
  toast.success('已加入参考图')
}

async function copyPrompt(text) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success('提示词已复制')
  } catch {
    prompt.value = text
    toast.info('已填入提示词')
  }
}

function polishPrompt() {
  if (!prompt.value.trim()) {
    toast.info('请先输入提示词')
    return
  }
  prompt.value = `${prompt.value.trim()}，画面细节丰富，光影自然，高品质成片。`
  toast.success('已优化提示词')
}

function submitPrompt() {
  if (!prompt.value.trim()) {
    toast.info('请输入提示词')
    return
  }
  toast.success('生成入口已准备，后续可接入图片生成接口')
}

onMounted(() => {
  syncColumnCount()
  window.addEventListener('resize', syncColumnCount)
  timer = window.setInterval(() => {
    if (!pauseAuto.value) nextBanner()
  }, 3600)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncColumnCount)
  if (timer) window.clearInterval(timer)
})
</script>

<style scoped>
.inspiration-page {
  position: relative;
  height: 100%;
  overflow: auto;
  padding: 14px 14px 150px;
  background: #1f1f1f;
  color: #f8fafc;
}

.inspiration-page::-webkit-scrollbar {
  width: 0;
}

.creative-grid {
  width: 100%;
}

.grid-main {
  display: grid;
  grid-template-columns: minmax(0, 1.34fr) minmax(360px, 0.66fr);
  gap: 10px;
  height: clamp(250px, 20vw, 340px);
}

.left-banner,
.n-carousel {
  position: relative;
  min-width: 0;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-radius: 8px;
  background: #252527;
}

.n-carousel__slides {
  display: flex;
  width: 100%;
  height: 100%;
  transition: transform 0.35s cubic-bezier(.4, 0, .2, 1);
}

.n-carousel__slide {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
}

.banner-item,
.banner-img,
.idea-card img {
  width: 100%;
  height: 100%;
  display: block;
}

.banner-img,
.idea-card img {
  object-fit: cover;
}

.n-carousel__dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 12px;
  z-index: 2;
  display: flex;
  justify-content: center;
  gap: 8px;
}

.n-carousel__dot {
  width: 16px;
  height: 8px;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.34);
}

.n-carousel__dot--active {
  width: 24px;
  background: #fff;
}

.right-apps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-height: 0;
}

.app-card {
  position: relative;
  min-height: 0;
  overflow: hidden;
  border-radius: 8px;
  background: #252527;
}

.card-bg {
  position: absolute;
  inset: 0;
  background-position: center;
  background-size: cover;
  transition: transform 0.28s ease;
}

.app-card:hover .card-bg {
  transform: scale(1.05);
}

.card-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.72));
}

.card-content {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 52px;
}

.card-title {
  margin-bottom: 3px;
  font-size: clamp(14px, 0.9vw, 17px);
  color: #fff;
}

.card-desc {
  color: rgba(255, 255, 255, 0.82);
  font-size: clamp(11px, 0.72vw, 12px);
  line-height: 1.4;
}

.card-actions {
  position: absolute;
  right: 12px;
  bottom: 12px;
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
}

.app-card:hover .card-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.action-btn {
  border: 0;
  font: inherit;
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: clamp(28px, 1.8vw, 32px);
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: #0a84ff;
  color: #fff;
  font-size: clamp(11px, 0.72vw, 12px);
  font-weight: 600;
}

.gallery-section {
  margin-top: 18px;
}

.gallery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.gallery-header h2 {
  color: #fff;
  font-size: 20px;
}

.media-tabs {
  display: flex;
  padding: 3px;
  border-radius: 8px;
  background: #252527;
}

.media-tabs button {
  min-width: 64px;
  height: 30px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: #a0a0a0;
  font-size: 13px;
}

.media-tabs button.active {
  background: #0a84ff;
  color: #fff;
}

.waterfall-shell {
  padding-bottom: 140px;
}

.waterfall-container {
  display: flex;
  width: 100%;
  gap: 6px;
}

.waterfall-column {
  display: flex;
  flex: 1;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.idea-card {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 6px;
  background: #252527;
}

.idea-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 42px 12px 12px;
  background: linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,0.88));
  opacity: 0;
  transform: translateY(10px);
  transition: opacity 0.18s ease, transform 0.18s ease;
  pointer-events: none;
}

.idea-card:hover .idea-overlay {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.idea-overlay p {
  display: -webkit-box;
  overflow: hidden;
  color: #fff;
  font-size: 12px;
  line-height: 1.42;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.idea-actions {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.idea-actions button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  padding: 0 8px;
  border: 0;
  border-radius: 6px;
  background: #0a84ff;
  color: #fff;
  font-size: 11px;
}

@media (max-width: 1180px) {
  .grid-main {
    grid-template-columns: 1fr;
    height: auto;
  }

  .right-apps {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    grid-template-rows: none;
  }

  .left-banner,
  .n-carousel {
    height: clamp(220px, 32vw, 320px);
  }

  .app-card {
    aspect-ratio: 0.82;
  }

}

@media (max-width: 860px) {
  .inspiration-page {
    padding: 10px 10px 126px;
  }

  .left-banner,
  .n-carousel {
    height: clamp(180px, 38vw, 240px);
  }

  .right-apps {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .app-card {
    aspect-ratio: 1.45;
  }

}

@media (max-width: 560px) {
  .grid-main {
    gap: 8px;
  }

  .left-banner,
  .n-carousel {
    height: 165px;
  }

  .right-apps {
    grid-template-columns: 1fr;
  }

  .app-card {
    aspect-ratio: 1.9;
  }

}

@media (max-height: 760px) and (min-width: 861px) {
  .grid-main {
    height: clamp(220px, 18vw, 285px);
  }

}
</style>
