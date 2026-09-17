import { CHIP_CLASS, BOOKING_STATUS, EVENT_STATUS, TASK_STATUS } from './types'

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtDateTime(d?: string | null): string {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return d
  return dt.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function fmtMoney(n?: number | null, currency = 'INR'): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function esc(s?: string | null): string {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function statusClass(status?: string | null): string {
  return CHIP_CLASS[status || ''] || 'bg-slate-100 text-slate-700 ring-slate-200'
}

export function statusLabel(status?: string | null): string {
  if (!status) return '—'
  return BOOKING_STATUS[status] || EVENT_STATUS[status] || TASK_STATUS[status] || status.replace(/_/g, ' ')
}

/** Generate booking code like SBM-2026-A1B2C3 */
export function makeBookingCode(): string {
  const year = new Date().getFullYear()
  const bytes = crypto.getRandomValues(new Uint8Array(3))
  const suffix = Array.from(bytes, (b) => b.toString(36).toUpperCase().padStart(2, '0')).join('').slice(0, 6)
  return `SBM-${year}-${suffix}`
}

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Simple in-memory rate limiter (per isolate). Used for auth/OTP endpoints. */
const buckets = new Map<string, { count: number; reset: number }>()
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const b = buckets.get(key)
  if (!b || b.reset < now) {
    buckets.set(key, { count: 1, reset: now + windowMs })
    return true
  }
  if (b.count >= max) return false
  b.count++
  return true
}

export function logActivity(
  db: D1Database,
  opts: { userId?: number | null; actor?: string | null; action: string; entity?: string; entityId?: number | null; details?: string; ip?: string }
): Promise<unknown> {
  return db
    .prepare('INSERT INTO activity_logs (user_id, actor_name, action, entity, entity_id, details, ip) VALUES (?,?,?,?,?,?,?)')
    .bind(opts.userId ?? null, opts.actor ?? null, opts.action, opts.entity ?? null, opts.entityId ?? null, opts.details ?? null, opts.ip ?? null)
    .run()
}
