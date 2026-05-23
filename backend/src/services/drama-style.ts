import { eq } from 'drizzle-orm'
import { db, schema } from '../db/index.js'

export type DramaStyleProfile = {
  category: string
  style: string
  styleLabel: string
  genres: string[]
  visualKeywords: string[]
  narrativeKeywords: string[]
  forbiddenKeywords: string[]
}

const STYLE_LABELS: Record<string, string> = {
  minecraft: '方块世界',
  xianxia_3d: '3D国创',
  pixar_3d: '美式3D',
  chibi_3d: 'Q版3D',
  clay_toy: '粘土玩具',
  low_poly: '低多边形',
  realistic_3d: '照片级3D',
  toon_shader: '卡通渲染',
  stylized_3d: '三渲二',
  ghibli: '吉卜力',
  naruto: '木叶村',
  conan: '名侦探阿楠',
  one_piece: '海贼王',
  demon_slayer: '鬼灭之刃',
  jojo: 'JoJo',
  pokemon: '宝可梦',
  genshin: '原神',
  anime_2d: '2D动漫',
  anime_3d: '3D动漫',
  cel_shading: '赛璐璐',
  shoujo: '少女漫画',
  shounen: '少年漫画',
  chibi_anime: '日系Q版',
  lofi_chibi: '治愈Q萌',
  ethereal_gothic: '空灵哥特',
  cozy_watercolor: '温馨彩绘',
  city_pop: '潮流都市',
  vintage_poster: '复古海报',
  ink_painting: '水墨风',
  comic_book: '美式漫画',
  vaporwave: '蒸汽波',
  pixel_art: '像素艺术',
  storybook: '童话绘本',
  noir: '黑白漫画',
  sketch: '手绘草图',
  shoujo_dream: '女频漫画',
  k_drama: '韩系都市',
  city_romance: '都市言情',
  cinematic: '电影写实',
  realistic: '照片写实',
  documentary: '纪录片感',
}

const STYLE_CATEGORIES: Record<string, string> = {
  minecraft: '3D动画',
  xianxia_3d: '3D动画',
  pixar_3d: '3D动画',
  chibi_3d: '3D动画',
  clay_toy: '3D动画',
  low_poly: '3D动画',
  realistic_3d: '3D动画',
  toon_shader: '3D动画',
  stylized_3d: '动漫风格',
  ghibli: '动漫风格',
  naruto: '动漫风格',
  conan: '动漫风格',
  one_piece: '动漫风格',
  demon_slayer: '动漫风格',
  jojo: '动漫风格',
  pokemon: '动漫风格',
  genshin: '动漫风格',
  anime_2d: '动漫风格',
  anime_3d: '动漫风格',
  cel_shading: '动漫风格',
  shoujo: '动漫风格',
  shounen: '动漫风格',
  chibi_anime: '可爱Q版',
  lofi_chibi: '可爱Q版',
  ethereal_gothic: '插画艺术',
  cozy_watercolor: '插画艺术',
  city_pop: '插画艺术',
  vintage_poster: '插画艺术',
  ink_painting: '插画艺术',
  comic_book: '插画艺术',
  vaporwave: '插画艺术',
  pixel_art: '插画艺术',
  storybook: '插画艺术',
  noir: '插画艺术',
  sketch: '插画艺术',
  shoujo_dream: '都市言情',
  k_drama: '都市言情',
  city_romance: '都市言情',
  cinematic: '写实风格',
  realistic: '写实风格',
  documentary: '写实风格',
}

const VISUAL_KEYWORDS: Record<string, string[]> = {
  '3D动画': ['3D animated short drama', 'CG character design', 'volumetric lighting', 'stylized 3D materials', 'consistent 3D render style'],
  '动漫风格': ['anime short drama', 'manga-inspired character design', 'clean line art', 'anime lighting', 'consistent anime style'],
  '可爱Q版': ['cute chibi proportions', 'soft rounded shapes', 'toy-like character design', 'warm playful colors', 'consistent chibi style'],
  '插画艺术': ['illustrated short drama', 'painterly composition', 'designed color palette', 'hand-crafted illustration texture', 'consistent illustration style'],
  '都市言情': ['romance drama visual language', 'fashion editorial styling', 'soft cinematic lighting', 'urban emotional atmosphere', 'consistent romance style'],
  '写实风格': ['live-action cinematic realism', 'realistic production design', 'natural lens language', 'photorealistic lighting', 'consistent realistic style'],
}

const NARRATIVE_KEYWORDS: Record<string, string[]> = {
  '3D动画': ['按三维动画短剧节奏组织剧情', '动作和场景要适合 CG 镜头表现', '角色设定必须能落地为 3D 角色模型'],
  '动漫风格': ['按漫剧叙事组织剧情', '强化番剧式人物关系、情绪爆点和分镜节奏', '角色设定必须适合动漫角色图'],
  '可爱Q版': ['按轻松可爱短剧节奏组织剧情', '冲突表达要适合 Q 版表演', '角色动作和情绪要适合萌系画面'],
  '插画艺术': ['按插画短剧叙事组织剧情', '场景和人物要有明确画面构图感', '镜头描述要适合插画化表达'],
  '都市言情': ['按都市言情短剧节奏组织剧情', '强化情感拉扯、关系反转和生活化场景', '人物造型要贴合都市言情审美'],
  '写实风格': ['按真人短剧节奏组织剧情', '场景、人物、对白必须贴近真实拍摄', '避免动漫化、Q版化和夸张幻想化表达'],
}

