<script setup lang="ts">
import {
  submitAbstractSchema,
  ABSTRACT_REPORT_TYPES,
  ATTACHMENT_ACCEPT,
  ATTACHMENT_EXTENSIONS,
  MAX_ATTACHMENT_BYTES,
  formatAttachmentSize,
} from '#shared/schemas/abstract'
import { siteContent } from '#shared/content/localized'

definePageMeta({ layout: 'flow' })
const { t, locale } = useI18n()

useSeoMeta({ title: () => t('submit.seoTitle') })

const content = computed(() => siteContent(locale.value))

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
  events: Array<{ id: string, kind: string, comment: string | null, actor: string, createdAt: string }>
}

const route = useRoute()
const { user, fetchUser } = useAuth()

const editId = computed(() => (typeof route.query.id === 'string' ? route.query.id : ''))
const editAbstract = ref<MyAbstract | null>(null)

const form = reactive({
  title: '',
  topic: '',
  reportType: '',
  abstractText: '',
  submitterName: '',
  submitterAffiliation: '',
  authors: [{ name: '', affiliation: '' }] as Array<{ name: string, affiliation: string }>,
  website: '', // 蜜罐：人类不可见，机器人填写即被拒绝
})

const loaded = ref(false)
const busy = ref(false)
const errorMsg = ref('')
const fieldErrors = ref<Record<string, string>>({})
const done = ref<{ resubmitted: boolean, version: number } | null>(null)
const myPending = ref<number | null>(null)
const myTotal = ref<number | null>(null)

const topicLabels = computed(() => new Map(content.value.themesContent.items.map(item => [item.no, `${item.no} · ${item.title}`])))
const reportLabels = computed<Record<string, string>>(() => ({
  oral: t('submit.reportOral'),
  poster: t('submit.reportPoster'),
  abstract_only: t('submit.reportAbstractOnly'),
}))

onMounted(async () => {
  const current = user.value === undefined ? await fetchUser() : user.value
  if (!current) {
    await navigateTo(`/login?redirect=${encodeURIComponent(route.fullPath)}`)
    return
  }

  try {
    const res = await $fetch<{ profile: Record<string, string> | null, fullName: string | null }>('/api/account/profile')
    form.submitterName = res.profile?.fullName ?? res.fullName ?? current.fullName ?? ''
    form.submitterAffiliation = res.profile?.affiliation ?? ''
  }
  catch { /* prefill is best-effort */ }

  // 投稿余量提示（待审 ≤3 / 累计 ≤20，已撤回不计）
  try {
    const res = await $fetch<{ abstracts: Array<{ status: string }> }>('/api/abstracts/mine')
    myPending.value = res.abstracts.filter(a => a.status === 'submitted').length
    myTotal.value = res.abstracts.filter(a => a.status !== 'withdrawn').length
  }
  catch { /* hint is best-effort */ }

  if (editId.value) {
    try {
      const res = await $fetch<{ abstracts: MyAbstract[] }>('/api/abstracts/mine')
      const target = res.abstracts.find(a => a.id === editId.value)
      if (target && target.status === 'returned') {
        editAbstract.value = target
        form.title = target.title
        form.topic = target.topic
        form.reportType = target.reportType
        form.abstractText = target.abstractText
        form.submitterName = target.submitterName
        form.submitterAffiliation = target.submitterAffiliation
        form.authors = target.authors.length ? target.authors.map(a => ({ ...a })) : [{ name: '', affiliation: '' }]
      }
    }
    catch { /* fall through to blank form */ }
  }
  loaded.value = true
})

function addAuthor() {
  form.authors.push({ name: '', affiliation: '' })
}

function removeAuthor(index: number) {
  if (form.authors.length > 1) form.authors.splice(index, 1)
}

const lastReturnComment = computed(() => {
  const events = editAbstract.value?.events ?? []
  return events.find(e => e.kind === 'returned')?.comment ?? ''
})

