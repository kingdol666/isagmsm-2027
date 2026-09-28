/**
 * Minimal in-memory rate limiter (fixed window per key). Sufficient for a
 * single-process deployment; swap for a shared store when scaling out.
 */
const windows = new Map<string, { count: number, resetAt: number }>()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = windows.get(key)
  if (!entry || entry.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count += 1
  return true
}

export function clientKey(event: import('h3').H3Event, scope: string): string {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  return `${scope}:${ip}`
}

/** Throws 429 when the caller exceeds the limit. */
export function enforceRateLimit(event: import('h3').H3Event, scope: string, limit: number, windowMs: number): void {
  if (!rateLimit(clientKey(event, scope), limit, windowMs)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests, please retry later' })
  }
}
