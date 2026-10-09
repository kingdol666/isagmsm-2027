<script setup lang="ts">
const route = useRoute()
const { user, fetchUser } = useConsoleAuth()

onMounted(() => {
  if (user.value === undefined) fetchUser()
})

async function signOut() {
  await $fetch('/api/logout', { method: 'POST' }).catch(() => {})
  await fetchUser()
  await navigateTo('/login')
}
</script>

<template>
  <div class="console">
    <header v-if="route.path !== '/login'" class="bar">
      <NuxtLink to="/" class="brand">ISAGMSM <span>管理台</span></NuxtLink>
      <nav class="nav" aria-label="管理台导航">
        <NuxtLink to="/">仪表盘</NuxtLink>
        <NuxtLink to="/participants">参会管理</NuxtLink>
        <NuxtLink to="/payments">支付记录</NuxtLink>
        <NuxtLink to="/users">用户管理</NuxtLink>
        <NuxtLink to="/approvals">缴费审批</NuxtLink>
        <NuxtLink to="/abstracts">稿件审稿</NuxtLink>
        <NuxtLink to="/backups">数据库备份</NuxtLink>
      </nav>
      <div class="who">
        <ClientOnly>
          <template v-if="user">
            <span class="mono who-name">{{ user.username }} · 管理员</span>
            <button class="exit" type="button" @click="signOut">退出</button>
          </template>
        </ClientOnly>
      </div>
    </header>
    <main class="main" :class="{ wrap: route.path !== '/login' }">
      <NuxtPage />
    </main>
  </div>
</template>

<style scoped>
.console {
  min-height: 100svh;
  background: var(--paper);
}

.bar {
  position: sticky;
  top: 0;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px var(--pad);
  background: var(--ink);
  color: var(--paper);
  border-bottom: 3px solid var(--copper);
}

.brand {
  font-family: var(--serif);
  font-size: 22px;
  color: var(--paper);
  white-space: nowrap;
  text-decoration: none;
}

.brand span {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--copper-light);
  margin-left: 8px;
}

.nav {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 18px;
  flex: 1;
}

.nav a {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .1em;
  color: rgba(247, 246, 242, .66);
  padding: 4px 0;
  text-decoration: none;
  transition: color .2s ease;
}

.nav a:hover,
.nav a.router-link-exact-active {
  color: var(--copper-light);
}

.who {
  display: flex;
  align-items: center;
  gap: 12px;
}

.who-name {
  font-size: 11.5px;
  color: rgba(247, 246, 242, .66);
}

.exit {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .12em;
  border: 1px solid rgba(247, 246, 242, .2);
  color: var(--paper);
  background: transparent;
  padding: 8px 14px;
  cursor: pointer;
  transition: border-color .2s ease, color .2s ease;
}

.exit:hover {
  border-color: var(--copper-light);
  color: var(--copper-light);
}

.main {
  padding-block: clamp(28px, 4vw, 48px);
}

@media (max-width: 767px) {
  .bar {
    flex-wrap: wrap;
    gap: 10px 16px;
  }
}
</style>
