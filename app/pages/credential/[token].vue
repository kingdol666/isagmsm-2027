<script setup lang="ts">
interface CredentialResponse {
  credential: {
    credentialId: string
    token: string
    status: string
    issuedAt: string
    registration: {
      id: string
      displayId: string
      fullName: string
      email: string
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

useSeoMeta({ title: () => t('credential.seoTitle') })

const { data, error } = await useFetch<CredentialResponse>(`/api/credentials/${token.value}`)
const credential = computed(() => data.value?.credential)

function printPage() {
  if (import.meta.client) window.print()
}
</script>

<template>
  <div class="cred">
    <p v-if="error" class="state">{{ t('credential.notFound') }}</p>

    <template v-else-if="credential">
      <header class="sec-head">
        <div class="sec-meta">
          <span class="sec-code">{{ t('credential.secCode') }}</span>
          <span class="sec-tag">ACADEMIC EVENT PASS</span>
        </div>
        <h1 class="sec-title">
          <template v-if="credential.checkedInAt">{{ t('credential.titleCheckedInA') }}<em>{{ t('credential.titleCheckedInEm') }}</em></template>
          <template v-else>{{ t('credential.titleConfirmedA') }}<em>{{ t('credential.titleConfirmedEm') }}</em></template>
        </h1>
      </header>

      <!-- the pass -->
      <article class="pass" :aria-label="t('credential.ariaPass')">
        <header class="pass-top">
          <div>
            <p class="pass-mark">ISAGMSM<i>·</i>27</p>
            <p class="pass-event">{{ t('credential.passEvent') }}</p>
          </div>
          <p class="pass-status" :class="{ ok: credential.status === 'active' }">
            {{ credential.status === 'active' ? t('credential.statusValid') : t('credential.statusRevoked') }}
          </p>
        </header>

        <div class="pass-body">
          <div class="pass-who">
            <p class="label">{{ t('credential.holder') }}</p>
            <p class="name">{{ credential.registration.fullName }}</p>
            <p class="aff">{{ credential.registration.affiliation }}</p>
            <p class="country">{{ credential.registration.country }}</p>

            <dl class="facts">
              <div class="fact">
                <dt>{{ t('credential.typeLabel') }}</dt>
                <dd>{{ credential.type.name }}</dd>
              </div>
              <div class="fact">
                <dt>{{ t('credential.participantId') }}</dt>
                <dd class="mono">{{ credential.registration.displayId }}</dd>
              </div>
              <div class="fact">
                <dt>{{ t('credential.checkinStatusLabel') }}</dt>
                <dd>
                  {{ credential.checkedInAt
                    ? t('credential.checkedInAt', { time: new Date(credential.checkedInAt).toLocaleString('en-GB') })
                    : t('credential.notCheckedIn') }}
                </dd>
              </div>
            </dl>
          </div>

          <figure class="pass-qr">
            <img
              :src="`/api/credentials/${token}/qr`"
              :alt="t('credential.qrAlt')"
              width="200"
              height="200"
            >
            <figcaption class="mono">{{ t('credential.qrCaption') }}</figcaption>
          </figure>
        </div>

        <footer class="pass-foot">
          <div class="strata" aria-hidden="true"><span /><span /><span /><span /><span /></div>
          <p class="mono pass-note">24—26 APRIL 2027 · HEFEI · CHINA · PERSONAL &amp; NON-TRANSFERABLE</p>
        </footer>
      </article>

      <div class="actions">
        <a class="btn btn-solid" :href="`/api/credentials/${token}/pdf`" download>{{ t('credential.downloadPdf') }}</a>
        <NuxtLink class="btn btn-ghost" :to="`/verify/${token}`">{{ t('credential.verifyCred') }}</NuxtLink>
        <button class="btn btn-ghost" type="button" @click="printPage">{{ t('credential.print') }}</button>
      </div>

      <p class="state small">{{ t('credential.keepSafe', { email: credential.registration.email }) }}</p>
    </template>

    <p v-else class="state">{{ t('credential.loading') }}</p>
  </div>
</template>

<style scoped>
.pass {
  border: 1px solid var(--ink);
  background: var(--paper);
  max-width: 760px;
  margin-inline: auto;
}

.pass-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 22px 26px;
  border-bottom: 1px solid var(--ink);
}

.pass-mark {
  font-family: var(--serif);
  font-size: 30px;
  line-height: 1;
}

.pass-mark i { font-style: normal; color: var(--copper-deep); }

.pass-event {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .14em;
  color: var(--grey);
  margin-top: 8px;
}

.pass-status {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .14em;
  border: 1px solid var(--ink);
  padding: 6px 12px;
}

.pass-status.ok {
  border-color: var(--copper-deep);
  color: var(--copper-deep);
}

.pass-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 26px;
  padding: 26px;
}

.label {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.name {
  font-family: var(--serif);
  font-size: clamp(1.9rem, 4vw, 2.6rem);
  line-height: 1.05;
  margin-top: 8px;
}

.aff { font-size: 15.5px; margin-top: 8px; }
.country { font-size: 14px; color: var(--grey); margin-top: 2px; }

.facts { margin-top: 22px; border-top: 1px solid var(--hairline); }

.fact {
  display: grid;
  grid-template-columns: minmax(120px, 170px) 1fr;
  gap: 12px;
  border-bottom: 1px solid var(--hairline);
  padding: 11px 0;
}

.fact dt {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
}

.fact dd { font-size: 14.5px; }

.pass-qr {
  justify-self: start;
  border: 1px solid var(--ink);
  padding: 12px;
  width: fit-content;
}

.pass-qr img { width: 200px; height: 200px; display: block; }

.pass-qr figcaption {
  font-size: 11px;
  letter-spacing: .16em;
  color: var(--grey);
  text-align: center;
  margin-top: 10px;
}

.pass-foot { padding: 0 26px 22px; }

.pass-note {
  font-size: 10.5px;
  letter-spacing: .12em;
  color: var(--grey);
  margin-top: 12px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: clamp(24px, 4vw, 36px);
}

.state {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  padding: 10px 0;
}

.state.small { color: var(--grey); font-size: 12px; line-height: 1.8; max-width: 60ch; }

@media (min-width: 768px) {
  .pass-body { grid-template-columns: minmax(0, 7fr) minmax(0, 4fr); }
}
</style>
