<script setup lang="ts">
import { registrationInfoContent, siteMeta } from '#shared/content/site'

interface OrderView {
  order: {
    id: string
    orderNo: string
    registrationId: string
    displayId: string
    fullName: string
    subtotalFen: number
    discountFen: number
    totalFen: number
    currency: string
    status: string
    reference: string | null
    claimedAt: string | null
    reviewNote: string | null
  }
  credentialToken: string | null
}

definePageMeta({ layout: 'flow' })

const route = useRoute()
const orderId = computed(() => String(route.params.id))

useSeoMeta({ title: '缴费 · 对公转账' })

const orderData = ref<OrderView | null>(null)
const loadError = ref('')
const reference = ref('')
const submitting = ref(false)
const actionMessage = ref('')

const bank = registrationInfoContent.bank

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function loadOrder() {
  try {
    orderData.value = await $fetch<OrderView>(`/api/orders/${orderId.value}`)
    if (orderData.value.order.status === 'paid' && orderData.value.credentialToken) {
      await navigateTo(`/credential/${orderData.value.credentialToken}`)
    }
  }
  catch {
    loadError.value = '订单不存在。'
  }
}

const remark = computed(() => {
  const { displayId, fullName } = orderData.value?.order ?? {}
  if (!displayId) return ''
  return `${displayId}-${fullName}`
})

async function submitClaim() {
  submitting.value = true
  actionMessage.value = ''
  try {
    await $fetch(`/api/orders/${orderId.value}/claim`, {
      method: 'POST',
      body: { reference: reference.value },
    })
    await loadOrder()
  }
  catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    actionMessage.value = err.data?.statusMessage ?? '提交失败，请稍后重试。'
  }
  finally {
    submitting.value = false
  }
}

let pollTimer: ReturnType<typeof setInterval> | null = null
function startPolling() {
  stopPolling()
  // 审核中轻轮询：会务组审批通过后自动跳转凭证页
  pollTimer = setInterval(async () => {
    try {
      const view = await $fetch<OrderView>(`/api/orders/${orderId.value}`)
      orderData.value = view
      if (view.order.status === 'paid' && view.credentialToken) {
        stopPolling()
        await navigateTo(`/credential/${view.credentialToken}`)
      }
    }
    catch { /* transient */ }
  }, 5000)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(stopPolling)

onMounted(loadOrder)

const orderStatus = computed(() => orderData.value?.order.status ?? 'loading')

watch(orderStatus, (status) => {
  if (status === 'reviewing') startPolling()
  else stopPolling()
}, { immediate: true })
</script>

<template>
  <div class="pay">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">{{ registrationInfoContent.code }} · PAYMENT</span>
        <span class="sec-tag">对公转账 · 会务组审核</span>
      </div>
      <h1 class="sec-title">缴纳注册费</h1>
    </header>

    <p v-if="loadError" class="state">{{ loadError }}</p>

    <template v-else-if="orderData">
      <!-- 订单摘要 -->
      <dl class="summary">
        <div class="row"><dt>参会 ID</dt><dd class="mono aid">{{ orderData.order.displayId }}</dd></div>
        <div class="row"><dt>订单号</dt><dd class="mono">{{ orderData.order.orderNo }}</dd></div>
        <div class="row"><dt>Subtotal</dt><dd>¥{{ yuan(orderData.order.subtotalFen) }}</dd></div>
        <div v-if="orderData.order.discountFen > 0" class="row">
          <dt>会前优惠</dt><dd class="discount">−¥{{ yuan(orderData.order.discountFen) }}</dd>
        </div>
        <div class="row total"><dt>应缴金额</dt><dd>¥{{ yuan(orderData.order.totalFen) }}</dd></div>
      </dl>

      <!-- 已支付 -->
      <section v-if="orderStatus === 'paid'" class="panel" aria-live="polite">
        <p class="panel-title ok">缴费已确认</p>
        <p class="state">正在打开您的电子凭证…</p>
      </section>

      <!-- 审核中 -->
      <section v-else-if="orderStatus === 'reviewing'" class="panel" aria-live="polite">
        <p class="panel-title ok">已提交 · 会务组审核中</p>
        <p class="state">会务组将核对银行转账记录（通常 1—2 个工作日）。审批通过后，本页自动跳转您的电子凭证（含现场签到二维码）。</p>
        <dl class="claim-info">
          <div class="c-row"><dt>提交的转账参考</dt><dd class="mono">{{ orderData.order.reference || '—' }}</dd></div>
          <div class="c-row"><dt>提交时间</dt><dd>{{ orderData.order.claimedAt ? new Date(orderData.order.claimedAt).toLocaleString('zh-CN') : '—' }}</dd></div>
        </dl>
        <p class="state small">如需补充信息，请联系会务组：{{ siteMeta.email }}。</p>
      </section>

      <!-- 待转账 -->
      <section v-else-if="orderStatus === 'pending'" class="panel" aria-label="对公转账信息">
        <p class="panel-title">第一步 · 对公转账</p>
        <div class="bank-box">
          <dl class="bank-grid">
            <div class="bank-row"><dt>开户名称</dt><dd>{{ bank.accountName }}</dd></div>
            <div class="bank-row"><dt>开户银行</dt><dd>{{ bank.bank }}</dd></div>
            <div class="bank-row"><dt>银行账号</dt><dd class="mono">{{ bank.accountNumber }}</dd></div>
          </dl>
          <p class="deadline mono">{{ bank.deadline }}</p>
        </div>

        <p class="panel-title second">第二步 · 转账附言必注</p>
        <div class="remark">
          <p class="rk-format mono">{{ remark }}</p>
          <p class="rk-note">转账时请在附言中注明「参会ID-姓名」，会务组据此核对到账记录。</p>
        </div>

        <p class="panel-title second">第三步 · 提交审核</p>
        <form class="claim" @submit.prevent="submitClaim">
          <label class="field">
            <span class="f-label mono">转账流水号 / 凭证号（选填）</span>
            <input v-model="reference" type="text" name="reference" autocomplete="off" placeholder="银行回单上的流水号">
          </label>
          <p v-if="actionMessage" class="msg bad mono">{{ actionMessage }}</p>
          <p v-if="orderData.order.reviewNote" class="msg bad mono">上次驳回原因：{{ orderData.order.reviewNote }}</p>
          <button class="btn btn-solid" type="submit" :disabled="submitting">
            {{ submitting ? '提交中…' : '我已完成转账，提交审核' }}
          </button>
        </form>

        <p class="state small">
          提交后会务组核对银行记录（1—2 个工作日），审批通过即下发电子凭证。发票在会议现场凭参会 ID 领取。
        </p>
      </section>

      <p v-else class="state">订单状态：{{ orderStatus }}。</p>
    </template>

    <p v-else class="state">正在加载订单…</p>
  </div>
</template>

<style scoped>
.summary {
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  margin-bottom: clamp(28px, 4vw, 44px);
}

.row {
  display: grid;
  grid-template-columns: minmax(140px, 260px) 1fr;
  gap: 16px;
  border-top: 1px solid var(--hairline);
  padding: 14px 0;
}

.row:first-child { border-top: none; }

.row dt {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--grey);
}

