// ============================================================
// VITE CONFIG — build ka setting
// Kaam: code ko Cloudflare Pages ke liye "dist/" me build karna
// (Hono ka cloudflare-pages plugin use hota hai).
// ============================================================
import build from '@hono/vite-build/cloudflare-pages'
import devServer from '@hono/vite-dev-server'
import adapter from '@hono/vite-dev-server/cloudflare'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [
    build(),
    devServer({
      adapter,
      entry: 'src/index.tsx'
    })
  ]
})
