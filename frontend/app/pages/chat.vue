<template>
  <div class="codex-page" :class="{ 'panel-collapsed': codexPanelCollapsed }">
    <aside class="project-panel">
      <div class="panel-toolbar">
        <span>Codex</span>
      </div>
      <div class="panel-nav">
        <button class="nav-action" type="button" :disabled="!activeProject" @click="newThread">
          <Edit3 :size="18" />
          <span>新对话</span>
        </button>
        <button class="nav-action" type="button" @click="openSkillInstallChat">
          <Search :size="18" />
          <span>搜索</span>
        </button>
        <button class="nav-action" type="button" :class="{ active: currentView === 'skills' }" @click="openSkillsPage">
          <Blocks :size="18" />
          <span>技能</span>
        </button>
      </div>

      <div class="section-title project-section-title">
        <button class="project-collapse-btn" type="button" title="折叠项目">
          <span>⌄</span>
        </button>
        <button class="project-title-action" type="button" @click="projectDialogOpen = true">
          <Plus :size="18" />
          <span>新建项目</span>
        </button>
        <div class="project-section-actions">
          <button type="button" title="更多项目操作">...</button>
          <button type="button" title="新建项目" @click="projectDialogOpen = true">
            <Plus :size="14" />
          </button>
        </div>
      </div>
      <div class="project-list">
        <div v-for="project in projects" :key="project.id" class="project-group">
          <div class="project-row" :class="{ active: project.id === activeProjectId }">
            <button class="project-item" type="button" @click="selectProject(project.id)">
              <Folder :size="18" />
              <span>
                <strong>{{ project.name }}</strong>
              </span>
            </button>
            <button class="project-menu-btn" type="button" title="项目操作" @click.stop="toggleProjectMenu(project.id)">
              ...
            </button>
            <div v-if="openProjectMenuId === project.id" class="project-menu" @click.stop>
              <button type="button" class="danger" @click="deleteProject(project)">删除项目</button>
            </div>
          </div>
          <div class="project-thread-list">
            <div
              v-for="task in tasksForProject(project.id)"
              :key="task.id"
              class="task-item"
              :class="{ active: task.id === activeTaskId }"
              @click="openTask(task.id)"
            >
              <span class="task-title">
                <strong>{{ task.prompt }}</strong>
              </span>
              <span class="task-time">{{ relativeTaskTime(task.updated_at || task.created_at) }}</span>
              <span v-if="task.status === 'running'" class="task-spinner"></span>
              <button class="task-delete-btn" type="button" title="删除聊天记录" @click.stop="deleteTask(task)">
                <X :size="14" />
              </button>
            </div>
          </div>
        </div>
        <div v-if="!projects.length" class="empty-state">暂无项目</div>
      </div>

      <div class="panel-footer">
        <button class="nav-action" type="button" @click="openCodexSettings">
          <Settings :size="18" />
          <span>设置</span>
        </button>
        <div class="codex-status">
          {{ codexStatus.installed ? (codexConfig.api_key_set ? 'Codex 已配置' : 'Codex 未配置') : 'Codex 未安装' }}
          <span v-if="codexConfig.api_key_preview"> {{ codexConfig.api_key_preview }}</span>
        </div>
      </div>
    </aside>

    <main class="workspace-main">
      <section v-if="currentView === 'skills'" class="skills-page">
        <div class="skills-topbar">
          <button class="skills-toolbar-btn" type="button" :disabled="skillsLoading" @click="loadUserSkills">
            <Loader2 v-if="skillsLoading" :size="16" class="spin" />
            <RefreshCw v-else :size="16" />
            <span>刷新</span>
          </button>
          <label class="skills-search">
            <Search :size="17" />
            <input v-model="skillsSearchQuery" placeholder="搜索技能" />
          </label>
          <button class="skills-new-btn" type="button" @click="openSkillInstallChat">
            <Plus :size="18" />
            <span>新建技能</span>
          </button>
        </div>
        <div class="skills-content">
          <div class="skills-hero">
            <h1>Skills</h1>
            <p>给 Codex 增加当前用户专属能力。</p>
          </div>
          <section class="skills-section">
            <h2>已安装</h2>
            <div v-if="filteredSkills.length" class="skills-grid">
              <button
                v-for="skill in filteredSkills"
                :key="skill.id || skill.path || skill.name"
                class="skill-card"
                type="button"
                :class="{ selected: selectedSlashItem?.path === `${skill.path}/SKILL.md` || selectedSlashItem?.name === skill.name }"
                @click="openSkillChat(skill)"
              >
                <span class="skill-icon">
                  <Blocks :size="19" />
                </span>
                <span class="skill-meta">
                  <strong>{{ skill.name }}</strong>
                  <em>{{ skill.description || '当前用户已安装技能' }}</em>
                </span>
                <Check v-if="skill.scope === 'system'" :size="17" />
                <span v-else class="skill-menu-wrap">
                  <button class="skill-menu-btn" type="button" title="技能操作" @click.stop="toggleSkillMenu(skill.id)">
                    ...
                  </button>
                  <span v-if="openSkillMenuId === skill.id" class="skill-menu" @click.stop>
                    <button type="button" @click="deleteSkill(skill)">卸载技能</button>
                  </span>
                </span>
              </button>
            </div>
            <div v-else class="skills-empty">
              {{ skillsSearchQuery ? '没有匹配的技能' : '暂无已安装技能，点击右上角新建技能开始安装。' }}
            </div>
          </section>
        </div>
      </section>

      <section v-else-if="!activeProject" class="welcome-panel">
        <div class="brand-word">Codex</div>
        <p>创建一个项目文件夹后，可以像 Codex App 一样在项目里开线程、运行任务和继续对话。</p>
        <button class="primary-btn" type="button" @click="projectDialogOpen = true">创建项目</button>
      </section>

      <section v-else class="codex-workspace" :class="{ composing: isComposingThread, 'terminal-visible': terminalOpen }">
        <header v-if="!isComposingThread" class="workspace-head">
          <div class="title-cluster">
            <button
              class="header-icon"
              type="button"
              :title="codexPanelCollapsed ? '展开侧栏' : '收起侧栏'"
              @click="codexPanelCollapsed = !codexPanelCollapsed"
            >
              <PanelLeft v-if="codexPanelCollapsed" :size="18" />
              <PanelLeftClose v-else :size="18" />
            </button>
            <div>
              <h1>{{ activeTask?.prompt || activeProject.name }}</h1>
              <p>{{ activeProject.path }}</p>
            </div>
          </div>
          <div class="head-actions">
            <button class="header-icon" type="button" title="控制台" :class="{ active: terminalOpen }" @click="toggleTerminal">
              <TerminalSquare :size="16" />
            </button>
            <button class="header-icon" type="button" title="GitHub" :class="{ active: gitPanelOpen }" @click="toggleGitPanel">
              <Github :size="16" />
            </button>
          </div>
        </header>

        <section v-if="gitPanelOpen" class="git-popover" @click.stop>
          <div class="git-popover-head">
            <h2>Git</h2>
            <button type="button" title="刷新 Git 状态" :disabled="gitLoading" @click="loadGitStatus">
              <Loader2 v-if="gitLoading" :size="15" class="spin" />
              <RefreshCw v-else :size="15" />
            </button>
          </div>

          <div v-if="gitLoading && !gitStatus" class="git-empty">正在读取 Git 信息...</div>
          <div v-else-if="gitStatus && !gitStatus.is_repo" class="git-empty">
            当前项目还不是 Git 仓库。可以先在项目目录里初始化 Git，或绑定一个已有仓库。
          </div>
          <template v-else-if="gitStatus">
            <div class="git-row">
              <GitCompareArrows :size="16" />
              <span>Changes</span>
              <strong>{{ gitStatus.changed_files || 0 }}</strong>
              <em class="git-additions">+{{ formatNumber(gitStatus.additions) }}</em>
              <em class="git-deletions">-{{ formatNumber(gitStatus.deletions) }}</em>
            </div>
            <div class="git-row">
              <HardDrive :size="16" />
              <span>Local</span>
              <strong>{{ gitStatus.local ? '已连接' : '不可用' }}</strong>
            </div>
            <div class="git-row">
              <GitBranch :size="16" />
              <span>{{ gitStatus.branch || '无分支' }}</span>
            </div>
            <div class="git-row">
              <Github :size="16" />
              <span>{{ gitStatus.remote_label || '未配置 GitHub remote' }}</span>
            </div>

            <div class="git-commit-box">
              <div class="git-section-label">Commit</div>
              <input v-model="gitCommitMessage" placeholder="填写提交说明" @keydown.enter.prevent="commitGitChanges" />
              <button
                class="git-action primary"
                type="button"
                :disabled="gitActionLoading || !gitCommitMessage.trim() || !(gitStatus.changed_files > 0)"
                @click="commitGitChanges"
              >
                <Loader2 v-if="gitActionLoading === 'commit'" :size="15" class="spin" />
                <GitCommitHorizontal v-else :size="15" />
                <span>{{ gitActionLoading === 'commit' ? '提交中...' : '提交代码' }}</span>
              </button>
              <button
                class="git-action"
                type="button"
                :disabled="gitActionLoading || !gitStatus.remote"
                @click="pushGitChanges"
              >
                <Loader2 v-if="gitActionLoading === 'push'" :size="15" class="spin" />
                <UploadCloud v-else :size="15" />
                <span>{{ gitActionLoading === 'push' ? '推送中...' : '推送到 GitHub' }}</span>
              </button>
            </div>

            <div class="git-auth-line" :class="{ ok: gitStatus.github_authenticated }">
              {{ gitStatus.github_status || 'GitHub 状态未知' }}
            </div>
          </template>
          <div v-else class="git-empty">点击刷新读取当前项目 Git 信息。</div>
        </section>

        <div v-if="!isComposingThread" class="task-output">
          <div v-if="renderedEvents.length" ref="logBox" class="conversation-box">
            <div v-if="taskDurationLabel" class="task-duration-line">
              <span>{{ taskDurationLabel }}</span>
              <ChevronRight :size="17" />
            </div>
            <div
              v-for="event in renderedEvents"
              :key="event.key"
              class="codex-event"
              :class="[event.kind, event.role, event.level]"
            >
              <div v-if="event.kind === 'status'" class="status-line">
                <Terminal :size="15" />
                <span>{{ event.text }}</span>
              </div>
              <div v-else-if="event.kind === 'activity'" class="activity-line">
                <span class="activity-dot"></span>
                <span>{{ event.text }}</span>
              </div>
              <div v-else-if="event.kind === 'changes'" class="changes-card">
                <div class="changes-card-head">
                  <div class="changes-card-title">
                    <FileCode2 :size="16" />
                    <span>{{ event.title }}</span>
                  </div>
                  <div class="changes-card-actions">
                    <span class="change-stat additions">+{{ event.stats.added }}</span>
                    <span class="change-stat deletions">-{{ event.stats.removed }}</span>
                    <button type="button" @click="openPreview(event.files[0]?.path)">Review</button>
                  </div>
                </div>
                <button
                  v-for="file in event.files"
                  :key="`${event.key}-${file.path}`"
                  class="changes-file-row"
                  type="button"
                  :class="{ active: selectedPreviewPath === file.path && previewPanelOpen }"
                  @click="openPreview(file.path)"
                >
                  <span class="changes-file-path">{{ file.displayPath || file.path }}</span>
                  <span class="changes-file-meta">{{ file.action }}</span>
                  <span class="change-stat additions">+{{ file.added }}</span>
                  <span class="change-stat deletions">-{{ file.removed }}</span>
                </button>
              </div>
              <details v-else-if="event.kind === 'tool'" class="tool-line">
                <summary>
                  <span>{{ event.title || '执行命令' }}</span>
                </summary>
                <pre>{{ event.text }}</pre>
              </details>
              <div v-else class="message-row" :class="event.role">
                <div class="message-bubble">
                  <div
                    v-if="event.role === 'assistant'"
                    class="markdown-body"
                    v-html="renderMarkdown(event.text)"
                    @click="handleMarkdownClick"
                  ></div>
                  <pre v-else>{{ event.text }}</pre>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="empty-output">
            <Bot :size="34" />
            <h2>开始任务</h2>
            <p>描述你要 Codex 在当前项目里完成的工作。</p>
          </div>
        </div>

        <div v-else class="new-chat-center">
          <h1>要在 {{ activeProject.name }} 里构建什么？</h1>
        </div>

        <form class="codex-composer" @submit.prevent="startTask">
          <input ref="fileInput" class="hidden-file-input" type="file" accept="image/*" multiple @change="handleAttachmentChange" />
          <div v-if="slashMenuOpen" class="slash-menu">
            <div class="slash-menu-head">
              <span>命令</span>
              <small>当前用户</small>
            </div>
            <button
              v-for="item in slashMenuItems"
              :key="`${item.type}-${item.id}`"
              class="slash-menu-item"
              type="button"
              @mousedown.prevent="applySlashItem(item)"
            >
              <span class="slash-icon">{{ item.type === 'skill' ? '/' : '*' }}</span>
              <span>
                <strong>{{ item.name }}</strong>
                <em>{{ item.description || (item.type === 'skill' ? '使用当前用户已安装的 skill' : '插件') }}</em>
              </span>
              <small>{{ item.type === 'skill' ? 'Skill' : 'Plugin' }}</small>
            </button>
            <button v-if="!slashMenuItems.length" class="slash-menu-item muted" type="button" disabled>
              <span class="slash-icon">/</span>
              <span>
                <strong>暂无已安装 Skill</strong>
                <em>可以先让 Codex 安装 skill，安装后只属于当前用户</em>
              </span>
            </button>
          </div>
          <div v-if="attachments.length" class="attachment-strip">
            <div v-for="attachment in attachments" :key="attachment.path" class="attachment-chip">
              <Image :size="14" />
              <span>{{ attachment.name }}</span>
              <button type="button" title="移除" @click="removeAttachment(attachment.path)">
                <X :size="13" />
              </button>
            </div>
          </div>
          <div v-if="selectedSlashItem" class="selected-context-strip">
            <button class="selected-context-chip" type="button" title="移除" @click="selectedSlashItem = null">
              <Sparkles v-if="selectedSlashItem.type === 'skill'" :size="15" />
              <Settings v-else :size="15" />
              <span>{{ selectedSlashItem.name }}</span>
              <X :size="13" />
            </button>
          </div>
          <textarea
            ref="draftInput"
            v-model="draft"
            rows="4"
            placeholder="描述你要 Codex 做的工作。Enter 发送，Shift + Enter 换行"
            :disabled="starting"
            @input="handleDraftInput"
            @focus="handleDraftInput"
            @keydown.escape="slashMenuOpen = false"
            @keydown.enter.exact.prevent="startTask"
          ></textarea>
          <div class="composer-footer">
            <button class="round-tool" type="button" :disabled="uploadingAttachment" title="添加图片" @click="fileInput?.click()">
              <Loader2 v-if="uploadingAttachment" :size="18" class="spin" />
              <Plus v-else :size="20" />
            </button>
            <select v-model="selectedSandbox" class="inline-select permission-select">
              <option value="workspace-write">默认权限</option>
              <option value="read-only">只读</option>
              <option value="danger-full-access">完全控制</option>
            </select>
            <div class="composer-spacer"></div>
            <select v-model="selectedModel" class="inline-select model-select">
              <option value="">设置默认</option>
              <option v-if="codexConfig.model" :value="codexConfig.model">{{ codexConfig.model }}</option>
              <option value="gpt-5.5">5.5</option>
              <option value="gpt-5.4">5.4</option>
              <option value="gpt-5.4-mini">5.4 Mini</option>
              <option value="gpt-5.3-codex">5.3 Codex</option>
            </select>
            <select v-model="selectedReasoning" class="inline-select reasoning-select">
              <option value="">高</option>
              <option value="minimal">极低</option>
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
              <option value="xhigh">极高</option>
            </select>
            <button
              class="send-btn"
              :class="{ running: isCurrentTaskRunning || starting }"
              :type="isCurrentTaskRunning ? 'button' : 'submit'"
              :disabled="starting || (!isCurrentTaskRunning && !draft.trim())"
              @click="isCurrentTaskRunning && activeTask?.id ? cancelTask(activeTask.id) : undefined"
            >
              <span v-if="isCurrentTaskRunning || starting" class="stop-icon"></span>
              <ArrowUp v-else :size="18" />
            </button>
          </div>
          <div v-if="isComposingThread" class="composer-project-meta">
            <span>
              <Folder :size="15" />
              {{ activeProject.name }}
            </span>
            <span>
              <HardDrive :size="15" />
              {{ workspaceLabel }}
            </span>
            <span>
              <GitBranch :size="15" />
              {{ projectBranchLabel }}
            </span>
          </div>
        </form>

        <aside v-if="previewPanelOpen" class="codex-preview-panel">
          <div class="preview-head">
            <div>
              <strong>{{ selectedPreview?.name || '文件变更' }}</strong>
              <span>{{ selectedPreview?.displayPath || selectedPreview?.path }}</span>
            </div>
            <button type="button" title="关闭预览" @click="previewPanelOpen = false">
              <X :size="16" />
            </button>
          </div>
          <div v-if="selectedPreview && previewMode === 'diff'" class="preview-meta">
            <span>{{ selectedPreview.action }}</span>
            <span>+{{ selectedPreview.added }}</span>
            <span>-{{ selectedPreview.removed }}</span>
          </div>
          <div v-if="selectedPreview" class="preview-tabs">
            <button type="button" :class="{ active: previewMode === 'file' }" @click="previewMode = 'file'">文件</button>
            <button type="button" :class="{ active: previewMode === 'diff' }" @click="previewMode = 'diff'">变更</button>
          </div>
          <template v-if="selectedPreview">
            <div v-if="previewMode === 'diff'" class="preview-code-editor">
              <div
                v-for="line in previewEditorLines(selectedPreview.displayPatch || selectedPreview.patch || '暂无可预览内容')"
                :key="line.key"
                class="preview-code-line"
                :class="line.kind"
              >
                <span class="preview-line-number">{{ line.number }}</span>
                <code>{{ line.text || ' ' }}</code>
              </div>
            </div>
            <div v-else class="preview-file-view">
              <div v-if="previewFileLoading" class="preview-empty">正在读取文件...</div>
              <div v-else-if="previewFileError" class="preview-empty">{{ previewFileError }}</div>
              <template v-else>
                <div v-if="previewFileMeta" class="preview-file-meta">
                  <span>{{ previewFileMeta.language || 'text' }}</span>
                  <span>{{ formatFileSize(previewFileMeta.size) }}</span>
                  <span v-if="previewFileMeta.truncated">仅显示前 1MB</span>
                </div>
                <div class="preview-code-editor">
                  <div
                    v-for="line in previewEditorLines(previewFileContent || '文件为空', false)"
                    :key="line.key"
                    class="preview-code-line"
                  >
                    <span class="preview-line-number">{{ line.number }}</span>
                    <code>{{ line.text || ' ' }}</code>
                  </div>
                </div>
              </template>
            </div>
          </template>
          <div v-else class="preview-empty">选择一个变更文件查看预览</div>
        </aside>

        <section v-if="terminalOpen" class="terminal-drawer">
          <div class="terminal-tabs">
            <button
              v-for="session in terminalSessions"
              :key="session.id"
              class="terminal-tab"
              type="button"
              :class="{ active: session.id === activeTerminalId }"
              @click="selectTerminal(session.id)"
            >
              <TerminalSquare :size="15" />
              <span>{{ session.project_name || activeProject.name }}</span>
              <em v-if="!session.running">已退出</em>
            </button>
            <button class="terminal-add" type="button" title="新建终端" :disabled="terminalLoading" @click="createTerminalSession">
              <Plus :size="16" />
            </button>
            <button class="terminal-close" type="button" title="隐藏终端 Ctrl+J" @click="terminalOpen = false">
              <X :size="16" />
            </button>
          </div>
          <div ref="terminalOutputEl" class="terminal-output">
            <div v-if="activeTerminal" ref="xtermHost" class="xterm-host"></div>
            <div v-else class="terminal-empty">点击 + 新建一个项目终端。</div>
          </div>
        </section>
      </section>
    </main>

    <div v-if="projectDialogOpen" class="dialog-backdrop" @click.self="projectDialogOpen = false">
      <section class="project-dialog" role="dialog" aria-modal="true" aria-label="新建项目">
        <h2>添加 Codex 项目</h2>
        <p v-if="projectSource === 'managed'">系统会创建隔离空目录，适合新项目或测试任务。</p>
        <p v-else-if="projectSource === 'local'">打开系统目录选择器，确认导入后 Codex 会在你选择的项目目录里工作。</p>
        <p v-else>输入 GitHub 仓库地址，系统会拉取到本地隔离工作区并导入为 Codex 项目。</p>
        <div class="project-source-tabs">
          <button type="button" :class="{ active: projectSource === 'managed' }" @click="projectSource = 'managed'">新建空项目</button>
          <button type="button" :class="{ active: projectSource === 'local' }" @click="projectSource = 'local'">绑定本地项目</button>
          <button type="button" :class="{ active: projectSource === 'github' }" @click="projectSource = 'github'">从 GitHub 导入</button>
        </div>
        <input v-if="projectSource === 'managed'" v-model="projectName" autofocus placeholder="项目名称，例如 landing-page-demo" @keydown.enter="createProject" />
        <input
          v-if="projectSource === 'local'"
          v-model="projectLocalPath"
          readonly
          placeholder="请选择本地项目文件夹"
          @keydown.enter="createProject"
        />
        <template v-if="projectSource === 'github'">
          <input v-model="projectRepoUrl" autofocus placeholder="GitHub 仓库地址，例如 https://github.com/user/repo" @input="inferProjectNameFromRepo" @keydown.enter="createProject" />
          <input v-model="projectName" placeholder="项目名称，默认使用仓库名" @keydown.enter="createProject" />
        </template>
        <div v-if="projectSource === 'local'" class="local-picker">
          <div class="local-picker-actions">
            <button type="button" class="secondary-btn" :disabled="directoryLoading" @click="pickLocalDirectory">
              打开本地目录选择器
            </button>
            <span v-if="directoryLoading">读取中...</span>
            <span v-else-if="projectLocalPath">已选择：{{ projectLocalPath }}</span>
          </div>
        </div>
        <p v-if="projectSource === 'local'" class="dialog-note">
          本地目录只适合火宝后端运行在你这台电脑时使用；服务器部署时应改用 GitHub/仓库工作区。为安全起见，不能绑定火宝应用自身目录或它的父子目录。
        </p>
        <p v-if="projectSource === 'github'" class="dialog-note">
          支持公开仓库或当前机器 Git 已授权可访问的私有仓库；下载后的代码会保存在 Codex 工作区里。
        </p>
        <div class="dialog-actions">
          <button class="secondary-btn" type="button" @click="projectDialogOpen = false">取消</button>
          <button class="primary-btn" type="button" :disabled="creatingProject || !canCreateProject" @click="createProject">
            {{ creatingProject ? (projectSource === 'github' ? '导入中...' : '创建中...') : (projectSource === 'local' || projectSource === 'github' ? '确认导入' : '创建') }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="settingsDialogOpen" class="dialog-backdrop" @click.self="settingsDialogOpen = false">
      <section class="project-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Codex 设置">
        <h2>Codex 设置</h2>
        <p>这里配置当前用户专用的 Codex 接口，不使用服务器或开发机器上的 Codex 登录信息。</p>
        <label class="form-field">
          <span>模型</span>
          <input v-model="codexConfigForm.model" placeholder="例如 gpt-5.3-codex" autocomplete="off" @input="markConfigUntested" />
        </label>
        <label class="form-field">
          <span>Base URL</span>
          <input v-model="codexConfigForm.base_url" placeholder="https://api.openai.com/v1" autocomplete="off" @input="markConfigUntested" />
        </label>
        <label class="form-field">
          <span>API Key</span>
          <input v-model="codexConfigForm.api_key" type="password" :placeholder="codexConfig.api_key_set ? `已保存 ${codexConfig.api_key_preview}，留空继续使用` : '输入当前用户自己的 API Key'" autocomplete="new-password" @input="markConfigUntested" />
        </label>
        <div v-if="configTestMessage" class="test-result" :class="{ ok: configTestPassed, error: !configTestPassed }">
          {{ configTestMessage }}
        </div>
        <p v-if="codexConfig.api_key_set" class="dialog-note">当前已保存密钥 {{ codexConfig.api_key_preview }}，重新保存会替换原密钥。</p>
        <div class="dialog-actions">
          <button class="secondary-btn" type="button" @click="settingsDialogOpen = false">取消</button>
          <button class="secondary-btn" type="button" :disabled="testingConfig || !canTestCodexConfig" @click="testCodexConfig">
            {{ testingConfig ? '测试中...' : '测试连接' }}
          </button>
          <button class="primary-btn" type="button" :disabled="savingConfig || !configTestPassed" @click="saveCodexConfig">
            {{ savingConfig ? '应用中...' : '应用' }}
          </button>
        </div>
      </section>
    </div>

    <div v-if="activeApproval" class="dialog-backdrop approval-backdrop">
      <section class="project-dialog approval-dialog" role="dialog" aria-modal="true" aria-label="Codex 授权确认">
        <div class="approval-card-head">
          <ShieldCheck :size="22" />
          <div>
            <h2>{{ approvalTitle(activeApproval) }}</h2>
            <p>{{ approvalReason(activeApproval) }}</p>
          </div>
        </div>
        <div class="approval-action-line">
          <span>{{ approvalActionSummary(activeApproval) }}</span>
        </div>
        <div class="approval-summary">
          <label v-if="activeApproval.kind === 'command'">
            <span>命令</span>
            <pre>{{ activeApproval.params.command || '未知命令' }}</pre>
          </label>
          <label v-if="activeApproval.kind === 'command' && activeApproval.params.cwd">
            <span>目录</span>
            <code>{{ activeApproval.params.cwd }}</code>
          </label>
          <label v-if="activeApproval.kind === 'file' && activeApproval.params.grantRoot">
            <span>写入范围</span>
            <code>{{ activeApproval.params.grantRoot }}</code>
          </label>
          <label v-if="activeApproval.kind === 'permissions'">
            <span>权限</span>
            <pre>{{ formatApprovalPermissions(activeApproval.params.permissions) }}</pre>
          </label>
        </div>
        <div class="dialog-actions">
          <button class="secondary-btn" type="button" :disabled="approvalResponding" @click="respondApproval(activeApproval, 'decline')">拒绝</button>
          <button class="secondary-btn" type="button" :disabled="approvalResponding" @click="respondApproval(activeApproval, 'acceptForSession')">本次会话允许</button>
          <button class="primary-btn" type="button" :disabled="approvalResponding" @click="respondApproval(activeApproval, 'accept')">允许一次</button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
definePageMeta({
  layout: false,
})

import {
  ArrowUp,
  Blocks,
  Bot,
  Check,
  ChevronRight,
  Edit3,
  FileCode2,
  Folder,
  GitBranch,
  GitCommitHorizontal,
  GitCompareArrows,
  Github,
  HardDrive,
  Image,
  Loader2,
  PanelLeft,
  PanelLeftClose,
  Plus,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Square,
  Terminal,
  TerminalSquare,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { codexAPI } from '~/composables/useApi'

let XtermCtor = null
let FitAddonCtor = null

const codexStatus = ref({})
const codexConfig = ref({})
const projects = ref([])
const tasks = ref([])
const activeProjectId = ref('')
const activeTaskId = ref('')
const activeTaskLogs = ref([])
const pendingUserMessages = ref([])
const approvals = ref([])
const approvalResponding = ref(false)
const composingNewThread = ref(false)
const currentView = ref('chat')
const codexPanelCollapsed = ref(false)
const projectDialogOpen = ref(false)
const settingsDialogOpen = ref(false)
const savingConfig = ref(false)
const testingConfig = ref(false)
const configTestPassed = ref(false)
const configTestMessage = ref('')
const codexConfigForm = reactive({
  model: '',
  base_url: '',
  api_key: '',
})
const openProjectMenuId = ref('')
const projectName = ref('')
const projectSource = ref('managed')
const projectLocalPath = ref('')
const projectRepoUrl = ref('')
const directoryLoading = ref(false)
const draft = ref('')
const slashMenuOpen = ref(false)
const selectedSlashItem = ref(null)
const userSkills = ref([])
const userPlugins = ref([])
const skillsSearchQuery = ref('')
const skillsLoading = ref(false)
const openSkillMenuId = ref('')
const selectedModel = ref('')
const selectedReasoning = ref('')
const selectedSandbox = ref('workspace-write')
const attachments = ref([])
const starting = ref(false)
const creatingProject = ref(false)
const uploadingAttachment = ref(false)
const previewPanelOpen = ref(false)
const selectedPreviewPath = ref('')
const previewMode = ref('file')
const previewFileContent = ref('')
const previewFileMeta = ref(null)
const previewFileLoading = ref(false)
const previewFileError = ref('')
const gitPanelOpen = ref(false)
const gitStatus = ref(null)
const gitLoading = ref(false)
const gitActionLoading = ref('')
const gitCommitMessage = ref('')
const terminalOpen = ref(false)
const terminalSessions = ref([])
const activeTerminalId = ref('')
const terminalLoading = ref(false)
const logBox = ref(null)
const fileInput = ref(null)
const draftInput = ref(null)
const terminalOutputEl = ref(null)
const xtermHost = ref(null)
let pollTimer = null
let terminalPollTimer = null
let terminalInstance = null
let terminalFitAddon = null
let terminalDataDisposable = null
let lastTerminalSeq = 0
let terminalResizeTimer = null
let knownTaskStatuses = {}

const activeProject = computed(() => projects.value.find(project => project.id === activeProjectId.value) || null)
const activeTask = computed(() => tasks.value.find(task => task.id === activeTaskId.value) || null)
const activeTerminal = computed(() => terminalSessions.value.find(session => session.id === activeTerminalId.value) || null)
const isCurrentTaskRunning = computed(() => activeTask.value?.status === 'running')
const isComposingThread = computed(() => !activeTaskId.value && !renderedEvents.value.length)
const taskDurationLabel = computed(() => formatTaskDuration(activeTask.value))
const activeApproval = computed(() => approvals.value[0] || null)
const canCreateProject = computed(() => {
  if (projectSource.value === 'local') return Boolean(projectLocalPath.value.trim())
  if (projectSource.value === 'github') return Boolean(projectRepoUrl.value.trim())
  if (!projectName.value.trim()) return false
  return true
})
const canTestCodexConfig = computed(() => {
  return Boolean(
    codexConfigForm.model.trim()
    && codexConfigForm.base_url.trim()
    && (codexConfigForm.api_key.trim() || codexConfig.value.api_key_set),
  )
})
const slashQuery = computed(() => {
  const text = String(draft.value || '')
  return text.trimStart().startsWith('/') ? text.trimStart().slice(1).trim().toLowerCase() : ''
})
const slashMenuItems = computed(() => {
  const items = [
    ...userSkills.value.map(skill => ({ ...skill, type: 'skill' })),
    ...userPlugins.value.map(plugin => ({ ...plugin, type: 'plugin' })),
  ]
  if (!slashQuery.value) return items
  return items.filter((item) => {
    const searchable = `${item.name || ''} ${item.description || ''}`.toLowerCase()
    return searchable.includes(slashQuery.value)
  })
})
const filteredSkills = computed(() => {
  const query = skillsSearchQuery.value.trim().toLowerCase()
  const skills = userSkills.value
  if (!query) return skills
  return skills.filter((skill) => {
    const text = `${skill.name || ''} ${skill.description || ''}`.toLowerCase()
    return text.includes(query)
  })
})
const workspaceLabel = computed(() => {
  if (!activeProject.value) return '工作空间'
  if (activeProject.value.source === 'github') return 'GitHub 工作空间'
  if (activeProject.value.source === 'local') return '本地项目'
  return '本地工作空间'
})
const projectBranchLabel = computed(() => {
  if (!gitStatus.value?.is_repo) return activeProject.value?.source === 'github' ? 'GitHub 分支' : '本地项目分支'
  return gitStatus.value.branch || '无分支'
})

function normalizeCodexBaseUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw)
    if (url.hostname.toLowerCase().includes('zenmux.ai')) {
      url.pathname = '/api/v1'
      url.search = ''
      url.hash = ''
      return url.toString().replace(/\/+$/, '')
    }
  } catch {}
  return raw.replace(/\/+$/, '')
}
const filteredTasks = computed(() => {
  if (!activeProjectId.value) return tasks.value
  return tasks.value.filter(task => task.project_id === activeProjectId.value)
})
const renderedEvents = computed(() => {
  const normalized = normalizeCodexEvents([
    ...pendingUserMessages.value,
    ...activeTaskLogs.value,
  ])
  return normalized.filter((event, index, list) => {
    if (event.kind !== 'message' || event.role !== 'user') return true
    const prev = list[index - 1]
    return !(prev?.kind === 'message' && prev.role === 'user' && prev.text === event.text)
  })
})
const changedFileSummaries = computed(() => extractChangedFiles(activeTaskLogs.value))
const selectedPreview = computed(() => {
  if (!selectedPreviewPath.value) return changedFileSummaries.value[0] || null
  const matchedFile = changedFileSummaries.value.find(file => file.path === selectedPreviewPath.value)
  if (matchedFile) return matchedFile
  const displayPath = displayProjectPath(selectedPreviewPath.value)
  return {
    path: selectedPreviewPath.value,
    displayPath,
    name: displayPath.split('/').pop() || displayPath || '文件预览',
    action: '预览',
    added: 0,
    removed: 0,
    patch: '',
    displayPatch: '',
  }
})

