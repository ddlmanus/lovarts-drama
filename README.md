<p align="center">
  <img src="./frontend/public/huobao-logo.png" width="88" alt="Lovarts Drama Logo" />
</p>

<h1 align="center">Lovarts Drama / Lovarts短剧平台</h1>

<p align="center">
  AI 短剧生产工作台：剧本、角色、场景、分镜、图片、视频、配音、合成、灵感流和节点画布。
</p>

<p align="center">
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-20%2B-339933?style=flat-square&logo=node.js&logoColor=white"></a>
  <a href="https://nuxt.com"><img alt="Nuxt" src="https://img.shields.io/badge/Nuxt-3-00DC82?style=flat-square&logo=nuxt&logoColor=white"></a>
  <a href="https://vuejs.org"><img alt="Vue" src="https://img.shields.io/badge/Vue-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white"></a>
  <a href="https://www.mysql.com"><img alt="MySQL" src="https://img.shields.io/badge/MySQL-8%2B-4479A1?style=flat-square&logo=mysql&logoColor=white"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/License-MIT-blue?style=flat-square"></a>
</p>

<p align="center">
  <a href="#项目概览">项目概览</a>
  ·
  <a href="#本地运行">本地运行</a>
  ·
  <a href="#mysql-数据库">MySQL 数据库</a>
  ·
  <a href="#部署">部署</a>
</p>

<p align="center">
  <img src="./6b284a8a-c265-4475-ada0-fc7815b1bcea.png" alt="Lovarts Drama Preview" width="860" />
</p>

## 在线使用

