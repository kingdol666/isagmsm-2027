<script setup lang="ts">
interface AdminAbstract {
  id: string
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
  kind: string
  comment: string | null
  snapshot: { title: string, reportType: string, abstractText: string } | null
  actor: string
  createdAt: string
}

const { data, error, refresh } = await useFetch<{ abstracts: AdminAbstract[] }>('/api/abstracts')

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
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

const statusZh: Record<string, string> = { submitted: '待审', accepted: '已接收', returned: '已返稿', withdrawn: '已撤回' }
const kindZh: Record<string, string> = { submitted: '投稿', resubmitted: '修改重投', accepted: '接收', returned: '返稿', withdrawn: '撤回' }
const reportZh: Record<string, string> = { oral: '口头报告', poster: '墙报', abstract_only: '仅提交摘要' }

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
      const res = await $fetch<{ events: AbstractEvent[] }>(`/api/abstracts/${row.id}/events`)
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
    await $fetch(`/api/abstracts/${row.id}/review`, {
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
    message.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败'
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
        <span class="sec-code">ADMIN CONSOLE · ABSTRACT REVIEW</span>
        <span class="sec-tag">{{ filtered.length }} 篇稿件</span>
      </div>
      <h1 class="sec-title">稿件<em>审稿</em></h1>
    </header>

    <p class="guide">
      查看全部投稿，填写意见后选择「接收」或「返稿」。返稿意见（不少于 5 个字）将通过邮件发送至投稿人的注册邮箱；
      返稿后投稿人可修改重投，形成新的版本与审稿历史。
    </p>

    <div class="toolbar">
      <input v-model="search" type="search" class="filter-input" placeholder="搜索标题 / 投稿人 / 邮箱 / 机构…" aria-label="搜索稿件">
      <select v-model="statusFilter" class="status-select" aria-label="状态筛选">
        <option value="all">全部</option>
        <option value="submitted">待审</option>
        <option value="accepted">已接收</option>
        <option value="returned">已返稿</option>
      </select>
    </div>

    <p v-if="message" class="msg">{{ message }}</p>

    <ul v-if="filtered.length" class="abs-list">
      <li v-for="row in filtered" :key="row.id" class="abs">
        <button class="abs-head" type="button" :aria-expanded="expanded === row.id" @click="toggleExpand(row)">
          <span class="abs-title">{{ row.title }}</span>
          <span class="abs-sub mono">{{ row.submitterName }} · {{ row.userEmail }}</span>
          <span class="abs-side">
            <span class="badge">{{ reportZh[row.reportType] ?? row.reportType }} · v{{ row.version }}</span>
            <span class="badge st" :class="{ ok: row.status === 'accepted', rev: row.status === 'returned' }">{{ statusZh[row.status] ?? row.status }}</span>
            <span class="abs-date">{{ fmt(row.createdAt) }}</span>
          </span>
        </button>

        <div v-if="expanded === row.id" class="abs-detail">
          <dl class="d-grid">
            <div class="d-row"><dt>主题方向</dt><dd>{{ row.topic }}</dd></div>
            <div class="d-row"><dt>机构</dt><dd>{{ row.submitterAffiliation }}</dd></div>
            <div class="d-row full"><dt>作者</dt><dd>{{ row.authors.map((a, i) => `${i + 1}. ${a.name}（${a.affiliation}）`).join('；') }}</dd></div>
            <div class="d-row full"><dt>摘要正文</dt><dd class="pre">{{ row.abstractText }}</dd></div>
          </dl>

          <template v-if="eventsByAbstract[row.id]?.length">
            <p class="sub-label">历史记录</p>
            <ol class="ev-list">
              <li v-for="ev in eventsByAbstract[row.id]" :key="ev.id" class="ev">
                <span class="ev-kind">{{ kindZh[ev.kind] ?? ev.kind }}</span>
                <span class="ev-meta">{{ fmt(ev.createdAt) }} · {{ ev.actor }}</span>
                <p v-if="ev.snapshot" class="ev-comment snap-title">《{{ ev.snapshot.title }}》 · {{ reportZh[ev.snapshot.reportType] ?? ev.snapshot.reportType }}</p>
                <p v-if="ev.snapshot" class="ev-comment pre">{{ ev.snapshot.abstractText }}</p>
                <p v-if="ev.comment" class="ev-comment">{{ ev.comment }}</p>
              </li>
            </ol>
          </template>

          <template v-if="row.status === 'submitted'">
            <p class="sub-label">审稿意见（接收或返稿时随邮件发送给投稿人）</p>
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
          <p v-else class="empty" style="border: none; padding: 14px 0 0;">
            {{ row.status === 'accepted' ? '该稿件已接收。' : '该稿件已返稿，等待投稿人修改重投。' }}
          </p>
        </div>
      </li>
    </ul>
    <p v-else class="empty">没有符合条件的稿件。</p>
  </div>
</template>
