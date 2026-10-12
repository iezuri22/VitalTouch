/* Senior help finder (2026-10-12).
   Type a zip code or a town; get the free local help for that place: township
   or city senior services, village programs, hospitals, the area agency on
   aging, caregiver support and statewide lines. Data is window.VT_HELP from
   js/help-data.js, generated with the area pages so both say the same thing.
   Deep links: help-finder.html#60443 or #matteson. */
(function () {
  var D = window.VT_HELP;
  if (!D) return;
  var form = document.getElementById('hfForm');
  var input = document.getElementById('hfQuery');
  var out = document.getElementById('hfResults');
  var note = document.getElementById('hfNote');
  if (!form || !out) return;

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim(); }

  function find(q) {
    q = String(q || '').trim();
    if (/^\d{5}$/.test(q)) return D.places.filter(function (p) { return p.zips.indexOf(q) > -1; });
    var n = norm(q);
    if (!n) return [];
    var exact = D.places.filter(function (p) { return norm(p.name) === n || norm(p.name.replace(', Chicago', '')) === n || p.slug === n.replace(/ /g, '-'); });
    if (exact.length) return exact;
    return D.places.filter(function (p) { return norm(p.name).indexOf(n) > -1; }).slice(0, 8);
  }

  function item(icon, name, text, url, phone) {
    var title = url ? '<a href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + '</a>' : esc(name);
    var tel = phone ? '<a class="hf-phone" href="tel:' + phone.replace(/\D/g, '') + '">' + esc(phone) + '</a>' : '';
    return '<li><i class="ph ' + icon + '" aria-hidden="true"></i><div><strong>' + title + '</strong><span>' + esc(text) + '</span>' + tel + '</div></li>';
  }
  function group(title, items, lead) {
    return items.length ? '<section class="hf-group"><h3>' + title + '</h3>' + (lead ? '<p class="hf-lead">' + lead + '</p>' : '') + '<ul class="hf-list">' + items.join('') + '</ul></section>' : '';
  }

  var GUIDES = [
    ['guide-long-term-care-insurance.html', 'Long-term care insurance'],
    ['guide-va-benefits.html', 'VA benefits'],
    ['guide-medicare-and-paying-on-your-own.html', 'Medicare, and paying on your own'],
    ['guide-paid-family-caregiver.html', 'Getting paid to care for family'],
    ['guide-illinois-medicaid-home-care.html', 'Medicaid for seniors'],
    ['guide-home-services-program.html', 'Home Services Program']
  ];

  function render(p) {
    var local = p.help.map(function (h) { return item(/rides|bus|transport|wheels/i.test(h.text + h.name) ? 'ph-van' : 'ph-users-three', h.name, h.text, h.url); });
    var hosp = p.hospitals.map(function (h) { return item('ph-first-aid', h, ''); });
    var aaa = [item('ph-hand-heart', p.aaa.name, p.aaa.text, p.aaa.url)];
    if (p.will) aaa.push(item('ph-hand-heart', D.agequide.name, D.agequide.text, D.agequide.url));
    var cg = [item('ph-heart', D.caregiver.name, D.caregiver.text, D.caregiver.url, D.caregiver.phone),
              item('ph-medal', D.statewide[3].name, D.statewide[3].text, D.statewide[3].url, D.statewide[3].phone)];
    var state = D.statewide.slice(0, 3).map(function (s) { return item('ph-phone', s.name, s.text, s.url, s.phone); });
    var q = encodeURIComponent((p.kind === 'chicago' ? p.name.replace(', Chicago', '') + ', Chicago' : p.name) + ', IL');
    var zips = p.zips.length ? p.zips.join(', ') : '';
    var page = p.slug === 'chicago' ? 'home-care-chicago.html' : 'home-care-' + p.slug + '.html';
    out.innerHTML =
      '<div class="hf-head"><div><p class="hf-kicker">Free help near</p><h2>' + esc(p.name) + '</h2>' +
        (p.fact ? '<p class="hf-fact">' + esc(p.fact) + '</p>' : '') + '</div>' +
        '<div class="hf-actions"><button type="button" class="vt-btn vt-btn--ghost" id="hfPrint"><i class="ph ph-printer" aria-hidden="true"></i>Print this list</button>' +
        '<button type="button" class="vt-btn vt-btn--ghost" id="hfCopy"><i class="ph ph-link" aria-hidden="true"></i>Copy link</button></div></div>' +
      '<div class="hf-grid"><div class="hf-main">' +
        group('Rides, meals and senior services', local) +
        group('Hospitals nearby', hosp, 'Coming home from one of these? Ask the discharge planner about help at home before the day you leave.') +
        group('Free help finding services', aaa) +
        group('Support for family caregivers', cg) +
        group('Statewide helplines', state) +
        '<section class="hf-group hf-pay"><h3>Paying for care</h3><ul class="hf-guides">' +
          GUIDES.map(function (g) { return '<li><a href="' + g[0] + '">' + g[1] + '<i class="ph ph-arrow-right" aria-hidden="true"></i></a></li>'; }).join('') +
        '</ul></section>' +
      '</div><aside class="hf-side">' +
        '<figure class="hf-map"><iframe src="https://maps.google.com/maps?q=' + q + '&z=' + (p.kind === 'hub' ? 10 : p.kind === 'chicago' ? 13 : 12) + '&output=embed" title="Map of ' + esc(p.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
          '<figcaption><strong><i class="ph ph-map-pin" aria-hidden="true"></i>' + esc(p.name) + '</strong><span>' + esc(zips) + '</span></figcaption></figure>' +
        '<div class="hf-care"><h3>Need someone at home?</h3><p>If the help above isn&rsquo;t enough, a caregiver can come to the house for a few hours a week or every day.</p>' +
          '<a class="vt-btn vt-btn--solid" href="start.html?from=help-finder-' + esc(p.slug) + '">Get care started</a>' +
          '<a class="hf-more" href="' + page + '">Home care in ' + esc(p.name.replace(', Chicago', '')) + ' <i class="ph ph-arrow-right" aria-hidden="true"></i></a></div>' +
      '</aside></div>' +
      '<p class="hf-src">Checked against each organization&rsquo;s own website, October 2026. Programs change, so call ahead. These organizations are not part of VitalTouch.</p>';
    document.getElementById('hfPrint').onclick = function () { window.print(); };
    document.getElementById('hfCopy').onclick = function () {
      var b = this, url = location.href.split('#')[0] + '#' + (p.zips[0] || p.slug);
      var done = function () { b.innerHTML = '<i class="ph ph-check" aria-hidden="true"></i>Link copied'; };
      if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt('Copy this link', url); }); else prompt('Copy this link', url);
    };
    document.body.classList.add('hf-has-result');
  }

  function choose(list, q) {
    note.innerHTML = 'More than one area matches ' + esc(q) + '. Which one?<span class="hf-choices">' +
      list.map(function (p) { return '<button type="button" class="vt-chip" data-slug="' + p.slug + '">' + esc(p.name) + '</button>'; }).join('') + '</span>';
    note.hidden = false;
    note.querySelectorAll('button').forEach(function (b) {
      b.onclick = function () { go(b.getAttribute('data-slug'), true); };
    });
  }

  function go(q, push) {
    var list = find(q);
    note.hidden = true;
    if (list.length === 1) {
      render(list[0]);
      if (push) history.replaceState(null, '', '#' + (/^\d{5}$/.test(q) ? q : list[0].slug));
      out.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (list.length > 1) {
      choose(list, q);
    } else {
      note.innerHTML = /^\d{5}$/.test(String(q).trim())
        ? 'We don&rsquo;t have local listings for ' + esc(q) + ' yet. The statewide lines below work anywhere in Illinois.'
        : 'No town matches &ldquo;' + esc(q) + '&rdquo;. Try a zip code.';
      note.hidden = false;
    }
  }

  form.addEventListener('submit', function (e) { e.preventDefault(); go(input.value, true); });
  document.querySelectorAll('[data-hf-try]').forEach(function (b) {
    b.addEventListener('click', function () { input.value = b.getAttribute('data-hf-try'); go(input.value, true); });
  });
  function fromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (h) { input.value = /^\d{5}$/.test(h) ? h : ''; go(h, false); }
  }
  fromHash();
  window.addEventListener('hashchange', fromHash);
})();
