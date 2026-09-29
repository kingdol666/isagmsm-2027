// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  // Custom server-only globals used by Nitro event handlers
  {
    files: ['server/**/*.ts', 'admin/server/**/*.ts'],
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  // The standalone admin console is its own Nuxt app — same page-naming relaxations
  {
    files: ['admin/app/pages/**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
    },
  },
)
