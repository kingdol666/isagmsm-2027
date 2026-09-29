import type { Mailer } from './mail.types'
import { createSmtpMailer, smtpConfigFromEnv } from './mail.smtp'

class DevMailer implements Mailer {
  async sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset') {
    console.warn(`[mail:dev] ${purpose} code for ${email}: ${code} (valid 10 minutes)`)
  }
}

/**
 * MailService transport selection:
 *  - MAIL_DRIVER=test            → DevMailer + devCode（自动化测试专用，生产禁用）
 *  - MAIL_SMTP_* 配置齐全        → 真实 SMTP 发信（nodemailer），无 devCode
 *  - 否则                        → DevMailer（日志 + devCode，本地演示）
 */
export function getMailer(env: Record<string, string | undefined>): { mailer: Mailer, devMode: boolean, smtpConfigured: boolean } {
  if (env.MAIL_DRIVER === 'test') {
    return { mailer: new DevMailer(), devMode: true, smtpConfigured: false }
  }
  const smtpConfig = smtpConfigFromEnv(env)
  if (smtpConfig) {
    return { mailer: createSmtpMailer(smtpConfig), devMode: false, smtpConfigured: true }
  }
  return { mailer: new DevMailer(), devMode: true, smtpConfigured: false }
}
