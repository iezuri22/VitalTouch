/**
 * VitalTouch Forms — Service Worker
 *
 * Acts as a durable submission queue layer. When the bridge POSTs to the
 * SharePoint-first API, this SW intercepts:
 *
 *   - Network success (2xx)  → pass response through to bridge
 *   - Server rejection (4xx) → pass response through (won't retry — user must fix)
 *   - Server error (5xx) OR network failure → store request in IndexedDB,
 *                                              register Background Sync,
 *                                              return synthetic 202 { queued: true }
 *
 * Background Sync replays queued submissions automatically when network
 * returns. Survives tab close, browser restart, device reboot.
 *
 * Files (Blobs) are stored natively in IndexedDB — no base64 round-trip needed.
 *
 * Scope: /forms/ (all 35 form pages)
 */

const VERSION = 'vt-sw-v1';
const API_URL = 'https://vitaltouch-ops.vercel.app/api/public/form-submission';
const DB_NAME = 'vt-forms-queue';
const DB_VERSION = 1;
const STORE = 'pending';
const SYNC_TAG = 'vt-form-submit';

// ============================================================
// IndexedDB helpers
// ============================================================

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id', autoIncrement: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToQueue(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllQueued() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteFromQueue(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function updateQueueItem(record) {
  return saveToQueue(record);
}

// ============================================================
// Request capture / replay
// ============================================================

/**
 * Serialize a Request to an IndexedDB-safe record.
 * Blob/File bodies are stored as Blobs (IndexedDB supports them natively).
 */
async function serializeRequest(request) {
  const id = 'q_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  const contentType = request.headers.get('content-type') || '';
  const headers = {};
  request.headers.forEach((value, key) => { headers[key] = value; });

  let body;
  let bodyType;
  if (contentType.startsWith('multipart/form-data')) {
    // Re-read FormData and store individual parts as Blobs
    const fd = await request.formData();
    const parts = [];
    for (const [key, value] of fd.entries()) {
      if (value instanceof File || value instanceof Blob) {
        const buf = await value.arrayBuffer();
        parts.push({
          key,
          isFile: true,
          name: value.name || 'file',
          type: value.type || 'application/octet-stream',
          data: new Blob([buf], { type: value.type || 'application/octet-stream' }),
        });
      } else {
        parts.push({ key, isFile: false, value: String(value) });
      }
    }
    body = parts;
    bodyType = 'multipart';
  } else {
    body = await request.text();
    bodyType = 'json';
  }

  return {
    id,
    queuedAt: Date.now(),
    attempts: 0,
    url: request.url,
    method: request.method,
    headers,
    bodyType,
    body,
  };
}

/**
 * Rebuild a fetch Request from a stored record and POST it.
 */
async function replayRecord(record) {
  let body;
  let headers = { ...record.headers };

  if (record.bodyType === 'multipart') {
    const fd = new FormData();
    for (const part of record.body) {
      if (part.isFile) {
        fd.append(part.key, part.data, part.name);
      } else {
        fd.append(part.key, part.value);
      }
    }
    body = fd;
    // Browser sets correct multipart boundary; remove old content-type
    delete headers['content-type'];
  } else {
    body = record.body;
  }

  return fetch(record.url, {
    method: record.method,
    headers,
    body,
    mode: 'cors',
  });
}

// ============================================================
// Sync registration helper
// ============================================================

async function registerBackgroundSync() {
  try {
    if ('sync' in self.registration) {
      await self.registration.sync.register(SYNC_TAG);
      return true;
    }
  } catch (err) {
    // Permission denied or unavailable — fall back to per-page-load drain
  }
  return false;
}

// ============================================================
// fetch interceptor
// ============================================================

self.addEventListener('fetch', (event) => {
  // Only intercept POSTs to the submission API
  const req = event.request;
  if (req.method !== 'POST') return;

  // Match the configured API URL exactly (origin + path)
  let url;
  try { url = new URL(req.url); } catch { return; }
  const target = new URL(API_URL);
  if (url.origin !== target.origin || url.pathname !== target.pathname) return;

  event.respondWith(handleSubmission(req));
});

async function handleSubmission(request) {
  // Clone immediately because we may need the body twice (network try + queue)
  const cloned = request.clone();

  try {
    const res = await fetch(request);
    if (res.ok) return res; // 2xx — pass through

    // 4xx is a client error (validation, etc.). Don't retry — pass through
    // so the bridge can show the rejection reason to the user.
    if (res.status >= 400 && res.status < 500) return res;

    // 5xx — queue for retry
    return await queueAndRespond(cloned, 'server_error_' + res.status);
  } catch (err) {
    // Network/CORS error
    return await queueAndRespond(cloned, 'network_error');
  }
}

async function queueAndRespond(request, reason) {
  try {
    const record = await serializeRequest(request);
    record.lastReason = reason;
    await saveToQueue(record);
    await registerBackgroundSync();

    return new Response(
      JSON.stringify({
        ok: false,
        queued: true,
        queueId: record.id,
        reason,
        message:
          'Submission queued for automatic retry. Your data is saved on this device and will be sent when the connection is restored.',
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    // If queueing itself fails, return a 503 so the bridge handles it
    return new Response(
      JSON.stringify({
        ok: false,
        queued: false,
        error: 'Failed to queue submission',
        detail: err && err.message,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================================
// Background Sync — drains the queue when network returns
// ============================================================

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(drainQueue());
  }
});

async function drainQueue() {
  const items = await getAllQueued();
  if (items.length === 0) return;

  for (const record of items) {
    try {
      const res = await replayRecord(record);
      if (res.ok) {
        await deleteFromQueue(record.id);
        await broadcast({ type: 'submission-synced', id: record.id });
      } else if (res.status >= 400 && res.status < 500) {
        // Permanent rejection — drop from queue (else it stays forever)
        await deleteFromQueue(record.id);
        await broadcast({
          type: 'submission-rejected',
          id: record.id,
          status: res.status,
        });
      } else {
        // Still 5xx — bump attempts, leave in queue. Browser will re-fire sync
        record.attempts = (record.attempts || 0) + 1;
        record.lastReason = 'server_error_' + res.status;
        await updateQueueItem(record);
        // Throw to signal the sync didn't complete — browser will retry
        throw new Error('Server still unavailable');
      }
    } catch (err) {
      // Network still down — leave in queue
      record.attempts = (record.attempts || 0) + 1;
      record.lastReason = 'network_error';
      await updateQueueItem(record);
      throw err; // signal sync didn't complete
    }
  }
}

// ============================================================
// Tab notifications
// ============================================================

async function broadcast(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
}

// ============================================================
// Lifecycle
// ============================================================

self.addEventListener('install', (event) => {
  // Skip waiting so updates apply immediately
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    await self.clients.claim();
    // Try to drain on activate, in case there's a queue from a previous install
    try { await drainQueue(); } catch { /* ok — sync will retry */ }
  })());
});

// Manual trigger from a tab
self.addEventListener('message', (event) => {
  if (!event.data) return;
  if (event.data.type === 'drain-queue') {
    event.waitUntil(drainQueue().catch(() => {}));
  } else if (event.data.type === 'get-queue-size') {
    event.waitUntil((async () => {
      const items = await getAllQueued();
      event.source && event.source.postMessage({
        type: 'queue-size',
        size: items.length,
      });
    })());
  }
});
