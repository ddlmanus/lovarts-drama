<template>
  <div class="studio" v-if="drama && initialRouteResolved">
    <input ref="assetUploadInput" class="asset-upload-input" type="file" accept="image/*" @change="handleAssetUploadChange" />
    <header class="navbar-wrapper">
      <div class="navbar">
        <div class="nav-left">
          <button class="flow-back-btn" type="button" aria-label="返回项目" @click="navigateTo(`/drama/${dramaId}`)">
            <svg class="svg-icon" width="20" height="20" viewBox="0 0 1024 1024" aria-hidden="true">
              <path fill="currentColor" d="M685.2 104.7a64 64 0 0 1 0 90.5L368.4 512l316.8 316.8a64 64 0 0 1-90.4 90.5l-362.1-362a64 64 0 0 1 0-90.5l362-362.1a64 64 0 0 1 90.5 0"></path>
            </svg>
          </button>
          <div class="studio-identity">
            <div class="studio-title">{{ drama.title }}</div>
            <span class="studio-episode-chip">第{{ episodeNumber }}集</span>
          </div>
        </div>

        <nav class="nav-center" aria-label="制作流程">
          <button
            v-for="step in flowNavSteps"
            :key="step.id"
            type="button"
            class="nav-item"
            :class="{ active: step.active, done: step.done, locked: step.locked }"
            :disabled="step.locked"
            :aria-disabled="String(step.locked)"
            @click="goFlowStep(step.id)"
          >
            <svg class="flow-check-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <g stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
                <path fill="currentColor" fill-opacity=".3" d="M3 12c0 -4.97 4.03 -9 9 -9c4.97 0 9 4.03 9 9c0 4.97 -4.03 9 -9 9c-4.97 0 -9 -4.03 -9 -9Z"></path>
                <path v-if="step.done" fill="none" d="M8 12l3 3l5 -5"></path>
              </g>
            </svg>
            <span :class="{ active: step.active }">{{ step.label }}</span>
          </button>
        </nav>

        <div class="nav-right">
          <button class="task-list-btn" type="button" title="我的任务" @click="openTaskModal">
            <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2m-7 0c.55 0 1 .45 1 1s-.45 1-1 1s-1-.45-1-1s.45-1 1-1M7 7h10V5h2v14H5V5h2zm5 10v-2h5v2zm0-6V9h5v2zm-4 1V9H7V8h2v4zm1.25 2c.41 0 .75.34.75.75c0 .2-.08.39-.21.52L8.12 17H10v1H7v-.92L9 15H7v-1z"></path>
            </svg>
            <span>任务</span>
            <span v-if="activeTaskCount" class="task-badge">{{ activeTaskCount }}</span>
          </button>
          <div class="credit-pill">
            <svg class="credit-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" d="M12 2.5 22 8l-10 13.5L2 8zm0 3.1L6.3 8l5.7 7.7L17.7 8z"></path>
            </svg>
            <span class="credit-label">积分:</span>
            <span class="credit-value">{{ currentCredits }}</span>
          </div>
        </div>
      </div>
    </header>

    <div class="studio-body">
    <!-- ========== LEFT SIDEBAR ========== -->
    <aside class="sidebar">
      <nav class="pipeline">
        <div
          v-for="section in sidebarSections"
          :key="section.id"
          class="pipe-section"
        >
          <div class="pipe-section-label">{{ section.label }}</div>
          <button
            v-for="item in section.items"
            :key="item.key"
            :class="['pipe-item pipe-item-sub', { active: activeSubStepKey === item.key, done: item.done, locked: item.locked }]"
            :disabled="item.locked"
            :aria-disabled="String(item.locked)"
            @click="goSubStep(item.key)"
          >
            <span class="pipe-icon" :class="item.done ? 'icon-done' : activeSubStepKey === item.key ? 'icon-active' : ''">
              <svg v-if="item.done" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <component v-else :is="item.icon" :size="11" />
            </span>
            <span class="pipe-copy">
              <span class="pipe-label">{{ item.label }}</span>
              <span v-if="item.desc" class="pipe-sub">{{ item.desc }}</span>
            </span>
          </button>
        </div>
      </nav>

      <!-- Bottom: Progress + Refresh -->
      <div class="sidebar-bottom">
        <div class="progress-wrap">
          <div class="progress-head">
            <span class="progress-label">制作进度</span>
            <span class="progress-val">{{ pipelineProgress }}/11</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill" :style="{ width: (pipelineProgress / 11 * 100) + '%' }"></div>
          </div>
        </div>
        <div class="sidebar-jumper" v-if="sidebarJumpSteps.length">
          <button
            v-for="step in sidebarJumpSteps"
            :key="step.key"
            :class="['sidebar-jump-dot', { active: activeSubStepKey === step.key, done: step.done }]"
            @click="goSubStep(step.key)"
            :title="step.label"
          ></button>
        </div>
        <button class="refresh-btn" @click="refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          刷新数据
        </button>
      </div>
    </aside>

    <!-- ========== MAIN CONTENT ========== -->
    <main class="main">
      <div v-if="activeSubSteps.length && !(panel === 'production' && ['shots', 'videos'].includes(prodTab))" class="stage-subnav">
        <button
          v-for="sub in activeSubSteps"
          :key="sub.key"
          :class="['stage-subnav-item', { active: activeSubStepKey === sub.key, done: sub.done, locked: sub.locked }]"
          :disabled="sub.locked"
          :aria-disabled="String(sub.locked)"
          @click="goSubStep(sub.key)"
        >
          <span>{{ sub.label }}</span>
          <span v-if="sub.done" class="stage-subnav-dot"></span>
        </button>
      </div>

      <!-- ===== SCRIPT PANEL ===== -->
      <div v-if="panel === 'script'" class="content-panel">
        <!-- Step 0: Raw Content -->
        <div v-if="scriptStep === 0" class="step-editor">
          <div class="step-toolbar">
            <div class="toolbar-left">
              <div class="step-indicator">
                <span class="step-name">剧本内容（{{ rawContent ? '已保存' : '未保存' }}）</span>
              </div>
            </div>
            <div class="toolbar-right">
              <template v-if="isEditingRaw">
                <button class="target-action-btn secondary-action small" type="button" @click="cancelRawEdit">
                  <span>取消</span>
                </button>
                <button class="target-action-btn primary-action small" type="button" @click="saveRawEdit">
                  <span>保存修改</span>
                </button>
              </template>
              <template v-else>
              <button class="target-action-btn secondary-action small" type="button" @click="startRawEdit">
                <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"></path>
                </svg>
                <span>编辑剧本</span>
              </button>
              <BaseSelect v-model="scriptModel" :options="scriptModelOptions" placeholder="选择模型" searchable class="script-model-select" />
              <button class="target-action-btn secondary-action small" type="button" :disabled="rn" @click="startExtractFromRaw">
                <Loader2 v-if="rn && rt === 'extractor'" :size="14" class="animate-spin" />
                <svg v-else class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9Zm0 14l-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25L19 23ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5L9 20Z"></path>
                </svg>
                <span>{{ rn && rt === 'extractor' ? '提取中...' : '提取角色和场景' }}</span>
              </button>
              <button class="target-action-btn primary-action small" type="button" @click="saveRaw(); scriptStep = 1">
                <span>下一步</span>
              </button>
              </template>
            </div>
          </div>
          <div class="script-editor-content">
            <div class="script-content">
              <div class="my-story">
                <div class="target-input no-border">
                  <div class="target-input-wrapper">
                    <textarea
                      class="fill-textarea"
                      v-model="localRaw"
                      maxlength="3000"
                      :readonly="!isEditingRaw"
                      placeholder="参考示例：
  在一座阴森的古堡里，德古拉公爵坐在丝绒沙发上闭目养神，他的爱宠是一只德牧，正趴在他的脚下。突然，窗户处传来了响声，德牧警惕地站了起来，而德古拉公爵只是抬了抬眼。"
                    />
                    <span class="target-input-word-count">{{ rawLen }} / 3000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <section v-if="showInlineExtractResult" class="inline-extract-result">
            <div class="inline-extract-head">
              <div>
                <div class="inline-extract-title">提取结果 <span>（共 {{ chars.length + scenes.length }} 项）</span></div>
                <div v-if="rn && rt === 'extractor'" class="inline-extract-status">角色提取、场景提取中......（{{ extractProgress }}%）</div>
              </div>
              <div v-if="rn && rt === 'extractor'" class="inline-extract-progress">
                <span :style="{ width: extractProgress + '%' }"></span>
              </div>
            </div>
            <div class="inline-extract-groups">
              <div class="inline-extract-group">
                <div class="inline-extract-label">角色 ({{ chars.length }})</div>
                <div class="inline-extract-pills">
                  <span v-for="c in chars" :key="c.id" class="inline-extract-pill">{{ c.name }}</span>
                  <span v-if="!chars.length" class="inline-extract-empty">{{ rn && rt === 'extractor' ? '等待提取结果' : '暂无角色' }}</span>
                </div>
              </div>
              <div class="inline-extract-group">
                <div class="inline-extract-label">场景 ({{ scenes.length }})</div>
                <div class="inline-extract-pills">
                  <span v-for="s in scenes" :key="s.id" class="inline-extract-pill">{{ s.location }}{{ s.time ? '-' + s.time : '' }}</span>
                  <span v-if="!scenes.length" class="inline-extract-empty">{{ rn && rt === 'extractor' ? '等待提取结果' : '暂无场景' }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Step 1: Rewrite -->
        <div v-else-if="scriptStep === 1" class="step-editor">
          <div class="step-toolbar">
            <div class="toolbar-left">
              <div class="step-indicator">
                <span class="step-name">剧本内容（{{ scriptContent ? '已保存' : '未保存' }}）</span>
              </div>
            </div>
            <div class="toolbar-right">
              <template v-if="isEditingScript">
                <button class="target-action-btn secondary-action small" type="button" @click="cancelScriptEdit">
                  <span>取消</span>
                </button>
                <button class="target-action-btn primary-action small" type="button" @click="saveScriptEdit">
                  <span>保存修改</span>
                </button>
              </template>
              <template v-else>
              <button class="target-action-btn secondary-action small" type="button" @click="startScriptEdit">
                <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21zM19 6.4L17.6 5zm-3.525 2.125l-.7-.725L16.2 9.225z"></path>
                </svg>
                <span>编辑剧本</span>
              </button>
              <BaseSelect v-model="scriptModel" :options="scriptModelOptions" placeholder="选择模型" searchable class="script-model-select" />
              <button class="target-action-btn secondary-action small" type="button" :disabled="rn" @click="startExtractToCharacters">
                <Loader2 v-if="rn && rt === 'extractor'" :size="14" class="animate-spin" />
                <svg v-else class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9Zm0 14l-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25L19 23ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5L9 20Z"></path>
                </svg>
                <span>{{ rn && rt === 'extractor' ? '提取中...' : '提取角色和场景' }}</span>
              </button>
              <button class="target-action-btn primary-action small" type="button" @click="goNextStep">
                <span>下一步</span>
              </button>
              </template>
            </div>
          </div>

          <div v-if="!scriptContent && !rn" class="step-empty">
            <div class="empty-visual">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
            </div>
            <div class="empty-title">AI 改写为格式化剧本</div>
            <div class="empty-desc">你可以先用 AI 把原始内容整理成格式化剧本，也可以跳过这一步，直接使用原始内容继续提取角色与场景。</div>
            <div class="step-empty-actions">
              <button class="btn btn-primary" @click="doRewrite">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                开始改写
              </button>
              <button class="btn" @click="skipRewrite">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14"/><path d="M13 18l6-6-6-6"/></svg>
                跳过改写
              </button>
            </div>
          </div>
          <div v-else-if="rn && rt === 'script_rewriter'" class="step-loading">
            <Loader2 :size="24" class="animate-spin" style="color:var(--accent)" />
            <div class="loading-text">正在改写剧本...</div>
          </div>
          <div v-else class="script-editor-content">
            <div class="script-content">
              <div class="my-story">
                <div class="target-input no-border">
                  <div class="target-input-wrapper">
                    <textarea
                      class="fill-textarea"
                      v-model="localScript"
                      maxlength="3000"
                      :readonly="!isEditingScript"
                      placeholder="格式化剧本内容..."
                    />
                    <span class="target-input-word-count">{{ scriptLen }} / 3000</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <section v-if="showInlineExtractResult" class="inline-extract-result">
            <div class="inline-extract-head">
              <div>
                <div class="inline-extract-title">提取结果 <span>（共 {{ chars.length + scenes.length }} 项）</span></div>
                <div v-if="rn && rt === 'extractor'" class="inline-extract-status">角色提取、场景提取中......（{{ extractProgress }}%）</div>
              </div>
              <div v-if="rn && rt === 'extractor'" class="inline-extract-progress">
                <span :style="{ width: extractProgress + '%' }"></span>
              </div>
            </div>
            <div class="inline-extract-groups">
              <div class="inline-extract-group">
                <div class="inline-extract-label">角色 ({{ chars.length }})</div>
                <div class="inline-extract-pills">
                  <span v-for="c in chars" :key="c.id" class="inline-extract-pill">{{ c.name }}</span>
                  <span v-if="!chars.length" class="inline-extract-empty">{{ rn && rt === 'extractor' ? '等待提取结果' : '暂无角色' }}</span>
                </div>
              </div>
              <div class="inline-extract-group">
                <div class="inline-extract-label">场景 ({{ scenes.length }})</div>
                <div class="inline-extract-pills">
                  <span v-for="s in scenes" :key="s.id" class="inline-extract-pill">{{ s.location }}{{ s.time ? '-' + s.time : '' }}</span>
                  <span v-if="!scenes.length" class="inline-extract-empty">{{ rn && rt === 'extractor' ? '等待提取结果' : '暂无场景' }}</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <!-- Step 3: Voice Assignment -->
        <div v-else-if="scriptStep === 3" class="step-editor">
          <div class="step-toolbar">
            <div class="toolbar-left">
              <div class="step-indicator">
                <span class="step-num">04</span>
                <span class="step-name">分配音色</span>
              </div>
            </div>
            <div class="toolbar-right">
              <span v-if="charsVoiced" class="char-count">{{ charsVoiced }}/{{ chars.length }} 已分配</span>
              <span v-if="voiceSampleCount" class="char-count">{{ voiceSampleCount }}/{{ charsVoiced }} 试听文件</span>
              <button v-if="charsVoiced" class="btn btn-sm" @click="doVoice" :disabled="rn">
                <Loader2 v-if="rn && rt === 'voice_assigner'" :size="11" class="animate-spin" />
                <svg v-else width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
                重新分配
              </button>
              <button v-if="charsVoiced" class="btn btn-sm" @click="batchGenSamples">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19 5v14"/></svg>
                生成试听文件
              </button>
            </div>
          </div>

          <div v-if="!charsVoiced && !rn" class="step-empty">
            <div class="empty-visual">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/></svg>
            </div>
            <div class="empty-title">为角色分配合适的音色</div>
            <div class="empty-desc">AI 根据角色特征自动分配最匹配的 TTS 音色</div>
            <button class="btn btn-primary" @click="doVoice">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              AI 自动分配
            </button>
          </div>
          <div v-else-if="rn && rt === 'voice_assigner'" class="step-loading">
            <Loader2 :size="24" class="animate-spin" style="color:var(--accent)" />
            <div class="loading-text">正在分配音色...</div>
          </div>
          <div v-else class="voice-stage">
            <aside class="card voice-stage-panel">
              <div class="voice-stage-kicker">Voice Casting</div>
              <div class="voice-stage-title">角色声音分配台</div>
              <div class="voice-stage-desc">先为每个角色选择合适音色，再生成试听。音色标签会帮助你快速区分旁白、主角、反派和配角的表达方向。</div>
              <div class="voice-stage-stats">
                <div class="voice-stage-stat">
                  <span class="voice-stage-stat-label">已分配</span>
                  <strong>{{ charsVoiced }}/{{ chars.length }}</strong>
                </div>
                <div class="voice-stage-stat">
                  <span class="voice-stage-stat-label">试听文件</span>
                  <strong>{{ voiceSampleCount }}/{{ charsVoiced }}</strong>
                </div>
              </div>
              <div class="voice-library-meta">
                <span>音色库</span>
                <span>{{ voiceProfiles.length }} 条</span>
              </div>
              <div class="voice-library">
                <div v-for="voice in voiceProfiles" :key="voice.id" class="voice-library-item">
                  <div class="voice-library-head">
                    <span class="voice-library-name">{{ voice.label }}</span>
                    <span class="tag">{{ voice.gender }}</span>
                  </div>
                  <div class="voice-library-traits">{{ voice.traits }}</div>
                  <div class="voice-library-fit">{{ voice.suitable }}</div>
                </div>
              </div>
            </aside>

            <div class="voice-grid">
              <div v-for="c in chars" :key="c.id" class="card voice-card">
                <div class="voice-card-head">
                  <div class="voice-char">
                    <div class="char-avatar lg">{{ c.name?.[0] || '?' }}</div>
                    <div class="voice-name">
                      <div class="voice-name-row">
                        <div class="extract-name">{{ c.name }}</div>
                        <span class="tag" :class="(c.voice_style || c.voiceStyle) ? 'tag-success' : ''">{{ (c.voice_style || c.voiceStyle) ? '已分配' : '待分配' }}</span>
                      </div>
                      <div class="extract-meta">{{ c.role || '角色' }}</div>
                    </div>
                  </div>
                </div>

                <div class="voice-card-copy">
                  <div class="voice-card-text">{{ c.description || c.personality || c.appearance || '暂无角色描述，可根据人物定位手动挑选音色。' }}</div>
                </div>

                <div class="voice-select-block">
                  <span class="voice-block-label">选择音色</span>
                  <BaseSelect
                    :model-value="c.voice_style || c.voiceStyle || ''"
                    :options="voiceSelectOptions"
                    placeholder="选择音色"
                    searchable
                    style="width:100%"
                    @update:model-value="updateCharVoice(c.id, $event)"
                  />
                </div>

                <div v-if="getVoiceProfile(c.voice_style || c.voiceStyle)" class="voice-profile-card">
                  <div class="voice-profile-head">
                    <span class="voice-profile-name">{{ getVoiceProfile(c.voice_style || c.voiceStyle)?.label }}</span>
                    <span class="tag">{{ getVoiceProfile(c.voice_style || c.voiceStyle)?.gender }}</span>
                  </div>
                  <div class="voice-profile-traits">{{ getVoiceProfile(c.voice_style || c.voiceStyle)?.traits }}</div>
                  <div class="voice-profile-fit">{{ getVoiceProfile(c.voice_style || c.voiceStyle)?.suitable }}</div>
                </div>

                <div class="voice-actions-row">
                  <button class="btn btn-sm" :disabled="!(c.voice_style || c.voiceStyle)" @click="genSample(c.id)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                    {{ (c.voice_sample_url || c.voiceSampleUrl) ? '重新试听' : '生成试听' }}
                  </button>
                  <span class="dim" style="font-size:11px">{{ (c.voice_sample_url || c.voiceSampleUrl) ? '已生成声音样本，可直接播放' : '生成后可快速确认角色声音' }}</span>
                </div>

                <div v-if="c.voice_sample_url || c.voiceSampleUrl" class="voice-player">
                  <audio :src="'/' + (c.voice_sample_url || c.voiceSampleUrl)" controls preload="none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Storyboard -->
        <div v-else-if="scriptStep === 4" class="storyboard-panel-container">
          <div class="storyboard-header">
            <div class="header-left flex flex-col justify-center">
              <span class="font-bold text-xl">分镜列表</span>
              <div class="storyboard-description">
                共 {{ sbs.length }} 个分镜
                <span class="info-divider">|</span>
                <span class="info-item">{{ visualChars.length }} 个角色</span>
                <span class="info-divider">|</span>
                <span class="info-item">{{ scenes.length }} 个场景</span>
              </div>
            </div>
            <div class="storyboard-actions">
              <div class="model-select-inline">
                <BaseSelect v-model="scriptModel" :options="scriptModelOptions" placeholder="选择模型" searchable class="storyboard-model-select" />
              </div>
              <button class="action-btn secondary-action small" type="button" :disabled="rn" @click="doBreakdown">
                <Loader2 v-if="rn && rt === 'storyboard_breaker'" :size="16" class="animate-spin" />
                <svg v-else class="svg-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"></path>
                </svg>
                <span>{{ rn && rt === 'storyboard_breaker' ? '提取中' : '提取分镜' }}</span>
              </button>
              <button class="action-btn primary-action small" type="button" :disabled="!sbs.length" @click="goNextStep">
                <span>下一步</span>
              </button>
            </div>
          </div>

          <div v-if="rn && rt === 'storyboard_breaker'" class="storyboard-extract-loading">
            <div class="extract-orbit" aria-hidden="true">
              <span></span>
            </div>
            <div class="extract-main-text">{{ agentTaskMessage || storyboardLoadingMessage }}</div>
            <div class="extract-sub-text">提取中... ({{ agentTaskProgress || storyboardLoadingProgress }}%)</div>
          </div>

          <div v-if="sbs.length" class="storyboard-list pt-2">
            <div class="storyboard-items">
              <div
                v-for="(sb, i) in sbs"
                :key="sb.id"
                class="storyboard-wrapper"
                data-draggable="true"
              >
                <div class="insert-area">
                  <div class="insert-line"></div>
                  <button class="insert-button" type="button" @click="insertShotAt(i)">
                    <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"></path>
                    </svg>
                    <span>插入分镜</span>
                  </button>
                </div>

                <div :class="['storyboard-item', { expanded: isStoryboardExpanded(sb) }]">
                  <div class="handle">
                    <svg class="svg-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 18a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0-6a1 1 0 1 0 2 0a1 1 0 0 0-2 0m0-6a1 1 0 1 0 2 0a1 1 0 0 0-2 0"></path>
                    </svg>
                  </div>
                  <div class="item-number">{{ i + 1 }}</div>
                  <div class="item-content">
                    <button class="storyboard-collapsed-head" type="button" @click="toggleStoryboardExpanded(sb)">
                      <span class="storyboard-summary">{{ storyboardVisualText(sb) || storyboardActionText(sb) || '未填写分镜描述' }}</span>
                      <span class="storyboard-meta-pill">{{ storyboardShotTypeLabel(sb) }}</span>
                      <svg class="storyboard-expand-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path fill="currentColor" d="m7 10l5 5l5-5z"></path>
                      </svg>
                    </button>

                    <div v-if="isStoryboardExpanded(sb)" class="storyboard-action-row">
                      <div class="storyboard-textarea-wrap">
                        <div v-if="storyboardVisualText(sb)" class="storyboard-visual-text">{{ storyboardVisualText(sb) }}</div>
                        <textarea
                          class="storyboard-textarea"
                          rows="3"
                          maxlength="500"
                          placeholder="请输入动作描述..."
                          :value="storyboardActionText(sb)"
                          @blur="saveStoryboardAction(sb, $event.target.value)"
                        ></textarea>
                        <span class="storyboard-word-count">{{ storyboardActionText(sb).length }} / 500</span>
                      </div>
                      <button class="action-btn text small" type="button" @click="deleteShot(sb)">
                        <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                          <path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2zM7 6v13z"></path>
                        </svg>
                      </button>
                    </div>

                    <div v-if="isStoryboardExpanded(sb)" class="characters-display">
                      <div class="characters-label">关联角色:</div>
                      <div v-if="getStoryboardCharacterNames(sb).length" class="characters-list">
                        <span v-for="name in getStoryboardCharacterNames(sb)" :key="name" class="character-tag">{{ name }}</span>
                      </div>
                      <div v-else class="empty-characters">
                        <span class="add-character-btn" @click="selectedSb = sb">
                          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"></path>
                          </svg>
                          点击绑定角色
                        </span>
                      </div>
                    </div>

                    <div v-if="isStoryboardExpanded(sb)" class="scene-display">
                      <div class="scene-label">关联场景:</div>
                      <div v-if="getStoryboardScene(sb)" class="scene-info">
                        <span class="scene-tag">
                          <svg class="svg-icon" width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                            <path fill="currentColor" d="M13.413 11.413Q14 10.825 14 10t-.587-1.412T12 8t-1.412.588T10 10t.588 1.413T12 12t1.413-.587M12 19.35q3.05-2.8 4.525-5.087T18 10.2q0-2.725-1.737-4.462T12 4T7.738 5.738T6 10.2q0 1.775 1.475 4.063T12 19.35M12 22q-4.025-3.425-6.012-6.362T4 10.2q0-3.75 2.413-5.975T12 2t5.588 2.225T20 10.2q0 2.5-1.987 5.438T12 22m0-12"></path>
                          </svg>
                          {{ sceneTitle(getStoryboardScene(sb)) }}
                        </span>
                        <span class="scene-detail">{{ getStoryboardScene(sb)?.location || '未命名场景' }}</span>
                        <span class="scene-detail">{{ getStoryboardScene(sb)?.time || '未设时间' }}</span>
                      </div>
                      <div v-else class="scene-info">
                        <span class="scene-detail">未绑定场景</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div v-if="i === sbs.length - 1" class="insert-area">
                  <div class="insert-line"></div>
                  <button class="insert-button" type="button" @click="insertShotAt(i + 1)">
                    <svg class="svg-icon" width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"></path>
                    </svg>
                    <span>插入分镜</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="storyboard-empty">
            <div class="empty-title">将剧本拆解为分镜序列</div>
            <div class="empty-desc">点击“提取分镜”，后端会调用 storyboard_breaker agent 读取剧本、角色和场景并保存分镜脚本。</div>
            <div class="locked-config-banner">当前集视频模型：{{ lockedVideoConfigLabel }}</div>
          </div>
        </div>

      </div>

      <!-- ===== PRODUCTION PANEL ===== -->
      <div v-else-if="panel === 'production'" class="content-panel">
        <!-- Guard: need script -->
        <div v-if="!scriptContent || (!sbs.length && !['chars', 'scenes'].includes(prodTab))" class="step-empty" style="flex:1">
          <div class="empty-visual">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
          </div>
          <div class="empty-title">尚未准备就绪</div>
          <div class="empty-desc">{{ !scriptContent ? '请先完成剧本编写' : '请先完成分镜拆解' }}</div>
          <button class="btn btn-primary" @click="panel = 'script'">前往剧本</button>
        </div>

        <template v-else>
          <div v-if="!['chars', 'scenes', 'shots', 'videos'].includes(prodTab)" class="step-toolbar prod-toolbar">
            <div class="toolbar-left">
              <div class="step-indicator">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                <span class="step-name">制作工作台</span>
              </div>
            </div>
            <div class="prod-tabs">
              <button
                v-for="t in prodTabDefs"
                :key="t.id"
                :class="['prod-tab', { active: prodTab === t.id }]"
                @click="prodTab = t.id"
              >
                <component :is="t.icon" :size="11" />
                {{ t.label }}
                <span v-if="t.badge" class="prod-tab-badge">{{ t.badge }}</span>
              </button>
            </div>
          </div>

          <!-- Sub: Characters -->
          <div v-if="prodTab === 'chars'" class="role-panel-container">
            <div class="role-header">
              <div class="role-title-block">
                <div class="role-title">请为你的角色设置形象</div>
                <div class="role-description">请为你的剧本设计 {{ visualChars.length || 0 }} 个角色，填写角色卡片可获得更好的形象生成效果</div>
              </div>
              <div class="role-actions">
                <button class="role-action-btn secondary" type="button" @click="openRoleLibrary">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8H11.175l-2-2H4v12l2.4-8h17.1l-2.575 8.575q-.2.65-.737 1.038T19 20zm2.1-2H19l1.8-6H7.9z"/></svg>
                  <span>从公共库选择</span>
                </button>
                <BaseSelect v-model="scriptModel" :options="scriptModelOptions" placeholder="选择模型" searchable class="role-model-select" />
                <button class="role-action-btn secondary" type="button" :disabled="rn" @click="reExtractCharacters">
                  <Loader2 v-if="rn && rt === 'extractor'" :size="16" class="animate-spin" />
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/></svg>
                  <span>{{ rn && rt === 'extractor' ? '提取中' : '重新提取角色' }}</span>
                </button>
                <BaseSelect v-model="imageModel" :options="imageModelOptions" placeholder="图片模型" searchable class="role-image-model-select" />
                <button class="role-action-btn primary" type="button" :disabled="batchCharImageRunning" @click="batchCharImages">
                  <Loader2 v-if="batchCharImageRunning" :size="18" class="animate-spin" />
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9Zm0 14l-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25L19 23ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5L9 20Z"/></svg>
                  <span>{{ batchCharImageRunning ? '生成中' : '一键生成形象' }}</span>
                  <span class="role-cost">120</span>
                </button>
                <button class="role-next-btn" type="button" @click="goNextProd">下一步</button>
              </div>
            </div>

            <div class="role-cards">
              <button class="role-card add-card" type="button" @click="addCharacter">
                <div class="add-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                </div>
                <div class="add-text">设置角色</div>
              </button>

              <article v-for="c in visualChars" :key="c.id" class="role-card character-card">
                <div class="character-image">
                  <img
                    v-if="c.image_url || c.imageUrl"
                    :src="assetUrl(c.image_url || c.imageUrl)"
                    class="previewable-image"
                    @click.stop="openImageViewer(assetUrl(c.image_url || c.imageUrl), `${c.name} 角色形象`)"
                  />
                  <div v-if="!(c.image_url || c.imageUrl)" class="image-placeholder">
                    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 4a3 3 0 1 0 0 6a3 3 0 0 0 0-6M6 7a5 5 0 1 1 10 0A5 5 0 0 1 6 7M4.413 17.601c-.323.41-.413.72-.413.899c0 .122.037.251.255.426c.249.2.682.407 1.344.582C6.917 19.858 8.811 20 11 20q.333 0 .658-.005a1 1 0 0 1 .027 2Q11.345 22 11 22c-2.229 0-4.335-.14-5.913-.558c-.785-.208-1.524-.506-2.084-.956C2.41 20.01 2 19.345 2 18.5c0-.787.358-1.523.844-2.139c.494-.625 1.177-1.2 1.978-1.69C6.425 13.695 8.605 13 11 13q.671 0 1.316.07a1 1 0 0 1-.211 1.989Q11.564 15 11 15c-2.023 0-3.843.59-5.136 1.379c-.647.394-1.135.822-1.45 1.222Zm14.451-3.604a1 1 0 0 0-1.728 0l-.91 1.562l-1.766.382a1 1 0 0 0-.534 1.644l1.204 1.348l-.182 1.798a1 1 0 0 0 1.398 1.016l1.654-.73l1.654.73a1 1 0 0 0 1.398-1.016l-.182-1.799l1.204-1.347a1 1 0 0 0-.534-1.644l-1.766-.382z"/></svg>
                  </div>
                  <div v-if="isPendingCharImage(c.id)" class="character-image-loading">
                    <Loader2 :size="30" class="animate-spin" />
                    <span>生成中...</span>
                  </div>
                  <div v-else-if="failedCharImageMessages[c.id]" class="character-image-error">
                    <span>生成失败</span>
                  </div>
                </div>
                <div class="character-info">
                  <div class="character-name">{{ c.name }}</div>
                  <div class="character-attributes">
                    <div class="attribute">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9.175 10.825Q8 9.65 8 8t1.175-2.825T12 4t2.825 1.175T16 8t-1.175 2.825T12 12t-2.825-1.175M4 20v-2.8q0-.85.438-1.562T5.6 14.55q1.55-.775 3.15-1.162T12 13t3.25.388t3.15 1.162q.725.375 1.163 1.088T20 17.2V20z"/></svg>
                      <span class="attribute-text">{{ characterBrief(c) }}</span>
                    </div>
                    <div class="attribute">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 22q-.825 0-1.412-.587T4 20V4q0-.825.588-1.412T6 2h8l6 6v3q-.575.125-1.075.4t-.925.7l-6 5.975V22zm8 0v-3.075l5.525-5.5q.225-.225.5-.325t.55-.1q.3 0 .575.113t.5.337l.925.925q.2.225.313.5t.112.55t-.1.563t-.325.512l-5.5 5.5zM13 9h5l-5-5z"/></svg>
                      <span class="attribute-text multiline">{{ c.description || c.appearance || c.personality || '暂无角色描述' }}</span>
                    </div>
                  </div>
                </div>
                <div class="character-actions">
                  <button class="char-icon-btn" type="button" title="编辑角色" @click="editCharacter(c)">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21z"/></svg>
                  </button>
                  <button class="char-icon-btn" type="button" title="删除角色" @click="deleteCharacter(c)">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2z"/></svg>
                  </button>
                </div>
                <div class="image-actions">
                  <button class="image-action-btn" type="button" :disabled="isPendingCharImage(c.id)" title="生成形象" @click="genCharImg(c.id)">
                    <Loader2 v-if="isPendingCharImage(c.id)" :size="14" class="animate-spin" />
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5z"/></svg>
                  </button>
                  <button class="image-action-btn" type="button" title="上传形象" @click="openRoleImageUpload(c.id)">
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16zm-5 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>
                  </button>
                  <button class="image-action-btn save-to-library" type="button" title="保存到库" @click.stop="saveCharacterToLibrary(c)">
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21V5q0-.825.588-1.412T7 3h6v2H7v12.95l5-2.15l5 2.15V11h2v10l-7-3zM17 9V7h-2V5h2V3h2v2h2v2h-2v2z"/></svg>
                  </button>
                </div>
              </article>
            </div>
          </div>

          <Teleport to="body">
            <div v-if="roleModalOpen" class="role-modal-overlay" @click.self="closeRoleModal">
              <section class="role-design-modal" role="dialog" aria-modal="true" aria-label="角色设计">
                <button class="role-modal-close" type="button" aria-label="关闭" @click="closeRoleModal">
                  <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.15 2.15a.5.5 0 0 1 .7 0L6 5.3l3.15-3.15a.5.5 0 1 1 .7.7L6.7 6l3.15 3.15a.5.5 0 0 1-.7.7L6 6.7L2.85 9.85a.5.5 0 1 1-.7-.7L5.3 6L2.15 2.85a.5.5 0 0 1 0-.7Z"/></svg>
                </button>
                <h2 class="role-modal-title">{{ roleModalMode === 'create' ? '自定义角色' : '角色设计' }}</h2>
                <div class="role-modal-content">
                  <div class="role-modal-image">
                    <img
                      v-if="editingRoleForm.imageUrl"
                      :src="assetUrl(editingRoleForm.imageUrl)"
                      alt=""
                    />
                    <div v-else class="role-modal-image-placeholder">
                      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 4a3 3 0 1 0 0 6a3 3 0 0 0 0-6M6 7a5 5 0 1 1 10 0A5 5 0 0 1 6 7M4.413 17.601c-.323.41-.413.72-.413.899c0 .122.037.251.255.426c.249.2.682.407 1.344.582C6.917 19.858 8.811 20 11 20q.333 0 .658-.005a1 1 0 0 1 .027 2Q11.345 22 11 22c-2.229 0-4.335-.14-5.913-.558c-.785-.208-1.524-.506-2.084-.956C2.41 20.01 2 19.345 2 18.5c0-.787.358-1.523.844-2.139c.494-.625 1.177-1.2 1.978-1.69C6.425 13.695 8.605 13 11 13q.671 0 1.316.07a1 1 0 0 1-.211 1.989Q11.564 15 11 15c-2.023 0-3.843.59-5.136 1.379c-.647.394-1.135.822-1.45 1.222Zm14.451-3.604a1 1 0 0 0-1.728 0l-.91 1.562l-1.766.382a1 1 0 0 0-.534 1.644l1.204 1.348l-.182 1.798a1 1 0 0 0 1.398 1.016l1.654-.73l1.654.73a1 1 0 0 0 1.398-1.016l-.182-1.799l1.204-1.347a1 1 0 0 0-.534-1.644l-1.766-.382z"/></svg>
                      <button class="role-upload-btn" type="button" @click="openRoleImageUpload(editingRoleForm.id)">手动上传</button>
                      <button class="role-generate-btn" type="button" :disabled="!editingRoleForm.id || isPendingCharImage(editingRoleForm.id)" @click="generateEditingRoleImage">
                        <Loader2 v-if="isPendingCharImage(editingRoleForm.id)" :size="14" class="animate-spin" />
                        <svg v-else width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5z"/></svg>
                        智能生成
                        <span class="role-generate-cost">40</span>
                      </button>
                    </div>
                  </div>
                  <form class="role-modal-form" @submit.prevent="saveRoleModal">
                    <label class="role-field">
                      <span>名称</span>
                      <input v-model="editingRoleForm.name" type="text" placeholder="请输入角色名称" />
                    </label>
                    <label class="role-field">
                      <span>年龄</span>
                      <BaseSelect v-model="editingRoleForm.age" :options="roleAgeOptions" placeholder="请选择年龄" class="role-form-select" dropdown-class="role-form-select-dropdown" />
                    </label>
                    <label class="role-field">
                      <span>性别</span>
                      <BaseSelect v-model="editingRoleForm.gender" :options="roleGenderOptions" placeholder="请选择性别" class="role-form-select" dropdown-class="role-form-select-dropdown" />
                    </label>
                    <label class="role-field">
                      <span>人物描述</span>
                      <textarea v-model="editingRoleForm.appearance" rows="5" placeholder="请输入人物描述"></textarea>
                    </label>
                    <label class="role-field">
                      <span>背景故事</span>
                      <textarea v-model="editingRoleForm.description" rows="4" placeholder="请输入背景故事"></textarea>
                    </label>
                  </form>
                </div>
                <div class="role-modal-actions">
                  <button class="role-modal-text-btn" type="button" @click="closeRoleModal">取消</button>
                  <button class="role-modal-primary-btn" type="button" @click="saveRoleModal">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"/></svg>
                    确认
                  </button>
                </div>
              </section>
            </div>
          </Teleport>

          <Teleport to="body">
            <div v-if="roleLibraryOpen" class="role-library-overlay" @click.self="closeRoleLibrary">
              <section class="role-library-modal" role="dialog" aria-modal="true" aria-label="我的角色库">
                <header class="role-library-header">
                  <div class="role-library-title">
                    <Users :size="24" />
                    <span>我的角色库</span>
                  </div>
                  <button class="role-library-close" type="button" aria-label="关闭" @click="closeRoleLibrary">
                    <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.15 2.15a.5.5 0 0 1 .7 0L6 5.3l3.15-3.15a.5.5 0 1 1 .7.7L6.7 6l3.15 3.15a.5.5 0 0 1-.7.7L6 6.7L2.85 9.85a.5.5 0 1 1-.7-.7L5.3 6L2.15 2.85a.5.5 0 0 1 0-.7Z"/></svg>
                  </button>
                </header>
                <div class="role-library-content">
                  <div class="role-library-search">
                    <div class="role-library-search-input">
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
                      <input
                        v-model="roleLibrarySearch"
                        type="text"
                        placeholder="搜索角色名称、身份或描述..."
                        @keydown.enter.prevent="loadRoleLibrary"
                      />
                    </div>
                    <button class="role-library-search-btn" type="button" @click="loadRoleLibrary">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
                      搜索
                    </button>
                  </div>
                  <div v-if="roleLibraryLoading" class="role-library-empty">
                    <Loader2 :size="40" class="animate-spin" />
                    <p>加载中...</p>
                  </div>
                  <div v-else-if="!roleLibraryItems.length" class="role-library-empty">
                    <Users :size="64" />
                    <p>角色库为空</p>
                    <p class="hint">在项目中创建角色后，可以保存到公共库以便复用</p>
                  </div>
                  <div v-else class="role-library-grid">
                    <button
                      v-for="item in roleLibraryItems"
                      :key="item.id"
                      :class="['role-library-item', { selected: selectedLibraryCharacterId === item.id }]"
                      type="button"
                      @click="selectedLibraryCharacterId = item.id"
                    >
                      <div class="role-library-thumb">
                        <img v-if="item.image_url || item.imageUrl" :src="assetUrl(item.image_url || item.imageUrl)" alt="" />
                        <Users v-else :size="34" />
                      </div>
                      <div class="role-library-info">
                        <div class="role-library-name">{{ item.name }}</div>
                        <div class="role-library-meta">{{ characterBrief(item) }}</div>
                        <div class="role-library-desc">{{ item.description || item.appearance || '暂无角色描述' }}</div>
                      </div>
                    </button>
                  </div>
                </div>
                <footer class="role-library-footer">
                  <button class="role-library-cancel" type="button" @click="addCharacter">新增角色</button>
                  <button class="role-library-cancel" type="button" @click="closeRoleLibrary">取消</button>
                  <button class="role-library-apply" type="button" :disabled="!selectedLibraryCharacterId || roleLibraryApplying" @click="applySelectedLibraryCharacter">
                    <Loader2 v-if="roleLibraryApplying" :size="16" class="animate-spin" />
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                    应用到当前项目
                  </button>
                </footer>
              </section>
            </div>
          </Teleport>

          <Teleport to="body">
            <div v-if="sceneLibraryOpen" class="role-library-overlay" @click.self="closeSceneLibrary">
              <section class="role-library-modal" role="dialog" aria-modal="true" aria-label="我的场景库">
                <header class="role-library-header">
                  <div class="role-library-title">
                    <MapPin :size="24" />
                    <span>我的场景库</span>
                  </div>
                  <button class="role-library-close" type="button" aria-label="关闭" @click="closeSceneLibrary">
                    <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.15 2.15a.5.5 0 0 1 .7 0L6 5.3l3.15-3.15a.5.5 0 1 1 .7.7L6.7 6l3.15 3.15a.5.5 0 0 1-.7.7L6 6.7L2.85 9.85a.5.5 0 1 1-.7-.7L5.3 6L2.15 2.85a.5.5 0 0 1 0-.7Z"/></svg>
                  </button>
                </header>
                <div class="role-library-content">
                  <div class="role-library-search">
                    <div class="role-library-search-input">
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
                      <input
                        v-model="sceneLibrarySearch"
                        type="text"
                        placeholder="搜索场景地点、时间或描述..."
                        @keydown.enter.prevent="loadSceneLibrary"
                      />
                    </div>
                    <button class="role-library-search-btn" type="button" @click="loadSceneLibrary">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19.6 21l-6.3-6.3q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.888T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5q0 1.1-.35 2.075T14.7 13.3l6.3 6.3zM9.5 14q1.875 0 3.188-1.312T14 9.5t-1.312-3.187T9.5 5T6.313 6.313T5 9.5t1.313 3.188T9.5 14"/></svg>
                      搜索
                    </button>
                  </div>
                  <div v-if="sceneLibraryLoading" class="role-library-empty">
                    <Loader2 :size="40" class="animate-spin" />
                    <p>加载中...</p>
                  </div>
                  <div v-else-if="!sceneLibraryItems.length" class="role-library-empty">
                    <MapPin :size="64" />
                    <p>场景库为空</p>
                    <p class="hint">在项目中创建场景后，可以保存到公共库以便复用</p>
                  </div>
                  <div v-else class="role-library-grid">
                    <button
                      v-for="item in sceneLibraryItems"
                      :key="item.id"
                      :class="['role-library-item', { selected: selectedLibrarySceneId === item.id }]"
                      type="button"
                      @click="selectedLibrarySceneId = item.id"
                    >
                      <div class="role-library-thumb">
                        <img v-if="item.image_url || item.imageUrl" :src="assetUrl(item.image_url || item.imageUrl)" alt="" />
                        <MapPin v-else :size="34" />
                      </div>
                      <div class="role-library-info">
                        <div class="role-library-name">{{ sceneTitle(item) }}</div>
                        <div class="role-library-meta">{{ item.time || '未设时间' }}</div>
                        <div class="role-library-desc">{{ item.prompt || '暂无场景描述' }}</div>
                      </div>
                    </button>
                  </div>
                </div>
                <footer class="role-library-footer">
                  <button class="role-library-cancel" type="button" @click="addScene">新增场景</button>
                  <button class="role-library-cancel" type="button" @click="closeSceneLibrary">取消</button>
                  <button class="role-library-apply" type="button" :disabled="!selectedLibrarySceneId || sceneLibraryApplying" @click="applySelectedLibraryScene">
                    <Loader2 v-if="sceneLibraryApplying" :size="16" class="animate-spin" />
                    <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                    应用到当前项目
                  </button>
                </footer>
              </section>
            </div>
          </Teleport>

          <!-- Sub: Scenes -->
          <div v-if="prodTab === 'scenes'" class="role-panel-container scene-panel-container">
            <div class="role-header">
              <div class="role-title-block">
                <div class="role-title">请为你的镜头设置场景</div>
                <div class="role-description">请为你的剧本设计 {{ scenes.length || 0 }} 个场景，填写场景卡片可获得更好的分镜生成效果</div>
              </div>
              <div class="role-actions">
                <button class="role-action-btn secondary" type="button" @click="openSceneLibrary">
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h6l2 2h8q.825 0 1.413.588T22 8H11.175l-2-2H4v12l2.4-8h17.1l-2.575 8.575q-.2.65-.737 1.038T19 20zm2.1-2H19l1.8-6H7.9z"/></svg>
                  <span>从公共库选择</span>
                </button>
                <BaseSelect v-model="scriptModel" :options="scriptModelOptions" placeholder="选择模型" searchable class="role-model-select" />
                <button class="role-action-btn secondary" type="button" :disabled="rn" @click="reExtractScenes">
                  <Loader2 v-if="rn && rt === 'extractor'" :size="16" class="animate-spin" />
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/></svg>
                  <span>{{ rn && rt === 'extractor' ? '提取中' : '重新提取场景' }}</span>
                </button>
                <BaseSelect v-model="imageModel" :options="imageModelOptions" placeholder="图片模型" searchable class="role-image-model-select" />
                <button class="role-action-btn primary" type="button" :disabled="batchSceneImageRunning" @click="batchSceneImages">
                  <Loader2 v-if="batchSceneImageRunning" :size="18" class="animate-spin" />
                  <svg v-else width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9Zm0 14l-1.25-2.75L15 19l2.75-1.25L19 15l1.25 2.75L23 19l-2.75 1.25L19 23ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5L9 20Z"/></svg>
                  <span>{{ batchSceneImageRunning ? '生成中' : '一键生成背景' }}</span>
                  <span class="role-cost">40</span>
                </button>
                <button class="role-next-btn" type="button" @click="goNextProd">下一步</button>
              </div>
            </div>

            <div class="role-cards scene-cards">
              <button class="role-card add-card" type="button" @click="addScene">
                <div class="add-icon">
                  <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-4h4v-2h-4V7h-2v4H7v2h4zm1 5q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                </div>
                <div class="add-text">设置场景</div>
              </button>

              <article v-for="s in scenes" :key="s.id" class="role-card character-card scene-card">
                <div class="character-image scene-image">
                  <img
                    v-if="s.image_url || s.imageUrl"
                    :src="assetUrl(s.image_url || s.imageUrl)"
                    class="previewable-image"
                    @click.stop="openImageViewer(assetUrl(s.image_url || s.imageUrl), `${sceneTitle(s)} 场景图`)"
                  />
                  <div v-if="!(s.image_url || s.imageUrl)" class="image-placeholder">
                    <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m1 18l6-8l4.5 6H19l-5-6.65l-2.5 3.3L10.25 11L14 6l9 12zm4-2h4l-2-2.675z"/></svg>
                  </div>
                  <div v-if="isPendingSceneImage(s.id)" class="character-image-loading">
                    <Loader2 :size="30" class="animate-spin" />
                    <span>生成中...</span>
                  </div>
                  <div v-else-if="failedSceneImageMessages[s.id]" class="character-image-error">
                    <span>生成失败</span>
                  </div>
                </div>
                <div class="character-info">
                  <div class="character-name">{{ sceneTitle(s) }}</div>
                  <div class="character-attributes">
                    <div class="attribute">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m15.3 16.7l1.4-1.4l-3.7-3.7V7h-2v5.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12"/></svg>
                      <span class="attribute-text">{{ s.time || '未设时间' }}</span>
                    </div>
                    <div class="attribute">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M15.5 11q.625 0 1.063-.437T17 9.5t-.437-1.062T15.5 8t-1.062.438T14 9.5t.438 1.063T15.5 11m-7 0q.625 0 1.063-.437T10 9.5t-.437-1.062T8.5 8t-1.062.438T7 9.5t.438 1.063T8.5 11m6.588 5.538Q16.475 15.575 17.1 14H6.9q.625 1.575 2.013 2.538T12 17.5t3.088-.962M8.1 21.213q-1.825-.788-3.175-2.138T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12"/></svg>
                      <span class="attribute-text multiline">{{ scenePromptSummary(s) }}</span>
                    </div>
                  </div>
                </div>
                <div class="character-actions">
                  <button class="char-icon-btn" type="button" title="编辑场景" @click="editScene(s)">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 19h1.425L16.2 9.225L14.775 7.8L5 17.575zm-2 2v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21z"/></svg>
                  </button>
                  <button class="char-icon-btn" type="button" title="删除场景" @click="deleteScene(s)">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 21q-.825 0-1.412-.587T5 19V6H4V4h5V3h6v1h5v2h-1v13q0 .825-.587 1.413T17 21zM17 6H7v13h10zM9 17h2V8H9zm4 0h2V8h-2z"/></svg>
                  </button>
                </div>
                <div class="image-actions">
                  <button class="image-action-btn" type="button" :disabled="isPendingSceneImage(s.id)" title="生成背景" @click="genSceneImg(s.id)">
                    <Loader2 v-if="isPendingSceneImage(s.id)" :size="14" class="animate-spin" />
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19 9l-1.25-2.75L15 5l2.75-1.25L19 1l1.25 2.75L23 5l-2.75 1.25L19 9ZM9 20l-2.5-5.5L1 12l5.5-2.5L9 4l2.5 5.5L17 12l-5.5 2.5z"/></svg>
                  </button>
                  <button class="image-action-btn" type="button" title="上传背景" @click="openSceneImageUpload(s.id)">
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16zm-5 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>
                  </button>
                  <button class="image-action-btn save-to-library" type="button" title="保存到库" @click.stop="saveSceneToLibrary(s)">
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21V5q0-.825.588-1.412T7 3h6v2H7v12.95l5-2.15l5 2.15V11h2v10l-7-3zM17 9V7h-2V5h2V3h2v2h2v2h-2v2z"/></svg>
                  </button>
                </div>
              </article>
            </div>
          </div>

          <Teleport to="body">
            <div v-if="sceneModalOpen" class="role-modal-overlay" @click.self="closeSceneModal">
              <section class="role-design-modal" role="dialog" aria-modal="true" aria-label="场景设计">
                <button class="role-modal-close" type="button" aria-label="关闭" @click="closeSceneModal">
                  <svg width="18" height="18" viewBox="0 0 12 12" aria-hidden="true"><path fill="currentColor" d="M2.15 2.15a.5.5 0 0 1 .7 0L6 5.3l3.15-3.15a.5.5 0 1 1 .7.7L6.7 6l3.15 3.15a.5.5 0 0 1-.7.7L6 6.7L2.85 9.85a.5.5 0 1 1-.7-.7L5.3 6L2.15 2.85a.5.5 0 0 1 0-.7Z"/></svg>
                </button>
                <h2 class="role-modal-title">{{ sceneModalMode === 'create' ? '自定义场景' : '场景设计' }}</h2>
                <div class="role-modal-content">
                  <div class="role-modal-image">
                    <img v-if="editingSceneForm.imageUrl" :src="assetUrl(editingSceneForm.imageUrl)" alt="" />
                    <div v-else class="role-modal-image-placeholder">
                      <svg width="34" height="34" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m1 18l6-8l4.5 6H19l-5-6.65l-2.5 3.3L10.25 11L14 6l9 12zm4-2h4l-2-2.675z"/></svg>
                      <button class="role-upload-btn" type="button" @click="openSceneImageUpload(editingSceneForm.id)">手动上传</button>
                      <button class="role-generate-btn" type="button" :disabled="!editingSceneForm.id || isPendingSceneImage(editingSceneForm.id)" @click="generateEditingSceneImage">
                        <Loader2 v-if="isPendingSceneImage(editingSceneForm.id)" :size="14" class="animate-spin" />
                        <span v-else>智能生成</span>
                      </button>
                    </div>
                  </div>
                  <form class="role-modal-form" @submit.prevent="saveSceneModal">
                    <label class="role-field">
                      <span>地点</span>
                      <input v-model="editingSceneForm.location" type="text" placeholder="请输入场景地点" />
                    </label>
                    <label class="role-field">
                      <span>时间</span>
                      <input v-model="editingSceneForm.time" type="text" placeholder="请输入时间段" />
                    </label>
                    <label class="role-field">
                      <span>场景描述</span>
                      <textarea v-model="editingSceneForm.prompt" rows="8" placeholder="请输入场景描述"></textarea>
                    </label>
                  </form>
                </div>
                <div class="role-modal-actions">
                  <button class="role-modal-text-btn" type="button" @click="closeSceneModal">取消</button>
                  <button class="role-modal-primary-btn" type="button" @click="saveSceneModal">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.55 18l-5.7-5.7l1.425-1.425L9.55 15.15l9.175-9.175L20.15 7.4z"/></svg>
                    确认
                  </button>
                </div>
              </section>
            </div>
          </Teleport>

          <!-- Sub: Dubbing -->
          <div v-if="prodTab === 'dubbing'" class="prod-content">
            <div class="prod-section-bar">
              <span class="dim" style="font-size:12px">{{ ttsEligibleCount }} 条可生成配音</span>
              <span class="tag mono">{{ ttsGeneratedCount }}/{{ ttsEligibleCount }} 已生成</span>
              <span class="tag">{{ lockedAudioConfigLabel }}</span>
              <div class="ml-auto flex gap-1">
                <button class="btn btn-sm" @click="batchShotTTS">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
                  批量生成
                </button>
              </div>
            </div>

            <div v-if="!ttsEligibleCount" class="step-empty" style="min-height:260px">
              <div class="empty-visual">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/></svg>
              </div>
              <div class="empty-title">当前没有可生成的配音</div>
              <div class="empty-desc">先在分镜里填写“角色名：台词”或“旁白：文案”，这里就会出现待生成的语音镜头。</div>
            </div>

            <div v-else class="dub-grid">
                <div v-for="(sb, i) in sbs.filter(hasDialogue)" :key="sb.id" class="card dub-card">
                  <div class="dub-head">
                    <div class="dub-copy">
                    <div class="dub-title">
                      <span class="frame-num">#{{ String(sb.storyboard_number || sb.storyboardNumber || i + 1).padStart(2, '0') }}</span>
                      <span class="frame-badge">{{ getDialogueSpeaker(sb) }}</span>
                    </div>
                    <div class="dub-desc">{{ getDialogueText(sb) || '未填写文本' }}</div>
                    </div>
                    <span class="tag" :class="hasTTS(sb) ? 'tag-success' : ''">{{ hasTTS(sb) ? '已生成' : '待生成' }}</span>
                  </div>
                <div class="dub-meta">
                  <span class="dim">{{ sb.shot_type || sb.shotType || '未设景别' }}</span>
                  <span class="dim">{{ sb.duration || 10 }}s</span>
                  <span class="dim">{{ sb.location || '未设地点' }}</span>
                </div>
                <div class="dub-foot">
                  <audio v-if="hasTTS(sb)" :src="'/' + getTTSUrl(sb)" controls preload="none" class="dub-audio" />
                  <div v-else class="dim" style="font-size:12px">尚未生成语音文件</div>
                  <button class="btn btn-sm ml-auto" @click="genShotTTS(sb)">生成配音</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Sub: Shots -->
          <div
            v-if="prodTab === 'shots' || prodTab === 'videos'"
            :class="['prod-content', 'shot-workbench', 'three-column-layout', 'shot-panel-container', { 'left-collapsed': shotLeftCollapsed, 'right-collapsed': shotRightCollapsed }]"
          >
            <aside :class="['shot-left-column', 'left-column', { 'is-collapsed': shotLeftCollapsed }]">
              <div v-if="!shotLeftCollapsed" class="shot-column-header column-header">
                <button class="action-btn secondary mini" type="button">分镜列表</button>
                <button class="legend-trigger" type="button" title="状态说明">
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-6h-2zm1-8q.425 0 .713-.288T13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9m0 13q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                </button>
              </div>
              <div v-if="!shotLeftCollapsed" class="shot-items column-content">
                <button
                  v-for="(sb, i) in sbs"
                  :key="sb.id"
                  :class="['shot-item', { active: selectedSb?.id === sb.id }]"
                  type="button"
                  @click="selectedSb = sb"
                >
                  <div class="shot-info">
                    <div class="shot-title-row">
                      <div class="shot-title">镜头{{ i + 1 }} {{ sb.title || storyboardShotTypeLabel(sb) }}</div>
                      <div class="shot-status-row">
                        <span v-if="hasImg(sb)" class="shot-status-dot ok"></span>
                        <span v-if="hasVid(sb)" class="shot-status-dot video"></span>
                        <span class="shot-duration">{{ Number(sb.duration || sb.durationSeconds || 4) }}s</span>
                      </div>
                    </div>
                    <div class="shot-action">{{ storyboardActionText(sb) || storyboardVisualText(sb) || '暂无动作描述' }}</div>
                  </div>
                </button>
              </div>
              <button
                class="collapse-toggle left-toggle"
                type="button"
                :title="shotLeftCollapsed ? '展开' : '收起'"
                :aria-expanded="String(!shotLeftCollapsed)"
                @click="shotLeftCollapsed = !shotLeftCollapsed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" :d="shotLeftCollapsed ? 'M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z' : 'm14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z'"/>
                </svg>
              </button>
            </aside>

            <main class="shot-middle-column middle-column">
              <div class="middle-tabs">
                <button :class="['middle-tab', { active: shotPreviewTab === 'preview' }]" type="button" @click="shotPreviewTab = 'preview'">媒体预览</button>
                <button :class="['middle-tab', { active: shotPreviewTab === 'editor' }]" type="button" @click="shotPreviewTab = 'editor'">视频编辑</button>
              </div>

              <template v-if="selectedShot">
                <div v-if="shotPreviewTab === 'preview'" class="media-preview-layout">
                  <div class="top-preview-area">
                    <div class="media-display-area">
                      <video
                        v-if="hasVid(selectedShot)"
                        :src="'/' + getVideoUrl(selectedShot)"
                        class="prod-video"
                        controls
                        preload="metadata"
                        playsinline
                      />
                      <img
                        v-else-if="hasImg(selectedShot)"
                        :src="'/' + getStoryboardCover(selectedShot)"
                        class="previewable-image"
                        @click.stop="openImageViewer('/' + getStoryboardCover(selectedShot), `${shotDisplayTitle(selectedShot)} 媒体预览`)"
                      />
                      <div v-else class="no-media-placeholder">
                        <div class="placeholder-content">
                          <svg width="48" height="48" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m4 4l2 4h3L7 4h2l2 4h3l-2-4h2l2 4h3l-2-4h3q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20H4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4m0 6v8h16v-8z"/></svg>
                          <h4>暂无场景媒体</h4>
                          <p>点击右侧“生成图片”按钮创建场景内容</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <section class="bottom-media-library">
                    <div class="media-library-container compact">
                      <div class="header">
                        <div class="header-title">分镜素材</div>
                      </div>
                      <div class="frame-rows">
                        <div v-for="row in shotAssetRows(selectedShot)" :key="row.key" :class="['frame-row', `row-${row.key}`]">
                          <div :class="['frame-tab', `tab-${row.key}`]">
                            <span class="asset-row-icon" v-html="row.icon"></span>
                            <span class="tab-label">{{ row.label }}</span>
                            <span class="tab-count">{{ row.items.length }}</span>
                          </div>
                          <div class="row-content">
                            <button
                              v-for="item in row.items"
                              :key="item.key"
                              class="media-item-compact"
                              type="button"
                              @click="item.kind === 'video' ? null : openImageViewer(item.url, item.title)"
                            >
                              <video v-if="item.kind === 'video'" :src="item.url" muted playsinline preload="metadata"></video>
                              <img v-else :src="item.url" alt="" />
                            </button>
                            <button v-if="row.key === 'other'" class="media-item-compact upload-item" type="button" @click="openShotReferenceUpload(selectedShot)">
                              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"/></svg>
                            </button>
                            <div v-if="!row.items.length && row.key !== 'other'" class="empty-inline">
                              <span v-if="row.key !== 'crop'">暂无</span>
                              <span v-else v-html="row.icon"></span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
                <div v-else class="video-editor-container">
                  <div class="editor-main">
                    <section class="editor-preview-panel">
                      <div class="editor-preview-screen">
                        <video
                          v-if="hasVid(selectedShot)"
                          :src="assetPathUrl(getVideoUrl(selectedShot))"
                          class="editor-preview-video"
                          controls
                          preload="metadata"
                          playsinline
                        />
                        <div v-else class="editor-preview-placeholder">
                          <svg width="54" height="54" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20zm0-2h12V6H4zm0 0V6z"/></svg>
                          <span>将场景拖到时间轴开始编辑</span>
                        </div>
                      </div>
                      <div class="editor-playback-controls">
                        <button class="editor-icon-btn" type="button" :disabled="!hasVid(selectedShot)" aria-label="播放">
                          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m9.5 16.5l7-4.5l-7-4.5zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                        </button>
                        <span class="editor-time-display">00:00 / {{ editorDurationLabel }}</span>
                        <button class="editor-icon-btn" type="button" aria-label="静音">
                          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m19.8 22.6l-3.025-3.025q-.625.4-1.325.688t-1.45.462v-2.05q.35-.125.688-.25t.637-.3L12 14.8V20l-5-5H3V9h3.2L1.4 4.2l1.4-1.4l18.4 18.4zm-.2-5.8l-1.45-1.45q.425-.775.638-1.625t.212-1.75q0-2.35-1.375-4.2T14 5.275v-2.05q3.1.7 5.05 3.138T21 11.975q0 1.325-.363 2.55T19.6 16.8M12 9.2L9.4 6.6L12 4z"/></svg>
                        </button>
                      </div>
                    </section>

                    <section class="editor-materials-panel">
                      <div class="editor-material-tabs">
                        <button :class="['editor-material-tab', { active: editorMaterialTab === 'video' }]" type="button" @click="editorMaterialTab = 'video'">
                          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m11.5 14.5l7-4.5l-7-4.5zM8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18z"/></svg>
                          <span>视频 ({{ editorVideoMaterials.length }})</span>
                        </button>
                        <button :class="['editor-material-tab', { active: editorMaterialTab === 'audio' }]" type="button" @click="editorMaterialTab = 'audio'">
                          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12.5 15q1.05 0 1.775-.725T15 12.5V7h3V5h-4v5.5q-.325-.25-.7-.375T12.5 10q-1.05 0-1.775.725T10 12.5t.725 1.775T12.5 15M8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18z"/></svg>
                          <span>音频 ({{ editorAudioMaterials.length }})</span>
                        </button>
                      </div>
                      <div class="editor-material-list">
                        <button
                          v-for="item in editorActiveMaterials"
                          :key="item.key"
                          class="editor-material-item"
                          type="button"
                        >
                          <span class="editor-material-thumb">
                            <video v-if="item.kind === 'video'" :src="item.url" muted playsinline preload="metadata"></video>
                            <svg v-else width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.175 19.825Q6 18.65 6 17t1.175-2.825T10 13q.575 0 1.063.138t.937.412V3h6v4h-4v10q0 1.65-1.175 2.825T10 21t-2.825-1.175"/></svg>
                          </span>
                          <span class="editor-material-info">
                            <strong>{{ item.title }}</strong>
                            <small>{{ item.meta }}</small>
                          </span>
                        </button>
                        <div v-if="!editorActiveMaterials.length" class="editor-empty-materials">
                          <svg width="42" height="42" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :d="editorMaterialTab === 'video' ? 'm11.5 14.5l7-4.5l-7-4.5zM8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm0-2h12V4H8zm-4 6q-.825 0-1.412-.587T2 20V6h2v14h14v2z' : 'M12.5 15q1.05 0 1.775-.725T15 12.5V7h3V5h-4v5.5q-.325-.25-.7-.375T12.5 10q-1.05 0-1.775.725T10 12.5t.725 1.775T12.5 15M8 18q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z'"/></svg>
                          <span>{{ editorMaterialTab === 'video' ? '暂无视频素材' : '暂无音频素材' }}</span>
                          <small>{{ editorMaterialTab === 'video' ? '从左侧媒体预览添加视频到素材库' : '生成配音后会出现在这里' }}</small>
                        </div>
                      </div>
                    </section>
                  </div>

                  <section class="editor-timeline-area">
                    <div class="timeline-controls-row">
                      <div class="timeline-zoom-control">
                        <button class="editor-icon-btn" type="button" aria-label="缩小">
                          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 13v-2h14v2z"/></svg>
                        </button>
                        <span>100%</span>
                        <button class="editor-icon-btn" type="button" aria-label="放大">
                          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 13H5v-2h6V5h2v6h6v2h-6v6h-2z"/></svg>
                        </button>
                      </div>
                      <button class="timeline-compose-btn" type="button" :disabled="!editorTimelineHasClips">
                        <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 16h2v-3h3v-2h-3V8H9v3H6v2h3zm-5 4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z"/></svg>
                        <span>合成</span>
                      </button>
                    </div>
                    <div class="timeline-workspace">
                      <div class="timeline-ruler-line"></div>
                      <div class="timeline-track video-track">
                        <div class="track-title">
                          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z"/></svg>
                          <span>视频轨道</span>
                        </div>
                        <div class="track-lane"></div>
                      </div>
                      <div class="timeline-track audio-track">
                        <div class="track-title">
                          <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7.175 19.825Q6 18.65 6 17t1.175-2.825T10 13q.575 0 1.063.138t.937.412V3h6v4h-4v10q0 1.65-1.175 2.825T10 21t-2.825-1.175"/></svg>
                          <span>音频轨道</span>
                        </div>
                        <div class="track-lane"></div>
                      </div>
                      <div class="timeline-playhead">
                        <span></span>
                      </div>
                    </div>
                    <div class="timeline-footer-row">
                      <span>总时长: {{ editorTimelineDurationLabel }}</span>
                      <span>{{ editorTimelineVideoCount }} 个视频片段 · {{ editorTimelineAudioCount }} 个音频</span>
                    </div>
                  </section>
                </div>
              </template>
            </main>

            <aside :class="['shot-right-column', 'right-column', { 'is-collapsed': shotRightCollapsed }]">
              <button
                class="collapse-toggle right-toggle"
                type="button"
                :title="shotRightCollapsed ? '展开' : '收起'"
                :aria-expanded="String(!shotRightCollapsed)"
                @click="shotRightCollapsed = !shotRightCollapsed"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="currentColor" :d="shotRightCollapsed ? 'm14 18l-6-6l6-6l1.4 1.4l-4.6 4.6l4.6 4.6z' : 'M12.6 12L8 7.4L9.4 6l6 6l-6 6L8 16.6z'"/>
                </svg>
              </button>
              <div v-if="!shotRightCollapsed" class="shot-tabs column-header">
                <button :class="['shot-tab', { active: shotWorkbenchTab === 'image' }]" type="button" @click="shotWorkbenchTab = 'image'">
                  镜头图片
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m10 17l5-5l-5-5"/></svg>
                </button>
                <button :class="['shot-tab', { active: shotWorkbenchTab === 'video' }]" type="button" @click="shotWorkbenchTab = 'video'">
                  视频生成
                  <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m10 17l5-5l-5-5"/></svg>
                </button>
              </div>

              <template v-if="selectedShot && !shotRightCollapsed">
                <div v-if="shotWorkbenchTab === 'image'" class="tab-content">
                  <section class="settings-section layout-display">
                    <div class="section-header">
                      <div class="section-title">背景图</div>
                      <div class="flex gap-2">
                        <button class="action-btn small info" type="button" @click="selectedShotScene ? editScene(selectedShotScene) : addScene()">
                          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m1 18l6-8l4.5 6h2.525l-3.775-5L14 6l9 12z"/></svg>
                          <span>选择</span>
                        </button>
                        <button class="action-btn small info" type="button" @click="selectedShotScene ? openSceneImageUpload(selectedShotScene.id) : addScene()">
                          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 16V7.85l-2.6 2.6L7 9l5-5l5 5l-1.4 1.45l-2.6-2.6V16zm-5 4q-.825 0-1.412-.587T4 18v-3h2v3h12v-3h2v3q0 .825-.587 1.413T18 20z"/></svg>
                          <span>替换</span>
                        </button>
                      </div>
                    </div>
                    <button v-if="selectedShotScene?.image_url || selectedShotScene?.imageUrl" class="layout-image" type="button" @click="openImageViewer(assetUrl(selectedShotScene.image_url || selectedShotScene.imageUrl), '场景背景')">
                      <img :src="assetUrl(selectedShotScene.image_url || selectedShotScene.imageUrl)" alt="" />
                    </button>
                    <button v-else class="empty-layout" type="button" @click="selectedShotScene ? genSceneImg(selectedShotScene.id) : addScene()">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m1 18l6-8l4.5 6h2.525l-3.775-5L14 6l9 12z"/></svg>
                      <span>选择场景背景</span>
                    </button>
                  </section>

                  <section class="settings-section compact">
                    <div class="section-header">
                      <span class="section-title">出场角色</span>
                      <button class="action-btn small info" type="button" @click="panel = 'script'; scriptStep = 4">
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3 21v-4.25L16.2 3.575q.3-.275.663-.425t.762-.15t.775.15t.65.45L20.425 5q.3.275.438.65T21 6.4q0 .4-.137.763t-.438.662L7.25 21z"/></svg>
                        <span>修改</span>
                      </button>
                    </div>
                    <div class="character-grid">
                      <div v-for="char in selectedShotCharacters" :key="char.id" class="character-item">
                        <span class="character-avatar">
                          <img v-if="char.image_url || char.imageUrl" :src="assetUrl(char.image_url || char.imageUrl)" alt="" />
                        </span>
                        <div class="character-name">{{ char.name }}</div>
                      </div>
                      <div v-if="!selectedShotCharacters.length" class="empty-inline">暂无</div>
                    </div>
                  </section>

                  <section class="settings-section compact">
                    <div class="section-title">图片模型</div>
                    <BaseSelect v-model="imageModel" :options="imageModelOptions" placeholder="图片模型" searchable class="model-select" />
                  </section>

                  <section class="settings-section compact">
                    <div class="section-title">镜头类型</div>
                    <div class="frame-generation-steps">
                      <button
                        v-for="mode in shotFrameModeOptions"
                        :key="mode.value"
                        :class="['step-item', { active: activeShotFrameMode === mode.value }]"
                        type="button"
                        @click="activeShotFrameMode = mode.value"
                      >
                        <div class="step-content">
                          <div class="step-title">{{ mode.label }}</div>
                          <div v-if="mode.desc" class="step-desc">{{ mode.desc }}</div>
                        </div>
                      </button>
                    </div>
                  </section>

                  <section v-if="showShotModeReferencePanel" class="settings-section compact">
                    <button class="shot-reference-panel" type="button" @click="openShotReferenceUpload(selectedShot)">
                      <div class="shot-reference-copy">
                        <div class="shot-reference-title">参考图</div>
                        <div class="shot-reference-desc">{{ shotModeReferenceText }}</div>
                      </div>
                      <div class="shot-reference-upload">
                        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>
                      </div>
                    </button>
                  </section>

                  <section v-if="activeShotFrameMode === 'action_sequence'" class="settings-section compact">
                    <div class="sequence-grid-setting">
                      <div class="section-title">序列分格数</div>
                      <div class="sequence-grid-options">
                        <button
                          v-for="count in [4, 6, 9]"
                          :key="count"
                          :class="['sequence-grid-option', { active: actionSequenceGridCount === count }]"
                          type="button"
                          @click="actionSequenceGridCount = count"
                        >
                          {{ count }}格
                        </button>
                      </div>
                    </div>
                    <div class="shot-mode-tip">
                      动作序列建议使用 nano-banana-pro 模型，效果更佳
                    </div>
                  </section>

                  <section class="settings-section compact">
                    <div class="section-header clickable" @click="shotPromptExpanded = !shotPromptExpanded">
                      <span class="section-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" :d="shotPromptExpanded ? 'm12 8.625l6 6l-1.4 1.4l-4.6-4.6l-4.6 4.6l-1.4-1.4z' : 'm12 15.375l-6-6l1.4-1.4l4.6 4.6l4.6-4.6l1.4 1.4z'"/></svg>
                        提示词编辑
                        <span class="prompt-status success">
                          <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m10.6 16.6l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                          已生成
                        </span>
                      </span>
                      <button class="action-btn mini info" type="button" @click.stop="refreshShotPrompt(selectedShot)">
                        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 20q-3.35 0-5.675-2.325T4 12t2.325-5.675T12 4q1.725 0 3.3.712T18 6.75V4h2v7h-7V9h4.2q-.8-1.4-2.187-2.2T12 6Q9.5 6 7.75 7.75T6 12t1.75 4.25T12 18q1.925 0 3.475-1.1T17.65 14h2.1q-.7 2.65-2.85 4.325T12 20"/></svg>
                        重新生成
                      </button>
                    </div>
                    <textarea
                      v-if="shotPromptExpanded"
                      class="frame-prompt-editor"
                      rows="7"
                      placeholder="点击右侧按钮自动生成提示词..."
                      :value="shotEditablePrompt(selectedShot)"
                      @blur="saveShotFramePrompt(selectedShot, $event.target.value)"
                    ></textarea>
                    <div v-if="shotPromptExpanded" class="hint-text">
                      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M11 17h2v-6h-2zm1.713-8.287Q13 8.425 13 8t-.288-.712T12 7t-.712.288T11 8t.288.713T12 9t.713-.288M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12t-.788 3.9t-2.137 3.175t-3.175 2.138T12 22"/></svg>
                      提示词决定图片效果，可手动编辑优化
                    </div>
                  </section>
                </div>

                <div v-else class="tab-content">
                  <section class="settings-section compact">
                    <div class="section-title">视频模型</div>
                    <div class="locked-model-display">{{ lockedVideoConfigLabel }}</div>
                  </section>
                  <section class="settings-section compact">
                    <div class="section-title">参考帧</div>
                    <div class="video-ref-grid">
                      <button v-if="getFirstFrame(selectedShot)" class="video-ref-thumb" type="button" @click="openImageViewer('/' + getFirstFrame(selectedShot), '首帧')">
                        <img :src="'/' + getFirstFrame(selectedShot)" alt="" />
                        <span>首帧</span>
                      </button>
                      <button v-if="getLastFrame(selectedShot)" class="video-ref-thumb" type="button" @click="openImageViewer('/' + getLastFrame(selectedShot), '尾帧')">
                        <img :src="'/' + getLastFrame(selectedShot)" alt="" />
                        <span>尾帧</span>
                      </button>
                      <div v-if="!getFirstFrame(selectedShot) && !getLastFrame(selectedShot)" class="empty-inline">请先生成镜头图片</div>
                    </div>
                  </section>
                  <section class="settings-section compact">
                    <div class="section-title">视频提示词</div>
                    <textarea
                      class="frame-prompt-editor"
                      rows="8"
                      :value="selectedShot.video_prompt || selectedShot.videoPrompt || storyboardActionText(selectedShot) || storyboardVisualText(selectedShot)"
                      @blur="saveShotVideoPrompt(selectedShot, $event.target.value)"
                    ></textarea>
                    <div v-if="videoFailMessage(selectedShot.id)" class="prod-error">{{ videoFailMessage(selectedShot.id) }}</div>
                  </section>
                </div>

                <div class="sticky-bottom-action">
                  <div v-if="shotWorkbenchTab === 'image'" class="sticky-btn-row">
                    <button class="action-btn primary-action compact flex-1" type="button" :disabled="isPendingShotFrame(selectedShot.id, activeFrameType)" @click="genShotFrame(selectedShot, activeFrameType)">
                      <Loader2 v-if="isPendingShotFrame(selectedShot.id, activeFrameType)" :size="16" class="animate-spin" />
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"/></svg>
                      <div class="btn-text-group">
                        <span class="btn-title">{{ isPendingShotFrame(selectedShot.id, activeFrameType) ? '生成中' : '生成图片' }}</span>
                        <span class="btn-desc">{{ activeFrameLabel }}</span>
                      </div>
                      <span class="cost-pill">40</span>
                    </button>
                    <button class="action-btn secondary-action compact flex-1" type="button" @click="batchShotFrames">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M9 14h10l-3.45-4.5l-2.3 3l-1.55-2zm-1 4q-.825 0-1.412-.587T6 16V4q0-.825.588-1.412T8 2h12q.825 0 1.413.588T22 4v12q0 .825-.587 1.413T20 18zm-4 4q-.825 0-1.412-.587T2 20V6h2v14h14v2z"/></svg>
                      <div class="btn-text-group">
                        <span class="btn-title">批量生成</span>
                        <span class="btn-desc">所有帧</span>
                      </div>
                      <span class="cost-pill">160</span>
                    </button>
                  </div>
                  <div v-else class="sticky-btn-row">
                    <button class="action-btn primary-action compact flex-1" type="button" :disabled="isPendingVideo(selectedShot.id)" @click="genVid(selectedShot)">
                      <Loader2 v-if="isPendingVideo(selectedShot.id)" :size="16" class="animate-spin" />
                      <svg v-else width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z"/></svg>
                      <div class="btn-text-group">
                        <span class="btn-title">{{ isPendingVideo(selectedShot.id) ? '生成中' : '生成视频' }}</span>
                        <span class="btn-desc">{{ Number(selectedShot.duration || selectedShot.durationSeconds || 5) }}s</span>
                      </div>
                    </button>
                    <button class="action-btn secondary-action compact flex-1" type="button" @click="batchVideos">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z"/></svg>
                      <div class="btn-text-group">
                        <span class="btn-title">批量视频</span>
                        <span class="btn-desc">所有镜头</span>
                      </div>
                    </button>
                  </div>
                </div>
              </template>
            </aside>

            <!-- Grid Tool Dialog -->
            <div v-if="gridDialog" class="overlay" @click.self="gridDialog = false">
              <div class="card grid-tool">
                <div class="grid-tool-head">
                  <span style="font-size:15px;font-weight:600;font-family:var(--font-display)">宫格图工具</span>
                  <button class="btn btn-ghost btn-icon ml-auto" @click="gridDialog = false">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>

                <!-- Step 0: Config -->
                <div v-if="gridStep === 0" class="grid-tool-body">
                  <div class="grid-mode-tabs">
                    <button v-for="m in gridModes" :key="m.id"
                      :class="['grid-mode-tab', { active: gridMode === m.id }]"
                      @click="gridMode = m.id; gridSelected = []; gridSingleTarget = null; gridAssignmentsState = []">
                      <span style="font-weight:600">{{ m.label }}</span>
                      <span class="dim" style="font-size:11px">{{ m.desc }}</span>
                    </button>
                  </div>

                  <div class="grid-config">
                    <label class="field" style="flex:0 0 auto" v-if="gridMode !== 'multi_ref'">
                      <span class="field-label">宫格</span>
                      <BaseSelect v-model="gridLayout" :options="gridLayoutOptions" placeholder="宫格" style="width:90px" />
                    </label>
                    <div class="field" style="flex:1">
                      <span class="field-label">
                        {{ gridMode === 'multi_ref' ? '选择目标镜头' : '选择镜头' }}
                        <span class="dim" v-if="gridMode !== 'multi_ref'">(已选 {{ gridSelected.length }})</span>
                      </span>
                    </div>
                    <div style="align-self:flex-end" v-if="gridMode !== 'multi_ref'">
                      <button class="btn btn-sm" @click="gridSelectAll">{{ gridSelected.length === sbs.length ? '取消全选' : '全选' }}</button>
                    </div>
                  </div>

                  <div class="grid-pick-list">
                    <label v-for="(sb, i) in sbs" :key="sb.id"
                      :class="['grid-pick-item', { selected: gridMode === 'multi_ref' ? gridSingleTarget === sb.id : gridSelected.includes(sb.id) }]">
                      <input v-if="gridMode === 'multi_ref'" type="radio" :value="sb.id" v-model="gridSingleTarget" name="grid-target" />
                      <input v-else type="checkbox" :value="sb.id" v-model="gridSelected" />
                      <span class="mono" style="font-size:11px;width:28px">#{{ String(i+1).padStart(2,'0') }}</span>
                      <span class="truncate" style="flex:1;font-size:12px">{{ sb.description || sb.title || '—' }}</span>
                    </label>
                  </div>

                  <div class="grid-tool-foot">
                    <span v-if="gridCanStart" class="tag mono">{{ gridAutoLayout.rows }}x{{ gridAutoLayout.cols }} = {{ gridAutoLayout.rows * gridAutoLayout.cols }}格</span>
                    <span class="dim" style="font-size:11px">{{ gridPromptLoading ? gridPromptStatus : gridSummary }}</span>
                    <button class="btn btn-primary ml-auto" :disabled="!gridCanStart || gridPromptLoading" @click="generateGridPrompt">
                      <Loader2 v-if="gridPromptLoading" :size="12" class="animate-spin" />
                      <svg v-else width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      {{ gridPromptLoading ? '生成中' : '生成提示词' }}
                    </button>
                  </div>
                </div>

                <!-- Step 1: Prompt Preview -->
                <div v-else-if="gridStep === 1" class="grid-tool-body">
                  <div class="grid-prompt-summary">
                    <div class="grid-prompt-label">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                      宫格图提示词
                      <span v-if="gridPromptSource" class="tag ml-8">{{ gridPromptSource === 'agent' ? 'AI生成' : '模板兜底' }}</span>
                    </div>
                    <div class="grid-prompt-text">{{ gridPromptText || '（等待生成）' }}</div>
                  </div>

                  <div class="grid-blank-preview" :style="gridBlankStyle">
                    <div v-for="(cell, i) in gridCellPrompts" :key="i" class="grid-blank-cell">
                      <div class="grid-blank-cell-index">#{{ cell.shot_number }} {{ {first_frame:'首帧',last_frame:'尾帧',reference:'参考'}[cell.frame_type] || '' }}</div>
                      <div class="grid-blank-cell-desc">{{ cell.prompt }}</div>
                    </div>
                    <div v-for="i in Math.max(0, (gridAutoLayout.rows * gridAutoLayout.cols) - gridCellPrompts.length)" :key="'empty-'+i" class="grid-blank-cell empty">
                      <div class="grid-blank-cell-index">空</div>
                      <div class="grid-blank-cell-desc">—</div>
                    </div>
                  </div>

                  <div class="grid-tool-foot">
                    <button class="btn" @click="gridStep = 0">上一步</button>
                    <button class="btn ml-auto" @click="generateGridPrompt" :disabled="gridPromptLoading">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                      重新生成
                    </button>
                    <button class="btn btn-primary" @click="startGridGen">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      生成宫格图
                    </button>
                  </div>
                </div>

                <!-- Step 2: Generating -->
                <div v-else-if="gridStep === 2" class="grid-tool-body" style="align-items:center;justify-content:center;min-height:300px">
                  <Loader2 :size="28" class="animate-spin" style="color:var(--accent)" />
                  <div class="loading-text" style="margin-top:12px">宫格图生成中...</div>
                  <div class="dim" style="font-size:11px;margin-top:6px">{{ gridStatusText }}</div>
                </div>

                <!-- Step 3: Preview -->
                <div v-else-if="gridStep === 3" class="grid-tool-body grid-tool-body-preview">
                  <div class="grid-preview-layout">
                    <div class="grid-preview-pane">
                      <div class="grid-preview-wrap">
                        <div class="grid-preview-stage">
                          <img
                            :src="'/' + gridImagePath"
                            class="grid-preview-img previewable-image"
                            @click.stop="openImageViewer('/' + gridImagePath, '宫格图预览')"
                          />
                          <div class="grid-overlay" :style="gridOverlayStyle">
                            <button
                              v-for="(a, i) in gridAssignments"
                              :key="i"
                              type="button"
                              :class="['grid-overlay-cell', activeGridCell === i && 'active']"
                              @click="focusGridCell(i)"
                            >
                              <span class="grid-cell-label">{{ gridCellLabel(a) }}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                      <div class="grid-adjust-summary">
                        <span class="tag mono">{{ gridActualLayout.rows }}x{{ gridActualLayout.cols }} = {{ gridActualLayout.rows * gridActualLayout.cols }}格</span>
                        <span class="dim" style="font-size:12px">{{ gridAssignedCount }}/{{ gridAssignments.length }} 格已分配</span>
                        <span class="tag" v-if="gridAssignedCount < gridAssignments.length">未分配格子会被忽略，不会写回分镜</span>
                      </div>
                    </div>
                    <div class="grid-assignment-pane">
                      <div class="grid-assign-head">
                        <div class="grid-assign-title">格子分配</div>
                        <div class="grid-assign-subtitle">切分后由你自己决定每格对应哪个分镜</div>
                      </div>
                      <div v-if="gridAssignmentTotalPages > 1" class="grid-assign-pagination">
                        <button class="btn btn-sm" :disabled="gridAssignmentPage === 0" @click="gridAssignmentPage--">上一页</button>
                        <span class="dim">第 {{ gridAssignmentPage + 1 }}/{{ gridAssignmentTotalPages }} 页</span>
                        <span class="dim">{{ gridAssignmentPageStart + 1 }}-{{ gridAssignmentPageEnd }} / {{ gridAssignments.length }}</span>
                        <button class="btn btn-sm ml-auto" :disabled="gridAssignmentPage >= gridAssignmentTotalPages - 1" @click="gridAssignmentPage++">下一页</button>
                      </div>
                      <div class="grid-assign-columns">
                        <span>格</span>
                        <span>镜头</span>
                        <span>类型</span>
                        <span>当前绑定</span>
                      </div>
                      <div class="grid-assign-info">
                        <div v-for="item in pagedGridAssignments" :key="item.index" :class="['grid-assign-row', activeGridCell === item.index && 'active']">
                          <span class="grid-assign-index">格{{ item.index + 1 }}</span>
                          <BaseSelect
                            :model-value="item.assignment.storyboard_id"
                            :options="gridAssignmentShotOptions"
                            placeholder="选择镜头"
                            @update:model-value="updateGridAssignment(item.index, 'storyboard_id', $event)"
                          />
                          <BaseSelect
                            :model-value="item.assignment.frame_type"
                            :options="gridFrameTypeOptions"
                            placeholder="帧类型"
                            style="width:100%"
                            @update:model-value="updateGridAssignment(item.index, 'frame_type', $event)"
                          />
                          <span class="grid-assign-bind">{{ gridCellTitle(item.assignment.storyboard_id) }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="grid-tool-foot">
                    <button class="btn" @click="gridStep = 1">返回</button>
                    <button class="btn btn-primary ml-auto" @click="doGridSplit">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                      切分并分配
                    </button>
                  </div>
                </div>

                <!-- Step 4: Done -->
                <div v-else-if="gridStep === 4" class="grid-tool-body" style="align-items:center;justify-content:center;min-height:200px">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <div style="font-size:17px;font-weight:700;font-family:var(--font-display);margin-top:8px">分配完成</div>
                  <div class="dim" style="font-size:13px;margin-top:4px">{{ gridAssignedCount }} 格已分配</div>
                  <button class="btn btn-primary" style="margin-top:16px" @click="gridDialog = false; refresh()">关闭</button>
                </div>
              </div>
            </div>
          </div>
          <!-- Sub: Compose -->
          <div v-if="prodTab === 'compose'" class="prod-content">
            <div class="prod-section-bar">
              <span class="dim" style="font-size:12px">{{ sbs.length }} 个镜头</span>
              <span class="tag mono">{{ composedCount }}/{{ sbs.length }} 已合成</span>
              <div class="ml-auto flex gap-1">
                <button class="btn btn-sm" @click="batchCompose">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  批量合成
                </button>
              </div>
            </div>
            <div class="prod-grid">
              <div v-for="(sb, i) in sbs" :key="sb.id" class="card prod-card">
                <div class="prod-cover">
                  <video
                    v-if="hasComposed(sb)"
                    :src="'/' + getComposedVideoUrl(sb)"
                    class="prod-video"
                    controls
                    preload="metadata"
                    playsinline
                  />
                  <video
                    v-else-if="hasVid(sb)"
                    :src="'/' + getVideoUrl(sb)"
                    class="prod-video"
                    controls
                    preload="metadata"
                    playsinline
                  />
                  <img
                    v-else-if="hasImg(sb)"
                    :src="'/' + getStoryboardCover(sb)"
                    class="previewable-image"
                    @click.stop="openImageViewer('/' + getStoryboardCover(sb), `镜头 #${String(i + 1).padStart(2, '0')} 参考图`)"
                  />
                  <div v-else class="prod-cover-empty">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  </div>
                  <span class="prod-idx">#{{ String(i+1).padStart(2,'0') }}</span>
                  <span v-if="hasComposed(sb)" class="prod-overlay-badge">已合成</span>
                </div>
                <div class="prod-info">
                  <div class="prod-desc truncate">{{ sb.description || sb.title || '—' }}</div>
                  <div class="prod-meta-line">{{ sb.shot_type || sb.shotType || '未设景别' }} · {{ sb.duration || 10 }}s</div>
                  <div class="prod-dots">
                    <span :class="['dot', hasVid(sb) && 'ok']" /><span style="font-size:10px">视频</span>
                    <span :class="['dot', hasTTS(sb) && 'ok']" /><span style="font-size:10px">配音</span>
                    <span :class="['dot', hasComposed(sb) && 'ok', isPendingCompose(sb.id) && 'pending']" /><span style="font-size:10px">{{ isPendingCompose(sb.id) ? '合成中' : '合成' }}</span>
                  </div>
                  <div v-if="composeFailMessage(sb.id)" class="prod-error">{{ composeFailMessage(sb.id) }}</div>
                </div>
                <div class="prod-actions">
                  <button class="btn btn-sm" :disabled="!hasVid(sb) || isPendingCompose(sb.id)" @click="doCompose(sb)">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                    {{ isPendingCompose(sb.id) ? '合成中' : (hasComposed(sb) ? '重新合成' : '开始合成') }}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Production Navigator -->
        </template>
      </div>

      <!-- ===== EXPORT PANEL ===== -->
      <div v-else class="content-panel">
        <div v-if="!sbs.length" class="step-empty" style="flex:1">
          <div class="empty-visual">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </div>
          <div class="empty-title">尚未准备就绪</div>
          <div class="empty-desc">请先完成分镜和制作流程</div>
          <button class="btn btn-primary" @click="panel = 'script'">前往剧本</button>
        </div>
        <div v-else class="export-split">
          <div class="export-main">
            <template v-if="mergeUrl">
              <video :src="'/' + mergeUrl" controls class="export-video" />
              <div class="export-bar">
                <span class="tag tag-success">拼接完成</span>
                <span class="dim" style="font-size:12px">{{ sbs.length }} 镜头 · {{ totalDuration }}s</span>
                <a :href="'/' + mergeUrl" download class="btn btn-primary ml-auto">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  下载视频
                </a>
              </div>
            </template>
            <template v-else>
              <div class="step-empty">
                <div class="empty-visual">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
                <div class="empty-title">拼接全集视频</div>
                <div class="empty-desc">将 {{ composedCount }} 个已合成镜头拼接为完整视频</div>
                <button class="btn btn-primary" :disabled="composedCount === 0" @click="doMerge" style="margin-top:12px">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
                  开始拼接
                </button>
              </div>
            </template>
          </div>
          <div class="export-list">
            <div class="export-list-head">镜头概览</div>
            <div class="export-list-body">
              <div v-for="(sb, i) in sbs" :key="sb.id" class="exp-row">
                <span class="mono dim" style="font-size:10px">#{{ String(i+1).padStart(2,'0') }}</span>
                <span class="truncate" style="flex:1;font-size:11px">{{ sb.description || sb.title || '—' }}</span>
                <span :class="['dot', hasComposed(sb) && 'ok']" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="imageViewer.open && imageViewer.src" class="image-viewer-overlay" @click.self="closeImageViewer">
        <div class="image-viewer-dialog">
          <div class="image-viewer-head">
            <div class="image-viewer-title">{{ imageViewer.title || '图片预览' }}</div>
            <button class="image-viewer-close" type="button" aria-label="关闭" @click="closeImageViewer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
          <div class="image-viewer-body">
            <img :src="imageViewer.src" :alt="imageViewer.title || '图片预览'" class="image-viewer-img" />
          </div>
        </div>
      </div>
      <Teleport to="body">
        <div v-if="extractResultDrawer" class="extract-drawer-backdrop" @click.self="extractResultDrawer = false">
          <section class="extract-drawer">
            <div class="extract-drawer-handle"></div>
            <div class="extract-drawer-head">
              <div>
                <div class="extract-summary-kicker">Extraction Result</div>
                <div class="extract-drawer-title">提取结果</div>
              </div>
              <div class="extract-drawer-stats">
                <span class="tag tag-accent">{{ chars.length }} 角色</span>
                <span class="tag tag-accent">{{ scenes.length }} 场景</span>
              </div>
              <button class="btn btn-ghost btn-sm ml-auto" type="button" @click="extractResultDrawer = false">关闭</button>
            </div>
            <div class="extract-drawer-body">
              <div class="extract-drawer-card">
                <div class="extract-card-head">角色</div>
                <div class="extract-drawer-list">
                  <div v-for="c in chars" :key="c.id" class="extract-row">
                    <div class="char-avatar">{{ c.name?.[0] || '?' }}</div>
                    <div class="extract-info">
                      <div class="extract-name-row">
                        <div class="extract-name">{{ c.name }}</div>
                        <span class="tag">{{ c.role || '角色' }}</span>
                      </div>
                      <div class="extract-meta wrap">{{ c.description || c.appearance || c.personality || '暂无描述' }}</div>
                    </div>
                  </div>
                  <div v-if="!chars.length" class="extract-drawer-empty">暂无角色结果</div>
                </div>
              </div>
              <div class="extract-drawer-card">
                <div class="extract-card-head">场景</div>
                <div class="extract-drawer-list">
                  <div v-for="s in scenes" :key="s.id" class="extract-row">
                    <div class="scene-icon">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    </div>
                    <div class="extract-info">
                      <div class="extract-name-row">
                        <div class="extract-name">{{ s.location }}</div>
                        <span v-if="s.time" class="tag">{{ s.time }}</span>
                      </div>
                      <div class="extract-meta wrap">{{ s.description || s.time || '等待补充场景描述' }}</div>
                    </div>
                  </div>
                  <div v-if="!scenes.length" class="extract-drawer-empty">暂无场景结果</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </Teleport>
      <Teleport to="body">
        <div v-if="taskModalOpen" class="task-modal-backdrop" @click.self="taskModalOpen = false">
          <section class="task-modal" role="dialog" aria-modal="true" aria-label="我的任务">
            <header class="task-modal-head">
              <h2>我的任务</h2>
              <button class="task-modal-close" type="button" aria-label="关闭" @click="taskModalOpen = false">
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="m18.3 5.71l-1.41-1.42L12 9.17L7.11 4.29L5.7 5.7l4.89 4.9l-4.89 4.89l1.41 1.42L12 12l4.89 4.91l1.41-1.42l-4.89-4.9z"/></svg>
              </button>
            </header>
            <div class="task-modal-body">
              <div class="task-filter-row">
                <BaseSelect v-model="taskFilters.category" :options="taskCategoryOptions" placeholder="任务大类" class="task-filter-select" />
                <BaseSelect v-model="taskFilters.status" :options="taskStatusOptions" placeholder="状态" class="task-filter-select status" />
                <button class="task-query-btn" type="button" @click="loadTasks">查询</button>
                <button class="task-reset-btn" type="button" @click="resetTaskFilters">重置</button>
                <span v-if="taskLoading" class="task-loading">刷新中...</span>
              </div>
              <div class="task-table-wrap">
                <table class="task-table">
                  <thead>
                    <tr>
                      <th>任务类型</th>
                      <th>关联对象</th>
                      <th>模型</th>
                      <th>项目</th>
                      <th>分集</th>
                      <th>状态</th>
                      <th>时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="task in taskItems" :key="task.id" :class="`task-row-${task.status}`">
                      <td>{{ task.taskCategoryLabel || '-' }}</td>
                      <td>{{ task.bizName || '-' }}</td>
                      <td>{{ task.aiModel || '-' }}</td>
                      <td>{{ task.projectName || '-' }}</td>
                      <td>{{ task.episodeTitle || '-' }}</td>
                      <td><span :class="['task-status-tag', task.status]">{{ task.statusLabel || task.status }}</span></td>
                      <td>{{ formatTaskTime(task.createdAt) }}</td>
                    </tr>
                    <tr v-if="!taskItems.length">
                      <td colspan="7" class="task-empty">暂无任务</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="task-modal-foot">
                <span>共 {{ taskTotal }} 条</span>
                <span class="task-foot-hint">打开窗口时会自动刷新进行中的任务</span>
              </div>
            </div>
          </section>
        </div>
      </Teleport>
    </main>
    </div>
  </div>
</template>

<script setup>
import { toast } from 'vue-sonner'
import {
  Download, FileText, FolderKanban, ImageIcon, Layers, MapPin, Mic2, Users, Video, Clapperboard,
} from 'lucide-vue-next'
import { dramaAPI, episodeAPI, storyboardAPI, characterAPI, sceneAPI, imageAPI, videoAPI, composeAPI, mergeAPI, gridAPI, aiModelAPI, voicesAPI, uploadAPI, taskAPI, authAPI, billingAPI, getAuthUser, subscribeCreditEvents, updateAuthUser } from '~/composables/useApi'
import { useAgent } from '~/composables/useAgent'
import BaseSelect from '~/components/BaseSelect.vue'
import { apimartMultimodalChatModels } from '~/utils/apimartModels'

const route = useRoute()
const dramaId = Number(route.params.id)
const episodeNumber = Number(route.params.episodeNumber)

const drama = ref(null), episode = ref(null), chars = ref([]), scenes = ref([]), sbs = ref([]), mergeData = ref(null)
const panel = ref('script')
const {
  running: rn,
  runningType: rt,
  taskProgress: agentTaskProgress,
  taskMessage: agentTaskMessage,
  taskStep: agentTaskStep,
  run: runAgent,
} = useAgent()

const localRaw = ref(''), localScript = ref('')
const isEditingRaw = ref(false)
const isEditingScript = ref(false)
const rawContent = computed(() => episode.value?.content || '')
const scriptContent = computed(() => episode.value?.script_content || episode.value?.scriptContent || '')
const epId = computed(() => episode.value?.id || 0)
const rawLen = computed(() => localRaw.value.replace(/\s/g, '').length || 0)
const scriptLen = computed(() => localScript.value.replace(/\s/g, '').length || 0)
const charsVoiced = computed(() => chars.value.filter(c => c.voice_style || c.voiceStyle).length)
const voiceSampleCount = computed(() => chars.value.filter(c => c.voice_sample_url || c.voiceSampleUrl).length)
const composedCount = computed(() => sbs.value.filter(s => s.composed_video_url || s.composedVideoUrl).length)
const mergeUrl = computed(() => mergeData.value?.merged_url || mergeData.value?.mergedUrl || null)

const scriptStep = ref(0)
const initialRouteResolved = ref(false)
const scriptModel = ref('gemini-3.1-pro-preview')
const dbTextModelOptions = ref([])
const dbImageModelOptions = ref([])
const fallbackScriptModelOptions = apimartMultimodalChatModels
const scriptModelOptions = computed(() => normalizeSelectableModelOptions(dbTextModelOptions.value.length ? dbTextModelOptions.value : fallbackScriptModelOptions))
const imageModel = ref('gemini-3-pro-image-preview')
const fallbackImageModelOptions = [
  { label: 'GPT-Image-2', value: 'gpt-image-2', group: 'APIMart' },
  { label: 'Nano-Banana-Pro', value: 'gemini-3-pro-image-preview', group: 'APIMart' },
]
const imageModelOptions = computed(() => normalizeSelectableModelOptions(dbImageModelOptions.value.length ? dbImageModelOptions.value : fallbackImageModelOptions))
const selectedScriptModelOption = computed(() => findSelectableModelOption(scriptModelOptions.value, scriptModel.value))
const selectedImageModelOption = computed(() => findSelectableModelOption(imageModelOptions.value, imageModel.value))
const roleAgeOptions = [
  { label: '婴儿', value: '婴儿' },
  { label: '幼儿', value: '幼儿' },
  { label: '儿童', value: '儿童' },
  { label: '青少年', value: '青少年' },
  { label: '青年', value: '青年' },
  { label: '成年', value: '成年' },
  { label: '中年', value: '中年' },
  { label: '年长者', value: '年长者' },
  { label: '老年', value: '老年' },
]
const roleGenderOptions = [
  { label: '男', value: '男' },
  { label: '女', value: '女' },
  { label: '其他', value: '其他' },
]
const roleModalOpen = ref(false)
const roleModalMode = ref('edit')
const editingRoleForm = ref({
  id: null,
  name: '',
  age: '',
  gender: '',
  role: '',
  description: '',
  appearance: '',
  personality: '',
  imageUrl: '',
})
const roleLibraryOpen = ref(false)
const roleLibrarySearch = ref('')
const roleLibraryItems = ref([])
const selectedLibraryCharacterId = ref(null)
const roleLibraryLoading = ref(false)
const roleLibraryApplying = ref(false)
const sceneLibraryOpen = ref(false)
const sceneLibrarySearch = ref('')
const sceneLibraryItems = ref([])
const selectedLibrarySceneId = ref(null)
const sceneLibraryLoading = ref(false)
const sceneLibraryApplying = ref(false)
const sceneModalOpen = ref(false)
const sceneModalMode = ref('edit')
const editingSceneForm = ref({
  id: null,
  location: '',
  time: '',
  prompt: '',
  imageUrl: '',
})
const extractResultDrawer = ref(false)
const extractInlineVisible = ref(false)
const extractProgress = ref(0)
let extractProgressTimer = null
const showInlineExtractResult = computed(() => extractInlineVisible.value || (chars.value.length > 0 && scriptStep.value <= 1))
const prodTab = ref('chars')
const prodTabIdx = computed({
  get: () => prodTabDefs.value.findIndex(t => t.id === prodTab.value),
  set: (v) => { prodTab.value = prodTabDefs.value[v]?.id || 'chars' },
})
const frameMode = ref('first')
const shotPreviewTab = ref('preview')
const shotWorkbenchTab = ref('image')
const editorMaterialTab = ref('video')
const activeShotFrameMode = ref('key_frame')
const shotPromptExpanded = ref(true)
const shotLeftCollapsed = ref(false)
const shotRightCollapsed = ref(false)
const actionSequenceGridCount = ref(9)
const shotFrameModeOptions = [
  { label: '关键帧', value: 'key_frame', desc: '可选参考' },
  { label: '首帧', value: 'first_frame' },
  { label: '尾帧', value: 'last_frame' },
  { label: '动作序列', value: 'action_sequence' },
]
const fallbackVoiceProfiles = [
  { id: 'alloy', label: 'Alloy', gender: '中性', traits: '平衡、自然、克制', suitable: '通用叙述、旁白、需要稳定输出的角色' },
  { id: 'echo', label: 'Echo', gender: '男声', traits: '低沉、稳重、冷静', suitable: '成熟男性、父辈、旁白、压迫感角色' },
  { id: 'fable', label: 'Fable', gender: '男声', traits: '温暖、讲述感、表现力强', suitable: '男主、成长型角色、叙事担当' },
  { id: 'onyx', label: 'Onyx', gender: '男声', traits: '深沉、有力、权威', suitable: '反派、强势角色、掌控型人物' },
  { id: 'nova', label: 'Nova', gender: '女声', traits: '温柔、甜润、亲和', suitable: '女主、母亲、柔和配角' },
  { id: 'shimmer', label: 'Shimmer', gender: '女声', traits: '明亮、活泼、年轻', suitable: '少女、轻快角色、跳脱配角' },
]
const voiceProfiles = ref(fallbackVoiceProfiles)
const voiceSelectOptions = computed(() => voiceProfiles.value.map(v => ({ label: `${v.label} · ${v.traits}`, value: v.id })))
const videoConfigSelectOptions = computed(() => videoConfigs.value.map(c => {
  const modelName = getConfigModelName(c)
  const provider = c.provider_name || c.provider || ''
  const label = modelName ? `${modelName} (${provider})` : `${c.name} (${provider})`
  return { label, value: c.id }
}))
const frameModeOptions = [{ label: '仅首帧', value: 'first' }, { label: '首尾帧', value: 'first_last' }]
const gridLayoutOptions = [
  { label: '2x2', value: '2x2' },
  { label: '3x3', value: '3x3' },
  { label: '4x4', value: '4x4' },
  { label: '5x5', value: '5x5' },
]
const imageConfigs = ref([])
const videoConfigs = ref([])
const audioConfigs = ref([])
const pendingCharImageIds = ref([])
const pendingCharImageTaskIds = ref({})
const batchCharImageRunning = ref(false)
const failedCharImageMessages = ref({})
const pendingSceneImageIds = ref([])
const pendingSceneImageTaskIds = ref({})
const batchSceneImageRunning = ref(false)
const failedSceneImageMessages = ref({})
const pendingShotFrameKeys = ref([])
const pendingVideoIds = ref([])
const pendingComposeIds = ref([])
const failedVideoMessages = ref({})
const failedComposeMessages = ref({})
const imageViewer = ref({ open: false, src: '', title: '' })
const assetUploadInput = ref(null)
const pendingAssetUpload = ref(null)
const pendingShotReferenceStoryboardId = ref(null)
const taskModalOpen = ref(false)
const taskLoading = ref(false)
const taskItems = ref([])
const taskTotal = ref(0)
const taskFilters = ref({ category: '', status: '' })
const taskPollTimer = ref(null)
const currentUser = ref(getAuthUser())
const billingStatus = ref(null)
let creditEventSource = null
const currentCredits = computed(() => Number(billingStatus.value?.credits ?? currentUser.value?.credits ?? 0))
const taskCategoryOptions = [
  { label: '文本提取', value: 'text' },
  { label: '图片生成', value: 'image' },
  { label: '视频生成', value: 'video' },
  { label: '语音生成', value: 'audio' },
  { label: '视频编辑', value: 'edit' },
]
const taskStatusOptions = [
  { label: '等待中', value: 'pending' },
  { label: '进行中', value: 'processing' },
  { label: '已完成', value: 'completed' },
  { label: '失败', value: 'failed' },
]
const activeTaskCount = computed(() => taskItems.value.filter(item => ['pending', 'processing'].includes(item.status)).length)

async function loadTasks() {
  taskLoading.value = true
  try {
    const res = await taskAPI.list({
      drama_id: dramaId,
      category: taskFilters.value.category,
      status: taskFilters.value.status,
      limit: 100,
    })
    taskItems.value = res.items || []
    taskTotal.value = res.total || taskItems.value.length
  } catch (err) {
    if (taskModalOpen.value) toast.error(err.message || '任务列表加载失败')
  } finally {
    taskLoading.value = false
  }
}

function openTaskModal() {
  taskModalOpen.value = true
  loadTasks()
}

function resetTaskFilters() {
  taskFilters.value = { category: '', status: '' }
  loadTasks()
}

function formatTaskTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 16)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function configLabel(config) {
  if (!config) return '未配置'
  const modelName = getConfigModelName(config)
  const provider = config.provider_name || config.provider || ''
  const name = config.name || config.label || modelName
  return modelName ? `${name} · ${modelName} (${provider})` : `${name} (${provider})`
}

function getConfigModelName(config) {
  if (!config) return ''
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

function selectableModelValue(config) {
  const base = String(config?.model_id || config?.value || config?.id || '')
  if (config?.user_provider_id) return `user:${config.user_provider_id}:${config.model_config_id || config.id || base}`
  if (config?.model_config_id || config?.id) return `platform:${config.model_config_id || config.id}:${base}`
  return base
}

function normalizeSelectableModelOption(config) {
  const modelId = config?.model_id || config?.value || ''
  return {
    ...config,
    model_id: modelId,
    value: selectableModelValue({ ...config, model_id: modelId }),
  }
}

function normalizeSelectableModelOptions(configs) {
  return Array.isArray(configs) ? configs.map(normalizeSelectableModelOption) : []
}

function findSelectableModelOption(options, value) {
  const target = String(value || '')
  return options.find(item => String(item.value || '') === target)
    || options.find(item => String(item.model_id || '') === target)
    || null
}

function isPendingCharImage(id) {
  return pendingCharImageIds.value.includes(id)
}

function clearPendingCharImage(id) {
  pendingCharImageIds.value = pendingCharImageIds.value.filter(item => item !== id)
  const next = { ...pendingCharImageTaskIds.value }
  delete next[id]
  pendingCharImageTaskIds.value = next
}

function setPendingCharImageTask(id, generationId) {
  if (!generationId) return
  pendingCharImageTaskIds.value = {
    ...pendingCharImageTaskIds.value,
    [id]: generationId,
  }
}

function clearFailedCharImage(id) {
  const next = { ...failedCharImageMessages.value }
  delete next[id]
  failedCharImageMessages.value = next
}

function isPendingSceneImage(id) {
  return pendingSceneImageIds.value.includes(id)
}

function clearPendingSceneImage(id) {
  pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => item !== id)
  const next = { ...pendingSceneImageTaskIds.value }
  delete next[id]
  pendingSceneImageTaskIds.value = next
}

function setPendingSceneImageTask(id, generationId) {
  if (!generationId) return
  pendingSceneImageTaskIds.value = {
    ...pendingSceneImageTaskIds.value,
    [id]: generationId,
  }
}

function clearFailedSceneImage(id) {
  const next = { ...failedSceneImageMessages.value }
  delete next[id]
  failedSceneImageMessages.value = next
}

function openImageViewer(src, title = '') {
  if (!src) return
  imageViewer.value = { open: true, src, title }
}

function closeImageViewer() {
  imageViewer.value = { open: false, src: '', title: '' }
}

function handleImageViewerKeydown(event) {
  if (event.key === 'Escape' && imageViewer.value.open) closeImageViewer()
}

onMounted(() => {
  window.addEventListener('keydown', handleImageViewerKeydown)
  loadTasks()
  loadCurrentCredits()
  connectCreditEvents()
  taskPollTimer.value = window.setInterval(() => {
    if (taskModalOpen.value || activeTaskCount.value) loadTasks()
  }, 5000)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleImageViewerKeydown)
  if (taskPollTimer.value) window.clearInterval(taskPollTimer.value)
  disconnectCreditEvents()
  stopExtractProgress()
})

