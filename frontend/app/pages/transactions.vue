<template>
  <div class="transactions-page">
    <header class="page-header">
      <h1>账单</h1>
    </header>

    <div class="tab-navigation" role="tablist" aria-label="账单类型">
      <button :class="{ active: tab === 'details' }" type="button" @click="switchTab('details')">积分明细</button>
      <button :class="{ active: tab === 'points' }" type="button" @click="switchTab('points')">消费记录</button>
      <button :class="{ active: tab === 'orders' }" type="button" @click="switchTab('orders')">充值记录</button>
    </div>

    <section class="table-panel">
      <div class="table-scroll">
        <div class="table-grid" :class="gridClass">
          <div class="table-row table-head">
            <div v-for="col in activeColumns" :key="col.key" class="table-cell">{{ col.title }}</div>
          </div>

          <template v-if="activeRows.length">
            <div v-for="row in activeRows" :key="`${tab}-${row.id || row.orderId}`" class="table-row">
              <div v-for="col in activeColumns" :key="`${row.id}-${col.key}`" class="table-cell" :class="cellClass(col.key, row)">
                <span v-if="col.key === 'id'" class="order-id-display">{{ row.orderId }}</span>
                <span v-else-if="col.key === 'status'" class="status-tag" :class="`status-${row.statusKind}`">
                  <span>{{ row.statusKind === 'success' ? '✓' : row.statusKind === 'cancel' ? '×' : '•' }}</span>
                  {{ row.statusText }}
                </span>
                <button
                  v-else-if="col.key === 'actions' && row.canPay"
                  class="pay-action"
                  type="button"
                  @click="openPayDialog(row.raw)"
                >
                  去支付
                </button>
                <span v-else-if="col.key === 'actions'" class="muted">-</span>
                <span v-else>{{ row[col.key] }}</span>
              </div>
            </div>
          </template>
        </div>

        <div v-if="!loading && !activeRows.length" class="empty-state">
          <PackageX :size="48" stroke-width="1.6" />
          <span>无数据</span>
        </div>
        <div v-if="loading" class="empty-state">加载中...</div>
      </div>
    </section>

    <footer class="pagination-bar">
      <span>共 {{ pagination.total }} 条记录</span>
      <button class="pager-button" :disabled="pagination.page <= 1" type="button" @click="goPage(pagination.page - 1)" aria-label="上一页">
        <ChevronLeft :size="18" />
      </button>
      <button
        v-for="page in visiblePages"
        :key="page"
        class="page-number"
        :class="{ active: page === pagination.page }"
        type="button"
        @click="goPage(page)"
      >
        {{ page }}
      </button>
      <button class="pager-button" :disabled="pagination.page >= pagination.total_pages" type="button" @click="goPage(pagination.page + 1)" aria-label="下一页">
        <ChevronRight :size="18" />
      </button>
      <select v-model.number="pagination.page_size" class="page-size-select" @change="changePageSize">
        <option :value="10">10 / 页</option>
        <option :value="20">20 / 页</option>
        <option :value="50">50 / 页</option>
      </select>
    </footer>

    <div v-if="payDialog" class="pay-overlay" @click.self="closePayDialog">
      <section class="pay-dialog">
        <button class="close" type="button" @click="closePayDialog">×</button>
        <h2>扫码支付</h2>
        <div v-if="!hasPaymentQr" class="pay-line">
          <span>{{ payOrder?.item_name || payOrder?.itemName }}</span>
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
import { ChevronLeft, ChevronRight, PackageX } from 'lucide-vue-next'
import { toast } from 'vue-sonner'
import { billingAPI } from '~/composables/useApi'

const tab = ref('details')
const loading = ref(false)
const orders = ref([])
const logs = ref([])
const methods = ref([])
const payDialog = ref(false)
const payOrder = ref(null)
const paymentData = ref(null)
const selectedMethod = ref('')
const paying = ref(false)
const voucherUrl = ref('')
const voucherRemark = ref('')
const qrSvg = ref('')
const payPollTimer = ref(null)
const pagination = reactive({ page: 1, page_size: 20, total: 0, total_pages: 1 })