watch(changedFileSummaries, (files) => {
  if (!files.length) {
    previewPanelOpen.value = false
    selectedPreviewPath.value = ''
    clearPreviewFile()
    return
  }
  if (selectedPreviewPath.value && files.some(file => file.path === selectedPreviewPath.value)) return
  selectedPreviewPath.value = files[0].path
})

watch([selectedPreviewPath, previewMode, previewPanelOpen], () => {
  if (previewPanelOpen.value && previewMode.value === 'file') {
    loadPreviewFile()
  }
})

watch(activeProjectId, () => {
  terminalSessions.value = []
  activeTerminalId.value = ''
  resetXterm()
  if (terminalOpen.value) loadProjectTerminals().catch(() => {})
})

watch(activeTerminalId, async () => {
  await mountXtermForActiveSession()
})

watch(terminalOpen, async (open) => {
  if (open) await mountXtermForActiveSession()
})

function statusLabel(status) {
  return {
    queued: '排队中',
    running: '运行中',
    completed: '已完成',
    failed: '失败',
    cancelled: '已取消',
  }[status] || status || '未知'
}

function formatTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

function formatNumber(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toLocaleString('zh-CN') : '0'
}

function relativeTaskTime(value) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diff = Date.now() - date.getTime()
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'now'
  if (diff < hour) return `${Math.floor(diff / minute)}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  return `${Math.floor(diff / day)}d`
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours) return `${hours}h ${minutes}m`
  if (minutes) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatTaskDuration(task) {
  if (!task?.created_at) return ''
  const start = new Date(task.created_at)
  if (Number.isNaN(start.getTime())) return ''
  const isRunning = task.status === 'running' || task.status === 'queued'
  const endValue = isRunning ? new Date() : new Date(task.updated_at || task.created_at)
  if (Number.isNaN(endValue.getTime())) return ''
  const label = isRunning ? 'Working for' : 'Worked for'
  return `${label} ${formatDuration(endValue.getTime() - start.getTime())}`
}

function tasksForProject(projectId) {
  return tasks.value
    .filter(task => task.project_id === projectId)
    .sort((a, b) => String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')))
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInlineMarkdown(value) {
  const projectPath = activeProject.value?.path || activeTask.value?.project_path || ''
  const links = []
  const rewritten = rewriteMarkdownLinksForProject(value, projectPath, links)
  return escapeHtml(rewriteProjectPathsInText(rewritten, projectPath))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
      const displayHref = displayProjectPath(String(href).replace(/:\d+$/, ''), projectPath)
      return renderProjectFileLink(label || displayHref, displayHref)
    })
    .replace(/`([^`]+)`/g, (_match, code) => {
      const normalized = displayProjectPath(code, projectPath)
      return looksLikeProjectFile(normalized) ? renderProjectFileLink(normalized, normalized) : `<code>${code}</code>`
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

function renderProjectFileLink(label, filePath) {
  const cleanPath = String(filePath || '').replace(/:\d+$/, '')
  return `<button type="button" class="project-file-link" data-project-file="${escapeHtml(cleanPath)}">${escapeHtml(label || cleanPath)}</button>`
}

function looksLikeProjectFile(value) {
  const text = String(value || '').trim()
  if (!text || /\s/.test(text) || /^https?:\/\//i.test(text)) return false
  return /(?:^|\/)[\w.@()[\]-]+\.[A-Za-z0-9]{1,8}(?::\d+)?$/.test(text)
}

function rewriteMarkdownLinksForProject(value, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  return String(value || '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, href) => {
    const cleanHref = String(href || '').replace(/:\d+$/, '')
    const displayHref = displayProjectPath(cleanHref, root)
    return `[${label || displayHref}](${displayHref})`
  })
}

function rewriteProjectPathsInText(value, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const text = String(value || '')
  if (!root) return text
  const escapedRoot = root.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(new RegExp(`${escapedRoot}/?([^\\s)\\]]*)`, 'g'), (_match, rest) => {
    const relative = String(rest || '').replace(/^\/+/, '')
    return relative || '.'
  })
}

function normalizePathSeparators(value) {
  return String(value || '').replace(/\\/g, '/')
}

function displayProjectPath(value, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const raw = normalizePathSeparators(String(value || '').trim().replace(/^file:\/\//, ''))
  const projectRoot = normalizePathSeparators(root).replace(/\/+$/, '')
  if (!raw) return ''
  if (projectRoot && (raw === projectRoot || raw.startsWith(`${projectRoot}/`))) {
    return raw === projectRoot ? '.' : raw.slice(projectRoot.length + 1)
  }
  return raw.replace(/^\/+/, '')
}

function displayPatchForProject(patch, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const projectRoot = normalizePathSeparators(root).replace(/\/+$/, '')
  if (!projectRoot) return patch
  const escapedRoot = projectRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return String(patch || '').replace(new RegExp(escapedRoot, 'g'), '').replace(/([ab])\/\//g, '$1/')
}

function previewEditorLines(value, diff = true) {
  let oldLine = 0
  let newLine = 0
  return String(value || '')
    .split(/\r?\n/)
    .map((text, index) => {
      const hunk = text.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (hunk) {
        oldLine = Number(hunk[1]) || 0
        newLine = Number(hunk[2]) || 0
        return { key: `${index}-hunk`, text, number: '', kind: 'hunk' }
      }
      if (!diff) return { key: `${index}-file`, text, number: index + 1, kind: 'normal' }
      if (/^(diff --git|index |--- |\+\+\+ |new file mode|deleted file mode)/.test(text)) {
        return { key: `${index}-meta`, text, number: '', kind: 'meta' }
      }
      if (text.startsWith('+')) {
        const number = newLine || ''
        newLine += 1
        return { key: `${index}-add`, text, number, kind: 'added' }
      }
      if (text.startsWith('-')) {
        const number = oldLine || ''
        oldLine += 1
        return { key: `${index}-remove`, text, number, kind: 'removed' }
      }
      const number = newLine || oldLine || ''
      if (oldLine) oldLine += 1
      if (newLine) newLine += 1
      return { key: `${index}-normal`, text, number, kind: 'normal' }
    })
}

async function handleMarkdownClick(event) {
  const target = event.target?.closest?.('[data-project-file]')
  if (!target) return
  event.preventDefault()
  const filePath = target.getAttribute('data-project-file') || ''
  if (!filePath || !activeProject.value?.id) return
  try {
    await codexAPI.openProjectFile(activeProject.value.id, filePath)
  } catch (err) {
    openPreview(filePath)
    toast.error(err.message || '无法用本地应用打开，已切换到预览')
  }
}

function renderMarkdown(value) {
  const lines = String(value || '').split(/\r?\n/)
  const html = []
  let listOpen = false

  const closeList = () => {
    if (listOpen) {
      html.push('</ul>')
      listOpen = false
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed) {
      closeList()
      return
    }
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (heading) {
      closeList()
      const level = heading[1].length
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`)
      return
    }
    const bullet = trimmed.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      if (!listOpen) {
        html.push('<ul>')
        listOpen = true
      }
      html.push(`<li>${renderInlineMarkdown(bullet[1])}</li>`)
      return
    }
    closeList()
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`)
  })
  closeList()
  return html.join('')
}

function parseRawEvent(event) {
  if (!event?.raw) return null
  try {
    return JSON.parse(event.raw)
  } catch {
    return null
  }
}

function parseJsonText(value) {
  try {
    return JSON.parse(String(value || ''))
  } catch {
    return null
  }
}

function extractLatestTokenUsage(events) {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i]
    if (event.type !== 'app.token_usage') continue
    const raw = parseRawEvent(event)
    const usage = raw?.params?.tokenUsage?.last || raw?.params?.tokenUsage?.total || {}
    return {
      inputTokens: usage.inputTokens || 0,
      outputTokens: usage.outputTokens || 0,
      cachedInputTokens: usage.cachedInputTokens || 0,
      reasoningOutputTokens: usage.reasoningOutputTokens || 0,
      totalTokens: usage.totalTokens || 0,
    }
  }
  return null
}

function extractChangedFiles(events) {
  const files = new Map()
  const root = activeProject.value?.path || activeTask.value?.project_path || ''
  events.forEach((event) => {
    const raw = parseRawEvent(event)
    const patches = []
    if (event.type === 'app.patch' && event.text) {
      patches.push(parsePatchText(event.text, '', root))
    }
    if (event.type === 'app.fileChange' && event.text) {
      patches.push(...extractPatchesFromFileChange(parseJsonText(event.text), root))
    }
    if (event.type === 'app.diff' && event.text) {
      patches.push(...extractPatchesFromDiffPayload(parseJsonText(event.text) || event.text, root))
    }
    if (raw?.method === 'item/fileChange/patchUpdated' || raw?.method === 'turn/diff/updated') {
      patches.push(...extractPatchesFromRaw(raw, root))
    }
    patches.filter(Boolean).forEach((patch) => {
      const existing = files.get(patch.path)
      files.set(patch.path, mergePatchSummary(existing, patch))
    })
  })
  return Array.from(files.values())
}

function extractPatchesFromFileChange(payload, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const changes = Array.isArray(payload?.changes) ? payload.changes : []
  return changes.map((change) => {
    const path = change.path || change.filePath || change.newPath || change.oldPath || ''
    const diff = change.diff || change.patch || change.content || ''
    const kind = change.kind?.type || change.type || ''
    return parsePatchText(`${path ? `${path}\n` : ''}${diff}`, kind, root)
  }).filter(Boolean)
}

function extractPatchesFromDiffPayload(payload, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  if (!payload) return []
  if (typeof payload === 'string') return [parsePatchText(payload, '', root)].filter(Boolean)
  const candidates = [
    payload.files,
    payload.changes,
    payload.diff?.files,
    payload.patch?.files,
  ]
  const patches = []
  candidates.forEach((candidate) => {
    if (!Array.isArray(candidate)) return
    candidate.forEach((item) => {
      const path = item.path || item.filePath || item.newPath || item.oldPath || ''
      const diff = item.diff || item.patch || item.content || ''
      const kind = item.kind?.type || item.type || ''
      patches.push(parsePatchText(`${path ? `${path}\n` : ''}${diff}`, kind, root))
    })
  })
  if (!patches.length && (payload.diff || payload.patch)) {
    patches.push(parsePatchText(String(payload.diff || payload.patch), '', root))
  }
  return patches.filter(Boolean)
}

function extractPatchesFromRaw(raw, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const params = raw?.params || {}
  const patches = []
  const directPatch = params.patch || params.diff || params.item?.patch || ''
  const directPath = params.path || params.filePath || params.item?.path || ''
  if (directPatch || directPath) patches.push(parsePatchText(`${directPath ? `${directPath}\n` : ''}${directPatch}`, '', root))
  const candidates = [
    params.diff,
    params.patch,
    params.diff?.files,
    params.patch?.files,
    params.files,
    params.changes,
    params.item?.files,
    params.item?.changes,
  ]
  candidates.forEach((candidate) => {
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (!item) return
        const path = item.path || item.filePath || item.newPath || item.oldPath || item.name || ''
        const patch = item.patch || item.diff || item.text || ''
        const kind = item.kind?.type || item.type || ''
        patches.push(parsePatchText(`${path ? `${path}\n` : ''}${patch}`, kind, root))
      })
    }
  })
  return patches
}

