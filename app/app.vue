<script setup lang="ts">
useHead({
  titleTemplate: (chunk?: string) =>
    chunk ? `${chunk} · PPS 2026` : 'PPS 2026 — Polymer Processing Symposium · Hefei, China',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  ],
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="#B45F3A" :height="2" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
