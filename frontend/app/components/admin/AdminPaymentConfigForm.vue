<template>
  <template v-if="admin.dialog === 'paymentConfig'">
    <label>配置名称<input v-model="admin.paymentConfigForm.name" required /></label>
    <label>
      渠道
      <select v-model="admin.paymentConfigForm.provider">
        <option v-for="option in paymentProviderOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>
    <div class="form-grid">
      <label>App ID<input v-model="admin.paymentConfigForm.app_id" /></label>
      <label>商户号<input v-model="admin.paymentConfigForm.merchant_id" /></label>
    </div>
    <label>API Key<input v-model="admin.paymentConfigForm.api_key" type="password" /></label>
    <label>API Secret<input v-model="admin.paymentConfigForm.api_secret" type="password" /></label>
    <label>通知地址<input v-model="admin.paymentConfigForm.notify_url" /></label>
    <label>返回地址<input v-model="admin.paymentConfigForm.return_url" /></label>
    <p v-if="isAllinpay" class="field-tip">通联配置：App ID 填 appid，商户号填 cusid，API Key 填通联公钥，API Secret 填商户私钥；扩展配置可填 base_url、org_id、version、signtype。</p>
    <label>扩展配置 JSON<textarea v-model="admin.paymentConfigForm.config_text" rows="4" :placeholder="configPlaceholder" /></label>
    <label class="check"><input v-model="admin.paymentConfigForm.is_default" type="checkbox" /> 默认配置</label>
    <label class="check"><input v-model="admin.paymentConfigForm.is_active" type="checkbox" /> 启用</label>
  </template>
</template>

<script setup lang="ts">
const props = defineProps<{ admin: any }>()

const paymentProviderOptions = [
  { value: 'wechat', label: '微信支付（官方）' },
  { value: 'zpay_wxpay', label: '第三方微信支付' },
  { value: 'allinpay', label: '通联支付' },
  { value: 'allinpay_wxpay', label: '通联微信支付' },
  { value: 'allinpay_alipay', label: '通联支付宝' },
  { value: 'alipay', label: '支付宝' },
  { value: 'offline', label: '线下支付' },
]

const defaultAllinpayConfig = { base_url: 'https://vsp.allinpay.com', org_id: '', version: '11', signtype: 'RSA' }
const isAllinpay = computed(() => String(props.admin.paymentConfigForm.provider || '').startsWith('allinpay'))
const configPlaceholder = computed(() => isAllinpay.value
  ? JSON.stringify(defaultAllinpayConfig)
  : '{"cert_path": "..."}')

watch(() => props.admin.paymentConfigForm.provider, (provider) => {
  if (!String(provider || '').startsWith('allinpay')) return
  const text = String(props.admin.paymentConfigForm.config_text || '').trim()
  if (!text || text === '{}') props.admin.paymentConfigForm.config_text = JSON.stringify(defaultAllinpayConfig, null, 2)
})
</script>
