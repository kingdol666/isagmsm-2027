import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

/**
 * 管理台会话 —— 独立于门户：
 *  - cookie 名 pps_console（门户扫码端用 pps_staff，参会人用 pps_user）
 *  - 密钥 NUXT_CONSOLE_SESSION_SECRET（与门户 NUXT_SESSION_SECRET 不同）
 * cookie 按 host 而非端口共享，因此不同 cookie 名是隔离的关键。
 */

const CONSOLE_COOKIE = 'pps_console'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000

export interface ConsoleSession {
  userId: string
  username: string
  role: 'admin'
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

function createSessionToken(session: ConsoleSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    ...session,
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

function verifySessionToken(token: string | undefined, secret: string): ConsoleSession | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null
  const expected = sign(payload, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as ConsoleSession & { exp: number }
    if (!data.exp || data.exp < Date.now()) return null
    if (data.role !== 'admin') return null
    return { userId: data.userId, username: data.username, role: 'admin' }
  }
  catch {
    return null
  }
}

function setSessionCookie(event: H3Event, name: string, token: string) {
  // Secure 按实际请求协议决定（HTTP 部署不加，否则浏览器拒存、登录静默失败）；
  // TLS 终止在反向代理时设 COOKIE_SECURE=1 强制开启。
  const secure = getRequestURL(event).protocol === 'https:' || process.env.COOKIE_SECURE === '1'
  setCookie(event, name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export function setConsoleSessionCookie(event: H3Event, session: ConsoleSession) {
  setSessionCookie(event, CONSOLE_COOKIE, createSessionToken(session, useRuntimeConfig(event).consoleSessionSecret))
}

export function clearConsoleSessionCookie(event: H3Event) {
  deleteCookie(event, CONSOLE_COOKIE, { path: '/' })
}

export function getConsoleSession(event: H3Event): ConsoleSession | null {
  return verifySessionToken(getCookie(event, CONSOLE_COOKIE), useRuntimeConfig(event).consoleSessionSecret)
}

/** 管理台所有 API 仅限 admin —— 「只有管理员可以对人员入会有操作」。 */
export function requireConsoleAdmin(event: H3Event): ConsoleSession {
  const session = getConsoleSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return session
}
