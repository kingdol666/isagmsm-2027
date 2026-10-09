<script setup lang="ts">
interface OrderRow {
  orderId: string
  orderNo: string
  displayId: string
  typeName: string
  subtotalFen: number
  discountFen: number
  totalFen: number
  currency: string
  orderStatus: string
  createdAt: string
  provider: string | null
  providerPaymentNo: string | null
  providerTradeNo: string | null
  payStatus: string | null
  paidAt: string | null
}

definePageMeta({ layout: 'flow', middleware: 'auth' })
const { t } = useI18n()

useSeoMeta({ title: () => t('account.orders.seoTitle') })

const { data, pending, error } = await useFetch<{ rows: OrderRow[] }>('/api/account/orders')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const orderZh: Record<string, string> = {
  pending: '待支付',
  reviewing: '审核中',
  paid: '已支付',
  failed: '已失败',
  expired: '已过期',
  cancelled: '已取消',
  refunded: '已退款',
}
const payZh: Record<string, string> = { ...orderZh }
const providerZh: Record<string, string> = { mock: '模拟支付', alipay: '支付宝', wechat: '微信支付' }

function fmt(dt: string) {
  return new Date(dt).toLocaleString('zh-CN', { hour12: false })
}

/** 未过期订单可直接继续支付；过期/失败的可重新生成订单 */
const payUrl = (row: OrderRow) => {
  if (row.orderStatus === 'pending') return `/payment/${row.orderId}`
  return null
}
</script>

<template>
  <div class="orders">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ACCOUNT · ORDERS</span>
        <span class="sec-tag mono">{{ data?.rows.length ?? 0 }} 条</span>
      </div>
      <h1 class="sec-title">{{ t('account.orders.titleA') }}<em>{{ t('account.orders.titleEm') }}</em></h1>
      <NuxtLink class="back" to="/account">{{ t('account.orders.back') }}</NuxtLink>
    </header>

    <p class="guide">{{ t('account.orders.guide') }}</p>

    <p v-if="pending" class="state">{{ t('account.orders.loading') }}</p>
    <p v-else-if="!data?.rows.length" class="state">{{ t('account.orders.empty') }}</p>

    <div v-else class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>{{ t('account.orders.col.time') }}</th>
            <th>{{ t('account.orders.col.order') }}</th>
            <th>{{ t('account.orders.col.type') }}</th>
            <th>{{ t('account.orders.col.amount') }}</th>
            <th>{{ t('account.orders.col.channel') }}</th>
            <th>{{ t('account.orders.col.status') }}</th>
            <th />
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data.rows" :key="row.orderId">
            <td class="mono">
              {{ fmt(row.createdAt) }}
              <small v-if="row.paidAt" class="sub">{{ t('account.orders.paidAt') }} {{ fmt(row.paidAt) }}</small>
            </td>
            <td>
              <span class="mono">{{ row.orderNo }}</span>
              <small class="sub mono">{{ row.providerTradeNo ?? row.providerPaymentNo ?? '—' }}</small>
            </td>
            <td>
              {{ row.typeName }}
              <small class="sub mono">{{ row.displayId }}</small>
            </td>
            <td>
              ¥{{ yuan(row.totalFen) }}
              <small v-if="row.discountFen" class="sub discount">−¥{{ yuan(row.discountFen) }}</small>
            </td>
            <td>{{ providerZh[row.provider ?? ''] ?? t('account.orders.noOnline') }}</td>
            <td>
              <span class="badge" :class="{ ok: row.orderStatus === 'paid', pending: row.orderStatus === 'pending' || row.orderStatus === 'reviewing' }">
                {{ orderZh[row.orderStatus] ?? row.orderStatus }}
              </span>
              <small v-if="row.payStatus" class="sub"> · {{ payZh[row.payStatus] ?? row.payStatus }}</small>
            </td>
            <td>
              <NuxtLink v-if="payUrl(row)" class="go" :to="payUrl(row)!">{{ t('account.orders.continue') }}</NuxtLink>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.orders { max-width: 1080px; margin: 0 auto; padding: 0 var(--pad); }

.sec-head { position: relative; margin-bottom: 14px; }

.sec-meta { display: flex; gap: 14px; align-items: center; }

.sec-code {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--grey);
}

.sec-tag { font-size: 11px; color: var(--grey); }

.sec-title {
  font-family: var(--serif);
  font-size: clamp(1.8rem, 4.4vw, 2.6rem);
  margin: 10px 0 18px;
}

.sec-title em { color: var(--copper-deep); font-style: normal; }

.back {
  position: absolute;
  right: 0;
  top: 0;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.guide { font-size: 13px; color: var(--grey); line-height: 1.9; max-width: 70ch; margin-bottom: 22px; }

.state { font-family: var(--mono); font-size: 13px; color: var(--grey); padding: 28px 0; }

.tbl-wrap { overflow-x: auto; border-top: 2px solid var(--ink); }

.tbl { width: 100%; border-collapse: collapse; font-size: 13.5px; }

.tbl th {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--grey);
  text-align: left;
  padding: 12px 12px 10px 0;
  border-bottom: 1px solid var(--hairline);
  white-space: nowrap;
}

.tbl td {
  padding: 13px 12px 13px 0;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
}

.mono { font-family: var(--mono); font-size: 12.5px; }

.sub { display: block; color: var(--grey); font-size: 11px; margin-top: 3px; overflow-wrap: anywhere; }

.sub.discount { color: var(--copper-deep); }

.badge {
  display: inline-block;
  border: 1px solid var(--ink);
  padding: 2px 8px;
  font-family: var(--mono);
  font-size: 11px;
  white-space: nowrap;
}

.badge.ok { background: var(--ink); color: var(--paper, #F7F6F2); }

.badge.pending { border-color: var(--copper-deep); color: var(--copper-deep); }

.go {
  font-family: var(--mono);
  font-size: 12px;
  color: var(--copper-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
}
</style>
