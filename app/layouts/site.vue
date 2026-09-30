<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

const { locale, t } = useI18n()
const content = computed(() => siteContent(locale.value))
</script>

<template>
  <div>
    <SiteHeader />

    <!-- 重要日期横幅 — 参照学术会议官网形态 -->
    <div class="date-strip" role="note">
      <span class="ds-label mono">{{ t('common.datesBanner.label') }}</span>
      <span v-for="item in content.siteMeta.bannerDates" :key="item" class="ds-item">{{ item }}</span>
    </div>

    <!-- Footer lives INSIDE the main column so no fixed element can cover it. -->
    <div class="site-main">
      <slot />
      <SiteFooter />
    </div>
  </div>
</template>

<style scoped>
.date-strip {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 28px;
  padding: 12px var(--pad);
  background: var(--paper);
  border-bottom: 1px solid var(--hairline);
}

.ds-label {
  font-size: 13px;
  font-weight: 500;
  letter-spacing: .18em;
  color: var(--copper-deep);
}

.ds-item {
  font-size: 14px;
  font-weight: 500;
  color: var(--copper-deep);
  letter-spacing: .02em;
}

.site-main {
  min-height: 60vh;
}
</style>
