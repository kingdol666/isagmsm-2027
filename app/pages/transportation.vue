<script setup lang="ts">
import { transportationContent as info } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '会场交通' })
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

      <div class="t-body">
        <div>
          <h2 class="v-name">{{ info.venueName }}</h2>
          <p class="v-report">{{ info.reportPoint }}</p>
          <ul class="v-list">
            <li v-for="item in info.transit" :key="item.code">
              <span class="v-code">{{ item.code }}</span>
              <span class="v-item">
                {{ item.name }}
                <small v-if="item.detail">{{ item.detail }}</small>
              </span>
            </li>
          </ul>
        </div>

        <!-- 抽象示意地图占位（诚实占位，正式地图待嵌入） -->
        <div class="map-block" role="img" aria-label="会场位置示意地图 — 待嵌入">
          <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <g stroke="#111111" stroke-opacity=".12" stroke-width="1">
              <line x1="0" y1="60" x2="400" y2="60" /><line x1="0" y1="120" x2="400" y2="120" />
              <line x1="0" y1="180" x2="400" y2="180" /><line x1="0" y1="240" x2="400" y2="240" />
              <line x1="66" y1="0" x2="66" y2="300" /><line x1="133" y1="0" x2="133" y2="300" />
              <line x1="266" y1="0" x2="266" y2="300" /><line x1="333" y1="0" x2="333" y2="300" />
            </g>
            <g stroke="#111111" stroke-opacity=".30" stroke-width="2" fill="none">
              <path d="M-10 210 C 90 190, 150 250, 240 220 S 380 150, 410 170" />
              <path d="M40 -10 C 70 80, 40 160, 90 310" />
            </g>
            <line x1="230" y1="140" x2="230" y2="86" stroke="#B45F3A" stroke-width="1.5" />
            <line x1="230" y1="140" x2="292" y2="140" stroke="#B45F3A" stroke-width="1.5" />
            <circle cx="230" cy="140" r="10" fill="none" stroke="#B45F3A" stroke-width="2" />
            <circle cx="230" cy="140" r="3.5" fill="#B45F3A" />
          </svg>
          <span class="map-label">{{ info.mapLabel }}</span>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
}

.t-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(36px, 5vw, 64px);
  align-items: start;
}

.v-name {
  font-size: clamp(1.3rem, 2.6vw, 1.8rem);
  font-weight: 600;
  line-height: 1.3;
}

.v-report {
  font-size: 14.5px;
  color: var(--grey);
  margin-top: 10px;
}

.v-list {
  margin-top: clamp(24px, 4vw, 38px);
  border-bottom: 1px solid var(--ink);
}

.v-list li {
  display: grid;
  grid-template-columns: 74px 1fr;
  column-gap: 16px;
  border-top: 1px solid var(--hairline);
  padding: 14px 0;
  align-items: baseline;
}

.v-code {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--copper-deep);
  font-weight: 500;
}

.v-item {
  font-size: 15px;
  line-height: 1.5;
}

.v-item small {
  display: block;
  font-size: 13px;
  color: var(--grey);
  margin-top: 2px;
}

.map-block {
  position: relative;
  aspect-ratio: 4 / 3;
  background: var(--tint);
  border: 1px solid var(--ink);
  overflow: hidden;
}

.map-block svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.map-label {
  position: absolute;
  left: 14px;
  bottom: 14px;
  background: var(--paper);
  border: 1px solid var(--ink);
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--ink);
  padding: 7px 12px;
}

@media (min-width: 768px) {
  .t-body {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }
}
</style>
