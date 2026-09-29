// ============================================================
// STAFF LAYOUT — Admin + Employee panel ka dhancha (light theme)
// Kaam: left sidebar (group ke saath), topbar aur Notice (success/error)
// dikhana. Admin aur Portal dono pages isi layout ko use karte hain.
// ============================================================
import type { FC } from 'hono/jsx'
import type { SessionUser } from './types'
import { canAccess, type Module } from './auth'

type NavItem = { href: string; label: string; icon: string; module: Module; group: string }

const ADMIN_NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: 'fa-gauge-high', module: 'dashboard', group: 'Overview' },
  { href: '/admin/bookings', label: 'Bookings', icon: 'fa-file-invoice', module: 'bookings', group: 'Bookings & Clients' },
  { href: '/admin/customers', label: 'Customers', icon: 'fa-users', module: 'customers', group: 'Bookings & Clients' },
  { href: '/admin/users', label: 'Users & Logins', icon: 'fa-users-gear', module: 'employees', group: 'Team & HR' },
  { href: '/admin/employees', label: 'Employees', icon: 'fa-id-badge', module: 'employees', group: 'Team & HR' },
  { href: '/admin/attendance', label: 'Attendance', icon: 'fa-fingerprint', module: 'attendance', group: 'Team & HR' },
  { href: '/admin/salary', label: 'Salary', icon: 'fa-indian-rupee-sign', module: 'attendance', group: 'Team & HR' },
  { href: '/admin/roles', label: 'Roles & Permissions', icon: 'fa-user-lock', module: 'roles', group: 'Team & HR' },
  { href: '/admin/events', label: 'Events', icon: 'fa-trophy', module: 'events', group: 'Productions' },
  { href: '/admin/live', label: 'Live Control', icon: 'fa-tower-broadcast', module: 'live', group: 'Productions' },
  { href: '/admin/tasks', label: 'Tasks / Production', icon: 'fa-list-check', module: 'tasks', group: 'Productions' },
  { href: '/admin/equipment', label: 'Equipment', icon: 'fa-video', module: 'equipment', group: 'Productions' },
  { href: '/admin/media', label: 'Media', icon: 'fa-photo-film', module: 'media', group: 'Content' },
  { href: '/admin/youtube', label: 'YouTube Videos', icon: 'fa-brands fa-youtube', module: 'media', group: 'Content' },
  { href: '/admin/team', label: 'Team & About', icon: 'fa-users-rectangle', module: 'cms', group: 'Content' },
  { href: '/admin/portfolio', label: 'Portfolio / Services', icon: 'fa-briefcase', module: 'portfolio', group: 'Content' },
  { href: '/admin/cms', label: 'CMS', icon: 'fa-pen-to-square', module: 'cms', group: 'Content' },
  { href: '/admin/reports', label: 'Reports', icon: 'fa-chart-line', module: 'reports', group: 'System' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'fa-bell', module: 'notifications', group: 'System' },
  { href: '/admin/logs', label: 'Activity Logs', icon: 'fa-clock-rotate-left', module: 'logs', group: 'System' },
  { href: '/admin/settings', label: 'Settings', icon: 'fa-gear', module: 'settings', group: 'System' },
]

const PORTAL_NAV: NavItem[] = [
  { href: '/portal', label: 'Dashboard', icon: 'fa-gauge-high', module: 'dashboard', group: 'Overview' },
  { href: '/portal/attendance', label: 'Attendance', icon: 'fa-fingerprint', module: 'attendance', group: 'My Work' },
  { href: '/portal/tasks', label: 'My Tasks', icon: 'fa-list-check', module: 'my_tasks', group: 'My Work' },
  { href: '/portal/events', label: 'My Events', icon: 'fa-trophy', module: 'my_events', group: 'My Work' },
  { href: '/portal/schedule', label: 'Production Schedule', icon: 'fa-calendar-day', module: 'schedule', group: 'My Work' },
  { href: '/portal/equipment', label: 'Equipment', icon: 'fa-video', module: 'equipment', group: 'Resources' },
  { href: '/portal/media', label: 'Media Upload', icon: 'fa-cloud-arrow-up', module: 'media', group: 'Resources' },
  { href: '/portal/issues', label: 'Issue Reports', icon: 'fa-triangle-exclamation', module: 'issues', group: 'Resources' },
  { href: '/portal/leave', label: 'Leave', icon: 'fa-plane-departure', module: 'leave', group: 'Resources' },
  { href: '/portal/notifications', label: 'Notifications', icon: 'fa-bell', module: 'notifications', group: 'Resources' },
]

