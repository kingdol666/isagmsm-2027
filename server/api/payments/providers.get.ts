import { listAvailableProviders } from '../../payments'

/** Which payment providers are configured right now (mock always available). */
export default defineEventHandler(() => {
  return { providers: listAvailableProviders() }
})
