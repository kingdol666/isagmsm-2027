import { z } from 'zod'
import { findAdminByUsername } from '../repositories/console'
import { verifyPassword } from '../services/crypto'
import { enforceLoginRateLimit } from '../utils/rate-limit'
import { setConsoleSessionCookie } from '../utils/session'
import { parseBody, sendDomainError } from '../utils/validation'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

/* 账号名级爆破锁定：连续 5 次失败 → 锁定 15 分钟（成功登录即清零） */
const MAX_FAILURES = 5
const LOCK_MS = 15 * 60_000
const failures = new Map<string, { count: number, lockedUntil: number }>()

function assertNotLocked(username: string) {
  const entry = failures.get(username)
  if (entry && entry.lockedUntil > Date.now()) {
    throw createError({ statusCode: 423, statusMessage: '该账号已被临时锁定，请 15 分钟后重试' })
  }
}

function recordFailure(username: string) {
  const entry = failures.get(username) ?? { count: 0, lockedUntil: 0 }
  entry.count += 1
  if (entry.count >= MAX_FAILURES) {
    entry.lockedUntil = Date.now() + LOCK_MS
    entry.count = 0
  }
  failures.set(username, entry)
}

/** 管理台登录 —— 仅 admin 角色可进入；staff 请使用门户扫码端。 */
export default defineEventHandler(async (event) => {
  // IP 级限流（连接级 IP，不信任可伪造的 X-Forwarded-For）
  enforceLoginRateLimit(event)
  try {
    const { username, password } = await parseBody(event, loginSchema)
    assertNotLocked(username)
    const db = useDb()
    const user = await findAdminByUsername(db, username)
    if (!user || !verifyPassword(password, user.passwordHash)) {
      recordFailure(username)
      throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
    }
    if (user.role !== 'admin') {
      throw createError({ statusCode: 403, statusMessage: '管理台仅限管理员账号登录' })
    }
    failures.delete(username)
    const session = { userId: user.id, username: user.username, role: 'admin' as const }
    setConsoleSessionCookie(event, session)
    return { user: session }
  }
  catch (error) {
    sendDomainError(error)
  }
})
