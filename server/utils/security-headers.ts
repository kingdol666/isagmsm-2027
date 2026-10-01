/**
 * 安全响应头构造（纯函数，便于单元测试）。
 *  - 始终建议启用：nosniff / DENY framing / Referrer-Policy / Permissions-Policy / COOP
 *  - CSP 仅在生产（或 NUXT_CSP=1）启用：开发模式 Vite HMR 与内联脚本不兼容
 *  - 瓦片源需与 MapLibreView.vue 的 sources 保持一致
 */

/** 瓦片/glyph 源需与 MapLibreView.vue 的 sources 保持一致（两台瓦片服务器均带 CORS 头 + maplibre glyph 服务） */
const TILE_HOSTS = 'https://tile.openstreetmap.org https://tile.openstreetmap.de https://demotiles.maplibre.org'

export function buildSecurityHeaders(options: { contentSecurityPolicy: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(self), geolocation=(), microphone=(), payment=()',
    'cross-origin-opener-policy': 'same-origin',
  }
  if (options.contentSecurityPolicy) {
    headers['content-security-policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      /* worker-src 'self' blob:：MapLibre v6 以 Blob URL 创建模块 worker（内容仅 import 同源 chunk），
         缺 blob: 会导致部分瓦片 worker 加载失败 → 地图成片空白（开发模式无 CSP，此前测不出） */
      "worker-src 'self' blob:",
      "style-src 'self' 'unsafe-inline'",
      `img-src 'self' data: blob: ${TILE_HOSTS}`,
      `connect-src 'self' ${TILE_HOSTS}`,
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ')
  }
  return headers
}
