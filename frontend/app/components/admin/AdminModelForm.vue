<template>
  <template v-if="admin.dialog === 'model'">
    <label>模型名称<input v-model="admin.modelForm.name" required /></label>
    <label>模型 ID<input v-model="admin.modelForm.model_id" required /></label>
    <div class="form-grid">
      <label>类型
        <select v-model="admin.modelForm.service_type" @change="admin.changeModelServiceType">
          <option v-for="s in admin.serviceTypes" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label>供应商
        <select v-model.number="admin.modelForm.provider_id" required @change="admin.syncProviderKey">
          <option :value="0">请选择</option>
          <option v-for="p in admin.sortedProviders" :key="p.id" :value="p.id">{{ p.display_name || p.name }}</option>
        </select>
      </label>
    </div>
    <div class="parameter-bind">
      <div class="search-select" @focusout="handleProfileBlur">
        <label for="model-parameter-profile">参数配置</label>
        <div class="search-select-control" :class="{ open: profileOpen }">
          <input
            id="model-parameter-profile"
            v-model="profileSearchText"
            type="search"
            autocomplete="off"
            placeholder="选择参数配置档（可选，输入名称 / Key / 说明搜索）"
            @focus="profileOpen = true"
            @input="handleProfileInput"
          />
          <button
            v-if="admin.modelForm.parameter_profile_id"
            type="button"
            class="search-select-clear"
            aria-label="清除参数配置"
            @mousedown.prevent
            @click="selectProfile(0)"
          >×</button>
        </div>
        <div v-if="profileOpen" class="search-select-menu">
          <button
            type="button"
            class="search-select-option"
            :class="{ selected: !admin.modelForm.parameter_profile_id }"
            @mousedown.prevent
            @click="selectProfile(0)"
          >
            <strong>不绑定</strong>
          </button>
          <button
            v-for="p in admin.filteredModelParameters"
            :key="p.id"
            type="button"
            class="search-select-option"
            :class="{ selected: admin.modelForm.parameter_profile_id === p.id }"
            @mousedown.prevent
            @click="selectProfile(p.id)"
          >
            <strong>{{ p.name }}</strong>
            <span>{{ p.key }}<template v-if="parameterCount(p)">（{{ parameterCount(p) }}项）</template></span>
          </button>
          <div v-if="!admin.filteredModelParameters.length" class="search-select-empty">没有匹配的参数配置</div>
        </div>
      </div>
    </div>
    <label>说明<textarea v-model="admin.modelForm.description" rows="3" /></label>
    <div class="form-grid">
      <label>创建端点<input v-model="admin.modelForm.endpoint" placeholder="可选，例如 /images/generations" /></label>
      <label>查询端点<input v-model="admin.modelForm.query_endpoint" placeholder="可选，例如 /tasks/{id}" /></label>
    </div>
    <div class="form-grid">
      <label>默认比例<input v-model="admin.modelForm.default_aspect_ratio" placeholder="1:1" /></label>
      <label>默认分辨率<input v-model="admin.modelForm.default_resolution" placeholder="1024x1024" /></label>
    </div>
    <div class="form-grid">
      <label>成本<input v-model.number="admin.modelForm.cost" type="number" step="0.01" /></label>
      <label>排序<input v-model.number="admin.modelForm.priority" type="number" /></label>
    </div>
    <div class="check-grid">
      <label class="check"><input v-model="admin.modelForm.is_free" type="checkbox" /> 免费使用该模型</label>
      <label class="check"><input v-model="admin.modelForm.member_only" type="checkbox" /> 仅付费会员可用</label>
      <label v-if="admin.modelForm.service_type === 'image'" class="check"><input v-model="admin.modelForm.supports_image_input" type="checkbox" /> 支持参考图</label>
      <label v-if="admin.modelForm.service_type === 'video'" class="check"><input v-model="admin.modelForm.supports_video" type="checkbox" /> 支持视频</label>
      <label class="check"><input v-model="admin.modelForm.is_default" type="checkbox" /> 设为默认模型</label>
      <label class="check"><input v-model="admin.modelForm.is_active" type="checkbox" /> 启用</label>
    </div>
    <section v-if="admin.modelForm.service_type === 'image'" class="credit-editor">
      <div class="credit-editor-head">
        <strong>图片分辨率积分</strong>
        <span>从绑定参数配置的 SAMPLE_IMAGE_SIZE / RESOLUTION 项自动生成</span>
      </div>
      <div v-if="admin.modelImageResolutionCredits.length" class="credit-rows">
        <div v-for="row in admin.modelImageResolutionCredits" :key="row.value" class="credit-row">
          <div>
            <strong>{{ row.label }}</strong>
            <span>{{ row.value }}</span>
          </div>
          <label>积分<input v-model.number="row.credits" type="number" min="0" step="1" /></label>
        </div>
      </div>
      <div v-else class="empty compact-empty">绑定图片参数配置后，会自动读取 SAMPLE_IMAGE_SIZE / RESOLUTION 选项。</div>
    </section>
    <section v-if="admin.modelForm.service_type === 'video'" class="credit-editor">
      <div class="credit-editor-head">
        <strong>视频分辨率每秒积分</strong>
        <span>从绑定参数配置的 RESOLUTION 项自动生成</span>
      </div>
      <div v-if="admin.modelVideoResolutionCredits.length" class="credit-rows">
        <div v-for="row in admin.modelVideoResolutionCredits" :key="row.value" class="credit-row">
          <div>
            <strong>{{ row.label }}</strong>
            <span>{{ row.value }}</span>
          </div>
          <label>每秒积分<input v-model.number="row.credits" type="number" min="0" step="1" /></label>
        </div>
      </div>
      <div v-else class="empty compact-empty">绑定视频参数配置后，会自动读取分辨率选项。</div>
    </section>
  </template>
</template>

<script setup lang="ts">
const props = defineProps<{ admin: any }>()

const profileOpen = ref(false)
const profileSearchText = ref('')

const selectedProfile = computed(() => {
  return props.admin.parametersByType(props.admin.modelForm.service_type)
    .find((item: any) => item.id === props.admin.modelForm.parameter_profile_id)
})

const selectedProfileLabel = computed(() => {
  return selectedProfile.value ? `${selectedProfile.value.name}（${selectedProfile.value.key}）` : ''
})

function parameterCount(profile: any) {
  return Number(profile?.item_count || profile?.items?.length || profile?.parameters?.length || 0)
}

async function selectProfile(id: number) {
  props.admin.modelForm.parameter_profile_id = Number(id || 0)
  props.admin.modelParameterKeyword = ''
  profileSearchText.value = id ? selectedProfileLabel.value : ''
  profileOpen.value = false
  await props.admin.changeModelParameterProfile()
}

function handleProfileInput() {
  props.admin.modelParameterKeyword = profileSearchText.value
  profileOpen.value = true
}

function handleProfileBlur(event: FocusEvent) {
  const current = event.currentTarget as HTMLElement
  const next = event.relatedTarget as Node | null
  if (!next || !current.contains(next)) profileOpen.value = false
}

watch(selectedProfileLabel, (label) => {
  props.admin.modelParameterKeyword = ''
  profileSearchText.value = label
}, { immediate: true })
</script>
