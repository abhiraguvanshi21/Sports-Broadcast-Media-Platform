import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { StaffLayout, Notice } from '../lib/staff_layout'
import { Stat, Card, Table, Empty, Chip, Field, inputCls, btnPrimary, btnGhost, btnDanger } from '../lib/components'
import { fmtDate, fmtDateTime, fmtMoney, esc, logActivity } from '../lib/utils'
import { canAccess, hashPassword, type Module } from '../lib/auth'

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (!user) return c.redirect('/login')
  if (user.role !== 'admin' && user.role !== 'manager') return c.redirect('/portal')
  // Module guard
  const path = c.req.path.replace('/admin', '') || '/'
  const moduleMap: Record<string, Module> = {
    '/': 'dashboard', '/bookings': 'bookings', '/customers': 'customers', '/employees': 'employees',
    '/roles': 'roles', '/events': 'events', '/live': 'live', '/tasks': 'tasks', '/equipment': 'equipment',
    '/media': 'media', '/portfolio': 'portfolio', '/reports': 'reports', '/notifications': 'notifications',
    '/cms': 'cms', '/logs': 'logs', '/settings': 'settings',
    '/youtube': 'media', '/team': 'cms', '/users': 'employees', '/attendance': 'attendance',
  }
  const seg = '/' + (path.split('/').filter(Boolean)[0] || '')
  const mod = moduleMap[seg]
  if (mod && !canAccess(user.role, mod)) {
    return c.html(<StaffLayout user={user} title="Access denied"><Notice type="error">You do not have permission to access this module.</Notice></StaffLayout>, 403)
  }
  await next()
})

