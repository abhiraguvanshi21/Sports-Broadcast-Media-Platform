/* ============================================================
   PUBLIC SITE JS — aam website ke chhote interactions
   Kaam: mobile menu (hamburger) kholna/band karna aur baaki
   basic UI behaviour (scroll, FAQ, etc.).
   ============================================================ */
/* PrimeCast — public site JS */
(function () {
  'use strict'

  // Mobile nav toggle
  var toggle = document.getElementById('nav-toggle')
  var nav = document.getElementById('mobile-nav')
  if (toggle && nav) {
    toggle.addEventListener('click', function () { nav.classList.toggle('hidden') })
  }

  // Countdowns
  document.querySelectorAll('.countdown').forEach(function (el) {
    var date = el.getAttribute('data-date')
    if (!date) return
    var target = new Date(date).getTime()
    if (isNaN(target)) return
    function tick() {
      var diff = target - Date.now()
      if (diff <= 0) { el.textContent = 'Starting soon'; return }
      var d = Math.floor(diff / 86400000)
      var h = Math.floor((diff % 86400000) / 3600000)
      var m = Math.floor((diff % 3600000) / 60000)
      var s = Math.floor((diff % 60000) / 1000)
      el.textContent = (d > 0 ? d + 'd ' : '') + h + 'h ' + m + 'm ' + s + 's'
      setTimeout(tick, 1000)
    }
    tick()
  })

  function showMsg(el, text, type) {
    if (!el) return
    el.textContent = text
    el.className = 'text-sm rounded-xl px-4 py-3 msg-' + (type || 'info')
    el.classList.remove('hidden')
  }

  // Booking form
  var bookingForm = document.getElementById('booking-form')
  if (bookingForm) {
    bookingForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      var msg = document.getElementById('booking-msg')
      var fd = new FormData(bookingForm)
      var services = fd.getAll('services').map(Number)
      var payload = {
        contact_name: fd.get('contact_name'),
        contact_phone: fd.get('contact_phone'),
        contact_email: fd.get('contact_email'),
        organization: fd.get('organization'),
        event_name: fd.get('event_name'),
        sport: fd.get('sport'),
        event_date: fd.get('event_date'),
        city: fd.get('city'),
        venue: fd.get('venue'),
        requirements: fd.get('requirements'),
        budget: fd.get('budget'),
        services: services,
      }
      var btn = bookingForm.querySelector('button[type=submit]')
      btn.disabled = true
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'
      try {
        var res = await axios.post('/api/bookings', payload)
        bookingForm.classList.add('hidden')
        var success = document.getElementById('booking-success')
        document.getElementById('success-code').textContent = res.data.booking_code
        success.classList.remove('hidden')
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } catch (err) {
        showMsg(msg, (err.response && err.response.data && err.response.data.error) || 'Something went wrong. Please try again.', 'error')
        btn.disabled = false
        btn.innerHTML = 'Submit Request'
      }
    })
  }

  // OTP request
  var otpReq = document.getElementById('otp-request-form')
  if (otpReq) {
    otpReq.addEventListener('submit', async function (e) {
      e.preventDefault()
      var msg = document.getElementById('otp-req-msg')
      var code = otpReq.querySelector('[name=booking_code]').value.trim().toUpperCase()
      try {
        var res = await axios.post('/api/bookings/track/request-otp', { booking_code: code })
        document.getElementById('otp-dest').textContent = res.data.destination
        document.getElementById('track-step1').classList.add('hidden')
        var step2 = document.getElementById('track-step2')
        step2.classList.remove('hidden')
        step2.querySelector('[name=booking_code]').value = code
        var vmsg = document.getElementById('otp-ver-msg')
        if (res.data.otp) {
          showMsg(vmsg, 'Your OTP is ' + res.data.otp + ' — enter it below to open your booking.', 'success')
          var otpInput = document.querySelector('#otp-verify-form [name=code]')
          if (otpInput) { otpInput.value = res.data.otp; otpInput.focus() }
        }
      } catch (err) {
        showMsg(msg, (err.response && err.response.data && err.response.data.error) || 'Could not send OTP.', 'error')
      }
    })
  }

  // Resend OTP
  var resend = document.getElementById('resend-otp')
  if (resend) {
    resend.addEventListener('click', function () {
      var form = document.getElementById('otp-verify-form')
      var code = form.querySelector('[name=booking_code]').value
      axios.post('/api/bookings/track/request-otp', { booking_code: code }).then(function (res) {
        var vmsg = document.getElementById('otp-ver-msg')
        var text = 'New OTP sent.' + (res.data.otp ? ' Your OTP is ' + res.data.otp : '')
        showMsg(vmsg, text, 'success')
        if (res.data.otp) {
          var otpInput = document.querySelector('#otp-verify-form [name=code]')
          if (otpInput) otpInput.value = res.data.otp
        }
      }).catch(function (err) {
        showMsg(document.getElementById('otp-ver-msg'), (err.response && err.response.data && err.response.data.error) || 'Could not resend.', 'error')
      })
    })
  }

  // OTP verify
  var otpVerify = document.getElementById('otp-verify-form')
  if (otpVerify) {
    otpVerify.addEventListener('submit', async function (e) {
      e.preventDefault()
      var msg = document.getElementById('otp-ver-msg')
      var fd = new FormData(otpVerify)
      try {
        var res = await axios.post('/api/bookings/track/verify', {
          booking_code: fd.get('booking_code'),
          code: fd.get('code'),
        })
        renderBooking(res.data)
      } catch (err) {
        showMsg(msg, (err.response && err.response.data && err.response.data.error) || 'Verification failed.', 'error')
      }
    })
  }

  var STATUS_CHIP = {
    received: 'bg-slate-100 text-slate-700', under_review: 'bg-amber-100 text-amber-800',
    discussion: 'bg-purple-100 text-purple-800', quotation_sent: 'bg-blue-100 text-blue-800',
    approved: 'bg-emerald-100 text-emerald-800', in_production: 'bg-cyan-100 text-cyan-800',
    completed: 'bg-green-100 text-green-800', cancelled: 'bg-rose-100 text-rose-800',
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] }) }
  function fmtDate(d) { if (!d) return '—'; var dt = new Date(d); return isNaN(dt) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) }

  function renderBooking(data) {
    document.getElementById('track-step1').classList.add('hidden')
    document.getElementById('track-step2').classList.add('hidden')
    var el = document.getElementById('track-detail')
    var b = data.booking
    var chip = STATUS_CHIP[b.status] || 'bg-slate-100 text-slate-700'
    var html = ''
    html += '<div class="rounded-3xl bg-white/5 border border-white/10 p-8">'
    html += '<div class="flex items-center justify-between mb-5"><div><div class="text-xs text-slate-500 uppercase tracking-wide">Booking ID</div><div class="font-mono text-lg font-bold text-red-400">' + esc(b.booking_code) + '</div></div><span class="px-3 py-1.5 rounded-full text-sm font-bold ' + chip + '">' + esc(b.status.replace(/_/g, ' ')) + '</span></div>'
    html += '<dl class="grid sm:grid-cols-2 gap-4 text-sm">'
    var rows = [['Event', b.event_name], ['Sport', b.sport], ['Date', fmtDate(b.event_date)], ['Venue', b.venue], ['City', b.city], ['Requested', fmtDate(b.created_at)]]
    rows.forEach(function (r) { html += '<div><dt class="text-slate-500">' + r[0] + '</dt><dd class="text-slate-200 mt-0.5">' + esc(r[1] || '—') + '</dd></div>' })
    html += '</dl>'
    if (data.services && data.services.length) {
      html += '<div class="mt-5 pt-5 border-t border-white/10"><div class="text-xs text-slate-500 uppercase tracking-wide mb-2">Services</div><div class="flex flex-wrap gap-2">'
      data.services.forEach(function (s) { html += '<span class="px-2.5 py-1 rounded-lg bg-red-500/15 text-red-300 text-xs font-semibold">' + esc(s) + '</span>' })
      html += '</div></div>'
    }
    html += '</div>'

    if (data.quotations && data.quotations.length) {
      html += '<div class="rounded-3xl bg-white/5 border border-white/10 p-6"><h3 class="font-bold text-white mb-4"><i class="fas fa-file-invoice-dollar text-red-500 mr-2"></i>Quotations</h3><div class="space-y-3">'
      data.quotations.forEach(function (q) {
        html += '<div class="p-4 rounded-xl bg-slate-900/60"><div class="flex items-center justify-between"><span class="text-xl font-bold text-white">₹' + Number(q.amount).toLocaleString('en-IN') + '</span><span class="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-300 font-semibold">' + esc(q.status) + '</span></div>'
        if (q.details) html += '<p class="text-sm text-slate-400 mt-2">' + esc(q.details) + '</p>'
        html += '</div>'
      })
      html += '</div></div>'
    }

    html += '<div class="rounded-3xl bg-white/5 border border-white/10 p-6"><h3 class="font-bold text-white mb-4"><i class="fas fa-comments text-red-500 mr-2"></i>Messages</h3><div class="space-y-4">'
    if (!data.messages || !data.messages.length) html += '<p class="text-sm text-slate-500">No messages yet.</p>'
    ;(data.messages || []).forEach(function (m) {
      var mine = m.sender_type === 'customer'
      html += '<div class="flex ' + (mine ? 'justify-end' : '') + '"><div class="max-w-[80%] rounded-2xl px-4 py-2.5 ' + (mine ? 'bg-slate-800 text-slate-200' : 'bg-white/10 text-slate-200') + '"><div class="text-xs opacity-60 mb-0.5">' + esc(m.sender_name || m.sender_type) + ' · ' + fmtDate(m.created_at) + '</div><div class="text-sm">' + esc(m.message) + '</div></div></div>'
    })
    html += '</div></div>'

    if (data.documents && data.documents.length) {
      html += '<div class="rounded-3xl bg-white/5 border border-white/10 p-6"><h3 class="font-bold text-white mb-4"><i class="fas fa-paperclip text-red-500 mr-2"></i>Documents</h3><div class="space-y-2">'
      data.documents.forEach(function (d) { html += '<a href="' + esc(d.file_url) + '" target="_blank" class="flex items-center gap-3 text-sm text-slate-300 hover:text-white"><i class="fas fa-file"></i>' + esc(d.title) + '</a>' })
      html += '</div></div>'
    }

    el.innerHTML = html
    el.classList.remove('hidden')
  }

  // Contact form
  var contactForm = document.getElementById('contact-form')
  if (contactForm) {
    contactForm.addEventListener('submit', async function (e) {
      e.preventDefault()
      var msg = document.getElementById('contact-msg')
      var fd = new FormData(contactForm)
      try {
        await axios.post('/api/contact', Object.fromEntries(fd.entries()))
        showMsg(msg, 'Thank you! We will get back to you shortly.', 'success')
        contactForm.reset()
      } catch (err) {
        showMsg(msg, (err.response && err.response.data && err.response.data.error) || 'Could not send.', 'error')
      }
    })
  }

  // Careers apply forms
  document.querySelectorAll('.apply-form').forEach(function (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault()
      var msg = form.querySelector('.apply-msg')
      var fd = new FormData(form)
      var payload = Object.fromEntries(fd.entries())
      payload.job_id = form.getAttribute('data-job')
      try {
        await axios.post('/api/careers/apply', payload)
        showMsg(msg, 'Application submitted. Thank you!', 'success')
        form.reset()
      } catch (err) {
        showMsg(msg, (err.response && err.response.data && err.response.data.error) || 'Could not submit.', 'error')
      }
    })
  })
})()
