/**
 * Route guard for account-gated pages (e.g. conference registration).
 * Isomorphic: reads the session cookie server-side, fetches /api/auth/me client-side.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const { user, fetchUser } = useAuth()
  if (user.value === undefined) {
    await fetchUser()
  }
  if (!user.value) {
    return navigateTo(`/sign-up?redirect=${encodeURIComponent(to.fullPath)}`)
  }
})
