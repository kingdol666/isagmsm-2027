<script setup lang="ts">
import { datesContent } from '#shared/content/site'
</script>

<template>
  <!-- 05 · IMPORTANT DATES — the ledger -->
  <section id="dates" class="sec">
    <div class="wrap">
      <SecHead :code="datesContent.code" :tag="datesContent.tag" :title="datesContent.title" />
      <ul class="date-ledger">
        <li v-for="item in datesContent.items" :key="item.label" :class="{ 'is-hot': item.hot }">
          <span class="dl-label">{{ item.label }}</span>
          <span class="dl-date">{{ item.date }}</span>
        </li>
      </ul>
      <!-- Call for abstracts — the academic conference's second CTA -->
      <div class="cfp">
        <p class="cfp-text">
          <b>CALL FOR ABSTRACTS</b> — contributions across all eight themes are welcome.
          Abstract submission opens 01 May 2026.
        </p>
        <a
          class="btn btn-ghost"
          href="mailto:abstracts@pps2026-conf.org?subject=PPS%202026%20Abstract%20Submission"
        >Submit an abstract</a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.date-ledger {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
  border-bottom: 1px solid var(--ink);
}

.date-ledger li {
  border-top: 1px solid var(--hairline);
  padding: 22px 12px 22px 0;
}

.date-ledger .dl-label {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--grey);
  margin-bottom: 10px;
}

.date-ledger .dl-date {
  font-family: var(--serif);
  font-size: clamp(1.5rem, 2.6vw, 1.9rem);
  line-height: 1.1;
}

.date-ledger li.is-hot {
  border-top: 1px solid var(--copper);
}

.date-ledger li.is-hot .dl-label {
  color: var(--copper-deep);
}

.date-ledger li.is-hot .dl-date {
  color: var(--copper-deep);
  font-style: italic;
}

@media (min-width: 768px) {
  .date-ledger {
    grid-template-columns: repeat(2, 1fr);
    column-gap: 28px;
  }
}

@media (min-width: 1024px) {
  .date-ledger {
    grid-template-columns: repeat(4, 1fr);
    column-gap: 28px;
  }
}

/* call for abstracts strip */
.cfp {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 18px 32px;
  margin-top: clamp(26px, 4vw, 40px);
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 28px) clamp(20px, 3vw, 32px);
}

.cfp-text {
  flex: 1;
  min-width: 260px;
  font-size: 15px;
  line-height: 1.6;
  color: var(--ink);
}

.cfp-text b {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .14em;
  color: var(--copper-deep);
  display: block;
  margin-bottom: 8px;
}
</style>
