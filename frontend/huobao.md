# 火宝短剧前端设计与实现说明

本文档记录 `frontend/` 当前前端产品结构、视觉规范、公共组件约定和画布迁移说明。它是开发协作和后续视觉对齐的基准文档。

## 产品定位

前端是 AI 短剧创作平台的工作台，目标是让用户在一个深色、低干扰、可长时间使用的界面里完成：

- 浏览灵感素材
- 输入图片或视频生成提示词
- 创建短剧项目
- 管理角色和场景资产
- 拆解分镜并生成素材
- 配置 AI 服务
- 使用无限画布组织创作节点

整体不做营销落地页风格，优先做工作台、素材库和创作工具。

## 技术栈

- Nuxt 3，`srcDir: app/`
- Vue 3
- TypeScript
- Naive UI
- Tailwind CSS
- Vue Flow
- Pinia
- lucide-vue-next
- vue-sonner

入口配置：

```text
frontend/nuxt.config.ts
```

默认开发端口：

```text
http://localhost:3013
```

后端代理：

```text
/api    -> http://localhost:5679
/static -> http://localhost:5679
```

## 页面路由

| 路由 | 说明 |
| --- | --- |
| `/` | 短剧项目入口 |
| `/home` | 灵感页，瀑布流素材和应用入口 |
| `/generate` | 创作页，内容区 + 公共输入框 |
| `/canvas` | 无限画布，全屏独立页面 |
| `/settings` | AI 服务和 Agent 配置 |
| `/library/characters` | 角色库 |
| `/library/scenes` | 场景库 |
| `/drama/:id` | 短剧详情 |
| `/drama/:id/episode/:episodeNumber` | 分集工作台 |

## 视觉方向

### 总体风格

界面参考 Chatfire 类型产品的深色工作台风格：

- 背景是中性深灰，不使用大面积蓝色背景。
- 左侧导航和内容区域保持相近深灰层级。
- 主内容保持克制，减少装饰和卡片嵌套。
- 字体整体偏小，适合工具型界面密集信息展示。
- 操作按钮默认轻量，仅在 hover 或明确状态下突出。
- 素材卡片上的说明和操作默认隐藏，鼠标悬停时显示。

### 色彩

推荐变量语义：

```text
page background      #1f1f1f
sidebar background   #252527
panel background     #252527
hover background     #343434
primary text         #f2f6fb
secondary text       #a0a0a0
muted text           #737373
border               rgba(255,255,255,0.08)
accent               #0a84ff
```

注意：

- 不要把整个网站做成蓝色主题。
- 蓝色只作为按钮、聚焦态和可操作强调色。
- 内容区背景不要用纯黑，使用和页面一致的中性深灰。

### 字体

全局文字以工具型密度为准：

- body: `13px`
- 菜单项: `13px`
- 卡片正文: `12px - 13px`
- 主要标题: `16px - 20px`
- 面板标题: `14px - 16px`

不要在小屏幕上使用过大的标题、按钮和输入框。

### 圆角和间距

- 大多数面板圆角控制在 `8px - 12px`。
- 图片卡片圆角使用 `4px - 8px`。
- 工具按钮以图标为主，尺寸稳定。
- 避免卡片套卡片。
- 页面区块不要做过重投影。

## 响应式规则

小屏幕优先保证可用：

- 左侧导航在移动端变为抽屉。
- 主内容横向留白缩小。
- 瀑布流列数减少。
- 输入框宽度跟随视口，不能超出屏幕。
- 底部工具条允许换行或压缩，但按钮文字不能溢出。
- 画布页保持全屏，不套主布局。

断点建议：

```text
< 640px   手机
640-1024  平板和小屏桌面
> 1024px  标准桌面
```

## 全局布局

主布局文件：

```text
frontend/app/layouts/default.vue
```

结构：

- `app-shell`: 全站深色背景。
- `floating-sidebar`: 左侧固定导航。
- `content-wrapper`: 右侧主内容区域。
- `content-container`: 页面内容承载容器。

侧边栏分组：

- 问答
- AI 创作
- 账户管理
- 其他入口

画布入口使用普通链接打开新标签：

```html
<a href="/canvas" target="_blank" rel="noopener noreferrer">画布</a>
```

原因：画布是独立工具，不应被主站布局、滚动容器和侧边栏影响。

## 公共输入框

组件：

```text
frontend/app/components/MaterialInput.vue
```

使用页面：

- `/home`
- `/generate`

这个输入框必须作为公共组件维护，不要在单个页面复制一份。

### 设计要求

输入框应接近 Chatfire 的底部创作框：

- 深灰透明面板。
- 内部输入区和底部工具栏分离。
- 左侧支持图片上传占位。
- 右上角有智能润色图标。
- 底部左侧是模式、模型、风格等选择器。
- 底部右侧是比例、积分消耗和发送按钮。
- 发送按钮使用图标，不做大面积文字按钮。
- 小屏幕下按钮可收缩，不能挤爆布局。

### 组件职责

`MaterialInput.vue` 只负责输入体验和事件发出：

- 提示词输入
- 上传入口展示
- 模型/模式/比例按钮展示
- 积分展示
- 提交事件

具体业务行为由页面或上层容器处理。

### 禁止事项

