<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Check-ins · Admin' })

interface CheckinRow {
  id: string
  method: string
  checkedInAt: string
  displayId: string
  fullName: string
  affiliation: string
}

const { data, error } = await useFetch<{ rows: CheckinRow[] }>('/api/admin/checkins')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const columns = [
  { key: 'checked', label: 'Checked in at', mono: true, width: '190px' },
  { key: 'displayId', label: 'Registration', mono: true, width: '130px' },
  { key: 'fullName', label: 'Participant', width: '180px' },
  { key: 'affiliation', label: 'Affiliation' },
  { key: 'method', label: 'Method', width: '100px' },
]
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · CHECK-INS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} ON SITE</span>
      </div>
      <h1 class="sec-title">Check-ins</h1>
    </header>

    <p v-if="error && error.statusCode !== 401" class="state">Failed to load check-ins.</p>
    <AdminTable
      v-else
      :columns="columns"
      :rows="(data?.rows ?? []) as unknown as Array<Record<string, unknown>>"
      :row-key="row => (row as unknown as CheckinRow).id"
      empty="No check-ins yet — open /scan on a phone to start."
    >
      <template #checked="{ row }">{{ new Date((row as unknown as CheckinRow).checkedInAt).toLocaleString('en-GB') }}</template>
      <template #method="{ row }">{{ (row as unknown as CheckinRow).method }}</template>
    </AdminTable>
  </div>
</template>

<style scoped>
.state {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 12px 0;
}
</style>
