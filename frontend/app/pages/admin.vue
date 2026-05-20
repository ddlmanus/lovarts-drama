<template>
  <div class="admin-shell">
    <aside class="admin-sidebar">
      <div class="brand">
        <div class="brand-mark">L</div>
        <div>
          <strong>后台管理</strong>
          <span>Lovarts Admin</span>
        </div>
      </div>
      <nav class="nav-list">
        <button v-for="item in tabs" :key="item.id" :class="['nav-item', { active: tab === item.id }]" @click="tab = item.id">
          <component :is="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <main class="admin-main">
      <header class="page-head">
        <div>
          <div class="kicker">MODEL CENTER</div>
          <h1>{{ currentTab.label }}</h1>
          <p>{{ currentTab.desc }}</p>
        </div>
        <div class="head-actions">
          <button class="btn ghost" @click="seedFromConfigs">从旧配置导入</button>
          <button v-if="tab === 'providers'" class="btn primary" @click="openProvider()">新增供应商</button>
          <button v-if="tab === 'models'" class="btn primary" @click="openModel()">新增模型</button>
          <button v-if="tab === 'parameters'" class="btn primary" @click="openParameter()">新增参数配置</button>
          <button v-if="tab === 'users'" class="btn primary" @click="openUser()">新增用户</button>
          <button v-if="tab === 'userProviders'" class="btn primary" @click="openConnectProvider()">新增用户供应商</button>
        </div>
      </header>

      <section v-if="tab === 'providers'" class="panel">
        <div class="table provider-table">
          <div class="tr th"><span>供应商</span><span>Key</span><span>官网</span><span>OpenAI 兼容</span><span>排序</span><span>状态</span><span>操作</span></div>
          <div v-for="p in sortedProviders" :key="p.id" class="tr">
            <span class="name-cell">
              <img v-if="p.icon" :src="p.icon" alt="" class="icon-img" />
              <span>
                <strong>{{ p.display_name || p.name }}</strong>
                <em>{{ p.description || '公共供应商模板' }}</em>
              </span>
            </span>
            <span class="mono">{{ p.key }}</span>
            <span class="truncate">{{ p.website || '-' }}</span>
            <span>{{ p.support_open_ai ? '是' : '否' }}</span>
            <span>{{ p.rank || 0 }}</span>
            <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
            <span class="ops"><button @click="openProvider(p)">编辑</button><button @click="removeProvider(p.id)">删除</button></span>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'models'" class="panel">
        <div class="table model-table">
          <div class="tr th"><span>模型</span><span>类型</span><span>供应商</span><span>参数配置</span><span>成本/排序</span><span>状态</span><span>操作</span></div>
          <div v-for="m in models" :key="m.id" class="tr">
            <span>
              <strong>{{ m.name }}</strong>
              <em class="mono">{{ m.model_id }}</em>
            </span>
            <span>{{ serviceLabel(m.service_type) }}</span>
            <span>{{ m.provider?.display_name || m.provider?.key || m.provider }}</span>
            <span>{{ m.parameter_profile?.name || '-' }}</span>
            <span>{{ m.cost || 0 }} / {{ m.priority || 0 }}</span>
            <span><b :class="m.is_active ? 'ok' : 'muted'">{{ m.is_active ? '启用' : '停用' }}</b></span>
            <span class="ops"><button @click="openModel(m)">编辑</button><button @click="removeModel(m.id)">删除</button></span>
          </div>
        </div>
      </section>

      <section v-else-if="tab === 'parameters'" class="parameter-layout">
        <div class="panel profile-list">
          <div class="table profile-table">
            <div class="tr th"><span>名称</span><span>Key</span><span>类型</span><span>参数项</span><span>状态</span><span>操作</span></div>
            <div v-for="p in parameters" :key="p.id" :class="['tr', { selected: selectedParameterId === p.id }]" @click="selectParameter(p)">
              <span>
                <strong>{{ p.name }}</strong>
                <em>{{ p.description || '无说明' }}</em>
              </span>
              <span class="mono">{{ p.key }}</span>
              <span>{{ serviceLabel(p.service_type) }}</span>
              <span>{{ p.item_count || p.items?.length || 0 }} 项</span>
              <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
              <span class="ops" @click.stop><button @click="openParameter(p)">编辑</button><button @click="removeParameter(p.id)">删除</button></span>
            </div>
          </div>
        </div>
        <aside class="panel item-panel">
          <div class="item-head">
            <div>
              <h3>{{ selectedParameter?.name || '参数项' }}</h3>
              <p>{{ selectedParameter ? '维护该参数配置下可供前端选择的参数项。' : '先选择左侧参数配置。' }}</p>
            </div>
            <button class="btn primary" :disabled="!selectedParameter" @click="openParameterItem()">新增参数项</button>
          </div>
          <div v-if="!selectedParameter" class="empty">请选择一个参数配置</div>
          <div v-else class="item-list">
            <div v-for="item in parameterItems" :key="item.id" class="item-row">
              <div>
                <strong>{{ item.label }}</strong>
                <span>{{ item.type }} · {{ item.value }}</span>
              </div>
              <div class="ops"><button @click="openParameterItem(item)">编辑</button><button @click="removeParameterItem(item.id)">删除</button></div>
            </div>
            <div v-if="!parameterItems.length" class="empty">暂无参数项</div>
          </div>
        </aside>
      </section>

      <section v-else-if="tab === 'users'" class="panel">
        <div class="table user-table">
          <div class="tr th"><span>用户</span><span>ID</span><span>账号</span><span>角色</span><span>状态</span></div>
          <div v-for="u in users" :key="u.id" :class="['tr', { selected: selectedUserId === u.id }]" @click="selectUser(u.id)">
            <span><strong>{{ u.name }}</strong></span>
            <span class="mono">{{ u.id }}</span>
            <span>{{ u.account || u.email || '-' }}</span>
            <span>{{ u.role || 'user' }}</span>
            <span><b :class="u.is_active ? 'ok' : 'muted'">{{ u.is_active ? '启用' : '停用' }}</b></span>
          </div>
        </div>
      </section>

      <section v-else class="panel">
        <div class="toolbar">
          <label>用户
            <select v-model="selectedUserId" @change="loadUserProviders">
              <option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option>
            </select>
          </label>
          <p>这里保存用户自己的供应商地址和密钥。生成时会按用户供应商读取 `Base URL/API Key`。</p>
        </div>
        <div class="table user-provider-table">
          <div class="tr th"><span>用户</span><span>供应商</span><span>Base URL</span><span>API Key</span><span>状态</span><span>操作</span></div>
          <div v-for="p in userProviders" :key="p.id" class="tr">
            <span class="mono">{{ p.user_id }}</span>
            <span>{{ p.name }}</span>
            <span class="mono truncate">{{ p.base_url }}</span>
            <span class="mono">{{ p.api_key }}</span>
            <span><b :class="p.is_active ? 'ok' : 'muted'">{{ p.is_active ? '启用' : '停用' }}</b></span>
            <span class="ops"><button @click="removeUserProvider(p.id)">删除</button></span>
          </div>
          <div v-if="!userProviders.length" class="empty">当前用户还没有配置供应商</div>
        </div>
      </section>
    </main>

    <div v-if="dialog" class="overlay" @click.self="closeDialog">
      <form class="drawer" @submit.prevent="saveDialog">
        <header class="drawer-head">
          <h2>{{ dialogTitle }}</h2>
          <button type="button" class="icon-btn" @click="closeDialog">×</button>
        </header>

        <template v-if="dialog === 'provider'">
          <label>供应商名称<input v-model="providerForm.name" required /></label>
          <label>Key<input v-model="providerForm.provider" placeholder="openai / apimart / gemini" /></label>
          <label>图标 URL<input v-model="providerForm.icon" placeholder="https://..." /></label>
          <label>官网<input v-model="providerForm.website" placeholder="https://..." /></label>
          <label>说明<textarea v-model="providerForm.description" rows="3" /></label>
          <div class="form-grid">
            <label>排序<input v-model.number="providerForm.rank" type="number" /></label>
            <label>类型<select v-model="providerForm.service_type"><option value="all">全部</option><option v-for="s in serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option></select></label>
          </div>
          <label class="check"><input v-model="providerForm.support_open_ai" type="checkbox" /> OpenAI 兼容接口</label>
          <label class="check"><input v-model="providerForm.is_third_party" type="checkbox" /> 第三方供应商</label>
          <label class="check"><input v-model="providerForm.is_active" type="checkbox" /> 启用</label>
        </template>

        <template v-else-if="dialog === 'model'">
          <label>模型名称<input v-model="modelForm.name" required /></label>
          <label>模型 ID<input v-model="modelForm.model_id" required /></label>
          <div class="form-grid">
            <label>类型<select v-model="modelForm.service_type"><option v-for="s in serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option></select></label>
            <label>供应商<select v-model.number="modelForm.provider_id" required @change="syncProviderKey"><option :value="0">请选择</option><option v-for="p in sortedProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option></select></label>
          </div>
          <label>参数配置<select v-model.number="modelForm.parameter_profile_id"><option :value="0">不绑定</option><option v-for="p in parametersByType(modelForm.service_type)" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
          <label>说明<textarea v-model="modelForm.description" rows="3" /></label>
          <div class="form-grid">
            <label>创建端点<input v-model="modelForm.endpoint" placeholder="可选，例如 /images/generations" /></label>
            <label>查询端点<input v-model="modelForm.query_endpoint" placeholder="可选，例如 /tasks/{id}" /></label>
          </div>
          <div class="form-grid">
            <label>默认比例<input v-model="modelForm.default_aspect_ratio" placeholder="1:1" /></label>
            <label>默认分辨率<input v-model="modelForm.default_resolution" placeholder="1024x1024" /></label>
          </div>
          <div class="form-grid">
            <label>成本<input v-model.number="modelForm.cost" type="number" step="0.01" /></label>
            <label>排序<input v-model.number="modelForm.priority" type="number" /></label>
          </div>
          <label class="check"><input v-model="modelForm.supports_image_input" type="checkbox" /> 支持参考图</label>
          <label class="check"><input v-model="modelForm.supports_video" type="checkbox" /> 支持视频</label>
          <label class="check"><input v-model="modelForm.is_default" type="checkbox" /> 设为默认模型</label>
          <label class="check"><input v-model="modelForm.is_active" type="checkbox" /> 启用</label>
        </template>

        <template v-else-if="dialog === 'parameter'">
          <label>名称<input v-model="parameterForm.name" required /></label>
          <label>Key<input v-model="parameterForm.key" required /></label>
          <label>模型类型<select v-model="parameterForm.service_type"><option v-for="s in serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option></select></label>
          <label>说明<textarea v-model="parameterForm.description" rows="3" /></label>
          <label class="check"><input v-model="parameterForm.is_builtin" type="checkbox" /> 内置配置</label>
          <label class="check"><input v-model="parameterForm.is_active" type="checkbox" /> 启用</label>
        </template>

        <template v-else-if="dialog === 'parameterItem'">
          <label>参数类型<select v-model="parameterItemForm.type" required><option v-for="t in parameterTypes" :key="t" :value="t">{{ t }}</option></select></label>
          <label>显示名称<input v-model="parameterItemForm.label" required placeholder="例如 1:1 / 高清 / 5 秒" /></label>
          <label>参数值<input v-model="parameterItemForm.value" required placeholder="例如 1:1 / 1080p / 5" /></label>
          <label>排序<input v-model.number="parameterItemForm.rank" type="number" /></label>
        </template>

        <template v-else-if="dialog === 'user'">
          <label>用户 ID<input v-model="userForm.id" required /></label>
          <label>名称<input v-model="userForm.name" required /></label>
          <label>Email<input v-model="userForm.email" /></label>
        </template>

        <template v-else-if="dialog === 'connect'">
          <label>用户<select v-model="selectedUserId"><option v-for="u in users" :key="u.id" :value="u.id">{{ u.name }} ({{ u.id }})</option></select></label>
          <label>公共供应商<select v-model.number="connectForm.provider_id" required><option :value="0">请选择</option><option v-for="p in sortedProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option></select></label>
          <label>Base URL<input v-model="connectForm.base_url" required placeholder="https://api.example.com" /></label>
          <label>API Key<input v-model="connectForm.api_key" type="password" required /></label>
        </template>

        <div class="drawer-actions">
          <button type="button" class="btn ghost" @click="closeDialog">取消</button>
          <button class="btn primary" type="submit">保存</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { Building2, Cpu, KeyRound, SlidersHorizontal, Users } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { aiModelAPI, getAuthUser } from '~/composables/useApi'

