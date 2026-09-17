import type { Bindings, Role, SessionUser } from './types'

// ============================================================
// Password hashing — PBKDF2-SHA256 via WebCrypto (Section 18)
// Format: pbkdf2$<iterations>$<saltB64>$<hashB64>
// ============================================================
const PBKDF2_ITER = 100_000

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}
function unb64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' },
    key,
    256
  )
  return `pbkdf2$${PBKDF2_ITER}$${b64(salt.buffer)}$${b64(bits)}`
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split('$')
    if (scheme !== 'pbkdf2') return false
    const iter = parseInt(iterStr, 10)
    const salt = unb64(saltB64)
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      key,
      256
    )
    const expected = unb64(hashB64)
    const actual = new Uint8Array(bits)
    if (expected.length !== actual.length) return false
    let diff = 0
    for (let i = 0; i < expected.length; i++) diff |= expected[i] ^ actual[i]
    return diff === 0
  } catch {
    return false
  }
}

export function randomToken(len = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len))
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function randomDigits(n = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  return Array.from(bytes, (b) => (b % 10).toString()).join('')
}

// ============================================================
// Sessions
// ============================================================
export const SESSION_COOKIE = 'sbm_session'
const SESSION_DAYS = 7

export async function createSession(env: Bindings, userId: number): Promise<string> {
  const token = randomToken(32)
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().replace('T', ' ').slice(0, 19)
  await env.DB.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires)
    .run()
  return token
}

export async function destroySession(env: Bindings, token: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(token).run()
}

export async function getSessionUser(env: Bindings, token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null
  const row: any = await env.DB.prepare(
    `SELECT s.id AS sid, u.id, u.email, u.role, u.full_name, e.id AS employee_id
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       LEFT JOIN employees e ON e.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now') AND u.is_active = 1`
  )
    .bind(token)
    .first()
  if (!row) return null
  return { id: row.id, email: row.email, role: row.role, full_name: row.full_name, employee_id: row.employee_id ?? null }
}

// ============================================================
// RBAC (Section 14 — Role Based Access Matrix)
// ============================================================
export type Module =
  | 'dashboard'
  | 'bookings'
  | 'customers'
  | 'employees'
  | 'roles'
  | 'events'
  | 'live'
  | 'tasks'
  | 'equipment'
  | 'media'
  | 'portfolio'
  | 'reports'
  | 'notifications'
  | 'cms'
  | 'logs'
  | 'settings'
  | 'attendance'
  | 'my_tasks'
  | 'my_events'
  | 'schedule'
  | 'issues'
  | 'leave'

const ADMIN: Module[] = [
  'dashboard','bookings','customers','employees','roles','events','live','tasks','equipment',
  'media','portfolio','reports','notifications','cms','logs','settings','attendance','my_tasks',
  'my_events','schedule','issues','leave',
]
const MANAGER: Module[] = [
  'dashboard','events','live','tasks','equipment','media','reports','notifications','attendance',
  'my_tasks','my_events','schedule','issues','leave','portfolio',
]
const EMPLOYEE: Module[] = ['dashboard','attendance','my_tasks','my_events','schedule','equipment','media','issues','leave','notifications']

export function canAccess(role: Role | undefined | null, module: Module): boolean {
  if (!role) return false
  if (role === 'admin') return ADMIN.includes(module)
  if (role === 'manager') return MANAGER.includes(module)
  if (role === 'employee') return EMPLOYEE.includes(module)
  return false
}

export function isStaff(role: Role | undefined | null): boolean {
  return role === 'admin' || role === 'manager' || role === 'employee'
}

/**
 * Where a signed-in user lands after login.
 *  customer           -> the public home page (they browse the whole website and
 *                        manage their bookings from the user menu / /account)
 *  manager / employee -> employee operations portal (attendance, tasks, events)
 *  admin              -> admin control centre (full website + data control)
 */
export function dashboardHome(role: Role): string {
  if (role === 'admin') return '/admin'
  if (role === 'customer') return '/'
  return '/portal'
}
