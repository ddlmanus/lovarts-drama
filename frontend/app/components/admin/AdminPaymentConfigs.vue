<template>
  <section class="panel payment-settings-panel">
    <div class="payment-tabs">
      <button
        v-for="item in paymentTabs"
        :key="item.key"
        type="button"
        :class="{ active: activeTab === item.key }"
        @click="activeTab = item.key"
      >
        {{ item.label }}
      </button>
    </div>

    <form class="payment-settings-form" @submit.prevent="saveActive">
      <div v-if="loading" class="empty">正在加载支付配置...</div>

      <div v-else-if="activeTab === 'alipay'" class="payment-config-card">
        <h3>支付宝支付配置</h3>
        <label class="switch-line"><input v-model="forms.alipay.enabled" type="checkbox" /> 启用</label>
        <label>模式
          <div class="segmented">
            <button type="button" :class="{ active: forms.alipay.mode === 'KEY' }" @click="forms.alipay.mode = 'KEY'">密钥模式</button>
            <button type="button" :class="{ active: forms.alipay.mode === 'CERT' }" @click="forms.alipay.mode = 'CERT'">证书模式</button>
          </div>
        </label>
        <label>APP_ID<input v-model="forms.alipay.app_id" /></label>
        <label>回调地址<input v-model="forms.alipay.notify_url" :placeholder="callbackUrl('alipay')" /></label>
        <label>网关<input v-model="forms.alipay.gateway" placeholder="https://openapi.alipay.com/gateway.do" /></label>
        <label>{{ forms.alipay.mode === 'CERT' ? '应用私钥（用于证书模式）' : '私钥' }}<textarea v-model="forms.alipay.private_key" rows="4" /></label>
        <template v-if="forms.alipay.mode === 'CERT'">
          <label>应用证书路径<input v-model="forms.alipay.app_cert_path" placeholder="/path/to/appCertPublicKey_*.crt" /></label>
          <label>支付宝公钥证书路径<input v-model="forms.alipay.public_cert_path" placeholder="/path/to/alipayCertPublicKey_RSA2.crt" /></label>
          <label>支付宝根证书路径<input v-model="forms.alipay.root_cert_path" placeholder="/path/to/alipayRootCert.crt" /></label>
        </template>
        <label v-else>支付宝公钥<textarea v-model="forms.alipay.public_key" rows="4" /></label>
        <label class="switch-line"><input v-model="forms.alipay.agreement_enabled" type="checkbox" /> 启用自动续费签约</label>
        <label>自动续费签约回调地址<input v-model="forms.alipay.agreement_notify_url" /></label>
        <label>自动续费签约完成跳转地址（可选）<input v-model="forms.alipay.agreement_return_url" /></label>
        <label>签约场景（可选）<input v-model="forms.alipay.agreement_sign_scene" placeholder="INDUSTRY|DIGITAL_MEDIA" /></label>
      </div>

      <div v-else-if="activeTab === 'wechat'" class="payment-config-card">
        <h3>微信支付配置</h3>
        <label class="switch-line"><input v-model="forms.wechat.enabled" type="checkbox" /> 启用</label>
        <label>APP_ID<input v-model="forms.wechat.app_id" /></label>
        <label>商户号<input v-model="forms.wechat.merchant_id" /></label>
        <label>商户Key（V2）/ APIv3 Key（V3）<input v-model="forms.wechat.api_key" type="password" /></label>
        <label>回调地址<input v-model="forms.wechat.notify_url" :placeholder="callbackUrl('wechat')" /></label>
        <label>证书序列号（可选，V3使用）<input v-model="forms.wechat.serial_no" /></label>
        <label>商户私钥（可选，V3使用）<textarea v-model="forms.wechat.private_key" rows="4" /></label>
        <label>平台公钥或平台证书内容/路径（可选，V3使用）<textarea v-model="forms.wechat.platform_public_key" rows="4" /></label>
        <label class="switch-line"><input v-model="forms.wechat.papay_enabled" type="checkbox" /> 启用自动续费代扣</label>
        <label>委托代扣计划模板ID<input v-model="forms.wechat.papay_plan_id" /></label>
        <label>委托代扣签约回调地址<input v-model="forms.wechat.papay_notify_url" /></label>
      </div>

      <div v-else-if="activeTab === 'zpay_wxpay'" class="payment-config-card">
        <h3>第三方微信支付（ZPAY / 易支付兼容）</h3>
        <label class="switch-line"><input v-model="forms.zpay_wxpay.enabled" type="checkbox" /> 启用</label>
        <label>接口地址（可选）<input v-model="forms.zpay_wxpay.base_url" placeholder="https://zpayz.cn" /></label>
        <label>商户ID（PID）<input v-model="forms.zpay_wxpay.pid" /></label>
        <label>商户密钥（PKEY）<input v-model="forms.zpay_wxpay.pkey" type="password" /></label>
        <label>支付渠道ID（可选，多渠道用逗号分隔）<input v-model="forms.zpay_wxpay.cid" placeholder="1234 或 1234,5678" /></label>
        <label>回调地址（notify_url）<input v-model="forms.zpay_wxpay.notify_url" :placeholder="callbackUrl('zpay')" /></label>
        <label>跳转地址（return_url，可选）<input v-model="forms.zpay_wxpay.return_url" /></label>
      </div>

      <div v-else-if="activeTab === 'allinpay'" class="payment-config-card">
        <h3>通联支付（收银宝）</h3>
        <label class="switch-line"><input v-model="forms.allinpay.enabled" type="checkbox" /> 启用</label>
        <label>接口域名<input v-model="forms.allinpay.base_url" placeholder="https://vsp.allinpay.com 或 https://syb-test.allinpay.com" /></label>
        <label>机构号（可选）<input v-model="forms.allinpay.org_id" /></label>
        <label>商户号（cusid）<input v-model="forms.allinpay.cusid" /></label>
        <label>应用ID（appid）<input v-model="forms.allinpay.appid" /></label>
        <label>默认版本号<input v-model="forms.allinpay.version" placeholder="默认 11；关单接口会自动使用 12" /></label>
        <label>签名方式
          <div class="segmented single"><button type="button" class="active">RSA</button></div>
        </label>
        <label>商户私钥<textarea v-model="forms.allinpay.private_key" rows="4" /></label>
        <label>通联公钥<textarea v-model="forms.allinpay.public_key" rows="4" /></label>
        <label>回调地址（后续统一支付可复用）<input v-model="forms.allinpay.notify_url" :placeholder="callbackUrl('allinpay')" /></label>
      </div>

      <div v-else class="payment-config-card">
        <h3>线下支付配置</h3>
        <label class="switch-line"><input v-model="forms.offline.enabled" type="checkbox" /> 启用</label>
        <label>收款人<input v-model="forms.offline.account_name" /></label>
        <label>收款账号<input v-model="forms.offline.account_no" /></label>
        <label>收款二维码<input v-model="forms.offline.qr_code_url" placeholder="请填写或上传收款二维码地址" /></label>
        <label>支付说明<textarea v-model="forms.offline.instruction" rows="3" /></label>
      </div>

      <div class="payment-actions">
        <button class="btn primary" :disabled="saving || loading" type="submit">{{ saving ? '保存中...' : '保存支付配置' }}</button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { toast } from 'vue-sonner'
