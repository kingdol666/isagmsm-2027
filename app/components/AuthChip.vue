<script setup lang="ts">
const { user, fetchUser, logout } = useAuth()

onMounted(() => {
  if (user.value === undefined) fetchUser()
})
</script>

<template>
  <div class="auth-chip">
    <template v-if="user === undefined">
      <span class="mono muted">…</span>
    </template>
    <template v-else-if="user">
      <NuxtLink class="chip-link name mono" href="/account">{{ user.fullName || user.email.split('@')[0] }}</NuxtLink>
      <span class="sep" aria-hidden="true">/</span>
      <NuxtLink class="chip-link mono" href="/account">Account</NuxtLink>
      <span class="sep" aria-hidden="true">/</span>
      <button class="chip-link mono as-button" type="button" @click="logout">Sign out</button>
    </template>
    <template v-else>
      <NuxtLink class="chip-link mono" href="/login">Sign in</NuxtLink>
      <span class="sep" aria-hidden="true">/</span>
      <NuxtLink class="chip-link mono accent" href="/sign-up">Register</NuxtLink>
    </template>
  </div>
</template>

<style scoped>
.auth-chip {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
  white-space: nowrap;
}

.chip-link {
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
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
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.as-button {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: var(--mono);
}

.sep { color: var(--hairline); }

.muted { color: var(--hairline); }
</style>
