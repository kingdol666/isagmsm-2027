<script setup lang="ts">
import { participantSchema } from '#shared/schemas/registration'

interface RegistrationTypeApi {
  id: string
  code: string
  name: string
  priceFen: number
  priceYuan: number
  currency: string
  description: string
  availability: string
}

interface OrderCreated {
  registration: { id: string, displayId: string }
  order: { id: string, orderNo: string, totalFen: number, currency: string }
}

definePageMeta({ layout: 'flow', middleware: 'auth' })
useSeoMeta({ title: 'Register' })

const { user } = useAuth()

const { data: types, status: typesStatus, error: typesError } = await useFetch<RegistrationTypeApi[]>('/api/registration-types')

/* prefill the form from the account profile */
onMounted(async () => {
  try {
    const res = await $fetch<{ profile: Record<string, string> | null, email: string, fullName: string | null }>('/api/account/profile')
    form.fullName = res.profile?.fullName ?? res.fullName ?? ''
    form.englishName = res.profile?.englishName ?? ''
    form.phone = res.profile?.phone ?? ''
    form.affiliation = res.profile?.affiliation ?? ''
    form.department = res.profile?.department ?? ''
    form.position = res.profile?.position ?? ''
    form.country = res.profile?.country ?? ''
    form.dietary = res.profile?.dietary ?? ''
  }
  catch { /* profile stays empty — user fills manually */ }
})

const step = ref(0)
const steps = ['选择票种', '填写信息', '确认提交']

const selectedType = ref<RegistrationTypeApi | null>(null)
const form = reactive({
  fullName: '',
  englishName: '',
  email: '',
  phone: '',
  affiliation: '',
  department: '',
  position: '',
  country: '',
  dietary: '',
  invoiceRequired: false,
  invoiceTitle: '',
})
const fieldErrors = reactive<Record<string, string>>({})
const submitting = ref(false)
const submitError = ref('')

function chooseType(type: RegistrationTypeApi) {
  if (type.availability !== 'available') return
  selectedType.value = type
}

