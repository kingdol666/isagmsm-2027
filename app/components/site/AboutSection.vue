<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

const { locale } = useI18n()
const content = computed(() => siteContent(locale.value))
</script>

<template>
  <!-- 01 · ABOUT — margin column + offset measure -->
  <section id="about" class="sec">
    <div class="wrap">
      <SecHead :code="content.aboutContent.code" :tag="content.aboutContent.tag" :title="content.aboutContent.title" />
      <div class="about-body">
        <ul class="about-note" aria-label="Symposium facts">
          <li v-for="fact in content.aboutContent.facts" :key="fact.label">
            <b>{{ fact.label.toUpperCase() }}</b> — {{ fact.value }}
          </li>
        </ul>
        <div class="about-copy">
          <p class="lede">{{ content.aboutContent.paragraphs[0] }}</p>
          <p>{{ content.aboutContent.paragraphs[1] }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: 28px;
}

.about-note {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
  line-height: 2.1;
}

.about-note b {
  font-weight: 500;
  color: var(--copper-deep);
}

.about-note li {
  border-top: 1px solid var(--hairline);
  padding: 9px 0;
}

.about-note li:first-child {
  border-top: 1px solid var(--ink);
}

.about-copy p {
  font-size: clamp(16px, 1.35vw, 18px);
  line-height: 1.7;
  max-width: 64ch;
}

.about-copy p + p {
  margin-top: 1.2em;
  color: var(--ink);
}

@media (min-width: 768px) {
  .about-body {
    grid-template-columns: minmax(0, 4fr) minmax(0, 7fr);
    column-gap: clamp(32px, 4vw, 72px);
  }
}
</style>
