<script setup lang="ts">
interface ParticipantRow {
  id: string
  displayId: string
  fullName: string
  email: string
  affiliation: string
  country: string
  typeName: string
  status: string
  isMember: boolean
  createdAt: string
  order: { id: string, orderNo: string, totalFen: number, currency: string, status: string, reference: string | null, claimedAt: string | null } | null
  credential: { id: string, token: string, status: string } | null
  checkedIn: boolean
}

const search = ref('')
const statusFilter = ref('')

/* 搜索/筛选作为响应式 query —— 变化时自动重新请求 */
const { data, error, refresh } = await useFetch<{ rows: ParticipantRow[] }>('/api/participants', {
  query: { q: search, status: statusFilter },
})

/** 门户地址（查看 QR 跳转用）——可通过 NUXT_PUBLIC_PORTAL_URL 覆盖 */
const portalUrl = useRuntimeConfig().public.portalUrl

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const busyId = ref<string | null>(null)
const message = ref('')
const messageOk = ref(true)

async function load() {
  await refresh()
}

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const statusZh: Record<string, string> = { submitted: '待缴费', confirmed: '已确认', cancelled: '已取消' }
const orderZh: Record<string, string> = { pending: '待支付', reviewing: '审核中', paid: '已缴费', failed: '已失败', expired: '已过期', cancelled: '已取消', refunded: '已退款' }

function say(text: string, ok = true) {
  message.value = text
  messageOk.value = ok
}

