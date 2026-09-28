import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'
import type { AbstractDecisionMail, Mailer } from './mail.types'

export interface SmtpConfig {
  host: string
  port: number
  secure: boolean // true for 465, false for 587/25
  user: string
  pass: string
  from: string // e.g. "ISAGMSM 会议 <no-reply@isagmsm.org>"
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
  signup: 'ISAGMSM 2027 — 邮箱验证码',
  reset: 'ISAGMSM 2027 — 重置密码验证码',
}

function mailHtml(purpose: 'signup' | 'reset', code: string): string {
  const action = purpose === 'signup' ? '完成注册' : '重置密码'
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F6F2;font-family:'PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:26px;color:#111111;margin:0 0 4px;">ISAGMSM<i style="color:#9A4E2E;font-style:normal;">·</i>27</p>
    <p style="font-size:11px;letter-spacing:.14em;color:#6B6B66;margin:0 0 28px;">第五届先进凝胶材料与软物质国际学术研讨会 · 2027年4月24—26日 · 合肥</p>
    <div style="border-top:1px solid #111111;padding-top:16px;">
      <p style="font-size:14px;color:#111111;line-height:1.6;margin:0 0 18px;">
        您用于${action}的验证码：
      </p>
      <p style="font-size:34px;letter-spacing:.3em;color:#9A4E2E;font-family:Courier,monospace;margin:0 0 18px;">${code}</p>
      <p style="font-size:13px;color:#6B6B66;line-height:1.7;margin:0;">
        验证码 10 分钟内有效。如非本人操作，请忽略本邮件。<br><br>
        © 2027 ISAGMSM 组织委员会
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
        text: `您的 ISAGMSM 2027 验证码是 ${code}，10 分钟内有效。`,
        html: mailHtml(purpose, code),
      }
      await transporter.sendMail(message)
    },

    async sendAbstractDecision(mail: AbstractDecisionMail) {
      const accepted = mail.action === 'accepted'
      const message: Mail.Options = {
        from: config.from,
        to: mail.email,
        subject: accepted ? 'ISAGMSM 2027 — 稿件已接收' : 'ISAGMSM 2027 — 稿件返稿意见',
        text: accepted
          ? `您好 ${mail.displayName}，您的稿件《${mail.title}》（第 ${mail.version} 版）已被接收。审稿意见：${mail.comment || '无'}`
          : `您好 ${mail.displayName}，您的稿件《${mail.title}》（第 ${mail.version} 版）需要修改后重新提交。返稿意见：${mail.comment}`,
        html: decisionMailHtml(mail),
      }
      await transporter.sendMail(message)
    },
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function decisionMailHtml(mail: AbstractDecisionMail): string {
  const accepted = mail.action === 'accepted'
  const verdict = accepted ? '已接收' : '需修改后重新提交'
  const color = accepted ? '#2F6B3A' : '#9A4E2E'
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7F6F2;font-family:'PingFang SC','Microsoft YaHei',Helvetica,Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 24px;">
    <p style="font-size:26px;color:#111111;margin:0 0 4px;">ISAGMSM<i style="color:#9A4E2E;font-style:normal;">·</i>27</p>
    <p style="font-size:11px;letter-spacing:.14em;color:#6B6B66;margin:0 0 28px;">第五届先进凝胶材料与软物质国际学术研讨会 · 征文审稿通知</p>
    <div style="border-top:1px solid #111111;padding-top:16px;">
      <p style="font-size:14px;color:#111111;line-height:1.6;margin:0 0 14px;">
        您好，${escapeHtml(mail.displayName)}：
      </p>
      <p style="font-size:14px;color:#111111;line-height:1.7;margin:0 0 14px;">
        您投递的稿件（第 ${mail.version} 版）<br>
        <strong style="font-size:15px;">《${escapeHtml(mail.title)}》</strong><br>
        审稿结果：<strong style="color:${color};">${verdict}</strong>
      </p>
      <div style="border:1px solid #111111;background:#FFFFFF;padding:14px 16px;margin:0 0 18px;">
        <p style="font-size:11px;letter-spacing:.14em;color:#6B6B66;margin:0 0 8px;">${accepted ? '审稿意见' : '返稿意见'}</p>
        <p style="font-size:13.5px;color:#111111;line-height:1.7;margin:0;white-space:pre-wrap;">${escapeHtml(mail.comment) || '（无）'}</p>
      </div>
      ${accepted
        ? '<p style="font-size:13px;color:#6B6B66;line-height:1.7;margin:0 0 18px;">稿件已被接收，请按会议安排准备报告。后续事项请留意会议通知。</p>'
        : '<p style="font-size:13px;color:#6B6B66;line-height:1.7;margin:0 0 18px;">请登录会议网站，在「我的投稿」中根据返稿意见修改后重新提交。</p>'}
      <p style="font-size:13px;color:#6B6B66;line-height:1.7;margin:0;">
        如有疑问请联系会务组。<br><br>
        © 2027 ISAGMSM 组织委员会
      </p>
    </div>
  </div>
</body></html>`
}
