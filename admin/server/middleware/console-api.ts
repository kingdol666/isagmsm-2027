/**
 * 管理台 API 守卫：/api/** 除登录外全部要求 admin 会话（pps_console）。
 */
export default defineEventHandler((event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return
  if (path === '/api/login') return
  requireConsoleAdmin(event)
})