function yuan(fen: number) {
  return (fen / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function validateStep2(): boolean {
  for (const key of Object.keys(fieldErrors)) fieldErrors[key] = ''
  const result = participantSchema.safeParse({
    ...form,
    email: user.value?.email ?? '',
    typeId: selectedType.value?.id,
  })
  if (!result.success) {
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'form'
      if (!fieldErrors[key]) fieldErrors[key] = issue.message
    }
    return false
  }
  return true
}

function next() {
  submitError.value = ''
  if (step.value === 0 && selectedType.value) step.value = 1
  else if (step.value === 1 && validateStep2()) step.value = 2
}

function back() {
  if (step.value > 0) step.value -= 1
}

async function submit() {
  if (!selectedType.value) return
  submitting.value = true
  submitError.value = ''
  try {
    const created = await $fetch<OrderCreated>('/api/registrations', {
      method: 'POST',
      body: { participant: { ...form, email: user.value?.email ?? '', typeId: selectedType.value.id } },
    })
    await navigateTo(`/payment/${created.order.id}`)
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, data?: { details?: Array<{ message: string }> }, statusCode?: number } }
    if (err.data?.statusCode === 401) {
      await navigateTo(`/login?redirect=${encodeURIComponent('/register')}`)
      return
    }
    submitError.value = err.data?.message ?? 'Submission failed. Please check your details and retry.'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="register">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">ISAGMSM—08 · 报名</span>
        <span class="sec-tag">三步完成</span>
      </div>
      <h1 class="sec-title">Registration</h1>
    </header>

    <FlowSteps :steps="steps" :current="step" />

    <p v-if="typesError" class="state-error">
      Could not load registration types. <NuxtLink to="/register" class="retry">Retry</NuxtLink>
    </p>

    <!-- STEP 1 — type -->
    <section v-if="step === 0" aria-label="Choose registration type">
      <p v-if="typesStatus === 'pending'" class="state-note">Loading registration types…</p>
      <ul v-else class="type-list">
        <li v-for="type in types" :key="type.id">
          <button
            type="button"
            class="type-row"
            :class="{ selected: selectedType?.id === type.id, disabled: type.availability !== 'available' }"
            :disabled="type.availability !== 'available'"
            @click="chooseType(type)"
          >
            <span class="t-code">{{ type.code.toUpperCase() }}</span>
            <span class="t-name">{{ type.name }}</span>
            <span class="t-price"><i>¥</i>{{ yuan(type.priceFen) }}</span>
            <span class="t-desc">{{ type.description }}</span>
            <span class="t-status" :class="{ inv: type.availability !== 'available' }">
              {{ type.availability === 'available' ? 'Available' : 'On invitation' }}
            </span>
          </button>
        </li>
      </ul>
      <div class="actions">
        <button class="btn btn-solid" type="button" :disabled="!selectedType" @click="next">Continue</button>
      </div>
    </section>

    <!-- STEP 2 — participant information -->
    <section v-else-if="step === 1" aria-label="Participant information">
      <form class="form" novalidate @submit.prevent="next">
        <div class="grid">
          <label class="field">
            <span class="f-label">姓名 *</span>
            <input v-model="form.fullName" type="text" name="fullName" autocomplete="name">
            <span v-if="fieldErrors.fullName" class="f-error">{{ fieldErrors.fullName }}</span>
          </label>
          <label class="field">
            <span class="f-label">英文名</span>
            <input v-model="form.englishName" type="text" name="englishName">
          </label>
          <div class="field">
            <span class="f-label">账户邮箱（锁定）</span>
            <input type="email" :value="user?.email" disabled aria-label="Account email">
            <span class="f-hint mono">报名信息将关联到当前登录账号</span>
          </div>
          <label class="field">
            <span class="f-label">手机号</span>
            <input v-model="form.phone" type="tel" name="phone" autocomplete="tel" inputmode="tel">
          </label>
          <label class="field wide">
            <span class="f-label">单位 *</span>
            <input v-model="form.affiliation" type="text" name="affiliation" autocomplete="organization">
            <span v-if="fieldErrors.affiliation" class="f-error">{{ fieldErrors.affiliation }}</span>
          </label>
          <label class="field">
            <span class="f-label">院系 / 部门</span>
            <input v-model="form.department" type="text" name="department">
          </label>
          <label class="field">
            <span class="f-label">职务</span>
            <input v-model="form.position" type="text" name="position">
          </label>
          <label class="field">
            <span class="f-label">国家 / 地区 *</span>
            <input v-model="form.country" type="text" name="country" autocomplete="country-name">
            <span v-if="fieldErrors.country" class="f-error">{{ fieldErrors.country }}</span>
          </label>
          <label class="field">
            <span class="f-label">饮食禁忌</span>
            <input v-model="form.dietary" type="text" name="dietary" placeholder="如：素食">
          </label>
          <label class="field wide check">
            <input v-model="form.invoiceRequired" type="checkbox" name="invoiceRequired">
            <span class="f-label">需要发票</span>
          </label>
          <label v-if="form.invoiceRequired" class="field wide">
            <span class="f-label">发票抬头</span>
            <input v-model="form.invoiceTitle" type="text" name="invoiceTitle">
          </label>
        </div>
        <p class="form-note">带 * 为必填项；信息将在服务端再次校验。</p>
        <div class="actions">
          <button class="btn btn-ghost" type="button" @click="back">Back</button>
          <button class="btn btn-solid" type="submit" @click="next">Continue</button>
        </div>
      </form>
    </section>

    <!-- STEP 3 — confirmation -->
    <section v-else aria-label="Confirm and submit">
      <dl class="confirm">
        <div class="c-row"><dt>Type</dt><dd>{{ selectedType?.name }}</dd></div>
        <div class="c-row"><dt>Name</dt><dd>{{ form.fullName }}</dd></div>
        <div class="c-row"><dt>Email</dt><dd>{{ form.email }}</dd></div>
        <div class="c-row"><dt>Affiliation</dt><dd>{{ form.affiliation }}</dd></div>
        <div class="c-row"><dt>Country</dt><dd>{{ form.country }}</dd></div>
        <div class="c-row c-total"><dt>Fee (server-calculated at order)</dt><dd>≈ ¥{{ selectedType ? yuan(selectedType.priceFen) : '' }}</dd></div>
      </dl>
      <p v-if="submitError" class="state-error">{{ submitError }}</p>
      <div class="actions">
        <button class="btn btn-ghost" type="button" :disabled="submitting" @click="back">Back</button>
        <button class="btn btn-solid" type="button" :disabled="submitting" @click="submit">
          {{ submitting ? 'Submitting…' : 'Create order' }}
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.type-list {
  border-bottom: 1px solid var(--ink);
}

.type-row {
  display: grid;
  width: 100%;
  text-align: left;
  grid-template-columns: 1fr;
  grid-template-areas:
    "code"
    "name"
    "price"
    "desc"
    "status";
  gap: 6px;
  border-top: 1px solid var(--hairline);
  padding: 20px 10px 20px 0;
  cursor: pointer;
  transition: background-color .2s ease;
}

.type-row:hover:not(.disabled) {
  background: rgba(180, 95, 58, .055);
}

.type-row.selected {
  background: rgba(180, 95, 58, .08);
  box-shadow: inset 3px 0 0 var(--copper);
}

.type-row.disabled {
  cursor: not-allowed;
  opacity: .55;
}

.t-code { grid-area: code; font-family: var(--mono); font-size: 12px; letter-spacing: .12em; color: var(--grey); }
.t-name { grid-area: name; font-family: var(--serif); font-size: clamp(1.4rem, 2.4vw, 1.8rem); line-height: 1.1; }
.t-price { grid-area: price; font-family: var(--serif); font-size: 1.5rem; margin-top: 4px; }
.t-price i { font-style: normal; font-size: .6em; vertical-align: .5em; color: var(--copper-deep); margin-right: 2px; }
.t-desc { grid-area: desc; font-size: 14px; color: var(--grey); max-width: 52ch; }
.t-status { grid-area: status; justify-self: start; margin-top: 8px; font-family: var(--mono); font-size: 11.5px; letter-spacing: .12em; text-transform: uppercase; border: 1px solid var(--ink); padding: 5px 10px; }
.t-status.inv { border-color: var(--copper-deep); color: var(--copper-deep); }

.form .grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px 24px;
}