function parsePatchText(text, kind = '', root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const raw = String(text || '').trim()
  if (!raw) return null
  const lines = raw.split(/\r?\n/)
  const diffPath = raw.match(/^\+\+\+\s+b\/(.+)$/m)?.[1]
    || raw.match(/^---\s+a\/(.+)$/m)?.[1]
    || raw.match(/^diff --git a\/.+ b\/(.+)$/m)?.[1]
  const firstLinePath = !lines[0]?.startsWith('diff ') && !lines[0]?.startsWith('@@') ? lines[0] : ''
  const path = cleanPatchPath(diffPath || firstLinePath || '未命名文件')
  const patch = diffPath ? raw : lines.slice(firstLinePath ? 1 : 0).join('\n').trim()
  const displayPath = displayProjectPath(path, root)
  const patchLines = patch ? patch.split(/\r?\n/) : []
  const added = patchLines.filter(line => line.startsWith('+') && !line.startsWith('+++')).length
    || (kind === 'add' ? patchLines.filter(Boolean).length : 0)
  const removed = patchLines.filter(line => line.startsWith('-') && !line.startsWith('---')).length
  const action = summarizeFileAction(raw, added, removed, kind)
  return {
    path,
    displayPath,
    name: displayPath.split('/').pop() || displayPath || path.split('/').pop() || path,
    action,
    added,
    removed,
    patch,
    displayPatch: displayPatchForProject(patch, root),
  }
}

function cleanPatchPath(path) {
  return String(path || '')
    .replace(/^["']|["']$/g, '')
    .replace(/^a\//, '')
    .replace(/^b\//, '')
    .trim()
}

function summarizeFileAction(text, added, removed, kind = '') {
  if (kind === 'add' || kind === 'create') return '已创建'
  if (kind === 'delete' || kind === 'remove') return '已删除'
  if (kind === 'modify' || kind === 'update') return '已修改'
  if (/new file mode|---\s+\/dev\/null/.test(text)) return '已创建'
  if (/deleted file mode|\+\+\+\s+\/dev\/null/.test(text)) return '已删除'
  if (added > 0 && removed > 0) return '已修改'
  if (added > 0) return '已新增'
  if (removed > 0) return '已删除'
  return '已变更'
}

function mergePatchSummary(existing, patch) {
  if (!existing) return patch
  return {
    ...patch,
    added: Math.max(existing.added || 0, patch.added || 0),
    removed: Math.max(existing.removed || 0, patch.removed || 0),
    patch: patch.patch || existing.patch,
    displayPatch: patch.displayPatch || existing.displayPatch,
  }
}

function buildChangesEvent(key, time, files) {
  const normalizedFiles = Array.isArray(files) ? files.filter(Boolean) : []
  if (!normalizedFiles.length) return null
  const stats = normalizedFiles.reduce((acc, file) => ({
    added: acc.added + (file.added || 0),
    removed: acc.removed + (file.removed || 0),
  }), { added: 0, removed: 0 })
  return {
    key,
    kind: 'changes',
    role: 'tool',
    level: 'muted',
    time,
    title: `Edited ${normalizedFiles.length} ${normalizedFiles.length === 1 ? 'file' : 'files'}`,
    files: normalizedFiles,
    stats,
  }
}

function clearPreviewFile() {
  previewFileContent.value = ''
  previewFileMeta.value = null
  previewFileError.value = ''
}

function formatFileSize(value) {
  const bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

async function loadPreviewFile() {
  const project = activeProject.value
  const file = selectedPreview.value
  if (!project?.id || !file?.path || previewFileLoading.value) return
  if (file.action === '已删除') {
    previewFileContent.value = ''
    previewFileMeta.value = null
    previewFileError.value = '该文件已删除，不能读取当前文件内容'
    return
  }
  previewFileLoading.value = true
  previewFileError.value = ''
  try {
    const result = await codexAPI.projectFile(project.id, file.path)
    previewFileMeta.value = result
    previewFileContent.value = result.binary ? '' : (result.content || '')
    previewFileError.value = result.binary ? '这是二进制文件，不能作为文本预览' : ''
  } catch (err) {
    previewFileContent.value = ''
    previewFileMeta.value = null
    previewFileError.value = err.message || '读取文件失败'
  } finally {
    previewFileLoading.value = false
  }
}

function openPreview(path) {
  if (!path) return
  selectedPreviewPath.value = path
  previewMode.value = 'file'
  previewPanelOpen.value = true
  loadPreviewFile()
}

function normalizeCodexEvents(events) {
  const list = []
  let assistantDelta = null
  let commandDelta = null
  let activityLine = null

  const flushAssistantDelta = () => {
    if (assistantDelta?.text) list.push(assistantDelta)
    assistantDelta = null
  }
  const flushCommandDelta = () => {
    if (commandDelta?.text) {
      const title = summarizeToolEvent(commandDelta)
      list.push({ ...commandDelta, title })
    }
    commandDelta = null
  }
  const flushActivityLine = () => {
    if (activityLine?.text) list.push(activityLine)
    activityLine = null
  }

  events.forEach((event, index) => {
    const time = event.ts ? formatTime(event.ts) : ''
    const key = `${event.ts || 'event'}-${index}-${event.type || event.stream || 'log'}`

    if (event.type === 'app.agent_delta') {
      if (!assistantDelta) assistantDelta = { key, kind: 'message', role: 'assistant', time, text: '', streaming: true }
      assistantDelta.text += event.text || ''
      return
    }
    if (event.type === 'app.command_delta') {
      flushAssistantDelta()
      flushActivityLine()
      if (!commandDelta) commandDelta = { key, kind: 'tool', role: 'tool', level: 'activity', time, text: '', streaming: true }
      commandDelta.text += event.text || ''
      return
    }
    if (event.type === 'app.command_started') {
      flushAssistantDelta()
      flushCommandDelta()
      activityLine = { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeToolEvent(event, 'running') }
      return
    }
    if (event.type === 'app.reasoning_delta') {
      flushAssistantDelta()
      flushCommandDelta()
      if (!activityLine) activityLine = { key, kind: 'activity', role: 'tool', level: 'muted', time, text: 'Codex 正在思考' }
      return
    }
    if (event.type === 'app.file_delta') {
      flushAssistantDelta()
      flushCommandDelta()
      activityLine = { key, kind: 'activity', role: 'tool', level: 'activity', time, text: '正在写入文件' }
      return
    }

    if (event.type === 'app.agent_message') assistantDelta = null
    if (event.type === 'app.command') commandDelta = null
    if (event.type !== 'app.reasoning_delta') flushActivityLine()

    const normalized = normalizeCodexEvent(event, index)
    if (normalized) list.push(normalized)
  })

  flushAssistantDelta()
  flushCommandDelta()
  flushActivityLine()
  return compactActivityEvents(list)
}

function normalizeCodexEvent(event, index) {
  const time = event.ts ? formatTime(event.ts) : ''
  const key = `${event.ts || 'event'}-${index}-${event.type || event.stream || 'log'}`
  const raw = parseRawEvent(event)

  if (event.role === 'user' || event.type === 'user_message') {
    return { key, kind: 'message', role: 'user', time, text: event.text || '' }
  }

  if (event.type === 'app.agent_message') {
    return { key, kind: 'message', role: 'assistant', time, text: event.text || '' }
  }

  if (event.type === 'app.command') {
    return null
  }

  if (event.type === 'app.command_started') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeToolEvent(event, 'running') }
  }

  if (event.type === 'app.webSearch') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeWebSearch(event) }
  }

  if (event.type === 'app.patch') {
    const root = activeProject.value?.path || activeTask.value?.project_path || ''
    const file = parsePatchText(event.text, '', root)
    return file ? buildChangesEvent(key, time, [file]) : null
  }

  if (event.type === 'app.fileChange' || event.type === 'app.diff') {
    const root = activeProject.value?.path || activeTask.value?.project_path || ''
    const files = event.type === 'app.fileChange'
      ? extractPatchesFromFileChange(parseJsonText(event.text), root)
      : extractPatchesFromDiffPayload(parseJsonText(event.text) || event.text, root)
    return buildChangesEvent(key, time, files)
  }

  if (event.type === 'app.plan') {
    return { key, kind: 'tool', role: 'tool', title: '查看计划', level: 'muted', time, text: event.text ? `计划\n${event.text}` : '计划已更新' }
  }

  if (event.type === 'app.reasoning') return null
  if (event.type === 'app.approval_request' || event.type === 'app.approval_resolved') return null

  if ([
    'app.connect',
    'app.turn_started',
    'app.turn_completed',
    'app.thread_started',
    'app.thread_status',
    'app.token_usage',
  ].includes(event.type)) {
    return null
  }

  if (event.type === 'app.turn_failed' || event.type === 'app.error') {
    if (raw?.willRetry || raw?.error?.willRetry || event.text?.includes('"willRetry":true')) return null
    return { key, kind: 'status', role: 'system', level: 'error', time, text: event.text || 'Codex 执行失败' }
  }

  if (raw?.type === 'item.completed') {
    const item = raw.item || {}
    if (item.type === 'agent_message') {
      return { key, kind: 'message', role: 'assistant', time, text: item.text || event.text || '' }
    }
    if (item.type === 'reasoning') return null
    if (item.type === 'webSearch') return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeWebSearch({ text: JSON.stringify(item) }) }
    const itemText = item.text || item.command || item.name || event.text
    return itemText ? { key, kind: 'tool', role: 'tool', title: summarizeToolEvent({ text: itemText }, 'completed'), time, text: itemText } : null
  }

  if (['thread.started', 'turn.started', 'turn.completed'].includes(raw?.type)) {
    return null
  }

  const text = event.text || ''
  if (!text || text === 'Reading additional input from stdin...') return null
  if (text.includes('"type":"reasoning"') || text.includes('"type":"app.reasoning"')) return null
  if (text.includes('"willRetry":true') || text.includes('Reconnecting...')) return null
  if (text.includes('startup remote plugin sync failed') || text.includes('remote installed plugin bundle sync failed')) return null
  if (text.includes('failed to warm featured plugin ids cache')) return null

  if (event.stream === 'stderr') {
    return { key, kind: 'status', role: 'system', level: 'error', time, text }
  }

  if (event.stream === 'system') {
    return text.includes('取消')
      ? { key, kind: 'status', role: 'system', level: 'error', time, text }
      : null
  }

  return { key, kind: 'tool', role: 'tool', level: 'activity', title: summarizeToolEvent({ text }, 'running'), time, text }
}