// ============================================================
// DASHBOARD — KPIs (Section 9)
// ============================================================
adminRoutes.get('/', async (c) => {
  const user = c.get('user')!
  const [bookings, liveEvents, upcoming, employees, pendingMsgs, recentBookings, activity, issues, custUsers, empUsers, admUsers, loginsToday, logins7] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN status IN ('received','under_review','discussion') THEN 1 ELSE 0 END) pending FROM bookings`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM live_events WHERE status='live'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM events WHERE status='upcoming'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM employees WHERE status='active'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM bookings WHERE status IN ('received','under_review')`).first<any>(),
    c.env.DB.prepare(`SELECT b.*, (SELECT COUNT(*) FROM booking_messages m WHERE m.booking_id=b.id) msg_count FROM bookings b ORDER BY b.created_at DESC LIMIT 6`).all(),
    c.env.DB.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 8`).all(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM issue_reports WHERE status='open'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role='customer' AND is_active=1`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role IN ('employee','manager') AND is_active=1`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role='admin' AND is_active=1`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE date(last_login_at)=date('now')`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE last_login_at >= datetime('now','-7 days')`).first<any>(),
  ])
  const recentLogins = await c.env.DB.prepare(
    `SELECT id, full_name, email, role, last_login_at FROM users WHERE last_login_at IS NOT NULL ORDER BY last_login_at DESC LIMIT 6`
  ).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin" title="Admin Dashboard">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <Stat label="Total bookings" value={bookings?.n ?? 0} icon="fa-file-invoice" sub={`${bookings?.pending ?? 0} awaiting response`} />
        <Stat label="Live now" value={liveEvents?.n ?? 0} icon="fa-tower-broadcast" tone="bg-red-50 text-red-600" />
        <Stat label="Upcoming events" value={upcoming?.n ?? 0} icon="fa-trophy" tone="bg-blue-50 text-blue-600" />
        <Stat label="Active employees" value={employees?.n ?? 0} icon="fa-id-badge" tone="bg-emerald-50 text-emerald-600" />
      </div>

      {/* Accounts & logins overview — admin sees everyone's data */}
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Customer accounts" value={custUsers?.n ?? 0} icon="fa-users" tone="bg-cyan-50 text-cyan-600" sub="signed-up customers" />
        <Stat label="Employee accounts" value={empUsers?.n ?? 0} icon="fa-user-tie" tone="bg-amber-50 text-amber-600" sub="employee + manager" />
        <Stat label="Admin accounts" value={admUsers?.n ?? 0} icon="fa-user-shield" tone="bg-red-50 text-red-600" />
        <Stat label="Logged in today" value={loginsToday?.n ?? 0} icon="fa-right-to-bracket" tone="bg-indigo-50 text-indigo-600" />
        <Stat label="Active last 7 days" value={logins7?.n ?? 0} icon="fa-clock-rotate-left" tone="bg-slate-100 text-slate-600" />
      </div>

      <div class="mb-6">
        <a href="/admin/users" class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-sm hover:bg-slate-800">
          <i class="fas fa-users-gear"></i> Open Users &amp; Logins
        </a>
      </div>
      {(pendingMsgs?.n ?? 0) > 0 && <Notice type="info"><b>{pendingMsgs.n}</b> booking(s) need a response. <a href="/admin/bookings" class="underline font-semibold">Open bookings →</a></Notice>}
      {(issues?.n ?? 0) > 0 && <Notice type="error"><b>{issues.n}</b> open issue report(s). <a href="/admin/tasks" class="underline font-semibold">Review →</a></Notice>}
      <div class="grid lg:grid-cols-3 gap-6">
        <Card class="p-5 lg:col-span-2">
          <div class="flex items-center justify-between mb-4"><h2 class="font-bold text-slate-900">Recent bookings</h2><a href="/admin/bookings" class="text-sm text-red-600 font-semibold">View all</a></div>
          {(recentBookings.results as any[]).length === 0 ? <Empty icon="fa-file-invoice" title="No bookings yet" /> : (
            <Table cols={['Booking ID', 'Customer', 'Event', 'Status', 'Created']}>
              {(recentBookings.results as any[]).map((b) => (
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3"><a href={`/admin/bookings/${b.id}`} class="font-mono text-xs font-semibold text-red-600 hover:underline">{esc(b.booking_code)}</a></td>
                  <td class="px-4 py-3 text-slate-700">{esc(b.contact_name)}</td>
                  <td class="px-4 py-3 text-slate-500">{esc(b.event_name || '—')}</td>
                  <td class="px-4 py-3"><Chip status={b.status} /></td>
                  <td class="px-4 py-3 text-slate-400 text-xs">{fmtDate(b.created_at)}</td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Recent activity</h2>
          <ul class="space-y-3">
            {(activity.results as any[]).length === 0 && <p class="text-sm text-slate-400">No activity yet.</p>}
            {(activity.results as any[]).map((a) => (
              <li class="flex gap-3 text-sm">
                <span class="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center text-xs shrink-0"><i class="fas fa-bolt"></i></span>
                <div><div class="text-slate-700 font-medium">{esc(a.actor_name || 'System')}</div><div class="text-xs text-slate-400">{esc(a.action)} · {fmtDateTime(a.created_at)}</div></div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </StaffLayout>
  )
})

// ============================================================
// BOOKINGS (Section 5 workflow)
// ============================================================
adminRoutes.get('/bookings', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  const rows = status
    ? await c.env.DB.prepare(`SELECT * FROM bookings WHERE status=? ORDER BY created_at DESC`).bind(status).all()
    : await c.env.DB.prepare(`SELECT * FROM bookings ORDER BY created_at DESC`).all()
  const counts = await c.env.DB.prepare(`SELECT status, COUNT(*) n FROM bookings GROUP BY status`).all()
  const cmap: Record<string, number> = {}
  ;(counts.results as any[]).forEach((r) => (cmap[r.status] = r.n))
  const filters = ['received', 'under_review', 'discussion', 'quotation_sent', 'approved', 'in_production', 'completed', 'cancelled']
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/bookings" title="Bookings">
      <div class="flex flex-wrap gap-2 mb-5">
        <a href="/admin/bookings" class={`px-3 py-1.5 rounded-lg text-sm font-medium ${!status ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>All ({(counts.results as any[]).reduce((s, r) => s + r.n, 0)})</a>
        {filters.map((f) => (
          <a href={`/admin/bookings?status=${f}`} class={`px-3 py-1.5 rounded-lg text-sm font-medium ${status === f ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
            {f.replace('_', ' ')} ({cmap[f] || 0})
          </a>
        ))}
      </div>
      {(rows.results as any[]).length === 0 ? <Empty icon="fa-file-invoice" title="No bookings found" /> : (
        <Table cols={['Booking ID', 'Customer', 'Contact', 'Event', 'Date', 'Services', 'Status', 'Actions']}>
          {(rows.results as any[]).map((b) => (
            <tr class="hover:bg-slate-50">
              <td class="px-4 py-3"><span class="font-mono text-xs font-semibold text-slate-700">{esc(b.booking_code)}</span></td>
              <td class="px-4 py-3 font-medium text-slate-800">{esc(b.contact_name)}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{esc(b.contact_phone)}<br />{esc(b.contact_email || '')}</td>
              <td class="px-4 py-3 text-slate-600">{esc(b.event_name || '—')}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{fmtDate(b.event_date)}</td>
              <td class="px-4 py-3 text-slate-500 text-xs">{esc(b.sport || '—')}</td>
              <td class="px-4 py-3"><Chip status={b.status} /></td>
              <td class="px-4 py-3"><a href={`/admin/bookings/${b.id}`} class="text-red-600 font-semibold text-sm hover:underline">Open</a></td>
            </tr>
          ))}
        </Table>
      )}
    </StaffLayout>
  )
})

adminRoutes.get('/bookings/:id', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const b: any = await c.env.DB.prepare(`SELECT * FROM bookings WHERE id=?`).bind(id).first()
  if (!b) return c.notFound()
  const [services, messages, quotations, documents, allServices] = await Promise.all([
    c.env.DB.prepare(`SELECT s.* FROM booking_services bs JOIN services s ON s.id=bs.service_id WHERE bs.booking_id=?`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM booking_messages WHERE booking_id=? ORDER BY created_at`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM quotations WHERE booking_id=? ORDER BY created_at DESC`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM documents WHERE booking_id=? ORDER BY created_at DESC`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order`).all(),
  ])
  const selected = new Set((services.results as any[]).map((s) => s.id))
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/bookings" title={`Booking ${b.booking_code}`}>
      <div class="flex items-center justify-between mb-5">
        <a href="/admin/bookings" class="text-sm text-slate-500 hover:text-slate-800"><i class="fas fa-arrow-left mr-1"></i> Back to bookings</a>
        <Chip status={b.status} />
      </div>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Customer & event</h2>
            <dl class="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                ['Booking ID', b.booking_code, true], ['Status', null], ['Name', b.contact_name], ['Phone', b.contact_phone],
                ['Email', b.contact_email], ['Organization', b.organization], ['Event', b.event_name], ['Sport', b.sport],
                ['Event date', fmtDate(b.event_date)], ['City', b.city], ['Venue', b.venue], ['Budget', b.budget],
              ].map(([k, v, mono]) => k === 'Status' ? (
                <div><dt class="text-slate-500">Status</dt><dd class="mt-1"><Chip status={b.status} /></dd></div>
              ) : (
                <div><dt class="text-slate-500">{k}</dt><dd class={`text-slate-800 mt-1 ${mono ? 'font-mono font-semibold' : ''}`}>{esc(v || '—')}</dd></div>
              ))}
            </dl>
            <div class="mt-4 pt-4 border-t border-slate-100">
              <dt class="text-slate-500 text-sm">Requirements</dt>
              <dd class="text-slate-700 mt-1">{esc(b.requirements || '—')}</dd>
            </div>
            <div class="mt-3 flex flex-wrap gap-2">
              {(services.results as any[]).map((s) => <span class="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 text-xs font-semibold">{esc(s.title)}</span>)}
              {(services.results as any[]).length === 0 && <span class="text-sm text-slate-400">No services selected</span>}
            </div>
          </Card>

          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Conversation</h2>
            <div class="space-y-4 mb-4 max-h-80 overflow-y-auto">
              {(messages.results as any[]).map((m: any) => (
                <div class={`flex ${m.sender_type === 'staff' ? 'justify-end' : ''}`}>
                  <div class={`max-w-[80%] rounded-2xl px-4 py-2.5 ${m.sender_type === 'staff' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-800'}`}>
                    <div class="text-xs opacity-70 mb-0.5">{esc(m.sender_name || m.sender_type)} · {fmtDateTime(m.created_at)}</div>
                    <div class="text-sm">{esc(m.message)}</div>
                    {!(m.is_visible) && <div class="text-xs mt-1 opacity-60"><i class="fas fa-eye-slash"></i> internal</div>}
                  </div>
                </div>
              ))}
              {(messages.results as any[]).length === 0 && <p class="text-sm text-slate-400">No messages yet.</p>}
            </div>
            <form method="post" action={`/admin/bookings/${id}/message`} class="flex gap-2">
              <input name="message" required placeholder="Type a reply to the customer..." class={inputCls} />
              <input type="hidden" name="visible" value="1" />
              <button class={btnPrimary}><i class="fas fa-paper-plane"></i></button>
            </form>
            <form method="post" action={`/admin/bookings/${id}/message`} class="flex gap-2 mt-2">
              <input name="message" required placeholder="Add an internal note (not visible to customer)..." class={inputCls} />
              <input type="hidden" name="visible" value="0" />
              <button class={btnGhost}><i class="fas fa-lock"></i></button>
            </form>
          </Card>

          {b.admin_notes && <Card class="p-5"><h3 class="font-semibold text-slate-700 mb-2 text-sm">Internal admin notes</h3><p class="text-sm text-slate-600 whitespace-pre-wrap">{esc(b.admin_notes)}</p></Card>}
        </div>

        <div class="space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Update status</h2>
            <form method="post" action={`/admin/bookings/${id}/status`} class="space-y-3">
              <select name="status" class={inputCls}>
                {['received','under_review','discussion','quotation_sent','approved','in_production','completed','cancelled'].map((s)=><option value={s} selected={b.status===s}>{s.replace('_',' ')}</option>)}
              </select>
              <textarea name="admin_notes" rows={3} class={inputCls} placeholder="Internal notes (optional)">{b.admin_notes || ''}</textarea>
              <button class={btnPrimary + ' w-full'}>Save status</button>
            </form>
          </Card>

          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-3">Send quotation</h2>
            <form method="post" action={`/admin/bookings/${id}/quotation`} class="space-y-3">
              <Field label="Amount (INR)"><input name="amount" type="number" required class={inputCls} /></Field>
              <Field label="Details"><textarea name="details" rows={3} class={inputCls}></textarea></Field>
              <Field label="Valid until"><input name="valid_until" type="date" class={inputCls} /></Field>
              <button class={btnPrimary + ' w-full'}>Send quotation</button>
            </form>
            {(quotations.results as any[]).length > 0 && (
              <div class="mt-4 pt-4 border-t border-slate-100 space-y-2">
                {(quotations.results as any[]).map((q) => (
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-semibold text-slate-700">{fmtMoney(q.amount, q.currency)}</span>
                    <Chip status={q.status === 'accepted' ? 'completed' : q.status === 'rejected' ? 'cancelled' : 'quotation_sent'} label={q.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-3">Convert to event</h2>
            <form method="post" action={`/admin/bookings/${id}/convert`}>
              <p class="text-sm text-slate-500 mb-3">Create an event from this approved booking.</p>
              <button class={btnPrimary + ' w-full'}><i class="fas fa-trophy"></i> Create event</button>
            </form>
          </Card>
        </div>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/bookings/:id/status', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  const status = String(f.status)
  await c.env.DB.prepare(`UPDATE bookings SET status=?, admin_notes=COALESCE(NULLIF(?,''),admin_notes), updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(status, String(f.admin_notes || ''), id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'booking.status', entity: 'bookings', entityId: id, details: status })
  return c.redirect(`/admin/bookings/${id}`)
})

adminRoutes.post('/bookings/:id/message', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  const visible = String(f.visible) === '1' ? 1 : 0
  if (String(f.message || '').trim()) {
    await c.env.DB.prepare(`INSERT INTO booking_messages (booking_id, sender_type, sender_name, message, is_visible) VALUES (?, 'staff', ?, ?, ?)`)
      .bind(id, user.full_name, String(f.message), visible).run()
    if (visible) {
      await c.env.DB.prepare(`UPDATE bookings SET status = CASE WHEN status='received' THEN 'discussion' ELSE status END, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run()
    }
  }
  return c.redirect(`/admin/bookings/${id}`)
})

adminRoutes.post('/bookings/:id/quotation', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO quotations (booking_id, amount, details, valid_until) VALUES (?,?,?,?)`)
    .bind(id, Number(f.amount) || 0, String(f.details || ''), String(f.valid_until || '') || null).run()
  await c.env.DB.prepare(`UPDATE bookings SET status='quotation_sent', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run()
  await c.env.DB.prepare(`INSERT INTO booking_messages (booking_id, sender_type, sender_name, message) VALUES (?, 'staff', 'AWADH Sports Live', ?)`)
    .bind(id, `A quotation of ₹${Number(f.amount) || 0} has been shared. Please review and let us know.`).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'quotation.sent', entity: 'bookings', entityId: id, details: String(f.amount) })
  return c.redirect(`/admin/bookings/${id}`)
})

adminRoutes.post('/bookings/:id/convert', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const b: any = await c.env.DB.prepare(`SELECT * FROM bookings WHERE id=?`).bind(id).first()
  if (!b) return c.notFound()
  const existing: any = await c.env.DB.prepare(`SELECT id FROM events WHERE booking_id=?`).bind(id).first()
  if (existing) return c.redirect(`/admin/events/${existing.id}`)
  const res = await c.env.DB.prepare(
    `INSERT INTO events (name, sport, organizer, customer_id, booking_id, start_date, venue_name, venue_address, required_services, status)
     VALUES (?,?,?,?,?,?,?,?,?, 'upcoming')`
  ).bind(b.event_name || `Event for ${b.booking_code}`, b.sport, b.organization, b.customer_id, id, b.event_date, b.venue, b.city,
    (await c.env.DB.prepare(`SELECT group_concat(s.title, ', ') t FROM booking_services bs JOIN services s ON s.id=bs.service_id WHERE bs.booking_id=?`).bind(id).first<any>())?.t || null).run()
  const eventId = Number(res.meta.last_row_id)
  await c.env.DB.prepare(`UPDATE bookings SET status='approved', updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'booking.converted', entity: 'events', entityId: eventId, details: b.booking_code })
  return c.redirect(`/admin/events/${eventId}`)
})

// ============================================================
// CUSTOMERS
// ============================================================
adminRoutes.get('/customers', async (c) => {
  const user = c.get('user')!
  const [customers, inquiries] = await Promise.all([
    c.env.DB.prepare(`SELECT c.*, COUNT(b.id) bookings FROM customers c LEFT JOIN bookings b ON b.customer_id=c.id GROUP BY c.id ORDER BY c.created_at DESC`).all(),
    c.env.DB.prepare(`SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 50`).all(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/customers" title="Customers">
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h2 class="font-bold text-slate-900 mb-3">Customers</h2>
          <Table cols={['Name', 'Contact', 'Organization', 'Bookings', 'Since']}>
            {(customers.results as any[]).length === 0 && <tr><td colspan={5}><Empty icon="fa-users" title="No customers yet" /></td></tr>}
            {(customers.results as any[]).map((r) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{esc(r.name)}</td>
                <td class="px-4 py-3 text-slate-500 text-xs">{esc(r.phone)}<br />{esc(r.email || '')}</td>
                <td class="px-4 py-3 text-slate-500">{esc(r.organization || '—')}</td>
                <td class="px-4 py-3"><span class="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">{r.bookings}</span></td>
                <td class="px-4 py-3 text-slate-400 text-xs">{fmtDate(r.created_at)}</td>
              </tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 class="font-bold text-slate-900 mb-3">Contact enquiries</h2>
          <div class="space-y-3">
            {(inquiries.results as any[]).length === 0 && <Empty icon="fa-envelope" title="No enquiries" />}
            {(inquiries.results as any[]).map((i) => (
              <Card class="p-4">
                <div class="flex items-center justify-between"><span class="font-semibold text-slate-800 text-sm">{esc(i.name)}</span><Chip status={i.status === 'new' ? 'new' : 'completed'} label={i.status} /></div>
                <div class="text-xs text-slate-400 mt-0.5">{esc(i.email || i.phone || '')}</div>
                <p class="text-sm text-slate-600 mt-2">{esc(i.message)}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
})

// ============================================================
// EMPLOYEES
// ============================================================
adminRoutes.get('/employees', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT e.*, u.full_name, u.email, u.phone, u.role, u.is_active FROM employees e JOIN users u ON u.id=e.user_id ORDER BY u.full_name`
  ).all()
  const leaves = await c.env.DB.prepare(
    `SELECT l.*, u.full_name FROM leave_requests l JOIN employees e ON e.id=l.employee_id JOIN users u ON u.id=e.user_id WHERE l.status='pending' ORDER BY l.created_at DESC`
  ).all()
  const createdEmail = c.req.query('created')
  const createdPass = c.req.query('pw')
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/employees" title="Employees">
      {createdEmail && (
        <Notice type="success">
          <div>
            <b>Employee created — they can sign in right now.</b>
            <div class="mt-1 text-sm">Email: <code class="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{esc(createdEmail)}</code> · Password: <code class="font-mono bg-emerald-100 px-1.5 py-0.5 rounded">{esc(createdPass || '')}</code></div>
            <div class="text-xs mt-1">Share these with the employee. They log in at <a href="/login" class="underline font-semibold">/login</a> and land on their own dashboard (attendance, tasks, events).</div>
          </div>
        </Notice>
      )}
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Add employee</h2>
            <form method="post" action="/admin/employees" class="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" required><input name="full_name" required class={inputCls} /></Field>
              <Field label="Email" required><input name="email" type="email" required class={inputCls} /></Field>
              <Field label="Phone"><input name="phone" class={inputCls} /></Field>
              <Field label="Password" required hint="Minimum 6 characters"><input name="password" type="text" required class={inputCls} /></Field>
              <Field label="Employee code"><input name="emp_code" class={inputCls} /></Field>
              <Field label="Department"><input name="department" class={inputCls} /></Field>
              <Field label="Designation"><input name="designation" class={inputCls} /></Field>
              <Field label="Portal role">
                <select name="role" class={inputCls}><option value="employee">Employee</option><option value="manager">Production Manager / Team Lead</option><option value="admin">Admin</option></select>
              </Field>
              <button class={btnPrimary + ' sm:col-span-2'}>Create employee</button>
            </form>
          </Card>
          <Table cols={['Name', 'Email', 'Department', 'Role', 'Status', 'Actions']}>
            {(rows.results as any[]).map((r) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{esc(r.full_name)}<div class="text-xs font-mono text-slate-400">{esc(r.emp_code || '')}</div></td>
                <td class="px-4 py-3 text-slate-500 text-xs">{esc(r.email)}</td>
                <td class="px-4 py-3 text-slate-500">{esc(r.department || '—')}<div class="text-xs text-slate-400">{esc(r.designation || '')}</div></td>
                <td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{esc(r.role)}</span></td>
                <td class="px-4 py-3"><Chip status={r.is_active ? 'present' : 'absent'} label={r.is_active ? 'active' : 'inactive'} /></td>
                <td class="px-4 py-3">
                  <form method="post" action={`/admin/employees/${r.id}/toggle`}>
                    <button class="text-xs font-semibold text-red-600 hover:underline">{r.is_active ? 'Deactivate' : 'Activate'}</button>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 class="font-bold text-slate-900 mb-3">Pending leave requests</h2>
          <div class="space-y-3">
            {(leaves.results as any[]).length === 0 && <Empty icon="fa-plane-departure" title="No pending leave" />}
            {(leaves.results as any[]).map((l) => (
              <Card class="p-4">
                <div class="font-semibold text-slate-800 text-sm">{esc(l.full_name)}</div>
                <div class="text-xs text-slate-400 mt-0.5">{fmtDate(l.from_date)} → {fmtDate(l.to_date)}</div>
                <p class="text-sm text-slate-600 mt-1">{esc(l.reason || '')}</p>
                <div class="flex gap-2 mt-3">
                  <form method="post" action={`/admin/leave/${l.id}`}><input type="hidden" name="decision" value="approved" /><button class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold">Approve</button></form>
                  <form method="post" action={`/admin/leave/${l.id}`}><input type="hidden" name="decision" value="rejected" /><button class="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white font-semibold">Reject</button></form>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/employees', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const email = String(f.email || '').trim().toLowerCase()
  const password = String(f.password || '')
  const name = String(f.full_name || '').trim()
  if (!email || !password || !name) return c.redirect('/admin/employees?err=missing')
  if (password.length < 6) return c.redirect('/admin/employees?err=weak')
  const exists: any = await c.env.DB.prepare(`SELECT id FROM users WHERE email=?`).bind(email).first()
  if (exists) return c.redirect('/admin/employees?err=exists')
  const hash = await hashPassword(password)
  const res = await c.env.DB.prepare(`INSERT INTO users (email, password_hash, role, full_name, phone, is_active) VALUES (?,?,?,?,?,1)`)
    .bind(email, hash, String(f.role || 'employee'), name, String(f.phone || '') || null).run()
  const uid = Number(res.meta.last_row_id)
  await c.env.DB.prepare(`INSERT INTO employees (user_id, emp_code, department, designation, joining_date, status) VALUES (?,?,?,?,date('now'),'active')`)
    .bind(uid, String(f.emp_code || '') || null, String(f.department || '') || null, String(f.designation || '') || null).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'employee.created', entity: 'users', entityId: uid, details: email })
  return c.redirect(`/admin/employees?created=${encodeURIComponent(email)}&pw=${encodeURIComponent(password)}`)
})

adminRoutes.post('/employees/:id/toggle', async (c) => {
  const id = Number(c.req.param('id'))
  const emp: any = await c.env.DB.prepare(`SELECT user_id FROM employees WHERE id=?`).bind(id).first()
  if (emp) await c.env.DB.prepare(`UPDATE users SET is_active = 1 - is_active WHERE id=?`).bind(emp.user_id).run()
  return c.redirect('/admin/employees')
})

adminRoutes.post('/leave/:id', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  const decision = String(f.decision) === 'approved' ? 'approved' : 'rejected'
  await c.env.DB.prepare(`UPDATE leave_requests SET status=?, decided_by=? WHERE id=?`).bind(decision, user.id, id).run()
  return c.redirect('/admin/employees')
})

// ============================================================
// ROLES & PERMISSIONS
// ============================================================
adminRoutes.get('/roles', async (c) => {
  const user = c.get('user')!
  const modules: Module[] = ['dashboard','bookings','customers','employees','roles','events','live','tasks','equipment','media','portfolio','reports','notifications','cms','logs','settings','attendance','my_tasks','my_events','schedule','issues','leave']
  const roles = ['admin', 'manager', 'employee']
  const matrix: Record<string, Record<string, boolean>> = { admin: {}, manager: {}, employee: {} }
  for (const r of roles) for (const m of modules) matrix[r][m] = canAccess(r as any, m)
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/roles" title="Roles & Permissions">
      <Notice type="info">This matrix reflects the role-based access control (RBAC) enforced by the server for every module. Public and Customer roles are handled by the public website and booking tracking.</Notice>
      <Table cols={['Module', 'Admin', 'Manager', 'Employee']}>
        {modules.map((m) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-700 capitalize">{m.replace(/_/g, ' ')}</td>
            {roles.map((r) => (
              <td class="px-4 py-3">
                {matrix[r][m] ? <i class="fas fa-circle-check text-emerald-500"></i> : <i class="fas fa-circle-xmark text-slate-300"></i>}
              </td>
            ))}
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

// ============================================================
// EVENTS
// ============================================================
adminRoutes.get('/events', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM events ORDER BY COALESCE(start_date,'9999') DESC`).all()
  const customers = await c.env.DB.prepare(`SELECT id, name FROM customers ORDER BY name`).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/events" title="Events">
      <Card class="p-5 mb-6">
        <h2 class="font-bold text-slate-900 mb-4">Create event</h2>
        <form method="post" action="/admin/events" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Event name" required><input name="name" required class={inputCls} /></Field>
          <Field label="Sport"><input name="sport" class={inputCls} /></Field>
          <Field label="Organizer"><input name="organizer" class={inputCls} /></Field>
          <Field label="Start date"><input name="start_date" type="date" class={inputCls} /></Field>
          <Field label="End date"><input name="end_date" type="date" class={inputCls} /></Field>
          <Field label="Reporting time"><input name="reporting_time" class={inputCls} placeholder="e.g. 08:30 AM" /></Field>
          <Field label="Venue"><input name="venue_name" class={inputCls} /></Field>
          <Field label="Venue address"><input name="venue_address" class={inputCls} /></Field>
          <Field label="Status"><select name="status" class={inputCls}>{['draft','upcoming','live','completed','cancelled'].map((s)=><option value={s}>{s}</option>)}</select></Field>
          <Field label="Customer"><select name="customer_id" class={inputCls}><option value="">— None —</option>{(customers.results as any[]).map((cu)=><option value={cu.id}>{esc(cu.name)}</option>)}</select></Field>
          <Field label="Required services"><input name="required_services" class={inputCls} /></Field>
          <Field label="Production plan"><input name="production_plan" class={inputCls} /></Field>
          <button class={btnPrimary + ' sm:col-span-2 lg:col-span-3'}>Create event</button>
        </form>
      </Card>
      <Table cols={['Event', 'Sport', 'Dates', 'Venue', 'Status', 'Actions']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={6}><Empty icon="fa-trophy" title="No events yet" /></td></tr>}
        {(rows.results as any[]).map((e) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(e.name)}<div class="text-xs text-slate-400">{esc(e.organizer || '')}</div></td>
            <td class="px-4 py-3 text-slate-500">{esc(e.sport || '—')}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">{fmtDate(e.start_date)}{e.end_date ? ` → ${fmtDate(e.end_date)}` : ''}</td>
            <td class="px-4 py-3 text-slate-500">{esc(e.venue_name || '—')}</td>
            <td class="px-4 py-3"><Chip status={e.status} /></td>
            <td class="px-4 py-3"><a href={`/admin/events/${e.id}`} class="text-red-600 font-semibold text-sm hover:underline">Manage</a></td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/events', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const res = await c.env.DB.prepare(
    `INSERT INTO events (name, sport, organizer, start_date, end_date, reporting_time, venue_name, venue_address, status, customer_id, required_services, production_plan)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
  ).bind(String(f.name), String(f.sport||'')||null, String(f.organizer||'')||null, String(f.start_date||'')||null, String(f.end_date||'')||null,
    String(f.reporting_time||'')||null, String(f.venue_name||'')||null, String(f.venue_address||'')||null, String(f.status||'draft'),
    f.customer_id ? Number(f.customer_id) : null, String(f.required_services||'')||null, String(f.production_plan||'')||null).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'event.created', entity: 'events', entityId: Number(res.meta.last_row_id), details: String(f.name) })
  return c.redirect('/admin/events')
})

adminRoutes.get('/events/:id', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const e: any = await c.env.DB.prepare(`SELECT * FROM events WHERE id=?`).bind(id).first()
  if (!e) return c.notFound()
  const [team, employees, schedule, live] = await Promise.all([
    c.env.DB.prepare(`SELECT et.id, et.role, u.full_name, et.employee_id FROM event_team et JOIN employees emp ON emp.id=et.employee_id JOIN users u ON u.id=emp.user_id WHERE et.event_id=?`).bind(id).all(),
    c.env.DB.prepare(`SELECT e.id, u.full_name FROM employees e JOIN users u ON u.id=e.user_id ORDER BY u.full_name`).all(),
    c.env.DB.prepare(`SELECT * FROM production_schedule WHERE event_id=? ORDER BY start_time`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM live_events WHERE event_id=?`).bind(id).first(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/events" title={e.name}>
      <a href="/admin/events" class="text-sm text-slate-500 hover:text-slate-800"><i class="fas fa-arrow-left mr-1"></i> Back to events</a>
      <div class="grid lg:grid-cols-3 gap-6 mt-5">
        <div class="lg:col-span-2 space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Event details</h2>
            <form method="post" action={`/admin/events/${id}`} class="grid sm:grid-cols-2 gap-4">
              <Field label="Name"><input name="name" value={e.name} class={inputCls} /></Field>
              <Field label="Sport"><input name="sport" value={e.sport || ''} class={inputCls} /></Field>
              <Field label="Organizer"><input name="organizer" value={e.organizer || ''} class={inputCls} /></Field>
              <Field label="Status"><select name="status" class={inputCls}>{['draft','upcoming','live','completed','cancelled'].map((s)=><option value={s} selected={e.status===s}>{s}</option>)}</select></Field>
              <Field label="Start date"><input name="start_date" type="date" value={e.start_date || ''} class={inputCls} /></Field>
              <Field label="Venue"><input name="venue_name" value={e.venue_name || ''} class={inputCls} /></Field>
              <Field label="Reporting time"><input name="reporting_time" value={e.reporting_time || ''} class={inputCls} /></Field>
              <Field label="Required services"><input name="required_services" value={e.required_services || ''} class={inputCls} /></Field>
              <button class={btnPrimary + ' sm:col-span-2'}>Save changes</button>
            </form>
          </Card>
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Production team</h2>
            <form method="post" action={`/admin/events/${id}/team`} class="flex flex-wrap gap-3 mb-4">
              <select name="employee_id" class={inputCls + ' flex-1 min-w-[200px]'} required>
                <option value="">Select employee</option>
                {(employees.results as any[]).map((emp) => <option value={emp.id}>{esc(emp.full_name)}</option>)}
              </select>
              <select name="role" class={inputCls + ' w-40'} required>
                {['camera','streaming','graphics','commentary','replay','photography','producer','director','audio','lighting'].map((r)=><option value={r}>{r}</option>)}
              </select>
              <button class={btnPrimary}>Assign</button>
            </form>
            <div class="flex flex-wrap gap-2">
              {(team.results as any[]).length === 0 && <p class="text-sm text-slate-400">No team assigned yet.</p>}
              {(team.results as any[]).map((t) => (
                <form method="post" action={`/admin/events/${id}/team/${t.id}/remove`} class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 group">
                  <span class="text-sm text-slate-700">{esc(t.full_name)} <span class="text-xs text-slate-400 capitalize">· {esc(t.role)}</span></span>
                  <button class="text-slate-400 hover:text-rose-600"><i class="fas fa-times text-xs"></i></button>
                </form>
              ))}
            </div>
          </Card>
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-4">Production schedule</h2>
            <form method="post" action={`/admin/events/${id}/schedule`} class="flex flex-wrap gap-3 mb-4">
              <select name="milestone" class={inputCls + ' w-40'} required>
                {['setup','testing','rehearsal','live','wrap_up'].map((m)=><option value={m}>{m}</option>)}
              </select>
              <input name="start_time" type="datetime-local" class={inputCls + ' w-56'} />
              <input name="notes" placeholder="Notes" class={inputCls + ' flex-1 min-w-[150px]'} />
              <button class={btnPrimary}>Add</button>
            </form>
            <div class="space-y-2">
              {(schedule.results as any[]).map((s) => (
                <div class="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <span class="px-2 py-0.5 rounded bg-red-100 text-red-700 text-xs font-bold uppercase">{esc(s.milestone)}</span>
                  <span class="text-sm text-slate-600 flex-1">{esc(s.notes || '')}</span>
                  <span class="text-xs text-slate-400">{fmtDateTime(s.start_time)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div class="space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-3">Live / stream</h2>
            <form method="post" action={`/admin/events/${id}/live`} class="space-y-3">
              <Field label="Platform"><input name="platform" value={(live as any)?.platform || ''} class={inputCls} placeholder="youtube / facebook / custom" /></Field>
              <Field label="Stream URL"><input name="stream_url" value={(live as any)?.stream_url || ''} class={inputCls} /></Field>
              <Field label="Embed code"><textarea name="embed_code" rows={3} class={inputCls}>{(live as any)?.embed_code || ''}</textarea></Field>
              <Field label="Live status"><select name="status" class={inputCls}>{['upcoming','live','completed'].map((s)=><option value={s} selected={(live as any)?.status===s}>{s}</option>)}</select></Field>
              <Field label="Scheduled at"><input name="scheduled_at" type="datetime-local" value={(live as any)?.scheduled_at || ''} class={inputCls} /></Field>
              <button class={btnPrimary + ' w-full'}>Save live settings</button>
            </form>
          </Card>
        </div>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/events/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`UPDATE events SET name=?, sport=?, organizer=?, status=?, start_date=?, venue_name=?, reporting_time=?, required_services=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .bind(String(f.name), String(f.sport||'')||null, String(f.organizer||'')||null, String(f.status), String(f.start_date||'')||null, String(f.venue_name||'')||null, String(f.reporting_time||'')||null, String(f.required_services||'')||null, id).run()
  return c.redirect(`/admin/events/${id}`)
})

adminRoutes.post('/events/:id/team', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  if (f.employee_id) {
    await c.env.DB.prepare(`INSERT OR IGNORE INTO event_team (event_id, employee_id, role) VALUES (?,?,?)`).bind(id, Number(f.employee_id), String(f.role)).run()
    await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES ('New event assignment', ?, '/portal/events', 'employees')`).bind(`You were assigned as ${f.role}`).run()
  }
  return c.redirect(`/admin/events/${id}`)
})

adminRoutes.post('/events/:id/team/:tid/remove', async (c) => {
  await c.env.DB.prepare(`DELETE FROM event_team WHERE id=?`).bind(Number(c.req.param('tid'))).run()
  return c.redirect(`/admin/events/${c.req.param('id')}`)
})

adminRoutes.post('/events/:id/schedule', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO production_schedule (event_id, milestone, start_time, notes) VALUES (?,?,?,?)`)
    .bind(id, String(f.milestone), String(f.start_time||'')||null, String(f.notes||'')||null).run()
  return c.redirect(`/admin/events/${id}`)
})

adminRoutes.post('/events/:id/live', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  const existing: any = await c.env.DB.prepare(`SELECT id FROM live_events WHERE event_id=?`).bind(id).first()
  if (existing) {
    await c.env.DB.prepare(`UPDATE live_events SET platform=?, stream_url=?, embed_code=?, status=?, scheduled_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(String(f.platform||'')||null, String(f.stream_url||'')||null, String(f.embed_code||'')||null, String(f.status), String(f.scheduled_at||'')||null, existing.id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO live_events (event_id, platform, stream_url, embed_code, status, scheduled_at) VALUES (?,?,?,?,?,?)`)
      .bind(id, String(f.platform||'')||null, String(f.stream_url||'')||null, String(f.embed_code||'')||null, String(f.status), String(f.scheduled_at||'')||null).run()
  }
  if (String(f.status) === 'live') await c.env.DB.prepare(`UPDATE events SET status='live' WHERE id=?`).bind(id).run()
  if (String(f.status) === 'completed') await c.env.DB.prepare(`UPDATE events SET status='completed' WHERE id=?`).bind(id).run()
  return c.redirect(`/admin/events/${id}`)
})

// ============================================================
// LIVE CONTROL
// ============================================================
adminRoutes.get('/live', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT le.*, e.name AS event_name, e.sport FROM live_events le JOIN events e ON e.id=le.event_id ORDER BY CASE le.status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END, le.scheduled_at DESC`
  ).all()
  const events = await c.env.DB.prepare(`SELECT id, name FROM events WHERE status IN ('upcoming','live') ORDER BY start_date`).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/live" title="Live Control">
      <Card class="p-5 mb-6">
        <h2 class="font-bold text-slate-900 mb-4">Add / update stream</h2>
        <form method="post" action="/admin/live" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Event" required><select name="event_id" required class={inputCls}><option value="">Select event</option>{(events.results as any[]).map((e)=><option value={e.id}>{esc(e.name)}</option>)}</select></Field>
          <Field label="Platform"><input name="platform" class={inputCls} placeholder="youtube / facebook / custom" /></Field>
          <Field label="Status"><select name="status" class={inputCls}>{['upcoming','live','completed'].map((s)=><option value={s}>{s}</option>)}</select></Field>
          <Field label="Stream URL"><input name="stream_url" class={inputCls} /></Field>
          <Field label="Scheduled at"><input name="scheduled_at" type="datetime-local" class={inputCls} /></Field>
          <Field label="Display order"><input name="display_order" type="number" value="0" class={inputCls} /></Field>
          <Field label="Embed code"><textarea name="embed_code" rows={2} class={inputCls + ' sm:col-span-2'} placeholder="<iframe ...></iframe>"></textarea></Field>
          <button class={btnPrimary + ' sm:col-span-2 lg:col-span-3'}>Save stream</button>
        </form>
      </Card>
      <Table cols={['Event', 'Platform', 'Stream', 'Status', 'Scheduled', 'Actions']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={6}><Empty icon="fa-tower-broadcast" title="No streams configured" /></td></tr>}
        {(rows.results as any[]).map((l) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(l.event_name)}<div class="text-xs text-slate-400">{esc(l.sport || '')}</div></td>
            <td class="px-4 py-3 text-slate-500 capitalize">{esc(l.platform || '—')}</td>
            <td class="px-4 py-3 text-slate-500 text-xs truncate max-w-xs">{esc(l.stream_url || '—')}</td>
            <td class="px-4 py-3"><Chip status={l.status} /></td>
            <td class="px-4 py-3 text-slate-400 text-xs">{fmtDateTime(l.scheduled_at)}</td>
            <td class="px-4 py-3"><a href={`/admin/events/${l.event_id}`} class="text-xs font-semibold text-red-600 hover:underline">Manage</a></td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/live', async (c) => {
  const f = await c.req.parseBody()
  const eid = Number(f.event_id)
  const existing: any = await c.env.DB.prepare(`SELECT id FROM live_events WHERE event_id=?`).bind(eid).first()
  if (existing) {
    await c.env.DB.prepare(`UPDATE live_events SET platform=?, stream_url=?, embed_code=?, status=?, scheduled_at=?, display_order=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .bind(String(f.platform||'')||null, String(f.stream_url||'')||null, String(f.embed_code||'')||null, String(f.status), String(f.scheduled_at||'')||null, Number(f.display_order)||0, existing.id).run()
  } else {
    await c.env.DB.prepare(`INSERT INTO live_events (event_id, platform, stream_url, embed_code, status, scheduled_at, display_order) VALUES (?,?,?,?,?,?,?)`)
      .bind(eid, String(f.platform||'')||null, String(f.stream_url||'')||null, String(f.embed_code||'')||null, String(f.status), String(f.scheduled_at||'')||null, Number(f.display_order)||0).run()
  }
  if (String(f.status) === 'live') await c.env.DB.prepare(`UPDATE events SET status='live' WHERE id=?`).bind(eid).run()
  return c.redirect('/admin/live')
})

