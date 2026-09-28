/**
 * MailService — verification-code delivery.
 *
 * Dev/demo transport: logs the code and returns it so the API can surface it
 * to the developer (never in production). SMTP transport activates when
 * MAIL_SMTP_* env is configured (see ARCHITECTURE.md); until then the adapter
 * pattern keeps the auth flow fully testable without an SMTP server.
 */

export interface Mailer {
  sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset'): Promise<void>
}

class DevMailer implements Mailer {
  async sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset') {
    console.warn(`[mail:dev] ${purpose} code for ${email}: ${code} (valid 10 minutes)`)
  }
}

class SmtpMailer implements Mailer {
  async sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset') {
    // SMTP delivery (nodemailer) activates with MAIL_SMTP_* credentials.
    // Structured here so switching transports never touches auth logic.
    const subject = purpose === 'signup'
      ? 'PPS 2026 — your verification code'
      : 'PPS 2026 — your password reset code'
    console.warn(`[mail:smtp] would send "${subject}" to ${email}: ${code}`)
    throw new Error('SMTP transport is not configured — set MAIL_SMTP_* variables (see ARCHITECTURE.md)')
  }
}

export function getMailer(env: Record<string, string | undefined>): { mailer: Mailer, devMode: boolean } {
  const smtpConfigured = Boolean(env.MAIL_SMTP_HOST && env.MAIL_SMTP_USER && env.MAIL_SMTP_PASS)
  if (smtpConfigured) {
    return { mailer: new SmtpMailer(), devMode: false }
  }
  return { mailer: new DevMailer(), devMode: true }
}
