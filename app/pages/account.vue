<script setup lang="ts">
import { accountProfileSchema } from '#shared/schemas/auth'

definePageMeta({ layout: 'flow' })
useSeoMeta({ title: '个人中心' })

interface MyRegistration {
  id: string
  displayId: string
  status: string
  createdAt: string
  typeName: string
  order: { id: string, orderNo: string, totalFen: number, currency: string, status: string } | null
  credentialToken: string | null
}

const { user } = useAuth()

/* credential card */
const activeCredential = computed(() => {
  return registrations.value.find(r => r.credentialToken && r.status === 'confirmed') ?? null
})

/* profile */
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
const profileLoaded = ref(false)
const profileSaved = ref(false)
const profileError = ref('')
const profileBusy = ref(false)

/* registrations */
const registrations = ref<MyRegistration[]>([])
const regsLoaded = ref(false)

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const statusZh: Record<string, string> = {
  submitted: '待缴费',
  confirmed: '已确认',
  cancelled: '已取消',
  pending: '待支付',
  reviewing: '审核中',
  paid: '已缴费',
  failed: '已失败',
  expired: '已过期',
}

function zh(value: string) {
  return statusZh[value] ?? value
}

onMounted(async () => {
  const { fetchUser } = useAuth()
  const current = await fetchUser()
  if (!current) {
    await navigateTo(`/login?redirect=${encodeURIComponent('/account')}`)
    return
  }

  try {
    const res = await $fetch<{ profile: Record<string, string> | null, email: string, fullName: string | null }>('/api/account/profile')
    const p = res.profile
    profileForm.fullName = p?.fullName ?? res.fullName ?? ''
    profileForm.englishName = p?.englishName ?? ''
    profileForm.phone = p?.phone ?? ''
    profileForm.affiliation = p?.affiliation ?? ''
    profileForm.department = p?.department ?? ''
    profileForm.position = p?.position ?? ''
    profileForm.country = p?.country ?? ''
    profileForm.dietary = p?.dietary ?? ''
    profileLoaded.value = true
  }
  catch {
    profileError.value = '资料加载失败。'
    profileLoaded.value = true
  }

  try {
    const res = await $fetch<{ registrations: MyRegistration[] }>('/api/account/registrations')
    registrations.value = res.registrations
  }
  catch { /* list stays empty */ }
  regsLoaded.value = true
})

async function saveProfile() {
  profileBusy.value = true
  profileError.value = ''
  profileSaved.value = false
  try {
    const parsed = accountProfileSchema.safeParse({ ...profileForm })
    if (!parsed.success) {
      profileError.value = parsed.error.issues[0]?.message ?? '请检查表单。'
      return
    }
    await $fetch('/api/account/profile', { method: 'PUT', body: parsed.data })
    profileSaved.value = true
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    profileError.value = e.data?.statusMessage ?? '保存失败。'
  }
  finally {
    profileBusy.value = false
  }
}
</script>

