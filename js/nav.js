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
