<template>
  <div class="payment">
    <section class="user-subscription-info">
      <div class="user-line">
        <div class="user-card">
          <div class="avatar">{{ userInitial }}</div>
          <div>
            <h3>{{ displayName }}</h3>
            <p>{{ maskedAccount }}</p>
          </div>
        </div>
        <NuxtLink class="orders-button" to="/transactions">我的订单</NuxtLink>
      </div>

      <div class="summary-grid">
        <button class="summary-card summary-button" type="button" @click="openMembershipModal">
          <div class="summary-head">
            <div class="summary-title">
              <span class="coin-icon"></span>
              <span>积分</span>
            </div>
          </div>
          <strong>{{ formatNumber(status?.credits || 0) }}</strong>
          <p>可用于图片、问答、视频和短剧创作</p>
        </button>
        <article class="summary-card">
          <div class="summary-head">
            <div class="summary-title"><span>余额</span></div>
            <button class="transfer-button" type="button" @click="toast.info('转积分功能即将开放')">
              <RefreshCw :size="14" />
              转积分
            </button>
          </div>
          <strong>¥ {{ balanceText }}</strong>
          <p>可用于 API 请求，短期可转为积分</p>
        </article>
      </div>
    </section>

    <section class="packages">
      <article
        v-for="(pack, index) in packages"
        :key="pack.id"
        class="subscription-card"
        :class="`plan-${index}`"
      >
        <div class="tag">{{ pack.description || defaultTags[index] || '适合 AI 创作' }}</div>
        <div class="card-main">
          <span class="title">{{ pack.name }}</span>
          <div class="price-section">
            <span class="currency">¥</span>
            <span class="price">{{ formatNumber(pack.price || 0) }}</span>
            <span class="unit">元</span>
          </div>
          <div class="token-section">
            <div class="token-total">
              <span class="diamond"></span>
              <strong>{{ formatNumber(totalCredits(pack)) }}</strong>
              <span>积分</span>
            </div>
            <div class="credit-details">
              <div>
                <span>基础积分</span>
                <span>{{ formatNumber(pack.credits || 0) }}</span>
              </div>
              <div v-if="pack.bonus_credits" class="bonus">
                <span>赠送积分</span>
                <span>+{{ formatNumber(pack.bonus_credits || 0) }}</span>
              </div>
            </div>
          </div>
        </div>
        <button class="subscription-button" type="button" @click="buyCredit(pack)">立即购买</button>
      </article>
    </section>

    <Teleport to="body">
      <div v-if="membershipDialog" class="membership-overlay">
        <button class="membership-close" type="button" aria-label="关闭" @click="membershipDialog = false">×</button>
        <div class="membership-modal">
          <section v-if="showCampaign" class="membership-hero">
            <div>
              <h2>团队协作&nbsp;&nbsp;正式上线</h2>
              <p>席位越多，赠送越多，最高得 <strong>2000</strong> 条 SD2.0</p>
            </div>
            <div class="countdown">
              <span><b>01</b>天</span>
              <span><b>03</b>时</span>
              <span><b>41</b>分</span>
              <span><b>45</b>秒</span>
            </div>
          </section>

          <nav class="membership-tabs">
            <button :class="{ active: membershipType === 'creator' }" type="button" @click="switchMembershipType('creator')">创作会员</button>
            <button :class="{ active: membershipType === 'team' }" type="button" @click="switchMembershipType('team')">团队版会员</button>
          </nav>

          <div class="membership-toolbar">
            <div class="cycle-switch">
              <button
                v-for="option in cycleOptions"
                :key="option.value"
                :class="{ active: billingCycle === option.value }"
                type="button"
                @click="billingCycle = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <button class="bonus-link" type="button">买一送一 · 会员超市 <ChevronRight :size="16" /></button>
          </div>

          <section class="membership-plans">
            <article
              v-for="plan in visibleMembershipPlans"
              :key="plan.id"
              class="membership-card"
              :class="[`tone-${plan.metadata?.tone || 'dark'}`, { team: plan.plan_type === 'team' }]"
            >
              <div class="card-top">
                <div class="plan-name-row">
                  <h3>{{ plan.name }}</h3>
                  <span v-if="plan.badge" class="discount-badge">{{ plan.badge }}</span>
                </div>
                <div class="member-price">
                  <span class="yen">¥</span>
                  <strong>{{ formatNumber(plan.price || 0) }}</strong>
                  <span>/{{ plan.metadata?.unit || (plan.billing_cycle === 'monthly' ? '月' : '年') }}</span>
                  <del v-if="plan.original_price">¥{{ formatNumber(plan.original_price) }}</del>
                </div>
                <p class="renew-line">{{ plan.subtitle || plan.description }}</p>
                <p class="sub-line">
                  <span v-for="(text, index) in plan.metadata?.sub || []" :key="text">{{ text }}<template v-if="index < (plan.metadata?.sub || []).length - 1">&nbsp;&nbsp;</template></span>
                </p>

                <div v-if="plan.plan_type === 'team'" class="seat-line">
                  <div class="seat-stepper"><span>−</span><strong>{{ plan.metadata?.seats || 2 }}</strong><span>席位</span><span>＋</span></div>
                  <div>合计：<strong>{{ formatNumber(plan.metadata?.total || Number(plan.price || 0) * Number(plan.metadata?.seats || 1)) }}元</strong></div>
                </div>

                <div v-if="plan.metadata?.seatGift?.length" class="seat-gift">
                  <p v-for="line in plan.metadata.seatGift" :key="line">{{ line }}</p>
                </div>

                <div class="credits-row" :class="{ dropdown: plan.metadata?.dropdown }">
                  <span class="bolt" v-if="plan.metadata?.dropdown">⚡</span>
                  <strong>{{ formatNumber(plan.credits || 0) }}</strong>
                  <span>{{ plan.plan_type === 'team' ? '积分/月/席位' : '积分/月' }}</span>
                  <ChevronDown v-if="plan.metadata?.dropdown" :size="16" />
                </div>
                <p class="generation-line">{{ plan.plan_type === 'team' ? plan.metadata?.teamCreditsLine : plan.metadata?.generation }}</p>
                <button class="open-plan-button" type="button" @click="buyMembership(plan)">{{ plan.plan_type === 'team' ? '开通团队会员' : '立即开通' }}</button>
                <div v-if="plan.plan_type === 'team'" class="team-icons">
                  <span>协作</span><span>权限</span><span>管理</span><span>发票</span>
                </div>
              </div>

              <div class="feature-body">
                <section v-for="(group, groupIndex) in normalizeFeatureGroups(plan)" :key="`${plan.id}-${groupIndex}`" class="feature-group" :class="{ activity: group.title === '限时活动' }">
                  <h4 v-if="group.title">{{ group.title }}</h4>
                  <p v-for="item in group.items" :key="item" :class="{ disabled: item.trim().startsWith('×') }">{{ item }}</p>
                </section>
              </div>
            </article>
          </section>

          <section v-if="membershipType === 'team'" class="enterprise-box">
            <div class="enterprise-icon">▦</div>
            <div>
              <h3>企业版</h3>
              <p>若当前会员方案未能满足您的需求，请联系我们 | 获得更多席位或积分 | 企业集中采购、对公支付等 | 数据安全合规</p>
            </div>
            <button type="button">联系我们</button>
          </section>

          <p class="membership-note">会员每月算力和加速特权按月下发，有效期31天，到期重置。会员模型下载次数上限为每月200次开票路径：订阅与开票 &gt; 购买记录 &gt; 开票联系我们。</p>
        </div>
      </div>
    </Teleport>

    <div v-if="payDialog" class="pay-overlay" @click.self="closePayDialog">
      <section class="pay-dialog">
        <button class="close" type="button" @click="closePayDialog">×</button>
        <h2>扫码支付</h2>
        <div v-if="!hasPaymentQr" class="pay-line">
          <span>{{ payOrder?.item_name }}</span>
          <strong>¥{{ payOrder?.amount || 0 }}</strong>
        </div>
        <div v-if="!hasPaymentQr" class="method-list">
          <button v-for="m in methods" :key="m.method" :class="{ active: selectedMethod === m.method }" type="button" @click="selectedMethod = m.method">
            {{ methodLabel(m.method) }}
          </button>
        </div>
        <div v-if="!hasPaymentQr && selectedMethod === 'offline'" class="offline-form">
          <input v-model="voucherUrl" placeholder="支付凭证图片地址" />
          <textarea v-model="voucherRemark" rows="3" placeholder="转账备注"></textarea>
        </div>
        <button v-if="!hasPaymentQr" class="pay-submit" type="button" :disabled="paying || !selectedMethod" @click="startPay">{{ paying ? '处理中...' : '生成支付二维码' }}</button>
        <div v-if="hasPaymentQr" class="qr-box">
          <img v-if="isImageUrl(qrContent)" :src="qrContent" alt="支付二维码" />
          <div v-else-if="qrSvg" class="qr-svg" v-html="qrSvg"></div>
          <div v-else class="qr-text">{{ qrContent }}</div>
          <p>{{ selectedMethod === 'offline' ? '请完成线下转账后联系管理员审核' : '支付完成后将自动到账' }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ChevronDown, ChevronRight, RefreshCw } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { billingAPI, getAuthUser } from '~/composables/useApi'

