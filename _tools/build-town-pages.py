"""Generates home-care-<town>.html landing pages for local search.

Each page is built from service-areas.html's header/nav/footer so the shell
stays identical to the rest of the site. Town facts are kept to what is easy
to verify (zip codes, county, the hospitals families actually come home from).
Re-run after editing TOWNS; it overwrites the generated pages only.
Usage: python3 _tools/build-town-pages.py .   (from the repo root)
Note: the repo has .nojekyll, so this file IS publicly served. Keep secrets out.
"""
import json, re, sys, html as H
SITE = sys.argv[1]
src = open(f'{SITE}/service-areas.html').read()
# Cut the shell by markers, never by line number: an edit to service-areas.html's
# <head> once shifted a line-number slice by one, dropped the mobile nav's
# closing </nav>, and every generated page rendered inside the hidden menu.
body_start = src.index('<body>')
mobile_nav = src.index('id="mobileNav"', body_start)
nav = src[body_start:src.index('</nav>', mobile_nav) + len('</nav>')]
assert nav.count('<nav') == nav.count('</nav>'), 'unbalanced nav in shell'
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

# Chicago neighborhoods (2026-10-12). kind='chicago' changes the place label to
# "Beverly, Chicago", adds a Chicago crumb, and says "neighborhoods" not "towns".
# Only neighborhoods already listed on service-areas.html get a page.
LCM = 'OSF Little Company of Mary Medical Center in Evergreen Park'
ROSELAND = 'Roseland Community Hospital'
TRINITY = 'Advocate Trinity Hospital'
UCM = 'UChicago Medicine in Hyde Park'
HOLYCROSS = 'Holy Cross Hospital'
STBERNARD = 'St. Bernard Hospital in Englewood'
SOUTHSHORE = 'South Shore Hospital'
CHRIST_SHORT = 'Advocate Christ Medical Center in Oak Lawn'

