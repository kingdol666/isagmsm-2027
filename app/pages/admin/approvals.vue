<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '缴费审批 · Admin' })

interface ApprovalRow {
  orderId: string
  orderNo: string
  displayId: string
  fullName: string
  email: string
  affiliation: string
  typeName: string
  totalFen: number
  currency: string
  reference: string | null
  claimedAt: string | null
}

const { data, error, refresh } = await useFetch<{ rows: ApprovalRow[] }>('/api/admin/approvals')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const busyId = ref<string | null>(null)
const rejectTarget = ref<ApprovalRow | null>(null)
const rejectNote = ref('')
const message = ref('')

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })

async function approve(row: ApprovalRow) {
  busyId.value = row.orderId
  message.value = ''
  try {
    const res = await $fetch<{ credentialToken: string | null }>(`/api/admin/orders/${row.orderId}/review`, {
      method: 'POST',
      body: { action: 'approve' },
    })
    message.value = `已通过 ${row.displayId}（${row.fullName}）${res.credentialToken ? '，电子凭证已下发' : ''}`
    await refresh()
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    message.value = e.data?.statusMessage ?? '操作失败'
  }
  finally {
    busyId.value = null
  }
}

async function reject(row: ApprovalRow) {
  busyId.value = row.orderId
  message.value = ''
  try {
    await $fetch(`/api/admin/orders/${row.orderId}/review`, {
      method: 'POST',
      body: { action: 'reject', note: rejectNote.value },
    })
    message.value = `已驳回 ${row.displayId}，订单退回待支付`
    rejectTarget.value = null
    rejectNote.value = ''
    await refresh()
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    message.value = e.data?.statusMessage ?? '操作失败'
  }
  finally {
    busyId.value = null
  }
}
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · PAYMENT REVIEW</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} 待审核</span>
      </div>
      <h1 class="sec-title">缴费审批</h1>
    </header>

    <p class="guide">
      核对参会人提交的转账信息（附言含「参会 ID-姓名」）与银行到账记录，通过后系统自动下发电子凭证。
    </p>

    <p v-if="message" class="msg mono">{{ message }}</p>

    <ul v-if="data?.rows.length" class="review-list">
      <li v-for="row in data.rows" :key="row.orderId" class="review">
        <div class="r-head">
          <span class="mono r-id">{{ row.displayId }}</span>
          <span class="r-name">{{ row.fullName }}</span>
          <span class="badge">{{ row.typeName }}</span>
          <span class="r-amount">¥{{ yuan(row.totalFen) }}</span>
        </div>
        <dl class="r-detail">
          <div class="r-row"><dt>订单号</dt><dd class="mono">{{ row.orderNo }}</dd></div>
          <div class="r-row"><dt>邮箱</dt><dd>{{ row.email }}</dd></div>
          <div class="r-row"><dt>单位</dt><dd>{{ row.affiliation }}</dd></div>
          <div class="r-row"><dt>转账参考号</dt><dd class="mono">{{ row.reference || '—（未填写）' }}</dd></div>
          <div class="r-row"><dt>提交时间</dt><dd>{{ row.claimedAt ? new Date(row.claimedAt).toLocaleString('zh-CN') : '—' }}</dd></div>
        </dl>
        <div v-if="rejectTarget?.orderId !== row.orderId" class="r-actions">
          <button class="btn btn-solid" type="button" :disabled="busyId === row.orderId" @click="approve(row)">
            {{ busyId === row.orderId ? '处理中…' : '核对无误，通过并下发二维码' }}
          </button>
          <button class="btn btn-ghost" type="button" :disabled="busyId === row.orderId" @click="rejectTarget = row">
            驳回
          </button>
        </div>
        <div v-else class="reject-form">
          <input v-model="rejectNote" type="text" placeholder="驳回原因（将展示给参会人，选填）">
          <button class="btn btn-solid" type="button" :disabled="busyId === row.orderId" @click="reject(row)">
            确认驳回
          </button>
          <button class="btn btn-ghost" type="button" @click="rejectTarget = null">取消</button>
        </div>
      </li>
    </ul>
    <p v-else class="empty mono">当前没有待审核的转账申请。</p>
  </div>
</template>

<style scoped>
.guide {
  font-size: 14px;
  color: var(--grey);
  line-height: 1.8;
  max-width: 62ch;
  margin-bottom: clamp(26px, 4vw, 40px);
}

.msg {
  font-size: 13px;
  color: var(--copper-deep);
  padding: 10px 0;
}

.review-list {
  border-bottom: 1px solid var(--ink);
}

.review {
  border-top: 1px solid var(--hairline);
  padding: 20px 0;
}

.r-head {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px 16px;
}

.r-id {
  font-size: 14px;
  color: var(--copper-deep);
  letter-spacing: .06em;
}

.r-name {
  font-size: 17px;
  font-weight: 600;
}

.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .08em;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 3px 8px;
}

.r-amount {
  font-family: var(--serif);
  font-size: 1.3rem;
  margin-left: auto;
}

.r-detail {
  margin-top: 12px;
}

.r-row {
  display: grid;
  grid-template-columns: minmax(110px, 160px) 1fr;
  gap: 12px;
  border-top: 1px solid var(--hairline-soft);
  padding: 8px 0;
  align-items: baseline;
}

.r-row dt {
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .08em;
  color: var(--grey);
}

.r-row dd {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.r-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.reject-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

.reject-form input {
  flex: 1;
  min-width: 220px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--ink);
  padding: 11px 13px;
  border-radius: 0;
  background: transparent;
}

.empty {
  font-size: 13px;
  color: var(--grey);
  border-top: 1px solid var(--ink);
  padding: 24px 0;
}
</style>