const user = ref(null)
const status = ref(null)
const packages = ref([])
const membershipPlans = ref([])
const methods = ref([])
const payDialog = ref(false)
const membershipDialog = ref(false)
const membershipType = ref('creator')
const billingCycle = ref('yearly')
const payOrder = ref(null)
const paymentData = ref(null)
const selectedMethod = ref('')
const paying = ref(false)
const voucherUrl = ref('')
const voucherRemark = ref('')
const qrSvg = ref('')
const payPollTimer = ref(null)
const defaultTags = ['适合新用户体验', '适合日常创作', '适合专业创作', '适合高频创作', '适合资深用户']

const userInitial = computed(() => displayName.value.slice(0, 1).toUpperCase())
const displayName = computed(() => user.value?.name || user.value?.account || '用户')
const maskedAccount = computed(() => {
  const raw = String(user.value?.phone || user.value?.account || user.value?.email || user.value?.id || '-')
  if (/^\d{7,}$/.test(raw)) return `${raw.slice(0, 3)}****${raw.slice(-4)}`
  return raw
})
const balanceText = computed(() => Number(status.value?.balance || 0).toFixed(3))
const qrContent = computed(() => String(paymentData.value?.qrCodeUrl || paymentData.value?.offlineQrCodeUrl || '').trim())
const hasPaymentQr = computed(() => Boolean(qrContent.value))
const showCampaign = computed(() => true)
const cycleOptions = computed(() => membershipType.value === 'team'
  ? [{ label: '按年购买 35折', value: 'yearly' }, { label: '按月购买 71折', value: 'monthly' }]
  : [{ label: '连续包年 37折', value: 'yearly' }, { label: '连续包月 75折', value: 'monthly' }])
