<script setup lang="ts">
import { registrationContent } from '#shared/content/site'

function formatPrice(price: number): string {
  return price.toLocaleString('en-US')
}
</script>

<template>
  <!-- 07 · REGISTRATION — tier ledger (prices: display from config; the
       server-side registration_types table is the pricing source of truth) -->
  <section id="registration" class="sec">
    <div class="wrap">
      <SecHead :code="registrationContent.code" :tag="registrationContent.tag" :title="registrationContent.title" />
      <div class="tier-grid">
        <article v-for="tier in registrationContent.types" :key="tier.code" class="tier">
          <span class="t-code">{{ tier.code }}</span>
          <h3>{{ tier.name }}</h3>
          <p class="price">
            <span class="cur">¥</span>{{ formatPrice(tier.price) }}
          </p>
          <p class="t-desc">{{ tier.description }}</p>
          <span class="status" :class="{ inv: tier.availability === 'on_invitation' }">
            {{ tier.availability === 'available' ? 'Available' : 'On invitation' }}
          </span>
        </article>
      </div>
      <div class="reg-foot">
        <NuxtLink class="btn btn-solid" href="/register">Register Now</NuxtLink>
        <p class="reg-note">{{ registrationContent.note }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
#registration {
  background: linear-gradient(rgba(180, 95, 58, .05), rgba(180, 95, 58, .05)), var(--paper);
}

.tier-grid {
  display: grid;
  grid-template-columns: 1fr;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.tier {
  padding: 26px 0;
  border-top: 1px solid var(--hairline);
}

.tier:first-child {
  border-top: none;
}

.t-code {
  display: block;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--grey);
  margin-bottom: 14px;
}

.tier h3 {
  font-family: var(--serif);
  font-weight: 400;
  font-size: 1.55rem;
  line-height: 1.1;
}

.price {
  font-family: var(--serif);
  font-size: clamp(2rem, 3.4vw, 2.6rem);
  line-height: 1;
  margin-top: 14px;
}

.price .cur {
  font-size: .55em;
  vertical-align: .5em;
  margin-right: 2px;
  color: var(--copper-deep);
}

.t-desc {
  font-size: 14.5px;
  color: var(--grey);
  margin-top: 12px;
  max-width: 34ch;
  min-height: 3em;
}

.status {
  display: inline-block;
  margin-top: 16px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  border: 1px solid var(--ink);
  padding: 6px 12px;
}

.status.inv {
  border-color: var(--copper-deep);
  color: var(--copper-deep);
}

.reg-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-top: clamp(30px, 4vw, 44px);
}

.reg-note {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
}

@media (min-width: 768px) {
  .tier-grid {
    grid-template-columns: repeat(2, 1fr);
    column-gap: 32px;
  }

  .tier:nth-child(2) {
    border-top: 1px solid var(--hairline);
  }
}

@media (min-width: 1024px) {
  .tier-grid {
    grid-template-columns: repeat(4, 1fr);
    column-gap: 32px;
  }

  .tier {
    padding: 30px 28px 30px 0;
  }

  .tier + .tier {
    border-top: none;
    border-left: 1px solid var(--hairline);
    padding-left: 28px;
  }
}
</style>