function updateCurrentUser(user) {
  currentUser.value = {
    ...(currentUser.value || {}),
    ...(user || {}),
  }
  if (currentUser.value?.id) updateAuthUser(currentUser.value)
}

async function loadCurrentCredits() {
  if (!getAuthUser()?.id) {
    currentUser.value = null
    billingStatus.value = null
    return
  }
  try {
    const [user, status] = await Promise.all([
      authAPI.me(),
      billingAPI.membershipStatus(),
    ])
    if (user) updateCurrentUser(user)
    billingStatus.value = status || null
  } catch (err) {
    console.error('Failed to load current credits', err)
  }
}

function disconnectCreditEvents() {
  if (creditEventSource) {
    creditEventSource.close()
    creditEventSource = null
  }
}

function connectCreditEvents() {
  disconnectCreditEvents()
  if (!getAuthUser()?.id) return
  creditEventSource = subscribeCreditEvents((event) => {
    if (event?.type !== 'credits.changed') return
    billingStatus.value = {
      ...(billingStatus.value || {}),
      credits: event.credits,
    }
    currentUser.value = {
      ...(currentUser.value || {}),
      credits: event.credits,
    }
    if (currentUser.value?.id) updateAuthUser(currentUser.value)
  })
}

function framePendingKey(id, frameType) {
  return `${id}:${frameType}`
}

