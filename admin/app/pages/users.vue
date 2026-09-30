<script setup lang="ts">
interface UserRow {
  id: string
  email: string
  fullName: string | null
  emailVerified: boolean
  hasPassword: boolean
  registrationCount: number
  createdAt: string
}

interface RegistrationRow {
  id: string
  displayId: string
  typeName: string | null
  status: string
  isMember: boolean
  createdAt: string
}

interface UserProfile {
  fullName: string
  englishName: string
  phone: string
  affiliation: string
  department: string
  position: string
  country: string
  dietary: string
}

const search = ref('')

/* 搜索作为响应式 query —— 变化时自动重新请求 */
const { data, error, refresh } = await useFetch<{ rows: UserRow[] }>('/api/users', {
  query: { q: search },
})

watch(error, (err) => {
  if (err?.statusCode === 401) navigateTo('/login')
}, { immediate: true })

const expanded = ref<string | null>(null)
const detail = ref<{ user: { id: string, email: string, fullName: string | null, profile: UserProfile | null, emailVerified: boolean, hasPassword: boolean, createdAt: string }, registrations: RegistrationRow[] } | null>(null)
const detailLoading = ref(false)

const pwdBusy = ref(false)
const newPwd = ref('')
const pwdMsg = ref('')
const pwdOk = ref(true)

const profileForm = reactive({
  fullName: '',
  englishName: '',
  phone: '',
  affiliation: '',
  department: '',
  position: '',
  country: '',
  dietary: '',
})
const profileBusy = ref(false)
const profileMsg = ref('')
const profileOk = ref(true)

const statusZh: Record<string, string> = { submitted: '待缴费', confirmed: '已确认', cancelled: '已取消' }

function fmt(value: string) {
  return new Date(value).toLocaleString('zh-CN')
}

function say(text: string, ok = true) {
  pwdMsg.value = text
  pwdOk.value = ok
}

async function toggleExpand(row: UserRow) {
  if (expanded.value === row.id) {
    expanded.value = null
    detail.value = null
    return
  }
  expanded.value = row.id
  pwdMsg.value = ''
  newPwd.value = ''
  profileMsg.value = ''
  detailLoading.value = true
  try {
    // as any：Nuxt typed-routes 对动态路由的模板联合类型在路由多时会栈溢出（TS2321）
    detail.value = await ($fetch as (url: string) => Promise<{ user: { id: string, email: string, fullName: string | null, profile: UserProfile | null, emailVerified: boolean, hasPassword: boolean, createdAt: string }, registrations: RegistrationRow[] }>)(`/api/users/${row.id}`)
    if (detail.value?.user.profile) {
      Object.assign(profileForm, detail.value.user.profile)
    }
    else {
      Object.keys(profileForm).forEach((k) => { (profileForm as Record<string, string>)[k] = '' })
    }
    profileForm.fullName = detail.value?.user.fullName ?? ''
  }
  finally {
    detailLoading.value = false
  }
}

