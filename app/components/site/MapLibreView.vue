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
/** 非空 = 无法渲染交互地图（WebGL 不可用 / 初始化失败），展示静态回退卡片 */
const fallback = ref<'' | 'nowebgl' | 'error'>('')
/** 瓦片迟迟未就绪（弱网/受限网络），在地图上叠加「新窗口打开」提示条 */
const tileTrouble = ref(false)
const coords = ref('')

let map: MapLibreMap | null = null
let lib: typeof import('maplibre-gl') | null = null
let activePopup: MapLibrePopup | null = null
let loadTimer: ReturnType<typeof setTimeout> | null = null

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

/** 外部地图链接（回退 / 弱网提示共用）——始终可用，不依赖 WebGL 与瓦片网络 */
const osmLink = computed(() => {
  const z = props.activeIndex != null ? 15 : 12
  return `https://www.openstreetmap.org/#map=${z}/${center.value.lat.toFixed(4)}/${center.value.lng.toFixed(4)}`
})

/** WebGL 可用性探测：in-app 浏览器/旧内核常见 WebGL 缺失，必须先探测再初始化 */
function webglAvailable(): boolean {
  try {
    const probe = document.createElement('canvas')
    return Boolean(probe.getContext('webgl2') ?? probe.getContext('webgl'))
  }
  catch {
    return false
  }
}

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
  if (!webglAvailable()) {
    fallback.value = 'nowebgl'
    return
  }
  try {
    lib = await import('maplibre-gl')
    await import('maplibre-gl/dist/maplibre-gl.css')

    /* worker 文件必须显式交给打包器：maplibre 默认按 import.meta.url 相对定位
       maplibre-gl-worker.mjs，但 Rolldown/Vite 不会把它拷进产物 → Worker 404 →
       瓦片渲染线程挂掉、地图成片空白（开发模式由 vite 依赖预构建兜底，测不出）。
       用 ?worker&url（而非 ?url）：worker 会连同其内部 import 的 shared chunk 一起
       被打包成自洽产物；裸 ?url 拷出的文件内部 import 会 404 */
    lib.setWorkerUrl((await import('maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url')).default)

    if (!mapEl.value || !lib) return
    /* 弱网保底：瓦片 12s 未就绪则叠加外链提示条（地图本身可能稍后仍会画出来） */
    loadTimer = setTimeout(() => { tileTrouble.value = !mapReady.value }, 12_000)

    map = new lib.Map({
      container: mapEl.value,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
        sources: {
          osm: {
            type: 'raster',
            /* 双源互备（两台服务器都带 CORS 头，maplibre 经 fetch 取瓦片，无 CORS 头的镜像会整块缺图）；
               弱网/受限网络下由加载超时提示条引导外部地图打开 */
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
      attributionControl: { compact: true },
      /* 移动端适配：协作手势（单指滚页面、双指/Ctrl+滚轮操作地图，自带提示条）
         + 禁旋转与俯仰，避免误触把视角转到奇怪角度 */
      cooperativeGestures: true,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxZoom: 18,
      locale: {
        'CooperativeGesturesHandler.WindowsHelpText': t('common.map.gestureCtrl'),
        'CooperativeGesturesHandler.MacHelpText': t('common.map.gestureMac'),
        'CooperativeGesturesHandler.MobileHelpText': t('common.map.gestureTouch'),
      },
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
      if (!map) return
      mapReady.value = true
      tileTrouble.value = false
      if (loadTimer) {
        clearTimeout(loadTimer)
        loadTimer = null
      }
      readout()
      if (props.activeIndex != null) {
        focusPoi(props.activeIndex)
      }
      else {
        fitAll()
      }
      /* 首帧补绘：部分移动端/软件渲染 WebGL 下，定位动画结束后渲染循环停帧，
         若末帧仍有瓦片未就绪会停留在局部画面——动画结束与延时各强制补绘一次 */
      const m = map
      m.once('moveend', () => {
        m.resize()
        m.triggerRepaint()
      })
      setTimeout(() => {
        map?.resize()
        map?.triggerRepaint()
      }, 2500)
    })
    map.on('move', readout)
    /* 上下文丢失守卫：阻止默认卸载，恢复后补绘 */
    map.on('webglcontextlost', (e) => {
      ;(e as unknown as { originalEvent?: Event }).originalEvent?.preventDefault()
    })
    map.on('webglcontextrestored', () => map?.triggerRepaint())
  }
  catch {
    fallback.value = 'error'
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
  if (loadTimer) {
    clearTimeout(loadTimer)
    loadTimer = null
  }
  closeActivePopup()
  map?.remove()
  map = null
})
</script>

<template>
  <div class="map-wrap" :style="{ height }">
    <!-- 静态回退卡片：无 WebGL / 初始化失败 —— 点位信息 + 外部地图链接，始终可用 -->
    <div v-if="fallback" class="map-fallback" data-testid="map-fallback">
      <p class="f-title mono">{{ fallback === 'nowebgl' ? t('common.map.noWebgl') : t('common.map.loadFailed') }}</p>
      <ul class="f-list">
        <li v-for="poi in pois" :key="poi.name">
          <strong>{{ poi.name }}</strong>
          <small v-if="poi.detail">{{ poi.detail }}</small>
        </li>
      </ul>
      <a class="f-link mono" :href="osmLink" target="_blank" rel="noopener">{{ t('common.map.openExternal') }}</a>
    </div>

    <template v-else>
      <div ref="mapEl" class="map-box" />
      <p v-if="mapReady" class="coords mono" data-testid="map-coords" aria-hidden="true">{{ coords }}</p>
      <div v-if="!mapReady" class="loading" data-testid="map-loading">
        <p class="l-text mono">{{ t('common.map.loading') }}</p>
      </div>
      <p v-if="tileTrouble && !mapReady" class="slow-bar mono" data-testid="map-slow">
        <span>{{ t('common.map.slowHint') }}</span>
        <a :href="osmLink" target="_blank" rel="noopener">{{ t('common.map.openExternal') }}</a>
      </p>
    </template>
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
  z-index: 1;
}