.row dd { font-size: 16px; overflow-wrap: anywhere; }

.row.total dd {
  font-family: var(--sans);
  font-weight: 600;
  font-size: clamp(1.5rem, 3vw, 2rem);
  color: var(--copper-deep);
}

.row .aid {
  font-size: clamp(1.1rem, 2.4vw, 1.5rem);
  color: var(--copper-deep);
  font-weight: 500;
}

.discount dd { color: var(--copper-deep); }

.panel {
  border-top: 1px solid var(--ink);
  padding-top: 14px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  margin: 22px 0 14px;
}

.panel-title.ok { color: var(--copper-deep); }

.panel-title.second {
  font-size: 13.5px;
  color: var(--grey);
}

.bank-box {
  border: 1px solid var(--ink);
  padding: clamp(18px, 3vw, 28px);
}

.bank-grid { border-top: 1px solid var(--hairline); }

.bank-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 14px;
  border-bottom: 1px solid var(--hairline);
  padding: 12px 0;
  align-items: baseline;
}

.bank-row dt {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
}

.bank-row dd {
  font-size: 15.5px;
  overflow-wrap: anywhere;
}

.deadline {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--grey);
  letter-spacing: .08em;
}

.remark {
  border: 1px dashed var(--copper-deep);
  padding: 16px 18px;
}

.rk-format {
  font-size: clamp(1.15rem, 2.6vw, 1.6rem);
  font-weight: 600;
  color: var(--copper-deep);
  overflow-wrap: anywhere;
}

.rk-note {
  margin-top: 10px;
  font-size: 13px;
  color: var(--grey);
  line-height: 1.7;
}

.claim { margin-top: 4px; }

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
  max-width: 460px;
}

.f-label {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--grey);
}

.field input {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 13px 14px;
  border-radius: 0;
}

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.claim .btn { margin-top: 16px; }

.msg.bad {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 6px 0;
}

.claim-info { border-top: 1px solid var(--hairline); margin-top: 16px; }

.c-row {
  display: grid;
  grid-template-columns: minmax(140px, 220px) 1fr;
  gap: 14px;
  border-bottom: 1px solid var(--hairline);
  padding: 11px 0;
  align-items: baseline;
}

.c-row dt {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
}

.c-row dd { font-size: 14.5px; overflow-wrap: anywhere; }

.state {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .04em;
  padding: 8px 0;
}

.state.small { color: var(--grey); font-size: 12px; line-height: 1.8; max-width: 58ch; }
</style>
