<script setup lang="ts">
import type { Html5Qrcode } from 'html5-qrcode'

definePageMeta({ layout: 'bare' })
useSeoMeta({
  title: 'ISAGMSM · 签到核验端',
  description: 'ISAGMSM 现场签到核验端。',
  robots: 'noindex, nofollow',
})

/* ---------- auth ---------- */
const authState = ref<'checking' | 'anon' | 'staff'>('checking')
const isDev = import.meta.dev
const authUser = ref<{ username: string, role: string } | null>(null)
const loginUsername = ref('')
const loginPassword = ref('')
const loginError = ref('')
const loginBusy = ref(false)

async function checkAuth() {
  try {
    const res = await $fetch<{ user: { username: string, role: string } }>('/api/staff/me')
    authUser.value = res.user
    authState.value = 'staff'
  }
  catch {
    authState.value = 'anon'
  }
}

async function login() {
  loginBusy.value = true
  loginError.value = ''
  try {
    const res = await $fetch<{ user: { username: string, role: string } }>('/api/staff/login', {
      method: 'POST',
      body: { username: loginUsername.value, password: loginPassword.value },
    })
    authUser.value = res.user
    authState.value = 'staff'
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    loginError.value = e.data?.statusMessage ?? 'Login failed.'
  }
  finally {
    loginBusy.value = false
  }
}

async function logout() {
  await $fetch('/api/staff/logout', { method: 'POST' }).catch(() => {})
  stopCamera()
  authUser.value = null
  authState.value = 'anon'
}

/* ---------- verification flow ---------- */
interface VerifyResult {
  valid: boolean
  reason: string | null
  checkedInAt: string | null
  participant?: {
    displayId: string
    fullName: string
    affiliation: string
    country: string
    typeName: string
  }
}

const mode = ref<'idle' | 'scanning' | 'result'>('idle')
const verify = ref<VerifyResult | null>(null)
const actionMessage = ref('')
const actionBusy = ref(false)
const manualToken = ref('')
const recentLogs = ref<Array<{ time: string, name: string, ok: boolean, note: string }>>([])

function log(name: string, ok: boolean, note: string) {
  recentLogs.value.unshift({ time: new Date().toLocaleTimeString('en-GB'), name, ok, note })
  recentLogs.value = recentLogs.value.slice(0, 5)
}

async function checkToken(token: string) {
  actionMessage.value = ''
  try {
    const res = await $fetch<VerifyResult>('/api/checkin/verify', {
      method: 'POST',
      body: { token },
    })
    verify.value = res
    mode.value = 'result'
    return res
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    verify.value = null
    mode.value = 'result'
    actionMessage.value = e.data?.statusMessage === 'Authentication required'
      ? 'Session expired — please sign in again.'
      : 'Verification failed. Check the code and retry.'
    return null
  }
}

async function confirmCheckin() {
  if (!verify.value?.valid || !verify.value.participant) return
  actionBusy.value = true
  try {
    const res = await $fetch<{ duplicate: boolean, checkedInAt: string }>('/api/checkin', {
      method: 'POST',
      body: { token: lastToken },
    })
    if (res.duplicate) {
      actionMessage.value = `Already checked in at ${new Date(res.checkedInAt).toLocaleTimeString('en-GB')}.`
      log(verify.value.participant.fullName, false, 'duplicate')
    }
    else {
      actionMessage.value = ''
      verify.value.checkedInAt = res.checkedInAt
      log(verify.value.participant.fullName, true, 'checked in')
    }
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    actionMessage.value = e.data?.statusMessage ?? 'Check-in failed.'
    log(verify.value?.participant?.fullName ?? '?', false, 'error')
  }
  finally {
    actionBusy.value = false
  }
}

function resetToScan() {
  verify.value = null
  actionMessage.value = ''
  manualToken.value = ''
  lastToken = ''
  mode.value = cameraAvailable.value ? 'scanning' : 'idle'
  if (cameraAvailable.value) resumeCamera()
}

/* ---------- camera ---------- */
const cameraAvailable = ref(false)
const cameraError = ref('')
const scanner = shallowRef<Html5Qrcode | null>(null)
let lastToken = ''
const resumeTimer: ReturnType<typeof setTimeout> | null = null

async function startCamera() {
  cameraError.value = ''
  try {
    const { Html5Qrcode: Scanner } = await import('html5-qrcode')
    const instance = new Scanner('scan-reader', { verbose: false })
    scanner.value = instance
    await instance.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      async (decoded) => {
        if (mode.value !== 'scanning') return
        lastToken = decoded
        await instance.pause(true)
        mode.value = 'result'
        await checkToken(decoded)
      },
      () => { /* per-frame miss — ignore */ },
    )
    cameraAvailable.value = true
    mode.value = 'scanning'
  }
  catch (err: unknown) {
    cameraAvailable.value = false
    cameraError.value = err instanceof Error
      ? `摄像头不可用 (${err.message.slice(0, 60)}). 请使用手动输入。`
      : '摄像头不可用. 请使用手动输入。'
    mode.value = 'idle'
  }
}