const orderColumns = [
  { key: 'id', title: '订单号' },
  { key: 'status', title: '状态' },
  { key: 'amountDisplay', title: '金额' },
  { key: 'createdAt', title: '创建时间' },
  { key: 'actions', title: '操作' },
]
const pointColumns = [
  { key: 'id', title: '订单号' },
  { key: 'businessTypeDesc', title: '任务类型' },
  { key: 'modelName', title: '模型' },
  { key: 'amountDisplay', title: '积分' },
  { key: 'status', title: '状态' },
  { key: 'createdAt', title: '时间' },
  { key: 'description', title: '描述' },
]
const detailColumns = [
  { key: 'logId', title: '流水号' },
  { key: 'businessTypeDesc', title: '来源' },
  { key: 'amountDisplay', title: '积分变动' },
  { key: 'balanceDisplay', title: '当前积分' },
  { key: 'status', title: '状态' },
  { key: 'createdAt', title: '时间' },
  { key: 'description', title: '说明' },
]

const activeColumns = computed(() => {
  if (tab.value === 'orders') return orderColumns
  if (tab.value === 'details') return detailColumns
  return pointColumns
})
const activeRows = computed(() => tab.value === 'orders' ? orders.value.map(formatOrderRow) : logs.value.map(formatPointRow))
const gridClass = computed(() => {
  if (tab.value === 'orders') return 'orders-grid'
  return tab.value === 'details' ? 'details-grid' : 'points-grid'
})
const qrContent = computed(() => String(paymentData.value?.qrCodeUrl || paymentData.value?.offlineQrCodeUrl || '').trim())
const hasPaymentQr = computed(() => Boolean(qrContent.value))
const visiblePages = computed(() => {
  const total = Math.max(1, Number(pagination.total_pages || 1))
  const current = Math.min(total, Math.max(1, Number(pagination.page || 1)))
  const start = Math.max(1, Math.min(current - 1, total - 2))
  const end = Math.min(total, start + 2)
  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
})

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

onMounted(loadData)
onBeforeUnmount(stopPaymentPolling)

async function loadData() {
  loading.value = true
  try {
    const params = { page: pagination.page, page_size: pagination.page_size }
    const res = tab.value === 'orders'
      ? await billingAPI.orders(params)
      : await billingAPI.pointLogs(tab.value === 'points' ? { ...params, type: 'consume' } : params)
    const items = res.items || []
    if (tab.value === 'orders') orders.value = items
    else logs.value = items
    Object.assign(pagination, res.pagination || { page: 1, page_size: pagination.page_size, total: items.length, total_pages: 1 })
  } finally {
    loading.value = false
  }
}

function switchTab(value) {
  if (tab.value === value) return
  tab.value = value
  pagination.page = 1
  loadData()
}

function goPage(page) {
  const next = Math.max(1, Math.min(Number(pagination.total_pages || 1), Number(page || 1)))
  if (next === pagination.page) return
  pagination.page = next
  loadData()
}

function changePageSize() {
  pagination.page = 1
  loadData()
}

function cellClass(key, row) {
  return {
    'model-cell': key === 'modelName',
    'desc-cell': key === 'description',
    'positive-cell': key === 'amountDisplay' && String(row.amountDisplay).startsWith('+'),
    'negative-cell': key === 'amountDisplay' && String(row.amountDisplay).startsWith('-'),
  }
}

function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function normalizeStatusKind(status) {
  const value = String(status || '').toLowerCase()
  if (['paid', 'completed', 'success', 'active'].includes(value)) return 'success'
  if (['canceled', 'cancelled', 'failed', 'closed', 'refunded', 'expired'].includes(value)) return 'cancel'
  return 'warning'
}

