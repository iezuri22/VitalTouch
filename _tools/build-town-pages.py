"""Generates home-care-<town>.html landing pages for local search.

Each page is built from service-areas.html's header/nav/footer so the shell
stays identical to the rest of the site. Town facts are kept to what is easy
to verify (zip codes, county, the hospitals families actually come home from).
Re-run after editing TOWNS; it overwrites the generated pages only.
Usage: python3 _tools/build-town-pages.py .   (from the repo root)
This folder starts with an underscore so GitHub Pages does not publish it.
"""
import json, re, sys, html as H
SITE = sys.argv[1]
src = open(f'{SITE}/service-areas.html').read()
lines = src.split('\n')
nav = '\n'.join(lines[95:135])            # <body> .. end of mobile nav
footer_start = src.index('    <!-- Footer -->')
footer = src[footer_start:]

OLY = 'Franciscan Health Olympia Fields'
SSH = 'Advocate South Suburban Hospital in Hazel Crest'
INGALLS = 'UChicago Medicine Ingalls Memorial in Harvey'
PALOS = 'Northwestern Medicine Palos Hospital in Palos Heights'
CHRIST = 'Advocate Christ Medical Center in Oak Lawn'
SILVER = 'Silver Cross Hospital in New Lenox'

TOWNS = [
  dict(slug='matteson', name='Matteson', zips=['60443'], county='Cook County',
       hospitals=[OLY, SSH], near=['Richton Park', 'Olympia Fields', 'Park Forest', 'Country Club Hills'],
       local='Our office is on Lincoln Mall Drive, right here in Matteson, so a free in-home visit is usually a short drive away.'),
  dict(slug='homewood', name='Homewood', zips=['60430'], county='Cook County',
       hospitals=[SSH, INGALLS], near=['Flossmoor', 'Hazel Crest', 'East Hazel Crest', 'Glenwood'],
       local='Homewood is one town over from our Matteson office, which keeps visits on time and lets us cover last-minute changes.'),
  dict(slug='flossmoor', name='Flossmoor', zips=['60422'], county='Cook County',
       hospitals=[OLY, SSH], near=['Homewood', 'Olympia Fields', 'Hazel Crest', 'Matteson'],
       local='Flossmoor sits a few minutes from our Matteson office, so the person who visits for the free consultation is part of the same local team that provides the care.'),
  dict(slug='olympia-fields', name='Olympia Fields', zips=['60461'], county='Cook County',
       hospitals=[OLY, SSH], near=['Matteson', 'Flossmoor', 'Chicago Heights', 'Park Forest'],
       local='Olympia Fields borders Matteson, where our office is, which makes it one of the easiest places for us to staff reliably.'),
  dict(slug='tinley-park', name='Tinley Park', zips=['60477', '60487'], county='Cook and Will counties',
       hospitals=[PALOS, SILVER], near=['Oak Forest', 'Orland Park', 'Country Club Hills', 'Matteson'],
       local='Tinley Park is a straight shot from our Matteson office, and we match caregivers who live nearby so visits stay consistent.'),
  dict(slug='orland-park', name='Orland Park', zips=['60462', '60467'], county='Cook County',
       hospitals=[PALOS, CHRIST], near=['Tinley Park', 'Palos Heights', 'Palos Hills', 'Oak Forest'],
       local='We serve Orland Park from our south suburban office and match caregivers who live in the southwest suburbs, so the same faces keep showing up.'),
  dict(slug='oak-lawn', name='Oak Lawn', zips=['60453'], county='Cook County',
       hospitals=[CHRIST, PALOS], near=['Evergreen Park', 'Chicago Ridge', 'Burbank', 'Alsip'],
       local='A lot of families in Oak Lawn first think about help at home when someone is about to leave Christ Hospital. We can usually start within days of that call.'),
  dict(slug='palos-heights', name='Palos Heights', zips=['60463'], county='Cook County',
       hospitals=[PALOS, CHRIST], near=['Palos Hills', 'Orland Park', 'Worth', 'Crestwood'],
       local='Palos Heights is home to Palos Hospital, and many of our calls start with a discharge date. We can have a plan in place before the person comes home.'),
  dict(slug='country-club-hills', name='Country Club Hills', zips=['60478'], county='Cook County',
       hospitals=[SSH, OLY], near=['Hazel Crest', 'Matteson', 'Tinley Park', 'Markham'],
       local='Country Club Hills is next door to our Matteson office, close enough that the owner often does the first visit.'),
  dict(slug='park-forest', name='Park Forest', zips=['60466'], county='Cook and Will counties',
       hospitals=[OLY, SSH], near=['Matteson', 'Richton Park', 'Chicago Heights', 'Olympia Fields'],
       local='Park Forest is one of the closest towns to our Matteson office, which helps us keep schedules steady week to week.'),
]

