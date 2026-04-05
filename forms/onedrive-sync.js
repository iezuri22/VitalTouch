/**
 * VitalTouch OneDrive Auto-Sync v1.0
 * Uses Microsoft Graph API + MSAL.js to save form submissions
 * directly to OneDrive as JSON files in organized folders.
 *
 * SETUP REQUIRED:
 * 1. Register an app in Azure AD (portal.azure.com)
 * 2. Set redirect URI to your site (e.g., https://vitaltouchcares.com/forms/auth-callback.html)
 * 3. Add Microsoft Graph permissions: Files.ReadWrite, User.Read
 * 4. Copy the Application (client) ID below
 *
 * Folder Structure Created in OneDrive:
 *   VitalTouch/
 *     Clients/
 *       [LastName, FirstName]/
 *         Onboarding/
 *           C11_Client_Intake_2026-04-04.json
 *           C21_Client_Assessment_2026-04-05.json
 *         Monitoring/
 *           C41_Monthly_Contact_2026-05-01.json
 *         Incidents/
 *           C44_Incident_2026-06-15.json
 *     Staff/
 *       [LastName, FirstName]/
 *         ...
 */

const VTOneDrive = (function () {
  'use strict';

  // ──────────────────────────────────────────────
  // CONFIGURATION — UPDATE THESE AFTER AZURE SETUP
  // ──────────────────────────────────────────────
  const CONFIG = {
    clientId: '',       // <-- Paste your Azure AD Application (client) ID here
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: window.location.origin + '/forms/auth-callback.html',
    scopes: ['Files.ReadWrite', 'User.Read'],
    rootFolder: 'VitalTouch'
  };

  let msalInstance = null;
  let currentAccount = null;
  let isReady = false;

  // ──────────────────────────────────────────────
  // INITIALIZATION
  // ──────────────────────────────────────────────

  function init() {
    if (!CONFIG.clientId) {
      console.warn('VTOneDrive: No Azure AD client ID configured. OneDrive sync disabled.');
      console.warn('See onedrive-sync.js CONFIG section for setup instructions.');
      _updateStatusBadge('not-configured');
      return Promise.resolve(false);
    }

    if (typeof msal === 'undefined') {
      console.warn('VTOneDrive: MSAL.js not loaded. Add the script tag to your page.');
      _updateStatusBadge('error');
      return Promise.resolve(false);
    }

    msalInstance = new msal.PublicClientApplication({
      auth: {
        clientId: CONFIG.clientId,
        authority: CONFIG.authority,
        redirectUri: CONFIG.redirectUri
      },
      cache: {
        cacheLocation: 'sessionStorage',
        storeAuthStateInCookie: false
      }
    });

    // Check for existing session
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      currentAccount = accounts[0];
      isReady = true;
      _updateStatusBadge('connected');
      return Promise.resolve(true);
    }

    _updateStatusBadge('disconnected');
    return Promise.resolve(false);
  }

  /**
   * Trigger interactive sign-in
   */
  function signIn() {
    if (!msalInstance) {
      console.error('VTOneDrive: Not initialized. Call init() first.');
      return Promise.reject(new Error('Not initialized'));
    }

    return msalInstance.loginPopup({ scopes: CONFIG.scopes })
      .then(function (response) {
        currentAccount = response.account;
        isReady = true;
        _updateStatusBadge('connected');
        return true;
      })
      .catch(function (error) {
        console.error('VTOneDrive: Sign-in failed', error);
        _updateStatusBadge('error');
        return false;
      });
  }

  function signOut() {
    if (msalInstance && currentAccount) {
      msalInstance.logoutPopup({ account: currentAccount });
      currentAccount = null;
      isReady = false;
      _updateStatusBadge('disconnected');
    }
  }

  // ──────────────────────────────────────────────
  // TOKEN ACQUISITION
  // ──────────────────────────────────────────────

  function _getToken() {
    if (!msalInstance || !currentAccount) {
      return Promise.reject(new Error('Not authenticated'));
    }

    return msalInstance.acquireTokenSilent({
      scopes: CONFIG.scopes,
      account: currentAccount
    }).catch(function () {
      // Silent failed — try interactive
      return msalInstance.acquireTokenPopup({ scopes: CONFIG.scopes });
    }).then(function (response) {
      return response.accessToken;
    });
  }

  // ──────────────────────────────────────────────
  // GRAPH API HELPERS
  // ──────────────────────────────────────────────

  function _graphRequest(url, method, body) {
    return _getToken().then(function (token) {
      var opts = {
        method: method || 'GET',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
        }
      };
      if (body) opts.body = typeof body === 'string' ? body : JSON.stringify(body);
      return fetch('https://graph.microsoft.com/v1.0' + url, opts);
    }).then(function (resp) {
      if (resp.status === 204) return null;
      return resp.json();
    });
  }

  /**
   * Ensure a folder path exists in OneDrive (creates if needed)
   * Path format: "VitalTouch/Clients/Lacey, Wayne/Onboarding"
   */
  function _ensureFolder(folderPath) {
    // Graph API: create folder using path
    var parts = folderPath.split('/');
    var current = '';

    function createNext(index) {
      if (index >= parts.length) return Promise.resolve();
      current = current ? current + '/' + parts[index] : parts[index];

      return _graphRequest(
        '/me/drive/root:/' + encodeURIComponent(current),
        'GET'
      ).catch(function () {
        // Folder doesn't exist — create it
        var parentPath = index === 0
          ? '/me/drive/root/children'
          : '/me/drive/root:/' + encodeURIComponent(parts.slice(0, index).join('/')) + ':/children';

        return _graphRequest(parentPath, 'POST', {
          name: parts[index],
          folder: {},
          '@microsoft.graph.conflictBehavior': 'fail'
        }).catch(function () {
          // Already exists (race condition) — ignore
        });
      }).then(function () {
        return createNext(index + 1);
      });
    }

    return createNext(0);
  }

  /**
   * Upload a file to OneDrive
   */
  function _uploadFile(folderPath, fileName, content) {
    var filePath = folderPath + '/' + fileName;

    return _getToken().then(function (token) {
      return fetch(
        'https://graph.microsoft.com/v1.0/me/drive/root:/' +
        encodeURIComponent(filePath) + ':/content',
        {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
        }
      );
    }).then(function (resp) {
      return resp.json();
    });
  }

  // ──────────────────────────────────────────────
  // SYNC LOGIC
  // ──────────────────────────────────────────────

  /**
   * Called by flow-engine after form submission
   * Saves the form data as a JSON file in the correct OneDrive folder
   */
  function syncSubmission(flow, stepId, submissionData) {
    if (!isReady) {
      console.log('VTOneDrive: Not connected — submission queued locally');
      _queueForSync(flow.flowId, stepId, submissionData);
      return Promise.resolve(false);
    }

    // Build folder path
    var entityName = flow.entity.lastName + ', ' + flow.entity.firstName;
    var typeFolder = flow.flowType === 'client' ? 'Clients' : 'Staff';
    var subFolder = _getSubFolder(flow, stepId);
    var folderPath = CONFIG.rootFolder + '/' + typeFolder + '/' + entityName + '/' + subFolder;

    // Build file name
    var dateStr = new Date().toISOString().split('T')[0];
    var fileName = stepId + '_' + _getStepName(flow.flowType, stepId).replace(/\s+/g, '_') + '_' + dateStr + '.json';

    return _ensureFolder(folderPath)
      .then(function () {
        return _uploadFile(folderPath, fileName, submissionData);
      })
      .then(function (result) {
        // Update flow with OneDrive path
        if (result && result.webUrl) {
          var db = JSON.parse(localStorage.getItem('vt_flows') || '{}');
          if (db[flow.flowId] && db[flow.flowId].steps[stepId]) {
            db[flow.flowId].steps[stepId].oneDrivePath = result.webUrl;
            db[flow.flowId].oneDriveFolder = folderPath;
            localStorage.setItem('vt_flows', JSON.stringify(db));
          }
        }
        console.log('VTOneDrive: Synced ' + fileName + ' to ' + folderPath);
        _dispatch('sync:success', { flowId: flow.flowId, stepId: stepId, path: folderPath + '/' + fileName });
        return true;
      })
      .catch(function (err) {
        console.error('VTOneDrive: Sync failed', err);
        _queueForSync(flow.flowId, stepId, submissionData);
        _dispatch('sync:failed', { flowId: flow.flowId, stepId: stepId, error: err.message });
        return false;
      });
  }

  /**
   * Retry all queued submissions
   */
  function retryQueue() {
    var queue = JSON.parse(localStorage.getItem('vt_onedrive_queue') || '[]');
    if (queue.length === 0 || !isReady) return Promise.resolve();

    var promises = queue.map(function (item) {
      var flow = VTFlow.getFlow(item.flowId);
      if (!flow) return Promise.resolve();
      return syncSubmission(flow, item.stepId, item.submissionData);
    });

    // Clear queue after attempting
    localStorage.setItem('vt_onedrive_queue', '[]');
    return Promise.all(promises);
  }

  // ──────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────

  function _getSubFolder(flow, stepId) {
    // Map steps to subfolders
    var onboardingSteps = ['C11', 'C21', 'C22', 'C23', 'C24', 'C12'];
    var monitoringSteps = ['C41', 'C42', 'C42C'];
    var incidentSteps = ['C44'];

    if (onboardingSteps.indexOf(stepId) !== -1) return 'Onboarding';
    if (monitoringSteps.indexOf(stepId) !== -1) return 'Monitoring';
    if (incidentSteps.indexOf(stepId) !== -1) return 'Incidents';
    return 'Other';
  }

  function _getStepName(flowType, stepId) {
    var template = VTFlow.getTemplate(flowType);
    if (!template) return stepId;
    for (var i = 0; i < template.phases.length; i++) {
      for (var j = 0; j < template.phases[i].steps.length; j++) {
        if (template.phases[i].steps[j].id === stepId) {
          return template.phases[i].steps[j].name;
        }
      }
    }
    return stepId;
  }

  function _queueForSync(flowId, stepId, submissionData) {
    try {
      var queue = JSON.parse(localStorage.getItem('vt_onedrive_queue') || '[]');
      queue.push({ flowId: flowId, stepId: stepId, submissionData: submissionData, queuedAt: new Date().toISOString() });
      localStorage.setItem('vt_onedrive_queue', JSON.stringify(queue));
    } catch (e) {
      console.error('VTOneDrive: Failed to queue', e);
    }
  }

  function _updateStatusBadge(status) {
    var badge = document.getElementById('onedrive-status');
    if (!badge) return;

    var labels = {
      'connected': '● OneDrive Connected',
      'disconnected': '○ OneDrive Disconnected',
      'not-configured': '○ OneDrive Not Set Up',
      'error': '✕ OneDrive Error'
    };
    var colors = {
      'connected': '#16A34A',
      'disconnected': '#94A3B8',
      'not-configured': '#F59E0B',
      'error': '#EF4444'
    };

    badge.textContent = labels[status] || status;
    badge.style.color = colors[status] || '#94A3B8';
  }

  // Event system
  const _listeners = {};
  function _dispatch(event, detail) {
    if (_listeners[event]) {
      _listeners[event].forEach(function (fn) { fn(detail); });
    }
  }
  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  // ──────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────
  return {
    init: init,
    signIn: signIn,
    signOut: signOut,
    syncSubmission: syncSubmission,
    retryQueue: retryQueue,
    isReady: function () { return isReady; },
    on: on,
    CONFIG: CONFIG
  };
})();