.l-text {
  font-size: 13px;
  letter-spacing: .14em;
  color: var(--copper-deep);
}

/* 弱网提示条：叠在加载态之上，提供始终可用的外部地图出口 */
.slow-bar {
  position: absolute;
  left: 10px;
  right: 10px;
  bottom: 26px;
  z-index: 3;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 6px 14px;
  font-size: 12px;
  letter-spacing: .04em;
  color: var(--ink);
  background: rgba(247, 246, 242, .95);
  border: 1px solid var(--ink);
  padding: 9px 12px;
}

.slow-bar a {
  color: var(--copper-deep);
  text-decoration: underline;
  text-underline-offset: 3px;
  white-space: nowrap;
}

/* 静态回退卡片：无 WebGL / 初始化失败时的降级展示 */
.map-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: clamp(16px, 3vw, 28px);
  background: var(--tint);
  overflow-y: auto;
}

.f-title {
  font-size: 12.5px;
  letter-spacing: .1em;
  color: var(--copper-deep);
  border-top: 1px solid var(--ink);
  padding-top: 12px;
}

.f-list {
  list-style: none;
  margin: 0;
  padding: 0;
  border-bottom: 1px solid var(--hairline);
}

.f-list li {
  border-top: 1px solid var(--hairline);
  padding: 10px 0;
}

.f-list strong {
  display: block;
  font-size: 14.5px;
  font-weight: 500;
}

.f-list small {
  display: block;
  font-size: 12.5px;
  color: var(--grey);
  margin-top: 2px;
}

.f-link {
  align-self: flex-start;
  font-size: 12.5px;
  letter-spacing: .08em;
  color: var(--paper, #F7F6F2);
  background: var(--ink);
  border: 1px solid var(--ink);
  padding: 9px 14px;
  text-decoration: none;
}

.f-link:hover {
  background: var(--copper-deep);
  border-color: var(--copper-deep);
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