function pauseCamera() {
  try {
    scanner.value?.pause(true)
  }
  catch { /* already paused */ }
}

function resumeCamera() {
  try {
    scanner.value?.resume()
  }
  catch { /* already running */ }
}

function stopCamera() {
  if (resumeTimer) clearTimeout(resumeTimer)
  scanner.value?.stop().then(() => scanner.value?.clear()).catch(() => {})
  scanner.value = null
  cameraAvailable.value = false
}

async function submitManual() {
  const token = manualToken.value.trim()
  if (token.length < 10) return
  lastToken = token
  pauseCamera()
  mode.value = 'result'
  await checkToken(token)
}

onMounted(async () => {
  await checkAuth()
  if (authState.value === 'staff') {
    await startCamera()
  }
})

onUnmounted(stopCamera)
</script>

<template>
  <div class="scan">
    <!-- header -->
    <header class="s-bar">
      <span class="s-brand">ISAGMSM <span class="s-app">SCAN</span></span>
      <span v-if="authUser" class="s-user mono">{{ authUser.username }} · {{ authUser.role }}</span>
      <button v-if="authState === 'staff'" class="s-exit mono" type="button" @click="logout">退出</button>
    </header>

    <!-- anonymous: inline staff login -->
    <section v-if="authState === 'checking'" class="pane">
      <p class="state">Checking session…</p>
    </section>

    <section v-else-if="authState === 'anon'" class="pane">
      <p class="kicker mono">STAFF ACCESS REQUIRED</p>
      <h1 class="title">Check-in scanner</h1>
      <form class="login" @submit.prevent="login">
        <label class="field">
          <span class="f-label mono">Username</span>
          <input v-model="loginUsername" type="text" name="username" autocomplete="username">
        </label>
        <label class="field">
          <span class="f-label mono">Password</span>
          <input v-model="loginPassword" type="password" name="password" autocomplete="current-password">
        </label>
        <p v-if="loginError" class="msg bad mono">{{ loginError }}</p>
        <button class="btn btn-solid wide" type="submit" :disabled="loginBusy">
          {{ loginBusy ? 'Signing in…' : '登录' }}
        </button>
      </form>
      <p v-if="isDev" class="hint mono">Dev accounts — admin / pps26-admin · staff / pps26-staff</p>
    </section>

    <!-- staff: scanner -->
    <template v-else>
      <!-- scanning mode -->
      <section v-if="mode === 'scanning' || mode === 'idle'" class="pane">
        <div class="reader-box" :class="{ live: mode === 'scanning' }">
          <div id="scan-reader" class="reader" />
          <p v-if="mode === 'idle'" class="reader-idle mono">{{ cameraError || '正在启动摄像头…' }}</p>
        </div>

        <form class="manual" @submit.prevent="submitManual">
          <label class="f-label mono" for="manual-token">Manual entry — registration ID or verification link</label>
          <div class="manual-row">
            <input
              id="manual-token"
              v-model="manualToken"
              type="text"
              inputmode="text"
              autocomplete="off"
              spellcheck="false"
              placeholder="e.g. https://…/verify/<token> or token"
            >
            <button class="btn btn-solid" type="submit">Verify</button>
          </div>
        </form>
      </section>

      <!-- result mode -->
      <section v-else class="pane result">
        <template v-if="verify?.valid && verify.participant">
          <p class="kicker mono" :class="verify.checkedInAt ? 'bad' : 'good'">
            {{ verify.checkedInAt ? '已签到' : '凭证有效' }}
          </p>
          <p class="p-name">{{ verify.participant.fullName }}</p>
          <p class="p-aff">{{ verify.participant.affiliation }}</p>
          <dl class="p-facts">
            <div class="p-row"><dt>Registration</dt><dd class="mono">{{ verify.participant.displayId }}</dd></div>
            <div class="p-row"><dt>Type</dt><dd>{{ verify.participant.typeName }}</dd></div>
            <div class="p-row"><dt>Country</dt><dd>{{ verify.participant.country }}</dd></div>
            <div v-if="verify.checkedInAt" class="p-row">
              <dt>已签到</dt><dd>{{ new Date(verify.checkedInAt).toLocaleTimeString('en-GB') }}</dd>
            </div>
          </dl>
          <p v-if="actionMessage" class="msg bad mono">{{ actionMessage }}</p>
          <div class="actions">
            <button
              v-if="!verify.checkedInAt"
              class="btn btn-solid wide big"
              type="button"
              :disabled="actionBusy"
              @click="confirmCheckin"
            >
              {{ actionBusy ? 'Confirming…' : '确认签到' }}
            </button>
            <button class="btn btn-ghost wide" type="button" @click="resetToScan">扫下一个</button>
          </div>
        </template>

        <template v-else>
          <p class="kicker mono bad">
            {{ verify?.reason === 'not_found' ? '未识别' : verify?.reason === 'registration_not_confirmed' ? '未确认缴费' : verify?.reason === 'revoked' ? '已撤销' : '核验失败' }}
          </p>
          <p class="p-name">{{ actionMessage || '该二维码不是有效的 ISAGMSM 参会凭证。' }}</p>
          <p v-if="verify?.participant" class="p-aff">{{ verify.participant.fullName }} · {{ verify.participant.displayId }} · status: {{ verify.reason }}</p>
          <div class="actions">
            <button class="btn btn-solid wide" type="button" @click="resetToScan">扫下一个</button>
          </div>
        </template>
      </section>

      <!-- recent log -->
      <section v-if="recentLogs.length" class="pane log">
        <p class="f-label mono">Recent (this device)</p>
        <ul>
          <li v-for="(entry, index) in recentLogs" :key="index" class="log-row">
            <span class="mono log-time">{{ entry.time }}</span>
            <span class="log-name">{{ entry.name }}</span>
            <span class="mono log-note" :class="{ ok: entry.ok }">{{ entry.note }}</span>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<style scoped>
