<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '稿件审稿 · Admin' })

interface AdminAbstract {
  id: string
  userId: string
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: Array<{ name: string, affiliation: string }>
  status: string
  version: number
  createdAt: string
  userEmail: string | null
}

interface AbstractEvent {
  id: string
  abstractId: string
  kind: string
  comment: string | null
  actor: string
  createdAt: string
}

const { data, error, refresh } = await useFetch<{ abstracts: AdminAbstract[] }>('/api/admin/abstracts')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/admin/login')
}, { immediate: true })

const search = ref('')
const statusFilter = ref<'all' | 'submitted' | 'accepted' | 'returned'>('all')

const filtered = computed(() => {
  const rows = data.value?.abstracts ?? []
  const q = search.value.trim().toLowerCase()
  return rows.filter((row) => {
    if (statusFilter.value !== 'all' && row.status !== statusFilter.value) return false
    if (!q) return true
    return [row.title, row.submitterName, row.userEmail ?? '', row.submitterAffiliation]
      .some(v => v.toLowerCase().includes(q))
  })
})

const statusZh: Record<string, string> = { submitted: '待审', accepted: '已接收', returned: '已返稿' }
const kindZh: Record<string, string> = { submitted: '投稿', resubmitted: '修改重投', accepted: '接收', returned: '返稿' }
const reportZh: Record<string, string> = { oral: '口头报告', poster: '墙报', abstract_only: '仅提交摘要' }
const topicLabel = (no: string) => `${no}`

/* 展开的稿件与审稿表单 */
const expanded = ref<string | null>(null)
const eventsByAbstract = ref<Record<string, AbstractEvent[]>>({})
const comment = ref('')
const busy = ref(false)
const message = ref('')

async function toggleExpand(row: AdminAbstract) {
  if (expanded.value === row.id) {
    expanded.value = null
    return
  }
  expanded.value = row.id
  comment.value = ''
  if (!eventsByAbstract.value[row.id]) {
    try {
      const res = await $fetch<{ events: AbstractEvent[] }>(`/api/admin/abstracts/${row.id}/events`)
      eventsByAbstract.value[row.id] = res.events
    }
    catch {
      eventsByAbstract.value[row.id] = []
    }
  }
}

async function review(row: AdminAbstract, action: 'accept' | 'return') {
  busy.value = true
  message.value = ''
  try {
    await $fetch(`/api/admin/abstracts/${row.id}/review`, {
      method: 'POST',
      body: { action, comment: comment.value },
    })
    message.value = action === 'accept'
      ? `已接收《${row.title}》，审稿意见已通过邮件通知 ${row.userEmail ?? '投稿人'}`
      : `已返稿《${row.title}》，返稿意见已通过邮件通知 ${row.userEmail ?? '投稿人'}`
    expanded.value = null
    await refresh()
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    message.value = e.data?.statusMessage ?? '操作失败'
  }
  finally {
    busy.value = false
  }
}

