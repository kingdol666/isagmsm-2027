<script setup lang="ts">
interface OrderRow {
  orderId: string
  orderNo: string
  subtotalFen: number
  discountFen: number
  totalFen: number
  currency: string
  orderStatus: string
  orderCreatedAt: string
  paymentId: string | null
  provider: string | null
  providerPaymentNo: string | null
  providerTradeNo: string | null
  paymentStatus: string | null
  paidAt: string | null
  displayId: string
  fullName: string
  email: string
  typeName: string
}

const statusFilter = ref('')
const providerFilter = ref('')

const { data, error } = await useFetch<{ rows: OrderRow[] }>('/api/payments', {
  query: computed(() => ({
    status: statusFilter.value || undefined,
    provider: providerFilter.value || undefined,
  })),
  watch: [statusFilter, providerFilter],
})

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const statusZh: Record<string, string> = {
  pending: '待支付',
  reviewing: '审核中',
  paid: '已支付',
  failed: '已失败',
  expired: '已过期',
  cancelled: '已取消',
  refunded: '已退款',
}

const providerZh: Record<string, string> = {
  mock: '模拟支付',
  alipay: '支付宝',
  wechat: '微信支付',
}

const paidTotal = computed(() =>
  (data.value?.rows ?? []).filter(r => r.orderStatus === 'paid').reduce((sum, r) => sum + r.totalFen, 0),
)

function fmt(dt: string) {
  return new Date(dt).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN CONSOLE · PAYMENT ORDERS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} 个订单 · 已支付合计 ¥{{ yuan(paidTotal) }}</span>
      </div>
      <h1 class="sec-title">支付<em>订单</em></h1>
    </header>

    <p class="guide">
      全部用户的支付订单（含对公转账与从未发起在线支付的订单）：创建时间、支付完成时间、订单号、支付渠道交易号、金额与状态。
      在线支付成功由渠道回执（webhook）或主动对账自动确认：订单已支付、报名确认、成为会员并下发电子凭证；
      未支付订单 {{ 15 }} 分钟自动过期。
    </p>

    <div class="toolbar">
      <select v-model="providerFilter" class="status-select" aria-label="按渠道筛选">
        <option value="">全部渠道</option>
        <option value="alipay">支付宝</option>
        <option value="wechat">微信支付</option>
        <option value="mock">模拟支付</option>
      </select>
      <select v-model="statusFilter" class="status-select" aria-label="按订单状态筛选">
        <option value="">全部订单状态</option>
        <option value="paid">已支付</option>
        <option value="pending">待支付</option>
        <option value="reviewing">审核中</option>
        <option value="expired">已过期</option>
        <option value="failed">已失败</option>
        <option value="cancelled">已取消</option>
        <option value="refunded">已退款</option>
      </select>
    </div>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>创建 / 支付时间</th>
            <th>订单号 / 交易号</th>
            <th>参会人</th>
            <th>类型</th>
            <th>渠道</th>
            <th>金额</th>
            <th>订单 / 支付状态</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data?.rows ?? []" :key="row.orderId">
            <td class="cell-id">
              {{ fmt(row.orderCreatedAt) }}<br>
              <small v-if="row.paidAt" style="color: var(--grey); font-size: 11px;">支付于 {{ fmt(row.paidAt) }}</small>
            </td>
            <td>
              <span class="mono">{{ row.orderNo }}</span><br>
              <small v-if="row.providerTradeNo" class="mono" style="color: var(--grey); overflow-wrap: anywhere;">{{ row.providerTradeNo }}</small>
              <small v-else-if="row.providerPaymentNo" class="mono" style="color: var(--grey); overflow-wrap: anywhere;">{{ row.providerPaymentNo }}</small>
              <small v-else class="mono" style="color: var(--grey);">—</small>
            </td>
            <td class="cell-name">
              <strong>{{ row.fullName }}</strong>
              <small>{{ row.email }}</small>
              <small>{{ row.displayId }}</small>
            </td>
            <td><small style="color: var(--grey);">{{ row.typeName }}</small></td>
            <td>
              <span v-if="row.provider" class="badge">{{ providerZh[row.provider] ?? row.provider }}</span>
              <span v-else class="badge">对公 / 未发起</span>
            </td>
            <td>
              <span class="fee">¥{{ yuan(row.totalFen) }}</span>
              <small v-if="row.discountFen" style="display:block;color: var(--copper-deep);">−¥{{ yuan(row.discountFen) }}</small>
            </td>
            <td>
              <span class="badge" :class="{ ok: row.orderStatus === 'paid', pending: row.orderStatus === 'pending' || row.orderStatus === 'reviewing', rev: row.orderStatus === 'expired' || row.orderStatus === 'failed' }">
                {{ statusZh[row.orderStatus] ?? row.orderStatus }}
              </span>
              <small v-if="row.paymentStatus" style="color: var(--grey);"> · {{ statusZh[row.paymentStatus] ?? row.paymentStatus }}</small>
            </td>
          </tr>
          <tr v-if="!(data?.rows ?? []).length">
            <td colspan="7" style="text-align: center; padding: 32px 0; color: var(--grey);">暂无订单</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
