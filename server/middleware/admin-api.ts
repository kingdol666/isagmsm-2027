const ADMIN_PREFIX = '/api/admin'
const PUBLIC_ADMIN_ROUTES = ['/api/admin/login']
const CHECKIN_PREFIX = '/api/checkin'
const ACCOUNT_PREFIX = '/api/account'

/**
 * API guard:
 *  - /api/admin/**   requires an admin/staff session (login is public)
 *  - /api/checkin/** requires staff or admin (the scanner app)
 *  - /api/account/** requires a signed-in participant account
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (path.startsWith(ADMIN_PREFIX)) {
    if (PUBLIC_ADMIN_ROUTES.includes(path)) return
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
