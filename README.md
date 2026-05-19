# Lovarts Drama / 火宝短剧

Lovarts Drama 是一个面向 AI 短剧生产的全栈项目，覆盖剧本管理、角色和场景资产、分镜拆解、图片生成、视频生成、配音、合成导出以及创作画布。项目采用 TypeScript 全栈实现，前端基于 Nuxt 3，后端基于 Hono、Drizzle ORM 和 SQLite。

## 功能概览

- 短剧项目管理：创建剧集、维护剧本、管理分集内容。
- 角色库：维护角色描述、外观、参考图、音色和生成结果。
- 场景库：维护场景地点、时间、提示词和生成素材。
- 分镜工作台：拆解剧本、生成分镜图、生成视频、配音、字幕和合成结果。
- AI 配置中心：在 Web 页面中维护文本、图片、视频和语音服务配置。
- Agent 技能：内置剧本改写、信息提取、分镜拆解、音色分配、宫格提示词生成等技能。
- 灵感页：瀑布流素材展示、快捷应用入口和统一底部输入框。
- 创作页：统一创作输入框和作品内容区域。
- 无限画布：迁移自 `huobao-canvas-main`，基于 Vue Flow 的节点式创作工具。

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端 | Nuxt 3、Vue 3、TypeScript、Naive UI、Tailwind CSS、Vue Flow、Pinia |
| 后端 | Node.js 20、Hono、Drizzle ORM、better-sqlite3、Mastra、AI SDK |
| 数据库 | SQLite，默认启用 WAL |
| 媒体处理 | FFmpeg、fluent-ffmpeg、sharp |
| 部署 | Docker、Docker Compose |

## 目录结构

```text
.
├── backend/                 # Hono API 服务、数据库、AI 适配器、Agent 工具
├── configs/                 # 配置模板
├── data/                    # SQLite 数据库和本地静态资源，运行时生成
├── frontend/                # Nuxt 3 前端应用
│   ├── app/
│   │   ├── canvas/          # 无限画布迁移代码
│   │   ├── components/      # 公共组件
│   │   ├── layouts/         # 页面布局
│   │   └── pages/           # Nuxt 页面路由
│   └── public/              # 前端静态资源
├── skills/                  # Agent 技能定义
├── Dockerfile
└── docker-compose.yml
```

## 环境要求

- Node.js 20+
- npm 9+
- FFmpeg 4+
- macOS、Linux 或支持 Node.js 和 FFmpeg 的 Windows 环境

安装 FFmpeg：

```bash
# macOS
brew install ffmpeg

# Ubuntu / Debian
sudo apt update
sudo apt install ffmpeg
```

确认安装：

```bash
node -v
npm -v
ffmpeg -version
```

## 本地开发

### 1. 安装依赖

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 2. 准备配置

```bash
cd /path/to/lovarts-drama
cp configs/config.example.yaml configs/config.yaml
```

当前后端主要通过环境变量读取运行配置；`configs/config.yaml` 保留为部署和配置模板。AI 服务配置建议在前端「设置」页面维护，它们会写入 SQLite 的配置表。

常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `5679` | 后端服务端口 |
| `DB_PATH` | `data/huobao_drama.db` | SQLite 数据库路径 |
| `STORAGE_PATH` | `data/static` | 本地文件存储目录 |
| `STORAGE_BASE_URL` | 空 | 静态资源公开访问地址 |
| `PUBLIC_URL` | 空 | 公开站点地址 |
| `API_PUBLIC_URL` | 空 | 后端公开 API 地址 |
| `APIMART_API_KEY` | 空 | Apimart 服务密钥 |
| `AI_API_KEY` | 空 | 通用 AI 服务密钥兜底 |
| `APIMART_BASE_URL` | 内置默认值 | Apimart API 地址 |
| `APIMART_TEXT_MODEL` | 内置默认值 | 默认文本模型 |
| `APIMART_IMAGE_MODEL` | 内置默认值 | 默认图片模型 |
| `APIMART_VIDEO_MODEL` | 内置默认值 | 默认视频模型 |

### 3. 启动后端

```bash
cd backend
npm run dev
```

后端默认地址：

```text
http://localhost:5679
```

健康检查：

```text
GET http://localhost:5679/api/v1/health
```

### 4. 启动前端

```bash
cd frontend
npm run dev
```

前端默认地址：

```text
http://localhost:3013
```

前端开发服务器会代理：

```text
/api    -> http://localhost:5679
/static -> http://localhost:5679
```

## 常用命令

### 后端

```bash
cd backend

npm run dev        # 开发模式，tsx watch
npm start          # 直接启动 src/index.ts
npm run build      # TypeScript 编译检查
npm run typecheck  # tsc --noEmit
```

### 前端

