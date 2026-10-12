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
