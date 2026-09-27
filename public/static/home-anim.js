/* ============================================================
   AWADH Sports Live — home hero animation (box-free)
   The services are also listed in a pure-CSS marquee band; here we
   cycle the giant outline word behind the hero through every service,
   then rest on the AWADH SPORTS brand. Loops forever.
   ============================================================ */
(function () {
  var word = document.getElementById('hero-ghost-word')
  if (!word) return

  // Service titles are delivered to the page via a JSON island (kept in sync
  // with the marquee section). Fall back to the initial server-rendered text.
  var titles = []
  try { titles = (window.__HOME_SERVICES__ || []).filter(function (t) { return !!t }) } catch (e) {}
  if (titles.length === 0) titles = [word.textContent.trim()]

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (titles.length < 2) return

  var idx = 0
  var WORD_MS = 2300     // each service word stays this long
  var BRAND_MS = 3600    // the AWADH SPORTS finale

  function setWord(text, flame) {
    word.textContent = text
    word.classList.toggle('is-flame', !!flame)
  }

  if (reduce) { setWord('AWADH SPORTS', true); return }

  // Reveal the first word.
  word.classList.add('is-on')

  function step() {
    // fade out
    word.classList.remove('is-on')
    setTimeout(function () {
      if (idx < titles.length) {
        setWord(titles[idx], false)
        idx++
      } else {
        setWord('AWADH SPORTS', true)
        idx = 0
        // brand phase gets a longer hold
        word.classList.add('is-on')
        setTimeout(step, BRAND_MS)
        return
      }
      word.classList.add('is-on')
      setTimeout(step, WORD_MS)
    }, 480)
  }

  setTimeout(step, WORD_MS)
})()