const FORBIDDEN_KEYWORDS: Record<string, string[]> = {
  '3D动画': ['2D anime', 'manga', 'comic book', 'live action photo', 'watercolor', 'sketch'],
  '动漫风格': ['photorealistic live action', 'real person photo', 'clay toy', 'minecraft voxel', 'western 3D render unless selected'],
  '可爱Q版': ['realistic adult proportions', 'photorealistic', 'dark live action', 'hard horror realism'],
  '插画艺术': ['photorealistic live action', 'generic 3D render', 'raw camera photo'],
  '都市言情': ['fantasy anime unless selected', 'chibi', 'minecraft voxel', 'clay toy'],
  '写实风格': ['anime', 'manga', 'chibi', 'cartoon', '3D animation', 'illustration'],
}

function parseMetadata(value: string | null | undefined) {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function parseGenres(drama: typeof schema.dramas.$inferSelect | null | undefined, metadata: Record<string, any>) {
  if (Array.isArray(metadata.genres)) return metadata.genres.map(String).filter(Boolean)
  if (drama?.genre) return String(drama.genre).split(/[、,\s]+/).filter(Boolean)
  const description = drama?.description || ''
  const match = description.match(/类型：(.+)/)
  if (!match) return []
  return match[1].split(/[、,\s]+/).filter(Boolean)
}

function styleSpecificKeywords(style: string, category: string, label: string) {
  const base = VISUAL_KEYWORDS[category] || VISUAL_KEYWORDS['写实风格']
  return [
    ...base,
    `${label} style`,
    `strictly ${label}`,
    `no style drift`,
  ]
}

export function buildDramaStyleProfile(drama: typeof schema.dramas.$inferSelect | null | undefined): DramaStyleProfile {
  const metadata = parseMetadata(drama?.metadata)
  const style = String(drama?.style || metadata.style || 'realistic').trim()
  const category = String(metadata.style_category || metadata.styleCategory || STYLE_CATEGORIES[style] || '写实风格')
  const styleLabel = String(metadata.style_label || metadata.styleLabel || STYLE_LABELS[style] || style)
  return {
    category,
    style,
    styleLabel,
    genres: parseGenres(drama, metadata),
    visualKeywords: styleSpecificKeywords(style, category, styleLabel),
    narrativeKeywords: NARRATIVE_KEYWORDS[category] || NARRATIVE_KEYWORDS['写实风格'],
    forbiddenKeywords: FORBIDDEN_KEYWORDS[category] || FORBIDDEN_KEYWORDS['写实风格'],
  }
}

export async function getDramaStyleProfile(dramaId: number) {
  const [drama] = await db.select().from(schema.dramas).where(eq(schema.dramas.id, dramaId)).execute()
  return buildDramaStyleProfile(drama)
}

export function buildStyleAgentInstruction(profile: DramaStyleProfile) {
  return [
    '## 项目风格硬性约束',
    `- 风格分类：${profile.category}`,
    `- 具体风格：${profile.styleLabel}（${profile.style}）`,
    profile.genres.length ? `- 剧集类型：${profile.genres.join('、')}` : '',
    `- 叙事要求：${profile.narrativeKeywords.join('；')}`,
    `- 视觉要求：所有角色、场景、分镜 image_prompt、video_prompt 都必须属于「${profile.category} / ${profile.styleLabel}」；必须显式包含该风格的材质、光线、造型和镜头语言。`,
    `- 禁止串风格：不得出现或暗示 ${profile.forbiddenKeywords.join('、')}。`,
    '- 如果用户消息、原始剧本或已有字段与项目风格冲突，以这里的项目风格为准。',
  ].filter(Boolean).join('\n')
}

export function buildStylePromptSuffix(profile: DramaStyleProfile, target: 'script' | 'character' | 'scene' | 'storyboard' | 'image' = 'image') {
  const targetRule = target === 'character'
    ? `The character must be designed as ${profile.styleLabel} ${profile.category}, not any other style.`
    : target === 'scene'
      ? `The environment must be designed as ${profile.styleLabel} ${profile.category}, matching all character visuals.`
      : target === 'script'
        ? `The story, action, character behavior, and scene descriptions must be written for ${profile.styleLabel} ${profile.category}.`
        : `Every shot and visual prompt must remain in ${profile.styleLabel} ${profile.category}.`
  return [
    targetRule,
    ...profile.visualKeywords,
    `genre tags: ${profile.genres.join(', ') || 'general short drama'}`,
    `forbidden: ${profile.forbiddenKeywords.join(', ')}`,
    'strict style consistency across script, characters, scenes, storyboards, images, and videos',
  ].filter(Boolean).join(', ')
}

export function appendStylePrompt(base: string, profile: DramaStyleProfile, target: Parameters<typeof buildStylePromptSuffix>[1] = 'image') {
  const suffix = buildStylePromptSuffix(profile, target)
  if (!base) return suffix
  return `${base}\n\nStyle lock: ${suffix}`
}