/* 稿件附件（Word/PDF，≤10MB）— 客户端先做格式/大小预检，服务端仍全量校验 */
const file = ref<File | null>(null)
const fileError = ref('')

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  fileError.value = ''
  const picked = input.files?.[0] ?? null
  if (!picked) {
    file.value = null
    return
  }
  const ext = picked.name.split('.').pop()?.toLowerCase() ?? ''
  if (!ATTACHMENT_EXTENSIONS.includes(ext as (typeof ATTACHMENT_EXTENSIONS)[number])) {
    file.value = null
    input.value = ''
    fileError.value = t('submit.errors.fileFormat')
    return
  }
  if (picked.size > MAX_ATTACHMENT_BYTES) {
    file.value = null
    input.value = ''
    fileError.value = t('submit.errors.fileSize', { size: formatAttachmentSize(picked.size) })
    return
  }
  file.value = picked
}

function clearFile() {
  file.value = null
  fileError.value = ''
  const input = document.querySelector<HTMLInputElement>('input[name="file"]')
  if (input) input.value = ''
}

async function send() {
  busy.value = true
  errorMsg.value = ''
  fieldErrors.value = {}
  try {
    const parsed = submitAbstractSchema.safeParse({ ...form })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form')
        if (!fieldErrors.value[key]) fieldErrors.value[key] = issue.message
      }
      errorMsg.value = t('submit.errors.formInvalid')
      return
    }
    if (!file.value) {
      fileError.value = t('submit.errors.fileRequired')
      errorMsg.value = t('submit.errors.formInvalid')
      return
    }

    // multipart：表单字段 + 附件一次提交
    const fd = new FormData()
    fd.append('title', parsed.data.title)
    fd.append('topic', parsed.data.topic)
    fd.append('reportType', parsed.data.reportType)
    fd.append('abstractText', parsed.data.abstractText)
    fd.append('submitterName', parsed.data.submitterName)
    fd.append('submitterAffiliation', parsed.data.submitterAffiliation)
    fd.append('authors', JSON.stringify(parsed.data.authors))
    fd.append('website', form.website) // 蜜罐
    fd.append('file', file.value)

    if (editAbstract.value) {
      const res = await $fetch<{ abstract: MyAbstract }>(`/api/abstracts/${editAbstract.value.id}/resubmit`, {
        method: 'POST',
        body: fd,
      })
      done.value = { resubmitted: true, version: res.abstract.version }
    }
    else {
      const res = await $fetch<{ abstract: MyAbstract }>('/api/abstracts', { method: 'POST', body: fd })
      done.value = { resubmitted: false, version: res.abstract.version }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  catch (err: unknown) {
    const e = err as { data?: { statusMessage?: string } }
    errorMsg.value = e.data?.statusMessage ?? t('submit.errors.submitFailed')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="submit-page">
    <header class="sec-head">
      <div class="sec-meta">
        <span class="sec-code">{{ t('submit.secCode') }}</span>
        <span class="sec-tag mono">{{ t('submit.secTag') }}</span>
      </div>
      <h1 class="sec-title">
        <template v-if="editAbstract">{{ t('submit.titleEditA') }}<em>{{ t('submit.titleEditEm') }}</em></template>
        <template v-else>{{ t('submit.titleNewA') }}<em>{{ t('submit.titleNewEm') }}</em></template>
      </h1>
    </header>

    <!-- 提交成功 -->
    <section v-if="done" class="done" aria-live="polite">
      <p class="done-title">{{ done.resubmitted ? t('submit.done.resubmitted', { n: done.version }) : t('submit.done.success') }}</p>
      <p class="done-body">
        {{ done.resubmitted ? t('submit.done.bodyResubmitted') : t('submit.done.bodySuccess') }}
      </p>
      <div class="done-actions">
        <NuxtLink class="btn btn-solid" href="/account#abstracts">{{ t('submit.done.viewMine') }}</NuxtLink>
        <NuxtLink class="btn btn-ghost" href="/">{{ t('submit.done.backHome') }}</NuxtLink>
      </div>
    </section>

    <template v-else-if="loaded">
      <!-- 返稿意见（重投模式） -->
      <section v-if="editAbstract" class="return-note" :aria-label="t('submit.returnNote.ariaLabel')">
        <p class="rn-tag mono">{{ t('submit.returnNote.tag', { n: editAbstract.version }) }}</p>
        <p class="rn-body">{{ lastReturnComment || t('submit.returnNote.none') }}</p>
      </section>

      <p v-if="!editAbstract && myPending !== null" class="quota mono" aria-live="polite">
        {{ t('submit.quota.line', { pending: myPending ?? 0, total: myTotal ?? 0 }) }}
        <span v-if="myPending >= 3" class="quota-full">{{ t('submit.quota.full') }}</span>
      </p>

      <form class="form" @submit.prevent="send">
        <!-- 蜜罐：对人类不可见；自动机填写即被服务端拒绝（反垃圾投稿） -->
        <div class="hp-field" aria-hidden="true">
          <label>Website<input v-model="form.website" type="text" name="website" tabindex="-1" autocomplete="off"></label>
        </div>
        <label class="field">
          <span class="f-label mono">{{ t('submit.form.titleLabel') }}</span>
          <input v-model="form.title" type="text" name="title" :placeholder="t('submit.form.titlePlaceholder')">
          <span v-if="fieldErrors.title" class="f-err">{{ fieldErrors.title }}</span>
        </label>

        <div class="grid2">
          <label class="field">
            <span class="f-label mono">{{ t('submit.form.topicLabel') }}</span>
            <select v-model="form.topic" name="topic">
              <option value="" disabled>{{ t('submit.form.topicPlaceholder') }}</option>
              <option v-for="[no, label] in topicLabels" :key="no" :value="no">{{ label }}</option>
            </select>
            <span v-if="fieldErrors.topic" class="f-err">{{ fieldErrors.topic }}</span>
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('submit.form.reportLabel') }}</span>
            <select v-model="form.reportType" name="reportType">
              <option value="" disabled>{{ t('submit.form.reportPlaceholder') }}</option>
              <option v-for="rt in ABSTRACT_REPORT_TYPES" :key="rt" :value="rt">{{ reportLabels[rt] }}</option>
            </select>
            <span v-if="fieldErrors.reportType" class="f-err">{{ fieldErrors.reportType }}</span>
          </label>
        </div>

        <label class="field">
          <span class="f-label mono">{{ t('submit.form.abstractLabel') }}</span>
          <textarea v-model="form.abstractText" name="abstractText" rows="8" :placeholder="t('submit.form.abstractPlaceholder')" />
          <span v-if="fieldErrors.abstractText" class="f-err">{{ fieldErrors.abstractText }}</span>
        </label>

        <!-- 稿件附件：Word/PDF ≤10MB，每版独立存档（先传 OSS 再落库） -->
        <label class="field file-field">
          <span class="f-label mono">{{ t('submit.form.fileLabel') }}</span>
          <span class="file-row" :class="{ picked: !!file }">
            <span class="file-btn mono">{{ file ? t('submit.form.fileRepick') : t('submit.form.filePick') }}</span>
            <span v-if="file" class="file-name">{{ file.name }} · {{ formatAttachmentSize(file.size) }}</span>
            <span v-else class="file-name empty">{{ t('submit.form.fileNone') }}</span>
            <button v-if="file" class="file-clear" type="button" :aria-label="t('submit.form.fileRemove')" @click.prevent="clearFile">×</button>
          </span>
          <input
            class="file-input"
            type="file"
            name="file"
            :accept="ATTACHMENT_ACCEPT"
            :aria-label="t('submit.form.fileField')"
            @change="onFileChange"
          >
          <span v-if="fileError" class="f-err">{{ fileError }}</span>
        </label>

        <div class="grid2">
          <label class="field">
            <span class="f-label mono">{{ t('submit.form.submitterNameLabel') }}</span>
            <input v-model="form.submitterName" type="text" name="submitterName" autocomplete="name">
            <span v-if="fieldErrors.submitterName" class="f-err">{{ fieldErrors.submitterName }}</span>
          </label>
          <label class="field">
            <span class="f-label mono">{{ t('submit.form.submitterAffLabel') }}</span>
            <input v-model="form.submitterAffiliation" type="text" name="submitterAffiliation">
            <span v-if="fieldErrors.submitterAffiliation" class="f-err">{{ fieldErrors.submitterAffiliation }}</span>
          </label>
        </div>

        <!-- 作者列表 -->
        <fieldset class="authors">
          <legend class="f-label mono">{{ t('submit.form.authorsLegend') }}</legend>
          <div v-for="(author, index) in form.authors" :key="index" class="author-row">
            <span class="a-no mono">{{ index + 1 }}</span>
            <label class="a-cell">
              <span class="a-label mono">{{ t('submit.form.authorNameLabel') }}</span>
              <input v-model="author.name" type="text" :name="`author-name-${index}`" :placeholder="index === 0 ? t('submit.form.firstNamePlaceholder') : t('submit.form.authorNamePlaceholder')">
            </label>
            <label class="a-cell a-wide">
              <span class="a-label mono">{{ t('submit.form.authorAffLabel') }}</span>
              <input v-model="author.affiliation" type="text" :name="`author-aff-${index}`" :placeholder="t('submit.form.authorAffPlaceholder')">
            </label>
            <button
              v-if="form.authors.length > 1"
              class="a-remove"
              type="button"
              :aria-label="t('submit.form.removeAuthor', { no: index + 1 })"
              @click="removeAuthor(index)"
            >×</button>
          </div>
          <p v-if="fieldErrors.authors" class="f-err">{{ fieldErrors.authors }}</p>
          <button class="btn btn-ghost add-btn" type="button" @click="addAuthor">{{ t('submit.form.addAuthor') }}</button>
        </fieldset>

        <p v-if="errorMsg" class="msg bad" role="alert">{{ errorMsg }}</p>

        <div class="actions">
          <button class="btn btn-solid" type="submit" :disabled="busy">
            {{ busy ? t('submit.actions.submitting') : (editAbstract ? t('submit.actions.submitNew') : t('submit.actions.submit')) }}
          </button>
          <NuxtLink class="btn btn-ghost" href="/account#abstracts">{{ t('submit.actions.myRecords') }}</NuxtLink>
        </div>
      </form>
    </template>

    <p v-else class="state mono">{{ t('submit.loading') }}</p>
  </div>
