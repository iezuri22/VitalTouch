"""Applies the shared 2026-10 site shell (fonts, stylesheets, header, mobile
menu, footer, motion script) to every hand-written page.

Run from the repo root:  python3 _tools/apply-shell.py
Idempotent: it replaces whole <header class="header">, mobile-nav and
<footer class="footer"> blocks, so re-running after editing NAV/FOOTER here
updates every page. Generated home-care-*.html pages pick the shell up from
service-areas.html when build-town-pages.py runs, so run this first.
"""
import re, glob, os

FONTS = '<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Figtree:ital,wght@0,400..700;1,400..600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">'
CSS_VER = '20261013b'
NAV = [('services.html', 'Services'), ('disability-support.html', 'Disability Support'),
       ('paying-for-care.html', 'Ways to Pay'), ('assessment.html', 'Free Assessment'),
       ('contact.html', 'Contact'), ('apply.html', 'Careers')]

def header(pre, current):
    links = '\n'.join(
        f'                    <a href="{pre}{href}"{" class=\"active\" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for href, label in NAV)
    return f'''<header class="header">
        <div class="container">
            <nav class="nav" aria-label="Main">
                <a href="{pre}index.html" class="logo">
                    <img src="{pre}images/logo-main.png" alt="VitalTouch Health Network" width="180" height="46">
                </a>
                <button class="mobile-toggle" id="mobileToggle" aria-label="Menu" aria-expanded="false" aria-controls="mobileNav">
                    <span></span><span></span><span></span>
                </button>
                <div class="nav-menu nav-menu-slim">
{links}
                </div>
                <div class="nav-cta">
                    <a href="tel:7087264536" class="nav-phone nav-phone-big"><i class="ph ph-phone" aria-hidden="true"></i>(708) 726-4536</a>
                    <a href="{pre}start.html?from=nav" class="vt-btn vt-btn--solid nav-get-care">Get care started</a>
                </div>
            </nav>
        </div>
    </header>'''

def mobile(pre):
    links = '\n'.join(f'        <a href="{pre}{h}">{l}</a>' for h, l in NAV)
    return f'''<nav class="mobile-nav" id="mobileNav" aria-label="Mobile">
{links}
        <a href="{pre}start.html?from=nav" class="vt-btn vt-btn--solid" style="width:100%;margin-top:20px;">Get care started</a>
        <a href="tel:7087264536" class="vt-btn vt-btn--ghost" style="width:100%;margin-top:10px;">Call (708) 726-4536</a>
    </nav>'''

def footer(pre):
    return f'''<footer class="footer">
        <div class="container">
            <div class="vt-footer-grid">
                <div class="vt-footer-brand">
                    <img src="{pre}images/logo-white.png" alt="VitalTouch Health Network" width="180" height="46">
                    <p>Compassionate in-home care for seniors and adults living with disabilities across the Chicagoland area. Licensed by the State of Illinois.</p>
                    <a class="vt-footer-phone" href="tel:7087264536"><i class="ph ph-phone" aria-hidden="true"></i>(708) 726-4536</a>
                </div>
                <div class="vt-footer-col">
                    <h4>Care</h4>
                    <ul>
                        <li><a href="{pre}services.html">Services</a></li>
                        <li><a href="{pre}disability-support.html">Disability support</a></li>
                        <li><a href="{pre}paying-for-care.html">Ways to pay</a></li>
                        <li><a href="{pre}changes.html">Medicare and Medicaid changes</a></li>
                        <li><a href="{pre}pricing.html">Pricing</a></li>
                        <li><a href="{pre}assessment.html">Free assessment</a></li>
                        <li><a href="{pre}start.html?from=nav">Get care started</a></li>
                    </ul>
                </div>
                <div class="vt-footer-col">
                    <h4>Areas</h4>
                    <ul>
                        <li><a href="{pre}home-care-chicago.html">Home care in Chicago</a></li>
                        <li><a href="{pre}home-care-mount-prospect.html">Mount Prospect</a></li>
                        <li><a href="{pre}home-care-elmwood-park.html">Elmwood Park</a></li>
                        <li><a href="{pre}home-care-oak-lawn.html">Oak Lawn</a></li>
                        <li><a href="{pre}home-care-tinley-park.html">Tinley Park</a></li>
                        <li><a href="{pre}service-areas.html">All service areas</a></li>
                    </ul>
                </div>
                <div class="vt-footer-col">
                    <h4>Company</h4>
                    <ul>
                        <li><a href="{pre}about.html">About us</a></li>
                        <li><a href="{pre}apply.html">Careers</a></li>
                        <li><a href="{pre}refer/">Refer a client</a></li>
                        <li><a href="{pre}faq.html">FAQ</a></li>
                        <li><a href="{pre}contact.html">Contact</a></li>
                        <li><a href="{pre}incident/">Report a concern</a></li>
                    </ul>
                </div>
                <div class="vt-footer-col">
                    <h4>Office</h4>
                    <ul>
                        <li>4749 Lincoln Mall Drive, Suite 204<br>Matteson, IL 60443</li>
                        <li>Mon to Fri, 9am to 5pm</li>
                        <li><a href="mailto:ifeanyi@vitaltouch.care">ifeanyi@vitaltouch.care</a></li>
                    </ul>
                </div>
            </div>
            <div class="vt-footer-bottom">
                <p>&copy; 2026 VitalTouch Health Network, Inc.</p>
                <p><a href="{pre}privacy-policy.html">Privacy</a><a href="{pre}terms.html">Terms</a><a href="{pre}sms-consent.html">Text messages</a></p>
            </div>
        </div>
    </footer>'''

import os as _os, sys as _sys
_sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__)))
from menu import header, mobile  # noqa: E402  (mega menu replaces the flat nav)

