import nodemailer from 'nodemailer'
import type Mail from 'nodemailer/lib/mailer'

/**
 * 管理台邮件服务 —— 只负责一件事：审稿结果通知（接收 / 返稿，含意见）。
 * MAIL_SMTP_* 配置齐全时真实发信；否则开发模式写入日志（自动化测试依赖此模式）。
 */

export interface AbstractDecisionMail {
  email: string
  displayName: string
  title: string
  action: 'accepted' | 'returned'
  comment: string
  version: number
}

export interface ConsoleMailer {
  sendAbstractDecision(mail: AbstractDecisionMail): Promise<void>
}

export function getConsoleMailer(env: Record<string, string | undefined>): ConsoleMailer {
  const host = env.MAIL_SMTP_HOST
  const user = env.MAIL_SMTP_USER
  const pass = env.MAIL_SMTP_PASS
  const from = env.MAIL_FROM
  if (env.MAIL_DRIVER === 'test' || !host || !user || !pass || !from) {
    return {
      async sendAbstractDecision(mail: AbstractDecisionMail) {
        console.warn(`[console-mail:dev] abstract "${mail.title}" ${mail.action} for ${mail.email}: ${mail.comment}`)
      },
    }
  }

  const port = Number(env.MAIL_SMTP_PORT ?? 587)
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: (env.MAIL_SMTP_SECURE ?? '') === 'true' || port === 465,
    auth: { user, pass },
  })

  return {
    async sendAbstractDecision(mail: AbstractDecisionMail) {
      const accepted = mail.action === 'accepted'
      const message: Mail.Options = {
        from,
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
