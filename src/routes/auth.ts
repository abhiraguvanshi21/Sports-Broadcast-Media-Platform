import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { verifyPassword, createSession, destroySession, hashPassword, SESSION_COOKIE, dashboardHome } from '../lib/auth'
import { rateLimit, logActivity } from '../lib/utils'

export const authRoutes = new Hono<AppEnv>()

// Shared shell for the login / sign-up pages
const AUTH_SHELL = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title} · AWADH Sports Live</title>
<link rel="icon" type="image/png" href="/static/favicon.png" />
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<link href="/static/styles.css" rel="stylesheet"></head>
<body class="text-slate-100 min-h-screen flex items-center justify-center p-4 py-10 relative overflow-hidden">
  <div class="absolute inset-0 opacity-40" style="background-image:radial-gradient(circle at 20% 15%, #ff3c00 0, transparent 45%),radial-gradient(circle at 85% 85%, #0088ff 0, transparent 45%)"></div>
  <div class="relative w-full max-w-md">
    <a href="/" class="flex items-center justify-center gap-3 mb-7 text-white font-extrabold text-xl">
      <img src="/static/logo-icon.png" alt="AWADH Sports Live" class="w-11 h-11 rounded-xl object-cover ring-1 ring-white/15" />
      <span class="leading-tight text-left">AWADH<span class="block text-[11px] font-bold tracking-[0.25em] text-red-500">SPORTS LIVE</span></span>
    </a>
    ${body}
  </div>
</body></html>`

const alertBox = (error?: string, info?: string) =>
  (error ? `<div class="mt-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-3 text-sm"><i class="fas fa-circle-exclamation mr-1"></i>${error}</div>` : '') +
  (info ? `<div class="mt-4 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 px-4 py-3 text-sm"><i class="fas fa-circle-check mr-1"></i>${info}</div>` : '')

const ERR: Record<string, string> = {
  invalid: 'Invalid email or password.',
  rate: 'Too many attempts. Try again in a few minutes.',
  missing: 'Please fill in all required fields.',
  email: 'Please enter a valid email address.',
  weak: 'Password must be at least 6 characters.',
  mismatch: 'Passwords do not match.',
  exists: 'An account with this email already exists. Please sign in instead.',
}

// ============================================================
// SIGN IN
// ============================================================
const LOGIN_HTML = (error?: string, info?: string) =>
  AUTH_SHELL(
    'Sign In',
    `
    <div class="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">
      <h1 class="text-xl font-bold text-white">Sign In</h1>
      <p class="text-sm text-slate-400 mt-1">Welcome back — sign in to continue.</p>
      ${alertBox(error, info)}
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
      <p class="text-center text-sm text-slate-400 mt-5">
        New here? <a href="/register" class="text-red-400 hover:text-red-300 font-semibold">Create an account</a>
      </p>
    </div>

    <div class="mt-6 rounded-2xl bg-white/[0.04] border border-white/10 p-5">
      <p class="text-xs text-slate-400 uppercase tracking-widest font-semibold mb-3">Three ways to use AWADH Sports Live</p>
      <div class="space-y-2.5 text-sm">
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 shrink-0 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center"><i class="fas fa-user"></i></span>
          <div><b class="text-slate-200">Customer</b><div class="text-xs text-slate-400">Browse the full website, book services and track your enquiries &amp; quotations.</div></div>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 shrink-0 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center"><i class="fas fa-id-badge"></i></span>
          <div><b class="text-slate-200">Employee</b><div class="text-xs text-slate-400">Mark your attendance, see assigned tasks and your upcoming events.</div></div>
        </div>
        <div class="flex items-start gap-3">
          <span class="w-8 h-8 shrink-0 rounded-lg bg-red-500/20 text-red-300 flex items-center justify-center"><i class="fas fa-user-shield"></i></span>
          <div><b class="text-slate-200">Admin</b><div class="text-xs text-slate-400">Full control — bookings, tasks, attendance, services, live events and website content.</div></div>
        </div>
      </div>
      <p class="text-xs text-slate-500 mt-4">Employee accounts are created by the admin. Customers can sign up below.</p>
    </div>`
  )

authRoutes.get('/login', (c) => {
  const user = c.get('user')
  if (user) return c.redirect(dashboardHome(user.role))
  const err = c.req.query('error')
  const ok = c.req.query('ok')
  const info =
    ok === 'logout' ? 'You have been signed out.' :
    ok === 'registered' ? 'Account created! Please sign in.' : undefined
  return c.html(LOGIN_HTML(ERR[err || ''] || (err ? 'Something went wrong. Please try again.' : undefined), info))
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

  // Every active role may sign in and lands on their own workspace:
  //  customer -> /account (their bookings + full public website)
  //  employee / manager -> /portal (attendance, tasks, events)
  //  admin -> /admin (full control centre)
  const token = await createSession(c.env, user.id)
  await c.env.DB.prepare(`UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(user.id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'auth.login', ip })
  c.header('Set-Cookie', `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${c.env.ENVIRONMENT === 'production' ? '; Secure' : ''}`)
  return c.redirect(dashboardHome(user.role))
})

