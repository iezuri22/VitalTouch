/* ============================================
   VITALTOUCH HOME CARE - MAIN JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
    
    // Mobile Navigation
    const mobileToggle = document.getElementById('mobileToggle');
    const mobileNav = document.getElementById('mobileNav');
    const mobileOverlay = document.getElementById('mobileOverlay');
    
    if (mobileToggle && mobileNav) {
        mobileToggle.addEventListener('click', function() {
            mobileNav.classList.toggle('active');
            if (mobileOverlay) mobileOverlay.classList.toggle('active');
            document.body.style.overflow = mobileNav.classList.contains('active') ? 'hidden' : '';
        });
        
        if (mobileOverlay) {
            mobileOverlay.addEventListener('click', function() {
                mobileNav.classList.remove('active');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        }
        
        mobileNav.querySelectorAll('a').forEach(function(link) {
            link.addEventListener('click', function() {
                mobileNav.classList.remove('active');
                if (mobileOverlay) mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }
    
    // FAQ Accordion
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(function(item) {
        const question = item.querySelector('.faq-question');
        if (question) {
            question.addEventListener('click', function() {
                faqItems.forEach(function(otherItem) {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                    }
                });
                item.classList.toggle('active');
            });
        }
    });
    
    // Header scroll effect
    const header = document.querySelector('.header');
    if (header) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 100) {
                header.style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)';
            }
        });
    }
    
    // Contact Form
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        // Submits to the VitalTouch ops platform (Lead Engagement Engine).
        // CONSENT_VERSION identifies the exact consent language on the page —
        // bump it if the checkbox text in contact.html ever changes.
        const LEADS_API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api/public/leads'
            : 'https://vitaltouch-ops.vercel.app/api/public/leads';
        const CONSENT_VERSION = 'contact_v1_2026-07';

        const statusEl = document.getElementById('contactFormStatus');
        const showStatus = function(msg, ok) {
            if (!statusEl) { alert(msg); return; }
            statusEl.textContent = msg;
            statusEl.style.display = 'block';
            statusEl.style.color = ok ? 'var(--teal-dark)' : '#b91c1c';
        };

        contactForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const formData = new FormData(contactForm);
            const name = ((formData.get('firstName') || '') + ' ' + (formData.get('lastName') || '')).trim();
            const consent = document.getElementById('contactConsent');

            if (consent && !consent.checked) {
                showStatus('Please check the consent box so we can reach out to you.', false);
                return;
            }

            const btn = contactForm.querySelector('button[type="submit"]');
            if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; }

            try {
                const res = await fetch(LEADS_API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        leadType: 'client_inquiry',
                        name: name || 'Website visitor',
                        phone: formData.get('phone') || undefined,
                        email: formData.get('email') || undefined,
                        message: [
                            formData.get('careType') ? 'Care type: ' + formData.get('careType') : '',
                            formData.get('message') || ''
                        ].filter(Boolean).join('\n'),
                        consent: true,
                        consentTextVersion: CONSENT_VERSION,
                        company_website: formData.get('company_website') || '',
                        utm: { page: 'contact.html' }
                    })
                });
                if (!res.ok) {
                    const data = await res.json().catch(function() { return {}; });
                    throw new Error(data.error || 'Request failed');
                }
                showStatus('Thank you' + (name ? ', ' + name : '') + '! We received your message and will contact you within 24 hours.', true);
                contactForm.reset();
            } catch (err) {
                showStatus('Sorry — something went wrong sending your message. Please call us at (708) 898-8831 and we will help right away.', false);
            } finally {
                if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
            }
        });
    }
});
