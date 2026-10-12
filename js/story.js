/* "A Visit Home": the homepage's silent-film cartoon (2026-10-12).
 *
 * Owner's brief: something a senior would think is cool, fun and not too
 * tech looking, in an old school animation style. So it runs at 12 frames a
 * second (the jerky charm of a hand-cranked reel), the ink lines "boil", the
 * frame weaves and flickers, scenes open and close with an iris, and the story
 * is told on silent-film title cards in big type.
 *
 * Rules it keeps:
 * - Plays once, when it is at least half on screen. Pause, Play and Replay are
 *   always one tap away (moving content longer than 5 seconds must be
 *   pausable). Scrolling away pauses it; coming back resumes it.
 * - prefers-reduced-motion: no playback, the finished town scene shows as a
 *   still with the end card, and the button reads "Play" for anyone who wants
 *   it anyway.
 * - No scroll listeners: IntersectionObserver plus one requestAnimationFrame
 *   loop that only runs while playing.
 */
(function () {
  'use strict';
  var root = document.querySelector('[data-story]');
  if (!root) return;
  var svg = root.querySelector('.story__svg');
  var btn = root.querySelector('[data-story-btn]');
  var cap = root.querySelector('.story__cap');
  var endCard = root.querySelector('.story__end');
  var $ = function (id) { return document.getElementById(id); };
  var FPS = 12;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var small = window.matchMedia && window.matchMedia('(max-width: 760px)').matches;

  var scenes = {
    leader: $('stLeader'), card: $('stCard'), town: $('stTown'), inside: $('stInside'), letter: $('stLetter')
  };
  // The reel. `cap` is the caption read out to screen readers and shown under the film.
  var reel = [
    { s: 'leader', d: 3.0, cap: 'Three, two, one.' },
    { s: 'card', d: 3.0, small: 'VitalTouch presents', l1: 'A Visit Home', l2: '', cap: 'VitalTouch presents: A Visit Home.' },
    { s: 'card', d: 2.8, l1: 'Every Tuesday,', l2: 'the same friendly face.', cap: 'Every Tuesday, the same friendly face.' },
    { s: 'town', d: 6.2, iris: true, cap: 'The caregiver drives up. The lights come on.' },
    { s: 'card', d: 2.8, l1: 'Meals, laundry, groceries.', l2: 'Done the way you like.', cap: 'Meals, laundry, groceries. Done the way you like.' },
    { s: 'inside', d: 5.2, iris: true, cap: 'Today’s visit: meals made, laundry folded, groceries put away.' },
    { s: 'card', d: 2.8, l1: 'And on Friday,', l2: 'a note to the family.', cap: 'And on Friday, a note to the family.' },
    { s: 'letter', d: 5.0, iris: true, cap: 'The weekly note arrives at the family’s house.' }
  ];
  var total = reel.reduce(function (a, r) { return a + r.d; }, 0);

  var irisC = $('stIrisC'), sweep = $('stSweep'), count = $('stCount');
  var car = $('stCar'), carBob = $('stCarBob'), puff = $('stPuff'), wheels = root.querySelectorAll('.st-wheel');
  var arc = svg.querySelector('#stLetter path[stroke-dasharray]');
  var arcLen = arc ? arc.getTotalLength() : 0;
  var boil = $('stBoilNoise');

  function show(name) {
    for (var k in scenes) scenes[k].style.display = (k === name) ? '' : 'none';
  }
  function setCard(r) {
    $('stCardSmall').textContent = r.small || '';
    $('stCardL1').textContent = r.l1 || '';
    $('stCardL2').textContent = r.l2 || '';
    var oneLine = !r.l2;
    $('stCardL1').setAttribute('y', oneLine ? (r.small ? 520 : 490) : 460);
  }
  var ease = function (x) { return 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 3); };
  var pop = function (el, t0, t) {   // cartoon pop: 0 -> 1.25 -> 1
    if (t < t0) { el.setAttribute('opacity', 0); return; }
    var k = (t - t0) / 0.35, s = k < 1 ? 1.25 * ease(k) : 1;
    var b = el.getBBox(), cx = b.x + b.width / 2, cy = b.y + b.height / 2;
    el.setAttribute('opacity', 1);
    el.setAttribute('transform', 'translate(' + cx + ' ' + cy + ') scale(' + s + ') translate(' + (-cx) + ' ' + (-cy) + ')');
  };

  /* ----- per-scene drawing, t in seconds since the scene started ----- */
  function drawLeader(t) {
    var n = Math.max(1, 3 - Math.floor(t)), a = (t % 1) * 2 * Math.PI;
    count.textContent = n;
    var x = 800 + 400 * Math.sin(a), y = 450 - 400 * Math.cos(a);
    sweep.setAttribute('d', 'M800 450 L800 50 A400 400 0 ' + (a > Math.PI ? 1 : 0) + ' 1 ' + x.toFixed(1) + ' ' + y.toFixed(1) + ' Z');
  }
  function drawTown(t, frame) {
    var k = ease(t / 3.2), x = -200 + k * 1100, moving = t < 3.2;
    car.setAttribute('transform', 'translate(' + x.toFixed(1) + ' 735)');
    carBob.setAttribute('transform', moving && frame % 2 ? 'translate(0 -7) scale(1.02 .97)' : '');
    for (var i = 0; i < wheels.length; i++) {
      var base = wheels[i].getAttribute('data-base') || wheels[i].getAttribute('transform');
      wheels[i].setAttribute('data-base', base);
      wheels[i].setAttribute('transform', base + ' rotate(' + (x * 1.4).toFixed(0) + ')');
    }
    puff.setAttribute('opacity', moving && frame % 3 === 0 ? 1 : 0);
    $('stRays').setAttribute('transform', 'rotate(' + (t * 18).toFixed(0) + ')');
    $('stCloud').setAttribute('transform', 'translate(' + (t * 14).toFixed(0) + ' 0)');
    $('stWin').setAttribute('fill', t > 3.6 ? '#f6c453' : '#fbf4e4');
    $('stWin2').setAttribute('fill', t > 3.9 ? '#f6c453' : '#fbf4e4');
    var sm = $('stSmoke');
    sm.setAttribute('opacity', t > 4.1 ? 1 : 0);
    sm.setAttribute('transform', 'translate(0 ' + (t > 4.1 ? -((t - 4.1) * 18).toFixed(0) : 0) + ')');
    pop($('stHeart1'), 4.7, t);
  }
  function drawInside(t, frame) {
    $('stKettle').setAttribute('transform', 'translate(210 -10) rotate(' + (frame % 2 ? 2.5 : -2.5) + ')');
    var steam = $('stSteam').children;
    for (var i = 0; i < steam.length; i++) steam[i].setAttribute('stroke-dashoffset', (180 - ((t * 140 + i * 60) % 180)).toFixed(0));
    ['stL1', 'stL2', 'stL3'].forEach(function (id, n) {
      var line = $(id), t0 = 1.0 + n * 1.0, on = t >= t0;
      line.querySelector('text').setAttribute('opacity', on ? 1 : 0);
      var st = line.querySelector('.st-stamp'), base = st.getAttribute('data-base') || st.getAttribute('transform');
      st.setAttribute('data-base', base);
      var k = on ? Math.min((t - t0) / 0.25, 1) : 0;
      st.setAttribute('opacity', on ? 1 : 0);
      st.setAttribute('transform', base + ' scale(' + (1.8 - 0.8 * k).toFixed(2) + ') rotate(' + (-14 + 14 * k).toFixed(0) + ')');
    });
    pop($('stHeart2'), 4.0, t);
  }
  function drawLetter(t, frame) {
    var env = $('stEnvelope'), k = ease((t - 0.4) / 2.8);
    if (arcLen) {
      var p = arc.getPointAtLength(k * arcLen), q = arc.getPointAtLength(Math.min(arcLen, k * arcLen + 2));
      var ang = Math.atan2(q.y - p.y, q.x - p.x) * 180 / Math.PI;
      env.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ') rotate(' + (ang * 0.35 + (frame % 2 ? 4 : -4)).toFixed(1) + ')');
    }
    $('stFlag').setAttribute('transform', 'translate(50 -130) rotate(' + (t > 3.3 ? 0 : 90) + ')');
    pop($('stHeart3'), 3.6, t);
  }
  var draw = { leader: drawLeader, town: drawTown, inside: drawInside, letter: drawLetter, card: function () {} };

  /* ----- poster frame: the finished town scene ----- */
  function poster() {
    show('town');
    irisC.setAttribute('r', 1000);
    drawTown(6, 0);
    $('stSmoke').setAttribute('transform', 'translate(0 -10)');
    svg.style.transform = '';
  }

  /* ----- the projector ----- */
  var t = 0, playing = false, userPaused = false, finished = false, raf = 0, last = 0, lastFrame = -1, seen = false, curIdx = -1;
  function render() {
    var frame = Math.floor(t * FPS), tq = frame / FPS, acc = 0;
    if (frame === lastFrame) return;
    lastFrame = frame;
    for (var i = 0; i < reel.length; i++) {
      var r = reel[i];
      if (tq < acc + r.d) {
        var st = tq - acc;
        if (i !== curIdx) {
          curIdx = i; show(r.s);
          if (r.s === 'card') setCard(r);
          cap.textContent = r.cap;
        }
        draw[r.s](st, frame);
        var rr = 1000;
        if (r.iris) rr = Math.min(1000, (st / 0.5) * 1000, ((r.d - st) / 0.5) * 1000);
        irisC.setAttribute('r', Math.max(0, rr).toFixed(0));
        // the old-film feel: gate weave, flicker and boiling lines
        svg.style.transform = 'translate(' + ((frame * 7) % 3 - 1) + 'px,' + ((frame * 5) % 3 - 1) + 'px)';
        svg.style.opacity = frame % 7 === 0 ? 0.94 : 1;
        if (boil && !small && frame % 2 === 0) boil.setAttribute('seed', (frame / 2) % 6 + 1);
        return;
      }
      acc += r.d;
    }
  }
  function loop(now) {
    if (!playing) return;
    t += Math.min((now - last) / 1000, 0.1); last = now;
    if (t >= total) { finish(); return; }
    render();
    raf = requestAnimationFrame(loop);
  }
  function play() {
    if (finished) { t = 0; finished = false; lastFrame = -1; curIdx = -1; endCard.hidden = true; }
    playing = true; userPaused = false; root.classList.add('is-playing');
    btn.textContent = 'Pause';
    last = performance.now(); raf = requestAnimationFrame(loop);
  }
  function pause(byUser) {
    playing = false; cancelAnimationFrame(raf); root.classList.remove('is-playing');
    if (byUser) userPaused = true;
    btn.textContent = finished ? 'Replay' : 'Play';
  }
  function finish() {
    finished = true; pause(false); poster();
    endCard.hidden = false;
    cap.textContent = 'Care that feels like family.';
    btn.textContent = 'Replay';
  }

  // For checking frames by hand: root.__seek(seconds) draws that moment.
  root.__seek = function (sec) { pause(false); t = sec; lastFrame = -1; curIdx = -1; endCard.hidden = true; render(); };

  btn.addEventListener('click', function () { playing ? pause(true) : play(); });

  if (!small && boil) root.querySelectorAll('.st-boil').forEach(function (g) { g.setAttribute('filter', 'url(#stBoil)'); });
  poster();
  if (reduce) { endCard.hidden = false; btn.textContent = 'Play'; return; }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (e) {
      var vis = e[0].isIntersecting;
      if (vis && !seen) { seen = true; play(); }
      else if (vis && !playing && !userPaused && !finished && seen) play();
      else if (!vis && playing) pause(false);
    }, { threshold: 0.5 }).observe(root);
  }
})();
