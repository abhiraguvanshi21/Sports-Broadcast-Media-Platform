import type { Bindings } from './types'
import { getSetting, setSetting } from './policy'

// ============================================================
// YouTube auto-sync (AWADH Sports channel)
//  - Resolves the channel id from the @handle (cached in app_settings)
//  - Reads the channel RSS feed for the latest broadcasts
//  - Scrapes the channel /streams tab to detect LIVE + UPCOMING streams
//  - Upserts everything into youtube_videos (source='sync')
//    so the public Live hub + Upcoming list update automatically.
// No API key required — everything runs on public YouTube endpoints.
// ============================================================

export type YtVideo = {
  video_id: string
  title: string
  published?: string | null
  views?: string | null
  is_live?: boolean
  is_upcoming?: boolean
}

const UA = 'Mozilla/5.0 (compatible; AWADHSportsBot/1.0; +https://awadhsports.example)'

async function getText(url: string, ms = 8000): Promise<string | null> {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), ms)
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, signal: ctrl.signal })
    if (!res.ok) return null
    return await res.text()
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function decodeEntities(s: string): string {
  return String(s || '')
    .replace(/<!\[CDATA\[|\]\]>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

/** Resolve the channel id (UC…) from an @handle or channel URL. */
export async function resolveChannelId(handleOrUrl: string): Promise<string | null> {
  let h = (handleOrUrl || '').trim().replace(/\.$/, '')
  if (!h) return null
  if (/^UC[\w-]{22}$/.test(h)) return h
  if (!/^https?:/.test(h)) {
    if (!h.startsWith('@')) h = '@' + h
    h = 'https://www.youtube.com/' + h
  }
  const html = await getText(h, 9000)
  if (!html) return null
  const pats = [
    /"channelId":"(UC[\w-]{22})"/,
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/,
    /"externalId":"(UC[\w-]{22})"/,
    /channel\/(UC[\w-]{22})/,
  ]
  for (const p of pats) {
    const m = html.match(p)
    if (m) return m[1]
  }
  return null
}

/** Latest uploads from the channel RSS feed. */
export async function fetchChannelFeed(channelId: string): Promise<YtVideo[]> {
  const xml = await getText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`, 9000)
  if (!xml) return []
  const out: YtVideo[] = []
  const entries = xml.split('<entry>').slice(1)
  for (const e of entries) {
    const vid = e.match(/<yt:videoId>([\w-]{11})<\/yt:videoId>/)
    if (!vid) continue
    const title = e.match(/<title>([\s\S]*?)<\/title>/)
    const pub = e.match(/<published>([^<]+)<\/published>/)
    const views = e.match(/<media:statistics[^>]*views="(\d+)"/)
    out.push({
      video_id: vid[1],
      title: decodeEntities(title ? title[1] : '') || `YouTube video ${vid[1]}`,
      published: pub ? pub[1].slice(0, 10) : null,
      views: views ? views[1] : null,
    })
  }
  return out
}

/**
 * Detect currently-live and scheduled-upcoming streams from the channel
 * /streams tab. Heuristic: locate each videoId, then inspect the nearby
 * markup for LIVE / UPCOMING badges.
 */
export async function fetchLiveAndUpcoming(channelId: string): Promise<{ live: YtVideo | null; upcoming: YtVideo[] }> {
  const html = await getText(`https://www.youtube.com/channel/${channelId}/streams`, 9000)
  if (!html) return { live: null, upcoming: [] }

  const seen = new Set<string>()
  const candidates: { id: string; index: number }[] = []
  const re = /"videoId":"([\w-]{11})"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (!seen.has(m[1])) {
      seen.add(m[1])
      candidates.push({ id: m[1], index: m.index })
    }
  }

  let live: YtVideo | null = null
  const upcoming: YtVideo[] = []

  for (const c of candidates) {
    // window after this videoId (title + badges usually follow within ~2500 chars)
    const win = html.slice(c.index, c.index + 2600)
    const titleM = win.match(/"title":\{"runs":\[\{"text":"([\s\S]*?)"\}\]\}/) || win.match(/"accessibilityText":"([^"]{5,200})"/)
    const title = decodeEntities(titleM ? titleM[1] : '') || `YouTube video ${c.id}`
    const isLive = /"style":"BADGE_STYLE_TYPE_LIVE_NOW"|LIVE NOW|"isLive":true|\bsimpleText":"LIVE"/i.test(win)
    const isUpcoming = /"simpleText":"UPCOMING"|UPCOMING|"style":"BADGE_STYLE_TYPE_UPCOMING"/i.test(win)
    if (isLive && !live) {
      live = { video_id: c.id, title, is_live: true }
    } else if (isUpcoming && upcoming.length < 8) {
      upcoming.push({ video_id: c.id, title, is_upcoming: true })
    }
  }
  return { live, upcoming }
}

