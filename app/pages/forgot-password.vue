<script setup lang="ts">
definePageMeta({ layout: 'flow' })
const { t } = useI18n()

useSeoMeta({ title: () => t('auth.forgot.seoTitle') })

const route = useRoute()

function safeRedirect() {
  const target = String(route.query.redirect ?? '/login')
  return target.startsWith('/') ? target : '/login'
}

const step = ref(0)
const email = ref('')
const code = ref('')
const password = ref('')
const devCode = ref('')
const error = ref('')
const busy = ref(false)
const done = ref(false)

async function sendResetCode() {
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ sent: boolean, devCode?: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: email.value },
    })
    devCode.value = res.devCode ?? ''
    step.value = 1
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? t('auth.forgot.sendFailed')
  }
  finally {
    busy.value = false
  }
}

async function resetPassword() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/reset-password', {
      method: 'POST',
      body: { email: email.value, code: code.value, password: password.value },
    })
    done.value = true
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? t('auth.forgot.resetFailed')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="forgot">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ACCOUNT · RECOVERY</span>
        <span class="sec-tag">{{ t('auth.forgot.tag') }}</span>
      </div>
      <h1 class="sec-title">{{ t('auth.forgot.titleA') }}<em>{{ t('auth.forgot.titleEm') }}</em></h1>
    </header>

    <!-- done -->
    <section v-if="done" class="pane" aria-live="polite">
      <p class="ok mono">{{ t('auth.forgot.done') }}</p>
      <NuxtLink class="btn btn-solid" :href="`/login?redirect=${encodeURIComponent(safeRedirect())}`">{{ t('auth.forgot.signInWithNew') }}</NuxtLink>
    </section>

    <!-- step 0: email -->
    <section v-else-if="step === 0" aria-label="Request reset code">
      <p class="note mono">{{ t('auth.forgot.intro') }}</p>
      <form class="form" @submit.prevent="sendResetCode">
        <label class="field">
          <span class="f-label mono">{{ t('auth.forgot.emailLabel') }}</span>
          <input v-model="email" type="email" name="email" autocomplete="email" required>
        </label>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <button class="btn btn-solid" type="submit" :disabled="busy || !email">
          {{ busy ? t('auth.forgot.sending') : t('auth.forgot.sendResetCode') }}
        </button>
      </form>
    </section>

    <!-- step 1: code + new password -->
    <section v-else aria-label="Set new password">
      <p class="note mono">{{ t('auth.forgot.sentTo') }} <strong>{{ email }}</strong></p>
      <p v-if="devCode" class="dev-code mono">DEV MODE — your reset code: <strong>{{ devCode }}</strong></p>
      <form class="form" @submit.prevent="resetPassword">
        <label class="field">
          <span class="f-label mono">{{ t('auth.forgot.codeLabel') }}</span>
          <input v-model="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="code-input">
        </label>
        <label class="field">
          <span class="f-label mono">{{ t('auth.forgot.newPwdLabel') }}</span>
          <input v-model="password" type="password" name="password" autocomplete="new-password" minlength="8" required>
        </label>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <button class="btn btn-solid" type="submit" :disabled="busy">{{ t('auth.forgot.update') }}</button>
      </form>
    </section>

    <p class="note mono"><NuxtLink class="link" href="/login">{{ t('auth.forgot.backToLogin') }}</NuxtLink></p>
  </div>
</template>

<style scoped>
.forgot { max-width: 520px; }

.pane { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }

.form { display: flex; flex-direction: column; gap: 18px; align-items: flex-start; }

.field { display: flex; flex-direction: column; gap: 7px; width: 100%; }

.f-label {
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--grey);
}

.field input {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 13px 14px;
  border-radius: 0;
  width: 100%;
}

.code-input { letter-spacing: .4em; font-family: var(--mono); }

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg.bad { font-size: 13px; color: #A03A2A; }

.ok { font-size: 14px; color: var(--ink); border: 1px solid var(--copper-deep); padding: 12px 16px; }

.dev-code {
  font-size: 12.5px;
  color: var(--copper-deep);
  border: 1px dashed var(--copper-deep);
  padding: 10px 14px;
  margin-bottom: 4px;
}

.note { margin-top: 18px; font-size: 12.5px; color: var(--grey); }

.link { color: var(--copper-deep); text-decoration: underline; }
</style>
