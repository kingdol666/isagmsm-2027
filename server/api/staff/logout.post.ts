import { clearStaffSessionCookie } from '../../utils/session'

/** 扫码端 staff 退出。 */
export default defineEventHandler((event) => {
  clearStaffSessionCookie(event)
  return { ok: true }
})
