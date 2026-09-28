<script setup lang="ts">
import { transportationContent as info } from '#shared/content/site'

definePageMeta({ layout: 'site' })
useSeoMeta({ title: '会场交通' })

/* 左侧列表点击 → 右侧地图切换到对应点位（null = 显示全部） */
const activeIndex = ref<number | null>(null)

function select(index: number) {
  activeIndex.value = activeIndex.value === index ? null : index
}

function poiName(index: number) {
  return info.transit[index]?.name ?? ''
}
</script>

<template>
  <main id="main" class="page">
    <div class="wrap">
      <header class="sec-head">
        <div class="sec-meta">
          <span class="sec-code">{{ info.code }}</span>
          <span class="sec-tag">{{ info.tag }}</span>
        </div>
        <h1 class="sec-title">{{ info.title }}</h1>
      </header>

      <div class="t-body">
        <div>
          <h2 class="v-name">{{ info.venueName }}</h2>
          <p class="v-report">{{ info.reportPoint }}</p>

          <p class="list-hint mono">点击任意地点，右侧地图将切换到对应位置</p>
          <ul class="v-list">
            <li
              v-for="(item, index) in info.transit"
              :key="item.code"
              class="v-item-row"
              :class="{ active: activeIndex === index }"
              role="button"
              tabindex="0"
              @click="select(index)"
              @keydown.enter="select(index)"
              @keydown.space.prevent="select(index)"
            >
              <span class="v-code">{{ item.code }}</span>
              <span class="v-item">
                {{ item.name }}
                <small v-if="item.detail">{{ item.detail }}</small>
              </span>
            </li>
          </ul>
        </div>

        <!-- 右侧地图：随左侧选择切换渲染（高德 Key 未配置时显示占位说明） -->
        <div>
          <MapLibreView :pois="info.transit" :active-index="activeIndex" height="440px" />
          <p class="map-caption mono">
            {{
              activeIndex != null
                ? `正在查看：${poiName(activeIndex)}`
                : '当前显示全部交通节点 · 点击左侧列表聚焦单个地点'
            }}
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.page {
  padding-block: clamp(48px, 8vh, 96px);
}

.t-body {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(28px, 4vw, 48px);
  align-items: start;
}

.v-name {
  font-size: clamp(1.3rem, 2.6vw, 1.8rem);
  font-weight: 600;
  line-height: 1.3;
}

.v-report {
  font-size: 14.5px;
  color: var(--grey);
  margin-top: 10px;
}

.list-hint {
  margin-top: clamp(22px, 3vw, 32px);
  font-size: 11.5px;
  letter-spacing: .1em;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 12px;
}

.v-list {
  border-bottom: 1px solid var(--ink);
}

.v-item-row {
  display: grid;
  grid-template-columns: 74px 1fr;
  column-gap: 16px;
  border-top: 1px solid var(--hairline);
  padding: 14px 8px 14px 0;
  align-items: baseline;
  cursor: pointer;
  transition: background-color .2s ease, box-shadow .2s ease;
}

.v-item-row:hover {
  background: rgba(180, 95, 58, .055);
}

.v-item-row.active {
  background: rgba(180, 95, 58, .08);
  box-shadow: inset 3px 0 0 var(--copper);
}

.v-code {
  font-family: var(--mono);
  font-size: 12px;
  letter-spacing: .12em;
  color: var(--copper-deep);
  font-weight: 500;
}

.v-item {
  font-size: 15px;
  line-height: 1.5;
}

.v-item small {
  display: block;
  font-size: 13px;
  color: var(--grey);
  margin-top: 2px;
}

.map-caption {
  margin-top: 12px;
  font-size: 11.5px;
  letter-spacing: .1em;
  color: var(--grey);
}

@media (min-width: 768px) {
  .t-body {
    grid-template-columns: minmax(0, 5fr) minmax(0, 6fr);
  }
}
</style>