function statusText(status) {
  return ({
    paid: '成功',
    completed: '成功',
    success: '成功',
    pending: '待支付',
    offline_pending: '待审核',
    failed: '取消',
    canceled: '取消',
    cancelled: '取消',
    closed: '取消',
    expired: '取消',
    refunded: '取消',
  })[String(status || '').toLowerCase()] || '处理中'
}

function taskText(row) {
  const raw = String(row.task_type || row.taskType || row.business_type || row.type || '').toLowerCase()
  if (raw.includes('register_bonus') || raw.includes('register')) return '注册赠送'
  if (raw.includes('daily_login') || raw.includes('login_bonus')) return '每日登录'
  if (raw.includes('invite_bonus') || raw.includes('invite')) return '邀请奖励'
  if (raw.includes('recharge') || raw.includes('credit_purchase') || raw.includes('order')) return '充值到账'
  if (raw.includes('membership')) return '会员积分'
  if (raw.includes('refund')) return '积分退回'
  if (raw.includes('admin') || raw.includes('adjust')) return '后台调整'
  if (raw.includes('consume')) return '积分消费'
  if (raw.includes('image') || raw.includes('cover')) return '图片生成'
  if (raw.includes('video')) return '视频生成'
  if (raw.includes('chat') || raw.includes('text') || raw.includes('ai')) return 'AI问答'
  if (raw.includes('audio') || raw.includes('tts')) return '音频生成'
  return row.task_type || row.taskType || 'AI问答'
}

function confirmedDescription(row) {
  const raw = row.description || '-'
  if (raw === '-') return raw
  const status = String(row.status || '').toLowerCase()
  if (status === 'canceled' || raw.includes('已回滚')) return raw.includes('已回滚') ? raw : `${raw}（已回滚）`
  if (Number(row.amount || 0) > 0) return raw
  return raw.includes('已确认') ? raw : `${raw}（已确认）`
}

function formatPointRow(row) {
  return {
    ...row,
    logId: row.id,
    orderId: row.related_task_id || row.relatedTaskId || row.id,
    businessTypeDesc: taskText(row),
    modelName: row.model || '-',
    amountDisplay: `${Number(row.amount || 0) > 0 ? '+' : ''}${Number(row.amount || 0)}`,
    balanceDisplay: Number(row.balance || 0),
    statusKind: normalizeStatusKind(row.status),
    statusText: statusText(row.status),
    createdAt: formatTime(row.created_at || row.createdAt),
    description: confirmedDescription(row),
  }
}

function formatOrderRow(row) {
  const status = String(row.status || '').toLowerCase()
  return {
    ...row,
    raw: row,
    orderId: row.order_no || row.orderNo || row.id,
    amountDisplay: `¥${Number(row.amount || 0)}`,
    statusKind: normalizeStatusKind(row.status),
    statusText: statusText(row.status),
    createdAt: formatTime(row.created_at || row.createdAt),
    canPay: status === 'pending',
  }
}

function parsePaymentData(row) {
  const metadata = row?.metadata
  if (!metadata) return null
  if (typeof metadata === 'object') return metadata
  try { return JSON.parse(metadata) } catch { return null }
}

async function openPayDialog(order) {
  payOrder.value = order
  paymentData.value = parsePaymentData(order)
  selectedMethod.value = order.payment_provider || order.paymentProvider || ''
  voucherUrl.value = ''
  voucherRemark.value = ''
  payDialog.value = true
  await loadOrderPaymentMethods(order.id)
  if (hasPaymentQr.value && selectedMethod.value !== 'offline') startPaymentPolling()
}

async function loadOrderPaymentMethods(orderId) {
  try {
    const result = await billingAPI.orderPaymentMethods(orderId)
    const list = Array.isArray(result.methods) ? result.methods : []
    methods.value = list.map(item => ({ method: item.method || item.id, name: item.label, ready: true }))
    selectedMethod.value = selectedMethod.value || result.recommended_method || methods.value[0]?.method || ''
    if (result.order) {
      payOrder.value = result.order
      if (!paymentData.value) paymentData.value = parsePaymentData(result.order)
    }
  } catch {
    selectedMethod.value = selectedMethod.value || methods.value[0]?.method || ''
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
      toast.success('支付成功，积分已到账')
      closePayDialog()
      await loadData()
    }
  } catch {}
}

