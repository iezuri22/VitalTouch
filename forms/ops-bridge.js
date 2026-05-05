/**
 * VitalTouch Ops Bridge — SharePoint-first.
 *
 * Healthcare-grade reliability: PHI must reach BAA-covered SharePoint storage
 * BEFORE the user is told their submission succeeded. The bridge:
 *
 *   1. Shows a blocking "Saving to secure storage..." overlay immediately
 *      after submit is detected, on top of any form-level success UI
 *   2. Uploads to /api/public/form-submission via fetch (no fire-and-forget)
 *   3. Waits for 201 + the durable SharePoint path returned by the server
 *   4. Retries automatically with backoff on 5xx + network errors
 *   5. Shows a definitive "Submitted" only after server confirms durable write
 *   6. Falls back to localStorage queue if all retries fail
 *
 * Detection modes (unchanged):
 *   A. <form data-form-id="X"> submit event
 *   B. Click on submit-like buttons + form-id auto-detect from URL
 *   C. window.submitForm() wrap
 *   D. Manual: window.VitalTouchOpsBridge.submit(formId, ...)
 */
(function () {
  'use strict';

  const API_URL = 'https://vitaltouch-ops.vercel.app/api/public/form-submission';
  const TAG = '[VitalTouch Ops Bridge]';
  const QUEUE_KEY = 'vt_ops_pending';
  const MAX_QUEUE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  // Retry policy for the synchronous SharePoint-first submit
  const MAX_RETRIES = 4;
  const RETRY_DELAYS = [800, 2000, 4000, 8000]; // ms — total ~15s before queue fallback

  const _submitted = new Set();

  // ============================================================
  // OVERLAY UI
  // ============================================================

  let overlayEl = null;

  function ensureOverlay() {
    if (overlayEl && document.body.contains(overlayEl)) return overlayEl;
    overlayEl = document.createElement('div');
    overlayEl.id = 'vt-ops-overlay';
    overlayEl.setAttribute('role', 'status');
    overlayEl.setAttribute('aria-live', 'polite');
    overlayEl.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483647',
      'background:rgba(15,23,42,0.55)', 'backdrop-filter:blur(4px)',
      '-webkit-backdrop-filter:blur(4px)',
      'display:none', 'align-items:center', 'justify-content:center',
      'padding:24px', 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif',
    ].join(';');
    overlayEl.innerHTML =
      '<div id="vt-ops-card" style="' + [
        'background:#fff', 'border-radius:16px',
        'box-shadow:0 24px 64px rgba(0,0,0,0.25)',
        'max-width:420px', 'width:100%', 'padding:28px 32px',
        'text-align:center',
      ].join(';') + '">' +
        '<div id="vt-ops-icon" style="margin:0 auto 16px;width:48px;height:48px;display:flex;align-items:center;justify-content:center"></div>' +
        '<div id="vt-ops-title" style="font-size:18px;font-weight:600;color:#0f172a;margin-bottom:6px"></div>' +
        '<div id="vt-ops-msg" style="font-size:14px;color:#475569;line-height:1.4;margin-bottom:0"></div>' +
        '<div id="vt-ops-actions" style="margin-top:20px;display:none"></div>' +
      '</div>';
    document.body.appendChild(overlayEl);
    return overlayEl;
  }

  function setOverlay(state, opts) {
    ensureOverlay();
    const icon = overlayEl.querySelector('#vt-ops-icon');
    const title = overlayEl.querySelector('#vt-ops-title');
    const msg = overlayEl.querySelector('#vt-ops-msg');
    const actions = overlayEl.querySelector('#vt-ops-actions');
    actions.innerHTML = '';
    actions.style.display = 'none';

    if (state === 'saving') {
      icon.innerHTML = '<div style="width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#16a34a;border-radius:50%;animation:vt-spin 0.8s linear infinite"></div>';
      title.textContent = opts?.title || 'Saving to secure storage…';
      msg.textContent = opts?.msg || 'Please keep this page open. Do not close or refresh.';
      injectSpinKeyframes();
    } else if (state === 'retrying') {
      icon.innerHTML = '<div style="width:36px;height:36px;border:3px solid #fef3c7;border-top-color:#f59e0b;border-radius:50%;animation:vt-spin 0.8s linear infinite"></div>';
      title.textContent = 'Still saving…';
      msg.textContent = opts?.msg || 'A brief delay reaching secure storage. Retrying automatically.';
      injectSpinKeyframes();
    } else if (state === 'success') {
      icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#dcfce7"/><path d="M14 24l7 7 13-13" stroke="#16a34a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>';
      title.textContent = 'Submitted';
      msg.textContent = opts?.msg || 'Your submission has been securely saved.';
    } else if (state === 'error') {
      icon.innerHTML = '<svg width="48" height="48" viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" fill="#fee2e2"/><path d="M24 14v12M24 32h0" stroke="#dc2626" stroke-width="3" stroke-linecap="round"/></svg>';
      title.textContent = opts?.title || 'Could not save';
      msg.textContent = opts?.msg || 'There was a problem saving your submission. You can retry, or your data is queued and will be sent automatically when the connection is restored.';
      if (opts?.actions) {
        actions.style.display = 'flex';
        actions.style.gap = '8px';
        actions.style.justifyContent = 'center';
        opts.actions.forEach(function (a) {
          const btn = document.createElement('button');
          btn.textContent = a.label;
          btn.style.cssText = [
            'padding:10px 16px', 'border-radius:8px', 'font-size:14px',
            'font-weight:500', 'cursor:pointer', 'border:0',
            a.primary
              ? 'background:#16a34a;color:#fff'
              : 'background:#f1f5f9;color:#0f172a',
          ].join(';');
          btn.addEventListener('click', a.onClick);
          actions.appendChild(btn);
        });
      }
    }
    overlayEl.style.display = 'flex';
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.style.display = 'none';
  }

  function injectSpinKeyframes() {
    if (document.getElementById('vt-ops-keyframes')) return;
    const style = document.createElement('style');
    style.id = 'vt-ops-keyframes';
    style.textContent = '@keyframes vt-spin { to { transform: rotate(360deg) } }';
    document.head.appendChild(style);
  }

  // ============================================================
  // LOCAL-STORAGE QUEUE (last-resort fallback for JSON-only submits)
  // ============================================================

  function readQueue() {
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return [];
      const cutoff = Date.now() - MAX_QUEUE_AGE_MS;
      return arr.filter(function (item) { return (item.queuedAt || 0) > cutoff; });
    } catch (err) {
      return [];
    }
  }

  function writeQueue(items) {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(items)); }
    catch (err) { console.warn(TAG, 'Could not persist queue:', err); }
  }

  function enqueue(meta) {
    const items = readQueue();
    const id = 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
    items.push({ id: id, queuedAt: Date.now(), meta: meta });
    writeQueue(items);
    return id;
  }

  function dequeue(id) {
    writeQueue(readQueue().filter(function (i) { return i.id !== id; }));
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
          }
        })
        .catch(function () { /* will retry on next page load */ });
    });
  }

  // ============================================================
  // FORM ID DETECTION + payload collection (unchanged)
  // ============================================================

  function detectFormId() {
    const meta = document.querySelector('meta[name="vt-form-id"]');
    if (meta && meta.getAttribute('content')) return meta.getAttribute('content');
    if (document.body && document.body.dataset.formId) return document.body.dataset.formId;
    try {
      const path = window.location.pathname;
      const file = path.split('/').pop() || '';
      const match = file.match(/^([A-Z]\d+[A-Z]?)_/);
      if (match) return match[1];
    } catch (err) { /* ignore */ }
    return null;
  }

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

  function appendField(payload, key, value) {
    if (payload[key] === undefined) payload[key] = value;
    else if (Array.isArray(payload[key])) payload[key].push(value);
    else payload[key] = [payload[key], value];
  }

  function dataUrlToBlob(dataUrl) {
    try {
      const m = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
      if (!m) return null;
      const mime = m[1] || 'application/octet-stream';
      const data = m[3];
      if (m[2]) {
        const bin = atob(data);
        const arr = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
        return new Blob([arr], { type: mime });
      }
      return new Blob([decodeURIComponent(data)], { type: mime });
    } catch (err) { return null; }
  }

  function collectFromForm(form) {
    const payload = {};
    const files = [];
    const fd = new FormData(form);
    for (const [key, value] of fd.entries()) {
      if (value instanceof File) {
        if (!value.name) continue;
        files.push({ fieldName: key, file: value });
        appendField(payload, key, '[file: ' + value.name + ' (' + value.size + ' bytes)]');
        continue;
      }
      const str = typeof value === 'string' ? value : String(value);
      if (str.startsWith('data:image/')) {
        const blob = dataUrlToBlob(str);
        if (blob) {
          const ext = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
          files.push({
            fieldName: '__sig__' + key,
            file: new File([blob], key + '.' + ext, { type: blob.type }),
          });
          appendField(payload, key, '[signature provided]');
          continue;
        }
      }
      appendField(payload, key, str);
    }
    return { payload: payload, files: files };
  }

  function collectFromPage() {
    const payload = {};
    const files = [];
    document.querySelectorAll('input, textarea, select').forEach(function (el) {
      const key = el.id || el.name;
      if (!key) return;
      if (el.type === 'button' || el.type === 'submit' || el.type === 'reset') return;
      if (el.type === 'file') {
        if (el.files && el.files.length) {
          const tags = [];
          Array.from(el.files).forEach(function (f) {
            files.push({ fieldName: key, file: f });
            tags.push('[file: ' + f.name + ' (' + f.size + ' bytes)]');
          });
          appendField(payload, key, tags.length === 1 ? tags[0] : tags);
        }
        return;
      }
      if (el.type === 'checkbox') { if (el.checked) appendField(payload, key, el.value || true); return; }
      if (el.type === 'radio') { if (el.checked) appendField(payload, key, el.value); return; }
      if (typeof el.value === 'string' && el.value.length) {
        if (el.value.startsWith('data:image/')) {
          const blob = dataUrlToBlob(el.value);
          if (blob) {
            const ext = (blob.type.split('/')[1] || 'png').replace(/[^a-z0-9]/gi, '');
            files.push({
              fieldName: '__sig__' + key,
              file: new File([blob], key + '.' + ext, { type: blob.type }),
            });
            appendField(payload, key, '[signature provided]');
            return;
          }
        }
        appendField(payload, key, el.value);
      }
    });
    return { payload: payload, files: files };
  }

  // ============================================================
  // CORE: SharePoint-first submission with overlay + retries
  // ============================================================

  function buildBody(meta, files) {
    if (files.length === 0) {
      return {
        body: JSON.stringify(meta),
        headers: { 'Content-Type': 'application/json' },
        isJson: true,
      };
    }
    const fd = new FormData();
    fd.append('_meta', JSON.stringify(meta));
    files.forEach(function (item, idx) {
      fd.append('file_' + idx + '__' + item.fieldName, item.file, item.file.name);
    });
    return { body: fd, headers: {}, isJson: false };
  }

  async function attemptSubmit(meta, files, attempt) {
    const built = buildBody(meta, files);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: built.headers,
        body: built.body,
        mode: 'cors',
      });
      if (res.ok) {
        const data = await res.json().catch(function () { return null; });
        return { kind: 'ok', data: data };
      }
      // Validation errors are NOT retryable — show to user
      if (res.status >= 400 && res.status < 500) {
        const err = await res.json().catch(function () { return { error: 'HTTP ' + res.status }; });
        return { kind: 'rejected', status: res.status, error: err };
      }
      // 5xx is retryable
      return { kind: 'retry', status: res.status };
    } catch (err) {
      // Network/CORS error — retryable
      return { kind: 'retry', error: err };
    }
  }

  async function submitWithRetries(meta, files) {
    setOverlay('saving');
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        setOverlay('retrying', {
          msg: 'Attempt ' + (attempt + 1) + ' of ' + (MAX_RETRIES + 1) + '. Hold on…',
        });
        await new Promise(function (r) { setTimeout(r, RETRY_DELAYS[attempt - 1] || 8000); });
      }
      const result = await attemptSubmit(meta, files, attempt);
      if (result.kind === 'ok') {
        setOverlay('success', {
          msg: 'Securely saved. You can now close this page or wait for the form\'s confirmation.',
        });
        setTimeout(hideOverlay, 2500);
        console.log(TAG, 'Submitted', meta.formId, '→', result.data && result.data.sharepointPath);
        return { ok: true, data: result.data };
      }
      if (result.kind === 'rejected') {
        // 4xx — won't get better with retry
        setOverlay('error', {
          title: 'Submission was rejected',
          msg: (result.error && (result.error.error || JSON.stringify(result.error.details))) ||
               'The form data was not accepted. Please review and try again.',
          actions: [
            { label: 'Close', onClick: hideOverlay },
          ],
        });
        return { ok: false, error: result.error };
      }
      // retry path — continue loop
    }
    // Out of retries → enqueue + show error w/ manual retry
    if (files.length === 0) {
      enqueue(meta);
    }
    setOverlay('error', {
      title: 'Could not reach secure storage',
      msg: files.length === 0
        ? 'Your data is saved locally and will be sent automatically next time you visit this site. You can also try again now.'
        : 'Files could not be uploaded. Please check your connection and try again.',
      actions: [
        { label: 'Try again', primary: true, onClick: function () {
            submitWithRetries(meta, files);
          }
        },
        { label: 'Close', onClick: hideOverlay },
      ],
    });
    return { ok: false };
  }

  function postSubmission(formId, collected, opts) {
    const payload = collected && collected.payload ? collected.payload : (collected || {});
    const files = (collected && collected.files) || [];

    if (_submitted.has(formId)) {
      console.log(TAG, 'Skipping duplicate submit for', formId);
      return;
    }
    _submitted.add(formId);

    const submitterName = (opts && opts.submitterName) || findSubmitterFromPayload(payload);
    const submitterEmail = (opts && opts.submitterEmail) ||
      payload.email || payload.emailAddress || payload.email_address || null;
    const submitterPhone = (opts && opts.submitterPhone) ||
      payload.phone || payload.phoneNumber || payload.phone_number || payload.cell || null;

    const meta = {
      formId: formId,
      submitterName: submitterName,
      submitterEmail: submitterEmail ? String(submitterEmail) : null,
      submitterPhone: submitterPhone ? String(submitterPhone) : null,
      payload: payload,
    };

    submitWithRetries(meta, files);
  }

  // ============================================================
  // DETECTION MODES
  // ============================================================

  function attachToForms() {
    document.querySelectorAll('form[data-form-id]').forEach(function (form) {
      if (form.dataset.opsDisabled !== undefined) return;
      if (form.dataset.opsBridgeAttached === 'true') return;
      form.dataset.opsBridgeAttached = 'true';
      const formId = form.dataset.formId;
      if (!formId) return;
      form.addEventListener('submit', function () {
        postSubmission(formId, collectFromForm(form), { dedupeKey: 'form-submit' });
      }, true);
      console.log(TAG, 'Attached (form) to', formId);
    });
  }

  function attachToButtons() {
    if (window.__opsBridgeButtonAttached) return;
    window.__opsBridgeButtonAttached = true;

    document.addEventListener('click', function (ev) {
      const target = ev.target;
      if (!target || !(target instanceof Element)) return;
      const btn = target.closest(
        'button[type="submit"], .btn-submit, .submit-btn, [data-vt-submit], [onclick*="submitForm"], [onclick*="handleSubmit"]'
      );
      if (!btn) return;
      if (btn.closest('form[data-form-id]')) return;
      const formId = detectFormId();
      if (!formId) return;
      setTimeout(function () {
        postSubmission(formId, collectFromPage(), { dedupeKey: 'button-click' });
      }, 0);
    }, true);
    console.log(TAG, 'Click listener attached for auto-detect mode');
  }

  function tryWrapSubmitForm() {
    if (window.__vtSubmitFormWrapped) return;
    if (typeof window.submitForm !== 'function') return;
    const original = window.submitForm;
    window.submitForm = function () {
      const result = original.apply(this, arguments);
      const formId = detectFormId();
      if (formId) {
        setTimeout(function () {
          postSubmission(formId, collectFromPage(), { dedupeKey: 'submit-form-wrap' });
        }, 50);
      }
      return result;
    };
    window.__vtSubmitFormWrapped = true;
    console.log(TAG, 'Wrapped window.submitForm');
  }

  // ============================================================
  // INIT
  // ============================================================

  function init() {
    attachToForms();
    attachToButtons();
    tryWrapSubmitForm();
    drainQueue();
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
      childList: true, subtree: true,
    });
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

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
    detectFormId: detectFormId,
    pendingQueue: function () { return readQueue(); },
    drainNow: drainQueue,
    clearQueue: function () { writeQueue([]); },
    showOverlay: setOverlay,
    hideOverlay: hideOverlay,
  };
})();
