const STAFF_PREFIX = '/api/staff'
const PUBLIC_STAFF_ROUTES = ['/api/staff/login']
const CHECKIN_PREFIX = '/api/checkin'
const ACCOUNT_PREFIX = '/api/account'

/**
 * API guard:
 *  - /api/staff/**    scanner staff sessions (login is public; staff OR admin)
 *  - /api/checkin/**  requires a staff/admin session (the scanner app)
 *  - /api/account/**  requires a signed-in participant account
 *
 * 后台管理 API 不在本应用 —— 它们属于独立的 admin 项目（../admin，端口 3001，
 * 使用独立的 pps_console cookie 与会话密钥）。
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith(STAFF_PREFIX)) {
    if (PUBLIC_STAFF_ROUTES.includes(path)) return
    requireSession(event)
    return
  }
  if (path.startsWith(CHECKIN_PREFIX)) {
    requireStaff(event)
    return
  }
  if (path.startsWith(ACCOUNT_PREFIX)) {
    requireUser(event)
  }
})
