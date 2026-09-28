<script setup lang="ts">
import { siteMeta } from '#shared/content/site'
</script>

<template>
  <div class="flow">
    <header class="flow-bar">
      <NuxtLink class="flow-brand" href="/">PPS<i>·</i>26</NuxtLink>
      <span class="flow-note">Polymer Processing Symposium 2026</span>
      <div class="flow-right">
        <ClientOnly>
          <AuthChip />
          <template #fallback>
            <span class="mono" style="color: var(--hairline)">…</span>
          </template>
        </ClientOnly>
        <NuxtLink class="flow-home" href="/">← Symposium home</NuxtLink>
      </div>
    </header>
    <main class="flow-main wrap">
      <slot />
    </main>
    <footer class="flow-foot wrap">
      <p class="mono">{{ siteMeta.dates }} · {{ siteMeta.location }}</p>
    </footer>
  </div>
</template>

<style scoped>
.flow {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
}

.flow-bar {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding: 18px var(--pad);
  border-bottom: 1px solid var(--ink);
}

.flow-brand {
  font-family: var(--serif);
  font-size: 26px;
  line-height: 1;
}

.flow-brand i {
  font-style: normal;
  color: var(--copper-deep);
}

.flow-note {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.flow-home {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--grey);
  transition: color .2s ease;
}

.flow-home:hover {
  color: var(--copper-deep);
}

.flow-right {
  display: flex;
  align-items: baseline;
  gap: 20px;
  margin-left: auto;
}

.flow-main {
  flex: 1;
  width: 100%;
  padding-block: clamp(36px, 6vh, 64px);
}

.flow-foot {
  border-top: 1px solid var(--hairline);
  padding-block: 18px;
}

.flow-foot p {
  font-size: 12px;
  color: var(--grey);
}

@media (max-width: 767px) {
  .flow-note {
    display: none;
  }
}
</style>