const visibleMembershipPlans = computed(() => membershipPlans.value
  .filter(plan => plan.plan_type === membershipType.value)
  .filter(plan => plan.billing_cycle === billingCycle.value)
  .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)))

watch(qrContent, async (value) => {
  qrSvg.value = ''
  if (!value || isImageUrl(value)) return
  try {
    const { renderSVG } = await import('uqr')
    qrSvg.value = renderSVG(value)
  } catch {
    qrSvg.value = ''
  }
})

watch(membershipType, () => {
  if (membershipType.value === 'team') billingCycle.value = 'yearly'
})

onMounted(loadAll)
onBeforeUnmount(stopPaymentPolling)

async function loadAll() {
  user.value = getAuthUser()
  const [statusRow, packageRows, planRows, methodRows] = await Promise.all([
    billingAPI.membershipStatus(),
    billingAPI.creditPackages(),
    billingAPI.membershipPlans(),
    billingAPI.paymentMethods(),
  ])
  status.value = statusRow
  packages.value = (Array.isArray(packageRows) ? packageRows : []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  membershipPlans.value = (Array.isArray(planRows) ? planRows : []).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
  methods.value = (Array.isArray(methodRows) ? methodRows : []).filter(m => m.ready || m.offline_ready)
  selectedMethod.value = methods.value[0]?.method || ''
}

function openMembershipModal() {
  membershipDialog.value = true
}

function switchMembershipType(value) {
  membershipType.value = value
}

function normalizeFeatureGroups(plan) {
  const groups = plan.metadata?.featureGroups || plan.metadata?.feature_groups || []
  if (Array.isArray(groups) && groups.length) return groups.map(group => ({ title: group.title || '', items: Array.isArray(group.items) ? group.items : [] }))
  return [{ title: '限时活动', items: plan.metadata?.activity || [] }]
}

function totalCredits(pack) {
  return Number(pack.credits || 0) + Number(pack.bonus_credits || 0)
}

async function buyCredit(pack) {
  await createOrder('credit', pack.id)
}

async function buyMembership(plan) {
  await createOrder('membership', plan.id)
}

async function createOrder(type, itemId) {
  try {
    const order = await billingAPI.createOrder({ type, item_id: itemId })
    payOrder.value = order
    paymentData.value = null
    payDialog.value = true
    voucherUrl.value = ''
    voucherRemark.value = ''
    await loadOrderPaymentMethods(order.id)
  } catch (err) {
    toast.error(err.message || '创建订单失败')
  }
}

async function loadOrderPaymentMethods(orderId) {
  try {
    const result = await billingAPI.orderPaymentMethods(orderId)
    const list = Array.isArray(result.methods) ? result.methods : []
    methods.value = list.map(item => ({ method: item.method || item.id, name: item.label, ready: true }))
    selectedMethod.value = result.recommended_method || methods.value[0]?.method || ''
    if (result.order) payOrder.value = result.order
  } catch {
    selectedMethod.value = methods.value[0]?.method || ''
  }
}

async function startPay() {
  if (!payOrder.value?.id || !selectedMethod.value) return
  if (selectedMethod.value === 'offline' && !voucherUrl.value.trim()) {
    toast.error('请先填写支付凭证图片地址')
    return
  }
  try {
    paying.value = true
    const result = await billingAPI.payOrder(payOrder.value.id, {
      payment_method: selectedMethod.value,
      voucher_url: voucherUrl.value.trim(),
      voucher_remark: voucherRemark.value.trim(),
    })
    payOrder.value = result.order
    paymentData.value = result.payment || {}
    if (hasPaymentQr.value && selectedMethod.value !== 'offline') startPaymentPolling()
    if (!paymentData.value.qrCodeUrl && !paymentData.value.offlineQrCodeUrl && !paymentData.value.payUrl) toast.success('支付已提交')
  } catch (err) {
    toast.error(err.message || '发起支付失败')
  } finally {
    paying.value = false
  }
}

function closePayDialog() {
  stopPaymentPolling()
  payDialog.value = false
  payOrder.value = null
  paymentData.value = null
}

function stopPaymentPolling() {
  if (!payPollTimer.value) return
  clearInterval(payPollTimer.value)
  payPollTimer.value = null
}

function startPaymentPolling() {
  stopPaymentPolling()
  payPollTimer.value = setInterval(checkPaymentStatus, 3000)
}

async function checkPaymentStatus() {
  if (!payOrder.value?.id) return
  try {
    const order = await billingAPI.order(payOrder.value.id)
    if (order) payOrder.value = order
    if (order?.status === 'paid') {
      stopPaymentPolling()
      await loadAll()
      toast.success('支付成功，积分已到账')
      closePayDialog()
    }
  } catch {}
}

function methodLabel(method) {
  return ({ offline: '线下支付', zpay_wxpay: '第三方微信支付', wechat: '微信支付', alipay: '支付宝', allinpay: '通联支付', allinpay_wxpay: '通联微信支付', allinpay_alipay: '通联支付宝' })[method] || method
}

function formatNumber(value) {
  const num = Number(value || 0)
  return Number.isInteger(num) ? num.toLocaleString('en-US').replace(/,/g, '') : num.toLocaleString('en-US')
}

function isImageUrl(value) {
  return /^https?:\/\//.test(String(value || '')) || String(value || '').startsWith('/static/')
}
</script>

<style scoped>
.payment { width: 100%; height: 100%; overflow: auto; border-radius: 8px; padding: 16px; background: #1f1f21; color: #fff; box-sizing: border-box; }
.user-subscription-info { margin-bottom: 24px; padding: 16px; border-radius: 12px; background: #18191c; border: 1px solid rgba(255,255,255,.05); }
.user-line { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.user-card { display: flex; align-items: center; gap: 12px; }
.avatar { display: grid; place-items: center; width: 48px; height: 48px; border-radius: 999px; background: linear-gradient(90deg, #3b82f6, #a855f7); color: #fff; font-size: 18px; font-weight: 800; }
h3, p { margin: 0; }
.user-card h3 { font-size: 18px; font-weight: 500; }
.user-card p { margin-top: 4px; color: #9ca3af; font-size: 14px; }
.orders-button { padding: 8px 16px; border-radius: 8px; background: #374151; color: #fff; text-decoration: none; font-size: 14px; transition: background .15s; }
.orders-button:hover { background: #4b5563; }
.summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 16px; }
.summary-card { padding: 12px; border: 0; border-radius: 8px; background: rgba(31, 41, 55, .5); color: #fff; text-align: left; }
.summary-button { cursor: pointer; transition: background .15s, transform .15s; }
.summary-button:hover { background: rgba(37, 99, 235, .22); transform: translateY(-1px); }
.summary-head { display: flex; align-items: center; justify-content: space-between; min-height: 28px; margin-bottom: 8px; }
.summary-title { display: flex; align-items: center; gap: 8px; color: #60a5fa; font-size: 14px; font-weight: 500; }
.coin-icon { width: 20px; height: 20px; border-radius: 50%; background: linear-gradient(135deg, #38bdf8, #2563eb); box-shadow: inset 0 0 0 5px rgba(255,255,255,.18); }
.summary-card strong { display: block; margin-bottom: 4px; font-size: 24px; line-height: 1.15; }
.summary-card p { color: #9ca3af; font-size: 12px; }
.transfer-button { display: inline-flex; align-items: center; gap: 8px; height: 28px; padding: 0 12px; border: 0; border-radius: 4px; background: #2563eb; color: #fff; font-size: 12px; cursor: pointer; }
.packages { display: grid; grid-template-columns: repeat(4, minmax(230px, 320px)); gap: 24px; align-items: stretch; padding-bottom: 32px; }
.subscription-card { position: relative; display: flex; flex-direction: column; justify-content: space-between; min-height: 330px; padding: 34px 24px 24px; border: 1px solid #374151; border-radius: 10px; overflow: hidden; background: linear-gradient(180deg, #111214 0%, #101112 56%, #18191b 100%); }
.tag { position: absolute; top: 0; right: 0; z-index: 1; padding: 6px 11px; border-radius: 0 0 0 4px; background: linear-gradient(90deg, #d8efff, #8aa7ff); color: #101827; font-size: 12px; font-weight: 600; }
.title { display: block; margin-bottom: 28px; color: #fff; font-size: 22px; line-height: 1.2; font-weight: 700; }
.price-section { display: flex; align-items: flex-end; margin-bottom: 18px; }
.currency { margin-right: 5px; color: #9ca3af; font-size: 18px; font-weight: 800; line-height: 1.45; }
.price { color: #fff; font-size: 32px; font-weight: 800; line-height: 1; }
.unit { margin-left: 7px; margin-bottom: 3px; color: #9ca3af; font-size: 13px; }
.token-total { display: flex; align-items: flex-end; gap: 10px; margin-bottom: 18px; }
.token-total strong { color: #fff; font-size: 32px; line-height: 1; font-weight: 800; }
.token-total span:last-child { margin-bottom: 2px; color: #9ca3af; font-size: 13px; }
.diamond { width: 19px; height: 19px; margin-bottom: 6px; border-radius: 5px; background: linear-gradient(135deg, #38d5ff, #0ea5e9); transform: rotate(45deg); position: relative; flex: 0 0 auto; }
.diamond::after { content: ""; position: absolute; inset: 5px; border-radius: 3px; background: #6366f1; }
.credit-details { border: 1px solid #3f3f46; border-radius: 7px; overflow: hidden; background: rgba(63, 63, 70, .38); font-size: 13px; }
.credit-details div { display: flex; align-items: center; justify-content: space-between; min-height: 38px; padding: 0 16px; color: #d1d5db; }
.credit-details div + div { border-top: 1px solid rgba(255,255,255,.08); }
.credit-details .bonus { color: #facc15; }
.subscription-button { width: 100%; height: 44px; border: 0; border-radius: 8px; background: #fff; color: #111; font-size: 15px; font-weight: 700; cursor: pointer; }
.membership-overlay { position: fixed; inset: 0; z-index: 900; background: #000; color: #f5f5f7; overflow: auto; }
.membership-close { position: fixed; top: 22px; right: 22px; z-index: 2; width: 32px; height: 32px; border: 0; background: transparent; color: #f5f5f7; font-size: 34px; line-height: 1; cursor: pointer; }
.membership-modal { width: min(1640px, calc(100vw - 124px)); margin: 20px auto 72px; }
.membership-hero { display: flex; align-items: center; justify-content: space-between; width: 1080px; max-width: 70vw; height: 114px; margin: 0 auto 28px; padding: 0 30px; border-radius: 8px; background: linear-gradient(90deg, rgba(33,33,33,.96), rgba(25,25,25,.82)), radial-gradient(circle at 60% 30%, rgba(255,255,255,.38), transparent 28%); box-sizing: border-box; }
.membership-hero h2 { margin: 0 0 8px; font-size: 26px; color: #fff; }
.membership-hero h2::after { content: "正式上线"; margin-left: 18px; color: #91f6ff; }
.membership-hero p { color: #e8e8ea; font-size: 14px; }
.membership-hero strong { color: #5eefff; font-size: 22px; }
.countdown { display: flex; gap: 28px; }
.countdown span { display: grid; text-align: center; color: #fff; font-size: 12px; }
.countdown b { font-size: 28px; line-height: 1; }
.membership-tabs { display: flex; justify-content: center; gap: 0; border-bottom: 1px solid #1f1f1f; }
.membership-tabs button { width: 180px; height: 58px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: #8b8b8f; font-size: 18px; font-weight: 700; cursor: pointer; }
.membership-tabs button.active { color: #fff; border-bottom-color: #fff; }
.membership-toolbar { position: relative; display: flex; justify-content: center; align-items: center; height: 96px; }
.cycle-switch { display: inline-flex; padding: 4px; border-radius: 999px; background: #242424; box-shadow: inset 0 0 0 1px #3a3a3a; }
.cycle-switch button { min-width: 164px; height: 48px; border: 0; border-radius: 999px; background: transparent; color: #a3a3a7; font-size: 16px; font-weight: 700; cursor: pointer; }
.cycle-switch button.active { color: #fff; background: #3a3a3a; }
.bonus-link { position: absolute; right: 126px; display: inline-flex; align-items: center; gap: 8px; height: 38px; padding: 0 18px; border: 1px solid #b88623; border-radius: 12px; background: transparent; color: #d99b28; font-size: 15px; cursor: pointer; }
.membership-plans { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; max-width: 1360px; margin: 0 auto; align-items: start; }
.membership-card { min-height: 488px; border-radius: 10px; overflow: hidden; background: #141414; border: 1px solid rgba(255,255,255,.06); }
.card-top { min-height: 304px; padding: 26px 20px 18px; border-radius: 10px; background: radial-gradient(circle at 75% 0%, rgba(255,255,255,.12), transparent 34%), #292929; box-sizing: border-box; }
.tone-blue .card-top { background: radial-gradient(circle at 75% 0%, rgba(95,111,210,.32), transparent 38%), #171a2b; }
.tone-gold .card-top { background: radial-gradient(circle at 75% 0%, rgba(185,126,28,.36), transparent 40%), #241909; }
.tone-cyan .card-top { background: radial-gradient(circle at 75% 0%, rgba(23,151,190,.22), transparent 40%), #12222a; }
.tone-purple .card-top { background: radial-gradient(circle at 75% 0%, rgba(166,75,181,.28), transparent 40%), #241426; }
.plan-name-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
.plan-name-row h3 { color: #fff; font-size: 20px; font-weight: 500; }
.discount-badge { display: inline-flex; align-items: center; height: 24px; padding: 0 9px; border-radius: 7px; background: #ffc879; color: #17110a; font-size: 12px; font-weight: 800; white-space: nowrap; }
.team .discount-badge { background: #6feaff; }
.member-price { display: flex; align-items: baseline; gap: 5px; margin-top: 20px; color: #fff; }
.member-price .yen { font-size: 16px; }
.member-price strong { font-size: 36px; line-height: 1; }
.member-price span:last-of-type { color: #e7e7e7; font-size: 14px; }
.member-price del { margin-left: 4px; color: #858585; font-size: 14px; }
.renew-line, .sub-line, .generation-line { margin-top: 7px; color: #8e8e94; font-size: 12px; line-height: 1.45; }
.seat-line { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; color: #cfcfd2; font-size: 13px; }
.seat-stepper { display: inline-flex; align-items: center; gap: 14px; height: 28px; padding: 0 12px; border-radius: 999px; background: rgba(255,255,255,.08); }
.seat-gift { margin-top: 12px; padding: 14px; border-radius: 7px; background: rgba(255,255,255,.06); color: #bfbfc5; font-size: 12px; line-height: 1.5; }
.credits-row { display: flex; align-items: flex-end; gap: 4px; margin-top: 62px; color: #fff; }
.team .credits-row { margin-top: 48px; }
.credits-row.dropdown { align-items: center; height: 36px; margin-top: 42px; padding: 0 14px; border-radius: 999px; background: rgba(43, 108, 116, .78); border: 1px solid rgba(82, 190, 204, .38); }
.credits-row strong { font-size: 24px; line-height: 1; }
.credits-row span { color: #c7c7cb; font-size: 13px; }
.bolt { color: #fff !important; }
.open-plan-button { width: 100%; height: 40px; margin-top: 12px; border: 0; border-radius: 999px; background: #fff; color: #111; font-size: 14px; font-weight: 700; cursor: pointer; }
.tone-gold .open-plan-button { background: linear-gradient(90deg, #fff, #dcc47f); }
.team-icons { display: flex; justify-content: space-around; margin-top: 14px; color: #929297; font-size: 13px; }
.feature-body { padding: 18px 20px 22px; }
.feature-group { padding-top: 14px; border-top: 1px solid rgba(255,255,255,.08); }
.feature-group:first-child { padding-top: 0; border-top: 0; }
.feature-group + .feature-group { margin-top: 16px; }
.feature-group h4 { margin: 0 0 10px; color: #fff; font-size: 14px; }
.feature-group.activity h4 { color: #00d4ff; }
.feature-group p { margin: 0 0 9px; color: #d0d0d4; font-size: 12px; line-height: 1.4; }
.feature-group p.disabled { color: #6f6f75; }
.enterprise-box { display: flex; align-items: center; gap: 16px; max-width: 1568px; margin: 24px auto 0; padding: 18px 20px; border: 1px solid rgba(255,255,255,.08); border-radius: 10px; background: #111; }
.enterprise-icon { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 8px; background: #252525; font-size: 22px; }
.enterprise-box h3 { margin-bottom: 6px; font-size: 16px; }
.enterprise-box p { color: #8b8b91; font-size: 13px; }
.enterprise-box button { margin-left: auto; height: 38px; padding: 0 22px; border: 1px solid #2c2c2c; border-radius: 999px; background: transparent; color: #fff; cursor: pointer; }
.membership-note { max-width: 1568px; margin: 24px auto 0; color: #8b8b91; font-size: 12px; line-height: 1.6; }
.pay-overlay { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; background: rgba(0,0,0,.72); backdrop-filter: blur(4px); }
.pay-dialog { position: relative; width: min(460px, calc(100vw - 28px)); padding: 28px; border-radius: 8px; background: #191919; box-shadow: 0 30px 80px rgba(0,0,0,.45); }
.pay-dialog h2 { margin: 0; font-size: 24px; }
.close { position: absolute; top: 14px; right: 16px; border: 0; background: transparent; color: #a1a1aa; font-size: 28px; cursor: pointer; }
.pay-line { display: flex; justify-content: space-between; margin-top: 20px; padding: 16px; border-radius: 8px; background: #2d2d30; }
.pay-line strong { color: #0a84ff; font-size: 24px; }
.method-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-top: 16px; }
.method-list button { height: 40px; border: 1px solid #3f3f46; border-radius: 8px; background: transparent; color: #d4d4d8; cursor: pointer; }
.method-list button.active { border-color: #0a84ff; color: #fff; }
.offline-form { display: grid; gap: 10px; margin-top: 14px; }
.offline-form input, .offline-form textarea { width: 100%; border: 1px solid #3f3f46; border-radius: 8px; background: #111; color: #fff; padding: 11px 12px; box-sizing: border-box; outline: none; }
.offline-form textarea { resize: vertical; }
.pay-submit { width: 100%; height: 48px; margin-top: 22px; border: 0; border-radius: 8px; background: linear-gradient(90deg,#cfe7ff,#7aa2ff); color: #111827; font-weight: 800; cursor: pointer; }
.pay-submit:disabled { opacity: .55; cursor: not-allowed; }
.qr-box { display: grid; place-items: center; gap: 12px; margin-top: 22px; }
.qr-box img, .qr-svg { width: 230px; height: 230px; border-radius: 8px; background: #fff; object-fit: contain; }
.qr-svg :deep(svg) { display: block; width: 230px; height: 230px; }
.qr-text { padding: 14px; border-radius: 8px; background: #fff; color: #111; word-break: break-all; }
.pay-url { display: block; margin-top: 14px; color: #60a5fa; text-align: center; }
@media (max-width: 1500px) { .packages { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; } .membership-modal { width: calc(100vw - 72px); } .membership-plans { grid-template-columns: repeat(5, minmax(230px, 1fr)); max-width: none; overflow-x: auto; } }
@media (max-width: 1120px) { .packages { grid-template-columns: repeat(2, minmax(230px, 320px)); gap: 20px; } .membership-modal { width: calc(100vw - 32px); } .membership-plans { grid-template-columns: repeat(5, 260px); overflow-x: auto; } .bonus-link { position: static; margin-left: 16px; } }
@media (max-width: 720px) {
  .payment { padding: 12px; }
  .user-line { align-items: flex-start; flex-direction: column; }
  .summary-grid, .packages, .membership-plans { grid-template-columns: 1fr; }
  .membership-hero { display: none; }
  .membership-toolbar { height: auto; padding: 22px 0; flex-direction: column; gap: 14px; }
  .cycle-switch button { min-width: 132px; }
}
</style>
