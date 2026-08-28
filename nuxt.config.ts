export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  srcDir: 'src/',
  devtools: { enabled: true },
  ssr: false,
  modules: ['@pinia/nuxt'],
  components: [
    {
      path: '~/shared/ui',
      prefix: 'Ui',
      pathPrefix: false,
    },
    {
      path: '~/shared/ui/icons',
      pathPrefix: false,
    },
    {
      path: '~/features',
      pathPrefix: false,
    },
    {
      path: '~/entities',
      pathPrefix: false,
    },
  ],
  css: ['~/shared/styles/main.scss'],
  typescript: {
    strict: true,
  },
})