function summarizeToolEvent(event, state = 'running') {
  const text = String(event?.text || '').trim()
  if (!text) return '查看命令'
  if (text.startsWith('文件变更')) return '查看文件变更'
  if (text.startsWith('计划')) return '查看计划'
  const firstLine = text.split(/\r?\n/).find(Boolean) || ''
  const command = firstLine.replace(/^>\s*/, '').trim()
  const lower = command.toLowerCase()
  const running = state !== 'completed'
  const action = (active, done) => running ? active : done
  if (/github|git clone|install-skill-from-github|curl|wget|npm install|pnpm install|yarn add|pip install/.test(lower)) {
    const target = command.match(/(?:--repo\s+|github\.com[/:])([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)?.[1]
    if (target) return `${action('正在从 GitHub 下载', '已从 GitHub 下载')}：${target}`
    if (lower.includes('github')) return action('正在访问 GitHub', '已访问 GitHub')
    return action('正在下载依赖', '已下载依赖')
  }
  const readTarget = command.match(/^(?:cat|sed|nl|head|tail|less|more)\s+(?:-[^\s]+\s+)*(.+)$/)?.[1]
  if (readTarget) return `${action('正在读取', '已读取')}：${shortCommandTarget(readTarget)}`

  const searchCommand = command.match(/^(?:rg|grep)\s+(.+)$/)?.[1]
  if (searchCommand) return `${action('正在搜索', '已搜索')}：${summarizeSearchQuery(searchCommand)}`

  const listTarget = command.match(/^(?:ls|find)\s*(.*)$/)?.[1]
  if (listTarget != null && /^(?:ls|find)\b/.test(lower)) {
    const target = shortCommandTarget(listTarget)
    return target ? `${action('正在列出', '已列出')}：${target}` : action('正在列出文件', '已列出文件')
  }

  if (/^git\s+(status|diff|show|log|branch|remote|ls-files)\b/.test(lower)) {
    return action('正在检查 Git 状态', '已检查 Git 状态')
  }

  const runScript = command.match(/^(npm|pnpm|yarn)\s+run\s+([^\s]+)/)?.[0]
  if (runScript) return `${action('正在运行', '已运行')}：${runScript}`

  const directUrl = command.match(/\bhttps?:\/\/[^\s'"]+/)?.[0]
  if (directUrl) {
    const host = directUrl.replace(/^https?:\/\//, '').split('/')[0]
    return `${action('正在访问', '已访问')}：${host}`
  }
  if (command) {
    const prefix = action('正在执行命令', '已执行命令')
    return command.length > 72 ? `${prefix}：${command.slice(0, 72)}...` : `${prefix}：${command}`
  }
  return '查看命令'
}

function shortCommandTarget(value) {
  return String(value || '')
    .replace(/['"]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(part => !part.startsWith('-'))
    .slice(0, 2)
    .join(' ')
    .slice(0, 72)
}

function summarizeSearchQuery(value) {
  const cleaned = String(value || '').replace(/\s+/g, ' ').trim()
  const quoted = cleaned.match(/["']([^"']{1,80})["']/)?.[1]
  if (quoted) return quoted
  return cleaned
    .split(' ')
    .filter(part => !part.startsWith('-'))
    .slice(0, 4)
    .join(' ')
    .slice(0, 80) || '文件'
}

function summarizeWebSearch(event) {
  const raw = String(event?.text || '').trim()
  try {
    const parsed = JSON.parse(raw)
    const action = parsed.action || {}
    if (action.type === 'search') return `正在搜索：${action.query || parsed.query || (action.queries || []).join('、')}`
    if (action.type === 'openPage' || action.type === 'open_page') return `正在打开网页：${action.url || parsed.url || ''}`.trim()
    if (action.type === 'findInPage' || action.type === 'find_in_page') return `正在网页内查找：${action.pattern || ''}`.trim()
    return parsed.query ? `正在搜索：${parsed.query}` : '正在进行网络搜索'
  } catch {
    return raw.includes('GitHub') ? '正在搜索 GitHub' : '正在进行网络搜索'
  }
}

function compactActivityEvents(list) {
  const compacted = []
  let pendingActivity = null
  list.forEach((event) => {
    if (event.kind === 'activity') {
      pendingActivity = event
      return
    }
    if (event.kind === 'tool' && event.level === 'activity') {
      pendingActivity = {
        key: event.key,
        kind: 'activity',
        role: 'tool',
        level: 'activity',
        time: event.time,
        text: event.title || summarizeToolEvent(event, event.streaming ? 'running' : 'completed'),
        detail: event.text,
      }
      return
    }
    if (pendingActivity) {
      compacted.push(pendingActivity)
      pendingActivity = null
    }
    compacted.push(event)
  })
  if (pendingActivity) compacted.push(pendingActivity)
  return compacted
}

function scrollLogs() {
  nextTick(() => {
    if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight
  })
}

function isLogNearBottom() {
  const el = logBox.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 80
}

function maybeScrollLogs(shouldScroll) {
  if (shouldScroll) scrollLogs()
}

async function loadStatus() {
  codexStatus.value = await codexAPI.status()
}

async function loadCodexConfig() {
  codexConfig.value = await codexAPI.config()
  if (!selectedModel.value && codexConfig.value.model) {
    selectedModel.value = codexConfig.value.model
  }
}

async function loadUserSkills() {
  skillsLoading.value = true
  try {
    const result = await codexAPI.skills()
    userSkills.value = result.skills || []
    userPlugins.value = result.plugins || []
  } finally {
    skillsLoading.value = false
  }
}

async function loadApprovals() {
  approvals.value = await codexAPI.approvals()
}

async function loadProjects() {
  projects.value = await codexAPI.projects()
  if (!activeProjectId.value && projects.value.length) activeProjectId.value = projects.value[0].id
}

async function loadTasks() {
  const nextTasks = await codexAPI.tasks()
  notifyFinishedTasks(nextTasks)
  tasks.value = nextTasks
  if (!activeTaskId.value && !composingNewThread.value && filteredTasks.value.length) {
    activeTaskId.value = filteredTasks.value[0].id
  }
}

function notifyFinishedTasks(nextTasks) {
  const nextStatuses = Object.fromEntries(nextTasks.map(task => [task.id, task.status]))
  nextTasks.forEach((task) => {
    const previous = knownTaskStatuses[task.id]
    if (previous === 'running' && task.status && task.status !== 'running') {
      const title = task.prompt || 'Codex 任务'
      if (task.status === 'completed') toast.success(`任务完成：${title}`)
      else if (task.status === 'failed') toast.error(`任务失败：${title}`)
      else if (task.status === 'cancelled') toast.info(`任务已取消：${title}`)
    }
  })
  knownTaskStatuses = nextStatuses
}

async function loadActiveLogs() {
  if (!activeTaskId.value) {
    activeTaskLogs.value = []
    if (activeProject.value?.id) loadGitStatus().catch(() => {})
    return
  }
  const shouldScroll = isLogNearBottom()
  activeTaskLogs.value = await codexAPI.taskLogs(activeTaskId.value)
  maybeScrollLogs(shouldScroll)
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadCodexConfig(), loadUserSkills(), loadApprovals(), loadProjects(), loadTasks()])
  await loadActiveLogs()
  if (gitPanelOpen.value) await loadGitStatus()
}

async function loadGitStatus() {
  if (!activeProject.value?.id || gitLoading.value) return
  gitLoading.value = true
  try {
    gitStatus.value = await codexAPI.projectGitStatus(activeProject.value.id)
  } catch (err) {
    gitStatus.value = null
    toast.error(err.message || '读取 Git 信息失败')
  } finally {
    gitLoading.value = false
  }
}

async function toggleGitPanel() {
  gitPanelOpen.value = !gitPanelOpen.value
  if (gitPanelOpen.value) await loadGitStatus()
}

async function commitGitChanges() {
  if (!activeProject.value?.id || gitActionLoading.value || !gitCommitMessage.value.trim()) return
  gitActionLoading.value = 'commit'
  try {
    const result = await codexAPI.projectGitCommit(activeProject.value.id, {
      message: gitCommitMessage.value.trim(),
    })
    gitStatus.value = result.git
    gitCommitMessage.value = ''
    toast.success('代码已提交')
  } catch (err) {
    toast.error(err.message || '提交失败')
  } finally {
    gitActionLoading.value = ''
  }
}

async function pushGitChanges() {
  if (!activeProject.value?.id || gitActionLoading.value) return
  gitActionLoading.value = 'push'
  try {
    const result = await codexAPI.projectGitPush(activeProject.value.id)
    gitStatus.value = result.git
    toast.success('已推送到 GitHub')
  } catch (err) {
    toast.error(err.message || '推送失败')
  } finally {
    gitActionLoading.value = ''
  }
}

async function ensureXtermLoaded() {
  if (XtermCtor && FitAddonCtor) return
  const [{ Terminal: XtermTerminal }, { FitAddon }] = await Promise.all([
    import('@xterm/xterm'),
    import('@xterm/addon-fit'),
  ])
  XtermCtor = XtermTerminal
  FitAddonCtor = FitAddon
}

function resetXterm() {
  terminalDataDisposable?.dispose?.()
  terminalDataDisposable = null
  terminalInstance?.dispose?.()
  terminalInstance = null
  terminalFitAddon = null
  lastTerminalSeq = 0
}

function writeTerminalOutput(session) {
  if (!terminalInstance || !session?.output?.length) return
  session.output.forEach((item) => {
    terminalInstance.write(item.text || '')
    lastTerminalSeq = Math.max(lastTerminalSeq, Number(item.seq || 0))
  })
}

function fitTerminal() {
  if (!terminalFitAddon || !terminalInstance || !activeTerminal.value?.id) return
  terminalFitAddon.fit()
  const cols = terminalInstance.cols
  const rows = terminalInstance.rows
  window.clearTimeout(terminalResizeTimer)
  terminalResizeTimer = window.setTimeout(() => {
    codexAPI.terminalResize(activeTerminal.value.id, cols, rows).catch(() => {})
  }, 120)
}

async function mountXtermForActiveSession() {
  if (!terminalOpen.value || !activeTerminal.value?.id) return
  await ensureXtermLoaded()
  await nextTick()
  if (!xtermHost.value) return
  resetXterm()
  terminalFitAddon = new FitAddonCtor()
  terminalInstance = new XtermCtor({
    cursorBlink: true,
    cursorStyle: 'block',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
    fontSize: 13,
    lineHeight: 1.35,
    scrollback: 5000,
    theme: {
      background: '#ffffff',
      foreground: '#202124',
      cursor: '#202124',
      selectionBackground: '#d6e7ff',
      black: '#202124',
      red: '#cf222e',
      green: '#1a7f37',
      yellow: '#9a6700',
      blue: '#0969da',
      magenta: '#8250df',
      cyan: '#1b7c83',
      white: '#eaeef2',
      brightBlack: '#57606a',
      brightRed: '#a40e26',
      brightGreen: '#116329',
      brightYellow: '#7d4e00',
      brightBlue: '#0550ae',
      brightMagenta: '#6639ba',
      brightCyan: '#0a6b73',
      brightWhite: '#ffffff',
    },
  })
  terminalInstance.loadAddon(terminalFitAddon)
  terminalInstance.open(xtermHost.value)
  terminalDataDisposable = terminalInstance.onData((data) => {
    const sessionId = activeTerminal.value?.id
    if (!sessionId) return
    if (data === '\x0a') data = '\r'
    codexAPI.terminalInput(sessionId, data).catch(() => {})
  })
  fitTerminal()
  const fullSession = await codexAPI.terminal(activeTerminal.value.id)
  writeTerminalOutput(fullSession)
  terminalInstance.focus()
}

async function loadProjectTerminals() {
  if (!activeProject.value?.id) return
  const sessions = await codexAPI.projectTerminals(activeProject.value.id)
  terminalSessions.value = sessions || []
  if (!activeTerminalId.value && terminalSessions.value.length) {
    activeTerminalId.value = terminalSessions.value[0].id
  }
}

async function loadActiveTerminal() {
  if (!terminalOpen.value || !activeTerminalId.value) return
  try {
    const session = await codexAPI.terminal(activeTerminalId.value, lastTerminalSeq)
    const index = terminalSessions.value.findIndex(item => item.id === session.id)
    if (index >= 0) terminalSessions.value.splice(index, 1, { ...terminalSessions.value[index], ...session, output: [] })
    else terminalSessions.value.unshift(session)
    writeTerminalOutput(session)
  } catch {}
}

async function createTerminalSession() {
  if (!activeProject.value?.id || terminalLoading.value) return
  terminalLoading.value = true
  try {
    const session = await codexAPI.createTerminal(activeProject.value.id)
    terminalSessions.value = [session, ...terminalSessions.value.filter(item => item.id !== session.id)]
    activeTerminalId.value = session.id
    terminalOpen.value = true
    await mountXtermForActiveSession()
  } catch (err) {
    toast.error(err.message || '启动终端失败')
  } finally {
    terminalLoading.value = false
  }
}

async function toggleTerminal() {
  terminalOpen.value = !terminalOpen.value
  if (!terminalOpen.value) return
  await loadProjectTerminals().catch(err => toast.error(err.message || '读取终端失败'))
  if (!terminalSessions.value.length) await createTerminalSession()
  await mountXtermForActiveSession()
}

function selectTerminal(id) {
  activeTerminalId.value = id
  mountXtermForActiveSession()
}

function handleGlobalTerminalShortcut(event) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'j') {
    if (terminalOpen.value) {
      event.preventDefault()
      terminalOpen.value = false
    }
  }
}

function approvalTitle(approval) {
  if (approval?.kind === 'command') return 'Codex 请求执行命令'
  if (approval?.kind === 'file') return 'Codex 请求写入文件'
  if (approval?.kind === 'permissions') return 'Codex 请求提升权限'
  return 'Codex 请求授权'
}

function approvalReason(approval) {
  return approval?.params?.reason || '该操作需要你确认后才会继续执行。'
}

function approvalActionSummary(approval) {
  if (approval?.kind === 'command') {
    const command = String(approval.params?.command || '').trim()
    return command ? summarizeToolEvent({ text: command }, 'running') : 'Codex 想要执行一条命令'
  }
  if (approval?.kind === 'file') {
    const target = approval.params?.grantRoot || approval.params?.path || approval.params?.filePath
    return target ? `Codex 想要写入：${target}` : 'Codex 想要修改文件'
  }
  if (approval?.kind === 'permissions') return 'Codex 想要提升当前任务权限'
  return 'Codex 想要继续执行需要确认的操作'
}

function formatApprovalPermissions(value) {
  try {
    return JSON.stringify(value || {}, null, 2)
  } catch {
    return String(value || '')
  }
}

async function respondApproval(approval, decision) {
  if (!approval || approvalResponding.value) return
  approvalResponding.value = true
  try {
    await codexAPI.respondApproval(approval.id, {
      decision,
      scope: decision === 'acceptForSession' ? 'session' : 'turn',
    })
    approvals.value = approvals.value.filter(item => item.id !== approval.id)
    await loadActiveLogs()
    toast.success(decision === 'decline' ? '已拒绝授权' : '已授权，Codex 将继续执行')
  } catch (err) {
    toast.error(err.message || '授权响应失败')
  } finally {
    approvalResponding.value = false
  }
}

function handleDraftInput() {
  const text = String(draft.value || '')
  slashMenuOpen.value = text.trimStart().startsWith('/') && !text.includes('\n')
}

function applySlashItem(item) {
  selectedSlashItem.value = {
    id: item.id,
    name: item.name,
    type: item.type,
    path: item.path || '',
  }
  draft.value = ''
  slashMenuOpen.value = false
  nextTick(() => {
    draftInput.value?.focus?.()
    draftInput.value?.setSelectionRange?.(0, 0)
  })
}

function selectedContextPayload() {
  const item = selectedSlashItem.value
  if (!item?.name || !item?.path) return null
  return {
    id: item.id || item.name,
    name: item.name,
    type: item.type === 'skill' ? 'skill' : 'mention',
    path: item.path,
  }
}

function skillContextFromSkill(skill) {
  if (!skill) return null
  const basePath = String(skill.path || '')
  return {
    id: skill.id || skill.name,
    name: skill.name,
    type: 'skill',
    path: basePath.endsWith('/SKILL.md') ? basePath : `${basePath}/SKILL.md`,
  }
}

function findSkillCreator() {
  return userSkills.value.find((skill) => {
    const text = `${skill.id || ''} ${skill.name || ''} ${skill.path || ''}`.toLowerCase()
    return text.includes('skill-creator') || text.includes('skill creator') || text.includes('技能')
  })
}

async function openSkillsPage() {
  currentView.value = 'skills'
  await loadUserSkills()
}

function toggleSkillMenu(id) {
  openSkillMenuId.value = openSkillMenuId.value === id ? '' : id
}

async function deleteSkill(skill) {
  if (!skill?.id || skill.scope === 'system') return
  if (!window.confirm(`卸载技能「${skill.name}」？`)) return
  try {
    const result = await codexAPI.deleteSkill(skill.id)
    userSkills.value = result.skills || userSkills.value.filter(item => item.id !== skill.id)
    if (selectedSlashItem.value?.id === skill.id || selectedSlashItem.value?.name === skill.name) {
      selectedSlashItem.value = null
    }
    openSkillMenuId.value = ''
    toast.success('技能已卸载')
  } catch (err) {
    toast.error(err.message || '卸载技能失败')
  }
}

function ensureActiveProjectForChat() {
  if (activeProject.value) return true
  if (projects.value.length) {
    activeProjectId.value = projects.value[0].id
    return true
  }
  projectDialogOpen.value = true
  return false
}

async function openSkillInstallChat() {
  currentView.value = 'chat'
  if (!ensureActiveProjectForChat()) return
  if (!userSkills.value.length) {
    await loadUserSkills().catch(() => {})
  }
  const skillCreator = findSkillCreator()
  selectedSlashItem.value = skillCreator
    ? skillContextFromSkill(skillCreator)
    : {
        id: 'skill-creator',
        name: 'Skill Creator',
        type: 'skill',
        path: 'skill-creator',
      }
  newThread()
  selectedSlashItem.value = skillCreator
    ? skillContextFromSkill(skillCreator)
    : selectedSlashItem.value
  draft.value = '帮我创建或安装一个 skill：'
  nextTick(() => {
    draftInput.value?.focus?.()
  })
}

function openSkillChat(skill) {
  currentView.value = 'chat'
  if (!ensureActiveProjectForChat()) return
  newThread()
  selectedSlashItem.value = skillContextFromSkill(skill)
  draft.value = ''
  nextTick(() => {
    draftInput.value?.focus?.()
  })
}

async function openCodexSettings() {
  settingsDialogOpen.value = true
  try {
    await loadCodexConfig()
    codexConfigForm.model = codexConfig.value.model || selectedModel.value || 'gpt-5.3-codex'
    codexConfigForm.base_url = normalizeCodexBaseUrl(codexConfig.value.base_url || '')
    codexConfigForm.api_key = ''
    configTestPassed.value = false
    configTestMessage.value = ''
  } catch (err) {
    toast.error(err.message || '加载 Codex 设置失败')
  }
}

function markConfigUntested() {
  configTestPassed.value = false
  configTestMessage.value = ''
}

async function testCodexConfig() {
  if (testingConfig.value || !canTestCodexConfig.value) return
  testingConfig.value = true
  configTestPassed.value = false
  configTestMessage.value = ''
  try {
    codexConfigForm.base_url = normalizeCodexBaseUrl(codexConfigForm.base_url)
    const result = await codexAPI.testConfig({
      model: codexConfigForm.model.trim(),
      base_url: codexConfigForm.base_url.trim(),
      api_key: codexConfigForm.api_key.trim(),
    })
    configTestPassed.value = true
    configTestMessage.value = result.message || '连接成功，请点击应用后再发送任务'
    toast.success(configTestMessage.value)
  } catch (err) {
    configTestPassed.value = false
    configTestMessage.value = err.message || '连接测试失败'
    toast.error(configTestMessage.value)
  } finally {
    testingConfig.value = false
  }
}

async function saveCodexConfig() {
  if (savingConfig.value || !configTestPassed.value) return
  savingConfig.value = true
  try {
    codexConfigForm.base_url = normalizeCodexBaseUrl(codexConfigForm.base_url)
    codexConfig.value = await codexAPI.updateConfig({
      model: codexConfigForm.model.trim(),
      base_url: codexConfigForm.base_url.trim(),
      api_key: codexConfigForm.api_key.trim(),
    })
    selectedModel.value = codexConfig.value.model || ''
    codexConfigForm.api_key = ''
    configTestPassed.value = false
    configTestMessage.value = ''
    settingsDialogOpen.value = false
    toast.success(`Codex 设置已应用：${codexConfig.value.model || '默认模型'}`)
  } catch (err) {
    toast.error(err.message || '应用 Codex 设置失败')
  } finally {
    savingConfig.value = false
  }
}

function selectProject(id) {
  openProjectMenuId.value = ''
  currentView.value = 'chat'
  gitPanelOpen.value = false
  gitStatus.value = null
  gitCommitMessage.value = ''
  activeProjectId.value = id
  composingNewThread.value = false
  const firstTask = tasks.value.find(task => task.project_id === id)
  activeTaskId.value = firstTask?.id || ''
  loadActiveLogs().then(scrollLogs).catch(err => toast.error(err.message || '加载任务日志失败'))
}

function toggleProjectMenu(id) {
  openProjectMenuId.value = openProjectMenuId.value === id ? '' : id
}

function newThread() {
  currentView.value = 'chat'
  composingNewThread.value = true
  activeTaskId.value = ''
  activeTaskLogs.value = []
  pendingUserMessages.value = []
  draft.value = ''
  attachments.value = []
  if (activeProject.value?.id) loadGitStatus().catch(() => {})
}

function removeAttachment(path) {
  attachments.value = attachments.value.filter(item => item.path !== path)
}

function selectLocalPath(path) {
  projectLocalPath.value = path
  if (!projectName.value.trim()) {
    const parts = String(path || '').split('/').filter(Boolean)
    projectName.value = parts[parts.length - 1] || '本地项目'
  }
}

function inferProjectNameFromRepo() {
  if (projectName.value.trim()) return
  const raw = String(projectRepoUrl.value || '').trim()
  const clean = raw
    .replace(/^git@github\.com:/i, '')
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/+$/g, '')
  const parts = clean.split('/').filter(Boolean)
  if (parts.length >= 2) projectName.value = parts[1]
}

async function pickLocalDirectory() {
  if (directoryLoading.value) return
  directoryLoading.value = true
  try {
    const picked = await codexAPI.pickDirectory()
    projectLocalPath.value = picked.path
    if (!projectName.value.trim()) {
      projectName.value = picked.name || '本地项目'
    }
  } catch (err) {
    if (!String(err.message || '').includes('cancelled')) {
      toast.error(err.message || '选择本机目录失败')
    }
  } finally {
    directoryLoading.value = false
  }
}

async function handleAttachmentChange(event) {
  const input = event.target
  const files = Array.from(input.files || [])
  input.value = ''
  if (!files.length) return
  if (!activeProject.value) {
    projectDialogOpen.value = true
    return
  }
  uploadingAttachment.value = true
  try {
    for (const file of files.slice(0, 8 - attachments.value.length)) {
      const attachment = await codexAPI.uploadAttachment(activeProject.value.id, file)
      attachments.value.push(attachment)
    }
  } catch (err) {
    toast.error(err.message || '图片上传失败')
  } finally {
    uploadingAttachment.value = false
  }
}

async function openTask(id) {
  openProjectMenuId.value = ''
  composingNewThread.value = false
  pendingUserMessages.value = []
  activeTaskId.value = id
  await loadActiveLogs()
  scrollLogs()
}

async function deleteTask(task) {
  if (!task?.id) return
  if (!window.confirm(`删除聊天记录「${task.prompt || '未命名'}」？`)) return
  try {
    await codexAPI.deleteTask(task.id)
    if (activeTaskId.value === task.id) {
      activeTaskId.value = ''
      activeTaskLogs.value = []
      pendingUserMessages.value = []
      composingNewThread.value = true
    }
    await loadTasks()
    if (!activeTaskId.value && !composingNewThread.value) {
      const nextTask = tasksForProject(task.project_id)[0]
      activeTaskId.value = nextTask?.id || ''
      if (activeTaskId.value) await loadActiveLogs()
    }
    toast.success('聊天记录已删除')
  } catch (err) {
    toast.error(err.message || '删除聊天记录失败')
  }
}

async function deleteProject(project) {
  if (!project?.id) return
  if (!window.confirm(`删除项目「${project.name}」？这只会删除 Codex 工作台记录，不会删除本地项目文件夹。`)) return
  try {
    await codexAPI.deleteProject(project.id)
    openProjectMenuId.value = ''
    if (activeProjectId.value === project.id) {
      activeProjectId.value = ''
      activeTaskId.value = ''
      activeTaskLogs.value = []
      pendingUserMessages.value = []
    }
    await Promise.all([loadProjects(), loadTasks()])
    if (!activeProjectId.value && projects.value.length) {
      activeProjectId.value = projects.value[0].id
    }
    toast.success('项目已删除')
  } catch (err) {
    toast.error(err.message || '删除项目失败')
  }
}

async function createProject() {
  inferProjectNameFromRepo()
  const name = projectName.value.trim()
  if (!canCreateProject.value || creatingProject.value) return
  creatingProject.value = true
  try {
    const payload = projectSource.value === 'local'
      ? { name, source: 'local', path: projectLocalPath.value.trim() }
      : projectSource.value === 'github'
        ? { name, source: 'github', repo_url: projectRepoUrl.value.trim() }
        : { name, source: 'managed' }
    const project = await codexAPI.createProject(payload)
    projectName.value = ''
    projectLocalPath.value = ''
    projectRepoUrl.value = ''
    projectSource.value = 'managed'
    projectDialogOpen.value = false
    await loadProjects()
    activeProjectId.value = project.id
    composingNewThread.value = true
    activeTaskId.value = ''
    activeTaskLogs.value = []
    pendingUserMessages.value = []
    toast.success(project.source === 'github' ? 'GitHub 项目已导入' : '项目已创建')
  } catch (err) {
    toast.error(err.message || '创建项目失败')
  } finally {
    creatingProject.value = false
  }
}

async function startTask() {
  const prompt = draft.value.trim()
  if (!prompt || starting.value) return
  if (!activeProject.value) {
    projectDialogOpen.value = true
    return
  }
  if (!codexConfig.value.api_key_set) {
    await openCodexSettings()
    toast.info('请先配置 Codex API Key')
    return
  }
  if (activeTask.value?.status === 'running') {
    toast.info('当前线程还在运行，请等待完成或先停止任务')
    return
  }
  starting.value = true
  const optimisticMessage = {
    ts: new Date().toISOString(),
    stream: 'system',
    type: 'user_message',
    role: 'user',
    text: prompt,
    optimistic: true,
  }
  pendingUserMessages.value = [optimisticMessage]
  scrollLogs()
  try {
    const resumeTask = activeTask.value?.thread_id ? activeTask.value : null
    const imagePaths = attachments.value.map(item => item.path).filter(Boolean)
    const modelForTask = selectedModel.value || codexConfig.value.model || ''
    const selectedContext = selectedContextPayload()
    const task = resumeTask
      ? await codexAPI.sendMessage(resumeTask.id, {
          prompt,
          model: modelForTask,
          reasoning_effort: selectedReasoning.value,
          sandbox: selectedSandbox.value,
          images: imagePaths,
          selected_context: selectedContext,
        })
      : await codexAPI.createTask({
          project_id: activeProject.value.id,
          prompt,
          model: modelForTask,
          reasoning_effort: selectedReasoning.value,
          sandbox: selectedSandbox.value,
          images: imagePaths,
          selected_context: selectedContext,
        })
    draft.value = ''
    selectedSlashItem.value = null
    attachments.value = []
    composingNewThread.value = false
    activeTaskId.value = task.id
    await loadTasks()
    await loadActiveLogs()
    pendingUserMessages.value = []
    scrollLogs()
  } catch (err) {
    pendingUserMessages.value = []
    toast.error(err.message || '启动 Codex 失败')
  } finally {
    starting.value = false
  }
}

async function cancelTask(id) {
  try {
    await codexAPI.cancelTask(id)
    await loadTasks()
    await loadActiveLogs()
  } catch (err) {
    toast.error(err.message || '取消失败')
  }
}

onMounted(async () => {
  try {
    await refreshAll()
    pollTimer = window.setInterval(async () => {
      await Promise.all([loadTasks(), loadApprovals()])
      await loadActiveLogs()
    }, 2500)
    terminalPollTimer = window.setInterval(loadActiveTerminal, 1000)
    window.addEventListener('keydown', handleGlobalTerminalShortcut)
    window.addEventListener('resize', fitTerminal)
  } catch (err) {
    toast.error(err.message || 'Codex 工作台加载失败')
  }
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
  if (terminalPollTimer) window.clearInterval(terminalPollTimer)
  window.clearTimeout(terminalResizeTimer)
  window.removeEventListener('keydown', handleGlobalTerminalShortcut)
  window.removeEventListener('resize', fitTerminal)
  resetXterm()
})
</script>

<style scoped>
.codex-page {
  display: grid;
  width: 100%;
  height: 100vh;
  min-height: 0;
  grid-template-columns: 336px minmax(0, 1fr);
  overflow: hidden;
  border-radius: 8px;
  background: #1f1f1f;
  color: #f4f4f5;
}

.project-panel {
  display: flex;
  min-height: 0;
  flex-direction: column;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  background: #252527;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px;
}

.panel-head h2,
.workspace-head h1,
.project-dialog h2,
.empty-output h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.2;
}

.panel-head p,
.workspace-head p,
.project-dialog p,
.empty-output p {
  margin: 6px 0 0;
  color: #94949d;
  font-size: 12px;
  line-height: 1.5;
}

.icon-btn,
.send-btn {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 8px;
}

.icon-btn {
  background: rgba(255, 255, 255, 0.07);
  color: #d4d4dc;
}

.create-project-btn,
.primary-btn,
.secondary-btn {
  display: inline-flex;
  height: 38px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 8px;
  padding: 0 14px;
  color: #fff;
  font: inherit;
  font-size: 14px;
}

.create-project-btn,
.primary-btn,
.send-btn {
  background: #0a84ff;
}

.create-project-btn {
  margin: 0 20px 18px;
}

.new-thread-btn {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 0 12px 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  color: #e4e4e7;
  font: inherit;
  font-size: 13px;
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.09);
  color: #e4e4e7;
}

