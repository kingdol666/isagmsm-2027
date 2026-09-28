<script setup lang="ts">
defineProps<{
  code: string
  tag?: string
  title: string
  titleEm?: string
}>()
</script>

<template>
  <header class="sec-head">
    <div class="sec-meta">
      <span class="sec-code">{{ code }}</span>
      <span v-if="tag" class="sec-tag">{{ tag }}</span>
    </div>
    <h2 class="sec-title">
      {{ title }}<template v-if="titleEm">&nbsp;<em>{{ titleEm }}</em></template>
    </h2>
  </header>
</template>