async function toggleMember(row: ParticipantRow) {
  busyId.value = row.id
  try {
    const res = await $fetch<{ isMember: boolean, revokedCredentials: number }>(`/api/participants/${row.id}/membership`, {
      method: 'POST',
      body: { isMember: !row.isMember },
    })
    if (res.isMember) {
      say(`已设为会员：${row.fullName}（${row.displayId}）。现在可以收款确认或下发凭证。`)
    }
    else {
      say(res.revokedCredentials > 0
        ? `已取消会员：${row.fullName}（${row.displayId}），并自动吊销其 ${res.revokedCredentials} 张有效凭证（QR 立即失效）。`
        : `已取消会员：${row.fullName}（${row.displayId}）。`, false)
    }
    await load()
  }
  catch (err: unknown) {
    say((err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败', false)
  }
  finally {
    busyId.value = null
  }
}

async function approvePayment(row: ParticipantRow) {
  if (!row.order) return
  busyId.value = row.id
  try {
    const res = await $fetch<{ credentialToken: string | null, isMember: boolean }>(`/api/orders/${row.order.id}/approve`, { method: 'POST' })
    say(res.credentialToken
      ? `已确认收款并下发凭证：${row.fullName}（${row.displayId}）`
      : res.isMember
        ? `已确认收款：${row.fullName}（${row.displayId}）`
        : `已确认收款：${row.fullName}（${row.displayId}）。该参会人尚未入会，凭证将在设为会员后由管理员下发。`)
    await load()
  }
  catch (err: unknown) {
    say((err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败', false)
  }
  finally {
    busyId.value = null
  }
}

async function credentialAction(row: ParticipantRow, action: 'issue' | 'revoke' | 'restore') {
  busyId.value = row.id
  try {
    await $fetch('/api/credentials/manage', {
      method: 'POST',
      body: { registrationId: row.id, action },
    })
    say(action === 'issue'
      ? `凭证已下发：${row.fullName}（${row.displayId}）`
      : action === 'revoke'
        ? `凭证已撤销：${row.fullName}（${row.displayId}），其 QR/token 立即失效`
        : `凭证已恢复：${row.fullName}（${row.displayId}）`)
    await load()
  }
  catch (err: unknown) {
    say((err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败', false)
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
        <span class="sec-code">ADMIN CONSOLE · PARTICIPANTS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} 条记录</span>
      </div>
      <h1 class="sec-title">参会<em>人员管理</em></h1>
    </header>

    <p class="guide">
      会员与凭证一体：<b>设为会员</b>后才能收款确认下发凭证（或手动下发）；<b>取消会员</b>将自动吊销其全部有效凭证。
      入会操作仅限管理员。
    </p>

    <div class="toolbar">
      <input v-model="search" type="search" class="filter-input" placeholder="搜索姓名 / 邮箱 / 参会 ID / 单位…" aria-label="搜索参会人员">
      <select v-model="statusFilter" class="status-select" aria-label="按报名状态筛选">
        <option value="">全部状态</option>
        <option value="submitted">待缴费</option>
        <option value="confirmed">已确认</option>
        <option value="cancelled">已取消</option>
      </select>
    </div>

    <p v-if="message" class="msg" :style="{ color: messageOk ? 'var(--copper-deep)' : '#A03A2A' }">{{ message }}</p>

    <div class="tbl-wrap">
      <table class="tbl">
        <thead>
          <tr>
            <th>参会 ID</th>
            <th>姓名 / 联系方式</th>
            <th>类型 / 状态</th>
            <th>缴费</th>
            <th>凭证 / 签到</th>
            <th>会员</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in data?.rows ?? []" :key="row.id">
            <td class="cell-id">
              {{ row.displayId }}<br>
              <small style="color: var(--grey); font-size: 11px;">{{ new Date(row.createdAt).toLocaleDateString('zh-CN') }}</small>
            </td>
            <td class="cell-name">
              <strong>{{ row.fullName }}</strong>
              <small>{{ row.email }}</small>
              <small>{{ row.affiliation }}</small>
            </td>
            <td>
              <span class="badge" :class="{ ok: row.status === 'confirmed' }">{{ statusZh[row.status] ?? row.status }}</span><br>
              <small style="color: var(--grey);">{{ row.typeName }}</small>
            </td>
            <td>
              <span v-if="row.order" class="badge" :class="{ ok: row.order.status === 'paid', rev: row.order.status === 'reviewing', pending: row.order.status === 'pending' }">
                {{ orderZh[row.order.status] ?? row.order.status }}
              </span>
              <span v-else class="badge">无订单</span><br>
              <span v-if="row.order" class="fee">¥{{ yuan(row.order.totalFen) }}</span>
            </td>
            <td>
              <span v-if="row.credential" class="badge" :class="row.credential.status === 'active' ? 'ok' : 'rev'">
                {{ row.credential.status === 'active' ? '有效' : '已撤销' }}
              </span>
              <span v-else class="badge">未下发</span>
              <span v-if="row.checkedIn" class="badge" style="margin-left: 4px;">已签到</span>
            </td>
            <td>
              <span v-if="row.isMember" class="badge member">会员</span>
              <span v-else class="badge">非会员</span>
            </td>
            <td>
              <div class="cell-ops">
                <button
                  v-if="row.isMember"
                  class="op"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="toggleMember(row)"
                >取消会员</button>
                <button
                  v-else
                  class="op primary"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="toggleMember(row)"
                >设为会员</button>

                <button
                  v-if="row.order && ['pending', 'reviewing'].includes(row.order.status)"
                  class="op primary"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="approvePayment(row)"
                >收款确认</button>

                <button
                  v-if="row.status === 'confirmed' && row.isMember && !row.credential"
                  class="op primary"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="credentialAction(row, 'issue')"
                >下发凭证</button>
                <a
                  v-if="row.credential && row.credential.status === 'active'"
                  class="op"
                  :href="`${portalUrl}/credential/${row.credential.token}`"
                  target="_blank"
                  rel="noopener"
                >查看 QR</a>
                <button
                  v-if="row.credential && row.credential.status === 'active'"
                  class="op danger"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="credentialAction(row, 'revoke')"
                >撤销</button>
                <button
                  v-if="row.credential && row.credential.status === 'revoked'"
                  class="op"
                  type="button"
                  :disabled="busyId === row.id"
                  @click="credentialAction(row, 'restore')"
                >恢复</button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="!data?.rows.length" class="empty">没有符合条件的参会人员。</p>
  </div>
</template>