def esc(s): return H.escape(s, quote=True)

def page(t):
    n = t['name']; zips = ', '.join(t['zips'])
    hosp = ' or '.join(t['hospitals']) if len(t['hospitals']) == 2 else t['hospitals'][0]
    near_links = ', '.join(
        f'<a href="home-care-{x["slug"]}.html">{x["name"]}</a>' if (x := next((y for y in TOWNS if y['name'] == nm), None)) else nm
        for nm in t['near'])
    title = f'Home Care in {n}, IL | In-Home Help for Seniors & Adults With Disabilities | VitalTouch'
    desc = (f'Non-medical in-home care in {n}, IL ({zips}): help with bathing, meals, housekeeping, rides and company. '
            f'Local, family-owned agency licensed by the State of Illinois. Free in-home consultation.')
    faqs = [
        (f'Do you provide home care in {n}?',
         f'Yes. We provide non-medical home care throughout {n} ({zips}) and the towns around it, including {", ".join(t["near"])}.'),
        (f'How fast can care start in {n}?',
         'Often within a few days of your first call, and sooner when someone is coming home from the hospital. '
         'We start with a free visit to the home, then put the plan and schedule in writing.'),
        ('How much does home care cost, and who pays for it?',
         'Cost depends on how many hours a week are needed. There are six ways families pay for care, not two: long-term care insurance, '
         'VA benefits, Medicare Advantage extras, an Illinois program for adults under 60 living with a disability, and paying on your own. '
         'We check what you may already be covered for at no cost.'),
        ('Is this medical care?',
         'No. We help with daily living: bathing, dressing, meals, housekeeping, errands, rides, medication reminders and company. '
         'If a doctor has ordered nursing or therapy, that comes from a home health agency, and we can work alongside them.'),
    ]
    faq_html = '\n'.join(f'''                <div class="faq-item">
                    <button class="faq-question" type="button">
                        <span>{esc(q)}</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <div class="faq-answer"><div class="faq-answer-content"><p>{esc(a)}</p></div></div>
                </div>''' for q, a in faqs)
    ld = {
      "@context": "https://schema.org",
      "@graph": [
        {"@type": "LocalBusiness",
         "@id": "https://vitaltouchcares.com/#business",
         "name": "VitalTouch Health Network",
         "url": "https://vitaltouchcares.com",
         "telephone": "+1-708-726-4536",
         "image": "https://vitaltouchcares.com/images/logo-main.png",
         "address": {"@type": "PostalAddress", "streetAddress": "4749 Lincoln Mall Drive, Suite 204",
                     "addressLocality": "Matteson", "addressRegion": "IL", "postalCode": "60443", "addressCountry": "US"},
         "areaServed": {"@type": "City", "name": f"{n}, Illinois"}},
        {"@type": "Service", "serviceType": "Non-medical in-home care",
         "provider": {"@id": "https://vitaltouchcares.com/#business"},
         "areaServed": {"@type": "City", "name": f"{n}, Illinois"},
         "url": f"https://vitaltouchcares.com/home-care-{t['slug']}.html"},
        {"@type": "FAQPage", "mainEntity": [
            {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in faqs]},
      ]}
    return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{esc(title)}</title>
    <meta name="description" content="{esc(desc)}">
    <link rel="canonical" href="https://vitaltouchcares.com/home-care-{t['slug']}.html">
    <link rel="icon" type="image/png" href="images/logo-symbol.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css?v=20260810c">
    <style>
        .town-wrap {{ max-width: 920px; margin: 0 auto; }}
        .town-wrap p {{ font-size: 1.08rem; line-height: 1.75; margin-bottom: 16px; }}
        .town-wrap h2 {{ margin: 34px 0 14px; }}
        .town-actions {{ display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin: 26px 0 8px; }}
        .town-action {{ border: 1px solid var(--border); border-radius: 6px; padding: 22px; background: var(--cream); }}
        .town-action h3 {{ font-size: 1.15rem; margin-bottom: 6px; }}
        .town-action p {{ font-size: 0.98rem; margin-bottom: 14px; }}
        .town-list {{ columns: 2; gap: 28px; padding-left: 20px; margin-bottom: 10px; }}
        .town-list li {{ margin-bottom: 8px; font-size: 1.02rem; }}
        @media (max-width: 640px) {{ .town-actions {{ grid-template-columns: 1fr; }} .town-list {{ columns: 1; }} }}
    </style>
    <script type="application/ld+json">
{json.dumps(ld, indent=2)}
    </script>
</head>
{nav}

    <section id="main" tabindex="-1" class="page-hero">
        <div class="container">
            <div class="breadcrumb">
                <a href="index.html">Home</a>
                <span>/</span>
                <a href="service-areas.html">Service Areas</a>
                <span>/</span>
                <span>{esc(n)}</span>
            </div>
            <h1>Home Care in {esc(n)}, IL</h1>
            <p>Dependable help at home for older adults and adults living with a disability in {esc(n)}. Local, family-owned, and licensed by the State of Illinois.</p>
        </div>
    </section>

    <section class="section section-white">
        <div class="container town-wrap">
            <p>If you or someone you love needs a hand at home in {esc(n)}, we can help with the everyday things that have gotten harder: bathing and dressing, meals, housekeeping and laundry, errands, rides to appointments, medication reminders, and simply having someone there. {esc(t['local'])}</p>
            <p>Many families call us when someone is coming home from {esc(hosp)}. We can meet you before discharge, set up the first week of visits, and adjust as things settle.</p>

            <div class="town-actions">
                <div class="town-action">
                    <h3>Need help now?</h3>
                    <p>Four quick questions and we&rsquo;ll call you back fast with a real plan.</p>
                    <a href="care-now.html" class="btn btn-primary">Get care started</a>
                </div>
                <div class="town-action">
                    <h3>Still figuring it out?</h3>
                    <p>A free 90-second check-in with a personal report and the ways care could be paid for.</p>
                    <a href="assessment.html" class="btn btn-outline">See where things stand</a>
                </div>
            </div>
            <p style="font-size:1rem;">Or call <a href="tel:7087264536"><strong>(708) 726-4536</strong></a>. You&rsquo;ll get a person, often the owner.</p>

            <h2>What we help with in {esc(n)}</h2>
            <ul class="town-list">
                <li>Companionship and conversation</li>
                <li>Bathing, dressing and grooming</li>
                <li>Meals, groceries and errands</li>
                <li>Light housekeeping and laundry</li>
                <li>Rides to appointments, work or school</li>
                <li>Medication reminders</li>
                <li>Safe transfers: bed, chair, shower</li>
                <li>Memory care and dementia support</li>
                <li>Respite for family caregivers</li>
                <li>A few hours a week, up to daily visits</li>
            </ul>
            <p><a href="services.html">See all services &rarr;</a></p>

            <h2>Paying for care</h2>
            <p>Most families assume it&rsquo;s Medicaid or nothing. There are six ways people pay for care here, including long-term care insurance, VA benefits, extra benefits in some Medicare Advantage plans, and an Illinois program for adults under 60 living with a disability. Tell us what you have and we&rsquo;ll check it for free. <a href="paying-for-care.html">See all six ways &rarr;</a></p>

            <h2>Questions families in {esc(n)} ask</h2>
            <div class="faq-list">
{faq_html}
            </div>

            <h2>Nearby towns we serve</h2>
            <p>{near_links}, and the rest of the south and southwest suburbs. <a href="service-areas.html">See every area we serve &rarr;</a></p>
        </div>
    </section>

    <section class="cta">
        <div class="container">
            <h2>Talk to someone local about care in {esc(n)}</h2>
            <p>Free in-home consultation. No cost, no obligation.</p>
            <div class="cta-buttons">
                <a href="tel:7087264536" class="btn btn-white">Call (708) 726-4536</a>
                <a href="consult.html" class="btn btn-outline-white">Schedule a free consultation</a>
            </div>
        </div>
    </section>

{footer}'''

for t in TOWNS:
    open(f"{SITE}/home-care-{t['slug']}.html", 'w').write(page(t))
print(json.dumps([t['slug'] for t in TOWNS]))
