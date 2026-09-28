export default defineNuxtConfig({
  compatibilityDate: '2026-09-01',

  modules: ['@nuxt/ui', '@nuxt/fonts', '@nuxt/eslint'],

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

  fonts: {
    families: [
      { name: 'Instrument Serif', provider: 'google', weights: [400], styles: ['normal', 'italic'] },
      { name: 'Inter', provider: 'google', weights: [400, 500, 600] },
      { name: 'IBM Plex Mono', provider: 'google', weights: [400, 500] },
    ],
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
