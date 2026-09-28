export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  modules: ['@nuxt/ui', '@nuxt/eslint'],

  components: [
    { path: '~/components', pathPrefix: false },
  ],

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