</template>

<style scoped>
.submit-page {
  padding-block: clamp(40px, 6vh, 72px);
  max-width: 860px;
}

.sec-title em {
  font-style: normal;
  color: var(--copper-deep);
}

.done {
  border: 1px solid var(--ink);
  padding: clamp(24px, 4vw, 40px);
  background: rgba(47, 107, 58, .04);
}

.done-title {
  font-size: clamp(1.2rem, 2.4vw, 1.5rem);
  font-weight: 600;
}

.done-body {
  margin-top: 10px;
  color: var(--grey);
  font-size: 14px;
  line-height: 1.8;
}

.done-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 22px;
}

.return-note {
  border: 1px solid var(--copper-deep);
  border-left: 4px solid var(--copper-deep);
  background: rgba(180, 95, 58, .06);
  padding: 16px 18px;
  margin-bottom: clamp(22px, 3vw, 32px);
}

.quota {
  font-size: 11.5px;
  letter-spacing: .08em;
  color: var(--grey);
  border: 1px solid var(--hairline);
  border-left: 3px solid var(--copper);
  padding: 8px 12px;
  margin: 0 0 16px;
}

.quota-full {
  color: #A03A2A;
}

.rn-tag {
  font-size: 11px;
  letter-spacing: .12em;
  color: var(--copper-deep);
}

