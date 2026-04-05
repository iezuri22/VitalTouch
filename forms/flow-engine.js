/**
 * VitalTouch Flow Engine v1.0
 * Tracks client (and future staff/training/incident) flows
 * through form completion, approval gates, and recurring tasks.
 *
 * Storage: localStorage key "vt_flows"
 * Each flow instance = one client's lifecycle from intake to discharge.
 */

const VTFlow = (function () {
  'use strict';

  // ──────────────────────────────────────────────
  // CLIENT FLOW TEMPLATE
  // ──────────────────────────────────────────────
  const FLOW_TEMPLATES = {
    client: {
      name: 'Client Onboarding & Monitoring',
      phases: [
        {
          id: 'onboarding',
          name: 'Onboarding',
          steps: [
            {
              id: 'C11',
              formId: 'C.11',
              name: 'Client Intake Form',
              file: 'C11_Client_Intake_Form.html',
              type: 'auto',        // auto-advance on submit
              required: true
            },
            {
              id: 'C21',
              formId: 'C.21',
              name: 'Client Assessment Packet',
              file: 'C21_Client_Assessment_Packet.html',
              type: 'approval',    // needs manual approval after form submit
              approvalLabel: 'Supervisor Review',
              required: true
            },
            {
              id: 'C22',
              formId: 'C.22',
              name: 'Home Risk Assessment',
              file: 'C22_Home_Risk_Assessment.html',
              type: 'auto',
              required: true
            },
            {
              id: 'C23',
              formId: 'C.23',
              name: 'Physical Health Assessment',
              file: 'C23_Physical_Health_Assessment.html',
              type: 'auto',
              required: true
            },
            {
              id: 'C24',
              formId: 'C.24',
              name: 'Plan of Care',
              file: 'C24_Plan_of_Care.html',
              type: 'approval',
              approvalLabel: 'Supervisor Sign-Off',
              required: true
            },
            {
              id: 'C12',
              formId: 'C.12',
              name: 'Client Service Agreement',
              file: 'C12_Client_Service_Agreement.html',
              type: 'auto',
              required: true
            }
          ]
        },
        {
          id: 'active',
          name: 'Active Monitoring',
          steps: [
            {
              id: 'C41',
              formId: 'C.41',
              name: 'Monthly Contact Log',
              file: 'C41_Client_Monthly_Contact_Log.html',
              type: 'recurring',
              interval: 'monthly',
              required: true
            },
            {
              id: 'C42C',
              formId: 'C.42C',
              name: 'FHCA Quarterly Visit',
              file: 'C42C_FHCA_Quarterly_Visit.html',
              type: 'recurring',
              interval: 'quarterly',
              required: true
            },
            {
              id: 'C42',
              formId: 'C.42',
              name: 'Semi-Annual Visit',
              file: 'C42_Client_Semi_Annual_Visit.html',
              type: 'recurring',
              interval: 'semi-annual',
              required: true
            }
          ]
        },
        {
          id: 'exit',
          name: 'Discharge',
          steps: [
            {
              id: 'C43',
              formId: 'C.43',
              name: 'Client Discharge Form',
              file: 'C43_Client_Discharge_Form.html',
              type: 'approval',
              approvalLabel: 'CEO Approval',
              required: true
            }
          ]
        }
      ],
      // Incident reports can be filed at any time — not part of linear flow
      adHocForms: [
        {
          id: 'C44',
          formId: 'C.44',
          name: 'Incident Report',
          file: 'C44_Incident_Report_Form.html'
        }
      ]
    }
  };

  // ──────────────────────────────────────────────
  // STORAGE HELPERS
  // ──────────────────────────────────────────────
  const STORAGE_KEY = 'vt_flows';

  function loadAll() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) {
      console.error('VTFlow: failed to load flows', e);
      return {};
    }
  }

  function saveAll(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('VTFlow: failed to save flows', e);
    }
  }

  // ──────────────────────────────────────────────
  // FLOW INSTANCE MANAGEMENT
  // ──────────────────────────────────────────────

  /**
   * Create a new flow instance (e.g., when a new client intake is started)
   * @param {string} flowType - 'client' | 'staff' | 'training' | 'incident'
   * @param {object} entity - { id, firstName, lastName, ... } identifying the person
   * @returns {object} the new flow instance
   */
  function createFlow(flowType, entity) {
    const template = FLOW_TEMPLATES[flowType];
    if (!template) throw new Error('Unknown flow type: ' + flowType);

    const db = loadAll();
    const flowId = flowType.toUpperCase() + '-' + Date.now().toString(36).toUpperCase();

    const steps = {};
    template.phases.forEach(function (phase) {
      phase.steps.forEach(function (step) {
        steps[step.id] = {
          status: 'pending',        // pending | submitted | awaiting_approval | approved | overdue
          submittedAt: null,
          submissionId: null,
          approvedAt: null,
          approvedBy: null,
          formData: null,
          oneDrivePath: null,       // set after sync
          notes: '',
          // For recurring steps
          history: step.type === 'recurring' ? [] : undefined,
          nextDue: step.type === 'recurring' ? null : undefined
        };
      });
    });

    // Mark the first step as the current step
    const firstStepId = template.phases[0].steps[0].id;

    const flow = {
      flowId: flowId,
      flowType: flowType,
      entityId: entity.id || flowId,
      entity: {
        firstName: entity.firstName || '',
        lastName: entity.lastName || '',
        phone: entity.phone || '',
        email: entity.email || '',
        medicaidNumber: entity.medicaidNumber || ''
      },
      status: 'in_progress',       // in_progress | active | discharged | on_hold
      currentPhase: 'onboarding',
      currentStep: firstStepId,
      steps: steps,
      adHocSubmissions: [],         // incident reports etc.
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      oneDriveFolder: null          // root folder path in OneDrive
    };

    db[flowId] = flow;
    saveAll(db);

    // Fire event
    _dispatch('flow:created', { flowId: flowId, flowType: flowType, entity: entity });

    return flow;
  }

  /**
   * Record that a form was submitted for a given flow step
   */
  function recordSubmission(flowId, stepId, submissionData) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);

    const step = flow.steps[stepId];
    if (!step) throw new Error('Step not found: ' + stepId);

    const template = _getStepTemplate(flow.flowType, stepId);

    if (template.type === 'recurring') {
      // Push to history for recurring steps
      step.history.push({
        submissionId: submissionData.submissionId,
        submittedAt: new Date().toISOString(),
        formData: submissionData
      });
      step.status = 'submitted';
      // Calculate next due date
      step.nextDue = _calcNextDue(template.interval);
    } else {
      step.submissionId = submissionData.submissionId;
      step.submittedAt = new Date().toISOString();
      step.formData = submissionData;

      if (template.type === 'approval') {
        step.status = 'awaiting_approval';
      } else {
        step.status = 'approved'; // auto-advance
      }
    }

    flow.updatedAt = new Date().toISOString();

    // Check if onboarding is complete BEFORE advancing
    // (advancing may change currentPhase prematurely)
    var wasOnboarding = flow.currentPhase === 'onboarding';
    var onboardingComplete = wasOnboarding && _isPhaseComplete(flow, 'onboarding');

    // Auto-advance to next step if this was an auto-type
    if (template.type === 'auto') {
      _advanceFlow(flow);
    }

    // Transition to active if onboarding just completed
    if (onboardingComplete) {
      flow.currentPhase = 'active';
      flow.currentStep = 'C41'; // first monitoring step
      flow.status = 'active';
      _initRecurringDates(flow);
    }

    saveAll(db);

    _dispatch('step:submitted', {
      flowId: flowId,
      stepId: stepId,
      status: step.status,
      needsApproval: template.type === 'approval'
    });

    // Trigger OneDrive sync if available
    if (typeof VTOneDrive !== 'undefined') {
      VTOneDrive.syncSubmission(flow, stepId, submissionData);
    }

    return step;
  }

  /**
   * Approve a step that's awaiting approval
   */
  function approveStep(flowId, stepId, approverName, notes) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);

    const step = flow.steps[stepId];
    if (!step || step.status !== 'awaiting_approval') {
      throw new Error('Step ' + stepId + ' is not awaiting approval');
    }

    step.status = 'approved';
    step.approvedAt = new Date().toISOString();
    step.approvedBy = approverName || 'CEO';
    if (notes) step.notes = notes;

    flow.updatedAt = new Date().toISOString();

    // Check completion before advancing
    var wasOnboarding = flow.currentPhase === 'onboarding';
    var onboardingComplete = wasOnboarding && _isPhaseComplete(flow, 'onboarding');

    // Advance to next step
    _advanceFlow(flow);

    // Transition to active if onboarding just completed
    if (onboardingComplete) {
      flow.currentPhase = 'active';
      flow.currentStep = 'C41';
      flow.status = 'active';
      _initRecurringDates(flow);
    }

    saveAll(db);

    _dispatch('step:approved', { flowId: flowId, stepId: stepId, approvedBy: step.approvedBy });

    return step;
  }

  /**
   * Reject / send back a step
   */
  function rejectStep(flowId, stepId, reason) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);

    const step = flow.steps[stepId];
    step.status = 'pending';
    step.submittedAt = null;
    step.submissionId = null;
    step.formData = null;
    step.notes = 'REJECTED: ' + (reason || 'No reason given');

    flow.updatedAt = new Date().toISOString();
    saveAll(db);

    _dispatch('step:rejected', { flowId: flowId, stepId: stepId, reason: reason });
    return step;
  }

  /**
   * File an ad-hoc form (e.g., incident report)
   */
  function recordAdHoc(flowId, formId, submissionData) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);

    flow.adHocSubmissions.push({
      formId: formId,
      submissionId: submissionData.submissionId,
      submittedAt: new Date().toISOString(),
      formData: submissionData
    });

    flow.updatedAt = new Date().toISOString();
    saveAll(db);

    _dispatch('adhoc:submitted', { flowId: flowId, formId: formId });

    if (typeof VTOneDrive !== 'undefined') {
      VTOneDrive.syncSubmission(flow, formId, submissionData);
    }
  }

  /**
   * Put a flow on hold
   */
  function holdFlow(flowId, reason) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);
    flow.status = 'on_hold';
    flow.updatedAt = new Date().toISOString();
    flow.steps[flow.currentStep].notes += ' [ON HOLD: ' + (reason || '') + ']';
    saveAll(db);
    _dispatch('flow:hold', { flowId: flowId });
  }

  /**
   * Resume a held flow
   */
  function resumeFlow(flowId) {
    const db = loadAll();
    const flow = db[flowId];
    if (!flow) throw new Error('Flow not found: ' + flowId);
    flow.status = flow.currentPhase === 'active' ? 'active' : 'in_progress';
    flow.updatedAt = new Date().toISOString();
    saveAll(db);
    _dispatch('flow:resumed', { flowId: flowId });
  }

  // ──────────────────────────────────────────────
  // QUERY HELPERS
  // ──────────────────────────────────────────────

  function getFlow(flowId) {
    return loadAll()[flowId] || null;
  }

  function getAllFlows(flowType) {
    const db = loadAll();
    return Object.values(db).filter(function (f) {
      return !flowType || f.flowType === flowType;
    });
  }

  function getFlowsByStatus(status) {
    return Object.values(loadAll()).filter(function (f) {
      return f.status === status;
    });
  }

  /**
   * Find a flow by client name (partial match)
   */
  function findByName(name) {
    const lower = name.toLowerCase();
    return Object.values(loadAll()).filter(function (f) {
      var full = (f.entity.firstName + ' ' + f.entity.lastName).toLowerCase();
      return full.indexOf(lower) !== -1;
    });
  }

  /**
   * Get the template definition for a flow type
   */
  function getTemplate(flowType) {
    return FLOW_TEMPLATES[flowType] || null;
  }

  /**
   * Get flow progress as a percentage
   */
  function getProgress(flowId) {
    const flow = loadAll()[flowId];
    if (!flow) return 0;

    const template = FLOW_TEMPLATES[flow.flowType];
    const onboardingSteps = template.phases.find(function (p) { return p.id === 'onboarding'; }).steps;
    let completed = 0;

    onboardingSteps.forEach(function (s) {
      if (flow.steps[s.id].status === 'approved') completed++;
    });

    return Math.round((completed / onboardingSteps.length) * 100);
  }

  /**
   * Get all steps that need approval across all flows
   */
  function getPendingApprovals() {
    const results = [];
    const db = loadAll();

    Object.values(db).forEach(function (flow) {
      Object.keys(flow.steps).forEach(function (stepId) {
        if (flow.steps[stepId].status === 'awaiting_approval') {
          results.push({
            flowId: flow.flowId,
            stepId: stepId,
            clientName: flow.entity.firstName + ' ' + flow.entity.lastName,
            stepName: _getStepTemplate(flow.flowType, stepId).name,
            approvalLabel: _getStepTemplate(flow.flowType, stepId).approvalLabel,
            submittedAt: flow.steps[stepId].submittedAt
          });
        }
      });
    });

    return results;
  }

  /**
   * Get overdue recurring tasks
   */
  function getOverdueRecurring() {
    const results = [];
    const now = new Date().toISOString();
    const db = loadAll();

    Object.values(db).forEach(function (flow) {
      if (flow.status !== 'active') return;
      Object.keys(flow.steps).forEach(function (stepId) {
        var step = flow.steps[stepId];
        if (step.nextDue && step.nextDue < now) {
          results.push({
            flowId: flow.flowId,
            stepId: stepId,
            clientName: flow.entity.firstName + ' ' + flow.entity.lastName,
            stepName: _getStepTemplate(flow.flowType, stepId).name,
            dueDate: step.nextDue
          });
        }
      });
    });

    return results;
  }

  /**
   * Dashboard summary stats
   */
  function getDashboardStats() {
    const flows = Object.values(loadAll());
    return {
      totalClients: flows.filter(function (f) { return f.flowType === 'client'; }).length,
      inOnboarding: flows.filter(function (f) { return f.status === 'in_progress'; }).length,
      active: flows.filter(function (f) { return f.status === 'active'; }).length,
      onHold: flows.filter(function (f) { return f.status === 'on_hold'; }).length,
      discharged: flows.filter(function (f) { return f.status === 'discharged'; }).length,
      pendingApprovals: getPendingApprovals().length,
      overdueItems: getOverdueRecurring().length
    };
  }

  // ──────────────────────────────────────────────
  // INTERNAL HELPERS
  // ──────────────────────────────────────────────

  function _getStepTemplate(flowType, stepId) {
    const template = FLOW_TEMPLATES[flowType];
    for (var i = 0; i < template.phases.length; i++) {
      for (var j = 0; j < template.phases[i].steps.length; j++) {
        if (template.phases[i].steps[j].id === stepId) {
          return template.phases[i].steps[j];
        }
      }
    }
    return null;
  }

  function _advanceFlow(flow) {
    const template = FLOW_TEMPLATES[flow.flowType];
    const allSteps = [];
    template.phases.forEach(function (phase) {
      phase.steps.forEach(function (step) {
        allSteps.push({ phaseId: phase.id, step: step });
      });
    });

    // Find current step index
    const currentIdx = allSteps.findIndex(function (s) { return s.step.id === flow.currentStep; });

    // Find next incomplete step
    for (var i = currentIdx + 1; i < allSteps.length; i++) {
      var stepState = flow.steps[allSteps[i].step.id];
      if (stepState.status !== 'approved') {
        flow.currentStep = allSteps[i].step.id;
        flow.currentPhase = allSteps[i].phaseId;
        return;
      }
    }
  }

  function _isPhaseComplete(flow, phaseId) {
    const template = FLOW_TEMPLATES[flow.flowType];
    const phase = template.phases.find(function (p) { return p.id === phaseId; });
    if (!phase) return false;

    return phase.steps.every(function (step) {
      return flow.steps[step.id].status === 'approved';
    });
  }

  function _initRecurringDates(flow) {
    const template = FLOW_TEMPLATES[flow.flowType];
    const activePhase = template.phases.find(function (p) { return p.id === 'active'; });
    if (!activePhase) return;

    const now = new Date();
    activePhase.steps.forEach(function (step) {
      if (step.type === 'recurring') {
        flow.steps[step.id].nextDue = _calcNextDue(step.interval, now);
        flow.steps[step.id].status = 'pending';
      }
    });
  }

  function _calcNextDue(interval, from) {
    const d = from ? new Date(from) : new Date();
    switch (interval) {
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + 3);
        break;
      case 'semi-annual':
        d.setMonth(d.getMonth() + 6);
        break;
      case 'annual':
        d.setFullYear(d.getFullYear() + 1);
        break;
    }
    return d.toISOString();
  }

  // Simple event system for UI updates
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
  // FORM INTEGRATION HELPER
  // Called from inside forms after submission
  // ──────────────────────────────────────────────

  /**
   * Auto-detect flow from URL param or find by client name.
   * Usage in forms: VTFlow.handleFormSubmit('C.11', formData)
   */
  function handleFormSubmit(formId, submissionData) {
    // Check URL for flowId
    const params = new URLSearchParams(window.location.search);
    const flowId = params.get('flowId');

    if (flowId) {
      // Direct flow link — record submission
      const stepId = _formIdToStepId(formId);
      if (stepId) {
        recordSubmission(flowId, stepId, submissionData);
      }
      return flowId;
    }

    // If this is an intake form (C.11), create a new flow
    if (formId === 'C.11') {
      const flow = createFlow('client', {
        firstName: submissionData.firstName || '',
        lastName: submissionData.lastName || '',
        phone: submissionData.phone || '',
        email: submissionData.email || '',
        medicaidNumber: submissionData.medicaidNumber || ''
      });
      // Record the intake as completed
      recordSubmission(flow.flowId, 'C11', submissionData);
      return flow.flowId;
    }

    return null;
  }

  function _formIdToStepId(formId) {
    // Convert form IDs like 'C.11' to step IDs like 'C11'
    return formId.replace('.', '');
  }

  /**
   * Generate a pre-filled URL for the next step in a flow
   */
  function getNextStepUrl(flowId) {
    const flow = getFlow(flowId);
    if (!flow) return null;

    const template = _getStepTemplate(flow.flowType, flow.currentStep);
    if (!template) return null;

    return template.file + '?flowId=' + encodeURIComponent(flowId) +
      '&clientName=' + encodeURIComponent(flow.entity.firstName + ' ' + flow.entity.lastName);
  }

  // ──────────────────────────────────────────────
  // PUBLIC API
  // ──────────────────────────────────────────────
  return {
    // Flow management
    createFlow: createFlow,
    recordSubmission: recordSubmission,
    approveStep: approveStep,
    rejectStep: rejectStep,
    recordAdHoc: recordAdHoc,
    holdFlow: holdFlow,
    resumeFlow: resumeFlow,

    // Queries
    getFlow: getFlow,
    getAllFlows: getAllFlows,
    getFlowsByStatus: getFlowsByStatus,
    findByName: findByName,
    getTemplate: getTemplate,
    getProgress: getProgress,
    getPendingApprovals: getPendingApprovals,
    getOverdueRecurring: getOverdueRecurring,
    getDashboardStats: getDashboardStats,

    // Form integration
    handleFormSubmit: handleFormSubmit,
    getNextStepUrl: getNextStepUrl,

    // Events
    on: on,

    // Constants
    TEMPLATES: FLOW_TEMPLATES
  };
})();
