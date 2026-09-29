// ============================================================
// PROFILE PAGE — har user ki apni profile (/profile)
// Kaam: naam, phone, email dikhana; details edit karna aur
// password badalna. Customer ko dark theme, staff ko light theme.
// ============================================================
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
  const initials = (p.full_name || 'U').trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || 'U'
  const parts = [p.full_name, p.email, p.phone, isCustomer ? p.organization : p.department, p.designation, p.employee_code]
  const strength = Math.max(20, Math.round((parts.filter((x) => String(x || '').trim()).length / parts.length) * 100))
  return (
    <>
      {saved && <div class="pf-alert pf-alert--ok reveal mb-5"><i class="fas fa-circle-check"></i> Profile updated successfully.</div>}
      {pwOk && <div class="pf-alert pf-alert--ok reveal mb-5"><i class="fas fa-shield-halved"></i> Password changed successfully.</div>}
      {pwError && <div class="pf-alert pf-alert--err reveal mb-5"><i class="fas fa-circle-exclamation"></i> {pwError}</div>}

      <div class="grid gap-6 lg:grid-cols-3 items-start">
        {/* identity card */}
        <div class="lg:col-span-1 reveal reveal--left">
          <div class="pf-id grad-border grad-border--on tilt spot">
            <span class="pf-id__glow" aria-hidden="true"></span>
            <div class="pf-avatar-wrap">
              <span class="pf-avatar-ring" aria-hidden="true"></span>
              <div class="pf-avatar">{esc(initials)}</div>
              <span class="pf-id__online" title="Signed in"></span>
            </div>
            <h2 class="pf-id__name">{esc(p.full_name)}</h2>
            <p class="pf-id__email">{esc(p.email)}</p>
            <span class="pf-role"><i class="fas fa-id-badge"></i> {ROLE_LABEL[role] || role}</span>

            <div class="pf-strength">
              <div class="pf-strength__top">
                <span><i class="fas fa-chart-simple mr-1"></i>Profile strength</span>
                <span>{strength}%</span>
              </div>
              <div class="pf-strength__bar"><span style={`width:${strength}%`}></span></div>
            </div>

            <div class="pf-meta stagger">
              {p.employee_code && <div class="pf-meta__row"><i class="fas fa-hashtag"></i> {esc(p.employee_code)}</div>}
              {p.designation && <div class="pf-meta__row"><i class="fas fa-briefcase"></i> {esc(p.designation)}</div>}
              {p.department && <div class="pf-meta__row"><i class="fas fa-sitemap"></i> {esc(p.department)}</div>}
              {p.joined && <div class="pf-meta__row"><i class="fas fa-calendar-check"></i> Joined {esc(String(p.joined).slice(0, 10))}</div>}
              {p.last_login && <div class="pf-meta__row"><i class="fas fa-clock"></i> Last login {esc(String(p.last_login).slice(0, 16))}</div>}
              {!p.employee_code && !p.designation && !p.department && !p.joined && !p.last_login && (
                <div class="pf-meta__row"><i class="fas fa-circle-info"></i> Add your details to complete your profile.</div>
              )}
            </div>

            <div class="pf-id__actions">
              {isCustomer && <a href="/account" class="pf-link"><i class="fas fa-calendar-check"></i> My Bookings</a>}
              {role === 'admin' && <a href="/admin" class="pf-link"><i class="fas fa-gauge-high"></i> Admin Panel</a>}
              {(role === 'employee' || role === 'manager') && <a href="/portal" class="pf-link"><i class="fas fa-briefcase"></i> My Workspace</a>}
              <a href="/" class="pf-link"><i class="fas fa-globe"></i> Website</a>
            </div>
          </div>
        </div>

        {/* editable details */}
        <div class="lg:col-span-2 space-y-6">
          <div class="pf-panel reveal">
            <div class="pf-panel__head">
              <span class="pf-panel__ico"><i class="fas fa-user-pen"></i></span>
              <div>
                <div class="pf-panel__title">My details</div>
                <div class="pf-panel__sub">Keep your contact information up to date.</div>
              </div>
            </div>
            <form method="post" action="/profile" class="grid sm:grid-cols-2 gap-4">
              <label class="pf-label"><span class="pf-label__txt">Full name</span>
                <input name="full_name" required value={esc(p.full_name)} class="form-dark" />
              </label>
              <label class="pf-label"><span class="pf-label__txt">Phone</span>
                <input name="phone" value={esc(p.phone)} class="form-dark" />
              </label>
              <label class="pf-label"><span class="pf-label__txt">Email <i class="fas fa-lock text-[0.7em] opacity-70"></i></span>
                <input name="email" type="email" readonly value={esc(p.email)} class="form-dark pf-readonly" />
              </label>
              <label class="pf-label"><span class="pf-label__txt">{isCustomer ? 'Organization / Club' : 'Department'}</span>
                <input name="organization" value={esc(isCustomer ? p.organization : p.department)} class="form-dark pf-readonly" disabled={!isCustomer} />
              </label>
              {isCustomer && (
                <label class="pf-label sm:col-span-2"><span class="pf-label__txt">Address</span>
                  <textarea name="address" rows={2} class="form-dark">{esc(p.address)}</textarea>
                </label>
              )}
              <button class={btnPrimary + ' shine sm:col-span-2 py-3'}><i class="fas fa-floppy-disk"></i> Save changes</button>
            </form>
            <p class="pf-note"><i class="fas fa-lock mr-1"></i>Your email is your login ID and cannot be changed here.</p>
          </div>

          <div class="pf-panel reveal">
            <div class="pf-panel__head">
              <span class="pf-panel__ico pf-panel__ico--cool"><i class="fas fa-key"></i></span>
              <div>
                <div class="pf-panel__title">Change password</div>
                <div class="pf-panel__sub">Use at least 6 characters for a strong password.</div>
              </div>
            </div>
            <form method="post" action="/profile/password" class="grid sm:grid-cols-3 gap-4">
              <label class="pf-label"><span class="pf-label__txt">Current password</span>
                <input name="current" type="password" required class="form-dark" />
              </label>
              <label class="pf-label"><span class="pf-label__txt">New password</span>
                <input name="password" type="password" required class="form-dark" />
              </label>
              <label class="pf-label"><span class="pf-label__txt">Confirm new</span>
                <input name="confirm" type="password" required class="form-dark" />
              </label>
              <button class="pf-btn-ghost sm:col-span-3"><i class="fas fa-shield-halved"></i> Update password</button>
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
      <PublicLayout user={user} current="/profile" title="My Profile">
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
