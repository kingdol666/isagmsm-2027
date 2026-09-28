<script setup lang="ts">
definePageMeta({ layout: 'admin' })

useSeoMeta({ title: 'Admin Dashboard' })

interface Dashboard {
  registrationsTotal: number
  confirmed: number
  submitted: number
  checkins: number
  revenueFen: number
}

interface CheckinRow {
  id: string
  method: string
  checkedInAt: string
  displayId: string
  fullName: string
}

const { data, error } = await useFetch<Dashboard>('/api/admin/dashboard')
const { data: checkinData } = await useFetch<{ rows: CheckinRow[] }>('/api/admin/checkins')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const yuan = computed(() => {
  const revenue = (data.value?.revenueFen ?? 0) / 100
  return revenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
})

const stats = computed(() => [
  { label: 'Registrations', value: data.value?.registrationsTotal ?? 0, code: 'D—01' },
  { label: 'Confirmed', value: data.value?.confirmed ?? 0, code: 'D—02' },
  { label: 'Checked-in', value: data.value?.checkins ?? 0, code: 'D—03' },
  { label: 'Revenue (CNY)', value: `¥${yuan.value}`, code: 'D—04' },
])
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · OVERVIEW</span>
        <span class="sec-tag">LIVE COUNTS</span>
      </div>
      <h1 class="sec-title">Dashboard</h1>
    </header>

    <p v-if="error" class="state">{{ error.statusCode === 401 ? 'Session expired — redirecting…' : 'Failed to load dashboard.' }}</p>

    <template v-else>
      <dl class="stat-grid">
        <div v-for="stat in stats" :key="stat.code" class="stat">
          <dt><span class="s-code mono">{{ stat.code }}</span>{{ stat.label }}</dt>
          <dd class="s-value">{{ stat.value }}</dd>
        </div>
      </dl>

      <section class="recent" aria-label="Latest check-ins">
        <header class="sec-head">
          <div class="sec-meta">
            <span class="sec-code">D—05 · ON SITE</span>
            <span class="sec-tag">LATEST CHECK-INS</span>
          </div>
          <h2 class="recent-title">Latest check-ins</h2>
        </header>
        <ul class="recent-list">
          <li v-for="row in (checkinData?.rows ?? []).slice(0, 6)" :key="row.id" class="recent-row">
            <span class="mono r-time">{{ new Date(row.checkedInAt).toLocaleString('en-GB') }}</span>
            <span class="r-name">{{ row.fullName }}</span>
            <span class="mono r-id">{{ row.displayId }}</span>
          </li>
          <li v-if="!(checkinData?.rows ?? []).length" class="recent-row mono r-empty">
            No check-ins yet — open /scan on a phone to start.
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.stat {
  padding: 22px 0;
  border-top: 1px solid var(--hairline);
}

.stat:first-child { border-top: none; }

.stat dt {
  display: flex;
  align-items: baseline;
  gap: 12px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.s-code { color: var(--copper-deep); }

.s-value {
  font-family: var(--serif);
  font-size: clamp(2.2rem, 4vw, 3rem);
  line-height: 1.05;
  margin-top: 10px;
}

.state {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--grey);
  padding: 14px 0;
}

.recent { margin-top: clamp(36px, 6vw, 64px); }

.recent-title {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  line-height: 1.05;
}

.recent-list { border-bottom: 1px solid var(--ink); }

.recent-row {
  display: grid;
  grid-template-columns: 190px 1fr auto;
  gap: 16px;
  align-items: baseline;
  border-top: 1px solid var(--hairline);
  padding: 12px 0;
  font-size: 14.5px;
}

.r-time { font-size: 12px; color: var(--grey); }
.r-id { font-size: 12.5px; color: var(--grey); }
.r-empty { color: var(--grey); font-size: 12.5px; }

@media (min-width: 768px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); column-gap: 32px; }
}

@media (min-width: 1024px) {
  .stat-grid { grid-template-columns: repeat(4, 1fr); }
  .stat { padding: 26px 28px 26px 0; }
  .stat + .stat { border-top: none; border-left: 1px solid var(--hairline); padding-left: 28px; }
}
</style>
