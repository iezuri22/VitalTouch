/* Mega menu (desktop). Markup comes from _tools/menu.py via apply-shell.py.
 * Click or hover opens a tab's panel; Escape, outside click or leaving the
 * header closes it. One panel at a time. The header gets .mm-open while a
 * panel is showing so the transparent homepage header turns solid.
 */
(function () {
  'use strict';
  var header = document.querySelector('.header');
  var triggers = Array.prototype.slice.call(document.querySelectorAll('.mm-trigger'));
  if (!header || !triggers.length) return;
  var canHover = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var openBtn = null, closeTimer = null, openTimer = null;

  function panelOf(btn) { return document.getElementById(btn.getAttribute('aria-controls')); }
  function close(btn, restoreFocus) {
    if (!btn) return;
    btn.setAttribute('aria-expanded', 'false');
    var p = panelOf(btn); if (p) p.hidden = true;
    if (openBtn === btn) openBtn = null;
    if (!openBtn) header.classList.remove('mm-open');
    if (restoreFocus) btn.focus();
  }
  function open(btn) {
    if (openBtn && openBtn !== btn) close(openBtn);
    btn.setAttribute('aria-expanded', 'true');
    var p = panelOf(btn); if (p) p.hidden = false;
    openBtn = btn;
    header.classList.add('mm-open');
  }

  triggers.forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (btn.getAttribute('aria-expanded') === 'true') close(btn); else open(btn);
    });
    btn.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault(); open(btn);
        var first = panelOf(btn).querySelector('a'); if (first) first.focus();
      }
    });
    if (canHover) {
      var item = btn.closest('.mm-item');
      item.addEventListener('mouseenter', function () {
        clearTimeout(closeTimer); clearTimeout(openTimer);
        openTimer = setTimeout(function () { open(btn); }, openBtn ? 0 : 90);
      });
      item.addEventListener('mouseleave', function () {
        clearTimeout(openTimer);
        closeTimer = setTimeout(function () { close(btn); }, 160);
      });
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && openBtn) close(openBtn, true);
  });
  document.addEventListener('click', function (e) {
    if (openBtn && !e.target.closest('.mm-item')) close(openBtn);
  });
  // Leaving the panel by Tab closes it.
  document.addEventListener('focusin', function (e) {
    if (openBtn && !e.target.closest('.mm-item')) close(openBtn);
  });
})();

/* Calm lists (2026-10-12): a link to #anchor opens that item, so menu links
   like services.html#errands land on the open answer, not a closed row. */
(function () {
  function openHash() {
    var id = decodeURIComponent(location.hash.slice(1)); if (!id) return;
    var el = document.getElementById(id);
    if (el && el.tagName === 'DETAILS') { el.open = true; el.scrollIntoView({ block: 'start' }); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', openHash); else openHash();
  window.addEventListener('hashchange', openHash);
})();

/* Calm lists, desktop (2026-10-12): owner, "this looks boring". A list of
   tap-to-open items becomes a picker: the items down the left, the chosen
   one opened on the right with its photo, details and the one CTA. Phones
   keep the plain tap-to-open list. Pure enhancement: without this script the
   <details> list still works. */
(function () {
  var mq = window.matchMedia && window.matchMedia('(min-width: 1000px)');
  if (!mq) return;
  document.querySelectorAll('.cl-list').forEach(function (list) {
    var items = Array.prototype.filter.call(list.children, function (el) { return el.tagName === 'DETAILS'; });
    if (items.length < 3) return;
    list.classList.add('cl-list--pane');
    var pane = document.createElement('div');
    pane.className = 'cl-pane';
    pane.setAttribute('aria-live', 'polite');
    pane.style.gridRow = '1 / span ' + items.length;
    list.appendChild(pane);
    var cta = list.getAttribute('data-cta');
    function show(item, focusPane) {
      items.forEach(function (it) { it.classList.toggle('is-active', it === item); });
      var title = item.querySelector('.cl-t strong'), desc = item.querySelector('.cl-d'), body = item.querySelector('.cl-body');
      var photo = item.getAttribute('data-photo'), alt = item.getAttribute('data-alt') || '';
      pane.innerHTML =
        (photo ? '<img class="cl-pane__img" src="' + photo + '" alt="' + alt.replace(/"/g, '&quot;') + '">' : '') +
        '<div class="cl-pane__in"><h3>' + (title ? title.innerHTML : '') + '</h3>' +
        (desc ? '<p class="cl-pane__lead">' + desc.innerHTML + '</p>' : '') +
        (body ? '<div class="cl-pane__body">' + body.innerHTML + '</div>' : '') +
        (cta ? '<a class="vt-btn vt-btn--solid cl-pane__cta" href="' + cta + '">Get care started</a>' : '') + '</div>';
      pane.classList.remove('is-in'); void pane.offsetWidth; pane.classList.add('is-in');
    }
    items.forEach(function (it) {
      it.querySelector('summary').addEventListener('click', function (e) {
        if (!mq.matches) return;
        e.preventDefault(); show(it);
      });
    });
    var hashItem = items.filter(function (it) { return location.hash && it.id === location.hash.slice(1); })[0];
    show(hashItem || items[0]);
    window.addEventListener('hashchange', function () {
      var t = items.filter(function (it) { return it.id === location.hash.slice(1); })[0];
      if (t && mq.matches) { show(t); list.scrollIntoView({ block: 'start' }); }
    });
  });
})();
