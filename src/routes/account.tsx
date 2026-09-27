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

  const notifs = await db.prepare(`SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 6`).bind(user.id).all()

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

        {/* recent updates from the team */}
        {(notifs.results as any[]).length > 0 && (
          <Card class="p-6 !bg-white/5 border-white/10">
            <h2 class="font-bold text-white text-lg mb-4"><i class="fas fa-bell text-red-500 mr-2"></i>Recent updates from our team</h2>
            <ul class="space-y-3">
              {(notifs.results as any[]).map((n) => (
                <li class="flex gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                  <span class="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0"><i class="fas fa-comment-dots"></i></span>
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-white">{esc(n.title)}</div>
                    {n.body && <div class="text-sm text-slate-400">{esc(n.body)}</div>}
                    <div class="text-xs text-slate-500 mt-0.5">{fmtDateTime(n.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}

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
                    <th class="py-3 pr-4"></th>
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
                      <td class="py-3 pr-4"><a href={`/account/bookings/${b.id}`} class="text-red-400 hover:text-red-300 font-semibold whitespace-nowrap">View <i class="fas fa-arrow-right text-xs"></i></a></td>
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

// ---------- CUSTOMER BOOKING DETAIL (signed-in, no OTP needed) ----------
accountRoutes.get('/bookings/:id', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const db = c.env.DB
  const me: any = await db.prepare(`SELECT * FROM customers WHERE user_id = ? OR email = ? ORDER BY id LIMIT 1`)
    .bind(user.id, user.email).first()
  const b: any = await db.prepare(`SELECT * FROM bookings WHERE id=?`).bind(id).first()
  if (!b) return c.notFound()
  // Only the owner may view it: linked customer id, or matching email/phone.
  const owns = (me && b.customer_id === me.id) || (b.contact_email && b.contact_email.toLowerCase() === user.email.toLowerCase())
  if (!owns) return c.redirect('/account')

  const [messages, quotations, documents, services] = await Promise.all([
    db.prepare(`SELECT * FROM booking_messages WHERE booking_id=? AND is_visible=1 ORDER BY created_at`).bind(id).all(),
    db.prepare(`SELECT * FROM quotations WHERE booking_id=? ORDER BY created_at DESC`).bind(id).all(),
    db.prepare(`SELECT * FROM documents WHERE booking_id=? AND is_customer_visible=1`).bind(id).all(),
    db.prepare(`SELECT s.title FROM booking_services bs JOIN services s ON s.id=bs.service_id WHERE bs.booking_id=?`).bind(id).all(),
  ])

  return c.html(
    <PublicLayout user={c.get('user')} current="/account" title={`Booking ${b.booking_code}`}>
      <PageHero eyebrow="My booking" title={b.event_name || b.booking_code} subtitle={`Booking ID ${b.booking_code} · created ${fmtDate(b.created_at)}`} />
      <section class="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <a href="/account" class="inline-flex text-sm text-slate-400 hover:text-white"><i class="fas fa-arrow-left mr-1"></i> Back to dashboard</a>

        <Card class="p-6 !bg-white/5 border-white/10">
          <div class="flex items-center justify-between mb-5">
            <div><div class="text-xs text-slate-500 uppercase tracking-wide">Booking ID</div><div class="font-mono text-lg font-bold text-red-400">{esc(b.booking_code)}</div></div>
            <Chip status={b.status} />
          </div>
          <dl class="grid sm:grid-cols-2 gap-4 text-sm">
            {[
              ['Event', b.event_name], ['Sport', b.sport], ['Date', b.event_date ? fmtDate(b.event_date) : '—'],
              ['Venue', b.venue], ['City', b.city], ['Budget', b.budget],
            ].map(([k, v]) => (
              <div><dt class="text-slate-500">{k}</dt><dd class="text-slate-200 mt-0.5">{esc(v || '—')}</dd></div>
            ))}
          </dl>
          {b.requirements && <div class="mt-4 pt-4 border-t border-white/10"><div class="text-xs text-slate-500 uppercase tracking-wide mb-1">Your requirements</div><p class="text-sm text-slate-300">{esc(b.requirements)}</p></div>}
          {(services.results as any[]).length > 0 && (
            <div class="mt-4 pt-4 border-t border-white/10">
              <div class="text-xs text-slate-500 uppercase tracking-wide mb-2">Services requested</div>
              <div class="flex flex-wrap gap-2">{(services.results as any[]).map((s) => <span class="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 text-xs font-semibold">{esc(s.title)}</span>)}</div>
            </div>
          )}
        </Card>

        {(quotations.results as any[]).length > 0 && (
          <Card class="p-6 !bg-white/5 border-white/10">
            <h3 class="font-bold text-white mb-4"><i class="fas fa-file-invoice-dollar text-red-500 mr-2"></i>Quotations</h3>
            <div class="space-y-3">
              {(quotations.results as any[]).map((q) => (
                <div class="p-4 rounded-xl bg-slate-900/60 border border-white/10">
                  <div class="flex items-center justify-between">
                    <span class="text-xl font-bold text-white">{fmtMoney(q.amount, q.currency)}</span>
                    <span class="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold capitalize">{esc(String(q.status).replace('_', ' '))}</span>
                  </div>
                  {q.details && <p class="text-sm text-slate-400 mt-2">{esc(q.details)}</p>}
                  {q.valid_until && <p class="text-xs text-slate-500 mt-1">Valid until {fmtDate(q.valid_until)}</p>}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card class="p-6 !bg-white/5 border-white/10">
          <h3 class="font-bold text-white mb-4"><i class="fas fa-comments text-red-500 mr-2"></i>Messages from our team</h3>
          <div class="space-y-4">
            {(messages.results as any[]).length === 0 && <p class="text-sm text-slate-500">No messages yet.</p>}
            {(messages.results as any[]).map((m) => {
              const mine = m.sender_type === 'customer'
              return (
                <div class={`flex ${mine ? 'justify-end' : ''}`}>
                  <div class={`max-w-[80%] rounded-2xl px-4 py-2.5 ${mine ? 'bg-slate-800 text-slate-200' : 'bg-red-500/15 text-slate-100 border border-red-500/25'}`}>
                    <div class="text-xs opacity-60 mb-0.5">{esc(m.sender_name || m.sender_type)} · {fmtDateTime(m.created_at)}</div>
                    <div class="text-sm">{esc(m.message)}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

        {(documents.results as any[]).length > 0 && (
          <Card class="p-6 !bg-white/5 border-white/10">
            <h3 class="font-bold text-white mb-4"><i class="fas fa-paperclip text-red-500 mr-2"></i>Documents</h3>
            <div class="space-y-2">
              {(documents.results as any[]).map((d) => (
                <a href={d.file_url} target="_blank" class="flex items-center gap-3 text-sm text-slate-300 hover:text-white"><i class="fas fa-file text-red-400"></i> {esc(d.title)}</a>
              ))}
            </div>
          </Card>
        )}
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
