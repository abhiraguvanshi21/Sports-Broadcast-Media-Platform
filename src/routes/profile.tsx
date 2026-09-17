import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { PublicLayout, PageHero } from '../lib/public_layout'
import { StaffLayout } from '../lib/staff_layout'
import { Card, Chip, inputCls, btnPrimary, btnGhost } from '../lib/components'
import { verifyPassword, hashPassword, type Role } from '../lib/auth'
import { esc, logActivity } from '../lib/utils'

export const profileRoutes = new Hono<AppEnv>()

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Production Manager',
  employee: 'Employee',
  customer: 'Customer',
}

// Guard: any signed-in user
profileRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (!user) return c.redirect('/login')
  await next()
})

type ProfData = {
  full_name: string
  email: string
  phone: string
  organization: string
  address: string
  employee_code: string
  designation: string
  department: string
  joined: string
  last_login: string
}

async function loadProfile(c: any, user: any): Promise<ProfData> {
  const db = c.env.DB
  const base: ProfData = {
    full_name: user.full_name,
    email: user.email,
    phone: '',
    organization: '',
    address: '',
    employee_code: '',
    designation: '',
    department: '',
    joined: '',
    last_login: '',
  }
  const u: any = await db.prepare(`SELECT phone, created_at, last_login_at FROM users WHERE id=?`).bind(user.id).first()
  if (u) {
    base.phone = u.phone || ''
    base.joined = u.created_at || ''
    base.last_login = u.last_login_at || ''
  }
  if (user.role === 'customer') {
    const me: any = await db.prepare(`SELECT * FROM customers WHERE user_id=? OR email=? ORDER BY id LIMIT 1`).bind(user.id, user.email).first()
    if (me) {
      base.organization = me.organization || ''
      base.address = me.address || ''
      base.phone = me.phone || base.phone
      base.full_name = me.name || base.full_name
    }
  } else {
    const emp: any = await db.prepare(`SELECT * FROM employees WHERE user_id=? ORDER BY id LIMIT 1`).bind(user.id).first()
    if (emp) {
      base.employee_code = emp.emp_code || ''
      base.designation = emp.designation || ''
      base.department = emp.department || ''
      base.joined = emp.joining_date || base.joined
    }
  }
  return base
}

