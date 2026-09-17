import type { FC } from 'hono/jsx'

export const PublicHead: FC<{ title?: string; description?: string }> = ({ title, description }) => (
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title ? `${title} · PrimeCast Sports Media` : 'PrimeCast Sports Media — Live Broadcast & Production'}</title>
    <meta name="description" content={description || 'Professional sports broadcasting, live telecast, streaming, multi-camera production and media services.'} />
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet" />
    <link href="/static/styles.css" rel="stylesheet" />
    <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
  </head>
)

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/services', label: 'Services' },
  { href: '/portfolio', label: 'Portfolio' },
  { href: '/events', label: 'Events' },
  { href: '/live', label: 'Live', accent: true },
  { href: '/gallery', label: 'Gallery' },
  { href: '/careers', label: 'Careers' },
  { href: '/contact', label: 'Contact' },
]

export const PublicHeader: FC<{ current?: string }> = ({ current }) => (
  <header class="site-header sticky top-0 z-50 backdrop-blur bg-slate-950/90 border-b border-white/10">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
      <a href="/" class="flex items-center gap-2 text-white font-extrabold text-lg tracking-tight">
        <span class="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-lg">
          <i class="fas fa-satellite-dish text-white"></i>
        </span>
        <span>Prime<span class="text-red-500">Cast</span></span>
      </a>
      <nav class="hidden lg:flex items-center gap-1 text-sm">
        {NAV.map((n) => (
          <a
            href={n.href}
            class={`px-3 py-2 rounded-lg transition ${
              current === n.href ? 'text-white bg-white/10' : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            {n.accent && <i class="fas fa-circle text-red-500 text-[7px] mr-1.5 align-middle live-dot"></i>}
            {n.label}
          </a>
        ))}
      </nav>
      <div class="flex items-center gap-2">
        <a href="/book" class="hidden sm:inline-flex btn-primary text-sm">Book Now</a>
        <a href="/login" class="hidden md:inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/15 text-slate-200 hover:bg-white/5 text-sm">
          <i class="fas fa-user-shield"></i> Staff
        </a>
        <button id="nav-toggle" class="lg:hidden text-white w-10 h-10 rounded-lg hover:bg-white/10" aria-label="Menu">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    </div>
    <div id="mobile-nav" class="lg:hidden hidden border-t border-white/10 bg-slate-950 px-4 py-3">
      <div class="grid grid-cols-2 gap-1">
        {NAV.map((n) => (
          <a href={n.href} class="px-3 py-2 rounded-lg text-slate-300 hover:bg-white/5 text-sm">{n.label}</a>
        ))}
      </div>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <a href="/book" class="btn-primary text-center text-sm">Book Now</a>
        <a href="/login" class="px-3 py-2 rounded-lg border border-white/15 text-slate-200 text-center text-sm">Staff Login</a>
      </div>
    </div>
  </header>
)

export const PublicFooter: FC = () => (
  <footer class="bg-slate-950 text-slate-400 border-t border-white/10 mt-20">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-4">
      <div>
        <div class="flex items-center gap-2 text-white font-extrabold text-lg mb-3">
          <span class="inline-flex w-9 h-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500">
            <i class="fas fa-satellite-dish text-white"></i>
          </span>
          Prime<span class="-ml-1 text-red-500">Cast</span>
        </div>
        <p class="text-sm leading-relaxed">
          Professional sports broadcasting, live telecast, multi-camera production, replays, graphics and media services for leagues, tournaments and clubs.
        </p>
        <div class="flex gap-3 mt-4 text-lg">
          <a href="#" class="hover:text-white"><i class="fab fa-youtube"></i></a>
          <a href="#" class="hover:text-white"><i class="fab fa-instagram"></i></a>
          <a href="#" class="hover:text-white"><i class="fab fa-facebook"></i></a>
          <a href="#" class="hover:text-white"><i class="fab fa-x-twitter"></i></a>
        </div>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Services</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/services#broadcast" class="hover:text-white">Live Broadcast</a></li>
          <li><a href="/services#streaming" class="hover:text-white">Streaming</a></li>
          <li><a href="/services#multicam" class="hover:text-white">Multi-Camera Production</a></li>
          <li><a href="/services#graphics" class="hover:text-white">Graphics & Replay</a></li>
          <li><a href="/services#photo" class="hover:text-white">Photography & Videography</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Company</h4>
        <ul class="space-y-2 text-sm">
          <li><a href="/about" class="hover:text-white">About Us</a></li>
          <li><a href="/portfolio" class="hover:text-white">Portfolio</a></li>
          <li><a href="/events" class="hover:text-white">Events</a></li>
          <li><a href="/careers" class="hover:text-white">Careers</a></li>
          <li><a href="/track" class="hover:text-white">Track Booking</a></li>
        </ul>
      </div>
      <div>
        <h4 class="text-white font-semibold mb-3">Get in touch</h4>
        <ul class="space-y-3 text-sm">
          <li><i class="fas fa-location-dot mr-2 text-red-500"></i> Sports Media House, Stadium Road</li>
          <li><i class="fas fa-phone mr-2 text-red-500"></i> +91 90000 00000</li>
          <li><i class="fas fa-envelope mr-2 text-red-500"></i> hello@primecast.example</li>
        </ul>
        <a href="/book" class="btn-primary inline-flex mt-4 text-sm">Request a Quote</a>
      </div>
    </div>
    <div class="border-t border-white/10 py-5 text-center text-xs">
      © {new Date().getFullYear()} PrimeCast Sports Media. All rights reserved. · <a href="/login" class="hover:text-white">Staff & Admin Portal</a>
    </div>
  </footer>
)

export const PublicLayout: FC<{ children?: any; current?: string; title?: string; description?: string }> = ({
  children,
  current,
  title,
  description,
}) => (
  <html lang="en">
    <PublicHead title={title} description={description} />
    <body class="bg-slate-950 text-slate-100 antialiased">
      <PublicHeader current={current} />
      <main>{children}</main>
      <PublicFooter />
      <script src="/static/app.js"></script>
    </body>
  </html>
)

export const PageHero: FC<{ eyebrow?: string; title: string; subtitle?: string }> = ({ eyebrow, title, subtitle }) => (
  <section class="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-slate-900 to-slate-950">
    <div class="absolute inset-0 opacity-20" style="background-image:radial-gradient(circle at 20% 20%, #ef4444 0, transparent 40%),radial-gradient(circle at 80% 0%, #f97316 0, transparent 35%)"></div>
    <div class="relative max-w-7xl mx-auto px-4 sm:px-6 py-16">
      {eyebrow && <div class="text-red-500 font-semibold tracking-widest text-xs uppercase mb-3">{eyebrow}</div>}
      <h1 class="text-3xl sm:text-5xl font-extrabold tracking-tight">{title}</h1>
      {subtitle && <p class="text-slate-400 mt-4 max-w-2xl">{subtitle}</p>}
    </div>
  </section>
)
