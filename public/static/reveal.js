/* ============================================================
   SCROLL ANIMATION ENGINE — home/about/services ka animation dimaag
   Kaam: scroll pe elements ko reveal karna (.reveal/.stagger),
   3D tilt (.tilt), cursor spotlight (.spot), number count-up
   aur halka parallax. Reduced-motion wale users ke liye band.
   ============================================================ */
/* ============================================================
   AWADH Sports Live — shared page animation engine
   Drives the CSS animation system used by home / about / services.
     • .reveal / .stagger   → reveal on scroll into view
     • .tilt                → subtle 3D tilt following the cursor
     • .spot                → radial spotlight following the cursor
     • .count               → number count-up when visible
     • [data-parallax]      → gentle vertical parallax while scrolling
   All effects are disabled under prefers-reduced-motion.
   ============================================================ */
(function () {
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ---------------- Scroll reveal ---------------- */
  var revealables = [].slice.call(document.querySelectorAll('.reveal, .stagger'))
  if (reduce) {
    revealables.forEach(function (el) { el.classList.add('is-in') })
  } else if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('is-in')
          io.unobserve(e.target)
        }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' })
    revealables.forEach(function (el) { io.observe(el) })
  } else {
    revealables.forEach(function (el) { el.classList.add('is-in') })
  }

  /* ---------------- Number count-up ---------------- */
  function animateCount(el) {
    var target = parseFloat(el.getAttribute('data-count') || el.textContent.replace(/[^0-9.]/g, '')) || 0
    var suffix = el.getAttribute('data-suffix') || ''
    var dur = 1500
    var start = null
    function frame(ts) {
      if (start === null) start = ts
      var p = Math.min((ts - start) / dur, 1)
      var eased = 1 - Math.pow(1 - p, 3)
      el.textContent = Math.round(eased * target) + suffix
      if (p < 1) requestAnimationFrame(frame)
      else el.textContent = target + suffix
    }
    requestAnimationFrame(frame)
  }
  var counters = [].slice.call(document.querySelectorAll('[data-count]'))
  if (counters.length) {
    if (reduce) {
      counters.forEach(function (el) { el.textContent = (el.getAttribute('data-count') || '') + (el.getAttribute('data-suffix') || '') })
    } else if ('IntersectionObserver' in window) {
      var cio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { animateCount(e.target); cio.unobserve(e.target) }
        })
      }, { threshold: 0.5 })
      counters.forEach(function (el) { cio.observe(el) })
    } else {
      counters.forEach(animateCount)
    }
  }

  if (reduce) return

  /* ---------------- 3D tilt + spotlight ---------------- */
  var tilts = [].slice.call(document.querySelectorAll('.tilt, .spot'))
  tilts.forEach(function (card) {
    var raf = null
    var px = 0, py = 0

    function apply() {
      raf = null
      var rect = card.getBoundingClientRect()
      var cx = (px - rect.left) / rect.width
      var cy = (py - rect.top) / rect.height
      if (card.classList.contains('spot')) {
        card.style.setProperty('--mx', (cx * 100).toFixed(1) + '%')
        card.style.setProperty('--my', (cy * 100).toFixed(1) + '%')
      }
      if (card.classList.contains('tilt')) {
        var rx = (0.5 - cy) * 9
        var ry = (cx - 0.5) * 11
        card.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-4px)'
      }
    }

    card.addEventListener('pointermove', function (e) {
      px = e.clientX; py = e.clientY
      if (!raf) raf = requestAnimationFrame(apply)
    })
    card.addEventListener('pointerleave', function () {
      if (raf) { cancelAnimationFrame(raf); raf = null }
      card.style.transform = ''
    })
  })

  /* ---------------- Gentle parallax ---------------- */
  var parallax = [].slice.call(document.querySelectorAll('[data-parallax]'))
  if (parallax.length) {
    var ticking = false
    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(function () {
        var vh = window.innerHeight
        parallax.forEach(function (el) {
          var speed = parseFloat(el.getAttribute('data-parallax')) || 0.12
          var rect = el.getBoundingClientRect()
          if (rect.bottom < -vh || rect.top > vh * 2) return
          var mid = rect.top + rect.height / 2 - vh / 2
          el.style.transform = 'translateY(' + (-mid * speed).toFixed(1) + 'px)'
        })
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }
})()
