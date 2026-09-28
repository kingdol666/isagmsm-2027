<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Payments · Admin' })

interface PaymentRow {
  id: string
  provider: string
  providerPaymentNo: string | null
  amountFen: number
  status: string
  createdAt: string
}

const { data, error } = await useFetch<{ rows: PaymentRow[] }>('/api/admin/payments')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

const columns = [
  { key: 'provider', label: 'Provider', width: '110px' },
  { key: 'providerPaymentNo', label: 'Reference', mono: true },
  { key: 'amount', label: 'Amount', width: '130px' },
  { key: 'status', label: 'Status', width: '110px' },
  { key: 'created', label: 'Created', mono: true, width: '120px' },
]
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · PAYMENTS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} LATEST</span>
      </div>
      <h1 class="sec-title">Payments</h1>
    </header>

    <p v-if="error && error.statusCode !== 401" class="state">Failed to load payments.</p>
    <AdminTable
      v-else
      :columns="columns"
      :rows="(data?.rows ?? []) as unknown as Array<Record<string, unknown>>"
      empty="No payments yet."
    >
      <template #providerPaymentNo="{ row }">{{ (row as unknown as PaymentRow).providerPaymentNo ?? '—' }}</template>
      <template #amount="{ row }">¥{{ yuan((row as unknown as PaymentRow).amountFen) }}</template>
      <template #status="{ row }">
        <span class="badge" :class="{ ok: (row as unknown as PaymentRow).status === 'paid' }">{{ (row as unknown as PaymentRow).status }}</span>
      </template>
      <template #created="{ row }">{{ new Date((row as unknown as PaymentRow).createdAt).toLocaleDateString('en-GB') }}</template>
    </AdminTable>
  </div>
</template>

<style scoped>
.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 4px 8px;
}

.badge.ok { border-color: var(--copper-deep); color: var(--copper-deep); }

.state {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 12px 0;
}
</style>
