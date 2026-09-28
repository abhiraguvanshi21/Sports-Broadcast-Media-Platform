import type { FC } from 'hono/jsx'
import type { SessionUser } from './types'

export const BRAND = {
  name: 'AWADH Sports Live',
  short: 'AWADH',
  tagline: 'Every sport. Every moment. Live.',
  phone: '+91 79854 28973',
  phoneRaw: '7985428973',
  email: 'info.awadhsports@gmail.com',
  address: 'Sector 142, Noida, Uttar Pradesh, India',
  youtube: 'https://youtube.com/@awadh_sports.',
}

export const PublicHead: FC<{ title?: string; description?: string }> = ({ title, description }) => (
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title ? `${title} · ${BRAND.name}` : `${BRAND.name} — Live Sports Broadcast & Production`}</title>
    <meta name="description" content={description || 'Professional sports media: match production, live streaming, commentary, graphics, photography, video and highlights.'} />
    <link rel="icon" type="image/png" href="/static/favicon.png" />
    <link rel="apple-touch-icon" href="/static/logo-icon.png" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
      href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600&display=swap"
      rel="stylesheet"
    />
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
    <link href="/static/styles.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  </head>
)

export const BrandMark: FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const px = size === 'sm' ? 'w-8 h-8' : size === 'lg' ? 'w-12 h-12' : 'w-10 h-10'
  const txt = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg'
  return (
    <span class="flex items-center gap-2.5">
      <img src="/static/logo-icon.png" alt={BRAND.name} class={`${px} rounded-xl object-cover ring-1 ring-white/15`} />
      <span class={`leading-none font-extrabold tracking-tight text-white ${txt}`}>
        AWADH
        <span class="block text-[0.6em] font-bold tracking-[0.28em] text-red-500 mt-0.5">SPORTS LIVE</span>
      </span>
    </span>
  )
}

// Compact primary nav; secondary links live under "More".
// Required sequence: Home → About → Services → Live → Events → More
const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/live', label: 'Live', accent: true },
  { href: '/events', label: 'Events' },
]
const MORE = [
  { href: '/portfolio', label: 'Portfolio', icon: 'fa-briefcase' },
  { href: '/gallery', label: 'Media Gallery', icon: 'fa-photo-film' },
  { href: '/track', label: 'Track Booking', icon: 'fa-magnifying-glass' },
  { href: '/careers', label: 'Careers', icon: 'fa-briefcase' },
]

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator',
  manager: 'Production Manager',
  employee: 'Employee',
  customer: 'Customer',
}

