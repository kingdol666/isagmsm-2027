<script setup lang="ts">
interface OrderView {
  order: {
    id: string
    orderNo: string
    registrationId: string
    subtotalFen: number
    discountFen: number
    totalFen: number
    currency: string
    status: string
  }
  credentialToken: string | null
}

interface PaymentView {
  payment: {
    id: string
    provider: string
    status: string
    amountFen: number
    currency: string
    payload: { cashierUrl?: string, qrContent?: string } | null
  }
}

definePageMeta({ layout: 'flow' })

const route = useRoute()
const orderId = computed(() => String(route.params.id))

useSeoMeta({ title: 'Payment' })

const orderData = ref<OrderView | null>(null)
const payment = ref<PaymentView['payment'] | null>(null)
const loadError = ref('')
const creating = ref(false)
const actionMessage = ref('')
const providers = ref<Array<{ name: string, label: string, available: boolean }>>([])

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

async function loadProviders() {
  try {
    const res = await $fetch<{ providers: Array<{ name: string, label: string, available: boolean }> }>('/api/payments/providers')
    providers.value = res.providers
  }
  catch {
    providers.value = [{ name: 'mock', label: 'Mock Pay', available: true }]
  }
}

async function loadOrder() {
  try {
    orderData.value = await $fetch<OrderView>(`/api/orders/${orderId.value}`)
    // arriving at an already-paid order → straight to the credential
    if (orderData.value.order.status === 'paid' && orderData.value.credentialToken) {
      await navigateTo(`/credential/${orderData.value.credentialToken}`)
    }
  }
  catch {
    loadError.value = 'Order not found.'
  }
}

async function loadExistingPayment() {
  // Auto-start the (mock) payment so the page matches the spec layout:
  // amount → provider → QR → waiting. Server reuses the pending payment.
  if (orderData.value?.order.status === 'pending') {
    await createPayment('mock')
  }
}

async function createPayment(provider = 'mock') {
  creating.value = true
  actionMessage.value = ''
  try {
    const res = await $fetch<PaymentView>('/api/payments/create', {
      method: 'POST',
      body: { orderId: orderId.value, provider },
    })
    payment.value = res.payment
    startPolling()
  }
  catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    actionMessage.value = err.data?.statusMessage ?? 'Could not start payment.'
  }
  finally {
    creating.value = false
  }
}

function startPayment(provider: { name: string, available: boolean }) {
  if (!provider.available || creating.value) return
  createPayment(provider.name)
}

let pollTimer: ReturnType<typeof setInterval> | null = null
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    try {
      orderData.value = await $fetch<OrderView>(`/api/orders/${orderId.value}`)
      const status = orderData.value.order.status
      if (status === 'paid' && orderData.value.credentialToken) {
        stopPolling()
        await navigateTo(`/credential/${orderData.value.credentialToken}`)
      }
      else if (status === 'failed' || status === 'expired') {
        stopPolling()
      }
    }
    catch {
      /* transient poll errors are tolerated */
    }
  }, 2500)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

onUnmounted(stopPolling)

onMounted(async () => {
  await loadOrder()
  await loadProviders()
  await loadExistingPayment()
})

const orderStatus = computed(() => orderData.value?.order.status ?? 'loading')
</script>

