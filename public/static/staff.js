/* ============================================================
   STAFF / PORTAL JS — admin & portal panel ke scripts
   Kaam: sidebar toggle, aur image uploader (device/Drive se
   photo chunna -> frame editor -> /api/upload -> R2 -> URL form me).
   ============================================================ */
/* ============================================================
   AWADH Sports Live — staff/portal panel scripts
   • Sidebar toggle
   • Image uploader: pick a file from device / Drive / Photos,
     upload it to R2 via /api/upload, and write the URL into a
     hidden input so the form submits a normal URL value.
   ============================================================ */
(function () {
  /* ---------- Sidebar toggle ---------- */
  var toggle = document.getElementById('sidebar-toggle')
  var sidebar = document.getElementById('sidebar')
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('-translate-x-full')
    })
  }
  if (sidebar) {
    sidebar.querySelectorAll('nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        if (window.innerWidth < 1024) sidebar.classList.add('-translate-x-full')
      })
    })
  }

  /* ---------- Image uploader ---------- */
  function humanSize(n) {
    if (n < 1024) return n + ' B'
    if (n < 1048576) return (n / 1024).toFixed(0) + ' KB'
    return (n / 1048576).toFixed(1) + ' MB'
  }

  function initUploader(root) {
    var fileInput = root.querySelector('[data-img-input]')
    var valueInput = root.querySelector('[data-img-value]')
    var idle = root.querySelector('[data-img-idle]')
    var previewWrap = root.querySelector('[data-img-preview-wrap]')
    var preview = root.querySelector('[data-img-preview]')
    var nameEl = root.querySelector('[data-img-name]')
    var clearBtn = root.querySelector('[data-img-clear]')
    var bar = root.querySelector('[data-img-bar]')
    if (!fileInput || !valueInput) return

    function showPreview(url, name) {
      if (url) {
        preview.src = url
        nameEl.textContent = name || url.split('/').pop()
        idle.classList.add('hidden')
        previewWrap.classList.remove('hidden')
        root.classList.add('has-file')
      } else {
        preview.removeAttribute('src')
        idle.classList.remove('hidden')
        previewWrap.classList.add('hidden')
        root.classList.remove('has-file')
      }
    }

    // If the field already has a URL (edit case), show it.
    if (valueInput.value) showPreview(valueInput.value)

    // Click anywhere on the drop zone opens the file picker.
    root.addEventListener('click', function (e) {
      if (e.target.closest('[data-img-clear]')) return
      fileInput.click()
    })

    ;['dragenter', 'dragover'].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.preventDefault(); root.classList.add('is-drag') })
    })
    ;['dragleave', 'drop'].forEach(function (ev) {
      root.addEventListener(ev, function (e) { e.preventDefault(); root.classList.remove('is-drag') })
    })
    root.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]
      if (f) choose(f)
    })

    fileInput.addEventListener('change', function () {
      if (fileInput.files && fileInput.files[0]) choose(fileInput.files[0])
    })

    clearBtn.addEventListener('click', function (e) {
      e.preventDefault(); e.stopPropagation()
      valueInput.value = ''
      fileInput.value = ''
      showPreview('')
    })

    // Open the frame editor first (so the user can crop / zoom / rotate),
    // then upload the cropped result. Falls back to a plain upload if the
    // cropper is unavailable.
    function choose(file) {
      if (!/^image\//.test(file.type)) {
        alert('Please choose an image file (JPG, PNG, WEBP, GIF or SVG).')
        return
      }
      if (file.size > 8 * 1024 * 1024) {
        alert('That image is larger than 8 MB. Please choose a smaller file.')
        return
      }
      if (window.AWADHCropper && window.AWADHCropper.available()) {
        window.AWADHCropper.open(file, function (blob, filename) {
          // GIF / SVG can't be re-encoded by canvas — upload those as-is.
          if (blob === file && !/gif|svg/i.test(file.type)) {
            upload(file)
          } else {
            upload(blob, filename)
          }
        })
      } else {
        upload(file)
      }
    }

    function upload(file, filename) {
      root.classList.add('is-uploading')
      bar.classList.remove('hidden')

      var fd = new FormData()
      fd.append('file', file, filename || file.name)

      var xhr = new XMLHttpRequest()
      xhr.open('POST', '/api/upload')
      xhr.onload = function () {
        root.classList.remove('is-uploading')
        bar.classList.add('hidden')
        var res = null
        try { res = JSON.parse(xhr.responseText) } catch (e) {}
        if (xhr.status >= 200 && xhr.status < 300 && res && res.url) {
          valueInput.value = res.url
          showPreview(res.url, file.name + ' · ' + humanSize(file.size))
        } else {
          alert('Upload failed: ' + ((res && res.error) || ('HTTP ' + xhr.status)))
        }
      }
      xhr.onerror = function () {
        root.classList.remove('is-uploading')
        bar.classList.add('hidden')
        alert('Upload failed — please check your connection and try again.')
      }
      xhr.send(fd)
    }
  }

  document.querySelectorAll('[data-img-upload]').forEach(initUploader)
})()
