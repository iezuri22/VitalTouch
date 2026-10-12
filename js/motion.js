/* VitalTouch motion layer (2026-10). Loaded on every page after main.js.
 *
 * Rules it keeps:
 * - Content is visible at rest. Only blocks that start BELOW the first screen
 *   are hidden for a reveal, so a thumbnail, a crawler or a slow script never
 *   sees an empty page.
 * - No scroll listeners: IntersectionObserver only.
 * - prefers-reduced-motion turns all of it off (the CSS gates the transitions,
 *   and the slideshow stays on its first photo).
 */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasIO = 'IntersectionObserver' in window;

  /* Header gets a hairline once the page moves. A 1px sentinel at the top of
     the body tells us when that happens. */
  var header = document.querySelector('.header');
  if (header && hasIO) {
    var sentinel = document.createElement('div');
    sentinel.setAttribute('aria-hidden', 'true');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none;';
    document.body.prepend(sentinel);
    new IntersectionObserver(function (e) {
      header.classList.toggle('is-scrolled', !e[0].isIntersecting);
    }).observe(sentinel);
  }

  /* Hero slideshow: slow push-in on each photo, crossfade every 6.5s. */
  var hero = document.querySelector('[data-slideshow]');
  if (hero) {
    var slides = hero.querySelectorAll('img');
    var dots = document.querySelectorAll('[data-slide-dot]');
    var i = 0, timer = null;
    var show = function (n) {
      slides[i].classList.remove('is-on');
      if (dots[i]) dots[i].setAttribute('aria-pressed', 'false');
      i = (n + slides.length) % slides.length;
      // restart the push-in animation on the incoming photo
      slides[i].style.animation = 'none'; void slides[i].offsetWidth; slides[i].style.animation = '';
      slides[i].classList.add('is-on');
      if (dots[i]) dots[i].setAttribute('aria-pressed', 'true');
    };
    var start = function () { if (!reduce && slides.length > 1 && !timer) timer = setInterval(function () { show(i + 1); }, 6500); };
    var stop = function () { clearInterval(timer); timer = null; };
    dots.forEach(function (d, n) { d.addEventListener('click', function () { stop(); show(n); start(); }); });
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });
    start();
  }

  if (reduce || !hasIO) return;

  /* Reveal on scroll. Explicit [data-reveal] plus the common blocks every
     page already has, so inner pages move too without markup changes. */
  var auto = '.section-header, .card, .feature-card, .faq-item, .area-section, .pay-route, .va-path, ' +
             '.car-role, .car-steps, .town-action, .vt-tile, .vt-aud, .vt-pay, .vt-step, .vt-founder > *, ' +
             '.vt-head, .vt-chart, .vt-proof__item, .vt-final__panel, [data-reveal]';
  var vh = window.innerHeight || 800;
  var targets = Array.prototype.filter.call(document.querySelectorAll(auto), function (el) {
    return el.getBoundingClientRect().top > vh * 0.92 && !el.closest('.mobile-nav');
  });
  // stagger siblings that share a parent
  var seen = new Map();
  targets.forEach(function (el) {
    var p = el.parentElement, n = seen.get(p) || 0;
    seen.set(p, n + 1);
    el.style.setProperty('--reveal-delay', Math.min(n, 5) * 70 + 'ms');
    el.classList.add('js-reveal');
  });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  targets.forEach(function (el) { io.observe(el); });

  /* Bar charts grow when they come into view. */
  document.querySelectorAll('.vt-chart').forEach(function (chart) {
    if (chart.getBoundingClientRect().top < vh) return;
    chart.classList.add('is-pending');
    var co = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) { chart.classList.remove('is-pending'); co.disconnect(); }
    }, { threshold: 0.35 });
    co.observe(chart);
  });

  /* Timeline line draws down as each step is reached. */
  document.querySelectorAll('.vt-steps').forEach(function (list) {
    var fill = list.querySelector('.vt-steps__fill');
    var steps = list.querySelectorAll('.vt-step');
    if (!fill || !steps.length) return;
    var reached = 0;
    fill.style.setProperty('--fill', '0');
    fill.style.transition = 'transform 1s cubic-bezier(.16,1,.3,1)';
    var so = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var idx = Array.prototype.indexOf.call(steps, e.target) + 1;
        if (idx > reached) { reached = idx; fill.style.setProperty('--fill', String(reached / steps.length)); }
      });
    }, { rootMargin: '0px 0px -35% 0px' });
    steps.forEach(function (s) { so.observe(s); });
  });
})();
