<script setup lang="ts">
import { themesContent } from '#shared/content/site'
</script>

<template>
  <!-- 02 · RESEARCH THEMES — the index, not cards -->
  <section id="themes" class="sec">
    <div class="wrap">
      <SecHead :code="themesContent.code" :tag="themesContent.tag" :title="themesContent.title" :title-em="themesContent.titleEm" />
      <!-- Editorial index — a table of contents, not a card wall.
           Numbers read as batch codes on a process sheet. -->
      <ol class="theme-index">
        <li v-for="theme in themesContent.items" :key="theme.no">
          <span class="t-no">{{ theme.no }}</span>
          <h3 class="t-title">{{ theme.title }}</h3>
          <p class="t-desc">{{ theme.desc }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<style scoped>
.theme-index {
  border-bottom: 1px solid var(--ink);
}

.theme-index li {
  display: grid;
  grid-template-columns: 56px 1fr;
  grid-template-areas:
    "no title"
    "no desc";
  column-gap: 18px;
  row-gap: 4px;
  align-items: baseline;
  border-top: 1px solid var(--hairline);
  padding: 20px 10px 20px 0;
  transition: background-color .2s ease;
}

.theme-index li:hover {
  background: rgba(180, 95, 58, .055);
}

.t-no {
  grid-area: no;
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .08em;
  color: var(--grey);
  transition: color .2s ease;
}

.theme-index li:hover .t-no {
  color: var(--copper-deep);
}

.t-title {
  grid-area: title;
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.45rem, 2.4vw, 1.85rem);
  line-height: 1.1;
}

.t-desc {
  grid-area: desc;
  font-size: 15px;
  color: var(--grey);
  max-width: 52ch;
}

@media (min-width: 768px) {
  .theme-index li {
    grid-template-columns: 72px minmax(0, 5fr) minmax(0, 6fr);
    grid-template-areas: "no title desc";
    padding: 24px 10px 24px 0;
  }
}
</style>
