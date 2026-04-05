/**
 * VitalTouch PDF Export v1.0
 * Generates clean, branded PDF summaries of form submissions
 * and auto-downloads them to the user's machine.
 *
 * Uses jsPDF (loaded via CDN in each form).
 * When OneDrive is connected later, the same PDF blob
 * gets uploaded automatically — no rebuild needed.
 *
 * Usage in forms:
 *   VTPdf.generate('C.11', 'Client Intake Form', formData);
 *
 * Folder convention (mirrors planned OneDrive structure):
 *   [StepID]_[FormName]_[ClientName]_[Date].pdf
 *   Example: C11_Client_Intake_Form_Lacey_Wayne_2026-04-04.pdf
 */

const VTPdf = (function () {
  'use strict';

  // ──────────────────────────────────────────────
  // BRAND CONSTANTS
  // ──────────────────────────────────────────────
  const BRAND = {
    green:      [22, 163, 74],     // #16A34A
    greenDark:  [21, 128, 61],     // #15803D
    greenLight: [220, 252, 231],   // #DCFCE7
    text:       [30, 41, 59],      // #1E293B
    textLight:  [100, 116, 139],   // #64748B
    white:      [255, 255, 255],
    border:     [226, 232, 240],   // #E2E8F0
    bg:         [248, 250, 252],   // #F8FAFC
    red:        [239, 68, 68],
    companyName: 'VitalTouch Health Network Inc.',
    address:    '3325 W. 183rd St., Suite B, Homewood, IL 60430',
    phone:      '(708) 898-8831',
    email:      'ifeanyi@vitaltouch.care',
    website:    'vitaltouchcares.com',
    ceo:        'Ifeanyi Ezurike'
  };

  // ──────────────────────────────────────────────
  // FIELD DISPLAY LABELS
  // Maps raw field keys to human-readable labels
  // ──────────────────────────────────────────────
  const FIELD_LABELS = {
    // Common
    submissionId: 'Submission ID',
    submittedAt: 'Submitted',
    formId: 'Form ID',
    formName: 'Form Name',

    // Client info
    firstName: 'First Name',
    lastName: 'Last Name',
    dob: 'Date of Birth',
    ssn: 'SSN',
    gender: 'Gender',
    address: 'Address',
    city: 'City',
    state: 'State',
    zip: 'ZIP Code',
    phone: 'Phone',
    email: 'Email',
    language: 'Preferred Language',
    maritalStatus: 'Marital Status',

    // Payer
    primaryPayer: 'Primary Payer',
    medicaidNumber: 'Medicaid Number',
    secondaryInsurance: 'Secondary Insurance',
    caseManagerName: 'Case Manager',
    caseManagerPhone: 'Case Manager Phone',
    referralSource: 'Referral Source',
    referralDate: 'Referral Date',

    // Medical
    medicalConditions: 'Medical Conditions',
    medications: 'Medications',
    allergies: 'Allergies',
    diagnosis: 'Diagnosis',
    physicianName: 'Physician',
    physicianPhone: 'Physician Phone',

    // Emergency
    emergencyContact: 'Emergency Contact',
    altEmergencyContact: 'Alt Emergency Contact',

    // Service
    serviceType: 'Service Type',
    serviceFrequency: 'Service Frequency',
    hoursPerWeek: 'Hours Per Week',
    startDate: 'Start Date',
    endDate: 'End Date',

    // Staff
    position: 'Position',
    hireDate: 'Hire Date',
    certificationNumber: 'Certification #',
    backgroundCheckDate: 'Background Check Date',
    backgroundCheckStatus: 'Background Check Status',

    // Signatures
    clientSignature: 'Client Signature',
    witnessSignature: 'Witness Signature',
    staffSignature: 'Staff Signature',
    supervisorSignature: 'Supervisor Signature',
    signatureDate: 'Signature Date'
  };

  // Fields to exclude from PDF (internal/meta)
  const EXCLUDE_FIELDS = ['_flowId', 'formId', 'formName'];

  // Fields that contain sensitive data — mask partially
  const SENSITIVE_FIELDS = ['ssn'];

  // ──────────────────────────────────────────────
  // PDF GENERATION
  // ──────────────────────────────────────────────

  /**
   * Generate and download a PDF for a form submission
   * @param {string} formId     - e.g. 'C.11'
   * @param {string} formTitle  - e.g. 'Client Intake Form'
   * @param {object} data       - the form submission data object
   * @param {object} [opts]     - optional overrides
   * @returns {jsPDF|null}      - the jsPDF instance (for OneDrive upload)
   */
  function generate(formId, formTitle, data, opts) {
    if (typeof jspdf === 'undefined' && typeof jsPDF === 'undefined') {
      console.error('VTPdf: jsPDF not loaded. Add the CDN script tag.');
      return null;
    }

    var jsPDFClass = (typeof jspdf !== 'undefined') ? jspdf.jsPDF : jsPDF;
    opts = opts || {};

    var doc = new jsPDFClass({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    var pageW = doc.internal.pageSize.getWidth();
    var pageH = doc.internal.pageSize.getHeight();
    var margin = 20;
    var contentW = pageW - (margin * 2);
    var y = 0;

    // ── HEADER ──
    y = _drawHeader(doc, formTitle, formId, data, margin, contentW, pageW);

    // ── FORM DATA ──
    y = _drawFormData(doc, data, margin, contentW, y, pageH);

    // ── FOOTER on every page ──
    var totalPages = doc.internal.getNumberOfPages();
    for (var p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      _drawFooter(doc, p, totalPages, margin, pageW, pageH);
    }

    // ── FILE NAME ──
    var stepId = formId.replace('.', '');
    var clientName = _getClientName(data);
    var dateStr = new Date().toISOString().split('T')[0];
    var fileName = stepId + '_' + formTitle.replace(/\s+/g, '_') + '_'
      + clientName.replace(/\s+/g, '_') + '_' + dateStr + '.pdf';

    // ── DOWNLOAD ──
    if (!opts.skipDownload) {
      doc.save(fileName);
    }

    // ── STORE BLOB for OneDrive ──
    try {
      var blob = doc.output('blob');
      _storeForSync(formId, stepId, fileName, blob, data);
    } catch (e) {
      console.warn('VTPdf: Could not store blob for sync', e);
    }

    return doc;
  }

  // ──────────────────────────────────────────────
  // EMBEDDED LOGO (logo-symbol.png base64)
  // ──────────────────────────────────────────────
  const LOGO_B64 = 'data:image/png;base64,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';

  // ──────────────────────────────────────────────
  // FIELD GROUPING
  // Organizes flat form data into labeled sections
  // ──────────────────────────────────────────────
  const FIELD_GROUPS = [
    { label: 'Personal Information', keys: ['firstName','lastName','dob','ssn','gender','maritalStatus','language'] },
    { label: 'Contact Information', keys: ['address','city','state','zip','phone','email'] },
    { label: 'Insurance & Payer', keys: ['primaryPayer','medicaidNumber','secondaryInsurance','caseManagerName','caseManagerPhone','referralSource','referralDate'] },
    { label: 'Medical Information', keys: ['medicalConditions','medications','allergies','diagnosis'] },
    { label: 'Emergency Contact', keys: ['emergencyContact','altEmergencyContact'] },
    { label: 'Physician', keys: ['physicianName','physicianPhone','physician'] },
    { label: 'Service Details', keys: ['serviceType','serviceFrequency','hoursPerWeek','startDate','endDate'] }
  ];

  // Keys to skip entirely in the PDF body (shown in header or internal)
  const HEADER_KEYS = ['submissionId','submittedAt','formId','formName','_flowId','firstName','lastName'];

  // ──────────────────────────────────────────────
  // DRAWING HELPERS
  // ──────────────────────────────────────────────

  function _drawHeader(doc, formTitle, formId, data, margin, contentW, pageW) {
    // ── GREEN HEADER BAR with gradient feel ──
    // Main bar
    doc.setFillColor(22, 163, 74);
    doc.rect(0, 0, pageW, 38, 'F');
    // Darker strip at bottom
    doc.setFillColor(21, 128, 61);
    doc.rect(0, 35, pageW, 3, 'F');

    // Logo
    try {
      doc.addImage(LOGO_B64, 'PNG', margin, 6, 26, 26);
    } catch (e) { /* logo failed — continue without it */ }

    // Company name next to logo
    var textX = margin + 30;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(255, 255, 255);
    doc.text('VitalTouch Health Network', textX, 17);

    // Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(220, 252, 231); // green-light
    doc.text(BRAND.address + '   |   ' + BRAND.phone + '   |   ' + BRAND.website, textX, 25);

    // ── CLIENT NAME — BIG AND PROMINENT ──
    var clientFirst = data.firstName || data.clientFirstName || '';
    var clientLast = data.lastName || data.clientLastName || '';
    var clientFull = (clientFirst + ' ' + clientLast).trim() || 'Client Record';

    var y = 52;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(30, 41, 59);
    doc.text(clientFull, margin, y);

    // ── FORM TITLE as subtitle ──
    y += 9;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(13);
    doc.setTextColor(22, 163, 74);
    doc.text(formTitle, margin, y);

    // ── META INFO BADGES ──
    y += 10;
    var badges = [];
    if (data.submissionId) badges.push('ID: ' + data.submissionId);
    badges.push('Form: ' + formId);
    if (data.submittedAt) badges.push('Date: ' + _formatDate(data.submittedAt));

    var badgeX = margin;
    doc.setFontSize(8);
    badges.forEach(function (badge) {
      var tw = doc.getTextWidth(badge) + 8;
      // Badge background
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(badgeX, y - 3.5, tw, 5.5, 1.5, 1.5, 'FD');
      // Badge text
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(badge, badgeX + 4, y + 0.5);
      badgeX += tw + 3;
    });

    // ── GREEN DIVIDER ──
    y += 9;
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.6);
    doc.line(margin, y, margin + contentW, y);

    y += 7;
    return y;
  }

  function _drawFormData(doc, data, margin, contentW, startY, pageH) {
    var y = startY;
    var bottomMargin = 24;
    var rowH = 7;
    var sectionPad = 5;

    // Build grouped fields
    var sections = _groupFields(data);

    for (var s = 0; s < sections.length; s++) {
      var section = sections[s];
      if (section.fields.length === 0) continue;

      // Check space for section header + at least 2 rows
      if (y + 20 > pageH - bottomMargin) {
        doc.addPage();
        y = 18;
      }

      // ── SECTION HEADER ──
      y += sectionPad;
      doc.setFillColor(22, 163, 74);
      doc.roundedRect(margin, y - 4.5, contentW, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text(section.label.toUpperCase(), margin + 5, y + 0.5);
      y += 8;

      // ── FIELD ROWS ──
      for (var r = 0; r < section.fields.length; r++) {
        var field = section.fields[r];

        if (y + rowH + 2 > pageH - bottomMargin) {
          doc.addPage();
          y = 18;
        }

        // Alternating row bg
        if (r % 2 === 0) {
          doc.setFillColor(248, 250, 252);
          doc.rect(margin, y - 4, contentW, rowH, 'F');
        }

        // Left border accent on every row
        doc.setFillColor(220, 252, 231);
        doc.rect(margin, y - 4, 1.5, rowH, 'F');

        // Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(field.label, margin + 5, y);

        // Value
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);

        var valStr = String(field.value);
        var valX = margin + 58;
        var valW = contentW - 60;

        if (valStr.length > 55) {
          var lines = doc.splitTextToSize(valStr, valW);
          doc.text(lines, valX, y);
          y += (lines.length - 1) * 5;
        } else {
          doc.text(valStr, valX, y);
        }

        y += rowH;
      }

      y += 2; // gap between sections
    }

    // ── SIGNATURES ──
    var sigs = ['clientSignature','witnessSignature','staffSignature','supervisorSignature'];
    var hasSigs = sigs.some(function (k) { return !!data[k]; });

    if (hasSigs) {
      if (y + 25 > pageH - bottomMargin) { doc.addPage(); y = 18; }

      y += sectionPad;
      doc.setFillColor(22, 163, 74);
      doc.roundedRect(margin, y - 4.5, contentW, 8, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(255, 255, 255);
      doc.text('SIGNATURES', margin + 5, y + 0.5);
      y += 10;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Digital signatures captured electronically at time of submission.', margin + 5, y);
      y += 6;

      sigs.forEach(function (sigKey) {
        if (!data[sigKey]) return;
        // Signature line
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(FIELD_LABELS[sigKey] || _humanize(sigKey), margin + 5, y);

        doc.setDrawColor(30, 41, 59);
        doc.setLineWidth(0.3);
        doc.line(margin + 58, y + 1, margin + contentW - 5, y + 1);

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7);
        doc.setTextColor(22, 163, 74);
        doc.text('[Signed]', margin + 60, y);
        y += 8;
      });
    }

    return y;
  }

  /**
   * Group flat data into labeled sections
   */
  function _groupFields(data) {
    var sections = [];
    var usedKeys = {};

    // First, assign fields to predefined groups
    FIELD_GROUPS.forEach(function (grp) {
      var fields = [];
      grp.keys.forEach(function (key) {
        var val = data[key];
        if (val === undefined || val === null || val === '') return;
        if (HEADER_KEYS.indexOf(key) !== -1) return;
        if (EXCLUDE_FIELDS.indexOf(key) !== -1) return;

        if (typeof val === 'object' && !Array.isArray(val)) {
          // Nested object — flatten into this section
          Object.keys(val).forEach(function (subKey) {
            if (val[subKey]) {
              fields.push({ label: FIELD_LABELS[subKey] || _humanize(subKey), value: _formatFieldValue(subKey, val[subKey]) });
            }
          });
        } else {
          fields.push({ label: FIELD_LABELS[key] || _humanize(key), value: _formatFieldValue(key, val) });
        }
        usedKeys[key] = true;
      });
      if (fields.length > 0) sections.push({ label: grp.label, fields: fields });
    });

    // Remaining ungrouped fields go into "Additional Details"
    var remaining = [];
    Object.keys(data).forEach(function (key) {
      if (usedKeys[key]) return;
      if (HEADER_KEYS.indexOf(key) !== -1) return;
      if (EXCLUDE_FIELDS.indexOf(key) !== -1) return;
      if (key.indexOf('Signature') !== -1 || key.indexOf('signature') !== -1) return;

      var val = data[key];
      if (val === undefined || val === null || val === '') return;

      if (typeof val === 'object' && !Array.isArray(val)) {
        Object.keys(val).forEach(function (subKey) {
          if (val[subKey]) {
            remaining.push({ label: FIELD_LABELS[subKey] || _humanize(subKey), value: _formatFieldValue(subKey, val[subKey]) });
          }
        });
      } else {
        remaining.push({ label: FIELD_LABELS[key] || _humanize(key), value: _formatFieldValue(key, val) });
      }
    });
    if (remaining.length > 0) sections.push({ label: 'Additional Details', fields: remaining });

    return sections;
  }

  function _formatFieldValue(key, val) {
    if (Array.isArray(val)) return val.join(', ');
    if (SENSITIVE_FIELDS.indexOf(key) !== -1 && val) return _maskSSN(String(val));
    var keyLower = key.toLowerCase();
    if (keyLower.indexOf('date') !== -1 || key === 'submittedAt' || key === 'dob') return _formatDate(val);
    return String(val);
  }

  function _drawFooter(doc, pageNum, totalPages, margin, pageW, pageH) {
    var footerY = pageH - 14;

    // Green accent line
    doc.setDrawColor(22, 163, 74);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 2, margin + 40, footerY - 2);

    // Gray line rest of the way
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin + 40, footerY - 2, pageW - margin, footerY - 2);

    // Left: HIPAA notice
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('CONFIDENTIAL — Protected Health Information (PHI). Do not distribute without authorization.', margin, footerY + 2);

    // Right: page number
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(22, 163, 74);
    var pageText = pageNum + ' / ' + totalPages;
    var tw = doc.getTextWidth(pageText);
    doc.text(pageText, pageW - margin - tw, footerY + 2);

    // Bottom: branding
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text(BRAND.companyName + '  |  ' + BRAND.website + '  |  Generated ' + new Date().toLocaleDateString('en-US'), margin, footerY + 6);
  }

  // ──────────────────────────────────────────────
  // DATA HELPERS
  // ──────────────────────────────────────────────

  /**
   * Flatten nested objects into a display-friendly array
   */
  function _flattenData(data) {
    var result = [];
    var keys = Object.keys(data);

    keys.forEach(function (key) {
      var val = data[key];

      if (val && typeof val === 'object' && !Array.isArray(val)) {
        // Nested object — add section header
        result.push({ key: key, label: FIELD_LABELS[key] || _humanize(key), isSection: true });
        Object.keys(val).forEach(function (subKey) {
          result.push({ key: subKey, value: val[subKey], isSection: false });
        });
      } else if (Array.isArray(val)) {
        result.push({ key: key, value: val.join(', '), isSection: false });
      } else {
        result.push({ key: key, value: val, isSection: false });
      }
    });

    return result;
  }

  function _getClientName(data) {
    var first = data.firstName || data.clientFirstName || data.employeeFirstName || '';
    var last = data.lastName || data.clientLastName || data.employeeLastName || '';
    if (first || last) return (last + '_' + first).replace(/[^a-zA-Z0-9_]/g, '');
    return 'Unknown';
  }

  function _humanize(str) {
    return str
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]/g, ' ')
      .replace(/^\s+/, '')
      .replace(/\b\w/g, function (c) { return c.toUpperCase(); })
      .trim();
  }

  function _formatDate(val) {
    if (!val) return '';
    try {
      var d;
      // If date-only string (YYYY-MM-DD), parse as local to avoid timezone shift
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        var parts = val.split('-');
        d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      } else {
        d = new Date(val);
      }
      if (isNaN(d.getTime())) return val;
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return val;
    }
  }

  function _maskSSN(ssn) {
    if (!ssn || ssn.length < 4) return '***-**-****';
    return '***-**-' + ssn.slice(-4);
  }

  // ──────────────────────────────────────────────
  // SYNC QUEUE (for future OneDrive upload)
  // Stores PDF blobs in IndexedDB so they survive
  // page reloads and can be batch-uploaded later.
  // ──────────────────────────────────────────────

  function _storeForSync(formId, stepId, fileName, blob, data) {
    // Store metadata in localStorage queue
    try {
      var queue = JSON.parse(localStorage.getItem('vt_pdf_queue') || '[]');
      var entry = {
        formId: formId,
        stepId: stepId,
        fileName: fileName,
        clientName: _getClientName(data),
        flowId: data._flowId || null,
        createdAt: new Date().toISOString(),
        uploaded: false
      };
      queue.push(entry);
      localStorage.setItem('vt_pdf_queue', JSON.stringify(queue));
    } catch (e) {
      console.warn('VTPdf: queue storage failed', e);
    }

    // Store actual blob in IndexedDB
    _storeBlob(fileName, blob);
  }

  function _storeBlob(fileName, blob) {
    if (!window.indexedDB) return;

    var request = indexedDB.open('VTPdfStore', 1);
    request.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('pdfs')) {
        db.createObjectStore('pdfs', { keyPath: 'fileName' });
      }
    };
    request.onsuccess = function (e) {
      var db = e.target.result;
      var tx = db.transaction('pdfs', 'readwrite');
      tx.objectStore('pdfs').put({ fileName: fileName, blob: blob, storedAt: new Date().toISOString() });
    };
  }

  /**
   * Get all queued PDFs (for OneDrive bulk upload later)
   */
  function getQueue() {
    try {
      return JSON.parse(localStorage.getItem('vt_pdf_queue') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Get a stored PDF blob by filename
   */
  function getBlob(fileName) {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) return reject(new Error('IndexedDB not available'));

      var request = indexedDB.open('VTPdfStore', 1);
      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains('pdfs')) {
          db.createObjectStore('pdfs', { keyPath: 'fileName' });
        }
      };
      request.onsuccess = function (e) {
        var db = e.target.result;
        var tx = db.transaction('pdfs', 'readonly');
        var get = tx.objectStore('pdfs').get(fileName);
        get.onsuccess = function () {
          resolve(get.result ? get.result.blob : null);
        };
        get.onerror = function () { reject(get.error); };
      };
      request.onerror = function () { reject(request.error); };
    });
  }

  /**
   * Upload all queued PDFs to OneDrive (called when Azure is connected)
   */
  function uploadQueue() {
    if (typeof VTOneDrive === 'undefined' || !VTOneDrive.isReady()) {
      console.log('VTPdf: OneDrive not connected. PDFs remain queued locally.');
      return Promise.resolve(false);
    }

    var queue = getQueue().filter(function (q) { return !q.uploaded; });
    if (queue.length === 0) return Promise.resolve(true);

    console.log('VTPdf: Uploading ' + queue.length + ' queued PDFs to OneDrive...');

    var uploads = queue.map(function (entry) {
      return getBlob(entry.fileName).then(function (blob) {
        if (!blob) return;
        // Use OneDrive sync to upload
        var flow = entry.flowId ? VTFlow.getFlow(entry.flowId) : null;
        var folderPath = 'VitalTouch/Clients/' + entry.clientName.replace('_', ', ') + '/' + _getSubFolder(entry.stepId);

        return VTOneDrive._uploadFile(folderPath, entry.fileName, blob).then(function () {
          entry.uploaded = true;
        });
      });
    });

    return Promise.all(uploads).then(function () {
      localStorage.setItem('vt_pdf_queue', JSON.stringify(getQueue().map(function (q) {
        var match = queue.find(function (u) { return u.fileName === q.fileName; });
        return match || q;
      })));
      console.log('VTPdf: Upload complete.');
      return true;
    });
  }

  function _getSubFolder(stepId) {
    var onboarding = ['C11', 'C21', 'C22', 'C23', 'C24', 'C12'];
    var monitoring = ['C41', 'C42', 'C42C'];
    if (onboarding.indexOf(stepId) !== -1) return 'Onboarding';
    if (monitoring.indexOf(stepId) !== -1) return 'Monitoring';
    return 'Other';
  }

  // ──────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────
  return {
    generate: generate,
    getQueue: getQueue,
    getBlob: getBlob,
    uploadQueue: uploadQueue
  };
})();
