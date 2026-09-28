<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '参会人员管理 · Admin' })

interface ParticipantRow {
  registrationId: string
  displayId: string
  fullName: string
  email: string
  phone: string | null
  affiliation: string
  country: string
  status: string
  isMember: boolean
  createdAt: string
  typeName: string
  order: { orderNo: string, status: string, totalFen: number } | null
  credential: { id: string, token: string, status: string, checkedInAt: string | null } | null
}

const search = ref('')
const status = ref('')
const page = ref(1)
const pageSize = 20

const query = computed(() => ({
  search: search.value || undefined,
  status: status.value || undefined,
  page: page.value,
  pageSize,
}))

const { data, error, refresh } = await useFetch<{ rows: ParticipantRow[], total: number, reviewingCount: number }>('/api/admin/participants', { query })

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

watch([search, status], () => {
  page.value = 1
  refresh()
})

const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total ?? 0) / pageSize)))

const busyId = ref<string | null>(null)
const message = ref('')

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

async function act(row: ParticipantRow, action: 'issue' | 'revoke' | 'restore') {
  busyId.value = row.registrationId
  message.value = ''
  try {
    const res = await $fetch<{ token: string, status: string }>('/api/admin/credentials/manage', {
      method: 'POST',
      body: { registrationId: row.registrationId, action },
    })
    message.value = `${row.displayId} 凭证已${action === 'issue' ? '下发' : action === 'revoke' ? '撤销' : '恢复'}（${res.status}）`
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

async function confirmPayment(row: ParticipantRow) {
  busyId.value = row.registrationId
  message.value = ''
  try {
    const res = await $fetch<{ credentialToken: string | null }>(`/api/admin/orders/review-by-registration`, {
      method: 'POST',
      body: { registrationId: row.registrationId },
    })
    message.value = `${row.displayId} 已确认收款${res.credentialToken ? '，凭证已下发' : ''}`
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

async function toggleMember(row: ParticipantRow) {
  busyId.value = row.registrationId
  message.value = ''
  try {
    await $fetch(`/api/admin/participants/${row.registrationId}/membership`, {
      method: 'POST',
      body: { isMember: !row.isMember },
    })
    message.value = `${row.displayId} 已${row.isMember ? '取消' : '赋予'}会员标识`
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
        <span class="sec-code">ADMIN · PARTICIPANTS</span>
        <span class="sec-tag">
          {{ data?.total ?? 0 }} 人
          <template v-if="(data?.reviewingCount ?? 0) > 0"> · 待审核 {{ data?.reviewingCount }}</template>
        </span>
      </div>
      <h1 class="sec-title">参会人员管理</h1>
    </header>

    <p class="guide">
      查看全部报名人员信息与缴费/凭证状态。待审核订单请前往
      <NuxtLink class="link" href="/admin/approvals">缴费审批</NuxtLink>
      核对转账；已确认缴费的报名可直接下发凭证，凭证可撤销 / 恢复（撤销后 QR 立即失效）。
    </p>

    <div class="filters">
      <input v-model="search" type="search" class="filter-input" placeholder="搜索姓名 / 邮箱 / 单位 / 参会 ID" aria-label="搜索参会人员">
      <select v-model="status" class="filter-select" aria-label="按报名状态筛选">
        <option value="">全部状态</option>
        <option value="submitted">待缴费</option>
        <option value="confirmed">已确认</option>
        <option value="cancelled">已取消</option>
      </select>
    </div>

    <p v-if="message" class="msg mono">{{ message }}</p>
    <p v-if="error && error.statusCode !== 401" class="state error">加载失败。</p>

    <div v-else class="tbl-wrap">
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
          <tr v-if="!data?.rows.length">
            <td colspan="7" class="empty">没有匹配的参会人员。</td>
          </tr>
          <tr v-for="row in data?.rows" :key="row.registrationId">
            <td class="mono">
              {{ row.displayId }}
              <small class="sub mono">{{ new Date(row.createdAt).toLocaleDateString('zh-CN') }}</small>
            </td>
            <td>
              <strong>{{ row.fullName }}</strong>
              <span v-if="row.isMember" class="badge member">会员</span>
              <small class="sub">{{ row.email }}</small>
              <small class="sub">{{ row.affiliation }}</small>
            </td>
            <td>
              <span class="badge" :class="{ ok: row.status === 'confirmed' }">{{ row.status === 'confirmed' ? '已确认' : row.status === 'submitted' ? '待缴费' : row.status }}</span>
              <small class="sub">{{ row.typeName }}</small>
            </td>
            <td>
              <template v-if="row.order">
                <span class="badge" :class="{ ok: row.order.status === 'paid', rev: row.order.status === 'reviewing' }">{{ row.order.status === 'paid' ? '已缴费' : row.order.status === 'reviewing' ? '审核中' : row.order.status === 'pending' ? '待支付' : row.order.status }}</span>
                <small class="sub mono">¥{{ yuan(row.order.totalFen) }}</small>
              </template>
              <small v-else class="sub">无订单</small>
            </td>
            <td>
              <template v-if="row.credential">
                <span class="badge" :class="{ ok: row.credential.status === 'active' }">{{ row.credential.status === 'active' ? '有效' : '已撤销' }}</span>
                <small v-if="row.credential.checkedInAt" class="sub mono">已签到</small>
              </template>
              <small v-else class="sub">未下发</small>
            </td>
            <td class="actions">
              <button
                v-if="row.order && ['pending', 'reviewing'].includes(row.order.status)"
                class="op primary"
                type="button"
                :disabled="busyId === row.registrationId"
                @click="confirmPayment(row)"
              >收款确认</button>
              <button
                v-if="row.status === 'confirmed' && !row.credential"
                class="op primary"
                type="button"
                :disabled="busyId === row.registrationId"
                @click="act(row, 'issue')"
              >下发凭证</button>
              <NuxtLink
                v-if="row.credential"
                class="op"
                :href="`/credential/${row.credential.token}`"
              >查看 QR</NuxtLink>
              <button
                v-if="row.credential?.status === 'active'"
                class="op danger"
                type="button"
                :disabled="busyId === row.registrationId"
                @click="act(row, 'revoke')"
              >撤销</button>
              <button
                v-if="row.credential?.status === 'revoked'"
                class="op"
                type="button"
                :disabled="busyId === row.registrationId"
                @click="act(row, 'restore')"
              >恢复</button>
              <button
                class="op"
                :class="{ gold: !row.isMember }"
                type="button"
                :disabled="busyId === row.registrationId"
                @click="toggleMember(row)"
              >{{ row.isMember ? '取消会员' : '设为会员' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="totalPages > 1" class="pager">
      <button class="btn btn-ghost" type="button" :disabled="page <= 1" @click="page--; refresh()">← 上一页</button>
      <span class="mono pager-note">{{ page }} / {{ totalPages }}</span>
      <button class="btn btn-ghost" type="button" :disabled="page >= totalPages" @click="page++; refresh()">下一页 →</button>
    </div>
  </div>
</template>

<style scoped>
.guide {
  font-size: 14px;
  color: var(--grey);
  line-height: 1.8;
  max-width: 68ch;
  margin-bottom: clamp(22px, 3vw, 34px);
}

.link { color: var(--copper-deep); text-decoration: underline; }

.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 20px;
}

.filter-input,
.filter-select {
  font: inherit;
  font-size: 14px;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 10px 12px;
  border-radius: 0;
}

.filter-input { flex: 1; min-width: 220px; }

.filter-input:focus,
.filter-select:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg { font-size: 13px; color: var(--copper-deep); padding: 8px 0; }

.tbl-wrap {
  overflow-x: auto;
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.tbl {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
  min-width: 860px;
}

.tbl th {
  text-align: left;
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  font-weight: 500;
  color: var(--grey);
  padding: 12px 14px 12px 0;
  border-bottom: 1px solid var(--ink);
  white-space: nowrap;
}

.tbl td {
  padding: 14px 14px 14px 0;
  border-bottom: 1px solid var(--hairline);
  vertical-align: top;
}

.tbl td.mono { font-family: var(--mono); font-size: 13px; letter-spacing: .05em; color: var(--copper-deep); }

.sub {
  display: block;
  font-size: 12px;
  color: var(--grey);
  margin-top: 3px;
  max-width: 240px;
  overflow-wrap: anywhere;
}

.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .06em;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 4px 8px;
  white-space: nowrap;
}

.badge.ok { border-color: var(--copper-deep); color: var(--copper-deep); }
.badge.rev { border-color: var(--ink); color: var(--ink); }

.badge.member {
  border-color: var(--copper);
  color: var(--paper);
  background: var(--copper);
  margin-left: 8px;
}

.op.gold { border-color: var(--copper-deep); color: var(--copper-deep); }
.op.gold:hover { background: var(--copper-deep); color: var(--paper); }

.actions { min-width: 180px; }

.op {
  display: inline-block;
  font-family: var(--mono);
  font-size: 11.5px;
  letter-spacing: .06em;
  border: 1px solid var(--ink);
  background: transparent;
  color: var(--ink);
  padding: 6px 10px;
  margin: 0 8px 8px 0;
  cursor: pointer;
  text-decoration: none;
  transition: background-color .15s ease, color .15s ease;
}

.op:hover { background: var(--ink); color: var(--paper); }

.op.primary { border-color: var(--copper-deep); color: var(--copper-deep); }
.op.primary:hover { background: var(--copper-deep); color: var(--paper); }

.op.danger { border-color: var(--hairline); color: var(--grey); }

.empty {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--grey);
  padding: 24px 0;
}

.pager {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 22px;
}

.pager-note { font-size: 12.5px; color: var(--grey); }

.state.error {
  font-family: var(--mono);
  font-size: 13px;
  color: var(--copper-deep);
  padding: 12px 0;
}
</style>
