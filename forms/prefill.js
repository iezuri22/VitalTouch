/**
 * VitalTouch Form Pre-Fill v1.0
 * Reads URL parameters passed by the CRM and pre-fills form fields.
 *
 * When the CRM opens a form via flow link, it passes client data as URL params:
 *   ?flowId=CLIENT-XXX&firstName=Wayne&lastName=Lacey&phone=...&address=...
 *
 * This script auto-fills matching form fields on page load.
 * Fields are matched by: id, name, or data-prefill attribute.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);

    // Skip if no pre-fill params
    if (!params.has('flowId')) return;

    // Map of URL param names → possible field IDs/names to try
    var fieldMap = {
      'firstName':        ['firstName', 'clientFirstName', 'first_name', 'fname'],
      'lastName':         ['lastName', 'clientLastName', 'last_name', 'lname'],
      'phone':            ['phone', 'clientPhone', 'phoneNumber'],
      'email':            ['email', 'clientEmail'],
      'address':          ['address', 'streetAddress', 'clientAddress'],
      'city':             ['city', 'clientCity'],
      'state':            ['state', 'clientState'],
      'zip':              ['zip', 'zipCode', 'clientZip'],
      'dob':              ['dob', 'dateOfBirth', 'birthDate'],
      'medicaidNumber':   ['medicaidNumber', 'medicaid', 'medicaidId'],
      'primaryPayer':     ['primaryPayer', 'payer', 'payerSource'],
      'language':         ['language', 'preferredLanguage'],
      'caseManagerName':  ['caseManagerName', 'caseManager'],
      'caseManagerPhone': ['caseManagerPhone']
    };

    var filledCount = 0;

    Object.keys(fieldMap).forEach(function (paramKey) {
      var value = params.get(paramKey);
      if (!value) return;

      var filled = false;
      var candidates = fieldMap[paramKey];

      for (var i = 0; i < candidates.length; i++) {
        // Try by ID
        var el = document.getElementById(candidates[i]);
        if (el) {
          _fillField(el, value);
          filled = true;
          break;
        }

        // Try by name
        var byName = document.querySelector('[name="' + candidates[i] + '"]');
        if (byName) {
          _fillField(byName, value);
          filled = true;
          break;
        }

        // Try by data-prefill attribute
        var byAttr = document.querySelector('[data-prefill="' + candidates[i] + '"]');
        if (byAttr) {
          _fillField(byAttr, value);
          filled = true;
          break;
        }
      }

      if (filled) filledCount++;
    });

    // Also handle radio buttons and select menus for special fields
    _fillRadio('gender', params.get('gender'));
    _fillRadio('language', params.get('language'));
    _fillRadio('payer', params.get('primaryPayer'));

    if (filledCount > 0) {
      console.log('VTPrefill: Pre-filled ' + filledCount + ' fields from CRM');

      // Show a subtle notice that fields were pre-filled
      var notice = document.createElement('div');
      notice.style.cssText = 'position:fixed;top:80px;right:20px;background:#DCFCE7;color:#166534;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600;z-index:1000;box-shadow:0 2px 8px rgba(0,0,0,0.1);font-family:Inter,sans-serif;';
      notice.textContent = filledCount + ' field' + (filledCount > 1 ? 's' : '') + ' pre-filled from CRM';
      document.body.appendChild(notice);
      setTimeout(function () {
        notice.style.transition = 'opacity 0.5s';
        notice.style.opacity = '0';
        setTimeout(function () { notice.remove(); }, 500);
      }, 3000);
    }
  });

  function _fillField(el, value) {
    if (el.tagName === 'SELECT') {
      // Try to find matching option
      for (var i = 0; i < el.options.length; i++) {
        if (el.options[i].value === value || el.options[i].text === value) {
          el.selectedIndex = i;
          break;
        }
      }
    } else if (el.type === 'checkbox') {
      el.checked = value === 'true' || value === '1' || value === el.value;
    } else {
      el.value = value;
    }

    // Trigger change event for any listeners
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function _fillRadio(name, value) {
    if (!value) return;
    var radios = document.querySelectorAll('input[name="' + name + '"]');
    radios.forEach(function (r) {
      if (r.value === value || r.value.toLowerCase() === value.toLowerCase()) {
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
})();