import { adminCommerceAPI } from '~/composables/useApi'

const props = defineProps({ configs: { type: Array, default: () => [] }, loading: { type: Boolean, default: false } })
const emit = defineEmits(['apply'])

const activeTab = ref('alipay')
const saving = ref(false)
const paymentTabs = [
  { key: 'alipay', label: '支付宝支付' },
  { key: 'wechat', label: '微信支付' },
  { key: 'zpay_wxpay', label: '第三方微信支付' },
  { key: 'allinpay', label: '通联支付' },
  { key: 'offline', label: '线下支付' },
]

const forms = reactive({
  alipay: { enabled: false, mode: 'KEY', app_id: '', notify_url: '', gateway: 'https://openapi.alipay.com/gateway.do', private_key: '', public_key: '', app_cert_path: '', public_cert_path: '', root_cert_path: '', agreement_enabled: false, agreement_notify_url: '', agreement_return_url: '', agreement_sign_scene: '' },
  wechat: { enabled: false, app_id: '', merchant_id: '', api_key: '', notify_url: '', serial_no: '', private_key: '', platform_public_key: '', papay_enabled: false, papay_plan_id: '', papay_notify_url: '' },
  zpay_wxpay: { enabled: false, base_url: 'https://zpayz.cn', pid: '', pkey: '', cid: '', notify_url: '', return_url: '' },
  allinpay: { enabled: false, base_url: 'https://vsp.allinpay.com', org_id: '', cusid: '', appid: '', version: '11', signtype: 'RSA', private_key: '', public_key: '', notify_url: '' },
  offline: { enabled: false, account_name: '', account_no: '', qr_code_url: '', instruction: '请线下转账后联系管理员审核。' },
})