function isPendingShotFrame(id, frameType) {
  return pendingShotFrameKeys.value.includes(framePendingKey(id, frameType))
}

function isPendingVideo(id) {
  return pendingVideoIds.value.includes(id)
}

function videoFailMessage(id) {
  return failedVideoMessages.value[id] || ''
}

function isPendingCompose(id) {
  return pendingComposeIds.value.includes(id)
}

function composeFailMessage(id) {
  return failedComposeMessages.value[id] || ''
}

function isNarratorCharacter(char) {
  const text = `${char?.name || ''} ${char?.role || ''}`.toLowerCase()
  return text.includes('旁白') || text.includes('narrator') || text.includes('画外音')
}

const visualChars = computed(() => chars.value.filter(c => !isNarratorCharacter(c)))

function characterBrief(char) {
  const pieces = [char?.gender, char?.age, char?.role].filter(Boolean)
  if (pieces.length) return pieces.join('，')
  return char?.role || '角色'
}

function sceneTitle(scene) {
  return `${scene?.location || '未命名场景'}${scene?.time ? '-' + scene.time : ''}`
}

function scenePromptSummary(scene) {
  return scene?.prompt || scene?.description || '暂无场景描述'
}

function assetUrl(path) {
  if (!path) return ''
  const value = String(path)
  if (/^(https?:|data:|blob:)/i.test(value)) return value
  return value.startsWith('/') ? value : `/${value}`
}

