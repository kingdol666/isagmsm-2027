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
  devServer: {
    host: '0.0.0.0',
    port: 3000,
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

  routeRules: {
    '/': { swr: 60 },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'color-scheme', content: 'light' },
      ],
    },
  },
})
