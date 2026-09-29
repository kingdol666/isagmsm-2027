/**
 * 安全响应头构造（管理台，纯函数）。管理台无外部资源、无需摄像头。
 */

export function buildConsoleSecurityHeaders(options: { contentSecurityPolicy: boolean }): Record<string, string> {
  const headers: Record<string, string> = {
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), geolocation=(), microphone=(), payment=()',
    'cross-origin-opener-policy': 'same-origin',
    'cache-control': 'no-store',
  }
  if (options.contentSecurityPolicy) {
    headers['content-security-policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "font-src 'self' data:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      'upgrade-insecure-requests',
    ].join('; ')
  }
  return headers
}
