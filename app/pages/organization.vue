<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

definePageMeta({ layout: 'site' })
const { locale, t } = useI18n()
const info = computed(() => siteContent(locale.value).organizationContent)

useSeoMeta({ title: () => t('content.org.seoTitle') })
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="sec-head">
        <div class="sec-meta">
          <span class="sec-code">{{ info.code }}</span>
          <span class="sec-tag">{{ info.tag }}</span>
        </div>
        <h1 class="sec-title">{{ info.title }}</h1>
      </header>

      <section v-for="section in info.sections" :key="section.title" class="org-section">
        <h2 class="o-title">{{ section.title }}</h2>
        <ul
          class="o-list"
          :class="{
            people: section.kind === 'people',
            /* 无角色的纯名单（如组织委员会）内联排布，避免逐行竖排过长 */
            plain: !section.entries.some(entry => entry.role),
          }"
        >
          <li v-for="entry in section.entries" :key="section.title + (entry.role ?? '') + entry.name">
            <span v-if="entry.role" class="o-role">{{ entry.role }}</span>
            <span class="o-name">{{ entry.name }}</span>
            <span v-if="entry.note" class="o-note">{{ entry.note }}</span>
          </li>
        </ul>
      </section>

      <p class="page-note mono">
        {{ t('content.org.note') }}
      </p>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
}

.org-section {
  margin-bottom: clamp(40px, 6vw, 64px);
}

.o-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 14px;
  margin-bottom: 16px;
}

.o-list li {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 18px;
  border-top: 1px solid var(--hairline);
  padding: 12px 0;
}

.o-list li:first-child {
  border-top: none;
}

.o-role {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .1em;
  color: var(--grey);
  min-width: 96px;
}

.o-name {
  font-size: 16px;
  font-weight: 500;
}

.o-note {
  font-size: 13px;
  color: var(--grey);
}

/* 纯名单内联排布：姓名以分隔点相连，自动换行 */
.o-list.plain li {
  display: inline;
  border-top: none;
  padding: 6px 0;
  font-size: 15.5px;
  line-height: 2.1;
}

.o-list.plain li::after {
  content: '·';
  color: var(--copper-deep);
  margin: 0 12px 0 6px;
}

.o-list.plain li:last-child::after {
  content: none;
}

.page-note {
  font-size: 12px;
  color: var(--grey);
  border-top: 1px solid var(--hairline);
  padding-top: 16px;
}
</style>