function methodLabel(method) {
  return ({ offline: '线下支付', zpay_wxpay: '第三方微信支付', wechat: '微信支付', alipay: '支付宝', allinpay: '通联支付', allinpay_wxpay: '通联微信支付', allinpay_alipay: '通联支付宝' })[method] || method
}

function isImageUrl(value) {
  const text = String(value || '')
  return /\.(png|jpe?g|gif|webp|svg)(\?|#|$)/i.test(text) || text.startsWith('/static/')
}
</script>

<style scoped>
.transactions-page {
  min-height: 100%;
  height: 100%;
  padding: 14px 14px 24px;
  box-sizing: border-box;
  color: #f4f4f5;
  background: #1f1f1f;
  overflow: auto;
}

.page-header {
  margin-bottom: 24px;
}

.page-header h1 {
  margin: 0;
  font-size: 28px;
  line-height: 1;
  font-weight: 700;
  letter-spacing: 0;
}

.tab-navigation {
  display: inline-flex;
  align-items: center;
  gap: 0;
  height: 40px;
  margin-bottom: 14px;
  padding: 2px;
  border-radius: 14px;
  background: #1b1c22;
}

.tab-navigation button {
  height: 36px;
  min-width: 96px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #8c8c92;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background .16s ease, color .16s ease;
}

.tab-navigation button.active {
  background: #35363b;
  color: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, .28);
}

.table-panel {
  width: 100%;
}

.table-scroll {
  min-height: calc(100vh - 292px);
  max-height: calc(100vh - 292px);
  overflow: auto;
  border-radius: 10px;
  background: #15161b;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, .22) transparent;
}

.table-grid {
  min-width: 100%;
}

.orders-grid .table-row {
  grid-template-columns: 2fr .75fr .75fr 1.15fr .7fr;
}

.points-grid .table-row {
  grid-template-columns: 1.85fr .95fr 1.8fr .95fr .95fr 1.65fr 2.25fr;
  min-width: 1320px;
}

.details-grid .table-row {
  grid-template-columns: 1.1fr 1.05fr .9fr .9fr .85fr 1.55fr 2.4fr;
  min-width: 1180px;
}

.table-row {
  display: grid;
  align-items: center;
  min-height: 54px;
  border-bottom: 1px solid #2d2d30;
}

.table-head {
  position: sticky;
  top: 0;
  z-index: 1;
  min-height: 46px;
  background: #242428;
  border-bottom-color: #313136;
}

.table-cell {
  min-width: 0;
  padding: 0 14px;
  box-sizing: border-box;
  color: #f1f1f3;
  font-size: 14px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.table-head .table-cell {
  color: #a6a6ad;
  font-weight: 700;
}

.order-id-display {
  display: inline-flex;
  align-items: center;
  max-width: 190px;
  height: 32px;
  padding: 0 10px;
  box-sizing: border-box;
  border: 1px solid #474747;
  border-radius: 4px;
  background: #2b2b2c;
  color: #eeeeef;
  font-family: inherit;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-cell,
.desc-cell {
  white-space: normal;
  overflow-wrap: anywhere;
}

.positive-cell {
  color: #63e2b7;
}

.negative-cell {
  color: #ff9f7a;
}

.muted {
  color: #71717a;
}

.pay-action {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(10, 132, 255, .5);
  border-radius: 6px;
  background: rgba(10, 132, 255, .12);
  color: #7bbcff;
  font-size: 13px;
  cursor: pointer;
  transition: background .16s ease, border-color .16s ease, color .16s ease;
}

.pay-action:hover {
  border-color: #0a84ff;
  background: rgba(10, 132, 255, .2);
  color: #cfe7ff;
}

.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  height: 28px;
  padding: 0 8px;
  border-radius: 2px;
  font-size: 14px;
  line-height: 1;
}

.status-success {
  color: #49e0b2;
  border: 1px solid rgba(73, 224, 178, .34);
}

.status-cancel {
  color: #ff8585;
  border: 1px solid rgba(255, 133, 133, .34);
}

.status-warning {
  color: #f2c97d;
  border: 1px solid rgba(242, 201, 125, .34);
}

.empty-state {
  display: flex;
  min-height: calc(100vh - 384px);
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 14px;
  color: #787a80;
  font-size: 16px;
}

.empty-state svg {
  color: #6f7178;
}

.pagination-bar {
  position: static;
  justify-content: flex-end;
  margin-top: 12px;
  padding-right: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e5e5e7;
  font-size: 14px;
}

.pager-button,
.page-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #2c2d31;
  color: #9a9ca2;
  font-size: 14px;
  cursor: pointer;
}