.secondary-btn.danger {
  background: rgba(239, 68, 68, 0.16);
  color: #fecaca;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.section-title {
  padding: 12px 20px 8px;
  color: #8e8e98;
  font-size: 12px;
}

.project-list,
.task-list {
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 12px;
}

.project-list {
  max-height: 34%;
}

.task-list {
  flex: 1;
}

.project-item,
.task-item {
  display: flex;
  width: 100%;
  min-height: 64px;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 10px;
  color: #d7d7de;
  text-align: left;
}

.project-item:hover,
.project-item.active,
.task-item:hover,
.task-item.active {
  background: rgba(10, 132, 255, 0.18);
  color: #fff;
}

.project-item span,
.task-item span:last-child {
  min-width: 0;
}

.project-item strong,
.project-item em,
.task-item strong,
.task-item em {
  display: block;
}

.project-item strong,
.task-item strong {
  overflow: hidden;
  font-size: 14px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-item em,
.task-item em {
  overflow: hidden;
  margin-top: 4px;
  color: #8e8e98;
  font-size: 11px;
  font-style: normal;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-status {
  width: 9px;
  height: 9px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #71717a;
}

.task-status.running {
  background: #22c55e;
  box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.14);
}

.task-status.completed {
  background: #0a84ff;
}

.task-status.failed {
  background: #ef4444;
}

.task-status.cancelled {
  background: #f59e0b;
}

.empty-state {
  padding: 18px 10px;
  color: #85858f;
  font-size: 13px;
}

.workspace-main {
  min-width: 0;
  min-height: 0;
}

.welcome-panel,
.codex-workspace {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
}

.welcome-panel {
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 24px;
  text-align: center;
}

.brand-word {
  color: #f97316;
  font-size: 72px;
  font-weight: 800;
  line-height: 1;
}

.brand-word span:nth-child(even) {
  color: #f05252;
}

.welcome-panel p {
  max-width: 520px;
  margin: 0;
  color: #a1a1aa;
  line-height: 1.8;
}

.workspace-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.workspace-head p {
  max-width: 720px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.head-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.model-select {
  height: 36px;
  min-width: 220px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #2b2b2d;
  color: #e5e7eb;
  padding: 0 10px;
  outline: none;
}

.model-select.compact {
  min-width: 126px;
}

.task-output {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  padding: 20px 28px 14px;
}

.task-output-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}

.task-output-head strong,
.task-output-head span {
  display: block;
}

.task-output-head strong {
  max-width: 720px;
  overflow: hidden;
  color: #f4f4f5;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-output-head span {
  margin-top: 4px;
  color: #a1a1aa;
  font-size: 12px;
}

.conversation-box {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: #171717;
  padding: 18px;
}

.codex-event + .codex-event {
  margin-top: 12px;
}

.message-row {
  display: flex;
  flex-direction: column;
  max-width: min(760px, 88%);
}

.message-row.user {
  align-items: flex-end;
  margin-left: auto;
}

.message-row.assistant {
  align-items: flex-start;
  margin-right: auto;
}

.message-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 5px;
  color: #8f8f99;
  font-size: 12px;
}

