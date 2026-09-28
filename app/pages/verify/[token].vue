<script setup lang="ts">
interface CredentialResponse {
  credential: {
    credentialId: string
    token: string
    status: string
    registration: {
      displayId: string
      fullName: string
      affiliation: string
      country: string
      status: string
    }
    type: { code: string, name: string }
    checkedInAt: string | null
  }
}

definePageMeta({ layout: 'flow' })

const route = useRoute()
const token = computed(() => String(route.params.token))

useSeoMeta({ title: 'Verify Credential' })

const { data, error } = await useFetch<CredentialResponse>(`/api/credentials/${token.value}`)
const credential = computed(() => data.value?.credential)

const state = computed(() => {
  if (error.value) return 'not_found'
  if (!credential.value) return 'loading'
  if (credential.value.status !== 'active') return 'revoked'
  if (credential.value.registration.status !== 'confirmed') return 'unconfirmed'
  return credential.value.checkedInAt ? 'checked_in' : 'valid'
})
</script>

<template>
  <div class="verify">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">CREDENTIAL VERIFICATION</span>
        <span class="sec-tag">PPS 2026</span>
      </div>
      <h1 class="sec-title">Verification <em>result</em></h1>
    </header>

    <p v-if="state === 'loading'" class="state">Verifying…</p>

    <section v-else-if="state === 'not_found'" class="verdict bad" aria-live="polite">
      <p class="v-title">Not found</p>
      <p class="v-body">This credential link or QR content does not match any PPS 2026 registration. Check the code and try again.</p>
    </section>

    <section v-else-if="state === 'revoked'" class="verdict bad" aria-live="polite">
      <p class="v-title">Revoked</p>
      <p class="v-body">This credential has been revoked by the organising committee. Contact the secretariat if you believe this is an error.</p>
    </section>

    <section v-else class="verdict good" aria-live="polite">
      <p class="v-title">{{ state === 'checked_in' ? 'Valid — checked in' : 'Valid credential' }}</p>
      <dl class="v-facts">
        <div class="v-row"><dt>Participant</dt><dd>{{ credential?.registration.fullName }}</dd></div>
        <div class="v-row"><dt>Affiliation</dt><dd>{{ credential?.registration.affiliation }}</dd></div>
        <div class="v-row"><dt>Registration ID</dt><dd class="mono">{{ credential?.registration.displayId }}</dd></div>
        <div class="v-row"><dt>Type</dt><dd>{{ credential?.type.name }}</dd></div>
        <div class="v-row">
          <dt>Check-in</dt>
          <dd>
            <template v-if="credential?.checkedInAt">
              Checked in {{ new Date(credential.checkedInAt).toLocaleString('en-GB') }}
            </template>
            <template v-else>Not yet checked in</template>
          </dd>
        </div>
      </dl>
      <p class="v-note">Verified live against the PPS 2026 registration system.</p>
    </section>
  </div>
</template>

<style scoped>
.verdict {
  border: 1px solid var(--ink);
  padding: clamp(24px, 4vw, 40px);
  max-width: 720px;
}

.verdict.good { border-color: var(--copper-deep); box-shadow: inset 3px 0 0 var(--copper); }

.v-title {
  font-family: var(--serif);
  font-size: clamp(1.8rem, 4vw, 2.5rem);
  line-height: 1.05;
}

.verdict.bad .v-title { color: var(--copper-deep); }

.v-body {
  margin-top: 14px;
  font-size: 15.5px;
  color: var(--grey);
  max-width: 52ch;
}

.v-facts { margin-top: 24px; border-top: 1px solid var(--hairline); }

.v-row {
  display: grid;
  grid-template-columns: minmax(120px, 180px) 1fr;
  gap: 12px;
  border-bottom: 1px solid var(--hairline);
  padding: 12px 0;
}

.v-row dt {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
}

.v-row dd { font-size: 15px; }

.v-note {
  margin-top: 18px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--grey);
}

.state {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  padding: 10px 0;
}
</style>