.pager-button:disabled {
  opacity: .45;
  cursor: not-allowed;
}

.page-number {
  background: transparent;
  color: #d7d8dc;
}

.page-number.active {
  color: #1687ff;
  border-color: #0a84ff;
  background: #20242d;
}

.page-size-select {
  height: 30px;
  min-width: 92px;
  padding: 0 12px;
  border: 0;
  border-radius: 4px;
  outline: none;
  background: #34353a;
  color: #e7e7ea;
  font-size: 14px;
}

.page-size-select option {
  color: #e7e7ea;
  background: #2b2c31;
}

.pay-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: grid;
  place-items: center;
  background: rgba(0, 0, 0, .72);
  backdrop-filter: blur(4px);
}

.pay-dialog {
  position: relative;
  width: min(460px, calc(100vw - 28px));
  padding: 28px;
  border-radius: 8px;
  background: #191919;
  box-shadow: 0 30px 80px rgba(0, 0, 0, .45);
}

.pay-dialog h2 {
  margin: 0;
  font-size: 24px;
}

.close {
  position: absolute;
  top: 14px;
  right: 16px;
  border: 0;
  background: transparent;
  color: #a1a1aa;
  font-size: 28px;
  cursor: pointer;
}

.pay-line {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding: 16px;
  border-radius: 8px;
  background: #2d2d30;
}

.pay-line strong {
  color: #0a84ff;
  font-size: 24px;
}

.method-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.method-list button {
  height: 40px;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: transparent;
  color: #d4d4d8;
  cursor: pointer;
}

.method-list button.active {
  border-color: #0a84ff;
  color: #fff;
}

.offline-form {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.offline-form input,
.offline-form textarea {
  width: 100%;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  background: #111;
  color: #fff;
  padding: 11px 12px;
  box-sizing: border-box;
  outline: none;
}

.offline-form textarea {
  resize: vertical;
}

.pay-submit {
  width: 100%;
  height: 48px;
  margin-top: 22px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(90deg, #cfe7ff, #7aa2ff);
  color: #111827;
  font-weight: 800;
  cursor: pointer;
}

.pay-submit:disabled {
  opacity: .55;
  cursor: not-allowed;
}

.qr-box {
  display: grid;
  place-items: center;
  gap: 12px;
  margin-top: 22px;
}

.qr-box img,
.qr-svg {
  width: 230px;
  height: 230px;
  border-radius: 8px;
  background: #fff;
  object-fit: contain;
}

.qr-svg :deep(svg) {
  display: block;
  width: 230px;
  height: 230px;
}

.qr-text {
  padding: 14px;
  border-radius: 8px;
  background: #fff;
  color: #111;
  word-break: break-all;
}

@media (max-width: 900px) {
  .transactions-page {
    padding: 16px 12px 92px;
  }

  .page-header {
    margin-bottom: 22px;
  }

  .page-header h1 {
    font-size: 28px;
  }

  .table-scroll {
    min-height: 520px;
  }

  .orders-grid .table-row {
    min-width: 760px;
  }

  .pagination-bar {
    right: 16px;
    bottom: 26px;
    font-size: 15px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
}
</style>
