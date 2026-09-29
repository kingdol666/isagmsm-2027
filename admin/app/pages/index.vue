<script setup lang="ts">
interface Dashboard {
  participants: number
  members: number
  reviewingOrders: number
  pendingAbstracts: number
  revenueFen: number
  checkins: number
}

const { data, error } = await useFetch<Dashboard>('/api/dashboard')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN CONSOLE · DASHBOARD</span>
        <span class="sec-tag">ISAGMSM 2027 · 独立管理台</span>
      </div>
      <h1 class="sec-title">运营<em>仪表盘</em></h1>
    </header>

    <div class="stat-grid">
      <div class="stat">
        <p class="s-label">参会人员</p>
        <p class="s-value">{{ data?.participants ?? '—' }}</p>
        <p class="s-sub">全部报名记录</p>
      </div>
      <div class="stat">
        <p class="s-label">正式会员</p>
        <p class="s-value">{{ data?.members ?? '—' }}</p>
        <p class="s-sub">会员方可持有凭证</p>
      </div>
      <div class="stat hot">
        <p class="s-label">待审核转账</p>
        <p class="s-value">{{ data?.reviewingOrders ?? '—' }}</p>
        <p class="s-sub">缴费审批队列</p>
      </div>
      <div class="stat hot">
        <p class="s-label">待审稿件</p>
        <p class="s-value">{{ data?.pendingAbstracts ?? '—' }}</p>
        <p class="s-sub">稿件审稿队列</p>
      </div>
      <div class="stat">
        <p class="s-label">已确认缴费</p>
        <p class="s-value">¥{{ data ? yuan(data.revenueFen) : '—' }}</p>
        <p class="s-sub">已支付订单总额</p>
      </div>
      <div class="stat">
        <p class="s-label">现场签到</p>
        <p class="s-value">{{ data?.checkins ?? '—' }}</p>
        <p class="s-sub">官网 /scan 扫码签到</p>
      </div>
    </div>

    <p class="guide" style="margin-top: 28px">
      会员-凭证绑定规则：<b>设为会员后</b>才能收款确认下发凭证；<b>取消会员</b>会在同一事务内自动吊销该参会人全部有效凭证（QR
      立即失效，无法再扫码入场）。入会操作仅限管理员。
    </p>
  </div>
</template>
