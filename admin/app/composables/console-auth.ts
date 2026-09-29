export interface ConsoleUser {
  userId: string
  username: string
  role: 'admin'
}

/** 管理台当前会话（undefined = 未加载，null = 未登录）。 */
export function useConsoleAuth() {
  const user = useState<ConsoleUser | null | undefined>('console-user', () => undefined)

  async function fetchUser() {
    try {
      const res = await $fetch<{ user: ConsoleUser | null }>('/api/me')
      user.value = res.user ?? null
    }
    catch {
      user.value = null
    }
    return user.value
  }

  return { user, fetchUser }
}
