/**
 * In-memory rate limiter (fixed window per key). Sufficient for a
 * single-process deployment; swap for a shared store when scaling out.
 *
 * TrafficLimiter 是可独立单元测试的纯类；模块级单例供各 API 使用。
 * 触发限流时返回 retryAfter 秒数，端点据此设置 Retry-After 响应头。
 */
export interface LimitResult {
  ok: boolean
  retryAfterSec: number
}

export class TrafficLimiter {
  private windows = new Map<string, { count: number, resetAt: number }>()

  constructor(private readonly maxKeys = 20_000) {}

  allow(key: string, limit: number, windowMs: number): LimitResult {
    const now = Date.now()
    // 简单防内存膨胀：键过多时先清一轮过期窗口
    if (this.windows.size >= this.maxKeys) {
      for (const [k, v] of this.windows) {
        if (v.resetAt <= now) this.windows.delete(k)
      }
    }

    const entry = this.windows.get(key)
    if (!entry || entry.resetAt <= now) {
      this.windows.set(key, { count: 1, resetAt: now + windowMs })
      return { ok: true, retryAfterSec: 0 }
    }
    if (entry.count >= limit) {
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) }
    }
    entry.count += 1
    return { ok: true, retryAfterSec: 0 }
  }
}

const limiter = new TrafficLimiter()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return limiter.allow(key, limit, windowMs).ok
}

export function clientKey(event: import('h3').H3Event, scope: string): string {
  // 反绕过：默认取连接级 IP（X-Forwarded-For 可被客户端伪造）。
  // 仅当部署在可信反向代理之后（TRUST_PROXY=1）才信任 XFF。
  const trustProxy = process.env.TRUST_PROXY === '1'
  const ip = getRequestIP(event, { xForwardedFor: trustProxy }) ?? 'unknown'
  return `${scope}:${ip}`
}

/** Throws 429 (with Retry-After) when the caller exceeds the limit. */
export function enforceRateLimit(event: import('h3').H3Event, scope: string, limit: number, windowMs: number): void {
  // Test-only bypass: the full E2E suite legitimately exceeds per-IP windows
  // from one machine. NEVER active in production builds.
  if (process.env.RATE_LIMIT_DISABLED === '1' && process.env.NODE_ENV !== 'production') return
  const result = limiter.allow(clientKey(event, scope), limit, windowMs)
  if (!result.ok) {
    // h3 将 Retry-After 头类型标记为 number（秒）
    setResponseHeader(event, 'retry-after', result.retryAfterSec)
    throw createError({ statusCode: 429, statusMessage: 'Too many requests, please retry later' })
  }
}