definePageMeta({ layout: false })

const tab = ref('providers')
watch(tab, async (value) => {
  if (value === 'userProviders') await loadUserProviders()
  if (value === 'parameters') await loadParameterItems()
})
const tabs = [
  { id: 'providers', label: '模型供应商', desc: '公共供应商模板，只维护名称、Key、官网、排序等元数据，不保存 Base URL 和 API Key。', icon: Building2 },
  { id: 'models', label: '模型配置', desc: '公共模型模板，绑定供应商和参数配置，用户连接供应商后复制成自己的可用模型。', icon: Cpu },
  { id: 'parameters', label: '模型参数配置', desc: '按配置档和参数项维护前端可选参数，不需要手写 JSON。', icon: SlidersHorizontal },
  { id: 'users', label: '用户管理', desc: '维护系统用户，用于绑定用户自己的供应商配置。', icon: Users },
  { id: 'userProviders', label: '用户供应商', desc: '用户选择公共供应商后，在这里保存自己的 Base URL 和 API Key。', icon: KeyRound },
]
const currentTab = computed(() => tabs.find(t => t.id === tab.value) || tabs[0])
const serviceTypes = [
  { label: '文本', value: 'text' },
  { label: '图片', value: 'image' },
  { label: '视频', value: 'video' },
  { label: '音频', value: 'audio' },
]
const parameterTypes = [
  'ASPECT_RATIO',
  'RESOLUTION',
  'DURATION',
  'COUNT',
  'MODE',
  'METHOD',
  'MULTI_SHOT',
  'OFFICIAL_FALLBACK',
  'GOOGLE_SEARCH',
  'GOOGLE_IMAGE_SEARCH',
  'IMAGE_URLS',
]