.rn-body {
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.8;
  white-space: pre-wrap;
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  border-top: 1px solid var(--ink);
  padding-top: clamp(20px, 3vw, 28px);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.f-label {
  font-size: 11.5px;
  letter-spacing: .12em;
  color: var(--grey);
}

.field input,
.field select,
.field textarea,
.author-row input {
  font: inherit;
  font-size: 14.5px;
  border: 1px solid var(--ink);
  border-radius: 0;
  background: transparent;
  padding: 11px 13px;
}

.field textarea {
  resize: vertical;
  line-height: 1.7;
}

.field input:focus,
.field select:focus,
.field textarea:focus,
.author-row input:focus {
  outline: 2px solid var(--copper);
  outline-offset: -1px;
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
}

.f-err {
  font-size: 12.5px;
  color: #A03A2A;
}

/* 附件字段：原生 input 隐入标签内，可见行呈现选中文件 */
.file-field {
  position: relative;
}

.file-input {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.file-row {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px dashed var(--ink);
  padding: 12px 14px;
  cursor: pointer;
  transition: border-color .15s ease, background-color .15s ease;
}

.file-field:focus-within .file-row,
.file-row:hover {
  border-color: var(--copper-deep);
  outline: 2px solid var(--copper);
  outline-offset: -1px;
}

.file-row.picked {
  border-style: solid;
  background: rgba(180, 95, 58, .05);
}

.file-btn {
  flex: none;
  font-size: 11.5px;
  letter-spacing: .1em;
  border: 1px solid var(--ink);
  background: var(--ink);
  color: var(--paper);
  padding: 7px 14px;
}

.file-name {
  font-size: 13.5px;
  color: var(--ink);
  word-break: break-all;
}

.file-name.empty {
  color: var(--grey);
}

.file-clear {
  flex: none;
  margin-left: auto;
  border: 1px solid var(--hairline);
  background: none;
  width: 26px;
  height: 26px;
  cursor: pointer;
  color: var(--grey);
}

.file-clear:hover {
  color: #A03A2A;
  border-color: #A03A2A;
}

.authors {
  border: 1px solid var(--hairline);
  padding: 16px 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.authors legend {
  padding: 0 8px;
}

.author-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 5fr) minmax(0, 7fr) 30px;
  gap: 10px;
  align-items: end;
}

.a-no {
  font-size: 12px;
  color: var(--copper-deep);
  padding-bottom: 12px;
}

.a-cell {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.a-label {
  font-size: 10.5px;
  letter-spacing: .1em;
  color: var(--grey);
}

.a-remove {
  height: 42px;
  border: 1px solid var(--hairline);
  background: none;
  cursor: pointer;
  font-size: 16px;
  color: var(--grey);
  transition: color .15s ease, border-color .15s ease;
}

.a-remove:hover {
  color: #A03A2A;
  border-color: #A03A2A;
}

.add-btn {
  align-self: flex-start;
}

.msg.bad {
  color: #A03A2A;
  font-size: 13.5px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 6px;
}

.state {
  color: var(--grey);
  font-size: 13px;
}

@media (min-width: 640px) {
  .grid2 {
    grid-template-columns: 1fr 1fr;
  }
}

/* 窄屏：作者行改为两行堆叠（姓名一行、机构一行），避免输入框过窄裁字 */
@media (max-width: 639px) {
  .author-row {
    grid-template-columns: 26px 1fr 30px;
    grid-template-rows: auto auto;
    row-gap: 10px;
  }

  .a-no {
    grid-column: 1;
    grid-row: 1;
    padding-bottom: 0;
  }

  .a-cell:not(.a-wide) {
    grid-column: 2;
    grid-row: 1;
  }

  .a-remove {
    grid-column: 3;
    grid-row: 1;
  }

  .a-cell.a-wide {
    grid-column: 2 / 4;
    grid-row: 2;
  }
}
</style>
