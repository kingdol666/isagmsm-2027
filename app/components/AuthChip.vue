<script setup lang="ts">
const { user, credentialToken, fetchUser, logout } = useAuth()
const menuOpen = ref(false)

onMounted(() => {
  if (user.value === undefined) fetchUser()
})

function toggleMenu() {
  menuOpen.value = !menuOpen.value
}

function closeMenu() {
  menuOpen.value = false
}

async function signOut() {
  closeMenu()
  await logout()
}

const initial = computed(() => {
  const name = user.value?.fullName || user.value?.email || ''
  return name.slice(0, 1).toUpperCase()
})
</script>

<template>
  <div class="auth-chip">
    <template v-if="user === undefined">
      <span class="mono muted">…</span>
    </template>

    <!-- anonymous: sign in / register links -->
    <template v-else-if="!user">
      <NuxtLink class="chip-link mono" href="/login">登录</NuxtLink>
      <span class="sep" aria-hidden="true">/</span>
      <NuxtLink class="chip-link mono accent" href="/sign-up">注册</NuxtLink>
    </template>

    <!-- logged in: avatar + dropdown -->
    <template v-else>
      <button class="avatar-btn" type="button" :aria-expanded="menuOpen" @click="toggleMenu">
        <span class="avatar mono" aria-hidden="true">{{ initial }}</span>
        <span class="chip-link name mono">{{ user.fullName || user.email.split('@')[0] }}</span>
        <span class="caret" aria-hidden="true">▾</span>
      </button>

      <div v-if="menuOpen" class="menu-backdrop" @click="closeMenu" />
      <div v-if="menuOpen" class="menu" role="menu">
        <NuxtLink
          v-if="credentialToken"
          class="menu-item credential"
          role="menuitem"
          :href="`/credential/${credentialToken}`"
          @click="closeMenu"
        >
          <span class="mi-dot" aria-hidden="true" />我的会议凭证
        </NuxtLink>
        <NuxtLink class="menu-item" role="menuitem" href="/account" @click="closeMenu">个人中心</NuxtLink>
        <button class="menu-item as-button" role="menuitem" type="button" @click="signOut">退出登录</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.auth-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.muted { color: var(--paper-dim); }
.sep { color: var(--paper-hl); }

.avatar-btn {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
}

.avatar {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--copper);
  color: var(--paper);
  font-size: 14px;
  font-weight: 600;
  flex: none;
}

.chip-link {
  font-size: 12.5px;
  letter-spacing: .08em;
  color: var(--grey);
  text-decoration: none;
  transition: color .2s ease;
}

.chip-link:hover {
  color: var(--copper-deep);
}

.chip-link.accent {
  color: var(--copper-deep);
}

.chip-link.name {
  color: var(--ink);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.caret {
  font-size: 10px;
  color: var(--grey);
}

.menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 90;
}

.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 95;
  min-width: 190px;
  background: var(--paper);
  border: 1px solid var(--ink);
  box-shadow: 4px 4px 0 rgba(17, 17, 17, .12);
  display: flex;
  flex-direction: column;
  padding: 6px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink);
  padding: 11px 12px;
  text-decoration: none;
  text-align: left;
  background: none;
  border: none;
  cursor: pointer;
  transition: background-color .15s ease, color .15s ease;
}

.menu-item:hover {
  background: rgba(180, 95, 58, .08);
  color: var(--copper-deep);
}

.menu-item.credential {
  color: var(--copper-deep);
}

.mi-dot {
  width: 7px;
  height: 7px;
  background: var(--copper);
  flex: none;
}

.as-button {
  font-family: inherit;
}
</style>