CHICAGO = [
  dict(slug='chicago-beverly', name='Beverly', zips=['60643'], hospitals=[LCM, CHRIST_SHORT],
       near=['Morgan Park', 'Mount Greenwood', 'Washington Heights', 'Ashburn'],
       local='Beverly is one of the closest Chicago neighborhoods to the south suburbs, so it is easy for us to staff and easy to cover a last-minute change.'),
  dict(slug='chicago-mount-greenwood', side='Southwest Side', name='Mount Greenwood', zips=['60655'], hospitals=[CHRIST_SHORT, LCM],
       near=['Beverly', 'Morgan Park', 'Ashburn'],
       local='Mount Greenwood sits right on the city&rsquo;s southwest edge, next to Oak Lawn and Evergreen Park, and we serve both sides of that line.'),
  dict(slug='chicago-morgan-park', name='Morgan Park', zips=['60643'], hospitals=[ROSELAND, LCM],
       near=['Beverly', 'Washington Heights', 'Mount Greenwood', 'Roseland'],
       local='Morgan Park is a short trip from our south suburban office, and we try to match caregivers who live on the far South Side so the same people keep coming back.'),
  dict(slug='chicago-washington-heights', name='Washington Heights', zips=['60620', '60643'], hospitals=[ROSELAND, LCM],
       near=['Morgan Park', 'Beverly', 'Roseland', 'Chatham'],
       local='Washington Heights is close to the expressways we use every day, which helps visits start on time.'),
  dict(slug='chicago-chatham', name='Chatham', zips=['60619'], hospitals=[TRINITY, UCM],
       near=['Auburn Gresham', 'Calumet Heights', 'Washington Heights', 'Roseland'],
       local='Chatham is right off the Dan Ryan, a straight drive from our office, so a free in-home visit is easy to set up.'),
  dict(slug='chicago-auburn-gresham', name='Auburn Gresham', zips=['60620'], hospitals=[STBERNARD, HOLYCROSS],
       near=['Chatham', 'Chicago Lawn', 'Ashburn', 'Washington Heights'],
       local='We try to match Auburn Gresham families with caregivers who live nearby, so visits stay consistent and nobody is fighting traffic across the city.'),
  dict(slug='chicago-roseland', name='Roseland', zips=['60628'], hospitals=[ROSELAND, TRINITY],
       near=['Pullman', 'Washington Heights', 'Morgan Park', 'Chatham'],
       local='Roseland is one of the closest Chicago neighborhoods to the south suburbs, just up from Riverdale and Dolton.'),
  dict(slug='chicago-pullman', name='Pullman', zips=['60628'], hospitals=[ROSELAND, TRINITY],
       near=['Roseland', 'Calumet Heights', 'Hegewisch', 'Washington Heights'],
       local='Pullman sits just inside the city line from the south suburbs, which makes it one of the easiest Chicago neighborhoods for us to reach.'),
  dict(slug='chicago-calumet-heights', name='Calumet Heights', zips=['60617'], hospitals=[TRINITY, SOUTHSHORE],
       near=['Chatham', 'South Shore', 'Pullman', 'Hegewisch'],
       local='Calumet Heights is a short drive from our south suburban office, with schedules from a few hours a week up to daily.'),
  dict(slug='chicago-hegewisch', name='Hegewisch', zips=['60633'], hospitals=[TRINITY],
       near=['Pullman', 'Calumet Heights'],
       local='Hegewisch is tucked into the city&rsquo;s far southeast corner, closer to the south suburbs than to downtown, and we serve it from the south.'),
  dict(slug='chicago-ashburn', side='Southwest Side', name='Ashburn', zips=['60652'], hospitals=[HOLYCROSS, CHRIST_SHORT],
       near=['Chicago Lawn', 'Mount Greenwood', 'Beverly', 'Auburn Gresham'],
       local='Ashburn borders Evergreen Park and Oak Lawn, both areas we already serve, so finding a caregiver close by is straightforward.'),
  dict(slug='chicago-chicago-lawn', side='Southwest Side', name='Chicago Lawn', zips=['60629'], hospitals=[HOLYCROSS, CHRIST_SHORT],
       near=['Ashburn', 'Auburn Gresham', 'West Lawn', 'Gage Park'],
       local='We serve Chicago Lawn and the rest of the Southwest Side from our south suburban office, with schedules from a few hours a week up to daily.'),
  # Added 2026-10-12 at Ifeanyi's request (also added to service-areas.html).
  dict(slug='chicago-hyde-park', name='Hyde Park', zips=['60615', '60637'], hospitals=[UCM],
       near=['Bronzeville', 'South Shore', 'Chatham'],
       local='Hyde Park is an easy drive up from our south suburban office, with visits from a few hours a week up to daily.'),
  dict(slug='chicago-south-shore', name='South Shore', zips=['60649'], hospitals=[SOUTHSHORE, UCM],
       near=['Hyde Park', 'Calumet Heights', 'Chatham'],
       local='South Shore runs along the lake on the South Side, and we try to match caregivers who live nearby so the same people keep coming back.'),
  dict(slug='chicago-bronzeville', name='Bronzeville', zips=['60653', '60616'], hospitals=[UCM],
       near=['Hyde Park', 'South Shore'],
       local='Bronzeville is a straight shot up the Dan Ryan from the south suburbs, so a free in-home visit is easy to set up.'),
]
for c in CHICAGO:
    c['kind'] = 'chicago'; c['county'] = 'Cook County'

# The hub that every neighborhood page links up to.
CHICAGO_OTHER = ['South Chicago', 'Englewood', 'West Englewood', 'West Lawn', 'Gage Park', 'Clearing',
                 'Garfield Ridge', 'East Side', 'South Deering', 'the West Side', 'the North Side']
HUB = dict(kind='hub', slug='chicago', name='Chicago', zips=[], county='Cook County',
           hospitals=[UCM, TRINITY, HOLYCROSS, ROSELAND], near=[],
           local='We serve neighborhoods across the city, most often on the South and Southwest Sides. Our office is in the south suburbs, so the far South Side is where we can usually start fastest.')

ALL = TOWNS + CHICAGO + [HUB]

def esc(s): return H.escape(s, quote=True)

