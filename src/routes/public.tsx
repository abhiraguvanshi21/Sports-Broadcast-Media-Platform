// ============================================================
// PUBLIC WEBSITE PAGES — aam logon ke liye saare pages
// Ismein: Home, About, Services, Portfolio, Events, Event detail,
// Live hub, Media Gallery, Contact aur Careers.
// (Har section ke upar alag Hinglish comment bhi hai.)
// ============================================================
import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { PublicLayout, PageHero, BRAND } from '../lib/public_layout'
import { SectionTitle, Chip } from '../lib/components'
import { fmtDate, esc } from '../lib/utils'
import { syncYouTube } from '../lib/youtube'

export const publicRoutes = new Hono<AppEnv>()

// Fire-and-forget YouTube auto-sync (cached via a freshness window so it
// doesn't run on every request). Any error is swallowed — the site still works.
function kickYouTubeSync(env: AppEnv['Bindings']) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    syncYouTube(env, { ttlMinutes: 20 }).catch(() => {})
  } catch { /* ignore */ }
}

/** Safely query youtube_videos even if the newer columns aren't migrated yet. */
async function ytRows(db: D1Database, where: string, limit: number) {
  try {
    const q = await db.prepare(`SELECT * FROM youtube_videos WHERE is_active=1 ${where} ORDER BY sort_order, id LIMIT ${limit}`).all()
    return q.results as any[]
  } catch {
    return [] as any[]
  }
}

