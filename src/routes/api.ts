import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { makeBookingCode, esc, rateLimit } from '../lib/utils'
import { createBookingOtp, verifyOtp, normalizePhone, maskPhone, maskEmail } from '../lib/otp'
import { logActivity } from '../lib/utils'
import { istNow, parseClock, classifyCheckin, getSetting, fmtClock } from '../lib/policy'

export const apiRoutes = new Hono<AppEnv>()

function ip(c: any): string {
  return c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown'
}

// ============================================================
// PUBLIC: Submit booking (no login) — Section 6
// ============================================================
apiRoutes.post('/bookings', async (c) => {
  const key = `book:${ip(c)}`
  if (!rateLimit(key, 10, 60_000)) return c.json({ error: 'Too many requests. Please try again shortly.' }, 429)

  const body = await c.req.json<any>().catch(() => null)
  if (!body) return c.json({ error: 'Invalid request' }, 400)

  const name = (body.contact_name || '').trim()
  const phone = (body.contact_phone || '').trim()
  const email = (body.contact_email || '').trim()
  if (!name || !phone) return c.json({ error: 'Name and phone are required.' }, 400)

  const bookingCode = makeBookingCode()
  const db = c.env.DB

  // Upsert customer (no login)
  let customerId: number | null = null
  const existing: any = await db.prepare(`SELECT id FROM customers WHERE phone = ? LIMIT 1`).bind(phone).first()
  if (existing) {
    customerId = existing.id
    await db.prepare(`UPDATE customers SET name=?, email=COALESCE(NULLIF(?,''),email), organization=COALESCE(NULLIF(?,''),organization) WHERE id=?`)
      .bind(name, email, body.organization || '', customerId).run()
  } else {
    const res = await db.prepare(`INSERT INTO customers (name, email, phone, organization) VALUES (?,?,?,?)`)
      .bind(name, email || null, phone, body.organization || null).run()
    customerId = Number(res.meta.last_row_id)
  }

  const res = await db.prepare(
    `INSERT INTO bookings (booking_code, customer_id, contact_name, contact_email, contact_phone, organization, event_name, sport, event_date, venue, city, requirements, budget)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
    .bind(bookingCode, customerId, name, email || null, phone, body.organization || null, body.event_name || null, body.sport || null,
      body.event_date || null, body.venue || null, body.city || null, body.requirements || null, body.budget || null)
    .run()
  const bookingId = Number(res.meta.last_row_id)

  // Link selected services
  const svcIds: number[] = Array.isArray(body.services) ? body.services.map(Number).filter(Boolean) : []
  for (const sid of svcIds) {
    await db.prepare(`INSERT OR IGNORE INTO booking_services (booking_id, service_id) VALUES (?,?)`).bind(bookingId, sid).run()
  }

  // Welcome message (customer visible)
  await db.prepare(`INSERT INTO booking_messages (booking_id, sender_type, sender_name, message) VALUES (?, 'staff', 'AWADH Sports Live', ?)`)
    .bind(bookingId, `Thank you ${name}, your request has been received. Our team will review it and respond shortly.`)
    .run()

  await logActivity(db, { action: 'booking.created', entity: 'bookings', entityId: bookingId, details: bookingCode, ip: ip(c) })
  await db.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES (?,?,?, 'admins')`)
    .bind('New booking request', `${bookingCode} from ${name}`, `/admin/bookings/${bookingId}`).run()

  return c.json({ ok: true, booking_code: bookingCode, id: bookingId })
})

// ============================================================
// PUBLIC: OTP request for booking tracking — Section 6
// ============================================================
apiRoutes.post('/bookings/track/request-otp', async (c) => {
  const key = `otp:${ip(c)}`
  if (!rateLimit(key, 5, 5 * 60_000)) return c.json({ error: 'Too many OTP requests. Please wait a few minutes.' }, 429)

  const body = await c.req.json<any>().catch(() => ({}))
  const code = (body.booking_code || '').trim().toUpperCase()
  if (!code) return c.json({ error: 'Booking ID is required.' }, 400)

  const booking: any = await c.env.DB.prepare(`SELECT id, contact_phone, contact_email FROM bookings WHERE booking_code = ?`).bind(code).first()
  if (!booking) return c.json({ error: 'Booking ID not found. Please check and try again.' }, 404)
  if (booking.contact_phone && booking.contact_phone !== body.phone && body.phone) {
    // optional extra factor
  }

  const { destination, devCode } = await createBookingOtp(c.env, booking.id, booking.contact_phone, booking.contact_email)
  await logActivity(c.env.DB, { action: 'otp.requested', entity: 'bookings', entityId: booking.id, ip: ip(c) })

  // The OTP is shown directly on screen so the customer can use it right away.
  return c.json({ ok: true, destination, otp: devCode })
})

