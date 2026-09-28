<script setup lang="ts">
definePageMeta({ layout: 'flow' })

useSeoMeta({ title: 'Admin Login' })

const username = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function login() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/admin/login', {
      method: 'POST',
      body: { username: username.value, password: password.value },
    })
    await navigateTo('/admin')
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? 'Login failed.'
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
        <span class="sec-code">ADMIN · AUTH</span>
        <span class="sec-tag">STAFF &amp; ORGANISERS</span>
      </div>
      <h1 class="sec-title">Sign in</h1>
    </header>

    <form class="form" @submit.prevent="login">
      <label class="field">
        <span class="f-label">Username</span>
        <input v-model="username" type="text" name="username" autocomplete="username">
      </label>
      <label class="field">
        <span class="f-label">Password</span>
        <input v-model="password" type="password" name="password" autocomplete="current-password">
      </label>
      <p v-if="error" class="error">{{ error }}</p>
      <button class="btn btn-solid" type="submit" :disabled="busy">
        {{ busy ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>

    <p class="hint mono">Dev accounts — admin / pps26-admin · staff / pps26-staff</p>
  </div>
</template>

<style scoped>
.login { max-width: 460px; }

.form { display: flex; flex-direction: column; gap: 18px; }

.field { display: flex; flex-direction: column; gap: 7px; }

.f-label {
  font-family: var(--mono);
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
}

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.error {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
}

.hint {
  margin-top: 26px;
  font-size: 11.5px;
  color: var(--grey);
  letter-spacing: .06em;
}
</style>
