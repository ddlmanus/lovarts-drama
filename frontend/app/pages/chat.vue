<template>
  <div class="codex-page" :class="{ 'panel-collapsed': codexPanelCollapsed }">
    <aside class="project-panel">
      <div class="panel-nav">
        <button class="nav-action" type="button" :disabled="!activeProject" @click="newThread">
          <Edit3 :size="18" />
          <span>New chat</span>
        </button>
        <button class="nav-action" type="button" @click="openSkillInstallChat">
          <Search :size="18" />
          <span>Search</span>
        </button>
        <button class="nav-action" type="button" :class="{ active: currentView === 'skills' }" @click="openPluginsPage">
          <Blocks :size="18" />
          <span>Skills</span>
        </button>
      </div>

      <div class="section-title project-section-title">
        <div class="project-section-label">
          <button class="project-collapse-btn" type="button" title="折叠项目">
            <ChevronRight :size="12" />
          </button>
          <span>Projects</span>
        </div>
        <div class="project-section-actions">
          <button type="button" title="更多项目操作">...</button>
          <button type="button" title="Add project" @click="projectDialogOpen = true">
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

      <div class="chat-section">
        <div class="chat-section-title">Chats</div>
        <div class="chat-empty">No chats</div>
      </div>

      <div class="panel-footer">
        <button class="nav-action" type="button" @click="openCodexSettings">
          <Settings :size="18" />
          <span>Settings</span>
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
          <div class="skills-tabs">
            <button type="button" :class="{ active: skillsTab === 'plugins' }" @click="skillsTab = 'plugins'">插件</button>
            <button type="button" :class="{ active: skillsTab === 'skills' }" @click="skillsTab = 'skills'">技能</button>
          </div>
          <div class="skills-topbar-spacer"></div>
          <button class="skills-manage-btn" type="button" @click="openCodexSettings">
            <Settings :size="18" />
            <span>管理</span>
          </button>
          <button class="skills-create-btn" type="button" @click="skillsTab === 'skills' ? openSkillInstallChat() : openPluginChat({ id: 'gmail', name: 'Gmail', path: 'plugin://Gmail' })">
            <span>创建</span>
            <ChevronRight :size="16" />
          </button>
          <button class="skills-more-btn" type="button" :disabled="skillsLoading" title="刷新" @click="loadUserSkills">
            <Loader2 v-if="skillsLoading" :size="18" class="spin" />
            <span v-else>...</span>
          </button>
        </div>
        <div class="skills-content">
          <div class="skills-filter-row">
          <label class="skills-search">
            <Search :size="17" />
            <input v-model="skillsSearchQuery" :placeholder="skillsTab === 'plugins' ? '搜索插件' : '搜索技能'" />
          </label>
            <button v-if="skillsTab === 'plugins'" class="skills-filter-btn" type="button">
              <span>Built by OpenAI</span>
              <ChevronRight :size="16" />
            </button>
            <button class="skills-filter-btn compact" type="button">
              <span>全部</span>
              <ChevronRight :size="16" />
            </button>
          </div>
          <div v-if="skillsTab === 'plugins'" class="plugins-banner">
            <div class="plugins-banner-pill">
              <Mail :size="17" />
              <span><strong>Gmail</strong> 为每封我还没来得及回复的邮件起草回复</span>
            </div>
            <button type="button" @click="openPluginChat({ id: 'gmail', name: 'Gmail', path: 'plugin://Gmail' })">
              在对话中试用
            </button>
            <span class="plugins-banner-dots"><i></i><i></i><i></i><i></i></span>
          </div>
          <section v-if="skillsTab === 'plugins'" class="skills-section">
            <h2>Featured</h2>
            <div v-if="filteredMarketplacePlugins.length" class="skills-grid">
              <button
                v-for="plugin in filteredMarketplacePlugins"
                :key="plugin.id"
                class="skill-card plugin-card"
                type="button"
                :class="{ installed: plugin.installed }"
                @click="plugin.installed ? openPluginChat(plugin) : installPlugin(plugin)"
              >
                <span class="skill-icon" :class="`plugin-icon-${plugin.icon || plugin.id}`">
                  <component :is="pluginIconComponent(plugin)" :size="19" />
                </span>
                <span class="skill-meta">
                  <strong>{{ plugin.name }}</strong>
                  <em>{{ plugin.description || '插件' }}</em>
                </span>
                <Check v-if="plugin.installed" :size="17" />
                <Plus v-else :size="19" />
              </button>
            </div>
            <div v-else class="skills-empty">
              {{ skillsSearchQuery ? '没有匹配的插件' : '暂无插件' }}
            </div>
          </section>
          <section v-else class="skills-section">
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
          <div v-if="renderedEvents.length" ref="logBox" class="conversation-box" @scroll="handleLogScroll">
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
                <Loader2 v-if="event.streaming" :size="15" class="activity-icon spin" />
                <component v-else :is="activityIcon(event)" :size="15" class="activity-icon" />
                <span v-if="event.streaming" class="loading-shimmer-pure-text cadenced-shimmer cadenced-shimmer-active">
                  {{ event.text }}
                  <span aria-hidden="true" class="cadenced-shimmer-sweep">
                    <span class="cadenced-shimmer-highlight">{{ event.text }}</span>
                  </span>
                </span>
                <span v-else>{{ event.text }}</span>
              </div>
              <div v-else-if="event.kind === 'editing'" class="editing-line">
                <Edit3 :size="15" />
                <span class="editing-label">Editing</span>
                <button
                  type="button"
                  class="editing-file"
                  :title="event.file.displayPath || event.file.path"
                  @click="openPreview(event.file.path)"
                >
                  {{ event.file.name || event.file.displayPath || event.file.path }}
                </button>
                <span class="change-stat additions">+{{ event.file.added }}</span>
                <span class="change-stat deletions">-{{ event.file.removed }}</span>
                <span v-if="event.extraCount" class="editing-extra">等 {{ event.extraCount }} 个文件</span>
              </div>
              <div v-else-if="event.kind === 'changes'" class="changes-card">
                <div class="changes-card-head">
                  <div class="changes-card-icon">
                    <FileCode2 :size="16" />
                  </div>
                  <div class="changes-card-copy">
                    <div class="changes-card-title">
                      <span>{{ event.title }}</span>
                    </div>
                    <div class="changes-card-meta">
                      <span class="change-stat additions">+{{ event.stats.added }}</span>
                      <span class="change-stat deletions">-{{ event.stats.removed }}</span>
                      <span>{{ event.files.length }} {{ event.files.length === 1 ? 'file' : 'files' }}</span>
                    </div>
                  </div>
                  <div class="changes-card-actions">
                    <button
                      class="changes-undo-btn"
                      type="button"
                      :disabled="undoingChangeKey === event.key"
                      @click="undoChangeEvent(event)"
                    >
                      {{ undoingChangeKey === event.key ? 'Undoing...' : 'Undo' }}
                    </button>
                    <button type="button" @click="openPreview(event.files[0]?.path)">Review</button>
                  </div>
                </div>
                <button
                  class="changes-details-toggle"
                  type="button"
                  :aria-expanded="isChangeDetailsExpanded(event)"
                  @click="toggleChangeDetails(event.key)"
                >
                  <span>Details</span>
                  <ChevronUp v-if="isChangeDetailsExpanded(event)" :size="16" />
                  <ChevronRight v-else :size="16" />
                </button>
                <div v-if="isChangeDetailsExpanded(event)" class="changes-details-body">
                  <div v-for="file in event.files" :key="`${event.key}-${file.path}`" class="changes-file-block">
                    <button
                      class="changes-file-row"
                      type="button"
                      :class="{ expanded: isChangeExpanded(event, file) }"
                      @click="toggleChangeExpanded(event.key, file.path)"
                    >
                      <span class="changes-file-path" :title="file.displayPath || file.path">
                        {{ file.name || file.displayPath || file.path }}
                      </span>
                      <span v-if="file.action" class="changes-file-action">{{ file.action }}</span>
                      <span class="change-stat additions">+{{ file.added }}</span>
                      <span class="change-stat deletions">-{{ file.removed }}</span>
                      <span class="changes-open-btn" role="button" tabindex="0" title="用本地工具打开" @click.stop="openChangedFile(file.path)" @keydown.enter.stop.prevent="openChangedFile(file.path)">
                        <ExternalLink :size="13" />
                      </span>
                      <ChevronUp v-if="isChangeExpanded(event, file)" :size="16" />
                      <ChevronRight v-else :size="16" />
                    </button>
                    <div v-if="isChangeExpanded(event, file)" class="changes-inline-diff">
                      <div
                        v-for="line in previewEditorLines(file.displayPatch || file.patch || '暂无可预览内容')"
                        :key="`${event.key}-${file.path}-${line.key}`"
                        class="preview-code-line"
                        :class="line.kind"
                      >
                        <span class="preview-line-number">{{ line.number }}</span>
                        <code>{{ line.text || ' ' }}</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else-if="event.kind === 'artifact'" class="artifact-card" :class="event.artifactType">
                <button class="artifact-preview" type="button" @click="openArtifact(event)">
                  <img v-if="event.previewUrl" :src="event.previewUrl" :alt="event.title" />
                  <video v-else-if="event.mediaKind === 'video' && event.url" :src="event.url" muted playsinline preload="metadata"></video>
                  <Image v-else-if="event.mediaKind === 'image'" :size="18" />
                  <Music v-else-if="event.mediaKind === 'audio'" :size="18" />
                  <FileCode2 v-else :size="18" />
                </button>
                <button class="artifact-body" type="button" @click="openArtifact(event)">
                  <span class="artifact-title">{{ event.title }}</span>
                  <span class="artifact-subtitle">{{ event.subtitle }}</span>
                </button>
                <button class="artifact-open" type="button" title="打开" @click.stop="openArtifact(event)">
                  <ExternalLink :size="13" />
                </button>
              </div>
              <details v-else-if="event.kind === 'tool'" class="tool-line">
                <summary>
                  <span>{{ event.title || '执行命令' }}</span>
                </summary>
                <pre>{{ event.text }}</pre>
              </details>
              <details v-else-if="event.kind === 'toolCall'" class="tool-call-line">
                <summary>
                  <Loader2 v-if="event.streaming" :size="15" class="spin" />
                  <Blocks v-else :size="15" />
                  <span>{{ event.title || 'Using tool' }}</span>
                  <em v-if="event.subtitle">{{ event.subtitle }}</em>
                </summary>
                <pre>{{ event.text }}</pre>
              </details>
              <div v-else class="message-row" :class="event.role">
                <div v-if="event.images?.length" class="message-image-stack">
                  <button
                    v-for="image in event.images"
                    :key="`${event.key}-${image.path}`"
                    class="message-image-thumb"
                    type="button"
                    title="查看图片"
                    @click="openAttachmentPreview(image.path)"
                  >
                    <img :src="image.url" :alt="image.name || '上传图片'" @load="handleMessageMediaLoaded" />
                  </button>
                </div>
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
          <h1>What should we build in {{ activeProject.name }}?</h1>
        </div>

        <div v-if="composerRunSummaryVisible" class="composer-run-summary">
          <button
            v-if="composerChangesEvent"
            class="change-summary"
            type="button"
            @click="openPreview(composerChangesEvent.files[0]?.path)"
          >
            <FileCode2 :size="14" />
            <span>{{ composerChangesEvent.files.length }} {{ composerChangesEvent.files.length === 1 ? 'file changed' : 'files changed' }}</span>
            <span class="additions">+{{ composerChangesEvent.stats.added }}</span>
            <span class="deletions">-{{ composerChangesEvent.stats.removed }}</span>
            <em>Review here</em>
          </button>
        </div>

        <form ref="composerEl" class="codex-composer" @submit.prevent="startTask">
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
            <div v-for="attachment in attachments" :key="attachment.path" class="image-preview-chip">
              <button class="image-preview-trigger" type="button" title="预览图片" @click="openImageLightbox(attachment)">
                <img :src="attachmentUrl(attachment.path)" :alt="attachment.name || '上传图片'" />
              </button>
              <button class="image-preview-remove" type="button" title="移除" @click="removeAttachment(attachment.path)">
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
            rows="2"
            :placeholder="isComposingThread ? 'Ask Codex anything. @ to use plugins or mention files' : 'Ask for follow-up changes'"
            :disabled="starting"
            @input="handleDraftInput"
            @focus="handleDraftInput"
            @paste="handleComposerPaste"
            @keydown.escape="slashMenuOpen = false"
            @keydown.enter.exact.prevent="startTask"
          ></textarea>
          <div class="composer-footer">
            <button class="composer-icon-button" type="button" :disabled="uploadingAttachment" title="添加图片" @click="fileInput?.click()">
              <Loader2 v-if="uploadingAttachment" :size="18" class="spin" />
              <Plus v-else :size="20" />
            </button>
            <label class="composer-select-shell permission-shell">
              <Hand :size="17" />
              <select v-model="selectedSandbox" class="inline-select permission-select" aria-label="权限">
                <option value="workspace-write">Default permissions</option>
                <option value="read-only">Read only</option>
                <option value="danger-full-access">Full access</option>
              </select>
              <ChevronRight :size="15" class="composer-chevron" />
            </label>
            <div class="composer-spacer"></div>
            <label class="composer-select-shell provider-shell">
              <select v-model="codexConfigForm.provider" class="inline-select provider-select" aria-label="供应商" @change="handleComposerProviderChange">
                <option v-for="provider in codexProviderOptions" :key="provider.id" :value="provider.id">
                  {{ provider.display || provider.shortName || provider.id }}
                </option>
              </select>
              <ChevronRight :size="15" class="composer-chevron" />
            </label>
            <label class="composer-select-shell model-shell">
              <select v-model="selectedModel" class="inline-select model-select" aria-label="模型">
                <option value="">设置默认</option>
                <option v-if="codexConfig.model" :value="codexConfig.model">{{ codexConfig.model }}</option>
                <option v-for="model in currentCodexProviderModels" :key="model" :value="model">{{ model }}</option>
              </select>
              <ChevronRight :size="15" class="composer-chevron" />
            </label>
            <span v-if="isCurrentTaskRunning" class="composer-running-dot"></span>
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
            <div class="composer-menu-wrap">
              <button class="composer-meta-pill" type="button">
                <Folder :size="15" />
                <span>{{ activeProject.name }}</span>
                <ChevronRight :size="14" class="composer-chevron" />
              </button>
            </div>
            <div class="composer-menu-wrap">
              <button class="composer-meta-pill" type="button">
                <HardDrive :size="15" />
                <span>{{ workspaceLabel }}</span>
                <ChevronRight :size="14" class="composer-chevron" />
              </button>
            </div>
            <div class="composer-menu-wrap">
              <button class="composer-meta-pill" type="button">
                <GitBranch :size="15" />
                <span>{{ projectBranchLabel }}</span>
                <ChevronRight :size="14" class="composer-chevron" />
              </button>
            </div>
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
            <button v-if="selectedPreviewHasDiff" type="button" :class="{ active: previewMode === 'diff' }" @click="previewMode = 'diff'">变更</button>
          </div>
          <template v-if="selectedPreview">
            <div v-if="previewMode === 'diff' && selectedPreviewHasDiff" class="preview-code-editor">
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
                <div class="preview-file-meta">
                  <span>{{ selectedPreviewKindLabel }}</span>
                  <span v-if="previewFileMeta?.size">{{ formatFileSize(previewFileMeta.size) }}</span>
                  <span v-if="previewFileMeta?.truncated">仅显示前 1MB</span>
                </div>
                <div v-if="selectedPreviewKind === 'image'" class="preview-media-stage">
                  <img class="preview-media-image" :src="selectedPreviewFileUrl" :alt="selectedPreview.name" />
                </div>
                <div v-else-if="selectedPreviewKind === 'video'" class="preview-media-stage">
                  <video class="preview-media-video" :src="selectedPreviewFileUrl" controls preload="metadata"></video>
                </div>
                <div v-else-if="selectedPreviewKind === 'audio'" class="preview-media-stage audio">
                  <Music :size="24" />
                  <audio :src="selectedPreviewFileUrl" controls></audio>
                </div>
                <iframe
                  v-else-if="selectedPreviewKind === 'pdf'"
                  class="preview-pdf-frame"
                  :src="selectedPreviewFileUrl"
                  title="PDF 预览"
                ></iframe>
                <div
                  v-else-if="selectedPreviewKind === 'markdown'"
                  class="preview-markdown markdown-body"
                  v-html="renderMarkdown(previewFileContent || '文件为空')"
                  @click="handleMarkdownClick"
                ></div>
                <div v-else-if="selectedPreviewKind === 'table'" class="preview-table-wrap">
                  <table class="preview-table">
                    <tbody>
                      <tr v-for="(row, rowIndex) in previewTableRows" :key="`row-${rowIndex}`">
                        <td v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`">{{ cell }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div v-else-if="selectedPreviewIsUnsupported" class="preview-unsupported">
                  <FileCode2 :size="28" />
                  <strong>{{ selectedPreviewKindLabel }} 无法在这里预览</strong>
                  <span>{{ selectedPreview.displayPath || selectedPreview.path }}</span>
                  <button type="button" @click="openChangedFile(selectedPreview.path)">用本地工具打开</button>
                </div>
                <div v-else class="preview-code-editor">
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
          本地目录只适合Lovarts.短剧后端运行在你这台电脑时使用；服务器部署时应改用 GitHub/仓库工作区。为安全起见，不能绑定Lovarts.短剧应用自身目录或它的父子目录。
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
          <span>供应商</span>
          <select v-model="codexConfigForm.provider" class="dialog-select" @change="applyCodexProviderPreset">
            <option v-for="provider in codexProviderOptions" :key="provider.id" :value="provider.id">
              {{ provider.name }}
            </option>
          </select>
        </label>
        <label class="form-field">
          <span>模型</span>
          <input
            v-model="codexConfigForm.model"
            list="codex-model-options"
            placeholder="例如 openai/gpt-5.5、anthropic/claude-sonnet-4.6、google/gemini-2.5-pro"
            autocomplete="off"
            @input="markConfigUntested"
          />
          <datalist id="codex-model-options">
            <option v-for="model in currentCodexProviderModels" :key="model" :value="model" />
          </datalist>
          <div class="model-chip-row">
            <button
              v-for="model in currentCodexProviderModels.slice(0, 6)"
              :key="model"
              type="button"
              :class="{ active: codexConfigForm.model === model }"
              @click="selectCodexModel(model)"
            >
              {{ model }}
            </button>
          </div>
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

    <div v-if="photoshopDialogOpen" class="dialog-backdrop" @click.self="photoshopDialogOpen = false">
      <section class="project-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Photoshop 插件设置">
        <h2>Photoshop 云端插件</h2>
        <p>这里配置当前用户自己的 Adobe Photoshop / Firefly Services 凭证，用于云端去背景和生成蒙版。</p>
        <label class="form-field">
          <span>Adobe Client ID</span>
          <input v-model="photoshopConfigForm.client_id" placeholder="Adobe Developer Console Client ID" autocomplete="off" @input="markPhotoshopUntested" />
        </label>
        <label class="form-field">
          <span>Adobe Client Secret</span>
          <input
            v-model="photoshopConfigForm.client_secret"
            type="password"
            :placeholder="photoshopConfig.client_secret_set ? `已保存 ${photoshopConfig.client_secret_preview}，留空继续使用` : 'Adobe Client Secret'"
            autocomplete="new-password"
            @input="markPhotoshopUntested"
          />
        </label>
        <label class="form-field">
          <span>公网 Base URL</span>
          <input v-model="photoshopConfigForm.public_base_url" placeholder="例如 https://你的域名，供 Adobe 云端读取上传图片" autocomplete="off" @input="markPhotoshopUntested" />
        </label>
        <label class="form-field">
          <span>默认操作</span>
          <select v-model="photoshopConfigForm.default_operation" class="dialog-select" @change="markPhotoshopUntested">
            <option value="remove-background">去除背景</option>
            <option value="mask">生成蒙版</option>
          </select>
        </label>
        <label class="form-field">
          <span>输出格式</span>
          <select v-model="photoshopConfigForm.output_format" class="dialog-select" @change="markPhotoshopUntested">
            <option value="png">PNG</option>
            <option value="jpg">JPG</option>
          </select>
        </label>
        <div v-if="photoshopTestMessage" class="test-result" :class="{ ok: photoshopTestPassed, error: !photoshopTestPassed }">
          {{ photoshopTestMessage }}
        </div>
        <p class="dialog-note">Adobe 云端不能读取 localhost 图片。部署后请填写可公网访问的站点地址；本地开发时需要反向代理或对象存储。</p>
        <div class="dialog-actions">
          <button class="secondary-btn" type="button" @click="photoshopDialogOpen = false">取消</button>
          <button class="secondary-btn" type="button" :disabled="testingPhotoshop || !canTestPhotoshopConfig" @click="testPhotoshopConfig">
            {{ testingPhotoshop ? '测试中...' : '测试连接' }}
          </button>
          <button class="primary-btn" type="button" :disabled="savingPhotoshop || !photoshopTestPassed" @click="savePhotoshopConfig">
            {{ savingPhotoshop ? '应用中...' : '应用' }}
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

    <div v-if="imageLightboxOpen" class="image-lightbox" @click.self="closeImageLightbox">
      <div class="image-lightbox-actions">
        <a
          v-if="imageLightboxImage?.url"
          class="image-lightbox-round"
          :href="imageLightboxImage.url"
          :download="imageLightboxImage.name || 'image.png'"
          title="下载"
          @click.stop
        >
          <Download :size="20" />
        </a>
        <button class="image-lightbox-round" type="button" title="关闭" @click="closeImageLightbox">
          <X :size="24" />
        </button>
      </div>
      <div class="image-lightbox-stage" :style="{ transform: `scale(${imageLightboxScale})` }">
        <img
          v-if="imageLightboxImage?.url"
          class="image-lightbox-img"
          :src="imageLightboxImage.url"
          :alt="imageLightboxImage.name || '图片预览'"
        />
      </div>
      <div class="image-lightbox-zoom" @click.stop>
        <button type="button" title="缩小" @click="zoomImageLightbox(-0.1)">-</button>
        <span>{{ Math.round(imageLightboxScale * 100) }}%</span>
        <button type="button" title="放大" @click="zoomImageLightbox(0.1)">+</button>
      </div>
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
  CalendarDays,
  Check,
  ChevronRight,
  ChevronUp,
  Download,
  Edit3,
  ExternalLink,
  FileCode2,
  Folder,
  GitBranch,
  GitCommitHorizontal,
  GitCompareArrows,
  Github,
  HardDrive,
  Hand,
  Image,
  Inbox,
  Loader2,
  Mail,
  Music,
  PenTool,
  PanelLeft,
  PanelLeftClose,
  Plus,
  Presentation,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  Sparkles,
  Table2,
  Square,
  Terminal,
  TerminalSquare,
  UploadCloud,
  X,
} from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { codexAPI, codexAttachmentUrl, codexProjectFileViewUrl } from '~/composables/useApi'

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
const photoshopDialogOpen = ref(false)
const savingConfig = ref(false)
const testingConfig = ref(false)
const configTestPassed = ref(false)
const configTestMessage = ref('')
const photoshopConfig = ref({})
const savingPhotoshop = ref(false)
const testingPhotoshop = ref(false)
const photoshopTestPassed = ref(false)
const photoshopTestMessage = ref('')
const codexConfigForm = reactive({
  provider: 'zenmux',
  model: '',
  base_url: '',
  api_key: '',
})
const photoshopConfigForm = reactive({
  client_id: '',
  client_secret: '',
  public_base_url: '',
  default_operation: 'remove-background',
  output_format: 'png',
})

const codexProviderOptions = [
  {
    id: 'zenmux',
    name: 'ZenMux（推荐，兼容多模型）',
    shortName: 'ZenMux',
    display: 'ZenMux',
    baseUrl: 'https://zenmux.ai/api/v1',
    models: [
      'openai/gpt-5.5',
      'openai/gpt-5.4',
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-opus-4.7',
      'google/gemini-3.1-pro-preview',
      'google/gemini-3.5-flash',
      'deepseek/deepseek-chat',
      'qwen/qwen3-coder',
      'moonshot/kimi-k2',
    ],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter（OpenAI 兼容）',
    shortName: 'OpenRouter',
    display: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'anthropic/claude-sonnet-4.6',
      'anthropic/claude-opus-4.7',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      'openai/gpt-5.5',
      'deepseek/deepseek-chat',
      'qwen/qwen3-coder',
      'moonshotai/kimi-k2',
    ],
  },
  {
    id: 'aihubmix',
    name: 'AiHubMix（国内聚合，OpenAI 兼容）',
    shortName: 'AiHubMix',
    display: 'AiHubMix',
    baseUrl: 'https://aihubmix.com/v1',
    models: [
      'gpt-5.5',
      'claude-sonnet-4-5',
      'gemini-2.5-pro',
      'deepseek-chat',
      'qwen-plus',
      'qwen-max',
      'kimi-k2',
    ],
  },
  {
    id: 'openai',
    name: 'OpenAI 官方',
    shortName: 'OpenAI',
    display: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      'gpt-5.5',
      'gpt-5.4',
      'gpt-5.4-mini',
      'gpt-5.3-codex',
    ],
  },
  {
    id: 'custom',
    name: '自定义 OpenAI-compatible',
    shortName: '自定义',
    display: '自定义',
    baseUrl: '',
    models: [
      'anthropic/claude-sonnet-4.6',
      'google/gemini-2.5-pro',
      'deepseek-chat',
      'qwen3-coder',
      'kimi-k2',
    ],
  },
]
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
const marketplacePlugins = ref([])
const skillsSearchQuery = ref('')
const skillsTab = ref('plugins')
const skillsLoading = ref(false)
const openSkillMenuId = ref('')
const selectedModel = ref('')
const selectedReasoning = ref('')
const selectedSandbox = ref('workspace-write')
const attachments = ref([])
const imageLightboxOpen = ref(false)
const imageLightboxImage = ref(null)
const imageLightboxScale = ref(1)
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
const expandedChangeKeys = ref({})
const expandedChangeDetails = ref({})
const undoingChangeKey = ref('')
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
const composerEl = ref(null)
const terminalOutputEl = ref(null)
const xtermHost = ref(null)
const logPinnedToBottom = ref(true)
let pollTimer = null
let terminalPollTimer = null
let terminalInstance = null
let terminalFitAddon = null
let terminalDataDisposable = null
let lastTerminalSeq = 0
let terminalResizeTimer = null
let knownTaskStatuses = {}
let composerResizeObserver = null

const activeProject = computed(() => projects.value.find(project => project.id === activeProjectId.value) || null)
const activeTask = computed(() => tasks.value.find(task => task.id === activeTaskId.value) || null)
const activeTerminal = computed(() => terminalSessions.value.find(session => session.id === activeTerminalId.value) || null)
const isCurrentTaskRunning = computed(() => activeTask.value?.status === 'running')
const isComposingThread = computed(() => !activeTaskId.value && !renderedEvents.value.length)
const taskDurationLabel = computed(() => formatTaskDuration(activeTask.value))
const activeApproval = computed(() => approvals.value[0] || null)
const latestTokenUsage = computed(() => extractLatestTokenUsage(activeTaskLogs.value))
const latestTokenUsageLabel = computed(() => formatTokenUsage(latestTokenUsage.value))
const currentCodexProvider = computed(() => {
  return codexProviderOptions.find(provider => provider.id === codexConfigForm.provider) || codexProviderOptions[0]
})
const currentCodexProviderModels = computed(() => currentCodexProvider.value?.models || [])
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
const canTestPhotoshopConfig = computed(() => {
  return Boolean(
    photoshopConfigForm.client_id.trim()
    && (photoshopConfigForm.client_secret.trim() || photoshopConfig.value.client_secret_set),
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
const filteredMarketplacePlugins = computed(() => {
  const query = skillsSearchQuery.value.trim().toLowerCase()
  const plugins = marketplacePlugins.value
  if (!query) return plugins
  return plugins.filter((plugin) => {
    const text = `${plugin.name || ''} ${plugin.description || ''} ${plugin.category || ''}`.toLowerCase()
    return text.includes(query)
  })
})
const workspaceLabel = computed(() => {
  if (!activeProject.value) return 'Workspace'
  if (activeProject.value.source === 'github') return 'Work remotely'
  return 'Work locally'
})
const projectBranchLabel = computed(() => {
  if (!gitStatus.value?.is_repo) return 'main'
  return gitStatus.value.branch || 'main'
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

function inferCodexProvider(baseUrl) {
  const raw = String(baseUrl || '').toLowerCase()
  if (raw.includes('zenmux.ai')) return 'zenmux'
  if (raw.includes('openrouter.ai')) return 'openrouter'
  if (raw.includes('aihubmix.com')) return 'aihubmix'
  if (raw.includes('api.openai.com')) return 'openai'
  return 'custom'
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
const liveFileChangeItems = computed(() => extractLiveFileChangeItems(activeTaskLogs.value))
const liveEditingEvent = computed(() => buildLiveEditingEvent(liveFileChangeItems.value))
const finishedChangedFileSummaries = computed(() => {
  if (isCurrentTaskRunning.value) return []
  return changedFileSummaries.value
})
const completedChangesEvent = computed(() => {
  if (!finishedChangedFileSummaries.value.length) return null
  return buildChangesEvent('completed-file-changes-summary', '', finishedChangedFileSummaries.value)
})
const composerChangesEvent = computed(() => {
  if (!isCurrentTaskRunning.value || liveEditingEvent.value || !changedFileSummaries.value.length) return null
  return buildChangesEvent('composer-live-file-changes-summary', '', changedFileSummaries.value)
})
const composerRunSummaryVisible = computed(() => Boolean(isCurrentTaskRunning.value && composerChangesEvent.value))
const selectedPreview = computed(() => {
  const files = finishedChangedFileSummaries.value.length ? finishedChangedFileSummaries.value : changedFileSummaries.value
  if (!selectedPreviewPath.value) return files[0] || null
  const matchedFile = files.find(file => file.path === selectedPreviewPath.value)
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
const selectedPreviewHasDiff = computed(() => Boolean(selectedPreview.value?.patch || selectedPreview.value?.displayPatch))
const selectedPreviewKind = computed(() => previewKindForFile(selectedPreview.value?.path || ''))
const selectedPreviewKindLabel = computed(() => fileKindLabel(selectedPreview.value?.path || '', selectedPreviewKind.value))
const selectedPreviewFileUrl = computed(() => artifactUrl(selectedPreview.value?.path || ''))
const selectedPreviewIsUnsupported = computed(() => {
  const kind = selectedPreviewKind.value
  return kind === 'archive' || kind === 'document' || kind === 'spreadsheet' || kind === 'slides' || kind === 'notebook' || kind === 'unsupported'
})
const previewTableRows = computed(() => parseDelimitedPreview(previewFileContent.value, fileExt(selectedPreview.value?.path || '')))

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
  updateComposerScrollSpace()
  if (open) await mountXtermForActiveSession()
})

watch([
  attachments,
  selectedSlashItem,
  completedChangesEvent,
  composerRunSummaryVisible,
  isComposingThread,
], () => {
  nextTick(updateComposerScrollSpace)
}, { deep: true })

watch(
  () => renderedEvents.value.map(event => `${event.key}:${event.text?.length || 0}:${event.kind}:${event.role}:${event.streaming ? 1 : 0}`).join('|'),
  () => {
    if (isCurrentTaskRunning.value || logPinnedToBottom.value) {
      scrollLogs()
    }
  },
  { flush: 'post' }
)

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
  if (!isRunning) return ''
  return `Working for ${formatDuration(endValue.getTime() - start.getTime())}`
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

function visibleUserMessageText(value) {
  const text = String(value || '').trim()
  if (!text.includes('Huobao Codex runtime note:')) return text
  const marker = 'This workspace context is for execution accuracy; do not repeat it unless it is directly relevant to the user request.'
  const index = text.indexOf(marker)
  if (index < 0) return text.replace(/Huobao Codex runtime note:[\s\S]*$/g, '').trim()
  return text.slice(index + marker.length).trim()
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

function changeExpansionKey(eventKey, filePath) {
  return `${eventKey}:${filePath}`
}

function isChangeExpanded(event, file) {
  if (!event?.key || !file?.path) return false
  const key = changeExpansionKey(event.key, file.path)
  if (Object.prototype.hasOwnProperty.call(expandedChangeKeys.value, key)) {
    return Boolean(expandedChangeKeys.value[key])
  }
  return false
}

function isChangeDetailsExpanded(event) {
  if (!event?.key) return false
  return Boolean(expandedChangeDetails.value[event.key])
}

function toggleChangeDetails(eventKey) {
  if (!eventKey) return
  expandedChangeDetails.value = {
    ...expandedChangeDetails.value,
    [eventKey]: !expandedChangeDetails.value[eventKey],
  }
}

function toggleChangeExpanded(eventKey, filePath) {
  if (!eventKey || !filePath) return
  const key = changeExpansionKey(eventKey, filePath)
  const current = Object.prototype.hasOwnProperty.call(expandedChangeKeys.value, key)
    ? Boolean(expandedChangeKeys.value[key])
    : false
  expandedChangeKeys.value = {
    ...expandedChangeKeys.value,
    [key]: !current,
  }
}

function combinedPatchForChangeEvent(event) {
  return (event?.files || [])
    .map(file => file.patch || '')
    .filter(Boolean)
    .join('\n')
}

async function undoChangeEvent(event) {
  if (!activeProject.value?.id || undoingChangeKey.value) return
  const patch = combinedPatchForChangeEvent(event)
  if (!patch.trim()) {
    toast.error('没有可回退的变更')
    return
  }
  undoingChangeKey.value = event.key
  try {
    await codexAPI.undoPatch(activeProject.value.id, patch)
    toast.success('已回退文件变更')
    await Promise.all([
      loadGitStatus().catch(() => {}),
      loadActiveLogs().catch(() => {}),
    ])
  } catch (err) {
    toast.error(err.message || '回退失败')
  } finally {
    undoingChangeKey.value = ''
  }
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

async function openChangedFile(filePath) {
  if (!filePath) return
  if (!activeProject.value?.id) {
    openPreview(filePath)
    return
  }
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

function officialMethod(event) {
  return parseRawEvent(event)?.method || ''
}

function officialItem(event) {
  const raw = parseRawEvent(event)
  return raw?.params?.item || raw?.item || null
}

function officialItemType(event) {
  return normalizeItemType(officialItem(event)?.type || '')
}

function isOfficialItemEvent(event, method, type = '') {
  if (officialMethod(event) !== method) return false
  if (!type) return true
  return officialItemType(event) === type
}

function officialUserMessageText(item) {
  const parts = Array.isArray(item?.content) ? item.content : []
  const textParts = parts
    .map((part) => part?.type === 'text' ? part.text : '')
    .filter(Boolean)
  return visibleUserMessageText(textParts.join('\n').trim())
}

function imagesFromUserEvent(event) {
  const raw = parseRawEvent(event)
  const rawImages = raw?.huobaoImages || raw?.images || []
  const contentImages = raw?.params?.item?.content || raw?.item?.content || []
  return [
    ...rawImages,
    ...contentImages
      .filter((part) => part?.type === 'localImage' && part.path)
      .map((part) => part.path),
  ]
    .map((imagePath) => String(imagePath || '').trim())
    .filter(Boolean)
    .filter((imagePath, index, list) => list.indexOf(imagePath) === index)
    .map((imagePath) => ({
      path: imagePath,
      name: imagePath.split('/').pop() || '上传图片',
      url: attachmentUrl(imagePath),
    }))
}

function attachmentUrl(imagePath) {
  const projectId = activeProject.value?.id || activeTask.value?.project_id || ''
  return projectId && imagePath ? codexAttachmentUrl(projectId, imagePath) : ''
}

function openAttachmentPreview(imagePath) {
  if (!imagePath) return
  openImageLightbox({
    path: imagePath,
    name: String(imagePath).split('/').pop() || '图片预览',
  })
}

function openImageLightbox(image) {
  if (!image?.path && !image?.url) return
  imageLightboxImage.value = {
    ...image,
    url: image.url || attachmentUrl(image.path),
  }
  imageLightboxScale.value = 1
  imageLightboxOpen.value = true
}

function closeImageLightbox() {
  imageLightboxOpen.value = false
  imageLightboxImage.value = null
  imageLightboxScale.value = 1
}

function zoomImageLightbox(delta) {
  const next = imageLightboxScale.value + delta
  imageLightboxScale.value = Math.min(3, Math.max(0.2, Number(next.toFixed(2))))
}

function fileExt(filePath) {
  const name = String(filePath || '').split('?')[0].split('#')[0]
  const match = name.match(/\.([a-z0-9]+)$/i)
  return match ? match[1].toLowerCase() : ''
}

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'bmp', 'svg']
const VIDEO_EXTENSIONS = ['3g2', '3gp', 'avi', 'flv', 'm4v', 'mkv', 'mov', 'mp4', 'm2ts', 'mpeg', 'mpg', 'mts', 'ogv', 'vob', 'webm', 'wmv']
const AUDIO_EXTENSIONS = ['aac', 'flac', 'm4a', 'mp3', 'ogg', 'wav', 'wma']
const ARCHIVE_EXTENSIONS = ['7z', 'br', 'bz2', 'dmg', 'gz', 'iso', 'jar', 'rar', 'tar', 'tgz', 'txz', 'xz', 'zip', 'zst']
const MARKDOWN_EXTENSIONS = ['md', 'markdown', 'mdx']
const TABLE_EXTENSIONS = ['csv', 'tsv']
const CODE_EXTENSIONS = [
  'astro', 'bash', 'c', 'cc', 'clj', 'cljs', 'cpp', 'cs', 'css', 'dart', 'dockerfile', 'env', 'go',
  'graphql', 'h', 'hpp', 'html', 'java', 'js', 'jsx', 'json', 'kt', 'less', 'lua', 'm', 'mm', 'php',
  'pl', 'proto', 'py', 'r', 'rb', 'rs', 'sass', 'scss', 'sh', 'sql', 'svelte', 'swift', 'toml', 'ts',
  'tsx', 'vue', 'xml', 'yaml', 'yml',
]
const DOCUMENT_EXTENSIONS = ['doc', 'docx', 'key', 'numbers', 'odp', 'ods', 'odt', 'pages', 'ppt', 'pptx', 'rtf', 'xls', 'xlsx', 'xlsm']

function artifactMediaKind(filePath) {
  const ext = fileExt(filePath)
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  return 'file'
}

function previewKindForFile(filePath) {
  const ext = fileExt(filePath)
  if (IMAGE_EXTENSIONS.includes(ext)) return 'image'
  if (VIDEO_EXTENSIONS.includes(ext)) return 'video'
  if (AUDIO_EXTENSIONS.includes(ext)) return 'audio'
  if (ext === 'pdf') return 'pdf'
  if (MARKDOWN_EXTENSIONS.includes(ext)) return 'markdown'
  if (TABLE_EXTENSIONS.includes(ext)) return 'table'
  if (['txt', 'text', 'log', 'gitignore', 'dockerignore'].includes(ext) || CODE_EXTENSIONS.includes(ext)) return 'code'
  if (['docx', 'doc', 'rtf', 'odt', 'pages'].includes(ext)) return 'document'
  if (['xlsx', 'xlsm', 'xls', 'numbers', 'ods'].includes(ext)) return 'spreadsheet'
  if (['pptx', 'ppt', 'key', 'odp'].includes(ext)) return 'slides'
  if (ext === 'ipynb') return 'notebook'
  if (ARCHIVE_EXTENSIONS.includes(ext)) return 'archive'
  return ext ? 'unsupported' : 'code'
}

function fileKindLabel(filePath, kind = previewKindForFile(filePath)) {
  const ext = fileExt(filePath)
  const upperExt = ext ? ext.toUpperCase() : ''
  if (kind === 'image') return 'Image'
  if (kind === 'video') return 'Video'
  if (kind === 'audio') return 'Audio'
  if (kind === 'pdf') return 'PDF'
  if (kind === 'markdown') return 'Markdown'
  if (kind === 'table') return ext === 'tsv' ? 'TSV' : 'CSV'
  if (kind === 'document') return upperExt || 'Document'
  if (kind === 'spreadsheet') return upperExt || 'Spreadsheet'
  if (kind === 'slides') return upperExt || 'Slides'
  if (kind === 'notebook') return 'Notebook'
  if (kind === 'archive') return upperExt ? `${upperExt} archive` : 'Archive'
  return upperExt || 'Text'
}

function artifactTitleForFile(filePath, type) {
  if (type === 'imageGeneration') return 'Generated image'
  if (type === 'imageView') return 'Image'
  const displayPath = displayProjectPath(filePath)
  return displayPath.split('/').pop() || displayPath || '文件'
}

function isExternalUrl(value) {
  return /^https?:\/\//i.test(String(value || ''))
}

function artifactUrl(filePath) {
  if (isExternalUrl(filePath)) return filePath
  const projectId = activeProject.value?.id || activeTask.value?.project_id || ''
  return projectId && filePath ? codexProjectFileViewUrl(projectId, filePath) : ''
}

function buildArtifactEvent(key, time, item) {
  const type = item?.type || ''
  const path = item?.savedPath || item?.path || item?.src || item?.result || ''
  const mediaKind = artifactMediaKind(path)
  const displayPath = displayProjectPath(path)
  const title = artifactTitleForFile(path, type)
  const status = item?.status && item.status !== 'completed' ? item.status : ''
  const label = type === 'imageGeneration' ? 'Generated image' : fileKindLabel(path)
  const subtitle = status || item?.revisedPrompt || displayPath || label
  const url = path ? artifactUrl(path) : ''
  return {
    key,
    kind: 'artifact',
    role: 'tool',
    level: 'muted',
    time,
    artifactType: type || 'file',
    mediaKind,
    path,
    displayPath,
    title,
    subtitle,
    url,
    previewUrl: mediaKind === 'image' ? url : '',
  }
}

async function openArtifact(event) {
  if (!event?.path) return
  if (isExternalUrl(event.path)) {
    window.open(event.path, '_blank', 'noopener,noreferrer')
    return
  }
  openPreview(event.path)
}

function parseDelimitedPreview(content, ext) {
  if (!['csv', 'tsv'].includes(ext)) return []
  const delimiter = ext === 'tsv' ? '\t' : ','
  return String(content || '')
    .split(/\r?\n/)
    .filter((line, index) => index < 80 && line.length)
    .map(line => line.split(delimiter).slice(0, 16).map(cell => cell.trim().replace(/^"|"$/g, '')))
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

function formatTokenUsage(usage) {
  if (!usage) return ''
  const total = usage.totalTokens || ((usage.inputTokens || 0) + (usage.outputTokens || 0))
  if (!total) return ''
  const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(total)
  return `${compact} tokens`
}

function extractChangedFiles(events) {
  const files = new Map()
  const root = activeProject.value?.path || activeTask.value?.project_path || ''
  events.forEach((event) => {
    const raw = parseRawEvent(event)
    const patches = []
    const item = officialItem(event)
    if ((raw?.method === 'item/started' || raw?.method === 'item/completed') && item?.type === 'fileChange') {
      patches.push(...extractPatchesFromFileChange(item, root))
    }
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
      const key = fileSummaryKey(patch, root)
      const existing = files.get(key)
      files.set(key, mergePatchSummary(existing, patch))
    })
  })
  return Array.from(files.values())
}

function fileChangeItemId(event) {
  const payload = parseJsonText(event?.text)
  const raw = parseRawEvent(event)
  const item = officialItem(event)
  return payload?.id
    || item?.id
    || raw?.params?.itemId
    || raw?.params?.item?.id
    || raw?.item?.id
    || raw?.params?.turnId
    || event?.type
    || 'file-change'
}

function extractLiveFileChangeItems(events) {
  const root = activeProject.value?.path || activeTask.value?.project_path || ''
  const items = new Map()
  events.forEach((event, index) => {
    const payload = parseJsonText(event.text)
    const raw = parseRawEvent(event)
    const item = officialItem(event)
    const isOfficialFileChange = item?.type === 'fileChange' && (raw?.method === 'item/started' || raw?.method === 'item/completed')
    const isOfficialPatchUpdate = raw?.method === 'item/fileChange/patchUpdated' || raw?.method === 'turn/diff/updated'
    if (!isOfficialFileChange && !isOfficialPatchUpdate && event.type !== 'app.fileChange' && event.type !== 'app.diff' && event.type !== 'app.patch') return
    const id = fileChangeItemId(event)
    let files = []
    if (isOfficialFileChange) files = extractPatchesFromFileChange(item, root)
    if (event.type === 'app.fileChange') files = extractPatchesFromFileChange(payload, root)
    if (event.type === 'app.diff') files = extractPatchesFromDiffPayload(payload || event.text, root)
    if (event.type === 'app.patch') files = [parsePatchText(event.text, '', root)].filter(Boolean)
    if (!files.length && isOfficialPatchUpdate) {
      files = extractPatchesFromRaw(raw, root)
    }
    if (!files.length) return
    const existing = items.get(id)
    const mergedFiles = new Map(existing?.files?.map(file => [fileSummaryKey(file, root), file]) || [])
    files.forEach((file) => {
      const key = fileSummaryKey(file, root)
      mergedFiles.set(key, mergePatchSummary(mergedFiles.get(key), file))
    })
    const status = payload?.status
      || raw?.params?.status
      || raw?.params?.item?.status
      || raw?.item?.status
      || item?.status
      || (raw?.method === 'item/fileChange/patchUpdated' || raw?.method === 'item/started' ? 'inProgress' : 'completed')
    items.set(id, {
      id,
      index,
      time: event.ts ? formatTime(event.ts) : existing?.time || '',
      status,
      files: Array.from(mergedFiles.values()),
    })
  })
  return Array.from(items.values())
}

function extractPatchesFromFileChange(payload, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const changes = Array.isArray(payload?.changes) ? payload.changes : []
  return changes.map((change) => {
    const path = change.path || change.filePath || change.newPath || change.oldPath || ''
    const diff = change.diff || change.patch || change.content || change.after || change.newContent || ''
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
  if (typeof directPatch === 'string' && directPath) {
    patches.push(parsePatchText(`${directPath ? `${directPath}\n` : ''}${directPatch}`, '', root))
  }
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
    if (typeof candidate === 'string' && candidate.trim()) {
      patches.push(parsePatchText(candidate, '', root))
      return
    }
    if (Array.isArray(candidate)) {
      candidate.forEach((item) => {
        if (!item) return
        const path = item.path || item.filePath || item.newPath || item.oldPath || item.name || ''
        const patch = item.patch || item.diff || item.text || item.content || item.after || item.newContent || ''
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
  const bodyPatch = diffPath ? raw : lines.slice(firstLinePath ? 1 : 0).join('\n').trim()
  const patch = normalizePatchForFile(path, bodyPatch, kind)
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

function normalizePatchForFile(path, patch, kind = '') {
  const rawPatch = String(patch || '').trim()
  if (!rawPatch) return ''
  if (/^diff --git /m.test(rawPatch)) return rawPatch
  if (/^@@ /m.test(rawPatch) || /^--- |\+\+\+ /m.test(rawPatch)) {
    const cleanPath = cleanPatchPath(path)
    const kindType = typeof kind === 'string' ? kind : kind?.type || ''
    const fromPath = kindType === 'add' || kindType === 'create' ? '/dev/null' : `a/${cleanPath}`
    const toPath = kindType === 'delete' || kindType === 'remove' ? '/dev/null' : `b/${cleanPath}`
    const header = [
      `diff --git a/${cleanPath} b/${cleanPath}`,
      `--- ${fromPath}`,
      `+++ ${toPath}`,
    ]
    const body = rawPatch.replace(/^(--- .+\n\+\+\+ .+\n)/, '')
    return [...header, body].join('\n')
  }
  return rawPatch
}

function cleanPatchPath(path) {
  return String(path || '')
    .replace(/^["']|["']$/g, '')
    .replace(/^a\//, '')
    .replace(/^b\//, '')
    .trim()
}

function fileSummaryKey(file, root = activeProject.value?.path || activeTask.value?.project_path || '') {
  const path = file?.path || file?.displayPath || ''
  return displayProjectPath(path, root).replace(/^\.\/+/, '').replace(/\/+/g, '/').toLowerCase()
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
  const added = (existing.added || 0) + (patch.added || 0)
  const removed = (existing.removed || 0) + (patch.removed || 0)
  const patchText = [existing.patch, patch.patch].filter(Boolean).join('\n')
  const displayPatch = [existing.displayPatch, patch.displayPatch].filter(Boolean).join('\n')
  return {
    ...existing,
    ...patch,
    path: existing.path || patch.path,
    displayPath: existing.displayPath || patch.displayPath,
    name: existing.name || patch.name,
    action: existing.action === patch.action ? existing.action : summarizeFileAction('', added, removed, 'modify'),
    added,
    removed,
    patch: patchText,
    displayPatch,
  }
}

function buildChangesEvent(key, time, files) {
  const normalizedFiles = mergeFileSummaries(files)
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
    title: normalizedFiles.length === 1
      ? `Edited ${normalizedFiles[0].name || normalizedFiles[0].displayPath || normalizedFiles[0].path || 'file'}`
      : `Edited ${normalizedFiles.length} files`,
    files: normalizedFiles,
    stats,
  }
}

function mergeFileSummaries(files) {
  const root = activeProject.value?.path || activeTask.value?.project_path || ''
  const merged = new Map()
  ;(Array.isArray(files) ? files : []).filter(Boolean).forEach((file) => {
    const key = fileSummaryKey(file, root)
    merged.set(key, mergePatchSummary(merged.get(key), file))
  })
  return Array.from(merged.values())
}

function buildLiveEditingEvent(items) {
  const activeItems = (Array.isArray(items) ? items : []).filter((item) => {
    const status = item?.status || 'completed'
    return status === 'inProgress' || status === 'pending'
  })
  if (!activeItems.length) return null
  const filesByPath = new Map()
  activeItems.forEach((item) => {
    ;(item.files || []).forEach((file) => {
      filesByPath.set(file.path, mergePatchSummary(filesByPath.get(file.path), file))
    })
  })
  const files = Array.from(filesByPath.values()).filter(Boolean)
  if (!files.length) return null
  const file = files[files.length - 1]
  return {
    key: 'live-file-editing',
    kind: 'editing',
    role: 'tool',
    level: 'muted',
    file,
    extraCount: Math.max(0, files.length - 1),
  }
}

function buildEditingEventFromFiles(files) {
  const normalizedFiles = mergeFileSummaries(files)
  if (!normalizedFiles.length) return null
  return {
    key: 'live-file-editing',
    kind: 'editing',
    role: 'tool',
    level: 'muted',
    file: normalizedFiles[normalizedFiles.length - 1],
    extraCount: Math.max(0, normalizedFiles.length - 1),
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
  const kind = previewKindForFile(file.path)
  if (file.action === '已删除') {
    previewFileContent.value = ''
    previewFileMeta.value = null
    previewFileError.value = '该文件已删除，不能读取当前文件内容'
    return
  }
  if (['image', 'video', 'audio', 'pdf'].includes(kind)) {
    previewFileContent.value = ''
    previewFileMeta.value = null
    previewFileError.value = ''
    return
  }
  if (['archive', 'document', 'spreadsheet', 'slides', 'notebook', 'unsupported'].includes(kind)) {
    previewFileContent.value = ''
    previewFileMeta.value = null
    previewFileError.value = ''
    return
  }
  previewFileLoading.value = true
  previewFileError.value = ''
  try {
    const result = await codexAPI.projectFile(project.id, file.path)
    previewFileMeta.value = result
    previewFileContent.value = result.binary ? '' : (result.content || '')
    previewFileError.value = result.binary ? '' : ''
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
    const item = officialItem(event)
    const itemType = normalizeItemType(item?.type || '')

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
    if (isOfficialItemEvent(event, 'item/started', 'commandExecution')) {
      flushAssistantDelta()
      flushCommandDelta()
      flushActivityLine()
      activityLine = { key, kind: 'activity', role: 'tool', level: 'activity', time, streaming: true, text: itemToolTitle(item, 'running') }
      return
    }
    if (event.type === 'app.command_started') {
      flushAssistantDelta()
      flushCommandDelta()
      flushActivityLine()
      activityLine = { key, kind: 'activity', role: 'tool', level: 'activity', time, streaming: true, text: summarizeToolEvent(event, 'running') }
      return
    }
    if (isOfficialItemEvent(event, 'item/started', 'fileChange')) {
      flushAssistantDelta()
      flushCommandDelta()
      const files = extractPatchesFromFileChange(item)
      if (files.length) {
        flushActivityLine()
        activityLine = buildEditingEventFromFiles(files)
      }
      return
    }
    if (event.type === 'app.reasoning_delta') {
      flushAssistantDelta()
      flushCommandDelta()
      if (!activityLine) activityLine = { key, kind: 'activity', role: 'tool', level: 'muted', time, streaming: true, text: 'Thinking' }
      return
    }
    if (event.type === 'app.file_delta') {
      flushAssistantDelta()
      flushCommandDelta()
      return
    }

    if (isOfficialItemEvent(event, 'item/completed', 'agentMessage') || event.type === 'app.agent_message') assistantDelta = null
    if (isOfficialItemEvent(event, 'item/completed', 'commandExecution')) {
      flushAssistantDelta()
      flushCommandDelta()
      activityLine = { key, kind: 'activity', role: 'tool', level: itemStatus(item, 'completed') === 'failed' ? 'error' : 'activity', time, text: itemToolTitle(item, 'completed') }
      return
    }
    if (event.type === 'app.command') {
      flushAssistantDelta()
      flushCommandDelta()
      activityLine = { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeToolEvent(event, 'completed') }
      return
    }
    if (event.type === 'app.item.started' && ['mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall'].includes(itemType)) {
      flushAssistantDelta()
      flushCommandDelta()
      flushActivityLine()
    }
    if (event.type !== 'app.reasoning_delta') flushActivityLine()

    const normalized = normalizeCodexEvent(event, index)
    if (normalized) list.push(normalized)
  })

  flushAssistantDelta()
  flushCommandDelta()
  flushActivityLine()
  const editingEvent = liveEditingEvent.value || (isCurrentTaskRunning.value ? buildEditingEventFromFiles(changedFileSummaries.value) : null)
  if (editingEvent && isCurrentTaskRunning.value) list.push(editingEvent)
  const finalChangesEvent = completedChangesEvent.value
  if (finalChangesEvent) list.push(finalChangesEvent)
  return compactActivityEvents(list)
}

function normalizeCodexEvent(event, index) {
  const time = event.ts ? formatTime(event.ts) : ''
  const key = `${event.ts || 'event'}-${index}-${event.type || event.stream || 'log'}`
  const raw = parseRawEvent(event)
  const method = raw?.method || ''
  const item = officialItem(event)
  const type = normalizeItemType(item?.type || '')

  if (method === 'item/completed' && type === 'userMessage') {
    return { key, kind: 'message', role: 'user', time, text: officialUserMessageText(item), images: imagesFromUserEvent(event) }
  }

  if (method === 'item/started' && type === 'userMessage') return null

  if (event.role === 'user' || event.type === 'user_message') {
    return { key, kind: 'message', role: 'user', time, text: visibleUserMessageText(event.text), images: imagesFromUserEvent(event) }
  }

  if (method === 'item/completed' && type === 'agentMessage') {
    return { key, kind: 'message', role: 'assistant', time, text: item?.text || event.text || '' }
  }

  if (method === 'item/started' && type === 'agentMessage') return null

  if (event.type === 'app.agent_message') {
    return { key, kind: 'message', role: 'assistant', time, text: event.text || '' }
  }

  if (type === 'reasoning' || type === 'plan' || type === 'contextCompaction' || type === 'enteredReviewMode' || type === 'exitedReviewMode') return null

  if (method === 'item/started' && type === 'commandExecution') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, streaming: true, text: itemToolTitle(item, 'running') }
  }

  if (method === 'item/completed' && type === 'commandExecution') {
    return { key, kind: 'tool', role: 'tool', level: itemStatus(item, 'completed') === 'failed' ? 'error' : 'activity', title: itemToolTitle(item, 'completed'), time, text: commandExecutionText(item) }
  }

  if (method === 'item/started' && type === 'fileChange') {
    const files = extractPatchesFromFileChange(item)
    return files.length ? buildEditingEventFromFiles(files) : null
  }

  if (method === 'item/completed' && type === 'fileChange') return null

  if (type === 'webSearch') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeWebSearch({ text: JSON.stringify(item || {}) }) }
  }

  if (type === 'imageGeneration' || type === 'imageView') {
    return buildArtifactEvent(key, time, item || {})
  }

  if (['mcpToolCall', 'dynamicToolCall', 'collabAgentToolCall'].includes(type)) {
    const status = itemStatus(item, method === 'item/started' ? 'running' : 'completed')
    return buildToolCallEvent(key, time, item, status)
  }

  if (event.type === 'app.photoshop_status') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: event.text || 'Working with Photoshop' }
  }

  if (event.type === 'app.command' || event.type === 'app.item.started' || event.type === 'app.item.completed') {
    return null
  }

  if (event.type === 'app.command_started') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, streaming: true, text: summarizeToolEvent(event, 'running') }
  }

  if (event.type === 'app.webSearch') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, text: summarizeWebSearch(event) }
  }

  if (event.type === 'app.mcpToolCall.progress' || event.type === 'app.mcpToolCallProgress') {
    return { key, kind: 'activity', role: 'tool', level: 'activity', time, streaming: true, text: event.text || 'MCP tool running' }
  }

  if (event.type === 'app.patch') {
    return null
  }

  if (event.type === 'app.fileChange' || event.type === 'app.diff') {
    return null
  }

  if (event.type === 'app.imageGeneration' || event.type === 'app.imageView') {
    return buildArtifactEvent(key, time, parseJsonText(event.text) || raw?.params?.item || raw?.item || {})
  }

  if (event.type === 'app.mcpToolCall' || event.type === 'app.dynamicToolCall' || event.type === 'app.collabAgentToolCall') {
    const legacyItem = parseJsonText(event.text) || raw?.params?.item || raw?.item || {}
    const status = itemStatus(legacyItem)
    return buildToolCallEvent(key, time, legacyItem, status)
  }

  if (event.type === 'app.plan') {
    return { key, kind: 'tool', role: 'tool', title: 'Plan updated', level: 'muted', time, text: event.text ? `Plan\n${event.text}` : 'Plan updated' }
  }

  if (event.type === 'app.plan_delta') {
    return { key, kind: 'activity', role: 'tool', title: 'Updating plan', level: 'muted', time, streaming: true, text: event.text || 'Updating plan' }
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
    'app.turn.plan.updated',
  ].includes(event.type)) {
    return null
  }

  if (event.type === 'app.turn_failed' || event.type === 'app.error') {
    if (raw?.willRetry || raw?.error?.willRetry || event.text?.includes('"willRetry":true')) return null
    return { key, kind: 'status', role: 'system', level: 'error', time, text: friendlyCodexErrorText(event.text, raw) || 'Codex 执行失败' }
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
  const actionSummary = summarizeCommandActions(event, state)
  if (actionSummary) return actionSummary
  const firstLine = text.split(/\r?\n/).find(Boolean) || ''
  const command = displayShellCommand(firstLine.replace(/^>\s*/, '').trim())
  const lower = command.toLowerCase()
  const running = state !== 'completed'
  const action = (active, done) => running ? active : done
  if (/github|git clone|install-skill-from-github|curl|wget|npm install|pnpm install|yarn add|pip install/.test(lower)) {
    const target = command.match(/(?:--repo\s+|github\.com[/:])([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/)?.[1]
    if (target) return `${action('Downloading from GitHub', 'Downloaded from GitHub')} ${target}`
    if (lower.includes('github')) return action('Accessing GitHub', 'Accessed GitHub')
    return action('Downloading dependencies', 'Downloaded dependencies')
  }
  const readTarget = command.match(/^(?:cat|sed|nl|head|tail|less|more)\s+(?:-[^\s]+\s+)*(.+)$/)?.[1]
  if (readTarget) return `${action('Exploring', 'Explored')} ${shortCommandTarget(readTarget)}`

  const searchCommand = command.match(/^(?:rg|grep)\s+(.+)$/)?.[1]
  if (searchCommand) return `${action('Searching', 'Searched')} ${summarizeSearchQuery(searchCommand)}`

  const listTarget = command.match(/^(?:ls|find)\s*(.*)$/)?.[1]
  if (listTarget != null && /^(?:ls|find)\b/.test(lower)) {
    const target = shortCommandTarget(listTarget)
    return target ? `${action('Listing', 'Listed')} ${target}` : action('Listing files', 'Listed files')
  }

  if (/^git\s+(status|diff|show|log|branch|remote|ls-files)\b/.test(lower)) {
    return action('Checking Git status', 'Checked Git status')
  }

  const runScript = command.match(/^(npm|pnpm|yarn)\s+run\s+([^\s]+)/)?.[0]
  if (runScript) return `${action('Running', 'Ran')} ${runScript}`

  const directUrl = command.match(/\bhttps?:\/\/[^\s'"]+/)?.[0]
  if (directUrl) {
    const host = directUrl.replace(/^https?:\/\//, '').split('/')[0]
    return `${action('Accessing', 'Accessed')} ${host}`
  }
  if (command) {
    const prefix = action('Running', 'Ran')
    const compact = compactCommandForDisplay(command)
    return compact.length > 96 ? `${prefix} ${compact.slice(0, 96)}...` : `${prefix} ${compact}`
  }
  return '查看命令'
}

function friendlyCodexErrorText(text, raw = null) {
  const rawText = String(text || '')
  const payload = typeof rawText === 'string' && rawText.trim().startsWith('{') ? parseJsonText(rawText) : null
  const source = payload || raw || {}
  const merged = `${rawText} ${JSON.stringify(source || {})}`
  const status = source?.error?.codexErrorInfo?.responseTooManyFailedAttempts?.httpStatusCode
    || source?.codexErrorInfo?.responseTooManyFailedAttempts?.httpStatusCode
    || source?.error?.httpStatusCode
    || source?.httpStatusCode
    || source?.status
  if (status === 429 || /\b429\b|too many requests|exceeded retry limit/i.test(merged)) {
    return '请求过于频繁或当前模型额度受限（429）。请稍后重试，或切换模型/供应商/API Key。'
  }
  if (/401|unauthorized|invalid api key|authentication/i.test(merged)) {
    return 'Codex API Key 无效或认证失败，请检查设置里的 API Key。'
  }
  if (/403|forbidden|permission/i.test(merged)) {
    return '当前 API Key 没有访问该模型的权限，请切换模型或供应商。'
  }
  if (/404|not found|model/i.test(merged)) {
    return '生成接口或模型不可用，请检查 Base URL 和模型名称。'
  }
  if (/stream disconnected|connection reset|reconnecting/i.test(merged)) {
    return '模型响应流中断，请稍后重试；如果反复出现，请切换供应商或模型。'
  }
  return payload?.error?.message || payload?.message || rawText
}

function summarizeCommandActions(event, state = 'running') {
  const item = rawItemFromEvent(event)
  const actions = Array.isArray(item?.commandActions) ? item.commandActions : []
  if (!actions.length) return ''
  const running = state !== 'completed'
  const counts = actions.reduce((acc, action) => {
    const type = normalizeCommandActionType(action?.type)
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {})
  const first = actions[0] || {}
  const firstType = normalizeCommandActionType(first.type)
  const onlyType = actions.every(action => normalizeCommandActionType(action?.type) === firstType)
  const targetName = first.name || basename(first.path || '') || shortCommandTarget(first.command || '')
  const plural = (count, one, many) => count === 1 ? one : many
  if (onlyType) {
    const count = actions.length
    if (firstType === 'read') {
      return running
        ? `Exploring ${targetName || plural(count, 'file', `${count} files`)}`
        : `Explored ${plural(count, '1 file', `${count} files`)}`
    }
    if (firstType === 'list_files') return running ? 'Listing files' : 'Listed files'
    if (firstType === 'search') {
      const query = first.query || summarizeSearchQuery(first.command || '')
      return running ? `Searching ${query || 'files'}` : `Searched ${query || 'files'}`
    }
  }
  const explored = counts.read || 0
  const listed = counts.list_files || 0
  const searched = counts.search || 0
  const unknown = counts.unknown || 0
  const commandCount = actions.length
  if (running) {
    if (searched) return `Searching ${summarizeSearchQuery(first.query || first.command || '') || 'files'}`
    if (listed) return 'Listing files'
    if (explored) return `Exploring ${targetName || plural(explored, 'file', `${explored} files`)}`
    return `Running ${compactCommandForDisplay(displayShellCommand(first.command || item.command || event.text || 'command'))}`
  }
  if (listed && commandCount > listed) return `Listed files ran ${commandCount} commands`
  if (explored && commandCount > explored) return `Explored ${plural(explored, '1 file', `${explored} files`)} ran ${commandCount} commands`
  if (searched && commandCount > searched) return `Searched files ran ${commandCount} commands`
  if (unknown) {
    if (commandCount === 1) {
      const command = compactCommandForDisplay(displayShellCommand(first.command || item.command || event.text || 'command'))
      return command.length > 96 ? `Ran ${command.slice(0, 96)}...` : `Ran ${command}`
    }
    return `Ran ${commandCount} commands`
  }
  return ''
}

function rawItemFromEvent(event) {
  return officialItem(event)
}

function normalizeCommandActionType(type) {
  const text = String(type || 'unknown')
  if (text === 'listFiles') return 'list_files'
  return text
}

function displayShellCommand(value) {
  const command = String(value || '').trim()
  const match = command.match(/^(?:\/[^\s]+\/)?(?:bash|zsh|sh)\s+-lc\s+(.+)$/)
  if (!match) return command
  return unquoteShellWrapper(match[1])
}

function unquoteShellWrapper(value) {
  const raw = String(value || '').trim()
  if (raw.length >= 2) {
    const first = raw[0]
    const last = raw[raw.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return raw.slice(1, -1)
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\')
        .trim()
    }
  }
  return raw
}

function compactCommandForDisplay(value) {
  return String(value || '')
    .split(/\r?\n/)[0]
    .replace(/\s+/g, ' ')
    .replace(/^python3\s+-\s*<<['"]?[A-Z]+['"]?$/i, 'python3 -')
    .trim()
}

function basename(value) {
  const text = String(value || '').trim()
  if (!text) return ''
  return text.split(/[\\/]/).filter(Boolean).pop() || text
}

function activityIcon(event) {
  const text = String(event?.text || '').toLowerCase()
  if (/explor|search|list|edit|creat|delet/.test(text)) return FileCode2
  return Terminal
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

function normalizeItemType(type) {
  const raw = String(type || '').trim()
  const compact = raw.replace(/[_-]+/g, '').toLowerCase()
  if (compact === 'mcptoolcall') return 'mcpToolCall'
  if (compact === 'dynamictoolcall') return 'dynamicToolCall'
  if (compact === 'collabagenttoolcall' || compact === 'multiagentaction') return 'collabAgentToolCall'
  if (compact === 'commandexecution' || compact === 'exec' || compact === 'shellcommand') return 'commandExecution'
  if (compact === 'websearch' || compact === 'websearchgroup') return 'webSearch'
  return raw
}

function itemStatus(item, fallback = 'running') {
  const status = String(item?.status || item?.state || item?.result?.status || '').trim()
  if (/fail|error|denied|declined|aborted|cancel/i.test(status)) return 'failed'
  if (/complete|success|finished|done/i.test(status) || item?.completed === true) return 'completed'
  if (item?.completed === false || /progress|running|pending|started|inprogress/i.test(status)) return 'running'
  return fallback
}

function commandExecutionText(item) {
  return [
    item?.command || '',
    item?.aggregatedOutput || '',
  ].filter(Boolean).join('\n')
}

function buildToolCallEvent(key, time, item, status = itemStatus(item)) {
  return {
    key,
    kind: 'toolCall',
    role: 'tool',
    level: status === 'failed' ? 'error' : 'activity',
    streaming: status === 'running',
    time,
    title: itemToolTitle(item, status === 'running' ? 'running' : 'completed'),
    subtitle: item?.invocation?.server || item?.namespace || item?.server || item?.model || '',
    text: JSON.stringify(item?.result || item?.contentItems || item?.arguments || item?.invocation || item || {}, null, 2),
  }
}

function itemToolTitle(item, state = 'running') {
  const type = normalizeItemType(item?.type || item?.kind)
  if (type === 'mcpToolCall') {
    const invocation = item.invocation || {}
    return `${state === 'running' ? 'Using' : 'Used'} ${invocation.server || item.server || 'MCP'}${invocation.tool || item.tool ? ` · ${invocation.tool || item.tool}` : ''}`
  }
  if (type === 'dynamicToolCall') {
    const namespace = item.namespace || item.invocation?.namespace || ''
    const tool = item.tool || item.invocation?.tool || item.name || 'tool'
    return `${state === 'running' ? 'Using' : 'Used'} ${namespace ? `${namespace}.` : ''}${tool}`
  }
  if (type === 'collabAgentToolCall') return `${state === 'running' ? 'Using' : 'Used'} ${item.tool || 'agent'}`
  if (type === 'webSearch') return 'Web search'
  if (type === 'commandExecution') return summarizeToolEvent({ text: item.command || '' }, state)
  return `${state === 'running' ? 'Using' : 'Used'} ${item.name || item.tool || type || 'tool'}`
}

function compactActivityEvents(list) {
  const compacted = []
  let pendingActivity = null
  let summary = emptyToolActivitySummary()
  const summaryDetails = []

  const commandActivityKey = value => String(value || '')
    .replace(/^(Running|Ran|正在运行)\s+/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

  const dropMatchingRunningCommand = (completedTitle) => {
    const completedKey = commandActivityKey(completedTitle)
    if (!completedKey) return
    for (let index = compacted.length - 1; index >= 0; index -= 1) {
      const item = compacted[index]
      if (!item || item.kind !== 'activity') continue
      const title = String(item.text || item.title || '')
      if (!/^(Running|正在运行)\b/i.test(title)) continue
      if (commandActivityKey(title) === completedKey) {
        compacted.splice(index, 1)
        return
      }
    }
  }

  const flushToolActivity = () => {
    const text = toolActivitySummaryText(summary)
    if (text) {
      compacted.push({
        key: `activity-summary-${compacted.length}`,
        kind: 'activity',
        role: 'tool',
        level: 'muted',
        streaming: summary.runningCommandCount > 0
          || summary.runningCreatedFileCount > 0
          || summary.runningEditedFileCount > 0
          || summary.runningDeletedFileCount > 0
          || summary.runningExploredFileCount > 0
          || summary.runningSearchCount > 0
          || summary.runningListCount > 0,
        text,
        files: summaryDetails.flatMap(item => item.files || (item.file ? [item.file] : [])),
        details: summaryDetails.slice(),
      })
    }
    summary = emptyToolActivitySummary()
    summaryDetails.length = 0
  }

  list.forEach((event) => {
    const eventText = String(event.text || event.title || '')
    const isRunningCommand = (event.kind === 'activity' || event.kind === 'tool') && (event.streaming || /^(Running|正在运行)\b/i.test(eventText))
    if (isRunningCommand) {
      if (/^(Exploring|Reading)\b/i.test(eventText)) {
        summary.runningExploredFileCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Listing)\b/i.test(eventText)) {
        summary.runningListCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Searching|正在搜索|正在网页内查找|Web search)\b/i.test(eventText)) {
        summary.runningSearchCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Running|正在运行)\b/i.test(eventText)) {
        summary.runningCommandCount += 1
        summaryDetails.push(event)
        return
      }
      flushToolActivity()
      if (pendingActivity) {
        compacted.push(pendingActivity)
        pendingActivity = null
      }
      compacted.push(event)
      return
    }
    const completedCommandTitle = event.kind === 'tool'
      ? String(event.title || summarizeToolEvent(event, 'completed') || '')
      : event.kind === 'activity' && /^(Ran)\b/i.test(eventText) ? eventText : ''
    if (/^Ran\b/i.test(completedCommandTitle)) {
      if (pendingActivity) {
        compacted.push(pendingActivity)
        pendingActivity = null
      }
      dropMatchingRunningCommand(completedCommandTitle)
      summary.commandCount += 1
      summaryDetails.push(event)
      return
    }
    if (event.kind === 'activity') {
      const text = String(event.text || '')
      if (/^(Exploring|Listing|Reading|Read|Listed|Explored)\b/i.test(text)) {
        if (/^(Listing|Listed)\b/i.test(text)) summary.listCount += 1
        else summary.exploredFileCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Searching|Searched|正在搜索|正在网页内查找|Web search)\b/i.test(text)) {
        summary.searchCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Ran)\b/i.test(text)) {
        summary.commandCount += 1
        summaryDetails.push(event)
        return
      }
      flushToolActivity()
      pendingActivity = event
      return
    }
    if (event.kind === 'tool' && event.level !== 'error') {
      const title = event.title || summarizeToolEvent(event, event.streaming ? 'running' : 'completed')
      if (/^(Exploring|Reading|Read|Explored)\b/i.test(title)) {
        summary.exploredFileCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Listing|Listed)\b/i.test(title)) {
        summary.listCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Searching|Searched|正在搜索|正在网页内查找|Web search)\b/i.test(title)) {
        summary.searchCount += 1
        summaryDetails.push(event)
        return
      }
      if (/^(Ran)\b/i.test(title)) {
        summary.commandCount += 1
        summaryDetails.push(event)
        return
      }
      flushToolActivity()
      pendingActivity = {
        key: event.key,
        kind: 'activity',
        role: 'tool',
        level: 'activity',
        time: event.time,
        text: title,
        detail: event.text,
      }
      return
    }
    if (event.kind === 'changes' && event.files?.length) {
      event.files.forEach((file) => {
        const bucket = changedFileActionBucket(file)
        if (bucket === 'created') summary.createdFileCount += 1
        else if (bucket === 'deleted') summary.deletedFileCount += 1
        else summary.editedFileCount += 1
      })
      summaryDetails.push(event)
      return
    }
    if (event.kind === 'editing' && event.file) {
      const bucket = changedFileActionBucket(event.file)
      if (bucket === 'created') summary.runningCreatedFileCount += 1
      else if (bucket === 'deleted') summary.runningDeletedFileCount += 1
      else summary.runningEditedFileCount += 1
      summaryDetails.push(event)
      return
    }
    flushToolActivity()
    if (pendingActivity) {
      compacted.push(pendingActivity)
      pendingActivity = null
    }
    compacted.push(event)
  })
  flushToolActivity()
  if (pendingActivity) compacted.push(pendingActivity)
  return compacted
}

function emptyToolActivitySummary() {
  return {
    createdFileCount: 0,
    runningCreatedFileCount: 0,
    editedFileCount: 0,
    runningEditedFileCount: 0,
    deletedFileCount: 0,
    runningDeletedFileCount: 0,
    exploredFileCount: 0,
    runningExploredFileCount: 0,
    searchCount: 0,
    runningSearchCount: 0,
    listCount: 0,
    runningListCount: 0,
    commandCount: 0,
    runningCommandCount: 0,
  }
}

function changedFileActionBucket(file) {
  const raw = `${file?.action || ''} ${file?.patch || ''}`.toLowerCase()
  if (/\b(delete|deleted|remove|removed|已删除)\b|^\+\+\+\s+\/dev\/null/m.test(raw)) return 'deleted'
  if (/\b(add|added|create|created|已创建|已新增)\b|^---\s+\/dev\/null/m.test(raw)) return 'created'
  return 'edited'
}

function toolActivitySummaryText(summary) {
  const parts = []
  const addFilePart = (count, leading, trailing) => {
    if (!count) return
    const label = count === 1 ? 'file' : 'files'
    parts.push(parts.length ? `${trailing} ${count} ${label}` : `${leading} ${count} ${label}`)
  }
  addFilePart(summary.createdFileCount, 'Created', 'created')
  addFilePart(summary.runningCreatedFileCount, 'Creating', 'creating')
  addFilePart(summary.editedFileCount, 'Edited', 'edited')
  addFilePart(summary.runningEditedFileCount, 'Editing', 'editing')
  addFilePart(summary.deletedFileCount, 'Deleted', 'deleted')
  addFilePart(summary.runningDeletedFileCount, 'Deleting', 'deleting')
  if (summary.exploredFileCount) parts.push(parts.length ? `explored ${summary.exploredFileCount} ${summary.exploredFileCount === 1 ? 'file' : 'files'}` : `Explored ${summary.exploredFileCount} ${summary.exploredFileCount === 1 ? 'file' : 'files'}`)
  if (summary.runningExploredFileCount) parts.push(parts.length ? `exploring ${summary.runningExploredFileCount} ${summary.runningExploredFileCount === 1 ? 'file' : 'files'}` : `Exploring ${summary.runningExploredFileCount} ${summary.runningExploredFileCount === 1 ? 'file' : 'files'}`)
  if (summary.searchCount) parts.push(parts.length ? `searched ${summary.searchCount} ${summary.searchCount === 1 ? 'time' : 'times'}` : `Searched ${summary.searchCount} ${summary.searchCount === 1 ? 'time' : 'times'}`)
  if (summary.runningSearchCount) parts.push(parts.length ? `searching ${summary.runningSearchCount} ${summary.runningSearchCount === 1 ? 'time' : 'times'}` : `Searching ${summary.runningSearchCount} ${summary.runningSearchCount === 1 ? 'time' : 'times'}`)
  if (summary.listCount) parts.push(parts.length ? `listed files ${summary.listCount} ${summary.listCount === 1 ? 'time' : 'times'}` : `Listed files ${summary.listCount} ${summary.listCount === 1 ? 'time' : 'times'}`)
  if (summary.runningListCount) parts.push(parts.length ? `listing files ${summary.runningListCount} ${summary.runningListCount === 1 ? 'time' : 'times'}` : `Listing files ${summary.runningListCount} ${summary.runningListCount === 1 ? 'time' : 'times'}`)
  if (summary.commandCount) parts.push(parts.length ? `ran ${summary.commandCount} ${summary.commandCount === 1 ? 'command' : 'commands'}` : `Ran ${summary.commandCount} ${summary.commandCount === 1 ? 'command' : 'commands'}`)
  if (summary.runningCommandCount) parts.push(parts.length ? `running ${summary.runningCommandCount} ${summary.runningCommandCount === 1 ? 'command' : 'commands'}` : `Running ${summary.runningCommandCount} ${summary.runningCommandCount === 1 ? 'command' : 'commands'}`)
  return parts.join(', ')
}

function scrollLogs() {
  nextTick(() => {
    if (!logBox.value) return
    const scrollToBottom = () => {
      if (!logBox.value) return
      logBox.value.scrollTop = logBox.value.scrollHeight
    }
    scrollToBottom()
    window.requestAnimationFrame?.(scrollToBottom)
    logPinnedToBottom.value = true
  })
}

function isLogNearBottom() {
  const el = logBox.value
  if (!el) return true
  return el.scrollHeight - el.scrollTop - el.clientHeight < 160
}

function maybeScrollLogs(shouldScroll) {
  if (shouldScroll) scrollLogs()
}

function handleLogScroll() {
  logPinnedToBottom.value = isLogNearBottom()
}

function handleMessageMediaLoaded() {
  if (logPinnedToBottom.value || isCurrentTaskRunning.value) scrollLogs()
}

function updateComposerScrollSpace() {
  const composer = composerEl.value
  const workspace = composer?.closest?.('.codex-workspace')
  if (!composer || !workspace) return
  const rect = composer.getBoundingClientRect()
  const bottom = Number.parseFloat(getComputedStyle(composer).bottom || '0') || 0
  const terminalOffset = terminalOpen.value ? 260 : 0
  const summaryHeight = workspace.querySelector?.('.composer-run-summary')?.getBoundingClientRect?.().height || 0
  const visualGap = isCurrentTaskRunning.value ? 42 : 52
  const space = Math.ceil(rect.height + summaryHeight + bottom + terminalOffset + visualGap + 46)
  workspace.style.setProperty('--composer-summary-bottom', `${Math.ceil(rect.height + bottom + 14)}px`)
  workspace.style.setProperty('--composer-scroll-space', `${Math.max(260, space)}px`)
  if (logPinnedToBottom.value) scrollLogs()
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

async function loadPhotoshopConfig() {
  photoshopConfig.value = await codexAPI.photoshopConfig()
}

async function loadUserSkills() {
  skillsLoading.value = true
  try {
    const result = await codexAPI.skills()
    userSkills.value = result.skills || []
    userPlugins.value = result.plugins || []
    marketplacePlugins.value = result.marketplace_plugins || []
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
  maybeScrollLogs(shouldScroll || isCurrentTaskRunning.value)
}

async function refreshAll() {
  await Promise.all([loadStatus(), loadCodexConfig(), loadPhotoshopConfig(), loadUserSkills(), loadApprovals(), loadProjects(), loadTasks()])
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
  if (event.key === 'Escape' && imageLightboxOpen.value) {
    event.preventDefault()
    closeImageLightbox()
    return
  }
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
    type: item.type === 'skill' ? 'skill' : item.type === 'plugin' ? 'plugin' : 'mention',
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
  skillsTab.value = 'skills'
  await loadUserSkills()
}

async function openPluginsPage() {
  currentView.value = 'skills'
  skillsTab.value = 'plugins'
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

function pluginContextFromPlugin(plugin) {
  return {
    id: plugin.id || plugin.name,
    name: plugin.name,
    type: 'plugin',
    path: plugin.path || `plugin://${plugin.name}`,
  }
}