apiRoutes.post('/bookings/track/verify', async (c) => {
  const key = `otpv:${ip(c)}`
  if (!rateLimit(key, 15, 5 * 60_000)) return c.json({ error: 'Too many attempts. Please wait.' }, 429)

  const body = await c.req.json<any>().catch(() => ({}))
  const code = (body.booking_code || '').trim().toUpperCase()
  const otp = (body.code || '').trim()
  if (!code || !otp) return c.json({ error: 'Booking ID and OTP are required.' }, 400)

  const booking: any = await c.env.DB.prepare(`SELECT * FROM bookings WHERE booking_code = ?`).bind(code).first()
  if (!booking) return c.json({ error: 'Booking ID not found.' }, 404)

  const row: any = await c.env.DB.prepare(
    `SELECT * FROM otp_codes WHERE booking_id = ? AND used = 0 AND expires_at > datetime('now') ORDER BY id DESC LIMIT 1`
  )
    .bind(booking.id)
    .first()
  if (!row) return c.json({ error: 'No active OTP. Please request a new one.' }, 400)
  if (row.attempts >= 5) return c.json({ error: 'Too many failed attempts. Request a new OTP.' }, 429)

  const [salt, dest] = String(row.destination).split(':')
  const ok = await verifyOtp(otp, salt, row.code_hash)
  if (!ok) {
    await c.env.DB.prepare(`UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?`).bind(row.id).run()
    return c.json({ error: 'Incorrect OTP. Please try again.' }, 400)
  }
  await c.env.DB.prepare(`UPDATE otp_codes SET used = 1 WHERE id = ?`).bind(row.id).run()
  await logActivity(c.env.DB, { action: 'otp.verified', entity: 'bookings', entityId: booking.id, ip: ip(c) })

  // Gather customer-visible data only
  const [messages, quotations, documents, services] = await Promise.all([
    c.env.DB.prepare(`SELECT sender_type, sender_name, message, created_at FROM booking_messages WHERE booking_id=? AND is_visible=1 ORDER BY created_at`).bind(booking.id).all(),
    c.env.DB.prepare(`SELECT amount, currency, details, status, valid_until, file_url, created_at FROM quotations WHERE booking_id=? ORDER BY created_at DESC`).bind(booking.id).all(),
    c.env.DB.prepare(`SELECT title, file_url, doc_type FROM documents WHERE booking_id=? AND is_customer_visible=1`).bind(booking.id).all(),
    c.env.DB.prepare(`SELECT s.title FROM booking_services bs JOIN services s ON s.id=bs.service_id WHERE bs.booking_id=?`).bind(booking.id).all(),
  ])

  return c.json({
    ok: true,
    booking: {
      booking_code: booking.booking_code,
      contact_name: booking.contact_name,
      event_name: booking.event_name,
      sport: booking.sport,
      event_date: booking.event_date,
      venue: booking.venue,
      city: booking.city,
      status: booking.status,
      requirements: booking.requirements,
      created_at: booking.created_at,
    },
    services: (services.results as any[]).map((s) => s.title),
    messages: messages.results,
    quotations: quotations.results,
    documents: documents.results,
  })
})

// ============================================================
// PUBLIC: contact enquiry
// ============================================================
apiRoutes.post('/contact', async (c) => {
  if (!rateLimit(`contact:${ip(c)}`, 8, 60_000)) return c.json({ error: 'Too many messages. Please wait.' }, 429)
  const b = await c.req.json<any>().catch(() => ({}))
  if (!b.name || !b.message) return c.json({ error: 'Name and message are required.' }, 400)
  await c.env.DB.prepare(`INSERT INTO inquiries (name, email, phone, subject, message) VALUES (?,?,?,?,?)`)
    .bind(b.name, b.email || null, b.phone || null, b.subject || null, b.message).run()
  await c.env.DB.prepare(`INSERT INTO notifications (title, body, link, audience) VALUES (?,?,?, 'admins')`)
    .bind('New contact enquiry', `${b.name}: ${String(b.subject || b.message).slice(0, 80)}`, '/admin/customers').run()
  return c.json({ ok: true })
})

// ============================================================
// PUBLIC: job application
// ============================================================
apiRoutes.post('/careers/apply', async (c) => {
  if (!rateLimit(`apply:${ip(c)}`, 8, 60_000)) return c.json({ error: 'Too many submissions.' }, 429)
  const b = await c.req.json<any>().catch(() => ({}))
  if (!b.name || !b.job_id) return c.json({ error: 'Name is required.' }, 400)
  await c.env.DB.prepare(`INSERT INTO job_applications (job_id, name, email, phone, resume_url, cover_letter) VALUES (?,?,?,?,?,?)`)
    .bind(Number(b.job_id), b.name, b.email || null, b.phone || null, b.resume_url || null, b.cover_letter || null).run()
  return c.json({ ok: true })
})

