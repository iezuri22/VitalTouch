/* Cloudflare Turnstile for the forms that post to ops: start.html and apply.html.
 *
 * The site is static, so the site key comes from ops (GET /api/public/turnstile).
 * Ops answers null until both keys are set in Vercel, and its server check is
 * off until then too, so the two switch on together and this page never needs
 * editing. Until then this file renders nothing and token() resolves ''.
 *
 * Usage: vtTurnstile.mount(slot) on load; await vtTurnstile.token(slot) before
 * posting; vtTurnstile.reset(slot) after every attempt (tokens are single-use).
 * The widget stays hidden unless Cloudflare wants someone to tick a box.
 */
(function () {
  'use strict';
  var OPS = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000'
    : 'https://vitaltouch-ops.vercel.app';
  var keyP = null;
  var apiP = null;

  function siteKey() {
    if (!keyP) {
      keyP = fetch(OPS + '/api/public/turnstile')
        .then(function (r) { return r.json(); })
        .then(function (j) { return j.siteKey || null; })
        .catch(function () { keyP = null; return null; }); // ask again on the next try
    }
    return keyP;
  }

  function api() {
    if (!apiP) {
      apiP = new Promise(function (resolve, reject) {
        window.__vtTsOnload = function () { resolve(window.turnstile); };
        var s = document.createElement('script');
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__vtTsOnload';
        s.async = true;
        s.onerror = function () { apiP = null; reject(new Error('turnstile script')); };
        document.head.appendChild(s);
      });
    }
    return apiP;
  }

  function mount(slot) {
    if (!slot) return Promise.resolve();
    if (slot._vtTs) return slot._vtTs.ready; // mounted, or still mounting
    var st = slot._vtTs = { id: null, token: '', waiters: [] };
    function settle(t) {
      st.token = t || '';
      if (st.token) { st.waiters.splice(0).forEach(function (w) { w(st.token); }); }
    }
    st.ready = siteKey().then(function (key) {
      if (!key) { slot._vtTs = null; return; }
      return api().then(function (ts) {
        st.id = ts.render(slot, {
          sitekey: key,
          appearance: 'interaction-only',
          theme: 'light',
          size: 'flexible',
          callback: settle,
          'expired-callback': function () { settle(''); },
          'error-callback': function () { settle(''); }
        });
        // Mark the slot while Cloudflare is showing something, so a hidden
        // widget can give back the gap it takes in a grid form (vt.css).
        if (window.ResizeObserver) {
          new ResizeObserver(function () {
            slot.classList.toggle('is-shown', slot.offsetHeight > 0);
          }).observe(slot);
        }
      });
    }).catch(function () { slot._vtTs = null; });
    return st.ready;
  }

  /* The current token, waiting up to `ms` for the check to finish. '' when
     Turnstile is off, or on timeout; ops then answers 403 with a message. */
  function token(slot, ms) {
    return mount(slot).then(function () {
      var st = slot && slot._vtTs;
      if (!st || st.id === null) return '';
      if (st.token) return st.token;
      return new Promise(function (resolve) {
        var done = false;
        function finish(t) { if (!done) { done = true; resolve(t || ''); } }
        st.waiters.push(finish);
        setTimeout(function () { finish(st.token); }, ms || 8000);
      });
    });
  }

  function reset(slot) {
    var st = slot && slot._vtTs;
    if (!st || st.id === null || !window.turnstile) return;
    st.token = '';
    try { window.turnstile.reset(st.id); } catch (e) {}
  }

  window.vtTurnstile = { mount: mount, token: token, reset: reset };
})();
