"""Site navigation: mega menu (desktop) and accordion (mobile).

Imported by apply-shell.py. Five buyer questions, each opening a panel of
options with a one-line blurb, plus a navy feature card on the right.
Edit MENU here and re-run apply-shell.py + build-town-pages.py.
"""

# (label, [(href, icon, title, blurb)], (kicker, title, text, href, button))
MENU = [
    ('Care', [
        ('services.html', 'ph-squares-four', 'All services', 'Everything we help with'),
        ('services.html#personal-care', 'ph-hand-heart', 'Personal care', 'Bathing, dressing, transfers'),
        ('services.html#homemaking', 'ph-broom', 'Homemaking', 'Meals, housekeeping, errands'),
        ('services.html#dementia-care', 'ph-brain', 'Dementia care', 'Calm, consistent support'),
        ('services.html#companionship', 'ph-chats-circle', 'Companionship', 'Company and conversation'),
        ('services.html#respite', 'ph-armchair', 'Respite', 'Time off for family'),
        ('services.html#errands', 'ph-shopping-bag', 'Errands', 'Groceries and medication'),
        ('services.html#family-caregivers', 'ph-users-three', 'Family caregivers', 'Someone you trust, paid by us'),
        ('disability-support.html', 'ph-wheelchair', 'Disability support', 'Adults of any age'),
    ], ('Not sure?', 'Take the free assessment', 'Ninety seconds. A personal report and ways to pay.', 'assessment.html', 'Start')),
    ('Paying for care', [
        ('paying-for-care.html', 'ph-wallet', 'Ways to pay', 'Every option, explained'),
        ('guide-long-term-care-insurance.html', 'ph-shield-check', 'Long-term care insurance', 'Most policies cover home care'),
        ('guide-va-benefits.html', 'ph-medal', 'VA benefits', 'Aid and Attendance and more'),
        ('guide-medicare-and-paying-on-your-own.html', 'ph-heartbeat', 'Medicare', 'What it covers at home'),
        ('guide-paid-family-caregiver.html', 'ph-users-three', 'Paid family caregivers', 'Get paid to care for family'),
        ('guide-illinois-medicaid-home-care.html', 'ph-identification-card', 'Medicaid for seniors', 'The state program for 60+'),
        ('guide-home-services-program.html', 'ph-wheelchair', 'Home Services Program', 'For adults under 60'),
        ('pricing.html', 'ph-tag', 'Pricing', 'How our pricing works'),
        ('care-plans.html', 'ph-calendar-check', 'Care plans', 'Monthly plans'),
    ], ('Free coverage check', 'What are you covered for?', 'Tell us your plan or policy. We check what it pays for.', 'paying-for-care.html', 'Check my coverage')),
    ('Areas', [
        ('home-care-chicago.html', 'ph-buildings', 'Chicago', '40 neighborhoods'),
        ('home-care-mount-prospect.html', 'ph-map-pin', 'Mount Prospect', 'Northwest suburbs'),
        ('home-care-elmwood-park.html', 'ph-map-pin', 'Elmwood Park', 'West suburbs'),
        ('home-care-oak-lawn.html', 'ph-map-pin', 'Oak Lawn', 'Southwest suburbs'),
        ('home-care-tinley-park.html', 'ph-map-pin', 'Tinley Park', 'Southwest suburbs'),
        ('home-care-homewood.html', 'ph-map-pin', 'Homewood', 'South suburbs'),
        ('service-areas.html', 'ph-map-trifold', 'All areas', 'City and suburbs'),
    ], ('Do we serve you?', 'Check your zip code', 'Instant answer for neighborhoods and towns across Chicagoland.', 'service-areas.html#zipCheck', 'Check my zip')),
    ('Resources', [
        ('assessment.html', 'ph-clipboard-text', 'Free care assessment', 'Personal report in 90 seconds'),
        ('changes.html', 'ph-newspaper', 'Medicare and Medicaid changes', 'What changes in 2026 and 2027'),
        ('faq.html', 'ph-question', 'FAQ', 'Quick answers'),
        ('help-finder.html', 'ph-magnifying-glass', 'Find local help', 'Free help by zip code'),
        ('guides.html', 'ph-article', 'Guides', 'Paying for care, explained'),
        ('guide-wills-and-planning-ahead.html', 'ph-scroll', 'Wills and planning ahead', 'Papers, and local attorneys'),
        ('guide-staying-home-or-moving.html', 'ph-house-line', 'Staying home or moving', 'Questions, and local help'),
        ('refer/', 'ph-handshake', 'Refer a client', 'For professionals'),
        ('incident/', 'ph-warning-circle', 'Report a concern', 'We respond fast'),
    ], ('Free local help', 'Rides, meals, senior centers', 'Enter a zip code. See the free help in your town.', 'help-finder.html', 'Find help')),
    ('About', [
        ('about.html', 'ph-users-three', 'About us', 'Who we are'),
        ('apply.html', 'ph-briefcase', 'Careers', 'Now hiring caregivers'),
        ('contact.html', 'ph-envelope-simple', 'Contact', 'Office, hours, email'),
    ], ('Ready when you are', 'Get care started', 'Under a minute online. No obligation.', 'start.html?from=menu', 'Start')),
]


