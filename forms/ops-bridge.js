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
  const QUEUE_KEY = 'vt_ops_pending';
  const MAX_QUEUE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // De-dupe guard so explicit calls + auto-detection don't double-submit
  const _submitted = new Set();

  // ---------- Local-storage queue ----------
  //
  // Every submission is enqueued BEFORE the network call. On success we
  // dequeue. Anything left in the queue is retried on the next page load.
  // Files can't be persisted across reloads (browsers don't allow Files in
  // localStorage), so file-bearing submissions skip the queue and rely on
  // immediate fetch. JSON-only submissions get the full queue treatment.

  function readQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      // Drop entries older than MAX_QUEUE_AGE_MS so the queue can't grow forever
      const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
      return arr.filter((item) => (item.queuedAt || 0) > cutoff);
    } catch (err) {
      return [];
    }
  }

  function writeQueue(items) {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
    } catch (err) {
      console.warn(TAG, 'Could not persist queue:', err);
    }
  }

  function enqueue(meta) {
    const items = readQueue();
    items.push({
      id: 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      queuedAt: Date.now(),
      meta,
    });
    writeQueue(items);
  }

  function dequeue(id) {
    const items = readQueue().filter((item) => item.id !== id);
    writeQueue(items);
  }

  function drainQueue() {
    const items = readQueue();
    if (items.length === 0) return;
    console.log(TAG, 'Draining queue —', items.length, 'pending');
    items.forEach(function (item) {
      fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.meta),
        mode: 'cors',
      })
        .then(function (res) {
          if (res.ok) {
            console.log(TAG, 'Drained queued submission', item.meta.formId);
            dequeue(item.id);
          } else {
            console.warn(TAG, 'Drain failed', item.meta.formId, res.status);
          }
        })
        .catch(function (err) {
          console.warn(TAG, 'Drain network error', item.meta.formId, err);
        });
    });
  }

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

    // One submission per formId per page lifetime — whichever mode fires
    // first wins. Prevents Mode B (click) + Mode C (submitForm wrap) +
    // manual .submit() from triple-firing for forms that hit multiple paths.
    if (_submitted.has(formId)) {
      console.log(TAG, 'Skipping duplicate submit for', formId,
        '(already submitted via different path)');
      return;
    }
    _submitted.add(formId);

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

    // ---- Path 2: no files → JSON, with localStorage queue safeguard ----

    // Enqueue first so we don't lose the submission if network drops
    enqueue(meta);
    const queueIdAtSend = readQueue().slice(-1)[0]?.id;

    // Try sendBeacon first (survives page unload from a mailto: nav)
    let beaconSent = false;
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([JSON.stringify(meta)], { type: 'application/json' });
        if (navigator.sendBeacon(API_URL, blob)) {
          console.log(TAG, 'Beacon queued for', formId);
          beaconSent = true;
          // Beacon is fire-and-forget; we can't confirm success. Keep it in
          // the localStorage queue and let the next page load drain-or-skip
          // based on a delivery probe. For now, optimistically dequeue after
          // a short delay — if the server actually got it, the dashboard
          // shows it and we're fine; if not, the next page load retries.
          setTimeout(function () {
            if (queueIdAtSend) dequeue(queueIdAtSend);
          }, 5000);
        }
      }
    } catch (err) {
      /* fall through to fetch */
    }

    if (!beaconSent) {
      try {
        fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(meta),
          keepalive: true,
          mode: 'cors',
        })
          .then(function (res) {
            if (res.ok) {
              console.log(TAG, 'Submitted', formId);
              if (queueIdAtSend) dequeue(queueIdAtSend);
            } else {
              console.warn(TAG, 'Server rejected', formId, res.status,
                '— kept in local queue for retry');
            }
          })
          .catch(function (err) {
            console.warn(TAG, 'Network error for', formId, err,
              '— kept in local queue for retry');
          });
      } catch (err) {
        console.warn(TAG, 'fetch threw for', formId, err,
          '— kept in local queue for retry');
      }
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

  // ---------- Mode C: wrap window.submitForm ----------
  //
  // Many of the multi-step forms validate first, then call a global
  // `submitForm()` function. The button click is on `.btn-next` (which we
  // can't auto-fire on, since it's also used for next-page navigation).
  // Wrapping window.submitForm catches the actual submit moment regardless
  // of which button or path triggered it.

  function tryWrapSubmitForm() {
    if (window.__vtSubmitFormWrapped) return;
    if (typeof window.submitForm !== 'function') return;

    const original = window.submitForm;
    window.submitForm = function () {
      const result = original.apply(this, arguments);
      const formId = detectFormId();
      if (formId) {
        // Delay a tick so signature pads / file inputs settle their state
        setTimeout(function () {
          postSubmission(formId, collectFromPage(), {
            dedupeKey: 'submit-form-wrap',
          });
        }, 50);
      }
      return result;
    };
    window.__vtSubmitFormWrapped = true;
    console.log(TAG, 'Wrapped window.submitForm');
  }

  // ---------- Init ----------

  function init() {
    attachToForms();
    attachToButtons();
    tryWrapSubmitForm();
    drainQueue(); // Retry any submissions that failed on prior page loads

    // Re-attempt wrap a few times — the form's script may run after ours
    let tries = 0;
    const interval = setInterval(function () {
      tryWrapSubmitForm();
      if (window.__vtSubmitFormWrapped || ++tries > 20) clearInterval(interval);
    }, 250);
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
    // Debug helpers — useful for inspecting safety queue
    pendingQueue: function () { return readQueue(); },
    drainNow: drainQueue,
    clearQueue: function () { writeQueue([]); },
  };
})();
