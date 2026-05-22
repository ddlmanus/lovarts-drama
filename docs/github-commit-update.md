# GitHub 提交更新文档

## 对比范围

- 基准版本：`origin/main`，最新远端提交为 `19186cc 消息展示优化`
- 当前版本：本地 `main` 的 `66f2eba 完善 Codex 工作区交互`
- 对比命令：`git diff origin/main..HEAD`
- 对比时间：2026-05-22

本次文档只基于已提交到本地 Git 历史、但尚未推送到 `origin/main` 的 2 个提交编写。当前工作区存在大量未提交改动，未纳入本次更新说明。

## 提交列表

| 提交 | 日期 | 作者 | 说明 |
| --- | --- | --- | --- |
| `b8859a9` | 2026-05-20 | ddlmanus | 输入框样式调整 |
| `66f2eba` | 2026-05-20 | ddlmanus | 完善 Codex 工作区交互 |

## 更新摘要

本次更新重点优化了 Codex 工作区的交互体验，并扩展了插件体系。前端侧新增插件/技能分栏、插件市场展示、Photoshop 插件设置弹窗、供应商与模型选择控件，并重构了输入框区域的布局与运行态展示。后端侧增加插件市场接口、Photoshop 云端插件配置与执行能力、Codex 供应商配置持久化，以及更友好的错误信息转换。

排除 `data/codex/**` 运行数据后，业务代码层面主要涉及 4 个文件：

- `.gitignore`
- `backend/src/routes/codexWorkspace.ts`
- `frontend/app/composables/useApi.ts`
- `frontend/app/pages/chat.vue`

业务代码统计为 1,741 行新增、203 行删除。其中前端 Codex 页面是主要改动区域。

## 主要功能更新

### 1. Codex 插件中心升级

- 左侧导航入口从“技能”调整为“插件”。
- 插件页新增“插件 / 技能”双 Tab，可在同一页面切换管理。
- 新增内置插件市场列表，包含 Spreadsheets、Presentations、GitHub、Slack、Notion、Linear、Statsig、Gmail、Google Calendar、Google Drive、Teams、SharePoint、Photoshop 等插件。
- 插件卡片支持安装状态展示，未安装插件可通过界面触发安装。
- 已安装插件可直接作为对话上下文进入 Codex 工作流。

### 2. Photoshop 云端插件

新增 Photoshop 插件配置、测试和执行链路，支持通过 Adobe Photoshop / Firefly Services 云端 API 处理上传图片。

后端新增能力：

- 保存当前用户的 Photoshop 配置，包括 Adobe Client ID、Client Secret、公网 Base URL、默认操作和输出格式。
- 支持 Photoshop 连接测试，先校验 Adobe 凭证是否可用。
- 支持根据用户提示自动识别“去背景”或“蒙版”任务。
- 支持提交 Adobe 云端任务、轮询任务状态、下载处理结果，并把结果作为图片生成产物写回任务事件。
- Photoshop 任务使用独立 runtime：`photoshop`，不依赖 Codex API Key。

前端新增能力：

- Photoshop 插件设置弹窗。
- Adobe Client Secret 保存后只显示末尾预览，避免明文回显。
- 执行前校验是否已配置 Photoshop 插件。
- 执行前校验是否已上传图片。
- Photoshop 插件可以通过插件卡片或 slash 上下文进入对话。

注意：Adobe 云端无法访问本地 `localhost` 图片。执行 Photoshop 云端任务前，需要配置可公网访问的 Base URL 或对象存储回源地址。

### 3. Codex 供应商与模型配置增强

- Codex 配置增加 `provider` 字段。
- 后端支持根据 Base URL 推断供应商，例如 ZenMux、OpenAI、OpenRouter、AiHubMix。
- 不同供应商写入不同环境变量键：
  - ZenMux：`ZENMUX_API_KEY`
  - OpenAI：`OPENAI_API_KEY`
  - 其他 OpenAI 兼容服务：`CODEX_API_KEY`
- 设置弹窗新增供应商选择。
- 设置弹窗新增模型 datalist 和常用模型快捷按钮。
- 输入框底部新增供应商选择器和模型选择器，便于在发起任务前快速切换。

### 4. 输入框与任务输出体验优化

- 输入框高度、间距、阴影和底部工具栏视觉重新调整。
- 权限选择从普通下拉框改为带图标的组合控件。
- 移除独立推理强度下拉展示，输入框区域更紧凑。
- 运行中状态改为输入框右侧的小型旋转指示器。
- 变更摘要条与输入框区域整合更紧密。
- 会话输出区域增加滚动监听，图片加载后可触发布局更新。
- 编辑文件、变更文件展示改为优先显示文件名，并保留完整路径 title，减少长路径挤压界面。
- 活动日志从圆点改为更明确的图标展示。

