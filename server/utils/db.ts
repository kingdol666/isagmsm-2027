import { createDb } from '../db'

/**
 * Request-side database handle. One pool per process per connection string
 * (cached in server/db/index.ts).
 */
export function useDb() {
  const config = useRuntimeConfig()
  return createDb(config.databaseUrl)
}
