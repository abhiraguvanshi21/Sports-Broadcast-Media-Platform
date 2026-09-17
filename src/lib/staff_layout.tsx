import type { FC } from 'hono/jsx'
import type { SessionUser } from './types'
import { canAccess, type Module } from './auth'

const ADMIN_NAV: { href: string; label: string; icon: string; module: Module }[] = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-gauge-high', module: 'dashboard' },
  { href: '/admin/bookings', label: 'Bookings', icon: 'fa-file-invoice', module: 'bookings' },
  { href: '/admin/customers', label: 'Customers', icon: 'fa-users', module: 'customers' },
  { href: '/admin/employees', label: 'Employees', icon: 'fa-id-badge', module: 'employees' },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: 'fa-user-lock', module: 'roles' },
  { href: '/admin/events', label: 'Events', icon: 'fa-trophy', module: 'events' },
  { href: '/admin/live', label: 'Live Control', icon: 'fa-tower-broadcast', module: 'live' },
  { href: '/admin/tasks', label: 'Tasks / Production', icon: 'fa-list-check', module: 'tasks' },
  { href: '/admin/equipment', label: 'Equipment', icon: 'fa-video', module: 'equipment' },
  { href: '/admin/media', label: 'Media', icon: 'fa-photo-film', module: 'media' },
  { href: '/admin/youtube', label: 'YouTube Videos', icon: 'fa-brands fa-youtube', module: 'media' },
  { href: '/admin/team', label: 'Team & About', icon: 'fa-users-rectangle', module: 'cms' },
  { href: '/admin/portfolio', label: 'Portfolio / Services', icon: 'fa-briefcase', module: 'portfolio' },
  { href: '/admin/reports', label: 'Reports', icon: 'fa-chart-line', module: 'reports' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'fa-bell', module: 'notifications' },
  { href: '/admin/cms', label: 'CMS', icon: 'fa-pen-to-square', module: 'cms' },
  { href: '/admin/logs', label: 'Activity Logs', icon: 'fa-clock-rotate-left', module: 'logs' },
  { href: '/admin/settings', label: 'Settings', icon: 'fa-gear', module: 'settings' },
]

const PORTAL_NAV: { href: string; label: string; icon: string; module: Module }[] = [
  { href: '/portal', label: 'Dashboard', icon: 'fa-gauge-high', module: 'dashboard' },
  { href: '/portal/attendance', label: 'Attendance', icon: 'fa-fingerprint', module: 'attendance' },
  { href: '/portal/tasks', label: 'My Tasks', icon: 'fa-list-check', module: 'my_tasks' },
  { href: '/portal/events', label: 'My Events', icon: 'fa-trophy', module: 'my_events' },
  { href: '/portal/schedule', label: 'Production Schedule', icon: 'fa-calendar-day', module: 'schedule' },
  { href: '/portal/equipment', label: 'Equipment', icon: 'fa-video', module: 'equipment' },
  { href: '/portal/media', label: 'Media Upload', icon: 'fa-cloud-arrow-up', module: 'media' },
  { href: '/portal/issues', label: 'Issue Reports', icon: 'fa-triangle-exclamation', module: 'issues' },
  { href: '/portal/leave', label: 'Leave', icon: 'fa-plane-departure', module: 'leave' },
  { href: '/portal/notifications', label: 'Notifications', icon: 'fa-bell', module: 'notifications' },
]

export const StaffLayout: FC<{
  children?: any
  user: SessionUser
  title: string
  current?: string
  nav?: 'admin' | 'portal'
}> = ({ children, user, title, current, nav = 'admin' }) => {
  const items = nav === 'admin' ? ADMIN_NAV : PORTAL_NAV
  const allowed = items.filter((i) => canAccess(user.role, i.module))
  const roleBadge =
    user.role === 'admin' ? 'bg-red-500' : user.role === 'manager' ? 'bg-amber-500' : 'bg-cyan-500'
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} · AWADH Sports Live</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/styles.css" rel="stylesheet" />
      </head>
      <body class="bg-slate-100 text-slate-800 antialiased">
        <div class="flex min-h-screen">
          {/* Sidebar */}
          <aside id="sidebar" class="fixed lg:sticky top-0 z-40 h-screen w-64 shrink-0 bg-slate-950 text-slate-300 flex flex-col -translate-x-full lg:translate-x-0 transition-transform">
            <div class="h-16 flex items-center gap-2.5 px-5 border-b border-white/10">
              <img src="/static/logo-icon.png" alt="AWADH Sports Live" class="w-9 h-9 rounded-lg object-cover ring-1 ring-white/15" />
              <span class="leading-none font-extrabold text-white">
                AWADH
                <span class="block text-[9px] font-bold tracking-[0.22em] text-red-500 mt-0.5">SPORTS LIVE</span>
              </span>
            </div>
            <nav class="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
              {allowed.map((i) => (
                <a
                  href={i.href}
                  class={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition ${
                    current === i.href ? 'bg-white/10 text-white font-semibold' : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <i class={`fas ${i.icon} w-4 text-center`}></i> {i.label}
                </a>
              ))}
            </nav>
            <div class="p-3 border-t border-white/10">
              <a href="/" class="flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-white/5 hover:text-white">
                <i class="fas fa-globe w-4 text-center"></i> View Website
              </a>
              <form method="post" action="/logout">
                <button class="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm hover:bg-rose-500/20 hover:text-rose-300 text-left">
                  <i class="fas fa-right-from-bracket w-4 text-center"></i> Logout
                </button>
              </form>
            </div>
          </aside>

          {/* Main */}
          <div class="flex-1 min-w-0 flex flex-col">
            <header class="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur border-b border-slate-200 flex items-center justify-between px-4 sm:px-6">
              <div class="flex items-center gap-3">
                <button id="sidebar-toggle" class="lg:hidden w-9 h-9 rounded-lg hover:bg-slate-100"><i class="fas fa-bars"></i></button>
                <h1 class="font-bold text-slate-900 text-lg">{title}</h1>
              </div>
              <div class="flex items-center gap-3">
                <span class={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold text-white ${roleBadge} uppercase`}>{user.role}</span>
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div class="hidden sm:block leading-tight">
                    <div class="text-sm font-semibold text-slate-800">{user.full_name}</div>
                    <div class="text-xs text-slate-400">{user.email}</div>
                  </div>
                </div>
              </div>
            </header>
            <main class="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
          </div>
        </div>
        <script src="/static/staff.js"></script>
      </body>
    </html>
  )
}

export const Notice: FC<{ type?: 'success' | 'error' | 'info'; children?: any }> = ({ type = 'info', children }) => {
  const map = {
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    error: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  }
  const icon = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' }
  return (
    <div class={`mb-4 rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${map[type]}`}>
      <i class={`fas ${icon[type]} mt-0.5`}></i>
      <div>{children}</div>
    </div>
  )
}
