<script setup lang="ts">
definePageMeta({ layout: 'flow' })
useSeoMeta({ title: '登录' })

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
  if (msg.includes('Invalid') || msg.includes('invalid')) return '邮箱或密码不正确。'
  return msg || '登录失败，请稍后再试。'
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
        <span class="sec-tag">参会人登录</span>
      </div>
      <h1 class="sec-title">登<em>录</em></h1>
    </header>

    <form class="form" @submit.prevent="login">
      <label class="field">
        <span class="f-label mono">邮箱</span>
        <input v-model="email" type="email" name="email" autocomplete="email" required>
      </label>
      <label class="field">
        <span class="f-label mono">密码</span>
        <input v-model="password" type="password" name="password" autocomplete="current-password" required>
      </label>
      <p v-if="error" class="msg bad mono" role="alert">{{ error }}</p>
      <button class="btn btn-solid" type="submit" :disabled="busy">
        {{ busy ? '登录中…' : '登录' }}
      </button>
    </form>

    <p class="note mono">
      <NuxtLink class="link" :href="`/forgot-password?redirect=${encodeURIComponent(safeRedirect())}`">忘记密码？</NuxtLink>
    </p>
    <p class="note mono">
      还没有账号？
      <NuxtLink class="link accent" :href="`/sign-up?redirect=${encodeURIComponent(safeRedirect())}`">立即注册</NuxtLink>
      —— 只需一个邮箱和验证码。
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
