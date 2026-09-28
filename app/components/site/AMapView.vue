<script setup lang="ts">
/**
 * 高德地图通用视图。
 * Key 来自运行时配置（NUXT_PUBLIC_AMAP_KEY / NUXT_PUBLIC_AMAP_SECURITY_KEY）：
 *  - 已配置：渲染地图 + POI 标记；activeIndex 变化时平移到对应点位并打开信息窗
 *  - 未配置 / 加载失败：显示占位提示
 */
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

const config = useRuntimeConfig()
const key = computed(() => config.public.amapKey as string)
const securityKey = computed(() => config.public.amapSecurityKey as string)

const mapEl = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)
const mapError = ref('')

let map: AMapMap | null = null
let markers: Array<{ marker: { on: (ev: string, cb: () => void) => void, getPosition: () => unknown }, info: { open: (map: AMapMap, position: unknown) => void, close: () => void } }> = []
let currentInfo: { close: () => void } | null = null

const withCoords = computed(() => props.pois.filter(p => p.lng && p.lat))

const center = computed(() => {
  if (props.activeIndex != null) {
    const poi = props.pois[props.activeIndex]
    if (poi?.lng && poi?.lat) return { lng: poi.lng, lat: poi.lat }
  }
  if (withCoords.value.length) {
    const lng = withCoords.value.reduce((sum, p) => sum + (p.lng ?? 0), 0) / withCoords.value.length
    const lat = withCoords.value.reduce((sum, p) => sum + (p.lat ?? 0), 0) / withCoords.value.length
    return { lng, lat }
  }
  return { lng: 117.2897, lat: 31.7165 }
})

interface AMapMap {
  add: (overlay: unknown) => void
  remove: (overlay: unknown) => void
  setZoomAndCenter: (zoom: number, center: [number, number]) => void
  setFitView: (overlays?: unknown[], immediately?: boolean, avoid?: number[]) => void
}
interface AMapMarker {
  on: (ev: string, cb: () => void) => void
  getPosition: () => unknown
}
interface AMapInfoWindow {
  open: (map: AMapMap, position: unknown) => void
  close: () => void
}
interface AMapGlobal {
  Map: new (el: HTMLElement, options: Record<string, unknown>) => AMapMap
  Marker: new (options: Record<string, unknown>) => AMapMarker
  InfoWindow: new (options: Record<string, unknown>) => AMapInfoWindow
  Pixel: new (x: number, y: number) => unknown
}

function loadAMap(): Promise<AMapGlobal> {
  const w = window as unknown as { AMap?: AMapGlobal, _AMapSecurityConfig?: { securityJsCode: string } }
  if (w.AMap) return Promise.resolve(w.AMap)
  if (securityKey.value) {
    w._AMapSecurityConfig = { securityJsCode: securityKey.value }
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key.value)}`
    script.onload = () => {
      if (w.AMap) resolve(w.AMap)
      else reject(new Error('AMap failed to initialize'))
    }
    script.onerror = () => reject(new Error('高德地图脚本加载失败（检查网络或 Key）'))
    document.head.appendChild(script)
  })
}

function infoContent(poi: MapPoi): string {
  return `<div style="padding:8px 10px;line-height:1.7">
    <strong style="font-size:13px">${poi.name}</strong>
    ${poi.detail ? `<div style="color:#6B6B66;font-size:12px">${poi.detail}</div>` : ''}
  </div>`
}

onMounted(async () => {
  if (!key.value) return
  try {
    const AMap = await loadAMap()
    if (!mapEl.value) return
    map = new AMap.Map(mapEl.value, {
      viewMode: '2D',
      zoom: props.activeIndex != null ? 15 : 13,
      center: [center.value.lng, center.value.lat],
    })

    for (const poi of withCoords.value) {
      const marker = new AMap.Marker({
        position: [poi.lng!, poi.lat!],
        title: poi.name,
      })
      const info = new AMap.InfoWindow({
        isCustom: false,
        content: infoContent(poi),
        offset: new AMap.Pixel(0, -34),
      })
      marker.on('click', () => {
        currentInfo?.close()
        info.open(map!, marker.getPosition())
        currentInfo = info
      })
      map.add(marker)
      markers.push({ marker, info })
    }

    if (props.activeIndex == null) {
      map.setFitView(undefined, false, [40, 40, 40, 40])
    }
    mapReady.value = true
  }
  catch (error) {
    mapError.value = error instanceof Error ? error.message : '地图加载失败'
  }
})

/* activeIndex 变化：平移 + 打开对应信息窗 */
watch(() => props.activeIndex, async (index) => {
  if (!mapReady.value || index == null) return
  const poi = props.pois[index]
  if (!poi?.lng || !poi?.lat) return
  if (!map) {
    // 地图尚未初始化完成（Key 异步加载中）— 等待挂载完成后由初始化逻辑处理
    return
  }
  map.setZoomAndCenter(15, [poi.lng, poi.lat])
  const entry = markers.find((m) => {
    const pos = m.marker.getPosition() as [number, number]
    return Math.abs(pos[0] - poi.lng!) < 1e-6 && Math.abs(pos[1] - poi.lat!) < 1e-6
  })
  if (entry) {
    currentInfo?.close()
    entry.info.open(map, entry.marker.getPosition())
    currentInfo = entry.info
  }
})

onUnmounted(() => {
  map = null
  markers = []
  currentInfo = null
})
</script>

<template>
  <div class="map-wrap" :style="{ height }">
    <div v-show="mapReady" ref="mapEl" class="amap-box" />
    <div v-if="!mapReady" class="fallback" data-testid="map-fallback">
      <p class="f-title mono">{{ mapError ? '地图加载失败' : '地图加载中…' }}</p>
      <p class="f-body">
        {{ mapError
          ? mapError + '。'
          : '尚未配置高德地图 Key（NUXT_PUBLIC_AMAP_KEY / NUXT_PUBLIC_AMAP_SECURITY_KEY）。配置后此处将渲染可交互的真实地图。'
        }}
      </p>
      <p class="f-hint mono">申请地址：https://lbs.amap.com/ （Web端 JS API Key + 安全密钥）</p>
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

.amap-box {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
}

.f-title {
  font-size: 13px;
  letter-spacing: .14em;
  color: var(--copper-deep);
}

.f-body {
  font-size: 13.5px;
  color: var(--grey);
  line-height: 1.8;
  max-width: 46ch;
}

.f-hint {
  font-size: 11.5px;
  color: var(--grey);
  opacity: .8;
}
</style>
