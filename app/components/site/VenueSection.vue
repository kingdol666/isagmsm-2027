<script setup lang="ts">
import { venueContent } from '#shared/content/site'
</script>

<template>
  <!-- 06 · VENUE -->
  <section id="venue" class="sec">
    <div class="wrap">
      <SecHead :code="venueContent.code" :tag="venueContent.tag" :title="venueContent.title" :title-em="venueContent.titleEm" />
      <div class="venue-body">
        <div>
          <h3 class="v-name">{{ venueContent.name }}</h3>
          <p class="v-addr">{{ venueContent.address }}</p>
          <ul class="v-list">
            <li v-for="item in venueContent.transit" :key="item.code">
              <span class="v-code">{{ item.code }}</span>
              <span class="v-item">
                {{ item.name }}
                <small v-if="item.detail">{{ item.detail }}</small>
              </span>
            </li>
          </ul>
        </div>
        <!-- Placeholder: abstract SVG map, explicitly labelled. No fake map
             screenshots (honesty rule). To be replaced by a real embed. -->
        <div
          class="map-block"
          role="img"
          aria-label="Abstract placeholder map with a marker for the venue — map to be embedded"
        >
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
          <span class="map-label">{{ venueContent.mapLabel }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.venue-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(36px, 5vw, 64px);
  align-items: start;
}

.v-name {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(1.6rem, 2.8vw, 2.1rem);
  line-height: 1.15;
}

.v-addr {
  font-size: 15.5px;
  color: var(--grey);
  margin-top: 12px;
  max-width: 44ch;
}

.v-list {
  margin-top: clamp(26px, 4vw, 40px);
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
  text-transform: uppercase;
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
  text-transform: uppercase;
  color: var(--ink);
  padding: 7px 12px;
}

@media (min-width: 768px) {
  .venue-body {
    grid-template-columns: minmax(0, 6fr) minmax(0, 5fr);
  }
}
</style>
