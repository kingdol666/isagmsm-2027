import { listAvailableProviders } from '../payments'
import { getMailer } from '../services/mail.service'

/**
 * Minimal public health + configuration report (no secrets): lets deployment
 * checks confirm which integrations are active.
 */
export default defineEventHandler(() => {
  const providers = listAvailableProviders()
  const mail = getMailer(process.env)
  return {
    status: 'ok',
    event: 'PPS 2026',
    integrations: {
      payments: providers.filter(p => p.available).map(p => p.name),
      mail: mail.smtpConfigured ? 'smtp' : 'dev',
    },
  }
})