const lockedImageConfigId = computed(() => episode.value?.image_config_id || episode.value?.imageConfigId || null)
const lockedVideoConfigId = computed(() => episode.value?.video_config_id || episode.value?.videoConfigId || null)
const lockedAudioConfigId = computed(() => episode.value?.audio_config_id || episode.value?.audioConfigId || null)
const lockedAudioProvider = computed(() => audioConfigs.value.find(c => c.id === lockedAudioConfigId.value)?.provider || '')
const lockedImageConfigLabel = computed(() => configLabel(imageConfigs.value.find(c => c.id === lockedImageConfigId.value)))
const lockedVideoConfigLabel = computed(() => configLabel(videoConfigs.value.find(c => c.id === lockedVideoConfigId.value)))
const lockedAudioConfigLabel = computed(() => configLabel(audioConfigs.value.find(c => c.id === lockedAudioConfigId.value)))
// Grid tool state
const gridDialog = ref(false)
const gridStep = ref(0)
const gridLayout = ref('3x3')
const gridMode = ref('first_frame')
const gridSelected = ref([])
const gridSingleTarget = ref(null)
const gridGenId = ref(null)
const gridImagePath = ref('')
const gridStatusText = ref('')
const gridActualLayout = ref({ rows: 3, cols: 3 })
const gridRecoveredAt = ref('')
const gridRecoveredMode = ref('')
const gridPromptText = ref('')
const gridCellPrompts = ref([])
const gridPromptSource = ref('')
const gridPromptLoading = ref(false)
const gridPromptStatus = ref('')
const gridAssignmentsState = ref([])
const gridActiveShotIds = ref([])
const gridHistory = ref([])
const showAllGridHistory = ref(false)
const activeGridCell = ref(0)
const gridAssignmentPage = ref(0)
const gridStorageKey = computed(() => `huobao:grid:${dramaId}:${epId.value || episodeNumber}`)

const gridModes = [
  { id: 'first_frame', label: '首帧', desc: '每格=一个镜头的首帧' },
  { id: 'first_last', label: '首尾帧', desc: '每镜头占一行：左首帧，右尾帧' },
  { id: 'multi_ref', label: '多参考', desc: '所有格子=同一镜头的参考图' },
]

const gridLayoutShape = computed(() => {
  const [rows, cols] = String(gridLayout.value || '3x3').split('x').map(Number)
  return {
    rows: rows || 3,
    cols: cols || 3,
  }
})
const gridTotalCells = computed(() => {
  return gridLayoutShape.value.rows * gridLayoutShape.value.cols
})

const gridCanStart = computed(() => {
  if (gridMode.value === 'multi_ref') return !!gridSingleTarget.value
  return gridSelected.value.length > 0
})

const gridSummary = computed(() => {
  if (gridMode.value === 'multi_ref') {
    const idx = sbs.value.findIndex(s => s.id === gridSingleTarget.value) + 1
    return gridSingleTarget.value ? `${gridLayoutShape.value.rows}x${gridLayoutShape.value.cols} 参考图 → 镜头 #${idx}` : '请选择一个镜头'
  }
  if (!gridSelected.value.length) return '请选择镜头'
  const count = gridSelected.value.length
  if (gridMode.value === 'first_last') {
    const { rows, cols } = gridLayoutShape.value
    return `${count} 个镜头 → ${rows}x${cols} 宫格（按首尾帧风格生成，切分后再手动分配）`
  }
  const { rows, cols } = gridLayoutShape.value
  const cells = rows * cols
  return `${count} 个镜头 → ${rows}x${cols} 宫格（先生成宫格图，切分后再手动分配）`
})

function createGridAssignments() {
  return Array.from({ length: gridActualLayout.value.rows * gridActualLayout.value.cols }, () => ({
    storyboard_id: null,
    frame_type: 'first_frame',
  }))
}

const gridAssignments = computed(() => gridAssignmentsState.value)
const gridAssignableShotIds = computed(() => {
  const assignedIds = [...new Set(gridAssignments.value.map(item => item?.storyboard_id).filter(Boolean))]
  const ids = Array.isArray(gridActiveShotIds.value) && gridActiveShotIds.value.length
    ? gridActiveShotIds.value
    : assignedIds.length
      ? assignedIds
    : gridMode.value === 'multi_ref'
      ? (gridSingleTarget.value ? [gridSingleTarget.value] : [])
      : gridSelected.value.length
        ? [...gridSelected.value]
        : sbs.value.map(s => s.id)
  return ids.filter(id => sbs.value.some(s => s.id === id))
})
const gridAssignmentShotOptions = computed(() => [
  { label: '未分配', value: null },
  ...gridAssignableShotIds.value.map((id) => {
    const index = sbs.value.findIndex(s => s.id === id) + 1
    const sb = sbs.value.find(s => s.id === id)
    return {
      label: `#${String(index).padStart(2, '0')} ${sb?.title || sb?.description || '镜头'}`,
      value: id,
    }
  }),
])
const gridFrameTypeOptions = computed(() => {
  return [
    { label: '首帧', value: 'first_frame' },
    { label: '尾帧', value: 'last_frame' },
    { label: '参考图', value: 'reference' },
  ]
})
const gridAssignedCount = computed(() => gridAssignments.value.filter(item => !!item.storyboard_id).length)
const gridAssignmentPageSize = computed(() => {
  if (gridAssignments.value.length >= 25) return 8
  if (gridAssignments.value.length >= 16) return 10
  if (gridAssignments.value.length >= 9) return 9
  return Math.max(1, gridAssignments.value.length || 1)
})
const gridAssignmentTotalPages = computed(() => Math.max(1, Math.ceil(gridAssignments.value.length / gridAssignmentPageSize.value)))
const gridAssignmentPageStart = computed(() => gridAssignmentPage.value * gridAssignmentPageSize.value)
const gridAssignmentPageEnd = computed(() => Math.min(gridAssignments.value.length, gridAssignmentPageStart.value + gridAssignmentPageSize.value))
const pagedGridAssignments = computed(() => {
  return gridAssignments.value
    .slice(gridAssignmentPageStart.value, gridAssignmentPageEnd.value)
    .map((assignment, offset) => ({
      assignment,
      index: gridAssignmentPageStart.value + offset,
    }))
})

function resetGridAssignments() {
  gridAssignmentsState.value = createGridAssignments()
  activeGridCell.value = 0
  gridAssignmentPage.value = 0
}

function gridCellLabel(a) {
  if (!a?.storyboard_id) return '未分配'
  const idx = sbs.value.findIndex(s => s.id === a.storyboard_id) + 1
  const suffix = { first_frame: '首', last_frame: '尾', reference: '参' }[a.frame_type] || ''
  return `#${idx}${suffix ? ` ${suffix}` : ''}`
}

function gridCellTitle(id) {
  if (!id) return '未分配'
  const idx = sbs.value.findIndex(s => s.id === id) + 1
  const sb = sbs.value.find(s => s.id === id)
  return `#${String(idx).padStart(2, '0')} ${sb?.title || sb?.description || '镜头'}`
}

function updateGridAssignment(index, field, value) {
  const next = [...gridAssignmentsState.value]
  next[index] = { ...next[index], [field]: value }
  gridAssignmentsState.value = next
  activeGridCell.value = index
  if (gridImagePath.value) persistGridImagePath(gridImagePath.value)
}

function focusGridCell(index) {
  activeGridCell.value = index
  gridAssignmentPage.value = Math.floor(index / gridAssignmentPageSize.value)
}

const gridOverlayStyle = computed(() => {
  const { rows, cols } = gridActualLayout.value
  return { 'grid-template-columns': `repeat(${cols}, 1fr)`, 'grid-template-rows': `repeat(${rows}, 1fr)` }
})

const gridAutoLayout = computed(() => {
  return gridLayoutShape.value
})

const gridBlankStyle = computed(() => {
  const { rows, cols } = gridAutoLayout.value
  return { 'grid-template-columns': `repeat(${cols}, 1fr)`, 'grid-template-rows': `repeat(${rows}, 1fr)` }
})

// Production step helpers
function prodStepDone(id) {
  if (id === 'chars') return !visualCharTotal.value || charImgCount.value === visualCharTotal.value
  if (id === 'scenes') return !!scenes.value.length && sceneImgCount.value === scenes.value.length
  if (id === 'dubbing') return !!sbs.value.length && (!ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value)
  if (id === 'shots') return !!sbs.value.length && shotImgCount.value === sbs.value.length
  if (id === 'videos') return !!sbs.value.length && shotVidCount.value === sbs.value.length
  if (id === 'compose') return !!sbs.value.length && composedCount.value === sbs.value.length
  return false
}
const canExport = computed(() => !!sbs.value.length && composedCount.value === sbs.value.length)
function goNextProd() {
  const flow = ['chars', 'scenes', 'shots', 'videos', 'compose']
  const currentIndex = flow.indexOf(prodTab.value)
  if (currentIndex >= 0 && currentIndex < flow.length - 1) {
    prodTab.value = flow[currentIndex + 1]
    if (prodTab.value === 'shots') shotWorkbenchTab.value = 'image'
    if (prodTab.value === 'videos') shotWorkbenchTab.value = 'video'
  } else {
    panel.value = 'export'
  }
}

// Script step navigation
const stepLabels = ['原始内容', 'AI 改写', '', '音色', '分镜']
const prevStepLabel = computed(() => scriptStep.value > 0 ? stepLabels[scriptStep.value - 1] : '')
const nextStepLabel = computed(() => {
  if (scriptStep.value === 4) return '进入制作'
  return stepLabels[scriptStep.value + 1] || ''
})
const canGoNext = computed(() => {
  if (scriptStep.value === 0) return !!localRaw.value.trim()
  if (scriptStep.value === 1) return !!localScript.value.trim() || !!scriptContent.value
  if (scriptStep.value === 3) return charsVoiced.value > 0
  if (scriptStep.value === 4) return sbs.value.length > 0
  return false
})
function goPrevStep() { if (scriptStep.value > 0) scriptStep.value-- }
function goNextStep() {
  if (scriptStep.value === 0 && localRaw.value.trim()) { saveRaw() }
  if (scriptStep.value === 1 && localScript.value.trim()) { saveScr() }
  if (scriptStep.value === 1) {
    if (chars.value.length) {
      panel.value = 'production'
      prodTab.value = 'chars'
    } else {
      startExtractToCharacters()
    }
    return
  }
  if (scriptStep.value === 4) {
    panel.value = 'production'
    prodTab.value = 'shots'
    shotWorkbenchTab.value = 'image'
    return
  }
  if (canGoNext.value) scriptStep.value++
}

function gridSelectAll() {
  if (gridSelected.value.length === sbs.value.length) gridSelected.value = []
  else gridSelected.value = sbs.value.map(s => s.id)
}

function openGridTool() {
  gridStep.value = 0
  gridSelected.value = []
  gridSingleTarget.value = null
  gridActiveShotIds.value = []
  gridPromptText.value = ''
  gridCellPrompts.value = []
  gridPromptSource.value = ''
  gridPromptStatus.value = ''
  gridAssignmentsState.value = []
  gridDialog.value = true
}

function persistGridImagePath(value) {
  if (typeof window === 'undefined') return
  if (!value) {
    window.localStorage.removeItem(gridStorageKey.value)
    return
  }
  const current = restoreGridState() || {}
  const entries = current.entries || {}
  entries[value] = {
    generationId: gridGenId.value,
    layout: gridActualLayout.value,
    shotIds: gridActiveShotIds.value,
    assignments: gridAssignmentsState.value,
    recoveredAt: gridRecoveredAt.value,
    recoveredMode: gridRecoveredMode.value,
  }
  const payload = {
    activeImagePath: value,
    entries,
  }
  window.localStorage.setItem(gridStorageKey.value, JSON.stringify(payload))
}

function restoreGridState() {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(gridStorageKey.value)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { activeImagePath: raw, entries: { [raw]: {} } }
  }
}

function applyGridState(imagePath, meta = {}) {
  gridImagePath.value = imagePath || ''
  gridGenId.value = meta.generationId || meta.id || null
  if (meta.layout?.rows && meta.layout?.cols) gridActualLayout.value = meta.layout
  if (Array.isArray(meta.shotIds)) gridActiveShotIds.value = meta.shotIds
  else gridActiveShotIds.value = []
  if (Array.isArray(meta.assignments)) gridAssignmentsState.value = meta.assignments
  else gridAssignmentsState.value = []
  gridRecoveredAt.value = meta.recoveredAt || meta.createdAtLabel || ''
  gridRecoveredMode.value = meta.recoveredMode || meta.modeLabel || ''
}

function selectGridHistory(item) {
  const cached = restoreGridState()
  const cachedEntry = cached?.entries?.[item.localPath] || {}
  applyGridState(item.localPath, {
    ...item,
    ...cachedEntry,
    generationId: cachedEntry.generationId || item.id,
    recoveredAt: cachedEntry.recoveredAt || item.createdAtLabel,
    recoveredMode: cachedEntry.recoveredMode || item.modeLabel,
  })
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  persistGridImagePath(item.localPath)
}

function reopenGridPreview() {
  if (!gridImagePath.value) {
    openGridTool()
    return
  }
  gridDialog.value = true
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridStep.value = 3
}

function parseGridLayoutFromFrameType(value) {
  const match = String(value || '').match(/grid_[^_]+_(\d+)x(\d+)$/)
  if (!match) return null
  return { rows: Number(match[1]) || 3, cols: Number(match[2]) || 3 }
}

function continueGridSplit() {
  if (!gridImagePath.value) {
    toast.warning('还没有可继续切割的宫格图')
    return
  }
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridDialog.value = true
  gridStep.value = 3
}

function getGridPromptShotIds() {
  if (gridMode.value === 'multi_ref') return gridSingleTarget.value ? [gridSingleTarget.value] : []
  if (gridMode.value === 'first_last') return [...gridSelected.value]
  return gridSelected.value.slice(0, gridTotalCells.value)
}

async function generateGridPrompt() {
  if (!gridCanStart.value) {
    toast.warning('请先选择镜头')
    return
  }
  gridPromptLoading.value = true
  gridPromptStatus.value = '正在调用 AI 生成宫格提示词...'
  gridPromptText.value = ''
  gridCellPrompts.value = []
  gridPromptSource.value = ''
  try {
    const shotIds = getGridPromptShotIds()
    const { rows, cols } = gridAutoLayout.value

    const res = await gridAPI.prompt({
      storyboard_ids: shotIds,
      drama_id: dramaId,
      episode_id: epId.value,
      rows,
      cols,
      mode: gridMode.value,
    })

    gridPromptText.value = res?.grid_prompt || ''
    gridCellPrompts.value = Array.isArray(res?.cell_prompts) ? res.cell_prompts : []
    gridPromptSource.value = res?.source || ''

    if (gridPromptText.value) {
      resetGridAssignments()
      gridPromptStatus.value = gridPromptSource.value === 'agent' ? 'AI 提示词已生成' : '已使用模板提示词'
      gridStep.value = 1
    } else {
      gridPromptStatus.value = ''
      toast.error('提示词生成失败')
    }
  } catch (e) {
    gridPromptStatus.value = ''
    toast.error(e?.message || '生成提示词失败')
  } finally {
    gridPromptLoading.value = false
  }
}

async function startGridGen() {
  let rows, cols, ids
  if (gridMode.value === 'multi_ref') {
    rows = gridAutoLayout.value.rows; cols = gridAutoLayout.value.cols; ids = [gridSingleTarget.value]
  } else {
    rows = gridAutoLayout.value.rows; cols = gridAutoLayout.value.cols; ids = gridSelected.value.slice(0, gridTotalCells.value)
    if (gridMode.value === 'first_last') ids = [...gridSelected.value]
  }
  gridActiveShotIds.value = ids.filter(Boolean)
  gridActualLayout.value = { rows, cols }
  if (!gridAssignmentsState.value.length) resetGridAssignments()
  gridStep.value = 2
  gridStatusText.value = '提交生成请求...'
  try {
    const res = await gridAPI.generate({
      storyboard_ids: ids,
      drama_id: dramaId,
      rows,
      cols,
      mode: gridMode.value,
      custom_prompt: gridPromptText.value || undefined,
    })
    gridGenId.value = res.image_generation_id
    gridActualLayout.value = res.grid || { rows, cols }
    gridStatusText.value = '等待图片生成...'
    pollGridStatus()
  } catch (e) {
    toast.error(e.message)
    gridStep.value = 0
  }
}

async function pollGridStatus() {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 3000))
    try {
      const res = await gridAPI.status(gridGenId.value)
      gridStatusText.value = `状态: ${res.status}`
      if (res.status === 'completed' && res.local_path) {
        gridImagePath.value = res.local_path
        gridGenId.value = gridGenId.value || res.id || null
        persistGridImagePath(res.local_path)
        gridStep.value = 3
        return
      }
      if (res.status === 'failed') {
        toast.error(res.error_msg || '生成失败')
        gridStep.value = 0
        return
      }
    } catch {}
  }
  toast.error('生成超时'); gridStep.value = 0
}

async function loadLatestGridImage() {
  try {
    const rows = await imageAPI.list({ drama_id: dramaId })
    const list = Array.isArray(rows) ? rows : []
    const grids = list
      .filter((row) => row?.status === 'completed' && String(row?.frame_type || row?.frameType || '').startsWith('grid_') && (row?.local_path || row?.localPath))
      .sort((a, b) => Number(b?.id || 0) - Number(a?.id || 0))
      .map((row) => {
        const frameType = String(row?.frame_type || row?.frameType || '')
        const parsedLayout = parseGridLayoutFromFrameType(frameType) || { rows: 3, cols: 3 }
        return {
          id: row.id,
          localPath: row?.local_path || row?.localPath || '',
          layout: parsedLayout,
          modeLabel: frameType.replace(/^grid_/, '').replace(/_/g, ' · '),
          createdAtLabel: row?.created_at || row?.createdAt || '',
        }
      })

    gridHistory.value = grids

    const cached = restoreGridState()
    const preferredPath = cached?.activeImagePath && grids.some(item => item.localPath === cached.activeImagePath)
      ? cached.activeImagePath
      : grids[0]?.localPath
    const current = grids.find(item => item.localPath === preferredPath)
    if (current) {
      const cachedEntry = cached?.entries?.[current.localPath] || {}
      applyGridState(current.localPath, {
        ...current,
        ...cachedEntry,
        generationId: cachedEntry.generationId || current.id,
        recoveredAt: cachedEntry.recoveredAt || current.createdAtLabel,
        recoveredMode: cachedEntry.recoveredMode || current.modeLabel,
      })
      if (!gridAssignmentsState.value.length) resetGridAssignments()
      persistGridImagePath(current.localPath)
      return
    }
  } catch {}

  const cached = restoreGridState()
  if (cached?.activeImagePath) {
    const cachedEntry = cached?.entries?.[cached.activeImagePath] || {}
    applyGridState(cached.activeImagePath, {
      ...cachedEntry,
      recoveredAt: cachedEntry.recoveredAt || '',
      recoveredMode: cachedEntry.recoveredMode || '',
    })
  }
}

async function syncPendingImageTasks() {
  const charEntries = Object.entries(pendingCharImageTaskIds.value || {})
  const sceneEntries = Object.entries(pendingSceneImageTaskIds.value || {})
  if (!charEntries.length && !sceneEntries.length) return

  let records = []
  try {
    records = await imageAPI.list({ drama_id: dramaId })
  } catch {
    return
  }

  const recordMap = new Map(records.map(item => [Number(item.id), item]))
  for (const [characterId, generationId] of charEntries) {
    const char = chars.value.find(c => Number(c.id) === Number(characterId))
    const record = recordMap.get(Number(generationId))
    if (char?.image_url || char?.imageUrl || record?.status === 'completed') {
      clearPendingCharImage(Number(characterId))
    } else if (record?.status === 'failed') {
      clearPendingCharImage(Number(characterId))
      failedCharImageMessages.value = {
        ...failedCharImageMessages.value,
        [characterId]: record.error_msg || record.errorMsg || '生成失败',
      }
    }
  }

  for (const [sceneId, generationId] of sceneEntries) {
    const scene = scenes.value.find(s => Number(s.id) === Number(sceneId))
    const record = recordMap.get(Number(generationId))
    if (scene?.image_url || scene?.imageUrl || record?.status === 'completed') {
      clearPendingSceneImage(Number(sceneId))
    } else if (record?.status === 'failed') {
      clearPendingSceneImage(Number(sceneId))
      failedSceneImageMessages.value = {
        ...failedSceneImageMessages.value,
        [sceneId]: record.error_msg || record.errorMsg || '生成失败',
      }
    }
  }
}

async function doGridSplit() {
  const { rows, cols } = gridActualLayout.value
  try {
    const assignments = gridAssignments.value
      .filter(item => !!item.storyboard_id)
      .map(item => ({ storyboard_id: item.storyboard_id, frame_type: item.frame_type }))
    if (!assignments.length) {
      toast.warning('请至少分配一个格子')
      return
    }
    await gridAPI.split({ image_generation_id: gridGenId.value, rows, cols, assignments })
    persistGridImagePath(gridImagePath.value)
    gridStep.value = 4
    toast.success('切分分配完成')
  } catch (e) {
    toast.error(e.message)
  }
}

const charImgCount = computed(() => visualChars.value.filter(c => c.image_url || c.imageUrl).length)
const sceneImgCount = computed(() => scenes.value.filter(s => s.image_url || s.imageUrl).length)
const ttsEligibleCount = computed(() => sbs.value.filter(s => hasDialogue(s)).length)
const ttsGeneratedCount = computed(() => sbs.value.filter(s => hasDialogue(s) && hasTTS(s)).length)
const shotImgCount = computed(() => sbs.value.filter(s => s.first_frame_image || s.firstFrameImage || s.last_frame_image || s.lastFrameImage || s.composed_image || s.composedImage).length)
const shotVidCount = computed(() => sbs.value.filter(s => s.video_url || s.videoUrl).length)
const visualCharTotal = computed(() => visualChars.value.length)

const prodTabDefs = computed(() => [
  { id: 'chars', label: '角色形象', icon: Users, badge: visualCharTotal.value ? `${charImgCount.value}/${visualCharTotal.value}` : '' },
  { id: 'scenes', label: '场景图片', icon: MapPin, badge: sceneImgCount.value ? `${sceneImgCount.value}/${scenes.value.length}` : '' },
  { id: 'dubbing', label: '配音生成', icon: Mic2, badge: '' },
  { id: 'shots', label: '镜头图片', icon: ImageIcon, badge: shotImgCount.value ? `${shotImgCount.value}/${sbs.value.length}` : '' },
  { id: 'videos', label: '视频生成', icon: Video, badge: shotVidCount.value ? `${shotVidCount.value}/${sbs.value.length}` : '' },
  { id: 'compose', label: '视频合成', icon: Layers, badge: composedCount.value ? `${composedCount.value}/${sbs.value.length}` : '' },
])

const mainStageDefs = [
  { id: 'script', label: '剧本', desc: '内容改写与整理', icon: FileText },
  { id: 'assets', label: '资产', desc: '角色、场景与音色', icon: FolderKanban },
  { id: 'storyboard', label: '分镜', desc: '镜头制作与合成', icon: Clapperboard },
  { id: 'export', label: '导出', desc: '拼接与成片输出', icon: Download },
]

const flowStepDefs = [
  { id: 'script', label: '剧本' },
  { id: 'characters', label: '角色' },
  { id: 'scenes', label: '场景' },
  { id: 'storyboard', label: '分镜' },
  { id: 'production', label: '制作' },
  { id: 'export', label: '作品' },
]

function isFlowStepDone(id) {
  if (id === 'script') return !!(rawContent.value || scriptContent.value)
  if (id === 'characters') return chars.value.length > 0
  if (id === 'scenes') return scenes.value.length > 0 && sceneImgCount.value === scenes.value.length
  if (id === 'storyboard') return !!sbs.value.length
  if (id === 'production') return !!sbs.value.length && composedCount.value === sbs.value.length
  if (id === 'export') return !!mergeUrl.value
  return false
}

function isFlowStepUnlocked(id) {
  if (id === 'script') return true
  if (id === 'characters') return chars.value.length > 0 || isFlowStepDone('characters')
  if (id === 'scenes') return isFlowStepDone('characters') || isFlowStepDone('scenes') || isFlowStepDone('storyboard')
  if (id === 'storyboard') return isFlowStepDone('scenes') || isFlowStepDone('storyboard')
  if (id === 'production') return isFlowStepDone('storyboard')
  if (id === 'export') return isFlowStepDone('production') || isFlowStepDone('export')
  return false
}

function isFlowStepLocked(id) {
  return !isFlowStepUnlocked(id)
}

function lockSequentialSteps(steps, baseUnlocked = true) {
  let canOpenNext = baseUnlocked
  return steps.map((step) => {
    const locked = step.locked ?? !canOpenNext
    if (canOpenNext && !step.done) canOpenNext = false
    return { ...step, locked }
  })
}

function isSubStepLocked(key) {
  if (key === 'script:raw') return false
  if (key === 'script:rewrite') return !rawContent.value && !scriptContent.value
  if (key === 'script:voice') return !chars.value.length
  if (key === 'script:storyboard') return isFlowStepLocked('storyboard')
  if (key === 'prod:chars') return isFlowStepLocked('characters')
  if (key === 'prod:scenes') return isFlowStepLocked('scenes')
  if (key === 'prod:dubbing') return isFlowStepLocked('production')
  if (key === 'prod:shots') return isFlowStepLocked('production') || !prodStepDone('dubbing')
  if (key === 'prod:videos') return isFlowStepLocked('production') || !prodStepDone('shots')
  if (key === 'prod:compose') return isFlowStepLocked('production') || !prodStepDone('videos')
  if (key === 'export:merge') return isFlowStepLocked('export')
  return false
}

function lockedStepTip(id) {
  if (id === 'characters') return '请先提取角色后再进入角色步骤'
  if (id === 'scenes') return '请先完成角色形象后再进入场景步骤'
  if (id === 'storyboard') return '请先完成场景图片后再进入分镜步骤'
  if (id === 'production') return '请先完成分镜拆解后再进入制作步骤'
  if (id === 'export') return '请先完成视频合成后再查看作品'
  return '请先完成前面的步骤'
}

