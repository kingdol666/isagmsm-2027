import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * 样式内联保险：把 SSR HTML 里的 <link rel=stylesheet>（/_nuxt/*.css）整体内联为 <style>。
 * 样式随 HTML 一起到达，任何"代理未透传 /_nuxt、缓存/CDN 丢资源、MIME 异常"场景
 * 都不可能再出现整页无样式（生产环境实测踩坑后的兜底）。
 * 字体 url(./x.woff2) 同步重写为 /_nuxt/ 绝对路径；读文件失败保留原 link 优雅回退。
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html: { head: string[] }) => {
    if (process.env.NODE_ENV !== 'production') return
    const cssByUrl = new Map<string, string | null>()
    html.head = html.head.map((chunk) => {
      const links = [...chunk.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/_nuxt\/[^"]+\.css)"[^>]*>/g)]
      if (!links.length) return chunk
      let out = chunk
      for (const tag of links) {
        const href = tag[1]!
        if (!cssByUrl.has(href)) {
          try {
            const file = join(process.cwd(), '.output', 'public', href)
            const css = readFileSync(file, 'utf8').replace(/url\(\.\//g, 'url(/_nuxt/')
            cssByUrl.set(href, css)
          }
          catch {
            cssByUrl.set(href, null) // 读失败 → 保留外部 link
          }
        }
        const inline = cssByUrl.get(href)
        if (inline) {
          out = out.replace(tag[0], `<style data-inlined-css="${href}">${inline}</style>`)
        }
      }
      return out
    })
  })
})
