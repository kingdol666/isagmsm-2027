<script setup lang="ts">
/**
 * MapLibre GL JS（WebGL）+ 免费栅格瓦片 — 免 Key 地图视图。
 *  - 底图：OpenStreetMap 官方瓦片（© OpenStreetMap 贡献者），画布滤镜压低饱和度以贴合全站纸墨色调
 *  - pois 全部渲染为铜色方形标记（呼应全站「网格仪器」视觉）；activeIndex 变化时飞行到对应点并打开弹窗
 *  - activeIndex 为 null 时自适应缩放展示全部标记，并显示实时经纬度读数
 */
import type { Map as MapLibreMap, Marker as MapLibreMarker, Popup as MapLibrePopup } from 'maplibre-gl'

const { t } = useI18n()

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
const coords = ref('')

let map: MapLibreMap | null = null
let lib: typeof import('maplibre-gl') | null = null
let activePopup: MapLibrePopup | null = null

const center = computed(() => {
  if (props.activeIndex != null) {
    const poi = props.pois[props.activeIndex]
    if (poi?.lng && poi?.lat) return { lng: poi.lng, lat: poi.lat }
  }
  const pts = props.pois.filter(p => p.lng && p.lat)
  if (!pts.length) return { lng: 117.2952, lat: 31.7213 }
  const lng = pts.reduce((sum, p) => sum + (p.lng ?? 0), 0) / pts.length
  const lat = pts.reduce((sum, p) => sum + (p.lat ?? 0), 0) / pts.length
  return { lng, lat }
})

function popupHtml(poi: MapPoi): string {
  return `<div class="pp">
    <strong>${poi.name}</strong>
    ${poi.detail ? `<span>${poi.detail}</span>` : ''}
  </div>`
}

/* 铜色方形标记 — 网格仪器风格的锚点，非默认水滴 pin */
function markerElement(poi: MapPoi, index: number): HTMLDivElement {
  const el = document.createElement('div')
  const emphasized = props.activeIndex === index
  el.title = poi.name
  el.style.cssText = [
    'width:16px',
    'height:16px',
    'background:#B45F3A',
    'border:2px solid #F7F6F2',
    'outline:1px solid #111111',
    'box-shadow:0 2px 8px rgba(17,17,17,.35)',
    'cursor:pointer',
    'transition:transform .2s ease',
    emphasized ? 'transform:scale(1.35)' : '',
  ].join(';')
  el.addEventListener('mouseenter', () => { el.style.transform = 'scale(1.35)' })
  el.addEventListener('mouseleave', () => { if (props.activeIndex !== index) el.style.transform = 'scale(1)' })
  return el
}

function readout() {
  if (!map) return
  const c = map.getCenter()
  coords.value = `N ${c.lat.toFixed(4)} · E ${c.lng.toFixed(4)} · Z ${map.getZoom().toFixed(1)}`
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
            tiles: [
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> 贡献者',
          },
        },
        layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
      },
      center: [center.value.lng, center.value.lat],
      zoom: props.activeIndex != null ? 15 : 12,
      attributionControl: { compact: false },
    })
    map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-left')

    for (const [index, poi] of props.pois.entries()) {
      if (!poi.lng || !poi.lat) continue
      const popup = new lib.Popup({ offset: 18, closeButton: false, className: 'pp-wrap' })
        .setHTML(popupHtml(poi))
      const marker: MapLibreMarker = new lib.Marker({ element: markerElement(poi, index) })
        .setLngLat([poi.lng, poi.lat])
        .setPopup(popup)
        .addTo(map)
      marker.getElement().addEventListener('click', () => {
        map?.flyTo({ center: [poi.lng!, poi.lat!], zoom: 15.5, essential: true })
      })
    }

    map.on('load', () => {
      mapReady.value = true
      readout()
      if (props.activeIndex != null) {
        focusPoi(props.activeIndex)
      }
      else {
        fitAll()
      }
    })
    map.on('move', readout)
  }
  catch (error) {
      mapError.value = error instanceof Error ? error.message : t('common.map.loadFailed')
  }
})

