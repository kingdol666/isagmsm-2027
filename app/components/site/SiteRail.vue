<script setup lang="ts">
import { siteNav } from '#shared/content/site'

const activeId = ref('symposium')

onMounted(() => {
  if (!('IntersectionObserver' in window)) return
  const spy = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        activeId.value = entry.target.id
      }
    }
  }, { rootMargin: '-25% 0px -65% 0px' })

  for (const item of siteNav) {
    const el = document.getElementById(item.href.slice(1))
    if (el) spy.observe(el)
  }

  onUnmounted(() => spy.disconnect())
})
</script>

<template>
  <!-- LEFT INDEX RAIL — desktop (>=1024). Its right hairline is the page's
       continuous "extrusion line". -->
  <aside class="rail">
    <NuxtLink class="rail-brand" href="#symposium">
      <span class="rail-mark">PPS<i>·</i>26</span>
      <span class="rail-full">Polymer Processing Symposium</span>
    </NuxtLink>
    <div class="rail-auth">
      <AuthChip />
    </div>
    <nav class="rail-nav" aria-label="Section index">
      <a
        v-for="item in siteNav"
        :key="item.code"
        :href="item.href"
        :class="{ active: activeId === item.href.slice(1) }"
      >
        <i>{{ item.code }}</i>{{ item.label }}
      </a>
    </nav>
    <div class="rail-foot">
      <p><strong>15—17 OCT 2026</strong><br>HEFEI · CHINA</p>
    </div>
  </aside>
</template>

<style scoped>
.rail {
  display: none;
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--rail-w);
  z-index: 60;
  background: var(--paper);
  border-right: 1px solid var(--ink); /* THE continuous line */
  padding: 30px 26px 28px;
  flex-direction: column;
}

.rail-brand {
  display: block;
  margin-bottom: 44px;
}

.rail-mark {
  font-family: var(--serif);
  font-size: 30px;
  line-height: 1;
  letter-spacing: .01em;
  display: block;
}

.rail-mark i {
  font-style: normal;
  color: var(--copper-deep);
}

.rail-full {
  display: block;
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
  margin-top: 10px;
  line-height: 1.5;
}

.rail-auth {
  border-top: 1px solid var(--hairline);
  border-bottom: 1px solid var(--hairline);
  padding: 12px 0;
  margin-bottom: 26px;
}

.rail-auth :deep(.auth-chip) {
  flex-wrap: wrap;
  row-gap: 4px;
}

.rail-auth :deep(.chip-link.name) {
  max-width: 120px;
}

.rail-nav {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.rail-nav a {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 9px 0;
  position: relative;
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: .02em;
  color: var(--grey);
  transition: color .2s ease;
}

.rail-nav a i {
  font-style: normal;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .06em;
  color: var(--grey);
  transition: color .2s ease;
  width: 22px;
  flex: none;
}

.rail-nav a::before {
  content: "";
  position: absolute;
  left: -26px;
  top: 50%;
  width: 0;
  height: 8px;
  background: var(--copper);
  transition: width .2s ease;
}

.rail-nav a:hover {
  color: var(--ink);
}

.rail-nav a.active {
  color: var(--ink);
}

.rail-nav a.active i {
  color: var(--copper-deep);
}

.rail-nav a.active::before {
  width: 16px;
}

.rail-foot {
  border-top: 1px solid var(--hairline);
  padding-top: 16px;
}

.rail-foot p {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
  line-height: 1.9;
}

.rail-foot p strong {
  font-weight: 500;
  color: var(--ink);
}

@media (min-width: 1024px) {
  .rail {
    display: flex;
  }
}

@media (min-width: 1440px) {
  .rail {
    padding: 36px 30px 32px;
  }

  .rail-nav a {
    font-size: 14px;
  }
}
</style>
