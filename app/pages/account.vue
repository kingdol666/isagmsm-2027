<script setup lang="ts">
import { accountProfileSchema } from '#shared/schemas/auth'
import { formatAttachmentSize } from '#shared/schemas/abstract'
import { siteContent } from '#shared/content/localized'

definePageMeta({ layout: 'flow' })
const { t, locale, isEn } = useI18n()

useSeoMeta({ title: () => t('account.seoTitle') })

interface MyRegistration {
  id: string
  displayId: string
  status: string
  createdAt: string
  typeName: string
  affiliation: string
  isMember: boolean
  credentialStatus: string | null
  order: { id: string, orderNo: string, totalFen: number, currency: string, status: string } | null
  credentialToken: string | null
}

const { user } = useAuth()

/* credential card */
const activeCredential = computed(() => {
  return registrations.value.find(r => r.credentialToken && r.status === 'confirmed') ?? null
})
const activeToken = computed(() => activeCredential.value?.credentialToken ?? null)

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
const profileSavedAt = ref('')
const profileError = ref('')
const profileFieldErrors = ref<Record<string, string>>({})
const profileBusy = ref(false)
const profileInitial = ref('')

const profileDirty = computed(() => {
  if (!profileInitial.value) return false
  return JSON.stringify(profileForm) !== profileInitial.value
})

const abstractSummary = computed(() => {
  const total = abstracts.value.filter(a => a.status !== 'withdrawn').length
  const pending = abstracts.value.filter(a => a.status === 'submitted').length
  const accepted = abstracts.value.filter(a => a.status === 'accepted').length
  const returned = abstracts.value.filter(a => a.status === 'returned').length
  return { total, pending, accepted, returned }
})

/* registrations */
const registrations = ref<MyRegistration[]>([])
const regsLoaded = ref(false)

/* abstracts（我的投稿 + 历史记录） */
interface AbstractSnapshot {
  title: string
  topic: string
  reportType: string
  abstractText: string
  submitterName: string
  submitterAffiliation: string
  authors: Array<{ name: string, affiliation: string }>
}

interface MyAbstract {
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
  events: Array<{
    id: string
    kind: string
    comment: string | null
    snapshot: AbstractSnapshot | null
    version: number | null
    fileName: string | null
    fileSize: number | null
    fileType: string | null
    actor: string
    createdAt: string
  }>
}
const abstracts = ref<MyAbstract[]>([])
const abstractsLoaded = ref(false)
const expandedAbstract = ref<string | null>(null)
const withdrawBusy = ref<string | null>(null)

const content = computed(() => siteContent(locale.value))

const abstractStatusZh = computed<Record<string, string>>(() => ({
  submitted: t('account.abstracts.statusSubmitted'),
  accepted: t('account.abstracts.statusAccepted'),
  returned: t('account.abstracts.statusReturned'),
  withdrawn: t('account.abstracts.statusWithdrawn'),
}))

const abstractEventZh = computed<Record<string, string>>(() => ({
  submitted: t('account.abstracts.eventSubmitted'),
  resubmitted: t('account.abstracts.eventResubmitted'),
  accepted: t('account.abstracts.eventAccepted'),
  returned: t('account.abstracts.eventReturned'),
  withdrawn: t('account.abstracts.eventWithdrawn'),
}))

const reportZh = computed<Record<string, string>>(() => ({
  oral: t('account.abstracts.reportOral'),
  poster: t('account.abstracts.reportPoster'),
  abstract_only: t('account.abstracts.reportAbstractOnly'),
}))

/* 主题方向编号 → 名称：跟随站点内容当前语言 */
const topicZh = computed<Record<string, string>>(() =>
  Object.fromEntries(content.value.themesContent.items.map(i => [i.no, i.title])),
)

function absZh(value: string) {
  return abstractStatusZh.value[value] ?? value
}

function toggleAbstract(id: string) {
  expandedAbstract.value = expandedAbstract.value === id ? null : id
}