function pluginIconComponent(plugin) {
  const icon = String(plugin?.icon || plugin?.id || '').toLowerCase()
  if (icon.includes('github')) return Github
  if (icon.includes('gmail') || icon.includes('mail')) return Mail
  if (icon.includes('calendar')) return CalendarDays
  if (icon.includes('spreadsheets')) return Table2
  if (icon.includes('presentation')) return Presentation
  if (icon.includes('ps') || icon.includes('photoshop')) return PenTool
  if (icon.includes('slack') || icon.includes('teams')) return Blocks
  if (icon.includes('notion')) return Square
  if (icon.includes('linear') || icon.includes('statsig')) return GitCompareArrows
  if (icon.includes('drive')) return HardDrive
  return Blocks
}

async function installPlugin(plugin) {
  if (!plugin?.id || skillsLoading.value) return
  skillsLoading.value = true
  try {
    const result = await codexAPI.installPlugin(plugin.id)
    userPlugins.value = result.plugins || userPlugins.value
    marketplacePlugins.value = result.marketplace_plugins || marketplacePlugins.value.map(item => (
      item.id === plugin.id ? { ...item, installed: true } : item
    ))
    toast.success(`${plugin.name} 已安装到当前用户`)
    if (plugin.id === 'photoshop') openPhotoshopSettings()
  } catch (err) {
    toast.error(err.message || '安装插件失败')
  } finally {
    skillsLoading.value = false
  }
}

