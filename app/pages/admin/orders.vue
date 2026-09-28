<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Orders · Admin' })

interface OrderRow {
  id: string
  orderNo: string
  registrationId: string
  totalFen: number
  currency: string
  status: string
  createdAt: string
}

const { data, error } = await useFetch<{ rows: OrderRow[] }>('/api/admin/orders')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

const columns = [
  { key: 'orderNo', label: 'Order ID', mono: true, width: '170px' },
  { key: 'registrationId', label: 'Registration', mono: true },
  { key: 'total', label: 'Amount', width: '130px' },
  { key: 'status', label: 'Status', width: '110px' },
  { key: 'created', label: 'Created', mono: true, width: '120px' },
]
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · ORDERS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} LATEST</span>
      </div>
      <h1 class="sec-title">Orders</h1>
    </header>

    <p v-if="error && error.statusCode !== 401" class="state">Failed to load orders.</p>
    <AdminTable
      v-else
      :columns="columns"
      :rows="(data?.rows ?? []) as unknown as Array<Record<string, unknown>>"
      empty="No orders yet."
    >
      <template #registrationId="{ row }">{{ (row as unknown as OrderRow).registrationId.slice(0, 8) }}…</template>
      <template #total="{ row }">¥{{ yuan((row as unknown as OrderRow).totalFen) }}</template>
      <template #status="{ row }">
        <span class="badge" :class="{ ok: (row as unknown as OrderRow).status === 'paid' }">{{ (row as unknown as OrderRow).status }}</span>
      </template>
      <template #created="{ row }">{{ new Date((row as unknown as OrderRow).createdAt).toLocaleDateString('en-GB') }}</template>
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