function fmtDate(value: string) {
  return new Date(value).toLocaleString(isEn.value ? 'en-US' : 'zh-CN')
}

/** 快照对应的版本号（事件为倒序，最早投稿 = 第 1 版）。 */
function snapshotVersion(abs: MyAbstract, ev: MyAbstract['events'][number]) {
  const snapEvents = abs.events.filter(e => e.snapshot)
  return snapEvents.length - snapEvents.indexOf(ev)
}

async function withdrawAbstract(abs: MyAbstract) {
  if (!window.confirm(t('account.abstracts.withdrawConfirm', { title: abs.title }))) return
  withdrawBusy.value = abs.id
  try {
    await $fetch(`/api/abstracts/${abs.id}/withdraw`, { method: 'POST' })
    const res = await $fetch<{ abstracts: MyAbstract[] }>('/api/abstracts/mine')
    abstracts.value = res.abstracts
  }
  catch (err: unknown) {
    window.alert((err as { data?: { statusMessage?: string } }).data?.statusMessage ?? t('account.abstracts.withdrawFailed'))
  }
  finally {
    withdrawBusy.value = null
  }
}

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

const statusZh = computed<Record<string, string>>(() => ({
  submitted: t('account.status.submitted'),
  confirmed: t('account.status.confirmed'),
  cancelled: t('account.status.cancelled'),
  pending: t('account.status.pending'),
  reviewing: t('account.status.reviewing'),
  paid: t('account.status.paid'),
  failed: t('account.status.failed'),
  expired: t('account.status.expired'),
}))

function zh(value: string) {
  return statusZh.value[value] ?? value
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
    profileInitial.value = JSON.stringify(profileForm)
    profileLoaded.value = true
  }
  catch {
    profileError.value = t('account.profile.loadFailed')
    profileLoaded.value = true
  }

  try {
    const res = await $fetch<{ registrations: MyRegistration[] }>('/api/account/registrations')
    registrations.value = res.registrations
  }
  catch { /* list stays empty */ }
  regsLoaded.value = true

  try {
    const res = await $fetch<{ abstracts: MyAbstract[] }>('/api/abstracts/mine')
    abstracts.value = res.abstracts
  }
  catch { /* list stays empty */ }
  abstractsLoaded.value = true
})