export const StaffLayout: FC<{
  children?: any
  user: SessionUser
  title: string
  current?: string
  nav?: 'admin' | 'portal'
}> = ({ children, user, title, current, nav = 'admin' }) => {
  const items = (nav === 'admin' ? ADMIN_NAV : PORTAL_NAV).filter((i) => canAccess(user.role, i.module))
  const groups: { name: string; items: NavItem[] }[] = []
  for (const it of items) {
    let g = groups.find((x) => x.name === it.group)
    if (!g) { g = { name: it.group, items: [] }; groups.push(g) }
    g.items.push(it)
  }
  const roleBadge =
    user.role === 'admin' ? 'bg-red-500' : user.role === 'manager' ? 'bg-amber-500' : 'bg-cyan-500'
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title} · AWADH Sports Live</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
        <link href="/static/styles.css" rel="stylesheet" />
        <link href="/static/admin.css" rel="stylesheet" />
      </head>
      <body class="staff-app antialiased">
        <div id="app-shell" class="flex min-h-screen">
          {/* Sidebar — on phones this is a slide-in drawer (backdrop + tap-out to close) */}
          <aside id="sidebar" class="side-nav fixed lg:sticky top-0 z-40 h-screen w-64 max-w-[86vw] shrink-0 text-slate-300 flex flex-col -translate-x-full lg:translate-x-0 transition-transform shadow-2xl lg:shadow-none">
            <div class="side-nav__brand h-16 flex items-center gap-2.5 px-5">
              <img src="/static/logo-icon.png" alt="AWADH Sports Live" class="w-9 h-9 rounded-lg object-cover ring-1 ring-white/15" />
              <span class="leading-none font-extrabold text-white">
                AWADH
                <span class="block text-[9px] font-bold tracking-[0.22em] text-red-500 mt-0.5">SPORTS LIVE</span>
              </span>
              <span class="ml-auto text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/70">
                {nav === 'admin' ? 'Admin' : 'Staff'}
              </span>
            </div>
            <nav class="flex-1 overflow-y-auto py-2 px-3">
              {groups.map((g) => (
                <div>
                  <div class="side-nav__group-label">{g.name}</div>
                  {g.items.map((i) => (
                    <a href={i.href} class={`side-nav__link ${current === i.href ? 'is-active' : ''}`}>
                      <i class={`fas ${i.icon}`}></i> {i.label}
                    </a>
                  ))}
                </div>
              ))}
            </nav>
            <div class="side-nav__foot p-3">
              <a href="/profile" class="side-nav__link"><i class="fas fa-user"></i> My Profile</a>
              <a href="/" class="side-nav__link"><i class="fas fa-globe"></i> View Website</a>
              <form method="post" action="/logout">
                <button class="side-nav__link w-full text-left hover:!text-rose-300 hover:!bg-rose-500/15">
                  <i class="fas fa-right-from-bracket"></i> Logout
                </button>
              </form>
            </div>
          </aside>

          {/* Mobile drawer backdrop — tap to close */}
          <div id="sidebar-backdrop" class="side-backdrop lg:hidden" aria-hidden="true"></div>

          {/* Main */}
          <div class="flex-1 min-w-0 flex flex-col">
            <header class="topbar sticky top-0 z-30 h-16 flex items-center justify-between gap-3 px-4 sm:px-6">
              <div class="flex items-center gap-3 min-w-0">
                <button id="sidebar-toggle" class="lg:hidden w-9 h-9 shrink-0 rounded-lg hover:bg-slate-100 text-slate-600" aria-label="Toggle menu" aria-expanded="false"><i class="fas fa-bars"></i></button>
                <h1 class="font-bold text-slate-900 text-base sm:text-lg truncate">{title}</h1>
              </div>
              <div class="flex items-center gap-3">
                <span class={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-bold text-white ${roleBadge} uppercase`}>{user.role}</span>
                <div class="flex items-center gap-2">
                  <div class="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center font-bold text-sm">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div class="hidden sm:block leading-tight min-w-0 max-w-[11rem]">
                    <div class="text-sm font-semibold text-slate-800 truncate">{user.full_name}</div>
                    <div class="text-xs text-slate-500 truncate">{user.email}</div>
                  </div>
                </div>
              </div>
            </header>
            <main class="flex-1 min-w-0 p-3.5 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
          </div>
        </div>
        <script src="/static/reveal.js"></script>
        <script src="/static/cropper.js"></script>
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
