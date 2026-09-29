/**
 * 管理台限流器（与门户 server/utils/rate-limit.ts 同构）。
 * 分桶默认取连接级 IP —— X-Forwarded-For 可被客户端伪造，
 * 仅当部署在可信反向代理之后（TRUST_PROXY=1）才信任 XFF。
 */
export interface LimitResult {
  ok: boolean
  retryAfterSec: number
}

export class TrafficLimiter {
  private windows = new Map<string, { count: number, resetAt: number }>()

  allow(key: string, limit: number, windowMs: number): LimitResult {
    const now = Date.now()
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

export function connectionIp(event: import('h3').H3Event): string {
  const trustProxy = process.env.TRUST_PROXY === '1'
  return getRequestIP(event, { xForwardedFor: trustProxy }) ?? 'local'
}

export function enforceLoginRateLimit(event: import('h3').H3Event, limit = 10, windowMs = 60_000): void {
  const { ok, retryAfterSec } = limiter.allow(`console-login:${connectionIp(event)}`, limit, windowMs)
  if (!ok) {
    setResponseHeader(event, 'retry-after', retryAfterSec)
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts, retry later' })
  }
}
