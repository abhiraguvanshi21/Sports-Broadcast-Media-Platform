// ============================================================
// BOOKING + TRACK — naya booking/quote maangna aur purani booking track karna
// Kaam: /book form dikhana aur /track se OTP ke zariye booking status dekhna.
// ============================================================
import { Hono } from 'hono'
import type { AppEnv } from '../lib/types'
import { PublicLayout, PageHero } from '../lib/public_layout'
import { Field, inputCls, Chip } from '../lib/components'
import { makeBookingCode, fmtDate, fmtDateTime, esc, randomDigits, hashOtp, verifyOtp, rateLimit } from '../lib/otp'
import { logActivity } from '../lib/utils'

export const bookingRoutes = new Hono<AppEnv>()

// ---------- BOOK / REQUEST QUOTE ----------
bookingRoutes.get('/book', async (c) => {
  const services = await c.env.DB.prepare(`SELECT * FROM services WHERE is_active=1 ORDER BY sort_order`).all()
  const preselect = c.req.query('service')
  return c.html(
    <PublicLayout user={c.get('user')} current="/book" title="Book / Request Quote">
      <PageHero eyebrow="Booking" title="Request a quote" subtitle="No account required. Submit your event details and we will generate a Booking ID instantly." />
      <section class="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <form id="booking-form" class="rounded-3xl bg-white/5 border border-white/10 p-6 sm:p-8 space-y-8">
          {/* Contact */}
          <div>
            <h3 class="font-bold text-white text-lg mb-4"><span class="text-red-500">01.</span> Your contact details</h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <input name="contact_name" required placeholder="Full name *" class="form-dark" />
              <input name="contact_phone" required placeholder="Phone number *" class="form-dark" />
              <input name="contact_email" type="email" placeholder="Email" class="form-dark" />
              <input name="organization" placeholder="Organization / Club / League" class="form-dark" />
            </div>
          </div>
          {/* Event */}
          <div>
            <h3 class="font-bold text-white text-lg mb-4"><span class="text-red-500">02.</span> Event information</h3>
            <div class="grid sm:grid-cols-2 gap-4">
              <input name="event_name" required placeholder="Event / tournament name *" class="form-dark" />
              <select name="sport" class="form-dark">
                <option value="">Select sport</option>
                {['Cricket','Football','Kabaddi','Basketball','Hockey','Tennis','Badminton','Athletics','Other'].map((s) => <option value={s}>{s}</option>)}
              </select>
              <input name="event_date" type="date" class="form-dark" />
              <input name="city" placeholder="City" class="form-dark" />
              <input name="venue" placeholder="Venue" class="form-dark sm:col-span-2" />
              <textarea name="requirements" rows={4} placeholder="Tell us about the coverage you need (cameras, commentary, streaming, highlights...)" class="form-dark sm:col-span-2"></textarea>
              <input name="budget" placeholder="Approximate budget (optional)" class="form-dark sm:col-span-2" />
            </div>
          </div>
          {/* Services */}
          <div>
            <h3 class="font-bold text-white text-lg mb-4"><span class="text-red-500">03.</span> Required services</h3>
            <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(services.results as any[]).map((s) => (
                <label class="flex items-center gap-3 p-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-red-500/40 cursor-pointer transition">
                  <input type="checkbox" name="services" value={s.id} class="accent-red-500 w-4 h-4" checked={String(s.id) === preselect} />
                  <span class="text-sm text-slate-200">{esc(s.title)}</span>
                </label>
              ))}
            </div>
          </div>
          <div id="booking-msg" class="hidden text-sm rounded-xl px-4 py-3"></div>
          <div class="flex flex-wrap items-center gap-3">
            <button type="submit" class="btn-primary px-6 py-3 text-base">Submit Request</button>
            <a href="/track" class="px-6 py-3 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5">Already booked? Track it</a>
          </div>
        </form>

        {/* Success panel (hidden initially) */}
        <div id="booking-success" class="hidden rounded-3xl bg-white/5 border border-emerald-500/40 p-8 text-center">
          <div class="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-3xl mb-4"><i class="fas fa-circle-check"></i></div>
          <h2 class="text-2xl font-extrabold text-white">Request received!</h2>
          <p class="text-slate-400 mt-2">Save your Booking ID — you'll need it with an OTP to track status.</p>
          <div class="mt-6 inline-block px-8 py-4 rounded-2xl bg-slate-900 border border-white/10">
            <div class="text-xs text-slate-500 uppercase tracking-wide">Your Booking ID</div>
            <div id="success-code" class="text-2xl font-black text-red-400 tracking-wider mt-1">—</div>
          </div>
          <div class="flex flex-wrap justify-center gap-3 mt-8">
            <a href="/track" class="btn-primary px-6 py-3">Track Booking <i class="fas fa-arrow-right"></i></a>
            <a href="/" class="px-6 py-3 rounded-xl border border-white/20 text-slate-200 font-semibold hover:bg-white/5">Back Home</a>
          </div>
        </div>
      </section>
    </PublicLayout>
  )
})

// Handled by API: POST /api/bookings

// ---------- TRACK BOOKING ----------
bookingRoutes.get('/track', (c) =>
  c.html(
    <PublicLayout user={c.get('user')} current="/track" title="Track Booking">
      <PageHero eyebrow="Tracking" title="Track your booking" subtitle="Enter your Booking ID and we'll send a one-time password (OTP) to your registered phone/email." />
      <section class="max-w-lg mx-auto px-4 sm:px-6 py-12">
        {/* Step 1: request OTP */}
        <div id="track-step1" class="rounded-3xl bg-white/5 border border-white/10 p-8">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-lg mb-5"><i class="fas fa-magnifying-glass"></i></div>
          <h2 class="font-bold text-white text-lg">Enter your Booking ID</h2>
          <form id="otp-request-form" class="mt-5 space-y-4">
            <input name="booking_code" required placeholder="e.g. SBM-2026-A1B2C3" class="form-dark font-mono uppercase" />
            <div id="otp-req-msg" class="hidden text-sm rounded-xl px-4 py-3"></div>
            <button type="submit" class="btn-primary w-full py-3">Send OTP</button>
          </form>
          <p class="text-xs text-slate-500 mt-4"><i class="fas fa-lock mr-1"></i> For your security, booking details are only shown after OTP verification.</p>
        </div>

        {/* Step 2: verify OTP */}
        <div id="track-step2" class="hidden rounded-3xl bg-white/5 border border-white/10 p-8">
          <div class="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 text-white flex items-center justify-center text-lg mb-5"><i class="fas fa-shield-halved"></i></div>
          <h2 class="font-bold text-white text-lg">Enter the OTP</h2>
          <p class="text-sm text-slate-400 mt-1">We sent a 6-digit code to <span id="otp-dest" class="text-slate-200 font-medium">your registered contact</span>. It expires in 10 minutes.</p>
          <form id="otp-verify-form" class="mt-5 space-y-4">
            <input type="hidden" name="booking_code" />
            <input name="code" required maxlength={6} placeholder="______" class="form-dark text-center text-2xl tracking-[0.5em] font-mono" />
            <div id="otp-ver-msg" class="hidden text-sm rounded-xl px-4 py-3"></div>
            <button type="submit" class="btn-primary w-full py-3">Verify & View Status</button>
            <button type="button" id="resend-otp" class="w-full text-sm text-slate-400 hover:text-white py-2">Resend OTP</button>
          </form>
        </div>

        {/* Step 3: booking detail */}
        <div id="track-detail" class="hidden space-y-6"></div>
      </section>
    </PublicLayout>
  )
)
