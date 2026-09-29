export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  // 独立管理台：独立端口、独立应用，与门户（../ → 3000）完全分离。
  // 通过共享同一个 PostgreSQL 数据库实现管理，不共享任何代码或会话。
  devServer: { port: 3001 },

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026',
    consoleSessionSecret: process.env.NUXT_CONSOLE_SESSION_SECRET ?? 'dev-only-console-secret-change-me',
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: 'ISAGMSM 2027 · 管理台',
      meta: [
        { name: 'color-scheme', content: 'light' },
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    },
  },
})