const providers = ref([])
const models = ref([])
const parameters = ref([])
const users = ref([])
const userProviders = ref([])
const parameterItems = ref([])
const selectedUserId = ref(getAuthUser()?.id || 'default')
const selectedParameterId = ref(null)
const dialog = ref('')
const editId = ref(null)

const sortedProviders = computed(() => [...providers.value].sort((a, b) => (a.rank || 0) - (b.rank || 0) || (a.display_name || a.name).localeCompare(b.display_name || b.name)))
const selectedParameter = computed(() => parameters.value.find(p => p.id === selectedParameterId.value) || null)

const providerForm = reactive({
  name: '',
  provider: '',
  service_type: 'all',
  icon: '',
  website: '',
  description: '',
  rank: 0,
  support_open_ai: false,
  is_third_party: false,
  is_active: true,
})
const modelForm = reactive({
  name: '',
  model_id: '',
  service_type: 'image',
  provider_id: 0,
  provider: '',
  parameter_profile_id: 0,
  description: '',
  endpoint: '',
  query_endpoint: '',
  default_aspect_ratio: '',
  default_resolution: '',
  supports_image_input: false,
  supports_video: false,
  cost: 0,
  priority: 0,
  is_default: false,
  is_active: true,
})
const parameterForm = reactive({ key: '', name: '', service_type: 'image', description: '', is_builtin: false, is_active: true })
const parameterItemForm = reactive({ type: 'ASPECT_RATIO', label: '', value: '', rank: 0 })
const userForm = reactive({ id: '', name: '', email: '' })
const connectForm = reactive({ provider_id: 0, base_url: '', api_key: '' })