async function resetPassword(row: UserRow) {
  if (newPwd.value.length < 8) {
    say('新密码至少 8 位', false)
    return
  }
  pwdBusy.value = true
  try {
    await $fetch(`/api/users/${row.id}/password`, { method: 'POST', body: { password: newPwd.value } })
    say(`已强制修改密码：${row.email}。请将新密码告知用户，其原密码已立即失效。`)
    newPwd.value = ''
    await refresh()
  }
  catch (err: unknown) {
    say((err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败', false)
  }
  finally {
    pwdBusy.value = false
  }
}

async function saveProfile(row: UserRow) {
  profileBusy.value = true
  try {
    await $fetch(`/api/users/${row.id}/profile`, { method: 'POST', body: { profile: profileForm } })
    profileMsg.value = '个人资料已更新 ✓'
    profileOk.value = true
    await refresh()
  }
  catch (err: unknown) {
    profileMsg.value = (err as { data?: { statusMessage?: string } }).data?.statusMessage ?? '操作失败'
    profileOk.value = false
  }
  finally {
    profileBusy.value = false
  }
}
</script>

<template>
  <div>
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ADMIN CONSOLE · USERS</span>
        <span class="sec-tag">{{ data?.rows.length ?? 0 }} 个注册账号</span>
      </div>
      <h1 class="sec-title">用户<em>管理</em></h1>
    </header>

    <p class="guide">
      查看所有注册账号（无论是否提交报名）：登录邮箱、个人资料、验证与密码状态。
      支持强制修改用户密码（原密码立即失效）与代编辑个人资料。
    </p>

    <input v-model="search" type="search" class="filter-input" placeholder="搜索邮箱 / 姓名…" aria-label="搜索用户">

    <p v-if="error" class="msg">加载失败</p>

    <table v-if="data?.rows.length" class="user-table">
      <thead>
        <tr>
          <th>登录邮箱</th>
          <th>姓名</th>
          <th>验证</th>
          <th>密码</th>
          <th>报名数</th>
          <th>注册时间</th>
          <th />
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in data.rows" :key="row.id">
          <td class="mono">{{ row.email }}</td>
          <td>{{ row.fullName || '—' }}</td>
          <td>{{ row.emailVerified ? '已验证' : '未验证' }}</td>
          <td>{{ row.hasPassword ? '已设置' : '未设置' }}</td>
          <td>{{ row.registrationCount }}</td>
          <td class="mono">{{ fmt(row.createdAt) }}</td>
          <td><button class="btn btn-ghost" type="button" @click="toggleExpand(row)">{{ expanded === row.id ? '收起' : '详情 / 管理' }}</button></td>
        </tr>
      </tbody>
    </table>
    <p v-else class="empty">没有匹配的用户。</p>

    <!-- 详情：资料编辑 + 强制改密 -->
    <section v-for="row in data?.rows.filter(r => expanded === r.id)" :key="'d-' + row.id" class="detail">
      <h2 class="d-title mono">{{ row.email }}</h2>

      <h3 class="d-sub">强制修改密码</h3>
      <div class="pwd-row">
        <input v-model="newPwd" type="text" placeholder="新密码（至少 8 位，设置后告知用户）" autocomplete="off">
        <button class="btn btn-solid" type="button" :disabled="pwdBusy || newPwd.length < 8" @click="resetPassword(row)">
          {{ pwdBusy ? '处理中…' : '强制修改密码' }}
        </button>
      </div>
      <p v-if="pwdMsg" class="msg" :class="{ ok: pwdOk }">{{ pwdMsg }}</p>

      <h3 class="d-sub">个人资料</h3>
      <div class="profile-grid">
        <label>姓名<input v-model="profileForm.fullName" type="text"></label>
        <label>英文名<input v-model="profileForm.englishName" type="text"></label>
        <label>手机<input v-model="profileForm.phone" type="text"></label>
        <label>单位<input v-model="profileForm.affiliation" type="text"></label>
        <label>院系 / 部门<input v-model="profileForm.department" type="text"></label>
        <label>职务<input v-model="profileForm.position" type="text"></label>
        <label>国家 / 地区<input v-model="profileForm.country" type="text"></label>
        <label>饮食禁忌<input v-model="profileForm.dietary" type="text"></label>
      </div>
      <button class="btn btn-solid" type="button" :disabled="profileBusy" @click="saveProfile(row)">
        {{ profileBusy ? '保存中…' : '保存资料修改' }}
      </button>
      <p v-if="profileMsg" class="msg" :class="{ ok: profileOk }">{{ profileMsg }}</p>

      <h3 class="d-sub">报名记录（{{ detail?.registrations.length ?? 0 }}）</h3>
      <ul class="reg-list">
        <li v-for="reg in detail?.registrations ?? []" :key="reg.id" class="mono">
          {{ reg.displayId }} · {{ reg.typeName ?? '?' }} · {{ statusZh[reg.status] ?? reg.status }}{{ reg.isMember ? ' · 会员' : '' }} · {{ fmt(reg.createdAt) }}
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.guide { color: var(--grey); font-size: 14px; margin: 14px 0 18px; }
.filter-input { width: 360px; max-width: 100%; padding: 10px 12px; margin-bottom: 18px; }
.user-table { width: 100%; border-collapse: collapse; }
.user-table th, .user-table td { border-bottom: 1px solid var(--hairline); padding: 10px 8px; text-align: left; font-size: 14px; }
.user-table th { color: var(--grey); font-weight: 500; }
.detail { margin: 26px 0; border: 1px solid var(--ink); padding: 20px; }
.d-title { font-size: 15px; margin-bottom: 14px; }
.d-sub { font-size: 13px; color: var(--copper-deep); margin: 18px 0 10px; }
.pwd-row { display: flex; gap: 10px; }
.pwd-row input { flex: 1; max-width: 420px; padding: 10px 12px; border: 1px solid var(--ink); }
.profile-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px 18px; margin-bottom: 14px; }
.profile-grid label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--grey); }
.profile-grid input { padding: 9px 11px; border: 1px solid var(--ink); font: inherit; }
.reg-list { list-style: none; padding: 0; }
.reg-list li { padding: 6px 0; border-bottom: 1px dashed var(--hairline); font-size: 13px; }
.msg { margin-top: 10px; font-size: 13px; }
.msg.ok { color: var(--copper-deep); }
.mono { font-family: var(--mono); }
.btn { cursor: pointer; }
.btn-ghost { background: none; border: 1px solid var(--ink); padding: 6px 12px; }
.btn-solid { background: var(--ink); color: var(--paper); border: 1px solid var(--ink); padding: 9px 16px; }
.empty { color: var(--grey); }
</style>