```bash
cd frontend

npm run dev        # Nuxt dev，端口 3013
npm run build      # Nuxt 生产构建
npm run generate   # 生成静态产物
npm run preview    # 预览构建结果
```

## 数据库

项目使用 SQLite。后端启动时会自动创建所需表，无需手动迁移。

默认数据库路径：

```text
data/huobao_drama.db
```

覆盖数据库路径：

```bash
DB_PATH=/absolute/path/to/huobao_drama.db npm start
```

核心表：

- `dramas`
- `episodes`
- `characters`
- `character_library`
- `scenes`
- `scene_library`
- `storyboards`
- `ai_service_configs`
- `ai_service_providers`
- `agent_configs`
- `tasks`

## 后端 API

API 前缀：

```text
/api/v1
```

主要模块：

| 路由 | 说明 |
| --- | --- |
| `/health` | 健康检查 |
| `/dramas` | 短剧项目 |
| `/episodes` | 分集 |
| `/storyboards` | 分镜 |
| `/characters` | 角色 |
| `/scenes` | 场景 |
| `/images` | 图片生成任务 |
| `/videos` | 视频生成任务 |
| `/upload` | 文件上传 |
| `/ai-configs` | AI 服务配置 |
| `/ai-providers` | AI 服务商预设 |
| `/agent-configs` | Agent 配置 |
| `/agent` | Agent 调用 |
| `/compose` | 单镜头合成 |
| `/merge` | 整集视频拼接 |
| `/grid` | 宫格图生成和切分 |
| `/skills` | 技能信息 |
| `/ai-voices` | 语音配置和音色 |
| `/tasks` | 任务状态 |

Webhook 路由独立挂载：

```text
/webhooks
```

静态资源路由：

```text
/static/*
```

## 前端页面

| 路由 | 页面 |
| --- | --- |
| `/` | 短剧项目入口 |
| `/home` | 灵感页 |
| `/generate` | 创作页 |
| `/canvas` | 无限画布，全屏独立页 |
| `/settings` | AI 和 Agent 配置 |
| `/library/characters` | 角色库 |
| `/library/scenes` | 场景库 |
| `/drama/:id` | 短剧详情 |
| `/drama/:id/episode/:episodeNumber` | 分集工作台 |

## AI 配置

推荐流程：

1. 启动前后端。
2. 打开 `http://localhost:3013/settings`。
3. 配置文本、图片、视频和语音服务。
4. 在分镜工作台或画布中发起生成任务。

配置会存储在 SQLite 中，避免把 API Key 写入源码。

## Agent 技能

技能文件位于 `skills/`：

| 技能 | 说明 |
| --- | --- |
| `script_rewriter` | 小说或原始文本改写为短剧脚本 |
| `extractor` | 提取角色和场景信息 |
| `storyboard_breaker` | 拆解分镜 |
| `voice_assigner` | 为角色分配音色 |
| `grid_prompt_generator` | 生成角色、场景、镜头宫格图提示词 |

这些 Markdown 文件是运行时提示词资产，不是普通说明文档，修改时需要保持格式稳定。

## 构建和部署

### Docker Compose

```bash
docker compose up -d --build
```

服务地址：

```text
http://localhost:5679
```

数据目录会挂载到：

```text
./data
```

### 手动生产构建

```bash
cd frontend
npm install
npm run generate

cd ../backend
npm install
PORT=5679 npm start
```

后端会服务 `frontend/dist` 中的前端静态文件。

## Git 和忽略规则

仓库会忽略：

- `node_modules/`
- `.nuxt/`
- `.output/`
- `dist/`
- `.env`
- 本地数据库和运行时文件
- `data/static/`
- `configs/config.yaml`
- 表格和系统文件

提交前建议检查：

```bash
git status --short
git diff --stat
```

## 排错

### 前端请求后端失败

确认后端在 `5679` 端口运行：

```bash
curl http://localhost:5679/api/v1/health
```

确认前端 `nuxt.config.ts` 代理仍指向 `http://localhost:5679`。

### 生成视频失败

确认 FFmpeg 可用：

```bash
ffmpeg -version
```

确认 `data/static` 可写。

### 数据库锁定

项目启用了 WAL 和 `busy_timeout`。如果仍出现锁定，先确认没有多个服务进程同时写同一个数据库。

### 画布样式丢失

确认前端已安装 Tailwind、Vue Flow 和 Naive UI 相关依赖，并且 `frontend/nuxt.config.ts` 的全局 CSS 包含：

```text
~/assets/tailwind.css
@vue-flow/core/dist/style.css
@vue-flow/core/dist/theme-default.css
@vue-flow/minimap/dist/style.css
~/assets/canvas.css
```

## License

本仓库遵循远端仓库中的 `LICENSE` 文件。
