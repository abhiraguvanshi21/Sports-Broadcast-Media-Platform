/* ============================================================
   AWADH Sports Live — home animated services showcase
   Each service animates in one-by-one, holds, then leaves;
   finally the AWADH SPORTS wordmark takes the stage. Loops forever.
   ============================================================ */
(function () {
  var stage = document.getElementById('showcase-stage')
  if (!stage) return

  var items = [].slice.call(stage.querySelectorAll('.showcase__item'))
  var brand = stage.querySelector('.showcase__brand')
  if (items.length === 0 && !brand) return

  var showcase = document.getElementById('showcase')
  // Backgrounds alternate so the moving stage feels alive.
  var bgs = [
    'radial-gradient(600px 300px at 50% 0%, rgba(255,61,0,.16), transparent 70%),linear-gradient(180deg, rgba(24,18,16,.9), rgba(10,10,16,.92))',
    'radial-gradient(600px 300px at 50% 0%, rgba(34,211,238,.16), transparent 70%),linear-gradient(180deg, rgba(12,24,28,.9), rgba(10,10,16,.92))',
    'radial-gradient(600px 300px at 50% 0%, rgba(139,92,246,.16), transparent 70%),linear-gradient(180deg, rgba(22,16,32,.9), rgba(10,10,16,.92))',
  ]

  var dotsWrap = document.getElementById('showcase-dots')
  var dots = []
  if (dotsWrap && items.length) {
    dotsWrap.hidden = false
    items.forEach(function () {
      var d = document.createElement('i')
      dotsWrap.appendChild(d)
      dots.push(d)
    })
  }
  function paintDots(idx) {
    dots.forEach(function (d, i) { d.className = i === idx ? 'on' : '' })
  }

  var SERVICE_MS = 3200   // how long each service stays on screen
  var BRAND_MS = 4200     // how long the wordmark stays
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Reduced motion: just show the brand, no looping.
  if (reduce) {
    items.forEach(function (el) { el.classList.remove('is-active') })
    if (brand) brand.classList.add('is-active')
    return
  }

  // Restart the inner progress-bar animation of the active item.
  function restartBar(el) {
    var bar = el.querySelector('.showcase__bar > span')
    if (!bar) return
    bar.style.animation = 'none'
    // force reflow so the animation replays from 0
    void bar.offsetWidth
    bar.style.animation = ''
  }

  var idx = 0
  var phase = 'service'   // 'service' | 'brand'

  function step() {
    if (phase === 'service') {
      // hide all, show current
      items.forEach(function (el, i) { el.classList.toggle('is-active', i === idx) })
      if (brand) brand.classList.remove('is-active')
      restartBar(items[idx])
      if (showcase) showcase.style.background = bgs[idx % bgs.length]
      paintDots(idx)
      phase = 'next'
      setTimeout(step, SERVICE_MS)
    } else if (phase === 'next') {
      idx++
      if (idx < items.length) {
        phase = 'service'
        setTimeout(step, 120)
      } else {
        // all services shown → brand finale
        items.forEach(function (el) { el.classList.remove('is-active') })
        if (brand) brand.classList.add('is-active')
        if (showcase) showcase.style.background = bgs[0]
        paintDots(-1)
        phase = 'restart'
        setTimeout(step, BRAND_MS)
      }
    } else if (phase === 'restart') {
      idx = 0
      phase = 'service'
      setTimeout(step, 120)
    }
  }

  // Kick off once the element is on screen (saves work while scrolling elsewhere).
  if ('IntersectionObserver' in window) {
    var started = false
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !started) { started = true; step() }
      })
    }, { threshold: 0.25 })
    io.observe(stage)
  } else {
    step()
  }

  // Pause when the tab is hidden so timers don't pile up.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { /* timers continue but are cheap; no-op */ }
  })
})()
