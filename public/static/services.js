/* AWADH Sports Live — service details modal (opens centered on card tap) */
(function () {
  'use strict'
  var modal = document.getElementById('service-modal')
  if (!modal) return
  var services = window.__SERVICES__ || []

  function open(idx) {
    var s = services[idx]
    if (!s) return
    document.getElementById('service-modal-title').textContent = s.title
    document.getElementById('service-modal-short').textContent = s.short_desc || ''
    var body = document.getElementById('service-modal-body')
    body.textContent = s.description || s.short_desc || 'Details coming soon.'
    var icon = document.getElementById('service-modal-icon')
    icon.innerHTML = '<i class="fas ' + (s.icon || 'fa-broadcast-tower') + '"></i>'
    document.getElementById('service-modal-book').setAttribute('href', '/book?service=' + s.id)
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
  }

  function close() {
    modal.classList.add('hidden')
    document.body.style.overflow = ''
  }

  document.querySelectorAll('.service-card').forEach(function (card) {
    card.addEventListener('click', function () { open(Number(card.getAttribute('data-service'))) })
    card.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(Number(card.getAttribute('data-service'))) }
    })
  })

  modal.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', close) })
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close() })

  // Deep link: /services#match-production opens that service's modal
  if (location.hash) {
    var slug = location.hash.slice(1)
    var idx = services.findIndex(function (s) { return s.slug === slug })
    if (idx >= 0) setTimeout(function () { open(idx) }, 150)
  }
})()