function ProfileForm({ p, role, saved, pwError, pwOk }: { p: ProfData; role: Role; saved?: boolean; pwError?: string; pwOk?: boolean }) {
  const isCustomer = role === 'customer'
  return (
    <>
      {saved && <div class="mb-5 msg-success rounded-xl px-4 py-3 text-sm"><i class="fas fa-circle-check mr-1"></i>Profile updated.</div>}
      {pwOk && <div class="mb-5 msg-success rounded-xl px-4 py-3 text-sm"><i class="fas fa-circle-check mr-1"></i>Password changed.</div>}
      {pwError && <div class="mb-5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 px-4 py-3 text-sm"><i class="fas fa-circle-exclamation mr-1"></i>{pwError}</div>}

      <div class="grid gap-6 lg:grid-cols-3">
        {/* identity card */}
        <div class="lg:col-span-1">
          <div class="rounded-2xl bg-white/[0.06] border border-white/10 p-6 text-center">
            <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center text-3xl font-black">
              {esc(p.full_name.charAt(0).toUpperCase() || 'U')}
            </div>
            <h2 class="text-white font-bold text-lg mt-4">{esc(p.full_name)}</h2>
            <p class="text-sm text-slate-400 break-all">{esc(p.email)}</p>
            <div class="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-slate-200 text-xs font-semibold uppercase tracking-wide">
              <i class="fas fa-id-badge"></i> {ROLE_LABEL[role] || role}
            </div>
            <div class="mt-5 space-y-2 text-left text-sm text-slate-400">
              {p.employee_code && <div><i class="fas fa-hashtag w-4 text-slate-500"></i> {esc(p.employee_code)}</div>}
              {p.designation && <div><i class="fas fa-briefcase w-4 text-slate-500"></i> {esc(p.designation)}</div>}
              {p.department && <div><i class="fas fa-sitemap w-4 text-slate-500"></i> {esc(p.department)}</div>}
              {p.last_login && <div><i class="fas fa-clock w-4 text-slate-500"></i> Last login: {esc(p.last_login)}</div>}
            </div>
            <div class="mt-5 flex flex-wrap gap-2 justify-center">
              {isCustomer && <a href="/account" class="px-4 py-2 rounded-xl border border-white/15 text-slate-200 text-sm hover:bg-white/5">My Bookings</a>}
              {role === 'admin' && <a href="/admin" class="px-4 py-2 rounded-xl border border-white/15 text-slate-200 text-sm hover:bg-white/5">Admin Panel</a>}
              {(role === 'employee' || role === 'manager') && <a href="/portal" class="px-4 py-2 rounded-xl border border-white/15 text-slate-200 text-sm hover:bg-white/5">My Workspace</a>}
            </div>
          </div>
        </div>

        {/* editable details */}
        <div class="lg:col-span-2 space-y-6">
          <div class="rounded-2xl bg-white/[0.06] border border-white/10 p-6">
            <h2 class="text-white font-bold text-lg mb-4">My details</h2>
            <form method="post" action="/profile" class="grid sm:grid-cols-2 gap-4">
              <label class="text-sm text-slate-300">Full name
                <input name="full_name" required value={esc(p.full_name)} class="form-dark mt-1.5" />
              </label>
              <label class="text-sm text-slate-300">Phone
                <input name="phone" value={esc(p.phone)} class="form-dark mt-1.5" />
              </label>
              <label class="text-sm text-slate-300">Email
                <input name="email" type="email" readonly value={esc(p.email)} class="form-dark mt-1.5 opacity-60 cursor-not-allowed" />
              </label>
              <label class="text-sm text-slate-300">{isCustomer ? 'Organization / Club' : 'Department'}
                <input name="organization" value={esc(isCustomer ? p.organization : p.department)} class="form-dark mt-1.5" disabled={!isCustomer} />
              </label>
              {isCustomer && (
                <label class="text-sm text-slate-300 sm:col-span-2">Address
                  <textarea name="address" rows={2} class="form-dark mt-1.5">{esc(p.address)}</textarea>
                </label>
              )}
              <button class={btnPrimary + ' sm:col-span-2 py-3'}>Save changes</button>
            </form>
            <p class="text-xs text-slate-500 mt-3"><i class="fas fa-lock mr-1"></i>Your email is your login ID and cannot be changed here.</p>
          </div>

          <div class="rounded-2xl bg-white/[0.06] border border-white/10 p-6">
            <h2 class="text-white font-bold text-lg mb-4">Change password</h2>
            <form method="post" action="/profile/password" class="grid sm:grid-cols-3 gap-4">
              <label class="text-sm text-slate-300">Current password
                <input name="current" type="password" required class="form-dark mt-1.5" />
              </label>
              <label class="text-sm text-slate-300">New password
                <input name="password" type="password" required class="form-dark mt-1.5" />
              </label>
              <label class="text-sm text-slate-300">Confirm new
                <input name="confirm" type="password" required class="form-dark mt-1.5" />
              </label>
              <button class={btnGhost + ' sm:col-span-3 !text-slate-100 !border-white/20 hover:!bg-white/5'}>Update password</button>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}

// ---------- VIEW PROFILE (all roles) ----------
profileRoutes.get('/', async (c) => {
  const user = c.get('user')!
  const p = await loadProfile(c, user)
  const saved = c.req.query('saved') === '1'
  const pwOk = c.req.query('pw') === '1'
  const pwError = c.req.query('pwerr') ? decodeURIComponent(c.req.query('pwerr')!) : undefined

  if (user.role === 'customer') {
    return c.html(
      <PublicLayout current="/profile" title="My Profile">
        <PageHero eyebrow="My account" title="My Profile" subtitle="Your account details — used for bookings, quotations and updates." />
        <section class="max-w-6xl mx-auto px-4 sm:px-6 py-12">
          <ProfileForm p={p} role={user.role} saved={saved} pwError={pwError} pwOk={pwOk} />
        </section>
      </PublicLayout>
    )
  }
  return c.html(
    <StaffLayout user={user} nav={user.role === 'admin' ? 'admin' : 'portal'} current="/profile" title="My Profile">
      <ProfileForm p={p} role={user.role} saved={saved} pwError={pwError} pwOk={pwOk} />
    </StaffLayout>
  )
})

// ---------- SAVE DETAILS ----------
profileRoutes.post('/', async (c) => {
  const user = c.get('user')!
  const db = c.env.DB
  const f = await c.req.parseBody()
  const name = String(f.full_name || user.full_name).trim()
  const phone = String(f.phone || '').trim()
  const org = String(f.organization || '').trim()
  const address = String(f.address || '').trim()

  await db.prepare(`UPDATE users SET full_name=?, phone=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(name, phone || null, user.id).run()

  if (user.role === 'customer') {
    const me: any = await db.prepare(`SELECT id FROM customers WHERE user_id=? OR email=? ORDER BY id LIMIT 1`).bind(user.id, user.email).first()
    if (me) {
      await db.prepare(`UPDATE customers SET name=?, phone=COALESCE(NULLIF(?,''), phone), organization=COALESCE(NULLIF(?,''), organization), address=COALESCE(NULLIF(?,''), address) WHERE id=?`)
        .bind(name, phone, org, address, me.id).run()
    } else {
      await db.prepare(`INSERT INTO customers (user_id, name, email, phone, organization, address) VALUES (?,?,?,?,?,?)`)
        .bind(user.id, name, user.email, phone || '—', org || null, address || null).run()
    }
  }
  await logActivity(db, { userId: user.id, actor: name, action: 'profile.update', entity: 'users', entityId: user.id })
  return c.redirect('/profile?saved=1')
})

// ---------- CHANGE PASSWORD ----------
profileRoutes.post('/password', async (c) => {
  const user = c.get('user')!
  const db = c.env.DB
  const f = await c.req.parseBody()
  const current = String(f.current || '')
  const pw = String(f.password || '')
  const confirm = String(f.confirm || '')

  const u: any = await db.prepare(`SELECT password_hash FROM users WHERE id=?`).bind(user.id).first()
  const ok = u ? await verifyPassword(current, u.password_hash) : false

  if (!ok) return c.redirect('/profile?pwerr=' + encodeURIComponent('Current password is incorrect.'))
  if (pw.length < 6) return c.redirect('/profile?pwerr=' + encodeURIComponent('New password must be at least 6 characters.'))
  if (pw !== confirm) return c.redirect('/profile?pwerr=' + encodeURIComponent('New passwords do not match.'))

  await db.prepare(`UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(await hashPassword(pw), user.id).run()
  await logActivity(db, { userId: user.id, actor: user.full_name, action: 'profile.password', entity: 'users', entityId: user.id })
  return c.redirect('/profile?pw=1')
})
