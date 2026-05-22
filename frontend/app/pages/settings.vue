<template>
  <div class="settings-layout">
    <aside class="settings-nav">
      <div class="nav-group">
        <div class="nav-group-label">基础</div>
        <button v-for="t in baseTabs" :key="t.id" :class="['nav-item', { active: tab === t.id }]" @click="tab = t.id">
          <component :is="t.icon" :size="14" />
          {{ t.label }}
        </button>
      </div>
      <div class="nav-advanced">
        <label class="advanced-toggle">
          <span>Agent 高级配置</span>
          <input type="checkbox" v-model="showAdvanced" />
          <span class="advanced-slider"></span>
        </label>
        <p class="advanced-note">仅展开 Agent 配置与 Skills。工作台功能和分镜字段保持默认可见。</p>
      </div>
      <div v-if="showAdvanced" class="nav-group">
        <div class="nav-group-label">高级</div>
        <button v-for="t in advancedTabs" :key="t.id" :class="['nav-item', { active: tab === t.id }]" @click="tab = t.id">
          <component :is="t.icon" :size="14" />
          {{ t.label }}
        </button>
      </div>
    </aside>

    <div class="settings-content">

      <!-- ===== AI 服务配置 ===== -->
      <div v-if="tab === 'ai'" class="settings-scroll">
        <div class="settings-head">
          <div class="settings-brand">
            <div class="settings-brand-mark">
              <img v-if="showBrandImage" :src="brandLogo" alt="Lovarts.短剧" class="settings-brand-logo" @error="showBrandImage = false" />
              <span v-else class="settings-brand-fallback">火</span>
            </div>
            <div class="settings-brand-copy">
              <div class="settings-brand-kicker">Huobao Shorts</div>
              <div class="settings-brand-name">Lovarts.短剧</div>
            </div>
          </div>
          <h2 class="settings-title">AI 服务配置</h2>
          <p class="settings-desc">先用推荐模板快速落配置，再按服务类型微调。工作台创建集时会锁定所选图片、视频和音频能力。</p>
        </div>
        <section class="setup-panel card">
          <div class="setup-panel-head">
            <div>
              <div class="setup-kicker">Quick Setup</div>
              <div class="setup-title">Lovarts.短剧推荐配置</div>
              <div class="setup-desc">一键写入文本、图片、视频、音频四类推荐配置，适合作为开箱默认方案。</div>
            </div>
            <button class="btn btn-primary" @click="presetDialog = true">
              <Sparkles :size="14" /> Lovarts.短剧一键配置
            </button>
          </div>
          <div class="preset-grid">
            <article v-for="preset in huobaoPresetCards" :key="preset.serviceType" class="preset-card">
              <div class="preset-card-top">
                <span class="preset-service">{{ preset.label }}</span>
                <span class="tag tag-accent">{{ preset.provider }}</span>
              </div>
              <div class="preset-model mono">{{ preset.model }}</div>
              <div class="preset-base mono">{{ preset.baseUrl }}</div>
            </article>
          </div>
        </section>
        <section class="setup-panel card">
          <div class="setup-panel-head compact">
            <div>
              <div class="setup-title">快捷模板</div>
              <div class="setup-desc">选择服务类型后，直接用模板填充推荐的 `provider / base URL / model`。</div>
            </div>
          </div>
          <div class="template-row">
            <button
              v-for="st in serviceTypes"
              :key="st.type"
              class="template-type-chip"
              @click="startAddCfg(st.type)"
            >
              {{ st.label }}
            </button>
          </div>
        </section>
        <div class="sections">
          <section v-for="st in serviceTypes" :key="st.type">
            <div class="section-head">
              <div>
                <span class="section-title">{{ st.label }}</span>
                <div class="section-subtitle">{{ serviceMeta[st.type].desc }}</div>
              </div>
              <span v-if="countActive(st.type)" class="tag tag-accent">{{ countActive(st.type) }} 已启用</span>
              <button class="btn btn-ghost btn-sm ml-auto" @click="startAddCfg(st.type)"><Plus :size="13" /> 添加</button>
            </div>
            <div class="config-list">
              <div v-for="c in byType(st.type)" :key="c.id" class="card config-row">
                <div class="config-info">
                  <div class="config-main">
                    <div class="config-line">
                      <span class="config-provider">{{ displayProvider(c) }}</span>
                      <span class="config-name">{{ c.name || `${c.provider}-${c.service_type}` }}</span>
                    </div>
                    <span class="config-model mono truncate">{{ fmtModel(c.model) }}</span>
                    <span class="config-base mono truncate">{{ c.base_url || '未设置 Base URL' }}</span>
                  </div>
                </div>
                <span :class="['tag', c.api_key ? 'tag-success' : 'tag-error']">{{ c.api_key ? '已配置' : '无密钥' }}</span>
                <button class="btn btn-ghost btn-sm" @click="testExistingCfg(c)">测试</button>
                <label class="toggle"><input type="checkbox" :checked="c.is_active" @change="toggleCfg(c)"><span /></label>
                <button class="btn btn-ghost btn-icon" @click="startEditCfg(c)"><Pencil :size="13" /></button>
                <button class="btn btn-ghost btn-icon" @click="delCfg(c.id)"><Trash2 :size="13" /></button>
              </div>
              <p v-if="!byType(st.type).length" class="config-empty">暂无配置</p>
            </div>
          </section>
        </div>
      </div>

      <!-- ===== 模型配置 ===== -->
      <div v-else-if="tab === 'models'" class="settings-scroll">
        <div class="settings-head">
          <div class="settings-brand">
            <div class="settings-brand-mark">
              <img v-if="showBrandImage" :src="brandLogo" alt="Lovarts.短剧" class="settings-brand-logo" @error="showBrandImage = false" />
              <span v-else class="settings-brand-fallback">火</span>
            </div>
            <div class="settings-brand-copy">
              <div class="settings-brand-kicker">Model Registry</div>
              <div class="settings-brand-name">模型注册表</div>
            </div>
          </div>
          <h2 class="settings-title">模型配置</h2>
          <p class="settings-desc">统一维护前端可选模型、供应商、端点与参数。创作页面和 Agent 配置会优先读取这里的模型。</p>
        </div>
        <section class="setup-panel card">
          <div class="setup-panel-head">
            <div>
              <div class="setup-title">数据库模型来源</div>
              <div class="setup-desc">服务配置只保存 API Key 与 Base URL；模型和模型参数在这里独立维护，便于接入不同供应商。</div>
            </div>
            <div class="model-toolbar">
              <button class="btn btn-ghost btn-sm" @click="seedModelsFromConfigs">从服务配置导入</button>
              <button class="btn btn-primary btn-sm" @click="startAddModel('text')"><Plus :size="13" /> 添加模型</button>
            </div>
          </div>
        </section>
        <div class="sections">
          <section v-for="st in serviceTypes" :key="`models-${st.type}`">
            <div class="section-head">
              <div>
                <span class="section-title">{{ st.label }}模型</span>
                <div class="section-subtitle">{{ serviceMeta[st.type].desc }}</div>
              </div>
              <span class="tag tag-accent">{{ modelsByType(st.type).length }} 个</span>
              <button class="btn btn-ghost btn-sm ml-auto" @click="startAddModel(st.type)"><Plus :size="13" /> 添加</button>
            </div>
            <div class="model-config-grid">
              <article v-for="m in modelsByType(st.type)" :key="m.id" class="card model-config-card">
                <div class="model-card-head">
                  <div class="model-card-main">
                    <div class="model-name">{{ m.name || m.model_id }}</div>
                    <div class="model-id mono">{{ m.model_id }}</div>
                  </div>
                  <span v-if="m.is_default" class="tag tag-success">默认</span>
                  <span :class="['tag', m.is_active ? 'tag-accent' : '']">{{ m.is_active ? '启用' : '停用' }}</span>
                </div>
                <div class="model-meta">
                  <span>{{ m.provider }}</span>
                  <span v-if="m.cost">成本 {{ m.cost }}</span>
                  <span>优先级 {{ m.priority || 0 }}</span>
                </div>
                <div v-if="m.base_url" class="model-base mono">{{ m.base_url }}</div>
                <div v-if="m.description" class="model-desc">{{ m.description }}</div>
                <div class="model-card-actions">
                  <button class="btn btn-ghost btn-icon" @click="startEditModel(m)"><Pencil :size="13" /></button>
                  <button class="btn btn-ghost btn-icon" @click="deleteModel(m.id)"><Trash2 :size="13" /></button>
                </div>
              </article>
              <p v-if="!modelsByType(st.type).length" class="config-empty">暂无模型配置</p>
            </div>
          </section>
        </div>
      </div>

      <!-- ===== Agent 配置 ===== -->
      <div v-else-if="tab === 'agents'" class="settings-scroll">
        <div class="settings-head">
          <div class="settings-brand">
            <div class="settings-brand-mark">
              <img v-if="showBrandImage" :src="brandLogo" alt="Lovarts.短剧" class="settings-brand-logo" @error="showBrandImage = false" />
              <span v-else class="settings-brand-fallback">火</span>
            </div>
            <div class="settings-brand-copy">
              <div class="settings-brand-kicker">Huobao Shorts</div>
              <div class="settings-brand-name">Lovarts.短剧</div>
            </div>
          </div>
          <h2 class="settings-title">Agent 配置</h2>
          <p class="settings-desc">高级区只保留 Agent 运行配置。这里可以调整模型、提示词和参数，保存后立即生效。</p>
        </div>
        <div class="agent-list">
          <div v-for="a in agentDefs" :key="a.type" class="card agent-card">
            <div class="agent-card-head" @click="toggleAgentEdit(a.type)">
              <div class="agent-type-badge">{{ a.icon }}</div>
              <div style="flex:1;min-width:0">
                <div style="font-weight:600;font-size:14px">{{ a.label }}</div>
                <div class="dim" style="font-size:12px">{{ a.type }}</div>
              </div>
              <span v-if="getAgentCfg(a.type)" class="tag tag-success">已配置</span>
              <span v-else class="tag">默认</span>
              <ChevronDown :size="14" :style="{ transform: editingAgent === a.type ? 'rotate(180deg)' : '', transition: '0.2s' }" />
            </div>
            <div v-if="editingAgent === a.type" class="agent-card-body">
              <label class="field">
                <span class="field-label">模型 <span class="dim">(留空使用 AI 服务默认)</span></span>
                <BaseSelect v-model="agentForm.model" :options="textModelSelectOptions" placeholder="— 使用 AI 服务默认 —" searchable />
              </label>
              <div class="field-row">
                <label class="field">
                  <span class="field-label">Temperature</span>
                  <input v-model.number="agentForm.temperature" class="input" type="number" min="0" max="2" step="0.1" />
                </label>
                <label class="field">
                  <span class="field-label">Max Tokens</span>
                  <input v-model.number="agentForm.max_tokens" class="input" type="number" min="100" max="32000" />
                </label>
              </div>
              <label class="field">
                <span class="field-label">System Prompt</span>
                <textarea v-model="agentForm.system_prompt" class="textarea" rows="12" placeholder="Agent 系统提示词..." />
              </label>
              <div class="agent-card-foot">
                <button class="btn btn-ghost btn-sm" @click="resetAgentPrompt(a.type)">恢复默认</button>
                <span v-if="agentSaved === a.type" class="tag tag-success" style="margin-left:8px">
                  <Check :size="10" /> 已保存
                </span>
                <button class="btn btn-primary btn-sm ml-auto" :disabled="agentSaving" @click="saveAgentCfg(a.type)">
                  <Loader2 v-if="agentSaving" :size="12" class="animate-spin" />
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ===== Skills 编辑 ===== -->
      <div v-else-if="tab === 'skills'" class="skills-layout">
        <!-- Agent 左侧列表 -->
        <aside class="skills-agent-list">
          <div class="skills-agent-title">Agent 列表</div>
          <button
            v-for="a in agentDefs"
            :key="a.type"
            :class="['skills-agent-item', { active: selectedAgent === a.type }]"
            @click="selectAgent(a.type)"
          >
            <span class="agent-type-badge">{{ a.icon }}</span>
            <span class="skills-agent-label">{{ a.label }}</span>
            <span v-if="agentSkillCount(a.type) > 0" class="skill-count-badge">{{ agentSkillCount(a.type) }}</span>
          </button>
        </aside>

        <!-- Skill 管理右侧主区域 -->
        <div class="settings-scroll skills-main">
          <div class="settings-head">
            <div class="settings-brand">
              <div class="settings-brand-mark">
                <img v-if="showBrandImage" :src="brandLogo" alt="Lovarts.短剧" class="settings-brand-logo" @error="showBrandImage = false" />
                <span v-else class="settings-brand-fallback">火</span>
              </div>
              <div class="settings-brand-copy">
                <div class="settings-brand-kicker">Huobao Shorts</div>
                <div class="settings-brand-name">Lovarts.短剧</div>
              </div>
            </div>
            <div style="display:flex;align-items:center;gap:10px">
              <span class="agent-type-badge" style="width:32px;height:32px;font-size:16px">{{ selectedAgentIcon }}</span>
              <div>
                <h2 class="settings-title" style="margin:0">{{ selectedAgentLabel }}</h2>
                <div class="dim" style="font-size:12px">{{ selectedAgentType }} — Skills</div>
              </div>
            </div>
            <p class="settings-desc" style="margin-top:10px">Skills 仅作为 Agent 的高级提示词层使用，不影响工作台常规功能入口。</p>
            <button class="btn btn-primary btn-sm" @click="startAddSkill">
              <Plus :size="13" /> 新增 Skill
            </button>
          </div>

          <!-- 无 skill 提示 -->
          <div v-if="!currentSkills.length" class="step-empty" style="padding:48px 24px">
            <div class="empty-visual">
              <FileText :size="28" />
            </div>
            <div class="empty-title">暂无 Skill</div>
            <div class="empty-desc">点击右上角「新增 Skill」创建第一个提示词文件</div>
          </div>

          <!-- Skill 列表 -->
          <div class="skill-list" v-else>
            <div v-for="s in currentSkills" :key="s.id" class="card skill-card">
              <div class="skill-card-head" @click="toggleSkillEdit(s.id)">
                <FileText :size="14" style="color:var(--accent);flex-shrink:0" />
                <div style="flex:1;min-width:0">
                  <div style="font-weight:600;font-size:13px">{{ s.name }}</div>
                  <div class="dim" style="font-size:11px">{{ s.description }}</div>
                </div>
                <button class="btn btn-ghost btn-icon" style="margin-right:4px" @click.stop="deleteSkill(s.id)">
                  <Trash2 :size="13" />
                </button>
                <ChevronDown :size="14" :style="{ transform: editingSkill === s.id ? 'rotate(180deg)' : '', transition: '0.2s' }" />
              </div>
              <div v-if="editingSkill === s.id" class="skill-card-body">
                <textarea
                  v-model="skillContent"
                  class="textarea mono"
                  rows="20"
                  style="font-size:12px;line-height:1.6"
                  placeholder="编写 SKILL.md 内容..."
                />
                <div class="skill-card-foot">
                  <span class="dim" style="font-size:11px">skills/{{ selectedAgentType }}/{{ s.id }}/SKILL.md</span>
                  <span v-if="skillSaved === s.id" class="tag tag-success" style="margin-left:8px">
                    <Check :size="10" /> 已保存
                  </span>
                  <button class="btn btn-primary btn-sm ml-auto" :disabled="skillSaving" @click="saveSkill(s.id)">
                    <Loader2 v-if="skillSaving" :size="12" class="animate-spin" />
                    保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- AI Model Dialog -->
    <div v-if="modelDialog" class="overlay" @click.self="modelDialog = false">
      <form class="modal card config-modal" @submit.prevent="saveModel">
        <div class="config-modal-head">
          <div>
            <div class="setup-kicker">{{ modelEditId ? 'Edit Model' : 'New Model' }}</div>
            <h2 class="modal-title">{{ modelEditId ? '编辑模型配置' : '添加模型配置' }}</h2>
            <div class="modal-note">参数字段使用 JSON，前端会把 defaults / parameters / capabilities 一并读取。</div>
          </div>
          <span class="tag tag-accent">{{ serviceMeta[modelForm.service_type].label }}</span>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">服务类型</span>
            <BaseSelect v-model="modelForm.service_type" :options="serviceTypeOptions" placeholder="服务类型" />
          </label>
          <label class="field">
            <span class="field-label">供应商</span>
            <input v-model="modelForm.provider" class="input" placeholder="如 openai / gemini / your-provider" list="model-provider-list" />
            <datalist id="model-provider-list">
              <option v-for="p in providerSelectOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
            </datalist>
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">模型 ID</span>
            <input v-model="modelForm.model_id" class="input" placeholder="如 gemini-3.1-pro-preview" />
          </label>
          <label class="field">
            <span class="field-label">显示名称</span>
            <input v-model="modelForm.name" class="input" placeholder="如 Gemini 3.1 Pro" />
          </label>
        </div>
        <label class="field">
          <span class="field-label">描述</span>
          <input v-model="modelForm.description" class="input" placeholder="简短说明模型用途" />
        </label>
        <label class="field">
          <span class="field-label">Base URL <span class="dim">(可选，留空走服务配置)</span></span>
          <input v-model="modelForm.base_url" class="input" placeholder="https://..." />
        </label>
        <div class="field-row">
          <label class="field">
            <span class="field-label">生成端点</span>
            <input v-model="modelForm.endpoint" class="input" placeholder="/v1/images/generations" />
          </label>
          <label class="field">
            <span class="field-label">查询端点</span>
            <input v-model="modelForm.query_endpoint" class="input" placeholder="/v1/tasks/{id}" />
          </label>
        </div>
        <div class="field-row">
          <label class="field">
            <span class="field-label">成本</span>
            <input v-model.number="modelForm.cost" class="input" type="number" min="0" step="0.01" />
          </label>
          <label class="field">
            <span class="field-label">优先级</span>
            <input v-model.number="modelForm.priority" class="input" type="number" min="0" max="999" />
          </label>
        </div>
        <div class="model-switches">
          <label class="check-row"><input v-model="modelForm.is_default" type="checkbox" /> 默认模型</label>
          <label class="check-row"><input v-model="modelForm.is_active" type="checkbox" /> 启用</label>
        </div>
        <label class="field">
          <span class="field-label">参数定义 parameters</span>
          <textarea v-model="modelForm.parameters" class="textarea mono" rows="5" placeholder='{"aspect_ratios":["1:1","16:9"],"sizes":["1024x1024"]}' />
        </label>
        <label class="field">
          <span class="field-label">默认参数 defaults</span>
          <textarea v-model="modelForm.defaults" class="textarea mono" rows="5" placeholder='{"size":"1024x1024","quality":"high"}' />
        </label>
        <label class="field">
          <span class="field-label">能力 capabilities</span>
          <textarea v-model="modelForm.capabilities" class="textarea mono" rows="4" placeholder='{"image_to_image":true,"text_to_image":true}' />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" @click="modelDialog = false">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>

    <!-- AI Config Dialog -->
    <div v-if="cfgDialog" class="overlay" @click.self="cfgDialog = false">
      <form class="modal card config-modal" @submit.prevent="saveCfg">
        <div class="config-modal-head">
          <div>
            <div class="setup-kicker">{{ cfgEditId ? 'Edit Config' : 'New Config' }}</div>
            <h2 class="modal-title">{{ cfgEditId ? '编辑服务配置' : `添加${serviceMeta[cfgForm.service_type].label}服务` }}</h2>
            <div class="modal-note">推荐先选择模板，系统会自动填入更合理的 `Base URL` 与默认模型。</div>
          </div>
          <span class="tag tag-accent">{{ serviceMeta[cfgForm.service_type].label }}</span>
        </div>
        <div class="preset-picker">
          <button
            v-for="preset in presetsByType(cfgForm.service_type)"
            :key="`${cfgForm.service_type}-${preset.provider}`"
            type="button"
            class="preset-pill"
            @click="applyProviderPreset(cfgForm.service_type, preset.provider)"
          >
            {{ preset.label }}
          </button>
        </div>
        <label class="field">
          <span class="field-label">配置名称</span>
          <input v-model="cfgForm.name" class="input" placeholder="如 Lovarts.短剧默认图像服务" />
        </label>
        <label class="field"><span class="field-label">服务商</span>
          <BaseSelect v-model="cfgForm.provider" :options="providerSelectOptions" placeholder="选择服务商" searchable />
        </label>
        <label class="field">
          <span class="field-label">优先级</span>
          <input v-model.number="cfgForm.priority" class="input" type="number" min="0" max="999" />
          <span class="field-hint">数值越高越优先。工作台默认会优先使用同类型里优先级最高的启用配置。</span>
        </label>
        <label class="field"><span class="field-label">API Key</span><input v-model="cfgForm.api_key" class="input" type="password" placeholder="sk-..." /></label>
        <label class="field"><span class="field-label">Base URL</span><input v-model="cfgForm.base_url" class="input" placeholder="https://..." /></label>
        <div class="endpoint-hint">
          <span class="dim">实际端点前缀：</span>
          <span class="mono">{{ endpointHint }}</span>
        </div>
        <label class="field">
          <span class="field-label">模型</span>
          <BaseSelect v-model="cfgForm.modelStr" :options="cfgModelSelectOptions" placeholder="选择模型" searchable />
        </label>
        <div v-if="cfgTestResult" class="test-result" :class="{ ok: cfgTestResult.reachable, bad: !cfgTestResult.reachable }">
          <div class="test-result-head">
            <span class="tag" :class="cfgTestResult.reachable ? 'tag-success' : 'tag-error'">{{ cfgTestResult.status || 'ERROR' }}</span>
            <span>{{ cfgTestResult.message }}</span>
          </div>
          <div class="mono test-result-url">{{ cfgTestResult.method }} {{ cfgTestResult.url }}</div>
          <div v-if="cfgTestResult.response_preview" class="mono test-result-preview">{{ cfgTestResult.response_preview }}</div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" :disabled="cfgTesting" @click="testDraftCfg">
            <Loader2 v-if="cfgTesting" :size="12" class="animate-spin" />
            <span v-else>测试配置</span>
          </button>
          <button type="button" class="btn" @click="cfgDialog = false">取消</button>
          <button type="submit" class="btn btn-primary">保存</button>
        </div>
      </form>
    </div>

    <!-- Huobao Preset Dialog -->
    <div v-if="presetDialog" class="overlay" @click.self="presetDialog = false">
      <form class="modal card config-modal" @submit.prevent="applyHuobaoPreset">
        <div class="config-modal-head">
          <div>
            <div class="setup-kicker">Huobao Preset</div>
            <h2 class="modal-title">Lovarts.短剧一键配置</h2>
            <div class="modal-note">输入Lovarts.短剧开放平台 API Key 后，文本、图片、视频、音频都会使用Lovarts.短剧推荐链路，并同时初始化 5 个 Agent 的默认模型。</div>
          </div>
          <span class="tag tag-success">推荐</span>
        </div>
        <div class="huobao-grid">
          <label class="field">
            <span class="field-label">Lovarts.短剧 API Key <span class="dim">(文本 / 图片 / 视频 / 音频统一使用)</span></span>
            <input v-model="huobaoForm.apiKey" class="input" type="password" placeholder="用于Lovarts.短剧文本、图片、视频、音频服务" />
            <span class="field-hint">Lovarts.短剧 API Key 可在Lovarts.短剧开放平台获取</span>
          </label>
        </div>
        <div class="preset-grid compact">
          <article v-for="preset in huobaoPresetCards" :key="`${preset.serviceType}-${preset.provider}`" class="preset-card">
            <div class="preset-card-top">
              <span class="preset-service">{{ preset.label }}</span>
              <span class="tag tag-accent">{{ preset.provider }}</span>
            </div>
            <div class="preset-model mono">{{ preset.model }}</div>
            <div class="preset-base mono">{{ preset.baseUrl }}</div>
          </article>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="presetDialog = false">取消</button>
          <button type="submit" class="btn btn-primary">创建并启用</button>
        </div>
      </form>
    </div>

    <!-- Add Skill Dialog -->
    <div v-if="addSkillDialog" class="overlay" @click.self="addSkillDialog = false">
      <form class="modal card" @submit.prevent="confirmAddSkill">
        <h2 class="modal-title">新增 Skill — {{ selectedAgentLabel }}</h2>
        <label class="field">
          <span class="field-label">Skill 目录名 <span class="dim">(英文，唯一)</span></span>
          <input v-model="newSkillForm.id" class="input" placeholder="如 custom-extraction" />
        </label>
        <label class="field">
          <span class="field-label">名称</span>
          <input v-model="newSkillForm.name" class="input" placeholder="如 自定义提取规则" />
        </label>
        <label class="field">
          <span class="field-label">描述</span>
          <input v-model="newSkillForm.description" class="input" placeholder="简短描述此 Skill 的用途" />
        </label>
        <div class="modal-actions">
          <button type="button" class="btn" @click="addSkillDialog = false">取消</button>
          <button type="submit" class="btn btn-primary" :disabled="!newSkillForm.id">创建</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { Plus, Pencil, Trash2, FileText, ChevronDown, Check, Loader2, Bot, Cpu, Sparkles } from 'lucide-vue-next'