// ============================================================
// TASKS / PRODUCTION
// ============================================================
adminRoutes.get('/tasks', async (c) => {
  const user = c.get('user')!
  const [rows, employees, events, issues] = await Promise.all([
    c.env.DB.prepare(`SELECT t.*, u.full_name AS assignee, e.name AS event_name FROM tasks t LEFT JOIN employees emp ON emp.id=t.assigned_to LEFT JOIN users u ON u.id=emp.user_id LEFT JOIN events e ON e.id=t.event_id ORDER BY t.created_at DESC`).all(),
    c.env.DB.prepare(`SELECT e.id, u.full_name FROM employees e JOIN users u ON u.id=e.user_id ORDER BY u.full_name`).all(),
    c.env.DB.prepare(`SELECT id, name FROM events ORDER BY start_date DESC LIMIT 50`).all(),
    c.env.DB.prepare(`SELECT i.*, u.full_name FROM issue_reports i JOIN employees e ON e.id=i.employee_id JOIN users u ON u.id=e.user_id ORDER BY CASE i.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, i.created_at DESC`).all(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/tasks" title="Tasks / Production">
      <Card class="p-5 mb-6">
        <h2 class="font-bold text-slate-900 mb-4">Assign task</h2>
        <form method="post" action="/admin/tasks" class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Title" required><input name="title" required class={inputCls} /></Field>
          <Field label="Assign to" required><select name="assigned_to" required class={inputCls}><option value="">Select employee</option>{(employees.results as any[]).map((e)=><option value={e.id}>{esc(e.full_name)}</option>)}</select></Field>
          <Field label="Event"><select name="event_id" class={inputCls}><option value="">— None —</option>{(events.results as any[]).map((e)=><option value={e.id}>{esc(e.name)}</option>)}</select></Field>
          <Field label="Priority"><select name="priority" class={inputCls}>{['low','medium','high','critical'].map((p)=><option value={p} selected={p==='medium'}>{p}</option>)}</select></Field>
          <Field label="Due date"><input name="due_date" type="date" class={inputCls} /></Field>
          <Field label="Description"><input name="description" class={inputCls} /></Field>
          <button class={btnPrimary + ' sm:col-span-2 lg:col-span-3'}>Assign task</button>
        </form>
      </Card>
      <div class="grid lg:grid-cols-2 gap-6">
        <div>
          <h2 class="font-bold text-slate-900 mb-3">All tasks</h2>
          <Table cols={['Task', 'Assignee', 'Priority', 'Status', 'Due']}>
            {(rows.results as any[]).length === 0 && <tr><td colspan={5}><Empty icon="fa-list-check" title="No tasks" /></td></tr>}
            {(rows.results as any[]).map((t) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{esc(t.title)}<div class="text-xs text-slate-400">{esc(t.event_name || '')}</div></td>
                <td class="px-4 py-3 text-slate-500">{esc(t.assignee || '—')}</td>
                <td class="px-4 py-3"><Chip status={t.priority} label={t.priority} /></td>
                <td class="px-4 py-3"><Chip status={t.status} /></td>
                <td class="px-4 py-3 text-slate-400 text-xs">{fmtDate(t.due_date)}</td>
              </tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 class="font-bold text-slate-900 mb-3">Issue reports</h2>
          <div class="space-y-3">
            {(issues.results as any[]).length === 0 && <Empty icon="fa-triangle-exclamation" title="No issues" />}
            {(issues.results as any[]).map((i) => (
              <Card class="p-4">
                <div class="flex items-center justify-between gap-2">
                  <span class="font-semibold text-slate-800 text-sm">{esc(i.title)}</span>
                  <Chip status={i.severity} label={i.severity} />
                </div>
                <div class="text-xs text-slate-400 mt-1">{esc(i.full_name)} · {fmtDateTime(i.created_at)}</div>
                <p class="text-sm text-slate-600 mt-1">{esc(i.description || '')}</p>
                {i.status !== 'resolved' && (
                  <form method="post" action={`/admin/issues/${i.id}/resolve`} class="flex gap-2 mt-3">
                    <input name="resolution" placeholder="Resolution note" class={inputCls + ' text-sm'} />
                    <button class="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold whitespace-nowrap">Resolve</button>
                  </form>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/tasks', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const res = await c.env.DB.prepare(`INSERT INTO tasks (title, description, assigned_to, assigned_by, event_id, priority, due_date) VALUES (?,?,?,?,?,?,?)`)
    .bind(String(f.title), String(f.description||'')||null, Number(f.assigned_to), user.id, f.event_id ? Number(f.event_id) : null, String(f.priority||'medium'), String(f.due_date||'')||null).run()
  const emp: any = await c.env.DB.prepare(`SELECT user_id FROM employees WHERE id=?`).bind(Number(f.assigned_to)).first()
  if (emp) await c.env.DB.prepare(`INSERT INTO notifications (user_id, title, body, link, audience) VALUES (?, 'New task assigned', ?, '/portal/tasks', 'user')`).bind(emp.user_id, String(f.title)).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'task.created', entity: 'tasks', entityId: Number(res.meta.last_row_id), details: String(f.title) })
  return c.redirect('/admin/tasks')
})

adminRoutes.post('/issues/:id/resolve', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`UPDATE issue_reports SET status='resolved', resolution=? WHERE id=?`).bind(String(f.resolution||'Resolved'), id).run()
  return c.redirect('/admin/tasks')
})

// ============================================================
// EQUIPMENT
// ============================================================
adminRoutes.get('/equipment', async (c) => {
  const user = c.get('user')!
  const [rows, assignments, employees, events] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM equipment ORDER BY name`).all(),
    c.env.DB.prepare(`SELECT ea.*, eq.name, u.full_name, e.name AS event_name FROM equipment_assignments ea JOIN equipment eq ON eq.id=ea.equipment_id LEFT JOIN employees emp ON emp.id=ea.employee_id LEFT JOIN users u ON u.id=emp.user_id LEFT JOIN events e ON e.id=ea.event_id ORDER BY ea.issued_at DESC LIMIT 40`).all(),
    c.env.DB.prepare(`SELECT e.id, u.full_name FROM employees e JOIN users u ON u.id=e.user_id ORDER BY u.full_name`).all(),
    c.env.DB.prepare(`SELECT id, name FROM events WHERE status IN ('upcoming','live') ORDER BY start_date`).all(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/equipment" title="Equipment">
      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Add equipment</h2>
          <form method="post" action="/admin/equipment" class="grid sm:grid-cols-2 gap-4">
            <Field label="Name" required><input name="name" required class={inputCls} /></Field>
            <Field label="Category"><select name="category" class={inputCls}>{['camera','switcher','audio','lighting','streaming','other'].map((t)=><option value={t}>{t}</option>)}</select></Field>
            <Field label="Serial number"><input name="serial_no" class={inputCls} /></Field>
            <Field label="Condition note"><input name="condition_note" class={inputCls} /></Field>
            <button class={btnPrimary + ' sm:col-span-2'}>Add equipment</button>
          </form>
        </Card>
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Assign equipment</h2>
          <form method="post" action="/admin/equipment/assign" class="grid sm:grid-cols-2 gap-4">
            <Field label="Equipment" required><select name="equipment_id" required class={inputCls}><option value="">Select</option>{(rows.results as any[]).map((r)=><option value={r.id}>{esc(r.name)}</option>)}</select></Field>
            <Field label="Employee"><select name="employee_id" class={inputCls}><option value="">—</option>{(employees.results as any[]).map((e)=><option value={e.id}>{esc(e.full_name)}</option>)}</select></Field>
            <Field label="Event"><select name="event_id" class={inputCls}><option value="">—</option>{(events.results as any[]).map((e)=><option value={e.id}>{esc(e.name)}</option>)}</select></Field>
            <Field label="Condition note"><input name="condition_note" class={inputCls} /></Field>
            <button class={btnPrimary + ' sm:col-span-2'}>Assign</button>
          </form>
        </Card>
      </div>
      <Table cols={['Equipment', 'Category', 'Serial', 'Status']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={4}><Empty icon="fa-video" title="No equipment" /></td></tr>}
        {(rows.results as any[]).map((r) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(r.name)}</td>
            <td class="px-4 py-3 text-slate-500 capitalize">{esc(r.category || '—')}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.serial_no || '—')}</td>
            <td class="px-4 py-3"><Chip status={r.status === 'available' ? 'completed' : r.status === 'assigned' ? 'in_progress' : 'cancelled'} label={r.status} /></td>
          </tr>
        ))}
      </Table>
      <h2 class="font-bold text-slate-900 mt-6 mb-3">Recent assignments</h2>
      <Table cols={['Equipment', 'Assigned to', 'Event', 'Issued', 'Status', 'Action']}>
        {(assignments.results as any[]).map((a) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(a.name)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(a.full_name || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{esc(a.event_name || '—')}</td>
            <td class="px-4 py-3 text-slate-400 text-xs">{fmtDate(a.issued_at)}</td>
            <td class="px-4 py-3"><Chip status={a.status === 'issued' ? 'in_progress' : 'completed'} label={a.status} /></td>
            <td class="px-4 py-3">
              {a.status !== 'returned' && <form method="post" action={`/admin/equipment/return/${a.id}`}><button class="text-xs font-semibold text-emerald-600 hover:underline">Mark returned</button></form>}
            </td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/equipment', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO equipment (name, category, serial_no, condition_note) VALUES (?,?,?,?)`)
    .bind(String(f.name), String(f.category||'')||null, String(f.serial_no||'')||null, String(f.condition_note||'')||null).run()
  return c.redirect('/admin/equipment')
})

adminRoutes.post('/equipment/assign', async (c) => {
  const f = await c.req.parseBody()
  const eqId = Number(f.equipment_id)
  await c.env.DB.prepare(`INSERT INTO equipment_assignments (equipment_id, employee_id, event_id, condition_note) VALUES (?,?,?,?)`)
    .bind(eqId, f.employee_id ? Number(f.employee_id) : null, f.event_id ? Number(f.event_id) : null, String(f.condition_note||'')||null).run()
  await c.env.DB.prepare(`UPDATE equipment SET status='assigned' WHERE id=?`).bind(eqId).run()
  return c.redirect('/admin/equipment')
})

adminRoutes.post('/equipment/return/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const a: any = await c.env.DB.prepare(`SELECT equipment_id FROM equipment_assignments WHERE id=?`).bind(id).first()
  await c.env.DB.prepare(`UPDATE equipment_assignments SET status='returned', returned_at=CURRENT_TIMESTAMP WHERE id=?`).bind(id).run()
  if (a) await c.env.DB.prepare(`UPDATE equipment SET status='available' WHERE id=?`).bind(a.equipment_id).run()
  return c.redirect('/admin/equipment')
})

// ============================================================
// MEDIA
// ============================================================
adminRoutes.get('/media', async (c) => {
  const user = c.get('user')!
  const status = c.req.query('status')
  const q = status
    ? c.env.DB.prepare(`SELECT m.*, e.name AS event_name FROM media m LEFT JOIN events e ON e.id=m.event_id WHERE m.status=? ORDER BY m.created_at DESC`).bind(status)
    : c.env.DB.prepare(`SELECT m.*, e.name AS event_name FROM media m LEFT JOIN events e ON e.id=m.event_id ORDER BY m.created_at DESC`)
  const rows = await q.all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/media" title="Media">
      <div class="flex flex-wrap gap-2 mb-5">
        {[['', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([v, l]) => (
          <a href={`/admin/media${v ? '?status=' + v : ''}`} class={`px-3 py-1.5 rounded-lg text-sm font-medium ${(status || '') === v ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{l}</a>
        ))}
      </div>
      <Card class="p-5 mb-6">
        <h2 class="font-bold text-slate-900 mb-4">Add media directly</h2>
        <form method="post" action="/admin/media" class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Title" required><input name="title" required class={inputCls} /></Field>
          <Field label="Type"><select name="media_type" class={inputCls}>{['photo','video','highlight','reel','interview'].map((t)=><option value={t}>{t}</option>)}</select></Field>
          <Field label="URL" required><input name="url" required class={inputCls} /></Field>
          <Field label="Thumbnail"><input name="thumbnail" class={inputCls} /></Field>
          <button class={btnPrimary + ' sm:col-span-2 lg:col-span-4'}>Add media</button>
        </form>
      </Card>
      <Table cols={['Preview', 'Title', 'Type', 'Event', 'Status', 'Public', 'Actions']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={7}><Empty icon="fa-photo-film" title="No media" /></td></tr>}
        {(rows.results as any[]).map((m) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3"><div class="w-16 h-10 rounded-lg bg-slate-100 overflow-hidden">{m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover" /> : <div class="w-full h-full flex items-center justify-center text-slate-400"><i class="fas fa-image"></i></div>}</div></td>
            <td class="px-4 py-3 font-medium text-slate-800">{esc(m.title)}</td>
            <td class="px-4 py-3 text-slate-500 capitalize">{esc(m.media_type)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(m.event_name || '—')}</td>
            <td class="px-4 py-3"><Chip status={m.status === 'approved' ? 'completed' : m.status === 'rejected' ? 'cancelled' : 'pending'} label={m.status} /></td>
            <td class="px-4 py-3">{m.is_public ? <i class="fas fa-eye text-emerald-500"></i> : <i class="fas fa-eye-slash text-slate-300"></i>}</td>
            <td class="px-4 py-3">
              <div class="flex gap-2">
                {m.status !== 'approved' && <form method="post" action={`/admin/media/${m.id}/approve`}><button class="text-xs font-semibold text-emerald-600 hover:underline">Approve</button></form>}
                {m.status !== 'rejected' && <form method="post" action={`/admin/media/${m.id}/reject`}><button class="text-xs font-semibold text-rose-600 hover:underline">Reject</button></form>}
                <form method="post" action={`/admin/media/${m.id}/toggle-public`}><button class="text-xs font-semibold text-slate-500 hover:underline">{m.is_public ? 'Unpublish' : 'Publish'}</button></form>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/media', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO media (title, media_type, url, thumbnail, status, is_public) VALUES (?,?,?,?, 'approved', 1)`)
    .bind(String(f.title), String(f.media_type||'photo'), String(f.url), String(f.thumbnail||'')||null).run()
  return c.redirect('/admin/media')
})

adminRoutes.post('/media/:id/approve', async (c) => {
  await c.env.DB.prepare(`UPDATE media SET status='approved', is_public=1 WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/media')
})
adminRoutes.post('/media/:id/reject', async (c) => {
  await c.env.DB.prepare(`UPDATE media SET status='rejected', is_public=0 WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/media')
})
adminRoutes.post('/media/:id/toggle-public', async (c) => {
  await c.env.DB.prepare(`UPDATE media SET is_public = 1 - is_public WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/media')
})

// ============================================================
// PORTFOLIO / SERVICES
// ============================================================
adminRoutes.get('/portfolio', async (c) => {
  const user = c.get('user')!
  const [portfolio, services] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM portfolio ORDER BY created_at DESC`).all(),
    c.env.DB.prepare(`SELECT * FROM services ORDER BY sort_order`).all(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/portfolio" title="Portfolio / Services">
      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Add portfolio project</h2>
          <form method="post" action="/admin/portfolio" class="grid sm:grid-cols-2 gap-4">
            <Field label="Title" required><input name="title" required class={inputCls} /></Field>
            <Field label="Sport"><input name="sport" class={inputCls} /></Field>
            <Field label="Client"><input name="client" class={inputCls} /></Field>
            <Field label="Cover image URL"><input name="cover_image" class={inputCls} /></Field>
            <Field label="Services delivered"><input name="services_delivered" class={inputCls} /></Field>
            <Field label="Video URL"><input name="video_url" class={inputCls} /></Field>
            <Field label="Description"><textarea name="description" rows={2} class={inputCls + ' sm:col-span-2'}></textarea></Field>
            <button class={btnPrimary + ' sm:col-span-2'}>Add project</button>
          </form>
        </Card>
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Add service</h2>
          <form method="post" action="/admin/services" class="grid sm:grid-cols-2 gap-4">
            <Field label="Title" required><input name="title" required class={inputCls} /></Field>
            <Field label="Icon (FontAwesome)"><input name="icon" class={inputCls} placeholder="fa-broadcast-tower" /></Field>
            <Field label="Short description"><input name="short_desc" class={inputCls + ' sm:col-span-2'} /></Field>
            <Field label="Full description"><textarea name="description" rows={2} class={inputCls + ' sm:col-span-2'}></textarea></Field>
            <button class={btnPrimary + ' sm:col-span-2'}>Add service</button>
          </form>
        </Card>
      </div>
      <h2 class="font-bold text-slate-900 mb-3">Portfolio projects</h2>
      <Table cols={['Title', 'Sport', 'Client', 'Published', 'Actions']}>
        {(portfolio.results as any[]).map((p) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(p.title)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(p.sport || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{esc(p.client || '—')}</td>
            <td class="px-4 py-3">{p.is_published ? <i class="fas fa-eye text-emerald-500"></i> : <i class="fas fa-eye-slash text-slate-300"></i>}</td>
            <td class="px-4 py-3"><form method="post" action={`/admin/portfolio/${p.id}/toggle`}><button class="text-xs font-semibold text-slate-500 hover:underline">{p.is_published ? 'Unpublish' : 'Publish'}</button></form></td>
          </tr>
        ))}
      </Table>
      <h2 class="font-bold text-slate-900 mt-6 mb-3">Services</h2>
      <Table cols={['Title', 'Slug', 'Active', 'Action']}>
        {(services.results as any[]).map((s) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(s.title)}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(s.slug)}</td>
            <td class="px-4 py-3"><Chip status={s.is_active ? 'present' : 'absent'} label={s.is_active ? 'active' : 'inactive'} /></td>
            <td class="px-4 py-3"><form method="post" action={`/admin/services/${s.id}/toggle`}><button class="text-xs font-semibold text-slate-500 hover:underline">{s.is_active ? 'Disable' : 'Enable'}</button></form></td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/portfolio', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO portfolio (title, sport, client, cover_image, services_delivered, video_url, description) VALUES (?,?,?,?,?,?,?)`)
    .bind(String(f.title), String(f.sport||'')||null, String(f.client||'')||null, String(f.cover_image||'')||null, String(f.services_delivered||'')||null, String(f.video_url||'')||null, String(f.description||'')||null).run()
  return c.redirect('/admin/portfolio')
})

adminRoutes.post('/portfolio/:id/toggle', async (c) => {
  await c.env.DB.prepare(`UPDATE portfolio SET is_published = 1 - is_published WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/portfolio')
})

adminRoutes.post('/services', async (c) => {
  const f = await c.req.parseBody()
  const slug = String(f.title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  await c.env.DB.prepare(`INSERT INTO services (slug, title, short_desc, description, icon, sort_order) VALUES (?,?,?,?,?, (SELECT COALESCE(MAX(sort_order),0)+1 FROM services))`)
    .bind(slug, String(f.title), String(f.short_desc||'')||null, String(f.description||'')||null, String(f.icon||'fa-broadcast-tower')).run()
  return c.redirect('/admin/portfolio')
})

adminRoutes.post('/services/:id/toggle', async (c) => {
  await c.env.DB.prepare(`UPDATE services SET is_active = 1 - is_active WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/portfolio')
})

// ============================================================
// REPORTS
// ============================================================
adminRoutes.get('/reports', async (c) => {
  const user = c.get('user')!
  const [bookingsByStatus, eventsByStatus, attendanceSum, tasksByStatus, mediaCount, revenue, topServices] = await Promise.all([
    c.env.DB.prepare(`SELECT status, COUNT(*) n FROM bookings GROUP BY status`).all(),
    c.env.DB.prepare(`SELECT status, COUNT(*) n FROM events GROUP BY status`).all(),
    c.env.DB.prepare(`SELECT SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) present, COUNT(*) total FROM attendance WHERE strftime('%Y-%m', work_date)=strftime('%Y-%m','now')`).first<any>(),
    c.env.DB.prepare(`SELECT status, COUNT(*) n FROM tasks GROUP BY status`).all(),
    c.env.DB.prepare(`SELECT COUNT(*) n, SUM(CASE WHEN status='approved' THEN 1 ELSE 0 END) approved FROM media`).first<any>(),
    c.env.DB.prepare(`SELECT SUM(CASE WHEN status IN ('accepted','sent') THEN amount ELSE 0 END) quoted, COUNT(*) n FROM quotations`).first<any>(),
    c.env.DB.prepare(`SELECT s.title, COUNT(bs.booking_id) n FROM booking_services bs JOIN services s ON s.id=bs.service_id GROUP BY s.id ORDER BY n DESC LIMIT 6`).all(),
  ])
  const Bars = ({ rows }: { rows: any[] }) => (
    <div class="space-y-2">
      {rows.map((r) => (
        <div class="flex items-center gap-3">
          <span class="w-36 text-sm text-slate-600 capitalize">{String(r.status || r.title).replace('_', ' ')}</span>
          <div class="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden"><div class="h-full bg-gradient-to-r from-red-500 to-orange-500" style={`width:${Math.min(100, (r.n || 0) * 8)}%`}></div></div>
          <span class="w-8 text-sm font-semibold text-slate-700 text-right">{r.n}</span>
        </div>
      ))}
      {rows.length === 0 && <p class="text-sm text-slate-400">No data yet.</p>}
    </div>
  )
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/reports" title="Reports">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Quoted value" value={fmtMoney(revenue?.quoted || 0)} icon="fa-indian-rupee-sign" tone="bg-emerald-50 text-emerald-600" sub={`${revenue?.n ?? 0} quotations`} />
        <Stat label="Media published" value={`${mediaCount?.approved ?? 0}/${mediaCount?.n ?? 0}`} icon="fa-photo-film" tone="bg-cyan-50 text-cyan-600" />
        <Stat label="Attendance (month)" value={`${attendanceSum?.present ?? 0}/${attendanceSum?.total ?? 0}`} icon="fa-fingerprint" tone="bg-amber-50 text-amber-600" />
        <Stat label="Live events" value={(eventsByStatus.results as any[]).find((e) => e.status === 'live')?.n ?? 0} icon="fa-tower-broadcast" tone="bg-red-50 text-red-600" />
      </div>
      <div class="grid lg:grid-cols-2 gap-6">
        <Card class="p-5"><h2 class="font-bold text-slate-900 mb-4">Bookings by status</h2><Bars rows={bookingsByStatus.results as any[]} /></Card>
        <Card class="p-5"><h2 class="font-bold text-slate-900 mb-4">Events by status</h2><Bars rows={eventsByStatus.results as any[]} /></Card>
        <Card class="p-5"><h2 class="font-bold text-slate-900 mb-4">Tasks by status</h2><Bars rows={tasksByStatus.results as any[]} /></Card>
        <Card class="p-5"><h2 class="font-bold text-slate-900 mb-4">Most requested services</h2><Bars rows={topServices.results as any[]} /></Card>
      </div>
    </StaffLayout>
  )
})

// ============================================================
// NOTIFICATIONS
// ============================================================
adminRoutes.get('/notifications', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM notifications WHERE audience IN ('admins','all') OR user_id=? ORDER BY created_at DESC LIMIT 100`).bind(user.id).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/notifications" title="Notifications">
      <Card class="p-5 mb-6">
        <h2 class="font-bold text-slate-900 mb-4">Send notification</h2>
        <form method="post" action="/admin/notifications" class="grid sm:grid-cols-3 gap-4">
          <Field label="Title" required><input name="title" required class={inputCls} /></Field>
          <Field label="Audience"><select name="audience" class={inputCls}><option value="employees">All employees</option><option value="managers">Managers</option><option value="all">Everyone</option></select></Field>
          <Field label="Link"><input name="link" class={inputCls} placeholder="/portal/events" /></Field>
          <Field label="Body"><textarea name="body" rows={2} class={inputCls + ' sm:col-span-3'}></textarea></Field>
          <button class={btnPrimary + ' sm:col-span-3'}>Send notification</button>
        </form>
      </Card>
      <Table cols={['Title', 'Body', 'Audience', 'Created']}>
        {(rows.results as any[]).map((n) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(n.title)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(n.body || '')}</td>
            <td class="px-4 py-3 capitalize text-slate-500">{esc(n.audience)}</td>
            <td class="px-4 py-3 text-slate-400 text-xs">{fmtDateTime(n.created_at)}</td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/notifications', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES (?,?,?,?)`)
    .bind(String(f.title), String(f.body||'')||null, String(f.link||'')||null, String(f.audience||'employees')).run()
  return c.redirect('/admin/notifications')
})

// ============================================================
// CMS
// ============================================================
adminRoutes.get('/cms', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM website_content ORDER BY section, content_key`).all()
  const [jobs, apps] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM job_openings ORDER BY created_at DESC`).all(),
    c.env.DB.prepare(`SELECT a.*, j.title AS job_title FROM job_applications a LEFT JOIN job_openings j ON j.id=a.job_id ORDER BY a.created_at DESC LIMIT 30`).all(),
  ])
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/cms" title="CMS">
      <div class="grid lg:grid-cols-2 gap-6 mb-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Website content</h2>
          <form method="post" action="/admin/cms" class="grid sm:grid-cols-3 gap-4">
            <Field label="Section" required><input name="section" required class={inputCls} placeholder="home_hero" /></Field>
            <Field label="Key" required><input name="content_key" required class={inputCls} placeholder="tagline" /></Field>
            <Field label="Value"><input name="content_value" class={inputCls} /></Field>
            <button class={btnPrimary + ' sm:col-span-3'}>Save content</button>
          </form>
        </Card>
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Job openings</h2>
          <form method="post" action="/admin/cms/jobs" class="grid sm:grid-cols-2 gap-4">
            <Field label="Title" required><input name="title" required class={inputCls} /></Field>
            <Field label="Department"><input name="department" class={inputCls} /></Field>
            <Field label="Location"><input name="location" class={inputCls} /></Field>
            <Field label="Type"><select name="job_type" class={inputCls}>{['full_time','part_time','contract','freelance'].map((t)=><option value={t}>{t.replace('_',' ')}</option>)}</select></Field>
            <Field label="Description"><textarea name="description" rows={2} class={inputCls + ' sm:col-span-2'}></textarea></Field>
            <button class={btnPrimary + ' sm:col-span-2'}>Add opening</button>
          </form>
        </Card>
      </div>
      <h2 class="font-bold text-slate-900 mb-3">Content entries</h2>
      <Table cols={['Section', 'Key', 'Value', 'Updated']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={4}><Empty icon="fa-pen-to-square" title="No CMS content" /></td></tr>}
        {(rows.results as any[]).map((r) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.section)}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.content_key)}</td>
            <td class="px-4 py-3 text-slate-700">{esc(r.content_value || '')}</td>
            <td class="px-4 py-3 text-slate-400 text-xs">{fmtDateTime(r.updated_at)}</td>
          </tr>
        ))}
      </Table>
      <h2 class="font-bold text-slate-900 mt-6 mb-3">Job openings</h2>
      <Table cols={['Title', 'Department', 'Location', 'Type', 'Open', 'Action']}>
        {(jobs.results as any[]).map((j) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(j.title)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(j.department || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{esc(j.location || '—')}</td>
            <td class="px-4 py-3 text-slate-500 capitalize">{esc((j.job_type || '').replace('_', ' '))}</td>
            <td class="px-4 py-3"><Chip status={j.is_open ? 'present' : 'absent'} label={j.is_open ? 'open' : 'closed'} /></td>
            <td class="px-4 py-3"><form method="post" action={`/admin/cms/jobs/${j.id}/toggle`}><button class="text-xs font-semibold text-slate-500 hover:underline">{j.is_open ? 'Close' : 'Reopen'}</button></form></td>
          </tr>
        ))}
      </Table>
      <h2 class="font-bold text-slate-900 mt-6 mb-3">Job applications</h2>
      <Table cols={['Applicant', 'Position', 'Contact', 'Resume', 'Applied']}>
        {(apps.results as any[]).length === 0 && <tr><td colspan={5}><Empty icon="fa-briefcase" title="No applications" /></td></tr>}
        {(apps.results as any[]).map((a) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(a.name)}</td>
            <td class="px-4 py-3 text-slate-500">{esc(a.job_title || '—')}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">{esc(a.email || '')}<br />{esc(a.phone || '')}</td>
            <td class="px-4 py-3">{a.resume_url ? <a href={a.resume_url} target="_blank" class="text-red-600 text-xs font-semibold hover:underline">View</a> : '—'}</td>
            <td class="px-4 py-3 text-slate-400 text-xs">{fmtDate(a.created_at)}</td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.post('/cms', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO website_content (section, content_key, content_value) VALUES (?,?,?)
    ON CONFLICT(section, content_key) DO UPDATE SET content_value=excluded.content_value, updated_at=CURRENT_TIMESTAMP`)
    .bind(String(f.section), String(f.content_key), String(f.content_value||'')).run()
  return c.redirect('/admin/cms')
})

adminRoutes.post('/cms/jobs', async (c) => {
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO job_openings (title, department, location, job_type, description) VALUES (?,?,?,?,?)`)
    .bind(String(f.title), String(f.department||'')||null, String(f.location||'')||null, String(f.job_type||'full_time'), String(f.description||'')||null).run()
  return c.redirect('/admin/cms')
})