const dialogTitle = computed(() => ({
  provider: editId.value ? '编辑供应商' : '新增供应商',
  model: editId.value ? '编辑模型' : '新增模型',
  parameter: editId.value ? '编辑参数配置' : '新增参数配置',
  parameterItem: editId.value ? '编辑参数项' : '新增参数项',
  user: '新增用户',
  connect: '新增用户供应商',
}[dialog.value] || '编辑'))

function serviceLabel(type) {
  return serviceTypes.find(s => s.value === type)?.label || type
}

function parametersByType(type) {
  return parameters.value.filter(p => p.service_type === type && p.is_active)
}

async function loadAll() {
  const [p, m, params, us] = await Promise.all([
    aiModelAPI.adminProviders(),
    aiModelAPI.adminModels({ active: 0 }),
    aiModelAPI.adminParameters(),
    aiModelAPI.users(),
  ])
  providers.value = p
  models.value = m
  parameters.value = params
  users.value = us
  const authUserId = getAuthUser()?.id
  if (authUserId && users.value.find(u => u.id === authUserId)) {
    selectedUserId.value = authUserId
  } else if (!users.value.find(u => u.id === selectedUserId.value)) {
    selectedUserId.value = users.value[0]?.id || 'default'
  }
  if (!selectedParameterId.value && parameters.value[0]) selectedParameterId.value = parameters.value[0].id
  await Promise.all([loadUserProviders(), loadParameterItems()])
}