const UserMenu: FC<{ user: SessionUser }> = ({ user }) => {
  const home = user.role === 'admin' ? '/admin' : user.role === 'customer' ? '/account' : '/portal'
  return (
    <div class="relative group">
      <button class="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/15 hover:bg-white/5 transition">
        <span class="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-orange-500 text-white flex items-center justify-center text-xs font-bold">
          {user.full_name.charAt(0).toUpperCase()}
        </span>
        <span class="hidden sm:block text-left leading-tight">
          <span class="block text-xs font-semibold text-white max-w-[9rem] truncate">{user.full_name}</span>
          <span class="block text-[10px] text-slate-400 uppercase tracking-wide">{ROLE_LABEL[user.role] || user.role}</span>
        </span>
        <i class="fas fa-chevron-down text-[10px] opacity-60 group-hover:rotate-180 transition"></i>
      </button>
      <div class="absolute right-0 top-full pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
        <div class="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl p-1.5">
          <div class="px-3 py-2 border-b border-white/10 mb-1">
            <div class="text-sm font-semibold text-white truncate">{user.full_name}</div>
            <div class="text-xs text-slate-400 truncate">{user.email}</div>
          </div>
          <a href="/profile" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm">
            <i class="fas fa-user w-4 text-center text-slate-500"></i> My Profile
          </a>
          <a href={home} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm">
            <i class="fas fa-gauge-high w-4 text-center text-slate-500"></i> My Dashboard
          </a>
          {user.role === 'customer' && (
            <a href="/book" class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm">
              <i class="fas fa-calendar-plus w-4 text-center text-slate-500"></i> New Booking
            </a>
          )}
          <form method="post" action="/logout">
            <button class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-rose-300 hover:bg-rose-500/15 text-sm text-left">
              <i class="fas fa-right-from-bracket w-4 text-center"></i> Logout
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export const PublicHeader: FC<{ current?: string; user?: SessionUser | null }> = ({ current, user }) => {
  const isMore = MORE.some((m) => m.href === current)
  return (
    <header class="site-header sticky top-0 z-50 backdrop-blur bg-slate-950/85 border-b border-white/10">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
        <a href="/" aria-label={BRAND.name}><BrandMark /></a>

        <nav class="hidden lg:flex items-center gap-0.5 text-sm">
          {NAV.map((n) => (
            <a
              href={n.href}
              class={`px-3.5 py-2 rounded-lg transition font-medium ${
                current === n.href ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {n.accent && <i class="fas fa-circle text-red-500 text-[7px] mr-1.5 align-middle live-dot"></i>}
              {n.label}
            </a>
          ))}
          <div class="relative group">
            <button
              class={`px-3.5 py-2 rounded-lg transition font-medium inline-flex items-center gap-1.5 ${
                isMore ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              More <i class="fas fa-chevron-down text-[10px] opacity-70 group-hover:rotate-180 transition"></i>
            </button>
            <div class="absolute right-0 top-full pt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition">
              <div class="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur shadow-2xl p-1.5">
                {MORE.map((m) => (
                  <a href={m.href} class="flex items-center gap-3 px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/5 text-sm">
                    <i class={`fas ${m.icon} w-4 text-center text-slate-500`}></i> {m.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </nav>

        <div class="flex items-center gap-2">
          <a href="/book" class="hidden sm:inline-flex btn-primary text-sm">Book Now</a>
          {user ? (
            <UserMenu user={user} />
          ) : (
            <>
              <a href="/register" class="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm font-medium">
                <i class="fas fa-user-plus"></i> Sign Up
              </a>
              <a href="/login" class="hidden md:inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm font-medium">
                <i class="fas fa-right-to-bracket"></i> Sign In
              </a>
            </>
          )}
          <button id="nav-toggle" class="lg:hidden text-white w-10 h-10 rounded-lg hover:bg-white/10" aria-label="Menu">
            <i class="fas fa-bars"></i>
          </button>
        </div>
      </div>

      <div id="mobile-nav" class="lg:hidden hidden border-t border-white/10 bg-slate-950 px-4 py-3">
        <div class="grid grid-cols-2 gap-1">
          {[...NAV, ...MORE].map((n) => (
            <a href={n.href} class="px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/5 text-sm">{n.label}</a>
          ))}
        </div>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <a href="/book" class="btn-primary text-center text-sm">Book Now</a>
          {user ? (
            <>
              <a href="/profile" class="px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-center text-sm">My Profile</a>
              <form method="post" action="/logout" class="col-span-2">
                <button class="w-full px-3 py-2 rounded-lg border border-rose-500/40 text-rose-300 text-center text-sm">Logout ({user.full_name.split(' ')[0]})</button>
              </form>
            </>
          ) : (
            <>
              <a href="/register" class="px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-center text-sm">Sign Up</a>
              <a href="/login" class="px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-center text-sm col-span-2">Sign In</a>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export const PublicFooter: FC<{ user?: SessionUser | null }> = ({ user }) => (
  <footer class="bg-slate-950 text-slate-400 border-t border-white/10 mt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-4">
      <div class="md:col-span-1">
        <BrandMark />
        <p class="text-sm leading-relaxed mt-4">
          Complete sports media solutions — match production, live streaming, commentary, graphics, photography and highlights for leagues, tournaments and clubs.
        </p>
        <div class="flex gap-3 mt-4 text-lg">
          <a href={BRAND.youtube} target="_blank" rel="noopener" class="hover:text-red-500 transition" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
          <a href="#" class="hover:text-white" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
          <a href="#" class="hover:text-white" aria-label="Facebook"><i class="fab fa-facebook"></i></a>
          <a href="#" class="hover:text-white" aria-label="X"><i class="fab fa-x-twitter"></i></a>
        </div>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-sm uppercase tracking-wide">What we do</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/services#match-production" class="hover:text-white">Match Production</a></li>
          <li><a href="/services#digital-streaming" class="hover:text-white">Digital Streaming</a></li>
          <li><a href="/services#sports-commentary" class="hover:text-white">Sports Commentary</a></li>
          <li><a href="/services#live-scores-graphics" class="hover:text-white">Live Scores &amp; Graphics</a></li>
          <li><a href="/services#sports-photography" class="hover:text-white">Sports Photography</a></li>
          <li><a href="/services" class="hover:text-red-400">View all services →</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Company</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/about" class="hover:text-white">About Us</a></li>
          <li><a href="/portfolio" class="hover:text-white">Portfolio</a></li>
          <li><a href="/events" class="hover:text-white">Events</a></li>
          <li><a href="/gallery" class="hover:text-white">Media Gallery</a></li>
          <li><a href="/careers" class="hover:text-white">Careers</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Get in touch</h4>
        <ul class="space-y-3 text-sm">
          <li><i class="fas fa-location-dot mr-2 text-red-500"></i>{BRAND.address}</li>
          <li><a href={`tel:${BRAND.phoneRaw}`} class="hover:text-white"><i class="fas fa-phone mr-2 text-red-500"></i>{BRAND.phone}</a></li>
          <li><a href={`mailto:${BRAND.email}`} class="hover:text-white break-all"><i class="fas fa-envelope mr-2 text-red-500"></i>{BRAND.email}</a></li>
        </ul>
        <a href="/book" class="btn-primary inline-flex mt-4 text-sm">Request a Quote</a>
      </div>
    </div>
    <div class="border-t border-white/10 py-5 text-center text-xs">
      © {new Date().getFullYear()} {BRAND.name}. All rights reserved.
      {user ? (
        <> · <a href="/profile" class="hover:text-white">My Profile</a></>
      ) : (
        <> · <a href="/login" class="hover:text-white">Sign In</a> · <a href="/register" class="hover:text-white">Sign Up</a></>
      )}
    </div>
  </footer>
)

/**
 * Floating Contact button — bottom-right corner, animated (pulse ring + hover label).
 * Replaces the old navbar "Contact" link.
 */
export const ContactFab: FC = () => (
  <div class="contact-fab" id="contact-fab">
    <span class="contact-fab__ring" aria-hidden="true"></span>
    <span class="contact-fab__ring contact-fab__ring--2" aria-hidden="true"></span>
    <a href="/contact" class="contact-fab__btn" aria-label="Contact us">
      <i class="fas fa-comments"></i>
      <span class="contact-fab__label">Contact Us</span>
    </a>
  </div>
)

export const PublicLayout: FC<{ children?: any; current?: string; title?: string; description?: string; user?: SessionUser | null }> = ({
  children,
  current,
  title,
  description,
  user,
}) => (
  <html lang="en">
    <PublicHead title={title} description={description} />
    <body class="site-public bg-slate-950 text-slate-100 antialiased">
      <PublicHeader current={current} user={user} />
      <main>{children}</main>
      <PublicFooter user={user} />
      <ContactFab />
      <script src="/static/app.js"></script>
    </body>
  </html>
)

export const PageHero: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <section class="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
    <div class="absolute inset-0 opacity-20" style="background-image:radial-gradient(circle at 20% 20%, #ef4444 0, transparent 40%),radial-gradient(circle at 80% 0%, #3b82f6 0, transparent 35%)"></div>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 py-14">
      {eyebrow && <div class="text-red-500 font-semibold tracking-widest text-xs uppercase mb-3">{eyebrow}</div>}
      <h1 class="text-3xl sm:text-4xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p class="text-slate-400 mt-3 max-w-2xl">{subtitle}</p>}
    </div>
  </section>
)
