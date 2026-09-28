<script setup lang="ts">
import { hotelsContent as info } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '酒店预定' })
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

      <p class="intro">{{ info.intro }}</p>

      <section class="block">
        <h2 class="b-title">协作酒店</h2>
        <ul class="hotel-list">
          <li v-for="hotel in info.hotels" :key="hotel.name" class="hotel">
            <div class="h-head">
              <h3 class="h-name">{{ hotel.name }}</h3>
              <span class="h-stars mono">{{ hotel.stars }}</span>
            </div>
            <p class="h-price">{{ hotel.price }}</p>
            <p class="h-addr">{{ hotel.address }}</p>
            <p class="h-intro">{{ hotel.intro }}</p>
          </li>
        </ul>
      </section>

      <section class="block">
        <h2 class="b-title">酒店位置地图</h2>
        <AMapHotels :hotels="info.hotels" />
      </section>

      <section class="block">
        <h2 class="b-title">预订方式</h2>
        <div class="booking-box">
          <p class="b-channel">{{ info.booking.channel }}</p>
          <p class="b-note mono">{{ info.booking.note }}</p>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
}

.intro {
  font-size: clamp(15.5px, 1.3vw, 17px);
  line-height: 1.9;
  max-width: 62ch;
  margin-bottom: clamp(36px, 5vw, 56px);
}

.block {
  margin-bottom: clamp(40px, 6vw, 64px);
}

.b-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 14px;
  margin-bottom: 18px;
}

.hotel-list {
  border-bottom: 1px solid var(--ink);
}

.hotel {
  border-top: 1px solid var(--hairline);
  padding: 22px 0;
}

.h-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 12px;
}

.h-name {
  font-size: 18px;
  font-weight: 600;
}

.h-stars {
  font-size: 11.5px;
  letter-spacing: .1em;
  color: var(--copper-deep);
  border: 1px solid var(--copper-deep);
  padding: 3px 8px;
}

.h-price {
  font-family: var(--serif);
  font-size: 1.5rem;
  margin-top: 10px;
}

.h-addr {
  font-size: 14px;
  color: var(--grey);
  margin-top: 6px;
}

.h-intro {
  font-size: 14.5px;
  line-height: 1.8;
  margin-top: 10px;
  max-width: 62ch;
}

.booking-box {
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 30px);
}

.b-channel {
  font-size: 15px;
  line-height: 1.8;
}

.b-note {
  margin-top: 12px;
  font-size: 12.5px;
  color: var(--copper-deep);
  letter-spacing: .04em;
}
</style>
