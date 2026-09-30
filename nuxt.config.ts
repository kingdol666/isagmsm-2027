export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  modules: ['@nuxt/ui', '@nuxt/eslint'],

  // 字体全部本地自托管（@fontsource）—— 关闭 @nuxt/ui 内嵌的字体/图标
  // 在线提供方（google / googleicons），启动时不再请求 fonts.google.com
  ui: {
    fonts: false,
  },

  icon: {
    serverBundle: {
      collections: [],
    },
    clientBundle: {
      scan: true,
    },
  },

  components: [
    { path: '~/components', pathPrefix: false },
  ],

  // 公网/局域网可访问：绑定所有网卡；放行任意 Host（阿里云用 IP 或域名访问）
  // 端口用专属变量 PORTAL_PORT 覆盖（默认 3000）——禁止用通用 PORT/NUXT_PORT：
  // Nuxt 原生读 PORT/NUXT_PORT 且优先于本配置，会与同机部署的管理台互相抢占端口
  devServer: {
    host: '0.0.0.0',
    port: Number(process.env.PORTAL_PORT ?? 3000),
  },

  vite: {
    server: {
      allowedHosts: true,
    },
  },

  css: ['~/assets/css/main.css'],

  devtools: { enabled: false },

  runtimeConfig: {
    databaseUrl: 'postgresql://pps:pps_dev_pw@localhost:5433/pps2026',
    sessionSecret: 'dev-only-session-secret-change-me',
    mockPaymentSecret: 'dev-only-mock-secret',
    public: {
      siteUrl: 'http://localhost:3000',
    },
  },

  // 注意：不要对页面路由启用 swr/isr 缓存 —— 站点语言随 pps_locale cookie 变化，
  // 页面级缓存会把某一种语言的 HTML 串给所有用户（曾导致首页 cookie 语言失效）。

  // 缓存策略：SSR HTML 一律 no-store —— 否则浏览器启发式缓存旧 HTML，
  // 重新部署后旧 hash 的 CSS/JS 已被新构建删除 → 404 → 整页无样式（生产实测踩坑）；
  // 带 content hash 的 /_nuxt 静态资源则可以安全长缓存。
  routeRules: {
    '/_nuxt/**': { headers: { 'cache-control': 'public, max-age=31536000, immutable' } },
    '/**': { headers: { 'cache-control': 'private, no-store' } },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'color-scheme', content: 'light' },
      ],
    },
  },
})