### 5. Codex app-server 事件与错误展示优化

- 新增 `fileChange` 事件识别，可在前端更自然地展示文件编辑状态。
- `turn/failed` 和通用错误事件增加友好错误文案转换。
- 针对常见错误提供更明确提示：
  - 429：请求过于频繁或模型额度受限。
  - 401：API Key 无效或认证失败。
  - 403：当前 Key 无模型访问权限。
  - 404：生成接口或模型不可用。
  - 流中断：提示稍后重试或切换供应商/模型。

## API 变更

### 新增接口

- `GET /codex/plugins/photoshop/config`
  - 获取当前用户 Photoshop 插件配置的安全展示版本。

- `PUT /codex/plugins/photoshop/config`
  - 保存当前用户 Photoshop 插件配置。

- `POST /codex/plugins/photoshop/config/test`
  - 测试 Adobe Photoshop / Firefly Services 连接。

- `POST /codex/plugins/install`
  - 安装内置插件到当前用户的 Codex 插件目录。

### 已有接口扩展

- `GET /codex/skills`
  - 返回值新增 `marketplace_plugins`，用于插件市场展示。

- `PUT /codex/config`
  - 请求体新增 `provider` 字段。
  - 配置写入时会根据供应商生成对应 Codex 配置。

- `POST /codex/tasks`
  - 当选中的上下文为 Photoshop 插件时，任务 runtime 切换为 `photoshop`，走 Adobe 云端处理流程。

- `POST /codex/tasks/:id/messages`
  - Photoshop 插件续发消息时会创建新的 Photoshop 任务，不复用 Codex thread。

## 文件级变更

### 后端

- `backend/src/routes/codexWorkspace.ts`
  - 新增插件市场定义和插件安装逻辑。
  - 新增 Photoshop 配置存储、校验、测试、执行与结果下载逻辑。
  - 新增 provider 规范化、供应商推断和 Codex 配置写入增强。
  - 新增友好错误信息转换。
  - 扩展任务 runtime、selected context 和 app-server 事件处理。

### 前端

- `frontend/app/pages/chat.vue`
  - 插件/技能页面重构。
  - 新增插件市场、插件安装、Photoshop 设置弹窗。
  - 新增 Codex 供应商和模型配置交互。
  - 调整输入框、任务输出、活动日志、变更摘要和响应式样式。

- `frontend/app/composables/useApi.ts`
  - 新增插件安装和 Photoshop 配置相关 API 封装。

### 仓库配置

- `.gitignore`
  - 新增忽略 `data/codex/`，避免 Codex 运行数据继续进入版本管理。

## 数据文件变更说明

提交 `b8859a9` 同时包含了较多 `data/codex/**` 下的运行数据、日志、SQLite 文件、任务记录和 shell snapshot。这些文件更像本地 Codex 运行态数据，不属于稳定业务代码。

后续建议：

- 保留 `.gitignore` 中对 `data/codex/` 的忽略规则。
- 若远端仓库已经提交过 `data/codex/**` 文件，建议单独清理版本库中的历史跟踪文件。
- 避免把 token、任务日志、SQLite 运行库和用户本地 Codex home 继续提交到 GitHub。

## 兼容性与部署注意事项

- Photoshop 云端插件依赖 Adobe Developer Console 凭证。
- Photoshop 图片处理依赖公网可访问的附件 URL，本地开发环境需要反向代理、临时公网隧道或对象存储。
- Codex 配置现在依赖 `provider` 字段，旧配置如果没有 provider，会根据 Base URL 自动推断；无法推断时使用 `custom`。
- OpenAI 兼容服务仍通过 Responses wire API 调用，Base URL 和模型名称需要与对应供应商兼容。
- 本次更新没有看到测试用例变更，发布前建议至少验证：
  - Codex 设置保存和连接测试。
  - ZenMux、OpenAI 或 OpenRouter 至少一个供应商的任务发起。
  - 插件页加载、搜索、安装、已安装状态展示。
  - Photoshop 配置测试、上传图片、去背景或蒙版任务。
  - 普通 Codex 对话、续发消息、任务失败提示。

## 发布说明建议

推荐发布文案：

> 本次更新升级了 Codex 工作区交互，新增插件中心和 Photoshop 云端插件，支持供应商/模型快速切换，并优化了输入框、任务日志、文件变更和错误提示体验。后端同步增加插件安装、Photoshop 配置测试、Adobe 云端任务执行和多供应商 Codex 配置写入能力。

