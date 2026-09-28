/** Static sitemap over the public, indexable pages. */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const base = config.public.siteUrl.replace(/\/$/, '')
  const pages = [
    { loc: '/', priority: '1.0' },
    { loc: '/register', priority: '0.9' },
    { loc: '/login', priority: '0.3' },
    { loc: '/sign-up', priority: '0.5' },
  ]
  const urls = pages.map(p =>
    `<url><loc>${base}${p.loc}</loc><lastmod>2026-09-28</lastmod><priority>${p.priority}</priority></url>`,
  ).join('')

  setHeader(event, 'content-type', 'application/xml')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
})
