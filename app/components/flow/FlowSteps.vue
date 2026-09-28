<script setup lang="ts">
const props = defineProps<{
  steps: string[]
  current: number
}>()

const code = (n: number) => String(n).padStart(2, '0')
</script>

<template>
  <ol class="steps" aria-label="Progress">
    <li
      v-for="(label, index) in props.steps"
      :key="label"
      class="step"
      :class="{ 'is-current': index === current, 'is-done': index < current }"
      :aria-current="index === current ? 'step' : undefined"
    >
      <span class="s-no">{{ code(index + 1) }}</span>
      <span class="s-label">{{ label }}</span>
    </li>
  </ol>
</template>

<style scoped>
.steps {
  display: flex;
  flex-wrap: wrap;
  gap: 0 28px;
  border-top: 1px solid var(--ink);
  padding-top: 12px;
  margin-bottom: clamp(30px, 5vw, 48px);
}

.step {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 0;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  text-transform: uppercase;
  color: var(--grey);
}

.s-no {
  color: var(--grey);
}

.step.is-current {
  color: var(--ink);
}

.step.is-current .s-no {
  color: var(--copper-deep);
  font-weight: 500;
}

.step.is-current::after {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--copper);
  margin-left: 12px;
  align-self: center;
}

.step.is-done {
  color: var(--ink);
}

.step.is-done .s-no::after {
  content: "—";
  margin-left: 4px;
  color: var(--copper-deep);
}
</style>
