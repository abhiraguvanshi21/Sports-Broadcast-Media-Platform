import type { Bindings } from './types'

// Re-exported helpers so routes can import from one place
export { makeBookingCode, rateLimit, esc, fmtDate, fmtDateTime, fmtMoney, slugify } from './utils'
export { randomDigits, randomToken } from './auth'

export function normalizePhone(p: string): string {
  return (p || '').replace(/[^\d+]/g, '')
}

// ============================================================
// OTP — hashed at rest, expiring, attempt-limited (Section 18)
// ============================================================
export async function hashOtp(code: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 50_000, hash: 'SHA-256' },
    key,
    256
  )
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

export async function verifyOtp(code: string, salt: string, hash: string): Promise<boolean> {
  const computed = await hashOtp(code, salt)
  if (computed.length !== hash.length) return false
  let diff = 0
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i)
  return diff === 0
}

export type OtpResult = { ok: boolean; error?: string; destination?: string }

/**
 * Create + store an OTP for a booking. Returns masked destination for display.
 * Note: in this edge environment we cannot send SMS/email without a provider.
 * The code is returned to the caller for dev/demo display when no provider is set.
 */
export async function createBookingOtp(
  env: Bindings,
  bookingId: number,
  phone: string,
  email?: string | null
): Promise<{ destination: string; devCode: string }> {
  const code = (await import('./auth')).randomDigits(6)
  const salt = crypto.randomUUID()
  const codeHash = await hashOtp(code, salt)
  const expires = new Date(Date.now() + 10 * 60_000).toISOString().replace('T', ' ').slice(0, 19)
  const destination = email ? maskEmail(email) : maskPhone(phone)
  // invalidate old unused codes for this booking
  await env.DB.prepare('DELETE FROM otp_codes WHERE booking_id = ? AND used = 0').bind(bookingId).run()
  await env.DB.prepare(
    `INSERT INTO otp_codes (booking_id, destination, code_hash, expires_at) VALUES (?,?,?,?)`
  )
    .bind(bookingId, `${salt}:${destination}`, codeHash, expires)
    .run()
  return { destination, devCode: code }
}

export function maskPhone(p: string): string {
  const d = normalizePhone(p)
  if (d.length < 4) return '***'
  return `${d.slice(0, 2)}****${d.slice(-3)}`
}

export function maskEmail(e: string): string {
  const [u, dom] = e.split('@')
  if (!dom) return '***'
  return `${u.slice(0, 2)}***@${dom}`
}
