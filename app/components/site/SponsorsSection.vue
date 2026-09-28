<script setup lang="ts">
import { sponsorsContent } from '#shared/content/site'
</script>

<template>
  <!-- 08 · SPONSORS — typographic wordmarks only -->
  <section id="sponsors" class="sec">
    <div class="wrap">
      <SecHead :code="sponsorsContent.code" :tag="sponsorsContent.tag" :title="sponsorsContent.title" />
      <!-- Placeholder note: all names are fictional sample wordmarks,
           typeset only — no drawn or real logos (honesty rule). -->
      <ul class="sponsor-rows">
        <li v-for="row in sponsorsContent.rows" :key="row.tier">
          <span class="sr-tier">{{ row.tier }}</span>
          <span class="wm-group">
            <span v-for="name in row.names" :key="name.text" class="wordmark" :class="`wm-${name.style}`">
              {{ name.text }}
            </span>
          </span>
        </li>
      </ul>
      <p class="sponsor-note">{{ sponsorsContent.note }}</p>
    </div>
  </section>
</template>

<style scoped>
.sponsor-rows {
  border-bottom: 1px solid var(--ink);
}

.sponsor-rows li {
  display: grid;
  grid-template-columns: 1fr;
  row-gap: 10px;
  border-top: 1px solid var(--hairline);
  padding: 24px 0;
  align-items: baseline;
}

.sr-tier {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .16em;
  text-transform: uppercase;
  color: var(--grey);
}

.wordmark {
  transition: color .2s ease;
}

.wordmark:hover {
  color: var(--copper-deep);
}

.wm-serif {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1.1;
}

.wm-group {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.wm-sans {
  font-weight: 600;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.wm-sans2 {
  font-weight: 600;
  font-style: italic;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  letter-spacing: .02em;
}

.wm-mono {
  font-family: var(--mono);
  font-weight: 500;
  font-size: clamp(1.1rem, 1.8vw, 1.35rem);
  letter-spacing: .04em;
}

.wm-serifit {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(1.5rem, 2.6vw, 1.9rem);
}

.sponsor-note {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
  margin-top: 22px;
}

@media (min-width: 768px) {
  .sponsor-rows li {
    grid-template-columns: 200px 1fr;
    column-gap: 28px;
    row-gap: 0;
  }

  .wm-group {
    flex-direction: row;
    gap: 48px;
    flex-wrap: wrap;
  }
}
</style>
