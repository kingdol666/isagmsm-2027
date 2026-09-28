<script setup lang="ts">
/**
 * MapLibre GL JS（WebGL）+ OpenStreetMap 免费瓦片 — 免 Key 地图视图。
 *  - pois 全部渲染为铜色标记；activeIndex 变化时飞行到对应点并打开弹窗
 *  - activeIndex 为 null 时自动缩放展示全部标记
 */
import type { Map as MapLibreMap } from 'maplibre-gl'

export interface MapPoi {
  name: string
  detail?: string
  lng?: number
  lat?: number
}

const props = withDefaults(defineProps<{
  pois: readonly MapPoi[]
  /** 受控激活点（会场交通：点击左侧列表切换）；不传则全部展示并自动缩放 */
  activeIndex?: number | null
  height?: string
}>(), {
  activeIndex: null,
  height: '420px',
})

const mapEl = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)
const mapError = ref('')

let map: MapLibreMap | null = null
let lib: typeof import('maplibre-gl') | null = null

const center = computed(() => {
  if (props.activeIndex != null) {
    const poi = props.pois[props.activeIndex]
    if (poi?.lng && poi?.lat) return { lng: poi.lng, lat: poi.lat }
  }
  const pts = props.pois.filter(p => p.lng && p.lat)
  if (!pts.length) return { lng: 117.2897, lat: 31.7165 }
  const lng = pts.reduce((sum, p) => sum + (p.lng ?? 0), 0) / pts.length
  const lat = pts.reduce((sum, p) => sum + (p.lat ?? 0), 0) / pts.length
  return { lng, lat }
})

function popupHtml(poi: MapPoi): string {
  return `<div style="font-family:var(--sans),sans-serif;line-height:1.6;min-width:180px">
    <strong style="font-size:13px;color:#111">${poi.name}</strong>
    ${poi.detail ? `<div style="color:#6B6B66;font-size:12px;margin-top:2px">${poi.detail}</div>` : ''}
  </div>`
}

onMounted(async () => {
  try {
    lib = await import('maplibre-gl')
    await import('maplibre-gl/dist/maplibre-gl.css')

    if (!mapEl.value || !lib) return
    map = new lib.Map({
      container: mapEl.value,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 贡献者',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [center.value.lng, center.value.lat],
      zoom: props.activeIndex != null ? 15 : 13,
      attributionControl: { compact: false },
    })
    map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-left')

    for (const poi of props.pois.filter(p => p.lng && p.lat)) {
      const popup = new lib.Popup({ offset: 28, closeButton: false }).setHTML(popupHtml(poi))
      new lib.Marker({ color: '#B45F3A' })
        .setLngLat([poi.lng!, poi.lat!])
        .setPopup(popup)
        .addTo(map)
    }

    map.on('load', () => {
      mapReady.value = true
      if (props.activeIndex != null) focusPoi(props.activeIndex)
    })
  }
  catch (error) {
    mapError.value = error instanceof Error ? error.message : '地图加载失败'
  }
})

/* activeIndex 变化：飞行到对应点并打开弹窗 */
watch(() => props.activeIndex, (index) => {
  if (mapReady.value) focusPoi(index)
})

function focusPoi(index: number | null) {
  if (!map || !lib || index == null) return
  const poi = props.pois[index]
  if (!poi?.lng || !poi?.lat) return
  map.flyTo({ center: [poi.lng, poi.lat], zoom: 15 })
  new lib.Popup({ offset: 28, closeButton: false })
    .setLngLat([poi.lng, poi.lat])
    .setHTML(popupHtml(poi))
    .addTo(map)
}

onUnmounted(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-wrap" :style="{ height }">
    <div ref="mapEl" class="map-box" />
    <div v-if="!mapReady" class="loading" data-testid="map-loading">
      <p class="l-text mono">{{ mapError ? '地图加载失败' : '地图加载中…' }}</p>
      <p v-if="mapError" class="l-sub mono">{{ mapError }}</p>
    </div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  border: 1px solid var(--ink);
  overflow: hidden;
  background: var(--tint);
}

.map-box {
  position: absolute;
  inset: 0;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--tint);
}

.l-text {
  font-size: 13px;
  letter-spacing: .14em;
  color: var(--copper-deep);
}

.l-sub {
  font-size: 12px;
  color: var(--grey);
}
</style>
