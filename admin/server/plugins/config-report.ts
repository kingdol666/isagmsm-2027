/**
 * 启动配置报告：让运维一眼看清管理台的关键配置状态。
 */
export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  const mailLive = Boolean(process.env.MAIL_SMTP_HOST && process.env.MAIL_SMTP_USER && process.env.MAIL_SMTP_PASS && process.env.MAIL_FROM)
  const lines = [
    '── ISAGMSM 2027 管理台 ───────────────────────────────────────',
    `  database : ${config.databaseUrl ? 'configured' : 'MISSING — set DATABASE_URL'}`,
    `  session  : ${process.env.NUXT_CONSOLE_SESSION_SECRET ? 'custom secret' : 'dev default — set NUXT_CONSOLE_SESSION_SECRET before deployment'}`,
    `  mail     : ${process.env.MAIL_DRIVER === 'test' ? 'test driver (logged, not sent)' : mailLive ? 'SMTP live' : 'dev mode — decisions are logged only'}`,
    '  scope    : members/credentials/payments/abstracts — portal (3000) has no admin surface',
    '──────────────────────────────────────────────────────────────',
  ]
  for (const line of lines) console.warn(line)
})