def head_fix(h, pre):
    h = re.sub(r'<link href="https://fonts\.googleapis\.com/css2\?[^"]*" rel="stylesheet">', FONTS, h, count=1)
    h = re.sub(r'(css/style\.css)\?v=[0-9a-z]+', rf'\1?v={CSS_VER}', h)
    if 'css/vt.css' not in h:
        h = re.sub(r'(<link rel="stylesheet" href="[^"]*css/style\.css\?v=[0-9a-z]+">)',
                   rf'\1\n    <link rel="stylesheet" href="{pre}css/vt.css?v={CSS_VER}">\n'
                   r'    <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">', h, count=1)
    else:
        h = re.sub(r'css/vt\.css\?v=[0-9a-z]+', f'css/vt.css?v={CSS_VER}', h)
    return h

def body_fix(h, pre, current):
    h, n1 = re.subn(r'<header class="header">.*?</header>', lambda m: header(pre, current), h, count=1, flags=re.S)
    h, n2 = re.subn(r'<nav class="mobile-nav" id="mobileNav"[^>]*>.*?</nav>', lambda m: mobile(pre), h, count=1, flags=re.S)
    h, n3 = re.subn(r'<footer class="footer">.*?</footer>', lambda m: footer(pre), h, count=1, flags=re.S)
    if 'js/motion.js' not in h:
        h = re.sub(r'(<script src="[^"]*js/main\.js[^"]*"></script>)', rf'\1\n    <script src="{pre}js/motion.js?v={CSS_VER}" defer></script>', h, count=1)
    else:
        h = re.sub(r'js/motion\.js\?v=[0-9a-z]+', f'js/motion.js?v={CSS_VER}', h)
    h = re.sub(r'js/main\.js\?v=[0-9a-z]+', f'js/main.js?v={CSS_VER}', h)
    # Mega menu behaviour.
    if 'js/nav.js' not in h:
        h = re.sub(r'(<script src="[^"]*js/main\.js\?v=[0-9a-z]+"></script>)', rf'\1\n    <script src="{pre}js/nav.js?v={CSS_VER}" defer></script>', h, count=1)
    else:
        h = re.sub(r'js/nav\.js\?v=[0-9a-z]+', f'js/nav.js?v={CSS_VER}', h)
    # Vita, the floating guide (2026-10-12).
    if 'js/vita.js' not in h:
        h = re.sub(r'(<script src="[^"]*js/main\.js\?v=[0-9a-z]+"></script>)', rf'\1\n    <script src="{pre}js/vita.js?v={CSS_VER}" defer></script>', h, count=1)
    else:
        h = re.sub(r'js/vita\.js\?v=[0-9a-z]+', f'js/vita.js?v={CSS_VER}', h)
    # Engagement layer (quote button, quick sheet, one nudge per visit).
    if 'js/engage.js' not in h:
        h = re.sub(r'(<script src="[^"]*js/motion\.js\?v=[0-9a-z]+" defer></script>)',
                   rf'\1\n    <script src="{pre}js/engage.js?v={CSS_VER}" defer></script>', h, count=1)
    else:
        h = re.sub(r'js/engage\.js\?v=[0-9a-z]+', f'js/engage.js?v={CSS_VER}', h)
    return h, (n1, n2, n3)

pages = [p for p in glob.glob('*.html') if not p.startswith('home-care-')] + ['refer/index.html', 'incident/index.html']
for p in sorted(pages):
    pre = '../' if '/' in p else ''
    current = os.path.basename(p) if '/' not in p else ''
    h = open(p).read()
    h = head_fix(h, pre)
    if p != 'care-now.html':
        h, counts = body_fix(h, pre, current)
        if counts != (1, 1, 1):
            print('WARN', p, counts)
    open(p, 'w').write(h)
print('shell applied to', len(pages), 'pages')