async function loadUserProviders() {
  userProviders.value = await aiModelAPI.adminUserProviders(selectedUserId.value)
}

async function loadParameterItems() {
  if (!selectedParameterId.value) {
    parameterItems.value = []
    return
  }
  parameterItems.value = await aiModelAPI.parameterItems(selectedParameterId.value)
}

function openProvider(row) {
  editId.value = row?.id || null
  Object.assign(providerForm, {
    name: row?.name || '',
    provider: row?.key || row?.provider || '',
    service_type: row?.service_type || 'all',
    icon: row?.icon || '',
    website: row?.website || '',
    description: row?.description || '',
    rank: row?.rank || 0,
    support_open_ai: row?.support_open_ai ?? false,
    is_third_party: row?.is_third_party ?? false,
    is_active: row?.is_active ?? true,
  })
  dialog.value = 'provider'
}

function openModel(row) {
  editId.value = row?.id || null
  const defaults = row?.defaults || {}
  const capabilities = row?.capabilities || {}
  Object.assign(modelForm, {
    name: row?.name || '',
    model_id: row?.model_id || '',
    service_type: row?.service_type || 'image',
    provider_id: row?.provider_id || row?.provider?.id || 0,
    provider: row?.provider?.key || row?.provider || '',
    parameter_profile_id: row?.parameter_profile_id || row?.parameter_profile?.id || 0,
    description: row?.description || '',
    endpoint: row?.endpoint || '',
    query_endpoint: row?.query_endpoint || '',
    default_aspect_ratio: defaults.aspect_ratio || defaults.aspectRatio || '',
    default_resolution: defaults.resolution || '',
    supports_image_input: Boolean(capabilities.image_input || capabilities.imageInput || capabilities.reference_images),
    supports_video: Boolean(capabilities.video),
    cost: row?.cost || 0,
    priority: row?.priority || 0,
    is_default: row?.is_default ?? false,
    is_active: row?.is_active ?? true,
  })
  dialog.value = 'model'
}

function openParameter(row) {
  editId.value = row?.id || null
  Object.assign(parameterForm, {
    key: row?.key || '',
    name: row?.name || '',
    service_type: row?.service_type || 'image',
    description: row?.description || '',
    is_builtin: row?.is_builtin ?? false,
    is_active: row?.is_active ?? true,
  })
  dialog.value = 'parameter'
}

function openParameterItem(row) {
  if (!selectedParameter.value) return
  editId.value = row?.id || null
  Object.assign(parameterItemForm, {
    type: row?.type || 'ASPECT_RATIO',
    label: row?.label || '',
    value: row?.value || '',
    rank: row?.rank || 0,
  })
  dialog.value = 'parameterItem'
}

function openUser() {
  editId.value = null
  Object.assign(userForm, { id: '', name: '', email: '' })
  dialog.value = 'user'
}

function openConnectProvider() {
  editId.value = null
  Object.assign(connectForm, { provider_id: 0, base_url: '', api_key: '' })
  dialog.value = 'connect'
}

function closeDialog() {
  dialog.value = ''
  editId.value = null
}

function syncProviderKey() {
  const provider = providers.value.find(p => p.id === modelForm.provider_id)
  modelForm.provider = provider?.key || ''
}

function modelPayload() {
  syncProviderKey()
  return {
    name: modelForm.name,
    model_id: modelForm.model_id,
    service_type: modelForm.service_type,
    provider_id: modelForm.provider_id || null,
    provider: modelForm.provider,
    parameter_profile_id: modelForm.parameter_profile_id || null,
    description: modelForm.description,
    endpoint: modelForm.endpoint,
    query_endpoint: modelForm.query_endpoint,
    defaults: {
      aspect_ratio: modelForm.default_aspect_ratio || undefined,
      resolution: modelForm.default_resolution || undefined,
    },
    capabilities: {
      image_input: modelForm.supports_image_input,
      video: modelForm.supports_video,
    },
    cost: modelForm.cost,
    priority: modelForm.priority,
    is_default: modelForm.is_default,
    is_active: modelForm.is_active,
  }
}