function openPluginChat(plugin) {
  currentView.value = 'chat'
  if (!ensureActiveProjectForChat()) return
  if ((plugin.id === 'photoshop' || plugin.name === 'Photoshop') && !photoshopConfig.value.client_secret_set) {
    openPhotoshopSettings()
  }
  newThread()
  selectedSlashItem.value = pluginContextFromPlugin(plugin)
  if (plugin.id === 'photoshop' || plugin.name === 'Photoshop') {
    draft.value = ''
  }
  nextTick(() => {
    draftInput.value?.focus?.()
  })
}

async function openPhotoshopSettings() {
  photoshopDialogOpen.value = true
  try {
    await loadPhotoshopConfig()
    photoshopConfigForm.client_id = photoshopConfig.value.client_id || ''
    photoshopConfigForm.client_secret = ''
    photoshopConfigForm.public_base_url = photoshopConfig.value.public_base_url || ''
    photoshopConfigForm.default_operation = photoshopConfig.value.default_operation || 'remove-background'
    photoshopConfigForm.output_format = photoshopConfig.value.output_format || 'png'
    photoshopTestPassed.value = false
    photoshopTestMessage.value = ''
  } catch (err) {
    toast.error(err.message || '加载 Photoshop 插件设置失败')
  }
}

async function openCodexSettings() {
  settingsDialogOpen.value = true
  try {
    await loadCodexConfig()
    codexConfigForm.provider = codexConfig.value.provider || inferCodexProvider(codexConfig.value.base_url || '')
    codexConfigForm.model = codexConfig.value.model || selectedModel.value || 'gpt-5.3-codex'
    codexConfigForm.base_url = normalizeCodexBaseUrl(codexConfig.value.base_url || '')
    codexConfigForm.api_key = ''
    configTestPassed.value = false
    configTestMessage.value = ''
  } catch (err) {
    toast.error(err.message || '加载 Codex 设置失败')
  }
}

