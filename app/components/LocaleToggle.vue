<script setup lang="ts">
const { locale, toggleLocale, t } = useI18n()
</script>

<template>
  <button
    class="locale-toggle"
    type="button"
    :aria-label="locale === 'zh' ? t('common.toggle.toEn') : t('common.toggle.toZh')"
    @click="toggleLocale"
  >
    <span class="lt-item" :class="{ on: locale === 'zh' }">中文</span>
    <span class="lt-sep" aria-hidden="true">/</span>
    <span class="lt-item" :class="{ on: locale === 'en' }">EN</span>
  </button>
</template>

<style scoped>
/* 用 currentColor 适配深色页头与浅色 flow 页头两种上下文 */
.locale-toggle {
  display: inline-flex;
  align-items: baseline;
  gap: 5px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .08em;
  background: none;
  border: 1px solid currentColor;
  padding: 7px 11px;
  color: inherit;
  cursor: pointer;
  opacity: .75;
  transition: opacity .2s ease, border-color .2s ease;
}

.locale-toggle:hover {
  opacity: 1;
}

.lt-item {
  opacity: .45;
  transition: opacity .2s ease;
}

.lt-item.on {
  opacity: 1;
}

.lt-sep {
  opacity: .35;
}
</style>
