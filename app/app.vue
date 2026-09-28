<script setup lang="ts">
useHead({
  titleTemplate: (chunk?: string) =>
    chunk ? `${chunk} · PPS 2026` : 'PPS 2026 — Polymer Processing Symposium · Hefei, China',
})
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
