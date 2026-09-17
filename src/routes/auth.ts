import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { verifyPassword, createSession, destroySession, SESSION_COOKIE, dashboardHome } from '../lib/auth'
import { rateLimit, logActivity } from '../lib/utils'
import { Notice } from '../lib/staff_layout'

export const authRoutes = new Hono<AppEnv>()

const LOGIN_HTML = (error?: string, info?: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Login · AWADH Sports Live</title>
<link rel="icon" type="image/png" href="/static/favicon.png" />
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="/static/styles.css" rel="stylesheet"></head>
<body class="text-slate-100 min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
  <div class="absolute inset-0 opacity-40" style="background-image:radial-gradient(circle at 20% 15%, #ff3c00 0, transparent 45%),radial-gradient(circle at 85% 85%, #0088ff 0, transparent 45%)"></div>
  <div class="relative w-full max-w-md">
    <a href="/" class="flex items-center justify-center gap-3 mb-8 text-white font-extrabold text-xl">
      <img src="/static/logo-icon.png" alt="AWADH Sports Live" class="w-11 h-11 rounded-xl object-cover ring-1 ring-white/15" />
      <span class="leading-tight text-left">AWADH<span class="block text-[11px] font-bold tracking-[0.25em] text-red-500">SPORTS LIVE</span></span>
    </a>
    <div class="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">
      <h1 class="text-xl font-bold text-white">Welcome back</h1>
      <p class="text-sm text-slate-400 mt-1">Sign in to manage your bookings and account.</p>
      ${error ? `<div class="mt-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-3 text-sm"><i class="fas fa-circle-exclamation mr-1"></i>${error}</div>` : ''}
      ${info ? `<div class="mt-4 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-200 px-4 py-3 text-sm"><i class="fas fa-circle-info mr-1"></i>${info}</div>` : ''}
      <form method="post" action="/login" class="mt-6 space-y-4">
        <div>
          <label class="block text-sm text-slate-300 mb-1.5">Email</label>
          <input name="email" type="email" required autocomplete="username" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
        </div>
        <div>
          <label class="block text-sm text-slate-300 mb-1.5">Password</label>
          <input name="password" type="password" required autocomplete="current-password" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
        </div>
        <button type="submit" class="btn-primary w-full py-3">Sign In</button>
      </form>
    </div>
    <p class="text-center text-xs text-slate-500 mt-6">
      No account? <a href="/book" class="text-red-400 hover:text-red-300">Book a service</a> ·
      <a href="/track" class="text-red-400 hover:text-red-300">Track a booking</a>
    </p>
  </div>
</body></html>`

authRoutes.get('/login', (c) => {
  const user = c.get('user')
  if (user) return c.redirect(dashboardHome(user.role))
  const err = c.req.query('error')
  const ok = c.req.query('ok')
  const msg = err === 'invalid' ? 'Invalid email or password.' : err === 'rate' ? 'Too many attempts. Try again later.' : undefined
  const info = ok === 'logout' ? 'You have been signed out.' : undefined
  return c.html(LOGIN_HTML(msg, info))
})

authRoutes.post('/login', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  if (!rateLimit(`login:${ip}`, 10, 5 * 60_000)) return c.redirect('/login?error=rate')
  const form = await c.req.parseBody()
  const email = String(form.email || '').trim().toLowerCase()
  const password = String(form.password || '')
  if (!email || !password) return c.redirect('/login?error=invalid')

  const user: any = await c.env.DB.prepare(`SELECT * FROM users WHERE email = ? AND is_active = 1`).bind(email).first()
  if (!user) return c.redirect('/login?error=invalid')
  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) return c.redirect('/login?error=invalid')

  // Every active role may sign in: customers land on their own dashboard,
  // staff land on the operations portal / admin centre.
  const token = await createSession(c.env, user.id)
  await c.env.DB.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'auth.login', ip })
  c.header('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${c.env.ENVIRONMENT === 'production' ? '; Secure' : ''}`)
  return c.redirect(dashboardHome(user.role))
})

authRoutes.post('/logout', async (c) => {
  const cookie = c.req.raw.headers.get('Cookie') || ''
  const m = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  if (m) await destroySession(c.env, decodeURIComponent(m[1]))
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  return c.redirect('/login?ok=logout')
})
