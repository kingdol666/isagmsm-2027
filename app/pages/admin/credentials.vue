<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: 'Credentials · Admin' })

interface CredentialRow {
  token: string
  status: string
  issuedAt: string
  displayId: string
  fullName: string
  affiliation: string
  typeName: string
  registrationStatus: string
}

const { data, error } = await useFetch<{ rows: CredentialRow[] }>('/api/admin/credentials')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const columns = [
  { key: 'displayId', label: 'Registration', mono: true, width: '130px' },
  { key: 'fullName', label: 'Participant', width: '170px' },
  { key: 'affiliation', label: 'Affiliation' },
  { key: 'typeName', label: 'Type', width: '130px' },
  { key: 'tokenPreviewLink', label: 'Credential', width: '120px' },
  { key: 'issued', label: 'Issued', mono: true, width: '120px' },
]
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · CREDENTIALS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} ISSUED</span>
      </div>
      <h1 class="sec-title">Credentials</h1>
    </header>

    <p v-if="error && error.statusCode !== 401" class="state">Failed to load credentials.</p>
    <AdminTable
      v-else
      :columns="columns"
      :rows="(data?.rows ?? []) as unknown as Array<Record<string, unknown>>"
      :row-key="row => (row as unknown as CredentialRow).token"
      empty="No credentials issued yet."
    >
      <template #tokenPreviewLink="{ row }">
        <NuxtLink class="cred-link" :to="`/credential/${(row as unknown as CredentialRow).token}`">Open pass</NuxtLink>
      </template>
      <template #issued="{ row }">{{ new Date((row as unknown as CredentialRow).issuedAt).toLocaleDateString('en-GB') }}</template>
    </AdminTable>
  </div>
</template>

<style scoped>
.cred-link {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .06em;
  color: var(--copper-deep);
  border-bottom: 1px solid transparent;
  transition: border-color .2s ease;
}

.cred-link:hover { border-color: var(--copper-deep); }

.state {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 12px 0;
}
</style>