adminRoutes.post('/cms/jobs/:id/toggle', async (c) => {
  await c.env.DB.prepare(`UPDATE job_openings SET is_open = 1 - is_open WHERE id=?`).bind(Number(c.req.param('id'))).run()
  return c.redirect('/admin/cms')
})

// ============================================================
// ACTIVITY LOGS
// ============================================================
adminRoutes.get('/logs', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 200`).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/logs" title="Activity Logs">
      <Table cols={['When', 'Actor', 'Action', 'Entity', 'Details', 'IP']}>
        {(rows.results as any[]).length === 0 && <tr><td colspan={6}><Empty icon="fa-clock-rotate-left" title="No activity yet" /></td></tr>}
        {(rows.results as any[]).map((l) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 text-slate-400 text-xs whitespace-nowrap">{fmtDateTime(l.created_at)}</td>
            <td class="px-4 py-3 text-slate-700 font-medium">{esc(l.actor_name || 'System')}</td>
            <td class="px-4 py-3"><span class="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-mono">{esc(l.action)}</span></td>
            <td class="px-4 py-3 text-slate-500 text-xs">{esc(l.entity || '')}{l.entity_id ? `#${l.entity_id}` : ''}</td>
            <td class="px-4 py-3 text-slate-500 text-xs">{esc(l.details || '')}</td>
            <td class="px-4 py-3 text-slate-400 text-xs font-mono">{esc(l.ip || '')}</td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

// ============================================================
// SETTINGS
// ============================================================
adminRoutes.get('/settings', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM website_content WHERE section='settings' ORDER BY content_key`).all()
  const cfg = (k: string) => (rows.results as any[]).find((r) => r.content_key === k)?.content_value || ''
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/settings" title="Settings">
      <Notice type="info">Settings are stored in the database. System secrets (API keys, database credentials) must be stored as environment variables / secrets — never in the database or code.</Notice>
      <div class="grid lg:grid-cols-2 gap-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Branding & contact</h2>
          <form method="post" action="/admin/settings" class="space-y-4">
            <Field label="Company name"><input name="company_name" value={cfg('company_name')} class={inputCls} /></Field>
            <Field label="Support email"><input name="support_email" value={cfg('support_email')} class={inputCls} /></Field>
            <Field label="Support phone"><input name="support_phone" value={cfg('support_phone')} class={inputCls} /></Field>
            <Field label="Address"><input name="address" value={cfg('address')} class={inputCls} /></Field>
            <button class={btnPrimary}>Save settings</button>
          </form>
        </Card>
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Integrations & notifications</h2>
          <form method="post" action="/admin/settings" class="space-y-4">
            <Field label="YouTube channel URL"><input name="youtube_url" value={cfg('youtube_url')} class={inputCls} /></Field>
            <Field label="Notification sender name"><input name="notify_sender" value={cfg('notify_sender')} class={inputCls} /></Field>
            <Field label="Booking OTP expiry (minutes)"><input name="otp_expiry" value={cfg('otp_expiry') || '10'} class={inputCls} /></Field>
            <button class={btnPrimary}>Save integration settings</button>
          </form>
          <p class="text-xs text-slate-400 mt-4"><i class="fas fa-shield-halved mr-1"></i> OTP delivery requires an SMS/email provider. Configure provider keys as environment secrets.</p>
        </Card>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/settings', async (c) => {
  const f = await c.req.parseBody()
  const keys = ['company_name','support_email','support_phone','address','youtube_url','notify_sender','otp_expiry']
  for (const k of keys) {
    if (f[k] !== undefined) {
      await c.env.DB.prepare(`INSERT INTO website_content (section, content_key, content_value) VALUES ('settings', ?, ?)
        ON CONFLICT(section, content_key) DO UPDATE SET content_value=excluded.content_value, updated_at=CURRENT_TIMESTAMP`).bind(k, String(f[k] || '')).run()
    }
  }
  return c.redirect('/admin/settings')
})

// ============================================================
// YOUTUBE VIDEOS — admin manages what shows on Live / Gallery / Home
// ============================================================
adminRoutes.get('/youtube', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM youtube_videos ORDER BY is_live DESC, is_upcoming DESC, sort_order`).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/youtube" title="YouTube Videos">
      <Notice type="info">
        Videos shown here appear on the Live hub, Gallery and Home page. Paste a YouTube URL or video ID — the title and thumbnail are fetched automatically from YouTube.
      </Notice>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <Table cols={['Video', 'Category', 'State', 'Order', 'Actions']}>
            {(rows.results as any[]).length === 0 && <tr><td colspan={5}><Empty icon="fa-brands fa-youtube" title="No videos yet" text="Add your first YouTube video." /></td></tr>}
            {(rows.results as any[]).map((v) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <img src={`https://i.ytimg.com/vi/${v.video_id}/default.jpg`} class="w-20 h-12 rounded-lg object-cover bg-slate-200" loading="lazy" />
                    <div class="min-w-0">
                      <div class="font-medium text-slate-800 text-sm line-clamp-2 max-w-xs">{esc(v.title)}</div>
                      <div class="text-xs font-mono text-slate-400">{esc(v.video_id)}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-500 text-sm">{esc(v.category || '—')}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-col gap-1">
                    {v.is_live === 1 && <span class="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold w-fit">LIVE</span>}
                    {v.is_upcoming === 1 && <span class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-semibold w-fit">Upcoming</span>}
                    {v.is_live === 0 && v.is_upcoming === 0 && <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold w-fit">Published</span>}
                    {v.is_active === 0 && <span class="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-semibold w-fit">Hidden</span>}
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-500 text-sm">{v.sort_order}</td>
                <td class="px-4 py-3">
                  <div class="flex flex-wrap gap-2">
                    <form method="post" action={`/admin/youtube/${v.id}/state`}>
                      <input type="hidden" name="state" value={v.is_live === 1 ? 'published' : 'live'} />
                      <button class="text-xs font-semibold text-red-600 hover:underline">{v.is_live === 1 ? 'Stop live' : 'Set live'}</button>
                    </form>
                    <form method="post" action={`/admin/youtube/${v.id}/state`}>
                      <input type="hidden" name="state" value={v.is_upcoming === 1 ? 'published' : 'upcoming'} />
                      <button class="text-xs font-semibold text-blue-600 hover:underline">{v.is_upcoming === 1 ? 'Clear upcoming' : 'Set upcoming'}</button>
                    </form>
                    <form method="post" action={`/admin/youtube/${v.id}/toggle`}>
                      <button class="text-xs font-semibold text-slate-500 hover:underline">{v.is_active ? 'Hide' : 'Show'}</button>
                    </form>
                    <form method="post" action={`/admin/youtube/${v.id}/delete`} onsubmit="return confirm('Remove this video?')">
                      <button class="text-xs font-semibold text-rose-600 hover:underline">Delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <div class="space-y-6">
          <Card class="p-5 bg-white">
            <h2 class="font-bold text-slate-900 mb-4">Add YouTube video</h2>
            <form method="post" action="/admin/youtube" class="space-y-4">
              <Field label="YouTube URL or video ID" required hint="e.g. https://youtube.com/watch?v=EP_H_QLpsSs or EP_H_QLpsSs">
                <input name="video_ref" required placeholder="Paste link or ID" class={inputCls} />
              </Field>
              <Field label="Title" hint="Leave blank to auto-fetch from YouTube"><input name="title" class={inputCls} /></Field>
              <Field label="Category"><input name="category" placeholder="Cricket / Football / Highlights" class={inputCls} /></Field>
              <Field label="Display order"><input name="sort_order" type="number" value="10" class={inputCls} /></Field>
              <div class="flex flex-col gap-2 text-sm text-slate-700">
                <label class="flex items-center gap-2"><input type="checkbox" name="is_live" value="1" class="accent-red-500 w-4 h-4" /> Currently live now</label>
                <label class="flex items-center gap-2"><input type="checkbox" name="is_upcoming" value="1" class="accent-red-500 w-4 h-4" /> Upcoming stream</label>
              </div>
              <button class={btnPrimary + ' w-full'}>Add video</button>
            </form>
          </Card>
          <Card class="p-5 bg-white">
            <h3 class="font-bold text-slate-900 mb-2 flex items-center gap-2"><i class="fab fa-youtube text-red-600"></i> Channel</h3>
            <p class="text-sm text-slate-500">Videos are published from the AWADH Sports YouTube channel.</p>
            <a href="https://youtube.com/@awadh_sports." target="_blank" rel="noopener" class="text-sm text-red-600 font-semibold hover:underline">Open channel →</a>
          </Card>
        </div>
      </div>
    </StaffLayout>
  )
})

/** Extract a YouTube video ID from a full URL or a bare ID. */
function parseYouTubeId(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s
  const m =
    s.match(/[?&]v=([A-Za-z0-9_-]{11})/) ||
    s.match(/youtu\.be\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/embed\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/shorts\/([A-Za-z0-9_-]{11})/) ||
    s.match(/\/live\/([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

adminRoutes.post('/youtube', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const vid = parseYouTubeId(String(f.video_ref || ''))
  if (!vid) return c.redirect('/admin/youtube?error=invalid')
  const exists: any = await c.env.DB.prepare(`SELECT id FROM youtube_videos WHERE video_id=?`).bind(vid).first()
  if (exists) return c.redirect('/admin/youtube?error=duplicate')

  // Auto-fetch title from YouTube when not supplied
  let title = String(f.title || '').trim()
  if (!title) {
    try {
      const res = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`)
      if (res.ok) {
        const j: any = await res.json()
        title = String(j.title || '').slice(0, 200)
      }
    } catch { /* offline — fall back below */ }
  }
  if (!title) title = `YouTube video ${vid}`

  await c.env.DB.prepare(
    `INSERT INTO youtube_videos (video_id, title, category, is_live, is_upcoming, sort_order) VALUES (?,?,?,?,?,?)`
  ).bind(vid, title, String(f.category || '') || null, f.is_live ? 1 : 0, f.is_upcoming ? 1 : 0, Number(f.sort_order) || 10).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'youtube.added', entity: 'youtube_videos', details: vid })
  return c.redirect('/admin/youtube')
})

adminRoutes.post('/youtube/:id/state', async (c) => {
  const id = Number(c.req.param('id'))
  const f = await c.req.parseBody()
  const state = String(f.state)
  if (state === 'live') {
    // only one live video at a time
    await c.env.DB.prepare(`UPDATE youtube_videos SET is_live=0`).run()
    await c.env.DB.prepare(`UPDATE youtube_videos SET is_live=1, is_upcoming=0 WHERE id=?`).bind(id).run()
  } else if (state === 'upcoming') {
    await c.env.DB.prepare(`UPDATE youtube_videos SET is_upcoming=1, is_live=0 WHERE id=?`).bind(id).run()
  } else {
    await c.env.DB.prepare(`UPDATE youtube_videos SET is_live=0, is_upcoming=0 WHERE id=?`).bind(id).run()
  }
  return c.redirect('/admin/youtube')
})

adminRoutes.post('/youtube/:id/toggle', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE youtube_videos SET is_active = 1 - is_active WHERE id=?`).bind(id).run()
  return c.redirect('/admin/youtube')
})

adminRoutes.post('/youtube/:id/delete', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM youtube_videos WHERE id=?`).bind(id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'youtube.deleted', entity: 'youtube_videos', entityId: id })
  return c.redirect('/admin/youtube')
})

// ============================================================
// TEAM & ABOUT — admin manages the About-page team members
// ============================================================
adminRoutes.get('/team', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM team_members ORDER BY sort_order`).all()
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/team" title="Team & About">
      <Notice type="info">These people appear on the public <b>About</b> page — for example Founder, Production Manager and Administrator.</Notice>
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <Table cols={['Member', 'Role', 'Contact', 'Order', 'Actions']}>
            {(rows.results as any[]).length === 0 && <tr><td colspan={5}><Empty icon="fa-users-rectangle" title="No team members yet" /></td></tr>}
            {(rows.results as any[]).map((t) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3">
                  <div class="flex items-center gap-3">
                    <span class="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white font-bold flex items-center justify-center text-sm">
                      {esc(t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2))}
                    </span>
                    <div>
                      <div class="font-medium text-slate-800">{esc(t.name)}</div>
                      <div class="text-xs text-slate-400">{t.is_active ? 'Visible' : 'Hidden'}</div>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-3 text-slate-600 text-sm">{esc(t.role)}</td>
                <td class="px-4 py-3 text-slate-500 text-xs">{esc(t.email || '—')}</td>
                <td class="px-4 py-3 text-slate-500 text-sm">{t.sort_order}</td>
                <td class="px-4 py-3">
                  <div class="flex gap-2">
                    <form method="post" action={`/admin/team/${t.id}/toggle`}><button class="text-xs font-semibold text-slate-500 hover:underline">{t.is_active ? 'Hide' : 'Show'}</button></form>
                    <form method="post" action={`/admin/team/${t.id}/delete`} onsubmit="return confirm('Remove this team member?')"><button class="text-xs font-semibold text-rose-600 hover:underline">Delete</button></form>
                  </div>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <Card class="p-5 bg-white">
          <h2 class="font-bold text-slate-900 mb-4">Add team member</h2>
          <form method="post" action="/admin/team" class="space-y-4">
            <Field label="Full name" required><input name="name" required class={inputCls} /></Field>
            <Field label="Role / title" required hint="e.g. Founder, Production Manager, Administrator">
              <input name="role" required class={inputCls} />
            </Field>
            <Field label="Short bio"><textarea name="bio" rows={3} class={inputCls}></textarea></Field>
            <Field label="Email"><input name="email" type="email" class={inputCls} /></Field>
            <Field label="Photo URL"><input name="photo_url" class={inputCls} /></Field>
            <Field label="Display order"><input name="sort_order" type="number" value="10" class={inputCls} /></Field>
            <button class={btnPrimary + ' w-full'}>Add member</button>
          </form>
        </Card>
      </div>
    </StaffLayout>
  )
})

adminRoutes.post('/team', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  await c.env.DB.prepare(
    `INSERT INTO team_members (name, role, bio, email, photo_url, sort_order) VALUES (?,?,?,?,?,?)`
  ).bind(String(f.name || ''), String(f.role || ''), String(f.bio || '') || null, String(f.email || '') || null, String(f.photo_url || '') || null, Number(f.sort_order) || 10).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'team.added', entity: 'team_members', details: String(f.name || '') })
  return c.redirect('/admin/team')
})

adminRoutes.post('/team/:id/toggle', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(`UPDATE team_members SET is_active = 1 - is_active WHERE id=?`).bind(id).run()
  return c.redirect('/admin/team')
})

