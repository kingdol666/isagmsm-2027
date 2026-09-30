<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

const { locale, t } = useI18n()
const content = computed(() => siteContent(locale.value))

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
  <header class="site-header">
    <!-- brand + auth row -->
    <div class="h-top">
      <NuxtLink class="h-brand" href="/">
        <span class="h-mark">{{ content.siteMeta.shortName }}</span>
        <span class="h-full">{{ content.siteMeta.fullName }}</span>
      </NuxtLink>
      <div class="h-auth">
        <LocaleToggle />
        <ClientOnly>
          <AuthChip />
          <template #fallback>
            <span class="mono" style="color: var(--paper-dim)">…</span>
          </template>
        </ClientOnly>
        <button
          class="menu-btn"
          type="button"
          :aria-expanded="open"
          aria-controls="nav-overlay"
          @click="toggle"
        >
          {{ open ? t('common.menu.close') : t('common.menu.open') }}
        </button>
      </div>
    </div>

    <!-- desktop nav row -->
    <nav class="h-nav" :aria-label="t('common.menu.navLabel')">
      <NuxtLink
        v-for="item in content.siteNav"
        :key="item.code"
        :to="item.href"
        class="h-nav-link"
      >
        {{ item.label }}
      </NuxtLink>
    </nav>

    <!-- mobile overlay -->
    <div class="nav-overlay" :class="{ 'is-open': open }" :aria-hidden="!open" :inert="!open">
      <nav class="ov-nav" :aria-label="t('common.menu.navLabel')">
        <NuxtLink
          v-for="item in content.siteNav"
          :key="item.code"
          :to="item.href"
          @click="close"
        >
          <i>{{ item.code }}</i>{{ item.label }}
        </NuxtLink>
      </nav>
      <div class="ov-foot">
        <NuxtLink class="btn btn-solid" href="/register" @click="close">{{ t('common.nav.registerNow') }}</NuxtLink>
        <p class="mono ov-note">{{ content.siteMeta.fullName }}<br>{{ content.siteMeta.dates }} · {{ content.siteMeta.location }}</p>
      </div>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: sticky;
  top: 0;
  z-index: 80;
  background: var(--ink);
  color: var(--paper);
  border-bottom: 3px solid var(--copper);
}

.h-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px var(--pad) 10px;
}

.h-brand {
  display: flex;
  align-items: baseline;
  gap: 14px;
  min-width: 0;
}

.h-mark {
  font-family: var(--serif);
  font-size: 28px;
  line-height: 1;
  color: var(--paper);
  letter-spacing: .02em;
}

.h-full {
  font-size: 13px;
  color: var(--paper-dim);
  letter-spacing: .04em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.h-auth {
  display: flex;
  align-items: baseline;
  gap: 14px;
  flex: none;
}

.h-auth :deep(.chip-link) { color: var(--paper-dim); }
.h-auth :deep(.chip-link:hover), .h-auth :deep(.chip-link.accent) { color: var(--copper-light); }
.h-auth :deep(.chip-link.name) { color: var(--paper); }

.menu-btn {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .14em;
  border: 1px solid var(--paper-hl);
  padding: 8px 14px;
  background: transparent;
  color: var(--paper);
  cursor: pointer;
  transition: border-color .2s, color .2s;
}

.menu-btn:hover {
  border-color: var(--copper-light);
  color: var(--copper-light);
}

/* desktop nav row */
.h-nav {
  display: none;
  gap: 0;
  padding: 0 var(--pad);
  overflow-x: auto;
}

.h-nav-link {
  font-size: 15.5px;
  font-weight: 500;
  letter-spacing: .06em;
  color: var(--paper-dim);
  padding: 10px 22px 14px;
  position: relative;
  white-space: nowrap;
  transition: color .2s ease;
}

.h-nav-link::after {
  content: "";
  position: absolute;
  left: 22px;
  right: 22px;
  bottom: 8px;
  height: 2px;
  background: var(--copper-light);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform .2s ease;
}

.h-nav-link:hover {
  color: var(--paper);
}

.h-nav-link:hover::after,
.h-nav-link.router-link-exact-active::after {
  transform: scaleX(1);
}

.h-nav-link.router-link-exact-active {
  color: var(--paper);
}

/* mobile overlay */
.nav-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  background: var(--ink);
  color: var(--paper);
  padding: 96px var(--pad) 40px;
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
  font-size: 1.5rem;
  font-weight: 500;
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
  .h-nav {
    display: flex;
  }

  .menu-btn {
    display: none;
  }
}

@media (max-width: 1023px) {
  .h-auth {
    margin-left: auto;
  }
}

@media (max-width: 767px) {
  .h-full {
    display: none;
  }

  .h-mark {
    font-size: 24px;
  }
}
</style>