const configByProvider = computed(() => Object.fromEntries((props.configs || []).map(item => [item.provider, item])))

watch(() => props.configs, hydrateForms, { deep: true, immediate: true })

function callbackUrl(channel) {
  if (typeof window === 'undefined') return ''
  return `${window.location.origin}/api/payments/callback/${channel}`
}

function hydrateForms() {
  hydrateAlipay(configByProvider.value.alipay)
  hydrateWechat(configByProvider.value.wechat)
  hydrateZpay(configByProvider.value.zpay_wxpay)
  hydrateAllinpay(configByProvider.value.allinpay || configByProvider.value.allinpay_wxpay || configByProvider.value.allinpay_alipay)
  hydrateOffline(configByProvider.value.offline)
}

function keepSecret(value, fallback) {
  return value && value !== '********' ? value : (fallback || '')
}

function hydrateAlipay(row) {
  if (!row) return
  const extra = row.config || {}
  Object.assign(forms.alipay, {
    enabled: Boolean(row.is_active),
    mode: extra.mode || extra.alipayMode || 'KEY',
    app_id: row.app_id || '',
    notify_url: row.notify_url || '',
    gateway: extra.gateway || 'https://openapi.alipay.com/gateway.do',
    private_key: keepSecret(row.api_secret, forms.alipay.private_key),
    public_key: keepSecret(row.api_key, forms.alipay.public_key),
    app_cert_path: extra.app_cert_path || '',
    public_cert_path: extra.public_cert_path || '',
    root_cert_path: extra.root_cert_path || '',
    agreement_enabled: Boolean(extra.agreement_enabled),
    agreement_notify_url: extra.agreement_notify_url || '',
    agreement_return_url: extra.agreement_return_url || '',
    agreement_sign_scene: extra.agreement_sign_scene || '',
  })
}

function hydrateWechat(row) {
  if (!row) return
  const extra = row.config || {}
  Object.assign(forms.wechat, {
    enabled: Boolean(row.is_active),
    app_id: row.app_id || '',
    merchant_id: row.merchant_id || '',
    api_key: keepSecret(row.api_secret || row.api_key, forms.wechat.api_key),
    notify_url: row.notify_url || '',
    serial_no: extra.serial_no || '',
    private_key: extra.private_key || '',
    platform_public_key: extra.platform_public_key || '',
    papay_enabled: Boolean(extra.papay_enabled),
    papay_plan_id: extra.papay_plan_id || '',
    papay_notify_url: extra.papay_notify_url || '',
  })
}

function hydrateZpay(row) {
  if (!row) return
  const extra = row.config || {}
  Object.assign(forms.zpay_wxpay, {
    enabled: Boolean(row.is_active),
    base_url: extra.base_url || 'https://zpayz.cn',
    pid: row.merchant_id || extra.pid || '',
    pkey: keepSecret(row.api_secret || row.api_key, forms.zpay_wxpay.pkey),
    cid: extra.cid || '',
    notify_url: row.notify_url || extra.notify_url || '',
    return_url: row.return_url || extra.return_url || '',
  })
}

