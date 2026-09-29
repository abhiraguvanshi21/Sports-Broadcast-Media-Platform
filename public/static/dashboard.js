/* ============================================================
   EMPLOYEE DASHBOARD JS — attendance check-in / check-out
   Kaam: portal ke dashboard pe Check-In / Check-Out buttons ko
   API se jodna aur success/error message dikhana.
   ============================================================ */
/* AWADH Sports Live — employee dashboard: attendance check-in / check-out */
(function () {
  var ci = document.getElementById('btn-checkin')
  var co = document.getElementById('btn-checkout')
  var msg = document.getElementById('att-msg')

  function show(text, ok) {
    if (!msg) return
    msg.textContent = text
    msg.className =
      'text-sm rounded-xl px-3 py-2 mb-3 ' +
      (ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200')
  }

  function busy(btn, on) {
    if (!btn) return
    btn.disabled = on
    btn.style.opacity = on ? '.6' : ''
  }

  function post(url, btn) {
    busy(btn, true)
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d } }) })
      .then(function (res) {
        if (res.ok) {
          show('Done! Refreshing…', true)
          setTimeout(function () { window.location.reload() }, 700)
        } else {
          show((res.d && res.d.error) || 'Something went wrong.', false)
          busy(btn, false)
        }
      })
      .catch(function () {
        show('Network error. Please try again.', false)
        busy(btn, false)
      })
  }

  if (ci) ci.addEventListener('click', function () { post('/api/attendance/checkin', ci) })
  if (co) co.addEventListener('click', function () { post('/api/attendance/checkout', co) })
})()
