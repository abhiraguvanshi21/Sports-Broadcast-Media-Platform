import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { PublicLayout, PageHero } from '../lib/public_layout'
import { Card, Chip, Empty, Stat } from '../lib/components'
import { fmtDate, fmtDateTime, esc } from '../lib/utils'

export const accountRoutes = new Hono<AppEnv>()

// Guard: signed-in customer only
accountRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (!user) return c.redirect('/login')
  if (user.role !== 'customer') return c.redirect(user.role === 'admin' ? '/admin' : '/portal')
  await next()
})

// ---------- CUSTOMER DASHBOARD ----------
accountRoutes.get('/', async (c) => {
  const user = c.get('user')!
  const db = c.env.DB

  const me: any = await db.prepare(`SELECT * FROM customers WHERE user_id = ? OR email = ? ORDER BY id LIMIT 1`)
    .bind(user.id, user.email).first()

  const bookings = me
    ? await db.prepare(
        `SELECT b.*, (SELECT COUNT(*) FROM booking_messages m WHERE m.booking_id=b.id AND m.is_visible=1) AS msgs,
                (SELECT COUNT(*) FROM quotations q WHERE q.booking_id=b.id) AS quotes
           FROM bookings b WHERE b.customer_id = ? ORDER BY b.created_at DESC`
      ).bind(me.id).all()
    : { results: [] as any[] }

  const rows = bookings.results as any[]
  const openCount = rows.filter((b) => !['completed', 'cancelled'].includes(b.status)).length
  const upcoming = rows.filter((b) => b.event_date && new Date(b.event_date) >= new Date()).length

  return c.html(
    <PublicLayout user={c.get('user')} current="/account" title="My Dashboard">
      <PageHero eyebrow={`Welcome, ${user.full_name.split(' ')[0]}`} title="My dashboard" subtitle="Track your enquiries, quotations and scheduled productions — and browse the full website any time." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* quick actions */}
        <div class="grid sm:grid-cols-3 gap-4">
          <Stat label="Total bookings" value={rows.length} icon="fa-file-invoice" tone="bg-red-50 text-red-600" />
          <Stat label="Active / open" value={openCount} icon="fa-spinner" tone="bg-amber-50 text-amber-600" />
          <Stat label="Upcoming events" value={upcoming} icon="fa-calendar-day" tone="bg-cyan-50 text-cyan-600" />
        </div>

        <div class="flex flex-wrap gap-3">
          <a href="/book" class="btn-primary px-5 py-2.5 text-sm">New Booking Request</a>
          <a href="/track" class="px-5 py-2.5 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5 text-sm">Track by ID + OTP</a>
          <a href="/services" class="px-5 py-2.5 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5 text-sm">Browse Services</a>
        </div>

        {/* bookings table */}
        <Card class="p-6 !bg-white/5 border-white/10">
          <h2 class="font-bold text-white text-lg mb-4">Your bookings</h2>
          {rows.length === 0 && <Empty icon="fa-file-invoice" title="No bookings yet" text="Your enquiry history will appear here." />}
          {rows.length > 0 && (
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead class="text-left text-slate-400 border-b border-white/10">
                  <tr>
                    <th class="py-3 pr-4">Booking ID</th>
                    <th class="py-3 pr-4">Event</th>
                    <th class="py-3 pr-4">Date</th>
                    <th class="py-3 pr-4">Status</th>
                    <th class="py-3 pr-4">Updates</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-white/5">
                  {rows.map((b) => (
                    <tr class="hover:bg-white/5">
                      <td class="py-3 pr-4 font-mono text-red-400">{esc(b.booking_code)}</td>
                      <td class="py-3 pr-4 text-slate-200">{esc(b.event_name || '—')}<div class="text-xs text-slate-500">{esc(b.sport || '')}</div></td>
                      <td class="py-3 pr-4 text-slate-400">{b.event_date ? fmtDate(b.event_date) : '—'}</td>
                      <td class="py-3 pr-4"><Chip status={b.status} /></td>
                      <td class="py-3 pr-4 text-slate-400">{b.msgs} msg · {b.quotes} quote</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div class="rounded-2xl bg-white/[0.04] border border-white/10 p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 class="font-bold text-white">Need something else?</h3>
            <p class="text-sm text-slate-400 mt-1">Explore our services, portfolio and latest live broadcasts.</p>
          </div>
          <div class="flex gap-3">
            <a href="/portfolio" class="text-sm text-red-400 hover:text-red-300 font-semibold">Portfolio →</a>
            <a href="/live" class="text-sm text-red-400 hover:text-red-300 font-semibold">Watch Live →</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
})

// ---------- CUSTOMER PROFILE ----------
accountRoutes.get('/profile', async (c) => {
  const user = c.get('user')!
  const me: any = await c.env.DB.prepare(`SELECT * FROM customers WHERE user_id = ? OR email = ? ORDER BY id LIMIT 1`)
    .bind(user.id, user.email).first()
  const saved = c.req.query('saved')
  return c.html(
    <PublicLayout user={c.get('user')} current="/account" title="My Profile">
      <PageHero eyebrow="My account" title="Profile" subtitle="Keep your contact details up to date so we can reach you about your bookings." />
      <section class="max-w-2xl mx-auto px-4 sm:px-6 py-12">
        {saved && <div class="mb-5 msg-success rounded-xl px-4 py-3 text-sm"><i class="fas fa-circle-check mr-1"></i>Profile updated.</div>}
        <Card class="p-6 sm:p-8 !bg-white/5 border-white/10">
          <form method="post" action="/account/profile" class="grid sm:grid-cols-2 gap-4">
            <label class="text-sm text-slate-300">Full name<input name="name" required value={esc(me?.name || user.full_name)} class="form-dark mt-1.5" /></label>
            <label class="text-sm text-slate-300">Email<input name="email" type="email" value={esc(me?.email || user.email)} class="form-dark mt-1.5" /></label>
            <label class="text-sm text-slate-300">Phone<input name="phone" value={esc(me?.phone || '')} class="form-dark mt-1.5" /></label>
            <label class="text-sm text-slate-300">Organization<input name="organization" value={esc(me?.organization || '')} class="form-dark mt-1.5" /></label>
            <label class="text-sm text-slate-300 sm:col-span-2">Address<textarea name="address" rows={2} class="form-dark mt-1.5">{esc(me?.address || '')}</textarea></label>
            <button class="btn-primary sm:col-span-2 py-3">Save changes</button>
          </form>
        </Card>
      </section>
    </PublicLayout>
  )
})

accountRoutes.post('/profile', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const db = c.env.DB
  const me: any = await db.prepare(`SELECT id FROM customers WHERE user_id = ? OR email = ? ORDER BY id LIMIT 1`)
    .bind(user.id, user.email).first()
  if (me) {
    await db.prepare(`UPDATE customers SET name=?, email=?, phone=?, organization=?, address=? WHERE id=?`)
      .bind(String(f.name || ''), String(f.email || ''), String(f.phone || '') || null, String(f.organization || '') || null, String(f.address || '') || null, me.id).run()
  }
  await db.prepare(`UPDATE users SET full_name=?, phone=? WHERE id=?`)
    .bind(String(f.name || user.full_name), String(f.phone || '') || null, user.id).run()
  return c.redirect('/account/profile?saved=1')
})
