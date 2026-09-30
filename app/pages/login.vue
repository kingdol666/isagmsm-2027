<script setup lang="ts">
definePageMeta({ layout: 'flow' })
const { t } = useI18n()

useSeoMeta({ title: () => t('auth.login.seoTitle') })

const route = useRoute()

function safeRedirect() {
  const target = String(route.query.redirect ?? '/account')
  return target.startsWith('/') ? target : '/account'
}

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

function errorMessage(err: unknown): string {
  const e = err as { data?: { statusMessage?: string } }
  const msg = e.data?.statusMessage ?? ''
  if (msg.includes('Invalid') || msg.includes('invalid')) return t('auth.login.errorInvalid')
  return msg || t('auth.login.errorFallback')
}

async function login() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { email: email.value, password: password.value },
    })
    await useAuth().fetchUser()
    await navigateTo(safeRedirect())
  }
  catch (err: unknown) {
    error.value = errorMessage(err)
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ACCOUNT · SIGN-IN</span>
        <span class="sec-tag">{{ t('auth.login.tag') }}</span>
      </div>
      <h1 class="sec-title">{{ t('auth.login.titleA') }}<em>{{ t('auth.login.titleEm') }}</em></h1>
    </header>

    <form class="form" @submit.prevent="login">
      <label class="field">
        <span class="f-label mono">{{ t('auth.login.emailLabel') }}</span>
        <input v-model="email" type="email" name="email" autocomplete="email" required>
      </label>
      <label class="field">
        <span class="f-label mono">{{ t('auth.login.pwdLabel') }}</span>
        <input v-model="password" type="password" name="password" autocomplete="current-password" required>
      </label>
      <p v-if="error" class="msg bad mono" role="alert">{{ error }}</p>
      <button class="btn btn-solid" type="submit" :disabled="busy">
        {{ busy ? t('auth.login.submitting') : t('auth.login.submit') }}
      </button>
    </form>

    <p class="note mono">
      <NuxtLink class="link" :href="`/forgot-password?redirect=${encodeURIComponent(safeRedirect())}`">{{ t('auth.login.forgot') }}</NuxtLink>
    </p>
    <p class="note mono">
      {{ t('auth.login.noAccount') }}
      <NuxtLink class="link accent" :href="`/sign-up?redirect=${encodeURIComponent(safeRedirect())}`">{{ t('auth.login.registerNow') }}</NuxtLink>
      {{ t('auth.login.registerNote') }}
    </p>
  </div>
</template>

<style scoped>
.login { max-width: 520px; }

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

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg.bad { font-size: 13px; color: #A03A2A; }

.note { margin-top: 18px; font-size: 12.5px; color: var(--grey); }

.link { color: var(--copper-deep); text-decoration: underline; }
.link.accent { text-decoration: none; font-weight: 600; }
</style>
