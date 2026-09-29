/* ============================================================
   HOME PAGE ANIMATIONS — home page ke numbers/hero animation
   Kaam: hero ke stats (jaise 500+ matches) ko count-up karna
   jab wo screen pe aaye.
   ============================================================ */
/* ============================================================
   AWADH Sports Live — home animations (box-free)
   • Hero background: pure-CSS aurora + floating icons (no JS needed)
   • Stats: count-up numbers when the hero scrolls into view
   ============================================================ */
(function () {
  var counters = [].slice.call(document.querySelectorAll('.stat-count'))
  if (!counters.length) return

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function setFinal(el) {
    el.textContent = String(Number(el.getAttribute('data-count')) || 0)
  }

  if (reduce) { counters.forEach(setFinal); return }

  function countUp(el) {
    var target = Number(el.getAttribute('data-count')) || 0
    if (target <= 0) { el.textContent = '0'; return }
    var dur = 1400
    var start = null
    function frame(ts) {
      if (start === null) start = ts
      var p = Math.min((ts - start) / dur, 1)
      // ease-out cubic
      var eased = 1 - Math.pow(1 - p, 3)
      el.textContent = String(Math.round(eased * target))
      if (p < 1) requestAnimationFrame(frame)
      else el.textContent = String(target)
    }
    requestAnimationFrame(frame)
  }

  var done = new WeakSet()
  function run(el) {
    if (done.has(el)) return
    done.add(el)
    countUp(el)
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target) }
      })
    }, { threshold: 0.4 })
    counters.forEach(function (el) { io.observe(el) })
  } else {
    counters.forEach(run)
  }
})()