async function saveProfile() {
  profileBusy.value = true
  profileError.value = ''
  profileSaved.value = false
  profileFieldErrors.value = {}
  try {
    const parsed = accountProfileSchema.safeParse({ ...profileForm })
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors[key]) fieldErrors[key] = issue.message
      }
      profileFieldErrors.value = fieldErrors
      profileError.value = parsed.error.issues[0]?.message ?? t('account.profile.checkForm')
      return
    }
    await $fetch('/api/account/profile', { method: 'PUT', body: parsed.data })
    profileInitial.value = JSON.stringify(profileForm)
    profileSaved.value = true
    profileSavedAt.value = new Date().toLocaleTimeString(isEn.value ? 'en-US' : 'zh-CN')
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    profileError.value = e.data?.statusMessage ?? t('account.profile.saveFailed')
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
        <span class="sec-code">{{ t('account.secCode') }}</span>
        <span class="sec-tag mono">{{ user?.email }}</span>
      </div>
      <h1 class="sec-title">{{ t('account.titleA') }}<em>{{ t('account.titleEm') }}</em></h1>
    </header>

    <!-- 锚点子导航：长页面快速跳转 -->
    <nav class="subnav mono" :aria-label="t('account.subnav.label')">
      <a v-if="activeCredential" href="#my-credential">{{ t('account.subnav.credential') }}</a>
      <a href="#registrations">{{ t('account.subnav.registrations') }}</a>
      <a href="#abstracts">{{ t('account.subnav.abstracts') }}<sup v-if="abstractSummary.total">{{ abstractSummary.total }}</sup></a>
      <a href="#profile">{{ t('account.subnav.profile') }}</a>
    </nav>

    <!-- 电子会议卡：深色徽章设计，含会员ID/姓名/机构/QR/token -->
    <section v-if="activeCredential" id="my-credential" class="ecard-section" :aria-label="t('account.ecard.sectionLabel')">
      <div class="ecard" :class="{ revoked: activeCredential.credentialStatus === 'revoked' }">
        <div class="ecard-main">
          <div class="ec-top">
            <p class="ec-mark">ISAGMSM<i>·</i>27</p>
            <span class="ec-badge mono" :class="{ off: activeCredential.credentialStatus !== 'active' }">
              {{ activeCredential.credentialStatus === 'active' ? t('account.ecard.badgeActive') : t('account.ecard.badgeRevoked') }}
            </span>
          </div>
          <p class="ec-conf mono">{{ t('account.ecard.confName') }}</p>
          <div class="ec-id-row">
            <p class="ec-label ec-id-label mono">{{ t('account.ecard.idLabel') }}</p>
            <span v-if="activeCredential.isMember" class="ec-member mono">{{ t('account.ecard.memberBadge') }}</span>
          </div>
          <p class="ec-id mono">{{ activeCredential.displayId }}</p>
          <p class="ec-name">{{ user?.fullName || profileForm.fullName || activeCredential.typeName }}</p>
          <p class="ec-aff">{{ activeCredential.affiliation }}</p>
          <dl class="ec-facts">
            <div class="ec-fact"><dt>{{ t('account.ecard.memberType') }}</dt><dd>{{ activeCredential.typeName }}</dd></div>
            <div class="ec-fact"><dt>{{ t('account.ecard.validDates') }}</dt><dd>{{ t('account.ecard.dates') }}</dd></div>
            <div class="ec-fact"><dt>{{ t('account.ecard.locationLabel') }}</dt><dd>{{ t('account.ecard.location') }}</dd></div>
          </dl>
        </div>
        <div class="ec-qr-side">
          <figure class="ec-qr">
            <img
              :src="`/api/credentials/${activeToken}/qr`"
              :alt="t('account.ecard.qrAlt')"
              width="150"
              height="150"
            >
          </figure>
          <p class="ec-token mono" :title="activeToken ?? ''">
            TOKEN {{ activeToken?.slice(0, 14) }}…
          </p>
        </div>
        <!-- 凝胶层线收底 -->
        <div class="ec-strata strata" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      </div>
      <div class="ecard-actions">
        <a class="btn btn-solid" :href="`/api/credentials/${activeToken}/pdf`" download>{{ t('account.ecard.downloadPdf') }}</a>
        <NuxtLink class="btn btn-ghost" :to="`/credential/${activeToken}`">{{ t('account.ecard.detailPrint') }}</NuxtLink>
      </div>
    </section>

    <!-- 我的投稿（含审稿结果与历史记录） -->
    <section id="abstracts" class="section" :aria-label="t('account.abstracts.title')">
      <h2 class="s-title">{{ t('account.abstracts.title') }}</h2>
      <p v-if="abstractsLoaded && abstracts.length" class="ab-summary mono">
        {{ t('account.abstracts.summary', { total: abstractSummary.total, pending: abstractSummary.pending, accepted: abstractSummary.accepted, returned: abstractSummary.returned }) }}
        <span class="ab-cap">{{ t('account.abstracts.summaryCap') }}</span>
      </p>
      <p v-if="abstractsLoaded && abstracts.length === 0" class="note mono">
        {{ t('account.abstracts.empty') }}
        <NuxtLink class="link" href="/submit">{{ t('account.abstracts.submitLink') }}</NuxtLink>
      </p>
      <p v-else-if="!abstractsLoaded" class="note mono">{{ t('account.abstracts.loading') }}</p>

      <ul v-else class="ab-list">
        <li v-for="abs in abstracts" :key="abs.id" class="ab-item">
          <div class="ab-head">
            <button class="ab-toggle" type="button" :aria-expanded="expandedAbstract === abs.id" @click="toggleAbstract(abs.id)">
              <span class="ab-title">{{ abs.title }}</span>
              <span class="mono ab-meta">{{ t('account.abstracts.versionN', { n: abs.version }) }} · {{ fmtDate(abs.createdAt) }}</span>
            </button>
            <div class="ab-badges">
              <span class="badge">{{ reportZh[abs.reportType] ?? abs.reportType }}</span>
              <span class="badge st" :class="{ ok: abs.status === 'accepted', rev: abs.status === 'returned' }">{{ absZh(abs.status) }}</span>
            </div>
          </div>

          <dl class="ab-facts mono">
            <div class="ab-fact"><dt>{{ t('account.abstracts.submitter') }}</dt><dd>{{ abs.submitterName }} · {{ abs.submitterAffiliation }}</dd></div>
            <div class="ab-fact"><dt>{{ t('account.abstracts.authors') }}</dt><dd>{{ abs.authors.map((a, i) => `${i + 1}. ${a.name}（${a.affiliation}）`).join('；') }}</dd></div>
          </dl>

          <!-- 最新审稿结果 -->
          <p v-if="abs.status === 'returned'" class="ab-verdict returned">
            <b class="mono">{{ t('account.abstracts.verdictReturned') }}</b>{{ abs.events.find(e => e.kind === 'returned')?.comment || t('account.abstracts.noComment') }}
          </p>
          <p v-else-if="abs.status === 'accepted'" class="ab-verdict accepted">
            <b class="mono">{{ t('account.abstracts.verdictAccepted') }}</b>{{ abs.events.find(e => e.kind === 'accepted')?.comment || t('account.abstracts.noComment') }}
          </p>

          <div class="ab-actions">
            <button
              v-if="abs.status === 'submitted' || abs.status === 'returned'"
              class="btn btn-ghost"
              type="button"
              :disabled="withdrawBusy === abs.id"
              @click="withdrawAbstract(abs)"
            >{{ withdrawBusy === abs.id ? t('account.abstracts.withdrawing') : t('account.abstracts.withdraw') }}</button>
            <NuxtLink v-if="abs.status === 'returned'" class="btn btn-solid" :to="`/submit?id=${abs.id}`">{{ t('account.abstracts.resubmit') }}</NuxtLink>
            <button class="btn btn-ghost" type="button" @click="toggleAbstract(abs.id)">
              {{ expandedAbstract === abs.id ? t('account.abstracts.collapseDetail') : t('account.abstracts.expandDetail') }}
            </button>
          </div>

          <!-- 稿件内容 + 历史时间线 -->
          <div v-if="expandedAbstract === abs.id" class="ab-detail">
            <p class="ab-detail-label mono">{{ t('account.abstracts.currentVersion', { n: abs.version }) }}</p>
            <dl class="ab-facts mono">
              <div class="ab-fact"><dt>{{ t('account.abstracts.topic') }}</dt><dd>{{ topicZh[abs.topic] ?? abs.topic }}（{{ abs.topic }}）</dd></div>
              <div class="ab-fact"><dt>{{ t('account.abstracts.reportType') }}</dt><dd>{{ reportZh[abs.reportType] ?? abs.reportType }}</dd></div>
            </dl>
            <p class="ab-abstract">{{ abs.abstractText }}</p>

            <p class="ab-detail-label mono">{{ t('account.abstracts.historyLabel') }}</p>
            <ol class="ab-timeline">
              <li v-for="ev in abs.events" :key="ev.id" class="ab-ev" :class="{ good: ev.kind === 'accepted', back: ev.kind === 'returned' }">
                <div class="ev-row">
                  <span class="ev-kind mono">{{ abstractEventZh[ev.kind] ?? ev.kind }}</span>
                  <span class="ev-time mono">{{ fmtDate(ev.createdAt) }}</span>
                  <span class="ev-actor mono">{{ ev.actor }}</span>
                </div>
                <p v-if="ev.comment" class="ev-comment">{{ ev.comment }}</p>
                <a
                  v-if="ev.fileName && ev.version"
                  class="ev-file mono"
                  :href="`/api/abstracts/${abs.id}/files/${ev.version}`"
                  :download="ev.fileName"
                >{{ t('account.abstracts.attachment', { n: ev.version, name: ev.fileName }) }}<span v-if="ev.fileSize">（{{ formatAttachmentSize(ev.fileSize) }}）</span> ↓</a>
                <div v-if="ev.snapshot" class="ev-snapshot">
                  <p class="ev-snap-title">《{{ ev.snapshot.title }}》<span class="mono">{{ t('account.abstracts.snapshotMeta', { n: snapshotVersion(abs, ev), report: reportZh[ev.snapshot.reportType] ?? ev.snapshot.reportType }) }}</span></p>
                  <p class="ev-comment pre">{{ ev.snapshot.abstractText }}</p>
                </div>
              </li>
            </ol>
          </div>
        </li>
      </ul>
    </section>

    <!-- 我的报名 -->
    <section id="registrations" class="section" :aria-label="t('account.registrations.title')">
      <h2 class="s-title">{{ t('account.registrations.title') }}</h2>
      <ul v-if="registrations.length" class="reg-list">
        <li v-for="reg in registrations" :key="reg.id" class="reg-row">
          <div class="reg-main">
            <span class="mono reg-id">{{ reg.displayId }}</span>
            <span class="reg-type">{{ reg.typeName }}</span>
            <span class="badge" :class="{ ok: reg.status === 'confirmed' }">{{ zh(reg.status) }}</span>
            <span v-if="reg.isMember" class="badge member">{{ t('account.registrations.memberBadge') }}</span>
          </div>
          <div class="reg-sub">
            <span class="mono">{{ new Date(reg.createdAt).toLocaleDateString(isEn ? 'en-US' : 'zh-CN') }}</span>
            <span v-if="reg.order" class="mono">{{ t('account.registrations.orderRef', { no: reg.order.orderNo, amount: yuan(reg.order.totalFen) }) }}</span>
            <span class="badge pay" :class="{ ok: reg.order?.status === 'paid', rev: reg.order?.status === 'reviewing' }">
              {{ reg.order ? t('account.registrations.payStatus', { status: zh(reg.order.status) }) : t('account.registrations.noOrder') }}
            </span>
          </div>
          <div class="reg-actions">
            <NuxtLink
              v-if="reg.order && (reg.order.status === 'pending' || reg.order.status === 'failed' || reg.order.status === 'expired')"
              class="btn btn-solid"
              :to="`/payment/${reg.order.id}`"
            >{{ t('account.registrations.continuePayment') }}</NuxtLink>
            <NuxtLink
              v-if="reg.credentialToken"
              class="btn btn-ghost"
              :to="`/credential/${reg.credentialToken}`"
            >{{ t('account.registrations.viewCredential') }}</NuxtLink>
          </div>
        </li>
      </ul>
      <p v-else-if="regsLoaded" class="note mono">
        {{ t('account.registrations.empty') }}
        <NuxtLink class="link" href="/register">{{ t('account.registrations.registerLink') }}</NuxtLink>
      </p>
      <p v-else class="note mono">{{ t('account.registrations.loading') }}</p>
    </section>

    <!-- 参会人资料 -->
    <section id="profile" class="section" :aria-label="t('account.profile.title')">
      <h2 class="s-title">{{ t('account.profile.title') }}</h2>
      <p class="note mono">{{ t('account.profile.intro') }}</p>
      <form v-if="profileLoaded" class="form" @submit.prevent="saveProfile">
        <div class="grid">
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.nameLabel') }}</span>
            <input v-model="profileForm.fullName" type="text" autocomplete="name">
            <span v-if="profileFieldErrors.fullName" class="f-err">{{ profileFieldErrors.fullName }}</span>
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.englishNameLabel') }}</span>
            <input v-model="profileForm.englishName" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.phoneLabel') }}</span>
            <input v-model="profileForm.phone" type="tel" autocomplete="tel">
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.countryRegionLabel') }}</span>
            <input v-model="profileForm.country" type="text" autocomplete="country-name">
            <span v-if="profileFieldErrors.country" class="f-err">{{ profileFieldErrors.country }}</span>
          </label>
          <label class="field wide">
            <span class="f-label mono">{{ t('account.profile.affiliationLabel') }}</span>
            <input v-model="profileForm.affiliation" type="text" autocomplete="organization">
            <span v-if="profileFieldErrors.affiliation" class="f-err">{{ profileFieldErrors.affiliation }}</span>
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.departmentLabel') }}</span>
            <input v-model="profileForm.department" type="text">
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('account.profile.positionLabel') }}</span>
            <input v-model="profileForm.position" type="text">
          </label>
          <label class="field wide">
            <span class="f-label mono">{{ t('account.profile.dietaryLabel') }}</span>
            <input v-model="profileForm.dietary" type="text" :placeholder="t('account.profile.dietaryPlaceholder')">
          </label>
        </div>
        <p v-if="profileSaved" class="msg ok mono">{{ t('account.profile.savedMsg', { time: profileSavedAt }) }}</p>
        <p v-if="profileError" class="msg bad mono">{{ profileError }}</p>
        <div class="save-row">
          <button class="btn btn-solid" type="submit" :disabled="profileBusy || !profileDirty">
            {{ profileBusy ? t('account.profile.saving') : profileDirty ? t('account.profile.save') : t('account.profile.noChanges') }}
          </button>
          <span v-if="profileDirty && !profileBusy" class="mono dirty-hint">{{ t('account.profile.dirtyHint') }}</span>
        </div>
      </form>
      <p v-else class="note mono">{{ t('account.profile.loading') }}</p>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: clamp(36px, 6vw, 60px); }