import BaseSelect from '~/components/BaseSelect.vue'
import { toast } from 'vue-sonner'
import { aiConfigAPI, aiModelAPI, agentConfigAPI, skillsAPI } from '~/composables/useApi'
import brandLogo from '~/assets/huobao-logo.png'
import { apimartMultimodalChatModels } from '~/utils/apimartModels'

const showBrandImage = ref(true)
const tab = ref('ai')
const route = useRoute()
const router = useRouter()
const showAdvanced = ref(false)
const baseTabs = [
  { id: 'ai', label: 'AI 服务', icon: Cpu },
]
const advancedTabs = [
  { id: 'agents', label: 'Agent 配置', icon: Bot },
  { id: 'skills', label: 'Skills', icon: FileText },
]
watch(showAdvanced, (v) => {
  if (!v && tab.value !== 'ai') tab.value = 'ai'
})

// ===== AI Service Configs =====
const cfgs = ref([])
const cfgDialog = ref(false)
const cfgEditId = ref(null)
const presetDialog = ref(false)
const cfgTesting = ref(false)
const cfgTestResult = ref(null)
const cfgForm = reactive({ name: '', provider: '', api_key: '', base_url: '', modelStr: '', service_type: 'text', priority: 0 })
const huobaoForm = reactive({ apiKey: '' })
const serviceTypes = [{ type: 'text', label: '文本' }, { type: 'image', label: '图片' }, { type: 'video', label: '视频' }, { type: 'audio', label: '音频' }]
const serviceTypeOptions = computed(() => serviceTypes.map(s => ({ label: s.label, value: s.type })))
const providers = ['ali', 'anthropic', 'apimart', 'chatfire', 'deepseek', 'gemini', 'minimax', 'openai', 'openrouter', 'vidu', 'volcengine', 'zenmux']
const providerSelectOptions = computed(() => {
  const dbProviders = models.value.map(m => m.provider).filter(Boolean)
  return Array.from(new Set([...providers, ...dbProviders])).map(p => ({ label: p, value: p }))
})
const serviceMeta = {
  text: { label: '文本', desc: '剧本改写、角色场景提取、分镜拆解等 Agent 文本能力' },
  image: { label: '图片', desc: '角色图、场景图、镜头图与首尾帧等静态图像生成' },
  video: { label: '视频', desc: '镜头视频生成，支持单图、多图和首尾帧模式' },
  audio: { label: '音频', desc: '角色试听、旁白与对白语音生成' },
}
const providerPresets = {
  text: {
    apimart: { label: 'APIMart 多模态', baseUrl: 'https://api.apimart.ai', models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3-pro-preview-thinking'] },
    chatfire: { label: 'Lovarts.短剧文本', baseUrl: 'https://api.chatfire.site', models: ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3-pro-preview-thinking'] },
    anthropic: { label: 'Anthropic 推荐', baseUrl: 'https://api.apimart.ai', models: ['claude-sonnet-4-5-20250929', 'claude-opus-4-1-20250805', 'claude-haiku-4-5-20251001'] },
    gemini: { label: 'Google Gemini 推荐', baseUrl: 'https://api.apimart.ai', models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.5-flash-lite'] },
    deepseek: { label: 'DeepSeek 推荐', baseUrl: 'https://api.apimart.ai', models: ['deepseek-v3.1-250821', 'deepseek-v3.1-think-250821', 'deepseek-v3-0324'] },
    openrouter: { label: 'OpenRouter 推荐', baseUrl: 'https://openrouter.ai/api', models: ['google/gemini-3-flash-preview'] },
    openai: { label: 'OpenAI 推荐', baseUrl: 'https://api.openai.com', models: ['gpt-4.1-mini'] },
  },
  image: {
    apimart: { label: 'APIMart 图片', baseUrl: 'https://api.apimart.ai', models: ['gpt-image-2', 'gemini-3-pro-image-preview'] },
    zenmux: { label: 'ZenMux 图片', baseUrl: 'https://zenmux.ai/api/v1', models: ['gpt-image-2'] },
    chatfire: { label: 'Lovarts.短剧图片', baseUrl: 'https://api.chatfire.site', models: ['doubao-seedream-4-5-251128'] },
    gemini: { label: 'Gemini 推荐', baseUrl: 'https://api.chatfire.site', models: ['gemini-3-pro-image-preview'] },
    volcengine: { label: '火山推荐', baseUrl: 'https://ark.cn-beijing.volces.com', models: ['doubao-seedream-4-0-250828'] },
  },
  video: {
    apimart: { label: 'APIMart 视频', baseUrl: 'https://api.apimart.ai', models: ['doubao-seedance-2.0', 'doubao-seedance-2.0-fast'] },
    volcengine: { label: 'Lovarts.短剧视频', baseUrl: 'https://api.chatfire.site/volcengine', models: ['doubao-seedance-1-5-pro-251215'] },
    vidu: { label: 'Vidu 推荐', baseUrl: 'https://api.vidu.com', models: ['viduq3-turbo'] },
    ali: { label: '阿里推荐', baseUrl: 'https://dashscope.aliyuncs.com', models: ['wan2.6-i2v-flash'] },
  },
  audio: {
    chatfire: { label: 'Lovarts.短剧音频', baseUrl: 'https://api.chatfire.site/minimax', models: ['speech-2.8-hd'] },
    minimax: { label: 'MiniMax 音频', baseUrl: 'https://api.chatfire.site/minimax', models: ['speech-2.8-hd'] },
  },
}
const huobaoPresetCards = [
  { serviceType: 'text', label: '文本', provider: 'Lovarts.短剧', baseUrl: 'https://api.chatfire.site', model: 'gemini-3.1-pro-preview', priority: 100 },
  { serviceType: 'image', label: '图片', provider: 'Lovarts.短剧', baseUrl: 'https://api.chatfire.site', model: 'doubao-seedream-4-5-251128', priority: 99 },
  { serviceType: 'video', label: '视频', provider: 'Lovarts.短剧', baseUrl: 'https://api.chatfire.site/volcengine', model: 'doubao-seedance-1-5-pro-251215', priority: 98 },
  { serviceType: 'audio', label: '音频', provider: 'Lovarts.短剧', baseUrl: 'https://api.chatfire.site/minimax', model: 'speech-2.8-hd', priority: 97 },
]
const endpointPrefixes = {
  apimart: '/v1',
  chatfire: '/v1',
  openai: '/v1',
  openrouter: '/v1',
  minimax: '/v1',
  gemini: '/v1beta',
  volcengine: '/api/v3',
  ali: '/api/v1',
  vidu: '/ent/v2',
  zenmux: '',
}

const endpointHint = computed(() => {
  const provider = cfgForm.provider
  const base = cfgForm.base_url || 'https://...'
  const prefix = endpointPrefixes[provider] || ''
  if (!provider) return '选择服务商后显示推荐端点前缀'
  return `${base}${prefix}`
})

const cfgModelSelectOptions = computed(() => {
  const dbModels = models.value
    .filter(m => m.service_type === cfgForm.service_type && (!cfgForm.provider || m.provider === cfgForm.provider))
    .map(m => ({ label: `${m.name || m.model_id} (${m.provider})`, value: m.model_id }))
  if (dbModels.length) return dbModels
  if (cfgForm.service_type === 'text' && cfgForm.provider === 'apimart') return apimartMultimodalChatModels
  const presetModels = providerPresets[cfgForm.service_type]?.[cfgForm.provider]?.models || []
  const currentModels = cfgForm.modelStr
    ? cfgForm.modelStr.split(',').map(s => s.trim()).filter(Boolean)
    : []
  return Array.from(new Set([...presetModels, ...currentModels]))
    .map(model => ({ label: model, value: model }))
})

// ===== AI Model Configs =====
const models = ref([])
const modelDialog = ref(false)
const modelEditId = ref(null)
const emptyJson = '{}'
const modelForm = reactive({
  service_type: 'text',
  provider: '',
  model_id: '',
  name: '',
  description: '',
  base_url: '',
  endpoint: '',
  query_endpoint: '',
  parameters: emptyJson,
  defaults: emptyJson,
  capabilities: emptyJson,
  cost: 0,
  priority: 0,
  is_default: false,
  is_active: true,
})

function prettyJson(value, fallback = emptyJson) {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'string') {
    try { return JSON.stringify(JSON.parse(value), null, 2) } catch { return value }
  }
  return JSON.stringify(value, null, 2)
}

function parseModelJsonField(value, field) {
  if (!value || !String(value).trim()) return {}
  try { return JSON.parse(value) } catch { throw new Error(`${field} 不是合法 JSON`) }
}

function modelsByType(type) {
  return models.value.filter(m => m.service_type === type)
}

async function loadModels() {
  try {
    models.value = await aiModelAPI.list({ active: 0 })
  } catch (e) {
    toast.error(e.message)
  }
}

function startAddModel(type = 'text') {
  modelEditId.value = null
  Object.assign(modelForm, {
    service_type: type,
    provider: '',
    model_id: '',
    name: '',
    description: '',
    base_url: '',
    endpoint: '',
    query_endpoint: '',
    parameters: emptyJson,
    defaults: emptyJson,
    capabilities: emptyJson,
    cost: 0,
    priority: 0,
    is_default: false,
    is_active: true,
  })
  modelDialog.value = true
}

function startEditModel(model) {
  modelEditId.value = model.id
  Object.assign(modelForm, {
    service_type: model.service_type,
    provider: model.provider,
    model_id: model.model_id,
    name: model.name || '',
    description: model.description || '',
    base_url: model.base_url || '',
    endpoint: model.endpoint || '',
    query_endpoint: model.query_endpoint || '',
    parameters: prettyJson(model.parameters),
    defaults: prettyJson(model.defaults),
    capabilities: prettyJson(model.capabilities),
    cost: model.cost || 0,
    priority: model.priority || 0,
    is_default: Boolean(model.is_default),
    is_active: Boolean(model.is_active),
  })
  modelDialog.value = true
}

async function saveModel() {
  if (!modelForm.service_type || !modelForm.provider || !modelForm.model_id) {
    toast.warning('请填写服务类型、供应商和模型 ID')
    return
  }
  try {
    const payload = {
      ...modelForm,
      name: modelForm.name || modelForm.model_id,
      parameters: parseModelJsonField(modelForm.parameters, 'parameters'),
      defaults: parseModelJsonField(modelForm.defaults, 'defaults'),
      capabilities: parseModelJsonField(modelForm.capabilities, 'capabilities'),
    }
    if (modelEditId.value) await aiModelAPI.update(modelEditId.value, payload)
    else await aiModelAPI.create(payload)
    modelDialog.value = false
    await loadModels()
    toast.success('模型配置已保存')
  } catch (e) {
    toast.error(e.message)
  }
}

async function deleteModel(id) {
  if (!confirm('确定删除这个模型配置？')) return
  try {
    await aiModelAPI.del(id)
    await loadModels()
    toast.success('已删除')
  } catch (e) {
    toast.error(e.message)
  }
}

async function seedModelsFromConfigs() {
  try {
    const res = await aiModelAPI.seedFromConfigs()
    await loadModels()
    toast.success(`已导入 ${res.created || 0} 个模型`)
  } catch (e) {
    toast.error(e.message)
  }
}

function byType(t) { return cfgs.value.filter(c => c.service_type === t) }
function countActive(t) { return byType(t).filter(c => c.is_active).length }
function fmtModel(m) { return Array.isArray(m) ? m.join(', ') : m || '—' }
function displayProvider(c) {
  const baseUrl = c?.base_url || c?.baseUrl || ''
  return baseUrl.includes('api.chatfire.site') ? 'huobao' : c?.provider
}
function presetsByType(type) {
  const group = providerPresets[type] || {}
  return Object.entries(group).map(([provider, preset]) => ({ provider, ...preset }))
}
function applyProviderPreset(type, provider) {
  const preset = providerPresets[type]?.[provider]
  if (!preset) return
  cfgForm.provider = provider
  cfgForm.base_url = preset.baseUrl
  cfgForm.modelStr = preset.models.join(', ')
  cfgForm.name = `${preset.label}-${serviceMeta[type].label}`
}

async function loadCfgs() {
  try {
    cfgs.value = await aiConfigAPI.list()
    return cfgs.value
  } catch (e) {
    toast.error(e.message)
    return []
  }
}
async function toggleCfg(c) { await aiConfigAPI.update(c.id, { is_active: !c.is_active }); loadCfgs() }
async function delCfg(id) { await aiConfigAPI.del(id); toast.success('已删除'); loadCfgs() }
function startAddCfg(t) {
  cfgEditId.value = null
  cfgTestResult.value = null
  Object.assign(cfgForm, { name: '', provider: '', api_key: '', base_url: '', modelStr: '', service_type: t, priority: 0 })
  const firstPreset = presetsByType(t)[0]
  if (firstPreset) applyProviderPreset(t, firstPreset.provider)
  cfgDialog.value = true
}

watch(
  () => route.query.model_config,
  async (value) => {
    if (value) {
      tab.value = 'ai'
      const loaded = await loadCfgs()
      const existing = [...loaded]
        .filter(c => c.service_type === 'text')
        .sort((a, b) => Number(b.is_active) - Number(a.is_active) || (b.priority || 0) - (a.priority || 0))[0]
      if (existing) startEditCfg(existing)
      else startAddCfg('text')
      const nextQuery = { ...route.query }
      delete nextQuery.model_config
      router.replace({ path: route.path, query: nextQuery })
    }
  },
  { immediate: true },
)
function startEditCfg(c) {
  cfgEditId.value = c.id
  cfgTestResult.value = null
  Object.assign(cfgForm, {
    name: c.name || '',
    provider: c.provider,
    api_key: c.api_key || '',
    base_url: c.base_url || '',
    modelStr: fmtModel(c.model),
    service_type: c.service_type,
    priority: c.priority ?? 0,
  })
  cfgDialog.value = true
}
async function testCfgPayload(payload) {
  cfgTesting.value = true
  try {
    cfgTestResult.value = await aiConfigAPI.test(payload)
    if (cfgTestResult.value.reachable) toast.success('端点已响应')
    else toast.warning('端点未通过测试')
  } catch (e) {
    toast.error(e.message)
  } finally {
    cfgTesting.value = false
  }
}
async function testDraftCfg() {
  await testCfgPayload({
    service_type: cfgForm.service_type,
    provider: cfgForm.provider,
    api_key: cfgForm.api_key,
    base_url: cfgForm.base_url,
    model: cfgForm.modelStr ? [cfgForm.modelStr] : [],
  })
}
async function testExistingCfg(c) {
  startEditCfg(c)
  await testCfgPayload({
    service_type: c.service_type,
    provider: c.provider,
    api_key: c.api_key || '',
    base_url: c.base_url || '',
    model: Array.isArray(c.model) ? c.model : [],
  })
}
async function saveCfg() {
  if (!cfgForm.provider) { toast.warning('选择服务商'); return }
  const models = cfgForm.modelStr ? [cfgForm.modelStr] : []
  try {
    if (cfgEditId.value) await aiConfigAPI.update(cfgEditId.value, { name: cfgForm.name, provider: cfgForm.provider, api_key: cfgForm.api_key, base_url: cfgForm.base_url, model: models, priority: cfgForm.priority })
    else await aiConfigAPI.create({ service_type: cfgForm.service_type, provider: cfgForm.provider, name: cfgForm.name || `${cfgForm.provider}-${cfgForm.service_type}`, api_key: cfgForm.api_key, base_url: cfgForm.base_url, model: models, priority: cfgForm.priority })
    cfgDialog.value = false; toast.success('已保存'); loadCfgs()
  } catch (e) { toast.error(e.message) }
}
async function applyHuobaoPreset() {
  if (!huobaoForm.apiKey) {
    toast.warning('请填写 Huobao API Key')
    return
  }
  try {
    await aiConfigAPI.huobaoPreset(huobaoForm.apiKey)
    await loadCfgs()
    await loadAgents()
    presetDialog.value = false
    toast.success('Lovarts.短剧推荐配置与默认 Agent LLM 已写入')
  } catch (e) {
    toast.error(e.message)
  }
}

// ===== Agent Configs =====
const agentCfgs = ref([])
const editingAgent = ref(null)
const agentSaving = ref(false)
const agentSaved = ref(null)
const agentForm = reactive({ model: '', temperature: 0.7, max_tokens: 4096, system_prompt: '' })

const agentDefs = [
  { type: 'script_rewriter', label: '剧本改写', icon: '📝' },
  { type: 'extractor', label: '角色场景提取', icon: '🔍' },
  { type: 'storyboard_breaker', label: '分镜拆解', icon: '🎬' },
  { type: 'voice_assigner', label: '音色分配', icon: '🎙' },
  { type: 'grid_prompt_generator', label: '图片提示词生成', icon: '🖼' },
]

const defaultPrompts = {
  script_rewriter: `你是专业编剧，擅长将小说改编为短剧剧本。

工作流程：
1. 调用 read_episode_script 读取原始内容
2. 根据读取到的内容，自己进行改写（输出格式化剧本格式）
3. 调用 save_script 保存改写后的完整剧本

格式化剧本格式：
- 场景头：## S编号 | 内景/外景 · 地点 | 时间段
- 动作描写：自然段落，不包含镜头语言
- 对白：角色名：（状态/表情）台词内容
- 每个场景 30-60 秒内容`,
  extractor: `你是制片助理，擅长从剧本中提取角色和场景信息，并在提取时与项目已有数据进行智能去重。

工作流程：
1. 调用 read_script_for_extraction 读取格式化剧本
2. 调用 read_existing_characters 读取项目中已存在的角色列表（用于去重）
3. 调用 read_existing_scenes 读取项目中已存在的场景列表（用于去重）
4. 分析剧本内容，提取所有角色信息
5. 对每个角色：若同名已存在则合并更新，若不存在则新增
6. 调用 save_dedup_characters 保存角色（去重合并，自动处理新增和更新）
7. 分析剧本内容，提取所有场景信息
8. 对每个场景：若同地点+时间段已存在则复用，若不存在则新增
9. 调用 save_dedup_scenes 保存场景（去重合并，自动处理新增和复用）

去重规则：
- 角色：按名字精确匹配，同名保留现有（合并信息）
- 场景：按【地点+时间段】精确匹配；同地点不同时段视为新场景

提取要求：
- 角色要包含完整的外貌特征描述（发型、服装、体态等）
- 场景要包含光线、色调、氛围等视觉信息
- 不要遗漏任何有台词或重要动作的角色`,
  storyboard_breaker: `你是短剧影视分镜导演。必须把剧本拆成可直接用于图片、视频、配音、音效和合成流程的结构化分镜，而不是只生成 video_prompt。

工作流程：
1. 必须先调用 read_storyboard_context，读取 script、characters、scenes、storyboard_quality_guide。
2. 按剧情节奏拆解为短视频镜头序列；通常 12-24 个镜头，简单片段可少一些，复杂剧情不要合并重大动作。
3. 每个镜头通常 2-5 秒，转场或宏大空镜可到 8 秒。
4. 必须调用 save_storyboards 保存完整 storyboards 数组。

每条分镜必须完整填写：
- shotNumber/shot_number：从 1 开始连续递增。
- title：3-10 字镜头标题。
- shotType/shot_type：必须使用标准枚举，优先 FULL_SHOT, CLOSE_UP, LONG_SHOT, MEDIUM_SHOT, EXTREME_CLOSE_UP, EXTREME_LONG_SHOT, MEDIUM_CLOSE_UP, OVER_SHOULDER, POV, TWO_SHOT, GROUP_SHOT。
- cameraAngle/angle：必须使用标准枚举，优先 EYE_LEVEL, HIGH_ANGLE, LOW_ANGLE, BIRD_EYE, DUTCH_ANGLE, OVER_SHOULDER, POV。
- cameraMovement/movement：必须使用标准枚举，优先 STATIC, ZOOM, PAN, TILT, DOLLY, TRACKING, PUSH_IN, PULL_OUT, HANDHELD, CRANE。
- durationSeconds/duration：数字秒数，通常 2-5。
- visualDescription/description：只写画面视觉，包括构图、景别、光线、材质、空间、环境细节和镜头看到的内容。
- action：只写角色动作、表情、表演节奏和镜头内变化。
- dialogue：该镜头实际对白或旁白；没有对白用 null 或空字符串。
- soundEffects/sound_effect：关键音效，不能空。
- backgroundMusic/bgm_prompt：配乐或氛围音乐，不能空。
- atmosphere：镜头情绪、压迫感、紧张感、孤独感等，不能空。
- sceneId/scene_id：必须来自 read_storyboard_context.scenes。非抽象镜头必须绑定场景。
- charactersInShot/character_ids：必须只使用 read_storyboard_context.characters 中的角色 id；空镜头传空数组。
- image_prompt：静态画面提示词，要能直接用于关键帧/首帧/尾帧生成。
- video_prompt：动态视频提示词，要包含主体、动作、运镜、光线、场景连续性。

输出结构尽量接近接口字段：shotNumber、title、shotType、cameraAngle、cameraMovement、durationSeconds、visualDescription、action、dialogue、soundEffects、backgroundMusic、atmosphere、charactersInShot、sceneId。`,
  voice_assigner: `你是配音导演，擅长为角色选择合适的音色。

工作流程：
1. 调用 list_voices 获取可用音色列表
2. 调用 get_characters 获取所有角色信息
3. 根据每个角色的性别、性格、年龄、角色定位，选择最匹配的音色
4. 对每个角色调用 assign_voice 分配音色，并说明选择理由

注意：每个角色都必须分配音色，不要遗漏。`,
  grid_prompt_generator: `你是专业的 AI 图像提示词工程师，擅长为角色、场景和宫格图生成高质量的英文提示词。

你将收到用户的请求，告知要生成哪种类型的提示词：
- "角色" → 生成角色图片提示词
- "场景" → 生成场景图片提示词
- "宫格" → 生成宫格图提示词

## 角色图片提示词

工作流程：
1. 调用 read_characters 读取所有角色信息
2. 根据角色外貌特征（appearance）、性格（personality）、定位（role）生成英文提示词
3. 提示词结构：[外貌描述]，[性格/气质]，[角色定位]，[电影感]，[高质量]，[无文字水印]

## 场景图片提示词

工作流程：
1. 调用 read_scenes 读取所有场景信息
2. 根据场景地点（location）、时间段（time）、已有描述（prompt）生成英文提示词
3. 提示词结构：[地点]，[时间/光线/氛围]，[已有描述]，[电影感场景]，[高质量]，[无文字水印]

## 宫格图提示词（参考 skills/grid-image-generator/SKILL.md）

工作流程：
1. 调用 read_shots_for_grid 读取选中镜头的详细信息
2. 根据 mode 调用 generate_grid_prompt：
   - first_frame 模式：每格=一个镜头的首帧，NxN 风格统一
   - first_last 模式：每个镜头占2格（左首右尾），同一行风格连续
   - multi_ref 模式：所有格子都是同一镜头的不同参考角度
3. 返回 grid_prompt（整体提示词）和 cell_prompts（每格提示词）

提示词规范：
- 使用英文提示词
- 必须包含 "consistent art style" 保持风格统一
- 必须包含 "cinematic quality"
- 避免出现文字或水印`,
}

function getAgentCfg(type) {
  return agentCfgs.value.find(a => a.agent_type === type)
}

const textModelGroups = computed(() => {
  const registryGroups = models.value
    .filter(m => m.service_type === 'text' && m.is_active)
    .map(c => ({
      label: `${c.provider} — ${c.name || c.model_id}`,
      models: [c.model_id],
    }))
    .filter(g => g.models.length > 0)
  if (registryGroups.length) return registryGroups
  return cfgs.value
    .filter(c => c.service_type === 'text' && c.is_active && c.api_key)
    .map(c => ({
      label: `${c.provider} — ${c.name}`,
      models: Array.isArray(c.model) ? c.model : (c.model ? [c.model] : []),
    }))
    .filter(g => g.models.length > 0)
})

const textModelSelectOptions = computed(() =>
  textModelGroups.value.map(g => ({
    label: g.label,
    options: g.models.map(m => ({ label: m, value: m })),
  }))
)

async function loadAgents() {
  try { agentCfgs.value = await agentConfigAPI.list() }
  catch (e) { toast.error(e.message) }
}

function toggleAgentEdit(type) {
  if (editingAgent.value === type) { editingAgent.value = null; return }
  const cfg = getAgentCfg(type)
  agentForm.model = cfg?.model || ''
  agentForm.temperature = cfg?.temperature ?? 0.7
  agentForm.max_tokens = cfg?.max_tokens ?? 4096
  agentForm.system_prompt = cfg?.system_prompt || defaultPrompts[type] || ''
  agentSaved.value = null
  editingAgent.value = type
}

function resetAgentPrompt(type) {
  agentForm.system_prompt = defaultPrompts[type] || ''
  toast.info('已恢复默认提示词，点击保存生效')
}

async function saveAgentCfg(type) {
  agentSaving.value = true
  agentSaved.value = null
  try {
    const existing = getAgentCfg(type)
    const data = {
      agent_type: type,
      name: agentDefs.find(a => a.type === type)?.label || type,
      model: agentForm.model,
      temperature: agentForm.temperature,
      max_tokens: agentForm.max_tokens,
      system_prompt: agentForm.system_prompt,
    }
    if (existing) {
      await agentConfigAPI.update(existing.id, data)
    } else {
      await agentConfigAPI.create(data)
    }
    await loadAgents()
    agentSaved.value = type
    toast.success(`${agentDefs.find(a => a.type === type)?.label} 配置已保存`)
    setTimeout(() => { if (agentSaved.value === type) agentSaved.value = null }, 3000)
  } catch (e) {
    toast.error(e.message)
  } finally {
    agentSaving.value = false
  }
}

// ===== Skills =====
const selectedAgent = ref('script_rewriter')
const allSkills = ref([])   // { id, name, description }[]
const editingSkill = ref(null)
const skillContent = ref('')
const skillSaving = ref(false)
const skillSaved = ref(null)
const addSkillDialog = ref(false)
const newSkillForm = reactive({ id: '', name: '', description: '' })

const selectedAgentType = computed(() => selectedAgent.value)
const selectedAgentLabel = computed(() => agentDefs.find(a => a.type === selectedAgent.value)?.label || '')
const selectedAgentIcon = computed(() => agentDefs.find(a => a.type === selectedAgent.value)?.icon || '')

function agentSkillCount(type) {
  return allSkills.value.filter(s => s.id === type || s.id.startsWith(type + '/')).length
}

const currentSkills = computed(() =>
  allSkills.value.filter(s => s.id === selectedAgent.value || s.id.startsWith(selectedAgent.value + '/'))
)

async function loadAllSkills() {
  try { allSkills.value = await skillsAPI.list() }
  catch (e) { toast.error(e.message) }
}

async function selectAgent(type) {
  selectedAgent.value = type
  editingSkill.value = null
}

function startAddSkill() {
  newSkillForm.id = ''
  newSkillForm.name = ''
  newSkillForm.description = ''
  addSkillDialog.value = true
}

async function confirmAddSkill() {
  if (!newSkillForm.id) return
  const skillId = `${selectedAgent.value}/${newSkillForm.id}`
  try {
    await skillsAPI.create({ id: skillId, name: newSkillForm.name, description: newSkillForm.description })
    addSkillDialog.value = false
    await loadAllSkills()
    toast.success('Skill 创建成功')
  } catch (e) {
    toast.error(e.message)
  }
}

async function deleteSkill(id) {
  if (!confirm(`确定删除 Skill「${id}」？`)) return
  try {
    await skillsAPI.del(id)
    if (editingSkill.value === id) editingSkill.value = null
    await loadAllSkills()
    toast.success('已删除')
  } catch (e) {
    toast.error(e.message)
  }
}

async function toggleSkillEdit(id) {
  if (editingSkill.value === id) { editingSkill.value = null; return }
  try {
    const res = await skillsAPI.get(id)
    skillContent.value = res.content
    skillSaved.value = null
    editingSkill.value = id
  } catch (e) { toast.error(e.message) }
}

async function saveSkill(id) {
  skillSaving.value = true
  skillSaved.value = null
  try {
    await skillsAPI.update(id, skillContent.value)
    await loadAllSkills()
    skillSaved.value = id
    toast.success(`已保存`)
    setTimeout(() => { if (skillSaved.value === id) skillSaved.value = null }, 3000)
  } catch (e) {
    toast.error(e.message)
  } finally {
    skillSaving.value = false
  }
}

onMounted(() => { loadCfgs(); loadModels(); loadAgents(); loadAllSkills() })
</script>

<style scoped>
.settings-layout { display: flex; height: 100%; background: var(--bg-base); }

.settings-nav {
  width: 220px; flex-shrink: 0; padding: 16px 10px; border-right: 1px solid var(--border);
  display: flex; flex-direction: column; gap: 14px; background: var(--bg-1);
}
.nav-group { display: flex; flex-direction: column; gap: 4px; }
.nav-group-label {
  font-size: 10px; font-weight: 700; color: var(--text-3);
  letter-spacing: 0.12em; text-transform: uppercase; padding: 0 10px 4px;
}
.nav-item {
  display: flex; align-items: center; gap: 8px; padding: 9px 12px; font-size: 13px;
  border: none; background: none; color: var(--text-2); cursor: pointer;
  border-radius: var(--radius); transition: all 0.12s; text-align: left; width: 100%;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-0); }
.nav-item.active { background: var(--accent-bg); color: var(--accent-text); font-weight: 600; box-shadow: var(--shadow-card); }
.nav-advanced {
  padding: 12px 8px;
  border-top: 1px solid rgba(27, 41, 64, 0.08);
  border-bottom: 1px solid rgba(27, 41, 64, 0.08);
}
.advanced-toggle {
  display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 10px;
  font-size: 12px; color: var(--text-2);
}
.advanced-toggle input { display: none; }
.advanced-slider {
  position: relative; width: 38px; height: 22px; border-radius: 999px;
  background: rgba(27, 41, 64, 0.12); transition: background 0.18s ease;
}
.advanced-slider::after {
  content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px;
  border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(18, 24, 38, 0.18); transition: transform 0.18s ease;
}
.advanced-toggle input:checked + .advanced-slider { background: var(--accent); }
.advanced-toggle input:checked + .advanced-slider::after { transform: translateX(16px); }
.advanced-note {
  margin: 8px 0 0;
  font-size: 11px;
  line-height: 1.45;
  color: var(--text-3);
}

.settings-content { flex: 1; overflow: hidden; }
.settings-scroll { height: 100%; overflow-y: auto; padding: 36px 48px; max-width: 840px; margin: 0 auto; animation: fadeUp 0.3s var(--ease-out); }
.settings-head { margin-bottom: 24px; }
.settings-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.settings-brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 15px;
  border: 1px solid var(--border);
  background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(242,247,255,0.9));
  box-shadow: var(--shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.settings-brand-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
  display: block;
}
.settings-brand-fallback {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  color: var(--accent-text);
  line-height: 1;
}
.settings-brand-copy {
  display: flex;
  flex-direction: column;
  gap: 3px;
  line-height: 1;
}
.settings-brand-kicker {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-3);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.settings-brand-name {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-1);
  font-family: var(--font-display);
}
.settings-title { font-family: var(--font-display); font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
.settings-desc { font-size: 13px; color: var(--text-2); margin-top: 4px; }

/* AI Config */
.setup-panel {
  padding: 18px 18px 16px;
  margin-bottom: 18px;
}
.setup-panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}

