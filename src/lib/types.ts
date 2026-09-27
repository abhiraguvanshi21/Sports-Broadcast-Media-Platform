export type Bindings = {
  DB: D1Database
  R2?: R2Bucket
  ASSETS: Fetcher
  ENVIRONMENT?: string
}

export type Role = 'admin' | 'manager' | 'employee' | 'customer'

export type SessionUser = {
  id: number
  email: string
  role: Role
  full_name: string
  employee_id?: number | null
}

export type Variables = {
  user: SessionUser | null
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }

// ---- Status chip definitions (Section 17: consistent status chips) ----
export const BOOKING_STATUS: Record<string, string> = {
  received: 'Received',
  under_review: 'Under Review',
  discussion: 'Discussion Required',
  quotation_sent: 'Quotation Sent',
  approved: 'Approved / Scheduled',
  in_production: 'In Production',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const EVENT_STATUS: Record<string, string> = {
  draft: 'Draft',
  upcoming: 'Upcoming',
  live: 'Live',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const TASK_STATUS: Record<string, string> = {
  pending: 'Pending',
  in_progress: 'In Progress',
  review: 'Review',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const CHIP_CLASS: Record<string, string> = {
  // statuses -> tailwind classes
  received: 'bg-slate-100 text-slate-700 ring-slate-200',
  under_review: 'bg-amber-100 text-amber-800 ring-amber-200',
  discussion: 'bg-purple-100 text-purple-800 ring-purple-200',
  quotation_sent: 'bg-blue-100 text-blue-800 ring-blue-200',
  approved: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  in_production: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  completed: 'bg-green-100 text-green-800 ring-green-200',
  cancelled: 'bg-rose-100 text-rose-800 ring-rose-200',
  draft: 'bg-slate-100 text-slate-700 ring-slate-200',
  upcoming: 'bg-blue-100 text-blue-800 ring-blue-200',
  live: 'bg-red-100 text-red-700 ring-red-200',
  pending: 'bg-amber-100 text-amber-800 ring-amber-200',
  in_progress: 'bg-cyan-100 text-cyan-800 ring-cyan-200',
  review: 'bg-purple-100 text-purple-800 ring-purple-200',
  approved_leave: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  rejected: 'bg-rose-100 text-rose-800 ring-rose-200',
  open: 'bg-amber-100 text-amber-800 ring-amber-200',
  resolved: 'bg-green-100 text-green-800 ring-green-200',
  new: 'bg-blue-100 text-blue-800 ring-blue-200',
  present: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  half_day: 'bg-orange-100 text-orange-800 ring-orange-200',
  absent: 'bg-rose-100 text-rose-800 ring-rose-200',
  late: 'bg-amber-100 text-amber-800 ring-amber-200',
  leave: 'bg-blue-100 text-blue-800 ring-blue-200',
  low: 'bg-slate-100 text-slate-700 ring-slate-200',
  medium: 'bg-amber-100 text-amber-800 ring-amber-200',
  high: 'bg-orange-100 text-orange-800 ring-orange-200',
  critical: 'bg-red-100 text-red-700 ring-red-200',
}