.section, .ecard-section {
  scroll-margin-top: 130px;
}

.s-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 14px;
  margin-bottom: 18px;
}

/* 电子会议卡 */
.ecard-section { margin-top: clamp(30px, 5vw, 48px); }

.ecard {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 26px;
  background: var(--ink);
  color: var(--paper);
  border: 1px solid var(--ink);
  box-shadow: 6px 6px 0 rgba(180, 95, 58, .35);
  padding: clamp(22px, 3.5vw, 34px);
  overflow: hidden;
}

.ecard::before {
  /* 凝胶流动弧线（贴合会议视觉母题） */
  content: "";
  position: absolute;
  right: -140px;
  top: -140px;
  width: 340px;
  height: 340px;
  border: 1px solid var(--copper-light);
  border-radius: 50%;
  opacity: .35;
  pointer-events: none;
}

.ecard::after {
  content: "";
  position: absolute;
  right: -80px;
  top: -110px;
  width: 260px;
  height: 260px;
  border: 1px solid var(--paper-hl);
  border-radius: 50%;
  pointer-events: none;
}

.ec-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
}

.ec-mark {
  font-family: var(--serif);
  font-size: 26px;
  letter-spacing: .02em;
}

.ec-mark i {
  font-style: normal;
  color: var(--copper-light);
}

