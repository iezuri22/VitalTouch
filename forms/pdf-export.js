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
  // DRAWING HELPERS
  // ──────────────────────────────────────────────

  function _drawHeader(doc, formTitle, formId, data, margin, contentW, pageW) {
    var y = 0;

    // Green header bar
    doc.setFillColor.apply(doc, BRAND.green);
    doc.rect(0, 0, pageW, 32, 'F');

    // Company name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor.apply(doc, BRAND.white);
    doc.text(BRAND.companyName, margin, 14);

    // Company info line
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(BRAND.address + '  |  ' + BRAND.phone + '  |  ' + BRAND.website, margin, 22);

    // Form title area
    y = 40;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor.apply(doc, BRAND.text);
    doc.text(formTitle, margin, y);

    // Form ID + submission info
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, BRAND.textLight);

    var metaLine = 'Form: ' + formId;
    if (data.submissionId) metaLine += '  |  Submission: ' + data.submissionId;
    if (data.submittedAt) metaLine += '  |  Date: ' + _formatDate(data.submittedAt);
    doc.text(metaLine, margin, y);

    // Divider line
    y += 5;
    doc.setDrawColor.apply(doc, BRAND.green);
    doc.setLineWidth(0.8);
    doc.line(margin, y, margin + contentW, y);

    y += 8;
    return y;
  }

  function _drawFormData(doc, data, margin, contentW, startY, pageH) {
    var y = startY;
    var bottomMargin = 30; // reserve for footer
    var lineHeight = 6;
    var sectionGap = 4;

    var fields = _flattenData(data);

    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];

      // Skip excluded fields
      if (EXCLUDE_FIELDS.indexOf(field.key) !== -1) continue;

      // Check if we need a new page
      if (y + lineHeight + 4 > pageH - bottomMargin) {
        doc.addPage();
        y = 20;
      }

      // Section headers (for nested objects like emergencyContact, physician)
      if (field.isSection) {
        y += sectionGap;
        doc.setFillColor.apply(doc, BRAND.greenLight);
        doc.roundedRect(margin, y - 4, contentW, 7, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor.apply(doc, BRAND.greenDark);
        doc.text(field.label, margin + 3, y + 1);
        y += 8;
        continue;
      }

      // Field label
      var label = FIELD_LABELS[field.key] || _humanize(field.key);
      var value = field.value;

      // Mask sensitive fields
      if (SENSITIVE_FIELDS.indexOf(field.key) !== -1 && value) {
        value = _maskSSN(value);
      }

      // Skip empty values
      if (!value && value !== 0 && value !== false) continue;

      // Format date values
      if (field.key.toLowerCase().indexOf('date') !== -1 || field.key === 'submittedAt' || field.key === 'dob') {
        value = _formatDate(value);
      }

      // Draw alternating row background
      if (i % 2 === 0) {
        doc.setFillColor.apply(doc, BRAND.bg);
        doc.rect(margin, y - 4, contentW, lineHeight + 1, 'F');
      }

      // Label (left column)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, BRAND.textLight);
      doc.text(label, margin + 2, y);

      // Value (right column) — handle long text with wrapping
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, BRAND.text);

      var valueStr = String(value);
      var labelColW = 55;
      var valueColW = contentW - labelColW - 4;
      var valueX = margin + labelColW;

      if (valueStr.length > 60) {
        // Wrap long text
        var lines = doc.splitTextToSize(valueStr, valueColW);
        doc.text(lines, valueX, y);
        y += (lines.length - 1) * (lineHeight - 1);
      } else {
        doc.text(valueStr, valueX, y);
      }

      y += lineHeight;
    }

    // Signature indicator
    if (data.clientSignature || data.witnessSignature || data.staffSignature || data.supervisorSignature) {
      y += 6;
      if (y + 20 > pageH - bottomMargin) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor.apply(doc, BRAND.greenLight);
      doc.roundedRect(margin, y - 4, contentW, 7, 1, 1, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor.apply(doc, BRAND.greenDark);
      doc.text('Signatures', margin + 3, y + 1);
      y += 10;

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor.apply(doc, BRAND.textLight);
      doc.text('Digital signatures captured electronically at time of submission.', margin + 2, y);
      y += lineHeight;

      var sigs = ['clientSignature', 'witnessSignature', 'staffSignature', 'supervisorSignature'];
      sigs.forEach(function (sigKey) {
        if (data[sigKey]) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor.apply(doc, BRAND.text);
          var sigLabel = FIELD_LABELS[sigKey] || _humanize(sigKey);
          doc.text(sigLabel + ':  [Signed electronically]', margin + 2, y);
          y += lineHeight;
        }
      });
    }

    return y;
  }

  function _drawFooter(doc, pageNum, totalPages, margin, pageW, pageH) {
    var footerY = pageH - 12;

    // Divider
    doc.setDrawColor.apply(doc, BRAND.border);
    doc.setLineWidth(0.3);
    doc.line(margin, footerY - 3, pageW - margin, footerY - 3);

    // Left: confidentiality notice
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor.apply(doc, BRAND.textLight);
    doc.text('CONFIDENTIAL — Protected Health Information (PHI) per HIPAA. Do not distribute without authorization.', margin, footerY);

    // Right: page number
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    var pageText = 'Page ' + pageNum + ' of ' + totalPages;
    var tw = doc.getTextWidth(pageText);
    doc.text(pageText, pageW - margin - tw, footerY);

    // Bottom line: company
    doc.setFontSize(7);
    doc.text(BRAND.companyName + '  |  Generated ' + new Date().toLocaleDateString('en-US'), margin, footerY + 4);
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
      var d = new Date(val);
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
