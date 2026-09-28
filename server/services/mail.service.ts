import type { Mailer } from './mail.types'
import { createSmtpMailer, smtpConfigFromEnv } from './mail.smtp'

class DevMailer implements Mailer {
  async sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset') {
    console.warn(`[mail:dev] ${purpose} code for ${email}: ${code} (valid 10 minutes)`)
  }
}

/**
 * MailService transport selection:
 *  - MAIL_SMTP_HOST/USER/PASS/FROM set → real SMTP delivery (nodemailer)
 *  - otherwise → dev transport (logs the code; APIs surface it as devCode)
 */
export function getMailer(env: Record<string, string | undefined>): { mailer: Mailer, devMode: boolean, smtpConfigured: boolean } {
  const smtpConfig = smtpConfigFromEnv(env)
  if (smtpConfig) {
    return { mailer: createSmtpMailer(smtpConfig), devMode: false, smtpConfigured: true }
  }
  return { mailer: new DevMailer(), devMode: true, smtpConfigured: false }
}