const sidebarSections = computed(() => ([
  {
    id: 'script',
    label: '剧本',
    items: lockSequentialSteps([
      { key: 'script:raw', label: '原始内容', desc: '', icon: FileText, done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', desc: '', icon: FileText, done: !!scriptContent.value },
      { key: 'script:voice', label: '音色', desc: '', icon: Mic2, done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'script:storyboard', label: '分镜', desc: '', icon: Clapperboard, done: !!sbs.value.length },
    ]),
  },
  {
    id: 'production',
    label: '制作',
    items: [
      { key: 'prod:chars', label: '角色形象', desc: '', icon: Users, done: prodStepDone('chars'), locked: isSubStepLocked('prod:chars') },
      { key: 'prod:scenes', label: '场景图片', desc: '', icon: MapPin, done: prodStepDone('scenes'), locked: isSubStepLocked('prod:scenes') },
      { key: 'prod:dubbing', label: '配音生成', desc: '', icon: Mic2, done: prodStepDone('dubbing'), locked: isSubStepLocked('prod:dubbing') },
      { key: 'prod:shots', label: '镜头图片', desc: '', icon: ImageIcon, done: prodStepDone('shots'), locked: isSubStepLocked('prod:shots') },
      { key: 'prod:videos', label: '视频生成', desc: '', icon: Video, done: prodStepDone('videos'), locked: isSubStepLocked('prod:videos') },
      { key: 'prod:compose', label: '视频合成', desc: '', icon: Layers, done: prodStepDone('compose'), locked: isSubStepLocked('prod:compose') },
    ],
  },
  {
    id: 'export',
    label: '导出',
    items: [
      { key: 'export:merge', label: '拼接导出', desc: '', icon: Download, done: !!mergeUrl.value, locked: isFlowStepLocked('export') },
    ],
  },
]))

const activeMainStage = computed(() => {
  if (panel.value === 'export') return 'export'
  if (panel.value === 'production') {
    return ['chars', 'scenes'].includes(prodTab.value) ? 'assets' : 'storyboard'
  }
  if (scriptStep.value <= 1) return 'script'
  if (scriptStep.value === 3) return 'assets'
  return 'storyboard'
})

function mainStageDone(stageId) {
  if (stageId === 'script') return !!scriptContent.value
  if (stageId === 'assets') {
    const charsReady = !!chars.value.length && charsVoiced.value === chars.value.length
    const charImagesReady = !visualCharTotal.value || charImgCount.value === visualCharTotal.value
    const sceneImagesReady = !scenes.value.length || sceneImgCount.value === scenes.value.length
    return charsReady && charImagesReady && sceneImagesReady
  }
  if (stageId === 'storyboard') {
    if (!sbs.value.length) return false
    const ttsReady = !ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value
    return ttsReady
      && shotImgCount.value === sbs.value.length
      && shotVidCount.value === sbs.value.length
      && composedCount.value === sbs.value.length
  }
  if (stageId === 'export') return !!mergeUrl.value
  return false
}

function goMainStage(stageId) {
  if (stageId === 'script') {
    panel.value = 'script'
    scriptStep.value = Math.min(scriptStep.value, 1)
    return
  }
  if (stageId === 'assets') {
    const hasAssetWorkspace = !!visualCharTotal.value || !!scenes.value.length
    const hasPendingAssetGeneration = (visualCharTotal.value && charImgCount.value < visualCharTotal.value)
      || (scenes.value.length && sceneImgCount.value < scenes.value.length)
    if (panel.value === 'production' || hasPendingAssetGeneration || hasAssetWorkspace) {
      panel.value = 'production'
      prodTab.value = ['chars', 'scenes'].includes(prodTab.value) ? prodTab.value : 'chars'
      return
    }
    panel.value = 'script'
    scriptStep.value = 3
    return
  }
  if (stageId === 'storyboard') {
    if (panel.value === 'production') {
      prodTab.value = ['dubbing', 'shots', 'videos', 'compose'].includes(prodTab.value) ? prodTab.value : 'shots'
      return
    }
    panel.value = 'script'
    scriptStep.value = 4
    return
  }
  panel.value = 'export'
}

const activeSubSteps = computed(() => {
  if (activeMainStage.value === 'script') {
    return lockSequentialSteps([
      { key: 'script:raw', label: '原始内容', done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', done: !!scriptContent.value },
    ])
  }
  if (activeMainStage.value === 'assets') {
    return [
      { key: 'script:voice', label: '分配音色', done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'prod:chars', label: '角色形象', done: prodStepDone('chars'), locked: isSubStepLocked('prod:chars') },
      { key: 'prod:scenes', label: '场景图片', done: prodStepDone('scenes'), locked: isSubStepLocked('prod:scenes') },
    ]
  }
  if (activeMainStage.value === 'storyboard') {
    return [
      { key: 'script:storyboard', label: '分镜拆解', done: !!sbs.value.length, locked: isSubStepLocked('script:storyboard') },
      { key: 'prod:dubbing', label: '配音生成', done: prodStepDone('dubbing'), locked: isSubStepLocked('prod:dubbing') },
      { key: 'prod:shots', label: '镜头图片', done: prodStepDone('shots'), locked: isSubStepLocked('prod:shots') },
      { key: 'prod:videos', label: '视频生成', done: prodStepDone('videos'), locked: isSubStepLocked('prod:videos') },
      { key: 'prod:compose', label: '视频合成', done: prodStepDone('compose'), locked: isSubStepLocked('prod:compose') },
    ]
  }
  return [
    { key: 'export:merge', label: '拼接导出', done: !!mergeUrl.value, locked: isSubStepLocked('export:merge') },
  ]
})

const activeSubStepKey = computed(() => {
  if (panel.value === 'script') {
    if (scriptStep.value === 0) return 'script:raw'
    if (scriptStep.value === 1) return 'script:rewrite'
    if (scriptStep.value === 3) return 'script:voice'
    return 'script:storyboard'
  }
  if (panel.value === 'production') return `prod:${prodTab.value}`
  return 'export:merge'
})

const sidebarJumpSteps = computed(() => {
  const section = sidebarSections.value.find((item) => item.items.some(step => step.key === activeSubStepKey.value))
  return section?.items || []
})

const bubbleSteps = computed(() => {
  if (panel.value === 'script') {
    return [
      { key: 'script:raw', label: '原始内容', done: !!rawContent.value },
      { key: 'script:rewrite', label: 'AI 改写', done: !!scriptContent.value },
      { key: 'script:voice', label: '音色', done: !!chars.value.length && charsVoiced.value === chars.value.length },
      { key: 'script:storyboard', label: '分镜', done: !!sbs.value.length },
    ]
  }
  if (panel.value === 'production') {
    return prodTabDefs.value.map(step => ({
      key: `prod:${step.id}`,
      label: step.label,
      done: prodStepDone(step.id),
    }))
  }
  return []
})

const activeBubbleKey = computed(() => {
  if (panel.value === 'script') return activeSubStepKey.value
  if (panel.value === 'production') return `prod:${prodTab.value}`
  return ''
})

const showBottomBubble = computed(() => panel.value === 'script' || panel.value === 'production')

const activeFlowStepId = computed(() => {
  if (panel.value === 'export') return 'export'
  if (panel.value === 'production') {
    if (prodTab.value === 'chars') return 'characters'
    if (prodTab.value === 'scenes') return 'scenes'
    return 'production'
  }
  if (panel.value === 'script' && scriptStep.value === 4) return 'storyboard'
  return 'script'
})

const flowNavSteps = computed(() => {
  return flowStepDefs.map((step) => ({
    ...step,
    active: step.id === activeFlowStepId.value,
    done: isFlowStepDone(step.id),
    locked: isFlowStepLocked(step.id),
  }))
})

function goFlowStep(id) {
  if (isFlowStepLocked(id)) {
    toast.info(lockedStepTip(id))
    return
  }
  if (id === 'script') {
    panel.value = 'script'
    scriptStep.value = scriptContent.value ? 1 : 0
    return
  }
  if (id === 'characters') {
    panel.value = 'production'
    prodTab.value = 'chars'
    return
  }
  if (id === 'scenes') {
    panel.value = 'production'
    prodTab.value = 'scenes'
    return
  }
  if (id === 'storyboard') {
    panel.value = 'script'
    scriptStep.value = 4
    return
  }
  if (id === 'production') {
    panel.value = 'production'
    prodTab.value = ['chars', 'scenes', 'dubbing'].includes(prodTab.value) ? 'shots' : prodTab.value
    return
  }
  panel.value = 'export'
}

function goSubStep(key) {
  if (isSubStepLocked(key)) {
    toast.info('请先完成前面的步骤')
    return
  }
  if (key.startsWith('script:')) {
    panel.value = 'script'
    const stepMap = {
      'script:raw': 0,
      'script:rewrite': 1,
      'script:voice': 3,
      'script:storyboard': 4,
    }
    scriptStep.value = stepMap[key] ?? 0
    return
  }
  if (key.startsWith('prod:')) {
    panel.value = 'production'
    prodTab.value = key.replace('prod:', '')
    if (prodTab.value === 'videos') shotWorkbenchTab.value = 'video'
    if (prodTab.value === 'shots') shotWorkbenchTab.value = 'image'
    return
  }
  panel.value = 'export'
}

const pipelineProgress = computed(() => {
  let p = 0
  if (rawContent.value) p++
  if (scriptContent.value) p++
  if (chars.value.length) p++
  if (charsVoiced.value) p++
  if (sbs.value.length) p++
  if (sbs.value.length && (!ttsEligibleCount.value || ttsGeneratedCount.value === ttsEligibleCount.value)) p++
  if (sbs.value.some(s => s.composed_image || s.composedImage)) p++
  if (sbs.value.some(s => s.video_url || s.videoUrl)) p++
  if (sbs.value.length && composedCount.value === sbs.value.length) p++
  if (mergeUrl.value) p++
  return p
})

const currentStageLabel = computed(() => {
  if (panel.value === 'script') return `剧本阶段 · ${stepLabels[scriptStep.value]}`
  if (panel.value === 'production') return `制作阶段 · ${prodTabDefs.value[prodTabIdx.value]?.label || '制作'}`
  return mergeUrl.value ? '导出阶段 · 成片已生成' : '导出阶段 · 等待拼接'
})

const currentMainStageLabel = computed(() => {
  const current = mainStageDefs.find(stage => stage.id === activeMainStage.value)
  return current?.label || '工作台'
})

const currentSubStageLabel = computed(() => {
  const current = activeSubSteps.value.find(step => step.key === activeSubStepKey.value)
  return current?.label || currentStageLabel.value
})

function updateCharVoice(charId, voiceId) {
  characterAPI.update(charId, { voice_style: voiceId, voice_provider: lockedAudioProvider.value || undefined })
  const c = chars.value.find(ch => ch.id === charId)
  if (c) {
    c.voice_style = voiceId
    c.voiceStyle = voiceId
    c.voice_provider = lockedAudioProvider.value || ''
    c.voiceProvider = lockedAudioProvider.value || ''
    c.voice_sample_url = ''
    c.voiceSampleUrl = ''
  }
}
function getVoiceProfile(voiceId) {
  return voiceProfiles.value.find(v => v.id === voiceId) || null
}
const totalDuration = computed(() => sbs.value.reduce((s, sb) => s + (sb.duration || 10), 0))
const selectedShot = computed(() => selectedSb.value || sbs.value[0] || null)
const selectedShotScene = computed(() => selectedShot.value ? getStoryboardScene(selectedShot.value) : null)
const selectedShotCharacters = computed(() => {
  const ids = selectedShot.value ? getStoryboardCharacterIds(selectedShot.value) : []
  return chars.value.filter(char => ids.includes(char.id))
})
const editorVideoMaterials = computed(() => {
  const sb = selectedShot.value
  if (!sb || !getVideoUrl(sb)) return []
  return [{
    key: `video-${sb.id}`,
    kind: 'video',
    url: assetPathUrl(getVideoUrl(sb)),
    title: shotDisplayTitle(sb),
    meta: `${formatEditorDuration(getShotDurationSeconds(sb))} · 已生成视频`,
  }]
})
const editorAudioMaterials = computed(() => {
  const sb = selectedShot.value
  if (!sb || !getTTSUrl(sb)) return []
  return [{
    key: `audio-${sb.id}`,
    kind: 'audio',
    url: assetPathUrl(getTTSUrl(sb)),
    title: `${shotDisplayTitle(sb)} 配音`,
    meta: getDialogueSpeaker(sb),
  }]
})
const editorActiveMaterials = computed(() => editorMaterialTab.value === 'audio' ? editorAudioMaterials.value : editorVideoMaterials.value)
const editorTimelineVideoCount = computed(() => 0)
const editorTimelineAudioCount = computed(() => 0)
const editorTimelineHasClips = computed(() => editorTimelineVideoCount.value + editorTimelineAudioCount.value > 0)
const editorDurationLabel = computed(() => selectedShot.value ? formatEditorDuration(getShotDurationSeconds(selectedShot.value)) : '00:00')
const editorTimelineDurationLabel = computed(() => editorTimelineHasClips.value ? editorDurationLabel.value : '00:00')
const activeFrameType = computed(() => {
  if (activeShotFrameMode.value === 'last_frame') return 'last_frame'
  if (activeShotFrameMode.value === 'action_sequence') return 'action_sequence'
  if (activeShotFrameMode.value === 'key_frame') return 'key_frame'
  return 'first_frame'
})
const activeFrameLabel = computed(() => {
  const current = shotFrameModeOptions.find(item => item.value === activeShotFrameMode.value)
  return current?.label || '关键帧'
})
const showShotModeReferencePanel = computed(() => ['first_frame', 'last_frame', 'action_sequence'].includes(activeShotFrameMode.value))
const shotModeReferenceText = computed(() => {
  if (activeShotFrameMode.value === 'first_frame') return '生成图片时融合参考图风格'
  if (activeShotFrameMode.value === 'last_frame') return '可参考首帧、角色或场景保持连续'
  if (activeShotFrameMode.value === 'action_sequence') return '生成图片时融合参考图风格'
  return '可选参考'
})
const storyboardLoadingMessage = computed(() => {
  const progress = agentTaskProgress.value || 0
  if (agentTaskStep.value === 'read_storyboard_context') return '正在读取剧本、角色列表和场景列表...'
  if (agentTaskStep.value === 'storyboard_context_loaded') return '正在把文字变成分镜...'
  if (agentTaskStep.value === 'save_storyboards') return '正在保存分镜脚本...'
  if (progress >= 80) return '正在保存分镜脚本...'
  if (progress >= 32) return '正在把文字变成分镜...'
  if (progress >= 18) return '正在读取剧本、角色列表和场景列表...'
  return '正在启动分镜拆解...'
})
const storyboardLoadingProgress = computed(() => {
  const progress = Number(agentTaskProgress.value || 0)
  return progress ? Math.max(3, Math.min(99, progress)) : 3
})

const selectedSb = ref(null)
const expandedStoryboardIds = ref([])
const shotTypes = [
  'EXTREME_LONG_SHOT', 'LONG_SHOT', 'FULL_SHOT', 'MEDIUM_SHOT', 'MEDIUM_CLOSE_UP',
  'CLOSE_UP', 'EXTREME_CLOSE_UP', 'TWO_SHOT', 'THREE_SHOT', 'GROUP_SHOT',
  'OVER_SHOULDER', 'POV', 'AERIAL',
]
const shotAngles = ['EYE_LEVEL', 'HIGH_ANGLE', 'LOW_ANGLE', 'BIRD_EYE', 'DUTCH_ANGLE', 'OVER_SHOULDER', 'POV']
const shotMovements = ['STATIC', 'PUSH_IN', 'PULL_OUT', 'PAN', 'TILT', 'DOLLY', 'TRACKING', 'ZOOM', 'HANDHELD', 'CRANE']

function updateField(sb, field, value) {
  const current = sb[field] ?? sb[toCamel(field)]
  if (current === value) return
  sb[field] = value
  const camelField = toCamel(field)
  if (camelField !== field) sb[camelField] = value
  storyboardAPI.update(sb.id, { [field]: value })
}

function toCamel(field) {
  return field.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

function getStoryboardCharacterIds(sb) {
  return sb?.character_ids || sb?.characterIds || []
}

function getStoryboardCharacterNames(sb) {
  const ids = getStoryboardCharacterIds(sb)
  return chars.value.filter(char => ids.includes(char.id)).map(char => char.name)
}

function getStoryboardScene(sb) {
  const sceneId = sb?.scene_id || sb?.sceneId
  if (!sceneId) return null
  return scenes.value.find(scene => scene.id === sceneId) || null
}

function storyboardActionText(sb) {
  return sb?.action || ''
}

function storyboardVisualText(sb) {
  return sb?.visualDescription || sb?.visual_description || sb?.description || ''
}

function shotDisplayTitle(sb) {
  if (!sb) return '镜头'
  const idx = sbs.value.findIndex(item => item.id === sb.id)
  const no = idx >= 0 ? idx + 1 : (sb.storyboard_number || sb.storyboardNumber || '')
  return `镜头${no}${sb.title ? ` ${sb.title}` : ''}`.trim()
}

function storyboardShotTypeLabel(sb) {
  const raw = sb?.shotType || sb?.shot_type || ''
  const labels = {
    EXTREME_LONG_SHOT: '大远景',
    LONG_SHOT: '远景',
    FULL_SHOT: '全景',
    MEDIUM_SHOT: '中景',
    MEDIUM_CLOSE_UP: '中近景',
    CLOSE_UP: '特写',
    EXTREME_CLOSE_UP: '大特写',
    TWO_SHOT: '双人镜头',
    THREE_SHOT: '三人镜头',
    GROUP_SHOT: '群像',
    OVER_SHOULDER: '过肩',
    POV: '主观视角',
    AERIAL: '航拍',
    TRACKING: '运动镜头',
  }
  return labels[String(raw).toUpperCase()] || raw || '镜头'
}

function storyboardExpandKey(sb) {
  return sb?.id ?? sb?.storyboard_number ?? sb?.storyboardNumber
}

function isStoryboardExpanded(sb) {
  const key = storyboardExpandKey(sb)
  return key != null && expandedStoryboardIds.value.includes(key)
}

function toggleStoryboardExpanded(sb) {
  const key = storyboardExpandKey(sb)
  if (key == null) return
  expandedStoryboardIds.value = isStoryboardExpanded(sb)
    ? expandedStoryboardIds.value.filter(item => item !== key)
    : [...expandedStoryboardIds.value, key]
}

function saveStoryboardAction(sb, value) {
  const nextValue = String(value || '').trim()
  updateField(sb, 'action', nextValue)
}

function assetPathUrl(path) {
  if (!path) return ''
  return String(path).startsWith('http') ? path : `/${path}`
}

function shotEditablePrompt(sb) {
  if (!sb) return ''
  return getShotFramePrompt(sb, activeShotFrameMode.value) || buildShotImagePrompt(sb, activeShotFrameMode.value)
}

function refreshShotPrompt(sb) {
  if (!sb) return
  const prompt = buildShotImagePrompt(sb, activeShotFrameMode.value)
  setShotFramePromptLocal(sb, activeShotFrameMode.value, prompt)
  storyboardAPI.update(sb.id, { image_prompt: prompt })
  toast.success('提示词已重新生成')
}

function saveShotFramePrompt(sb, value) {
  if (!sb) return
  const prompt = String(value || '').trim()
  setShotFramePromptLocal(sb, activeShotFrameMode.value, prompt)
  storyboardAPI.update(sb.id, { image_prompt: prompt })
}

function getShotFramePrompt(sb, mode) {
  if (!sb) return ''
  const prompts = sb.frame_prompts || sb.framePrompts || {}
  const modePrompt = prompts?.[mode]
  if (modePrompt) return modePrompt
  if (mode === 'key_frame') return sb.image_prompt || sb.imagePrompt || ''
  return ''
}

function setShotFramePromptLocal(sb, mode, prompt) {
  const current = sb.frame_prompts || sb.framePrompts || {}
  const next = { ...current, [mode]: prompt }
  sb.frame_prompts = next
  sb.framePrompts = next
  if (mode === 'key_frame') {
    sb.image_prompt = prompt
    sb.imagePrompt = prompt
  }
}

function saveShotVideoPrompt(sb, value) {
  if (!sb) return
  const prompt = String(value || '').trim()
  sb.video_prompt = prompt
  sb.videoPrompt = prompt
  storyboardAPI.update(sb.id, { video_prompt: prompt })
}

function shotAssetRows(sb) {
  if (!sb) return []
  const makeImage = (key, path, title) => path ? [{ key, kind: 'image', url: assetPathUrl(path), title }] : []
  const refs = getRefs(sb).map((path, index) => ({
    key: `ref-${index}`,
    kind: 'image',
    url: assetPathUrl(path),
    title: `${shotDisplayTitle(sb)} 参考图${index + 1}`,
  }))
  return [
    {
      key: 'video',
      label: '视频',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M4 20q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4h12q.825 0 1.413.588T18 6v4.5l4-4v11l-4-4V18q0 .825-.587 1.413T16 20z"/></svg>',
      items: getVideoUrl(sb) ? [{ key: 'video', kind: 'video', url: assetPathUrl(getVideoUrl(sb)), title: `${shotDisplayTitle(sb)} 视频` }] : [],
    },
    {
      key: 'key',
      label: '关键帧',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m5.825 21l1.625-7.025L2 9.25l7.2-.625L12 2l2.8 6.625l7.2.625l-5.45 4.725L18.175 21L12 17.275z"/></svg>',
      items: makeImage('cover', getStoryboardCover(sb), `${shotDisplayTitle(sb)} 关键帧`),
    },
    {
      key: 'first',
      label: '首帧',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m4 4l2 4h3L7 4h2l2 4h3l-2-4h2l2 4h3l-2-4h3q.825 0 1.413.588T22 6v12q0 .825-.587 1.413T20 20H4q-.825 0-1.412-.587T2 18V6q0-.825.588-1.412T4 4"/></svg>',
      items: makeImage('first', getFirstFrame(sb), `${shotDisplayTitle(sb)} 首帧`),
    },
    {
      key: 'last',
      label: '尾帧',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21V4h9l.4 2H20v10h-7l-.4-2H7v7z"/></svg>',
      items: makeImage('last', getLastFrame(sb), `${shotDisplayTitle(sb)} 尾帧`),
    },
    {
      key: 'action',
      label: '动作序列',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="m8 22l1-7H4l9-13h2l-1 8h6L10 22z"/></svg>',
      items: [],
    },
    {
      key: 'other',
      label: '其他',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm1-4h12l-3.75-5l-3 4L9 13z"/></svg>',
      items: refs,
    },
    {
      key: 'crop',
      label: '裁剪',
      icon: '<svg width="14" height="14" viewBox="0 0 24 24"><path fill="currentColor" d="M17 23v-4H7q-.825 0-1.412-.587T5 17V7H1V5h4V1h2v16h16v2h-4v4zm0-8V7H9V5h8q.825 0 1.413.588T19 7v8z"/></svg>',
      items: [],
    },
  ]
}

function getShotDurationSeconds(sb) {
  const duration = Number(sb?.durationSeconds ?? sb?.duration_seconds ?? sb?.duration ?? 0)
  return Number.isFinite(duration) && duration > 0 ? duration : 0
}

function formatEditorDuration(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const secs = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function isStoryboardCharacterSelected(sb, charId) {
  return getStoryboardCharacterIds(sb).includes(charId)
}

function toggleStoryboardCharacter(sb, charId) {
  const currentIds = getStoryboardCharacterIds(sb)
  const nextIds = currentIds.includes(charId)
    ? currentIds.filter(id => id !== charId)
    : [...currentIds, charId]
  updateField(sb, 'character_ids', nextIds)
}

function getSceneName(sb) {
  const sceneId = sb?.scene_id || sb?.sceneId
  if (!sceneId) return '未绑定场景'
  const scene = scenes.value.find(s => s.id === sceneId)
  return scene ? `${scene.location} · ${scene.time || '未设时间'}` : `场景 #${sceneId}`
}

async function deleteShot(sb) {
  if (!confirm('确定删除此镜头？')) return
  const idx = sbs.value.indexOf(sb)
  const key = storyboardExpandKey(sb)
  await storyboardAPI.del(sb.id)
  await refresh()
  if (key != null) expandedStoryboardIds.value = expandedStoryboardIds.value.filter(item => item !== key)
  if (sbs.value.length) selectedSb.value = sbs.value[Math.min(idx, sbs.value.length - 1)]
  else selectedSb.value = null
}

async function insertShotAt(index) {
  const insertNumber = index + 1
  const laterShots = sbs.value.slice(index)
  for (const shot of laterShots) {
    const currentNumber = shot.storyboard_number || shot.storyboardNumber || (sbs.value.indexOf(shot) + 1)
    await storyboardAPI.update(shot.id, { storyboard_number: currentNumber + 1 })
  }
  const res = await storyboardAPI.create({
    episode_id: epId.value,
    storyboard_number: insertNumber,
    title: `镜头${insertNumber}`,
    action: '',
    description: '',
    duration: 10,
  })
  await refresh()
  selectedSb.value = sbs.value.find(item => item.id === res?.id) || sbs.value[index] || null
  const key = storyboardExpandKey(selectedSb.value)
  if (key != null && !expandedStoryboardIds.value.includes(key)) {
    expandedStoryboardIds.value = [...expandedStoryboardIds.value, key]
  }
}

const scriptSteps = computed(() => {
  const hasScript = !!scriptContent.value
  const hasChars = chars.value.length > 0 && hasScript
  const hasVoice = charsVoiced.value > 0 && hasChars
  const hasSbs = sbs.value.length > 0
  return [
    { label: '原始内容', state: rawContent.value ? 'done' : 'active', spinning: false },
    { label: 'AI 改写', state: hasScript ? 'done' : (rawContent.value ? 'active' : ''), spinning: rt.value === 'script_rewriter' },
    { label: '提取', state: hasChars ? 'done' : (hasScript ? 'active' : ''), spinning: rt.value === 'extractor' },
    { label: '音色', state: hasVoice ? 'done' : (hasChars ? 'active' : ''), spinning: rt.value === 'voice_assigner' },
    { label: '分镜', state: hasSbs ? 'done' : (hasVoice ? 'active' : ''), spinning: rt.value === 'storyboard_breaker' },
  ]
})

watch(rawContent, v => { localRaw.value = v }, { immediate: true })
watch(scriptContent, v => { localScript.value = v }, { immediate: true })
watch(scriptStep, () => {
  isEditingRaw.value = false
  isEditingScript.value = false
})
watch(prodTab, (value) => {
  if (value === 'videos') shotWorkbenchTab.value = 'video'
  if (value === 'shots') shotWorkbenchTab.value = 'image'
}, { immediate: true })

function consumeCreateQuery() {
  const createType = route.query.create
  if (createType !== 'character' && createType !== 'scene') return

  panel.value = 'production'
  prodTab.value = createType === 'scene' ? 'scenes' : 'chars'
  if (createType === 'scene') addScene()
  else addCharacter()
  navigateTo({ path: route.path, query: { ...route.query, create: undefined } }, { replace: true })
}

async function refresh() {
  try {
    drama.value = await dramaAPI.get(dramaId)
    const ep = drama.value.episodes?.find(e => (e.episode_number || e.episodeNumber) === episodeNumber)
    if (ep) {
      episode.value = ep
      try { chars.value = await episodeAPI.characters(ep.id) } catch { chars.value = [] }
      try { scenes.value = await episodeAPI.scenes(ep.id) } catch { scenes.value = [] }
      sbs.value = await episodeAPI.storyboards(ep.id)
      if (sbs.value.length && !selectedSb.value) selectedSb.value = sbs.value[0]

      const epHasContent = !!(episode.value?.content)
      const epHasScript = !!(episode.value?.script_content || episode.value?.scriptContent)
      const epHasSbs = sbs.value.length > 0

      if (!initialRouteResolved.value) {
        if (epHasScript && chars.value.length) {
          panel.value = 'production'
          prodTab.value = 'chars'
          scriptStep.value = epHasSbs ? 4 : 1
        } else if (epHasSbs) scriptStep.value = 4
        else if (epHasScript || epHasContent) scriptStep.value = 1
        else scriptStep.value = 0
        initialRouteResolved.value = true
      } else if (panel.value === 'script') {
        if (epHasSbs) scriptStep.value = 4
        else if (epHasScript && chars.value.some(c => c.voice_style || c.voiceStyle)) scriptStep.value = 3
        else if (epHasScript && chars.value.length) {
          panel.value = 'production'
          prodTab.value = 'chars'
          scriptStep.value = 1
        }
        else if (epHasScript || epHasContent) scriptStep.value = Math.min(scriptStep.value || 1, 1)
        else scriptStep.value = 0
      }
      await loadLatestGridImage()
      await syncPendingImageTasks()
      consumeCreateQuery()
    }
  } catch (e) {
    toast.error(e.message)
  }
  try { mergeData.value = await mergeAPI.status(epId.value) } catch {}
}

async function saveRaw() {
  await episodeAPI.update(epId.value, { content: localRaw.value })
  episode.value.content = localRaw.value
}
async function saveScr() {
  await episodeAPI.update(epId.value, { script_content: localScript.value })
  episode.value.script_content = localScript.value
}
function startRawEdit() { isEditingRaw.value = true }
function cancelRawEdit() {
  localRaw.value = rawContent.value
  isEditingRaw.value = false
}
async function saveRawEdit() {
  await saveRaw()
  isEditingRaw.value = false
  toast.success('保存成功')
}
function startScriptEdit() { isEditingScript.value = true }
function cancelScriptEdit() {
  localScript.value = scriptContent.value
  isEditingScript.value = false
}
async function saveScriptEdit() {
  await saveScr()
  isEditingScript.value = false
  toast.success('保存成功')
}
async function doRewrite() {
  await saveRaw()
  runAgent('script_rewriter', '请读取剧本并改写为格式化剧本，然后保存', dramaId, epId.value, refresh, { model: selectedScriptModelOption.value?.model_id || scriptModel.value })
}
async function startExtractFromRaw() {
  await saveRaw()
  if (!scriptContent.value && localRaw.value.trim()) {
    localScript.value = localRaw.value
    await saveScr()
  }
  await startExtractToCharacters()
}
function skipRewrite() {
  const raw = (localRaw.value || rawContent.value || '').trim()
  if (!raw) {
    toast.warning('请先填写原始内容')
    return
  }
  localScript.value = raw
  saveScr()
  toast.success('已跳过 AI 改写，当前将直接使用原始内容')
  startExtractToCharacters()
}
async function startExtractToCharacters() {
  await doExtract({ keepStep: 1 })
  panel.value = 'production'
  prodTab.value = 'chars'
  scriptStep.value = 1
}
function startExtractProgress() {
  stopExtractProgress()
  extractInlineVisible.value = true
  extractProgress.value = 3
  extractProgressTimer = window.setInterval(() => {
    if (extractProgress.value < 88) {
      extractProgress.value += Math.max(1, Math.round((90 - extractProgress.value) / 10))
    }
  }, 1200)
}
function stopExtractProgress(done = false) {
  if (extractProgressTimer) {
    window.clearInterval(extractProgressTimer)
    extractProgressTimer = null
  }
  if (done) extractProgress.value = 100
}
async function doExtract(options = {}) {
  const keepStep = Number.isInteger(options.keepStep) ? options.keepStep : scriptStep.value
  await saveScr()
  startExtractProgress()
  try {
    await runAgent('extractor', '请从剧本中提取所有角色和场景信息，提取时自动与项目已有数据进行去重合并', dramaId, epId.value, async () => {
      await refresh()
      scriptStep.value = keepStep
      stopExtractProgress(true)
      extractInlineVisible.value = true
    }, { model: selectedScriptModelOption.value?.model_id || scriptModel.value })
  } catch (e) {
    scriptStep.value = keepStep
    throw e
  } finally {
    stopExtractProgress()
  }
}
async function reExtractCharacters() {
  pendingCharImageIds.value = []
  pendingCharImageTaskIds.value = {}
  failedCharImageMessages.value = {}
  panel.value = 'production'
  prodTab.value = 'chars'
  await doExtract({ keepStep: 1 })
  panel.value = 'production'
  prodTab.value = 'chars'
  scriptStep.value = 1
}
async function reExtractScenes() {
  pendingSceneImageIds.value = []
  pendingSceneImageTaskIds.value = {}
  failedSceneImageMessages.value = {}
  panel.value = 'production'
  prodTab.value = 'scenes'
  await doExtract({ keepStep: 1 })
  panel.value = 'production'
  prodTab.value = 'scenes'
  scriptStep.value = 1
}
function doVoice() { runAgent('voice_assigner', '请为所有角色分配合适的音色', dramaId, epId.value, refresh) }
async function batchGenSamples() {
  const pending = chars.value.filter(c => (c.voice_style || c.voiceStyle) && !(c.voice_sample_url || c.voiceSampleUrl))
  if (!pending.length) {
    toast.info(charsVoiced.value ? '所有角色的试听文件已生成' : '请先分配音色')
    return
  }
  const results = await Promise.allSettled(pending.map(c => characterAPI.voiceSample(c.id, epId.value)))
  const okCount = results.filter(r => r.status === 'fulfilled').length
  const failCount = results.length - okCount
  if (okCount) toast.success(`已生成 ${okCount} 份试听文件`)
  if (failCount) toast.error(`${failCount} 份试听文件生成失败`)
  await refresh()
}
function doBreakdown() {
  const cfg = videoConfigs.value.find(c => c.id === lockedVideoConfigId.value)
  const label = cfg ? configLabel(cfg) : '默认'
  runAgent('storyboard_breaker', `请把当前剧本转换成生产级结构化分镜脚本，并调用 save_storyboards 保存。每条分镜必须包含 shotNumber、title、shotType、cameraAngle、cameraMovement、durationSeconds、visualDescription、action、dialogue、soundEffects、backgroundMusic、atmosphere、charactersInShot、sceneId、image_prompt、video_prompt。shotType/cameraAngle/cameraMovement 使用标准英文枚举；角色和场景必须来自 read_storyboard_context。视频模型：${label}，请同时生成适配该模型的 video_prompt。`, dramaId, epId.value, async () => {
    await refresh()
    scriptStep.value = 4
  }, { model: selectedScriptModelOption.value?.model_id || scriptModel.value })
}
async function genSample(id) { try { await characterAPI.voiceSample(id, epId.value); toast.success('试听已生成'); refresh() } catch (e) { toast.error(e.message) } }
async function addShot() { await insertShotAt(sbs.value.length) }
function addCharacter() {
  roleModalMode.value = 'create'
  editingRoleForm.value = {
    id: null,
    name: '',
    age: '',
    gender: '',
    role: '',
    description: '',
    appearance: '',
    personality: '',
    imageUrl: '',
  }
  roleLibraryOpen.value = false
  roleModalOpen.value = true
}
function addScene() {
  sceneModalMode.value = 'create'
  editingSceneForm.value = {
    id: null,
    location: '',
    time: '',
    prompt: '',
    imageUrl: '',
  }
  sceneLibraryOpen.value = false
  sceneModalOpen.value = true
}
async function loadRoleLibrary() {
  roleLibraryLoading.value = true
  try {
    roleLibraryItems.value = await characterAPI.library(roleLibrarySearch.value.trim())
    if (!roleLibraryItems.value.some(item => item.id === selectedLibraryCharacterId.value)) {
      selectedLibraryCharacterId.value = null
    }
  } catch (e) {
    toast.error(e.message)
  } finally {
    roleLibraryLoading.value = false
  }
}
async function openRoleLibrary() {
  roleLibraryOpen.value = true
  await loadRoleLibrary()
}
function closeRoleLibrary() {
  roleLibraryOpen.value = false
  selectedLibraryCharacterId.value = null
}
async function saveCharacterToLibrary(char) {
  try {
    await characterAPI.saveToLibrary(char.id)
    toast.success('已保存到角色库')
  } catch (e) {
    toast.error(e.message)
  }
}
async function applySelectedLibraryCharacter() {
  if (!selectedLibraryCharacterId.value) return
  roleLibraryApplying.value = true
  try {
    await characterAPI.applyFromLibrary(selectedLibraryCharacterId.value, {
      drama_id: dramaId,
      episode_id: epId.value,
    })
    toast.success('已应用到当前项目')
    roleLibraryOpen.value = false
    selectedLibraryCharacterId.value = null
    await refresh()
  } catch (e) {
    toast.error(e.message)
  } finally {
    roleLibraryApplying.value = false
  }
}
async function loadSceneLibrary() {
  sceneLibraryLoading.value = true
  try {
    sceneLibraryItems.value = await sceneAPI.library(sceneLibrarySearch.value.trim())
    if (!sceneLibraryItems.value.some(item => item.id === selectedLibrarySceneId.value)) {
      selectedLibrarySceneId.value = null
    }
  } catch (e) {
    toast.error(e.message)
  } finally {
    sceneLibraryLoading.value = false
  }
}
async function openSceneLibrary() {
  sceneLibraryOpen.value = true
  await loadSceneLibrary()
}
function closeSceneLibrary() {
  sceneLibraryOpen.value = false
  selectedLibrarySceneId.value = null
}
async function saveSceneToLibrary(scene) {
  try {
    await sceneAPI.saveToLibrary(scene.id)
    toast.success('已保存到场景库')
  } catch (e) {
    toast.error(e.message)
  }
}
async function applySelectedLibraryScene() {
  if (!selectedLibrarySceneId.value) return
  sceneLibraryApplying.value = true
  try {
    await sceneAPI.applyFromLibrary(selectedLibrarySceneId.value, {
      drama_id: dramaId,
      episode_id: epId.value,
    })
    toast.success('已应用到当前项目')
    sceneLibraryOpen.value = false
    selectedLibrarySceneId.value = null
    await refresh()
  } catch (e) {
    toast.error(e.message)
  } finally {
    sceneLibraryApplying.value = false
  }
}
function editCharacter(char) {
  roleModalMode.value = 'edit'
  editingRoleForm.value = {
    id: char.id,
    name: char.name || '',
    age: char.age || '',
    gender: char.gender || '',
    role: char.role || '',
    description: char.description || '',
    appearance: char.appearance || '',
    personality: char.personality || '',
    imageUrl: char.image_url || char.imageUrl || '',
  }
  roleModalOpen.value = true
}
function closeRoleModal() {
  roleModalOpen.value = false
}
async function saveRoleModal() {
  const form = editingRoleForm.value
  const saved = await persistRoleForm()
  if (!saved) return
  roleModalOpen.value = false
  await refresh()
}

async function persistRoleForm() {
  const form = editingRoleForm.value
  const name = form.name.trim()
  if (!name) {
    toast.error('请输入角色名称')
    return null
  }
  try {
    const payload = {
      name,
      age: form.age,
      gender: form.gender,
      role: form.role,
      description: form.description,
      appearance: form.appearance,
      personality: form.personality,
    }
    if (form.id) {
      await characterAPI.update(form.id, payload)
      toast.success('角色已更新')
      return form.id
    } else {
      const created = await characterAPI.create({
        drama_id: dramaId,
        episode_id: epId.value,
        ...payload,
      })
      if (created?.id) editingRoleForm.value.id = created.id
      toast.success('角色已添加')
      return created?.id
    }
  } catch (e) {
    toast.error(e.message)
    return null
  }
}
async function generateEditingRoleImage() {
  const id = editingRoleForm.value.id
  if (!id) return
  await genCharImg(id)
  const updated = chars.value.find(c => c.id === id)
  editingRoleForm.value.imageUrl = updated?.image_url || updated?.imageUrl || editingRoleForm.value.imageUrl
}
async function deleteCharacter(char) {
  if (!window.confirm(`确定删除角色「${char.name}」？`)) return
  try {
    await characterAPI.del(char.id)
    toast.success('角色已删除')
    await refresh()
  } catch (e) {
    toast.error(e.message)
  }
}

function editScene(scene) {
  sceneModalMode.value = 'edit'
  editingSceneForm.value = {
    id: scene.id,
    location: scene.location || '',
    time: scene.time || '',
    prompt: scene.prompt || '',
    imageUrl: scene.image_url || scene.imageUrl || '',
  }
  sceneModalOpen.value = true
}
function closeSceneModal() {
  sceneModalOpen.value = false
}
async function saveSceneModal() {
  const form = editingSceneForm.value
  const saved = await persistSceneForm()
  if (!saved) return
  sceneModalOpen.value = false
  await refresh()
}

async function persistSceneForm() {
  const form = editingSceneForm.value
  const location = form.location.trim()
  if (!location) {
    toast.error('请输入场景名称')
    return null
  }
  try {
    const payload = {
      location,
      time: form.time,
      prompt: form.prompt,
    }
    if (form.id) {
      await sceneAPI.update(form.id, payload)
      toast.success('场景已更新')
      return form.id
    } else {
      const created = await sceneAPI.create({
        drama_id: dramaId,
        episode_id: epId.value,
        ...payload,
      })
      if (created?.id) editingSceneForm.value.id = created.id
      toast.success('场景已添加')
      return created?.id
    }
  } catch (e) {
    toast.error(e.message)
    return null
  }
}
async function deleteScene(scene) {
  if (!window.confirm(`确定删除场景「${sceneTitle(scene)}」？`)) return
  try {
    await sceneAPI.del(scene.id, epId.value)
    toast.success('场景已删除')
    await refresh()
  } catch (e) {
    toast.error(e.message)
  }
}
async function generateEditingSceneImage() {
  const id = editingSceneForm.value.id
  if (!id) return
  await genSceneImg(id)
  const updated = scenes.value.find(s => s.id === id)
  editingSceneForm.value.imageUrl = updated?.image_url || updated?.imageUrl || editingSceneForm.value.imageUrl
}

async function ensureUploadTarget(type, id) {
  if (id) return id
  if (type === 'character') return await persistRoleForm()
  return await persistSceneForm()
}

async function openRoleImageUpload(id) {
  const targetId = await ensureUploadTarget('character', id)
  if (!targetId) return
  pendingAssetUpload.value = { type: 'character', id: targetId }
  assetUploadInput.value?.click()
}

async function openSceneImageUpload(id) {
  const targetId = await ensureUploadTarget('scene', id)
  if (!targetId) return
  pendingAssetUpload.value = { type: 'scene', id: targetId }
  assetUploadInput.value?.click()
}

async function handleAssetUploadChange(event) {
  const file = event.target.files?.[0]
  const target = pendingAssetUpload.value
  event.target.value = ''
  pendingAssetUpload.value = null
  if (!file) return

  try {
    const uploaded = await uploadAPI.image(file)
    const imageUrl = uploaded.path || uploaded.url
    if (!target && pendingShotReferenceStoryboardId.value) {
      const sb = sbs.value.find(item => item.id === pendingShotReferenceStoryboardId.value)
      pendingShotReferenceStoryboardId.value = null
      if (!sb) return
      const refs = [...getRefs(sb), imageUrl].filter(Boolean)
      sb.reference_images = JSON.stringify(refs)
      sb.referenceImages = refs
      await storyboardAPI.update(sb.id, { reference_images: JSON.stringify(refs) })
      toast.success('参考图已上传')
      await refresh()
      return
    }
    if (!target) return
    if (target.type === 'character') {
      await characterAPI.update(target.id, { image_url: imageUrl })
      if (editingRoleForm.value.id === target.id) editingRoleForm.value.imageUrl = imageUrl
      toast.success('角色图片已上传')
    } else {
      await sceneAPI.update(target.id, { image_url: imageUrl })
      if (editingSceneForm.value.id === target.id) editingSceneForm.value.imageUrl = imageUrl
      toast.success('场景图片已上传')
    }
    await refresh()
  } catch (e) {
    pendingShotReferenceStoryboardId.value = null
    toast.error(e.message || '上传失败')
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function watchAsyncResult(check, attempts = 24, delay = 2500) {
  return (async () => {
    for (let i = 0; i < attempts; i++) {
      await sleep(delay)
      await refresh()
      if (check()) return
    }
  })()
}

async function watchCharacterImageTasks(taskItems, attempts = 120, delay = 5000) {
  const taskMap = new Map(
    (taskItems || [])
      .map(item => [item.image_generation_id, item.character_id])
      .filter(([generationId, characterId]) => generationId && characterId),
  )
  if (!taskMap.size) return

  for (let i = 0; i < attempts; i++) {
    await sleep(delay)
    await refresh()
    let records = []
    try {
      records = await imageAPI.list({ drama_id: dramaId })
    } catch {}

    let allDone = true
    for (const [generationId, characterId] of taskMap.entries()) {
      const char = chars.value.find(c => c.id === characterId)
      if (char?.image_url || char?.imageUrl) {
        clearPendingCharImage(characterId)
        taskMap.delete(generationId)
        continue
      }

      const record = records.find(item => item.id === generationId)
      if (record?.status === 'failed') {
        clearPendingCharImage(characterId)
        failedCharImageMessages.value = {
          ...failedCharImageMessages.value,
          [characterId]: record.error_msg || record.errorMsg || '生成失败',
        }
        toast.error(`${char?.name || '角色'}形象生成失败：${record.error_msg || record.errorMsg || '生成失败'}`)
        taskMap.delete(generationId)
        continue
      }

      allDone = false
    }
    if (allDone || !taskMap.size) return
  }
}

async function watchSceneImageTasks(taskItems, attempts = 120, delay = 5000) {
  const taskMap = new Map(
    (taskItems || [])
      .map(item => [item.image_generation_id, item.scene_id])
      .filter(([generationId, sceneId]) => generationId && sceneId),
  )
  if (!taskMap.size) return

  for (let i = 0; i < attempts; i++) {
    await sleep(delay)
    await refresh()
    let records = []
    try {
      records = await imageAPI.list({ drama_id: dramaId })
    } catch {}

    let allDone = true
    for (const [generationId, sceneId] of taskMap.entries()) {
      const scene = scenes.value.find(s => s.id === sceneId)
      if (scene?.image_url || scene?.imageUrl) {
        clearPendingSceneImage(sceneId)
        taskMap.delete(generationId)
        continue
      }

      const record = records.find(item => item.id === generationId)
      if (record?.status === 'failed') {
        clearPendingSceneImage(sceneId)
        failedSceneImageMessages.value = {
          ...failedSceneImageMessages.value,
          [sceneId]: record.error_msg || record.errorMsg || '生成失败',
        }
        toast.error(`${sceneTitle(scene)}背景生成失败：${record.error_msg || record.errorMsg || '生成失败'}`)
        taskMap.delete(generationId)
        continue
      }

      allDone = false
    }
    if (allDone || !taskMap.size) return
  }
}

async function genCharImg(id) {
  try {
    if (!isPendingCharImage(id)) pendingCharImageIds.value.push(id)
    clearFailedCharImage(id)
    const res = await characterAPI.generateImage(id, epId.value, selectedImageModelOption.value || imageModel.value)
    toast.success('角色图片生成中')
    await refresh()
    if (res?.image_generation_id) {
      setPendingCharImageTask(id, res.image_generation_id)
      watchCharacterImageTasks([{ character_id: id, image_generation_id: res.image_generation_id }])
      return
    }
    watchAsyncResult(() => {
      const char = chars.value.find(c => c.id === id)
      const done = !!(char?.image_url || char?.imageUrl)
      if (done) clearPendingCharImage(id)
      return done
    })
  } catch (e) {
    clearPendingCharImage(id)
    toast.error(e.message)
  }
}
function batchCharImages() {
  const ids = visualChars.value.map(c => c.id).filter(Boolean)
  if (!ids.length) { toast.info('请先添加角色'); return }
  batchCharImageRunning.value = true
  pendingCharImageIds.value = [...new Set([...pendingCharImageIds.value, ...ids])]
  ids.forEach(clearFailedCharImage)
  characterAPI.batchImages(ids, epId.value, selectedImageModelOption.value || imageModel.value).then(async (res) => {
    const startedIds = (res?.items || []).map(item => item.character_id).filter(Boolean)
    const failedItems = res?.failed || []
    const failedIds = failedItems.map(item => item.character_id).filter(Boolean)
    if (!startedIds.length) {
      pendingCharImageIds.value = pendingCharImageIds.value.filter(item => !ids.includes(item))
      const message = failedItems[0]?.message || '生图任务创建失败'
      toast.error(message)
      return
    }
    pendingCharImageIds.value = pendingCharImageIds.value.filter(item => !failedIds.includes(item))
    for (const item of res?.items || []) {
      setPendingCharImageTask(item.character_id, item.image_generation_id)
    }
    if (failedItems.length) {
      toast.error(`${failedItems.length} 个角色未开始生成：${failedItems[0].message}`)
    }
    toast.success(`已开始生成 ${startedIds.length} 个角色形象`)
    await refresh()
    watchCharacterImageTasks(res?.items || [])
  }).catch(e => {
    pendingCharImageIds.value = pendingCharImageIds.value.filter(item => !ids.includes(item))
    toast.error(e.message)
  }).finally(() => {
    batchCharImageRunning.value = false
  })
}
async function genSceneImg(id) {
  try {
    if (!isPendingSceneImage(id)) pendingSceneImageIds.value.push(id)
    clearFailedSceneImage(id)
    const res = await sceneAPI.generateImage(id, epId.value, selectedImageModelOption.value || imageModel.value)
    toast.success('场景图片生成中')
    await refresh()
    if (res?.image_generation_id) {
      setPendingSceneImageTask(id, res.image_generation_id)
      watchSceneImageTasks([{ scene_id: id, image_generation_id: res.image_generation_id }])
      return
    }
    watchAsyncResult(() => {
      const scene = scenes.value.find(s => s.id === id)
      const done = !!(scene?.image_url || scene?.imageUrl)
      if (done) clearPendingSceneImage(id)
      return done
    })
  } catch (e) {
    clearPendingSceneImage(id)
    toast.error(e.message)
  }
}
function batchSceneImages() {
  const ids = scenes.value.map(s => s.id).filter(Boolean)
  if (!ids.length) { toast.info('请先添加场景'); return }
  batchSceneImageRunning.value = true
  pendingSceneImageIds.value = [...new Set([...pendingSceneImageIds.value, ...ids])]
  ids.forEach(clearFailedSceneImage)
  sceneAPI.batchImages(ids, epId.value, selectedImageModelOption.value || imageModel.value).then(async (res) => {
    const startedIds = (res?.items || []).map(item => item.scene_id).filter(Boolean)
    const failedItems = res?.failed || []
    const failedIds = failedItems.map(item => item.scene_id).filter(Boolean)
    if (!startedIds.length) {
      pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => !ids.includes(item))
      toast.error(failedItems[0]?.message || '背景生成任务创建失败')
      return
    }
    pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => !failedIds.includes(item))
    for (const item of res?.items || []) {
      setPendingSceneImageTask(item.scene_id, item.image_generation_id)
    }
    if (failedItems.length) toast.error(`${failedItems.length} 个场景未开始生成：${failedItems[0].message}`)
    toast.success(`已开始生成 ${startedIds.length} 个场景背景`)
    await refresh()
    watchSceneImageTasks(res?.items || [])
  }).catch(e => {
    pendingSceneImageIds.value = pendingSceneImageIds.value.filter(item => !ids.includes(item))
    toast.error(e.message)
  }).finally(() => {
    batchSceneImageRunning.value = false
  })
}

const IGNORE_TTS_SPEAKERS = /^(环境音|环境声|音效|效果音|sfx|sound ?effect|bgm|背景音|背景音乐|ambient)$/i
const IGNORE_TTS_TEXT = /^(无|无对白|无台词|无旁白|无需配音|无需对白|none|null|n\/a|na|环境音|环境声|音效|效果音|纯音效|纯环境音|只有环境音|仅环境音|背景音|背景音乐|bgm|sfx|ambient)$/i

function getDialogueSpeakerRaw(sb) {
  const dialogue = sb?.dialogue?.trim() || ''
  const match = dialogue.match(/^(.+?)[:：]/)
  return match ? match[1].replace(/[（(].+?[)）]/g, '').trim() : ''
}

function getDialogueText(sb) {
  const dialogue = sb?.dialogue?.trim() || ''
  return dialogue ? dialogue.replace(/^.+?[:：]\s*/, '').trim() : ''
}

function isTTSIgnorable(sb) {
  const speaker = getDialogueSpeakerRaw(sb)
  const text = getDialogueText(sb)
  if (!sb?.dialogue?.trim()) return true
  if (speaker && IGNORE_TTS_SPEAKERS.test(speaker)) return true
  if (!text) return true
  if (IGNORE_TTS_TEXT.test(text)) return true
  return false
}

function hasDialogue(sb) { return !isTTSIgnorable(sb) }
function hasTTS(sb) { return !!(sb?.tts_audio_url || sb?.ttsAudioUrl) }
function getTTSUrl(sb) { return sb?.tts_audio_url || sb?.ttsAudioUrl || '' }
function getDialogueSpeaker(sb) {
  const speaker = getDialogueSpeakerRaw(sb)
  if (!speaker) return '旁白'
  return speaker
}
async function genShotTTS(sb) {
  try {
    await storyboardAPI.generateTTS(sb.id)
    toast.success(`镜头 #${sb.storyboard_number || sb.storyboardNumber || sb.id} 配音已生成`)
    await refresh()
  } catch (e) { toast.error(e.message) }
}
async function batchShotTTS() {
  const pending = sbs.value.filter(sb => hasDialogue(sb) && !hasTTS(sb))
  if (!pending.length) {
    toast.info(ttsEligibleCount.value ? '所有镜头配音已生成' : '当前没有可生成的对白或旁白')
    return
  }
  const results = await Promise.allSettled(pending.map(sb => storyboardAPI.generateTTS(sb.id)))
  const okCount = results.filter(r => r.status === 'fulfilled').length
  const failCount = results.length - okCount
  if (okCount) toast.success(`已生成 ${okCount} 条镜头配音`)
  if (failCount) toast.error(`${failCount} 条镜头配音生成失败`)
  await refresh()
}

function getFirstFrame(s) { return s?.first_frame_image || s?.firstFrameImage || null }
function getLastFrame(s) { return s?.last_frame_image || s?.lastFrameImage || null }
function getStoryboardCover(s) { return s?.composed_image || s?.composedImage || getFirstFrame(s) || getLastFrame(s) || null }
function getVideoUrl(s) { return s?.video_url || s?.videoUrl || null }
function getComposedVideoUrl(s) { return s?.composed_video_url || s?.composedVideoUrl || null }
function hasImg(s) { return !!getStoryboardCover(s) }
function hasVid(s) { return !!getVideoUrl(s) }
function hasComposed(s) { return !!getComposedVideoUrl(s) }

function getShotReferenceImages(sb) {
  const refs = []
  const pushRef = (value) => {
    if (!value || refs.includes(value) || refs.length >= 6) return
    refs.push(value)
  }
  const sceneId = sb?.scene_id || sb?.sceneId
  const scene = scenes.value.find(item => item.id === sceneId)
  pushRef(scene?.image_url || scene?.imageUrl)
  for (const charId of getStoryboardCharacterIds(sb)) {
    const char = chars.value.find(item => item.id === charId)
    pushRef(char?.image_url || char?.imageUrl)
  }
  for (const ref of getRefs(sb)) {
    pushRef(ref)
  }
  const first = getFirstFrame(sb)
  const last = getLastFrame(sb)
  const cover = getStoryboardCover(sb)
  pushRef(first)
  pushRef(last)
  if (activeShotFrameMode.value === 'last_frame') pushRef(first)
  if (activeShotFrameMode.value === 'action_sequence') pushRef(cover)
  return refs.filter(Boolean).slice(0, 6)
}

function buildShotReferenceLegend(sb) {
  const refs = []
  const scene = getStoryboardScene(sb)
  const sceneImage = scene?.image_url || scene?.imageUrl
  if (sceneImage) {
    refs.push({
      type: 'scene',
      label: '场景参考图1',
      hint: scene?.location ? `保留${scene.location}的空间布局和光线氛围` : '保留场景空间布局和光线氛围',
      url: sceneImage,
    })
  }
  const shotCharIds = getStoryboardCharacterIds(sb)
  const shotChars = chars.value.filter(char => shotCharIds.includes(char.id))
  shotChars.forEach((char, index) => {
    const image = char.image_url || char.imageUrl
    if (!image) return
    refs.push({
      type: 'character',
      label: `角色参考图${index + 2}`,
      hint: `保持${char.name}的人物一致性`,
      url: image,
      name: char.name,
    })
  })
  getRefs(sb).forEach((ref, index) => {
    refs.push({
      type: 'other',
      label: `参考图${refs.length + 1}`,
      hint: `融合参考图${index + 1}的风格和构图`,
      url: ref,
    })
  })
  return refs
}

function buildShotReferencePrefix(sb) {
  const refs = buildShotReferenceLegend(sb)
  if (!refs.length) return ''
  return refs.map(ref => `[${ref.label}${ref.hint ? `，${ref.hint}` : ''}]`).join('，')
}

function buildShotImagePrompt(sb, frameMode) {
  const title = sb.title || ''
  const description = sb.image_prompt || sb.imagePrompt || sb.description || storyboardVisualText(sb)
  const shotType = sb.shot_type || sb.shotType || ''
  const angle = sb.angle || ''
  const movement = sb.movement || ''
  const location = sb.location || getSceneName(sb)
  const time = sb.time || ''
  const charactersText = getStoryboardCharacterNames(sb).join('、')
  const action = sb.action || ''
  const atmosphere = sb.atmosphere || ''
  const referencePrefix = buildShotReferencePrefix(sb)
  const subject = charactersText ? `${charactersText}` : (title || '画面主体')
  const base = [
    description,
    action,
    shotType ? `${shotType}构图` : '',
    angle ? `${angle}机位` : '',
    movement ? `${movement}的镜头语言` : '',
    location ? `场景位于${location}` : '',
    time ? `${time}时段` : '',
    atmosphere ? `整体氛围${atmosphere}` : '',
  ].filter(Boolean).join('，')

  let modeSentence = ''
  if (frameMode === 'first_frame') {
    modeSentence = `${subject}处在动作即将开始的瞬间，姿态清晰稳定，画面用于视频首帧，必须保留后续运动的起势和空间关系。`
  } else if (frameMode === 'last_frame') {
    modeSentence = `${subject}完成动作后的结果状态，情绪落点明确，画面用于视频尾帧，必须和首帧保持角色、服装、场景和光线连续。`
  } else if (frameMode === 'action_sequence') {
    modeSentence = `将该镜头拆成${actionSequenceGridCount.value}格连续动作序列，每格展示一个清晰动作阶段，从起势、过程到结果顺序推进，角色和场景保持一致。`
  } else {
    modeSentence = `${subject}处在最能代表该镜头内容的关键瞬间，构图明确，情绪和动作具有代表性。`
  }

  const styleSentence = '皮克斯动画风格的顶尖三维建模，电影级布光，极致材质细节，清晰的皮肤纹理和环境质感，无文字，无水印。'
  return [referencePrefix, modeSentence, base, styleSentence].filter(Boolean).join('，')
}

async function genShotFrame(sb, frameType) {
  const prompt = getShotFramePrompt(sb, activeShotFrameMode.value) || buildShotImagePrompt(sb, activeShotFrameMode.value)
  const referenceImages = getShotReferenceImages(sb)
  const key = framePendingKey(sb.id, frameType)
  try {
    if (!pendingShotFrameKeys.value.includes(key)) pendingShotFrameKeys.value.push(key)
    const body = {
      storyboard_id: sb.id,
      drama_id: dramaId,
      prompt,
      frame_type: frameType,
      reference_images: referenceImages.length ? referenceImages : undefined,
    }
    await imageAPI.generate(body)
    toast.success(frameType === 'first_frame' ? '首帧生成中' : '尾帧生成中')
    await refresh()
    watchAsyncResult(() => {
      const target = sbs.value.find(s => s.id === sb.id)
      const done = frameType === 'first_frame' ? !!getFirstFrame(target) : !!getLastFrame(target)
      if (done) pendingShotFrameKeys.value = pendingShotFrameKeys.value.filter(item => item !== key)
      return done
    })
  } catch (e) {
    pendingShotFrameKeys.value = pendingShotFrameKeys.value.filter(item => item !== key)
    toast.error(e.message)
  }
}

function batchShotFrames() {
  const frameType = activeFrameType.value
  const pending = sbs.value.filter((sb) => {
    if (frameType === 'last_frame') return !getLastFrame(sb)
    if (frameType === 'first_frame') return !getFirstFrame(sb)
    return !getStoryboardCover(sb)
  })
  if (!pending.length) {
    toast.info('所有分镜已生成当前帧类型')
    return
  }
  pending.forEach(sb => genShotFrame(sb, frameType))
}

async function openShotReferenceUpload(sb) {
  if (!sb?.id) return
  pendingShotReferenceStoryboardId.value = sb.id
  pendingAssetUpload.value = null
  assetUploadInput.value?.click()
}

async function genVid(sb) {
  const params = {
    storyboard_id: sb.id,
    drama_id: dramaId,
    prompt: sb.video_prompt || sb.videoPrompt || '',
    duration: Number(sb.duration || 5),
  }
  const first = getFirstFrame(sb)
  const last = getLastFrame(sb)
  const refs = getRefs(sb)
  if (first && last) { Object.assign(params, { reference_mode: 'first_last', first_frame_url: first, last_frame_url: last }) }
  else if (refs.length) { Object.assign(params, { reference_mode: 'multiple', reference_image_urls: [first, ...refs].filter(Boolean) }) }
  else if (first) { Object.assign(params, { reference_mode: 'single', image_url: first }) }
  try {
    delete failedVideoMessages.value[sb.id]
    if (!isPendingVideo(sb.id)) pendingVideoIds.value.push(sb.id)
    const generation = await videoAPI.generate(params)
    toast.success('视频生成中')
    await refresh()
    pollVideoGeneration(generation?.id, sb.id)
  } catch (e) {
    pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== sb.id)
    toast.error(e.message)
  }
}
async function pollVideoGeneration(generationId, storyboardId) {
  if (!generationId) {
    watchAsyncResult(() => {
      const target = sbs.value.find(s => s.id === storyboardId)
      const done = !!(target?.video_url || target?.videoUrl)
      if (done) pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== storyboardId)
      return done
    }, 60, 4000)
    return
  }
  for (let i = 0; i < 120; i++) {
    await sleep(4000)
    try {
      const res = await videoAPI.get(generationId)
      await refresh()
      if (res?.status === 'completed') {
        pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== storyboardId)
        delete failedVideoMessages.value[storyboardId]
        toast.success('视频生成完成')
        return
      }
      if (res?.status === 'failed') {
        pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== storyboardId)
        failedVideoMessages.value = {
          ...failedVideoMessages.value,
          [storyboardId]: res?.error_msg || res?.errorMsg || '视频生成失败',
        }
        toast.error(failedVideoMessages.value[storyboardId])
        return
      }
    } catch {}
  }
  pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== storyboardId)
  failedVideoMessages.value = {
    ...failedVideoMessages.value,
    [storyboardId]: '视频生成超时',
  }
  toast.error('视频生成超时')
}
async function doCompose(sb) {
  try {
    delete failedComposeMessages.value[sb.id]
    if (!isPendingCompose(sb.id)) pendingComposeIds.value.push(sb.id)
    await composeAPI.shot(sb.id)
    toast.success('合成完成')
    pendingComposeIds.value = pendingComposeIds.value.filter(item => item !== sb.id)
    refresh()
  } catch (e) {
    pendingComposeIds.value = pendingComposeIds.value.filter(item => item !== sb.id)
    failedComposeMessages.value = {
      ...failedComposeMessages.value,
      [sb.id]: e.message,
    }
    toast.error(e.message)
  }
}
function batchVideos() {
  const pendingIds = sbs.value.filter(s => !hasVid(s)).map(s => s.id)
  pendingIds.forEach(id => {
    const sb = sbs.value.find(item => item.id === id)
    if (sb) genVid(sb)
  })
  if (pendingIds.length) {
    pendingVideoIds.value = [...new Set([...pendingVideoIds.value, ...pendingIds])]
    watchAsyncResult(() => pendingIds.every(id => {
      const target = sbs.value.find(s => s.id === id)
      const done = !!(target?.video_url || target?.videoUrl)
      if (done) pendingVideoIds.value = pendingVideoIds.value.filter(item => item !== id)
      return done
    }), 80, 4000)
  }
}
async function batchCompose() {
  await composeAPI.all(epId.value)
  pendingComposeIds.value = [...new Set(sbs.value.filter(sb => !!sb.video_url || !!sb.videoUrl).map(sb => sb.id))]
  toast.success('批量合成已开始')
  pollComposeStatus()
}
async function doMerge() {
  await mergeAPI.merge(epId.value); toast.success('拼接中...')
  const poll = setInterval(async () => {
    try { mergeData.value = await mergeAPI.status(epId.value) } catch {}
    if (mergeData.value?.status === 'completed' || mergeData.value?.status === 'failed') {
      clearInterval(poll)
      mergeData.value.status === 'completed' ? toast.success('拼接完成') : toast.error('拼接失败')
    }
  }, 3000)
}