function fmt(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN · ABSTRACT REVIEW</span>
        <span class="sec-tag">{{ filtered.length }} 篇稿件</span>
      </div>
      <h1 class="sec-title">稿件审稿</h1>
    </header>

    <p class="guide">
      查看全部投稿，填写审稿意见后选择「接收」或「返稿」。返稿意见（不少于 5 个字）将通过邮件发送至投稿人的注册邮箱；
      返稿后投稿人可修改重投，形成新的版本与审稿历史。
    </p>

    <div class="toolbar">
      <input v-model="search" type="search" class="search" placeholder="搜索标题 / 投稿人 / 邮箱 / 机构…" aria-label="搜索稿件">
      <div class="filters" role="group" aria-label="状态筛选">
        <button
          v-for="f in [['all', '全部'], ['submitted', '待审'], ['accepted', '已接收'], ['returned', '已返稿']] as const"
          :key="f[0]"
          class="f-btn"
          :class="{ on: statusFilter === f[0] }"
          type="button"
          @click="statusFilter = f[0]"
        >{{ f[1] }}</button>
      </div>
    </div>

    <p v-if="message" class="msg mono">{{ message }}</p>

    <ul v-if="filtered.length" class="abs-list">
      <li v-for="row in filtered" :key="row.id" class="abs">
        <button class="abs-head" type="button" :aria-expanded="expanded === row.id" @click="toggleExpand(row)">
          <span class="abs-title">{{ row.title }}</span>
          <span class="abs-sub mono">{{ row.submitterName }} · {{ row.userEmail }}</span>
          <span class="abs-side">
            <span class="badge">{{ reportZh[row.reportType] ?? row.reportType }} · v{{ row.version }}</span>
            <span class="badge st" :class="{ ok: row.status === 'accepted', rev: row.status === 'returned' }">{{ statusZh[row.status] ?? row.status }}</span>
            <span class="mono abs-date">{{ fmt(row.createdAt) }}</span>
          </span>
        </button>

        <div v-if="expanded === row.id" class="abs-detail">
          <dl class="d-grid">
            <div class="d-row"><dt class="mono">主题方向</dt><dd>{{ topicLabel(row.topic) }}</dd></div>
            <div class="d-row"><dt class="mono">机构</dt><dd>{{ row.submitterAffiliation }}</dd></div>
            <div class="d-row full"><dt class="mono">作者</dt><dd>{{ row.authors.map((a, i) => `${i + 1}. ${a.name}（${a.affiliation}）`).join('；') }}</dd></div>
            <div class="d-row full"><dt class="mono">摘要正文</dt><dd class="pre">{{ row.abstractText }}</dd></div>
          </dl>

          <template v-if="eventsByAbstract[row.id]?.length">
            <p class="sub-label mono">历史记录</p>
            <ol class="ev-list">
              <li v-for="ev in eventsByAbstract[row.id]" :key="ev.id" class="ev" :class="{ good: ev.kind === 'accepted', back: ev.kind === 'returned' }">
                <span class="ev-kind mono">{{ kindZh[ev.kind] ?? ev.kind }}</span>
                <span class="mono ev-meta">{{ fmt(ev.createdAt) }} · {{ ev.actor }}</span>
                <p v-if="ev.comment" class="ev-comment">{{ ev.comment }}</p>
              </li>
            </ol>
          </template>

          <template v-if="row.status === 'submitted'">
            <p class="sub-label mono">审稿意见（接收或返稿时随邮件发送给投稿人）</p>
            <textarea v-model="comment" rows="4" class="comment" placeholder="审稿 / 返稿意见（返稿时必填，不少于 5 个字）" />
            <div class="r-actions">
              <button class="btn btn-solid" type="button" :disabled="busy" @click="review(row, 'accept')">
                {{ busy ? '处理中…' : '接收' }}
              </button>
              <button class="btn btn-ghost" type="button" :disabled="busy" @click="review(row, 'return')">
                返稿
              </button>
            </div>
          </template>
          <p v-else class="state mono">
            {{ row.status === 'accepted' ? '该稿件已接收。' : '该稿件已返稿，等待投稿人修改重投。' }}
          </p>
        </div>
      </li>
    </ul>
    <p v-else class="empty mono">没有符合条件的稿件。</p>
  </div>
</template>

<style scoped>
.guide {
  font-size: 14px;
  color: var(--grey);
  line-height: 1.8;
  max-width: 62ch;
  margin-bottom: clamp(22px, 3vw, 32px);
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 18px;
}

.search {
  flex: 1;
  min-width: 220px;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: transparent;
  padding: 10px 13px;
}

.filters {
  display: flex;
  gap: 6px;
}

.f-btn {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .08em;
  border: 1px solid var(--hairline);
  background: none;
  color: var(--grey);
  padding: 9px 12px;
  cursor: pointer;
  transition: all .15s ease;
}

.f-btn.on {
  border-color: var(--ink);
  color: var(--paper);
  background: var(--ink);
}

.msg {
  font-size: 13px;
  color: var(--copper-deep);
  padding: 10px 0;
}

.abs-list {
  border-bottom: 1px solid var(--ink);
}

.abs {
  border-top: 1px solid var(--hairline);
}

.abs-head {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 8px 16px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 16px 0;
  text-align: left;
  font: inherit;
  transition: background-color .15s ease;
}

.abs-head:hover .abs-title {
  color: var(--copper-deep);
}

.abs-title {
  flex: 1 1 300px;
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.45;
}

.abs-sub {
  font-size: 11.5px;
  color: var(--grey);
  letter-spacing: .04em;
}

.abs-side {
  display: flex;
  gap: 8px;
  align-items: center;
}

.abs-date {
  font-size: 11px;
  color: var(--grey);
}

.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .08em;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 3px 8px;
}

.badge.st.ok {
  border-color: #2F6B3A;
  color: #2F6B3A;
}

.badge.st.rev {
  border-color: var(--copper-deep);
  color: var(--copper-deep);
}

.abs-detail {
  border-top: 1px solid var(--hairline-soft);
  padding: 16px 0 22px;
}

.d-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0;
}

.d-row {
  display: grid;
  grid-template-columns: minmax(110px, 160px) 1fr;
  gap: 12px;
  border-top: 1px solid var(--hairline-soft);
  padding: 9px 0;
  align-items: baseline;
}

.d-row.full {
  grid-template-columns: minmax(110px, 160px) 1fr;
}

.d-row dt {
  font-size: 11.5px;
  letter-spacing: .08em;
  color: var(--grey);
}

.d-row dd {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.pre {
  white-space: pre-wrap;
  line-height: 1.75;
}

.sub-label {
  margin-top: 18px;
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--copper-deep);
}

.ev-list {
  border-bottom: 1px solid var(--hairline-soft);
}

.ev {
  border-top: 1px dashed var(--hairline-soft);
  padding: 10px 0;
}

.ev-kind {
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--ink);
  margin-right: 12px;
}

.ev-meta {
  font-size: 11px;
  color: var(--grey);
}

.ev-comment {
  margin-top: 5px;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.comment {
  width: 100%;
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: transparent;
  padding: 11px 13px;
  resize: vertical;
  line-height: 1.7;
}

.r-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}

.state {
  font-size: 12.5px;
  color: var(--grey);
  margin-top: 14px;
}

.empty {
  font-size: 13px;
  color: var(--grey);
  border-top: 1px solid var(--ink);
  padding: 24px 0;
}

@media (min-width: 768px) {
  .d-grid {
    grid-template-columns: 1fr 1fr;
    column-gap: 28px;
  }

  .d-row.full {
    grid-column: 1 / -1;
  }
}
</style>
