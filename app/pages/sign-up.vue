<script setup lang="ts">
definePageMeta({ layout: 'flow' })
useSeoMeta({ title: 'Create account' })

const route = useRoute()
const redirectTo = computed(() => {
  const target = String(route.query.redirect ?? '/account')
  return target.startsWith('/') ? target : '/account'
})

const step = ref(0)
const email = ref('')
const fullName = ref('')
const code = ref('')
const password = ref('')
const devCode = ref('')
const hpWebsite = ref('') // 蜜罐：人类不可见，机器人填写即被拒绝
const error = ref('')
const busy = ref(false)
const cooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function startCooldown(seconds: number) {
  cooldown.value = seconds
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) {
      cooldown.value = 0
      if (cooldownTimer) clearInterval(cooldownTimer)
    }
  }, 1000)
}

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

async function sendCode() {
  busy.value = true
  error.value = ''
  try {
    const res = await $fetch<{ sent: boolean, devCode?: string }>('/api/auth/send-code', {
      method: 'POST',
      body: { email: email.value, purpose: 'signup' },
    })
    devCode.value = res.devCode ?? ''
    step.value = 1
    startCooldown(60)
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? 'Could not send the code.'
  }
  finally {
    busy.value = false
  }
}

async function resend() {
  await sendCode()
}

async function completeSignup() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/auth/register', {
      method: 'POST',
      body: { email: email.value, code: code.value, password: password.value, fullName: fullName.value, website: hpWebsite.value },
    })
    // refresh the cached auth state before navigating (middleware reads it)
    await useAuth().fetchUser()
    await navigateTo(redirectTo.value)
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? 'Sign-up failed.'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="signup">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ACCOUNT · SIGN-UP</span>
        <span class="sec-tag">EMAIL VERIFICATION</span>
      </div>
      <h1 class="sec-title">Create your account</h1>
    </header>

    <FlowSteps :steps="['Email', 'Verify & set password']" :current="step" />

    <!-- STEP 0 — email + send code -->
    <section v-if="step === 0" aria-label="Request verification code">
      <form class="form" @submit.prevent="sendCode">
        <label class="field">
          <span class="f-label mono">Email</span>
          <input v-model="email" type="email" name="email" autocomplete="email" inputmode="email" required>
        </label>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <button class="btn btn-solid" type="submit" :disabled="busy || !email">
          {{ busy ? 'Sending…' : 'Send verification code' }}
        </button>
      </form>
      <p class="note mono">Already have an account? <NuxtLink class="link" :href="`/login?redirect=${encodeURIComponent(redirectTo)}`">Sign in</NuxtLink></p>
    </section>

    <!-- STEP 1 — code + password + name -->
    <section v-else aria-label="Verify and set password">
      <p class="sent mono">Code sent to <strong>{{ email }}</strong></p>
      <p v-if="devCode" class="dev-code mono">DEV MODE — your code: <strong>{{ devCode }}</strong></p>
      <form class="form" @submit.prevent="completeSignup">
        <label class="field">
          <span class="f-label mono">6-digit code</span>
          <input v-model="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="code-input">
        </label>
        <label class="field">
          <span class="f-label mono">Your name *</span>
          <input v-model="fullName" type="text" name="fullName" autocomplete="name" required>
        </label>
        <label class="field">
          <span class="f-label mono">Password * (min 8 characters)</span>
          <input v-model="password" type="password" name="password" autocomplete="new-password" minlength="8" required>
        </label>
        <!-- 蜜罐：对人类不可见；自动机填写即被服务端拒绝（反垃圾注册） -->
        <div class="hp-field" aria-hidden="true">
          <label>Website<input v-model="hpWebsite" type="text" name="website" tabindex="-1" autocomplete="off"></label>
        </div>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <div class="actions">
          <button class="btn btn-solid" type="submit" :disabled="busy">Create account</button>
          <button class="btn btn-ghost" type="button" :disabled="cooldown > 0 || busy" @click="resend">
            {{ cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend code' }}
          </button>
        </div>
      </form>
    </section>
  </div>
</template>

<style scoped>
.signup { max-width: 520px; }

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

.code-input { letter-spacing: .4em; font-family: var(--mono); }

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg.bad { font-size: 13px; color: var(--copper-deep); }

.sent { font-size: 13px; color: var(--grey); padding: 6px 0 16px; }
.sent strong { color: var(--ink); }

.dev-code {
  font-size: 12.5px;
  color: var(--copper-deep);
  border: 1px dashed var(--copper-deep);
  padding: 10px 14px;
  margin-bottom: 16px;
}

.actions { display: flex; gap: 14px; flex-wrap: wrap; }

.note { margin-top: 24px; font-size: 12.5px; color: var(--grey); }

.link { color: var(--copper-deep); text-decoration: underline; }
</style>
