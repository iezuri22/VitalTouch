/* Vita on the website (2026-10-12). Owner: "Vita should be floating saying
 * get care now or asking a question at all times. But not in an annoying way."
 *
 * The same heart character as the client portal guide. Rules that keep her
 * from being annoying:
 * - She sits small in the corner on every page. One short line appears beside
 *   her once, after a few seconds, and then stays still: no bouncing, no
 *   blinking, no sounds, no rotating messages.
 * - Tapping x hides the line for the rest of the visit; Vita herself stays.
 * - She never opens herself. Tapping her opens a small card: Get care started,
 *   plus a few common questions answered in place.
 * - Hidden where she'd get in the way: the Get care started form, the careers
 *   form, referral and incident forms.
 */
(function () {
  'use strict';
  if (/start|consult|care-now|apply|refer|incident|sms-consent|privacy|terms/.test(location.pathname)) return;
  var root = (document.querySelector('link[href*="css/vt.css"]') || { getAttribute: function () { return ''; } })
    .getAttribute('href').split('css/vt.css')[0] || '';
  var ss = {
    get: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var done = (function () { try { return !!localStorage.getItem('vt_lead_done'); } catch (e) { return false; } })();
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var p = location.pathname;
  var from = (p.replace(/^\//, '').replace(/\.html$/, '') || 'home').replace(/\//g, '-');
  var startHref = root + 'start.html?from=vita-' + from;

  var line = done ? 'Questions? I&rsquo;m right here.'
    : /paying|pricing|care-plans/.test(p) ? 'Not sure what you&rsquo;re covered for? Ask me.'
    : /home-care-/.test(p) ? 'Need help at home nearby? Let&rsquo;s get care started.'
    : /disability/.test(p) ? 'Want help at home, your way? Let&rsquo;s talk.'
    : /changes/.test(p) ? 'Worried about the changes? I can help.'
    : 'Need help at home? Let&rsquo;s get care started.';

  var QA = [
    ['What does it cost?', 'It depends on the hours you need. We give you a price after a free home visit, and check what your coverage might pay.', 'paying-for-care.html', 'Ways to pay'],
    ['Does Medicare or insurance pay?', 'Original Medicare doesn&rsquo;t pay for daily help at home, but some Medicare Advantage plans, long-term care insurance and VA benefits can. We check yours for free.', 'paying-for-care.html', 'Check my coverage'],
    ['How fast can care start?', 'Often within days. It starts with a free home visit to see what would help.', null, null],
    ['Can family be the caregiver?', 'Often, yes. If they qualify, we hire, train and pay someone you already trust.', 'services.html#family-caregivers', 'How it works'],
    ['Do you serve my area?', 'We serve the Chicagoland area: the city and suburbs north, west and south.', 'service-areas.html', 'See all areas']
  ];

  var HEART = '<svg viewBox="0 0 64 64" aria-hidden="true" class="vita__svg">' +
    '<g class="vita__arm"><path d="M50 34 Q60 28 59 18" stroke="#1b9b8c" stroke-width="5.5" stroke-linecap="round" fill="none"/><circle cx="59" cy="17" r="4.5" fill="#1b9b8c"/></g>' +
    '<path d="M14 36 Q8 42 10 48" stroke="#1b9b8c" stroke-width="5.5" stroke-linecap="round" fill="none"/>' +
    '<path d="M32 56C30.5 56 13 44.5 9.5 31.5 7 22 12.5 13.5 21 13.5c5 0 9 3 11 6.5 2-3.5 6-6.5 11-6.5 8.5 0 14 8.5 11.5 18C51 44.5 33.5 56 32 56Z" fill="#1b9b8c"/>' +
    '<circle cx="25.5" cy="30" r="2.6" fill="#0b1c30"/><circle cx="38.5" cy="30" r="2.6" fill="#0b1c30"/>' +
    '<circle cx="26.4" cy="29.1" r=".9" fill="#fff"/><circle cx="39.4" cy="29.1" r=".9" fill="#fff"/>' +
    '<path d="M27 37c1.6 2.2 3.4 3.2 5 3.2s3.4-1 5-3.2" stroke="#0b1c30" stroke-width="2.2" stroke-linecap="round" fill="none"/>' +
    '<ellipse cx="20.5" cy="35" rx="2.6" ry="1.5" fill="#f8b4a0" opacity=".75"/><ellipse cx="43.5" cy="35" rx="2.6" ry="1.5" fill="#f8b4a0" opacity=".75"/></svg>';

  var wrap = document.createElement('div');
  wrap.className = 'vita';
  wrap.innerHTML =
    '<div class="vita__panel" id="vitaPanel" role="dialog" aria-label="Vita, your guide" hidden>' +
      '<div class="vita__head">' + HEART + '<div><strong>Hi, I&rsquo;m Vita.</strong><span>How can I help?</span></div>' +
        '<button type="button" class="vita__x" data-vita-close aria-label="Close">&times;</button></div>' +
      '<a class="vita__go" href="' + startHref + '">Get care started</a>' +
      '<p class="vita__sub">Or ask me something:</p>' +
      '<div class="vita__qs">' + QA.map(function (q, i) {
        return '<div class="vita__q"><button type="button" aria-expanded="false" data-q="' + i + '">' + q[0] + '</button>' +
          '<div class="vita__a" hidden><p>' + q[1] + '</p>' + (q[2] ? '<a href="' + root + q[2] + '">' + q[3] + ' &rarr;</a>' : '') + '</div></div>';
      }).join('') + '</div>' +
    '</div>' +
    '<div class="vita__line" hidden><button type="button" class="vita__line-btn">' + line + '</button>' +
      '<button type="button" class="vita__line-x" aria-label="Hide this message">&times;</button></div>' +
    '<button type="button" class="vita__btn" aria-label="Ask Vita, your guide" aria-controls="vitaPanel" aria-expanded="false">' + HEART + '</button>';
  document.body.appendChild(wrap);

  var panel = wrap.querySelector('.vita__panel'), btn = wrap.querySelector('.vita__btn'), lineEl = wrap.querySelector('.vita__line');
  function open() {
    panel.hidden = false; lineEl.hidden = true; btn.setAttribute('aria-expanded', 'true'); wrap.classList.add('is-open');
    var first = panel.querySelector('.vita__go'); if (first) first.focus();
  }
  function close() {
    panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); wrap.classList.remove('is-open');
    if (!ss.get('vt_vita_quiet')) lineEl.hidden = false;
  }
  btn.addEventListener('click', function () { panel.hidden ? open() : close(); });
  wrap.querySelector('.vita__line-btn').addEventListener('click', open);
  wrap.querySelector('.vita__line-x').addEventListener('click', function () { ss.set('vt_vita_quiet', '1'); lineEl.hidden = true; });
  wrap.querySelector('[data-vita-close]').addEventListener('click', function () { close(); btn.focus(); });
  wrap.addEventListener('click', function (e) {
    var q = e.target.closest('[data-q]'); if (!q) return;
    var a = q.nextElementSibling, openNow = a.hidden;
    a.hidden = !openNow; q.setAttribute('aria-expanded', String(openNow));
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
  document.addEventListener('click', function (e) { if (!panel.hidden && !wrap.contains(e.target)) close(); });

  // The line appears once, a few seconds in, then stays put.
  if (!ss.get('vt_vita_quiet')) {
    setTimeout(function () {
      if (!panel.hidden) return;
      lineEl.hidden = false;
      if (!reduce && !ss.get('vt_vita_waved')) { wrap.classList.add('is-waving'); ss.set('vt_vita_waved', '1'); setTimeout(function () { wrap.classList.remove('is-waving'); }, 1800); }
    }, 3500);
  }
})();
