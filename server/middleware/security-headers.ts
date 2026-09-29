/**
 * 安全响应头（门户）。CSP 在生产（或 NUXT_CSP=1）启用。
 */
import { buildSecurityHeaders } from '../utils/security-headers'

export default defineEventHandler((event) => {
  const csp = process.env.NODE_ENV === 'production' || process.env.NUXT_CSP === '1'
  for (const [name, value] of Object.entries(buildSecurityHeaders({ contentSecurityPolicy: csp }))) {
    setResponseHeader(event, name, value)
  }
  // 反指纹：移除框架版本头（Nuxt/Nitro 默认发送）
  removeResponseHeader(event, 'x-powered-by')
  if (process.env.NODE_ENV === 'production') {
    setResponseHeader(event, 'strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
})
