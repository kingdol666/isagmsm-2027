<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

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
const { t, locale } = useI18n()

const route = useRoute()
const orderId = computed(() => String(route.params.id))

useSeoMeta({ title: () => t('payment.seoTitle') })

const orderData = ref<OrderView | null>(null)
const loadError = ref('')
const reference = ref('')
const submitting = ref(false)
const actionMessage = ref('')

const content = computed(() => siteContent(locale.value))
const info = computed(() => content.value.registrationInfoContent)

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function loadOrder() {
  try {
    orderData.value = await $fetch<OrderView>(`/api/orders/${orderId.value}`)
    if (orderData.value.order.status === 'paid' && orderData.value.credentialToken) {
      await navigateTo(`/credential/${orderData.value.credentialToken}`)
    }
  }
  catch {
    loadError.value = t('payment.notFound')
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
    actionMessage.value = err.data?.statusMessage ?? t('payment.claimFailed')
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
        <span class="sec-code">{{ info.code }} · PAYMENT</span>
        <span class="sec-tag">{{ t('payment.metaTag') }}</span>
      </div>
      <h1 class="sec-title">{{ t('payment.title') }}</h1>
    </header>

    <p v-if="loadError" class="state">{{ loadError }}</p>

    <template v-else-if="orderData">
      <!-- 订单摘要 -->
      <dl class="summary">
        <div class="row"><dt>{{ t('payment.summary.regId') }}</dt><dd class="mono aid">{{ orderData.order.displayId }}</dd></div>
        <div class="row"><dt>{{ t('payment.summary.orderNo') }}</dt><dd class="mono">{{ orderData.order.orderNo }}</dd></div>
        <div class="row"><dt>{{ t('payment.summary.subtotal') }}</dt><dd>¥{{ yuan(orderData.order.subtotalFen) }}</dd></div>
        <div v-if="orderData.order.discountFen > 0" class="row">
          <dt>{{ t('payment.summary.discount') }}</dt><dd class="discount">−¥{{ yuan(orderData.order.discountFen) }}</dd>
        </div>
        <div class="row total"><dt>{{ t('payment.summary.total') }}</dt><dd>¥{{ yuan(orderData.order.totalFen) }}</dd></div>
      </dl>

      <!-- 已支付 -->
      <section v-if="orderStatus === 'paid'" class="panel" aria-live="polite">
        <p class="panel-title ok">{{ t('payment.paid.title') }}</p>
        <p class="state">{{ t('payment.paid.opening') }}</p>
      </section>

      <!-- 审核中 -->
      <section v-else-if="orderStatus === 'reviewing'" class="panel" aria-live="polite">
        <p class="panel-title ok">{{ t('payment.reviewing.title') }}</p>
        <p class="state">{{ t('payment.reviewing.note') }}</p>
        <dl class="claim-info">
          <div class="c-row"><dt>{{ t('payment.reviewing.referenceLabel') }}</dt><dd class="mono">{{ orderData.order.reference || '—' }}</dd></div>
          <div class="c-row"><dt>{{ t('payment.reviewing.claimedAtLabel') }}</dt><dd>{{ orderData.order.claimedAt ? new Date(orderData.order.claimedAt).toLocaleString('zh-CN') : '—' }}</dd></div>
        </dl>
        <p class="state small">{{ t('payment.reviewing.contact', { email: content.siteMeta.email }) }}</p>
      </section>

      <!-- 待转账 -->
      <section v-else-if="orderStatus === 'pending'" class="panel" :aria-label="t('payment.pending.ariaLabel')">
        <p class="panel-title">{{ t('payment.pending.stepOne') }}</p>
        <div class="bank-box">
          <dl class="bank-grid">
            <div class="bank-row"><dt>{{ t('payment.pending.accountName') }}</dt><dd>{{ info.bank.accountName }}</dd></div>
            <div class="bank-row"><dt>{{ t('payment.pending.bankName') }}</dt><dd>{{ info.bank.bank }}</dd></div>
            <div class="bank-row"><dt>{{ t('payment.pending.accountNumber') }}</dt><dd class="mono">{{ info.bank.accountNumber }}</dd></div>
          </dl>
          <p class="deadline mono">{{ info.bank.deadline }}</p>
        </div>

        <p class="panel-title second">{{ t('payment.pending.stepTwo') }}</p>
        <div class="remark">
          <p class="rk-format mono">{{ remark }}</p>
          <p class="rk-note">{{ t('payment.pending.remarkNote') }}</p>
        </div>

        <p class="panel-title second">{{ t('payment.pending.stepThree') }}</p>
        <form class="claim" @submit.prevent="submitClaim">
          <label class="field">
            <span class="f-label mono">{{ t('payment.pending.referenceLabel') }}</span>
            <input v-model="reference" type="text" name="reference" autocomplete="off" :placeholder="t('payment.pending.referencePlaceholder')">
          </label>
          <p v-if="actionMessage" class="msg bad mono">{{ actionMessage }}</p>
          <p v-if="orderData.order.reviewNote" class="msg bad mono">{{ t('payment.pending.rejectNote', { note: orderData.order.reviewNote }) }}</p>
          <button class="btn btn-solid" type="submit" :disabled="submitting">
            {{ submitting ? t('payment.pending.submitting') : t('payment.pending.submit') }}
          </button>
        </form>

        <p class="state small">
          {{ t('payment.pending.note') }}
        </p>
      </section>

      <p v-else class="state">{{ t('payment.statusLine', { status: orderStatus }) }}</p>
    </template>

    <p v-else class="state">{{ t('payment.loading') }}</p>
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
