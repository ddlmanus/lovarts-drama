import { toast } from 'vue-sonner'
import { adminCommerceAPI, adminSystemAPI, aiModelAPI, getAuthUser, uploadAPI } from '~/composables/useApi'

export function useAdminManagement() {
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

  const providers = ref<any[]>([])
  const providerOptions = ref<any[]>([])
  const models = ref<any[]>([])
  const parameters = ref<any[]>([])
  const parameterOptions = ref<any[]>([])
  const users = ref<any[]>([])
  const userOptions = ref<any[]>([])
  const userProviders = ref<any[]>([])
  const parameterItems = ref<any[]>([])
  const membershipPlans = ref<any[]>([])
  const creditPackages = ref<any[]>([])
  const orders = ref<any[]>([])
  const paymentConfigs = ref<any[]>([])
  const systemSettingsLoading = ref(false)
  const systemSettingsSaving = ref(false)
  const systemAssetUploading = ref('')

  const providerLoading = ref(false)
  const modelLoading = ref(false)
  const parameterLoading = ref(false)
  const userLoading = ref(false)
  const userProviderLoading = ref(false)
  const membershipLoading = ref(false)
  const creditPackageLoading = ref(false)
  const orderLoading = ref(false)
  const paymentConfigLoading = ref(false)
  const modelParameterKeyword = ref('')
  const modelParameterItems = ref<any[]>([])
  const modelImageResolutionCredits = ref<Array<{ label: string, value: string, credits: number }>>([])
  const modelVideoResolutionCredits = ref<Array<{ label: string, value: string, credits: number }>>([])
  const modelImageCreditMap = ref<Record<string, number>>({})
  const modelVideoCreditMap = ref<Record<string, number>>({})

  const providerFilters = reactive({ keyword: '', service_type: '', active: '' })
  const modelFilters = reactive({ keyword: '', service_type: '', provider: '', active: '' })
  const parameterFilters = reactive({ keyword: '', service_type: '', active: '' })
  const userFilters = reactive({ keyword: '', role: '', active: '' })
  const userProviderFilters = reactive({ keyword: '', user_id: '', provider: '', active: '' })
  const membershipFilters = reactive({ keyword: '', active: '' })
  const creditPackageFilters = reactive({ keyword: '', active: '' })
  const orderFilters = reactive({ keyword: '', user_id: '', type: '', status: '' })
  const paymentConfigFilters = reactive({ keyword: '', provider: '', active: '' })

  const providerPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const modelPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const parameterPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const userPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const userProviderPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const membershipPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const creditPackagePagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const orderPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })
  const paymentConfigPagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })

  const itemDrawer = ref(false)
  const selectedUserId = ref(getAuthUser()?.id || 'default')
  const selectedParameterId = ref<number | null>(null)
  const dialog = ref('')
  const editId = ref<string | number | null>(null)

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
    is_free: false,
    member_only: false,
    priority: 0,
    is_default: false,
    is_active: true,
  })
  const parameterForm = reactive({ key: '', name: '', service_type: 'image', description: '', is_builtin: false, is_active: true })
  const parameterItemForm = reactive({ type: 'ASPECT_RATIO', label: '', value: '', rank: 0 })
  const userForm = reactive({ id: '', name: '', account: '', phone: '', email: '', credits: 0, membership_plan_id: 0, membership_status: 'none', membership_expires_at: '', role: 'user', is_active: true })
  const connectForm = reactive({ user_id: '', provider_id: 0, name: '', base_url: '', api_key: '', is_active: true })
  const membershipForm = reactive({
    name: '',
    code: '',
    description: '',
    plan_type: 'creator',
    billing_cycle: 'yearly',
    price: 0,
    original_price: 0,
    credits: 0,
    duration_days: 365,
    badge: '',
    subtitle: '',
    unit: '年',
    sub_text: '',
    generation: '',
    dropdown: '',
    tone: '',
    seats: 2,
    total: 0,
    team_credits_line: '',
    seat_gift_text: '',
    activity_text: '',
    feature_default_text: '',
    feature_efficiency_text: '',
    feature_management_text: '',
    feature_security_text: '',
    feature_exclusive_text: '',
    sort_order: 0,
    is_active: true,
  })
  const creditPackageForm = reactive({ name: '', code: '', description: '', price: 0, credits: 0, bonus_credits: 0, sort_order: 0, is_active: true })
  const orderForm = reactive({ order_no: '', user_id: '', type: 'credit', item_id: 0, item_name: '', amount: 0, credits: 0, status: 'pending', payment_provider: '', payment_channel: '', transaction_id: '', paid_at: '' })
  const paymentConfigForm = reactive({ provider: 'wechat', name: '', app_id: '', merchant_id: '', api_key: '', api_secret: '', notify_url: '', return_url: '', config_text: '', is_default: false, is_active: true })
  const systemSettingsForm = reactive({
    site_name: '',
    site_title: '',
    site_description: '',
    site_keywords: '',
    site_logo_url: '',
    default_avatar_url: '',
    storage_driver: 'local',
    oss_region: '',
    oss_bucket: '',
    oss_endpoint: '',
    oss_access_key_id: '',
    oss_access_key_secret: '',
    oss_public_base_url: '',
  })

  const sortedProviders = computed(() => [...providerOptions.value].sort((a, b) => (a.rank || 0) - (b.rank || 0) || (a.display_name || a.name).localeCompare(b.display_name || b.name)))
  const selectedParameter = computed(() => [...parameters.value, ...parameterOptions.value].find(p => p.id === selectedParameterId.value) || null)
  const filteredModelParameters = computed(() => {
    const keyword = modelParameterKeyword.value.trim().toLowerCase()
    return parametersByType(modelForm.service_type).filter((item) => {
      if (!keyword) return true
      return [item.name, item.key, item.description].some(value => String(value || '').toLowerCase().includes(keyword))
    })
  })
  const providerTotalPages = computed(() => totalPages(providerPagination))
  const modelTotalPages = computed(() => totalPages(modelPagination))
  const parameterTotalPages = computed(() => totalPages(parameterPagination))
  const userTotalPages = computed(() => totalPages(userPagination))
  const userProviderTotalPages = computed(() => totalPages(userProviderPagination))
  const membershipTotalPages = computed(() => totalPages(membershipPagination))
  const creditPackageTotalPages = computed(() => totalPages(creditPackagePagination))
  const orderTotalPages = computed(() => totalPages(orderPagination))
  const paymentConfigTotalPages = computed(() => totalPages(paymentConfigPagination))

  const dialogTitle = computed(() => ({
    provider: editId.value ? '编辑供应商' : '新增供应商',
    model: editId.value ? '编辑模型' : '新增模型',
    parameter: editId.value ? '编辑参数配置' : '新增参数配置',
    parameterItem: editId.value ? '编辑参数项' : '新增参数项',
    user: editId.value ? '编辑用户' : '新增用户',
    connect: editId.value ? '编辑供应商密钥' : '新增供应商密钥',
    membership: editId.value ? '编辑会员套餐' : '新增会员套餐',
    creditPackage: editId.value ? '编辑积分充值包' : '新增积分充值包',
    order: editId.value ? '编辑订单' : '新增订单',
    paymentConfig: editId.value ? '编辑支付配置' : '新增支付配置',
  }[dialog.value] || '编辑'))

  function totalPages(pagination: { total_pages?: number, total?: number, page_size?: number }) {
    return Math.max(1, pagination.total_pages || Math.ceil((pagination.total || 0) / (pagination.page_size || 20)))
  }

  function serviceLabel(type: string) {
    return serviceTypes.find(s => s.value === type)?.label || type
  }

  function parametersByType(type: string) {
    return parameterOptions.value.filter(p => p.service_type === type && p.is_active)
  }

  function normalizeCreditMap(value: any) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).map(([key, amount]) => [key, Number(amount) || 0]))
  }

  function isBillableResolutionItem(item: any, serviceType: string) {
    const type = String(item?.type || '').toUpperCase()
    if (serviceType === 'image') return type === 'SAMPLE_IMAGE_SIZE' || type === 'RESOLUTION'
    return type === 'RESOLUTION'
  }

  function resolutionRowsFromItems(items: any[], creditMap: Record<string, number>, serviceType: string) {
    return items
      .filter(item => isBillableResolutionItem(item, serviceType))
      .sort((a, b) => Number(a.rank || 0) - Number(b.rank || 0) || String(a.label || '').localeCompare(String(b.label || '')))
      .map(item => ({
        label: item.label || item.value,
        value: item.value,
        credits: Number(creditMap[item.value] ?? 0),
      }))
  }

  function creditRowsToMap(rows: Array<{ value: string, credits: number }>) {
    return Object.fromEntries(rows.filter(row => row.value).map(row => [row.value, Number(row.credits) || 0]))
  }

  function billingRulesToCreditMap(rules: any[], serviceType: string) {
    const wantedTypes = serviceType === 'image' ? ['SAMPLE_IMAGE_SIZE', 'RESOLUTION'] : ['RESOLUTION']
    return Object.fromEntries(
      (Array.isArray(rules) ? rules : [])
        .filter(rule => wantedTypes.includes(String(rule.parameter_type || rule.parameterType || '').toUpperCase()))
        .map(rule => [rule.parameter_value || rule.parameterValue, Number(rule.credits || 0)]),
    )
  }

  async function refreshModelParameterItems() {
    if (!modelForm.parameter_profile_id) {
      modelParameterItems.value = []
      modelImageResolutionCredits.value = []
      modelVideoResolutionCredits.value = []
      return
    }
    const rows = await aiModelAPI.parameterItems(modelForm.parameter_profile_id)
    modelParameterItems.value = Array.isArray(rows) ? rows : (rows.items || rows.list || [])
    const resolutionRows = resolutionRowsFromItems(
      modelParameterItems.value,
      modelForm.service_type === 'video' ? modelVideoCreditMap.value : modelImageCreditMap.value,
      modelForm.service_type,
    )
    modelImageResolutionCredits.value = modelForm.service_type === 'image' ? resolutionRows : []
    modelVideoResolutionCredits.value = modelForm.service_type === 'video' ? resolutionRows : []
  }

  async function changeModelServiceType() {
    const matched = parametersByType(modelForm.service_type).some(item => item.id === modelForm.parameter_profile_id)
    if (!matched) modelForm.parameter_profile_id = 0
    modelParameterKeyword.value = ''
    await refreshModelParameterItems()
  }

  async function changeModelParameterProfile() {
    await refreshModelParameterItems()
  }

  function applyPagedResult(res: any, target: Ref<any[]>, paginationState: any) {
    const items = Array.isArray(res) ? res : (res.items || res.list || [])
    const pagination = Array.isArray(res) ? { page: 1, page_size: items.length || paginationState.page_size, total: items.length, total_pages: 1 } : (res.pagination || {})
    target.value = items
    Object.assign(paginationState, {
      page: Number(pagination.page || paginationState.page || 1),
      page_size: Number(pagination.page_size || pagination.pageSize || paginationState.page_size || 20),
      total: Number(pagination.total || items.length || 0),
      total_pages: Number(pagination.total_pages || pagination.totalPages || Math.max(1, Math.ceil(Number(pagination.total || items.length || 0) / Number(pagination.page_size || paginationState.page_size || 20)))),
    })
  }

  async function loadAll() {
    const [providerOptionRows, parameterOptionRows, userOptionRows] = await Promise.all([
      aiModelAPI.adminProviders({ all: 1 }),
      aiModelAPI.adminParameters({ all: 1 }),
      aiModelAPI.users({ all: 1 }),
    ])
    providerOptions.value = providerOptionRows
    parameterOptions.value = parameterOptionRows
    userOptions.value = userOptionRows
    const authUserId = getAuthUser()?.id
    if (authUserId && userOptions.value.find(u => u.id === authUserId)) selectedUserId.value = authUserId
    else if (!userOptions.value.find(u => u.id === selectedUserId.value)) selectedUserId.value = userOptions.value[0]?.id || 'default'
    if (!selectedParameterId.value && parameterOptions.value[0]) selectedParameterId.value = parameterOptions.value[0].id
    if (!userProviderFilters.user_id) userProviderFilters.user_id = selectedUserId.value
    await Promise.all([loadProviders(), loadModels(), loadParameters(), loadUsers(), loadUserProviders(), loadMembershipPlans(), loadCreditPackages(), loadOrders(), loadPaymentConfigs(), loadSystemSettings()])
  }

  async function loadProviders() {
    providerLoading.value = true
    try {
      applyPagedResult(await aiModelAPI.adminProviders({ ...providerFilters, page: providerPagination.page, page_size: providerPagination.page_size }), providers, providerPagination)
    } finally {
      providerLoading.value = false
    }
  }
  async function applyProviderFilters() { providerPagination.page = 1; await loadProviders() }
  async function resetProviderFilters() { Object.assign(providerFilters, { keyword: '', service_type: '', active: '' }); providerPagination.page = 1; await loadProviders() }
  async function goProviderPage(page: number) { providerPagination.page = Math.min(providerTotalPages.value, Math.max(1, page)); await loadProviders() }
  async function changeProviderPageSize() { providerPagination.page = 1; await loadProviders() }

  async function loadModels() {
    modelLoading.value = true
    try {
      applyPagedResult(await aiModelAPI.adminModels({ ...modelFilters, page: modelPagination.page, page_size: modelPagination.page_size }), models, modelPagination)
    } finally {
      modelLoading.value = false
    }
  }
  async function applyModelFilters() { modelPagination.page = 1; await loadModels() }
  async function resetModelFilters() { Object.assign(modelFilters, { keyword: '', service_type: '', provider: '', active: '' }); modelPagination.page = 1; await loadModels() }
  async function goModelPage(page: number) { modelPagination.page = Math.min(modelTotalPages.value, Math.max(1, page)); await loadModels() }
  async function changeModelPageSize() { modelPagination.page = 1; await loadModels() }

  async function loadParameters() {
    parameterLoading.value = true
    try {
      applyPagedResult(await aiModelAPI.adminParameters({ ...parameterFilters, page: parameterPagination.page, page_size: parameterPagination.page_size }), parameters, parameterPagination)
    } finally {
      parameterLoading.value = false
    }
  }
  async function applyParameterFilters() { parameterPagination.page = 1; await loadParameters() }
  async function resetParameterFilters() { Object.assign(parameterFilters, { keyword: '', service_type: '', active: '' }); parameterPagination.page = 1; await loadParameters() }
  async function goParameterPage(page: number) { parameterPagination.page = Math.min(parameterTotalPages.value, Math.max(1, page)); await loadParameters() }
  async function changeParameterPageSize() { parameterPagination.page = 1; await loadParameters() }

  async function loadUsers() {
    userLoading.value = true
    try {
      applyPagedResult(await aiModelAPI.users({ ...userFilters, page: userPagination.page, page_size: userPagination.page_size }), users, userPagination)
    } finally {
      userLoading.value = false
    }
  }
  async function applyUserFilters() { userPagination.page = 1; await loadUsers() }
  async function resetUserFilters() { Object.assign(userFilters, { keyword: '', role: '', active: '' }); userPagination.page = 1; await loadUsers() }
  async function goUserPage(page: number) { userPagination.page = Math.min(userTotalPages.value, Math.max(1, page)); await loadUsers() }
  async function changeUserPageSize() { userPagination.page = 1; await loadUsers() }
  async function loadUserOptions() { userOptions.value = await aiModelAPI.users({ all: 1 }) }

  async function loadUserProviders() {
    userProviderLoading.value = true
    try {
      applyPagedResult(await aiModelAPI.adminUserProviders({ ...userProviderFilters, page: userProviderPagination.page, page_size: userProviderPagination.page_size }), userProviders, userProviderPagination)
    } finally {
      userProviderLoading.value = false
    }
  }
  async function applyUserProviderFilters() { userProviderPagination.page = 1; await loadUserProviders() }
  async function resetUserProviderFilters() { Object.assign(userProviderFilters, { keyword: '', user_id: '', provider: '', active: '' }); userProviderPagination.page = 1; await loadUserProviders() }
  async function goUserProviderPage(page: number) { userProviderPagination.page = Math.min(userProviderTotalPages.value, Math.max(1, page)); await loadUserProviders() }
  async function changeUserProviderPageSize() { userProviderPagination.page = 1; await loadUserProviders() }

  async function loadMembershipPlans() {
    membershipLoading.value = true
    try {
      applyPagedResult(await adminCommerceAPI.membershipPlans({ ...membershipFilters, page: membershipPagination.page, page_size: membershipPagination.page_size }), membershipPlans, membershipPagination)
    } finally {
      membershipLoading.value = false
    }
  }
  async function applyMembershipFilters() { membershipPagination.page = 1; await loadMembershipPlans() }
  async function resetMembershipFilters() { Object.assign(membershipFilters, { keyword: '', active: '' }); membershipPagination.page = 1; await loadMembershipPlans() }
  async function goMembershipPage(page: number) { membershipPagination.page = Math.min(membershipTotalPages.value, Math.max(1, page)); await loadMembershipPlans() }
  async function changeMembershipPageSize() { membershipPagination.page = 1; await loadMembershipPlans() }

  async function loadCreditPackages() {
    creditPackageLoading.value = true
    try {
      applyPagedResult(await adminCommerceAPI.creditPackages({ ...creditPackageFilters, page: creditPackagePagination.page, page_size: creditPackagePagination.page_size }), creditPackages, creditPackagePagination)
    } finally {
      creditPackageLoading.value = false
    }
  }
  async function applyCreditPackageFilters() { creditPackagePagination.page = 1; await loadCreditPackages() }
  async function resetCreditPackageFilters() { Object.assign(creditPackageFilters, { keyword: '', active: '' }); creditPackagePagination.page = 1; await loadCreditPackages() }
  async function goCreditPackagePage(page: number) { creditPackagePagination.page = Math.min(creditPackageTotalPages.value, Math.max(1, page)); await loadCreditPackages() }
  async function changeCreditPackagePageSize() { creditPackagePagination.page = 1; await loadCreditPackages() }

  async function loadOrders() {
    orderLoading.value = true
    try {
      applyPagedResult(await adminCommerceAPI.orders({ ...orderFilters, page: orderPagination.page, page_size: orderPagination.page_size }), orders, orderPagination)
    } finally {
      orderLoading.value = false
    }
  }
  async function applyOrderFilters() { orderPagination.page = 1; await loadOrders() }
  async function resetOrderFilters() { Object.assign(orderFilters, { keyword: '', user_id: '', type: '', status: '' }); orderPagination.page = 1; await loadOrders() }
  async function goOrderPage(page: number) { orderPagination.page = Math.min(orderTotalPages.value, Math.max(1, page)); await loadOrders() }
  async function changeOrderPageSize() { orderPagination.page = 1; await loadOrders() }

  async function loadPaymentConfigs() {
    paymentConfigLoading.value = true
    try {
      applyPagedResult(await adminCommerceAPI.paymentConfigs({ ...paymentConfigFilters, page: paymentConfigPagination.page, page_size: paymentConfigPagination.page_size }), paymentConfigs, paymentConfigPagination)
    } finally {
      paymentConfigLoading.value = false
    }
  }
  async function applyPaymentConfigFilters() { paymentConfigPagination.page = 1; await loadPaymentConfigs() }
  async function resetPaymentConfigFilters() { Object.assign(paymentConfigFilters, { keyword: '', provider: '', active: '' }); paymentConfigPagination.page = 1; await loadPaymentConfigs() }
  async function goPaymentConfigPage(page: number) { paymentConfigPagination.page = Math.min(paymentConfigTotalPages.value, Math.max(1, page)); await loadPaymentConfigs() }
  async function changePaymentConfigPageSize() { paymentConfigPagination.page = 1; await loadPaymentConfigs() }

  async function loadSystemSettings() {
    systemSettingsLoading.value = true
    try {
      Object.assign(systemSettingsForm, await adminSystemAPI.settings())
      if (!systemSettingsForm.storage_driver) systemSettingsForm.storage_driver = 'local'
    } finally {
      systemSettingsLoading.value = false
    }
  }

  async function saveSystemSettings() {
    systemSettingsSaving.value = true
    try {
      Object.assign(systemSettingsForm, await adminSystemAPI.updateSettings({ ...systemSettingsForm }))
      if (!systemSettingsForm.storage_driver) systemSettingsForm.storage_driver = 'local'
      toast.success('系统设置已保存')
    } catch (error: any) {
      toast.error(error.message || '系统设置保存失败')
    } finally {
      systemSettingsSaving.value = false
    }
  }

  async function uploadSystemAsset(field: 'site_logo_url' | 'default_avatar_url', file?: File | null) {
    if (!file) return
    systemAssetUploading.value = field
    try {
      const result = await uploadAPI.image(file)
      systemSettingsForm[field] = result.url || `/${result.path}`
      toast.success('图片已上传')
    } catch (error: any) {
      toast.error(error.message || '图片上传失败')
    } finally {
      systemAssetUploading.value = ''
    }
  }

  async function loadParameterItems() {
    if (!selectedParameterId.value) {
      parameterItems.value = []
      return
    }
    parameterItems.value = await aiModelAPI.parameterItems(selectedParameterId.value)
  }

  function openProvider(row?: any) {
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

  async function openModel(row?: any) {
    editId.value = row?.id || null
    const defaults = row?.defaults || {}
    const capabilities = row?.capabilities || {}
    modelParameterKeyword.value = ''
    modelImageCreditMap.value = {
      ...billingRulesToCreditMap(row?.billing_rules, 'image'),
      ...normalizeCreditMap(row?.image_credit_by_resolution),
    }
    modelVideoCreditMap.value = {
      ...billingRulesToCreditMap(row?.billing_rules, 'video'),
      ...normalizeCreditMap(row?.video_credit_per_second_by_resolution),
    }
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
      is_free: row?.is_free ?? false,
      member_only: row?.member_only ?? false,
      priority: row?.priority || 0,
      is_default: row?.is_default ?? false,
      is_active: row?.is_active ?? true,
    })
    await refreshModelParameterItems()
    dialog.value = 'model'
  }

  function openParameter(row?: any) {
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

  function openParameterItem(row?: any) {
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

  async function openParameterItems(profile: any) {
    selectedParameterId.value = profile.id
    itemDrawer.value = true
    await loadParameterItems()
  }

  function closeItemDrawer() { itemDrawer.value = false }

  function openUser(row?: any) {
    editId.value = row?.id || null
    Object.assign(userForm, {
      id: row?.id || '',
      name: row?.name || '',
      account: row?.account || '',
      phone: row?.phone || '',
      email: row?.email || '',
      credits: row?.credits || 0,
      membership_plan_id: row?.membership_plan_id || 0,
      membership_status: row?.membership_status || 'none',
      membership_expires_at: row?.membership_expires_at || '',
      role: row?.role || 'user',
      is_active: row?.is_active ?? true,
    })
    dialog.value = 'user'
  }

  function openConnectProvider(row?: any) {
    editId.value = row?.id || null
    selectedUserId.value = row?.user_id || ''
    Object.assign(connectForm, {
      user_id: row?.user_id || '',
      provider_id: Number(row?.provider_id || 0),
      name: row?.name || '',
      base_url: row?.base_url || '',
      api_key: '',
      is_active: row?.is_active ?? true,
    })
    dialog.value = 'connect'
  }

  function openMembership(row?: any) {
    editId.value = row?.id || null
    const metadata = row?.metadata || {}
    const groups = Array.isArray(metadata.featureGroups || metadata.feature_groups) ? (metadata.featureGroups || metadata.feature_groups) : []
    const groupText = (title: string) => groups.find((group: any) => group.title === title)?.items?.join('\n') || ''
    const defaultGroup = groups.find((group: any) => !group.title || group.title === '')?.items?.join('\n') || ''
    Object.assign(membershipForm, {
      name: row?.name || '',
      code: row?.code || '',
      description: row?.description || '',
      plan_type: row?.plan_type || 'creator',
      billing_cycle: row?.billing_cycle || 'yearly',
      price: row?.price || 0,
      original_price: row?.original_price || 0,
      credits: row?.credits || 0,
      duration_days: row?.duration_days || 365,
      badge: row?.badge || '',
      subtitle: row?.subtitle || '',
      unit: metadata.unit || (row?.billing_cycle === 'monthly' ? '月' : '年'),
      sub_text: (metadata.sub || []).join('\n'),
      generation: metadata.generation || '',
      dropdown: metadata.dropdown || '',
      tone: metadata.tone || '',
      seats: metadata.seats || 2,
      total: metadata.total || 0,
      team_credits_line: metadata.teamCreditsLine || metadata.team_credits_line || '',
      seat_gift_text: (metadata.seatGift || metadata.seat_gift || []).join('\n'),
      activity_text: (metadata.activity || []).join('\n'),
      feature_default_text: defaultGroup,
      feature_efficiency_text: groupText('协作效率'),
      feature_management_text: groupText('管理'),
      feature_security_text: groupText('安全与其他'),
      feature_exclusive_text: groupText('独家功能'),
      sort_order: row?.sort_order || 0,
      is_active: row?.is_active ?? true,
    })
    dialog.value = 'membership'
  }

  function openCreditPackage(row?: any) {
    editId.value = row?.id || null
    Object.assign(creditPackageForm, {
      name: row?.name || '',
      code: row?.code || '',
      description: row?.description || '',
      price: row?.price || 0,
      credits: row?.credits || 0,
      bonus_credits: row?.bonus_credits || 0,
      sort_order: row?.sort_order || 0,
      is_active: row?.is_active ?? true,
    })
    dialog.value = 'creditPackage'
  }

  function openOrder(row?: any) {
    editId.value = row?.id || null
    Object.assign(orderForm, {
      order_no: row?.order_no || '',
      user_id: row?.user_id || selectedUserId.value || '',
      type: row?.type || 'credit',
      item_id: row?.item_id || 0,
      item_name: row?.item_name || '',
      amount: row?.amount || 0,
      credits: row?.credits || 0,
      status: row?.status || 'pending',
      payment_provider: row?.payment_provider || '',
      payment_channel: row?.payment_channel || '',
      transaction_id: row?.transaction_id || '',
      paid_at: row?.paid_at || '',
    })
    dialog.value = 'order'
  }

  function openPaymentConfig(row?: any) {
    editId.value = row?.id || null
    const provider = row?.provider || 'wechat'
    const defaultConfig = String(provider).startsWith('allinpay')
      ? { base_url: 'https://vsp.allinpay.com', org_id: '', version: '11', signtype: 'RSA' }
      : {}
    Object.assign(paymentConfigForm, {
      provider,
      name: row?.name || '',
      app_id: row?.app_id || '',
      merchant_id: row?.merchant_id || '',
      api_key: row?.api_key || '',
      api_secret: row?.api_secret || '',
      notify_url: row?.notify_url || '',
      return_url: row?.return_url || '',
      config_text: JSON.stringify(row?.config || defaultConfig, null, 2),
      is_default: row?.is_default ?? false,
      is_active: row?.is_active ?? true,
    })
    dialog.value = 'paymentConfig'
  }

  function closeDialog() {
    dialog.value = ''
    editId.value = null
    modelParameterKeyword.value = ''
    modelParameterItems.value = []
    modelImageResolutionCredits.value = []
    modelVideoResolutionCredits.value = []
    modelImageCreditMap.value = {}
    modelVideoCreditMap.value = {}
  }

  function syncProviderKey() {
    const provider = providerOptions.value.find(p => p.id === modelForm.provider_id)
    modelForm.provider = provider?.key || ''
  }

  function modelPayload() {
    syncProviderKey()
    const imageCreditByResolution = modelForm.service_type === 'image' ? creditRowsToMap(modelImageResolutionCredits.value) : {}
    const videoCreditPerSecondByResolution = modelForm.service_type === 'video' ? creditRowsToMap(modelVideoResolutionCredits.value) : {}
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
      is_free: modelForm.is_free,
      member_only: modelForm.member_only,
      image_credit_by_resolution: imageCreditByResolution,
      video_credit_per_second_by_resolution: videoCreditPerSecondByResolution,
      priority: modelForm.priority,
      is_default: modelForm.is_default,
      is_active: modelForm.is_active,
    }
  }

  function lines(value: string) {
    return String(value || '').split('\n').map(item => item.trim()).filter(Boolean)
  }

  function membershipPayload() {
    const activity = lines(membershipForm.activity_text)
    const metadata: Record<string, any> = {
      unit: membershipForm.unit,
      sub: lines(membershipForm.sub_text),
      generation: membershipForm.generation,
      dropdown: membershipForm.dropdown,
      tone: membershipForm.tone,
      activity,
    }
    if (membershipForm.plan_type === 'team') {
      metadata.seats = Number(membershipForm.seats || 0)
      metadata.total = Number(membershipForm.total || 0)
      metadata.teamCreditsLine = membershipForm.team_credits_line
      metadata.seatGift = lines(membershipForm.seat_gift_text)
      metadata.featureGroups = [
        { title: '限时活动', items: activity },
        { title: '协作效率', items: lines(membershipForm.feature_efficiency_text) },
        { title: '管理', items: lines(membershipForm.feature_management_text) },
        { title: '安全与其他', items: lines(membershipForm.feature_security_text) },
        { title: '独家功能', items: lines(membershipForm.feature_exclusive_text) },
      ].filter(group => group.items.length)
    } else {
      metadata.featureGroups = [
        { title: '限时活动', items: activity },
        { title: '', items: lines(membershipForm.feature_default_text) },
      ].filter(group => group.items.length)
    }
    return { ...membershipForm, metadata }
  }

  async function saveDialog() {
    try {
      if (dialog.value === 'provider') {
        if (editId.value) await aiModelAPI.updateAdminProvider(editId.value, { ...providerForm })
        else await aiModelAPI.createAdminProvider({ ...providerForm })
      } else if (dialog.value === 'model') {
        if (editId.value) await aiModelAPI.updateAdminModel(editId.value, modelPayload())
        else await aiModelAPI.createAdminModel(modelPayload())
      } else if (dialog.value === 'parameter') {
        if (editId.value) await aiModelAPI.updateAdminParameter(editId.value, { ...parameterForm })
        else {
          const created = await aiModelAPI.createAdminParameter({ ...parameterForm })
          selectedParameterId.value = created.id
        }
      } else if (dialog.value === 'parameterItem') {
        if (editId.value) await aiModelAPI.updateParameterItem(editId.value, { ...parameterItemForm })
        else await aiModelAPI.createParameterItem(selectedParameterId.value, { ...parameterItemForm })
      } else if (dialog.value === 'user') {
        if (editId.value) await aiModelAPI.updateUser(editId.value, userForm)
        else await aiModelAPI.createUser(userForm)
      } else if (dialog.value === 'connect') {
        const payload = {
          ...connectForm,
          user_id: connectForm.user_id || null,
          name: connectForm.name || undefined,
        }
        if (editId.value) await aiModelAPI.updateAdminUserProvider(Number(editId.value), payload)
        else await aiModelAPI.createAdminUserProvider(payload)
      } else if (dialog.value === 'membership') {
        const payload = membershipPayload()
        if (editId.value) await adminCommerceAPI.updateMembershipPlan(Number(editId.value), payload)
        else await adminCommerceAPI.createMembershipPlan(payload)
      } else if (dialog.value === 'creditPackage') {
        if (editId.value) await adminCommerceAPI.updateCreditPackage(Number(editId.value), creditPackageForm)
        else await adminCommerceAPI.createCreditPackage(creditPackageForm)
      } else if (dialog.value === 'order') {
        if (editId.value) await adminCommerceAPI.updateOrder(Number(editId.value), orderForm)
        else await adminCommerceAPI.createOrder(orderForm)
      } else if (dialog.value === 'paymentConfig') {
        let config = {}
        try { config = JSON.parse(paymentConfigForm.config_text || '{}') } catch { throw new Error('支付扩展配置 JSON 格式不正确') }
        const payload = { ...paymentConfigForm, config }
        if (editId.value) await adminCommerceAPI.updatePaymentConfig(Number(editId.value), payload)
        else await adminCommerceAPI.createPaymentConfig(payload)
      }
      const savedDialog = dialog.value
      closeDialog()
      if (savedDialog === 'provider') await refreshProviders()
      else if (savedDialog === 'model') await loadModels()
      else if (savedDialog === 'parameter') await refreshParameters()
      else if (savedDialog === 'parameterItem') await refreshParameterItems()
      else if (savedDialog === 'user') await refreshUsers()
      else if (savedDialog === 'connect') await loadUserProviders()
      else if (savedDialog === 'membership') await loadMembershipPlans()
      else if (savedDialog === 'creditPackage') await loadCreditPackages()
      else if (savedDialog === 'order') await loadOrders()
      else if (savedDialog === 'paymentConfig') await loadPaymentConfigs()
      else await loadAll()
      toast.success('已保存')
    } catch (error: any) {
      toast.error(error.message || '保存失败')
    }
  }

  async function removeProvider(id: number) {
    if (!confirm('确定删除供应商？')) return
    await aiModelAPI.deleteAdminProvider(id)
    if (providers.value.length === 1 && providerPagination.page > 1) providerPagination.page -= 1
    await refreshProviders()
  }

  async function removeModel(id: number) {
    if (!confirm('确定删除模型？')) return
    await aiModelAPI.deleteAdminModel(id)
    if (models.value.length === 1 && modelPagination.page > 1) modelPagination.page -= 1
    await loadModels()
  }

  async function removeUser(id: string) {
    if (!confirm('确定删除用户？相关用户供应商和用户模型也会删除。')) return
    await aiModelAPI.deleteUser(id)
    if (users.value.length === 1 && userPagination.page > 1) userPagination.page -= 1
    if (selectedUserId.value === id) selectedUserId.value = 'default'
    if (userProviderFilters.user_id === id) userProviderFilters.user_id = ''
    await Promise.all([refreshUsers(), loadUserProviders()])
  }

  async function removeParameter(id: number) {
    if (!confirm('确定删除参数配置？')) return
    await aiModelAPI.deleteAdminParameter(id)
    if (selectedParameterId.value === id) selectedParameterId.value = null
    if (parameters.value.length === 1 && parameterPagination.page > 1) parameterPagination.page -= 1
    await refreshParameters()
  }

  async function removeParameterItem(id: number) {
    if (!confirm('确定删除参数项？')) return
    await aiModelAPI.deleteParameterItem(id)
    await refreshParameterItems()
  }

  async function removeUserProvider(id: number) {
    if (!confirm('确定删除用户供应商？相关用户模型会停用。')) return
    await aiModelAPI.deleteUserProvider(id)
    if (userProviders.value.length === 1 && userProviderPagination.page > 1) userProviderPagination.page -= 1
    await loadUserProviders()
  }

  async function removeMembership(id: number) {
    if (!confirm('确定删除会员套餐？')) return
    await adminCommerceAPI.deleteMembershipPlan(id)
    if (membershipPlans.value.length === 1 && membershipPagination.page > 1) membershipPagination.page -= 1
    await loadMembershipPlans()
  }

  async function removeCreditPackage(id: number) {
    if (!confirm('确定删除积分充值包？')) return
    await adminCommerceAPI.deleteCreditPackage(id)
    if (creditPackages.value.length === 1 && creditPackagePagination.page > 1) creditPackagePagination.page -= 1
    await loadCreditPackages()
  }

  async function removeOrder(id: number) {
    if (!confirm('确定删除订单？')) return
    await adminCommerceAPI.deleteOrder(id)
    if (orders.value.length === 1 && orderPagination.page > 1) orderPagination.page -= 1
    await loadOrders()
  }

  async function removePaymentConfig(id: number) {
    if (!confirm('确定删除支付配置？')) return
    await adminCommerceAPI.deletePaymentConfig(id)
    if (paymentConfigs.value.length === 1 && paymentConfigPagination.page > 1) paymentConfigPagination.page -= 1
    await loadPaymentConfigs()
  }

  async function seedFromConfigs() {
    const res = await aiModelAPI.seedFromConfigs()
    await loadModels()
    toast.success(`已导入 ${res.created || 0} 个模型`)
  }

  async function selectUser(id: string) {
    selectedUserId.value = id
    userProviderFilters.user_id = id
    await applyUserProviderFilters()
  }

  async function refreshParameters() {
    const [optionRows] = await Promise.all([
      aiModelAPI.adminParameters({ all: 1 }),
      loadParameters(),
    ])
    parameterOptions.value = optionRows
  }

  async function refreshParameterItems() {
    await loadParameterItems()
    await refreshParameters()
  }

  async function refreshProviders() {
    const [optionRows] = await Promise.all([
      aiModelAPI.adminProviders({ all: 1 }),
      loadProviders(),
    ])
    providerOptions.value = optionRows
  }

  async function refreshUsers() {
    await Promise.all([loadUserOptions(), loadUsers()])
  }

  return {
    serviceTypes,
    parameterTypes,
    providers,
    providerOptions,
    models,
    parameters,
    parameterOptions,
    users,
    userOptions,
    userProviders,
    parameterItems,
    modelParameterKeyword,
    modelParameterItems,
    modelImageResolutionCredits,
    modelVideoResolutionCredits,
    membershipPlans,
    creditPackages,
    orders,
    paymentConfigs,
    systemSettingsForm,
    providerLoading,
    modelLoading,
    parameterLoading,
    userLoading,
    userProviderLoading,
    membershipLoading,
    creditPackageLoading,
    orderLoading,
    paymentConfigLoading,
    systemSettingsLoading,
    systemSettingsSaving,
    systemAssetUploading,
    providerFilters,
    modelFilters,
    parameterFilters,
    userFilters,
    userProviderFilters,
    membershipFilters,
    creditPackageFilters,
    orderFilters,
    paymentConfigFilters,
    providerPagination,
    modelPagination,
    parameterPagination,
    userPagination,
    userProviderPagination,
    membershipPagination,
    creditPackagePagination,
    orderPagination,
    paymentConfigPagination,
    itemDrawer,
    selectedUserId,
    selectedParameterId,
    dialog,
    editId,
    providerForm,
    modelForm,
    parameterForm,
    parameterItemForm,
    userForm,
    connectForm,
    membershipForm,
    creditPackageForm,
    orderForm,
    paymentConfigForm,
    sortedProviders,
    selectedParameter,
    filteredModelParameters,
    providerTotalPages,
    modelTotalPages,
    parameterTotalPages,
    userTotalPages,
    userProviderTotalPages,
    membershipTotalPages,
    creditPackageTotalPages,
    orderTotalPages,
    paymentConfigTotalPages,
    dialogTitle,
    serviceLabel,
    parametersByType,
    refreshModelParameterItems,
    changeModelServiceType,
    changeModelParameterProfile,
    loadAll,
    loadProviders,
    applyProviderFilters,
    resetProviderFilters,
    goProviderPage,
    changeProviderPageSize,
    loadModels,
    applyModelFilters,
    resetModelFilters,
    goModelPage,
    changeModelPageSize,
    loadParameters,
    applyParameterFilters,
    resetParameterFilters,
    goParameterPage,
    changeParameterPageSize,
    loadUsers,
    applyUserFilters,
    resetUserFilters,
    goUserPage,
    changeUserPageSize,
    loadUserProviders,
    applyUserProviderFilters,
    resetUserProviderFilters,
    goUserProviderPage,
    changeUserProviderPageSize,
    loadMembershipPlans,
    applyMembershipFilters,
    resetMembershipFilters,
    goMembershipPage,
    changeMembershipPageSize,
    loadCreditPackages,
    applyCreditPackageFilters,
    resetCreditPackageFilters,
    goCreditPackagePage,
    changeCreditPackagePageSize,
    loadOrders,
    applyOrderFilters,
    resetOrderFilters,
    goOrderPage,
    changeOrderPageSize,
    loadPaymentConfigs,
    applyPaymentConfigFilters,
    resetPaymentConfigFilters,
    goPaymentConfigPage,
    changePaymentConfigPageSize,
    loadSystemSettings,
    saveSystemSettings,
    uploadSystemAsset,
    openProvider,
    openModel,
    openParameter,
    openParameterItem,
    openParameterItems,
    closeItemDrawer,
    openUser,
    openConnectProvider,
    openMembership,
    openCreditPackage,
    openOrder,
    openPaymentConfig,
    closeDialog,
    syncProviderKey,
    saveDialog,
    removeProvider,
    removeModel,
    removeUser,
    removeParameter,
    removeParameterItem,
    removeUserProvider,
    removeMembership,
    removeCreditPackage,
    removeOrder,
    removePaymentConfig,
    seedFromConfigs,
    selectUser,
  }
}
