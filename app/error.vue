<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()

const is404 = computed(() => props.error.statusCode === 404)

function handleError() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="err">
    <div class="wrap err-inner">
      <p class="err-code mono">{{ error.statusCode }}</p>
      <h1 v-if="is404" class="err-title">{{ t('error.404A') }}<em>{{ t('error.404Em') }}</em></h1>
      <h1 v-else class="err-title">{{ t('error.errA') }}<em>{{ t('error.errEm') }}</em></h1>
      <p class="err-body">
        {{
          is404
            ? t('error.body404')
            : (error.statusMessage || t('error.bodyErr'))
        }}
      </p>
      <div class="err-actions">
        <button class="btn btn-solid" type="button" @click="handleError">{{ t('error.back') }}</button>
        <a class="btn btn-ghost" href="mailto:isagmsm@conference.example.org">{{ t('error.contact') }}</a>
      </div>
      <div class="strata err-strata" aria-hidden="true"><span /><span /><span /><span /><span /></div>
    </div>
  </div>
</template>

<style>
.err {
  min-height: 100svh;
  background: var(--paper);
  display: flex;
  align-items: center;
}

.err-inner { width: 100%; padding-block: 60px; }

.err-code {
  font-size: 13px;
  letter-spacing: .18em;
  color: var(--copper-deep);
  border: 1px solid var(--ink);
  display: inline-block;
  padding: 8px 14px;
  margin-bottom: 26px;
}

.err-title {
  font-family: var(--serif);
  font-weight: 400;
  font-size: clamp(2.6rem, 6vw, 4.6rem);
  line-height: 1;
  margin-bottom: 22px;
}

.err-title em { color: var(--copper-deep); font-style: normal; }

.err-body {
  font-size: 16px;
  color: var(--grey);
  max-width: 52ch;
  line-height: 1.7;
  margin-bottom: 32px;
}

.err-actions { display: flex; flex-wrap: wrap; gap: 14px; }

.err-strata { width: min(260px, 50%); margin-top: clamp(44px, 8vh, 80px); }
</style>