.ec-badge {
  font-size: 11px;
  letter-spacing: .12em;
  border: 1px solid var(--copper-light);
  color: var(--copper-light);
  padding: 5px 10px;
}

.ec-badge.off {
  border-color: var(--paper-dim);
  color: var(--paper-dim);
}

.ec-conf {
  font-size: 11.5px;
  letter-spacing: .1em;
  color: var(--paper-dim);
  margin-top: 8px;
}

.ec-label {
  font-size: 11px;
  letter-spacing: .18em;
  color: var(--paper-dim);
  margin-top: 20px;
}

.ec-id-label {
  margin-top: 0;
}

.ec-id-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  margin-top: 20px;
}

.ec-id-label {
  margin-top: 0;
}

.ec-member {
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--paper);
  background: var(--copper);
  padding: 4px 10px;
}

.ec-id {
  font-size: clamp(1.4rem, 3vw, 1.9rem);
  letter-spacing: .12em;
  color: var(--copper-light);
  margin-top: 6px;
}

.ec-name {
  font-family: var(--serif);
  font-size: clamp(1.7rem, 3.6vw, 2.4rem);
  line-height: 1.1;
  margin-top: 12px;
}

.ec-aff {
  font-size: 14px;
  color: var(--paper-dim);
  margin-top: 6px;
}