<template>
  <div class="account">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">个人中心</span>
        <span class="sec-tag mono">{{ user?.email }}</span>
      </div>
      <h1 class="sec-title">我的<em>参会</em></h1>
    </header>

    <!-- 会议凭证卡：QR + token 直达 -->
    <section v-if="activeCredential?.credentialToken" class="cred-card" aria-label="会议凭证">
      <div class="cred-info">
        <p class="cc-label mono">会议凭证 · 现场签到二维码</p>
        <p class="cc-name">{{ activeCredential.typeName }} · {{ user?.fullName || profileForm.fullName }}</p>
        <p class="cc-id mono">{{ activeCredential.displayId }}</p>
        <div class="cc-actions">
          <a class="btn btn-solid" :href="`/api/credentials/${activeCredential.credentialToken}/pdf`" download>下载 PDF 凭证</a>
          <NuxtLink class="btn btn-ghost" :to="`/credential/${activeCredential.credentialToken}`">凭证详情</NuxtLink>
        </div>
      </div>
      <figure class="cred-qr">
        <img
          :src="`/api/credentials/${activeCredential.credentialToken}/qr`"
          alt="会议签到二维码"
          width="168"
          height="168"
        >
        <figcaption class="mono cc-token">TOKEN: {{ activeCredential.credentialToken.slice(0, 18) }}…</figcaption>
      </figure>
    </section>

    <!-- 我的报名 -->
    <section class="section" aria-label="我的报名">
      <h2 class="s-title">我的报名</h2>
      <ul v-if="registrations.length" class="reg-list">
        <li v-for="reg in registrations" :key="reg.id" class="reg-row">
          <div class="reg-main">
            <span class="mono reg-id">{{ reg.displayId }}</span>
            <span class="reg-type">{{ reg.typeName }}</span>
            <span class="badge" :class="{ ok: reg.status === 'confirmed' }">{{ zh(reg.status) }}</span>
          </div>
          <div class="reg-sub">
            <span class="mono">{{ new Date(reg.createdAt).toLocaleDateString('zh-CN') }}</span>
            <span v-if="reg.order" class="mono">订单 {{ reg.order.orderNo }} · ¥{{ yuan(reg.order.totalFen) }}</span>
            <span class="badge pay" :class="{ ok: reg.order?.status === 'paid', rev: reg.order?.status === 'reviewing' }">
              {{ reg.order ? `缴费：${zh(reg.order.status)}` : '尚未生成订单' }}
            </span>
          </div>
          <div class="reg-actions">
            <NuxtLink
              v-if="reg.order && (reg.order.status === 'pending' || reg.order.status === 'failed' || reg.order.status === 'expired')"
              class="btn btn-solid"
              :to="`/payment/${reg.order.id}`"
            >继续缴费</NuxtLink>
            <NuxtLink
              v-if="reg.credentialToken"
              class="btn btn-ghost"
              :to="`/credential/${reg.credentialToken}`"
            >查看凭证</NuxtLink>
          </div>
        </li>
      </ul>
      <p v-else-if="regsLoaded" class="note mono">
        还没有报名记录。
        <NuxtLink class="link" href="/register">立即报名 ISAGMSM 2026 →</NuxtLink>
      </p>
      <p v-else class="note mono">正在加载报名记录…</p>
    </section>

    <!-- 参会人资料 -->
    <section class="section" aria-label="参会人资料">
      <h2 class="s-title">参会人资料</h2>
      <p class="note mono">填写一次，报名时自动预填。</p>
      <form v-if="profileLoaded" class="form" @submit.prevent="saveProfile">
        <div class="grid">
          <label class="field">
            <span class="f-label mono">姓名 *</span>
            <input v-model="profileForm.fullName" type="text" autocomplete="name">
          </label>
          <label class="field">
            <span class="f-label mono">英文名</span>
            <input v-model="profileForm.englishName" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">手机号</span>
            <input v-model="profileForm.phone" type="tel" autocomplete="tel">
          </label>
          <label class="field">
            <span class="f-label mono">国家 / 地区 *</span>
            <input v-model="profileForm.country" type="text" autocomplete="country-name">
          </label>
          <label class="field wide">
            <span class="f-label mono">单位 *</span>
            <input v-model="profileForm.affiliation" type="text" autocomplete="organization">
          </label>
          <label class="field">
            <span class="f-label mono">院系 / 部门</span>
            <input v-model="profileForm.department" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">职务</span>
            <input v-model="profileForm.position" type="text">
          </label>
          <label class="field wide">
            <span class="f-label mono">饮食禁忌</span>
            <input v-model="profileForm.dietary" type="text" placeholder="如：素食">
          </label>
        </div>
        <p v-if="profileSaved" class="msg ok mono">资料已保存。</p>
        <p v-if="profileError" class="msg bad mono">{{ profileError }}</p>
        <button class="btn btn-solid" type="submit" :disabled="profileBusy">
          {{ profileBusy ? '保存中…' : '保存资料' }}
        </button>
      </form>
      <p v-else class="note mono">正在加载资料…</p>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: clamp(36px, 6vw, 60px); }

.s-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 14px;
  margin-bottom: 18px;
}

/* credential card */
.cred-card {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  border: 1px solid var(--ink);
  padding: clamp(20px, 3vw, 30px);
  background: linear-gradient(rgba(180, 95, 58, .04), rgba(180, 95, 58, .04)), var(--paper);
}

.cc-label {
  font-size: 11.5px;
  letter-spacing: .16em;
  color: var(--copper-deep);
}

.cc-name {
  font-size: clamp(1.2rem, 2.6vw, 1.6rem);
  font-weight: 600;
  margin-top: 10px;
}

.cc-id {
  font-size: 15px;
  color: var(--grey);
  margin-top: 6px;
  letter-spacing: .08em;
}

.cc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 18px;
}

.cred-qr {
  justify-self: start;
  border: 1px solid var(--ink);
  padding: 10px;
  background: var(--paper);
}

.cred-qr img { width: 168px; height: 168px; display: block; }

.cc-token {
  font-size: 10px;
  color: var(--grey);
  margin-top: 8px;
  text-align: center;
}

/* registrations */
.reg-list { border-bottom: 1px solid var(--ink); }

.reg-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  border-top: 1px solid var(--hairline);
  padding: 18px 0;
}

.reg-main { display: flex; flex-wrap: wrap; align-items: baseline; gap: 14px; }
.reg-id { font-size: 13px; color: var(--copper-deep); letter-spacing: .08em; }
.reg-type { font-size: 1.35rem; font-weight: 600; }

.reg-sub { display: flex; flex-wrap: wrap; gap: 8px 22px; font-size: 12.5px; color: var(--grey); }

.reg-actions { display: flex; flex-wrap: wrap; gap: 12px; }

.badge {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .08em;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 4px 8px;
}

.badge.ok { border-color: var(--copper-deep); color: var(--copper-deep); }
.badge.rev { border-color: var(--ink); color: var(--ink); }

/* profile form */
.form { display: flex; flex-direction: column; gap: 20px; align-items: flex-start; }

.grid { display: grid; grid-template-columns: 1fr; gap: 18px 24px; width: 100%; }
.field { display: flex; flex-direction: column; gap: 7px; width: 100%; }
.field.wide { grid-column: 1 / -1; }

.f-label {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--grey);
}

.field input {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 12px 14px;
  border-radius: 0;
  width: 100%;
}

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.msg.ok { font-size: 13px; color: var(--ink); border: 1px solid var(--copper-deep); padding: 8px 14px; }
.msg.bad { font-size: 13px; color: var(--copper-deep); }

.note { font-size: 12.5px; color: var(--grey); padding: 6px 0; }

.link { color: var(--copper-deep); text-decoration: underline; }

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .cred-card { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
  .reg-row { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: center; }
  .reg-actions { grid-column: 1 / -1; }
}
</style>
