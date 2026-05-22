<template>
  <div v-if="checkedAdmin" class="admin-shell">
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
          <button v-if="tab !== 'paymentConfigs'" class="btn ghost" @click="admin.seedFromConfigs">从旧配置导入</button>
          <button v-if="tab === 'providers'" class="btn primary" @click="admin.openProvider()">新增供应商</button>
          <button v-if="tab === 'models'" class="btn primary" @click="admin.openModel()">新增模型</button>
          <button v-if="tab === 'parameters'" class="btn primary" @click="admin.openParameter()">新增参数配置</button>
          <button v-if="tab === 'users'" class="btn primary" @click="admin.openUser()">新增用户</button>
          <button v-if="tab === 'userProviders'" class="btn primary" @click="admin.openConnectProvider()">新增供应商密钥</button>
          <button v-if="tab === 'membershipPlans'" class="btn primary" @click="admin.openMembership()">新增会员套餐</button>
          <button v-if="tab === 'creditPackages'" class="btn primary" @click="admin.openCreditPackage()">新增积分充值包</button>
          <button v-if="tab === 'orders'" class="btn primary" @click="admin.openOrder()">新增订单</button>
        </div>
      </header>

      <AdminProviders
        v-if="tab === 'providers'"
        :providers="admin.providers"
        :filters="admin.providerFilters"
        :pagination="admin.providerPagination"
        :total-pages="admin.providerTotalPages"
        :loading="admin.providerLoading"
        :service-types="admin.serviceTypes"
        @apply="admin.applyProviderFilters"
        @reset="admin.resetProviderFilters"
        @page="admin.goProviderPage"
        @page-size="admin.changeProviderPageSize"
        @edit="admin.openProvider"
        @delete="admin.removeProvider"
      />

      <AdminModels
        v-else-if="tab === 'models'"
        :models="admin.models"
        :filters="admin.modelFilters"
        :pagination="admin.modelPagination"
        :total-pages="admin.modelTotalPages"
        :loading="admin.modelLoading"
        :service-types="admin.serviceTypes"
        :sorted-providers="admin.sortedProviders"
        :service-label="admin.serviceLabel"
        @apply="admin.applyModelFilters"
        @reset="admin.resetModelFilters"
        @page="admin.goModelPage"
        @page-size="admin.changeModelPageSize"
        @edit="admin.openModel"
        @delete="admin.removeModel"
      />

      <AdminParameters
        v-else-if="tab === 'parameters'"
        :parameters="admin.parameters"
        :filters="admin.parameterFilters"
        :pagination="admin.parameterPagination"
        :total-pages="admin.parameterTotalPages"
        :loading="admin.parameterLoading"
        :service-types="admin.serviceTypes"
        :service-label="admin.serviceLabel"
        @apply="admin.applyParameterFilters"
        @reset="admin.resetParameterFilters"
        @page="admin.goParameterPage"
        @page-size="admin.changeParameterPageSize"
        @edit="admin.openParameter"
        @delete="admin.removeParameter"
        @items="admin.openParameterItems"
      />

      <AdminUsers
        v-else-if="tab === 'users'"
        :users="admin.users"
        :filters="admin.userFilters"
        :pagination="admin.userPagination"
        :total-pages="admin.userTotalPages"
        :loading="admin.userLoading"
        :selected-user-id="admin.selectedUserId"
        @apply="admin.applyUserFilters"
        @reset="admin.resetUserFilters"
        @page="admin.goUserPage"
        @page-size="admin.changeUserPageSize"
        @select="admin.selectUser"
        @edit="admin.openUser"
        @delete="admin.removeUser"
      />

      <AdminUserProviders
        v-else-if="tab === 'userProviders'"
        :user-providers="admin.userProviders"
        :filters="admin.userProviderFilters"
        :pagination="admin.userProviderPagination"
        :total-pages="admin.userProviderTotalPages"
        :loading="admin.userProviderLoading"
        :user-options="admin.userOptions"
        :sorted-providers="admin.sortedProviders"
        @apply="admin.applyUserProviderFilters"
        @reset="admin.resetUserProviderFilters"
        @page="admin.goUserProviderPage"
        @page-size="admin.changeUserProviderPageSize"
        @edit="admin.openConnectProvider"
        @delete="admin.removeUserProvider"
      />

      <AdminMembershipPlans
        v-else-if="tab === 'membershipPlans'"
        :plans="admin.membershipPlans"
        :filters="admin.membershipFilters"
        :pagination="admin.membershipPagination"
        :total-pages="admin.membershipTotalPages"
        :loading="admin.membershipLoading"
        @apply="admin.applyMembershipFilters"
        @reset="admin.resetMembershipFilters"
        @page="admin.goMembershipPage"
        @page-size="admin.changeMembershipPageSize"
        @edit="admin.openMembership"
        @delete="admin.removeMembership"
      />

      <AdminCreditPackages
        v-else-if="tab === 'creditPackages'"
        :packages="admin.creditPackages"
        :filters="admin.creditPackageFilters"
        :pagination="admin.creditPackagePagination"
        :total-pages="admin.creditPackageTotalPages"
        :loading="admin.creditPackageLoading"
        @apply="admin.applyCreditPackageFilters"
        @reset="admin.resetCreditPackageFilters"
        @page="admin.goCreditPackagePage"
        @page-size="admin.changeCreditPackagePageSize"
        @edit="admin.openCreditPackage"
        @delete="admin.removeCreditPackage"
      />

      <AdminOrders
        v-else-if="tab === 'orders'"
        :orders="admin.orders"
        :filters="admin.orderFilters"
        :pagination="admin.orderPagination"
        :total-pages="admin.orderTotalPages"
        :loading="admin.orderLoading"
        :user-options="admin.userOptions"
        @apply="admin.applyOrderFilters"
        @reset="admin.resetOrderFilters"
        @page="admin.goOrderPage"
        @page-size="admin.changeOrderPageSize"
        @edit="admin.openOrder"
        @delete="admin.removeOrder"
      />

      <AdminPaymentConfigs
        v-else-if="tab === 'paymentConfigs'"
        :configs="admin.paymentConfigs"
        :loading="admin.paymentConfigLoading"
        @apply="admin.loadPaymentConfigs"
      />

      <AdminSystemSettings v-else :admin="admin" />
    </main>

    <AdminDialog :admin="admin" />
    <AdminParameterItemsDialog :admin="admin" />
  </div>
  <div v-else class="admin-checking">正在校验管理员身份...</div>