.ec-facts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 30px;
  margin-top: 18px;
}

.ec-fact dt {
  font-family: var(--mono);
  font-size: 10.5px;
  letter-spacing: .14em;
  color: var(--paper-dim);
  text-transform: uppercase;
}

.ec-fact dd {
  font-size: 14px;
  margin-top: 3px;
}

.ec-qr-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  align-self: center;
}

.ec-qr {
  background: var(--paper);
  padding: 9px;
  border: 1px solid var(--copper-light);
}

.ec-qr img {
  width: 150px;
  height: 150px;
  display: block;
}

.ec-token {
  font-size: 9.5px;
  letter-spacing: .06em;
  color: var(--paper-dim);
  max-width: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ec-strata {
  grid-column: 1 / -1;
  color: var(--paper);
  width: min(240px, 60%);
  margin-top: 6px;
}

.ecard.revoked .ec-qr {
  opacity: .25;
}

.ecard-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 16px;
}

@media (min-width: 700px) {
  .ecard { grid-template-columns: minmax(0, 1fr) auto; }
}

@media (max-width: 699px) {
  .ecard { grid-template-columns: 1fr; }
  .ec-qr-side { align-items: flex-start; }
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

/* ---- 我的投稿 ---- */
.ab-list {
  border-bottom: 1px solid var(--ink);
}

.ab-item {
  border-top: 1px solid var(--hairline);
  padding: 18px 0;
}

.ab-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}