| 入口 | 说明 |
| --- | --- |
| [Lovarts Drama 在线教程](https://drama.lovarts.art/) | 短剧制作、角色场景、分镜和视频生成工作台。 |
| [Lovarts 设计图创作平台](https://lovarts.art/) | 适用于设计图、图片生成和通用 AI 创作。 |

使用流程：

1. 注册账号。
2. 填写自己的供应商信息后开始使用，此时消耗你自己的 API，不会产生平台调用费用。
3. 没有自有 API 的用户，可以购买平台提供的会员或积分后使用。

## 项目概览

Lovarts Drama 是一个全栈 AI 短剧生产平台。它把短剧项目、分集剧本、角色库、场景库、分镜拆解、首帧图、视频生成、配音、字幕、合成导出和节点式创作画布放在同一个工作台里。

当前版本已经从早期的 SQLite 本地数据库迁移到 MySQL。SQLite 相关说明和 `DB_PATH` 已不再是主路径；后端默认读取 MySQL 配置，并使用 Redis 承载部分事件/缓存能力。


## 功能模块

| 模块 | 说明 |
| --- | --- |
| 短剧项目 | 创建短剧、分集、剧本和制作元信息。 |
| 角色库 | 管理角色档案、外貌、参考图、音色和生成资产。 |
| 场景库 | 管理地点、时间、视觉提示词和可复用场景资产。 |
| 分镜工作台 | 拆分剧本镜头，生成首帧、视频、配音、字幕和合成片段。 |
| 创作入口 | 首页灵感流、生成页和公共素材输入框。 |
| 无限画布 | 基于 Vue Flow 的文本、图片、视频节点工作流。 |
| 模型配置 | 在后台维护供应商、模型、计费规则、用户密钥和平台密钥。 |
| 会员/积分 | 支持套餐、积分包、订单、支付配置和会员发放任务。 |
| Codex 工作区 | 支持在产品内运行 Codex 任务、插件和用户隔离技能。 |


## 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | Nuxt 3, Vue 3, TypeScript, Naive UI, Tailwind CSS, Vue Flow, Pinia |
| 后端 | Node.js 20+, Hono, TypeScript, Drizzle ORM, Mastra, AI SDK |
| 数据库 | MySQL 8+，`mysql2`，Drizzle MySQL schema |
| 缓存/事件 | Redis，`ioredis` |
| 媒体处理 | FFmpeg, fluent-ffmpeg, sharp |
| 生产部署 | PM2, Nginx/宝塔 Nginx, Certbot, HTTPS |

## 目录结构

```text
.
├── backend/
│   ├── src/index.ts              # Hono app, middleware, route registration
│   ├── src/config/env.ts         # .env loader and MySQL/Redis/storage config
│   ├── src/db/                   # Drizzle DB entry, MySQL schema and helpers
│   ├── src/routes/               # REST API modules
│   ├── src/services/             # AI, storage, billing, membership, media services
│   ├── scripts/                  # MySQL init, schema sync, model seed scripts
│   └── sql/mysql-init.sql        # MySQL base schema
├── frontend/
│   ├── app/pages/                # Nuxt routes
│   ├── app/components/           # Shared UI components
│   ├── app/composables/          # API and feature composables
│   ├── app/canvas/               # Infinite canvas modules
│   └── app/assets/               # Global styles
├── skills/                       # Agent skill prompt assets
├── configs/                      # Optional config templates
├── data/                         # Runtime local files and generated media
├── deploy_drama_lovarts.sh       # Current server deploy script
├── Dockerfile
└── docker-compose.yml            # Legacy/simple container entry
```

## 本地运行

### 依赖要求

- Node.js 20+
- npm 9+
- MySQL 8+
- Redis 6+
- FFmpeg 4+

macOS 可用 Homebrew 安装基础依赖：

```bash
brew install mysql redis ffmpeg
```

Ubuntu / Debian：

```bash
sudo apt update
sudo apt install mysql-server redis-server ffmpeg
```

### 安装依赖

```bash
cd /path/to/huobao

cd backend
npm install

cd ../frontend
npm install
```

### 配置环境变量

后端会读取两个位置的 `.env`：

```text
.env
backend/.env
```

推荐本地使用 `backend/.env`。最小配置示例：

```env
DB_DRIVER=mysql
DATABASE_URL="mysql://huobao:your_password@127.0.0.1:3306/huobao?useSSL=false&serverTimezone=Asia%2FShanghai&allowPublicKeyRetrieval=true"

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_TLS=false

PORT=5679
NODE_ENV=development
PUBLIC_URL=http://localhost:3013
API_PUBLIC_URL=http://localhost:5679
AUTH_SECRET=change-me-in-local-dev
```

也可以不用 `DATABASE_URL`，改用拆分变量：

```env
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=huobao
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=huobao
MYSQL_TIMEZONE=+08:00
```

### 启动 MySQL 和 Redis

macOS：

```bash
brew services start mysql
brew services start redis
```

Ubuntu / Debian：

```bash
sudo systemctl start mysql
sudo systemctl start redis-server
```

### 创建数据库和账号

示例：

```sql
CREATE DATABASE huobao CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'huobao'@'%' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON huobao.* TO 'huobao'@'%';
FLUSH PRIVILEGES;
```

本机只连 `127.0.0.1` 时，也可以把账号限定为 `'huobao'@'localhost'`。

### 初始化和同步 MySQL 表结构

首次创建库后运行：

```bash
cd backend
npm run db:mysql:init
npm run db:sync:membership
```

如果已有旧库，或者从 SQLite 时代迁移过来的库缺少新字段，也运行：

```bash
cd backend
npm run db:sync:membership
```

这个脚本会补齐会员、积分、用户资源模式等运行时需要的字段，例如 `resource_mode`、`onboarding_completed_at`。

### 可选：初始化模型和套餐数据

按需要执行：

```bash
cd backend
npm run db:seed:zenmux-models
npm run db:seed:apimart-gpt-image-2
npm run db:seed:apimart-gemini-image
npm run db:seed:volcengine-seedream-image
npm run db:seed:volcengine-seedance-video
npm run db:seed:credit-packages
npm run db:seed:membership-plans
```

### 启动开发服务

启动后端：

```bash
cd backend
npm run dev
```

启动前端：

```bash
cd frontend
npm run dev
```

打开：

```text
Frontend: http://localhost:3013
Backend:  http://localhost:5679
Health:   http://localhost:5679/api/v1/health

常用模块：

| 路由 | 模块 |
| --- | --- |
| `/health` | 健康检查 |
| `/dramas` | 短剧项目 |
| `/episodes` | 分集 |
| `/storyboards` | 分镜 |
| `/characters` | 角色 |
| `/scenes` | 场景 |
| `/images` | 图片生成 |
| `/videos` | 视频生成 |
| `/upload` | 上传 |
| `/creations` | 创作任务 |
| `/events` | 事件流 |
| `/canvas-projects` | 画布项目 |
| `/billing` | 会员、积分、订单 |
| `/admin/*` | 管理后台接口 |
| `/ai-models` | 模型配置 |
| `/ai-configs` | 服务密钥配置 |
| `/ai-providers` | 供应商模板 |
| `/agent` | Agent 调用 |
| `/skills` | Agent 技能 |
| `/codex` | Codex 工作区 |

## 常用命令

后端：

```bash
cd backend
npm run dev                  # 开发模式，tsx watch src/index.ts
npm run start                # 直接启动后端
npm run build                # TypeScript 编译
npm run typecheck            # 仅类型检查
npm run db:mysql:init        # 初始化 MySQL 基础表
```


如果没有该目录，会回退读取：

```text
frontend/dist

```

## 部署

当前服务器部署脚本：

```bash
./deploy_drama_lovarts.sh
```

默认部署目标：

| 项 | 值 |
| --- | --- |
| 服务器 | `103.171.35.146` |
| 用户 | `root` |
| 域名 | `drama.lovarts.art` |
| 远端目录 | `/www/wwwroot/drama-lovarts` |
| PM2 应用名 | `drama-lovarts-backend` |
| 应用端口 | `5679` |
| Nginx | 优先适配宝塔路径 `/www/server/nginx` |

脚本会做这些事：

1. 打包项目，排除 `.git`、`node_modules`、构建产物、`data`、`output`。
2. 上传到服务器。
3. 安装或确认 Node.js、PM2、FFmpeg、Nginx、Certbot。
4. 远端执行 `frontend npm ci && npm run generate`。
5. 远端执行 `backend npm ci`。
6. 用 PM2 启动或重启 `drama-lovarts-backend`。
7. 写入宝塔 Nginx 虚拟主机配置。
8. 使用 Certbot 为 `drama.lovarts.art` 申请 HTTPS 证书。
9. 执行 `npm run db:sync:membership` 并重启后端。

可覆盖默认值：

```bash
SERVER_IP=1.2.3.4 \
SERVER_USER=root \
SERVER_PASS='your_password' \
DOMAIN=example.com \
REMOTE_DIR=/www/wwwroot/example \
APP_NAME=example-backend \
APP_PORT=5679 \
./deploy_drama_lovarts.sh
```

部署后检查：

```bash
curl https://drama.lovarts.art/api/v1/health
ssh root@103.171.35.146 "pm2 list"
```

## Docker 说明

仓库仍保留 `Dockerfile` 和 `docker-compose.yml`，但当前业务主线已经迁移到 MySQL/Redis。现有 compose 文件只启动应用容器，没有内置 MySQL/Redis 服务，也没有完整注入 MySQL 环境变量。

如果要使用 Docker Compose，请先补齐：

- MySQL 服务或外部 MySQL 连接。
- Redis 服务或外部 Redis 连接。
- `DATABASE_URL` / `MYSQL_*` 环境变量。
- `REDIS_*` 环境变量。
- `data/static` 持久化卷。


```bash
cd backend
npm run db:sync:membership
```

然后重启后端。


## 提交前检查

```bash
cd frontend
npm run build

cd ../backend
npm run typecheck
```
## License

Released under the [MIT License](./LICENSE).