/* activeIndex 变化：飞行到对应点并打开弹窗 */
watch(() => props.activeIndex, (index) => {
  if (mapReady.value) {
    if (index == null) {
      closeActivePopup()
      fitAll()
    }
    else {
      focusPoi(index)
    }
  }
})

function closeActivePopup() {
  activePopup?.remove()
  activePopup = null
}

function fitAll() {
  const pts = props.pois.filter(p => p.lng && p.lat)
  if (!map || pts.length < 2) return
  const bounds = new lib!.LngLatBounds([pts[0]!.lng!, pts[0]!.lat!], [pts[0]!.lng!, pts[0]!.lat!])
  for (const p of pts) bounds.extend([p.lng!, p.lat!])
  map.fitBounds(bounds, { padding: 56, maxZoom: 13, duration: 900, essential: true })
}

function focusPoi(index: number | null) {
  if (!map || !lib || index == null) return
  const poi = props.pois[index]
  if (!poi?.lng || !poi?.lat) return
  closeActivePopup()
  map.flyTo({ center: [poi.lng, poi.lat], zoom: 15.5, duration: 900, essential: true })
  activePopup = new lib.Popup({ offset: 18, closeButton: false, className: 'pp-wrap' })
    .setLngLat([poi.lng, poi.lat])
    .setHTML(popupHtml(poi))
    .addTo(map)
}

onUnmounted(() => {
  closeActivePopup()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-wrap" :style="{ height }">
    <div ref="mapEl" class="map-box" />
    <p v-if="mapReady" class="coords mono" data-testid="map-coords" aria-hidden="true">{{ coords }}</p>
    <div v-if="!mapReady" class="loading" data-testid="map-loading">
      <p class="l-text mono">{{ mapError ? t('common.map.loadFailed') : t('common.map.loading') }}</p>
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
  box-shadow: 6px 6px 0 rgba(17, 17, 17, .06);
}

.map-box {
  position: absolute;
  inset: 0;
}

/* 压低标准 OSM 的饱和度/亮度，贴合纸墨编辑色调 */
.map-box :deep(.maplibregl-canvas) {
  filter: grayscale(.28) saturate(.68) brightness(1.03) contrast(.97);
}

/* 坐标读数 — 让地图像一台「仪器」（置顶右，避让右下署名） */
.coords {
  position: absolute;
  right: 10px;
  top: 10px;
  z-index: 2;
  font-size: 10.5px;
  letter-spacing: .1em;
  color: var(--ink);
  background: rgba(247, 246, 242, .92);
  border: 1px solid var(--hairline);
  padding: 3px 8px;
  pointer-events: none;
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

/* MapLibre 注入的弹窗与署名不在 scoped 树内，用 :deep 覆写 */
.map-box :deep(.maplibregl-popup-content) {
  padding: 0;
  border-radius: 0;
  border: 1px solid var(--ink);
  box-shadow: 4px 4px 0 rgba(17, 17, 17, .12);
  background: var(--paper, #F7F6F2);
}

.map-box :deep(.maplibregl-popup-tip) {
  border-top-color: var(--ink);
  border-bottom-color: var(--ink);
}

.map-box :deep(.maplibregl-ctrl-group) {
  border-radius: 0;
  border: 1px solid var(--ink);
  box-shadow: none;
}

.map-box :deep(.maplibregl-ctrl-group button + button) {
  border-top: 1px solid var(--hairline);
}

.map-box :deep(.maplibregl-ctrl-attrib) {
  font-size: 10px;
  background: rgba(247, 246, 242, .88);
}

.map-box :deep(.maplibregl-ctrl-attrib a) {
  color: var(--grey, #6B6B66);
}
</style>

<style>
/* 弹窗内容（popupHtml 注入）— 全局类，避免与站点样式冲突 */
.pp {
  font-family: var(--sans, 'Inter', sans-serif);
  line-height: 1.55;
  min-width: 200px;
  max-width: 260px;
  padding: 10px 14px 11px;
}

.pp strong {
  display: block;
  font-size: 13px;
  color: #111111;
  letter-spacing: .02em;
}

.pp span {
  display: block;
  color: #6B6B66;
  font-size: 12px;
  margin-top: 3px;
}
</style>
