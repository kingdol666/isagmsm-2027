<script setup lang="ts">
definePageMeta({ layout: 'flow' })
useSeoMeta({ title: '找回密码' })

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
    error.value = e.data?.statusMessage ?? '重置码发送失败，请稍后再试。'
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
    error.value = e.data?.statusMessage ?? '重置失败，请核对验证码后重试。'
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
        <span class="sec-tag">密码找回</span>
      </div>
      <h1 class="sec-title">找回<em>密码</em></h1>
    </header>

    <!-- done -->
    <section v-if="done" class="pane" aria-live="polite">
      <p class="ok mono">密码已更新 ✓</p>
      <NuxtLink class="btn btn-solid" :href="`/login?redirect=${encodeURIComponent(safeRedirect())}`">使用新密码登录</NuxtLink>
    </section>

    <!-- step 0: email -->
    <section v-else-if="step === 0" aria-label="Request reset code">
      <p class="note mono">输入注册邮箱，我们将发送 6 位重置码（10 分钟内有效）。</p>
      <form class="form" @submit.prevent="sendResetCode">
        <label class="field">
          <span class="f-label mono">邮箱</span>
          <input v-model="email" type="email" name="email" autocomplete="email" required>
        </label>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <button class="btn btn-solid" type="submit" :disabled="busy || !email">
          {{ busy ? '发送中…' : '发送重置码' }}
        </button>
      </form>
    </section>

    <!-- step 1: code + new password -->
    <section v-else aria-label="Set new password">
      <p class="note mono">重置码已发送至 <strong>{{ email }}</strong></p>
      <p v-if="devCode" class="dev-code mono">DEV MODE — your reset code: <strong>{{ devCode }}</strong></p>
      <form class="form" @submit.prevent="resetPassword">
        <label class="field">
          <span class="f-label mono">6 位重置码</span>
          <input v-model="code" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" class="code-input">
        </label>
        <label class="field">
          <span class="f-label mono">新密码 *（至少 8 位）</span>
          <input v-model="password" type="password" name="password" autocomplete="new-password" minlength="8" required>
        </label>
        <p v-if="error" class="msg bad mono">{{ error }}</p>
        <button class="btn btn-solid" type="submit" :disabled="busy">更新密码</button>
      </form>
    </section>

    <p class="note mono"><NuxtLink class="link" href="/login">返回登录</NuxtLink></p>
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
