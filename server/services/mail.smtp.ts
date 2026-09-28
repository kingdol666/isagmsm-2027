import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import type { Mailer } from './mail.types'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for 587/25
  user: string
  pass: string
  from: string // e.g. "PPS 2026 <no-reply@pps2026-conf.org>"
}

export function smtpConfigFromEnv(env: Record<string, string | undefined>): SmtpConfig | null {
  const host = env.MAIL_SMTP_HOST
  const user = env.MAIL_SMTP_USER
  const pass = env.MAIL_SMTP_PASS
  const from = env.MAIL_FROM
  if (!host || !user || !pass || !from) return null
  return {
    host,
    port: Number(env.MAIL_SMTP_PORT ?? 587),
    secure: (env.MAIL_SMTP_SECURE ?? '') === 'true' || Number(env.MAIL_SMTP_PORT ?? 587) === 465,
    user,
    pass,
    from,
  }
}

const SUBJECTS: Record<'signup' | 'reset', string> = {
  signup: 'PPS 2026 — your verification code',
  reset: 'PPS 2026 — your password reset code',
}

function mailHtml(purpose: 'signup' | 'reset', code: string): string {
  const action = purpose === 'signup' ? 'complete your registration' : 'reset your password'
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F6F2;font-family:Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:26px;color:#111111;margin:0 0 4px;">PPS<i style="color:#9A4E2E;font-style:normal;">·</i>26</p>
    <p style="font-size:11px;letter-spacing:.14em;color:#6B6B66;text-transform:uppercase;margin:0 0 28px;">Polymer Processing Symposium 2026</p>
    <div style="border-top:1px solid #111111;padding-top:16px;">
      <p style="font-size:14px;color:#111111;line-height:1.6;margin:0 0 18px;">
        Your verification code to ${action}:
      </p>
      <p style="font-size:34px;letter-spacing:.3em;color:#9A4E2E;font-family:Courier,monospace;margin:0 0 18px;">${code}</p>
      <p style="font-size:13px;color:#6B6B66;line-height:1.7;margin:0;">
        The code is valid for 10 minutes. If you did not request it, you can safely ignore this email.<br><br>
        © 2026 PPS 2026 Organising Committee
      </p>
    </div>
  </div>
</body></html>`
}

export function createSmtpMailer(config: SmtpConfig): Mailer {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  })

  return {
    async sendVerificationCode(email: string, code: string, purpose: 'signup' | 'reset') {
      const message: Mail.Options = {
        from: config.from,
        to: email,
        subject: SUBJECTS[purpose],
        text: `Your PPS 2026 verification code is ${code}. It is valid for 10 minutes.`,
        html: mailHtml(purpose, code),
      }
      await transporter.sendMail(message)
    },
  }
}
