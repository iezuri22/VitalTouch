/* Homepage-only behaviour: the cost calculator and the sample visit record.
 *
 * Calculator numbers are the Genworth/CareScout 2024 national medians. Home
 * care uses the homemaker median ($75,504 for 44 hrs/week x 52 weeks, about
 * $33/hr). They are reference figures, never VitalTouch prices.
 */
(function () {
  'use strict';
  var RATE = 75504 / (44 * 52);          // ~$33.00 an hour
  var SCALE = 140000;                     // right edge of the plot
  var ASSISTED = 70800, NURSING = 111325;
  var money = function (n) { return '$' + Math.round(n).toLocaleString('en-US'); };

  var input = document.getElementById('calcHours');
  if (input) {
    var out = document.getElementById('calcHoursOut');
    var month = document.getElementById('calcMonth');
    var year = document.getElementById('calcYear');
    var verdict = document.getElementById('calcVerdict');
    var bar = document.getElementById('calcBar');
    var barVal = document.getElementById('calcBarVal');
    var rowLabel = document.getElementById('calcRowLabel');

    var render = function () {
      var hrs = Math.round(Number(input.value) || 20);
      var annual = RATE * hrs * 52;
      var v = Math.min(annual / SCALE, 1).toFixed(4);
      out.textContent = hrs;
      month.textContent = money(annual / 12);
      year.textContent = money(annual);
      bar.style.setProperty('--v', v);
      barVal.style.setProperty('--v', v);
      barVal.textContent = money(annual);
      rowLabel.textContent = hrs + ' hrs / week';
      input.style.setProperty('--fill', ((hrs - input.min) / (input.max - input.min) * 100).toFixed(1) + '%');
      var text;
      if (annual < ASSISTED) {
        var pct = Math.round((1 - annual / ASSISTED) * 100);
        text = 'At ' + hrs + ' hours a week, care at home costs about ' + pct + '% less than assisted living.';
      } else if (annual < NURSING) {
        text = 'At ' + hrs + ' hours a week, care at home costs more than assisted living and still less than a nursing home.';
      } else {
        text = 'At ' + hrs + ' hours a week, care at home is close to nursing home cost. Most families need far fewer hours.';
      }
      verdict.textContent = text;
      var q = document.getElementById('calcQuote');
      if (q) {
        q.textContent = 'Get my quote for ' + hrs + ' hrs/week';
        q.setAttribute('data-title', 'Get your quote for ' + hrs + ' hours a week');
        q.setAttribute('data-msg', 'calculator, ' + hrs + ' hrs/week');
      }
    };
    input.addEventListener('input', render);
    render();
  }

  /* Data panel bars grow in when the panel scrolls into view. */
  var panel = document.querySelector('.vt-panel');
  var reduceP = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (panel && !reduceP && 'IntersectionObserver' in window && panel.getBoundingClientRect().top > (window.innerHeight || 800)) {
    panel.classList.add('is-pending');
    var po = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { panel.classList.remove('is-pending'); po.disconnect(); }
    }, { threshold: 0.35 });
    po.observe(panel);
  }

  /* Sample visit record: tasks tick off one by one when it scrolls into view.
     Visible and complete at rest if motion is reduced or IO is missing. */
  var record = document.querySelector('[data-record]');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (record && !reduce && 'IntersectionObserver' in window &&
      record.getBoundingClientRect().top > (window.innerHeight || 800)) {
    record.classList.add('is-pending');
    var io = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return;
      io.disconnect();
      record.classList.remove('is-pending');
      record.classList.add('is-playing');
    }, { threshold: 0.4 });
    io.observe(record);
  }
})();

/* ---- v3: zip checker, service tabs, hero video control ---- */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero video: honor reduced motion, and give a visible pause control.
  var video = document.querySelector('.h-hero__video');
  var pauseBtn = document.querySelector('.h-hero__pause');
  if (video) {
    var userPaused = false;
    if (reduce) { video.removeAttribute('autoplay'); video.pause(); userPaused = true; }
    else { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    // Play only while the hero is on screen: saves battery, and restarts
    // playback if a browser held autoplay back.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        if (userPaused) return;
        if (e[0].isIntersecting) { var q = video.play(); if (q && q.catch) q.catch(function () {}); }
        else video.pause();
      }, { threshold: 0.15 }).observe(video);
    }
    var setBtn = function () {
      if (!pauseBtn) return;
      var paused = video.paused;
      pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false');
      pauseBtn.setAttribute('aria-label', paused ? 'Play background video' : 'Pause background video');
      pauseBtn.innerHTML = '<i class="ph ' + (paused ? 'ph-play' : 'ph-pause') + '" aria-hidden="true"></i>';
    };
    if (pauseBtn) pauseBtn.addEventListener('click', function () { if (video.paused) { userPaused = false; video.play(); } else { userPaused = true; video.pause(); } setBtn(); });
    video.addEventListener('play', setBtn); video.addEventListener('pause', setBtn);
    setBtn();
  }

  // Zip checker, backed by js/zips.js (generated from the area pages).
  var form = document.getElementById('zipCheck');
  if (form) {
    var input = document.getElementById('zipInput');
    var out = document.getElementById('zipOut');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var z = (input.value || '').replace(/\D/g, '').slice(0, 5);
      out.className = 'h-zip__out';
      if (z.length !== 5) { out.textContent = 'Enter a 5-digit zip code.'; out.classList.add('is-warn'); return; }
      var hits = (window.VT_ZIPS || {})[z];
      if (hits && hits.length) {
        var inChicago = hits.every(function (h) { return / Chicago$/.test(h[0]); });
        var names = hits.map(function (h) { return inChicago ? h[0].replace(', Chicago', '') : h[0]; });
        var list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
        if (inChicago) list += ' in Chicago';
        out.innerHTML = '';
        out.classList.add('is-yes');
        out.appendChild(document.createTextNode('Yes, we serve ' + list + '. '));
        var a = document.createElement('a');
        a.href = 'home-care-' + hits[0][1] + '.html';
        a.textContent = 'See care in ' + hits[0][0].replace(', Chicago', '');
        out.appendChild(a);
        try { localStorage.setItem('vt_zip', z); } catch (e2) {}
        if (window.vtEngage && !window.vtEngage.done()) {
          var b = document.createElement('button');
          b.type = 'button'; b.className = 'eg-inline';
          b.setAttribute('data-engage', 'hero-zip');
          b.setAttribute('data-zip', z);
          b.setAttribute('data-kicker', 'Local care');
          b.setAttribute('data-title', 'Talk to someone who covers ' + hits[0][0].replace(', Chicago', ''));
          b.setAttribute('data-msg', 'zip check ' + z);
          b.innerHTML = '<i class="ph ph-phone-call" aria-hidden="true"></i>Get a call from someone local';
          out.appendChild(document.createElement('br'));
          out.appendChild(b);
        }
      } else {
        out.innerHTML = '';
        out.appendChild(document.createTextNode(z + ' isn’t on our list yet, but we may still be able to help. '));
        var c = document.createElement('a');
        c.href = 'consult.html?from=home-zip-' + z;
        c.textContent = 'Ask us';
        out.appendChild(c);
      }
    });
  }

  // Service tabs (WAI-ARIA tabs pattern: arrows move, Enter/Space or click selects).
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.h-tab'));
  var select = function (tab, focus) {
    tabs.forEach(function (t) {
      var on = t === tab;
      t.setAttribute('aria-selected', on ? 'true' : 'false');
      t.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    if (focus) tab.focus();
  };
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { select(t, false); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (e.key === 'Home') n = tabs[0];
      if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
})();
