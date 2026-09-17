import { Hono } from 'hono'
import type { AppEnv } from './lib/types'
import { getSessionUser, SESSION_COOKIE } from './lib/auth'
import { publicRoutes } from './routes/public'
import { bookingRoutes } from './routes/booking'
import { authRoutes } from './routes/auth'
import { portalRoutes } from './routes/portal'
import { adminRoutes } from './routes/admin'
import { accountRoutes } from './routes/account'
import { apiRoutes } from './routes/api'

const app = new Hono<AppEnv>()

// Resolve session user for every request
app.use('*', async (c, next) => {
  const token = getCookie(c.req.raw.headers.get('Cookie'), SESSION_COOKIE)
  let user = null
  try {
    user = await getSessionUser(c.env, token)
  } catch {
    user = null
  }
  c.set('user', user)
  await next()
})

// Static assets
app.use('/static/*', async (c) => {
  return c.env.ASSETS.fetch(c.req.raw)
})

// Feature routes
app.route('/', publicRoutes)
app.route('/', bookingRoutes)
app.route('/', authRoutes)
app.route('/account', accountRoutes)
app.route('/portal', portalRoutes)
app.route('/admin', adminRoutes)
app.route('/api', apiRoutes)

// 404
app.notFound((c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Not found' }, 404)
  return c.html(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found · AWADH Sports Live</title><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="text-7xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">404</div>
        <p class="text-slate-400 mt-2">This page could not be found.</p>
        <a href="/" class="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold">Back to Home</a>
      </div>
    </body></html>`,
    404
  )
})

app.onError((err, c) => {
  console.error('Unhandled error:', err)
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Internal error' }, 500)
  return c.html(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Error · AWADH Sports Live</title><script src="https://cdn.tailwindcss.com"></script></head>
    <body class="bg-slate-950 text-slate-100 flex items-center justify-center min-h-screen"><div class="text-center">
      <div class="text-5xl font-black text-red-500">500</div><p class="text-slate-400 mt-2">Something went wrong.</p>
      <a href="/" class="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-white text-slate-900 font-semibold">Back to Home</a>
    </div></body></html>`,
    500
  )
})

function getCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return undefined
}

export default app
