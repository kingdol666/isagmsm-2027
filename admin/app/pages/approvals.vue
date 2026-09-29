<script setup lang="ts">
interface ApprovalRow {
  orderId: string
  orderNo: string
  status: string
  totalFen: number
  currency: string
  reference: string | null
  claimedAt: string | null
  displayId: string
  fullName: string
  email: string
  affiliation: string
  typeName: string
}

const { data, error, refresh } = await useFetch<{ rows: ApprovalRow[] }>('/api/approvals')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const busyId = ref<string | null>(null)
const rejectTarget = ref<ApprovalRow | null>(null)
const rejectNote = ref('')
const message = ref('')

const yuan = (fen: number) => (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
const statusZh: Record<string, string> = { pending: '待支付', reviewing: '审核中' }

async function approve(row: ApprovalRow) {
  busyId.value = row.orderId
  message.value = ''
  try {
    const res = await $fetch<{ credentialToken: string | null, isMember: boolean }>(`/api/orders/${row.orderId}/approve`, { method: 'POST' })
    message.value = res.credentialToken
      ? `已通过 ${row.displayId}（${row.fullName}），电子凭证已下发`
      : res.isMember
        ? `已通过 ${row.displayId}（${row.fullName}）`
        : `已通过 ${row.displayId}（${row.fullName}）。该参会人尚未入会：设为会员后才能下发凭证。`
    await refresh()
  }
  catch (err: unknown) {
    message.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败'
  }
  finally {
    busyId.value = null
  }
}

async function reject(row: ApprovalRow) {
  busyId.value = row.orderId
  message.value = ''
  try {
    await $fetch(`/api/orders/${row.orderId}/reject`, { method: 'POST', body: { note: rejectNote.value } })
    message.value = `已驳回 ${row.displayId}，订单退回待支付`
    rejectTarget.value = null
    rejectNote.value = ''
    await refresh()
  }
  catch (err: unknown) {
    message.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败'
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
        <span class="sec-code">ADMIN CONSOLE · PAYMENT REVIEW</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} 单待处理</span>
      </div>
      <h1 class="sec-title">缴费<em>审批</em></h1>
    </header>

    <p class="guide">
      核对参会人提交的转账信息（附言含「参会 ID-姓名」）与银行到账记录。通过后订单转为已缴费；
      <b>会员</b>的凭证自动下发，非会员需先设为会员再下发凭证。
    </p>

    <p v-if="message" class="msg">{{ message }}</p>

    <ul v-if="data?.rows.length" class="review-list">
      <li v-for="row in data.rows" :key="row.orderId" class="review">
        <div class="r-head">
          <span class="mono r-id">{{ row.displayId }}</span>
          <span class="r-name">{{ row.fullName }}</span>
          <span class="badge">{{ row.typeName }}</span>
          <span class="badge" :class="{ rev: row.status === 'reviewing' }">{{ statusZh[row.status] ?? row.status }}</span>
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
            {{ busyId === row.orderId ? '处理中…' : '核对无误，通过' }}
          </button>
          <button v-if="row.status === 'reviewing'" class="btn btn-ghost" type="button" :disabled="busyId === row.orderId" @click="rejectTarget = row">
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
    <p v-else class="empty">当前没有待处理的转账订单。</p>
  </div>
</template>