def page(t):
    kind = t.get('kind', 'town')
    n = t['name']; zips = ', '.join(t['zips'])
    place = f'{n}, Chicago' if kind == 'chicago' else n          # "Beverly, Chicago"
    hs = t['hospitals']
    hosp = hs[0] if len(hs) == 1 else ', '.join(hs[:-1]) + ' or ' + hs[-1]
    def link(nm):
        x = next((y for y in ALL if y['name'] == nm and y is not t), None)
        return f'<a href="home-care-{x["slug"]}.html">{x["name"]}</a>' if x else nm
    near_links = ', '.join(link(nm) for nm in t['near'])
    area_word = 'neighborhoods' if kind != 'town' else 'towns'
    title = f'Home Care in {place}, IL | In-Home Help for Seniors & Adults With Disabilities | VitalTouch'
    desc = (f'Non-medical in-home care in {place}, IL' + (f' ({zips})' if zips else '') +
            ': help with bathing, meals, housekeeping, rides and company. '
            'Local, family-owned agency licensed by the State of Illinois. Free in-home consultation.')
    if kind == 'hub':
        first_faq = ('Do you provide home care in Chicago?',
                     'Yes. We provide non-medical home care across Chicago, most often on the South and Southwest Sides, including '
                     + ', '.join(c['name'] for c in CHICAGO) + '. Call to check your address.')
    else:
        first_faq = (f'Do you provide home care in {place}?',
                     f'Yes. We provide non-medical home care throughout {place} ({zips}) and the {area_word} around it, including {", ".join(t["near"])}.')
    faqs = [
        first_faq,
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
    served = ({"@type": "Place", "name": f"{n}, Chicago, Illinois",
               "containedInPlace": {"@type": "City", "name": "Chicago, Illinois"}}
              if kind == 'chicago' else {"@type": "City", "name": f"{n}, Illinois"})
    crumb_mid = ('<a href="home-care-chicago.html">Chicago</a>\n                <span>/</span>\n                '
                 if kind == 'chicago' else '')
    h1 = f'Home Care in {place}' + ('' if kind == 'chicago' else ', IL')
    if kind == 'hub':
        hood_links = ''.join(f'<li><a href="home-care-{c["slug"]}.html">{c["name"]}</a></li>' for c in CHICAGO)
        nearby_html = f'''<h2>Chicago neighborhoods we serve</h2>
            <ul class="town-list">{hood_links}</ul>
            <p>We also serve {", ".join(CHICAGO_OTHER)}. Not sure if we cover your address? Call and ask. <a href="service-areas.html">See every area we serve &rarr;</a></p>'''
    else:
        tail = f"the rest of the {t.get('side', 'South Side')}" if kind == 'chicago' else 'the rest of the south and southwest suburbs'
        up = ' <a href="home-care-chicago.html">Home care across Chicago &rarr;</a>' if kind == 'chicago' else ''
        nearby_html = f'''<h2>Nearby {area_word} we serve</h2>
            <p>{near_links}, and {tail}.{up} <a href="service-areas.html">See every area we serve &rarr;</a></p>'''
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
         "areaServed": served},
        {"@type": "Service", "serviceType": "Non-medical in-home care",
         "provider": {"@id": "https://vitaltouchcares.com/#business"},
         "areaServed": served,
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
                {crumb_mid}<span>{esc(n)}</span>
            </div>
            <h1>{esc(h1)}</h1>
            <p>Dependable help at home for older adults and adults living with a disability in {esc(place)}. Local, family-owned, and licensed by the State of Illinois.</p>
        </div>
    </section>

    <section class="section section-white">
        <div class="container town-wrap">
            <p>If you or someone you love needs a hand at home in {esc(place)}, we can help with the everyday things that have gotten harder: bathing and dressing, meals, housekeeping and laundry, errands, rides to appointments, medication reminders, and simply having someone there. {t['local']}</p>
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

            <h2>What we help with in {esc(place)}</h2>
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

            <h2>Questions families in {esc(place)} ask</h2>
            <div class="faq-list">
{faq_html}
            </div>

            {nearby_html}
        </div>
    </section>

    <section class="cta">
        <div class="container">
            <h2>Talk to someone local about care in {esc(place)}</h2>
            <p>Free in-home consultation. No cost, no obligation.</p>
            <div class="cta-buttons">
                <a href="tel:7087264536" class="btn btn-white">Call (708) 726-4536</a>
                <a href="consult.html" class="btn btn-outline-white">Schedule a free consultation</a>
            </div>
        </div>
    </section>

{footer}'''

for t in ALL:
    open(f"{SITE}/home-care-{t['slug']}.html", 'w').write(page(t))
print(json.dumps([t['slug'] for t in ALL]))
