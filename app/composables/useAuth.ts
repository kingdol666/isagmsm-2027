export interface AuthUser {
  userId: string
  email: string
  fullName?: string | null
  hasProfile?: boolean
}

/**
 * Participant account state. `user === undefined` means "not loaded yet",
 * `null` means anonymous.
 */
export function useAuth() {
  const user = useState<AuthUser | null | undefined>('auth-user', () => undefined)

  async function fetchUser() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<{ user: AuthUser | null }>('/api/auth/me', { headers })
      user.value = res.user
    }
    catch {
      user.value = null
    }
    return user.value
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    await navigateTo('/')
  }

  return { user, fetchUser, logout }
}
