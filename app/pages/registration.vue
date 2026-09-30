<script setup lang="ts">
import { siteContent } from '#shared/content/localized'

definePageMeta({ layout: 'site' })
const { t, locale } = useI18n()

useSeoMeta({ title: () => t('register.info.seoTitle') })

const content = computed(() => siteContent(locale.value).registrationInfoContent)
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="sec-head">
        <div class="sec-meta">
          <span class="sec-code">{{ content.code }}</span>
          <span class="sec-tag">{{ content.tag }}</span>
        </div>
        <h1 class="sec-title">{{ content.title }}</h1>
      </header>

      <!-- 注册费表 -->
      <section class="block">
        <h2 class="b-title">{{ t('register.info.feeTitle') }}</h2>
        <div class="fee-wrap">
          <table class="fee-table">
            <thead>
              <tr>
                <th v-for="h in content.feeTable.headers" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in content.feeTable.rows" :key="row[0]">
                <td v-for="cell in row" :key="cell">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
          <p class="fee-note mono">{{ content.feeTable.note }}</p>
        </div>
      </section>

      <!-- 注册流程 -->
      <section class="block">
        <h2 class="b-title">{{ t('register.info.flowTitle') }}</h2>
        <ol class="step-list">
          <li v-for="(step, index) in content.steps" :key="index">
            <span class="r-no mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="r-text">{{ step }}</span>
          </li>
        </ol>
        <div class="cta-row">
          <NuxtLink class="btn btn-solid" href="/register">{{ t('register.info.ctaNow') }}</NuxtLink>
        </div>
      </section>

      <!-- 对公转账 -->
      <section class="block">
        <h2 class="b-title">{{ t('register.info.payTitle') }}</h2>
        <div class="bank-box">
          <dl class="bank-grid">
            <div class="bank-row"><dt>{{ t('register.info.bankAccountName') }}</dt><dd>{{ content.bank.accountName }}</dd></div>
            <div class="bank-row"><dt>{{ t('register.info.bankName') }}</dt><dd>{{ content.bank.bank }}</dd></div>
            <div class="bank-row"><dt>{{ t('register.info.bankAccountNumber') }}</dt><dd class="mono">{{ content.bank.accountNumber }}</dd></div>
          </dl>
          <div class="remark">
            <p class="rk-label mono">{{ t('register.info.remarkLabel') }}</p>
            <p class="rk-format"><span class="mono">{{ content.bank.remarkFormat }}</span><span class="rk-eg">{{ t('register.info.remarkExample') }}</span></p>
            <p class="rk-note">{{ t('register.info.remarkNote') }}</p>
          </div>
          <p class="deadline mono">{{ content.bank.deadline }}</p>
        </div>
      </section>

      <!-- 发票与须知 -->
      <section class="block">
        <h2 class="b-title">{{ t('register.info.invoiceTitle') }}</h2>
        <ul class="notice-list">
          <li>{{ content.invoice }}</li>
          <li>{{ content.notice }}</li>
        </ul>
      </section>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
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

/* fee table */
.fee-wrap {
  overflow-x: auto;
  border-top: 1px solid var(--ink);
}

.fee-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.fee-table th {
  text-align: left;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
  font-weight: 500;
  padding: 12px 18px 12px 0;
  border-bottom: 1px solid var(--ink);
  white-space: nowrap;
}

.fee-table td {
  padding: 14px 18px 14px 0;
  border-bottom: 1px solid var(--hairline);
}

.fee-note {
  margin-top: 12px;
  font-size: 12px;
  color: var(--grey);
}

/* steps */
.step-list {
  border-bottom: 1px solid var(--ink);
}

.step-list li {
  display: grid;
  grid-template-columns: 48px 1fr;
  column-gap: 14px;
  border-top: 1px solid var(--hairline);
  padding: 14px 0;
  align-items: baseline;
}

.r-no {
  font-size: 12.5px;
  color: var(--copper-deep);
}

.r-text {
  font-size: 15px;
  line-height: 1.8;
}

.cta-row {
  margin-top: 20px;
}

/* bank box */
.bank-box {
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 30px);
}

.bank-grid {
  border-top: 1px solid var(--hairline);
}

.bank-row {
  display: grid;
  grid-template-columns: 110px 1fr;
  gap: 14px;
  border-bottom: 1px solid var(--hairline);
  padding: 12px 0;
  align-items: baseline;
}

.bank-row dt {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
}

.bank-row dd {
  font-size: 15.5px;
  overflow-wrap: anywhere;
}

.remark {
  margin-top: 20px;
  border: 1px dashed var(--copper-deep);
  padding: 16px 18px;
}

.rk-label {
  font-size: 11.5px;
  letter-spacing: .16em;
  color: var(--copper-deep);
}

.rk-format {
  margin-top: 10px;
  font-size: clamp(1.1rem, 2.4vw, 1.5rem);
  font-weight: 600;
}

.rk-format .mono {
  color: var(--copper-deep);
}

.rk-eg {
  font-size: 13px;
  font-weight: 400;
  color: var(--grey);
  margin-left: 10px;
}

.rk-note {
  margin-top: 10px;
  font-size: 13px;
  color: var(--grey);
  line-height: 1.7;
}

.deadline {
  margin-top: 16px;
  font-size: 12.5px;
  color: var(--grey);
  letter-spacing: .08em;
}

/* notices */
.notice-list {
  border-bottom: 1px solid var(--ink);
}

.notice-list li {
  border-top: 1px solid var(--hairline);
  padding: 13px 0;
  font-size: 14.5px;
  line-height: 1.8;
  color: var(--ink);
  display: flex;
  gap: 12px;
}

.notice-list li::before {
  content: "—";
  color: var(--copper-deep);
  flex: none;
}
</style>
