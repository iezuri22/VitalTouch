/* ============================================
   CARE READINESS ASSESSMENT — quiz + report
   Question ids/values MUST mirror the server's
   assessment_v3 bank (vitaltouch-ops
   src/lib/funnel/questions.ts). Scoring happens
   server-side only — this file never sees points.
   The server drops any answer id it doesn't know,
   so a question added here and not there is
   silently discarded: change both, together.

   v3 (2026-08): eight questions, down from
   seventeen. The count is deliberately never
   shown — no "question 3 of 8" — because a
   running tally is what makes a short form feel
   like a long one. The bar alone carries the
   sense of progress. Follow-up detail is asked
   on consult.html, after they've decided to talk.
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    var API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? 'http://localhost:3000'
        : 'https://vitaltouch-ops.vercel.app';
    var CONSENT_VERSION = 'assessment_v2_2026-08';
    var EMAIL_CONSENT_VERSION = 'assessment_email_v2_2026-08';
    var STORE_KEY = 'vt_cra';          // in-progress answers
    var REPORT_KEY = 'vt_cra_report';  // unlocked report snapshot
    // Handoff to consult.html. Deliberately localStorage rather than query
    // string: the same-origin page can read it, and a name, phone number and
    // email address never belong in a URL — they end up in history, in
    // referrer headers, and in any analytics that logs the path.
    var HANDOFF_KEY = 'vt_handoff';
    var HANDOFF_TTL_DAYS = 7; // a shared device shouldn't prefill last month's visitor
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
        { id: 'care_context', kind: 'single',
          prompt: 'Which best describes the person who needs care?',
          selfPrompt: 'Which best describes you?',
          help: 'Pick the closest fit — it helps us point you to the programs that actually apply.',
          options: [
            { value: 'older_adult', label: 'An older adult (60 or older)', selfLabel: 'I’m 60 or older' },
            { value: 'adult_disability', label: 'An adult under 60 living with a disability', selfLabel: 'I’m under 60 and living with a disability' },
            { value: 'older_adult_disability', label: 'An older adult living with a disability', selfLabel: 'I’m 60 or older and living with a disability' },
            { value: 'recovering', label: 'Someone recovering from a hospital stay, surgery, or injury', selfLabel: 'I’m recovering from a hospital stay, surgery, or injury' }
          ] },
        { id: 'timeline', kind: 'single', prompt: 'When do you feel help is needed?',
          help: 'There’s no wrong answer — this just helps us point you to the right next step.',
          options: [
            { value: 'now', label: 'Right away — something has to change' },
            { value: 'hospital', label: 'Right away — they’re coming home from a hospital, rehab, or nursing stay', selfLabel: 'Right away — I’m coming home from a hospital, rehab, or nursing stay' },
            { value: 'weeks', label: 'In the next few weeks' },
            { value: 'months', label: 'In the next few months' },
            { value: 'researching', label: 'Just starting to research' }
          ] },
        { id: 'daily_tasks', kind: 'single',
          prompt: 'How is day-to-day life going — bathing, dressing, meals, and keeping the house running?',
          options: [
            { value: 'independent', label: 'All of it gets done without help' },
            { value: 'slipping', label: 'Mostly fine, but some of it is slipping' },
            { value: 'some_help', label: 'Needs hands-on help with some of it', selfLabel: 'I need hands-on help with some of it' },
            { value: 'depends', label: 'Depends on someone for most of it', selfLabel: 'I depend on someone for most of it' },
            { value: 'transfers', label: 'Needs hands-on help getting in and out of bed, a chair, or the shower', selfLabel: 'I need hands-on help getting in and out of bed, a chair, or the shower' }
          ] },
        { id: 'safety_mobility', kind: 'single',
          prompt: 'How are things going with getting around — steadiness and falls?',
          options: [
            { value: 'steady', label: 'Steady, and no falls' },
            { value: 'furniture', label: 'Holds onto furniture or walls sometimes', selfLabel: 'I hold onto furniture or walls sometimes' },
            { value: 'walker', label: 'Uses a cane or walker, and needs a watchful eye', selfLabel: 'I use a cane or walker' },
            { value: 'falls', label: 'Has fallen more than once, or had a fall that caused injury', selfLabel: 'I’ve fallen more than once, or had a fall that caused injury' },
            { value: 'unsafe', label: 'Can’t move around safely alone', selfLabel: 'I can’t move around safely alone' }
          ] },
        { id: 'memory_judgment', kind: 'single',
          prompt: 'Have you noticed changes in memory or judgment?',
          options: [
            { value: 'normal', label: 'Nothing beyond normal aging' },
            { value: 'repeats', label: 'Repeats questions, misses appointments', selfLabel: 'I repeat questions or miss appointments' },
            { value: 'incidents', label: 'Forgets meals or bills, has left the stove on, or fallen for a scam', selfLabel: 'I forget meals or bills, have left the stove on, or fallen for a scam' },
            { value: 'confusion', label: 'Gets confused about where they are or who people are, or has wandered off', selfLabel: 'I get confused about where I am or who people are, or have gotten lost' }
          ] },
        { id: 'support_now', kind: 'single',
          prompt: 'Who helps out today, and how are they holding up?',
          options: [
            { value: 'family_daily', label: 'Family is nearby and involved almost daily' },
            { value: 'family_stretched', label: 'Family helps, but everyone is stretched thin' },
            { value: 'distant', label: 'Family is far away — help is occasional, and they’re alone most of the day', selfLabel: 'Family is far away — help is occasional, and I’m alone most of the day' },
            { value: 'burning_out', label: 'The main caregiver is running on empty — this can’t continue' },
            { value: 'none', label: 'No reliable help right now' }
          ] },
        { id: 'coverage', kind: 'multi',
          prompt: 'Last one — how are you planning to pay for care?',
          help: 'Pick anything that might apply — a best guess is fine. Whatever you choose, we’ll check what you actually qualify for, and that costs you nothing.',
          options: [
            { value: 'medicaid', label: 'Medicaid, or a Medicaid managed care plan' },
            { value: 'medicare_advantage', label: 'Through a Medicare Advantage plan (Aetna, Humana, Blue Cross, UnitedHealthcare, Molina, and the like)' },
            { value: 'va', label: 'Through VA benefits — there’s military service in the family', selfLabel: 'Through VA benefits — I served, or my spouse did' },
            { value: 'ltc_policy', label: 'With a long-term care insurance policy' },
            { value: 'disability_benefits', label: 'Alongside Social Security disability (SSI or SSDI)' },
            { value: 'medicare_original', label: 'Original Medicare only — no extra plan' },
            { value: 'none', label: 'Out of pocket — we’d be paying ourselves', selfLabel: 'Out of pocket — I’d be paying myself' },
            { value: 'not_sure', label: 'We don’t know yet — show us what could pay for this', selfLabel: 'I don’t know yet — show me what could pay for this' }
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
        resumeLink.textContent = 'Pick up where you left off →';
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
                    consent: fd.get('consent') !== null,
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
    var progressFill = document.getElementById('progressFill');
    var backBtn = document.getElementById('backBtn');
    var continueBtn = document.getElementById('continueBtn');

    function render() {
        var q = QUESTIONS[state.idx];
        var self = isSelf();
        // Bar only — deliberately no "question N of M" (see file header). The
        // fill starts one step in so the first screen never reads as "zero
        // progress" to someone deciding whether to bother.
        progressFill.style.width = Math.round(((state.idx + 1) / QUESTIONS.length) * 100) + '%';
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
            // "Out of pocket" and "we don't know yet" are each answers on their
            // own — picking either clears the specific routes, and picking a
            // specific route clears them. You can't be on Medicaid AND not know
            // how you're paying.
            var EXCLUSIVE = ['none', 'not_sure'];
            var cur = Array.isArray(state.answers[q.id]) ? state.answers[q.id].slice() : [];
            var i = cur.indexOf(value);
            if (i !== -1) { cur.splice(i, 1); }
            else if (EXCLUSIVE.indexOf(value) !== -1) { cur = [value]; }
            else { cur = cur.filter(function(v) { return EXCLUSIVE.indexOf(v) === -1; }); cur.push(value); }
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
            // Skipping a multi-select is "I don't know", never "none of these".
            // This used to record ['none'] for every question, which on the
            // payment question meant clicking past it silently filed the family
            // as paying out of pocket — a specific claim the report then acted
            // on, showing them the self-pay paragraph and nothing else. Prefer
            // the question's own not-sure option when it has one.
            var unsure = q.options.filter(function(o) { return o.value === 'not_sure'; })[0]
                      || q.options.filter(function(o) { return o.value === 'none'; })[0];
            if (unsure) {
                state.answers[q.id] = [unsure.value];
                save(STORE_KEY, state);
            }
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
                    consent: fd.get('consent') !== null,
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
            save(REPORT_KEY, {
                assessmentId: data.assessmentId,
                report: data.report,
                savedAt: new Date().toISOString()
            });
            // Everything the consultation form would otherwise ask for a
            // second time. They have just typed their name and number to
            // unlock this report; making them do it again to book a call is
            // the fastest way to lose them at the one moment they're ready.
            save(HANDOFF_KEY, {
                name: fd.get('name') || '',
                phone: fd.get('phone') || '',
                email: fd.get('email') || storedEmail() || '',
                zip: (fd.get('zip') || '').replace(/\D/g, '').slice(0, 5),
                who: state.answers.relationship || '',
                when: state.answers.timeline || '',
                savedAt: Date.now()
            });
            try { localStorage.removeItem(STORE_KEY); } catch (err) {}
            renderReport(data.report);
            show('report');
        } catch (err) {
            gateError.textContent = 'Sorry — something went wrong saving your report. Your answers are safe on this device. Please try again in a moment, or call us at (708) 726-4536.';
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
    /**
     * The call to action, rendered twice — once directly under the headline
     * and once at the end. The report is long (six sections on a full one),
     * and burying the only way to act at the bottom of it asks a reader who
     * is already convinced to scroll past everything to find the button.
     * `slot` keeps the two Download buttons' ids unique.
     */
    function ctaBlock(r, slot) {
        var href = 'consult.html?from=assessment&band=' + encodeURIComponent(r.band || '');
        var h = '<div class="cra-report-cta cra-cta-' + slot + '">';
        // Urgent readers get the phone first — for them a call today is the
        // whole point. Everyone else books, because a stressed reader at 11pm
        // will not ring an office but will fill in a form.
        if (r.band === 'urgent') {
            h += '<a href="tel:7087264536" class="cra-btn-gold">Call (708) 726-4536</a>';
            h += '<a href="' + esc(href) + '" class="cra-btn-outline">Book a free consultation</a>';
        } else {
            h += '<a href="' + esc(href) + '" class="cra-btn-gold">Book a free consultation</a>';
            h += '<a href="tel:7087264536" class="cra-btn-outline">Call (708) 726-4536</a>';
        }
        h += '<button type="button" class="cra-btn-outline" id="downloadBtn-' + slot + '">Download PDF</button>';
        h += '</div>';
        h += '<p class="cra-cta-note">Free, about thirty minutes, by phone or in the home — '
           + 'and we&rsquo;ll carry over what you&rsquo;ve just told us, so there&rsquo;s nothing to type again.</p>';
        return h;
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
            h += 'Call us at <a href="tel:7087264536">(708) 726-4536</a> — a short conversation today ';
            h += 'costs nothing and usually brings real relief within days.</div>';
        }

        h += ctaBlock(r, 'top');

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

        // Coverage routing — for most readers this is the part of the report
        // they didn't know they needed. Server decides which routes appear.
        if (r.coverage && r.coverage.routes && r.coverage.routes.length) {
            h += '<div class="cra-coverage">';
            h += '<h2>' + esc(r.coverage.title) + '</h2>';
            h += '<p class="cra-coverage-intro">' + esc(r.coverage.intro) + '</p>';
            r.coverage.routes.forEach(function(route) {
                h += '<div class="cra-route"><h3>' + esc(route.name) + '</h3>';
                h += '<p>' + esc(route.body) + '</p></div>';
            });
            h += '<p class="cra-coverage-note">' + esc(r.coverage.note) + '</p>';
            if (r.coverage.href) {
                h += '<a href="' + esc(r.coverage.href) + '" style="font-weight:700;">See all the ways families pay for care &rarr;</a>';
            }
            h += '</div>';
        }

        // Plan suggestion (planning/browsing reports only — server decides)
        if (r.plan) {
            h += '<div class="cra-flags" style="border-color: var(--navy); background: #F4F7FA;">';
            h += '<h2>A plan built for where you are</h2>';
            h += '<p style="font-size:1.02rem; line-height:1.65; margin-bottom:10px;"><strong>' + esc(r.plan.name) + ':</strong> ' + esc(r.plan.blurb) + '</p>';
            h += '<a href="' + esc(r.plan.href) + '" style="font-weight:700;">See how it works &rarr;</a>';
            h += '</div>';
        }

        h += ctaBlock(r, 'bottom');

        h += '<p class="cra-disclaimer">' + esc(r.disclaimer) + '</p>';

        document.getElementById('reportBody').innerHTML = h;
        document.getElementById('printDate').textContent = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        ['top', 'bottom'].forEach(function(slot) {
            var btn = document.getElementById('downloadBtn-' + slot);
            if (!btn) return;
            btn.addEventListener('click', function() {
                track('report_downloaded');
                window.print();
            });
        });
    }
});
