/* PrimeCast — staff/portal sidebar toggle */
(function () {
  var toggle = document.getElementById('sidebar-toggle')
  var sidebar = document.getElementById('sidebar')
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('-translate-x-full')
    })
  }
  // Auto-hide sidebar on mobile after navigating
  document.querySelectorAll('#sidebar nav a').forEach(function (a) {
    a.addEventListener('click', function () {
      if (window.innerWidth < 1024) sidebar.classList.add('-translate-x-full')
    })
  })
})()