async function pollComposeStatus() {
  for (let i = 0; i < 120; i++) {
    await sleep(3000)
    try {
      const res = await composeAPI.status(epId.value)
      await refresh()
      const items = Array.isArray(res?.items) ? res.items : []
      const processingIds = items.filter(item => item.status === 'compose_processing').map(item => item.id)
      pendingComposeIds.value = processingIds

      const failedItems = items.filter(item => item.status === 'compose_failed')
      if (failedItems.length) {
        const next = { ...failedComposeMessages.value }
        failedItems.forEach((item) => {
          next[item.id] = item.error_msg || item.errorMsg || '视频合成失败'
        })
        failedComposeMessages.value = next
      }

      if (!processingIds.length) {
        if (failedItems.length) toast.error(`有 ${failedItems.length} 个镜头合成失败`)
        else toast.success('批量合成完成')
        return
      }
    } catch {}
  }
}
function getRefs(sb) {
  const raw = sb.reference_images || sb.referenceImages
  if (!raw) return []
  if (Array.isArray(raw)) return raw.filter(Boolean)
  try { return JSON.parse(raw) } catch { return [] }
}

async function loadConfigs() {
  try {
    const modelScope = getAuthUser()?.id ? {} : { scope: 'public' }
    const [textModels, imageModels, videoModels, audioModels] = await Promise.all([
      aiModelAPI.options('text', modelScope),
      aiModelAPI.options('image', modelScope),
      aiModelAPI.options('video', modelScope),
      aiModelAPI.options('audio', modelScope),
    ])
    imageConfigs.value = normalizeModelConfigs(imageModels)
    videoConfigs.value = normalizeModelConfigs(videoModels)
    audioConfigs.value = normalizeModelConfigs(audioModels)
    dbTextModelOptions.value = Array.isArray(textModels) ? textModels : []
    dbImageModelOptions.value = Array.isArray(imageModels) ? imageModels : []
    if (scriptModelOptions.value.length) {
      const current = findSelectableModelOption(scriptModelOptions.value, scriptModel.value)
      const preferred = current || scriptModelOptions.value.find(m => m.is_default) || scriptModelOptions.value[0]
      scriptModel.value = preferred.value
    }
    if (imageModelOptions.value.length) {
      const current = findSelectableModelOption(imageModelOptions.value, imageModel.value)
      const preferred = current || imageModelOptions.value.find(m => m.is_default) || imageModelOptions.value[0]
      imageModel.value = preferred.value
    }
  } catch (e) { console.error('Failed to load AI configs', e) }
}

function inferVoiceGender(name, desc = []) {
  const text = `${name} ${Array.isArray(desc) ? desc.join(' ') : ''}`
  if (/[男|青年|大爷|学长|boy|man|male]/i.test(text)) return '男声'
  if (/[女|少女|御姐|奶奶|girl|woman|female]/i.test(text)) return '女声'
  return '中性'
}

function mapVoiceProfile(v) {
  const desc = Array.isArray(v.description) ? v.description : []
  return {
    id: v.voice_id,
    label: v.voice_name || v.voice_id,
    gender: inferVoiceGender(v.voice_name || v.voice_id, desc),
    traits: desc.length ? desc.slice(0, 2).join('、') : `${v.language || '多语言'}音色`,
    suitable: desc.length > 2 ? desc.slice(2).join('、') : `${v.language || '通用'}角色`,
  }
}

async function loadVoices() {
  try {
    const provider = lockedAudioProvider.value || 'minimax'
    const rows = await voicesAPI.list(provider)
    voiceProfiles.value = rows?.length ? rows.map(mapVoiceProfile) : fallbackVoiceProfiles
  } catch (e) {
    console.error('Failed to load voices', e)
    voiceProfiles.value = fallbackVoiceProfiles
  }
}

watch([lockedAudioConfigId, audioConfigs], () => { loadVoices() }, { deep: true })
onMounted(() => { refresh(); loadConfigs(); loadVoices() })
</script>

<style scoped>
/* ===== Studio Layout ===== */
.studio {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  padding: 0;
  gap: 0;
  background: transparent;
}

.asset-upload-input {
  display: none;
}

button {
  font: inherit;
}

.action-btn {
  border: 1px solid rgba(91,111,139,0.35);
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.78);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
}
.action-btn:hover {
  border-color: rgba(125,163,210,0.48);
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.92);
}
.action-btn.mini {
  min-height: 24px;
  padding: 0 9px;
  border-radius: 3px;
  font-size: 12px;
  font-weight: 700;
}
.action-btn.small {
  min-height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
}
.action-btn.info {
  background: rgba(255,255,255,0.08);
  border-color: transparent;
}
.action-btn.secondary {
  background: rgba(255,255,255,0.08);
}
.action-btn.secondary-action {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
}
.action-btn.primary-action {
  border-color: rgba(10,132,255,0.35);
  background: linear-gradient(90deg, #e3dcff 0%, #91d8ff 100%);
  color: #07111c;
}
.action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.navbar-wrapper {
  flex-shrink: 0;
}

.navbar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  flex-shrink: 0;
  height: 62px;
  min-height: 62px;
  padding: 0 24px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(180deg, #26272a 0%, #202124 100%);
  backdrop-filter: blur(14px);
  color: rgba(255,255,255,0.82);
}

.main {
  background: transparent;
  border: 0;
  box-shadow: none;
  backdrop-filter: none;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 230px;
  min-width: 0;
  position: relative;
  z-index: 2;
}

.flow-back-btn {
  display: grid;
  place-items: center;
  width: 24px;
  height: 40px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.9);
}

.studio-identity {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 14px;
}

.studio-title {
  color: #f4f7fb;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.studio-episode-chip {
  display: inline-flex;
  align-items: center;
  color: rgba(255,255,255,0.34);
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
}

.nav-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 42px;
  min-width: 0;
  max-width: calc(100% - 560px);
  overflow-x: auto;
  scrollbar-width: none;
}

.nav-center::-webkit-scrollbar {
  display: none;
}

.nav-item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.28);
  font-size: 15px;
  font-weight: 500;
  white-space: nowrap;
}

.nav-item.active {
  color: rgba(255,255,255,0.92);
  font-weight: 700;
}

.nav-item.done {
  color: rgba(255,255,255,0.38);
}

.nav-item.locked {
  color: rgba(255,255,255,0.18);
  cursor: not-allowed;
}

.nav-item.locked svg {
  opacity: 0.55;
}

.nav-item.active svg,
.nav-item.done svg {
  color: currentColor;
}

.nav-right {
  flex: 0 0 240px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  position: relative;
  z-index: 2;
}

.task-list-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 36px;
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid rgba(10,132,255,0.45);
  border-radius: 8px;
  background: rgba(10,132,255,0.08);
  color: #1ac3ff;
  font-size: 15px;
  font-weight: 500;
}

.task-list-btn:hover {
  background: rgba(10,132,255,0.14);
  border-color: rgba(10,132,255,0.7);
}

.task-badge {
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: #0a84ff;
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.credit-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #f4f7fb;
}

.credit-icon {
  color: #1ac3ff;
}

.credit-label {
  font-size: 18px;
  font-weight: 700;
}

.credit-value {
  color: #1ac3ff;
  font-size: 16px;
  font-weight: 600;
}

.task-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.58);
}

.task-modal {
  width: min(900px, calc(100vw - 48px));
  max-height: min(760px, calc(100vh - 48px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px;
  background: #2c2c32;
  color: rgba(255,255,255,0.86);
  box-shadow: 0 18px 56px rgba(0,0,0,0.42);
}

.task-modal-head {
  height: 64px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.task-modal-head h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.task-modal-close {
  margin-left: auto;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255,255,255,0.62);
}

.task-modal-close:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}

.task-modal-body {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px 24px 20px;
}

.task-filter-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.task-filter-select {
  width: 140px;
}

.task-filter-select.status {
  width: 120px;
}

.task-query-btn,
.task-reset-btn {
  height: 32px;
  padding: 0 14px;
  border-radius: 5px;
  font-size: 14px;
}

.task-query-btn {
  border: 1px solid #0a84ff;
  background: #0a84ff;
  color: #fff;
}

.task-reset-btn {
  border: 1px solid rgba(255,255,255,0.24);
  background: transparent;
  color: rgba(255,255,255,0.86);
}

.task-loading,
.task-foot-hint {
  color: rgba(255,255,255,0.45);
  font-size: 12px;
}

.task-table-wrap {
  min-height: 0;
  max-height: 470px;
  overflow: auto;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
}

.task-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 14px;
}

.task-table th,
.task-table td {
  height: 42px;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.task-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #3a3a40;
  color: rgba(255,255,255,0.9);
  font-weight: 700;
}

.task-table tr:last-child td {
  border-bottom: 0;
}

.task-table tr:hover td {
  background: rgba(255,255,255,0.04);
}

.task-status-tag {
  display: inline-flex;
  align-items: center;
  height: 24px;
  padding: 0 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

.task-status-tag.completed {
  color: #63e2b7;
  background: rgba(99,226,183,0.16);
}

.task-status-tag.failed {
  color: #e88080;
  background: rgba(232,128,128,0.16);
}

.task-status-tag.processing {
  color: #70c0ff;
  background: rgba(112,192,255,0.16);
}

.task-status-tag.pending {
  color: #f2c97d;
  background: rgba(242,201,125,0.16);
}

.task-row-failed td {
  color: rgba(255,255,255,0.6);
}

.task-empty {
  height: 120px !important;
  text-align: center !important;
  color: rgba(255,255,255,0.45);
}

.task-modal-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: rgba(255,255,255,0.55);
  font-size: 13px;
}

.studio-body {
  display: flex;
  min-height: 0;
  flex: 1;
  overflow: hidden;
  margin-top: 0;
}

/* ===== Sidebar ===== */
.sidebar {
  display: none;
}
.back-btn {
  width: 40px; height: 40px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(27, 41, 64, 0.1); border-radius: 14px;
  background: rgba(255,255,255,0.8); color: var(--text-2);
  cursor: pointer; transition: all 0.15s;
  box-shadow: var(--shadow-xs);
}
.back-btn:hover { background: #fff; color: var(--text-0); }

/* Pipeline Nav */
.pipeline { flex: 1; overflow-y: auto; padding: 16px 14px 12px; display: flex; flex-direction: column; gap: 12px; }
.pipe-section { display: flex; flex-direction: column; gap: 4px; }
.pipe-section-label {
  font-size: 10px; font-weight: 700; color: #95a1b6;
  text-transform: uppercase; letter-spacing: 0.1em;
  padding: 2px 8px 3px;
}
.pipe-item {
  display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
  padding: 7px 10px;
  border-radius: 17px;
  font-size: 12px; font-weight: 600;
  background: none; border: 1px solid transparent; color: var(--text-2); cursor: pointer;
  transition: all 0.14s; width: 100%; text-align: left;
}
.pipe-item:hover { background: rgba(255,255,255,0.3); color: var(--text-0); }
.pipe-item.locked,
.pipe-item.locked:hover {
  color: rgba(149,161,182,0.45);
  background: transparent;
  cursor: not-allowed;
  box-shadow: none;
}
.pipe-item.active {
  background: rgba(255,255,255,0.94);
  color: var(--text-0);
  border-color: rgba(27, 41, 64, 0.05);
  box-shadow: 0 8px 18px rgba(19, 33, 56, 0.045);
}
.pipe-item.done { color: var(--success); }
.pipe-item-sub {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  padding: 7px 10px;
  position: relative;
  min-height: 42px;
}

.pipe-item-sub:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 18px;
  top: 25px;
  bottom: -7px;
  width: 1px;
  background: rgba(27, 41, 64, 0.07);
}

.pipe-icon {
  width: 17px; height: 17px; border-radius: 999px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(246,248,252,0.98); border: 1px solid rgba(18,25,42,0.08);
  color: #aab4c6; flex-shrink: 0; transition: all 0.15s;
  position: relative;
  z-index: 1;
}
.pipe-item.active .pipe-icon { background: rgba(19, 51, 121, 0.07); border-color: rgba(19, 51, 121, 0.1); color: var(--accent-text); }
.pipe-item.done .pipe-icon { background: rgba(45, 122, 69, 0.96); border-color: rgba(45,122,69,0.18); color: #fff; }
.icon-active { background: var(--accent-dark) !important; border-color: var(--accent-dark) !important; color: #fff !important; }
.icon-done { background: var(--success) !important; border-color: var(--success) !important; color: #fff !important; }

.pipe-label { flex: 1; font-size: 11.5px; }
.pipe-copy { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pipe-sub {
  font-size: 8.5px;
  line-height: 1.35;
  color: var(--text-3);
  font-weight: 500;
}
.pipe-badge {
  font-size: 9px; font-weight: 700; padding: 1px 5px;
  border-radius: 99px; background: var(--bg-3); color: var(--text-3);
  font-family: var(--font-mono);
}
.pipe-badge.badge-done { background: var(--success-bg); color: var(--success); }
.pipe-spinner { width: 10px; height: 10px; border: 1.5px solid var(--accent-bg); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }

/* Sidebar Bottom */
.sidebar-bottom {
  padding: 12px 14px 14px;
  border-top: 1px solid rgba(27, 41, 64, 0.08);
  display: flex; flex-direction: column; gap: 8px;
  flex-shrink: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.72));
}
.sidebar-jumper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 3px 0 2px;
}
.sidebar-jump-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  border: none;
  background: rgba(45, 122, 69, 0.22);
  cursor: pointer;
  transition: transform 0.14s, background 0.14s, box-shadow 0.14s;
}
.sidebar-jump-dot:hover {
  transform: scale(1.08);
}
.sidebar-jump-dot.active {
  background: var(--accent-dark);
  box-shadow: 0 0 0 2px rgba(76, 125, 255, 0.14);
}
.sidebar-jump-dot.done {
  background: var(--success);
}
.sidebar-jump-dot.active.done {
  background: #1e3f8a;
}
.progress-wrap { display: flex; flex-direction: column; gap: 5px; }
.progress-head { display: flex; justify-content: space-between; }
.progress-label { font-size: 10.5px; color: var(--text-3); font-weight: 500; }
.progress-val { font-size: 10.5px; color: var(--text-2); font-family: var(--font-mono); font-weight: 600; }
.progress-track { height: 6px; background: rgba(194, 207, 227, 0.92); border-radius: 99px; overflow: hidden; }
.progress-fill { height: 100%; background: var(--accent-gradient); border-radius: 99px; transition: width 0.5s var(--ease-out); }
.refresh-btn {
  width: 100%; display: flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px; font-size: 11.5px; color: var(--text-2);
  background: rgba(255,255,255,0.86); border: 1px solid rgba(27, 41, 64, 0.08); border-radius: 999px;
  cursor: pointer; transition: all 0.15s;
}
.refresh-btn:hover { background: #fff; color: var(--text-0); }

/* ===== Main Content ===== */
.main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; min-height: 0; border-radius: 0; }
.content-panel { flex: 1; display: flex; flex-direction: column; overflow: hidden; position: relative; min-height: 0; }
.stage-subnav {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(27, 41, 64, 0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.86), rgba(255,255,255,0.52));
  overflow-x: auto;
  flex-shrink: 0;
}
.stage-subnav-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 30px;
  padding: 0 11px;
  border-radius: 999px;
  border: 1px solid rgba(27, 41, 64, 0.08);
  background: rgba(255,255,255,0.7);
  color: var(--text-2);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.15s ease;
}
.stage-subnav-item:hover {
  background: #fff;
  color: var(--text-0);
}
.stage-subnav-item.locked,
.stage-subnav-item.locked:hover {
  border-color: rgba(27, 41, 64, 0.05);
  background: rgba(255,255,255,0.34);
  color: rgba(100, 116, 139, 0.42);
  cursor: not-allowed;
}
.stage-subnav-item.active {
  background: rgba(19, 51, 121, 0.08);
  border-color: rgba(19, 51, 121, 0.12);
  color: #1e3f8a;
}
.stage-subnav-item.done {
  color: var(--text-1);
}
.stage-subnav-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--success);
  box-shadow: 0 0 0 4px rgba(45, 122, 69, 0.1);
}

/* Toolbar */
.step-toolbar {
  display: flex; align-items: center; gap: 10px;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 0;
  background: transparent;
  flex-shrink: 0;
  width: 100%;
}
.prod-toolbar { background: transparent; }
.toolbar-left { display: flex; align-items: center; gap: 8px; flex: 1; }
.toolbar-right { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.step-indicator { display: flex; align-items: center; gap: 8px; }
.step-num {
  width: 26px; height: 26px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(10,132,255,0.12);
  font-family: var(--font-mono); font-size: 13px; font-weight: 800; color: #8fc5ff; letter-spacing: 0.05em;
}
.step-name { font-size: 18px; font-weight: 400; color: #6b7280; font-family: var(--font-display); }
.char-count { font-size: 14px; color: rgba(255,255,255,0.36); font-family: var(--font-mono); }

.target-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: max-content;
  height: 32px;
  min-height: 32px;
  padding: 0 12px;
  border: none;
  border-radius: 8px;
  box-shadow: none;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  user-select: none;
  transition: all .15s cubic-bezier(.4,0,.2,1);
}

.target-action-btn.secondary-action {
  background: var(--chatfire-bg-elevated);
  color: var(--chatfire-text-primary);
  border: 1px solid var(--chatfire-border-light);
}

.target-action-btn.secondary-action:hover {
  background: var(--chatfire-bg-hover);
  border-color: var(--chatfire-color-primary);
  transform: translateY(-1px);
}

.target-action-btn.primary-action {
  background-image: linear-gradient(270deg, #94d8ff 11.11%, #e0ddff);
  color: #000;
  border-color: transparent;
}
.target-action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.script-model-select {
  width: 223px;
  flex: 0 0 223px;
}

/* Editor Area */
.step-editor { flex: 1; display: flex; flex-direction: column; min-height: 0; }
.script-editor-content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding-bottom: 170px;
}
.script-content,
.my-story {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.target-input {
  flex: 1;
  min-height: 0;
  height: 100%;
  padding-bottom: 30px;
  background: transparent;
  border-radius: 3px;
  color: rgba(255,255,255,0.82);
  position: relative;
}
.target-input-wrapper {
  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
}
.fill-textarea {
  flex: 1;
  border: none;
  border-radius: 0;
  width: 100%;
  height: 100%;
  min-height: 237px;
  padding: 12px 12px 30px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.6;
  resize: none;
  outline: none;
  font-family: var(--font-body);
  background: transparent;
  color: rgba(255,255,255,0.82);
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}
.fill-textarea[readonly] {
  cursor: default;
}
.fill-textarea:focus { box-shadow: none; }
.fill-textarea::placeholder { color: rgba(255,255,255,0.38); }
.fill-textarea::-webkit-scrollbar {
  width: 5px;
  height: 5px;
}
.fill-textarea::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.2);
  border-radius: 5px;
}
.target-input-word-count {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: rgba(255,255,255,0.52);
  font-size: 14px;
  line-height: 1;
  pointer-events: none;
}

