// ============================================================
// POLICY + SETTINGS — attendance niyam, salary hisaab, app settings
// Kaam:
//   • Attendance policy (09:00 IST ke baad check-in => half day)
//   • Salary compute karna (present / half-day / absent ke hisaab se)
//   • app_settings (key-value) padhna/likhna — YouTube sync state,
//     timeout timezone wagairah sab yahin se aate hain.
// ============================================================
import type { Bindings } from './types'

// ============================================================
// Attendance policy & salary helpers (AWADH Sports Live)
//  - Check-in after 09:00 AM (IST) => half day
//  - Check-out simply records the actual time
//  - Salary sheet uses the half-day / absent rule for deductions
// ============================================================

export type IstNow = { date: string; time: string; minutes: number; stamp: string; weekday: number }

/** Current date/time in Asia/Kolkata (India) as plain strings. */
export function istNow(d: Date = new Date()): IstNow {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    weekday: 'short',
  })
  const p: Record<string, string> = {}
  for (const part of fmt.formatToParts(d)) p[part.type] = part.value
  const b = p.dayPeriod // not used with h23
  void b
  const date = `${p.year}-${p.month}-${p.day}`
  const time = `${p.hour}:${p.minute}:${p.second}`
  const minutes = Number(p.hour) * 60 + Number(p.minute)
  const wd: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return { date, time, minutes, stamp: `${date} ${time}`, weekday: wd[p.weekday] ?? 1 }
}

/** "09:00" -> 540 minutes. */
export function parseClock(s?: string | null, fallback = '09:00'): number {
  const v = (s || fallback).trim()
  const m = v.match(/^(\d{1,2}):(\d{2})/)
  if (!m) return 540
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]))
}

export function fmtClock(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

export type AttStatus = 'present' | 'half_day' | 'absent' | 'leave'

/** Decide the attendance status from the check-in minute-of-day vs cutoff. */
export function classifyCheckin(checkInMinutes: number, cutoffMinutes: number): AttStatus {
  return checkInMinutes > cutoffMinutes ? 'half_day' : 'present'
}

export async function getSetting(env: Bindings, key: string, fallback = ''): Promise<string> {
  try {
    const row: any = await env.DB.prepare(`SELECT value FROM app_settings WHERE key=?`).bind(key).first()
    if (row && row.value != null && row.value !== '') return String(row.value)
  } catch {
    /* table may not exist yet */
  }
  return fallback
}

export async function setSetting(env: Bindings, key: string, value: string): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO app_settings (key, value, updated_at) VALUES (?,?,CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP`
    )
      .bind(key, value)
      .run()
  } catch {
    /* ignore */
  }
}

// ---- Salary ----
export type SalaryInput = {
  monthlySalary: number | null
  workingDays: number
  present: number
  halfDay: number
  absent: number
  leave: number
}

export type SalaryResult = {
  perDay: number
  payableDays: number
  deduction: number
  netPay: number
  configured: boolean
}

/**
 * Deduction rule:
 *   per-day  = monthlySalary / workingDays
 *   deduction = (absentDays * perDay) + (halfDays * 0.5 * perDay)
 *   approved leave is treated as paid (no deduction).
 */
export function computeSalary(input: SalaryInput): SalaryResult {
  const days = input.workingDays > 0 ? input.workingDays : 30
  const salary = Number(input.monthlySalary || 0)
  const perDay = salary > 0 ? salary / days : 0
  const deduction = Math.round((input.absent + input.halfDay * 0.5) * perDay)
  const payableDays = input.present + input.halfDay * 0.5 + input.leave
  const netPay = Math.max(0, Math.round(salary - deduction))
  return { perDay: Math.round(perDay), payableDays: Math.round(payableDays * 10) / 10, deduction, netPay, configured: salary > 0 }
}