.message-meta span {
  color: #c4c4cc;
  font-weight: 600;
}

.message-meta em {
  font-style: normal;
}

.message-bubble {
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.65;
}

.message-row.user .message-bubble {
  background: #0a84ff;
  color: #fff;
}

.message-row.assistant .message-bubble {
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: #252527;
  color: #ececf1;
}

.message-bubble pre,
.tool-line pre {
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  font-family: inherit;
}

.tool-line,
.status-line {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: #a1a1aa;
  font-size: 12px;
  line-height: 1.5;
}

.tool-line {
  width: fit-content;
  max-width: min(760px, 88%);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  background: #202022;
  padding: 8px 10px;
  color: #cbd5e1;
}

.tool-line svg {
  margin-top: 2px;
  color: #8f8f99;
}

.tool-line span,
.status-line span {
  flex: 0 0 auto;
  color: #71717a;
}

.status-line {
  justify-content: center;
  color: #85858f;
}

.status-line em {
  font-style: normal;
}

.codex-event.running .status-line em {
  color: #93c5fd;
}

.codex-event.done .status-line em {
  color: #86efac;
}

.codex-event.error .status-line em {
  color: #fecaca;
}

.empty-output {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #a1a1aa;
  text-align: center;
}

.empty-output svg {
  margin-bottom: 14px;
  color: #f97316;
}

.codex-composer {
  margin: 0 28px 24px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 10px;
  background: #242424;
  padding: 12px;
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.22);
}

.hidden-file-input {
  display: none;
}

.attachment-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.file-change-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.file-change-chip {
  display: inline-flex;
  max-width: 240px;
  height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #d4d4d8;
  padding: 0 9px;
  font: inherit;
  font-size: 12px;
}

.file-change-chip:hover,
.file-change-chip.active {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.file-change-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-change-chip em {
  flex: 0 0 auto;
  color: #a1a1aa;
  font-style: normal;
}

.attachment-chip {
  display: inline-flex;
  max-width: 220px;
  height: 28px;
  align-items: center;
  gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  color: #d4d4d8;
  padding: 0 8px;
  font-size: 12px;
}

.attachment-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-chip button {
  display: grid;
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #a1a1aa;
  padding: 0;
}

.attachment-chip button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.codex-composer textarea {
  width: 100%;
  min-height: 86px;
  max-height: 180px;
  resize: vertical;
  border: 0;
  outline: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.86);
  font: inherit;
  font-size: 14px;
  line-height: 1.6;
}

.codex-composer textarea::placeholder {
  color: #73737a;
}

.composer-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.codex-preview-panel {
  position: absolute;
  top: 74px;
  right: 20px;
  bottom: 24px;
  z-index: 8;
  display: flex;
  width: min(520px, calc(100% - 64px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: #202022;
  box-shadow: 0 22px 58px rgba(0, 0, 0, 0.32);
}

.preview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 13px 14px;
}

.preview-head strong,
.preview-head span {
  display: block;
}

.preview-head strong {
  color: #f4f4f5;
  font-size: 14px;
}

.preview-head span {
  margin-top: 4px;
  color: #a1a1aa;
  font-size: 12px;
  word-break: break-all;
}

.preview-head button {
  display: grid;
  width: 28px;
  height: 28px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #a1a1aa;
}

.preview-head button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.preview-meta {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding: 9px 14px;
  color: #a1a1aa;
  font-size: 12px;
}

.preview-meta span:nth-child(2) {
  color: #86efac;
}

.preview-meta span:nth-child(3) {
  color: #fca5a5;
}

.preview-code {
  flex: 1;
  min-height: 0;
  overflow: auto;
  margin: 0;
  background: #171717;
  color: #d4d4d8;
  padding: 14px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre;
}

.preview-empty {
  display: grid;
  flex: 1;
  place-items: center;
  color: #a1a1aa;
  font-size: 13px;
}

.composer-hint {
  min-width: 0;
  overflow: hidden;
  color: #8e8e98;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.composer-options {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-wrap: wrap;
  gap: 6px;
}

.composer-options span {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #a1a1aa;
  padding: 3px 8px;
  font-size: 11px;
  line-height: 1.3;
}

.attach-btn {
  width: 34px;
  height: 34px;
  background: rgba(255, 255, 255, 0.07);
}

.dialog-backdrop {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, 0.62);
}

.project-dialog {
  width: min(460px, calc(100vw - 32px));
  max-height: min(760px, calc(100vh - 32px));
  overflow: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: #252527;
  padding: 22px;
  box-shadow: 0 22px 58px rgba(0, 0, 0, 0.45);
}

.project-dialog input {
  width: 100%;
  height: 42px;
  margin: 18px 0;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  background: #1f1f1f;
  color: #fff;
  padding: 0 12px;
  outline: none;
}

.settings-dialog {
  display: grid;
  gap: 14px;
}

.settings-dialog input {
  margin: 0;
}

.form-field {
  display: grid;
  gap: 7px;
  color: #c5c5cc;
  font-size: 13px;
}

.form-field span {
  color: #9a9aa2;
}

.test-result {
  border-radius: 10px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.45;
}

.test-result.ok {
  background: rgba(34, 197, 94, 0.12);
  color: #86efac;
}

.test-result.error {
  background: rgba(239, 68, 68, 0.12);
  color: #fecaca;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.local-picker {
  margin: -4px 0 14px;
}

.local-picker-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #9ca3af;
  font-size: 12px;
}


.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@media (max-width: 980px) {
  .codex-page {
    grid-template-columns: 1fr;
  }

  .project-panel {
    display: none;
  }
}

/* Codex App inspired surface. Keep this block last so it replaces the older dark workbench styling above. */
.codex-page {
  grid-template-columns: 320px minmax(0, 1fr);
  border-radius: 0;
  background: #fff;
  color: #202124;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.project-panel {
  border-right: 1px solid #d8d8dc;
  background: linear-gradient(90deg, #f3f3f5 0%, #eeeeef 100%);
  color: #34343a;
  padding: 18px 10px 12px;
}

.panel-nav {
  display: grid;
  gap: 4px;
  margin-bottom: 26px;
}

.nav-action {
  display: flex;
  width: 100%;
  height: 38px;
  align-items: center;
  gap: 12px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #34343a;
  padding: 0 12px;
  font: inherit;
  font-size: 15px;
  text-align: left;
}

.nav-action:hover {
  background: rgba(0, 0, 0, 0.055);
}

.nav-action:disabled {
  opacity: 0.45;
}

.nav-action.active {
  background: #e2e2e5;
  color: #202124;
}

.section-title {
  padding: 10px 12px 8px;
  color: #909096;
  font-size: 14px;
  font-weight: 500;
}

.project-section-title {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  min-height: 34px;
  margin: 0 0 4px;
  border-radius: 10px;
  padding: 0 8px;
}

.project-section-title:hover {
  background: rgba(0, 0, 0, 0.045);
}

.project-collapse-btn,
.project-section-actions button {
  display: grid;
  border: 0;
  background: transparent;
  color: #8f9097;
  place-items: center;
}

.project-collapse-btn {
  width: 18px;
  height: 24px;
  opacity: 0;
}

.project-section-title:hover .project-collapse-btn {
  opacity: 1;
}

.project-section-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
}

.project-section-title:hover .project-section-actions {
  opacity: 1;
}

.project-section-actions button {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  font-size: 15px;
}

.project-section-actions button:hover,
.project-collapse-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  color: #202124;
}

.project-list,
.task-list {
  padding: 0 0 8px;
}

.project-list {
  flex: 1;
  max-height: none;
}

.task-list {
  flex: 1;
}

.project-item,
.task-item {
  min-height: 40px;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 4px;
  border-radius: 10px;
  padding: 9px 12px;
  color: #44454b;
}

.project-group {
  position: relative;
  margin-bottom: 8px;
}

.project-row {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 28px;
  align-items: center;
  border-radius: 10px;
}

.project-row:hover,
.project-row.active {
  background: #dedee1;
}

.project-thread-list {
  display: grid;
  gap: 2px;
  margin: 2px 0 10px;
}

.project-item svg {
  margin-top: 1px;
  color: #6d6e75;
}

.task-item:hover,
.task-item.active {
  background: #dedee1;
  color: #202124;
}

.project-menu-btn,
.task-delete-btn {
  display: grid;
  border: 0;
  background: transparent;
  color: #7f8087;
  opacity: 0;
  place-items: center;
}

.project-menu-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  font-size: 18px;
  line-height: 1;
}

.project-row:hover .project-menu-btn,
.project-menu-btn:focus,
.task-item:hover .task-delete-btn,
.task-delete-btn:focus {
  opacity: 1;
}

.project-menu-btn:hover,
.task-delete-btn:hover {
  background: rgba(0, 0, 0, 0.07);
  color: #202124;
}

.project-menu {
  position: absolute;
  top: 34px;
  right: 4px;
  z-index: 20;
  min-width: 146px;
  border: 1px solid #dedee2;
  border-radius: 12px;
  background: #fff;
  padding: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.14);
}

.project-menu button {
  display: flex;
  width: 100%;
  height: 34px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #34343a;
  padding: 0 10px;
  font: inherit;
  font-size: 14px;
  text-align: left;
}

.project-menu button:hover {
  background: #f1f1f3;
}

.project-menu button.danger {
  color: #b3261e;
}

.project-item strong,
.task-item strong {
  color: inherit;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.25;
}

.project-item em {
  max-width: 250px;
}

.project-item em,
.task-item em {
  color: #8b8c92;
  font-size: 12px;
  line-height: 1.4;
}

.task-item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 42px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px 8px 42px;
}

.task-delete-btn {
  width: 24px;
  height: 24px;
  border-radius: 7px;
}

.task-title {
  min-width: 0;
}

.task-item.active {
  background: #d9d9dc;
}

.task-spinner {
  display: inline-block;
  width: 13px;
  height: 13px;
  margin-left: 8px;
  border: 2px solid #c8c8ce;
  border-top-color: #5d5e66;
  border-radius: 50%;
  vertical-align: -2px;
  animation: spin 0.9s linear infinite;
}

.create-project-btn {
  height: 34px;
  justify-content: flex-start;
  margin: 0 0 18px;
  border-radius: 10px;
  background: transparent;
  color: #6f7077;
  padding: 0 12px;
  font-size: 14px;
}

.create-project-btn:hover {
  background: rgba(0, 0, 0, 0.055);
  color: #34343a;
}

.panel-footer {
  display: grid;
  gap: 6px;
  padding-top: 12px;
}

.codex-status {
  padding: 0 12px 4px;
  color: #8b8c92;
  font-size: 12px;
}

.empty-state {
  padding: 10px 12px;
  color: #a4a5aa;
  font-size: 14px;
}

.workspace-main {
  background: #fff;
}

.codex-workspace {
  position: relative;
  background: #fff;
}

.workspace-head {
  height: 58px;
  border-bottom: 1px solid #e5e5e8;
  background: rgba(255, 255, 255, 0.92);
  padding: 0 20px;
}

.title-cluster {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.title-cluster > div {
  min-width: 0;
}

.workspace-head h1 {
  max-width: min(760px, calc(100vw - 620px));
  overflow: hidden;
  color: #202124;
  font-size: 16px;
  font-weight: 650;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-head p {
  display: none;
}

.head-actions {
  align-items: center;
  gap: 8px;
}

.header-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #5f6068;
}

.header-icon:hover {
  background: #f0f0f2;
  color: #202124;
}

.header-icon.strong {
  background: #202124;
  color: #fff;
}

.task-output {
  flex: 1;
  padding: 44px 0 188px;
}

.conversation-box {
  width: min(1040px, calc(100% - 72px));
  margin: 0 auto;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.codex-event + .codex-event {
  margin-top: 28px;
}

.message-row {
  max-width: 100%;
}

.message-row.user {
  align-items: flex-end;
  margin-left: auto;
}

.message-row.assistant {
  align-items: flex-start;
}

.message-bubble {
  max-width: min(860px, 82%);
  border-radius: 0;
  padding: 0;
  color: #202124;
  font-size: 16px;
  line-height: 1.72;
}

.message-row.user .message-bubble {
  max-width: min(760px, 72%);
  border-radius: 18px;
  background: #f0f0f2;
  color: #202124;
  padding: 10px 15px;
  font-weight: 500;
}

.message-row.assistant .message-bubble {
  border: 0;
  background: transparent;
  color: #202124;
}

.message-bubble pre,
.tool-line pre {
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  font-family: inherit;
}

.markdown-body {
  max-width: 860px;
  color: inherit;
}

.markdown-body :deep(p) {
  margin: 0 0 18px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul) {
  margin: 0 0 18px;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 5px 0;
}

.markdown-body :deep(strong) {
  font-weight: 700;
}

.markdown-body :deep(code) {
  border-radius: 6px;
  background: #f2f2f4;
  padding: 2px 5px;
  color: #202124;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 22px 0 10px;
  color: #202124;
  font-weight: 700;
  line-height: 1.3;
}

.markdown-body :deep(h1) {
  font-size: 22px;
}

.markdown-body :deep(h2) {
  font-size: 19px;
}

.markdown-body :deep(h3) {
  font-size: 17px;
}

.tool-line,
.status-line {
  width: min(860px, 100%);
  max-width: 860px;
  align-items: center;
  gap: 9px;
  border: 0;
  background: transparent;
  color: #a0a1a7;
  padding: 0;
  font-size: 15px;
  line-height: 1.5;
}

.tool-line {
  display: block;
  align-items: flex-start;
  color: #8e8f95;
}

.tool-line summary {
  display: grid;
  width: 100%;
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  cursor: pointer;
  list-style: none;
  color: #9b9ca3;
  font-size: 14px;
  line-height: 20px;
  user-select: none;
}

.tool-line summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-line summary::-webkit-details-marker {
  display: none;
}

.tool-line summary::before {
  content: "›";
  display: inline-block;
  color: #b0b1b7;
  font-size: 18px;
  line-height: 1;
  transform: translateY(-1px);
  transition: transform 0.16s ease;
}

.tool-line[open] summary::before {
  transform: rotate(90deg) translateX(1px);
}

.tool-line pre {
  margin: 8px 0 0 25px;
  max-width: min(780px, 100%);
  max-height: 260px;
  overflow: auto;
  border-left: 1px solid #e1e1e5;
  padding-left: 14px;
  color: #8e8f95;
  font-size: 13px;
  line-height: 1.55;
}

.tool-line svg,
.status-line svg {
  margin-top: 2px;
  color: #a0a1a7;
}

.codex-event.error .status-line,
.codex-event.error .tool-line,
.codex-event.error .tool-line summary,
.codex-event.error .tool-line pre {
  color: #b3261e;
}

.codex-event.done .status-line {
  color: #6d8a51;
}

.empty-output {
  width: min(720px, calc(100% - 64px));
  margin: 0 auto;
  color: #8e8f95;
}

.empty-output svg {
  color: #202124;
}

.empty-output h2 {
  color: #202124;
  font-size: 20px;
}

.empty-output p {
  color: #8e8f95;
  font-size: 15px;
}

.codex-composer {
  position: absolute;
  right: 0;
  bottom: 20px;
  left: 0;
  width: min(1040px, calc(100% - 72px));
  margin: 0 auto;
  border: 1px solid #e1e1e5;
  border-radius: 20px;
  background: #fff;
  padding: 12px 14px 12px;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.10);
}

.codex-composer textarea {
  min-height: 94px;
  max-height: 240px;
  color: #202124;
  font-size: 16px;
  line-height: 1.55;
}

.codex-composer textarea::placeholder {
  color: #9a9ba1;
}

.composer-footer {
  gap: 8px;
}

.composer-spacer {
  flex: 1;
}

.round-tool,
.send-btn {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
}

.round-tool {
  background: transparent;
  color: #808189;
}

.round-tool:hover {
  background: #f2f2f4;
  color: #202124;
}

.send-btn {
  background: #202124;
  color: #fff;
}

.send-btn:disabled {
  background: #d8d8dc;
  color: #fff;
}

.inline-select {
  height: 34px;
  min-width: 0;
  appearance: none;
  border: 0;
  border-radius: 11px;
  background: #f2f2f4;
  color: #6c6d74;
  padding: 0 28px 0 12px;
  font: inherit;
  font-size: 14px;
  outline: none;
}

.inline-select:hover {
  background: #eaeaed;
  color: #303137;
}

.permission-select {
  width: 188px;
}

.inline-select.model-select {
  width: 130px;
  min-width: 130px;
  border: 0;
  background: #f2f2f4;
  color: #6c6d74;
}

.reasoning-select {
  width: 84px;
}

.attachment-strip {
  gap: 6px;
  margin-bottom: 8px;
}

.attachment-chip {
  border: 1px solid #e1e1e5;
  background: #f7f7f8;
  color: #606168;
}

.attachment-chip button {
  color: #8e8f95;
}

.dialog-backdrop {
  background: rgba(0, 0, 0, 0.18);
}

.project-dialog {
  border: 1px solid #e1e1e5;
  background: #fff;
  color: #202124;
  box-shadow: 0 20px 54px rgba(0, 0, 0, 0.16);
}

.project-dialog h2 {
  color: #202124;
}

.project-dialog p {
  color: #76777f;
}

.project-dialog input {
  border: 1px solid #dcdce1;
  background: #fff;
  color: #202124;
}

.primary-btn,
.secondary-btn {
  border-radius: 10px;
}

.primary-btn {
  background: #202124;
  color: #fff;
}

.secondary-btn {
  background: #f2f2f4;
  color: #34343a;
}

@media (max-width: 980px) {
  .codex-page {
    grid-template-columns: 1fr;
  }

  .project-panel {
    display: none;
  }

  .workspace-head h1 {
    max-width: calc(100vw - 190px);
  }

  .conversation-box,
  .codex-composer,
  .empty-output {
    width: calc(100% - 28px);
  }

  .permission-select {
    width: 150px;
  }
}

/* Codex App level surface. */
.codex-page {
  grid-template-columns: 300px minmax(0, 1fr);
  background: #ffffff;
  color: #1f1f23;
}

.codex-page.panel-collapsed {
  grid-template-columns: minmax(0, 1fr);
}

.codex-page.panel-collapsed .project-panel {
  display: none;
}

.project-panel {
  border-right: 1px solid #dedee2;
  background: #f4f4f5;
  color: #2f3035;
  box-shadow: none;
}

.panel-toolbar {
  display: flex;
  height: 42px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
  padding: 0 12px;
  color: #202124;
  font-size: 16px;
  font-weight: 700;
}

.panel-toggle,
.header-icon,
.round-tool,
.send-btn {
  cursor: pointer;
}

.panel-toggle {
  display: grid;
  width: 34px;
  height: 34px;
  place-items: center;
  border: 1px solid #d9d9de;
  border-radius: 8px;
  background: #ffffff;
  color: #5f6068;
}

.panel-toggle:hover,
.nav-action:hover,
.create-project-btn:hover,
.header-icon:hover,
.round-tool:hover {
  background: #e9e9ec;
  color: #202124;
}

.nav-action {
  color: #46474e;
}

.section-title,
.codex-status,
.empty-state {
  color: #8b8c92;
}

.project-item,
.task-item {
  color: #3f4046;
}

.project-item svg {
  color: #6e7078;
}

.project-item:hover,
.project-item.active,
.task-item:hover,
.task-item.active {
  background: #e6e6e9;
  color: #202124;
}

.project-item strong,
.task-item strong {
  color: inherit;
}

.project-item em,
.task-item em {
  color: #8f9097;
}

.create-project-btn {
  color: #707179;
}

.workspace-main,
.codex-workspace {
  background: #ffffff;
}

.workspace-head {
  border-bottom: 1px solid #e7e7ea;
  background: rgba(255, 255, 255, 0.96);
}

.workspace-head h1 {
  color: #202124;
}

.header-icon {
  color: #6b6c73;
}

.header-icon.strong {
  background: #ef4444;
  color: #fff;
}

.conversation-box {
  color: #202124;
}

.message-bubble,
.message-row.assistant .message-bubble {
  color: #202124;
}

.message-row.user .message-bubble {
  background: #f0f0f2;
  color: #202124;
}

.tool-line,
.status-line,
.activity-line,
.tool-line pre {
  color: #9a9ba1;
}

.tool-line svg,
.status-line svg,
.activity-line svg {
  color: #a7a8ae;
}

.activity-line {
  display: grid;
  width: min(860px, 100%);
  grid-template-columns: 16px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  color: #8f9097;
  font-size: 14px;
  line-height: 20px;
}

.activity-line span:last-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.activity-dot {
  width: 6px;
  height: 6px;
  margin-left: 5px;
  border-radius: 50%;
  background: #a7a8ae;
  animation: activityPulse 1.3s ease-in-out infinite;
}

@keyframes activityPulse {
  0%, 100% { opacity: 0.35; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.12); }
}