.ab-toggle {
  flex: 1;
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  text-align: left;
  font: inherit;
}

.ab-title {
  font-size: 15.5px;
  font-weight: 600;
  line-height: 1.45;
}

.ab-toggle:hover .ab-title {
  color: var(--copper-deep);
}

.ab-meta {
  font-size: 11px;
  letter-spacing: .08em;
  color: var(--grey);
}

.ab-badges {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge.st.ok {
  border-color: #2F6B3A;
  color: #2F6B3A;
}

.badge.st.rev {
  border-color: var(--copper-deep);
  color: var(--copper-deep);
}

.ab-facts {
  margin-top: 10px;
}

.ab-fact {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 10px;
  padding: 4px 0;
  align-items: baseline;
}

.ab-fact dt {
  font-size: 11px;
  letter-spacing: .1em;
  color: var(--grey);
}

.ab-fact dd {
  font-size: 12.5px;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.ab-verdict {
  margin-top: 12px;
  border-left: 3px solid var(--copper-deep);
  background: rgba(180, 95, 58, .06);
  padding: 10px 14px;
  font-size: 13.5px;
  line-height: 1.75;
  white-space: pre-wrap;
}

.ab-verdict.accepted {
  border-left-color: #2F6B3A;
  background: rgba(47, 107, 58, .06);
}

.ab-verdict b {
  display: block;
  font-size: 10.5px;
  letter-spacing: .12em;
  color: var(--grey);
  margin-bottom: 4px;
}

.ab-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.ab-timeline {
  margin-top: 16px;
  border-top: 1px solid var(--hairline);
}

.ab-ev {
  padding: 12px 0 12px 16px;
  border-top: 1px dashed var(--hairline-soft);
  position: relative;
}

.ab-ev::before {
  content: "";
  position: absolute;
  left: 0;
  top: 18px;
  width: 7px;
  height: 7px;
  background: var(--grey);
}

.ab-ev.good::before {
  background: #2F6B3A;
}

.ab-ev.back::before {
  background: var(--copper);
}

.ev-row {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
  align-items: baseline;
}

.ev-kind {
  font-size: 12px;
  letter-spacing: .1em;
  color: var(--ink);
  font-weight: 500;
}

.ev-time,
.ev-actor {
  font-size: 11px;
  color: var(--grey);
  letter-spacing: .05em;
}

.ev-comment {
  margin-top: 6px;
  font-size: 13px;
  line-height: 1.75;
  color: var(--ink);
}

/* 版本附件下载（同一稿件每版一份，存对象存储） */
.ev-file {
  display: inline-block;
  margin-top: 6px;
  font-size: 11.5px;
  letter-spacing: .05em;
  color: var(--copper-deep);
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--copper);
  padding: 5px 10px;
  text-decoration: none;
  word-break: break-all;
  transition: border-color .15s ease, background-color .15s ease;
}

.ev-file:hover {
  border-color: var(--copper-deep);
  background: rgba(180, 95, 58, .06);
}

.ev-comment.pre {
  white-space: pre-wrap;
  color: var(--grey);
}

/* ---- 稿件内容与版本快照 ---- */
.ab-detail {
  margin-top: 16px;
  border-top: 1px solid var(--hairline);
  padding-top: 14px;
}

.ab-detail-label {
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--copper-deep);
  margin: 14px 0 8px;
}

