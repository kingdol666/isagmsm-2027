<script setup lang="ts">
interface PaymentView {
  payment: {
    id: string
    status: string
    amountFen: number
    currency: string
    payload: { orderNo?: string } | null
  }
}

definePageMeta({ layout: 'flow' })
const { t } = useI18n()

const route = useRoute()
const paymentId = computed(() => String(route.params.id))

useSeoMeta({ title: () => t('payment.mock.seoTitle') })

const { data, error, refresh } = await useFetch<PaymentView>(`/api/payments/${paymentId.value}`)
const busy = ref<'paid' | 'failed' | null>(null)
const resultMessage = ref('')

function goBack() {
  if (import.meta.client) window.history.back()
}

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

async function act(result: 'paid' | 'failed') {
  busy.value = result
  resultMessage.value = ''
  try {
    const res = await $fetch<{ duplicate?: boolean, status?: string }>('/api/payments/mock/cashier', {
      method: 'POST',
      body: { paymentId: paymentId.value, result },
    })
    resultMessage.value = res.duplicate
      ? t('payment.mock.alreadyProcessed')
      : t('payment.mock.simulated', { status: res.status ?? result })
    await refresh()
  }
  catch (error: unknown) {
    const err = error as { data?: { statusMessage?: string } }
    resultMessage.value = err.data?.statusMessage ?? t('payment.mock.actionFailed')
  }
  finally {
    busy.value = null
  }
}
</script>

<template>
  <div class="cashier">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">{{ t('payment.mock.code') }}</span>
        <span class="sec-tag">{{ t('payment.mock.tag') }}</span>
      </div>
      <h1 class="sec-title">{{ t('payment.mock.title') }}</h1>
    </header>

    <p v-if="error" class="state">{{ t('payment.mock.notFound') }}</p>

    <template v-else-if="data?.payment">
      <dl class="summary">
        <div class="row"><dt>{{ t('payment.mock.reference') }}</dt><dd class="mono">{{ data.payment.payload?.orderNo ?? data.payment.id }}</dd></div>
        <div class="row"><dt>{{ t('payment.mock.provider') }}</dt><dd class="mono">{{ t('payment.mock.providerName') }}</dd></div>
        <div class="row total"><dt>{{ t('payment.mock.amount') }}</dt><dd>¥{{ yuan(data.payment.amountFen) }}</dd></div>
      </dl>

      <p class="state small">{{ t('payment.mock.explainer') }}</p>

      <div v-if="data.payment.status === 'pending'" class="actions">
        <button class="btn btn-solid" type="button" :disabled="busy !== null" @click="act('paid')">
          {{ busy === 'paid' ? t('payment.mock.processing') : t('payment.mock.simulatePaid') }}
        </button>
        <button class="btn btn-ghost" type="button" :disabled="busy !== null" @click="act('failed')">
          {{ t('payment.mock.simulateFailed') }}
        </button>
      </div>

      <p v-else class="state done">{{ t('payment.mock.statusLine', { status: data.payment.status.toUpperCase() }) }}</p>

      <p v-if="resultMessage" class="state result">{{ resultMessage }}</p>

      <p class="state small back">
        {{ t('payment.mock.pollNote') }}
        <button class="link" type="button" @click="goBack">{{ t('payment.mock.back') }}</button>
      </p>
    </template>
  </div>
</template>

<style scoped>
.summary {
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
  margin-bottom: 22px;
}

.row {
  display: grid;
  grid-template-columns: minmax(120px, 220px) 1fr;
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

.row dd { font-size: 15px; overflow-wrap: anywhere; }

.row.total dd {
  font-family: var(--serif);
  font-size: clamp(1.8rem, 4vw, 2.4rem);
  color: var(--copper-deep);
}

.actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 22px; }

.state {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  padding: 8px 0;
}

.state.small { color: var(--grey); font-size: 12px; line-height: 1.8; max-width: 58ch; }
.state.done { color: var(--copper-deep); }
.state.result { color: var(--copper-deep); }

.link {
  font: inherit;
  color: var(--copper-deep);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  letter-spacing: inherit;
}
</style>