</template>

<script setup>
import { BadgeDollarSign, Building2, Cpu, CreditCard, KeyRound, Package, ReceiptText, Settings, SlidersHorizontal, Users } from 'lucide-vue-next'
import { useAdminManagement } from '~/composables/admin/useAdminManagement'
import { authAPI, clearAuthSession, getAuthUser } from '~/composables/useApi'

definePageMeta({ layout: false })

const admin = reactive(useAdminManagement())
const tab = ref('providers')
const tabs = [
  { id: 'providers', label: '模型供应商', desc: '公共供应商模板，只维护名称、Key、官网、排序等元数据，不保存 Base URL 和 API Key。', icon: Building2 },
  { id: 'models', label: '模型配置', desc: '公共模型模板，绑定供应商和参数配置，用户连接供应商后复制成自己的可用模型。', icon: Cpu },
  { id: 'parameters', label: '模型参数配置', desc: '按配置档和参数项维护前端可选参数，不需要手写 JSON。', icon: SlidersHorizontal },
  { id: 'users', label: '用户管理', desc: '维护系统用户，用于绑定用户自己的供应商配置。', icon: Users },
  { id: 'userProviders', label: '供应商密钥', desc: '平台密钥用于无自有 API 的用户扣积分消费；用户密钥用于有自有 API 的用户直接调用。', icon: KeyRound },
  { id: 'membershipPlans', label: '会员套餐', desc: '配置会员价格、赠送积分、有效期和上下架状态。', icon: BadgeDollarSign },
  { id: 'creditPackages', label: '积分充值包', desc: '配置积分包价格、基础积分、赠送积分和展示排序。', icon: Package },
  { id: 'orders', label: '订单管理', desc: '查询和维护会员、积分订单及支付状态。', icon: ReceiptText },
  { id: 'paymentConfigs', label: '支付配置', desc: '维护微信、支付宝、通联等支付渠道参数。', icon: CreditCard },
  { id: 'systemSettings', label: '系统设置', desc: '配置网站信息、品牌图片、用户默认头像和 OSS 文件存储。', icon: Settings },
]
const currentTab = computed(() => tabs.find(t => t.id === tab.value) || tabs[0])
const checkedAdmin = ref(false)

async function ensureAdmin() {
  const cached = getAuthUser()
  if (!cached || cached.role !== 'admin') {
    await navigateTo(`/admin-login?redirect=${encodeURIComponent('/admin')}`)
    return false
  }
  try {
    await authAPI.adminMe()
    checkedAdmin.value = true
    return true
  } catch {
    clearAuthSession()
    await navigateTo(`/admin-login?redirect=${encodeURIComponent('/admin')}`)
    return false
  }
}

watch(tab, async (value) => {
  if (value === 'userProviders') await admin.loadUserProviders()
  if (value === 'parameters') await admin.loadParameters()
  if (value === 'providers') await admin.loadProviders()
  if (value === 'users') await admin.loadUsers()
  if (value === 'membershipPlans') await admin.loadMembershipPlans()
  if (value === 'creditPackages') await admin.loadCreditPackages()
  if (value === 'orders') await admin.loadOrders()
  if (value === 'paymentConfigs') await admin.loadPaymentConfigs()
  if (value === 'systemSettings') await admin.loadSystemSettings()
})

onMounted(async () => {
  if (await ensureAdmin()) await admin.loadAll()
})
</script>

<style src="~/assets/styles/admin.css"></style>