// ============================================================
// SIGN UP — customers create their own account (data saved, then sign in)
// ============================================================
const REGISTER_HTML = (error?: string) =>
  AUTH_SHELL(
    'Create Account',
    `
    <div class="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur">
      <h1 class="text-xl font-bold text-white">Create your account</h1>
      <p class="text-sm text-slate-400 mt-1">Sign up as a customer to manage your bookings — or just book without an account.</p>
      ${alertBox(error)}
      <form method="post" action="/register" class="mt-6 space-y-4">
        <div>
          <label class="block text-sm text-slate-300 mb-1.5">Full name *</label>
          <input name="full_name" required autocomplete="name" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-slate-300 mb-1.5">Email *</label>
            <input name="email" type="email" required autocomplete="email" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1.5">Phone</label>
            <input name="phone" autocomplete="tel" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-slate-300 mb-1.5">Password *</label>
            <input name="password" type="password" required autocomplete="new-password" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
          </div>
          <div>
            <label class="block text-sm text-slate-300 mb-1.5">Confirm password *</label>
            <input name="confirm_password" type="password" required autocomplete="new-password" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-slate-300 mb-1.5">Organization / Club / League</label>
          <input name="organization" class="w-full rounded-xl bg-slate-900/80 border border-white/15 px-3.5 py-2.5 text-white focus:outline-none focus:border-red-500" />
        </div>
        <button type="submit" class="btn-primary w-full py-3">Create Account</button>
      </form>
      <p class="text-center text-sm text-slate-400 mt-5">
        Already have an account? <a href="/login" class="text-red-400 hover:text-red-300 font-semibold">Sign In</a>
      </p>
    </div>`
  )

authRoutes.get('/register', (c) => {
  const user = c.get('user')
  if (user) return c.redirect(dashboardHome(user.role))
  const err = c.req.query('error')
  return c.html(REGISTER_HTML(ERR[err || ''] || (err ? 'Something went wrong. Please try again.' : undefined)))
})

authRoutes.post('/register', async (c) => {
  const ip = c.req.header('cf-connecting-ip') || 'unknown'
  if (!rateLimit(`register:${ip}`, 8, 10 * 60_000)) return c.redirect('/register?error=rate')

  const f = await c.req.parseBody()
  const name = String(f.full_name || '').trim()
  const email = String(f.email || '').trim().toLowerCase()
  const phone = String(f.phone || '').trim()
  const password = String(f.password || '')
  const confirm = String(f.confirm_password || '')
  const org = String(f.organization || '').trim()

  if (!name || !email || !password) return c.redirect('/register?error=missing')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return c.redirect('/register?error=email')
  if (password.length < 6) return c.redirect('/register?error=weak')
  if (password !== confirm) return c.redirect('/register?error=mismatch')

  const db = c.env.DB
  const exists: any = await db.prepare(`SELECT id FROM users WHERE email = ?`).bind(email).first()
  if (exists) return c.redirect('/register?error=exists')

  const hash = await hashPassword(password)
  const res = await db.prepare(`INSERT INTO users (email, password_hash, role, full_name, phone) VALUES (?,?, 'customer', ?, ?)`)
    .bind(email, hash, name, phone || null).run()
  const uid = Number(res.meta.last_row_id)

  // Link to an existing customer record (same email/phone) or create one
  let cust: any = null
  if (phone) cust = await db.prepare(`SELECT id FROM customers WHERE email = ? OR phone = ? ORDER BY id LIMIT 1`).bind(email, phone).first()
  if (!cust) cust = await db.prepare(`SELECT id FROM customers WHERE email = ? ORDER BY id LIMIT 1`).bind(email).first()
  if (cust) {
    await db.prepare(`UPDATE customers SET user_id=?, name=?, email=?, phone=COALESCE(NULLIF(?, ''), phone), organization=COALESCE(NULLIF(?, ''), organization) WHERE id=?`)
      .bind(uid, name, email, phone, org, cust.id).run()
  } else {
    await db.prepare(`INSERT INTO customers (user_id, name, email, phone, organization) VALUES (?,?,?,?,?)`)
      .bind(uid, name, email, phone || '—', org || null).run()
  }

  await logActivity(db, { userId: uid, actor: name, action: 'auth.register', entity: 'users', entityId: uid, details: email, ip })
  await db.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES ('New customer sign-up', ?, '/admin/customers', 'admins')`)
    .bind(`${name} (${email})`).run()

  return c.redirect('/login?ok=registered')
})

authRoutes.post('/logout', async (c) => {
  const cookie = c.req.raw.headers.get('Cookie') || ''
  const m = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))
  if (m) await destroySession(c.env, decodeURIComponent(m[1]))
  c.header('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`)
  return c.redirect('/login?ok=logout')
})
