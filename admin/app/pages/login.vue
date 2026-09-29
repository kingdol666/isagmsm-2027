<script setup lang="ts">
definePageMeta({ layout: false })

const username = ref('')
const password = ref('')
const busy = ref(false)
const error = ref('')

onMounted(async () => {
  const { user, fetchUser } = useConsoleAuth()
  const current = user.value === undefined ? await fetchUser() : user.value
  if (current) await navigateTo('/')
})

async function submit() {
  busy.value = true
  error.value = ''
  try {
    await $fetch('/api/login', { method: 'POST', body: { username: username.value, password: password.value } })
    const { fetchUser } = useConsoleAuth()
    await fetchUser()
    await navigateTo('/')
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    error.value = e.data?.statusMessage ?? '登录失败，请稍后再试。'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="login-shell">
    <form class="login-card" @submit.prevent="submit">
      <p class="login-mark">ISAGMSM<i>·</i>27</p>
      <p class="login-sub">组织委员会管理台 · 仅限管理员</p>

      <label class="login-field">
        <span>用户名</span>
        <input v-model="username" type="text" name="username" autocomplete="username">
      </label>
      <label class="login-field">
        <span>密码</span>
        <input v-model="password" type="password" name="password" autocomplete="current-password">
      </label>

      <p v-if="error" class="login-err" role="alert">{{ error }}</p>

      <button class="btn btn-solid login-btn" type="submit" :disabled="busy">
        {{ busy ? '登录中…' : '登录管理台' }}
      </button>

      <p class="login-note">
        本应用与会议官网相互独立（独立端口 / 独立会话 / 独立密钥），仅通过共享数据库管理数据。
        现场扫码请使用官网 /scan（staff 账号）。
      </p>
    </form>
  </div>
</template>
