<script setup lang="ts">
definePageMeta({ layout: 'flow' })
useSeoMeta({ title: 'Sign in' })

const route = useRoute()

function safeRedirect() {
  const target = String(route.query.redirect ?? '/account')
  return target.startsWith('/') ? target : '/account'
}

const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

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
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? 'Sign-in failed.'
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
        <span class="sec-tag">PARTICIPANTS</span>
      </div>
      <h1 class="sec-title">Sign in</h1>
    </header>

    <form class="form" @submit.prevent="login">
      <label class="field">
        <span class="f-label mono">Email</span>
        <input v-model="email" type="email" name="email" autocomplete="email" required>
      </label>
      <label class="field">
        <span class="f-label mono">Password</span>
        <input v-model="password" type="password" name="password" autocomplete="current-password" required>
      </label>
      <p v-if="error" class="msg bad mono">{{ error }}</p>
      <button class="btn btn-solid" type="submit" :disabled="busy">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <p class="note mono">
      <NuxtLink class="link" :href="`/forgot-password?redirect=${encodeURIComponent(safeRedirect())}`">Forgot your password?</NuxtLink>
    </p>
    <p class="note mono">
      No account yet?
      <NuxtLink class="link" :href="`/sign-up?redirect=${encodeURIComponent(safeRedirect())}`">Create one</NuxtLink>
      — it takes an email and a verification code.
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
  text-transform: uppercase;
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

.msg.bad { font-size: 13px; color: var(--copper-deep); }

.note { margin-top: 18px; font-size: 12.5px; color: var(--grey); }

.link { color: var(--copper-deep); text-decoration: underline; }
</style>
