/* VitalTouch engagement layer (2026-10-12).
 *
 * Owner's brief: lots of small, useful actions everywhere that get a phone
 * number and location, but "if they do it once don't keep bombarding them".
 *
 * Rules this file enforces:
 * - One quick form (phone + zip, name optional) behind every action. It posts
 *   to the ops leads API as a client_inquiry, tagged with where it came from.
 * - Done once = quiet forever: after any lead submission on this site (this
 *   form, the homepage contact form, the assessment, the consultation form)
 *   every prompt, button and nudge hides. Stored in localStorage vt_lead_done.
 * - Job seekers (careers inquiry sent, vt_jobseeker) never see care prompts.
 * - Closing a prompt snoozes the automatic nudge for 7 days.
 * - No floating button and no automatic pop-up (removed 2026-10-12: overlays
 *   read as unprofessional). Every prompt is in the page.
 * - Text-message consent is an unticked, optional box (not a condition of
 *   care), versioned engage_v1_2026-10.
 */
(function () {
  'use strict';
  var API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api/public/leads'
    : 'https://vitaltouch-ops.vercel.app/api/public/leads';
  var CONSENT_VERSION = 'engage_v1_2026-10';
  var WEEK = 7 * 24 * 3600 * 1000;
  var root = (document.querySelector('link[href*="css/vt.css"]') || {}).getAttribute
    ? document.querySelector('link[href*="css/vt.css"]').getAttribute('href').split('css/vt.css')[0] : '';

  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    sget: function (k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    sset: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
  };
  var isDone = function () {
    return !!(store.get('vt_lead_done') || store.get('vt_jobseeker') || store.get('vt_cra_report') || store.get('vt_email'));
  };
  var isSnoozed = function () { var t = Number(store.get('vt_lead_snooze') || 0); return t && Date.now() - t < WEEK; };
  var noNudgePage = /consult|assessment|care-now|apply|refer|incident|contact|privacy|terms|sms-consent/.test(location.pathname);

  function markDone() {
    store.set('vt_lead_done', String(Date.now()));
    document.documentElement.classList.add('vt-engaged');
    if (fab) fab.hidden = true;
  }
  window.vtMarkLeadDone = markDone;
  if (isDone()) document.documentElement.classList.add('vt-engaged');

  /* ---------- the sheet ---------- */
  var sheet, lastFocus, ctx = {};
  function build() {
    sheet = document.createElement('div');
    sheet.className = 'eg-wrap';
    sheet.hidden = true;
    sheet.innerHTML =
      '<div class="eg-scrim" data-eg-close></div>' +
      '<div class="eg-sheet" role="dialog" aria-modal="true" aria-labelledby="egTitle">' +
        '<button class="eg-x" type="button" data-eg-close aria-label="Close"><i class="ph ph-x" aria-hidden="true"></i></button>' +
        '<div class="eg-body">' +
          '<p class="eg-kicker"><i class="ph ph-lightning" aria-hidden="true"></i><span id="egKicker">Free, no obligation</span></p>' +
          '<h2 id="egTitle">Get a free care quote</h2>' +
          '<p class="eg-sub" id="egSub">Leave your number. A local person calls you, usually the same day.</p>' +
          '<form class="eg-form" id="egForm" novalidate>' +
            '<input type="text" name="company_website" tabindex="-1" autocomplete="off" class="eg-hp" aria-hidden="true">' +
            '<div class="eg-row">' +
              '<label>Phone<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="(708) 555-0100"></label>' +
              '<label>Zip code<input name="zip" type="text" inputmode="numeric" maxlength="5" autocomplete="postal-code" required placeholder="60443"></label>' +
            '</div>' +
            '<label>Email<input name="email" type="email" autocomplete="email" inputmode="email" required></label>' +
            '<label>Your name <span class="eg-opt">(optional)</span><input name="name" type="text" autocomplete="name"></label>' +
            '<label class="eg-consent"><input type="checkbox" name="consent"><span>Text me too. I agree VitalTouch Health Network, Inc. may call or text me about home care, including automated messages. Message and data rates may apply. Reply STOP to opt out. Not required to get care. <a href="' + root + 'privacy-policy.html">Privacy</a></span></label>' +
            '<button type="submit" class="eg-submit">Call me back</button>' +
            '<p class="eg-err" id="egErr" role="alert"></p>' +
          '</form>' +
          '<div class="eg-done" id="egDone" hidden>' +
            '<i class="ph ph-check-circle" aria-hidden="true"></i>' +
            '<h2 tabindex="-1" id="egDoneTitle">You&rsquo;re all set</h2>' +
            '<p>We&rsquo;ll call you, usually the same business day. Need us sooner? <a href="tel:7087264536">(708) 726-4536</a></p>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(sheet);
    sheet.addEventListener('click', function (e) { if (e.target.closest('[data-eg-close]')) close(true); });
    sheet.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close(true);
      if (e.key === 'Tab') { // keep focus inside
        var f = sheet.querySelectorAll('button, input, a[href]');
        var vis = Array.prototype.filter.call(f, function (el) { return el.offsetParent !== null; });
        if (!vis.length) return;
        var first = vis[0], last = vis[vis.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    sheet.querySelector('#egForm').addEventListener('submit', submit);
  }

  function open(opts) {
    opts = opts || {};
    if (!sheet) build();
    ctx = opts;
    sheet.querySelector('#egTitle').textContent = opts.title || 'Get a free care quote';
    sheet.querySelector('#egSub').textContent = opts.sub || 'Leave your number. A local person calls you, usually the same day.';
    sheet.querySelector('#egKicker').textContent = opts.kicker || 'Free, no obligation';
    sheet.querySelector('.eg-submit').textContent = opts.button || 'Call me back';
    var f = sheet.querySelector('#egForm');
    f.hidden = false; sheet.querySelector('#egDone').hidden = true;
    sheet.querySelector('#egErr').textContent = '';
    var savedZip = store.get('vt_zip');
    if (opts.zip || savedZip) f.zip.value = opts.zip || savedZip;
    lastFocus = document.activeElement;
    sheet.hidden = false;
    document.documentElement.classList.add('eg-open');
    setTimeout(function () { (f.phone.value ? f.zip : f.phone).focus(); }, 60);
  }
  function close(snooze) {
    if (!sheet || sheet.hidden) return;
    sheet.hidden = true;
    document.documentElement.classList.remove('eg-open');
    if (snooze && !isDone()) store.set('vt_lead_snooze', String(Date.now()));
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.vtEngage = { open: open, close: close, done: isDone };

  function submit(e) {
    e.preventDefault();
    var f = e.target, err = sheet.querySelector('#egErr');
    var phone = (f.phone.value || '').trim();
    var zip = (f.zip.value || '').replace(/\D/g, '').slice(0, 5);
    var digits = phone.replace(/\D/g, '');
    if (digits.length < 10) { err.textContent = 'Enter a 10-digit phone number.'; f.phone.focus(); return; }
    if (zip.length !== 5) { err.textContent = 'Enter a 5-digit zip code.'; f.zip.focus(); return; }
    var email = (f.email.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { err.textContent = 'Enter a valid email.'; f.email.focus(); return; }
    err.textContent = '';
    var btn = f.querySelector('.eg-submit'); btn.disabled = true; btn.textContent = 'Sending…';
    var consent = !!f.consent.checked;
    var body = {
      leadType: 'client_inquiry',
      name: (f.name.value || '').trim() || 'Website visitor',
      phone: phone, email: email, zip: zip,
      message: 'Call-back request from the website' + (ctx.msg ? ': ' + ctx.msg : '') + '.',
      consent: consent,
      consentTextVersion: consent ? CONSENT_VERSION : undefined,
      company_website: f.company_website.value || '',
      utm: { page: location.pathname.replace(/^\//, '') || 'index', from: ctx.source || 'engage' }
    };
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { if (!r.ok) throw new Error('bad'); return r.json().catch(function () { return {}; }); })
      .then(function () {
        store.set('vt_zip', zip);
        markDone();
        f.hidden = true;
        var d = sheet.querySelector('#egDone'); d.hidden = false;
        sheet.querySelector('#egDoneTitle').focus();
      })
      .catch(function () {
        btn.disabled = false; btn.textContent = ctx.button || 'Call me back';
        err.innerHTML = 'That didn’t go through. Please call <a href="tel:7087264536">(708) 726-4536</a>.';
      });
  }

  /* ---------- any [data-engage] control opens the sheet ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-engage]');
    if (!t) return;
    e.preventDefault();
    open({
      title: t.getAttribute('data-title'), sub: t.getAttribute('data-sub'), kicker: t.getAttribute('data-kicker'),
      button: t.getAttribute('data-button'), source: t.getAttribute('data-engage'),
      zip: t.getAttribute('data-zip'), msg: t.getAttribute('data-msg')
    });
  });

  /* ---------- inline forms (e.g. "tell us your plan" on Ways to Pay) ----------
     No floating button and no pop-up nudge: the owner asked for no overlays
     (2026-10-12). Prompts live in the page, where the reader put them. */
  var fab = null;
  document.addEventListener('submit', function (e) {
    var f = e.target.closest && e.target.closest('form[data-engage-form]');
    if (!f) return;
    e.preventDefault();
    var err = f.querySelector('.pf-form__err');
    var say = function (m) { if (err) err.innerHTML = m; };
    var plan = f.plan ? (f.plan.value || '').trim() : '';
    var phone = (f.phone.value || '').trim();
    var zip = (f.zip.value || '').replace(/\D/g, '').slice(0, 5);
    if (f.plan && f.plan.required && !plan) { say('Enter the name on the card or policy.'); f.plan.focus(); return; }
    var email = f.email ? (f.email.value || '').trim() : '';
    if (phone.replace(/\D/g, '').length < 10) { say('Enter a 10-digit phone number.'); f.phone.focus(); return; }
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { say('Enter a valid email.'); f.email.focus(); return; }
    if (zip.length !== 5) { say('Enter a 5-digit zip code.'); f.zip.focus(); return; }
    say('');
    var btn = f.querySelector('button[type=submit]'); var label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Sending…';
    var what = f.getAttribute('data-engage-form');
    fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      leadType: 'client_inquiry', name: 'Website visitor', phone: phone, email: email || undefined, zip: zip,
      message: 'Coverage check (' + what.replace(/^coverage-/, '').replace(/-/g, ' ') + ')' + (plan ? ': ' + plan : '') + '.',
      consent: false, company_website: f.company_website ? f.company_website.value : '',
      utm: { page: location.pathname.replace(/^\//, '') || 'index', from: what }
    }) })
      .then(function (r) { if (!r.ok) throw new Error('bad'); })
      .then(function () {
        store.set('vt_zip', zip); markDone();
        var ok = document.createElement('p'); ok.className = 'pf-form__ok'; ok.tabIndex = -1;
        ok.innerHTML = '<i class="ph ph-check-circle" aria-hidden="true"></i>Thanks. We&rsquo;ll check' + (plan ? ' ' + plan.replace(/[<>&"]/g, '') : ' your coverage') + ' and call you, usually the same business day.';
        f.replaceWith(ok); ok.focus();
      })
      .catch(function () { btn.disabled = false; btn.textContent = label; say('That didn&rsquo;t go through. Please call <a href="tel:7087264536">(708) 726-4536</a>.'); });
  });

  /* ---------- other forms on the site count as "done" ---------- */
  var heroStatus = document.getElementById('heroFormStatus');
  if (heroStatus && 'MutationObserver' in window) {
    new MutationObserver(function () { if (heroStatus.classList.contains('ok')) markDone(); })
      .observe(heroStatus, { attributes: true, attributeFilter: ['class'] });
  }
})();
