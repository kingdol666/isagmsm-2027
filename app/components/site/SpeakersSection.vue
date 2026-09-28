<script setup lang="ts">
import { speakersContent } from '#shared/content/site'
</script>

<template>
  <!-- 03 · KEYNOTE SPEAKERS — 4/2/1, monogram plates -->
  <section id="speakers" class="sec">
    <div class="wrap">
      <SecHead :code="speakersContent.code" :tag="speakersContent.tag" :title="'Keynote Speakers'" />
      <!-- Placeholder note: portraits are letter monograms by design —
           no real photographs are used (honesty rule). Sample data. -->
      <div class="sp-grid">
        <article v-for="speaker in speakersContent.items" :key="speaker.code" class="speaker">
          <p class="sp-head"><b>{{ speaker.code }}</b><span>Keynote</span></p>
          <figure class="sp-plate" role="img" :aria-label="`Monogram placeholder for ${speaker.name}`">
            <span aria-hidden="true">{{ speaker.monogram }}</span>
          </figure>
          <h3>{{ speaker.name }}</h3>
          <p class="sp-aff">{{ speaker.affiliation }}</p>
          <p class="sp-talk">{{ speaker.talk }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
#speakers {
  background: var(--tint);
}

.sp-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(32px, 4vw, 40px);
}

.sp-head {
  display: flex;
  justify-content: space-between;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
  margin-bottom: 14px;
}

.sp-head b {
  font-weight: 500;
  color: var(--copper-deep);
}

/* monogram plate — technical drawing corner ticks; fixed aspect-ratio = no CLS */
.sp-plate {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--tint-2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sp-plate::before,
.sp-plate::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
}

.sp-plate::before {
  top: 8px;
  left: 8px;
  border-top: 1px solid var(--ink);
  border-left: 1px solid var(--ink);
}

.sp-plate::after {
  bottom: 8px;
  right: 8px;
  border-bottom: 1px solid var(--ink);
  border-right: 1px solid var(--ink);
}

.sp-plate span {
  font-family: var(--serif);
  font-size: clamp(3rem, 7vw, 3.6rem);
  line-height: 1;
  color: var(--ink);
}

.speaker h3 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 1.5rem;
  line-height: 1.15;
  margin-top: 20px;
}

.sp-aff {
  font-size: 14px;
  color: var(--grey);
  margin-top: 6px;
}

.sp-talk {
  font-family: var(--serif);
  font-style: italic;
  font-size: 1.12rem;
  line-height: 1.4;
  color: var(--ink);
  border-top: 1px solid var(--hairline);
  margin-top: 16px;
  padding-top: 14px;
}

@media (min-width: 768px) {
  .sp-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .sp-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
</style>
