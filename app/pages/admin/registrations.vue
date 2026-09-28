<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Registrations · Admin' })

interface Row {
  registration: {
    id: string
    displayId: string
    fullName: string
    email: string
    affiliation: string
    status: string
    createdAt: string
  }
  type: { name: string }
  order: { totalFen: number, status: string } | null
}

const search = ref('')
const status = ref('')
const page = ref(1)
const pageSize = 20

const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  page: page.value,
  pageSize,
}))

const { data, error, refresh } = await useFetch<{ rows: Row[], total: number, page: number, pageSize: number }>('/api/admin/registrations', { query })

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

watch([search, status], () => {
  page.value = 1
  refresh()
})

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / pageSize)))

const columns = [
  { key: 'displayId', label: 'ID', mono: true, width: '120px' },
  { key: 'fullName', label: 'Name', width: '150px' },
  { key: 'email', label: 'Email' },
  { key: 'affiliation', label: 'Affiliation' },
  { key: 'type', label: 'Type', width: '110px' },
  { key: 'status', label: 'Reg. status', width: '110px' },
  { key: 'payment', label: 'Payment', width: '150px' },
  { key: 'created', label: 'Created', mono: true, width: '100px' },
]
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · PARTICIPANTS</span>
        <span class="sec-tag">{{ data?.total ?? 0 }} RECORDS</span>
      </div>
      <h1 class="sec-title">Registrations</h1>
    </header>

    <div class="filters">
      <input v-model="search" type="search" class="filter-input" placeholder="Search name / email / affiliation / ID" aria-label="Search registrations">
      <select v-model="status" class="filter-select" aria-label="Filter by status">
        <option value="">All statuses</option>
        <option value="submitted">Submitted</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>

    <p v-if="error && error.statusCode !== 401" class="state">Failed to load registrations.</p>
    <AdminTable
      v-else
      :columns="columns"
      :rows="(data?.rows ?? []) as unknown as Array<Record<string, unknown>>"
      :row-key="(row) => String((row.registration as Row['registration']).id)"
      empty="No registrations match."
    >
      <template #displayId="{ row }">{{ (row.registration as Row['registration']).displayId }}</template>
      <template #fullName="{ row }">{{ (row.registration as Row['registration']).fullName }}</template>
      <template #email="{ row }">{{ (row.registration as Row['registration']).email }}</template>
      <template #affiliation="{ row }">{{ (row.registration as Row['registration']).affiliation }}</template>
      <template #type="{ row }">{{ (row.type as Row['type']).name }}</template>
      <template #status="{ row }">
        <span class="badge" :class="{ ok: (row.registration as Row['registration']).status === 'confirmed' }">
          {{ (row.registration as Row['registration']).status }}
        </span>
      </template>
      <template #payment="{ row }">
        <span v-if="row.order" class="badge" :class="{ ok: (row.order as NonNullable<Row['order']>).status === 'paid' }">
          {{ (row.order as NonNullable<Row['order']>).status }} · ¥{{ ((row.order as NonNullable<Row['order']>).totalFen / 100).toLocaleString('en-US') }}
        </span>
        <span v-else class="badge">no order</span>
      </template>
      <template #created="{ row }">
        {{ new Date((row.registration as Row['registration']).createdAt).toLocaleDateString('en-GB') }}
      </template>
    </AdminTable>

    <div v-if="totalPages > 1" class="pager">
      <button class="btn btn-ghost" type="button" :disabled="page <= 1" @click="page--; refresh()">← Prev</button>
      <span class="mono pager-note">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost" type="button" :disabled="page >= totalPages" @click="page++; refresh()">Next →</button>
    </div>
  </div>
</template>

<style scoped>
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-input,
.filter-select {
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 10px 12px;
  border-radius: 0;
}

.filter-input { flex: 1; min-width: 220px; }

.filter-input:focus,
.filter-select:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 4px 8px;
}

.badge.ok {
  border-color: var(--copper-deep);
  color: var(--copper-deep);
}

.pager {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 22px;
}

.pager-note { font-size: 12.5px; color: var(--grey); }

.state {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 12px 0;
}
</style>
