/**
 * 安全响应头（管理台）。CSP 在生产（或 NUXT_CSP=1）启用。
 */
import { buildConsoleSecurityHeaders } from '../utils/security-headers'

export default defineEventHandler((event) => {
  const csp = process.env.NODE_ENV === 'production' || process.env.NUXT_CSP === '1'
  for (const [name, value] of Object.entries(buildConsoleSecurityHeaders({ contentSecurityPolicy: csp }))) {
    setResponseHeader(event, name, value)
  }
  // 反指纹：移除框架版本头
  removeResponseHeader(event, 'x-powered-by')
  if (process.env.NODE_ENV === 'production') {
    setResponseHeader(event, 'strict-transport-security', 'max-age=31536000; includeSubDomains')
  }
})