<template>
  <div class="pay">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">PPS26—07 · PAYMENT</span>
        <span class="sec-tag">SECURE · SERVER-PRICED</span>
      </div>
      <h1 class="sec-title">Payment</h1>
    </header>

    <p v-if="loadError" class="state">{{ loadError }}</p>

    <template v-else-if="orderData">
      <!-- order summary -->
      <dl class="summary">
        <div class="row"><dt>Order</dt><dd class="mono">{{ orderData.order.orderNo }}</dd></div>
        <div class="row"><dt>Subtotal</dt><dd>¥{{ yuan(orderData.order.subtotalFen) }}</dd></div>
        <div v-if="orderData.order.discountFen > 0" class="row">
          <dt>Early-bird discount</dt><dd class="discount">−¥{{ yuan(orderData.order.discountFen) }}</dd>
        </div>
        <div class="row total"><dt>Total</dt><dd>¥{{ yuan(orderData.order.totalFen) }}</dd></div>
      </dl>

      <!-- PAID — redirecting -->
      <section v-if="orderStatus === 'paid'" class="panel" aria-live="polite">
        <p class="panel-title ok">Payment received</p>
        <p class="state">Confirmed — preparing your credential…</p>
      </section>

      <!-- FAILED / EXPIRED — retry -->
      <section v-else-if="orderStatus === 'failed' || orderStatus === 'expired'" class="panel" aria-live="polite">
        <p class="panel-title">Payment {{ orderStatus === 'failed' ? 'failed' : 'expired' }}</p>
        <p class="state">The payment attempt did not complete. You can start again.</p>
        <div class="actions">
          <button class="btn btn-solid" type="button" @click="createPayment('mock')">Retry payment</button>
        </div>
      </section>

      <!-- PENDING with an active payment -->
      <section v-else-if="payment" class="panel" aria-live="polite">
        <p class="panel-title">{{ payment.provider === 'mock' ? 'Mock payment' : payment.provider }} · scan to pay</p>
        <div class="pay-body">
          <div class="qr-box">
            <img
              :src="`/api/payments/${payment.id}/qr`"
              alt="Payment QR code"
              width="230"
              height="230"
              class="qr"
            >
            <p class="mono qr-note">{{ payment.payload?.qrContent }}</p>
          </div>
          <div class="pay-side">
            <p class="amount">¥{{ yuan(payment.amountFen) }}</p>
            <p class="state">Waiting for payment<span class="dots" aria-hidden="true"/></p>
            <NuxtLink class="btn btn-solid" :to="payment.payload?.cashierUrl ?? '#'">
              Open simulated cashier
            </NuxtLink>
            <p class="state small">The QR encodes the cashier URL. On a real device it opens the payment app; in this demo it opens our mock cashier. Status updates automatically.</p>
          </div>
        </div>
      </section>

      <!-- PENDING without a payment — choose provider -->
      <section v-else class="panel" aria-label="Choose payment method">
        <p class="panel-title">Choose payment method</p>
        <ul class="providers">
          <li v-for="provider in providers" :key="provider.name">
            <button
              class="provider"
              type="button"
              :disabled="provider.name !== 'mock' && !provider.available"
              @click="startPayment(provider)"
            >
              <span class="p-name">{{ provider.label }}</span>
              <span class="p-desc">
                {{ provider.name === 'mock'
                  ? 'Demo provider — simulated QR cashier, full webhook flow'
                  : provider.available
                    ? 'Configured and active'
                    : 'Awaiting merchant credentials — see PAYMENT.md' }}
              </span>
              <span class="p-tag mono">{{ provider.available ? 'ACTIVE' : 'OFF' }}</span>
            </button>
          </li>
        </ul>
        <p v-if="actionMessage" class="state error">{{ actionMessage }}</p>
      </section>
    </template>

    <p v-else class="state">Loading order…</p>
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
  text-transform: uppercase;
  color: var(--grey);
}

.row dd { font-size: 16px; }

.row.total dd {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  color: var(--copper-deep);
}

.discount dd { color: var(--copper-deep); }

.panel {
  border-top: 1px solid var(--ink);
  padding-top: 14px;
}

.panel-title {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .14em;
  text-transform: uppercase;
  margin-bottom: 18px;
}

.panel-title.ok { color: var(--copper-deep); }

.pay-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(24px, 4vw, 44px);
  align-items: start;
}

.qr-box {
  border: 1px solid var(--ink);
  background: var(--paper);
  padding: 14px;
  width: min(300px, 100%);
}

.qr { width: 100%; height: auto; display: block; }

.qr-note {
  font-size: 11px;
  color: var(--grey);
  margin-top: 10px;
  overflow-wrap: anywhere;
}

.pay-side { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }

.amount {
  font-family: var(--serif);
  font-size: clamp(2rem, 4vw, 2.8rem);
  line-height: 1;
}

.state {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  color: var(--ink);
}

.state.small { color: var(--grey); font-size: 12px; line-height: 1.8; max-width: 52ch; }
.state.error { color: var(--copper-deep); }

.dots::after {
  content: "";
  animation: dots 1.4s steps(4, end) infinite;
}

@keyframes dots {
  0% { content: ""; }
  25% { content: "."; }
  50% { content: ".."; }
  75% { content: "..."; }
}

.providers { border-bottom: 1px solid var(--ink); }

.provider {
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-areas: "name tag" "desc tag";
  gap: 4px 16px;
  width: 100%;
  text-align: left;
  border-top: 1px solid var(--hairline);
  padding: 18px 8px 18px 0;
  cursor: pointer;
  transition: background-color .2s ease;
}

.provider:hover:not(:disabled) { background: rgba(180, 95, 58, .055); }

.provider:disabled { opacity: .5; cursor: not-allowed; }

.p-name { grid-area: name; font-family: var(--serif); font-size: 1.4rem; }
.p-desc { grid-area: desc; font-size: 13.5px; color: var(--grey); }
.p-tag { grid-area: tag; align-self: center; font-size: 11px; letter-spacing: .14em; border: 1px solid var(--ink); padding: 5px 10px; }

.actions { display: flex; gap: 14px; margin-top: 18px; }

@media (min-width: 768px) {
  .pay-body { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); }
}
</style>
