<script setup lang="ts">
useHead({
  titleTemplate: (chunk?: string) =>
    chunk ? `${chunk} · ISAGMSM 2027` : 'ISAGMSM — 第五届先进凝胶材料与软物质国际学术研讨会',
  link: [
    { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
  ],
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator color="#B45F3A" :height="2" />
    <NuxtLayout>
      <NuxtPage :transition="{ name: 'page', mode: 'out-in' }" />
    </NuxtLayout>
  </UApp>
</template>