export type SyncResult = { ok: boolean; channelId?: string; added?: number; live?: string | null; upcoming?: number; error?: string }

/**
 * Full sync: resolve channel → upsert latest videos → mark live/upcoming.
 * `force` ignores the freshness window (used by the admin "Sync now" button).
 */
export async function syncYouTube(env: Bindings, opts: { force?: boolean; ttlMinutes?: number } = {}): Promise<SyncResult> {
  const ttl = opts.ttlMinutes ?? 20
  try {
    if (!opts.force) {
      const last = await getSetting(env, 'youtube_last_sync', '')
      if (last) {
        const age = Date.now() - new Date(last.replace(' ', 'T') + 'Z').getTime()
        if (age >= 0 && age < ttl * 60_000) return { ok: true, error: 'fresh' }
      }
    }

    const handle = await getSetting(env, 'youtube_channel_handle', 'awadh_sports')
    let channelId = await getSetting(env, 'youtube_channel_id', '')
    if (!channelId || opts.force) {
      const resolved = await resolveChannelId(handle)
      if (resolved) {
        channelId = resolved
        await setSetting(env, 'youtube_channel_id', channelId)
      }
    }
    if (!channelId) return { ok: false, error: 'channel-not-resolved' }

    const [feed, liveUp] = await Promise.all([fetchChannelFeed(channelId), fetchLiveAndUpcoming(channelId)])
    let added = 0

    // 1. Clear previous sync flags so stale LIVE/UPCOMING doesn't linger.
    await env.DB.prepare(`UPDATE youtube_videos SET is_live=0 WHERE source='sync'`).run()
    await env.DB.prepare(`UPDATE youtube_videos SET is_upcoming=0 WHERE source='sync'`).run()

    // 2. Upsert latest uploads (don't clobber admin-managed titles/manual videos).
    for (let i = 0; i < feed.length; i++) {
      const v = feed[i]
      const exists: any = await env.DB.prepare(`SELECT id, source FROM youtube_videos WHERE video_id=?`).bind(v.video_id).first()
      if (exists) {
        await env.DB.prepare(
          `UPDATE youtube_videos SET published_at=COALESCE(?, published_at), views=COALESCE(?, views), is_active=1 WHERE id=?`
        ).bind(v.published, v.views, exists.id).run()
      } else {
        await env.DB.prepare(
          `INSERT OR IGNORE INTO youtube_videos (video_id, title, published_at, views, sort_order, source, is_active) VALUES (?,?,?,?,?, 'sync', 1)`
        ).bind(v.video_id, v.title, v.published, v.views, i + 1).run()
        added++
      }
    }

    // 3. Apply live status.
    if (liveUp.live) {
      const ex: any = await env.DB.prepare(`SELECT id FROM youtube_videos WHERE video_id=?`).bind(liveUp.live.video_id).first()
      if (ex) {
        await env.DB.prepare(`UPDATE youtube_videos SET is_live=1, is_upcoming=0, live_now=1, is_active=1, title=COALESCE(NULLIF(title,''),?) WHERE id=?`)
          .bind(liveUp.live.title, ex.id).run()
      } else {
        await env.DB.prepare(`INSERT OR IGNORE INTO youtube_videos (video_id, title, is_live, live_now, sort_order, source, is_active) VALUES (?,?,1,1,0,'sync',1)`)
          .bind(liveUp.live.video_id, liveUp.live.title).run()
      }
    }

    // 4. Apply upcoming status.
    for (const u of liveUp.upcoming) {
      const ex: any = await env.DB.prepare(`SELECT id FROM youtube_videos WHERE video_id=?`).bind(u.video_id).first()
      if (ex) {
        await env.DB.prepare(`UPDATE youtube_videos SET is_upcoming=1, is_live=0, is_active=1 WHERE id=?`).bind(ex.id).run()
      } else {
        await env.DB.prepare(`INSERT OR IGNORE INTO youtube_videos (video_id, title, is_upcoming, sort_order, source, is_active) VALUES (?,?,1,50,'sync',1)`)
          .bind(u.video_id, u.title).run()
      }
    }

    await setSetting(env, 'youtube_last_sync', new Date().toISOString().replace('T', ' ').slice(0, 19))
    return { ok: true, channelId, added, live: liveUp.live?.video_id ?? null, upcoming: liveUp.upcoming.length }
  } catch (e: any) {
    return { ok: false, error: String(e?.message || e) }
  }
}
