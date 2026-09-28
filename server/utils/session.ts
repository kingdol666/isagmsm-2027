import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'pps_admin'
const SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h

export interface AdminSession {
  userId: string
  username: string
  role: 'admin' | 'staff'
}

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/** Signed, stateless session token: base64(payload).base64(sig) */
export function createSessionToken(session: AdminSession, secret: string): string {
  const payload = Buffer.from(JSON.stringify({
    ...session,
    exp: Date.now() + SESSION_TTL_MS,
  })).toString('base64url')
  return `${payload}.${sign(payload, secret)}`
}

export function verifySessionToken(token: string | undefined, secret: string): AdminSession | null {
  if (!token) return null
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return null

  const expected = sign(payload, secret)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AdminSession & { exp: number }
    if (!data.exp || data.exp < Date.now()) return null
    return { userId: data.userId, username: data.username, role: data.role }
  }
  catch {
    return null
  }
}

export function setSessionCookie(event: H3Event, token: string) {
  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_MS / 1000,
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

export function getSession(event: H3Event): AdminSession | null {
  const config = useRuntimeConfig(event)
  return verifySessionToken(getCookie(event, COOKIE_NAME), config.sessionSecret)
}

export function requireSession(event: H3Event): AdminSession {
  const session = getSession(event)
  if (!session) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  return session
}

export function requireAdmin(event: H3Event): AdminSession {
  const session = requireSession(event)
  if (session.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admin role required' })
  }
  return session
}

/** Staff OR admin — used by the check-in scanner endpoints. */
export function requireStaff(event: H3Event): AdminSession {
  return requireSession(event)
}