.setup-panel-head.compact { margin-bottom: 12px; }
.setup-kicker {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-3);
  margin-bottom: 4px;
}
.setup-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text-0);
}
.setup-desc {
  font-size: 12px;
  color: var(--text-2);
  margin-top: 4px;
}
.preset-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}
.preset-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-top: 8px;
}
.preset-card {
  border: 1px solid rgba(75, 99, 135, 0.72);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.96));
  padding: 12px 13px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04);
}
.preset-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.preset-service { font-size: 12px; font-weight: 700; color: #f8fafc; }
.preset-card .tag-accent {
  background: rgba(59, 130, 246, 0.22);
  color: #bfdbfe;
}
.preset-model { font-size: 12px; color: #e2e8f0; }
.preset-base { font-size: 11px; color: #94a3b8; }
.template-row { display: flex; flex-wrap: wrap; gap: 8px; }
.template-type-chip {
  border: 1px solid rgba(75, 99, 135, 0.72);
  background: rgba(30, 41, 59, 0.96);
  color: #e5e7eb;
  border-radius: 999px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.15s;
}
.template-type-chip:hover {
  border-color: var(--accent);
  color: #fff;
  background: rgba(37, 99, 235, 0.32);
}
.sections { display: flex; flex-direction: column; gap: 24px; }
.section-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.section-title { font-size: 13px; font-weight: 600; }
.section-subtitle { font-size: 11px; color: var(--text-3); margin-top: 2px; }
.config-list { display: flex; flex-direction: column; gap: 6px; }
.config-row { display: flex; align-items: center; gap: 8px; padding: 10px 14px; }
.config-info { flex: 1; display: flex; align-items: center; gap: 10px; min-width: 0; }
.config-main { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.config-line { display: flex; align-items: center; gap: 8px; min-width: 0; }
.config-provider { font-size: 13px; font-weight: 600; }
.config-name { font-size: 12px; color: var(--text-2); }
.config-model { font-size: 11px; color: var(--text-2); }
.config-base { font-size: 11px; color: var(--text-3); }
.config-empty { font-size: 12px; color: var(--text-3); padding: 12px 0; }

/* Model Registry */
.model-toolbar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
.model-config-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.model-config-card { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.model-card-head { display: flex; align-items: flex-start; gap: 8px; }
.model-card-main { flex: 1; min-width: 0; }
.model-name { font-size: 14px; font-weight: 700; color: var(--text-0); }
.model-id { margin-top: 3px; font-size: 11px; color: var(--text-3); word-break: break-all; }
.model-meta { display: flex; flex-wrap: wrap; gap: 6px; font-size: 11px; color: var(--text-2); }
.model-meta span { padding: 3px 7px; border-radius: 999px; background: var(--bg-2); border: 1px solid var(--border); }
.model-base { font-size: 11px; color: var(--text-3); word-break: break-all; }
.model-desc { font-size: 12px; color: var(--text-2); line-height: 1.45; }
.model-card-actions { display: flex; justify-content: flex-end; gap: 6px; margin-top: auto; }
.model-switches { display: flex; gap: 14px; align-items: center; }
.check-row { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--text-2); }
.check-row input { accent-color: var(--accent); }

.toggle { position: relative; width: 30px; height: 17px; cursor: pointer; flex-shrink: 0; }
.toggle input { opacity: 0; width: 0; height: 0; }
.toggle span { position: absolute; inset: 0; background: var(--bg-3); border-radius: 99px; transition: 0.2s; }
.toggle span::before { content: ''; position: absolute; width: 13px; height: 13px; left: 2px; bottom: 2px; background: var(--bg-0); border-radius: 50%; transition: 0.2s; box-shadow: var(--shadow); }
.toggle input:checked + span { background: var(--accent); }
.toggle input:checked + span::before { transform: translateX(13px); }

/* Agent */
.agent-list { display: flex; flex-direction: column; gap: 8px; }
.agent-card { overflow: hidden; }
.agent-card-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; cursor: pointer; transition: background 0.1s; }
.agent-card-head:hover { background: var(--bg-hover); }
.agent-type-badge { width: 36px; height: 36px; border-radius: var(--radius); background: var(--accent-bg); color: var(--accent); display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.agent-card-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; border-top: 1px solid var(--border); padding-top: 16px; }
.agent-card-foot { display: flex; align-items: center; gap: 8px; padding-top: 8px; }

/* Skills 布局 */
.skills-layout { display: flex; height: 100%; overflow: hidden; }
.skills-agent-list {
  width: 200px; flex-shrink: 0; border-right: 1px solid var(--border);
  background: var(--bg-1); display: flex; flex-direction: column;
  overflow-y: auto;
}
.skills-agent-title {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--text-3); padding: 14px 14px 8px;
}
.skills-agent-item {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 14px; font-size: 13px; cursor: pointer;
  border: none; background: none; color: var(--text-2);
  transition: all 0.12s; width: 100%; text-align: left;
  border-radius: 0;
}
.skills-agent-item:hover { background: var(--bg-hover); color: var(--text-0); }
.skills-agent-item.active { background: var(--accent-bg); color: var(--accent-text); font-weight: 600; }
.skills-agent-label { flex: 1; }
.skill-count-badge {
  font-size: 10px; font-weight: 700; font-family: var(--font-mono);
  background: var(--accent-bg); color: var(--accent-text);
  padding: 1px 5px; border-radius: 99px;
}
.skills-agent-item.active .skill-count-badge { background: rgba(255,255,255,0.2); color: inherit; }
.skills-main { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
.skills-main .settings-scroll { max-width: 900px; }

/* Skill */
.skill-list { display: flex; flex-direction: column; gap: 8px; }
.skill-card { overflow: hidden; }
.skill-card-head { display: flex; align-items: center; gap: 10px; padding: 12px 16px; cursor: pointer; transition: background 0.1s; }
.skill-card-head:hover { background: var(--bg-hover); }
.skill-card-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 10px; border-top: 1px solid var(--border); padding-top: 12px; }
.skill-card-foot { display: flex; align-items: center; gap: 8px; }

/* Shared */
.field { display: flex; flex-direction: column; gap: 5px; }
.field-label { font-size: 12px; font-weight: 500; color: var(--text-1); }
.field-hint { font-size: 11px; color: var(--text-3); margin-top: 2px; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.overlay { position: fixed; inset: 0; background: rgba(34,45,66,0.32); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; z-index: 100; animation: fadeIn 0.18s var(--ease-out); }
.modal { padding: 28px; width: 420px; display: flex; flex-direction: column; gap: 12px; box-shadow: var(--shadow-elevated); }
.modal-title { font-family: var(--font-display); font-size: 18px; font-weight: 700; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 6px; }
.config-modal { width: min(720px, calc(100vw - 40px)); max-height: calc(100vh - 48px); overflow-y: auto; }
.config-modal-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}
.modal-note {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-2);
}
.preset-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.preset-pill {
  border: 1px solid rgba(75, 99, 135, 0.72);
  background: rgba(30, 41, 59, 0.96);
  color: #e5e7eb;
  border-radius: 999px;
  padding: 8px 11px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.preset-pill:hover {
  border-color: var(--accent);
  background: rgba(37, 99, 235, 0.32);
  color: #fff;
}
.endpoint-hint {
  margin-top: -4px;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px dashed var(--border);
  background: rgba(15, 23, 42, 0.72);
  font-size: 12px;
}
.test-result {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-radius: 14px;
  padding: 12px;
  border: 1px solid var(--border);
  background: rgba(255,255,255,0.72);
}
.test-result.ok { border-color: rgba(74, 167, 92, 0.28); }
.test-result.bad { border-color: rgba(201, 88, 68, 0.28); }
.test-result-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-1);
}
.test-result-url,
.test-result-preview {
  font-size: 11px;
  color: var(--text-3);
  word-break: break-all;
}
.huobao-grid {
  display: grid;
  grid-template-columns: repeat(1, minmax(0, 1fr));
  gap: 10px;
}
.huobao-grid .field-hint a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 500;
}
.huobao-grid .field-hint a:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .preset-grid,
  .preset-grid.compact,
  .model-config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
