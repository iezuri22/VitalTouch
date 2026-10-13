"""Generates the six paying-for-care guides (guide-*.html) from _tools/guides.py.

Each page borrows changes.html's shell (head, header, mobile nav, footer) so it
matches the rest of the site, then lays out one template: hero with an
at-a-glance card, who it's for beside a photo, how to start as a timeline,
details as a picker, an honest "where we fit" band, then other guides,
sources and the one CTA. Edit the copy in guides.py, not here.
Usage: python3 _tools/build-guides.py .   (from the repo root, after apply-shell.py)
Every fact in guides.py carries a source; re-check them when "reviewed" changes.
"""
import json, re, sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from guides import GUIDES, REVIEWED  # noqa: E402

SITE = sys.argv[1]
src = open(f'{SITE}/changes.html').read()
pre = src[:src.index('<section id="main"')]
post = src[src.index('    <!-- Footer -->'):]
assert pre.count('<nav') == pre.count('</nav>'), 'unbalanced nav in shell'


def head(g):
    h = re.sub(r'<title>.*?</title>', f'<title>{g["title"]} | VitalTouch Health Network</title>', pre, count=1, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{g["desc"]}">', h, count=1)
    h = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="https://vitaltouchcares.com/{g["slug"]}.html">', h, count=1)
    article = {"@context": "https://schema.org", "@type": "Article", "headline": g['h1'],
               "description": re.sub(r'&[a-z]+;', "'", g['desc']), "dateModified": REVIEWED['iso'],
               "author": {"@type": "Organization", "name": "VitalTouch Health Network"},
               "publisher": {"@id": "https://vitaltouchcares.com/#business"},
               "mainEntityOfPage": f"https://vitaltouchcares.com/{g['slug']}.html"}
    return h.replace('</head>', '    <script type="application/ld+json">\n' + json.dumps(article, indent=2) + '\n    </script>\n</head>', 1)


def li_points(items):
    return '\n'.join(f'                    <li><i class="ph {ic}" aria-hidden="true"></i><div><strong>{t}</strong><span>{d}</span></div></li>'
                     for ic, t, d in items)


def body(g):
    slug = g['slug']
    glance = '\n'.join(f'                    <li><span>{k}</span><strong>{v}</strong></li>' for k, v in g['glance'])
    who = '\n'.join(f'                    <li>{x}</li>' for x in g['who'])
    who_not = f'\n                <p class="gd-who__not">{g["who_not"]}</p>' if g.get('who_not') else ''
    steps = '\n'.join(
        f'                    <li class="vt-step"><h3>{t}</h3><p>{d}</p>' + (f'<span class="vt-step__when">{w}</span>' if w else '') + '</li>'
        for t, d, w in g['steps'])
    details = '\n'.join(
        f'''                <details class="cl-item" id="{did}" data-photo="{ph}" data-alt="{alt}">
                    <summary><i class="ph {ic} cl-ic" aria-hidden="true"></i><span class="cl-t"><strong>{t}</strong><span class="cl-d">{lead}</span></span><i class="ph ph-plus cl-plus" aria-hidden="true"></i></summary>
                    <div class="cl-body">{body}</div>
                </details>''' for did, ic, t, lead, body, ph, alt in g['details'])
    # Optional "Local help" block (2026-10-13): professionals listed free, only
    # once they agree. Empty until then, with an invite to get listed.
    lh = g.get('local_help')
    local_help = '' if not lh else f'''    <section id="local-help" class="ip-section">
        <div class="container">
            <div class="ip-head">
                <h2>{lh["h"]}</h2>
                <p>{lh["p"]}</p>
            </div>
            <!-- LOCAL-PROS: listings go here once a business says yes. Never list one that hasn't agreed. -->
            <p style="margin:0;padding:18px 20px;border-left:3px solid var(--accent);font-size:1.04rem;color:var(--ink);max-width:72ch;">{lh["empty"]}</p>
            <p style="margin:18px 0 0;font-size:1.04rem;max-width:72ch;">{lh["invite"]} Email <a href="mailto:ifeanyi@vitaltouch.care?subject=Listing">ifeanyi@vitaltouch.care</a> or call <a href="tel:7087264536">(708) 726-4536</a>.</p>
        </div>
    </section>
'''
    fit_checks = '\n'.join(
        f'                    <li{"" if ok else " class=\"gd-no\""}><i class="ph {"ph-check" if ok else "ph-minus"}" aria-hidden="true"></i>{txt}</li>'
        for ok, txt in g['fit_card'])
    more = '\n'.join(f'                <li><a href="{o["slug"]}.html">{o["short"]}<i class="ph ph-arrow-right" aria-hidden="true"></i></a></li>'
                     for o in GUIDES if o['slug'] != slug) + \
        '\n                <li><a href="paying-for-care.html">All the ways to pay<i class="ph ph-arrow-right" aria-hidden="true"></i></a></li>'
    srcs = '\n'.join(f'                <li><a href="{u}" rel="noopener">{t}</a></li>' for t, u in g['sources'])
    photo, photo_alt = g['photo']
    return f'''    <section id="main" tabindex="-1" class="ip-hero">
        <div class="container ip-hero__grid">
            <div>
                <div class="breadcrumb"><a href="index.html">Home</a><span>/</span><a href="paying-for-care.html">Ways to Pay</a><span>/</span><span>{g["short"]}</span></div>
                <h1>{g["h1"]}</h1>
                <p class="ip-hero__sub">{g["sub"]}</p>
                <div class="ip-hero__ctas">
                    <a href="start.html?from=guide-{slug}" class="vt-btn ip-btn-light">Get care started</a>
                </div>
            </div>
            <div class="ip-hero__card"><div class="ui-card gd-glance" aria-label="At a glance">
                <div class="ui-card__top"><div><strong>At a glance</strong><span>{g["glance_sub"]}</span></div><span class="ui-pill">Reviewed {REVIEWED["short"]}</span></div>
                <ul class="pf-check">
{glance}
                </ul>
                <div class="ui-card__foot"><span><i class="ph ph-book-open" aria-hidden="true"></i><a href="#sources">Sources</a></span><a href="#start">How to start</a></div>
            </div></div>
        </div>
    </section>

    <section class="ip-section gd-who">
        <div class="container cl-split">
            <div>
                <h2>{g["who_h"]}</h2>
                <p class="gd-who__lead">{g["who_lead"]}</p>
                <ul class="ip-list">
{who}
                </ul>{who_not}
            </div>
            <figure class="cl-split__img"><img src="{photo}" alt="{photo_alt}" loading="lazy"></figure>
        </div>
    </section>

    <section id="start" class="ip-section ip-section--mist gd-steps">
        <div class="container vt-journey">
            <div class="vt-journey__head">
                <h2>How to start</h2>
                <p>{g["steps_lead"]}</p>
            </div>
            <ol class="vt-steps">
{steps}
            </ol>
        </div>
    </section>

    <section class="ip-section">
        <div class="container">
            <div class="ip-head">
                <h2>Good to know</h2>
                <p>{g["details_lead"]}</p>
            </div>
            <div class="cl-list" data-cta="start.html?from=guide-{slug}-list">
{details}
            </div>
        </div>
    </section>

    <section class="ip-section ip-section--dark gd-fit">
        <div class="container ip-split">
            <div class="ip-split__copy">
                <h2>{g["fit_h"]}</h2>
                <p>{g["fit_p"]}</p>
                <ul class="ip-points">
{li_points(g["fit_points"])}
                </ul>
            </div>
            <div class="ip-split__card"><div class="ui-card" aria-label="{g["fit_card_title"]}">
                <div class="ui-card__top"><div><strong>{g["fit_card_title"]}</strong><span>VitalTouch, {REVIEWED["short"]}</span></div><span class="ui-pill">Honest answer</span></div>
                <ul class="ui-checks">
{fit_checks}
                </ul>
                <div class="ui-card__foot"><span><i class="ph ph-phone" aria-hidden="true"></i><a href="tel:7087264536">(708) 726-4536</a></span><span>Free coverage check</span></div>
            </div></div>
        </div>
    </section>

{local_help}
    <section id="sources" class="ip-section ip-section--mist">
        <div class="container">
            <div class="ip-head"><h2>Other ways to pay</h2></div>
            <ul class="gd-more">
{more}
            </ul>
            <div class="ip-head">
                <h2>Sources</h2>
                <p>General information, not legal or benefits advice. Rules change, and each program decides for itself. Last reviewed {REVIEWED["long"]}.</p>
            </div>
            <ul class="gd-src">
{srcs}
            </ul>
            <div class="ip-cta">
                <div><h2>{g["cta_h"]}</h2><p>{g["cta_p"]}</p></div>
                <div class="ip-cta__btns">
                    <a href="start.html?from=guide-{slug}-final" class="vt-btn ip-btn-light">Get care started</a>
                </div>
            </div>
        </div>
    </section>
'''


for g in GUIDES:
    html = head(g) + body(g) + post
    assert '—' not in html and '–' not in html, f'dash in {g["slug"]}'
    open(f'{SITE}/{g["slug"]}.html', 'w').write(html)

# Sitemap: one entry per guide.
sm = open(f'{SITE}/sitemap.xml').read()
# Only this script's own guides: hand-written ones (guide-wills-and-planning-ahead)
# keep their sitemap rows.
for g in GUIDES:
    sm = re.sub(r'  <url>\n    <loc>https://vitaltouchcares.com/' + re.escape(g['slug']) + r'\.html</loc>\n.*?</url>\n', '', sm, flags=re.S)
sm = sm.replace('</urlset>', ''.join(
    f'  <url>\n    <loc>https://vitaltouchcares.com/{g["slug"]}.html</loc>\n    <lastmod>{REVIEWED["iso"]}</lastmod>\n'
    f'    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n' for g in GUIDES) + '</urlset>')
open(f'{SITE}/sitemap.xml', 'w').write(sm)
print(json.dumps([g['slug'] for g in GUIDES]))
