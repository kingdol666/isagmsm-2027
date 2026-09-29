import { z } from 'zod'
import { authenticateAdmin } from '../../repositories/admin-users'
import { setStaffSessionCookie } from '../../utils/session'
import { parseBody, sendDomainError } from '../../utils/validation'
import { enforceRateLimit } from '../../utils/rate-limit'

const loginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
})

/** 扫码端 staff 登录（staff/admin 皆可）。后台管理台在独立的 admin 项目（端口 3001）。 */
export default defineEventHandler(async (event) => {
  enforceRateLimit(event, 'staff-login', 10, 60_000)
  try {
    const { username, password } = await parseBody(event, loginSchema)
    const db = useDb()
    const user = await authenticateAdmin(db, username, password)
    if (!user) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid username or password' })
    }
    const session = { userId: user.id, username: user.username, role: user.role as 'admin' | 'staff' }
    setStaffSessionCookie(event, session)
    return { user: session }
  }
  catch (error) {
    sendDomainError(error)
  }
})
