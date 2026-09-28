<script setup lang="ts">
import { siteMeta } from '#shared/content/site'
</script>

<template>
  <!-- 00 · HERO / SYMPOSIUM — the poster -->
  <section id="symposium" class="hero" aria-label="PPS 2026 — Polymer Processing Symposium">
    <div class="hero-grid-bg" aria-hidden="true" />
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <p class="hero-kicker"><b>PPS26—00</b> · INTERNATIONAL SYMPOSIUM ON POLYMER PROCESSING</p>
        <h1 class="hero-title">
          <span class="t1">Polymer</span>
          <span class="t2">Processing</span>
        </h1>
        <p class="hero-sub">Symposium 2026</p>
        <p class="hero-tagline">{{ siteMeta.tagline }}</p>
        <p class="hero-when">
          <span class="d">{{ siteMeta.dates }}</span>
          <span class="l">{{ siteMeta.location }}</span>
        </p>
        <div class="hero-cta">
          <NuxtLink class="btn btn-solid" href="/register">Register Now</NuxtLink>
          <a class="btn btn-ghost" href="#program">View Program</a>
        </div>
      </div>
      <!-- FIG. 00 — concentric melt-flow figure. A transposition of the
           Müller-Brockmann Tonhalle arc posters onto the screw channel.
           Abstract motif, explicitly captioned as such. -->
      <figure class="hero-fig">
        <svg viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Abstract figure of concentric melt flow lines">
          <line x1="260" y1="10" x2="260" y2="510" stroke="#111111" stroke-opacity=".18" />
          <g stroke="#111111" stroke-opacity=".30" stroke-width="1">
            <circle cx="260" cy="260" r="230" />
            <circle cx="260" cy="260" r="130" />
            <circle cx="260" cy="260" r="96" />
            <circle cx="260" cy="260" r="30" />
          </g>
          <g stroke="#B45F3A" stroke-width="2" fill="none">
            <path d="M260 64 A196 196 0 0 1 456 260" />
            <circle cx="260" cy="260" r="163" stroke-dasharray="384 640" />
            <path d="M260 324 A64 64 0 0 0 196 260" />
          </g>
          <circle cx="260" cy="260" r="4.5" fill="#B45F3A" />
        </svg>
        <figcaption>FIG. 00 — Melt flow lines, screw channel (abstract)</figcaption>
      </figure>
    </div>
    <!-- film cross-section strata: the page's first "station" ends in film -->
    <div class="hero-strata strata" aria-hidden="true">
      <span /><span /><span /><span /><span />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  min-height: max(620px, 100svh);
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid var(--ink);
}

.hero-grid-bg {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(to right, var(--hairline-soft) 1px, transparent 1px);
  background-size: calc(100% / 6) 100%;
  -webkit-mask-image: linear-gradient(to bottom, #000 55%, transparent 96%);
  mask-image: linear-gradient(to bottom, #000 55%, transparent 96%);
}

.hero-inner {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: 100%;
  padding-top: clamp(44px, 7vh, 84px);
  padding-bottom: clamp(28px, 4vh, 48px);
}

.hero-kicker {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .16em;
  color: var(--grey);
  margin-bottom: clamp(22px, 3.5vh, 40px);
}

.hero-kicker b {
  font-weight: 500;
  color: var(--copper-deep);
}

.hero-title {
  font-family: var(--serif);
  font-weight: 400;
  text-transform: uppercase;
  font-size: clamp(3.3rem, 11.5vw, 8.6rem);
  line-height: .94;
  letter-spacing: -.015em;
}

.hero-title span {
  display: block;
}

.hero-title .t2 {
  margin-left: clamp(0px, 4vw, 64px); /* one stepped line — asymmetry, not centering */
}

.hero-sub {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: clamp(22px, 3.5vh, 36px);
  font-family: var(--mono);
  font-size: clamp(13px, 1.5vw, 15px);
  font-weight: 500;
  letter-spacing: .3em;
  text-transform: uppercase;
}

.hero-sub::before {
  content: "";
  width: 11px;
  height: 11px;
  background: var(--copper);
  flex: none;
}

.hero-tagline {
  font-family: var(--serif);
  font-style: italic;
  font-size: clamp(1.3rem, 2.4vw, 1.7rem);
  color: var(--ink);
  margin-top: 14px;
}

.hero-when {
  margin-top: clamp(20px, 3vh, 30px);
  display: flex;
  gap: 26px;
  flex-wrap: wrap;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.hero-when .d {
  color: var(--ink);
  font-weight: 500;
}

.hero-when .l {
  color: var(--grey);
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: clamp(28px, 4vh, 44px);
}

.hero-fig {
  position: relative;
  width: min(430px, 78%);
  margin: clamp(30px, 5vh, 44px) 0 0 auto;
  margin-right: calc(var(--pad) * -.55);
}

.hero-fig svg {
  width: 100%;
  height: auto;
}

.hero-fig figcaption {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
  margin-top: 12px;
  text-align: left;
  padding-left: var(--pad);
}

.hero-strata {
  padding: 0 var(--pad) 26px;
}

@media (min-width: 768px) {
  .hero-grid-bg {
    background-size: calc(100% / 12) 100%;
  }
}

@media (min-width: 1024px) {
  .hero-inner {
    display: grid;
    grid-template-columns: minmax(0, 7fr) minmax(0, 4fr);
    column-gap: clamp(32px, 4vw, 72px);
    align-items: center;
  }

  .hero-fig {
    grid-column: 2;
    grid-row: 1;
    margin: 0;
    width: 100%;
    max-width: 470px;
    justify-self: end;
  }

  .hero-fig figcaption {
    padding-left: 0;
  }

  .hero-copy {
    grid-column: 1;
    grid-row: 1;
  }
}

@media (min-width: 1440px) {
  .hero-title {
    font-size: clamp(6.5rem, 7.6vw, 9.4rem);
  }
}
</style>
