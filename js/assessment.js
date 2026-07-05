/* ============================================
   CARE READINESS ASSESSMENT — quiz + report
   Question ids/values MUST mirror the server's
   assessment_v1 bank (vitaltouch-ops
   src/lib/funnel/questions.ts). Scoring happens
   server-side only — this file never sees points.
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : 'https://vitaltouch-ops.vercel.app';
    var CONSENT_VERSION = 'assessment_v1_2026-07';
    var EMAIL_CONSENT_VERSION = 'assessment_email_v1_2026-07';
    var STORE_KEY = 'vt_cra';          // in-progress answers
    var REPORT_KEY = 'vt_cra_report';  // unlocked report snapshot
    var EMAIL_KEY = 'vt_email';        // captured before the quiz starts

    // prompt: as shown to family members; selfPrompt: when they chose "Myself"
    var QUESTIONS = [
        { id: 'relationship', kind: 'single', prompt: 'Who are you looking into care for?',
          options: [
            { value: 'parent', label: 'My parent' },
            { value: 'spouse', label: 'My spouse or partner' },
            { value: 'self', label: 'Myself' },
            { value: 'other', label: 'Another relative or friend' }
          ] },
        { id: 'timeline', kind: 'single', prompt: 'When do you feel help is needed?',
          help: 'There’s no wrong answer — this just helps us point you to the right next step.',
          options: [
            { value: 'now', label: 'Right away — something has to change' },
            { value: 'weeks', label: 'In the next few weeks' },
            { value: 'months', label: 'In the next few months' },
            { value: 'researching', label: 'Just starting to research' }
          ] },
        { id: 'adl_personal', kind: 'single',
          prompt: 'How are they managing personal care — bathing, dressing, grooming?',
          selfPrompt: 'How are you managing personal care — bathing, dressing, grooming?',
          options: [
            { value: 'independent', label: 'Fully on their own', selfLabel: 'Fully on my own' },
            { value: 'reminders', label: 'Mostly fine, but slipping a little' },
            { value: 'some_help', label: 'Needs hands-on help with some of it', selfLabel: 'I need hands-on help with some of it' },
            { value: 'depends', label: 'Depends on someone for most of it', selfLabel: 'I depend on someone for most of it' }
          ] },
        { id: 'adl_household', kind: 'single',
          prompt: 'What about the household — meals, laundry, cleaning, errands?',
          options: [
            { value: 'independent', label: 'Handles it all', selfLabel: 'I handle it all' },
            { value: 'slipping', label: 'Keeping up, but the house shows it' },
            { value: 'some_help', label: 'Someone already helps with parts of it' },
            { value: 'cannot', label: 'Can’t manage it without help' }
          ] },
        { id: 'falls', kind: 'single',
          prompt: 'Have they fallen in the past six months?',
          selfPrompt: 'Have you fallen in the past six months?',
          options: [
            { value: 'none', label: 'No falls' },
            { value: 'one_ok', label: 'One fall, no real injury' },
            { value: 'multiple', label: 'More than one fall' },
            { value: 'injury', label: 'A fall that caused injury or an ER visit' }
          ] },
        { id: 'mobility', kind: 'single',
          prompt: 'How steady are they on their feet?',
          selfPrompt: 'How steady are you on your feet?',
          options: [
            { value: 'steady', label: 'Steady — gets around fine', selfLabel: 'Steady — I get around fine' },
            { value: 'furniture', label: 'Holds onto furniture or walls sometimes', selfLabel: 'I hold onto furniture or walls sometimes' },
            { value: 'walker', label: 'Uses a cane or walker, needs a watchful eye', selfLabel: 'I use a cane or walker' },
            { value: 'unsafe', label: 'Can’t move around safely alone', selfLabel: 'I can’t move around safely alone' }
          ] },
        { id: 'medications', kind: 'single',
          prompt: 'How are medications going?',
          options: [
            { value: 'independent', label: 'Takes them correctly on their own', selfLabel: 'I take them correctly on my own' },
            { value: 'reminders', label: 'Needs reminders or a pill organizer', selfLabel: 'I need reminders or a pill organizer' },
            { value: 'misses', label: 'Sometimes misses doses or doubles up', selfLabel: 'I sometimes miss doses or double up' },
            { value: 'managed', label: 'Someone else has to handle them entirely' },
            { value: 'none', label: 'Doesn’t take regular medications', selfLabel: 'I don’t take regular medications' }
          ] },
        { id: 'memory_daily', kind: 'single',
          prompt: 'Have you noticed changes in memory?',
          options: [
            { value: 'normal', label: 'Nothing beyond normal aging' },
            { value: 'repeats', label: 'Repeats questions, misses appointments', selfLabel: 'I repeat questions or miss appointments' },
            { value: 'forgets_tasks', label: 'Forgets meals, bills, or the stove', selfLabel: 'I forget meals, bills, or the stove' },
            { value: 'confusion', label: 'Gets confused about where they are or who people are', selfLabel: 'I get confused about where I am or who people are' }
          ] },
        { id: 'memory_safety', kind: 'single',
          prompt: 'Any moments that worried you about judgment or safety?',
          options: [
            { value: 'none', label: 'No, nothing like that' },
            { value: 'occasional', label: 'A few questionable decisions lately' },
            { value: 'incidents', label: 'Left the stove on, fallen for a scam, or similar' },
            { value: 'wandered', label: 'Has wandered or gotten lost', selfLabel: 'I have gotten lost' }
          ] },
        { id: 'alone_time', kind: 'single',
          prompt: 'How much of the day are they alone?',
          selfPrompt: 'How much of the day are you alone?',
          options: [
            { value: 'rarely', label: 'Rarely — someone is usually around' },
            { value: 'few_hours', label: 'A few hours a day' },
            { value: 'most_day', label: 'Most of the day' },
            { value: 'day_night', label: 'Most of the day and overnight' }
          ] },
        { id: 'getting_out', kind: 'single',
          prompt: 'How often do they get out or see people?',
          selfPrompt: 'How often do you get out or see people?',
          options: [
            { value: 'active', label: 'Still drives or gets out regularly', selfLabel: 'I still drive or get out regularly' },
            { value: 'with_help', label: 'Gets out when someone takes them', selfLabel: 'I get out when someone takes me' },
            { value: 'rarely', label: 'Rarely leaves the house anymore', selfLabel: 'I rarely leave the house anymore' },
            { value: 'homebound', label: 'Homebound, and visitors are rare' }
          ] },
        { id: 'current_help', kind: 'single',
          prompt: 'Who helps out today?',
          options: [
            { value: 'family_daily', label: 'Family nearby, involved almost daily' },
            { value: 'family_stretched', label: 'Family helps, but everyone is stretched thin' },
            { value: 'distant', label: 'Family lives far away — help is occasional' },
            { value: 'none', label: 'No reliable help right now' }
          ] },
        { id: 'caregiver_strain', kind: 'single',
          prompt: 'If a family member is the main caregiver — how are they holding up?',
          options: [
            { value: 'na', label: 'No family caregiver in the picture' },
            { value: 'fine', label: 'Doing okay' },
            { value: 'tired', label: 'Tired, but managing' },
            { value: 'burning_out', label: 'Running on empty' },
            { value: 'crisis', label: 'At a breaking point — this can’t continue' }
          ] },
        { id: 'recent_events', kind: 'multi',
          prompt: 'Has any of this happened in the past few months?',
          help: 'Check anything that applies, then continue.',
          options: [
            { value: 'hospitalization', label: 'A hospital stay' },
            { value: 'er_visit', label: 'An ER visit' },
            { value: 'new_diagnosis', label: 'A new diagnosis (dementia, Parkinson’s, stroke, etc.)' },
            { value: 'lost_caregiver', label: 'Lost a spouse or the person who was helping' },
            { value: 'weight_loss', label: 'Noticeable weight loss or not eating well' },
            { value: 'none', label: 'None of these' }
          ] }
    ];

    // ---- State ------------------------------------------------------------
    var state = load(STORE_KEY) || { answers: {}, idx: 0, started: false };
    var savedReport = load(REPORT_KEY);

    function load(key) {
        try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    }
    function save(key, val) {
        try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {}
    }
    function isSelf() { return state.answers.relationship === 'self'; }
    function track(kind, meta) {
        if (window.vtTrack) window.vtTrack(kind, meta);
    }

    // ---- Screens ----------------------------------------------------------
    var screens = {
        intro: document.getElementById('introScreen'),
        email: document.getElementById('emailScreen'),
        quiz: document.getElementById('quizScreen'),
        gate: document.getElementById('gateScreen'),
        report: document.getElementById('reportScreen')
    };
    function storedEmail() {
        try { return localStorage.getItem(EMAIL_KEY) || ''; } catch (e) { return ''; }
    }
    function show(name) {
        for (var k in screens) screens[k].classList.toggle('active', k === name);
        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    // ---- Intro ------------------------------------------------------------
    var resumeRow = document.getElementById('resumeRow');
    var resumeLink = document.getElementById('resumeLink');
    if (savedReport && savedReport.report) {
        resumeLink.textContent = 'View your saved report from your last visit →';
        resumeRow.style.display = 'block';
        resumeLink.addEventListener('click', function(e) {
            e.preventDefault();
            renderReport(savedReport.report);
            show('report');
        });
    } else if (state.started && Object.keys(state.answers).length > 0) {
        resumeLink.textContent = 'Pick up where you left off (question ' + (state.idx + 1) + ' of ' + QUESTIONS.length + ') →';
        resumeRow.style.display = 'block';
        resumeLink.addEventListener('click', function(e) {
            e.preventDefault();
            if (!storedEmail()) { show('email'); return; }
            show('quiz');
            render();
        });
    }
    // Email comes first — a stressed reader who abandons question 6 is still
    // someone we can help by email.
    document.getElementById('startBtn').addEventListener('click', function() {
        if (!savedReport) { state = { answers: {}, idx: 0, started: false }; save(STORE_KEY, state); }
        if (!storedEmail()) { show('email'); return; }
        show('quiz');
        render();
    });

    var emailForm = document.getElementById('emailForm');
    emailForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        var fd = new FormData(emailForm);
        var email = (fd.get('email') || '').toString().trim();
        var btn = document.getElementById('emailSubmit');
        btn.disabled = true;
        try { localStorage.setItem(EMAIL_KEY, email); } catch (err) {}
        // Best-effort capture: if the network hiccups, the quiz still starts —
        // the email rides along again at the unlock step.
        try {
            await fetch(API_BASE + '/api/public/funnel/email-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    visitorKey: window.vtVisitorKey ? window.vtVisitorKey() : 'v-unknown',
                    consent: true,
                    consentTextVersion: EMAIL_CONSENT_VERSION,
                    company_website: fd.get('company_website') || '',
                    utm: { page: 'assessment-email-gate' },
                    test: new URLSearchParams(location.search).has('test') || undefined
                })
            });
        } catch (err) {}
        btn.disabled = false;
        show('quiz');
        render();
    });

    // ---- Quiz -------------------------------------------------------------
    var qPrompt = document.getElementById('qPrompt');
    var qHelp = document.getElementById('qHelp');
    var qOpts = document.getElementById('qOpts');
    var progressLabel = document.getElementById('progressLabel');
    var progressFill = document.getElementById('progressFill');
    var backBtn = document.getElementById('backBtn');
    var continueBtn = document.getElementById('continueBtn');

    function render() {
        var q = QUESTIONS[state.idx];
        var self = isSelf();
        progressLabel.textContent = 'Question ' + (state.idx + 1) + ' of ' + QUESTIONS.length;
        progressFill.style.width = Math.round((state.idx / QUESTIONS.length) * 100) + '%';
        qPrompt.textContent = (self && q.selfPrompt) ? q.selfPrompt : q.prompt;
        qHelp.textContent = q.help || '';
        qHelp.style.display = q.help ? 'block' : 'none';
        backBtn.style.visibility = state.idx === 0 ? 'hidden' : 'visible';
        continueBtn.style.display = q.kind === 'multi' ? 'inline-block' : 'none';

        qOpts.innerHTML = '';
        var current = state.answers[q.id];
        q.options.forEach(function(o) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cra-opt';
            var selected = q.kind === 'multi'
                ? (Array.isArray(current) && current.indexOf(o.value) !== -1)
                : current === o.value;
            if (selected) btn.classList.add('selected');
            btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
            btn.innerHTML = '<span class="cra-check">✓</span>' + ((self && o.selfLabel) ? o.selfLabel : o.label);
            btn.addEventListener('click', function() { pick(q, o.value, btn); });
            qOpts.appendChild(btn);
        });
        qPrompt.focus();
    }

    function pick(q, value, btn) {
        if (!state.started) {
            state.started = true;
            track('assessment_started');
        }
        if (q.kind === 'multi') {
            var cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            var i = cur.indexOf(value);
            if (i !== -1) { cur.splice(i, 1); }
            else if (value === 'none') { cur = ['none']; }
            else { cur = cur.filter(function(v) { return v !== 'none'; }); cur.push(value); }
            state.answers[q.id] = cur;
            save(STORE_KEY, state);
            render();
            continueBtn.disabled = cur.length === 0;
            return;
        }
        state.answers[q.id] = value;
        save(STORE_KEY, state);
        // brief visual confirmation, then advance
        Array.prototype.forEach.call(qOpts.children, function(c) { c.classList.remove('selected'); });
        btn.classList.add('selected');
        setTimeout(next, 240);
    }

    function next() {
        if (state.idx < QUESTIONS.length - 1) {
            state.idx += 1;
            save(STORE_KEY, state);
            render();
        } else {
            progressFill.style.width = '100%';
            var gateEmail = document.querySelector('#gateForm input[name="email"]');
            if (gateEmail && !gateEmail.value && storedEmail()) gateEmail.value = storedEmail();
            show('gate');
        }
    }
    backBtn.addEventListener('click', function() {
        if (state.idx > 0) { state.idx -= 1; save(STORE_KEY, state); render(); }
    });
    continueBtn.addEventListener('click', function() {
        var q = QUESTIONS[state.idx];
        if (q.kind === 'multi' && (!state.answers[q.id] || state.answers[q.id].length === 0)) {
            state.answers[q.id] = ['none'];
            save(STORE_KEY, state);
        }
        next();
    });

    // ---- Gate → unlock ------------------------------------------------------
    var gateForm = document.getElementById('gateForm');
    var gateError = document.getElementById('gateError');
    gateForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        gateError.style.display = 'none';
        var fd = new FormData(gateForm);
        var btn = document.getElementById('gateSubmit');
        btn.disabled = true;
        btn.textContent = 'Preparing your report…';
        try {
            var res = await fetch(API_BASE + '/api/public/assessments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    answers: state.answers,
                    relationship: state.answers.relationship,
                    visitorKey: window.vtVisitorKey ? window.vtVisitorKey() : 'v-unknown',
                    contact: {
                        name: fd.get('name'),
                        phone: fd.get('phone') || undefined,
                        email: fd.get('email') || undefined,
                        zip: (fd.get('zip') || '').replace(/\D/g, '').slice(0, 5) || undefined
                    },
                    consent: true,
                    consentTextVersion: CONSENT_VERSION,
                    company_website: fd.get('company_website') || '',
                    utm: { page: 'assessment' },
                    // Probe convention: ?test=1 marks the lead is_test (kept
                    // but filtered from the inbox and reporting).
                    test: new URLSearchParams(location.search).has('test') || undefined
                })
            });
            var data = await res.json().catch(function() { return {}; });
            if (!res.ok) throw new Error(data.error || 'failed');
            save(REPORT_KEY, { assessmentId: data.assessmentId, report: data.report, savedAt: new Date().toISOString() });
            try { localStorage.removeItem(STORE_KEY); } catch (err) {}
            renderReport(data.report);
            show('report');
        } catch (err) {
            gateError.textContent = 'Sorry — something went wrong saving your report. Your answers are safe on this device. Please try again in a moment, or call us at (708) 898-8831.';
            gateError.style.display = 'block';
        } finally {
            btn.disabled = false;
            btn.textContent = 'Show my report';
        }
    });

    // ---- Report -------------------------------------------------------------
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"]/g, function(c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }
    function renderReport(r) {
        var h = '';
        h += '<div class="cra-report-head">';
        h += '<div class="cra-band ' + esc(r.band) + '">' + esc(r.bandLabel) + '</div>';
        h += '<h1>' + esc(r.headline) + '</h1>';
        h += '<p class="cra-report-summary">' + esc(r.summary) + '</p>';
        h += '</div>';

        if (r.band === 'urgent') {
            h += '<div class="cra-callout"><strong>Our honest read:</strong> don’t sit on this one. ';
            h += 'Call us at <a href="tel:7088988831">(708) 898-8831</a> — a short conversation today ';
            h += 'costs nothing and usually brings real relief within days.</div>';
        }

        h += '<h2 style="font-size:1.45rem;margin-bottom:4px;">Area by area</h2>';
        (r.domains || []).forEach(function(d) {
            h += '<div class="cra-domain">';
            h += '<div class="cra-domain-top"><h3>' + esc(d.label) + '</h3>';
            h += '<span class="cra-level ' + esc(d.level) + '">' + (d.level === 'low' ? 'Looking good' : d.level === 'moderate' ? 'Worth attention' : 'Needs support') + '</span></div>';
            h += '<div class="cra-bar ' + esc(d.level) + '"><span style="width:' + Math.max(4, Number(d.score) || 0) + '%"></span></div>';
            h += '<p>' + esc(d.summary) + '</p>';
            h += '<p class="cra-suggest"><strong>What helps:</strong> ' + esc(d.suggestion) + '</p>';
            h += '</div>';
        });

        if (r.flagNotes && r.flagNotes.length) {
            h += '<div class="cra-flags"><h2>Worth your attention</h2><ul>';
            r.flagNotes.forEach(function(n) { h += '<li>' + esc(n) + '</li>'; });
            h += '</ul></div>';
        }

        h += '<div class="cra-steps"><h2>Your next steps</h2>';
        (r.nextSteps || []).forEach(function(s, i) {
            h += '<div class="cra-step"><div class="cra-step-num">' + (i + 1) + '</div>';
            h += '<div><h3>' + esc(s.title) + '</h3><p>' + esc(s.body) + '</p></div></div>';
        });
        h += '</div>';

        // Plan suggestion (planning/browsing reports only — server decides)
        if (r.plan) {
            h += '<div class="cra-flags" style="border-color: var(--navy); background: #F4F7FA;">';
            h += '<h2>A plan built for where you are</h2>';
            h += '<p style="font-size:1.02rem; line-height:1.65; margin-bottom:10px;"><strong>' + esc(r.plan.name) + ':</strong> ' + esc(r.plan.blurb) + '</p>';
            h += '<a href="' + esc(r.plan.href) + '" style="font-weight:700;">See how it works &rarr;</a>';
            h += '</div>';
        }

        h += '<div class="cra-report-cta">';
        h += '<a href="tel:7088988831" class="cra-btn-gold">Call (708) 898-8831</a>';
        h += '<a href="consult.html" class="cra-btn-outline">Request a free consultation</a>';
        h += '<button type="button" class="cra-btn-outline" id="downloadBtn">Download PDF</button>';
        h += '</div>';

        h += '<p class="cra-disclaimer">' + esc(r.disclaimer) + '</p>';

        document.getElementById('reportBody').innerHTML = h;
        document.getElementById('printDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        document.getElementById('downloadBtn').addEventListener('click', function() {
            track('report_downloaded');
            window.print();
        });
    }
});
