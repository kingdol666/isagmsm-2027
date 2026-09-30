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

const { t } = useI18n()
const route = useRoute()
const token = computed(() => String(route.params.token))

useSeoMeta({ title: () => t('credential.verify.seoTitle') })

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
        <span class="sec-tag">ISAGMSM 2027</span>
      </div>
      <h1 class="sec-title">{{ t('credential.verify.titleA') }}<em>{{ t('credential.verify.titleEm') }}</em></h1>
    </header>

    <p v-if="state === 'loading'" class="state">{{ t('credential.verify.loading') }}</p>

    <section v-else-if="state === 'not_found'" class="verdict bad" aria-live="polite">
      <p class="v-title">{{ t('credential.verify.notFoundTitle') }}</p>
      <p class="v-body">{{ t('credential.verify.notFoundBody') }}</p>
    </section>

    <section v-else-if="state === 'revoked'" class="verdict bad" aria-live="polite">
      <p class="v-title">{{ t('credential.verify.revokedTitle') }}</p>
      <p class="v-body">{{ t('credential.verify.revokedBody') }}</p>
    </section>

    <section v-else class="verdict good" aria-live="polite">
      <p class="v-title">{{ state === 'checked_in' ? t('credential.verify.validCheckedInTitle') : t('credential.verify.validTitle') }}</p>
      <dl class="v-facts">
        <div class="v-row"><dt>{{ t('credential.verify.dtParticipant') }}</dt><dd>{{ credential?.registration.fullName }}</dd></div>
        <div class="v-row"><dt>{{ t('credential.verify.dtAffiliation') }}</dt><dd>{{ credential?.registration.affiliation }}</dd></div>
        <div class="v-row"><dt>{{ t('credential.verify.dtRegistrationId') }}</dt><dd class="mono">{{ credential?.registration.displayId }}</dd></div>
        <div class="v-row"><dt>{{ t('credential.verify.dtType') }}</dt><dd>{{ credential?.type.name }}</dd></div>
        <div class="v-row">
          <dt>{{ t('credential.verify.dtCheckin') }}</dt>
          <dd>
            <template v-if="credential?.checkedInAt">
              {{ t('credential.verify.checkedInAt', { time: new Date(credential.checkedInAt).toLocaleString('en-GB') }) }}
            </template>
            <template v-else>{{ t('credential.verify.notCheckedIn') }}</template>
          </dd>
        </div>
      </dl>
      <p class="v-note">{{ t('credential.verify.note') }}</p>
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
