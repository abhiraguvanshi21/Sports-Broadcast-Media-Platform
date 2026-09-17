import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { PublicLayout, PageHero } from '../lib/public_layout'
import { SectionTitle, Chip } from '../lib/components'
import { fmtDate, esc } from '../lib/utils'

export const publicRoutes = new Hono<AppEnv>()

// ---------- HOME ----------
publicRoutes.get('/', async (c) => {
  const db = c.env.DB
  const [liveNow, upcoming, latest, services, portfolio, stats] = await Promise.all([
    db.prepare(`SELECT le.*, e.name, e.sport, e.venue_name FROM live_events le JOIN events e ON e.id = le.event_id WHERE le.status='live' ORDER BY le.display_order LIMIT 1`).first(),
    db.prepare(`SELECT e.* FROM events e WHERE e.status='upcoming' ORDER BY e.start_date LIMIT 4`).all(),
    db.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 ORDER BY m.created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order LIMIT 8`).all(),
    db.prepare(`SELECT * FROM portfolio WHERE is_published=1 ORDER BY created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT (SELECT COUNT(*) FROM events) events, (SELECT COUNT(*) FROM events WHERE status='completed') completed, (SELECT COUNT(*) FROM media WHERE is_public=1) media, (SELECT COUNT(*) FROM employees WHERE status='active') staff`).first<any>(),
  ])

  return c.html(
    <PublicLayout current="/" title="Live Sports Broadcast & Production">
      {/* HERO */}
      <section class="relative overflow-hidden">
        <div class="absolute inset-0 opacity-30" style="background-image:radial-gradient(circle at 15% 10%, #ef4444 0, transparent 35%),radial-gradient(circle at 85% 20%, #f97316 0, transparent 30%)"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            {liveNow ? (
              <a href="/live" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-semibold mb-5">
                <i class="fas fa-circle text-[7px] live-dot"></i> LIVE NOW · {esc((liveNow as any).name)}
              </a>
            ) : (
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-slate-300 text-sm font-semibold mb-5">
                <img src="/static/logo-icon.png" alt="" class="w-5 h-5 rounded-md object-cover" /> Every sport. Every moment. <span class="text-red-500">Live.</span>
              </span>
            )}
            <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              Where every match <span class="bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">goes live</span>.
            </h1>
            <p class="text-slate-400 mt-5 text-lg max-w-xl">
              Complete sports media solutions — multi-camera match production, digital streaming, commentary, live graphics, photography, video and highlights — for leagues, tournaments and clubs.
            </p>
            <div class="flex flex-wrap gap-3 mt-8">
              <a href="/book" class="btn-primary px-6 py-3 text-base">Request a Quote <i class="fas fa-arrow-right"></i></a>
              <a href="/live" class="px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition inline-flex items-center gap-2">
                <i class="fas fa-play text-red-500"></i> Watch Live
              </a>
            </div>
            <div class="grid grid-cols-3 gap-6 mt-12 max-w-lg">
              <div><div class="text-2xl font-extrabold text-white">{stats?.events ?? 0}+</div><div class="text-xs text-slate-500 uppercase tracking-wide">Events</div></div>
              <div><div class="text-2xl font-extrabold text-white">{stats?.media ?? 0}+</div><div class="text-xs text-slate-500 uppercase tracking-wide">Media</div></div>
              <div><div class="text-2xl font-extrabold text-white">{stats?.staff ?? 0}+</div><div class="text-xs text-slate-500 uppercase tracking-wide">Crew</div></div>
            </div>
          </div>
          <div class="relative">
            <div class="aspect-video rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center">
              {liveNow && (liveNow as any).embed_code ? (
                <div class="w-full h-full" dangerouslySetInnerHTML={{ __html: (liveNow as any).embed_code }}></div>
              ) : (
                <div class="text-center px-6">
                  <div class="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-3xl text-white mb-4">
                    <i class="fas fa-tower-broadcast"></i>
                  </div>
                  <div class="text-white font-bold text-lg">Live Control Center</div>
                  <p class="text-slate-400 text-sm mt-1">Streams appear here the moment an event goes live.</p>
                </div>
              )}
            </div>
            <div class="absolute -bottom-5 -left-5 bg-white text-slate-900 rounded-2xl shadow-xl px-5 py-3 hidden sm:flex items-center gap-3">
              <span class="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center"><i class="fas fa-camera-retro"></i></span>
              <div><div class="font-bold text-sm">Multi-Camera</div><div class="text-xs text-slate-500">Production Ready</div></div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionTitle eyebrow="What we do" title="Complete Sports Media Services" subtitle="Professional media solutions for leagues, tournaments and sporting events." light center />
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
          {(services.results as any[]).map((s) => (
            <a href={`/services#${s.slug}`} class="group p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-white/[0.07] transition">
              <span class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-lg mb-4">
                <i class={`fas ${s.icon || 'fa-broadcast-tower'}`}></i>
              </span>
              <h3 class="font-bold text-white">{esc(s.title)}</h3>
              <p class="text-sm text-slate-400 mt-2">{esc(s.short_desc)}</p>
            </a>
          ))}
        </div>
        <div class="text-center mt-10"><a href="/services" class="px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 inline-flex items-center gap-2">Explore all services <i class="fas fa-arrow-right text-xs"></i></a></div>
      </section>

      {/* LIVE + UPCOMING */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-2 gap-8">
        <div class="rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent p-7">
          <div class="flex items-center justify-between">
            <h3 class="font-extrabold text-xl text-white">Live & Upcoming</h3>
            <a href="/live" class="text-sm text-red-400 hover:text-red-300 font-semibold">Go to Live <i class="fas fa-arrow-right text-xs"></i></a>
          </div>
          <div class="mt-5 space-y-3">
            {(upcoming.results as any[]).length === 0 && <p class="text-slate-500 text-sm">No upcoming events scheduled.</p>}
            {(upcoming.results as any[]).map((e) => (
              <a href={`/events/${e.id}`} class="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/25 transition">
                <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-red-400"><i class="fas fa-trophy"></i></div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-white truncate">{esc(e.name)}</div>
                  <div class="text-xs text-slate-400">{e.sport || 'Sport'} · {fmtDate(e.start_date)} · {esc(e.venue_name || 'TBA')}</div>
                </div>
                <Chip status="upcoming" />
              </a>
            ))}
          </div>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="flex items-center justify-between">
            <h3 class="font-extrabold text-xl text-white">Latest Broadcasts</h3>
            <a href="/gallery" class="text-sm text-slate-300 hover:text-white font-semibold">Gallery <i class="fas fa-arrow-right text-xs"></i></a>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-5">
            {(latest.results as any[]).length === 0 && <p class="text-slate-500 text-sm col-span-2">No published media yet.</p>}
            {(latest.results as any[]).slice(0, 4).map((m) => (
              <a href={m.url} target="_blank" class="group relative aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                {m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-photo-film text-2xl"></i></div>}
                <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white font-medium truncate">{esc(m.title)}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* PORTFOLIO */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <SectionTitle eyebrow="Proof of work" title="Recent portfolio" subtitle="Selected projects delivered across sports and events." light center />
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {(portfolio.results as any[]).map((p) => (
            <a href="/portfolio" class="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25 transition">
              <div class="aspect-video bg-slate-800 relative overflow-hidden">
                {p.cover_image ? <img src={p.cover_image} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-image text-3xl"></i></div>}
                {p.sport && <span class="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-semibold">{esc(p.sport)}</span>}
              </div>
              <div class="p-5">
                <h3 class="font-bold text-white">{esc(p.title)}</h3>
                <p class="text-sm text-slate-400 mt-1 line-clamp-2">{esc(p.description)}</p>
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div class="rounded-3xl bg-gradient-to-r from-red-600 to-orange-500 p-10 sm:p-14 text-center">
          <h2 class="text-3xl sm:text-4xl font-black text-white">Planning a tournament or match broadcast?</h2>
          <p class="text-white/90 mt-3 max-w-xl mx-auto">Tell us your event details — no account needed. We'll generate a Booking ID and respond with a quotation you can track securely.</p>
          <div class="flex flex-wrap justify-center gap-3 mt-8">
            <a href="/book" class="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100">Book / Request Quote</a>
            <a href="/track" class="px-6 py-3 rounded-xl border-2 border-white/60 text-white font-bold hover:bg-white/10">Track Existing Booking</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
})

// ---------- ABOUT ----------
publicRoutes.get('/about', (c) =>
  c.html(
    <PublicLayout current="/about" title="About Us">
      <PageHero eyebrow="About" title="Built for the pace of live sport" subtitle="We are a dedicated sports broadcast and media-production team — cameras, commentary, graphics, streaming and social-first highlights under one roof." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-12">
        <div>
          <SectionTitle eyebrow="Our story" title="From single-camera set-ups to full broadcast weekends" />
          <div class="mt-5 space-y-4 text-slate-400">
            <p>AWADH Sports Live started as a small crew covering local tournaments and grew into a full production house handling multi-camera broadcasts, live graphics, replays and commentary for leagues and clubs.</p>
            <p>Our philosophy is simple: reliability first. Broadcast happens once — so planning, redundancy and clear communication matter more than any single shot.</p>
            <p>Today we combine production craft with a modern operations platform: bookings, crew scheduling, equipment tracking and live control all in one system.</p>
          </div>
        </div>
        <div class="grid sm:grid-cols-2 gap-4">
          {[
            { icon: 'fa-camera-retro', t: 'Multi-Camera', d: 'Up to 8-camera set-ups' },
            { icon: 'fa-tower-broadcast', t: 'Live Streaming', d: 'Multi-platform delivery' },
            { icon: 'fa-clapperboard', t: 'Graphics & Replay', d: 'Score, stats, slo-mo' },
            { icon: 'fa-microphone-lines', t: 'Commentary', d: 'Bilingual commentary' },
            { icon: 'fa-camera', t: 'Photography', d: 'Match & event coverage' },
            { icon: 'fa-film', t: 'Highlights', d: 'Social-ready edits' },
          ].map((f) => (
            <div class="p-5 rounded-2xl bg-white/5 border border-white/10">
              <i class={`fas ${f.icon} text-red-500 text-xl`}></i>
              <div class="font-bold text-white mt-3">{f.t}</div>
              <div class="text-sm text-slate-400">{f.d}</div>
            </div>
          ))}
        </div>
      </section>
      <section class="max-w-7xl mx-auto px-4 sm:px-6 pb-16">
        <div class="rounded-3xl bg-white/5 border border-white/10 p-10 grid sm:grid-cols-4 gap-8 text-center">
          {[['500+','Matches covered'],['50+','Leagues & clubs'],['8','Camera capability'],['24/7','Production support']].map(([v,l])=>(
            <div><div class="text-3xl font-black bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent">{v}</div><div class="text-sm text-slate-400 mt-1">{l}</div></div>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
)

// ---------- SERVICES ----------
publicRoutes.get('/services', async (c) => {
  const services = await c.env.DB.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order`).all()
  return c.html(
    <PublicLayout current="/services" title="Services">
      <PageHero eyebrow="What we do" title="Complete Sports Media Services" subtitle="Professional media solutions for leagues, tournaments and sporting events." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(services.results as any[]).map((s, i) => (
            <article id={s.slug} class="group relative flex flex-col p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-white/[0.07] transition">
              <span class="absolute top-5 right-5 text-4xl font-black text-white/[0.06] group-hover:text-red-500/15 transition">{String(i + 1).padStart(2, '0')}</span>
              <span class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-xl mb-4 shadow-lg">
                <i class={`fas ${s.icon || 'fa-broadcast-tower'}`}></i>
              </span>
              <h3 class="text-lg font-bold text-white">{esc(s.title)}</h3>
              <p class="text-sm text-slate-400 mt-2 flex-1">{esc(s.short_desc)}</p>
              <a href={`/book?service=${s.id}`} class="inline-flex items-center gap-2 mt-4 text-red-400 hover:text-red-300 font-semibold text-sm">
                Request this service <i class="fas fa-arrow-right text-xs"></i>
              </a>
            </article>
          ))}
        </div>
        <div class="mt-10 rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 grid md:grid-cols-2 gap-6 items-center">
          <div>
            <h3 class="font-bold text-white text-lg">Production vs streaming — what's the difference?</h3>
            <p class="text-sm text-slate-400 mt-2">
              <b class="text-slate-200">Match Production</b> creates the professional live feed — cameras, direction and switching.
              <b class="text-slate-200">Digital Streaming</b> then delivers that feed to your online audience. Both are needed for a complete broadcast; the other services cover separate deliverables.
            </p>
          </div>
          <div class="flex md:justify-end gap-3">
            <a href={`/book?service=1`} class="btn-primary px-5 py-3 text-sm">Book Match Production</a>
            <a href={`/book?service=2`} class="px-5 py-3 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5 text-sm">Book Streaming</a>
          </div>
        </div>
        <div class="text-center pt-8"><a href="/book" class="btn-primary px-6 py-3">Request a Custom Quote</a></div>
      </section>
    </PublicLayout>
  )
})

// ---------- PORTFOLIO ----------
publicRoutes.get('/portfolio', async (c) => {
  const sport = c.req.query('sport')
  const q = sport
    ? c.env.DB.prepare(`SELECT * FROM portfolio WHERE is_published=1 AND sport=? ORDER BY created_at DESC`).bind(sport)
    : c.env.DB.prepare(`SELECT * FROM portfolio WHERE is_published=1 ORDER BY created_at DESC`)
  const rows = await q.all()
  const sports = await c.env.DB.prepare(`SELECT DISTINCT sport FROM portfolio WHERE sport IS NOT NULL`).all()
  return c.html(
    <PublicLayout current="/portfolio" title="Portfolio">
      <PageHero eyebrow="Portfolio" title="Projects we've delivered" subtitle="Grouped by sport and event type, with the services delivered for each." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div class="flex flex-wrap gap-2 mb-8">
          <a href="/portfolio" class={`px-4 py-2 rounded-xl text-sm font-semibold border ${!sport ? 'bg-white text-slate-900 border-white' : 'border-white/20 text-slate-300 hover:bg-white/5'}`}>All</a>
          {(sports.results as any[]).map((s) => (
            <a href={`/portfolio?sport=${encodeURIComponent(s.sport)}`} class={`px-4 py-2 rounded-xl text-sm font-semibold border ${sport === s.sport ? 'bg-white text-slate-900 border-white' : 'border-white/20 text-slate-300 hover:bg-white/5'}`}>{esc(s.sport)}</a>
          ))}
        </div>
        {(rows.results as any[]).length === 0 && <p class="text-slate-500">No portfolio projects published yet.</p>}
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {(rows.results as any[]).map((p) => (
            <article class="rounded-2xl overflow-hidden bg-white/5 border border-white/10">
              <div class="aspect-video bg-slate-800">
                {p.cover_image ? <img src={p.cover_image} class="w-full h-full object-cover" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-image text-3xl"></i></div>}
              </div>
              <div class="p-5">
                <div class="flex gap-2 mb-2">{p.sport && <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-semibold">{esc(p.sport)}</span>}{p.client && <span class="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-xs">{esc(p.client)}</span>}</div>
                <h3 class="font-bold text-white">{esc(p.title)}</h3>
                <p class="text-sm text-slate-400 mt-2">{esc(p.description)}</p>
                {p.services_delivered && <p class="text-xs text-slate-500 mt-3"><i class="fas fa-check-circle text-red-500 mr-1"></i>{esc(p.services_delivered)}</p>}
              </div>
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
})

// ---------- EVENTS ----------
publicRoutes.get('/events', async (c) => {
  const rows = await c.env.DB.prepare(`SELECT * FROM events WHERE status IN ('upcoming','live','completed') ORDER BY COALESCE(start_date, '9999') DESC`).all()
  const by = (s: string) => (rows.results as any[]).filter((e) => e.status === s)
  return c.html(
    <PublicLayout current="/events" title="Events">
      <PageHero eyebrow="Events" title="Upcoming, live and completed" subtitle="Every event has its own page with schedule, production details and media." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
        {[
          { key: 'live', label: 'Live', status: 'live' },
          { key: 'upcoming', label: 'Upcoming', status: 'upcoming' },
          { key: 'completed', label: 'Completed', status: 'completed' },
        ].map((group) => (
          <div>
            <div class="flex items-center gap-3 mb-5">
              <h2 class="text-xl font-extrabold text-white">{group.label}</h2>
              <span class="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300">{by(group.status).length}</span>
            </div>
            {by(group.status).length === 0 ? (
              <p class="text-slate-500 text-sm">No {group.label.toLowerCase()} events.</p>
            ) : (
              <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {by(group.status).map((e) => (
                  <a href={`/events/${e.id}`} class="rounded-2xl bg-white/5 border border-white/10 hover:border-white/25 transition p-6">
                    <div class="flex items-center justify-between mb-3">
                      <span class="text-xs px-2 py-0.5 rounded bg-white/10 text-slate-300">{esc(e.sport || 'Sport')}</span>
                      <Chip status={e.status} />
                    </div>
                    <h3 class="font-bold text-white">{esc(e.name)}</h3>
                    <div class="text-sm text-slate-400 mt-2 space-y-1">
                      <div><i class="fas fa-calendar w-4 text-red-500"></i> {fmtDate(e.start_date)}</div>
                      <div><i class="fas fa-location-dot w-4 text-red-500"></i> {esc(e.venue_name || 'TBA')}</div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>
    </PublicLayout>
  )
})

// ---------- EVENT DETAIL ----------
publicRoutes.get('/events/:id', async (c) => {
  const id = Number(c.req.param('id'))
  const e: any = await c.env.DB.prepare(`SELECT * FROM events WHERE id=?`).bind(id).first()
  if (!e) return c.notFound()
  const [team, media, live, schedule] = await Promise.all([
    c.env.DB.prepare(`SELECT et.role, u.full_name FROM event_team et JOIN employees emp ON emp.id=et.employee_id JOIN users u ON u.id=emp.user_id WHERE et.event_id=?`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM media WHERE event_id=? AND status='approved' AND is_public=1`).bind(id).all(),
    c.env.DB.prepare(`SELECT * FROM live_events WHERE event_id=?`).bind(id).first(),
    c.env.DB.prepare(`SELECT * FROM production_schedule WHERE event_id=? ORDER BY start_time`).bind(id).all(),
  ])
  return c.html(
    <PublicLayout title={e.name}>
      <PageHero eyebrow={e.sport || 'Event'} title={e.name} subtitle={e.description} />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2 space-y-6">
          {live && (live as any).status === 'live' && (live as any).embed_code && (
            <div class="rounded-2xl overflow-hidden border border-red-500/40">
              <div class="px-4 py-2 bg-red-500/15 text-red-400 text-sm font-semibold flex items-center gap-2"><i class="fas fa-circle text-[7px] live-dot"></i> LIVE NOW</div>
              <div class="aspect-video bg-black" dangerouslySetInnerHTML={{ __html: (live as any).embed_code }}></div>
            </div>
          )}
          <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 class="font-bold text-white mb-3">Event details</h3>
            <dl class="grid sm:grid-cols-2 gap-4 text-sm">
              {[
                ['Status', null],
                ['Organizer', e.organizer],
                ['Start date', fmtDate(e.start_date)],
                ['End date', fmtDate(e.end_date)],
                ['Reporting time', e.reporting_time],
                ['Venue', e.venue_name],
                ['Address', e.venue_address],
              ].map(([k, v]) =>
                k === 'Status' ? (
                  <div><dt class="text-slate-500">{k}</dt><dd class="mt-1"><Chip status={e.status} /></dd></div>
                ) : (
                  <div><dt class="text-slate-500">{k}</dt><dd class="text-slate-200 mt-1">{esc(v || '—')}</dd></div>
                )
              )}
            </dl>
            {e.required_services && <p class="text-sm text-slate-400 mt-4"><span class="text-slate-500">Services:</span> {esc(e.required_services)}</p>}
          </div>
          {(schedule.results as any[]).length > 0 && (
            <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 class="font-bold text-white mb-4">Production schedule</h3>
              <div class="space-y-3">
                {(schedule.results as any[]).map((s) => (
                  <div class="flex items-start gap-4 p-3 rounded-xl bg-slate-900/50">
                    <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-bold uppercase">{esc(s.milestone)}</span>
                    <div class="text-sm text-slate-300">{fmtDate(s.start_time)} · {esc(s.notes || '')}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {(media.results as any[]).length > 0 && (
            <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
              <h3 class="font-bold text-white mb-4">Media</h3>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(media.results as any[]).map((m) => (
                  <a href={m.url} target="_blank" class="aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/10">
                    {m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-photo-film"></i></div>}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
        <aside class="space-y-6">
          <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 class="font-bold text-white mb-4">Production team</h3>
            {(team.results as any[]).length === 0 ? (
              <p class="text-sm text-slate-500">Team not published.</p>
            ) : (
              <ul class="space-y-3">
                {(team.results as any[]).map((t) => (
                  <li class="flex items-center gap-3">
                    <span class="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center">{t.full_name?.charAt(0)}</span>
                    <div><div class="text-sm text-white font-medium">{esc(t.full_name)}</div><div class="text-xs text-slate-500 capitalize">{esc(t.role)}</div></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="rounded-2xl bg-gradient-to-br from-red-600 to-orange-500 p-6 text-center">
            <p class="text-white font-bold">Need coverage like this?</p>
            <a href="/book" class="inline-flex mt-3 px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold text-sm">Request a Quote</a>
          </div>
        </aside>
      </section>
    </PublicLayout>
  )
})

// ---------- LIVE HUB ----------
publicRoutes.get('/live', async (c) => {
  const [liveNow, upcoming, latest, highlights, channels] = await Promise.all([
    c.env.DB.prepare(`SELECT le.*, e.name, e.sport, e.venue_name, e.id AS eid FROM live_events le JOIN events e ON e.id=le.event_id WHERE le.status='live' ORDER BY le.display_order`).all(),
    c.env.DB.prepare(`SELECT le.*, e.name, e.sport, e.start_date, e.id AS eid FROM live_events le JOIN events e ON e.id=le.event_id WHERE le.status='upcoming' ORDER BY le.scheduled_at LIMIT 6`).all(),
    c.env.DB.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 AND m.media_type IN ('video','highlight','reel','interview') ORDER BY m.created_at DESC LIMIT 8`).all(),
    c.env.DB.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 AND m.media_type='highlight' ORDER BY m.created_at DESC LIMIT 4`).all(),
    c.env.DB.prepare(`SELECT DISTINCT platform FROM live_events WHERE platform IS NOT NULL`).all(),
  ])
  const main = (liveNow.results as any[])[0]
  return c.html(
    <PublicLayout current="/live" title="Live">
      <PageHero eyebrow="Live Hub" title="Watch us live" subtitle="Current live broadcast, upcoming streams, latest videos and highlights." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-3 gap-8">
        <div class="lg:col-span-2">
          {main ? (
            <div class="rounded-2xl overflow-hidden border border-red-500/40 bg-black">
              <div class="px-4 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-between">
                <span class="font-bold flex items-center gap-2"><i class="fas fa-circle text-[8px] live-dot"></i> LIVE · {esc(main.name)}</span>
                <span class="text-xs bg-black/20 px-2 py-1 rounded-full">{esc(main.platform || 'Stream')}</span>
              </div>
              <div class="aspect-video">
                {main.embed_code ? <div class="w-full h-full" dangerouslySetInnerHTML={{ __html: main.embed_code }}></div>
                  : main.stream_url ? <iframe src={main.stream_url} class="w-full h-full" allowfullscreen></iframe>
                  : <div class="w-full h-full flex items-center justify-center text-slate-500">Stream link not configured.</div>}
              </div>
            </div>
          ) : (
            <div class="rounded-2xl border border-white/10 bg-white/5 aspect-video flex items-center justify-center text-center">
              <div>
                <i class="fas fa-tower-broadcast text-4xl text-slate-600"></i>
                <p class="text-slate-400 mt-3 font-semibold">No live broadcast right now</p>
                <p class="text-sm text-slate-500">Check the upcoming streams below.</p>
              </div>
            </div>
          )}

          <div class="mt-8">
            <h3 class="font-extrabold text-white text-lg mb-4">Latest broadcasts & videos</h3>
            <div class="grid sm:grid-cols-2 gap-4">
              {(latest.results as any[]).length === 0 && <p class="text-slate-500 text-sm">No videos published yet.</p>}
              {(latest.results as any[]).map((m) => (
                <a href={m.url} target="_blank" class="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25">
                  <div class="aspect-video bg-slate-800 relative">
                    {m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-play-circle text-2xl"></i></div>}
                    <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs capitalize">{esc(m.media_type)}</span>
                  </div>
                  <div class="p-3 text-sm text-white font-medium truncate">{esc(m.title)}</div>
                </a>
              ))}
            </div>
          </div>
        </div>

        <aside class="space-y-6">
          <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-clock text-red-500"></i> Upcoming streams</h3>
            {(upcoming.results as any[]).length === 0 ? <p class="text-sm text-slate-500">Nothing scheduled.</p> : (
              <ul class="space-y-4">
                {(upcoming.results as any[]).map((u) => (
                  <li class="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <a href={`/events/${u.eid}`} class="font-semibold text-white hover:text-red-400 text-sm">{esc(u.name)}</a>
                    <div class="text-xs text-slate-400 mt-1">{esc(u.sport || '')} · {fmtDate(u.scheduled_at || u.start_date)}</div>
                    <div class="countdown text-xs text-red-400 font-mono mt-1" data-date={u.scheduled_at || u.start_date}></div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-fire text-red-500"></i> Highlights</h3>
            <div class="space-y-3">
              {(highlights.results as any[]).length === 0 && <p class="text-sm text-slate-500">No highlights yet.</p>}
              {(highlights.results as any[]).map((h) => (
                <a href={h.url} target="_blank" class="flex gap-3 items-center group">
                  <div class="w-20 h-12 rounded-lg bg-slate-800 overflow-hidden shrink-0">{h.thumbnail ? <img src={h.thumbnail} class="w-full h-full object-cover" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-play text-xs"></i></div>}</div>
                  <span class="text-sm text-slate-300 group-hover:text-white line-clamp-2">{esc(h.title)}</span>
                </a>
              ))}
            </div>
          </div>
        </aside>
      </section>
    </PublicLayout>
  )
})

// ---------- MEDIA GALLERY ----------
publicRoutes.get('/gallery', async (c) => {
  const type = c.req.query('type')
  const q = type
    ? c.env.DB.prepare(`SELECT * FROM media WHERE status='approved' AND is_public=1 AND media_type=? ORDER BY created_at DESC`).bind(type)
    : c.env.DB.prepare(`SELECT * FROM media WHERE status='approved' AND is_public=1 ORDER BY created_at DESC`)
  const rows = await q.all()
  const types = ['photo', 'video', 'highlight', 'reel', 'interview']
  return c.html(
    <PublicLayout current="/gallery" title="Media Gallery">
      <PageHero eyebrow="Gallery" title="Photos, videos & highlights" subtitle="Approved and published media from our events." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div class="flex flex-wrap gap-2 mb-8">
          <a href="/gallery" class={`px-4 py-2 rounded-xl text-sm font-semibold border ${!type ? 'bg-white text-slate-900 border-white' : 'border-white/20 text-slate-300 hover:bg-white/5'}`}>All</a>
          {types.map((t) => (
            <a href={`/gallery?type=${t}`} class={`px-4 py-2 rounded-xl text-sm font-semibold border capitalize ${type === t ? 'bg-white text-slate-900 border-white' : 'border-white/20 text-slate-300 hover:bg-white/5'}`}>{t}</a>
          ))}
        </div>
        {(rows.results as any[]).length === 0 && <p class="text-slate-500">No media published yet.</p>}
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(rows.results as any[]).map((m) => (
            <a href={m.url} target="_blank" class="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-white/25">
              <div class="aspect-square bg-slate-800 relative">
                {m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-photo-film text-2xl"></i></div>}
                {m.media_type !== 'photo' && <span class="absolute inset-0 flex items-center justify-center"><span class="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center text-white"><i class="fas fa-play"></i></span></span>}
                <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs capitalize">{esc(m.media_type)}</span>
              </div>
              <div class="p-3 text-sm text-white truncate">{esc(m.title)}</div>
            </a>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
})

// ---------- CONTACT ----------
publicRoutes.get('/contact', (c) =>
  c.html(
    <PublicLayout current="/contact" title="Contact">
      <PageHero eyebrow="Contact" title="Let's talk broadcast" subtitle="Send us a message or use the booking form for a detailed quotation." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid lg:grid-cols-2 gap-10">
        <div class="rounded-3xl bg-white/5 border border-white/10 p-8">
          <h2 class="font-bold text-white text-lg mb-5">Send an enquiry</h2>
          <form id="contact-form" class="space-y-4">
            <div class="grid sm:grid-cols-2 gap-4">
              <input name="name" required placeholder="Your name *" class="form-dark" />
              <input name="phone" placeholder="Phone" class="form-dark" />
            </div>
            <input name="email" type="email" placeholder="Email" class="form-dark" />
            <input name="subject" placeholder="Subject" class="form-dark" />
            <textarea name="message" required rows={5} placeholder="Your message *" class="form-dark"></textarea>
            <div id="contact-msg" class="hidden text-sm rounded-xl px-4 py-3"></div>
            <button type="submit" class="btn-primary w-full py-3">Send Message</button>
          </form>
        </div>
        <div class="space-y-5">
          {[
            { i: 'fa-location-dot', t: 'Office', d: 'Sports Media House, Stadium Road, India' },
            { i: 'fa-phone', t: 'Phone', d: '+91 90000 00000' },
            { i: 'fa-envelope', t: 'Email', d: 'hello@awadhsportslive.example' },
            { i: 'fa-clock', t: 'Working hours', d: 'Mon–Sat · 9:00 AM – 8:00 PM' },
          ].map((x) => (
            <div class="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10">
              <span class="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center"><i class={`fas ${x.i}`}></i></span>
              <div><div class="font-semibold text-white">{x.t}</div><div class="text-sm text-slate-400">{x.d}</div></div>
            </div>
          ))}
          <div class="rounded-2xl bg-gradient-to-r from-red-600 to-orange-500 p-6">
            <p class="text-white font-bold">Prefer a formal request?</p>
            <p class="text-white/90 text-sm mt-1">Use the booking form to get a Booking ID and tracked quotation.</p>
            <a href="/book" class="inline-flex mt-4 px-4 py-2 rounded-xl bg-white text-slate-900 font-semibold text-sm">Book / Request Quote</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
)

// ---------- CAREERS ----------
publicRoutes.get('/careers', async (c) => {
  const jobs = await c.env.DB.prepare(`SELECT * FROM job_openings WHERE is_open=1 ORDER BY created_at DESC`).all()
  return c.html(
    <PublicLayout current="/careers" title="Careers">
      <PageHero eyebrow="Careers" title="Join the crew" subtitle="We're always looking for camera operators, producers, editors and streaming engineers." />
      <section class="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-5">
        {(jobs.results as any[]).length === 0 && <p class="text-slate-500">No open positions right now. Check back soon.</p>}
        {(jobs.results as any[]).map((j) => (
          <details class="rounded-2xl bg-white/5 border border-white/10 p-6 group">
            <summary class="flex items-center justify-between cursor-pointer list-none">
              <div>
                <h3 class="font-bold text-white">{esc(j.title)}</h3>
                <div class="text-sm text-slate-400 mt-1">{esc(j.department || '')} · {esc(j.location || '')} · {esc((j.job_type || '').replace('_', ' '))}</div>
              </div>
              <i class="fas fa-chevron-down text-slate-400 group-open:rotate-180 transition"></i>
            </summary>
            <div class="mt-5 pt-5 border-t border-white/10">
              <p class="text-slate-400 text-sm">{esc(j.description)}</p>
              <form class="apply-form mt-5 grid sm:grid-cols-2 gap-4" data-job={j.id}>
                <input name="name" required placeholder="Your name *" class="form-dark" />
                <input name="phone" placeholder="Phone" class="form-dark" />
                <input name="email" type="email" placeholder="Email" class="form-dark" />
                <input name="resume_url" placeholder="Resume link (Drive/Dropbox)" class="form-dark" />
                <textarea name="cover_letter" rows={3} placeholder="Why you? (optional)" class="form-dark sm:col-span-2"></textarea>
                <button type="submit" class="btn-primary sm:col-span-2 py-3">Apply Now</button>
                <div class="apply-msg hidden sm:col-span-2 text-sm rounded-xl px-4 py-3"></div>
              </form>
            </div>
          </details>
        ))}
      </section>
    </PublicLayout>
  )
})