.ab-detail-label:first-child {
  margin-top: 0;
}

.ab-abstract {
  font-size: 13.5px;
  line-height: 1.8;
  color: var(--ink);
  white-space: pre-wrap;
  border: 1px solid var(--hairline-soft);
  background: rgba(17, 17, 17, .02);
  padding: 12px 14px;
  margin: 8px 0 0;
}

.ev-snapshot {
  margin-top: 8px;
  border-left: 3px solid var(--hairline);
  padding: 6px 0 6px 12px;
}

.ev-snap-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 4px;
}

.ev-snap-title .mono {
  font-size: 11px;
  color: var(--grey);
  font-weight: 400;
}

/* ---- 锚点子导航 ---- */
.subnav {
  position: sticky;
  top: calc(var(--header-h) - 40px);
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 4px 22px;
  background: var(--paper);
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--copper);
  padding: 11px 16px;
  margin-bottom: clamp(22px, 3vw, 32px);
}

.subnav a {
  font-size: 12.5px;
  letter-spacing: .1em;
  color: var(--grey);
  text-decoration: none;
  transition: color .15s ease;
}

.subnav a:hover {
  color: var(--copper-deep);
}

.subnav sup {
  color: var(--copper-deep);
  font-size: 10px;
}

/* ---- 投稿汇总与保存行 ---- */
.ab-summary {
  font-size: 12px;
  letter-spacing: .06em;
  color: var(--ink);
  border: 1px solid var(--hairline-soft);
  background: rgba(180, 95, 58, .05);
  padding: 8px 12px;
  margin: 0 0 14px;
}

.ab-summary .ab-cap {
  color: var(--grey);
}

.save-row {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
}

.dirty-hint {
  font-size: 11.5px;
  color: var(--copper-deep);
}

.field input {
  font: inherit;
  font-size: 14px;
  border: 1px solid var(--hairline);
  border-radius: 0;
  background: transparent;
  padding: 9px 11px;
}

.field input:focus {
  outline: 2px solid var(--copper);
  outline-offset: -1px;
  border-color: var(--copper);
}

.f-err {
  font-size: 12px;
  color: #A03A2A;
}

@media (min-width: 768px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .cred-card { grid-template-columns: minmax(0, 1fr) auto; align-items: center; }
  .reg-row { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: center; }
  .reg-actions { grid-column: 1 / -1; }
  .ab-head { align-items: baseline; }
}
</style>