async function saveDialog() {
  try {
    if (dialog.value === 'provider') {
      const payload = { ...providerForm }
      if (editId.value) await aiModelAPI.updateAdminProvider(editId.value, payload)
      else await aiModelAPI.createAdminProvider(payload)
    } else if (dialog.value === 'model') {
      if (editId.value) await aiModelAPI.updateAdminModel(editId.value, modelPayload())
      else await aiModelAPI.createAdminModel(modelPayload())
    } else if (dialog.value === 'parameter') {
      const payload = { ...parameterForm }
      if (editId.value) await aiModelAPI.updateAdminParameter(editId.value, payload)
      else {
        const created = await aiModelAPI.createAdminParameter(payload)
        selectedParameterId.value = created.id
      }
    } else if (dialog.value === 'parameterItem') {
      const payload = { ...parameterItemForm }
      if (editId.value) await aiModelAPI.updateParameterItem(editId.value, payload)
      else await aiModelAPI.createParameterItem(selectedParameterId.value, payload)
    } else if (dialog.value === 'user') {
      await aiModelAPI.createUser(userForm)
    } else if (dialog.value === 'connect') {
      const res = await aiModelAPI.connectUserProvider(connectForm, selectedUserId.value)
      toast.success(`已保存用户供应商，复制 ${res.copied || 0} 个模型`)
    }
    closeDialog()
    await loadAll()
    toast.success('已保存')
  } catch (error) {
    toast.error(error.message || '保存失败')
  }
}

async function removeProvider(id) {
  if (!confirm('确定删除供应商？')) return
  await aiModelAPI.deleteAdminProvider(id)
  await loadAll()
}

async function removeModel(id) {
  if (!confirm('确定删除模型？')) return
  await aiModelAPI.deleteAdminModel(id)
  await loadAll()
}

async function removeParameter(id) {
  if (!confirm('确定删除参数配置？')) return
  await aiModelAPI.deleteAdminParameter(id)
  if (selectedParameterId.value === id) selectedParameterId.value = null
  await loadAll()
}

async function removeParameterItem(id) {
  if (!confirm('确定删除参数项？')) return
  await aiModelAPI.deleteParameterItem(id)
  await loadParameterItems()
  await loadAll()
}

async function removeUserProvider(id) {
  if (!confirm('确定删除用户供应商？相关用户模型会停用。')) return
  await aiModelAPI.deleteUserProvider(id)
  await loadUserProviders()
  await loadAll()
}

async function seedFromConfigs() {
  const res = await aiModelAPI.seedFromConfigs()
  await loadAll()
  toast.success(`已导入 ${res.created || 0} 个模型`)
}

async function selectUser(id) {
  selectedUserId.value = id
  await loadUserProviders()
}

async function selectParameter(profile) {
  selectedParameterId.value = profile.id
  await loadParameterItems()
}

onMounted(loadAll)
</script>

