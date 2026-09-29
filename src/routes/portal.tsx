// ============================================================
// EMPLOYEE PORTAL — staff ka apna kaam wala dashboard
// Ismein: dashboard, attendance (check-in/out), mere tasks, mere events,
// production schedule, equipment, media upload, issue report, leave
// aur notifications.
// (Har section ke upar alag Hinglish comment bhi hai.)
// ============================================================
import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { StaffLayout, Notice } from '../lib/staff_layout'
import { Stat, Card, Table, Empty, Chip, btnPrimary, btnGhost, inputCls, Field, ImageUploadField } from '../lib/components'
import { fmtDate, fmtDateTime, esc, logActivity } from '../lib/utils'
import { canAccess } from '../lib/auth'

export const portalRoutes = new Hono<AppEnv>()

// Guard: staff only
portalRoutes.use('*', async (c, next) => {
  const user = c.get('user')
  if (!user) return c.redirect('/login')
  if (user.role === 'customer') return c.redirect('/')
  await next()
})

// ---------- DASHBOARD ----------
portalRoutes.get('/', async (c) => {
  const user = c.get('user')!
  const empId = user.employee_id
  const today = new Date().toISOString().slice(0, 10)
  const [att, tasks, events, notifs, leaves] = await Promise.all([
    c.env.DB.prepare(`SELECT * FROM attendance WHERE employee_id=? AND work_date=?`).bind(empId, today).first(),
    c.env.DB.prepare(`SELECT t.*, e.name AS event_name FROM tasks t LEFT JOIN events e ON e.id=t.event_id WHERE t.assigned_to=? AND t.status NOT IN ('completed','cancelled') ORDER BY CASE t.priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, t.due_date LIMIT 6`).bind(empId).all(),
    c.env.DB.prepare(`SELECT e.* , et.role FROM event_team et JOIN events e ON e.id=et.event_id WHERE et.employee_id=? AND e.start_date >= date('now') ORDER BY e.start_date LIMIT 5`).bind(empId).all(),
    c.env.DB.prepare(`SELECT * FROM notifications WHERE (user_id=? OR audience='employees') ORDER BY created_at DESC LIMIT 6`).bind(user.id).all(),
    c.env.DB.prepare(`SELECT COUNT(*) n FROM leave_requests WHERE employee_id=? AND status='pending'`).bind(empId).first<any>(),
  ])
  const openTasks = await c.env.DB.prepare(`SELECT COUNT(*) n FROM tasks WHERE assigned_to=? AND status NOT IN ('completed','cancelled')`).bind(empId).first<any>()
  const monthPresent = await c.env.DB.prepare(`SELECT COUNT(*) n FROM attendance WHERE employee_id=? AND status IN ('present','half_day','late') AND strftime('%Y-%m', work_date)=strftime('%Y-%m','now')`).bind(empId).first<any>()
  const attStatus = att ? (att as any).status : null
  const attLabel = attStatus === 'half_day' ? 'Half day' : attStatus === 'late' ? 'Late' : attStatus ? 'Present' : 'Not checked in'

  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal" title="Dashboard">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Today" value={attLabel} icon="fa-fingerprint" sub={att ? `In: ${(att as any).check_in ? (att as any).check_in.slice(11, 16) : '—'}` : 'Check in below'} />
        <Stat label="Open tasks" value={openTasks?.n ?? 0} icon="fa-list-check" tone="bg-cyan-50 text-cyan-600" />
        <Stat label="This month present" value={monthPresent?.n ?? 0} icon="fa-calendar-check" tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Pending leave" value={leaves?.n ?? 0} icon="fa-plane-departure" tone="bg-amber-50 text-amber-600" />
      </div>

      <div class="grid lg:grid-cols-3 gap-6">
        <div class="lg:col-span-2 space-y-6">
          <Card class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-bold text-slate-900">My Tasks</h2>
              <a href="/portal/tasks" class="text-sm text-red-600 font-semibold">View all</a>
            </div>
            {(tasks.results as any[]).length === 0 ? <Empty icon="fa-list-check" title="No open tasks" text="You're all caught up." /> : (
              <div class="space-y-3">
                {(tasks.results as any[]).map((t) => (
                  <div class="flex items-center gap-4 p-3 rounded-xl border border-slate-100 hover:bg-slate-50">
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-slate-800 truncate">{esc(t.title)}</div>
                      <div class="text-xs text-slate-400 mt-0.5">{t.event_name ? `${esc(t.event_name)} · ` : ''}Due {fmtDate(t.due_date)}</div>
                    </div>
                    <Chip status={t.priority} label={t.priority} />
                    <Chip status={t.status} />
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card class="p-5">
            <div class="flex items-center justify-between mb-4">
              <h2 class="font-bold text-slate-900">My Upcoming Events</h2>
              <a href="/portal/events" class="text-sm text-red-600 font-semibold">View all</a>
            </div>
            {(events.results as any[]).length === 0 ? <Empty icon="fa-trophy" title="No upcoming events" /> : (
              <div class="space-y-3">
                {(events.results as any[]).map((e) => (
                  <div class="flex items-center gap-4 p-3 rounded-xl border border-slate-100">
                    <span class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><i class="fas fa-trophy"></i></span>
                    <div class="min-w-0 flex-1">
                      <div class="font-medium text-slate-800 truncate">{esc(e.name)}</div>
                      <div class="text-xs text-slate-400">{fmtDate(e.start_date)} · {esc(e.venue_name || 'TBA')}</div>
                    </div>
                    <span class="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 capitalize">{esc(e.role)}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div class="space-y-6">
          <Card class="p-5">
            <h2 class="font-bold text-slate-900 mb-3">Attendance</h2>
            <div id="att-msg" class="hidden text-sm rounded-xl px-3 py-2 mb-3"></div>
            <div class="flex gap-3">
              <button id="btn-checkin" class={`${btnPrimary} flex-1`} disabled={!!att}><i class="fas fa-right-to-bracket"></i> Check In</button>
              <button id="btn-checkout" class={`${btnGhost} flex-1`} disabled={!att || !!(att as any)?.check_out}><i class="fas fa-right-from-bracket"></i> Check Out</button>
            </div>
            {att && <p class="text-xs text-slate-400 mt-3">Checked in at {fmtDateTime((att as any).check_in)}</p>}
          </Card>
          <Card class="p-5">
            <div class="flex items-center justify-between mb-3">
              <h2 class="font-bold text-slate-900">Notifications</h2>
              <form method="post" action="/portal/notifications/read"><button class="text-xs text-slate-400 hover:text-slate-700">Mark all read</button></form>
            </div>
            {(notifs.results as any[]).length === 0 ? <p class="text-sm text-slate-400">No notifications.</p> : (
              <ul class="space-y-3">
                {(notifs.results as any[]).map((n) => (
                  <li class="flex gap-3">
                    <span class={`w-2 h-2 rounded-full mt-1.5 ${(n as any).is_read ? 'bg-slate-300' : 'bg-red-500'}`}></span>
                    <div><div class="text-sm font-medium text-slate-700">{esc(n.title)}</div><div class="text-xs text-slate-400">{esc(n.body)}</div></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
      <script src="/static/dashboard.js"></script>
    </StaffLayout>
  )
})

// ---------- ATTENDANCE ----------
portalRoutes.get('/attendance', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM attendance WHERE employee_id=? ORDER BY work_date DESC LIMIT 60`).bind(user.employee_id).all()
  const summary = await c.env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) present,
       SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) half_day,
       SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) absent,
       SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) late
     FROM attendance WHERE employee_id=? AND strftime('%Y-%m', work_date)=strftime('%Y-%m','now')`
  ).bind(user.employee_id).first<any>()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/attendance" title="Attendance">
      <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="Present this month" value={summary?.present ?? 0} icon="fa-check" tone="bg-emerald-50 text-emerald-600" />
        <Stat label="Half days" value={summary?.half_day ?? 0} icon="fa-circle-half-stroke" tone="bg-orange-50 text-orange-600" />
        <Stat label="Absent this month" value={summary?.absent ?? 0} icon="fa-xmark" tone="bg-rose-50 text-rose-600" />
        <Stat label="Late check-ins" value={summary?.late ?? 0} icon="fa-clock" tone="bg-amber-50 text-amber-600" />
      </div>
      <div class="mb-5 rounded-2xl bg-white/60 border border-slate-200 px-4 py-3 text-sm text-slate-600">
        <i class="fas fa-circle-info text-red-500 mr-1"></i> Check-in after <b>9:00 AM</b> is marked a <b>half day</b>, which reduces the payable salary for that day. Check-out records your actual departure time.
      </div>
      <Table cols={['Date', 'Check In', 'Check Out', 'Status', 'Notes']}>
        {(rows.results as any[]).map((r) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-700">{fmtDate(r.work_date)}</td>
            <td class="px-4 py-3 text-slate-500">{r.check_in ? String(r.check_in).slice(11, 16) : '—'}</td>
            <td class="px-4 py-3 text-slate-500">{r.check_out ? String(r.check_out).slice(11, 16) : '—'}</td>
            <td class="px-4 py-3"><Chip status={r.status} /></td>
            <td class="px-4 py-3 text-slate-400">{esc(r.notes || '')}</td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

// ---------- MY TASKS ----------
portalRoutes.get('/tasks', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT t.*, e.name AS event_name FROM tasks t LEFT JOIN events e ON e.id=t.event_id WHERE t.assigned_to=? ORDER BY t.created_at DESC`).bind(user.employee_id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/tasks" title="My Tasks">
      <div class="grid md:grid-cols-2 gap-4">
        {(rows.results as any[]).length === 0 && <Empty icon="fa-list-check" title="No tasks assigned" />}
        {(rows.results as any[]).map((t) => (
          <Card class="p-5">
            <div class="flex items-start justify-between gap-3">
              <h3 class="font-bold text-slate-900">{esc(t.title)}</h3>
              <Chip status={t.priority} label={t.priority} />
            </div>
            <p class="text-sm text-slate-500 mt-2">{esc(t.description || '')}</p>
            <div class="flex flex-wrap gap-3 text-xs text-slate-400 mt-3">
              {t.event_name && <span><i class="fas fa-trophy mr-1"></i>{esc(t.event_name)}</span>}
              <span><i class="fas fa-calendar mr-1"></i>Due {fmtDate(t.due_date)}</span>
            </div>
            <div class="flex items-center gap-3 mt-4">
              <Chip status={t.status} />
              <form method="post" action={`/portal/tasks/${t.id}/status`} class="flex items-center gap-2 ml-auto">
                <select name="status" class="text-sm rounded-lg border border-slate-300 px-2 py-1.5">
                  {['pending','in_progress','review','completed'].map((s)=><option value={s} selected={t.status===s}>{s.replace('_',' ')}</option>)}
                </select>
                <button class="text-sm px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium">Update</button>
              </form>
            </div>
          </Card>
        ))}
      </div>
    </StaffLayout>
  )
})

portalRoutes.post('/tasks/:id/status', async (c) => {
  const user = c.get('user')!
  const id = Number(c.req.param('id'))
  const form = await c.req.parseBody()
  const status = String(form.status || '')
  const task: any = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id=? AND assigned_to=?`).bind(id, user.employee_id).first()
  if (task && ['pending','in_progress','review','completed'].includes(status)) {
    await c.env.DB.prepare(`UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(status, id).run()
    await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'task.status', entity: 'tasks', entityId: id, details: status })
  }
  return c.redirect('/portal/tasks')
})

// ---------- MY EVENTS ----------
portalRoutes.get('/events', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT e.*, et.role FROM event_team et JOIN events e ON e.id=et.event_id WHERE et.employee_id=? ORDER BY COALESCE(e.start_date,'9999') DESC`).bind(user.employee_id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/events" title="My Events">
      <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(rows.results as any[]).length === 0 && <Empty icon="fa-trophy" title="No events assigned" />}
        {(rows.results as any[]).map((e) => (
          <Card class="p-5">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize">{esc(e.role)}</span>
              <Chip status={e.status} />
            </div>
            <h3 class="font-bold text-slate-900">{esc(e.name)}</h3>
            <div class="text-sm text-slate-500 mt-2 space-y-1">
              <div><i class="fas fa-calendar w-4 text-slate-400"></i> {fmtDate(e.start_date)}</div>
              <div><i class="fas fa-location-dot w-4 text-slate-400"></i> {esc(e.venue_name || 'TBA')}</div>
              <div><i class="fas fa-clock w-4 text-slate-400"></i> Report: {esc(e.reporting_time || 'TBA')}</div>
            </div>
          </Card>
        ))}
      </div>
    </StaffLayout>
  )
})

// ---------- PRODUCTION SCHEDULE ----------
portalRoutes.get('/schedule', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT ps.*, e.name AS event_name FROM production_schedule ps JOIN events e ON e.id=ps.event_id
     JOIN event_team et ON et.event_id=e.id WHERE et.employee_id=? ORDER BY ps.start_time`
  ).bind(user.employee_id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/schedule" title="Production Schedule">
      {(rows.results as any[]).length === 0 ? <Empty icon="fa-calendar-day" title="No schedule items" text="Your event schedules will appear here." /> : (
        <div class="space-y-3">
          {(rows.results as any[]).map((s) => (
            <Card class="p-4 flex items-center gap-4">
              <span class="px-3 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-bold uppercase">{esc(s.milestone)}</span>
              <div class="flex-1"><div class="font-medium text-slate-800">{esc(s.event_name)}</div><div class="text-xs text-slate-400">{esc(s.notes || '')}</div></div>
              <div class="text-sm text-slate-500">{fmtDateTime(s.start_time)}</div>
            </Card>
          ))}
        </div>
      )}
    </StaffLayout>
  )
})

// ---------- EQUIPMENT ----------
portalRoutes.get('/equipment', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(
    `SELECT ea.*, eq.name, eq.category, eq.serial_no, e.name AS event_name FROM equipment_assignments ea
     JOIN equipment eq ON eq.id=ea.equipment_id LEFT JOIN events e ON e.id=ea.event_id
     WHERE ea.employee_id=? ORDER BY ea.issued_at DESC`
  ).bind(user.employee_id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/equipment" title="Equipment">
      <Table cols={['Equipment', 'Category', 'Serial', 'Event', 'Issued', 'Status']}>
        {(rows.results as any[]).map((r) => (
          <tr class="hover:bg-slate-50">
            <td class="px-4 py-3 font-medium text-slate-700">{esc(r.name)}</td>
            <td class="px-4 py-3 text-slate-500 capitalize">{esc(r.category || '—')}</td>
            <td class="px-4 py-3 text-slate-500 font-mono text-xs">{esc(r.serial_no || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{esc(r.event_name || '—')}</td>
            <td class="px-4 py-3 text-slate-500">{fmtDate(r.issued_at)}</td>
            <td class="px-4 py-3"><Chip status={r.status === 'issued' ? 'in_progress' : r.status === 'returned' ? 'completed' : 'cancelled'} label={r.status} /></td>
          </tr>
        ))}
      </Table>
    </StaffLayout>
  )
})

// ---------- MEDIA UPLOAD ----------
portalRoutes.get('/media', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT m.*, e.name AS event_name FROM media m LEFT JOIN events e ON e.id=m.event_id WHERE m.uploaded_by=? ORDER BY m.created_at DESC`).bind(user.employee_id).all()
  const events = await c.env.DB.prepare(`SELECT id, name FROM events ORDER BY start_date DESC LIMIT 50`).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/media" title="Media Upload">
      <div class="grid lg:grid-cols-3 gap-6">
        <Card class="p-5 lg:col-span-1">
          <h2 class="font-bold text-slate-900 mb-4">Submit media</h2>
          <form method="post" action="/portal/media" class="space-y-4">
            <Field label="Title" required><input name="title" required class={inputCls} /></Field>
            <Field label="Type">
              <select name="media_type" class={inputCls}>
                {['photo','video','highlight','reel','interview'].map((t)=><option value={t} class="capitalize">{t}</option>)}
              </select>
            </Field>
            <ImageUploadField name="url" label="Image / file" hint="Upload the photo from your device, Drive or Photos." />
            <ImageUploadField name="thumbnail" label="Thumbnail (optional)" hint="Used as the preview card image." />
            <Field label="Or paste a video / external URL"><input name="url_external" class={inputCls} placeholder="https://... (optional)" /></Field>
            <Field label="Event">
              <select name="event_id" class={inputCls}><option value="">— Select —</option>
                {(events.results as any[]).map((e)=><option value={e.id}>{esc(e.name)}</option>)}
              </select>
            </Field>
            <button class={btnPrimary + ' w-full'}>Submit for approval</button>
          </form>
          <p class="text-xs text-slate-400 mt-3"><i class="fas fa-info-circle"></i> Submissions require admin approval before publishing.</p>
        </Card>
        <div class="lg:col-span-2">
          <Table cols={['Title', 'Type', 'Event', 'Status', 'Submitted']}>
            {(rows.results as any[]).map((m) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 font-medium text-slate-700">{esc(m.title)}</td>
                <td class="px-4 py-3 text-slate-500 capitalize">{esc(m.media_type)}</td>
                <td class="px-4 py-3 text-slate-500">{esc(m.event_name || '—')}</td>
                <td class="px-4 py-3"><Chip status={m.status === 'approved' ? 'completed' : m.status === 'rejected' ? 'cancelled' : 'pending'} label={m.status} /></td>
                <td class="px-4 py-3 text-slate-500">{fmtDate(m.created_at)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </StaffLayout>
  )
})

portalRoutes.post('/media', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  const url = String(f.url || '').trim() || String(f.url_external || '').trim()
  const thumb = String(f.thumbnail || '').trim() || null
  await c.env.DB.prepare(`INSERT INTO media (title, media_type, url, thumbnail, event_id, uploaded_by, status) VALUES (?,?,?,?,?,?, 'pending')`)
    .bind(String(f.title), String(f.media_type || 'photo'), url, thumb, f.event_id ? Number(f.event_id) : null, user.employee_id).run()
  await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES ('Media awaiting approval', ?, '/admin/media', 'admins')`).bind(String(f.title)).run()
  return c.redirect('/portal/media')
})

// ---------- ISSUES ----------
portalRoutes.get('/issues', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT i.*, e.name AS event_name FROM issue_reports i LEFT JOIN events e ON e.id=i.event_id WHERE i.employee_id=? ORDER BY i.created_at DESC`).bind(user.employee_id).all()
  const events = await c.env.DB.prepare(`SELECT id, name FROM events WHERE status IN ('upcoming','live') ORDER BY start_date DESC`).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/issues" title="Issue Reports">
      <div class="grid lg:grid-cols-3 gap-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Report an issue</h2>
          <form method="post" action="/portal/issues" class="space-y-4">
            <Field label="Title" required><input name="title" required class={inputCls} /></Field>
            <Field label="Description"><textarea name="description" rows={3} class={inputCls}></textarea></Field>
            <Field label="Severity">
              <select name="severity" class={inputCls}>{['low','medium','high','critical'].map((s)=><option value={s} selected={s==='medium'} class="capitalize">{s}</option>)}</select>
            </Field>
            <Field label="Event">
              <select name="event_id" class={inputCls}><option value="">— None —</option>
                {(events.results as any[]).map((e)=><option value={e.id}>{esc(e.name)}</option>)}
              </select>
            </Field>
            <Field label="Media URL"><input name="media_url" class={inputCls} placeholder="https://..." /></Field>
            <button class={btnPrimary + ' w-full'}>Submit report</button>
          </form>
        </Card>
        <div class="lg:col-span-2">
          <div class="space-y-3">
            {(rows.results as any[]).length === 0 && <Empty icon="fa-triangle-exclamation" title="No issues reported" />}
            {(rows.results as any[]).map((i) => (
              <Card class="p-4">
                <div class="flex items-center justify-between gap-3">
                  <h3 class="font-semibold text-slate-800">{esc(i.title)}</h3>
                  <div class="flex gap-2"><Chip status={i.severity} label={i.severity} /><Chip status={i.status === 'open' ? 'open' : i.status === 'resolved' ? 'resolved' : 'in_progress'} label={i.status} /></div>
                </div>
                <p class="text-sm text-slate-500 mt-2">{esc(i.description || '')}</p>
                {i.resolution && <p class="text-sm text-emerald-700 mt-2"><i class="fas fa-check mr-1"></i>{esc(i.resolution)}</p>}
                <div class="text-xs text-slate-400 mt-2">{esc(i.event_name || '')} · {fmtDateTime(i.created_at)}</div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </StaffLayout>
  )
})

portalRoutes.post('/issues', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO issue_reports (employee_id, event_id, title, description, severity, media_url) VALUES (?,?,?,?,?,?)`)
    .bind(user.employee_id, f.event_id ? Number(f.event_id) : null, String(f.title), String(f.description || ''), String(f.severity || 'medium'), String(f.media_url || '') || null).run()
  await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES ('New issue report', ?, '/admin/tasks', 'admins')`).bind(String(f.title)).run()
  return c.redirect('/portal/issues')
})

// ---------- LEAVE ----------
portalRoutes.get('/leave', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM leave_requests WHERE employee_id=? ORDER BY created_at DESC`).bind(user.employee_id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/leave" title="Leave">
      <div class="grid lg:grid-cols-3 gap-6">
        <Card class="p-5">
          <h2 class="font-bold text-slate-900 mb-4">Request leave</h2>
          <form method="post" action="/portal/leave" class="space-y-4">
            <Field label="From" required><input type="date" name="from_date" required class={inputCls} /></Field>
            <Field label="To" required><input type="date" name="to_date" required class={inputCls} /></Field>
            <Field label="Reason"><textarea name="reason" rows={3} class={inputCls}></textarea></Field>
            <button class={btnPrimary + ' w-full'}>Submit request</button>
          </form>
        </Card>
        <div class="lg:col-span-2">
          <Table cols={['From', 'To', 'Reason', 'Status', 'Requested']}>
            {(rows.results as any[]).map((l) => (
              <tr class="hover:bg-slate-50">
                <td class="px-4 py-3 text-slate-700">{fmtDate(l.from_date)}</td>
                <td class="px-4 py-3 text-slate-700">{fmtDate(l.to_date)}</td>
                <td class="px-4 py-3 text-slate-500">{esc(l.reason || '—')}</td>
                <td class="px-4 py-3"><Chip status={l.status === 'approved' ? 'approved' : l.status === 'rejected' ? 'rejected' : 'pending'} label={l.status} /></td>
                <td class="px-4 py-3 text-slate-500">{fmtDate(l.created_at)}</td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </StaffLayout>
  )
})

portalRoutes.post('/leave', async (c) => {
  const user = c.get('user')!
  const f = await c.req.parseBody()
  await c.env.DB.prepare(`INSERT INTO leave_requests (employee_id, from_date, to_date, reason) VALUES (?,?,?,?)`)
    .bind(user.employee_id, String(f.from_date), String(f.to_date), String(f.reason || '')).run()
  await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES ('Leave request', ?, '/admin/employees', 'admins')`).bind(`${user.full_name} requested leave`).run()
  return c.redirect('/portal/leave')
})

// ---------- NOTIFICATIONS ----------
portalRoutes.get('/notifications', async (c) => {
  const user = c.get('user')!
  const rows = await c.env.DB.prepare(`SELECT * FROM notifications WHERE user_id=? OR audience IN ('employees','all') ORDER BY created_at DESC LIMIT 100`).bind(user.id).all()
  return c.html(
    <StaffLayout user={user} nav="portal" current="/portal/notifications" title="Notifications">
      <div class="flex justify-end mb-4">
        <form method="post" action="/portal/notifications/read"><button class={btnGhost}>Mark all as read</button></form>
      </div>
      <div class="space-y-3">
        {(rows.results as any[]).length === 0 && <Empty icon="fa-bell" title="No notifications" />}
        {(rows.results as any[]).map((n) => (
          <Card class={`p-4 ${!(n as any).is_read ? 'border-l-4 border-l-red-500' : ''}`}>
            <div class="flex items-center justify-between"><div class="font-semibold text-slate-800">{esc(n.title)}</div><span class="text-xs text-slate-400">{fmtDateTime(n.created_at)}</span></div>
            <p class="text-sm text-slate-500 mt-1">{esc(n.body || '')}</p>
          </Card>
        ))}
      </div>
    </StaffLayout>
  )
})

portalRoutes.post('/notifications/read', async (c) => {
  const user = c.get('user')!
  await c.env.DB.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`).bind(user.id).run()
  return c.redirect(c.req.header('Referer')?.replace(/^https?:\/\/[^/]+/, '') || '/portal/notifications')
})
