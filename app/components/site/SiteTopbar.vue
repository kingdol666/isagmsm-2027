<script setup lang="ts">
import { siteNav } from '#shared/content/site'

const open = ref(false)

function toggle() {
  open.value = !open.value
}

function close() {
  open.value = false
}

watch(open, value => {
  if (import.meta.client) {
    document.body.classList.toggle('nav-open', value)
  }
})

onUnmounted(close)
</script>

<template>
  <header class="topbar">
    <NuxtLink class="topbar-brand" href="#symposium">PPS<i>·</i>26</NuxtLink>
    <span class="topbar-loc">HEFEI · 15—17 OCT 2026</span>
    <ClientOnly>
      <AuthChip class="topbar-auth" />
      <template #fallback>
        <span class="topbar-auth mono" style="color: var(--grey)">…</span>
      </template>
    </ClientOnly>
    <button
      class="menu-btn"
      type="button"
      :aria-expanded="open"
      aria-controls="nav-overlay"
      @click="toggle"
    >
      {{ open ? 'Close' : 'Menu' }}
    </button>

    <div class="nav-overlay" :class="{ 'is-open': open }" :aria-hidden="!open" :inert="!open">
      <nav class="ov-nav" aria-label="Main navigation">
        <a
          v-for="item in siteNav"
          :key="item.code"
          :href="item.href"
          @click="close"
        >
          <i>{{ item.code }}</i>{{ item.label }}
        </a>
      </nav>
      <div class="ov-foot">
        <NuxtLink class="btn btn-solid" href="/register" @click="close">Register Now</NuxtLink>
        <p class="mono ov-note">
          POLYMER PROCESSING SYMPOSIUM 2026<br>15—17 OCTOBER · HEFEI · CHINA
        </p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  position: fixed;
  inset: 0 0 auto 0;
  height: 60px;
  z-index: 80;
  background: var(--paper);
  border-bottom: 1px solid var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-inline: var(--pad);
}

.topbar-brand {
  font-family: var(--serif);
  font-size: 24px;
  line-height: 1;
}

.topbar-brand i {
  font-style: normal;
  color: var(--copper-deep);
}

.topbar-loc {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
}

.topbar-auth {
  margin-left: auto;
}

.menu-btn {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  border: 1px solid var(--ink);
  padding: 9px 16px;
  transition: background-color .2s, color .2s;
}

.menu-btn:hover {
  background: var(--ink);
  color: var(--paper);
}

.nav-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: var(--ink);
  color: var(--paper);
  padding: 104px var(--pad) 40px;
  overflow: auto;
  transform: translateY(-102%);
  transition: transform .35s ease;
}

.nav-overlay.is-open {
  transform: translateY(0);
}

.ov-nav a {
  display: flex;
  align-items: baseline;
  gap: 18px;
  padding: 15px 0;
  border-bottom: 1px solid var(--paper-hl);
  font-family: var(--serif);
  font-size: 1.9rem;
  line-height: 1.1;
  transition: color .2s ease;
}

.ov-nav a i {
  font-style: normal;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--copper-light);
  width: 26px;
  flex: none;
}

.ov-nav a:hover {
  color: var(--copper-light);
}

.ov-foot {
  margin-top: 36px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  align-items: flex-start;
}

.ov-note {
  font-size: 12px;
  color: var(--paper-dim);
  letter-spacing: .12em;
  line-height: 1.8;
}

@media (min-width: 1024px) {
  .topbar {
    display: none;
  }
}

@media (max-width: 767px) {
  .topbar-loc { display: none; } /* keep room for auth + menu */
}

@media (max-width: 419px) {
  .topbar-auth :deep(.chip-link.name) { max-width: 70px; }
  .topbar-auth :deep(.sep) { display: none; }
  .topbar-auth :deep(.chip-link:not(.accent):not(.name):not(.as-button)) { display: none; }
}
</style>
