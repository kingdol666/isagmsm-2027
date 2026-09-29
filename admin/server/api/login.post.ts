import { z } from 'zod'
import { findAdminByUsername } from '../repositories/console'
import { verifyPassword } from '../services/crypto'
import { setConsoleSessionCookie } from '../utils/session'
import { parseBody, sendDomainError } from '../utils/validation'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

/* 简单内存限流：同 IP 每 60 秒最多 10 次尝试 */
const attempts = new Map<string, { count: number, resetAt: number }>()

function rateLimit(ip: string) {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || entry.resetAt < now) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return
  }
  entry.count += 1
  if (entry.count > 10) {
    throw createError({ statusCode: 429, statusMessage: 'Too many attempts, retry later' })
  }
}

/** 管理台登录 —— 仅 admin 角色可进入；staff 请使用门户扫码端。 */
export default defineEventHandler(async (event) => {
  rateLimit(getRequestIP(event, { xForwardedFor: true }) ?? 'local')
  try {
    const { username, password } = await parseBody(event, loginSchema)
    const db = useDb()
    const user = await findAdminByUsername(db, username)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
    }
    if (user.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: '管理台仅限管理员账号登录' })
    }
    const session = { userId: user.id, username: user.username, role: 'admin' as const }
    setConsoleSessionCookie(event, session)
    return { user: session }
  }
  catch (error) {
    sendDomainError(error)
  }
})