// ---------- HOME ----------
publicRoutes.get('/', async (c) => {
  const db = c.env.DB
  kickYouTubeSync(c.env)
  const [liveNow, upcoming, latest, services, portfolio, stats, ytRecent, playlists, ytLive, ytUpcoming] = await Promise.all([
    db.prepare(`SELECT le.*, e.name, e.sport, e.venue_name FROM live_events le JOIN events e ON e.id = le.event_id WHERE le.status='live' ORDER BY le.display_order LIMIT 1`).first(),
    db.prepare(`SELECT e.* FROM events e WHERE e.status='upcoming' ORDER BY e.start_date LIMIT 4`).all(),
    db.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 ORDER BY m.created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order LIMIT 8`).all(),
    db.prepare(`SELECT * FROM portfolio WHERE is_published=1 ORDER BY created_at DESC LIMIT 6`).all(),
    db.prepare(`SELECT (SELECT COUNT(*) FROM events) events, (SELECT COUNT(*) FROM events WHERE status='completed') completed, (SELECT COUNT(*) FROM media WHERE is_public=1) media, (SELECT COUNT(*) FROM employees WHERE status='active') staff`).first<any>(),
    ytRows(db, `AND is_live=0 AND is_upcoming=0`, 8),
    db.prepare(`SELECT * FROM youtube_playlists WHERE is_active=1 ORDER BY is_featured DESC, sort_order LIMIT 6`).all(),
    ytRows(db, `AND is_live=1`, 1),
    ytRows(db, `AND is_upcoming=1`, 4),
  ])
  const ytLiveRow = (ytLive as any[])[0]
  const ytUpRows = ytUpcoming as any[]

  return c.html(
    <PublicLayout user={c.get('user')} current="/" title="Live Sports Broadcast & Production">
      {/* HERO */}
      <section class="relative overflow-hidden">
        <div class="absolute inset-0 opacity-30" style="background-image:radial-gradient(circle at 15% 10%, #ef4444 0, transparent 35%),radial-gradient(circle at 85% 20%, #f97316 0, transparent 30%)"></div>
        {/* Animated aurora glow + soft grid behind the hero copy (no cut-off text) */}
        <div class="hero-aurora" aria-hidden="true">
          <span class="hero-aurora__blob hero-aurora__blob--1"></span>
          <span class="hero-aurora__blob hero-aurora__blob--2"></span>
          <span class="hero-aurora__blob hero-aurora__blob--3"></span>
          <span class="hero-aurora__blob hero-aurora__blob--4"></span>
        </div>
        <div class="hero-sheen" aria-hidden="true"></div>
        {/* Floating sport icons drifting gently in the background */}
        <div class="hero-floaters" aria-hidden="true">
          <span class="hero-floater" style="left:6%;top:22%;font-size:2.4rem;animation-delay:0s"><i class="fas fa-futbol"></i></span>
          <span class="hero-floater" style="left:22%;top:70%;font-size:1.8rem;animation-delay:1.5s"><i class="fas fa-basketball"></i></span>
          <span class="hero-floater" style="left:44%;top:12%;font-size:1.6rem;animation-delay:3s"><i class="fas fa-table-tennis-paddle-ball"></i></span>
          <span class="hero-floater" style="left:62%;top:78%;font-size:2rem;animation-delay:2.2s"><i class="fas fa-trophy"></i></span>
          <span class="hero-floater" style="left:86%;top:30%;font-size:2.2rem;animation-delay:4s"><i class="fas fa-video"></i></span>
          <span class="hero-floater" style="left:92%;top:74%;font-size:1.5rem;animation-delay:.8s"><i class="fas fa-microphone"></i></span>
          <span class="hero-floater" style="left:34%;top:44%;font-size:1.4rem;animation-delay:5s"><i class="fas fa-baseball"></i></span>
          <span class="hero-floater" style="left:74%;top:8%;font-size:1.5rem;animation-delay:3.6s"><i class="fas fa-tower-broadcast"></i></span>
        </div>
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-16 pb-20 grid lg:grid-cols-2 gap-12 items-center">
          <div class="reveal reveal--left">
            {liveNow ? (
              <a href="/live" class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/40 text-red-400 text-sm font-semibold mb-5">
                <i class="fas fa-circle text-[7px] live-dot"></i> LIVE NOW · {esc((liveNow as any).name)}
              </a>
            ) : (
              <span class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/15 text-slate-300 text-sm font-semibold mb-5 float-slow">
                <img src="/static/logo-icon.png" alt="" class="w-5 h-5 rounded-md object-cover" /> Every sport. Every moment. <span class="text-red-500">Live.</span>
              </span>
            )}
            <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              Where every match <span class="shimmer">goes live</span>.
            </h1>
            <p class="text-slate-400 mt-5 text-lg max-w-xl">
              Complete sports media solutions — multi-camera match production, digital streaming, commentary, live graphics, photography, video and highlights — for leagues, tournaments and clubs.
            </p>
            <div class="flex flex-wrap gap-3 mt-8">
              <a href="/book" class="btn-primary px-6 py-3 text-base shine">Request a Quote <i class="fas fa-arrow-right"></i></a>
              <a href="/live" class="px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 transition inline-flex items-center gap-2">
                <i class="fas fa-play text-red-500"></i> Watch Live
              </a>
            </div>
            <div class="grid grid-cols-3 gap-6 mt-12 max-w-lg">
              <div class="reveal" style="transition-delay:.05s"><div class="text-3xl font-black text-white tick"><span data-count={stats?.events ?? 0} data-suffix="+">0</span></div><div class="text-xs text-slate-500 uppercase tracking-wide mt-1">Events</div></div>
              <div class="reveal" style="transition-delay:.15s"><div class="text-3xl font-black text-white tick"><span data-count={stats?.media ?? 0} data-suffix="+">0</span></div><div class="text-xs text-slate-500 uppercase tracking-wide mt-1">Media</div></div>
              <div class="reveal" style="transition-delay:.25s"><div class="text-3xl font-black text-white tick"><span data-count={stats?.staff ?? 0} data-suffix="+">0</span></div><div class="text-xs text-slate-500 uppercase tracking-wide mt-1">Crew</div></div>
            </div>
          </div>
          <div class="relative reveal reveal--right">
            <div class="aspect-video rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 shadow-2xl overflow-hidden flex items-center justify-center grad-border grad-border--on">
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

      {/* SERVICE MARQUEE — full-width scrolling capability band (no box) */}
      <section class="brand-marquee" aria-label="Our services">
        <div class="brand-marquee__track" id="brand-marquee-track">
          {[...(services.results as any[]), ...(services.results as any[])].map((s) => (
            <>
              <span class="brand-marquee__item">
                <i class={`fas ${s.icon || 'fa-broadcast-tower'}`}></i> {esc(s.title)}
              </span>
              <span class="brand-marquee__sep">✦</span>
            </>
          ))}
          {[...(services.results as any[]), ...(services.results as any[])].map((s) => (
            <>
              <span class="brand-marquee__item">
                <i class={`fas ${s.icon || 'fa-broadcast-tower'}`}></i> {esc(s.title)}
              </span>
              <span class="brand-marquee__sep">✦</span>
            </>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div class="reveal"><SectionTitle eyebrow="What we do" title="Complete Sports Media Services" subtitle="Professional media solutions for leagues, tournaments and sporting events." light center /></div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10 stagger">
          {(services.results as any[]).map((s, i) => (
            <a href={`/services#${s.slug}`} class="group tilt spot shine grad-border relative flex flex-col p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 transition">
              <span class="absolute top-5 right-5 text-4xl font-black text-white/[0.05] group-hover:text-red-500/20 transition">{String(i + 1).padStart(2, '0')}</span>
              <span class="tilt__inner icon-pop w-12 h-12 rounded-xl text-white flex items-center justify-center text-lg mb-4 shadow-lg" style={/stream|graphic|digital/i.test(s.title) ? 'background-image:var(--cool-grad)' : 'background-image:var(--flame-grad)'}>
                <i class={`fas ${s.icon || 'fa-broadcast-tower'}`}></i>
              </span>
              <h3 class="font-bold text-white tilt__inner">{esc(s.title)}</h3>
              <p class="text-sm text-slate-400 mt-2 flex-1 tilt__inner">{esc(s.short_desc)}</p>
              <span class="inline-flex items-center gap-2 mt-4 text-red-400 group-hover:text-red-300 font-semibold text-sm tilt__inner">Learn more <i class="fas fa-arrow-right text-xs transition-transform group-hover:translate-x-1"></i></span>
            </a>
          ))}
        </div>
        <div class="text-center mt-10 reveal"><a href="/services" class="px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 inline-flex items-center gap-2 link-underline">Explore all services <i class="fas fa-arrow-right text-xs"></i></a></div>
      </section>

      {/* LIVE + UPCOMING */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid lg:grid-cols-2 gap-8">
        <div class="reveal reveal--left rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-transparent p-7 grad-border">
          <div class="flex items-center justify-between">
            <h3 class="font-extrabold text-xl text-white">Live &amp; Upcoming</h3>
            <a href="/live" class="text-sm text-red-400 hover:text-red-300 font-semibold link-underline">Go to Live <i class="fas fa-arrow-right text-xs"></i></a>
          </div>
          <div class="mt-5 space-y-3">
            {/* YouTube: currently live */}
            {ytLiveRow && (
              <a href={`https://www.youtube.com/watch?v=${ytLiveRow.video_id}`} target="_blank" rel="noopener" class="flex items-center gap-4 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 hover:border-red-500 transition">
                <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400"><i class="fas fa-circle text-[8px] live-dot"></i></div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-white line-clamp-1">{esc(ytLiveRow.title)}</div>
                  <div class="text-xs text-red-300 font-semibold uppercase tracking-wide mt-0.5">Live on YouTube</div>
                </div>
                <Chip status="live" />
              </a>
            )}
            {/* YouTube: upcoming */}
            {ytUpRows.map((u) => (
              <a href={`https://www.youtube.com/watch?v=${u.video_id}`} target="_blank" rel="noopener" class="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-white/25 transition">
                <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-blue-400"><i class="fab fa-youtube"></i></div>
                <div class="min-w-0 flex-1">
                  <div class="font-semibold text-white line-clamp-1">{esc(u.title)}</div>
                  <div class="text-xs text-slate-400">{u.scheduled_at ? `Scheduled ${fmtDate(u.scheduled_at)}` : 'Upcoming stream'}</div>
                </div>
                <Chip status="upcoming" />
              </a>
            ))}
            {/* Scheduled events */}
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
            {!ytLiveRow && ytUpRows.length === 0 && (upcoming.results as any[]).length === 0 && <p class="text-slate-500 text-sm">No upcoming events scheduled.</p>}
          </div>
        </div>
        <div class="reveal reveal--right rounded-3xl border border-white/10 bg-white/5 p-7 grad-border">
          <div class="flex items-center justify-between">
            <h3 class="font-extrabold text-xl text-white">Latest Broadcasts</h3>
            <a href="/gallery" class="text-sm text-slate-300 hover:text-white font-semibold link-underline">Gallery <i class="fas fa-arrow-right text-xs"></i></a>
          </div>
          <div class="grid grid-cols-2 gap-3 mt-5">
            {(latest.results as any[]).length === 0 && <p class="text-slate-500 text-sm col-span-2">No published media yet.</p>}
            {(latest.results as any[]).slice(0, 4).map((m) => (
              <a href={m.url} target="_blank" class="group relative aspect-video rounded-xl overflow-hidden bg-slate-800 border border-white/10 shine">
                {m.thumbnail ? <img src={m.thumbnail} class="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" /> : <div class="w-full h-full flex items-center justify-center text-slate-600"><i class="fas fa-photo-film text-2xl"></i></div>}
                <span class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-xs text-white font-medium truncate">{esc(m.title)}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* LATEST FROM YOUTUBE */}
      {(ytRecent as any[]).length > 0 && (
        <section class="max-w-7xl mx-auto px-4 sm:px-6 py-10">
          <div class="flex flex-wrap items-end justify-between gap-3 mb-6 reveal">
            <SectionTitle eyebrow="From our channel" title="Latest live broadcasts" subtitle="Recent matches streamed live on the AWADH Sports YouTube channel." light />
            <a href={BRAND.youtube} target="_blank" rel="noopener" class="text-sm text-red-400 hover:text-red-300 font-semibold link-underline"><i class="fab fa-youtube mr-1"></i> Subscribe →</a>
          </div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger">
            {(ytRecent as any[]).map((v) => (
              <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener" class="tilt spot rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition group">
                <div class="aspect-video bg-slate-800 relative">
                  <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} class="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" />
                  <span class="absolute inset-0 flex items-center justify-center"><span class="w-10 h-10 rounded-full bg-black/55 backdrop-blur flex items-center justify-center text-white text-xs group-hover:bg-red-600 group-hover:scale-110 transition"><i class="fas fa-play"></i></span></span>
                </div>
                <div class="p-3 text-xs text-white font-medium line-clamp-2 tilt__inner">{esc(v.title)}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* PORTFOLIO — real tournaments & leagues we produced */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div class="reveal"><SectionTitle eyebrow="Proof of work" title="Tournaments & leagues we've produced" subtitle="Every playlist below is a competition we covered end to end — production, streaming, commentary and highlights." light center /></div>
        {(playlists.results as any[]).length > 0 && (
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10 stagger">
            {(playlists.results as any[]).slice(0, 6).map((p) => (
              <a href={`https://www.youtube.com/playlist?list=${p.playlist_id}`} target="_blank" rel="noopener" class="group tilt spot shine grad-border rounded-2xl overflow-hidden bg-white/5 border border-white/10 transition">
                <div class="aspect-video bg-slate-800 relative overflow-hidden">
                  <img src={`https://i.ytimg.com/vi/${p.cover_video}/hqdefault.jpg`} class="w-full h-full object-cover group-hover:scale-110 transition duration-500" loading="lazy" />
                  <span class="absolute inset-0 flex items-center justify-center"><span class="w-11 h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white group-hover:bg-red-600 group-hover:scale-110 transition"><i class="fas fa-play"></i></span></span>
                  <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-semibold">{p.video_count}+ videos</span>
                </div>
                <div class="p-5 tilt__inner">
                  <div class="flex flex-wrap gap-2 mb-2">{p.category && <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-semibold">{esc(p.category)}</span>}{p.client && <span class="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-xs">{esc(p.client)}</span>}</div>
                  <h3 class="font-bold text-white">{esc(p.title)}</h3>
                  <p class="text-sm text-slate-400 mt-1 line-clamp-2">{esc(p.description)}</p>
                </div>
              </a>
            ))}
          </div>
        )}
        <div class="text-center mt-8 reveal">
          <a href="/portfolio" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5 link-underline">See all projects <i class="fas fa-arrow-right text-xs"></i></a>
        </div>
      </section>

      {/* CTA */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
        <div class="reveal reveal--scale grad-border grad-border--on rounded-3xl bg-gradient-to-r from-red-600 to-orange-500 p-10 sm:p-14 text-center relative overflow-hidden">
          <div class="orbs"><span class="orbs__b orbs__b--b"></span></div>
          <div class="relative z-10">
            <h2 class="text-3xl sm:text-4xl font-black text-white">Planning a tournament or match broadcast?</h2>
            <p class="text-white/90 mt-3 max-w-xl mx-auto">Tell us your event details — no account needed. We'll generate a Booking ID and respond with a quotation you can track securely.</p>
            <div class="flex flex-wrap justify-center gap-3 mt-8">
              <a href="/book" class="px-6 py-3 rounded-xl bg-white text-slate-900 font-bold hover:bg-slate-100 shine">Book / Request Quote</a>
              <a href="/track" class="px-6 py-3 rounded-xl border-2 border-white/60 text-white font-bold hover:bg-white/10">Track Existing Booking</a>
            </div>
          </div>
        </div>
      </section>

      <script src="/static/home-anim.js"></script>
    </PublicLayout>
  )
})

// ---------- ABOUT ----------
publicRoutes.get('/about', async (c) => {
  const team = await c.env.DB.prepare(`SELECT * FROM team_members WHERE is_active=1 ORDER BY sort_order`).all()
  return c.html(
    <PublicLayout user={c.get('user')} current="/about" title="About Us">
      <PageHero eyebrow="About" title="Built for the pace of live sport" subtitle="We are a dedicated sports broadcast and media-production team — cameras, commentary, graphics, streaming and social-first highlights under one roof." />
      <section class="relative overflow-hidden">
        <div class="orbs" aria-hidden="true"><span class="orbs__b orbs__b--a"></span><span class="orbs__b orbs__b--c"></span></div>
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-16 grid lg:grid-cols-2 gap-12">
          <div class="reveal reveal--left">
            <SectionTitle eyebrow="Our story" title="From single-camera set-ups to full broadcast weekends" />
            <div class="mt-5 space-y-4 text-slate-400 stagger">
              <p class="pl-4 border-l-2 border-red-500/40">AWADH Sports Live started as a small crew covering local tournaments and grew into a full production house handling multi-camera broadcasts, live graphics, replays and commentary for leagues and clubs.</p>
              <p class="pl-4 border-l-2 border-cyan-400/40">Our philosophy is simple: reliability first. Broadcast happens once — so planning, redundancy and clear communication matter more than any single shot.</p>
              <p class="pl-4 border-l-2 border-violet-400/40">Today we combine production craft with a modern operations platform: bookings, crew scheduling, equipment tracking and live control all in one system.</p>
            </div>
            <div class="mt-8 flex flex-wrap gap-3">
              <a href="/services" class="btn-primary shine px-5 py-2.5">Explore services <i class="fas fa-arrow-right text-xs"></i></a>
              <a href="/portfolio" class="px-5 py-2.5 rounded-xl border border-white/20 text-white font-semibold hover:bg-white/5">See our work</a>
            </div>
          </div>
          <div class="grid sm:grid-cols-2 gap-4 stagger">
            {[
              { icon: 'fa-camera-retro', t: 'Multi-Camera', d: 'Up to 8-camera set-ups', g: 'flame' },
              { icon: 'fa-tower-broadcast', t: 'Live Streaming', d: 'Multi-platform delivery', g: 'cool' },
              { icon: 'fa-clapperboard', t: 'Graphics & Replay', d: 'Score, stats, slo-mo', g: 'flame' },
              { icon: 'fa-microphone-lines', t: 'Commentary', d: 'Bilingual commentary', g: 'cool' },
              { icon: 'fa-camera', t: 'Photography', d: 'Match & event coverage', g: 'flame' },
              { icon: 'fa-film', t: 'Highlights', d: 'Social-ready edits', g: 'cool' },
            ].map((f) => (
              <div class="group tilt spot grad-border p-5 rounded-2xl bg-white/5 border border-white/10">
                <span class="tilt__inner icon-pop w-11 h-11 rounded-xl text-white flex items-center justify-center text-lg mb-3" style={f.g === 'cool' ? 'background-image:var(--cool-grad)' : 'background-image:var(--flame-grad)'}>
                  <i class={`fas ${f.icon}`}></i>
                </span>
                <div class="font-bold text-white tilt__inner">{f.t}</div>
                <div class="text-sm text-slate-400 tilt__inner">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS RIBBON */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
        <div class="ribbon rounded-3xl px-6 py-10 sm:py-12 relative overflow-hidden">
          <div class="grid sm:grid-cols-4 gap-8 text-center">
            {[['500','+','Matches covered'],['50','+','Leagues & clubs'],['8','','Camera capability'],['24','/7','Production support']].map(([v,sx,l])=>(
              <div class="reveal">
                <div class="text-4xl font-black text-white tick"><span data-count={v} data-suffix={sx}>0{sx}</span></div>
                <div class="text-sm text-white/85 mt-1 font-medium">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TEAM */}
      <section class="max-w-7xl mx-auto px-4 sm:px-6 pb-16 pt-12">
        <div class="reveal"><SectionTitle eyebrow="Our team" title="The people behind every broadcast" subtitle="Leadership and operations — the crew that makes match day happen." light center /></div>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10 max-w-5xl mx-auto stagger">
          {(team.results as any[]).length === 0 && <p class="text-slate-500 text-center col-span-full">Team details coming soon.</p>}
          {(team.results as any[]).map((t) => (
            <article class="group tilt spot shine grad-border rounded-3xl bg-white/5 border border-white/10 p-7 text-center">
              <div class="tilt__inner w-24 h-24 mx-auto rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg overflow-hidden icon-pop" style="background-image:var(--flame-grad)">
                {t.photo_url ? <img src={t.photo_url} alt={t.name} class="w-full h-full object-cover" /> : esc(t.name.split(' ').map((w: string) => w[0]).join('').slice(0, 2))}
              </div>
              <h3 class="tilt__inner font-bold text-white text-lg mt-5">{esc(t.name)}</h3>
              <div class="tilt__inner text-red-400 text-sm font-semibold mt-1">{esc(t.role)}</div>
              {t.bio && <p class="tilt__inner text-sm text-slate-400 mt-3 leading-relaxed">{esc(t.bio)}</p>}
              {t.email && <a href={`mailto:${t.email}`} class="tilt__inner inline-flex items-center gap-1.5 mt-4 text-xs text-slate-400 hover:text-white link-underline"><i class="fas fa-envelope"></i> Contact</a>}
            </article>
          ))}
        </div>
      </section>
    </PublicLayout>
  )
})

// ---------- SERVICES ----------
publicRoutes.get('/services', async (c) => {
  const services = await c.env.DB.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order`).all()
  const svc = (services.results as any[]).map((s) => ({
    id: s.id,
    slug: s.slug,
    title: s.title,
    short_desc: s.short_desc || '',
    description: s.description || '',
    icon: s.icon || 'fa-broadcast-tower',
  }))
  return c.html(
    <PublicLayout user={c.get('user')} current="/services" title="Services">
      <PageHero eyebrow="What we do" title="Complete Sports Media Services" subtitle="Professional media solutions for leagues, tournaments and sporting events. Tap any service to see full details." />

      {/* Animated capability ticker */}
      <div class="brand-marquee border-y border-white/10 py-3">
        <div class="brand-marquee__track">
          {['Multi-Camera Production','Live Streaming','Instant Replay','Live Graphics & Score','Bilingual Commentary','Match Photography','Social Highlights','Sponsor Branding'].map((x) => (
            <span class="brand-marquee__item text-slate-300/70 text-sm font-semibold tracking-wide uppercase">
              <i class="fas fa-bolt text-red-400 mr-2"></i>{x}
            </span>
          ))}
          {['Multi-Camera Production','Live Streaming','Instant Replay','Live Graphics & Score','Bilingual Commentary','Match Photography','Social Highlights','Sponsor Branding'].map((x) => (
            <span class="brand-marquee__item text-slate-300/70 text-sm font-semibold tracking-wide uppercase" aria-hidden="true">
              <i class="fas fa-bolt text-red-400 mr-2"></i>{x}
            </span>
          ))}
        </div>
      </div>

      <section class="relative overflow-hidden">
        <div class="orbs" aria-hidden="true"><span class="orbs__b orbs__b--b"></span><span class="orbs__b orbs__b--a"></span></div>
        <div class="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div class="reveal"><SectionTitle eyebrow="Capabilities" title="Everything match day needs" subtitle="Pick a service to see exactly what's included — from cameras and commentary to streaming and highlights." center /></div>
          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10 stagger">
            {svc.map((s, i) => (
              <article
                id={s.slug}
                data-service={String(i)}
                role="button"
                tabindex={0}
                class="service-card group tilt spot shine grad-border relative flex flex-col p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-red-500/50 hover:bg-white/[0.07] transition cursor-pointer"
              >
                <span class="absolute top-5 right-5 text-4xl font-black text-white/[0.06] group-hover:text-red-500/20 transition">{String(i + 1).padStart(2, '0')}</span>
                <span class="icon-pop w-12 h-12 rounded-xl text-white flex items-center justify-center text-xl mb-4 shadow-lg" style={i % 2 === 0 ? 'background-image:var(--flame-grad)' : 'background-image:var(--cool-grad)'}>
                  <i class={`fas ${s.icon}`}></i>
                </span>
                <h3 class="text-lg font-bold text-white">{esc(s.title)}</h3>
                <p class="text-sm text-slate-300 mt-2 flex-1">{esc(s.short_desc)}</p>
                <span class="inline-flex items-center gap-2 mt-4 text-red-400 group-hover:text-red-300 font-semibold text-sm">
                  View details <i class="fas fa-circle-plus text-xs transition-transform group-hover:rotate-90"></i>
                </span>
              </article>
            ))}
          </div>

          <div class="mt-12 reveal reveal--scale grad-border grad-border--on rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 class="font-bold text-white text-lg">Production vs streaming — what's the difference?</h3>
              <p class="text-sm text-slate-400 mt-2">
                <b class="text-slate-200">Match Production</b> creates the professional live feed — cameras, direction and switching.
                <b class="text-slate-200">Digital Streaming</b> then delivers that feed to your online audience. Both are needed for a complete broadcast; the other services cover separate deliverables.
              </p>
            </div>
            <div class="flex md:justify-end gap-3">
              <a href={`/book?service=1`} class="btn-primary shine px-5 py-3 text-sm">Book Match Production</a>
              <a href={`/book?service=2`} class="px-5 py-3 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5 text-sm">Book Streaming</a>
            </div>
          </div>
          <div class="text-center pt-8 reveal"><a href="/book" class="btn-primary shine px-6 py-3">Request a Custom Quote <i class="fas fa-arrow-right text-xs ml-1"></i></a></div>
        </div>
      </section>

      {/* Service details modal — opens centered on card tap */}
      <div id="service-modal" class="service-modal hidden" role="dialog" aria-modal="true" aria-labelledby="service-modal-title">
        <div class="service-modal__backdrop" data-close></div>
        <div class="service-modal__box">
          <button class="service-modal__close" data-close aria-label="Close"><i class="fas fa-xmark"></i></button>
          <div class="flex items-start gap-4">
            <span id="service-modal-icon" class="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-2xl shadow-lg"><i class="fas fa-broadcast-tower"></i></span>
            <div class="min-w-0 pt-1">
              <h3 id="service-modal-title" class="text-xl font-extrabold text-white">Service</h3>
              <p id="service-modal-short" class="text-sm text-slate-400 mt-1">—</p>
            </div>
          </div>
          <div id="service-modal-body" class="mt-5 text-slate-200 text-[0.95rem] leading-relaxed whitespace-pre-line">—</div>
          <div class="mt-6 flex flex-wrap gap-3">
            <a id="service-modal-book" href="/book" class="btn-primary px-5 py-2.5">Request this service <i class="fas fa-arrow-right text-xs"></i></a>
            <button data-close class="px-5 py-2.5 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5">Close</button>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: `window.__SERVICES__ = ${JSON.stringify(svc)};` }} />
      <script src="/static/services.js"></script>
    </PublicLayout>
  )
})

// ---------- PORTFOLIO ----------
publicRoutes.get('/portfolio', async (c) => {
  const sport = c.req.query('sport')
  const q = sport
    ? c.env.DB.prepare(`SELECT * FROM portfolio WHERE is_published=1 AND sport=? ORDER BY created_at DESC`).bind(sport)
    : c.env.DB.prepare(`SELECT * FROM portfolio WHERE is_published=1 ORDER BY created_at DESC`)
  const [rows, sports, playlists] = await Promise.all([
    q.all(),
    c.env.DB.prepare(`SELECT DISTINCT sport FROM portfolio WHERE sport IS NOT NULL`).all(),
    c.env.DB.prepare(`SELECT * FROM youtube_playlists WHERE is_active=1 ORDER BY is_featured DESC, sort_order LIMIT 24`).all(),
  ])
  const pls = playlists.results as any[]
  return c.html(
    <PublicLayout user={c.get('user')} current="/portfolio" title="Portfolio">
      <PageHero eyebrow="Proof of work" title="Tournaments & leagues we've produced" subtitle="Real seasons, real matches — every playlist below is a competition we covered end to end with live production, streaming, commentary and highlights." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* Real YouTube work — tournaments & leagues produced */}
        {pls.length > 0 && (
          <div class="mb-14">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
              <h2 class="text-xl font-extrabold text-white flex items-center gap-2"><i class="fab fa-youtube text-red-500"></i> Tournaments &amp; leagues we covered</h2>
              <a href={BRAND.youtube} target="_blank" rel="noopener" class="text-sm text-red-400 hover:text-red-300 font-semibold">Visit our channel →</a>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {pls.map((p) => (
                <a href={`https://www.youtube.com/playlist?list=${p.playlist_id}`} target="_blank" rel="noopener" class="group rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition">
                  <div class="aspect-video bg-slate-800 relative overflow-hidden">
                    <img src={`https://i.ytimg.com/vi/${p.cover_video}/hqdefault.jpg`} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    <span class="absolute inset-0 flex items-center justify-center"><span class="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center text-white text-lg group-hover:bg-red-600 transition"><i class="fas fa-play"></i></span></span>
                    <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/75 text-white text-[11px] font-semibold">{p.video_count}+ videos</span>
                    {p.is_featured === 1 && <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">Featured</span>}
                  </div>
                  <div class="p-5">
                    <div class="flex flex-wrap gap-2 mb-2">
                      {p.category && <span class="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-semibold">{esc(p.category)}</span>}
                      {p.client && <span class="px-2 py-0.5 rounded bg-white/10 text-slate-300 text-xs">{esc(p.client)}</span>}
                    </div>
                    <h3 class="font-bold text-white">{esc(p.title)}</h3>
                    <p class="text-sm text-slate-400 mt-2 line-clamp-2">{esc(p.description)}</p>
                    {p.services && <p class="text-xs text-slate-500 mt-3 line-clamp-2"><i class="fas fa-check-circle text-red-500 mr-1"></i>{esc(p.services)}</p>}
                  </div>
                </a>
              ))}
            </div>
          </div>
        )}

        <h2 class="text-xl font-extrabold text-white mb-1">Selected projects</h2>
        <p class="text-slate-400 text-sm mb-6">Grouped by sport and event type, with the services delivered for each.</p>
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
                {p.external_url && <a href={p.external_url} target="_blank" rel="noopener" class="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-red-400 hover:text-red-300"><i class="fab fa-youtube"></i> Watch the season</a>}
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
    <PublicLayout user={c.get('user')} current="/events" title="Events">
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
    <PublicLayout user={c.get('user')} title={e.name}>
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
  kickYouTubeSync(c.env)
  const [liveNow, upcoming, latest, highlights, channels] = await Promise.all([
    c.env.DB.prepare(`SELECT le.*, e.name, e.sport, e.venue_name, e.id AS eid FROM live_events le JOIN events e ON e.id=le.event_id WHERE le.status='live' ORDER BY le.display_order`).all(),
    c.env.DB.prepare(`SELECT le.*, e.name, e.sport, e.start_date, e.id AS eid FROM live_events le JOIN events e ON e.id=le.event_id WHERE le.status='upcoming' ORDER BY le.scheduled_at LIMIT 6`).all(),
    c.env.DB.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 AND m.media_type IN ('video','highlight','reel','interview') ORDER BY m.created_at DESC LIMIT 8`).all(),
    c.env.DB.prepare(`SELECT m.* FROM media m WHERE m.status='approved' AND m.is_public=1 AND m.media_type='highlight' ORDER BY m.created_at DESC LIMIT 4`).all(),
    c.env.DB.prepare(`SELECT DISTINCT platform FROM live_events WHERE platform IS NOT NULL`).all(),
  ])
  const ytLiveArr = await ytRows(c.env.DB, `AND is_live=1`, 1)
  const ytUp = await ytRows(c.env.DB, `AND is_upcoming=1`, 6)
  const ytList = await ytRows(c.env.DB, `AND is_live=0 AND is_upcoming=0`, 5)
  const main = (liveNow.results as any[])[0]
  const yt = ytLiveArr[0] as any
  void channels
  return c.html(
    <PublicLayout user={c.get('user')} current="/live" title="Live">
      <PageHero eyebrow="Live Hub" title="Watch us live" subtitle="Current live broadcast, upcoming streams, and our latest matches from the AWADH Sports YouTube channel." />
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
          ) : yt ? (
            <div class="rounded-2xl overflow-hidden border border-red-500/40 bg-black">
              <div class="px-4 py-3 bg-gradient-to-r from-red-600 to-orange-500 text-white flex items-center justify-between">
                <span class="font-bold flex items-center gap-2"><i class="fas fa-circle text-[8px] live-dot"></i> LIVE ON YOUTUBE</span>
                <span class="text-xs bg-black/20 px-2 py-1 rounded-full">YouTube</span>
              </div>
              <div class="aspect-video"><iframe src={`https://www.youtube.com/embed/${esc(yt.video_id)}`} class="w-full h-full" allowfullscreen allow="autoplay; encrypted-media"></iframe></div>
              <div class="p-4 text-white font-semibold text-sm">{esc(yt.title)}</div>
            </div>
          ) : (
            <div class="rounded-2xl border border-white/10 bg-white/5 aspect-video flex items-center justify-center text-center">
              <div>
                <i class="fas fa-tower-broadcast text-4xl text-slate-600"></i>
                <p class="text-slate-400 mt-3 font-semibold">No live broadcast right now</p>
                <p class="text-sm text-slate-500">Check the latest matches below.</p>
              </div>
            </div>
          )}

          {/* YouTube: latest broadcasts */}
          <div class="mt-8">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-extrabold text-white text-lg flex items-center gap-2"><i class="fab fa-youtube text-red-500"></i> Latest live broadcasts</h3>
              <a href={BRAND.youtube} target="_blank" rel="noopener" class="text-sm text-red-400 hover:text-red-300 font-semibold">View channel →</a>
            </div>
            <div class="grid sm:grid-cols-2 gap-4">
              {ytList.length === 0 && <p class="text-slate-500 text-sm">No videos yet.</p>}
              {ytList.map((v) => (
                <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener" class="rounded-xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition group">
                  <div class="aspect-video bg-slate-800 relative">
                    <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    <span class="absolute inset-0 flex items-center justify-center"><span class="w-11 h-11 rounded-full bg-black/55 flex items-center justify-center text-white"><i class="fas fa-play"></i></span></span>
                    {v.category && <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/70 text-white text-xs">{esc(v.category)}</span>}
                  </div>
                  <div class="p-3 text-sm text-white font-medium line-clamp-2">{esc(v.title)}</div>
                </a>
              ))}
            </div>
          </div>

          {(latest.results as any[]).length > 0 && (
            <div class="mt-8">
              <h3 class="font-extrabold text-white text-lg mb-4">More from our events</h3>
              <div class="grid sm:grid-cols-2 gap-4">
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
          )}
        </div>

        <aside class="space-y-6">
          <div class="rounded-2xl bg-white/5 border border-white/10 p-6">
            <h3 class="font-bold text-white mb-4 flex items-center gap-2"><i class="fas fa-clock text-red-500"></i> Upcoming streams</h3>
            {ytUp.length === 0 && (upcoming.results as any[]).length === 0 ? <p class="text-sm text-slate-500">Nothing scheduled right now.</p> : (
              <ul class="space-y-4">
                {ytUp.map((u) => (
                  <li class="pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <a href={`https://www.youtube.com/watch?v=${u.video_id}`} target="_blank" rel="noopener" class="font-semibold text-white hover:text-red-400 text-sm line-clamp-2">{esc(u.title)}</a>
                    <div class="text-xs text-red-400 font-semibold mt-1 uppercase tracking-wide">Upcoming</div>
                    {u.scheduled_at && <div class="countdown text-xs text-slate-400 font-mono mt-1" data-date={u.scheduled_at}></div>}
                  </li>
                ))}
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
          <a href={BRAND.youtube} target="_blank" rel="noopener" class="block rounded-2xl bg-red-600 hover:bg-red-700 transition p-6 text-center">
            <i class="fab fa-youtube text-3xl text-white"></i>
            <p class="text-white font-bold mt-2">Subscribe on YouTube</p>
            <p class="text-white/80 text-sm">@awadh_sports</p>
          </a>
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
  const [rows, yt] = await Promise.all([
    q.all(),
    c.env.DB.prepare(`SELECT * FROM youtube_videos WHERE is_active=1 ORDER BY is_live DESC, is_upcoming DESC, sort_order LIMIT 12`).all(),
  ])
  const types = ['photo', 'video', 'highlight', 'reel', 'interview']
  return c.html(
    <PublicLayout user={c.get('user')} current="/gallery" title="Media Gallery">
      <PageHero eyebrow="Gallery" title="Photos, videos & highlights" subtitle="Approved and published media from our events, plus our latest live broadcasts on YouTube." />
      <section class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        {/* YouTube videos from the AWADH Sports channel */}
        {(yt.results as any[]).length > 0 && (
          <div class="mb-12">
            <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 class="font-extrabold text-white text-lg flex items-center gap-2"><i class="fab fa-youtube text-red-500"></i> Live broadcasts on YouTube</h2>
              <a href={BRAND.youtube} target="_blank" rel="noopener" class="text-sm text-red-400 hover:text-red-300 font-semibold">View channel →</a>
            </div>
            <div class="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(yt.results as any[]).map((v) => (
                <a href={`https://www.youtube.com/watch?v=${v.video_id}`} target="_blank" rel="noopener" class="rounded-2xl overflow-hidden bg-white/5 border border-white/10 hover:border-red-500/50 transition group">
                  <div class="aspect-video bg-slate-800 relative">
                    <img src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`} class="w-full h-full object-cover group-hover:scale-105 transition" loading="lazy" />
                    <span class="absolute inset-0 flex items-center justify-center"><span class="w-10 h-10 rounded-full bg-black/55 flex items-center justify-center text-white"><i class="fas fa-play"></i></span></span>
                    {(v.is_live === 1 || v.is_upcoming === 1) && (
                      <span class="absolute top-2 left-2 px-2 py-0.5 rounded bg-red-600 text-white text-[10px] font-bold uppercase">{v.is_live ? 'Live' : 'Upcoming'}</span>
                    )}
                  </div>
                  <div class="p-3 text-sm text-white font-medium line-clamp-2">{esc(v.title)}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        <h2 class="font-extrabold text-white text-lg mb-5">Event gallery</h2>
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
    <PublicLayout user={c.get('user')} current="/contact" title="Contact">
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
            { i: 'fa-location-dot', t: 'Office', d: BRAND.address },
            { i: 'fa-phone', t: 'Phone', d: BRAND.phone, href: `tel:${BRAND.phoneRaw}` },
            { i: 'fa-envelope', t: 'Email', d: BRAND.email, href: `mailto:${BRAND.email}` },
            { i: 'fa-brands fa-youtube', t: 'YouTube', d: '@awadh_sports', href: BRAND.youtube },
            { i: 'fa-clock', t: 'Working hours', d: 'Mon–Sat · 9:00 AM – 8:00 PM' },
          ].map((x) => (
            <a href={x.href || undefined} target={x.href?.startsWith('http') ? '_blank' : undefined} rel="noopener"
               class={`flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/10 ${x.href ? 'hover:border-red-500/50 hover:bg-white/[0.07] transition' : ''}`}>
              <span class="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center"><i class={`${x.i.includes('fa-brands') ? 'fab' : 'fas'} ${x.i.replace('fa-brands ', '')}`}></i></span>
              <div><div class="font-semibold text-white">{x.t}</div><div class="text-sm text-slate-400 break-all">{x.d}</div></div>
            </a>
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
    <PublicLayout user={c.get('user')} current="/careers" title="Careers">
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