def _href(pre, href):
    return href if href.startswith(('tel:', 'http')) else pre + href


def header(pre, current):
    items = []
    for i, (label, links, feat) in enumerate(MENU):
        pid = f'mm-{i}'
        active = bool(current) and any(href.split('#')[0] == current for href, *_ in links)
        cells = ''.join(
            f'<a class="mm-link" href="{_href(pre, href)}"><i class="ph {icon}" aria-hidden="true"></i>'
            f'<span><strong>{title}</strong><small>{blurb}</small></span></a>'
            for href, icon, title, blurb in links)
        k, t, x, fh, fb = feat
        cur = ' is-current' if active else ''
        items.append(
            f'                    <div class="mm-item">\n'
            f'                        <button class="mm-trigger{cur}" type="button" aria-expanded="false" aria-controls="{pid}">{label}<i class="ph ph-caret-down" aria-hidden="true"></i></button>\n'
            f'                        <div class="mm-panel" id="{pid}" hidden>\n'
            f'                            <div class="container mm-panel__inner">\n'
            f'                                <div class="mm-grid">{cells}</div>\n'
            f'                                <a class="mm-feature" href="{_href(pre, fh)}"><span class="mm-feature__k">{k}</span><strong>{t}</strong><span>{x}</span><span class="mm-feature__btn">{fb} <i class="ph ph-arrow-right" aria-hidden="true"></i></span></a>\n'
            f'                            </div>\n'
            f'                        </div>\n'
            f'                    </div>')
    menu = '\n'.join(items)
    return (
        '<header class="header">\n'
        '        <div class="container">\n'
        '            <nav class="nav" aria-label="Main">\n'
        f'                <a href="{pre}index.html" class="logo">\n'
        f'                    <img src="{pre}images/logo-main.png" alt="VitalTouch Health Network" width="180" height="46">\n'
        '                </a>\n'
        '                <button class="mobile-toggle" id="mobileToggle" aria-label="Menu" aria-expanded="false" aria-controls="mobileNav">\n'
        '                    <span></span><span></span><span></span>\n'
        '                </button>\n'
        '                <div class="nav-menu nav-menu-slim mm">\n'
        f'{menu}\n'
        '                </div>\n'
        '                <div class="nav-cta">\n'
        '                    <a href="tel:7087264536" class="nav-phone nav-phone-big"><i class="ph ph-phone" aria-hidden="true"></i>(708) 726-4536</a>\n'
        f'                    <a href="{pre}start.html?from=nav" class="vt-btn vt-btn--solid nav-get-care">Get care started</a>\n'
        '                </div>\n'
        '            </nav>\n'
        '        </div>\n'
        '    </header>')


def mobile(pre):
    groups = []
    for label, links, feat in MENU:
        lis = ''.join(f'<a href="{_href(pre, href)}"><i class="ph {icon}" aria-hidden="true"></i>{title}</a>'
                      for href, icon, title, blurb in links)
        groups.append(f'<details class="mn-group"><summary>{label}<i class="ph ph-caret-down" aria-hidden="true"></i></summary>'
                      f'<div class="mn-links">{lis}</div></details>')
    g = '\n        '.join(groups)
    return (
        '<nav class="mobile-nav" id="mobileNav" aria-label="Mobile">\n'
        f'        {g}\n'
        f'        <a href="{pre}start.html?from=nav" class="vt-btn vt-btn--solid mn-cta">Get care started</a>\n'
        '        <a href="tel:7087264536" class="vt-btn vt-btn--ghost mn-cta">Call (708) 726-4536</a>\n'
        '    </nav>')
