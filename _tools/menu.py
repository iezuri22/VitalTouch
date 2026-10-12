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
        ('services.html#companionship', 'ph-chats-circle', 'Companionship', 'Company and outings'),
        ('services.html#respite', 'ph-armchair', 'Respite', 'Time off for family'),
        ('services.html#transportation', 'ph-car-simple', 'Rides', 'Appointments and errands'),
        ('disability-support.html', 'ph-wheelchair', 'Disability support', 'Adults of any age'),
    ], ('Not sure?', 'Take the free assessment', 'Ninety seconds. A personal report and ways to pay.', 'assessment.html', 'Start')),
    ('Paying for care', [
        ('paying-for-care.html', 'ph-wallet', 'Ways to pay', 'Six options, explained'),
        ('paying-for-care.html#ltc-insurance', 'ph-file-text', 'Long-term care insurance', 'Most policies cover home care'),
        ('paying-for-care.html#va', 'ph-shield-star', 'VA benefits', 'For veterans and spouses'),
        ('paying-for-care.html#medicare-advantage', 'ph-heartbeat', 'Medicare Advantage', 'In-home support benefits'),
        ('paying-for-care.html#medicaid', 'ph-bank', 'Medicaid', 'Where you stand'),
        ('paying-for-care.html#own', 'ph-credit-card', 'Paying on your own', 'Flexible hours'),
        ('pricing.html', 'ph-tag', 'Pricing', 'How our pricing works'),
        ('care-plans.html', 'ph-calendar-check', 'Care plans', 'Monthly plans'),
    ], ('Cost calculator', 'See what care costs', 'Compare hours of home care with other options.', 'index.html#cost', 'Open calculator')),
    ('Areas', [
        ('home-care-chicago.html', 'ph-buildings', 'Chicago', '28 neighborhoods'),
        ('home-care-matteson.html', 'ph-map-pin', 'Matteson', 'Our home base'),
        ('home-care-orland-park.html', 'ph-map-pin', 'Orland Park', 'Southwest suburbs'),
        ('home-care-tinley-park.html', 'ph-map-pin', 'Tinley Park', 'Southwest suburbs'),
        ('home-care-oak-lawn.html', 'ph-map-pin', 'Oak Lawn', 'Southwest suburbs'),
        ('home-care-homewood.html', 'ph-map-pin', 'Homewood', 'South suburbs'),
        ('service-areas.html', 'ph-map-trifold', 'All 69 areas', 'Every town we serve'),
    ], ('Do we serve you?', 'Check your zip code', 'Instant answer for 69 towns and neighborhoods.', 'service-areas.html#zipCheck', 'Check my zip')),
    ('Resources', [
        ('assessment.html', 'ph-clipboard-text', 'Free care assessment', 'Personal report in 90 seconds'),
        ('changes.html', 'ph-newspaper', 'Medicare and Medicaid changes', 'What changes in 2026 and 2027'),
        ('faq.html', 'ph-question', 'FAQ', 'Quick answers'),
        ('blog.html', 'ph-article', 'Articles', 'Guides for families'),
        ('refer/', 'ph-handshake', 'Refer a client', 'For professionals'),
        ('incident/', 'ph-warning-circle', 'Report a concern', 'We respond fast'),
    ], ('Open enrollment', 'Oct 15 to Dec 7', 'Compare in-home support before you pick a plan.', 'changes.html#open-enrollment', 'Read more')),
    ('About', [
        ('about.html', 'ph-users-three', 'About us', 'Local and family-owned'),
        ('apply.html', 'ph-briefcase', 'Careers', 'Now hiring caregivers'),
        ('contact.html', 'ph-envelope-simple', 'Contact', 'Office, hours, email'),
    ], ('Talk to the owner', '(708) 726-4536', 'When you call, you get a person.', 'tel:7087264536', 'Call now')),
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
        f'                    <a href="{pre}consult.html?when=now&amp;from=nav" class="vt-btn vt-btn--solid nav-get-care">Get care started</a>\n'
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
        f'        <a href="{pre}consult.html?when=now&amp;from=nav" class="vt-btn vt-btn--solid mn-cta">Get care started</a>\n'
        '        <a href="tel:7087264536" class="vt-btn vt-btn--ghost mn-cta">Call (708) 726-4536</a>\n'
        '    </nav>')
