<script setup lang="ts">
import { programContent } from '#shared/content/site'

const activeIndex = ref(0)
const tabsEl = ref<HTMLDivElement | null>(null)

function select(index: number) {
  activeIndex.value = index
}

function focusTab(index: number) {
  tabsEl.value?.querySelectorAll<HTMLButtonElement>('.day-tab')[index]?.focus()
}

function onKeydown(event: KeyboardEvent, index: number) {
  const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
  if (!dir) return
  event.preventDefault()
  const days = programContent.days.length
  const next = (index + dir + days) % days
  activeIndex.value = next
  focusTab(next)
}
</script>

<template>
  <!-- 04 · PROGRAM — the inverted spread -->
  <section id="program" class="sec">
    <div class="wrap">
      <SecHead :code="programContent.code" :tag="programContent.tag" :title="programContent.title" />
      <div ref="tabsEl" class="day-tabs" role="tablist" aria-label="Programme days">
        <button
          v-for="(day, index) in programContent.days"
          :key="day.id"
          class="day-tab"
          :class="{ active: activeIndex === index }"
          type="button"
          role="tab"
          :aria-selected="activeIndex === index"
          :aria-controls="day.id"
          :tabindex="activeIndex === index ? 0 : -1"
          @click="select(index)"
          @keydown="onKeydown($event, index)"
        >
          {{ day.label }}
        </button>
      </div>

      <div
        v-for="(day, index) in programContent.days"
        v-show="activeIndex === index"
        :id="day.id"
        :key="day.id"
        class="day-panel"
        role="tabpanel"
        :aria-labelledby="`tab-${day.id}`"
      >
        <p class="panel-date">{{ day.date }}</p>
        <div class="program-head" aria-hidden="true">
          <span class="p-time">Time</span>
          <span class="p-name">Session</span>
          <span class="p-speaker">Speaker</span>
          <span class="p-room">Room</span>
        </div>
        <ul class="program-list">
          <li v-for="item in day.items" :key="`${day.id}-${item.time}`" class="program-row">
            <span class="p-time">{{ item.time }}</span>
            <p class="p-name" :class="{ 'is-keynote': item.keynote }">{{ item.name }}</p>
            <span class="p-speaker">{{ item.speaker }}</span>
            <span class="p-room">{{ item.room }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<style scoped>
#program {
  background: var(--ink);
  color: var(--paper);
}

#program .sec-head {
  border-top-color: var(--paper);
}

#program :deep(.sec-code) {
  color: var(--copper-light);
}

#program :deep(.sec-tag) {
  color: var(--paper-dim);
}

#program :deep(.sec-title em) {
  color: var(--copper-light);
}

.day-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: clamp(28px, 4vw, 44px);
}

.day-tab {
  font-family: var(--mono);
  font-size: 12.5px;
  letter-spacing: .12em;
  text-transform: uppercase;
  border: 1px solid var(--paper-hl);
  color: var(--paper);
  padding: 13px 20px;
  cursor: pointer;
  transition: background-color .2s ease, color .2s ease, border-color .2s ease;
}

.day-tab:hover {
  border-color: var(--copper-light);
  color: var(--copper-light);
}

.day-tab.active {
  background: var(--copper-light);
  border-color: var(--copper-light);
  color: var(--ink);
}

.panel-date {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--copper-light);
  margin-bottom: 16px;
}

.program-head,
.program-row {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-areas:
    "time room"
    "name name"
    "speaker speaker";
  column-gap: 24px;
  row-gap: 6px;
  align-items: baseline;
}

.program-head {
  display: none;
}

.program-list {
  border-top: 1px solid var(--paper-hl);
}

.program-row {
  border-bottom: 1px solid var(--paper-hl);
  padding: 20px 0;
}

.p-time {
  grid-area: time;
  font-family: var(--mono);
  font-size: 13px;
  letter-spacing: .06em;
  color: var(--copper-light);
  font-weight: 500;
}

.p-room {
  grid-area: room;
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .1em;
  text-transform: uppercase;
  color: var(--paper-dim);
  text-align: right;
}

.p-name {
  grid-area: name;
  font-size: 16.5px;
  font-weight: 500;
  line-height: 1.4;
}

.p-name.is-keynote::before {
  content: "";
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--copper-light);
  margin-right: 12px;
}

.p-speaker {
  grid-area: speaker;
  font-size: 14px;
  color: var(--paper-dim);
}

.p-speaker:empty {
  display: none;
}

@media (min-width: 768px) {
  .program-head,
  .program-row {
    grid-template-columns: 118px minmax(0, 1fr) 200px 120px;
    grid-template-areas: "time name speaker room";
  }

  .program-head {
    display: grid;
    font-family: var(--mono);
    font-size: 12px;
    letter-spacing: .14em;
    text-transform: uppercase;
    color: var(--paper-dim);
    padding: 0 0 14px;
  }

  .p-room {
    text-align: left;
  }
}

@media (min-width: 1024px) {
  .program-head,
  .program-row {
    grid-template-columns: 130px minmax(0, 1fr) 230px 150px;
  }
}
</style>