adminRoutes.post('/team/:id/delete', async (c) => {
  const id = Number(c.req.param('id'))
  await c.env.DB.prepare(`DELETE FROM team_members WHERE id=?`).bind(id).run()
  return c.redirect('/admin/team')
})

// ============================================================
// USERS & LOGINS — admin sees every account and login activity
// ============================================================
adminRoutes.get('/users', async (c) => {
  const user = c.get('user')!
  const role = c.req.query('role')
  const rows = role
    ? await c.env.DB.prepare(`SELECT * FROM users WHERE role=? ORDER BY last_login_at DESC NULLS LAST, created_at DESC`).bind(role).all()
    : await c.env.DB.prepare(`SELECT * FROM users ORDER BY last_login_at DESC NULLS LAST, created_at DESC`).all()
  const [cust, emp, adm, today, week, total, never] = await Promise.all([
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role='customer'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role IN ('employee','manager')`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE role='admin'`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE date(last_login_at)=date('now')`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE last_login_at >= datetime('now','-7 days')`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users`).first<any>(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM users WHERE last_login_at IS NULL`).first<any>(),
  ])
  const logins = await c.env.DB.prepare(
    `SELECT a.*, u.role FROM activity_logs a LEFT JOIN users u ON u.id=a.user_id
      WHERE a.action IN ('auth.login','auth.register','auth.logout') ORDER BY a.created_at DESC LIMIT 40`
  ).all()
  const roleLabel: Record<string, string> = { admin: 'Admin', manager: 'Manager', employee: 'Employee', customer: 'Customer' }
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/users" title="Users & Logins">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Customer accounts" value={cust?.n ?? 0} icon="fa-users" tone="bg-cyan-50 text-cyan-600" />
        <Stat label="Employee accounts" value={emp?.n ?? 0} icon="fa-user-tie" tone="bg-amber-50 text-amber-600" sub="employee + manager" />
        <Stat label="Admin accounts" value={adm?.n ?? 0} icon="fa-user-shield" tone="bg-red-50 text-red-600" />
        <Stat label="Total accounts" value={total?.n ?? 0} icon="fa-users-gear" tone="bg-slate-100 text-slate-600" sub={`${never?.n ?? 0} never signed in`} />
      </div>
      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <Stat label="Logged in today" value={today?.n ?? 0} icon="fa-right-to-bracket" tone="bg-indigo-50 text-indigo-600" />
        <Stat label="Active last 7 days" value={week?.n ?? 0} icon="fa-clock-rotate-left" tone="bg-emerald-50 text-emerald-600" />
      </div>

      <div class="flex flex-wrap gap-2 mb-5">
        <a href="/admin/users" class={`px-3 py-1.5 rounded-lg text-sm font-medium ${!role ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>All</a>
        {['customer', 'employee', 'manager', 'admin'].map((r) => (
          <a href={`/admin/users?role=${r}`} class={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${role === r ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{r}</a>
        ))}
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h2 class="font-bold text-slate-900 mb-3">All accounts</h2>
          <Table cols={['Name', 'Email', 'Role', 'Last login', 'Status', 'Actions']}>
            {(rows.results as any[]).map((r) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-800">{esc(r.full_name)}</td>
                <td class="px-4 py-3 text-slate-500 text-xs">{esc(r.email)}</td>
                <td class="px-4 py-3"><span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600">{roleLabel[r.role] || r.role}</span></td>
                <td class="px-4 py-3 text-slate-500 text-xs">{r.last_login_at ? fmtDateTime(r.last_login_at) : <span class="text-slate-400">never</span>}</td>
                <td class="px-4 py-3"><Chip status={r.is_active ? 'present' : 'absent'} label={r.is_active ? 'active' : 'inactive'} /></td>
                <td class="px-4 py-3">
                  <a href="/admin/users" class="text-xs font-semibold text-red-600 hover:underline">Manage</a>
                </td>
              </tr>
            ))}
          </Table>
        </div>
        <div>
          <h2 class="font-bold text-slate-900 mb-3">Recent login activity</h2>
          <div class="space-y-2">
            {(logins.results as any[]).length === 0 && <Empty icon="fa-clock-rotate-left" title="No login activity yet" />}
            {(logins.results as any[]).map((l) => (
              <Card class="p-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-700 truncate">{esc(l.actor_name || 'User')}</div>
                    <div class="text-xs text-slate-400 truncate">{esc(l.details || '')}</div>
                  </div>
                  <span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase shrink-0">{esc(l.role || '')}</span>
                </div>
                <div class="text-[11px] text-slate-400 mt-1">{esc(l.action.replace('auth.', ''))} · {fmtDateTime(l.created_at)}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
})

// ============================================================
// ATTENDANCE TRACKING — admin monitors every employee's attendance
// ============================================================
adminRoutes.get('/attendance', async (c) => {
  const user = c.get('user')!
  const day = c.req.query('day') || new Date().toISOString().slice(0, 10)
  const [today, summary, perEmp, recent] = await Promise.all([
    c.env.DB.prepare(
      `SELECT a.*, u.full_name, u.email, e.emp_code, e.department, e.designation
         FROM attendance a JOIN employees e ON e.id=a.employee_id JOIN users u ON u.id=e.user_id
        WHERE a.work_date=? ORDER BY u.full_name`
    ).bind(day).all(),
    c.env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM employees WHERE status='active') AS active_emp,
         (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status IN ('present','late')) AS present_today,
         (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='late') AS late_today,
         (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='absent') AS absent_today,
         (SELECT COUNT(*) FROM attendance WHERE strftime('%Y-%m', work_date)=strftime('%Y-%m','now') AND status IN ('present','late')) AS month_present`
    ).bind(day, day, day).first<any>(),
    c.env.DB.prepare(
      `SELECT e.id, u.full_name, e.emp_code, e.department,
              (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND strftime('%Y-%m', a.work_date)=strftime('%Y-%m','now') AND a.status IN ('present','late')) AS present_m,
              (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND strftime('%Y-%m', a.work_date)=strftime('%Y-%m','now') AND a.status='late') AS late_m,
              (SELECT COUNT(*) FROM attendance a WHERE a.employee_id=e.id AND strftime('%Y-%m', a.work_date)=strftime('%Y-%m','now') AND a.status='absent') AS absent_m,
              (SELECT a.status FROM attendance a WHERE a.employee_id=e.id AND a.work_date=? ) AS today_status
         FROM employees e JOIN users u ON u.id=e.user_id
        ORDER BY u.full_name`
    ).bind(day).all(),
    c.env.DB.prepare(
      `SELECT a.*, u.full_name FROM attendance a JOIN employees e ON e.id=a.employee_id JOIN users u ON u.id=e.user_id
        ORDER BY a.work_date DESC, a.check_in DESC LIMIT 25`
    ).all(),
  ])
  const present = today.results as any[]
  return c.html(
    <StaffLayout user={user} nav="admin" current="/admin/attendance" title="Attendance Tracking">
      <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Stat label="Active employees" value={summary?.active_emp ?? 0} icon="fa-id-badge" tone="bg-slate-100 text-slate-600" />
        <Stat label={`Present (${day})`} value={summary?.present_today ?? 0} icon="fa-fingerprint" tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Late today" value={summary?.late_today ?? 0} icon="fa-clock" tone="bg-amber-50 text-amber-600" />
        <Stat label="Absent today" value={summary?.absent_today ?? 0} icon="fa-xmark" tone="bg-rose-50 text-rose-600" />
        <Stat label="Present this month" value={summary?.month_present ?? 0} icon="fa-calendar-check" tone="bg-cyan-50 text-cyan-600" />
      </div>

      <Card class="p-4 mb-6">
        <form method="get" action="/admin/attendance" class="flex flex-wrap items-end gap-3">
          <Field label="View date"><input type="date" name="day" value={day} class={inputCls} /></Field>
          <button class={btnPrimary}>Load</button>
          <a href={`/admin/attendance/export?day=${day}`} class={btnGhost}><i class="fas fa-file-csv"></i> Export CSV</a>
        </form>
      </Card>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2">
          <h2 class="font-bold text-slate-900 mb-3">Checked in on {day}</h2>
          {present.length === 0 ? <Empty icon="fa-fingerprint" title="No attendance marked" text="No employee has checked in on this date." /> : (
            <Table cols={['Employee', 'Code', 'Department', 'Check in', 'Check out', 'Status']}>
              {present.map((r) => (
                <tr class="hover:bg-slate-50">
                  <td class="px-4 py-3 font-medium text-slate-800">{esc(r.full_name)}</td>
                  <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.emp_code || '—')}</td>
                  <td class="px-4 py-3 text-slate-500">{esc(r.department || '—')}</td>
                  <td class="px-4 py-3 text-slate-500">{r.check_in ? fmtDateTime(r.check_in).split(', ')[1] : '—'}</td>
                  <td class="px-4 py-3 text-slate-500">{r.check_out ? fmtDateTime(r.check_out).split(', ')[1] : '—'}</td>
                  <td class="px-4 py-3"><Chip status={r.status} /></td>
                </tr>
              ))}
            </Table>
          )}
        </div>
        <div>
          <h2 class="font-bold text-slate-900 mb-3">Recent attendance</h2>
          <div class="space-y-2">
            {recent.results.length === 0 && <Empty icon="fa-clock-rotate-left" title="No records yet" />}
            {(recent.results as any[]).map((r) => (
              <Card class="p-3">
                <div class="flex items-center justify-between gap-2">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-700 truncate">{esc(r.full_name)}</div>
                    <div class="text-xs text-slate-400">{fmtDate(r.work_date)} · {r.check_in ? fmtDateTime(r.check_in).split(', ')[1] : '—'}</div>
                  </div>
                  <Chip status={r.status} />
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <h2 class="font-bold text-slate-900 mt-8 mb-3">Month summary by employee</h2>
      <Table cols={['Employee', 'Code', 'Department', 'Present', 'Late', 'Absent', `Status ${day}`]}>
        {(perEmp.results as any[]).map((r) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-800">{esc(r.full_name)}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.emp_code || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{esc(r.department || '—')}</td>
            <td class="px-4 py-3 font-semibold text-emerald-600">{r.present_m ?? 0}</td>
            <td class="px-4 py-3 font-semibold text-amber-600">{r.late_m ?? 0}</td>
            <td class="px-4 py-3 font-semibold text-rose-600">{r.absent_m ?? 0}</td>
            <td class="px-4 py-3">{r.today_status ? <Chip status={r.today_status} /> : <span class="text-xs text-slate-400">not marked</span>}</td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

adminRoutes.get('/attendance/export', async (c) => {
  const day = c.req.query('day') || new Date().toISOString().slice(0, 10)
  const rows = await c.env.DB.prepare(
    `SELECT u.full_name, u.email, e.emp_code, e.department, a.work_date, a.check_in, a.check_out, a.status, a.notes
       FROM attendance a JOIN employees e ON e.id=a.employee_id JOIN users u ON u.id=e.user_id
      WHERE a.work_date=? ORDER BY u.full_name`
  ).bind(day).all()
  const head = 'Name,Email,Employee Code,Department,Date,Check In,Check Out,Status,Notes\n'
  const body = (rows.results as any[])
    .map((r) => [r.full_name, r.email, r.emp_code, r.department, r.work_date, r.check_in, r.check_out, r.status, r.notes].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  return new Response(head + body, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="attendance-${day}.csv"` },
  })
})
