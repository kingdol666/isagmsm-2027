import { listAvailableProviders } from '../payments'
import { getMailer } from '../services/mail.service'

/**
 * Boot-time configuration report: prints which optional integrations are
 * active so operators can see immediately what still needs filling in.
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const providers = listAvailableProviders()
  const active = providers.filter(p => p.available).map(p => p.name)
  const mail = getMailer(process.env)
  const usingDevAdminPasswords = !process.env.ADMIN_PASSWORD

  const lines = [
    '── PPS 2026 configuration report ─────────────────────────────',
    `  payments : ${active.join(', ')}${active.length === 1 ? '   (WeChat/Alipay activate via WECHAT_* / ALIPAY_* env — see PAYMENT.md)' : ''}`,
    `  mail     : ${mail.smtpConfigured ? 'SMTP delivery active' : 'DEV MODE — codes are logged and returned as devCode (set MAIL_SMTP_* to send real email)'}`,
    `  database : ${config.databaseUrl ? 'configured' : 'MISSING — set DATABASE_URL'}`,
    `  secrets  : ${usingDevAdminPasswords ? 'dev defaults in use — set ADMIN_PASSWORD / NUXT_SESSION_SECRET before any real deployment' : 'customised'}`,
    '──────────────────────────────────────────────────────────────',
  ]
  for (const line of lines) console.warn(line)
})