- 不要把它固定死在某个页面。
- 不要在 `/home` 和 `/generate` 写两套不同 UI。
- 不要使用纯黑背景。
- 不要让小屏幕上输入框高度和按钮尺寸过大。

## 灵感页

页面：

```text
frontend/app/pages/home.vue
```

内容：

- 顶部应用入口区
- Banner 或快捷卡片
- 瀑布流素材区域
- 底部公共输入框

素材卡片规则：

- 图片是第一视觉。
- 文案和操作按钮默认隐藏。
- 鼠标悬停时显示渐变遮罩、说明和操作。
- 操作按钮包括复制、二创、画同款。
- 卡片高度按图片比例和瀑布流布局控制。

应用卡片规则：

- 默认只展示图和标题信息。
- 操作按钮 hover 时显示。
- 不做厚重卡片阴影。

## 创作页

页面：

```text
frontend/app/pages/generate.vue
```

内容：

- 作品内容区域
- 空状态
- 底部公共输入框

视觉要求：

- 内容区域背景和主背景保持同一深灰体系。
- 空状态图标和文字低对比，不抢输入框焦点。
- 输入框继续使用 `MaterialInput.vue`。

## 画布页

页面：

```text
frontend/app/pages/canvas.vue
frontend/app/canvas/views/Canvas.vue
```

画布来自：

```text
/Users/dudianlong/Downloads/huobao-canvas-main
```

当前迁移位置：

```text
frontend/app/canvas/
```

### 路由要求

`/canvas` 必须是全屏独立页：

```ts
definePageMeta({
  layout: false,
})
```

页面根节点需要带：

```html
<div class="canvas-page-root dark">
  <CanvasView />
</div>
```

### 样式要求

画布依赖 Tailwind、Vue Flow、Naive UI 和局部 CSS。全局 CSS 必须在 `nuxt.config.ts` 中注册：

```ts
css: [
  '~/assets/studio.css',
  '~/assets/tailwind.css',
  '@vue-flow/core/dist/style.css',
  '@vue-flow/core/dist/theme-default.css',
  '@vue-flow/minimap/dist/style.css',
  '~/assets/canvas.css',
]
```

Tailwind PostCSS 配置必须放在 `nuxt.config.ts` 的 `postcss` 字段，不使用独立 `postcss.config.js`。

### 交互要求

- 画布全屏铺满浏览器。
- 顶部是画布自己的工具栏。
- 左侧是画布节点工具栏。
- 底部是画布自己的 prompt 输入区域。
- 不显示主站侧边栏。
- 不受主站内容容器宽度影响。

## 设置页

页面：

```text
frontend/app/pages/settings.vue
```

职责：

- 维护 AI 服务配置。
- 维护 Agent 配置。
- 测试服务可用性。
- 支持 Huobao/Apimart 预设。

API 配置不应写死在前端代码里。

## 角色库和场景库

页面：

```text
frontend/app/pages/library/characters.vue
frontend/app/pages/library/scenes.vue
```

设计要求：

- 以资产管理为核心。
- 列表要适合扫描。
- 卡片不要过大。
- 图片、名称、描述、来源和操作清晰分层。

## 短剧工作台

页面：

```text
frontend/app/pages/index.vue
frontend/app/pages/drama/[id]/index.vue
frontend/app/pages/drama/[id]/episode/[episodeNumber].vue
```

主要流程：

1. 创建短剧项目。
2. 进入项目详情。
3. 创建或编辑分集。
4. 提取角色和场景。
5. 拆解分镜。
6. 生成分镜图。
7. 生成视频。
8. 生成配音。
9. 合成单镜头。
10. 拼接整集。

工作台界面应保持工具型密度，不做大面积宣传式布局。

## CSS 文件职责

```text
frontend/app/assets/studio.css
```

主站基础视觉变量、布局、工具类和 Chatfire-like 深色样式。

```text
frontend/app/assets/tailwind.css
```

Tailwind 入口。

```text
frontend/app/assets/canvas.css
```

画布页变量、Vue Flow 覆盖和画布全屏兜底样式。

不要把画布专属样式写进普通页面组件，除非是组件内部局部样式。

## 图标规范

- 主站导航和常规按钮优先使用 `lucide-vue-next`。
- 画布迁移代码中保留 `@vicons/ionicons5` 和 Naive UI 图标。
- 熟悉操作优先使用图标，不用文字块代替。
- 不熟悉的图标需要 `title` 或 tooltip。

## 文案规范

- 用中文短句。
- 工具按钮不写长说明。
- 空状态文案保持克制。
- 不在页面中解释功能教程。
- 不在按钮里塞过长模型名；必要时截断或做菜单。

## 提交前检查

视觉改动建议至少检查：

```bash
cd frontend
npm run build
```

涉及后端接口时检查：

```bash
cd backend
npm run typecheck
```

本地开发：

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

重点验证：

- `/home`
- `/generate`
- `/canvas`
- `/settings`
- `/library/characters`
- `/library/scenes`

## 维护原则

- 公共 UI 抽成组件，不复制到多个页面。
- 新增样式先看 `studio.css` 是否已有变量和模式。
- 小屏幕适配和字体大小必须同步考虑。
- 画布功能尽量保持迁移源项目结构，减少无意义改写。
- 不提交 `node_modules`、`.nuxt`、`.output`、本地数据库、上传文件和系统文件。