function handleComposerProviderChange() {
  applyCodexProviderPreset({ syncSelectedModel: true })
}

function applyCodexProviderPreset(options = {}) {
  const provider = currentCodexProvider.value
  if (provider?.baseUrl) codexConfigForm.base_url = provider.baseUrl
  if (!codexConfigForm.model.trim() || !provider.models.includes(codexConfigForm.model.trim())) {
    codexConfigForm.model = provider.models[0] || ''
  }
  if (options.syncSelectedModel) selectedModel.value = codexConfigForm.model
  markConfigUntested()
}

function selectCodexModel(model) {
  codexConfigForm.model = model
  markConfigUntested()
}

function markConfigUntested() {
  configTestPassed.value = false
  configTestMessage.value = ''
}

function markPhotoshopUntested() {
  photoshopTestPassed.value = false
  photoshopTestMessage.value = ''
}

async function testCodexConfig() {
  if (testingConfig.value || !canTestCodexConfig.value) return
  testingConfig.value = true
  configTestPassed.value = false
  configTestMessage.value = ''
  try {
    codexConfigForm.base_url = normalizeCodexBaseUrl(codexConfigForm.base_url)
    const result = await codexAPI.testConfig({
      provider: codexConfigForm.provider,
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
      provider: codexConfigForm.provider,
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

async function testPhotoshopConfig() {
  if (testingPhotoshop.value || !canTestPhotoshopConfig.value) return
  testingPhotoshop.value = true
  photoshopTestPassed.value = false
  photoshopTestMessage.value = ''
  try {
    const result = await codexAPI.testPhotoshopConfig({
      client_id: photoshopConfigForm.client_id.trim(),
      client_secret: photoshopConfigForm.client_secret.trim(),
      public_base_url: photoshopConfigForm.public_base_url.trim(),
      default_operation: photoshopConfigForm.default_operation,
      output_format: photoshopConfigForm.output_format,
    })
    photoshopTestPassed.value = true
    photoshopTestMessage.value = result.message || 'Adobe 连接成功，请点击应用'
    toast.success(photoshopTestMessage.value)
  } catch (err) {
    photoshopTestPassed.value = false
    photoshopTestMessage.value = err.message || 'Photoshop 连接测试失败'
    toast.error(photoshopTestMessage.value)
  } finally {
    testingPhotoshop.value = false
  }
}

async function savePhotoshopConfig() {
  if (savingPhotoshop.value || !photoshopTestPassed.value) return
  savingPhotoshop.value = true
  try {
    photoshopConfig.value = await codexAPI.updatePhotoshopConfig({
      client_id: photoshopConfigForm.client_id.trim(),
      client_secret: photoshopConfigForm.client_secret.trim(),
      public_base_url: photoshopConfigForm.public_base_url.trim(),
      default_operation: photoshopConfigForm.default_operation,
      output_format: photoshopConfigForm.output_format,
    })
    photoshopConfigForm.client_secret = ''
    photoshopTestPassed.value = false
    photoshopTestMessage.value = ''
    photoshopDialogOpen.value = false
    toast.success('Photoshop 插件设置已应用')
  } catch (err) {
    toast.error(err.message || '应用 Photoshop 插件设置失败')
  } finally {
    savingPhotoshop.value = false
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
  attachments.value = attachments.value.filter(item => attachmentDisplayPath(item) !== path && item.path !== path)
}

function attachmentDisplayPath(attachment) {
  return String(attachment?.relative_path || attachment?.relativePath || attachment?.path || '').trim()
}

function attachmentSendPath(attachment) {
  return String(attachment?.path || attachment?.absolute_path || attachment?.absolutePath || attachmentDisplayPath(attachment)).trim()
}

async function uploadAttachmentFiles(files) {
  const imageFiles = Array.from(files || []).filter(file => String(file?.type || '').startsWith('image/'))
  if (!imageFiles.length) return
  if (!activeProject.value) {
    projectDialogOpen.value = true
    toast.info('请先选择或新建项目，再上传图片')
    return
  }
  const remaining = Math.max(0, 8 - attachments.value.length)
  if (!remaining) {
    toast.info('最多上传 8 张图片')
    return
  }
  uploadingAttachment.value = true
  try {
    for (const file of imageFiles.slice(0, remaining)) {
      const attachment = await codexAPI.uploadAttachment(activeProject.value.id, file)
      attachments.value.push({
        ...attachment,
        path: attachmentDisplayPath(attachment),
        absolute_path: attachment.path || attachment.absolute_path,
      })
    }
  } catch (err) {
    toast.error(err.message || '图片上传失败')
  } finally {
    uploadingAttachment.value = false
  }
}

async function handleComposerPaste(event) {
  const items = Array.from(event.clipboardData?.items || [])
  const files = items
    .filter(item => item.kind === 'file' && String(item.type || '').startsWith('image/'))
    .map(item => item.getAsFile())
    .filter(Boolean)
    .map((file, index) => {
      const ext = fileExt(file.name) || String(file.type || '').split('/')[1] || 'png'
      const name = file.name || `screenshot-${Date.now()}-${index + 1}.${ext}`
      return new File([file], name, { type: file.type || 'image/png' })
    })
  if (!files.length) return
  event.preventDefault()
  await uploadAttachmentFiles(files)
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
  await uploadAttachmentFiles(files)
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
    if (selectedSlashItem.value?.id !== 'photoshop' && selectedSlashItem.value?.name !== 'Photoshop') {
      await openCodexSettings()
      toast.info('请先配置 Codex API Key')
      return
    }
  }
  if ((selectedSlashItem.value?.id === 'photoshop' || selectedSlashItem.value?.name === 'Photoshop') && !photoshopConfig.value.client_secret_set) {
    await openPhotoshopSettings()
    toast.info('请先配置 Photoshop 插件')
    return
  }
  if ((selectedSlashItem.value?.id === 'photoshop' || selectedSlashItem.value?.name === 'Photoshop') && !attachments.value.length) {
    toast.info('Photoshop 插件需要先上传图片')
    return
  }
  if (activeTask.value?.status === 'running') {
    toast.info('当前线程还在运行，请等待完成或先停止任务')
    return
  }
  const imagePaths = attachments.value.map(item => attachmentSendPath(item)).filter(Boolean)
  starting.value = true
  const optimisticMessage = {
    ts: new Date().toISOString(),
    stream: 'system',
    type: 'user_message',
    role: 'user',
    text: prompt,
    raw: imagePaths.length ? JSON.stringify({ images: imagePaths }) : undefined,
    optimistic: true,
  }
  pendingUserMessages.value = [optimisticMessage]
  scrollLogs()
  try {
    const resumeTask = activeTask.value?.thread_id ? activeTask.value : null
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
    window.addEventListener('resize', updateComposerScrollSpace)
    if (window.ResizeObserver) {
      composerResizeObserver = new ResizeObserver(updateComposerScrollSpace)
      if (composerEl.value) composerResizeObserver.observe(composerEl.value)
    }
    nextTick(updateComposerScrollSpace)
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
  window.removeEventListener('resize', updateComposerScrollSpace)
  composerResizeObserver?.disconnect?.()
  composerResizeObserver = null
  resetXterm()
})
</script>

<style src="../assets/styles/codex-huobao.css"></style>
<style>
/* Huobao Vue compatibility for the migrated Ideart Codex surface. */
.codex-page {
  grid-template-columns: 300px minmax(0, 1fr);
  background: #f4f4f5;
}

.codex-page.panel-collapsed {
  grid-template-columns: 0 minmax(0, 1fr);
}

.codex-page.panel-collapsed .project-panel {
  display: none;
}

.codex-workspace {
  height: 100%;
}

.workspace-main {
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  box-shadow:
    0 2px 4px -1px rgba(0, 0, 0, 0.08),
    0 0 0 0.5px rgba(32, 33, 36, 0.14);
}

.project-panel {
  padding: 14px 18px 14px;
}

.project-collapse-btn {
  display: none;
}

.project-section-title {
  margin-top: 30px;
  padding-left: 10px;
}

.project-section-label {
  color: #a0a1a7;
  font-size: 13px;
  font-weight: 500;
}

.project-item strong {
  font-size: 13px;
  font-weight: 500;
}

.task-item {
  min-height: 34px;
  padding-top: 6px;
  padding-bottom: 6px;
}

.task-item strong {
  font-size: 13px;
  font-weight: 600;
}

.task-time {
  font-size: 11px;
}

.chat-section {
  flex: 0 0 auto;
  padding: 14px 0 20px 0;
}

.chat-section-title,
.chat-empty {
  color: #b6b7bc;
  font-size: 13px;
  line-height: 1.4;
}

.chat-section-title {
  margin-bottom: 20px;
}

.chat-empty {
  color: #c6c7cb;
}

.codex-workspace.composing {
  justify-content: center;
  padding-bottom: 220px;
}

.codex-workspace.composing .codex-composer {
  position: relative;
}

.new-chat-center {
  margin-bottom: 58px;
}

.new-chat-center h1 {
  font-size: 28px;
  font-weight: 500;
  line-height: 1.2;
}

.codex-composer {
  border-radius: 24px;
  padding: 8px 10px 0;
}

.codex-composer textarea {
  min-height: 42px;
  padding: 0 2px;
  font-size: 14px;
  line-height: 20px;
}

.composer-footer {
  min-height: 32px;
  margin-top: 6px;
}

.composer-select-shell {
  height: 30px;
  font-size: 13px;
}

.provider-shell,
.model-shell {
  border-radius: 10px;
  background: #f4f4f5;
  padding: 0 12px;
}

.provider-shell {
  max-width: 96px;
}

.model-shell {
  max-width: 150px;
}

.composer-project-meta {
  height: 42px;
  margin: 0 -10px;
  border-radius: 0 0 22px 22px;
  padding: 0 16px;
  font-size: 13px;
}

.composer-meta-pill {
  height: 30px;
  font-size: 13px;
}

.send-btn,
.composer-icon-button {
  width: 32px;
  height: 32px;
}

.workspace-head h1 {
  font-size: 14px;
  line-height: 18px;
}

.workspace-head p {
  margin: 0;
  color: #77787f;
  font-size: 12px;
  line-height: 16px;
}

.message-bubble,
.markdown-body {
  font-size: 14px;
  line-height: 1.58;
}

.message-row.user .message-bubble {
  font-size: 14px;
  line-height: 1.45;
  padding: 8px 12px;
}

.conversation-box {
  display: block;
}

.codex-event {
  width: 100%;
}

.changes-card-head {
  display: grid;
  width: min(620px, 100%);
  grid-template-columns: 24px minmax(0, 1fr) auto;
}

.changes-card-copy {
  min-width: 0;
}

.changes-card-title span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.changes-card-meta {
  display: inline-flex;
  gap: 7px;
  color: #8c8d94;
  font-size: 13px;
}

.changes-details-toggle {
  display: inline-flex;
  height: 26px;
  align-items: center;
  gap: 4px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: #77787f;
  padding: 0 7px;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.changes-details-toggle:hover {
  background: #f3f3f5;
  color: #202124;
}

.changes-details-body {
  margin-top: 8px;
}

.inline-select {
  min-width: 0;
  height: 100%;
  border: 0;
  outline: 0;
  appearance: none;
  background: transparent;
  color: inherit;
  padding: 0;
  font: inherit;
  cursor: pointer;
}

.permission-select {
  width: 132px;
}

.provider-select {
  width: 92px;
}

.model-select {
  width: 170px;
}

.composer-project-meta {
  margin: 9px -8px -8px;
}

@media (max-width: 980px) {
  .codex-page {
    grid-template-columns: 0 minmax(0, 1fr);
  }

  .project-panel {
    display: none;
  }
}
</style>