function hydrateAllinpay(row) {
  if (!row) return
  const extra = row.config || {}
  Object.assign(forms.allinpay, {
    enabled: Boolean(row.is_active),
    base_url: extra.base_url || extra.baseUrl || 'https://vsp.allinpay.com',
    org_id: extra.org_id || extra.orgid || '',
    cusid: row.merchant_id || extra.cusid || '',
    appid: row.app_id || extra.appid || '',
    version: extra.version || '11',
    signtype: extra.signtype || 'RSA',
    private_key: keepSecret(row.api_secret, forms.allinpay.private_key),
    public_key: keepSecret(row.api_key, forms.allinpay.public_key),
    notify_url: row.notify_url || extra.notify_url || '',
  })
}

function hydrateOffline(row) {
  if (!row) return
  const extra = row.config || {}
  Object.assign(forms.offline, {
    enabled: Boolean(row.is_active),
    account_name: extra.offline_account_name || '',
    account_no: extra.offline_account_no || '',
    qr_code_url: extra.offline_qr_code_url || row.notify_url || '',
    instruction: extra.offline_instruction || '请线下转账后联系管理员审核。',
  })
}

function payloadFor(provider) {
  if (provider === 'alipay') {
    const f = forms.alipay
    return {
      provider, name: '支付宝支付', app_id: f.app_id, merchant_id: '', api_key: f.public_key, api_secret: f.private_key,
      notify_url: f.notify_url || callbackUrl('alipay'), return_url: '',
      config: { mode: f.mode, gateway: f.gateway, app_cert_path: f.app_cert_path, public_cert_path: f.public_cert_path, root_cert_path: f.root_cert_path, agreement_enabled: f.agreement_enabled, agreement_notify_url: f.agreement_notify_url, agreement_return_url: f.agreement_return_url, agreement_sign_scene: f.agreement_sign_scene },
      is_default: false, is_active: f.enabled,
    }
  }
  if (provider === 'wechat') {
    const f = forms.wechat
    return {
      provider, name: '微信支付', app_id: f.app_id, merchant_id: f.merchant_id, api_key: f.api_key, api_secret: f.api_key,
      notify_url: f.notify_url || callbackUrl('wechat'), return_url: '',
      config: { serial_no: f.serial_no, private_key: f.private_key, platform_public_key: f.platform_public_key, papay_enabled: f.papay_enabled, papay_plan_id: f.papay_plan_id, papay_notify_url: f.papay_notify_url },
      is_default: false, is_active: f.enabled,
    }
  }
  if (provider === 'zpay_wxpay') {
    const f = forms.zpay_wxpay
    return {
      provider, name: '第三方微信支付', app_id: '', merchant_id: f.pid, api_key: f.pkey, api_secret: f.pkey,
      notify_url: f.notify_url || callbackUrl('zpay'), return_url: f.return_url,
      config: { base_url: f.base_url, pid: f.pid, pkey: f.pkey, cid: f.cid, notify_url: f.notify_url || callbackUrl('zpay'), return_url: f.return_url },
      is_default: false, is_active: f.enabled,
    }
  }
  if (provider === 'allinpay') {
    const f = forms.allinpay
    return {
      provider, name: '通联支付', app_id: f.appid, merchant_id: f.cusid, api_key: f.public_key, api_secret: f.private_key,
      notify_url: f.notify_url || callbackUrl('allinpay'), return_url: '',
      config: { base_url: f.base_url, org_id: f.org_id, version: f.version || '11', signtype: 'RSA', notify_url: f.notify_url || callbackUrl('allinpay') },
      is_default: false, is_active: f.enabled,
    }
  }
  const f = forms.offline
  return {
    provider: 'offline', name: '线下支付', app_id: '', merchant_id: '', api_key: '', api_secret: '',
    notify_url: f.qr_code_url, return_url: '',
    config: { offline_account_name: f.account_name, offline_account_no: f.account_no, offline_qr_code_url: f.qr_code_url, offline_instruction: f.instruction },
    is_default: false, is_active: f.enabled,
  }
}

async function saveActive() {
  const provider = activeTab.value
  const payload = payloadFor(provider)
  const row = configByProvider.value[provider]
  saving.value = true
  try {
    if (row?.id) await adminCommerceAPI.updatePaymentConfig(row.id, payload)
    else await adminCommerceAPI.createPaymentConfig(payload)
    toast.success('支付配置已保存')
    emit('apply')
  } catch (error) {
    toast.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}
</script>
