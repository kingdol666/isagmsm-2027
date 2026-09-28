<script setup lang="ts">
import { sponsorshipContent as info } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '参展赞助' })
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

      <!-- 赞助级别 -->
      <section class="block">
        <h2 class="b-title">赞助级别与权益</h2>
        <div class="tier-wrap">
          <table class="tier-table">
            <thead>
              <tr>
                <th>级别</th>
                <th>价格</th>
                <th>名额</th>
                <th>主要权益</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tier in info.tiers" :key="tier.tier">
                <td class="tier-name">{{ tier.tier }}</td>
                <td class="tier-price">{{ tier.price }}</td>
                <td>{{ tier.quota }}</td>
                <td>
                  <ul class="t-benefits">
                    <li v-for="benefit in tier.benefits" :key="benefit">{{ benefit }}</li>
                  </ul>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- 广告位与单项合作 -->
      <section class="block">
        <h2 class="b-title">广告位与单项合作</h2>
        <ul class="ad-list">
          <li v-for="ad in info.adItems" :key="ad.item">
            <span class="ad-item">{{ ad.item }}</span>
            <span class="ad-benefit">{{ ad.benefit }}</span>
            <span class="ad-price mono">{{ ad.price }}</span>
            <span class="ad-quota mono">限 {{ ad.quota }}</span>
          </li>
        </ul>
      </section>

      <!-- 联系与付款 -->
      <section class="block">
        <h2 class="b-title">洽谈与付款</h2>
        <div class="contact-box">
          <p class="c-line">{{ info.contact }}</p>
          <p class="c-line">{{ info.paymentNote }}</p>
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

/* tier table */
.tier-wrap {
  overflow-x: auto;
  border-top: 1px solid var(--ink);
}

.tier-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14.5px;
}

.tier-table th {
  text-align: left;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
  font-weight: 500;
  padding: 12px 16px 12px 0;
  border-bottom: 1px solid var(--ink);
  white-space: nowrap;
}

.tier-table td {
  padding: 16px 16px 16px 0;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
}

.tier-name {
  font-weight: 600;
  color: var(--copper-deep);
  white-space: nowrap;
}

.tier-price {
  font-family: var(--serif);
  font-size: 1.2rem;
  white-space: nowrap;
}

.t-benefits li {
  font-size: 13.5px;
  color: var(--grey);
  line-height: 1.8;
}

.t-benefits li::before {
  content: "—";
  margin-right: 8px;
  color: var(--copper-deep);
}

/* ad list */
.ad-list {
  border-bottom: 1px solid var(--ink);
}

.ad-list li {
  display: grid;
  grid-template-columns: 1fr;
  gap: 4px;
  border-top: 1px solid var(--hairline);
  padding: 14px 0;
  align-items: baseline;
}

.ad-item {
  font-size: 15.5px;
  font-weight: 500;
}

.ad-benefit {
  font-size: 13.5px;
  color: var(--grey);
}

.ad-price {
  font-size: 14px;
  color: var(--copper-deep);
}

.ad-quota {
  font-size: 12px;
  color: var(--grey);
}

/* contact */
.contact-box {
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 30px);
}

.c-line {
  font-size: 15px;
  line-height: 1.9;
}

.c-line + .c-line {
  margin-top: 10px;
}

@media (min-width: 768px) {
  .ad-list li {
    grid-template-columns: 200px 1fr 140px 90px;
  }
}
</style>
