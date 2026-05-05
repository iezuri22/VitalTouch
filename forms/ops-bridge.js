/**
 * VitalTouch Ops Bridge
 *
 * Non-blocking sidecar that mirrors form submissions to the ops platform
 * (https://vitaltouch-ops.vercel.app). Existing form behavior (localStorage
 * save, mailto trigger, signature pad, etc.) is preserved — this just
 * fires an HTTP POST in parallel.
 *
 * Three ways to integrate (in order of preference):
 *
 *   1. Native <form data-form-id="X">
 *        Bridge auto-attaches to the submit event.
 *
 *   2. Custom submit button (no <form>) — auto-detection
 *        Bridge derives form ID from the page URL (e.g. E13_Orientation...).
 *        It listens for clicks on any of:
 *          [type=submit], .btn-submit, .submit-btn, [onclick*="submitForm"]
 *        and snapshots every input/textarea/select on the page.
 *
 *   3. Manual call from custom JS:
 *        window.VitalTouchOpsBridge.submit('E13', { submitterName, payload })
 *
 * Override form ID via:
 *   <meta name="vt-form-id" content="E13">
 *   or  <body data-form-id="E13">
 */
(function () {
  'use strict';

  const API_URL = 'https://vitaltouch-ops.vercel.app/api/public/form-submission';
  const TAG = '[VitalTouch Ops Bridge]';

  // De-dupe guard so explicit calls + auto-detection don't double-submit
  const _submitted = new Set();

  // ---------- Form ID detection ----------

  function detectFormId() {
    // 1. <meta name="vt-form-id" content="...">
    const meta = document.querySelector('meta[name="vt-form-id"]');
    if (meta && meta.getAttribute('content')) return meta.getAttribute('content');

    // 2. <body data-form-id="...">
    if (document.body && document.body.dataset.formId) return document.body.dataset.formId;

    // 3. From URL: /forms/E13_Orientation_File_Uploads.html → "E13"
    try {
      const path = window.location.pathname;
      const file = path.split('/').pop() || '';
      const match = file.match(/^([A-Z]\d+[A-Z]?)_/);
      if (match) return match[1];
    } catch (err) {
      /* ignore */
    }

    return null;
  }

  // ---------- Submitter name detection ----------

  function findSubmitterFromPayload(payload) {
    const candidates = [
      payload.fullName, payload.full_name,
      payload.candidateName, payload.candidate_name,
      payload.clientName, payload.client_name,
      payload.applicantName, payload.applicant_name,
      payload.empName, payload.emp_name,
      payload.employeeName, payload.employee_name,
      payload.name,
    ];
    for (const c of candidates) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
    const first = payload.firstName || payload.first_name || payload.fname;
    const last = payload.lastName || payload.last_name || payload.lname;
    if (first || last) return [first, last].filter(Boolean).join(' ').trim();
    return null;
  }

  // ---------- Payload collection ----------

  function collectFromForm(form) {
    const payload = {};
    const files = [];
    const fd = new FormData(form);
    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        if (!value.name) continue;
        files.push({ fieldName: key, file: value });
        appendField(payload, key, `[file: ${value.name} (${value.size} bytes)]`);
        continue;
      }
      const str = typeof value === 'string' ? value : String(value);
      // Detect signature data URLs in hidden form fields
      if (str.startsWith('data:image/')) {
        const blob = dataUrlToBlob(str);
        if (blob) {
          const ext = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
          files.push({
            fieldName: '__sig__' + key,
            file: new File([blob], `${key}.${ext}`, { type: blob.type }),
          });
          appendField(payload, key, '[signature provided]');
          continue;
        }
      }
      appendField(payload, key, str);
    }
    return { payload, files };
  }

  /**
   * Snapshot all input/textarea/select elements on the page. Used when there's
   * no <form> wrapper (E13 et al). Returns { payload, files }.
   */
  function collectFromPage() {
    const payload = {};
    const files = [];
    const els = document.querySelectorAll('input, textarea, select');
    els.forEach((el) => {
      const key = el.id || el.name;
      if (!key) return;
      if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') return;
      if (el.type === 'file') {
        if (el.files && el.files.length) {
          const tags = [];
          Array.from(el.files).forEach((f) => {
            files.push({ fieldName: key, file: f });
            tags.push(`[file: ${f.name} (${f.size} bytes)]`);
          });
          appendField(payload, key, tags.length === 1 ? tags[0] : tags);
        }
        return;
      }
      if (el.type === 'checkbox') {
        if (el.checked) appendField(payload, key, el.value || true);
        return;
      }
      if (el.type === 'radio') {
        if (el.checked) appendField(payload, key, el.value);
        return;
      }
      if (typeof el.value === 'string' && el.value.length) {
        // Signature pads store data URLs in hidden inputs. Convert to a Blob
        // and treat as a special "signature" file so it embeds in the PDF
        // instead of polluting the form data.
        if (el.value.startsWith('data:image/')) {
          const blob = dataUrlToBlob(el.value);
          if (blob) {
            const ext = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
            files.push({
              fieldName: '__sig__' + key,
              file: new File([blob], `${key}.${ext}`, { type: blob.type }),
            });
            appendField(payload, key, '[signature provided]');
            return;
          }
        }
        appendField(payload, key, el.value);
      }
    });
    return { payload, files };
  }

  /**
   * Convert a data: URL into a Blob. Returns null on parse failure.
   */
  function dataUrlToBlob(dataUrl) {
    try {
      const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
      if (!match) return null;
      const mime = match[1] || 'application/octet-stream';
      const isBase64 = !!match[2];
      const data = match[3];
      if (isBase64) {
        const bin = atob(data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      }
      return new Blob([decodeURIComponent(data)], { type: mime });
    } catch (err) {
      return null;
    }
  }

  function appendField(payload, key, value) {
    if (payload[key] === undefined) payload[key] = value;
    else if (Array.isArray(payload[key])) payload[key].push(value);
    else payload[key] = [payload[key], value];
  }

  // ---------- POST ----------

  function postSubmission(formId, collected, opts) {
    // Normalize input — accept either { payload, files } or just payload object
    const payload = collected && collected.payload ? collected.payload : collected || {};
    const files = (collected && collected.files) || [];

    const dedupeKey = formId + ':' + (opts && opts.dedupeKey || '');
    if (_submitted.has(dedupeKey)) {
      console.log(TAG, 'Skipping duplicate submit for', formId);
      return;
    }
    _submitted.add(dedupeKey);

    const submitterName = (opts && opts.submitterName) || findSubmitterFromPayload(payload);
    const submitterEmail =
      (opts && opts.submitterEmail) ||
      payload.email || payload.emailAddress || payload.email_address || null;
    const submitterPhone =
      (opts && opts.submitterPhone) ||
      payload.phone || payload.phoneNumber || payload.phone_number || payload.cell || null;

    const meta = {
      formId,
      submitterName,
      submitterEmail: submitterEmail ? String(submitterEmail) : null,
      submitterPhone: submitterPhone ? String(submitterPhone) : null,
      payload,
    };

    // ---- Path 1: files present → multipart FormData via fetch ----
    if (files.length > 0) {
      const fd = new FormData();
      fd.append('_meta', JSON.stringify(meta));
      files.forEach(({ fieldName, file }, idx) => {
        // Field key includes idx so duplicates with same name don't collide
        fd.append(`file_${idx}__${fieldName}`, file, file.name);
      });

      try {
        fetch(API_URL, {
          method: 'POST',
          body: fd,
          mode: 'cors',
          // No keepalive: keepalive caps at 64KB and we may have larger uploads
        })
          .then((res) => {
            if (res.ok) console.log(TAG, 'Submitted', formId, 'with', files.length, 'file(s)');
            else console.warn(TAG, 'Server rejected', formId, res.status);
          })
          .catch((err) => console.warn(TAG, 'Network error for', formId, err));
      } catch (err) {
        console.warn(TAG, 'multipart fetch threw for', formId, err);
      }
      return;
    }

    // ---- Path 2: no files → JSON via sendBeacon (survives unload) ----
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
        const queued = navigator.sendBeacon(API_URL, blob);
        if (queued) {
          console.log(TAG, 'Beacon queued for', formId);
          return;
        }
      }
    } catch (err) {
      /* fall through to fetch */
    }

    try {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
        keepalive: true,
        mode: 'cors',
      })
        .then((res) => {
          if (res.ok) console.log(TAG, 'Submitted', formId);
          else console.warn(TAG, 'Server rejected', formId, res.status);
        })
        .catch((err) => console.warn(TAG, 'Network error for', formId, err));
    } catch (err) {
      console.warn(TAG, 'fetch threw for', formId, err);
    }
  }

  // ---------- Mode A: native form attach ----------

  function attachToForms() {
    const forms = document.querySelectorAll('form[data-form-id]');
    forms.forEach((form) => {
      if (form.dataset.opsDisabled !== undefined) return;
      if (form.dataset.opsBridgeAttached === 'true') return;
      form.dataset.opsBridgeAttached = 'true';

      const formId = form.dataset.formId;
      if (!formId) return;

      form.addEventListener(
        'submit',
        function () {
          postSubmission(formId, collectFromForm(form), { dedupeKey: 'form-submit' });
        },
        true
      );
      console.log(TAG, 'Attached (form) to', formId);
    });
  }

  // ---------- Mode B: button auto-detection (no <form> needed) ----------

  function attachToButtons() {
    if (window.__opsBridgeButtonAttached) return;
    window.__opsBridgeButtonAttached = true;

    document.addEventListener(
      'click',
      function (ev) {
        const target = ev.target;
        if (!target || !(target instanceof Element)) return;

        // Match common submit-button selectors
        const btn = target.closest(
          'button[type="submit"], .btn-submit, .submit-btn, [data-vt-submit], [onclick*="submitForm"], [onclick*="handleSubmit"]'
        );
        if (!btn) return;

        // If the click is inside a <form data-form-id>, mode A handles it
        if (btn.closest('form[data-form-id]')) return;

        const formId = detectFormId();
        if (!formId) return;

        // Snapshot a moment AFTER any synchronous validation logic runs.
        // Timeout 0 = next tick, lets validation/file-upload state settle.
        setTimeout(function () {
          const payload = collectFromPage();
          postSubmission(formId, payload, { dedupeKey: 'button-click' });
        }, 0);
      },
      true // capture phase — fires before existing onclick handlers
    );

    console.log(TAG, 'Click listener attached for auto-detect mode');
  }

  // ---------- Init ----------

  function init() {
    attachToForms();
    attachToButtons();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(attachToForms).observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  // ---------- Public API ----------

  window.VitalTouchOpsBridge = {
    submit: function (formId, opts) {
      const collected = {
        payload: (opts && opts.payload) || opts || {},
        files: (opts && opts.files) || [],
      };
      postSubmission(formId, collected, {
        dedupeKey: 'manual',
        submitterName: opts && opts.submitterName,
        submitterEmail: opts && opts.submitterEmail,
        submitterPhone: opts && opts.submitterPhone,
      });
    },
    rescan: init,
    detectFormId,
  };
})();