.codex-event.error .status-line,
.codex-event.error .tool-line,
.codex-event.error .tool-line pre {
  color: #fca5a5;
}

.codex-event.done .status-line {
  color: #86efac;
}

.empty-output,
.empty-output p {
  color: #8d8e95;
}

.empty-output h2,
.empty-output svg {
  color: #202124;
}

.codex-composer {
  border: 1px solid #e0e0e4;
  background: #ffffff;
  box-shadow: 0 12px 34px rgba(0, 0, 0, 0.12);
}

.slash-menu {
  position: absolute;
  right: 14px;
  bottom: calc(100% + 10px);
  left: 14px;
  z-index: 35;
  display: grid;
  max-height: min(360px, 46vh);
  overflow-y: auto;
  border: 1px solid #dedee2;
  border-radius: 14px;
  background: #ffffff;
  padding: 7px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16);
}

.slash-menu-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px 7px;
  color: #77787f;
  font-size: 12px;
  line-height: 1;
}

.slash-menu-head span {
  color: #5f6068;
  font-weight: 650;
}

.slash-menu-head small {
  color: #a0a1a7;
  font-size: 12px;
}

.slash-menu-item {
  display: grid;
  width: 100%;
  min-height: 56px;
  grid-template-columns: 34px minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #202124;
  padding: 8px 10px;
  font: inherit;
  text-align: left;
}

.slash-menu-item:hover:not(:disabled) {
  background: #f0f0f2;
}

.slash-icon {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: #f3f3f5;
  color: #5f6068;
  font-size: 16px;
}

.slash-menu-item strong,
.slash-menu-item em {
  display: block;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slash-menu-item strong {
  color: #202124;
  font-size: 14px;
  font-weight: 650;
  line-height: 1.25;
}

.slash-menu-item em {
  margin-top: 3px;
  color: #85868d;
  font-size: 12px;
  font-style: normal;
  line-height: 1.3;
}

.slash-menu-item small {
  border-radius: 999px;
  background: #f5f5f6;
  color: #8b8c92;
  padding: 3px 7px;
  font-size: 11px;
  line-height: 1;
}

.slash-menu-item.muted {
  cursor: default;
}

.codex-composer textarea {
  color: #202124;
}

.codex-composer textarea::placeholder {
  color: #9899a0;
}

.round-tool {
  color: #7b7c84;
}

.inline-select,
.inline-select.model-select {
  background: #f0f0f2;
  color: #61626a;
}

.inline-select:hover,
.inline-select.model-select:hover {
  background: #e7e7ea;
  color: #202124;
}

.send-btn {
  background: #202124;
  color: #fff;
}

.send-btn:disabled {
  background: #d8d8dc;
  color: #fff;
}

.attachment-chip {
  border-color: #dedee2;
  background: #f7f7f8;
  color: #5f6068;
}

.file-change-chip {
  border-color: #dedee2;
  background: #f7f7f8;
  color: #4b4c54;
}

.file-change-chip:hover,
.file-change-chip.active {
  border-color: #c9cad0;
  background: #ededf0;
  color: #202124;
}

.file-change-chip em {
  color: #85868d;
}

.codex-preview-panel {
  border-color: #dedee3;
  background: #ffffff;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.14);
}

.preview-head {
  border-bottom-color: #e7e7ea;
}

.preview-head strong {
  color: #202124;
}

.preview-head span,
.preview-head button,
.preview-meta {
  color: #77787f;
}

.preview-head button:hover {
  background: #f0f0f2;
  color: #202124;
}

.preview-meta {
  border-bottom-color: #eeeeF1;
}

.preview-meta span:nth-child(2) {
  color: #148a42;
}

.preview-meta span:nth-child(3) {
  color: #c24135;
}

.preview-code {
  background: #fbfbfc;
  color: #2f3036;
}

.preview-empty {
  color: #8f9097;
}

.dialog-backdrop {
  background: rgba(0, 0, 0, 0.22);
}

.project-dialog {
  border-color: #dedee2;
  background: #ffffff;
  color: #202124;
}

.project-dialog h2 {
  color: #202124;
}

.project-dialog p {
  color: #77787f;
}

.project-dialog input {
  border-color: #d8d8dd;
  background: #fff;
  color: #202124;
}

.form-field {
  color: #55565d;
}

.form-field span {
  color: #77787f;
}

.test-result.ok {
  background: #edf8f0;
  color: #1f7a3d;
}

.test-result.error {
  background: #fff0f0;
  color: #b3261e;
}

.project-source-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin: 16px 0 12px;
}

.project-source-tabs button {
  height: 36px;
  border: 1px solid #dedee2;
  border-radius: 10px;
  background: #f3f3f5;
  color: #5f6068;
  font: inherit;
}

.project-source-tabs button.active {
  border-color: #202124;
  background: #202124;
  color: #fff;
}

.dialog-note {
  margin-top: -8px;
  color: #77787f;
  font-size: 12px;
}

.approval-backdrop {
  background: rgba(0, 0, 0, 0.28);
}

.approval-dialog {
  width: min(560px, calc(100vw - 32px));
}

.approval-summary {
  display: grid;
  gap: 12px;
  margin: 16px 0 18px;
}

.approval-summary label {
  display: grid;
  gap: 7px;
  margin: 0;
}

.approval-summary span {
  color: #77787f;
  font-size: 12px;
  font-weight: 650;
}

.approval-summary code,
.approval-summary pre {
  max-height: 210px;
  overflow: auto;
  border: 1px solid #e1e1e5;
  border-radius: 10px;
  background: #f7f7f8;
  color: #202124;
  padding: 10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  white-space: pre-wrap;
  word-break: break-word;
}

.primary-btn {
  background: #202124;
}

.secondary-btn {
  background: #f1f1f3;
  color: #34343a;
}

/* Project tree polish: project rows are headings, threads are the selectable items. */
.project-list {
  padding-right: 6px;
}

.project-group {
  margin-bottom: 14px;
}

.project-item {
  min-height: 34px;
  margin: 0;
  border-radius: 8px;
  background: transparent;
  padding: 6px 10px;
  color: #34343a;
}

.project-item.active,
.project-item:hover {
  background: transparent;
  color: #202124;
}

.project-row:hover,
.project-row.active {
  background: #e3e3e6;
}

.project-item strong {
  font-size: 14px;
  font-weight: 650;
}

.project-item em {
  max-width: 245px;
  margin-top: 2px;
  color: #9a9ba1;
  font-size: 11px;
}

.project-thread-list {
  gap: 1px;
  margin: 2px 0 0 28px;
  padding-left: 10px;
  border-left: 1px solid #dedee2;
}

.task-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  min-height: 34px;
  margin: 0;
  border-radius: 8px;
  background: transparent;
  padding: 6px 8px;
  color: #5f6068;
}

.task-item:hover {
  background: #e9e9ec;
  color: #202124;
}

.task-item.active {
  background: #dedee2;
  color: #202124;
}

.task-item strong {
  font-size: 13px;
  font-weight: 580;
}

.task-item em {
  margin-top: 1px;
  color: #8f9097;
  font-size: 11px;
}

.task-spinner {
  width: 12px;
  height: 12px;
  border-color: #c7c7cd;
  border-top-color: #202124;
}

/* Scroll behavior: the message list owns vertical scrolling, not the page shell. */
.workspace-main,
.codex-workspace {
  min-height: 0;
  overflow: hidden;
}

.task-output {
  min-height: 0;
  overflow: hidden;
}

.conversation-box {
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-bottom: 16px;
  scrollbar-width: thin;
  scrollbar-color: rgba(32, 33, 36, 0.28) transparent;
}

.conversation-box::-webkit-scrollbar,
.preview-code-editor::-webkit-scrollbar,
.slash-menu::-webkit-scrollbar,
.project-list::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.conversation-box::-webkit-scrollbar-track,
.preview-code-editor::-webkit-scrollbar-track,
.slash-menu::-webkit-scrollbar-track,
.project-list::-webkit-scrollbar-track {
  background: transparent;
}

.conversation-box::-webkit-scrollbar-thumb,
.preview-code-editor::-webkit-scrollbar-thumb,
.slash-menu::-webkit-scrollbar-thumb,
.project-list::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background: rgba(32, 33, 36, 0.28);
  background-clip: content-box;
}

.conversation-box::-webkit-scrollbar-thumb:hover,
.preview-code-editor::-webkit-scrollbar-thumb:hover,
.slash-menu::-webkit-scrollbar-thumb:hover,
.project-list::-webkit-scrollbar-thumb:hover {
  background: rgba(32, 33, 36, 0.42);
  background-clip: content-box;
}

/* Codex App alignment layer. Keep this last so older page experiments cannot leak through. */
.codex-page {
  font-family: ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, "Helvetica Neue", Arial, "PingFang SC", "Microsoft YaHei", sans-serif;
  letter-spacing: 0;
  grid-template-columns: 300px minmax(0, 1fr);
  background: #ffffff;
  color: #202124;
}

.project-panel {
  padding: 10px 10px 12px;
  border-right: 1px solid #dedee2;
  background: #f4f4f5;
}

.panel-toolbar {
  height: 38px;
  margin-bottom: 10px;
  padding: 0 14px;
  font-size: 15px;
  font-weight: 650;
}

.panel-nav {
  gap: 2px;
  margin-bottom: 14px;
}

.nav-action,
.create-project-btn {
  height: 34px;
  border-radius: 9px;
  color: #4f5057;
  font-size: 14px;
}

.section-title {
  color: #85868d;
  font-size: 13px;
  font-weight: 560;
}

.project-section-title {
  position: relative;
  grid-template-columns: minmax(0, 1fr) auto;
  min-height: 34px;
  gap: 8px;
  margin: 0 0 4px;
  padding: 0 9px;
}

.project-collapse-btn {
  position: absolute;
  top: 5px;
  left: -8px;
  z-index: 1;
}

.project-title-action {
  display: inline-flex;
  min-height: 34px;
  min-width: 0;
  flex: 1;
  align-items: center;
  gap: 8px;
  border: 0;
  background: transparent;
  color: #303137;
  padding: 0;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  line-height: 1;
  text-align: left;
  cursor: pointer;
}

.project-title-action svg {
  flex: 0 0 auto;
  color: #6d6e75;
}

.project-title-action:hover {
  color: #202124;
}

.project-list {
  flex: 1;
  max-height: none;
  padding: 0 4px 8px 0;
}

.project-list .empty-state {
  padding: 10px 8px 8px 18px;
  color: #8a8b92;
  font-size: 13px;
}

.project-row {
  grid-template-columns: minmax(0, 1fr) 26px;
  border-radius: 9px;
}

.project-row:hover,
.project-row.active {
  background: transparent;
}

.project-row:hover .project-item {
  color: #202124;
}

.project-item {
  min-height: 34px;
  gap: 8px;
  padding: 6px 9px;
  color: #303137;
}

.project-item:hover,
.project-item.active {
  background: transparent;
}

.project-item strong {
  font-size: 13px;
  font-weight: 650;
}

.project-thread-list {
  margin: 2px 0 10px 27px;
  padding-left: 9px;
  border-left: 1px solid #dedee2;
}

.task-item {
  min-height: 33px;
  grid-template-columns: minmax(0, 1fr) auto 16px 24px;
  border-radius: 8px;
  padding: 6px 7px;
  color: #606168;
}

.task-item:hover {
  background: #eaeaed;
}

.task-item.active {
  background: #e6e6e9;
  color: #202124;
}

.task-item strong {
  display: block;
  min-width: 0;
  overflow: hidden;
  font-size: 13px;
  font-weight: 560;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-title {
  min-width: 0;
}

.task-time {
  color: #92939a;
  font-size: 11px;
  line-height: 1;
  white-space: nowrap;
}

.codex-workspace {
  position: relative;
  background: #ffffff;
  --codex-track-width: min(920px, calc(100% - 96px));
}

.codex-workspace.composing {
  justify-content: center;
  padding-bottom: 86px;
}

.new-chat-center {
  width: var(--codex-track-width);
  margin: 0 auto 24px;
  text-align: center;
}

.new-chat-center h1 {
  margin: 0;
  color: #202124;
  font-size: 29px;
  font-weight: 560;
  letter-spacing: 0;
}

.workspace-head {
  height: 56px;
  flex: 0 0 56px;
  border-bottom: 1px solid #e7e7ea;
  background: rgba(255, 255, 255, 0.96);
  padding: 0 24px;
}

.title-cluster {
  gap: 12px;
}

.workspace-head h1 {
  max-width: min(760px, calc(100vw - 620px));
  color: #202124;
  font-size: 15px;
  font-weight: 650;
}

.header-icon,
.panel-toggle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
}

.header-icon.active {
  background: #ececef;
  color: #202124;
}

.git-popover {
  position: absolute;
  top: 50px;
  right: 20px;
  z-index: 40;
  width: 334px;
  border: 1px solid #dedee3;
  border-radius: 18px;
  background: #ffffff;
  padding: 10px;
  color: #202124;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.16);
}

.git-popover-head {
  display: flex;
  height: 32px;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 4px 6px;
}

.git-popover-head h2 {
  margin: 0;
  color: #202124;
  font-size: 15px;
  font-weight: 680;
  line-height: 1;
}

.git-popover-head button {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #77787f;
  cursor: pointer;
}

.git-popover-head button:hover:not(:disabled) {
  background: #f1f1f3;
  color: #202124;
}

.git-row {
  display: grid;
  min-height: 35px;
  grid-template-columns: 20px minmax(0, 1fr) auto auto auto;
  align-items: center;
  gap: 8px;
  border-radius: 10px;
  padding: 0 9px;
  color: #42434a;
  font-size: 13px;
}

.git-row:hover {
  background: #f7f7f8;
}

.git-row svg {
  color: #77787f;
}

.git-row span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.git-row strong,
.git-row em {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-style: normal;
  font-weight: 560;
  white-space: nowrap;
}

.git-additions {
  color: #1a7f37;
}

.git-deletions {
  color: #cf222e;
}

.git-commit-box {
  display: grid;
  gap: 8px;
  margin-top: 9px;
  border-top: 1px solid #eeeeef;
  padding: 11px 2px 0;
}

.git-section-label {
  padding: 0 7px;
  color: #85868d;
  font-size: 12px;
  font-weight: 600;
}

.git-commit-box input {
  width: 100%;
  height: 36px;
  border: 1px solid #dedee3;
  border-radius: 10px;
  outline: none;
  background: #fff;
  color: #202124;
  padding: 0 11px;
  font: inherit;
  font-size: 13px;
}