<style scoped>
.admin-shell { min-height: 100vh; display: flex; background: #f6f7f9; color: #16181d; font-size: 13px; }
.admin-sidebar { width: 224px; flex-shrink: 0; background: #fff; border-right: 1px solid #e8ebf0; padding: 18px 12px; }
.brand { display: flex; align-items: center; gap: 10px; padding: 4px 8px 18px; }
.brand-mark { width: 34px; height: 34px; border-radius: 9px; background: #111827; color: #fff; display: grid; place-items: center; font-weight: 800; }
.brand strong { display: block; font-size: 15px; }
.brand span { display: block; color: #8a9099; font-size: 11px; margin-top: 2px; }
.nav-list { display: flex; flex-direction: column; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 9px; width: 100%; border: 0; border-radius: 8px; padding: 10px 11px; background: transparent; color: #5d6571; cursor: pointer; text-align: left; font-size: 13px; }
.nav-item:hover { background: #f3f5f8; color: #111827; }
.nav-item.active { background: #eaf2ff; color: #0a66d8; font-weight: 700; }
.admin-main { flex: 1; min-width: 0; padding: 26px 30px; overflow: auto; }
.page-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; margin-bottom: 18px; }
.kicker { color: #8a9099; font-size: 11px; letter-spacing: .12em; font-weight: 800; }
h1 { margin: 5px 0 4px; font-size: 24px; line-height: 1.2; }
p { margin: 0; color: #68707c; line-height: 1.6; }
.head-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.btn { border: 1px solid #d9dee7; background: #fff; color: #2e3440; border-radius: 8px; padding: 8px 12px; cursor: pointer; font: inherit; }
.btn.primary { background: #0a84ff; border-color: #0a84ff; color: #fff; }
.btn.ghost:hover { background: #f7f8fa; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.panel { background: #fff; border: 1px solid #e8ebf0; border-radius: 10px; overflow: hidden; }
.table { width: 100%; }
.tr { display: grid; align-items: center; gap: 12px; min-height: 54px; padding: 11px 14px; border-top: 1px solid #edf0f4; }
.tr:first-child { border-top: 0; }
.tr.th { min-height: 38px; background: #fafbfc; color: #8a9099; font-size: 11px; font-weight: 800; text-transform: uppercase; }
.tr.selected { background: #f7fbff; }
.provider-table .tr { grid-template-columns: 1.3fr .8fr 1.2fr .7fr .45fr .5fr .65fr; }
.model-table .tr { grid-template-columns: 1.4fr .55fr 1fr 1fr .7fr .5fr .65fr; }
.profile-table .tr { grid-template-columns: 1.3fr .8fr .55fr .5fr .5fr .65fr; cursor: pointer; }
.user-table .tr { grid-template-columns: 1.2fr 1fr 1.3fr .55fr .5fr; cursor: pointer; }
.user-provider-table .tr { grid-template-columns: .8fr 1fr 1.6fr .7fr .5fr .5fr; }
.name-cell { display: flex; align-items: center; gap: 9px; min-width: 0; }
.icon-img { width: 26px; height: 26px; border-radius: 7px; object-fit: cover; background: #f0f2f5; }
strong { display: block; font-weight: 700; color: #171a20; }
em { display: block; margin-top: 3px; color: #8a9099; font-style: normal; font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; }
.truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ok { color: #16a34a; }
.muted { color: #9aa1ab; }
.ops { display: flex; gap: 8px; }
.ops button { border: 0; background: transparent; color: #0a66d8; cursor: pointer; padding: 0; font: inherit; }
.toolbar { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 14px; border-bottom: 1px solid #edf0f4; }
.toolbar label { max-width: 320px; }
.parameter-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 14px; align-items: start; }
.item-panel { padding: 14px; }
.item-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 12px; }
h3 { margin: 0 0 4px; font-size: 15px; }
.item-list { display: flex; flex-direction: column; gap: 8px; }
.item-row { display: flex; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid #edf0f4; border-radius: 8px; }
.item-row span { display: block; margin-top: 3px; color: #68707c; font-size: 12px; }
.empty { padding: 18px; color: #8a9099; text-align: center; }
.overlay { position: fixed; inset: 0; z-index: 1000; display: flex; justify-content: flex-end; background: rgba(17, 24, 39, .36); }
.drawer { width: min(540px, 100vw); height: 100vh; overflow: auto; background: #fff; padding: 20px; display: flex; flex-direction: column; gap: 13px; box-shadow: -18px 0 45px rgba(15, 23, 42, .18); }
.drawer-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
.drawer h2 { margin: 0; font-size: 19px; }
.icon-btn { width: 30px; height: 30px; border: 0; border-radius: 8px; background: #f1f3f6; cursor: pointer; font-size: 20px; line-height: 1; }
label { display: flex; flex-direction: column; gap: 6px; color: #555e6b; font-size: 12px; font-weight: 600; }
input, textarea, select { width: 100%; border: 1px solid #d9dee7; background: #fff; color: #171a20; border-radius: 8px; padding: 9px 10px; font: inherit; outline: none; }
input:focus, textarea:focus, select:focus { border-color: #0a84ff; box-shadow: 0 0 0 3px rgba(10, 132, 255, .12); }
textarea { resize: vertical; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.check { flex-direction: row; align-items: center; font-weight: 500; }
.check input { width: auto; }
.drawer-actions { display: flex; justify-content: flex-end; gap: 8px; padding-top: 8px; margin-top: auto; }
@media (max-width: 980px) {
  .admin-shell { flex-direction: column; }
  .admin-sidebar { width: 100%; padding: 10px; border-right: 0; border-bottom: 1px solid #e8ebf0; }
  .brand { display: none; }
  .nav-list { flex-direction: row; overflow-x: auto; }
  .nav-item { width: auto; white-space: nowrap; }
  .admin-main { padding: 18px 14px; }
  .page-head, .toolbar { flex-direction: column; align-items: stretch; }
  .parameter-layout { grid-template-columns: 1fr; }
  .provider-table .tr, .model-table .tr, .profile-table .tr, .user-table .tr, .user-provider-table .tr { grid-template-columns: 1fr; }
}
</style>
