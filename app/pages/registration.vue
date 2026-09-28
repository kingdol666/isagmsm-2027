<script setup lang="ts">
import { registrationInfoContent as info } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '参会注册' })
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

      <!-- 注册费表 -->
      <section class="block">
        <h2 class="b-title">注册费标准</h2>
        <div class="fee-wrap">
          <table class="fee-table">
            <thead>
              <tr>
                <th v-for="h in info.feeTable.headers" :key="h">{{ h }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in info.feeTable.rows" :key="row[0]">
                <td v-for="cell in row" :key="cell">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
          <p class="fee-note mono">{{ info.feeTable.note }}</p>
        </div>
      </section>

      <!-- 注册流程 -->
      <section class="block">
        <h2 class="b-title">注册流程</h2>
        <ol class="step-list">
          <li v-for="(step, index) in info.steps" :key="index">
            <span class="r-no mono">{{ String(index + 1).padStart(2, '0') }}</span>
            <span class="r-text">{{ step }}</span>
          </li>
        </ol>
        <div class="cta-row">
          <NuxtLink class="btn btn-solid" href="/register">立即报名 · 获取参会 ID</NuxtLink>
        </div>
      </section>

      <!-- 对公转账 -->
      <section class="block">
        <h2 class="b-title">缴费方式 · 对公转账</h2>
        <div class="bank-box">
          <dl class="bank-grid">
            <div class="bank-row"><dt>开户名称</dt><dd>{{ info.bank.accountName }}</dd></div>
            <div class="bank-row"><dt>开户银行</dt><dd>{{ info.bank.bank }}</dd></div>
            <div class="bank-row"><dt>银行账号</dt><dd class="mono">{{ info.bank.accountNumber }}</dd></div>
          </dl>
          <div class="remark">
            <p class="rk-label mono">转账附言必注</p>
            <p class="rk-format"><span class="mono">{{ info.bank.remarkFormat }}</span><span class="rk-eg">（例：ISAGMSM-000012-张三）</span></p>
            <p class="rk-note">请务必在附言中注明参会 ID 与姓名，会务组将以此核对转账记录并下发电子凭证。</p>
          </div>
          <p class="deadline mono">{{ info.bank.deadline }}</p>
        </div>
      </section>

      <!-- 发票与须知 -->
      <section class="block">
        <h2 class="b-title">发票与须知</h2>
        <ul class="notice-list">
          <li>{{ info.invoice }}</li>
          <li>{{ info.notice }}</li>
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
