export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  // 独立管理台：独立端口、独立应用，与门户（../ → 3000）完全分离。
  // 通过共享同一个 PostgreSQL 数据库实现管理，不共享任何代码或会话。
  // host 0.0.0.0：允许公网/局域网访问（建议阿里云安全组仅对管理 IP 放行本端口）
  // 端口用专属变量 CONSOLE_PORT 覆盖（默认 3001）——禁止读通用 PORT/NUXT_PORT
  // （Nuxt 原生读它们且优先于本配置，会与门户抢端口）
  devServer: {
    host: '0.0.0.0',
    port: Number(process.env.CONSOLE_PORT ?? 3001),
  },

  vite: {
    server: {
      allowedHosts: true,
    },
  },

  devtools: { enabled: false },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026',
    consoleSessionSecret: process.env.NUXT_CONSOLE_SESSION_SECRET ?? 'dev-only-console-secret-change-me',
    public: {
      /** 门户地址（凭证 QR 预览跳转）——公网部署时改为 http://<公网IP或域名>:<门户端口> */
      portalUrl: process.env.NUXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3000',
    },
  },

  // 缓存策略：SSR HTML 一律 no-store —— 否则浏览器启发式缓存旧 HTML，
  // 重新部署后旧 hash 的 CSS/JS 已被新构建删除 → 404 → 整页无样式（门户同款踩坑）；
  // 带 content hash 的 /_nuxt 静态资源则可以安全长缓存。
  routeRules: {
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/**': { headers: { 'cache-control': 'private, no-store' } },
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
