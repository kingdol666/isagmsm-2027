<script setup lang="ts">
import { accountProfileSchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'flow' })
useSeoMeta({ title: 'My account' })

interface MyRegistration {
  id: string
  displayId: string
  status: string
  createdAt: string
  typeName: string
  order: { id: string, orderNo: string, totalFen: number, currency: string, status: string } | null
  credentialToken: string | null
}

const { user } = useAuth()

/* profile */
const profileForm = reactive({
  fullName: '',
  englishName: '',
  phone: '',
  affiliation: '',
  department: '',
  position: '',
  country: '',
  dietary: '',
})
const profileLoaded = ref(false)
const profileSaved = ref(false)
const profileError = ref('')
const profileBusy = ref(false)

/* registrations */
const registrations = ref<MyRegistration[]>([])
const regsLoaded = ref(false)

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

onMounted(async () => {
  const { fetchUser } = useAuth()
  const current = await fetchUser()
  if (!current) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/account')}`)
    return
  }

  try {
    const res = await $fetch<{ profile: Record<string, string> | null, email: string, fullName: string | null }>('/api/account/profile')
    const p = res.profile
    profileForm.fullName = p?.fullName ?? res.fullName ?? ''
    profileForm.englishName = p?.englishName ?? ''
    profileForm.phone = p?.phone ?? ''
    profileForm.affiliation = p?.affiliation ?? ''
    profileForm.department = p?.department ?? ''
    profileForm.position = p?.position ?? ''
    profileForm.country = p?.country ?? ''
    profileForm.dietary = p?.dietary ?? ''
    profileLoaded.value = true
  }
  catch {
    profileError.value = 'Could not load your profile.'
    profileLoaded.value = true
  }

  try {
    const res = await $fetch<{ registrations: MyRegistration[] }>('/api/account/registrations')
    registrations.value = res.registrations
  }
  catch { /* list stays empty */ }
  regsLoaded.value = true
})

async function saveProfile() {
  profileBusy.value = true
  profileError.value = ''
  profileSaved.value = false
  try {
    const parsed = accountProfileSchema.safeParse({ ...profileForm })
    if (!parsed.success) {
      profileError.value = parsed.error.issues[0]?.message ?? 'Please check the form.'
      return
    }
    await $fetch('/api/account/profile', { method: 'PUT', body: parsed.data })
    profileSaved.value = true
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    profileError.value = e.data?.statusMessage ?? 'Could not save your profile.'
  }
  finally {
    profileBusy.value = false
  }
}
</script>

<template>
  <div class="account">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ACCOUNT</span>
        <span class="sec-tag mono">{{ user?.email }}</span>
      </div>
      <h1 class="sec-title">My <em>account</em></h1>
    </header>

    <!-- my registrations -->
    <section class="section" aria-label="My registrations">
      <h2 class="s-title">My registrations</h2>
      <ul v-if="registrations.length" class="reg-list">
        <li v-for="reg in registrations" :key="reg.id" class="reg-row">
          <div class="reg-main">
            <span class="mono reg-id">{{ reg.displayId }}</span>
            <span class="reg-type">{{ reg.typeName }}</span>
            <span class="badge" :class="{ ok: reg.status === 'confirmed' }">{{ reg.status }}</span>
          </div>
          <div class="reg-sub">
            <span class="mono">{{ new Date(reg.createdAt).toLocaleDateString('en-GB') }}</span>
            <span v-if="reg.order" class="mono">Order {{ reg.order.orderNo }} · ¥{{ yuan(reg.order.totalFen) }}</span>
            <span class="badge pay" :class="{ ok: reg.order?.status === 'paid' }">
              {{ reg.order ? `Payment: ${reg.order.status}` : 'No order yet' }}
            </span>
          </div>
          <div class="reg-actions">
            <NuxtLink
              v-if="reg.order && reg.order.status === 'pending'"
              class="btn btn-solid"
              :to="`/payment/${reg.order.id}`"
            >Complete payment</NuxtLink>
            <NuxtLink
              v-if="reg.credentialToken"
              class="btn btn-ghost"
              :to="`/credential/${reg.credentialToken}`"
            >View credential</NuxtLink>
          </div>
        </li>
      </ul>
      <p v-else-if="regsLoaded" class="note mono">
        No registrations yet.
        <NuxtLink class="link" href="/register">Register for PPS 2026 →</NuxtLink>
      </p>
      <p v-else class="note mono">Loading your registrations…</p>
    </section>

    <!-- profile -->
    <section class="section" aria-label="Participant profile">
      <h2 class="s-title">Participant profile</h2>
      <p class="note mono">Completed once — pre-fills every conference registration.</p>
      <form v-if="profileLoaded" class="form" @submit.prevent="saveProfile">
        <div class="grid">
          <label class="field">
            <span class="f-label mono">Full name *</span>
            <input v-model="profileForm.fullName" type="text" autocomplete="name">
          </label>
          <label class="field">
            <span class="f-label mono">English name</span>
            <input v-model="profileForm.englishName" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">Phone</span>
            <input v-model="profileForm.phone" type="tel" autocomplete="tel">
          </label>
          <label class="field">
            <span class="f-label mono">Country / region *</span>
            <input v-model="profileForm.country" type="text" autocomplete="country-name">
          </label>
          <label class="field wide">
            <span class="f-label mono">Affiliation *</span>
            <input v-model="profileForm.affiliation" type="text" autocomplete="organization">
          </label>
          <label class="field">
            <span class="f-label mono">Department</span>
            <input v-model="profileForm.department" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">Position</span>
            <input v-model="profileForm.position" type="text">
          </label>
          <label class="field wide">
            <span class="f-label mono">Dietary requirement</span>
            <input v-model="profileForm.dietary" type="text" placeholder="e.g. vegetarian">
          </label>
        </div>
        <p v-if="profileSaved" class="msg ok mono">Profile saved.</p>
        <p v-if="profileError" class="msg bad mono">{{ profileError }}</p>
        <button class="btn btn-solid" type="submit" :disabled="profileBusy">
          {{ profileBusy ? 'Saving…' : 'Save profile' }}
        </button>
      </form>
      <p v-else class="note mono">Loading profile…</p>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: clamp(36px, 6vw, 60px); }

.s-title {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.5rem, 2.6vw, 2rem);
  margin-bottom: 20px;
}

.reg-list { border-bottom: 1px solid var(--ink); }

.reg-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  border-top: 1px solid var(--hairline);
  padding: 18px 0;
}

.reg-main { display: flex; flex-wrap: wrap; align-items: baseline; gap: 14px; }
.reg-id { font-size: 13px; color: var(--copper-deep); letter-spacing: .08em; }
.reg-type { font-family: var(--serif); font-size: 1.4rem; }

.reg-sub { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 12.5px; color: var(--grey); }

.reg-actions { display: flex; flex-wrap: wrap; gap: 12px; }

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

.form { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }

.grid { display: grid; grid-template-columns: 1fr; gap: 18px 24px; width: 100%; }
.field { display: flex; flex-direction: column; gap: 7px; width: 100%; }
.field.wide { grid-column: 1 / -1; }

.f-label {
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.field input {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 12px 14px;
  border-radius: 0;
  width: 100%;
}

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg.ok { font-size: 13px; color: var(--ink); border: 1px solid var(--copper-deep); padding: 8px 14px; }
.msg.bad { font-size: 13px; color: var(--copper-deep); }

.note { font-size: 12.5px; color: var(--grey); padding: 6px 0; }

.link { color: var(--copper-deep); text-decoration: underline; }

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .reg-row { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: center; }
  .reg-actions { grid-column: 1 / -1; }
}
</style>
