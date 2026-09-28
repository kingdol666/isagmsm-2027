<script setup lang="ts">
/**
 * 高德地图酒店分布图。
 * Key 来自运行时配置（NUXT_PUBLIC_AMAP_KEY / NUXT_PUBLIC_AMAP_SECURITY_KEY）：
 *  - 已配置：加载高德 JS API 2.0，渲染酒店标记 + 信息窗体
 *  - 未配置：显示占位提示（站点其余功能不受影响）
 */
interface HotelMarker {
  name: string
  price: string
  address: string
  lng?: number
  lat?: number
}

const props = defineProps<{ hotels: readonly HotelMarker[] }>()

const config = useRuntimeConfig()
const key = computed(() => config.public.amapKey as string)
const securityKey = computed(() => config.public.amapSecurityKey as string)

const mapEl = ref<HTMLDivElement | null>(null)
const mapReady = ref(false)
const mapError = ref('')

const center = computed(() => {
  const withCoords = props.hotels.filter(h => h.lng && h.lat)
  if (!withCoords.length) return { lng: 117.2897, lat: 31.7165 }
  const lng = withCoords.reduce((sum, h) => sum + (h.lng ?? 0), 0) / withCoords.length
  const lat = withCoords.reduce((sum, h) => sum + (h.lat ?? 0), 0) / withCoords.length
  return { lng, lat }
})

/* 高德 JS API 全局对象（无官方类型，最小声明） */
interface AMapMap {
  add: (overlay: unknown) => void
  setFitView: (overlays?: unknown[], immediately?: boolean, avoid?: number[]) => void
}
interface AMapGlobal {
  Map: new (el: HTMLElement, options: Record<string, unknown>) => AMapMap
  Marker: new (options: Record<string, unknown>) => { on: (ev: string, cb: () => void) => void, getPosition: () => unknown }
  InfoWindow: new (options: Record<string, unknown>) => { open: (map: AMapMap, position: unknown) => void }
  Pixel: new (x: number, y: number) => unknown
}

function loadAMap(): Promise<AMapGlobal> {
  const w = window as unknown as { AMap?: AMapGlobal, _AMapSecurityConfig?: { securityJsCode: string } }
  if (w.AMap) return Promise.resolve(w.AMap)
  // 高德 2021+ 安全密钥（须在 JS API 加载前设置）
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

onMounted(async () => {
  if (!key.value) return // 占位模式
  try {
    const AMap = await loadAMap()
    if (!mapEl.value) return
    const map = new AMap.Map(mapEl.value, {
      viewMode: '2D',
      zoom: 14,
      center: [center.value.lng, center.value.lat],
    })

    for (const hotel of props.hotels) {
      if (!hotel.lng || !hotel.lat) continue
      const marker = new AMap.Marker({
        position: [hotel.lng, hotel.lat],
        title: hotel.name,
      })
      const info = new AMap.InfoWindow({
        isCustom: false,
        content: `<div style="padding:8px 10px;font-family:inherit;line-height:1.6">
          <strong style="font-size:13px">${hotel.name}</strong><br>
          <span style="color:#9A4E2E;font-size:12px">${hotel.price}</span><br>
          <span style="color:#6B6B66;font-size:12px">${hotel.address}</span>
        </div>`,
        offset: new AMap.Pixel(0, -34),
      })
      marker.on('click', () => info.open(map, marker.getPosition()))
      map.add(marker)
    }

    map.setFitView(undefined, false, [40, 40, 40, 40])
    mapReady.value = true
  }
  catch (error) {
    mapError.value = error instanceof Error ? error.message : '地图加载失败'
  }
})
</script>

<template>
  <div class="map-wrap">
    <div v-show="mapReady" ref="mapEl" class="amap-box" />
    <!-- 占位：未配置 Key 或加载失败 -->
    <div v-if="!mapReady" class="fallback" data-testid="map-fallback">
      <p class="f-title mono">{{ mapError ? '地图加载失败' : '地图加载中…' }}</p>
      <p class="f-body">
        {{ mapError
          ? mapError + '。'
          : '尚未配置高德地图 Key（NUXT_PUBLIC_AMAP_KEY）。配置后此处将渲染酒店真实位置地图。'
        }}
      </p>
      <p class="f-hint mono">酒店坐标可使用 https://lbs.amap.com/tools/picker 拾取并填入站点配置。</p>
    </div>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
  aspect-ratio: 16 / 10;
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
