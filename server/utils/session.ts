import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const ADMIN_COOKIE = 'pps_staff'
const USER_COOKIE = 'pps_user'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h

export interface AdminSession {
  userId: string
  username: string
  role: 'admin' | 'staff'
}

export interface UserSession {
  userId: string
  email: string
  role: 'participant'
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Signed, stateless session token: base64(payload).base64(sig) */
export function createSessionToken(session: AdminSession | UserSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    ...session,
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken<T extends AdminSession | UserSession>(token: string | undefined, secret: string): T | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as T & { exp: number }
    if (!data.exp || data.exp < Date.now()) return null
    return data
  }
  catch {
    return null
  }
}

function setSessionCookie(event: H3Event, name: string, token: string) {
  setCookie(event, name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

function clearSessionCookie(event: H3Event, name: string) {
  deleteCookie(event, name, { path: '/' })
}

/* ---- staff sessions（现场扫码端；管理台在独立的 admin 项目，用 pps_console cookie） ----
 * 门户只保留扫码所需的 staff 会话：staff/admin 皆可登录扫码，但管理台入口不在本应用。
 */

export function setStaffSessionCookie(event: H3Event, session: AdminSession) {
  const config = useRuntimeConfig(event)
  setSessionCookie(event, ADMIN_COOKIE, createSessionToken(session, config.sessionSecret))
}

export function clearStaffSessionCookie(event: H3Event) {
  clearSessionCookie(event, ADMIN_COOKIE)
}

export function getSession(event: H3Event): AdminSession | null {
  const config = useRuntimeConfig(event)
  return verifySessionToken<AdminSession>(getCookie(event, ADMIN_COOKIE), config.sessionSecret)
}

export function requireSession(event: H3Event): AdminSession {
  const session = getSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return session
}

/** Staff OR admin — used by the check-in scanner endpoints. */
export function requireStaff(event: H3Event): AdminSession {
  return requireSession(event)
}

/* ---- participant (account) sessions ---- */

export function setUserSessionCookie(event: H3Event, session: UserSession) {
  const config = useRuntimeConfig(event)
  setSessionCookie(event, USER_COOKIE, createSessionToken(session, config.sessionSecret))
}

export function clearUserSessionCookie(event: H3Event) {
  clearSessionCookie(event, USER_COOKIE)
}

export function getUserSession(event: H3Event): UserSession | null {
  const config = useRuntimeConfig(event)
  return verifySessionToken<UserSession>(getCookie(event, USER_COOKIE), config.sessionSecret)
}

export function requireUser(event: H3Event): UserSession {
  const session = getUserSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Please sign in to continue' })
  }
  return session
}
