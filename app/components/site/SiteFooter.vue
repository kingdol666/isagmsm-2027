<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

const { locale, t } = useI18n()
const content = computed(() => siteContent(locale.value))
</script>

<template>
  <!-- COLOPHON — closes the page's continuous line. Sits inside the main
       content column (see layouts/site.vue) so the fixed rail never covers it. -->
  <footer id="colophon" class="colophon">
    <div class="wrap">
      <p class="f-mark">ISAGMSM<span>{{ content.siteMeta.fullNameEn }}</span></p>
      <div class="f-grid">
        <div>
          <p class="f-line">{{ content.footerContent.line }}</p>
          <a class="f-mail" :href="`mailto:${content.siteMeta.email}`">{{ content.siteMeta.email }}</a>
          <p class="f-host">{{ content.footerContent.hostNote }}</p>
        </div>
        <nav class="f-nav" :aria-label="t('common.menu.footerNavLabel')">
          <NuxtLink v-for="item in content.siteNav" :key="item.code" :to="item.href">{{ item.label }}</NuxtLink>
        </nav>
      </div>
      <!-- utility row: participant + staff entry points -->
      <div class="f-util">
        <AuthChip />
        <span class="u-sep" aria-hidden="true">·</span>
        <NuxtLink class="u-link" href="/scan">Check-in scanner</NuxtLink>
        <span class="u-sep" aria-hidden="true">·</span>
        <a class="u-link" href="/api/health">System status</a>
      </div>
      <!-- the strata close the line: five layers, the melt strand among them -->
      <div class="f-strata strata" aria-hidden="true">
        <span /><span /><span /><span /><span />
      </div>
      <p class="f-copy">{{ content.siteMeta.copyright }}</p>
    </div>
  </footer>
</template>

<style scoped>
.colophon {
  background: var(--ink);
  color: var(--paper);
  padding-block: clamp(64px, 9vh, 104px) 40px;
}

.f-mark {
  font-family: var(--serif);
  font-size: clamp(2.6rem, 6vw, 4.6rem);
  line-height: 1;
  letter-spacing: -.01em;
}

.f-mark span {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--paper-dim);
  margin-top: 16px;
}

.f-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 36px;
  margin-top: clamp(36px, 5vw, 56px);
  padding-top: clamp(28px, 4vw, 40px);
  border-top: 1px solid var(--paper-hl);
}

.f-line {
  font-family: var(--mono);
  font-size: 13.5px;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.f-mail {
  display: inline-block;
  margin-top: 14px;
  font-family: var(--mono);
  font-size: 14px;
  letter-spacing: .04em;
  color: var(--copper-light);
  border-bottom: 1px solid transparent;
  transition: border-color .2s ease;
  overflow-wrap: anywhere;
}

.f-mail:hover {
  border-color: var(--copper-light);
}

.f-host {
  margin-top: 14px;
  font-size: 13.5px;
  color: var(--paper-dim);
}

.f-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 22px;
  align-content: start;
}

.f-nav a {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--paper-dim);
  padding: 6px 0;
  transition: color .2s ease;
}

.f-nav a:hover {
  color: var(--copper-light);
}

/* utility row — dark-context overrides for the shared AuthChip */
.f-util {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 14px;
  margin-top: clamp(28px, 4vw, 40px);
  padding-top: 18px;
  border-top: 1px solid var(--paper-hl);
}

.f-util :deep(.chip-link) {
  color: var(--paper-dim);
}

.f-util :deep(.chip-link:hover),
.f-util :deep(.chip-link.accent) {
  color: var(--copper-light);
}

.f-util :deep(.chip-link.name) {
  color: var(--paper);
}

.u-link {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--paper-dim);
  transition: color .2s ease;
}

.u-link:hover { color: var(--copper-light); }

.u-sep { color: var(--paper-hl); }

.f-strata {
  color: var(--paper);
  width: min(220px, 50%);
  margin-top: clamp(40px, 6vw, 64px);
}

.f-copy {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--paper-dim);
  margin-top: 18px;
}

@media (min-width: 768px) {
  .f-grid {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }
}
</style>
