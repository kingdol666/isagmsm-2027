export interface AuthUser {
  userId: string
  email: string
  fullName?: string | null
  hasProfile?: boolean
}

/**
 * Participant account state.
 * `user === undefined` means "not loaded yet"; `null` means anonymous.
 * `credentialToken` powers the header avatar's 会议凭证 entry.
 */
export function useAuth() {
  const user = useState<AuthUser | null | undefined>('auth-user', () => undefined)
  const credentialToken = useState<string | null>('auth-credential-token', () => null)

  async function fetchUser() {
    try {
      const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined
      const res = await $fetch<{ user: AuthUser | null, credentialToken?: string | null }>('/api/auth/me', { headers })
      user.value = res.user
      credentialToken.value = res.credentialToken ?? null
    }
    catch {
      user.value = null
      credentialToken.value = null
    }
    return user.value
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    user.value = null
    credentialToken.value = null
    await navigateTo('/')
  }

  return { user, credentialToken, fetchUser, logout }
}
