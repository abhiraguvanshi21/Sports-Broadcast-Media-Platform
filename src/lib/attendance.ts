// ============================================================
// ATTENDANCE HELPERS — day-wise roster, summary aur individual view ke
// queries ek jagah (dashboard + /admin/attendance dono inhe use karte hain).
// Kaam:
//   • getDayRoster   — ek din ke liye SAARE active employees + unki us din
//                      ki attendance (LEFT JOIN, isliye jo check-in nahi kar
//                      paya wo bhi "not marked" ke roop me dikhta hai).
//   • getDaySummary  — us din ke present/absent/leave/rest counts.
//   • getEmployee    — ek employee ki profile (individual view ke header ke liye).
//   • getEmployeeMonth / getEmployeeSummary — employee ka mahine ka record.
// ============================================================
import type { Bindings } from './types'

export type RosterRow = {
  employee_id: number
  full_name: string
  email: string
  emp_code: string | null
  department: string | null
  designation: string | null
  monthly_salary: number | null
  att_id: number | null
  check_in: string | null
  check_out: string | null
  status: string | null
  notes: string | null
}

export type DaySummary = {
  active_emp: number
  present_day: number
  late_day: number
  half_day: number
  absent_day: number
  leave_day: number
  rest_day: number
}

export type EmployeeRow = {
  id: number
  full_name: string
  email: string
  emp_code: string | null
  department: string | null
  designation: string | null
  monthly_salary: number | null
  joining_date: string | null
}

/** Every ACTIVE employee joined with their attendance for `day` (left join). */
export async function getDayRoster(env: Bindings, day: string): Promise<RosterRow[]> {
  const res = await env.DB.prepare(
    `SELECT e.id AS employee_id, u.full_name, u.email, e.emp_code, e.department, e.designation,
            e.monthly_salary,
            a.id AS att_id, a.check_in, a.check_out, a.status, a.notes
       FROM employees e JOIN users u ON u.id=e.user_id
       LEFT JOIN attendance a ON a.employee_id=e.id AND a.work_date=?
      WHERE e.status='active'
      ORDER BY u.full_name`
  )
    .bind(day)
    .all()
  return (res.results as any[]) as RosterRow[]
}

/** Day-wise counts for `day`. */
export async function getDaySummary(env: Bindings, day: string): Promise<DaySummary> {
  const row = await env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM employees WHERE status='active') AS active_emp,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status IN ('present','late')) AS present_day,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='late') AS late_day,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='half_day') AS half_day,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='absent') AS absent_day,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='leave') AS leave_day,
       (SELECT COUNT(*) FROM attendance WHERE work_date=? AND status='rest') AS rest_day`
  )
    .bind(day, day, day, day, day, day)
    .first<any>()
  return {
    active_emp: row?.active_emp ?? 0,
    present_day: row?.present_day ?? 0,
    late_day: row?.late_day ?? 0,
    half_day: row?.half_day ?? 0,
    absent_day: row?.absent_day ?? 0,
    leave_day: row?.leave_day ?? 0,
    rest_day: row?.rest_day ?? 0,
  }
}

export async function getEmployee(env: Bindings, empId: number): Promise<EmployeeRow | null> {
  const row = await env.DB.prepare(
    `SELECT e.id, u.full_name, u.email, e.emp_code, e.department, e.designation, e.monthly_salary, e.joining_date
       FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?`
  )
    .bind(empId)
    .first<any>()
  return (row as EmployeeRow) || null
}

/** Employee ka ek mahine ka attendance record (latest date pehle). */
export async function getEmployeeMonth(env: Bindings, empId: number, month: string): Promise<any[]> {
  const res = await env.DB.prepare(
    `SELECT * FROM attendance WHERE employee_id=? AND strftime('%Y-%m', work_date)=? ORDER BY work_date DESC`
  )
    .bind(empId, month)
    .all()
  return res.results as any[]
}

/** Employee ke ek mahine ke status counts. */
export async function getEmployeeSummary(env: Bindings, empId: number, month: string): Promise<any> {
  return env.DB.prepare(
    `SELECT
       SUM(CASE WHEN status IN ('present','late') THEN 1 ELSE 0 END) present,
       SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) late,
       SUM(CASE WHEN status='half_day' THEN 1 ELSE 0 END) half_day,
       SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) absent,
       SUM(CASE WHEN status='leave' THEN 1 ELSE 0 END) leave,
       SUM(CASE WHEN status='rest' THEN 1 ELSE 0 END) rest
     FROM attendance WHERE employee_id=? AND strftime('%Y-%m', work_date)=?`
  )
    .bind(empId, month)
    .first<any>()
}