.field { display: flex; flex-direction: column; gap: 7px; }
.field.wide { grid-column: 1 / -1; }
.field.check { flex-direction: row; align-items: center; gap: 10px; }
.field.check input { width: 16px; height: 16px; accent-color: var(--copper); }

.f-label {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.field input[type="text"],
.field input[type="email"],
.field input[type="tel"] {
  font: inherit;
  color: var(--ink);
  background: transparent;
  border: 1px solid var(--ink);
  padding: 13px 14px;
  border-radius: 0;
}

.field input:focus {
  outline: 2px solid var(--copper-deep);
  outline-offset: -1px;
}

.field input:disabled {
  color: var(--grey);
  background: var(--tint);
}

.f-hint {
  font-size: 11.5px;
  letter-spacing: .06em;
  color: var(--grey);
}

.f-error {
  font-size: 12.5px;
  color: var(--copper-deep);
}

.form-note {
  margin-top: 18px;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .08em;
  color: var(--grey);
}

.actions {
  display: flex;
  gap: 14px;
  margin-top: clamp(26px, 4vw, 40px);
}

.confirm {
  border-top: 1px solid var(--ink);
  border-bottom: 1px solid var(--ink);
}

.c-row {
  display: grid;
  grid-template-columns: minmax(120px, 220px) 1fr;
  gap: 16px;
  border-top: 1px solid var(--hairline);
  padding: 15px 0;
}

.c-row:first-child { border-top: none; }

.c-row dt {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.c-row dd { font-size: 16px; }

.c-total dd {
  font-family: var(--serif);
  font-size: 1.6rem;
  color: var(--copper-deep);
}

.state-note, .state-error {
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  padding: 14px 0;
}

.state-error {
  color: var(--copper-deep);
}

.retry { text-decoration: underline; }

@media (min-width: 768px) {
  .type-row {
    grid-template-columns: 110px minmax(0, 4fr) minmax(0, 3fr) 140px;
    grid-template-areas: "code name price status" "code desc desc desc";
    column-gap: 24px;
    align-items: baseline;
  }

  .form .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