// ============================================================
// STAFF: attendance check-in / out
// ============================================================
apiRoutes.post('/attendance/checkin', async (c) => {
  const user = c.get('user')
  if (!user?.employee_id) return c.json({ error: 'Not an employee' }, 403)
  const now = istNow()
  const today = now.date
  const existing: any = await c.env.DB.prepare(`SELECT id FROM attendance WHERE employee_id=? AND work_date=?`).bind(user.employee_id, today).first()
  if (existing) return c.json({ error: 'Already checked in today.' }, 400)

  // Policy: check-in after the cutoff (default 09:00 AM IST) => half day.
  const cutoff = parseClock(await getSetting(c.env, 'attendance_checkin_cutoff', '09:00'))
  const status = classifyCheckin(now.minutes, cutoff)
  await c.env.DB.prepare(`INSERT INTO attendance (employee_id, work_date, check_in, status, notes) VALUES (?,?,?,?,?)`)
    .bind(user.employee_id, today, now.stamp, status, status === 'half_day' ? `Half day — checked in after ${fmtClock(cutoff)}` : null).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'attendance.checkin', details: status, ip: ip(c) })
  return c.json({ ok: true, status, check_in: now.stamp, cutoff: fmtClock(cutoff) })
})

apiRoutes.post('/attendance/checkout', async (c) => {
  const user = c.get('user')
  if (!user?.employee_id) return c.json({ error: 'Not an employee' }, 403)
  const now = istNow()
  // Check-out simply records the actual time — no restriction on when.
  const res = await c.env.DB.prepare(`UPDATE attendance SET check_out=? WHERE employee_id=? AND work_date=? AND check_out IS NULL`)
    .bind(now.stamp, user.employee_id, now.date).run()
  if (!res.meta.changes) return c.json({ error: 'No active check-in found.' }, 400)
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'attendance.checkout', ip: ip(c) })
  return c.json({ ok: true, check_out: now.stamp })
})

// ============================================================
// STAFF: task status update
// ============================================================
apiRoutes.post('/tasks/:id/status', async (c) => {
  const user = c.get('user')
  if (!user || user.role === 'customer') return c.json({ error: 'Unauthorized' }, 403)
  const id = Number(c.req.param('id'))
  const b = await c.req.json<any>().catch(() => ({}))
  const allowed = ['pending', 'in_progress', 'review', 'completed', 'cancelled']
  if (!allowed.includes(b.status)) return c.json({ error: 'Invalid status' }, 400)
  const task: any = await c.env.DB.prepare(`SELECT * FROM tasks WHERE id=?`).bind(id).first()
  if (!task) return c.json({ error: 'Task not found' }, 404)
  if (user.role === 'employee' && task.assigned_to !== user.employee_id) return c.json({ error: 'Not your task' }, 403)
  await c.env.DB.prepare(`UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).bind(b.status, id).run()
  if (b.proof_url) await c.env.DB.prepare(`UPDATE tasks SET proof_url=? WHERE id=?`).bind(b.proof_url, id).run()
  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'task.status', entity: 'tasks', entityId: id, details: b.status, ip: ip(c) })
  return c.json({ ok: true })
})

// ============================================================
// STAFF: notifications
// ============================================================
apiRoutes.post('/notifications/read-all', async (c) => {
  const user = c.get('user')
  if (!user) return c.json({ error: 'Unauthorized' }, 403)
  await c.env.DB.prepare(`UPDATE notifications SET is_read=1 WHERE user_id=?`).bind(user.id).run()
  return c.json({ ok: true })
})

// ============================================================
// STAFF: image upload to R2 (used by admin/portal image fields)
// ============================================================
const MAX_UPLOAD = 8 * 1024 * 1024 // 8 MiB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
  'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif',
}

apiRoutes.post('/upload', async (c) => {
  const user = c.get('user')
  if (!user || user.role === 'customer') return c.json({ error: 'Unauthorized' }, 403)
  if (!c.env.R2) return c.json({ error: 'Storage not configured.' }, 503)

  let form: any
  try { form = await c.req.formData() } catch { return c.json({ error: 'Invalid upload.' }, 400) }
  const file = form.get('file')
  if (!file || typeof file === 'string') return c.json({ error: 'No file provided.' }, 400)

  const type = String(file.type || '')
  const ext = ALLOWED_TYPES[type]
  if (!ext) return c.json({ error: 'Unsupported file type. Please upload a JPG, PNG, WEBP, GIF or SVG.' }, 400)
  const size = Number(file.size || 0)
  if (size > MAX_UPLOAD) return c.json({ error: 'File too large. Max 8 MB.' }, 400)

  const bytes = new Uint8Array(await file.arrayBuffer())
  const rand = Math.random().toString(36).slice(2, 10)
  const key = `uploads/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${rand}.${ext}`
  await c.env.R2.put(key, bytes, { httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000' } })

  await logActivity(c.env.DB, { userId: user.id, actor: user.full_name, action: 'upload.created', entity: 'r2', details: key, ip: ip(c) })
  return c.json({ ok: true, url: `/media/${key}`, key })
})

apiRoutes.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