.inline-extract-result {
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 12px;
  z-index: 18;
  padding: 18px 22px;
  border: 1px solid rgba(60, 86, 112, 0.72);
  border-radius: 10px;
  background: #07121b;
  box-shadow: 0 -18px 52px rgba(0, 0, 0, 0.34);
  animation: inlineExtractSlideUp 0.28s cubic-bezier(.22,.61,.36,1);
  transform-origin: bottom center;
}
.inline-extract-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 16px;
}
.inline-extract-title {
  font-size: 18px;
  font-weight: 700;
  color: rgba(255,255,255,0.88);
}
.inline-extract-title span {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.44);
}
.inline-extract-status {
  margin-top: 6px;
  font-size: 12px;
  color: rgba(122, 205, 255, 0.92);
}
.inline-extract-progress {
  width: 220px;
  height: 6px;
  margin-left: auto;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
}
.inline-extract-progress span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #93c5fd);
  transition: width 0.35s ease;
}
.inline-extract-groups {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 22px;
}
.inline-extract-label {
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 700;
  color: rgba(255,255,255,0.68);
}
.inline-extract-pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}
.inline-extract-pill {
  display: inline-flex;
  align-items: center;
  min-height: 38px;
  padding: 0 18px;
  border: 1px solid rgba(56, 189, 248, 0.42);
  border-radius: 18px;
  background: rgba(14, 94, 148, 0.28);
  color: #7dd3fc;
  font-size: 14px;
  font-weight: 700;
}
.inline-extract-empty {
  color: rgba(255,255,255,0.36);
  font-size: 13px;
}
@keyframes inlineExtractSlideUp {
  from {
    opacity: 0;
    transform: translateY(calc(100% + 18px));
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Step Empty State */
.step-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; min-height: 300px; gap: 10px; padding: 46px;
  animation: fadeIn 0.3s var(--ease-out);
}
.empty-visual {
  width: 72px; height: 72px; border-radius: 22px;
  background: rgba(255,255,255,0.8); color: var(--accent);
  border: 1px solid rgba(27, 41, 64, 0.08);
  box-shadow: var(--shadow-sm);
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
}
.empty-title { font-size: 22px; font-weight: 700; font-family: var(--font-display); color: var(--text-0); }
.empty-desc { font-size: 13px; color: var(--text-2); max-width: 420px; text-align: center; line-height: 1.8; }
.step-empty-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; justify-content: center; }

/* Step Loading */
.step-loading {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  flex: 1; gap: 12px;
}
.loading-text { font-size: 13px; color: var(--text-2); }

/* Step Navigator Bubble */
.step-bubble {
  position: absolute;
  right: 22px;
  bottom: 22px;
  z-index: 10;
  display: flex; align-items: center; gap: 12px;
  padding: 0;
  background: transparent;
  border-top: 0;
  margin-top: 0;
}
.bubble-btn {
  display: flex; align-items: center; gap: 6px;
  min-height: 48px;
  padding: 0 20px; border-radius: 12px; font-size: 18px; font-weight: 500;
  border: 0; background: #121b2b; color: rgba(255,255,255,0.72); cursor: pointer;
  transition: all 0.15s; white-space: nowrap;
}
.bubble-btn:hover:not(:disabled) { background: #1b2537; color: #fff; }
.bubble-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.bubble-btn.primary { margin-left: auto; background: #b7c8ff; color: #fff; box-shadow: none; border-color: transparent; }
.bubble-btn.primary:hover:not(:disabled) { filter: brightness(1.08); }
.bubble-btn.primary:disabled { filter: none; box-shadow: none; opacity: 0.5; }
.bubble-dots { display: flex; gap: 7px; padding: 0 4px; }
.bubble-dot {
  width: 12px; height: 12px; border-radius: 50%;
  background: rgba(143, 160, 184, 0.36); cursor: pointer; transition: all 0.15s;
  border: none;
}
.bubble-dot.done { background: rgba(25, 195, 125, 0.55); }
.bubble-dot.current { background: #2563eb; transform: scale(1.2); box-shadow: 0 0 0 2px rgba(76, 125, 255, 0.14); }

/* Extract grid */
.extract-stage { flex: 1; min-height: 0; overflow: hidden; padding: 12px 16px; display: grid; grid-template-columns: 280px minmax(0, 1fr) minmax(0, 1fr); gap: 12px; align-items: stretch; }
.extract-summary { padding: 16px; display: flex; flex-direction: column; gap: 14px; align-self: stretch; position: sticky; top: 0; max-height: 100%; background: #111827; border-color: rgba(255,255,255,0.08); }
.extract-summary-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3); }
.extract-summary-title { font-size: 20px; line-height: 1.05; font-family: var(--font-display); color: var(--text-0); }
.extract-summary-desc { font-size: 12px; color: var(--text-2); line-height: 1.7; }
.extract-summary-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.extract-summary-stat { padding: 10px 12px; border-radius: 14px; background: rgba(19, 51, 121, 0.05); border: 1px solid rgba(19, 51, 121, 0.08); display: flex; flex-direction: column; gap: 4px; }
.extract-summary-stat span { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.08em; }
.extract-summary-stat strong { font-size: 18px; color: var(--text-0); font-family: var(--font-display); }
.extract-summary-note { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,0.56); border: 1px solid rgba(27, 41, 64, 0.08); font-size: 11px; line-height: 1.7; color: var(--text-2); }
.extract-card { overflow: hidden; min-height: 0; display: flex; flex-direction: column; background: #111827; border-color: rgba(255,255,255,0.08); }
.extract-card-head {
  display: flex; align-items: center; gap: 8px;
  padding: 11px 14px; font-size: 12px; font-weight: 600;
  border-bottom: 1px solid rgba(255,255,255,0.08); background: #151a22;
  color: rgba(255,255,255,0.74);
}
.extract-list { padding: 8px 14px; flex: 1; min-height: 0; overflow-y: auto; }
.extract-row { display: flex; align-items: center; gap: 10px; padding: 7px 0; }
.extract-row + .extract-row { border-top: 1px solid var(--border); }
.char-avatar {
  width: 30px; height: 30px; border-radius: 50%;
  background: var(--accent-bg); color: var(--accent-text);
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; flex-shrink: 0;
}
.scene-icon {
  width: 30px; height: 30px; border-radius: 6px;
  background: var(--bg-2); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--text-3); flex-shrink: 0;
}
.extract-info { min-width: 0; }
.extract-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.extract-name { font-size: 13px; font-weight: 600; }
.extract-meta { font-size: 11px; color: var(--text-3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.extract-meta.wrap { white-space: normal; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }

.extract-drawer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 240;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(2, 8, 23, 0.42);
  backdrop-filter: blur(3px);
}
.extract-drawer {
  width: min(1120px, calc(100vw - 24px));
  max-height: min(72vh, 680px);
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-bottom: 0;
  border-radius: 18px 18px 0 0;
  background: #0f172a;
  color: rgba(255,255,255,0.86);
  box-shadow: 0 -22px 80px rgba(0,0,0,0.38);
  animation: drawerSlideUp 0.22s cubic-bezier(.22,.61,.36,1);
  overflow: hidden;
}
.extract-drawer-handle {
  width: 46px;
  height: 4px;
  border-radius: 999px;
  background: rgba(255,255,255,0.28);
  margin: 10px auto 2px;
  flex-shrink: 0;
}
.extract-drawer-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.extract-drawer-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
}
.extract-drawer-stats {
  display: flex;
  align-items: center;
  gap: 8px;
}
.extract-drawer-body {
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 12px;
  padding: 14px 18px 18px;
  overflow: hidden;
}
.extract-drawer-card {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  background: rgba(17, 24, 39, 0.96);
  overflow: hidden;
}
.extract-drawer-list {
  min-height: 0;
  overflow-y: auto;
  padding: 8px 14px;
}
.extract-drawer-empty {
  padding: 18px 0;
  color: rgba(255,255,255,0.42);
  font-size: 12px;
  text-align: center;
}
@keyframes drawerSlideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}

/* Voice grid */
.voice-stage { flex: 1; min-height: 0; overflow-y: auto; padding: 14px 16px; display: grid; grid-template-columns: 280px minmax(0, 1fr); gap: 12px; }
.voice-stage-panel {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  align-self: start;
  position: sticky;
  top: 0;
  min-height: 0;
  max-height: calc(100vh - 210px);
  overflow: hidden;
  background: #111827;
  border-color: rgba(255,255,255,0.08);
}
.voice-stage-kicker { font-size: 10px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--text-3); }
.voice-stage-title { font-size: 20px; line-height: 1.05; font-family: var(--font-display); color: var(--text-0); }
.voice-stage-desc { font-size: 12px; color: var(--text-2); line-height: 1.7; }
.voice-stage-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.voice-stage-stat { padding: 10px 12px; border-radius: 14px; background: rgba(19, 51, 121, 0.05); border: 1px solid rgba(19, 51, 121, 0.08); display: flex; flex-direction: column; gap: 3px; }
.voice-stage-stat-label { font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.08em; }
.voice-stage-stat strong { font-size: 18px; color: var(--text-0); font-family: var(--font-display); }
.voice-library-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-3);
}
.voice-library {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.voice-library-item { padding: 10px 12px; border-radius: 14px; background: rgba(255,255,255,0.56); border: 1px solid rgba(27, 41, 64, 0.08); display: flex; flex-direction: column; gap: 4px; }
.voice-library-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.voice-library-name { font-size: 13px; font-weight: 700; color: var(--text-0); }
.voice-library-traits { font-size: 11px; color: var(--text-1); }
.voice-library-fit { font-size: 10px; color: var(--text-3); line-height: 1.5; }

.voice-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; align-content: start; }
.voice-card { padding: 16px; display: flex; flex-direction: column; gap: 12px; border-radius: 12px; min-height: 0; background: #111827; border-color: rgba(255,255,255,0.08); }
.voice-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.voice-char { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.voice-name { min-width: 0; flex: 1; }
.voice-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.voice-card-copy { min-height: 58px; }
.voice-card-text { font-size: 12px; line-height: 1.7; color: var(--text-2); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.voice-select-block { display: flex; flex-direction: column; gap: 6px; }
.voice-block-label { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-3); }
.voice-profile-card { padding: 12px; border-radius: 16px; background: linear-gradient(135deg, rgba(19, 51, 121, 0.08), rgba(255,255,255,0.78)); border: 1px solid rgba(19, 51, 121, 0.1); display: flex; flex-direction: column; gap: 4px; }
.voice-profile-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.voice-profile-name { font-size: 13px; font-weight: 700; color: var(--accent-text); }
.voice-profile-traits { font-size: 11px; color: var(--text-1); }
.voice-profile-fit { font-size: 10px; color: var(--text-2); line-height: 1.5; }
.voice-actions-row { display: flex; align-items: center; gap: 8px; }
.voice-player audio { width: 100%; height: 30px; border-radius: var(--radius); }
.char-avatar.lg { width: 38px; height: 38px; font-size: 16px; }

/* Split layout (storyboard) */
.split-layout { flex: 1; display: flex; min-height: 0; overflow: hidden; }
.shot-list { width: 296px; flex-shrink: 0; overflow-y: auto; border-right: 1px solid rgba(255,255,255,0.08); background: #08111a; }
.shot-list-head {
  position: sticky;
  top: 0;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 11px 12px 10px;
  border-bottom: 1px solid rgba(27, 41, 64, 0.06);
  background: #101820;
  backdrop-filter: blur(10px);
}
.shot-list-title { font-size: 13px; font-weight: 700; color: var(--text-0); }
.shot-list-sub { margin-top: 3px; font-size: 11px; color: var(--text-3); line-height: 1.45; }
.shot-list-body { padding: 6px; }
.shot-item {
  position: relative; padding: 10px 11px; cursor: pointer;
  border: 1px solid transparent; border-left: 3px solid transparent;
  transition: all 0.15s;
  display: flex; flex-direction: column; gap: 5px;
  border-radius: 14px;
}
.shot-item + .shot-item { margin-top: 6px; }
.shot-item:hover { background: var(--bg-hover); border-color: rgba(27, 41, 64, 0.06); }
.shot-item.active {
  background: var(--bg-0);
  border-left-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent-glow);
  z-index: 1;
}
.shot-item-header { display: flex; align-items: center; gap: 8px; }
.shot-num {
  font-size: 11px; font-family: var(--font-mono); font-weight: 700;
  color: var(--accent); background: var(--accent-bg);
  padding: 2px 6px; border-radius: 4px; flex-shrink: 0;
  letter-spacing: 0.03em;
}
.shot-item.active .shot-num { background: var(--accent); color: #fff; }
.shot-status { display: flex; gap: 4px; margin-left: auto; flex-shrink: 0; }
.shot-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--bg-3); flex-shrink: 0; }
.shot-dot.has-img { background: var(--success); }
.shot-dot.has-video { background: var(--info); }
.shot-dot.has-dialogue { background: var(--warning); }
.shot-body { }
.shot-desc { font-size: 12px; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-1); }
.shot-item.active .shot-desc { color: var(--text-0); }
.shot-meta { display: flex; align-items: center; gap: 6px; }
.shot-location {
  font-size: 10px;
  color: var(--text-3);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.shot-dialogue {
  font-size: 10px; color: var(--text-3); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  padding-left: 2px; border-left: 2px solid var(--border);
  padding-left: 6px;
}

.detail-panel { flex: 1; display: flex; flex-direction: column; overflow-y: auto; min-width: 0; }
.detail-head { display: flex; align-items: center; gap: 8px; padding: 9px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); flex-shrink: 0; }
.detail-head-copy { display: flex; flex-direction: column; gap: 2px; }
.detail-head-title { font-size: 14px; font-weight: 700; color: var(--text-0); }
.detail-head-sub { font-size: 11px; color: var(--text-3); }
.detail-body { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
.detail-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(220px, 0.9fr);
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(20,39,82,0.08), rgba(255,255,255,0.68));
  border: 1px solid rgba(27, 41, 64, 0.08);
}
.detail-hero-copy { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.detail-hero-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--text-3);
}
.detail-hero-text { font-size: 13px; color: var(--text-1); line-height: 1.7; }
.detail-status-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.detail-preview-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.detail-preview-card { display: flex; flex-direction: column; gap: 6px; }
.detail-preview-title { font-size: 11px; font-weight: 700; color: var(--text-2); }
.detail-preview-media {
  position: relative; aspect-ratio: 16/9; overflow: hidden;
  border-radius: 14px; background: rgba(18,25,42,0.08);
  border: 1px solid rgba(27, 41, 64, 0.08);
}
.detail-preview-media img { width: 100%; height: 100%; object-fit: cover; display: block; }
.detail-preview-empty {
  width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  color: var(--text-3); font-size: 12px;
}
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #111827;
  border: 1px solid rgba(255,255,255,0.08);
}
.detail-section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
}
.detail-section-title { font-size: 12px; font-weight: 700; color: var(--text-0); }
.detail-section-copy { font-size: 11px; color: var(--text-3); }

/* Field */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-1); }
.field-row { display: flex; gap: 12px; }
.field-grid { display: grid; gap: 12px; }
.field-grid-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.field-grid-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.locked-config {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(19, 51, 121, 0.08);
  border: 1px solid rgba(19, 51, 121, 0.12);
  color: var(--text-1);
  font-size: 11px;
  font-weight: 600;
}
.locked-config-banner {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-2);
}
.role-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.role-pill {
  height: 32px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(27, 41, 64, 0.12);
  background: rgba(255,255,255,0.86);
  color: var(--text-2);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}
.role-pill:hover { border-color: var(--accent); color: var(--text-0); }
.role-pill.active {
  border-color: var(--accent);
  background: var(--accent);
  color: #fff;
  box-shadow: 0 8px 18px rgba(29, 77, 176, 0.18);
}

/* Production tabs */
.prod-tabs { display: flex; gap: 0; background: rgba(255,255,255,0.08); border-radius: var(--radius); padding: 2px; }
.prod-tab {
  display: flex; align-items: center; gap: 4px; padding: 6px 12px; font-size: 12px;
  border: none; background: transparent; color: var(--text-2); cursor: pointer;
  border-radius: calc(var(--radius) - 2px); transition: all 0.15s; font-weight: 500;
}
.prod-tab:hover { color: var(--text-0); }
.prod-tab.active { background: rgba(255,255,255,0.12); color: #fff; font-weight: 600; box-shadow: none; }
.prod-tab-badge { font-size: 10px; font-family: var(--font-mono); padding: 0 4px; background: var(--bg-3); border-radius: 99px; }
.prod-tab.active .prod-tab-badge { background: var(--accent-bg); color: var(--accent-text); }

/* Production content */
.prod-content { flex: 1; overflow-y: auto; padding: 12px 16px; display: flex; flex-direction: column; gap: 12px; }
.prod-section-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

/* Character role page */
.role-panel-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 36px;
  border-radius: 12px;
  background: #1c2025;
}
.role-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 46px;
}
.role-title-block {
  min-width: 0;
  padding-top: 2px;
}
.role-title {
  color: #f3f4f6;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}
.role-description {
  margin-top: 10px;
  color: rgba(255,255,255,0.48);
  font-size: 14px;
  line-height: 1.4;
}
.role-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: nowrap;
  min-width: 0;
  overflow-x: auto;
  scrollbar-width: none;
}
.role-actions::-webkit-scrollbar {
  display: none;
}
.role-action-btn,
.role-next-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(91, 111, 139, 0.38);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  color: rgba(255,255,255,0.86);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.15s ease;
}
.role-action-btn.secondary {
  background: #202735;
}
.role-action-btn.secondary:hover {
  background: #263246;
  border-color: rgba(125, 163, 210, 0.45);
}
.role-action-btn.primary {
  min-width: 176px;
  border-color: transparent;
  background: linear-gradient(90deg, #e3d9ff 0%, #91ddff 100%);
  color: #0a0e17;
}
.role-action-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}
.role-cost {
  display: inline-flex;
  align-items: center;
  margin-left: 2px;
  color: #086a9a;
  font-size: 13px;
  font-weight: 800;
}
.role-next-btn {
  min-width: 68px;
  border-color: transparent;
  background: #a9dcff;
  color: #07111c;
}
.role-model-select {
  width: 206px;
  flex: 0 0 206px;
}
.role-image-model-select {
  width: 190px;
  flex: 0 0 190px;
}
.role-model-select :deep(.base-select-trigger),
.role-image-model-select :deep(.base-select-trigger) {
  height: 28px;
  min-height: 28px;
  padding: 0 26px 0 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.82);
  font-size: 14px;
  box-shadow: none;
}
.role-model-select :deep(.base-select-trigger:hover),
.role-image-model-select :deep(.base-select-trigger:hover) {
  border-color: #409cff;
  background: rgba(255,255,255,0.1);
}
.role-model-select :deep(.base-select-label),
.role-image-model-select :deep(.base-select-label) {
  font-weight: 400;
}

/* Storyboard list page */
.storyboard-panel-container {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 24px 28px 36px;
  border-radius: 12px;
  background: #1c2025;
  color: rgba(255,255,255,0.86);
}
.storyboard-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 14px;
}
.storyboard-header .header-left {
  min-width: 0;
}
.storyboard-header .font-bold {
  display: block;
  color: #f3f4f6;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: 0;
}
.storyboard-description {
  margin-top: 8px;
  color: rgba(255,255,255,0.48);
  font-size: 14px;
  line-height: 1.4;
}
.storyboard-description .info-divider {
  margin: 0 8px;
  color: rgba(255,255,255,0.28);
}
.storyboard-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
  flex-wrap: nowrap;
}
.model-select-inline {
  width: 230px;
  flex: 0 0 230px;
}
.storyboard-model-select :deep(.base-select-trigger) {
  height: 28px;
  min-height: 28px;
  padding: 0 26px 0 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.82);
  font-size: 14px;
  box-shadow: none;
}
.storyboard-model-select :deep(.base-select-trigger:hover) {
  border-color: #409cff;
  background: rgba(255,255,255,0.1);
}
.storyboard-model-select :deep(.base-select-label) {
  font-weight: 400;
}
.storyboard-panel-container .action-btn {
  min-height: 28px;
  border-radius: 3px;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 12px;
  color: rgba(255,255,255,0.86);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: 0.15s ease;
}
.storyboard-panel-container .action-btn.small {
  height: 32px;
}
.storyboard-panel-container .action-btn.secondary-action {
  background: #202735;
  border-color: rgba(91, 111, 139, 0.38);
}
.storyboard-panel-container .action-btn.secondary-action:hover {
  background: #263246;
  border-color: rgba(125, 163, 210, 0.45);
}
.storyboard-panel-container .action-btn.primary-action {
  min-width: 68px;
  background: #a9dcff;
  color: #07111c;
}
.storyboard-panel-container .action-btn.text {
  width: 30px;
  flex: 0 0 30px;
  padding: 0;
  background: transparent;
  color: rgba(255,255,255,0.54);
}
.storyboard-panel-container .action-btn.text:hover {
  color: #ff8a8a;
  background: rgba(255,255,255,0.06);
}
.storyboard-panel-container .action-btn:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}
.storyboard-inline-loading {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0 10px;
  padding: 0 12px;
  border-radius: 3px;
  background: rgba(10,132,255,0.1);
  color: rgba(255,255,255,0.72);
  font-size: 13px;
}
.storyboard-extract-loading {
  min-height: 620px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  color: rgba(255,255,255,0.84);
}
.extract-orbit {
  position: relative;
  width: 92px;
  height: 58px;
  filter: drop-shadow(0 0 10px rgba(255,255,255,0.72));
}
.extract-orbit::before {
  content: "";
  position: absolute;
  left: 8px;
  top: 11px;
  width: 58px;
  height: 34px;
  border: 4px solid rgba(255,255,255,0.88);
  border-right-color: transparent;
  border-radius: 50%;
  transform: rotate(-8deg);
  animation: extractPulse 1.8s ease-in-out infinite;
}
.extract-orbit span {
  position: absolute;
  right: 12px;
  top: 28px;
  width: 18px;
  height: 4px;
  border-radius: 99px;
  background: rgba(255,255,255,0.92);
  animation: extractDot 1.8s ease-in-out infinite;
}
.extract-main-text {
  margin-top: 8px;
  color: rgba(255,255,255,0.86);
  font-size: 20px;
  line-height: 1.35;
  font-weight: 800;
  text-align: center;
}
.extract-sub-text {
  margin-top: -8px;
  color: rgba(255,255,255,0.38);
  font-size: 14px;
  line-height: 1.4;
}
@keyframes extractPulse {
  0%, 100% { opacity: 0.7; transform: rotate(-8deg) scale(0.94); }
  50% { opacity: 1; transform: rotate(-8deg) scale(1.04); }
}
@keyframes extractDot {
  0%, 100% { opacity: 0.45; transform: translateX(-4px); }
  50% { opacity: 1; transform: translateX(4px); }
}
.storyboard-list {
  padding-top: 8px;
}
.storyboard-items {
  display: flex;
  flex-direction: column;
}
.storyboard-wrapper {
  position: relative;
}
.insert-area {
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.insert-line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 1px;
  background: rgba(255,255,255,0.08);
}
.insert-button {
  position: relative;
  z-index: 1;
  height: 22px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 8px;
  border: 1px solid rgba(91,111,139,0.32);
  border-radius: 3px;
  background: #1c2025;
  color: rgba(255,255,255,0.46);
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  cursor: pointer;
  transition: 0.15s ease;
}
.insert-area:hover .insert-button,
.storyboard-wrapper:hover > .insert-area .insert-button {
  opacity: 1;
}
.insert-button:hover {
  color: rgba(255,255,255,0.86);
  border-color: rgba(125,163,210,0.45);
  background: #263246;
}
.storyboard-item {
  display: grid;
  grid-template-columns: 22px 30px minmax(0, 1fr);
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: rgba(255,255,255,0.035);
  transition: border-color 0.15s ease, background 0.15s ease;
}
.storyboard-item:hover,
.storyboard-item.expanded {
  border-color: rgba(125,163,210,0.24);
  background: rgba(255,255,255,0.05);
}
.storyboard-item .handle {
  width: 22px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.34);
  cursor: grab;
}
.item-number {
  width: 30px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.78);
  font-size: 14px;
  font-weight: 700;
}
.item-content {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 9px;
}
.storyboard-collapsed-head {
  width: 100%;
  min-height: 32px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto 18px;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}
.storyboard-summary {
  min-width: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  color: rgba(255,255,255,0.8);
  font-size: 14px;
  line-height: 20px;
}
.storyboard-meta-pill {
  max-width: 92px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 2px 8px;
  border-radius: 3px;
  background: rgba(10,132,255,0.12);
  color: #9fd2ff;
  font-size: 12px;
  line-height: 18px;
}
.storyboard-expand-icon {
  color: rgba(255,255,255,0.46);
  transition: transform 0.16s ease, color 0.16s ease;
}
.storyboard-collapsed-head:hover .storyboard-summary,
.storyboard-collapsed-head:hover .storyboard-expand-icon {
  color: rgba(255,255,255,0.9);
}
.storyboard-item.expanded .storyboard-expand-icon {
  transform: rotate(180deg);
}
.storyboard-item.expanded {
  padding-bottom: 14px;
}
.storyboard-action-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}
.storyboard-textarea-wrap {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.storyboard-visual-text {
  padding: 8px 10px;
  border-radius: 3px;
  background: rgba(255,255,255,0.07);
  color: rgba(255,255,255,0.66);
  font-size: 13px;
  line-height: 1.55;
}
.storyboard-textarea {
  width: 100%;
  min-height: 58px;
  max-height: 148px;
  resize: vertical;
  padding: 8px 52px 8px 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  outline: none;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.82);
  font-size: 14px;
  line-height: 1.6;
}
.storyboard-textarea:hover,
.storyboard-textarea:focus {
  border-color: #409cff;
  box-shadow: 0 0 8px 0 rgba(10,132,255,0.3);
}
.storyboard-textarea::placeholder {
  color: rgba(255,255,255,0.38);
}
.storyboard-word-count {
  position: absolute;
  right: 10px;
  bottom: 6px;
  color: rgba(255,255,255,0.52);
  font-size: 11px;
  pointer-events: none;
}
.characters-display,
.scene-display {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  min-width: 0;
}
.characters-label,
.scene-label {
  flex: 0 0 auto;
  color: rgba(255,255,255,0.5);
  font-size: 13px;
  line-height: 24px;
}
.characters-list,
.scene-info,
.empty-characters {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.character-tag,
.scene-tag,
.scene-detail,
.add-character-btn {
  min-height: 24px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 3px;
  font-size: 12px;
  line-height: 18px;
}
.character-tag {
  background: rgba(10,132,255,0.14);
  color: #9fd2ff;
}
.scene-tag {
  background: rgba(86,172,119,0.14);
  color: #a4e8bd;
}
.scene-detail {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.58);
}
.add-character-btn {
  color: rgba(255,255,255,0.46);
  border: 1px dashed rgba(255,255,255,0.16);
  cursor: pointer;
}
.add-character-btn:hover {
  color: rgba(255,255,255,0.82);
  border-color: rgba(125,163,210,0.45);
}
.storyboard-empty {
  min-height: 240px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: rgba(255,255,255,0.58);
  text-align: center;
}
.storyboard-empty .empty-title {
  color: rgba(255,255,255,0.86);
  font-size: 16px;
  font-weight: 700;
}
.storyboard-empty .empty-desc {
  max-width: 520px;
  font-size: 13px;
  line-height: 1.6;
}
.role-cards {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 22px;
  align-items: start;
  align-content: flex-start;
}
.role-card {
  width: 100%;
  height: 430px;
  border-radius: 8px;
  overflow: hidden;
}
.role-card.add-card {
  border: 2px dashed rgba(75, 85, 99, 0.66);
  background: #262b33;
  color: rgba(255,255,255,0.56);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  cursor: pointer;
}
.role-card.add-card:hover {
  border-color: rgba(147, 197, 253, 0.46);
  color: rgba(255,255,255,0.76);
}
.add-icon {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-text {
  font-size: 16px;
  font-weight: 700;
}
.character-card {
  position: relative;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(0, 0, 0, 0.55);
  background: #121417;
  box-shadow: 0 4px 10px rgba(0,0,0,0.24);
}
.character-image {
  position: relative;
  height: 245px;
  flex-shrink: 0;
  overflow: hidden;
  background: #2f323a;
  display: flex;
  align-items: center;
  justify-content: center;
}
.character-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.image-placeholder {
  color: rgba(255,255,255,0.54);
  display: flex;
  align-items: center;
  justify-content: center;
}
.character-image-loading {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(47,50,58,0.88);
  color: rgba(255,255,255,0.78);
  font-size: 14px;
  font-weight: 600;
  backdrop-filter: blur(2px);
}
.character-image-error {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  min-height: 32px;
  border: 1px solid rgba(232,128,128,0.4);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(232,128,128,0.14);
  color: #f3aaaa;
  font-size: 13px;
  font-weight: 700;
}
.scene-card .character-image {
  background: #30333b;
}
.scene-card .character-name {
  font-size: 17px;
}
.scene-card .character-info {
  min-height: 135px;
}
.character-info {
  min-height: 135px;
  padding: 18px 20px 8px;
  color: #f8fafc;
}
.character-name {
  font-size: 18px;
  line-height: 1.2;
  font-weight: 800;
  margin-bottom: 14px;
}
.character-attributes {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.attribute {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr);
  gap: 8px;
  align-items: start;
  color: rgba(255,255,255,0.58);
  font-size: 12px;
  line-height: 1.45;
}
.attribute svg {
  margin-top: 1px;
  color: rgba(255,255,255,0.64);
}
.attribute-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attribute-text.multiline {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.character-actions {
  position: absolute;
  right: 14px;
  top: 14px;
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.character-card:hover .character-actions {
  opacity: 1;
}
.char-icon-btn,
.image-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.18);
  background: rgba(36, 39, 45, 0.88);
  color: rgba(255,255,255,0.78);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.15s ease;
}
.char-icon-btn:hover,
.image-action-btn:hover {
  background: rgba(61, 67, 77, 0.96);
  color: #fff;
}
.image-actions {
  margin-top: auto;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: #111316;
}
.image-action-btn {
  width: 28px;
  height: 28px;
}
.image-action-btn.save-to-library {
  color: rgba(255,255,255,0.7);
}

.role-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.54);
}
.role-design-modal {
  position: relative;
  width: min(760px, calc(100vw - 48px));
  height: auto;
  max-height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  padding: 16px 28px 20px;
  border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.09);
  background: linear-gradient(180deg, #2c2c32 0%, #3a4254 100%);
  color: rgba(255,255,255,0.86);
  box-shadow: 0 24px 72px rgba(0,0,0,0.42);
}
.role-modal-close {
  position: absolute;
  top: 20px;
  right: 26px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: rgba(255,255,255,0.52);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.role-modal-close:hover {
  background: rgba(255,255,255,0.12);
}
.role-modal-title {
  margin: 0 0 8px;
  color: rgba(255,255,255,0.92);
  font-size: 18px;
  line-height: 1;
  font-weight: 500;
}
.role-modal-content {
  min-height: 0;
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 16px;
}
.role-modal-image {
  height: 460px;
  min-height: 460px;
  border-radius: 8px;
  overflow: hidden;
  background: linear-gradient(180deg, #1f2027 0%, #252936 100%);
}
.role-modal-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.role-modal-image-placeholder {
  width: 100%;
  height: 100%;
  min-height: 460px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  color: rgba(255,255,255,0.48);
}
.role-upload-btn,
.role-generate-btn {
  min-height: 30px;
  border: 0;
  border-radius: 6px;
  padding: 0 14px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.role-upload-btn {
  background: #9bd9ff;
  color: #07111c;
}
.role-generate-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: linear-gradient(90deg, #e5dcff 0%, #86d8ff 100%);
  color: #07111c;
  box-shadow: 0 14px 30px rgba(0,0,0,0.22);
}
.role-generate-cost {
  color: #045f96;
  font-size: 14px;
  font-weight: 800;
}
.role-modal-form {
  min-height: 0;
  max-height: 460px;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.role-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  color: rgba(255,255,255,0.9);
  font-size: 14px;
  font-weight: 400;
}
.role-field input,
.role-field textarea {
  width: 100%;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.86);
  outline: none;
  font-size: 15px;
  font-family: inherit;
}
.role-field input {
  height: 40px;
  padding: 0 14px;
}
.role-field textarea {
  min-height: 80px;
  resize: vertical;
  padding: 8px 12px;
  line-height: 1.6;
}
.role-field input:focus,
.role-field textarea:focus {
  border-color: #409cff;
  box-shadow: 0 0 8px rgba(10,132,255,0.3);
  background: rgba(10,132,255,0.1);
}
.role-form-select :deep(.base-select-trigger) {
  height: 40px;
  min-height: 40px;
  padding: 0 26px 0 12px;
  border: 1px solid transparent;
  border-radius: 3px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.86);
  font-size: 15px;
}
.role-form-select :deep(.base-select-trigger:hover),
.role-form-select :deep(.base-select-trigger.open) {
  border-color: #409cff;
  background: rgba(10,132,255,0.1);
}
.role-form-select :deep(.base-select-label) {
  font-weight: 600;
}
.role-modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  flex-shrink: 0;
}
.role-modal-text-btn,
.role-modal-primary-btn {
  height: 32px;
  border: 0;
  border-radius: 8px;
  padding: 0 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.role-modal-text-btn {
  background: transparent;
  color: rgba(255,255,255,0.9);
}
.role-modal-primary-btn {
  background: #9bd9ff;
  color: #06101a;
}

:global(.role-form-select-dropdown) {
  z-index: 10020;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.08);
  background: #22202d;
  box-shadow: none;
}
:global(.role-form-select-dropdown .base-select-search) {
  display: none;
}
:global(.role-form-select-dropdown .base-select-options) {
  max-height: 244px;
  padding: 8px;
}
:global(.role-form-select-dropdown .base-select-option) {
  min-height: 42px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  border-radius: 6px;
  color: rgba(255,255,255,0.86);
  font-size: 15px;
  font-weight: 600;
}
:global(.role-form-select-dropdown .base-select-option:hover),
:global(.role-form-select-dropdown .base-select-option.highlighted) {
  background: rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.9);
}
:global(.role-form-select-dropdown .base-select-option.selected) {
  position: relative;
  background: rgba(255,255,255,0.16);
  color: #0a84ff;
}
:global(.role-form-select-dropdown .base-select-option.selected::after) {
  content: '✓';
  position: absolute;
  right: 14px;
  color: #0a84ff;
  font-weight: 700;
}

.role-library-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0,0,0,0.45);
}
.role-library-modal {
  width: min(860px, calc(100vw - 48px));
  max-height: 72vh;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.09);
  background: rgb(44,44,50);
  color: rgba(255,255,255,0.82);
  box-shadow: 0 1px 2px -2px rgba(0,0,0,.24), 0 3px 6px rgba(0,0,0,.18), 0 5px 12px 4px rgba(0,0,0,.12);
}
.role-library-header {
  position: relative;
  min-height: 50px;
  padding: 14px 18px 0;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}