.scan {
  max-width: 560px;
  margin: 0 auto;
  padding: 0 18px 40px;
}

.s-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--ink);
  margin-bottom: 22px;
}

.s-brand {
  font-family: var(--serif);
  font-size: 24px;
  line-height: 1;
}

.s-brand i { font-style: normal; color: var(--copper-deep); }

.s-app {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .2em;
  color: var(--grey);
  margin-left: 8px;
}

.s-user { font-size: 12px; color: var(--grey); letter-spacing: .06em; }

.s-exit {
  font-size: 11px;
  letter-spacing: .12em;
  text-transform: uppercase;
  background: none;
  border: 1px solid var(--hairline);
  color: var(--grey);
  padding: 7px 12px;
  cursor: pointer;
}

.pane { padding-block: 8px 22px; }

.kicker {
  font-size: 12.5px;
  letter-spacing: .18em;
  margin-bottom: 10px;
}

.kicker.good { color: var(--copper-deep); }
.kicker.bad { color: var(--copper-deep); }

.title {
  font-family: var(--serif);
  font-size: 2rem;
  line-height: 1.05;
  margin-bottom: 20px;
}

.login { display: flex; flex-direction: column; gap: 16px; max-width: 380px; }

.field { display: flex; flex-direction: column; gap: 6px; }

.f-label {
  font-size: 11.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.field input,
.manual-row input {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 13px 14px;
  border-radius: 0;
}

.field input:focus,
.manual-row input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.reader-box {
  position: relative;
  border: 1px solid var(--ink);
  min-height: 280px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.reader-box.live {
  box-shadow: 0 0 0 3px var(--copper);
}

.reader { width: 100%; }

.reader-idle {
  position: absolute;
  inset: auto 0 14px;
  text-align: center;
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--grey);
  padding: 0 16px;
}

.manual { margin-top: 22px; display: flex; flex-direction: column; gap: 8px; }

.manual-row { display: flex; gap: 10px; }
.manual-row input { flex: 1; min-width: 0; }

.p-name {
  font-family: var(--serif);
  font-size: clamp(1.9rem, 7vw, 2.5rem);
  line-height: 1.05;
}

.p-aff { color: var(--grey); font-size: 14.5px; margin-top: 6px; }

.p-facts { margin-top: 20px; border-top: 1px solid var(--hairline); }

.p-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 12px;
  border-bottom: 1px solid var(--hairline);
  padding: 10px 0;
}

.p-row dt {
  font-family: var(--mono);
  font-size: 11px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
}

.p-row dd { font-size: 14.5px; }

.msg { font-size: 13px; letter-spacing: .04em; padding: 8px 0; }
.msg.bad { color: var(--copper-deep); }

.actions { display: flex; flex-direction: column; gap: 12px; margin-top: 22px; }

.wide { width: 100%; }
.big { padding-block: 21px; font-size: 14px; }

.log { border-top: 1px solid var(--ink); padding-top: 14px; }

.log-row {
  display: grid;
  grid-template-columns: 90px 1fr auto;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--hairline);
  font-size: 13.5px;
  align-items: baseline;
}

.log-time { color: var(--grey); font-size: 11.5px; }

.log-note { font-size: 11.5px; color: var(--grey); }
.log-note.ok { color: var(--copper-deep); }

.hint { margin-top: 20px; font-size: 11.5px; color: var(--grey); letter-spacing: .06em; }

.state { font-size: 13px; color: var(--grey); padding: 12px 0; }
</style>