.git-commit-box input:focus {
  border-color: #b8b8c0;
  box-shadow: 0 0 0 3px rgba(32, 33, 36, 0.06);
}

.git-action {
  display: inline-flex;
  height: 34px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 1px solid #dedee3;
  border-radius: 10px;
  background: #fff;
  color: #303137;
  padding: 0 12px;
  font: inherit;
  font-size: 13px;
  font-weight: 620;
  cursor: pointer;
}

.git-action:hover:not(:disabled) {
  background: #f3f3f5;
}

.git-action.primary {
  border-color: #202124;
  background: #202124;
  color: #fff;
}

.git-action.primary:hover:not(:disabled) {
  background: #111214;
}

.git-action:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.git-auth-line,
.git-empty {
  margin-top: 10px;
  border-radius: 10px;
  background: #f7f7f8;
  color: #77787f;
  padding: 9px 10px;
  font-size: 12px;
  line-height: 1.45;
}

.git-auth-line.ok {
  color: #1a7f37;
  background: #eef8f1;
}

.task-output {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 36px 0 178px;
}

.conversation-box {
  width: var(--codex-track-width);
  height: 100%;
  margin: 0 auto;
  border: 0;
  background: transparent;
  padding: 0 8px 18px;
}

.codex-event + .codex-event {
  margin-top: 24px;
}

.task-duration-line {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 4px;
  margin: 0 0 18px;
  border-bottom: 1px solid #e8e8eb;
  padding-bottom: 10px;
  color: #85868d;
  font-size: 15px;
  line-height: 22px;
}

.task-duration-line svg {
  color: #9a9ba1;
}

.message-row {
  max-width: 100%;
}

.message-row.user {
  align-items: flex-end;
  margin-left: auto;
}

.message-row.assistant {
  align-items: flex-start;
  margin-right: auto;
}

.message-bubble {
  max-width: min(820px, 100%);
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: #202124;
  font-size: 15.5px;
  font-weight: 400;
  line-height: 1.68;
}

.message-row.user .message-bubble {
  max-width: min(640px, 72%);
  border-radius: 17px;
  background: #f1f1f3;
  color: #202124;
  padding: 10px 15px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.5;
}

.message-row.assistant .message-bubble {
  border: 0;
  background: transparent;
}

.markdown-body {
  max-width: 100%;
  color: #202124;
  font-size: 15.5px;
  line-height: 1.68;
}

.markdown-body :deep(p) {
  margin: 0 0 17px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0 0 16px;
  padding-left: 22px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(code) {
  border-radius: 5px;
  background: #f2f2f4;
  padding: 1px 5px;
  color: #202124;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.88em;
}

.markdown-body :deep(.project-file-link) {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  border: 0;
  border-radius: 6px;
  background: rgba(10, 132, 255, 0.08);
  color: #0a66d8;
  padding: 1px 6px;
  font: inherit;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92em;
  cursor: pointer;
}

.markdown-body :deep(.project-file-link:hover) {
  background: rgba(10, 132, 255, 0.13);
  color: #004eb8;
}

.activity-line,
.tool-line,
.changes-card,
.status-line {
  width: 100%;
  max-width: 100%;
  color: #96979d;
  font-size: 13px;
  line-height: 20px;
}

.activity-line {
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 7px;
}

.activity-dot {
  width: 5px;
  height: 5px;
  margin-left: 4px;
  background: #a8a9af;
}

.tool-line {
  display: block;
  border: 0;
  background: transparent;
  padding: 0;
}

.tool-line summary {
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 7px;
  color: #96979d;
  font-size: 13px;
  line-height: 20px;
}

.tool-line pre {
  margin: 8px 0 0 22px;
  max-height: 240px;
  border-left: 1px solid #e2e2e6;
  color: #77787f;
  padding-left: 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
}

.changes-card {
  overflow: hidden;
  border: 1px solid #dedee3;
  border-radius: 13px;
  background: #ffffff;
  color: #202124;
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
}

.changes-card-head {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 8px 10px 8px 13px;
}

.changes-card-title,
.changes-card-actions {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.changes-card-title {
  color: #202124;
  font-size: 14px;
  font-weight: 600;
}

.changes-card-title svg {
  color: #6b6c73;
  flex: 0 0 auto;
}

.changes-card-actions {
  flex: 0 0 auto;
}

.changes-card-actions button {
  height: 28px;
  border: 1px solid #d7d7dc;
  border-radius: 8px;
  background: #fff;
  color: #3b3c42;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.changes-card-actions button:hover {
  background: #f3f3f5;
}

.changes-file-row {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto 52px 52px;
  align-items: center;
  gap: 10px;
  border: 0;
  border-top: 1px solid #eeeeef;
  background: transparent;
  padding: 9px 12px;
  color: #3f4046;
  text-align: left;
  cursor: pointer;
}

.changes-file-row:hover,
.changes-file-row.active {
  background: #f8f8f9;
}

.changes-file-path {
  overflow: hidden;
  color: #2f3036;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.changes-file-meta {
  color: #8c8d94;
  font-size: 12px;
  white-space: nowrap;
}

.change-stat {
  color: #76777e;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  text-align: right;
  white-space: nowrap;
}

.change-stat.additions {
  color: #1a7f37;
}

.change-stat.deletions {
  color: #cf222e;
}

.codex-composer {
  position: absolute;
  right: 0;
  bottom: 16px;
  left: 0;
  width: var(--codex-track-width);
  margin: 0 auto;
  border: 1px solid #d9d9de;
  border-radius: 18px;
  background: #ffffff;
  padding: 10px 12px 10px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.11);
}

.codex-workspace.terminal-visible .task-output {
  padding-bottom: 428px;
}

.codex-workspace.terminal-visible .codex-composer {
  bottom: 274px;
}

.codex-workspace.composing .codex-composer {
  position: relative;
  right: auto;
  bottom: auto;
  left: auto;
  width: min(960px, calc(100% - 128px));
  margin: 0 auto;
  border-radius: 18px 18px 0 0;
  box-shadow: 0 16px 34px rgba(0, 0, 0, 0.1);
}

.codex-workspace.composing .codex-composer textarea {
  min-height: 54px;
  max-height: 140px;
}

.composer-project-meta {
  display: flex;
  height: 42px;
  align-items: center;
  gap: 24px;
  margin: 10px -12px -10px;
  border-radius: 0 0 18px 18px;
  background: #f3f3f4;
  color: #77787f;
  padding: 0 16px;
  font-size: 13px;
}

.composer-project-meta span {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}

.composer-project-meta svg {
  flex: 0 0 auto;
  color: #85868d;
}

.codex-composer textarea {
  min-height: 44px;
  max-height: 150px;
  resize: none;
  color: #202124;
  font-size: 14.5px;
  line-height: 1.45;
}

.codex-composer textarea::placeholder {
  color: #96979d;
}

.composer-footer {
  align-items: center;
  gap: 9px;
  margin-top: 7px;
}

.round-tool,
.send-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
}

.round-tool {
  border: 0;
  background: transparent;
  color: #77787f;
}

.round-tool:hover {
  background: #f1f1f3;
  color: #202124;
}

.send-btn {
  border: 0;
  background: #1f2024;
  color: #ffffff;
}

.send-btn svg {
  stroke-width: 2.5;
}

.send-btn:hover:not(:disabled) {
  background: #111214;
}

.send-btn:disabled {
  background: #e4e4e7;
  color: #ffffff;
}

.send-btn.running {
  background: #1f2024;
  color: #ffffff;
}

.stop-icon {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 2px;
  background: currentColor;
}

.inline-select {
  height: 32px;
  border: 0;
  outline: none;
  border-radius: 11px;
  background: #f1f1f3;
  color: #696a72;
  padding: 0 13px;
  font-size: 13px;
}

.inline-select:hover {
  background: #e9e9ec;
  color: #202124;
}

.permission-select {
  width: 124px;
  background: transparent;
  color: #7b7c84;
  padding-left: 4px;
}

.permission-select:hover {
  background: #f1f1f3;
}

.inline-select.model-select {
  width: 126px;
  min-width: 126px;
}

.reasoning-select {
  width: 74px;
}

.attachment-strip,
.selected-context-strip,
.file-change-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.selected-context-strip {
  margin-bottom: 4px;
}

.selected-context-chip {
  display: inline-flex;
  height: 26px;
  max-width: 260px;
  align-items: center;
  gap: 5px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #2d7fe5;
  padding: 0 4px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.selected-context-chip:hover {
  background: #edf5ff;
}

.selected-context-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.change-summary {
  display: inline-flex;
  height: 27px;
  align-items: center;
  gap: 8px;
  border: 1px solid #dedee3;
  border-radius: 999px;
  background: #fff;
  color: #686970;
  padding: 0 10px;
  font-size: 12px;
  white-space: nowrap;
}

.change-summary .additions {
  color: #1a7f37;
}

.change-summary .deletions {
  color: #cf222e;
}

.attachment-chip,
.file-change-chip {
  height: 27px;
  max-width: 220px;
  border: 1px solid #dedee3;
  border-radius: 999px;
  background: #f7f7f8;
  color: #505158;
  font-size: 12px;
}

.file-change-chip.active,
.file-change-chip:hover,
.attachment-chip:hover {
  background: #ededf0;
  color: #202124;
}

.file-change-chip em {
  color: #85868d;
}

.codex-preview-panel {
  top: 68px;
  right: 18px;
  bottom: 18px;
  width: min(720px, calc(100% - 56px));
  border: 1px solid #dedee3;
  border-radius: 12px;
  background: #ffffff;
  box-shadow: 0 18px 50px rgba(0, 0, 0, 0.15);
}

.preview-head {
  border-bottom: 1px solid #e7e7ea;
  padding: 12px 13px;
}

.preview-head strong {
  color: #202124;
  font-size: 13px;
  font-weight: 650;
}

.preview-head span,
.preview-meta {
  color: #77787f;
  font-size: 12px;
}

.preview-head button {
  color: #77787f;
}

.preview-head button:hover {
  background: #f0f0f2;
  color: #202124;
}

.preview-code-editor {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: #ffffff;
  color: #303137;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.75px;
  line-height: 1.6;
  white-space: pre;
}

.preview-code-line {
  display: grid;
  min-width: max-content;
  grid-template-columns: 56px minmax(0, 1fr);
}

.preview-code-line:hover {
  background: #f7f7f8;
}

.preview-code-line code {
  display: block;
  min-height: 21px;
  border-left: 1px solid #ececef;
  padding: 1px 16px;
  color: inherit;
  font: inherit;
}

.preview-line-number {
  display: block;
  min-height: 21px;
  user-select: none;
  background: #fafafa;
  color: #8f9097;
  padding: 1px 12px 1px 0;
  text-align: right;
}

.preview-code-line.added {
  background: #e9f7ec;
}

.preview-code-line.added .preview-line-number {
  color: #1a7f37;
}

.preview-code-line.removed {
  background: #ffebe9;
}

.preview-code-line.removed .preview-line-number {
  color: #cf222e;
}

.preview-code-line.hunk {
  background: #eef4ff;
  color: #57606a;
}

.preview-code-line.meta {
  color: #77787f;
}

.preview-tabs {
  display: inline-flex;
  align-self: flex-start;
  gap: 4px;
  margin: 0 12px 10px;
  border-radius: 9px;
  background: #f1f1f3;
  padding: 3px;
}

.preview-tabs button {
  height: 26px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #77787f;
  padding: 0 10px;
  font-size: 12px;
}

.preview-tabs button.active {
  background: #fff;
  color: #202124;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.preview-file-view {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
}

.preview-file-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  border-top: 1px solid #ececef;
  border-bottom: 1px solid #ececef;
  background: #fafafa;
  padding: 7px 12px;
  color: #77787f;
  font-size: 12px;
}

.approval-dialog {
  width: min(560px, calc(100vw - 32px));
  border-radius: 14px;
}

.approval-card-head {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.approval-card-head svg {
  flex: 0 0 auto;
  margin-top: 2px;
  color: #202124;
}

.approval-card-head h2 {
  font-size: 17px;
  font-weight: 680;
}

.approval-card-head p {
  font-size: 13px;
}

.approval-action-line {
  margin: 14px 0 4px;
  border: 1px solid #dedee3;
  border-radius: 11px;
  background: #f7f7f8;
  padding: 10px 12px;
  color: #303137;
  font-size: 13px;
  line-height: 1.45;
}

.approval-summary {
  gap: 10px;
  margin: 14px 0 18px;
}

.approval-summary span {
  color: #77787f;
  font-size: 12px;
}

.approval-summary code,
.approval-summary pre {
  border-radius: 10px;
  background: #f8f8f9;
  font-size: 12px;
}

.skills-page {
  display: flex;
  height: 100%;
  min-height: 0;
  flex-direction: column;
  background: #fff;
  color: #202124;
}

.skills-topbar {
  display: flex;
  height: 64px;
  flex: 0 0 64px;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  padding: 0 28px;
}

.skills-toolbar-btn,
.skills-new-btn {
  display: inline-flex;
  height: 36px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: #77787f;
  padding: 0 12px;
  font: inherit;
  font-size: 14px;
  cursor: pointer;
}

.skills-toolbar-btn:hover {
  background: #f1f1f3;
  color: #202124;
}

.skills-search {
  display: inline-flex;
  width: 280px;
  height: 36px;
  align-items: center;
  gap: 8px;
  border: 1px solid #dedee3;
  border-radius: 12px;
  background: #fff;
  color: #8a8b92;
  padding: 0 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.skills-search input {
  width: 100%;
  border: 0;
  outline: none;
  background: transparent;
  color: #202124;
  font: inherit;
  font-size: 14px;
}

.skills-new-btn {
  border-radius: 12px;
  background: #202124;
  color: #fff;
  padding: 0 16px;
  font-weight: 650;
}

.skills-new-btn:hover {
  background: #111214;
}

.skills-content {
  width: min(1040px, calc(100% - 96px));
  margin: 58px auto 0;
}

.skills-hero h1 {
  margin: 0;
  color: #202124;
  font-size: 32px;
  font-weight: 680;
  letter-spacing: 0;
}

.skills-hero p {
  margin: 10px 0 46px;
  color: #8b8c92;
  font-size: 17px;
}

.skills-section h2 {
  margin: 0 0 24px 8px;
  color: #505158;
  font-size: 15px;
  font-weight: 650;
}

.skills-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px 38px;
}

.skill-card {
  position: relative;
  display: grid;
  min-height: 76px;
  grid-template-columns: 54px minmax(0, 1fr) 22px;
  align-items: center;
  gap: 14px;
  border: 0;
  border-radius: 16px;
  background: transparent;
  color: #202124;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}

.skill-card:hover,
.skill-card.selected {
  background: #f0f0f2;
}

.skill-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f5f5f6;
  color: #2d7fe5;
}

.skill-meta {
  min-width: 0;
}

.skill-meta strong {
  display: block;
  overflow: hidden;
  color: #202124;
  font-size: 15px;
  font-weight: 680;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-meta em {
  display: block;
  overflow: hidden;
  margin-top: 4px;
  color: #77787f;
  font-size: 13px;
  font-style: normal;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.skill-card > svg {
  color: #b4b5ba;
}

.skill-menu-wrap {
  position: relative;
  display: inline-flex;
  justify-content: flex-end;
}

.skill-menu-btn {
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #8a8b92;
  font: inherit;
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}

.skill-menu-btn:hover {
  background: #e4e4e7;
  color: #202124;
}

.skill-menu {
  position: absolute;
  top: 30px;
  right: 0;
  z-index: 20;
  min-width: 128px;
  border: 1px solid #dedee3;
  border-radius: 12px;
  background: #fff;
  padding: 6px;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.14);
}

.skill-menu button {
  display: flex;
  width: 100%;
  height: 34px;
  align-items: center;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #b3261e;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.skill-menu button:hover {
  background: #f5f5f6;
}

.skills-empty {
  border-radius: 16px;
  background: #f7f7f8;
  color: #8b8c92;
  padding: 28px;
  font-size: 14px;
}

.terminal-drawer {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 12;
  display: flex;
  height: 250px;
  flex-direction: column;
  border-top: 1px solid #dedee3;
  background: #fff;
  color: #202124;
  box-shadow: 0 -18px 42px rgba(0, 0, 0, 0.08);
}

.terminal-tabs {
  display: flex;
  height: 44px;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid #eeeeef;
  padding: 0 12px;
}

.terminal-tab,
.terminal-add,
.terminal-close {
  display: inline-flex;
  height: 30px;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #6f7077;
  font: inherit;
  cursor: pointer;
}

.terminal-tab {
  max-width: 210px;
  gap: 7px;
  padding: 0 12px;
  font-size: 13px;
}

.terminal-tab.active {
  background: #f1f1f3;
  color: #202124;
}

.terminal-tab span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-tab em {
  color: #9b9ca3;
  font-size: 12px;
  font-style: normal;
}

.terminal-add,
.terminal-close {
  width: 30px;
  flex: 0 0 auto;
}

.terminal-add:hover,
.terminal-close:hover,
.terminal-tab:hover {
  background: #f1f1f3;
  color: #202124;
}

.terminal-close {
  margin-left: auto;
}

.terminal-output {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding: 8px 14px 12px;
}

.xterm-host {
  width: 100%;
  height: 100%;
}

.terminal-output :deep(.xterm) {
  height: 100%;
  padding: 0;
}

.terminal-output :deep(.xterm-viewport) {
  background: transparent !important;
}

.terminal-output :deep(.xterm-screen) {
  background: transparent !important;
}

.terminal-empty {
  color: #8b8c92;
  font-size: 13px;
}

@media (max-width: 980px) {
  .conversation-box,
  .codex-composer,
  .empty-output {
    width: calc(100% - 28px);
  }

  .codex-preview-panel {
    top: 64px;
    right: 14px;
    bottom: 14px;
    left: 14px;
    width: auto;
  }
}
</style>