.role-library-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgba(255,255,255,0.92);
  font-size: 15px;
  font-weight: 700;
  line-height: 24px;
}
.role-library-close {
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 3px;
  background: transparent;
  color: rgba(255,255,255,0.52);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.role-library-close:hover {
  background: rgba(255,255,255,0.12);
}
.role-library-content {
  min-height: 0;
  flex: 1;
  padding: 0 18px;
  display: flex;
  flex-direction: column;
}
.role-library-search {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 82px;
  gap: 10px;
  margin: 12px 0 14px;
}
.role-library-search-input {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 12px;
  border-radius: 6px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.52);
}
.role-library-search-input input {
  min-width: 0;
  flex: 1;
  border: 0;
  outline: none;
  background: transparent;
  color: rgba(255,255,255,0.86);
  font-size: 13px;
}
.role-library-search-input input::placeholder {
  color: rgba(255,255,255,0.38);
}
.role-library-search-btn {
  height: 38px;
  border: 0;
  border-radius: 6px;
  background: #0a84ff;
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.role-library-empty {
  min-height: 240px;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.38);
  text-align: center;
}
.role-library-empty p {
  margin: 10px 0 0;
  font-size: 13px;
}
.role-library-empty .hint {
  margin-top: 14px;
  color: rgba(255,255,255,0.26);
  font-size: 12px;
}
.role-library-grid {
  min-height: 0;
  overflow-y: auto;
  padding: 2px 2px 10px;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.role-library-item {
  min-height: 182px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  padding: 8px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.82);
  text-align: left;
  cursor: pointer;
}
.role-library-item:hover,
.role-library-item.selected {
  border-color: #0a84ff;
  background: rgba(10,132,255,0.14);
}
.role-library-thumb {
  height: 112px;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.22);
  color: rgba(255,255,255,0.38);
}
.role-library-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.role-library-info {
  padding-top: 7px;
  min-width: 0;
}
.role-library-name {
  color: rgba(255,255,255,0.92);
  font-size: 13px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-library-meta {
  margin-top: 3px;
  color: rgba(255,255,255,0.52);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.role-library-desc {
  margin-top: 4px;
  color: rgba(255,255,255,0.42);
  font-size: 11px;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.role-library-footer {
  padding: 10px 18px 14px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}
.role-library-cancel,
.role-library-apply {
  height: 38px;
  border: 0;
  border-radius: 6px;
  padding: 0 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.role-library-cancel {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
}
.role-library-apply {
  min-width: 156px;
  background: #0a84ff;
  color: #fff;
}
.role-library-apply:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.dub-grid { display: flex; flex-direction: column; gap: 10px; }
.dub-card { padding: 14px 16px; display: flex; flex-direction: column; gap: 10px; border-radius: 12px; background: #111827; border-color: rgba(255,255,255,0.08); }
.dub-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.dub-copy { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.dub-title { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dub-desc { font-size: 13px; line-height: 1.6; color: var(--text-1); }
.dub-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 11px; }
.dub-foot { display: flex; align-items: center; gap: 10px; padding-top: 8px; border-top: 1px solid rgba(27, 41, 64, 0.08); }
.dub-audio { flex: 1; min-width: 0; height: 30px; }

/* Asset grid */
.asset-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
.asset-card {
  display: flex; flex-direction: column; overflow: hidden;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out), border-color 0.18s var(--ease-out);
  background: #111827;
  border-color: rgba(255,255,255,0.08);
}
.asset-card:hover { transform: translateY(-2px); box-shadow: 0 16px 30px rgba(20, 32, 54, 0.08); }
.asset-cover { position: relative; aspect-ratio: 1; background: var(--bg-2); overflow: hidden; }
.asset-cover.wide { aspect-ratio: 16/9; }
.asset-cover img { width: 100%; height: 100%; object-fit: cover; }
.previewable-image { cursor: zoom-in; transition: transform 0.18s var(--ease-out), filter 0.18s var(--ease-out); }
.previewable-image:hover { transform: scale(1.015); filter: saturate(1.04); }
.asset-cover-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(7,11,21,0.58);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
}
.asset-cover-badge.is-ready {
  background: rgba(36, 125, 72, 0.92);
}
.asset-cover-badge.is-pending {
  background: rgba(19, 51, 121, 0.92);
}
.asset-cover-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-3); }
.asset-body { padding: 8px 10px; }
.asset-name { font-size: 13px; font-weight: 600; }
.asset-meta { font-size: 11px; }
.asset-foot { display: flex; align-items: center; gap: 4px; padding: 6px 10px; border-top: 1px solid var(--border); }

/* Shot workbench */
.shot-workbench {
  flex: 1;
  min-height: 0;
  height: 100%;
  display: grid;
  grid-template-columns: clamp(240px, 14vw, 280px) minmax(360px, 1fr) clamp(390px, 24vw, 480px);
  gap: 0;
  padding: 0;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, #22262d 0%, #171b20 100%);
}
.shot-workbench.left-collapsed {
  grid-template-columns: 42px minmax(360px, 1fr) clamp(390px, 24vw, 480px);
}
.shot-workbench.right-collapsed {
  grid-template-columns: clamp(240px, 14vw, 280px) minmax(360px, 1fr) 42px;
}
.shot-workbench.left-collapsed.right-collapsed {
  grid-template-columns: 42px minmax(360px, 1fr) 42px;
}
.shot-left-column,
.shot-middle-column,
.shot-right-column {
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.shot-left-column,
.shot-right-column {
  position: relative;
  background: rgba(18,21,26,0.55);
}
.shot-left-column {
  border-right: 1px solid rgba(255,255,255,0.08);
}
.shot-right-column {
  border-left: 1px solid rgba(255,255,255,0.08);
  overflow: hidden;
}
.shot-left-column.is-collapsed,
.shot-right-column.is-collapsed {
  background: rgba(18,21,26,0.38);
}
.shot-left-column.is-collapsed::before,
.shot-right-column.is-collapsed::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0));
  pointer-events: none;
}
.collapse-toggle {
  position: absolute;
  z-index: 5;
  width: 28px;
  height: 66px;
  border: 0;
  border-radius: 6px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.collapse-toggle:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.12);
}
.left-toggle {
  right: -14px;
  top: 50%;
  transform: translateY(-50%);
}
.shot-left-column.is-collapsed .left-toggle {
  right: -10px;
}
.right-toggle {
  left: -14px;
  top: 50%;
  transform: translateY(-50%);
}
.shot-right-column.is-collapsed .right-toggle {
  left: -10px;
}
.shot-column-header {
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.legend-trigger {
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: rgba(255,255,255,0.42);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.legend-trigger:hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
}
.shot-items {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 8px 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.shot-item {
  width: 100%;
  min-height: 66px;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.72);
  text-align: left;
  cursor: pointer;
  transition: 0.15s ease;
}
.shot-item:hover {
  background: rgba(255,255,255,0.07);
}
.shot-item.active {
  border-color: #0a84ff;
  background: rgba(86,108,142,0.72);
  box-shadow: inset 3px 0 0 #0a84ff;
}
.shot-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.shot-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255,255,255,0.9);
  font-size: 13px;
  line-height: 18px;
  font-weight: 700;
}
.shot-status-row {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
}
.shot-duration {
  color: rgba(255,255,255,0.34);
  font-size: 12px;
}
.shot-status-dot {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255,255,255,0.22);
}
.shot-status-dot.ok {
  background: #36d399;
}
.shot-status-dot.video {
  background: #7aa7ff;
}
.shot-action {
  margin-top: 5px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  color: rgba(255,255,255,0.46);
  font-size: 11px;
  line-height: 1.45;
}
.shot-middle-column {
  padding: 10px 14px;
  overflow: hidden;
}
.middle-tabs {
  height: 40px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  padding: 4px;
  border-radius: 8px;
  background: rgba(255,255,255,0.1);
}
.middle-tab {
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: rgba(255,255,255,0.7);
  font-size: 13px;
  cursor: pointer;
}
.middle-tab.active {
  background: rgba(255,255,255,0.13);
  color: rgba(255,255,255,0.92);
  font-weight: 700;
}
.media-preview-layout {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1fr) clamp(154px, 10vw, 190px);
  grid-template-rows: minmax(220px, 1fr);
  gap: 12px;
  padding-top: 12px;
}
.top-preview-area {
  min-height: 0;
  display: flex;
}
.media-display-area {
  width: 100%;
  min-height: 260px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 10px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 40%, rgba(255,255,255,0.035), rgba(0,0,0,0.12));
  display: flex;
  align-items: center;
  justify-content: center;
}
.media-display-area img,
.media-display-area video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.no-media-placeholder {
  width: 100%;
  height: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255,255,255,0.42);
}
.placeholder-content {
  max-width: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  text-align: center;
}
.placeholder-content h4 {
  margin: 0;
  color: rgba(255,255,255,0.66);
  font-size: 16px;
}
.placeholder-content p {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}
.bottom-media-library {
  min-height: 0;
  height: 100%;
  overflow: hidden;
  border-top: 0;
  border-left: 1px solid rgba(255,255,255,0.08);
  padding: 8px 0 0 12px;
}
.media-library-container.compact {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.media-library-container .header {
  height: 26px;
  flex-shrink: 0;
}
.media-library-container .header-title,
.media-library-header {
  height: 24px;
  color: rgba(255,255,255,0.78);
  font-size: 13px;
  font-weight: 700;
}
.bottom-media-library .frame-rows {
  min-height: 0;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.bottom-media-library .frame-row {
  min-height: 66px;
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr);
  gap: 7px;
  align-items: stretch;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  cursor: default;
}
.bottom-media-library .frame-row:hover {
  background: transparent;
  border-color: transparent;
}
.bottom-media-library .frame-tab {
  min-height: 66px;
  border: 1px solid rgba(80,104,138,0.45);
  border-radius: 5px;
  background: rgba(19,24,32,0.72);
  color: rgba(255,255,255,0.64);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 5px 4px;
  font-size: 11px;
}
.asset-row-icon {
  display: inline-flex;
  color: rgba(255,255,255,0.7);
}
.bottom-media-library .tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bottom-media-library .tab-count {
  min-width: 18px;
  height: 18px;
  border-radius: 4px;
  background: rgba(255,255,255,0.08);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}
.bottom-media-library .row-content {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}
.bottom-media-library .media-item-compact {
  width: 96px;
  height: 66px;
  flex: 0 0 auto;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.52);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.bottom-media-library .media-item-compact img,
.bottom-media-library .media-item-compact video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.bottom-media-library .media-item-compact.upload-item {
  border-style: dashed;
}
.bottom-media-library .empty-inline {
  min-height: 28px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: rgba(255,255,255,0.34);
  font-size: 12px;
}
.video-editor-container {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 12px;
}
.editor-main {
  min-height: 0;
  flex: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(250px, 0.82fr);
  gap: 12px;
}
.editor-preview-panel,
.editor-materials-panel,
.editor-timeline-area {
  min-width: 0;
  min-height: 0;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: rgba(13,16,23,0.64);
}
.editor-preview-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-preview-screen {
  min-height: 0;
  flex: 1;
  background: #050609;
  display: flex;
  align-items: center;
  justify-content: center;
}
.editor-preview-video {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.editor-preview-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: rgba(255,255,255,0.36);
  font-size: 13px;
}
.editor-preview-placeholder svg {
  color: rgba(255,255,255,0.2);
}
.editor-playback-controls {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.035);
}
.editor-icon-btn {
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(255,255,255,0.66);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.editor-icon-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.editor-icon-btn:not(:disabled):hover {
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.9);
}
.editor-time-display {
  flex: 1;
  color: rgba(255,255,255,0.56);
  font-size: 12px;
}
.editor-materials-panel {
  display: flex;
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}
.editor-material-tabs {
  height: 30px;
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3px;
  border-radius: 7px;
  background: rgba(255,255,255,0.1);
}
.editor-material-tab {
  min-width: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: rgba(255,255,255,0.62);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  cursor: pointer;
}
.editor-material-tab.active {
  background: rgba(255,255,255,0.13);
  color: rgba(255,255,255,0.9);
}
.editor-material-list {
  min-height: 0;
  flex: 1;
  overflow: auto;
  padding-top: 10px;
}
.editor-material-item {
  width: 100%;
  min-height: 58px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 7px;
  background: rgba(255,255,255,0.045);
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 7px;
  color: rgba(255,255,255,0.78);
  cursor: pointer;
}
.editor-material-item + .editor-material-item {
  margin-top: 8px;
}
.editor-material-thumb {
  width: 64px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 5px;
  overflow: hidden;
  background: rgba(0,0,0,0.34);
  color: rgba(255,255,255,0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.editor-material-thumb video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.editor-material-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}
.editor-material-info strong,
.editor-material-info small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.editor-material-info strong {
  font-size: 12px;
  font-weight: 600;
}
.editor-material-info small {
  color: rgba(255,255,255,0.42);
  font-size: 11px;
}
.editor-empty-materials {
  height: 100%;
  min-height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  text-align: center;
  color: rgba(255,255,255,0.42);
  font-size: 12px;
}
.editor-empty-materials svg {
  color: rgba(255,255,255,0.2);
}
.editor-empty-materials small {
  color: rgba(255,255,255,0.28);
  font-size: 11px;
}
.editor-timeline-area {
  height: 224px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.timeline-controls-row {
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.timeline-zoom-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: rgba(255,255,255,0.58);
  font-size: 12px;
}
.timeline-compose-btn {
  height: 28px;
  border: 1px solid rgba(10,132,255,0.48);
  border-radius: 5px;
  background: #0a84ff;
  color: #101115;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
}
.timeline-compose-btn:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}
.timeline-workspace {
  position: relative;
  min-height: 0;
  flex: 1;
  padding: 12px 12px 6px;
}
.timeline-ruler-line {
  height: 16px;
  margin-left: 112px;
  border-bottom: 1px solid rgba(255,255,255,0.12);
  background: repeating-linear-gradient(90deg, rgba(255,255,255,0.18) 0 1px, transparent 1px 48px);
}
.timeline-track {
  height: 54px;
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr);
  align-items: stretch;
}
.timeline-track + .timeline-track {
  margin-top: 8px;
}
.track-title {
  border: 1px solid rgba(255,255,255,0.08);
  border-right: 0;
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.62);
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 12px;
}
.track-lane {
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
}
.timeline-playhead {
  position: absolute;
  top: 12px;
  bottom: 6px;
  left: 124px;
  width: 1px;
  background: #ff4d4f;
  pointer-events: none;
}
.timeline-playhead span {
  position: absolute;
  top: -3px;
  left: -5px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ff4d4f;
}
.timeline-footer-row {
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  border-top: 1px solid rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.42);
  font-size: 12px;
}
.shot-tabs {
  height: 48px;
  flex-shrink: 0;
  display: flex;
  align-items: end;
  gap: 30px;
  padding: 0 22px;
  border-bottom: 1px solid rgba(255,255,255,0.09);
}
.shot-tab {
  height: 39px;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: rgba(255,255,255,0.56);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  cursor: pointer;
}
.shot-tab.active {
  border-bottom-color: #0a84ff;
  color: #9fd2ff;
  font-weight: 700;
}
.tab-content {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding: 14px 22px 96px;
}
.settings-section {
  margin-bottom: 14px;
}
.settings-section.compact {
  margin-bottom: 13px;
}
.section-header {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.section-header.clickable {
  cursor: pointer;
}
.section-title {
  color: rgba(255,255,255,0.86);
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.layout-image,
.empty-layout {
  width: 100%;
  min-height: 46px;
  border-radius: 6px;
  border: 1px dashed rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.46);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  cursor: pointer;
}
.layout-image {
  height: 78px;
  border-style: solid;
  padding: 0;
}
.layout-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.character-grid {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 5px;
}
.character-item {
  width: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}
.character-avatar {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255,255,255,0.14);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.character-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.character-item .character-name {
  width: 100%;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: rgba(255,255,255,0.66);
  font-size: 11px;
  text-align: center;
}
.model-select {
  width: 100%;
}
.frame-generation-steps {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 7px;
  margin-top: 7px;
}
.step-item {
  min-height: 48px;
  border: 1px solid rgba(255,255,255,0.09);
  border-radius: 8px;
  background: rgba(255,255,255,0.055);
  color: rgba(255,255,255,0.68);
  cursor: pointer;
}
.step-item.active {
  border-color: #0a84ff;
  background: rgba(10,132,255,0.13);
  color: rgba(255,255,255,0.92);
}
.step-title {
  font-size: 12px;
  font-weight: 700;
}
.step-desc {
  margin-top: 2px;
  color: rgba(255,255,255,0.44);
  font-size: 10px;
}
.shot-reference-panel {
  width: 100%;
  min-height: 66px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.72);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 14px;
  text-align: left;
  cursor: pointer;
}
.shot-reference-panel:hover {
  border-color: rgba(10,132,255,0.42);
  background: rgba(255,255,255,0.085);
}
.shot-reference-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.shot-reference-title {
  color: rgba(255,255,255,0.82);
  font-size: 13px;
  font-weight: 700;
}
.shot-reference-desc {
  color: rgba(255,255,255,0.42);
  font-size: 11px;
}
.shot-reference-upload {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border: 1px dashed rgba(255,255,255,0.22);
  border-radius: 6px;
  color: rgba(255,255,255,0.5);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.sequence-grid-setting {
  min-height: 48px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  background: rgba(255,255,255,0.055);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
}
.sequence-grid-options {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.sequence-grid-option {
  height: 28px;
  min-width: 40px;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 5px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.62);
  font-size: 12px;
  cursor: pointer;
}
.sequence-grid-option.active {
  border-color: #0a84ff;
  background: rgba(10,132,255,0.15);
  color: #8ecbff;
}
.shot-mode-tip {
  margin-top: 8px;
  min-height: 34px;
  border-radius: 6px;
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.42);
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 12px;
}
.prompt-status {
  min-height: 20px;
  border-radius: 4px;
  padding: 2px 7px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
}
.prompt-status.success {
  background: rgba(54,211,153,0.14);
  color: #36d399;
}
.frame-prompt-editor {
  width: 100%;
  min-height: 118px;
  resize: vertical;
  margin-top: 8px;
  padding: 9px 11px;
  border: 1px solid transparent;
  border-radius: 4px;
  outline: none;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.82);
  font-size: 13px;
  line-height: 1.5;
  font-family: inherit;
}
.frame-prompt-editor:focus,
.frame-prompt-editor:hover {
  border-color: #409cff;
  box-shadow: 0 0 8px rgba(10,132,255,0.22);
}
.hint-text {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 5px;
  color: rgba(255,255,255,0.44);
  font-size: 11px;
}
.locked-model-display {
  min-height: 38px;
  margin-top: 8px;
  border-radius: 7px;
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.78);
  display: flex;
  align-items: center;
  padding: 0 12px;
  font-size: 13px;
}
.video-ref-grid {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 8px;
}
.video-ref-thumb {
  position: relative;
  width: 120px;
  height: 68px;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 6px;
  overflow: hidden;
  background: rgba(255,255,255,0.06);
  cursor: pointer;
}
.video-ref-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.video-ref-thumb span {
  position: absolute;
  left: 5px;
  bottom: 5px;
  border-radius: 3px;
  padding: 1px 5px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 11px;
}
.sticky-bottom-action {
  position: sticky;
  bottom: 0;
  margin-top: auto;
  padding: 10px 22px 14px;
  background: linear-gradient(180deg, rgba(23,27,32,0), rgba(23,27,32,0.96) 22%);
}
.sticky-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.action-btn.compact {
  min-height: 52px;
  border-radius: 8px;
  padding: 0 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-width: 1px;
  box-shadow: none;
}
.sticky-bottom-action .action-btn.primary-action {
  border-color: rgba(10,132,255,0.45);
  background: linear-gradient(90deg, #e4ddff 0%, #91d8ff 100%);
  color: #07111c;
}
.sticky-bottom-action .action-btn.secondary-action {
  border-color: rgba(125,99,255,0.55);
  background: linear-gradient(90deg, #6d7cff 0%, #7a4df0 100%);
  color: #fff;
}
.shot-right-column .action-btn.small,
.shot-right-column .action-btn.mini {
  border-color: transparent;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.86);
}
.shot-right-column .action-btn.small:hover,
.shot-right-column .action-btn.mini:hover {
  background: rgba(255,255,255,0.14);
}
.btn-text-group {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.2;
}
.btn-title {
  font-size: 13px;
  font-weight: 800;
}
.btn-desc {
  margin-top: 3px;
  font-size: 11px;
  opacity: 0.76;
}
.cost-pill {
  margin-left: auto;
  color: #0a84ff;
  font-size: 13px;
  font-weight: 900;
}

/* Frame grid */
.frame-grid { display: flex; flex-direction: column; gap: 8px; }
.frame-row {
  display: flex; align-items: center; gap: 14px;
  padding: 12px 14px; cursor: pointer;
  border-radius: var(--radius-lg);
  transition: all 0.15s;
  border: 1.5px solid transparent;
}
.frame-row:hover { background: var(--bg-0); border-color: var(--border); }
.frame-row.active {
  background: var(--bg-0);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}
.frame-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.frame-top { display: flex; align-items: center; gap: 8px; }
.frame-num {
  font-size: 13px; font-family: var(--font-mono); font-weight: 800;
  color: var(--accent);
}
.frame-badge {
  font-size: 11px; font-weight: 600; padding: 2px 8px;
  border-radius: 20px;
  background: var(--accent-bg); color: var(--accent);
  border: 1px solid var(--accent-glow);
  white-space: nowrap;
}
.frame-desc {
  font-size: 12px; line-height: 1.5; color: var(--text-1);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.frame-meta { display: flex; align-items: center; gap: 6px; }
.frame-thumbs { display: flex; gap: 8px; flex-shrink: 0; }
.frame-thumb-wrap { display: flex; flex-direction: column; gap: 3px; align-items: center; }
.frame-thumb-label { font-size: 10px; font-weight: 600; color: var(--text-3); }
.frame-thumb {
  position: relative; width: 130px; aspect-ratio: 16/9;
  border-radius: 6px; overflow: hidden;
  background: var(--bg-2); cursor: pointer;
  transition: all 0.15s; border: 1.5px solid var(--border);
}
.frame-thumb:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
.frame-thumb img { width: 100%; height: 100%; object-fit: cover; }
.frame-thumb-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-3); }
.frame-re {
  position: absolute; top: 3px; right: 3px; width: 18px; height: 18px;
  border-radius: 50%; background: rgba(0,0,0,0.5); color: #fff;
  display: none; align-items: center; justify-content: center;
}
.frame-thumb:hover .frame-re { display: flex; }
.frame-scroll { flex: 1; overflow-y: auto; padding: 10px 12px; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--bg-3); flex-shrink: 0; }
.dot.ok { background: var(--success); }
.dot.pending {
  background: var(--accent-dark);
  box-shadow: 0 0 0 3px rgba(76, 125, 255, 0.14);
}

/* Prod grid */
.prod-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.prod-card {
  display: flex; flex-direction: column; overflow: hidden;
  transition: transform 0.18s var(--ease-out), box-shadow 0.18s var(--ease-out), border-color 0.18s var(--ease-out);
  border-radius: 12px;
  background: #111827;
  border-color: rgba(255,255,255,0.08);
}
.prod-card:hover { transform: translateY(-2px); box-shadow: 0 16px 30px rgba(20, 32, 54, 0.08); }
.prod-cover { position: relative; aspect-ratio: 16/9; background: var(--bg-2); overflow: hidden; }
.prod-cover img { width: 100%; height: 100%; object-fit: cover; }
.prod-video { width: 100%; height: 100%; object-fit: cover; background: #000; display: block; }
.prod-cover-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-3); }
.prod-idx {
  position: absolute; top: 5px; left: 5px; font-size: 10px; font-weight: 700;
  font-family: var(--font-mono); background: rgba(0,0,0,0.5); color: #fff; padding: 1px 5px; border-radius: 3px;
}
.prod-overlay-badge {
  position: absolute; bottom: 5px; right: 5px; font-size: 10px; font-weight: 600;
  background: var(--success); color: #fff; padding: 1px 5px; border-radius: 3px;
}
.prod-info { padding: 10px 12px 8px; }
.prod-desc { font-size: 12px; line-height: 1.4; }
.prod-meta-line { margin-top: 5px; font-size: 10px; color: var(--text-3); }
.prod-dots { display: flex; align-items: center; gap: 4px; margin-top: 5px; color: var(--text-3); }
.prod-error {
  margin-top: 6px;
  font-size: 11px;
  line-height: 1.45;
  color: var(--error);
}
.prod-actions { display: flex; gap: 6px; padding: 8px 10px 10px; border-top: 1px solid rgba(27, 41, 64, 0.08); }
.prod-actions .btn { flex: 1; justify-content: center; }

/* Image viewer */
.image-viewer-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 28px;
  background: rgba(3, 7, 12, 0.82);
  backdrop-filter: blur(12px);
}
.image-viewer-dialog {
  width: min(1180px, calc(100vw - 56px));
  height: min(760px, calc(100vh - 56px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 10px;
  background: #11161f;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55);
}
.image-viewer-head {
  flex: 0 0 48px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px 0 18px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  background: #151b25;
}
.image-viewer-title {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
  font-family: var(--font-display);
}
.image-viewer-close {
  width: 30px;
  height: 30px;
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: rgba(255,255,255,0.62);
}
.image-viewer-close:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
}
.image-viewer-body {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18px;
  overflow: auto;
  background: #0b1018;
}
.image-viewer-img {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 6px;
  box-shadow: 0 18px 52px rgba(0,0,0,0.45);
  background: #0b1018;
}

/* Grid tool dialog */
.grid-tool { width: min(1320px, calc(100vw - 40px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; animation: scaleIn 0.2s var(--ease-out); }
.grid-tool-head { display: flex; align-items: center; gap: 8px; padding: 16px 20px; border-bottom: 1px solid var(--border); flex-shrink: 0; }
.grid-tool-body { flex: 1; overflow-y: auto; padding: 16px 20px; display: flex; flex-direction: column; gap: 12px; }
.grid-tool-body-preview { overflow: hidden; min-height: 0; padding-bottom: 10px; }
.grid-tool-foot { display: flex; align-items: center; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); margin-top: 4px; }
.grid-preview-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.72fr) minmax(340px, 400px);
  gap: 14px;
  min-height: 0;
  flex: 1;
  align-items: start;
}
.grid-preview-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.grid-assignment-pane {
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid rgba(27, 41, 64, 0.08);
  border-radius: 18px;
  background: rgba(255,255,255,0.66);
  overflow: hidden;
  max-height: min(70vh, 840px);
}
.grid-assign-head {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(27, 41, 64, 0.08);
  background: linear-gradient(180deg, rgba(255,255,255,0.9), rgba(255,255,255,0.72));
}
.grid-assign-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-0);
  font-family: var(--font-display);
}
.grid-assign-subtitle {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-3);
}
.grid-assign-pagination {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(27, 41, 64, 0.08);
  background: rgba(255,255,255,0.86);
}
.grid-assign-columns {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 96px minmax(0, 1fr);
  gap: 8px;
  padding: 7px 12px;
  border-bottom: 1px solid rgba(27, 41, 64, 0.08);
  background: rgba(246, 248, 252, 0.92);
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

/* Prompt preview */
.grid-prompt-summary { background: var(--bg-2); border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
.grid-prompt-label { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 600; color: var(--text-2); margin-bottom: 6px; }
.grid-prompt-text { font-size: 12px; color: var(--text-1); line-height: 1.7; }

.grid-blank-preview {
  display: grid;
  gap: 4px;
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius);
  padding: 8px;
  min-height: 200px;
}
.grid-blank-cell {
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 70px;
}
.grid-blank-cell.empty { opacity: 0.4; }
.grid-blank-cell-index { font-size: 10px; font-weight: 700; color: var(--accent); font-family: var(--font-mono); }
.grid-blank-cell-desc { font-size: 11px; color: var(--text-2); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.grid-mode-tabs { display: flex; gap: 6px; }
.grid-mode-tab { flex: 1; display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border: 1.5px solid var(--border); border-radius: var(--radius); background: var(--bg-0); cursor: pointer; transition: all 0.15s; text-align: left; }
.grid-mode-tab:hover { border-color: var(--border-strong); }
.grid-mode-tab.active { border-color: var(--accent); background: var(--accent-bg); }
.grid-config { display: flex; gap: 12px; align-items: flex-end; }
.grid-pick-list { display: flex; flex-direction: column; gap: 2px; max-height: 260px; overflow-y: auto; border: 1px solid var(--border); border-radius: var(--radius); padding: 4px; }
.grid-pick-item { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border-radius: 4px; cursor: pointer; transition: background 0.1s; }
.grid-pick-item:hover { background: var(--bg-hover); }
.grid-pick-item.selected { background: var(--accent-bg); }
.grid-pick-item input { accent-color: var(--accent); }
.grid-preview-wrap {
  border-radius: var(--radius);
  overflow: auto;
  border: 1px solid var(--border);
  background: rgba(14, 19, 28, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  max-height: min(70vh, 860px);
  padding: 10px;
}
.grid-preview-stage {
  position: relative;
  width: fit-content;
  max-width: 100%;
  margin: auto;
  line-height: 0;
}
.grid-preview-img {
  display: block;
  width: auto;
  max-width: 100%;
  max-height: min(66vh, 820px);
  object-fit: contain;
}
.grid-overlay { position: absolute; inset: 0; display: grid; }
.grid-overlay-cell {
  border: 1px dashed rgba(255,255,255,0.42);
  display: flex;
  align-items: flex-end;
  justify-content: flex-start;
  padding: 4px 6px;
  background: transparent;
  cursor: pointer;
  transition: background 0.15s ease, box-shadow 0.15s ease;
}
.grid-overlay-cell.active {
  background: rgba(255,255,255,0.08);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.28);
}
.grid-cell-label { font-size: 10px; font-weight: 700; color: #fff; background: rgba(0,0,0,0.5); padding: 1px 5px; border-radius: 3px; }
.grid-adjust-summary { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; padding: 0 2px; }
.grid-assign-info {
  display: flex;
  flex-direction: column;
  gap: 0;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 4px 12px 10px;
}
.grid-assign-row {
  display: grid;
  grid-template-columns: 42px minmax(0, 1fr) 112px minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed rgba(27, 41, 64, 0.08);
}
.grid-assign-row.active {
  background: rgba(32, 86, 190, 0.05);
  border-radius: 12px;
  padding-left: 6px;
  padding-right: 6px;
}
.grid-assign-row:last-child { border-bottom: 0; }
.grid-assign-index {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-3);
  font-family: var(--font-mono);
}
.grid-assign-bind {
  font-size: 11px;
  color: var(--text-2);
  line-height: 1.45;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-history-panel {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px 12px;
  border: 1px solid rgba(27, 41, 64, 0.08);
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255,255,255,0.82), rgba(255,255,255,0.64));
}
.grid-history-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.grid-history-title {
  font-size: 13px;
  font-weight: 700;
  color: var(--text-0);
  font-family: var(--font-display);
}
.grid-history-subtitle {
  font-size: 11px;
  color: var(--text-3);
}
.grid-history-list {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(160px, 182px);
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
}
.grid-history-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(27, 41, 64, 0.08);
  border-radius: 16px;
  background: rgba(255,255,255,0.78);
  cursor: pointer;
  text-align: left;
  transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
}
.grid-history-item:hover {
  border-color: rgba(33, 88, 255, 0.18);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}
.grid-history-item.active {
  border-color: rgba(33, 88, 255, 0.26);
  background: linear-gradient(180deg, rgba(244,248,255,0.96), rgba(255,255,255,0.86));
  box-shadow: 0 14px 28px rgba(33, 88, 255, 0.12);
}
.grid-history-thumb {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid rgba(27, 41, 64, 0.08);
  background: rgba(14, 19, 28, 0.05);
}
.grid-history-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.grid-history-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.grid-history-tags {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.grid-history-meta {
  font-size: 10.5px;
  color: var(--text-3);
  line-height: 1.45;
  word-break: break-word;
}

.latest-grid-strip {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  border: 1px solid rgba(27, 41, 64, 0.08);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255,255,255,0.84), rgba(255,255,255,0.62));
}
.latest-grid-strip-thumb {
  width: 72px;
  height: 48px;
  padding: 0;
  border: 1px solid rgba(27, 41, 64, 0.08);
  border-radius: 10px;
  overflow: hidden;
  background: rgba(14, 19, 28, 0.06);
  cursor: zoom-in;
  box-shadow: none;
}
.latest-grid-strip-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.latest-grid-strip-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.latest-grid-strip-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.latest-grid-strip-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-0);
  font-family: var(--font-display);
}
.latest-grid-strip-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 10px;
  color: var(--text-3);
}
.latest-grid-strip-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

/* Export */
.export-split { flex: 1; display: flex; min-height: 0; }
.export-main { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px; }
.export-video { max-width: 720px; width: 100%; border-radius: var(--radius-lg); background: #000; }
.export-bar { display: flex; align-items: center; gap: 12px; margin-top: 16px; width: 100%; max-width: 720px; }
.export-list { width: 240px; flex-shrink: 0; border-left: 1px solid var(--border); display: flex; flex-direction: column; overflow: hidden; }
.export-list-head { padding: 11px 14px; font-size: 11px; font-weight: 700; color: var(--text-3); border-bottom: 1px solid var(--border); text-transform: uppercase; letter-spacing: 0.06em; }
.export-list-body { flex: 1; overflow-y: auto; padding: 6px; }
.exp-row { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: var(--radius); }
.exp-row:hover { background: var(--bg-hover); }

/* Shared */
.dim { color: var(--text-3); }

@media (max-width: 1600px) {
  .navbar {
    height: 58px;
    min-height: 58px;
    padding: 0 22px;
  }

  .nav-center {
    gap: 34px;
    max-width: calc(100% - 500px);
  }

  .nav-item {
    font-size: 14px;
  }

  .nav-left {
    flex-basis: 210px;
  }

  .nav-right {
    flex-basis: 220px;
  }

  .task-list-btn {
    height: 34px;
    min-height: 34px;
    padding: 0 12px;
    font-size: 14px;
  }

  .credit-label {
    font-size: 16px;
  }

  .credit-value {
    font-size: 15px;
  }

  .shot-workbench {
    grid-template-columns: 260px minmax(330px, 1fr) 420px;
  }

  .shot-workbench.left-collapsed {
    grid-template-columns: 38px minmax(330px, 1fr) 420px;
  }

  .shot-workbench.right-collapsed {
    grid-template-columns: 260px minmax(330px, 1fr) 38px;
  }

  .shot-workbench.left-collapsed.right-collapsed {
    grid-template-columns: 38px minmax(330px, 1fr) 38px;
  }

  .collapse-toggle {
    width: 24px;
    height: 58px;
  }

  .shot-left-column.is-collapsed .left-toggle,
  .shot-right-column.is-collapsed .right-toggle {
    width: 24px;
  }

  .shot-middle-column {
    padding: 9px 12px;
  }

  .middle-tabs {
    height: 38px;
  }

  .media-preview-layout {
    grid-template-columns: minmax(0, 1fr) 170px;
    gap: 10px;
    padding-top: 10px;
  }

  .shot-tabs {
    height: 44px;
    gap: 26px;
    padding: 0 20px;
  }

  .shot-tab {
    height: 36px;
  }

  .tab-content {
    padding: 12px 20px 90px;
  }

  .frame-generation-steps {
    gap: 6px;
  }

  .step-item {
    min-height: 44px;
  }

  .frame-prompt-editor {
    min-height: 104px;
  }

  .sticky-bottom-action {
    padding: 9px 20px 12px;
  }

  .action-btn.compact {
    min-height: 48px;
  }
}

@media (max-width: 1240px) {
  .nav-center {
    gap: 32px;
    max-width: calc(100% - 520px);
  }

  .split-layout,
  .export-split {
    flex-direction: column;
  }

  .shot-list,
  .export-list {
    width: 100%;
  }

  .detail-panel {
    min-height: 420px;
  }

  .field-grid-4 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .image-viewer-overlay {
    padding: 16px;
  }

  .image-viewer-dialog {
    width: calc(100vw - 32px);
    height: calc(100vh - 32px);
  }

  .grid-tool {
    width: calc(100vw - 24px);
    max-height: calc(100vh - 24px);
  }

  .grid-preview-layout {
    grid-template-columns: 1fr;
  }

  .grid-preview-wrap,
  .grid-preview-img {
    max-height: 42vh;
  }

  .grid-assignment-pane {
    max-height: 42vh;
  }

  .grid-assign-columns {
    display: none;
  }

  .grid-assign-row {
    grid-template-columns: 1fr;
    align-items: stretch;
  }

  .role-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .role-design-modal {
    width: calc(100vw - 48px);
    height: auto;
    max-height: calc(100vh - 48px);
  }

  .role-modal-content {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .role-modal-image,
  .role-modal-image-placeholder {
    min-height: 460px;
    height: 460px;
  }

  .role-modal-form {
    max-height: 460px;
  }
}

@media (max-width: 860px) {
  .studio {
    padding: 8px;
    gap: 12px;
  }

  .nav-left,
  .nav-right {
    flex-wrap: wrap;
  }

  .studio-title {
    font-size: 20px;
  }

  .studio-episode-chip,
  .nav-item,
  .credit-label {
    font-size: 16px;
  }

  .toolbar-right,
  .step-bubble,
  .export-bar {
    flex-wrap: wrap;
  }

  .extract-grid,
  .voice-grid,
  .asset-grid,
  .prod-grid,
  .role-cards {
    grid-template-columns: 1fr;
  }

  .voice-stage {
    grid-template-columns: 1fr;
  }

  .extract-stage {
    grid-template-columns: 1fr;
  }

  .extract-summary {
    position: static;
  }

  .voice-stage-panel {
    position: static;
    max-height: none;
    overflow: visible;
  }

  .frame-row {
    flex-direction: column;
    align-items: stretch;
  }

  .detail-hero {
    grid-template-columns: 1fr;
  }

  .field-grid-2,
  .field-grid-4 {
    grid-template-columns: 1fr;
  }

  .frame-thumbs {
    width: 100%;
  }

  .frame-thumb {
    width: 100%;
  }

  .latest-grid-strip {
    grid-template-columns: 1fr;
  }

  .grid-history-list {
    grid-auto-columns: minmax(148px, 168px);
  }

  .latest-grid-strip-thumb {
    width: 100%;
    height: auto;
    aspect-ratio: 16 / 9;
  }

  .latest-grid-strip-actions {
    justify-content: flex-start;
  }

  .role-modal-overlay {
    padding: 12px;
  }

  .role-design-modal {
    width: calc(100vw - 24px);
    height: auto;
    max-height: calc(100vh - 24px);
    padding: 16px 20px 20px;
  }

  .role-modal-content {
    grid-template-columns: 1fr;
  }

  .role-modal-image,
  .role-modal-image-placeholder {
    min-height: 280px;
    height: 280px;
  }
}
</style>
