<script setup lang="ts">
import { sponsorshipContent } from '#shared/content/site'
</script>

<template>
  <!-- 08 · 参展赞助预览 -->
  <section id="sponsorship" class="sec">
    <div class="wrap">
      <SecHead :code="sponsorshipContent.code" :tag="sponsorshipContent.tag" :title="sponsorshipContent.title" />
      <p class="sp-intro">{{ sponsorshipContent.intro }}</p>
      <div class="tier-grid">
        <article v-for="tier in sponsorshipContent.tiers" :key="tier.tier" class="tier">
          <span class="t-name">{{ tier.tier }}</span>
          <p class="t-price">{{ tier.price }}</p>
          <p class="t-quota">{{ tier.quota }}</p>
          <ul class="t-benefits">
            <li v-for="benefit in tier.benefits" :key="benefit">{{ benefit }}</li>
          </ul>
        </article>
      </div>
      <div class="reg-foot">
        <NuxtLink class="btn btn-solid" href="/sponsorship">赞助详情与洽谈</NuxtLink>
        <p class="reg-note">{{ sponsorshipContent.paymentNote }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.sp-intro {
  font-size: clamp(15.5px, 1.3vw, 17px);
  line-height: 1.8;
  max-width: 60ch;
  margin-bottom: clamp(28px, 4vw, 44px);
  color: var(--ink);
}

.tier-grid {
  display: grid;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.tier {
  padding: 24px 0;
  border-top: 1px solid var(--hairline);
}

.tier:first-child {
  border-top: none;
}

.t-name {
  display: block;
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
}

.t-price {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3vw, 2.2rem);
  line-height: 1;
  margin-top: 10px;
}

.t-quota {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
  margin-top: 8px;
}

.t-benefits {
  margin-top: 14px;
}

.t-benefits li {
  font-size: 14px;
  color: var(--grey);
  line-height: 1.9;
  border-top: 1px solid var(--hairline-soft);
  padding: 5px 0;
}

.t-benefits li::before {
  content: "—";
  color: var(--copper-deep);
  margin-right: 10px;
}

.reg-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-top: clamp(26px, 4vw, 40px);
}

.reg-note {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .06em;
  color: var(--grey);
}

@media (min-width: 768px) {
  .tier-grid {
    grid-template-columns: repeat(3, 1fr);
    column-gap: 32px;
  }

  .tier {
    padding: 26px 26px 26px 0;
  }

  .tier + .tier {
    border-top: none;
    border-left: 1px solid var(--hairline);
    padding-left: 28px;
  }
}
</style>
