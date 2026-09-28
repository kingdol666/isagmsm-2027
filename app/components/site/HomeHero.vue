<script setup lang="ts">
import { siteMeta } from '#shared/content/site'
</script>

<template>
  <!-- 00 · HERO — the poster -->
  <section id="home" class="hero" aria-label="ISAGMSM 2027 — 第五届先进凝胶材料与软物质国际学术研讨会">
    <div class="hero-grid-bg" aria-hidden="true" />
    <div class="wrap hero-inner">
      <div class="hero-copy">
        <p class="hero-kicker"><b>ISAGMSM—00</b> · 第五届 · 国际学术研讨会</p>
        <h1 class="hero-title">
          <span class="t1">先进凝胶材料</span>
          <span class="t2">与软物质</span>
        </h1>
        <p class="hero-sub">国际学术研讨会 · 2027</p>
        <p class="hero-en">{{ siteMeta.fullNameEn }}</p>
        <dl class="hero-meta">
          <div class="meta-cell">
            <dt class="mono">会议时间 / DATES</dt>
            <dd>{{ siteMeta.dates }}</dd>
          </div>
          <div class="meta-cell">
            <dt class="mono">参会地址 / VENUE</dt>
            <dd>
              {{ siteMeta.venue }}
              <small class="venue-note mono">{{ siteMeta.venueAddress }} · {{ siteMeta.venueNote }}</small>
            </dd>
          </div>
        </dl>
        <div class="hero-cta">
          <NuxtLink class="btn btn-solid" href="/register">立即报名</NuxtLink>
          <NuxtLink class="btn btn-ghost" href="/abstracts">征文投稿</NuxtLink>
        </div>
      </div>
      <!-- FIG. 00 — 凝胶网络与软物质流动（示意） -->
      <figure class="hero-fig">
        <svg viewBox="0 0 520 520" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="凝胶网络与流动示意图形">
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
        <figcaption>FIG. 00 — 凝胶网络与软物质流动（示意）</figcaption>
      </figure>
    </div>
    <!-- film cross-section strata -->
    <div class="hero-strata strata" aria-hidden="true">
      <span /><span /><span /><span /><span />
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  overflow: hidden;
  min-height: max(540px, calc(100svh - var(--header-h) - 60px));
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
  padding-top: clamp(40px, 6vh, 72px);
  padding-bottom: clamp(28px, 4vh, 48px);
}

.hero-kicker {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .16em;
  color: var(--grey);
  margin-bottom: clamp(20px, 3.5vh, 36px);
}

.hero-kicker b {
  font-weight: 500;
  color: var(--copper-deep);
}

.hero-title {
  font-family: var(--sans);
  font-weight: 600;
  font-size: clamp(2rem, 5.6vw, 3.9rem);
  line-height: 1.18;
  letter-spacing: .015em;
}

.hero-title span {
  display: block;
}

.hero-title .t2 {
  margin-left: clamp(0px, 3vw, 48px);
}

.hero-sub {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: clamp(20px, 3vh, 30px);
  font-size: clamp(15px, 1.6vw, 18px);
  font-weight: 600;
  letter-spacing: .24em;
}

.hero-sub::before {
  content: "";
  width: 11px;
  height: 11px;
  background: var(--copper);
  flex: none;
}

.hero-en {
  font-family: var(--serif);
  font-size: clamp(1.05rem, 2vw, 1.4rem);
  line-height: 1.35;
  color: var(--ink);
  margin-top: 14px;
  max-width: 34em;
}

.hero-meta {
  margin-top: clamp(18px, 3vh, 28px);
  display: grid;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--ink);
}

.meta-cell {
  padding: 13px 0 12px;
  border-bottom: 1px solid var(--hairline);
}

.meta-cell dt {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: .16em;
  color: var(--copper-deep);
  margin-bottom: 6px;
}

.meta-cell dd {
  font-family: var(--mono);
  font-size: 14px;
  letter-spacing: .06em;
  color: var(--ink);
  font-weight: 500;
  line-height: 1.55;
}

.venue-note {
  display: block;
  font-size: 11px;
  letter-spacing: .08em;
  color: var(--grey);
  font-weight: 400;
  margin-top: 3px;
}

.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: clamp(26px, 4vh, 40px);
}

.hero-fig {
  position: relative;
  width: min(400px, 78%);
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

  .hero-meta {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  }

  .meta-cell + .meta-cell {
    padding-left: 22px;
    border-left: 1px solid var(--hairline);
  }

  .meta-cell:last-child {
    border-bottom: none;
  }

  .meta-cell:first-child {
    border-bottom: none;
  }

  .hero-fig {
    grid-column: 2;
    grid-row: 1;
    margin: 0;
    width: 100%;
    max-width: 440px;
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
</style>
