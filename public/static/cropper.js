/* ============================================================
   PHOTO FRAME EDITOR — photo upload se pehle frame set karna
   Kaam: image choose karne ke baad crop/zoom/move/rotate karne
   dena aur ratio (1:1, 16:9 …) chunna; "Use this photo" pe
   canvas se cropped image banake upload ke liye dena.
   ============================================================ */
/* ============================================================
   AWADH Sports Live — photo frame editor (crop / zoom / move / rotate)
   ------------------------------------------------------------
   Opens after a user picks an image in an [data-img-upload] field.
   The user drags to move, scrolls / slides to zoom, rotates, and
   picks a frame ratio (1:1, 4:3, 16:9 … or Free). On "Use this
   photo" the crop is rendered to a canvas and handed back as a
   Blob ready to upload.

   Public API:
     window.AWADHCropper.open(file, function (blob, filename) { … })
     window.AWADHCropper.available()  -> boolean
   ============================================================ */
(function () {
  var ASPECTS = [
    { id: '1:1', label: '1:1', w: 1, h: 1 },
    { id: '4:3', label: '4:3', w: 4, h: 3 },
    { id: '3:4', label: '3:4', w: 3, h: 4 },
    { id: '16:9', label: '16:9', w: 16, h: 9 },
    { id: '9:16', label: '9:16', w: 9, h: 16 },
    { id: '3:2', label: '3:2', w: 3, h: 2 },
    { id: '2:3', label: '2:3', w: 2, h: 3 },
    { id: 'free', label: 'Free', w: 0, h: 0 },
  ]

  var MAX_EDGE = 3200 // cap the in-editor element size (keeps big photos snappy)
  var MAX_OUT = 2400 // cap exported pixel width

  function make(html) {
    var d = document.createElement('div')
    d.innerHTML = html.trim()
    return d.firstChild
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)) }

  function outputMeta(file) {
    var t = String(file.type || '')
    if (t === 'image/png') return { type: 'image/png', ext: 'png', q: undefined }
    if (t === 'image/webp') return { type: 'image/webp', ext: 'webp', q: 0.92 }
    return { type: 'image/jpeg', ext: 'jpg', q: 0.92 }
  }

  function baseName(name) {
    return String(name || 'photo').replace(/\.[^.]+$/, '').replace(/[^\w.-]+/g, '-').slice(0, 60) || 'photo'
  }

  function open(file, onDone) {
    var url = URL.createObjectURL(file)
    var img = new Image()
    var done = false

    var state = { aspect: '1:1', s: 1, tx: 0, ty: 0, rot: 0, nw: 0, nh: 0, baseW: 0, baseH: 0, g: 1 }
    var stageW = 0, stageH = 0, k = 1
    var stage, image, zoomEl, rotEl, aspectWrap

    var overlay = make(
      '<div class="awc-overlay">' +
        '<div class="awc-panel" role="dialog" aria-modal="true" aria-label="Adjust photo">' +
          '<div class="awc-head">' +
            '<div class="awc-head__t"><i class="fas fa-crop-simple"></i> Adjust photo</div>' +
            '<button type="button" class="awc-x" data-cancel aria-label="Cancel"><i class="fas fa-xmark"></i></button>' +
          '</div>' +
          '<p class="awc-tip">Drag to move · scroll or slide to zoom · rotate to your taste, then pick a frame shape.</p>' +
          '<div class="awc-stagewrap">' +
            '<div class="awc-stage" data-stage>' +
              '<img data-img alt="" />' +
              '<div class="awc-grid" aria-hidden="true"><span></span><span></span><span></span><span></span></div>' +
              '<div class="awc-frame" aria-hidden="true"><b class="awc-c tl"></b><b class="awc-c tr"></b><b class="awc-c bl"></b><b class="awc-c br"></b></div>' +
            '</div>' +
          '</div>' +
          '<div class="awc-tools">' +
            '<div class="awc-aspects" data-aspects></div>' +
            '<div class="awc-row">' +
              '<label class="awc-slider"><i class="fas fa-magnifying-glass-plus"></i>' +
                '<input type="range" data-zoom min="1" max="4" step="0.01" value="1" aria-label="Zoom" /></label>' +
              '<label class="awc-slider"><i class="fas fa-rotate"></i>' +
                '<input type="range" data-rot min="-180" max="180" step="1" value="0" aria-label="Rotate" /></label>' +
            '</div>' +
            '<div class="awc-btnrow">' +
              '<button type="button" class="awc-btn" data-rot90><i class="fas fa-rotate-right"></i> Rotate 90°</button>' +
              '<button type="button" class="awc-btn" data-reset><i class="fas fa-arrow-rotate-left"></i> Reset</button>' +
            '</div>' +
          '</div>' +
          '<div class="awc-foot">' +
            '<button type="button" class="awc-btn" data-cancel>Cancel</button>' +
            '<button type="button" class="awc-btn awc-btn--go" data-apply><i class="fas fa-check"></i> Use this photo</button>' +
          '</div>' +
        '</div>' +
      '</div>'
    )

    stage = overlay.querySelector('[data-stage]')
    image = overlay.querySelector('[data-img]')
    zoomEl = overlay.querySelector('[data-zoom]')
    rotEl = overlay.querySelector('[data-rot]')
    aspectWrap = overlay.querySelector('[data-aspects]')

    /* ---------- frame ratio chooser ---------- */
    ASPECTS.forEach(function (a) {
      var chip = make('<button type="button" class="awc-chip">' + a.label + '</button>')
      chip.addEventListener('click', function () {
        state.aspect = a.id
        state.s = 1; state.tx = 0; state.ty = 0
        zoomEl.value = '1'
        markAspect()
        layout()
        render()
      })
      aspectWrap.appendChild(chip)
    })
    function markAspect() {
      ;[].forEach.call(aspectWrap.children, function (c, i) {
        c.classList.toggle('is-on', ASPECTS[i].id === state.aspect)
      })
    }

    function aspectRatio() {
      var a = ASPECTS.filter(function (x) { return x.id === state.aspect })[0]
      if (!a || a.id === 'free') return state.baseW / state.baseH || 1
      return a.w / a.h
    }

    function layout() {
      var wrap = overlay.querySelector('.awc-stagewrap')
      var availW = Math.max(200, wrap.clientWidth || 320)
      var availH = Math.max(180, Math.min(window.innerHeight * 0.48, 430))
      var ar = aspectRatio()
      var w = availW, h = w / ar
      if (h > availH) { h = availH; w = h * ar }
      stageW = Math.round(w); stageH = Math.round(h)
      stage.style.width = stageW + 'px'
      stage.style.height = stageH + 'px'
      image.style.width = state.baseW + 'px'
      image.style.height = state.baseH + 'px'
    }

    function coverK(rot) {
      var th = rot * Math.PI / 180, c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th))
      var kx = stageW / (state.baseW * c + state.baseH * sn)
      var ky = stageH / (state.baseW * sn + state.baseH * c)
      return Math.max(kx, ky)
    }

    function render() {
      k = coverK(state.rot) * state.s
      var th = state.rot * Math.PI / 180, c = Math.abs(Math.cos(th)), sn = Math.abs(Math.sin(th))
      var hx = (k * state.baseW * c + k * state.baseH * sn) / 2
      var hy = (k * state.baseW * sn + k * state.baseH * c) / 2
      var mTx = Math.max(0, hx - stageW / 2)
      var mTy = Math.max(0, hy - stageH / 2)
      state.tx = clamp(state.tx, -mTx, mTx)
      state.ty = clamp(state.ty, -mTy, mTy)
      image.style.transform =
        'translate(calc(-50% + ' + state.tx.toFixed(1) + 'px), calc(-50% + ' + state.ty.toFixed(1) + 'px)) ' +
        'rotate(' + state.rot + 'deg) scale(' + k.toFixed(5) + ')'
    }

    /* ---------- drag to move ---------- */
    var drag = null
    stage.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return
      drag = { x: e.clientX, y: e.clientY, tx: state.tx, ty: state.ty, id: e.pointerId }
      try { stage.setPointerCapture(e.pointerId) } catch (_) {}
      stage.classList.add('is-dragging')
    })
    stage.addEventListener('pointermove', function (e) {
      if (!drag) return
      state.tx = drag.tx + (e.clientX - drag.x)
      state.ty = drag.ty + (e.clientY - drag.y)
      render()
    })
    function endDrag() { drag = null; stage.classList.remove('is-dragging') }
    stage.addEventListener('pointerup', endDrag)
    stage.addEventListener('pointercancel', endDrag)
    stage.addEventListener('pointerleave', function () { if (!drag) return })

    /* ---------- wheel zoom ---------- */
    stage.addEventListener('wheel', function (e) {
      e.preventDefault()
      var next = state.s * (1 - e.deltaY * 0.0015)
      state.s = clamp(next, 1, 4)
      zoomEl.value = String(state.s)
      render()
    }, { passive: false })

    /* ---------- controls ---------- */
    zoomEl.addEventListener('input', function () { state.s = clamp(parseFloat(zoomEl.value) || 1, 1, 4); render() })
    rotEl.addEventListener('input', function () { state.rot = parseFloat(rotEl.value) || 0; render() })
    overlay.querySelector('[data-rot90]').addEventListener('click', function () {
      state.rot = state.rot + 90 > 180 ? state.rot - 270 : state.rot + 90
      rotEl.value = String(state.rot)
      render()
    })
    overlay.querySelector('[data-reset]').addEventListener('click', function () {
      state.s = 1; state.tx = 0; state.ty = 0; state.rot = 0
      zoomEl.value = '1'; rotEl.value = '0'
      render()
    })

    function close() {
      if (done) return
      done = true
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKey)
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay)
      try { URL.revokeObjectURL(url) } catch (_) {}
    }
    function onResize() { layout(); render() }
    function onKey(e) {
      if (e.key === 'Escape') { close(); }
      else if (e.key === 'Enter') { overlay.querySelector('[data-apply]').click() }
    }

    ;[].forEach.call(overlay.querySelectorAll('[data-cancel]'), function (b) {
      b.addEventListener('click', close)
    })

    /* ---------- apply → render crop to canvas ---------- */
    overlay.querySelector('[data-apply]').addEventListener('click', function () {
      var meta = outputMeta(file)
      var outW = clamp(Math.round((stageW / k) * state.g), 64, MAX_OUT)
      var F = outW / stageW
      var outH = Math.max(1, Math.round(stageH * F))
      var canvas = document.createElement('canvas')
      canvas.width = outW
      canvas.height = outH
      var ctx = canvas.getContext('2d')
      if (!ctx) { close(); if (onDone) onDone(file, file.name); return }
      if (meta.type === 'image/jpeg') { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, outW, outH) }
      ctx.translate(outW / 2 + state.tx * F, outH / 2 + state.ty * F)
      ctx.rotate(state.rot * Math.PI / 180)
      var kOut = (k * F) / (state.g || 1)
      ctx.scale(kOut, kOut)
      try {
        ctx.drawImage(img, -state.nw / 2, -state.nh / 2, state.nw, state.nh)
      } catch (err) {
        close()
        if (onDone) onDone(file, file.name)
        return
      }
      var filename = baseName(file.name) + '-crop.' + meta.ext
      var finish = function (blob) {
        close()
        if (onDone) onDone(blob || file, blob ? filename : file.name)
      }
      if (canvas.toBlob) canvas.toBlob(function (b) { finish(b) }, meta.type, meta.q)
      else finish(file)
    })

    /* ---------- load the image ---------- */
    img.onload = function () {
      state.nw = img.naturalWidth || img.width
      state.nh = img.naturalHeight || img.height
      var maxEdge = Math.max(state.nw, state.nh)
      var cap = maxEdge > MAX_EDGE ? MAX_EDGE / maxEdge : 1
      state.baseW = state.nw * cap
      state.baseH = state.nh * cap
      state.g = state.nw / state.baseW // base→original factor
      image.src = url
      markAspect()
      layout()
      render()
      document.body.appendChild(overlay)
      requestAnimationFrame(function () {
        layout()
        render()
      })
      window.addEventListener('resize', onResize)
      window.addEventListener('keydown', onKey)
    }
    img.onerror = function () {
      close()
      if (onDone) onDone(file, file.name) // fall back to a plain upload
    }
    img.src = url
  }

  window.AWADHCropper = {
    open: open,
    available: function () { return true },
  }
})()
