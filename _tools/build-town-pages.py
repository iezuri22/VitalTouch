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
       local='Country Club Hills is next door to our Matteson office, so a first home visit is quick to arrange.'),
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
  # West and North Sides (2026-10-12, Ifeanyi: "add west side and north side
  # neighborhoods too"). Our office is in Matteson, so these lines never claim
  # a short drive; they lean on matching caregivers who live nearby.
  dict(slug='chicago-austin', name='Austin', side='West Side', zips=['60644', '60651'],
       hospitals=['Loretto Hospital', 'Rush Oak Park Hospital'],
       near=['Garfield Park', 'Humboldt Park', 'North Lawndale'],
       local='Austin sits on the city&rsquo;s western edge, next to Oak Park, and we try to match caregivers who live on the West Side so visits stay consistent.'),
  dict(slug='chicago-garfield-park', name='Garfield Park', side='West Side', zips=['60624', '60612'],
       hospitals=['Rush University Medical Center', 'Mount Sinai Hospital'],
       near=['Austin', 'North Lawndale', 'Humboldt Park'],
       local='We serve East and West Garfield Park with schedules from a few hours a week up to daily, and we try to match caregivers who live nearby.'),
  dict(slug='chicago-north-lawndale', name='North Lawndale', side='West Side', zips=['60623'],
       hospitals=['Mount Sinai Hospital', 'Rush University Medical Center'],
       near=['Garfield Park', 'Little Village', 'Austin'],
       local='North Lawndale is a quick trip off the Eisenhower, which makes visits easy to schedule.'),
  dict(slug='chicago-humboldt-park', name='Humboldt Park', side='West Side', zips=['60651', '60647'],
       hospitals=['Humboldt Park Health', 'Rush University Medical Center'],
       near=['Logan Square', 'Garfield Park', 'Austin'],
       local='We serve Humboldt Park and the surrounding West Side with schedules from a few hours a week up to daily.'),
  dict(slug='chicago-little-village', name='Little Village', side='West Side', zips=['60623'],
       hospitals=['Saint Anthony Hospital', 'Mount Sinai Hospital'],
       near=['Pilsen', 'North Lawndale', 'Gage Park'],
       local='Little Village is close to the Stevenson, and we try to match caregivers who live close by so the same people keep coming back.'),
  dict(slug='chicago-pilsen', name='Pilsen', side='West Side', zips=['60608'],
       hospitals=['Rush University Medical Center', 'UI Health'],
       near=['Little Village', 'North Lawndale', 'Bronzeville'],
       local='Pilsen sits just southwest of downtown, close to the Dan Ryan and the Stevenson, which makes visits easy to schedule.'),
  dict(slug='chicago-rogers-park', name='Rogers Park', side='North Side', zips=['60626'],
       hospitals=['Swedish Hospital', 'Ascension Saint Francis in Evanston'],
       near=['Edgewater', 'Uptown', 'Lincoln Square'],
       local='Rogers Park sits at the city&rsquo;s northern edge along the lake. When we staff North Side clients, we look for caregivers who live nearby so visits don&rsquo;t depend on a long commute.'),
  dict(slug='chicago-edgewater', name='Edgewater', side='North Side', zips=['60660'],
       hospitals=['Swedish Hospital', 'Advocate Illinois Masonic Medical Center'],
       near=['Rogers Park', 'Uptown', 'Lincoln Square'],
       local='We serve Edgewater with schedules from a few hours a week up to daily, matched with caregivers who live on the North Side whenever we can.'),
  dict(slug='chicago-uptown', name='Uptown', side='North Side', zips=['60640'],
       hospitals=['Advocate Illinois Masonic Medical Center', 'Swedish Hospital'],
       near=['Edgewater', 'Lakeview', 'Lincoln Square'],
       local='Uptown is right on the Red Line, which makes it easier to staff with caregivers who live on the North Side.'),
  dict(slug='chicago-lakeview', name='Lakeview', side='North Side', zips=['60657', '60613'],
       hospitals=['Advocate Illinois Masonic Medical Center', 'Northwestern Memorial Hospital'],
       near=['Lincoln Park', 'Uptown', 'Lincoln Square'],
       local='In Lakeview we often help with the practical things that get harder in a city apartment: groceries, laundry, medication pickups and errands.'),
  dict(slug='chicago-lincoln-park', name='Lincoln Park', side='North Side', zips=['60614'],
       hospitals=['Northwestern Memorial Hospital', 'Advocate Illinois Masonic Medical Center'],
       near=['Lakeview', 'Logan Square', 'Uptown'],
       local='We serve Lincoln Park with schedules from a few hours a week up to daily, and we keep family who live out of town updated after visits.'),
  dict(slug='chicago-lincoln-square', name='Lincoln Square', side='North Side', zips=['60625'],
       hospitals=['Swedish Hospital', 'Advocate Illinois Masonic Medical Center'],
       near=['Albany Park', 'Uptown', 'Edgewater'],
       local='Lincoln Square is on the Brown Line, which makes it easier to staff with caregivers who live on the North Side.'),
  dict(slug='chicago-albany-park', name='Albany Park', side='North Side', zips=['60625'],
       hospitals=['Swedish Hospital', 'Community First Medical Center'],
       near=['Lincoln Square', 'Portage Park', 'Jefferson Park'],
       local='We serve Albany Park and the surrounding Northwest Side with schedules from a few hours a week up to daily.'),
  dict(slug='chicago-logan-square', name='Logan Square', side='Northwest Side', zips=['60647'],
       hospitals=['Humboldt Park Health', 'Advocate Illinois Masonic Medical Center'],
       near=['Humboldt Park', 'Lincoln Park', 'Albany Park'],
       local='Logan Square is on the Blue Line, which helps us staff it with caregivers who live on the Northwest and West Sides.'),
  dict(slug='chicago-portage-park', name='Portage Park', side='Northwest Side', zips=['60634', '60641'],
       hospitals=['Community First Medical Center', 'Ascension Resurrection'],
       near=['Jefferson Park', 'Albany Park', 'Logan Square'],
       local='Portage Park is a mostly residential neighborhood, and a little help at home is often what lets someone stay in a house they&rsquo;ve lived in for years.'),
  dict(slug='chicago-jefferson-park', name='Jefferson Park', side='Northwest Side', zips=['60630'],
       hospitals=['Ascension Resurrection', 'Community First Medical Center'],
       near=['Portage Park', 'Albany Park'],
       local='Jefferson Park has a Blue Line and Metra hub, which helps us staff it with caregivers who live on the Northwest Side.'),
]
for c in CHICAGO:
    c['kind'] = 'chicago'; c['county'] = 'Cook County'

# The hub that every neighborhood page links up to.
CHICAGO_OTHER = ['South Chicago', 'Englewood', 'West Englewood', 'West Lawn', 'Gage Park', 'Clearing',
                 'Garfield Ridge', 'East Side', 'South Deering']
HUB = dict(kind='hub', slug='chicago', name='Chicago', zips=[], county='Cook County',
           hospitals=[UCM, 'Rush University Medical Center', 'Advocate Illinois Masonic Medical Center', HOLYCROSS], near=[],
           local='We serve neighborhoods on the South, Southwest, West and North Sides. Our office is in the south suburbs, so the far South Side is where we can usually start fastest, and everywhere else we try to match caregivers who live nearby.')

# More south and southwest suburbs (2026-10-12). Every one is already listed
# on service-areas.html. Local lines stick to geography and logistics; we have
# no client count to brag about, so nothing here implies one.
def T(slug, name, z, hosp, near, local):
    return dict(slug=slug, name=name, zips=z, county='Cook County', hospitals=hosp, near=near, local=local)
MORE_SUBURBS = [
  T('hazel-crest', 'Hazel Crest', ['60429'], [SSH, INGALLS], ['Homewood', 'Country Club Hills', 'Markham', 'Flossmoor'],
    'Hazel Crest is a few minutes from our Matteson office, so visits are easy to schedule and easy to cover.'),
  T('richton-park', 'Richton Park', ['60471'], [OLY, SSH], ['Matteson', 'Park Forest', 'Olympia Fields'],
    'Richton Park borders Matteson, where our office is, so we can usually start care quickly.'),
  T('chicago-heights', 'Chicago Heights', ['60411'], [OLY, SSH], ['Olympia Fields', 'Park Forest', 'Glenwood', 'Flossmoor'],
    'Chicago Heights is a short drive east of our office, and we try to match caregivers who live nearby.'),
  T('lansing', 'Lansing', ['60438'], [INGALLS, SSH], ['South Holland', 'Calumet City', 'Lynwood', 'Glenwood'],
    'Lansing sits on the Indiana line, and we serve it from our south suburban office with schedules from a few hours a week up to daily.'),
  T('south-holland', 'South Holland', ['60473'], [INGALLS, SSH], ['Lansing', 'Dolton', 'Thornton', 'Calumet City'],
    'South Holland is a short trip up I-94 from our office, so visits are easy to keep on time.'),
  T('calumet-city', 'Calumet City', ['60409'], [INGALLS, 'Advocate Trinity Hospital'], ['Lansing', 'Dolton', 'South Holland'],
    'We serve Calumet City with schedules from a few hours a week up to daily, matched with caregivers who live in the area when we can.'),
  T('dolton', 'Dolton', ['60419'], [INGALLS, 'Roseland Community Hospital'], ['Riverdale', 'South Holland', 'Calumet City'],
    'Dolton sits right at the city line, between the far South Side and the south suburbs, both areas we serve.'),
  T('harvey', 'Harvey', ['60426'], [INGALLS, SSH], ['Markham', 'Hazel Crest', 'Riverdale', 'Dolton'],
    'Harvey is a short drive north of our office, so a free in-home visit is easy to set up.'),
  T('markham', 'Markham', ['60428'], [SSH, INGALLS], ['Harvey', 'Hazel Crest', 'Country Club Hills', 'Midlothian'],
    'Markham is a few minutes up I-57 from our office, which keeps visits on time.'),
  T('glenwood', 'Glenwood', ['60425'], [SSH, OLY], ['Homewood', 'Chicago Heights', 'Lansing', 'Lynwood'],
    'Glenwood is close to our Matteson office, with care from a few hours a week up to daily.'),
  T('lynwood', 'Lynwood', ['60411'], [OLY, INGALLS], ['Lansing', 'Glenwood', 'Sauk Village'],
    'Lynwood is on the far southeast edge of the suburbs, and we try to match caregivers who live nearby so visits stay consistent.'),
  T('sauk-village', 'Sauk Village', ['60411'], [OLY], ['Lynwood', 'Chicago Heights'],
    'Sauk Village is a short drive from our office, and the first step is a free in-home visit at no cost.'),
  T('midlothian', 'Midlothian', ['60445'], [INGALLS, PALOS], ['Oak Forest', 'Crestwood', 'Markham', 'Blue Island'],
    'Midlothian sits between the south and southwest suburbs, both areas we serve.'),
  T('riverdale', 'Riverdale', ['60827'], ['Roseland Community Hospital', INGALLS], ['Dolton', 'Blue Island', 'Harvey'],
    'Riverdale sits right at the city line, just south of Chicago&rsquo;s Roseland and Pullman neighborhoods.'),
  T('thornton', 'Thornton', ['60476'], [INGALLS, SSH], ['South Holland', 'Glenwood', 'Homewood', 'Lansing'],
    'Thornton is close to our Matteson office, and we serve it with schedules from a few hours a week up to daily.'),
  T('evergreen-park', 'Evergreen Park', ['60805'], [LCM, CHRIST], ['Oak Lawn', 'Beverly', 'Mount Greenwood', 'Alsip'],
    'Evergreen Park sits between Beverly and Oak Lawn, both areas we serve, so finding a nearby caregiver is straightforward.'),
  T('blue-island', 'Blue Island', ['60406'], ['Roseland Community Hospital', INGALLS], ['Alsip', 'Riverdale', 'Midlothian', 'Crestwood'],
    'Blue Island borders the city&rsquo;s far South Side, and we serve both sides of that line.'),
  T('alsip', 'Alsip', ['60803'], [CHRIST, LCM], ['Oak Lawn', 'Blue Island', 'Crestwood', 'Worth'],
    'Alsip is close to I-294 and Cicero Avenue, which makes visits easy to schedule.'),
  T('crestwood', 'Crestwood', ['60418'], [PALOS, CHRIST], ['Midlothian', 'Alsip', 'Oak Forest', 'Palos Heights'],
    'Crestwood is a quick trip from our office, and we try to match caregivers who live in the southwest suburbs.'),
  T('oak-forest', 'Oak Forest', ['60452'], [PALOS, SSH], ['Tinley Park', 'Midlothian', 'Crestwood', 'Country Club Hills'],
    'Oak Forest is a short drive up Cicero Avenue from our Matteson office.'),
  T('palos-hills', 'Palos Hills', ['60465'], [PALOS, CHRIST], ['Palos Heights', 'Hickory Hills', 'Worth', 'Orland Park'],
    'We serve Palos Hills and the rest of the Palos area with schedules from a few hours a week up to daily.'),
  T('worth', 'Worth', ['60482'], [PALOS, CHRIST], ['Chicago Ridge', 'Palos Heights', 'Alsip', 'Oak Lawn'],
    'Worth is a small village between Oak Lawn and the Palos area, and we try to match caregivers who live close by.'),
  T('chicago-ridge', 'Chicago Ridge', ['60415'], [CHRIST, PALOS], ['Oak Lawn', 'Worth', 'Bridgeview'],
    'Chicago Ridge borders Oak Lawn, and we serve both with care from a few hours a week up to daily.'),
  T('bridgeview', 'Bridgeview', ['60455'], [CHRIST, PALOS], ['Hickory Hills', 'Justice', 'Burbank', 'Chicago Ridge'],
    'Bridgeview sits along Harlem Avenue in the southwest suburbs, and we try to match caregivers who live nearby.'),
  T('hickory-hills', 'Hickory Hills', ['60457'], [PALOS, CHRIST], ['Palos Hills', 'Bridgeview', 'Justice'],
    'Hickory Hills is a mostly residential suburb, and a little help at home is often what lets someone stay in a house they know.'),
  T('burbank', 'Burbank', ['60459'], [CHRIST, 'Holy Cross Hospital'], ['Oak Lawn', 'Bridgeview', 'Chicago Lawn'],
    'Burbank borders Chicago&rsquo;s Southwest Side, and we serve both sides of the city line.'),
  T('justice', 'Justice', ['60458'], [PALOS, CHRIST], ['Bridgeview', 'Hickory Hills'],
    'Justice is a short drive from Oak Lawn and the Palos area, both of which we serve.'),
]
TOWNS = TOWNS + MORE_SUBURBS

# North and west of the city (owner, 2026-10-12: "we serve Mount Prospect and
# Elmwood Park ... this area list is too focused on south suburbs").
NCH = 'Endeavor Health Northwest Community Hospital in Arlington Heights'
LUTHERAN = 'Advocate Lutheran General Hospital in Park Ridge'
GOTTLIEB = 'Loyola Medicine Gottlieb Hospital in Melrose Park'
LOYOLA = 'Loyola University Medical Center in Maywood'
NORTH_WEST_SUBURBS = [
  T('mount-prospect', 'Mount Prospect', ['60056'], [NCH, LUTHERAN], ['Arlington Heights', 'Des Plaines', 'Prospect Heights', 'Elk Grove Village'],
    'Mount Prospect sits in the northwest suburbs, between Arlington Heights and Des Plaines.'),
  T('elmwood-park', 'Elmwood Park', ['60707'], [GOTTLIEB, LOYOLA], ['Oak Park', 'River Forest', 'Melrose Park', 'River Grove'],
    'Elmwood Park borders the city on the west, next to Oak Park and River Forest.'),
]
TOWNS = TOWNS + NORTH_WEST_SUBURBS

ALL = TOWNS + CHICAGO + [HUB]

UI_PLAN = open(f'{SITE}/_tools/partials/ui-plan.html').read()

FAMILY_PHOTOS = [
  ('images/home-hero.jpg', 'A caregiver smiling with an older woman at home'),
  ('images/family-connected.jpg', 'A grandmother and granddaughter smiling together at the kitchen table'),
  ('images/family-program.jpg', 'An older man and a woman laughing together outside a house'),
  ('images/garden-smiles.jpg', 'An older woman laughing while gardening with a younger woman'),
]
def family_photo_for(slug):
    # Video stills are never used as photos (owner: the video once is enough),
    # and the family photo is never the same picture as the page's other photo.
    other = 'images/' + photo_for(slug)[0]
    pool = [p for p in FAMILY_PHOTOS if p[0] != other]
    return pool[sum(map(ord, slug)) % len(pool)]

PHOTOS = [
  ('home-hero.jpg', 'A caregiver smiling with an older woman at home'),
  ('garden-smiles.jpg', 'An older woman laughing while gardening with a younger woman'),
  ('family-connected.jpg', 'A grandmother and granddaughter smiling together at the kitchen table'),
  ('family-program.jpg', 'An older man and a woman laughing together outside a house'),
]
def photo_for(slug):
    return PHOTOS[sum(map(ord, slug)) % len(PHOTOS)]

# One-line local notes for the town page body (buyer-facing, short).
SHORT_LOCAL = {
    'chicago-pilsen': 'Pilsen is close to the Dan Ryan and the Stevenson.',
    'dolton': 'Dolton sits right at the city line.',
    'chicago-chicago-lawn': 'Chicago Lawn is home to Holy Cross Hospital.',
    'chicago-garfield-park': 'We serve both East and West Garfield Park.',
    'chicago-mount-greenwood': 'Mount Greenwood sits next to Oak Lawn and Evergreen Park.',
    'palos-hills': 'Palos Hills is next to Palos Heights and Palos Hospital.',
    'riverdale': 'Riverdale sits just south of Roseland and Pullman.',
    'chicago-humboldt-park': 'Humboldt Park Health is right in the neighborhood.',
    'chicago': 'We serve neighborhoods across the South, West and North Sides.',
    'mount-prospect': 'Mount Prospect is close to Northwest Community Hospital and Lutheran General.',
    'elmwood-park': 'Elmwood Park is minutes from Gottlieb Hospital and Loyola.',
    'chicago-albany-park': 'Albany Park is at the end of the Brown Line.',
    'orland-park': 'Orland Park is minutes from Palos Hospital.',
    'chicago-hegewisch': 'Hegewisch sits in the city&rsquo;s far southeast corner.',
    'chicago-roseland': 'Roseland is just up from Riverdale and Dolton.',
    'chicago-lakeview': 'Lakeview is home to Advocate Illinois Masonic.',
    'oak-lawn': 'Oak Lawn is home to Advocate Christ Medical Center.',
    'chicago-rogers-park': 'Rogers Park sits at the city&rsquo;s northern edge.',
    'chicago-edgewater': 'Edgewater runs along the lake on the North Side.',
    'chicago-auburn-gresham': 'Auburn Gresham is close to the Dan Ryan.',
    'chicago-beverly': 'Beverly is one of the closest Chicago neighborhoods to our office.',
    'calumet-city': 'Calumet City sits on the Indiana line.',
    'chicago-lincoln-park': 'Lincoln Park runs along the lake on the North Side.',
    'chicago-hyde-park': 'Hyde Park is home to UChicago Medicine.',
    'chicago-bronzeville': 'Bronzeville is a straight shot up the Dan Ryan.',
    'oak-forest': 'Oak Forest is a short drive up Cicero Avenue.',
    'chicago-chatham': 'Chatham is right off the Dan Ryan.',
    'chicago-calumet-heights': 'Calumet Heights is home to Advocate Trinity Hospital.',
    'chicago-morgan-park': 'Morgan Park is a short trip from our office.',
    'chicago-washington-heights': 'Washington Heights is close to the expressways we use daily.',
}

def esc(s): return H.escape(s, quote=True)

def page(t):
    kind = t.get('kind', 'town')
    photo = photo_for(t['slug'])
    fam = family_photo_for(t['slug'])
    where = (f"Chicago, {t.get('side', 'South Side')}" if kind == 'chicago' else (t.get('county') or 'Cook County')) if kind != 'hub' else 'Cook County'
    fact_items = []
    if t['zips']:
        fact_items.append(f'<li><i class="ph ph-map-pin" aria-hidden="true"></i>{", ".join(t["zips"])}</li>')
    if t['hospitals']:
        hn = t['hospitals'][0].split(' in ')[0]
        fact_items.append(f'<li><i class="ph ph-first-aid" aria-hidden="true"></i>Near {esc(hn)}</li>')
    facts = ''.join(fact_items)
    # first clause only: "Tinley Park is a straight shot from our Matteson office."
    local_short = re.split(r', (?:and|so|which|with|where|both|close enough|matched) ', t['local'])[0].rstrip('.') + '.'
    local_short = SHORT_LOCAL.get(t['slug'], local_short)
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
            ': help with bathing, meals, housekeeping, errands and company. '
            'A licensed Illinois home care agency. Free in-home consultation.')
    if kind == 'hub':
        first_faq = ('Which Chicago neighborhoods do you serve?',
                     'Most of the South, Southwest, West and North Sides. Call to check your address.')
    else:
        first_faq = (f'Do you serve {place}?',
                     f'Yes, including {zips}, plus {", ".join(t["near"][:3])}.')
    faqs = [
        first_faq,
        ('How fast can care start?', 'Often within days. It starts with a free home visit.'),
        ('What does it cost?', 'It depends on the hours. We quote after the free visit and check what coverage you have.'),
        ('Is this medical care?', 'No. We help with daily life: bathing, meals, housekeeping, errands and company.'),
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
    h1 = f'Home care in {n}' if kind != 'hub' else 'Home care in Chicago'
    if kind == 'hub':
        groups = [('South Side', ['South Side']), ('Southwest Side', ['Southwest Side']),
                  ('West Side', ['West Side']), ('North &amp; Northwest Side', ['North Side', 'Northwest Side'])]
        blocks = []
        for label, sides in groups:
            items = ''.join(f'<li><a href="home-care-{c["slug"]}.html">{c["name"]}</a></li>'
                            for c in CHICAGO if c.get('side', 'South Side') in sides)
            blocks.append(f'<h3 style="margin:18px 0 8px;">{label}</h3>\n            <ul class="town-list">{items}</ul>')
        hood_blocks = '\n            '.join(blocks)
        nearby_html = f'''<h2>Chicago neighborhoods we serve</h2>
            {hood_blocks}
            <p>We also serve {", ".join(CHICAGO_OTHER)}. Not sure if we cover your address? Call and ask. <a href="service-areas.html">See every area we serve &rarr;</a></p>'''
    else:
        tail = f"the rest of the {t.get('side', 'South Side')}" if kind == 'chicago' else 'the rest of the Chicagoland area'
        up = ' <a href="home-care-chicago.html">Home care across Chicago &rarr;</a>' if kind == 'chicago' else ''
        nearby_html = f'''<h2>Nearby</h2>
            <p class="town-near">{near_links}.{up} <a href="service-areas.html">All areas &rarr;</a></p>'''
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
    <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,500..900&family=Figtree:ital,wght@0,400..700;1,400..600&family=IBM+Plex+Mono:wght@500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="css/style.css?v=20261012n">
    <link rel="stylesheet" href="css/vt.css?v=20261012n">
    <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css">
    <style>
        .town-wrap {{ max-width: 900px; margin: 0 auto; }}
        .town-wrap > p {{ font-size: 1.1rem; line-height: 1.75; margin-bottom: 18px; }}
        .town-wrap h2 {{ margin: 48px 0 18px; font-size: clamp(1.6rem, 2.6vw, 2.1rem); }}
        .town-services {{ list-style: none; padding: 0; margin: 0 0 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }}
        .town-services li {{ display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: var(--mist); border-radius: 14px; font-weight: 550; color: var(--ink); }}
        .town-services i {{ font-size: 1.35rem; color: var(--accent-deep); flex-shrink: 0; }}
        .town-plan {{ margin: 22px 0 0; max-width: 520px; }}
        .town-notes {{ list-style: none; padding: 0; margin: 36px 0 8px; display: grid; gap: 14px; }}
        .town-notes li {{ display: flex; gap: 14px; align-items: flex-start; font-size: 1.05rem; color: var(--body-ink); }}
        .town-notes i {{ width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--accent-soft); color: var(--accent-deep); font-size: 1.2rem; flex-shrink: 0; }}
        .town-notes span {{ padding-top: 7px; }}
        .town-near {{ font-size: 1.05rem; }}
        .town-list {{ columns: 2; gap: 28px; padding-left: 20px; margin-bottom: 10px; }}
        .town-list li {{ margin-bottom: 8px; font-size: 1.02rem; }}
        @media (max-width: 640px) {{ .town-services {{ grid-template-columns: 1fr 1fr; gap: 8px; }} .town-services li {{ padding: 12px; font-size: .92rem; gap: 8px; }} .town-list {{ columns: 1; }} }}
    </style>
    <script type="application/ld+json">
{json.dumps(ld, indent=2)}
    </script>
</head>
{nav}

    <section id="main" tabindex="-1" class="vt-local-hero">
        <video class="vt-local-hero__video" autoplay muted loop playsinline preload="metadata" poster="media/hero-care-poster.jpg" aria-hidden="true" tabindex="-1"><source src="media/hero-care.mp4" type="video/mp4"></video>
        <div class="vt-local-hero__shade" aria-hidden="true"></div>
        <div class="container vt-local-hero__grid">
            <div>
                <div class="breadcrumb">
                    <a href="index.html">Home</a>
                    <span>/</span>
                    <a href="service-areas.html">Service Areas</a>
                    <span>/</span>
                    {crumb_mid}<span>{esc(n)}</span>
                </div>
                <h1>{esc(h1)}</h1>
                <p class="lead">Caring help at home for the people you love. It starts with a free home visit.</p>
                <ul class="vt-facts">{facts}</ul>
                <div class="vt-local-hero__ctas">
                    <a href="consult.html?when=now&amp;from=area-{t['slug']}" class="vt-btn vt-btn--solid">Get care started <i class="ph ph-arrow-right" aria-hidden="true"></i></a>
                    <a href="tel:7087264536" class="vt-btn vt-btn--ghost"><i class="ph ph-phone" aria-hidden="true"></i>(708) 726-4536</a>
                </div>
            </div>
            <figure class="vt-local-hero__fam">
                <img src="{fam[0]}" alt="{esc(fam[1])}" width="1400" height="1050">
                <figcaption><i class="ph ph-heart" aria-hidden="true"></i><span><strong>Care that feels like family</strong>The same caregiver, week after week</span></figcaption>
            </figure>
        </div>
    </section>

    <section class="town-family">
        <div class="container">
            <ul class="town-family__row">
                <li><i class="ph ph-users-three" aria-hidden="true"></i><div><strong>The same faces</strong><span>One matched caregiver, kept with you whenever we can.</span></div></li>
                <li><i class="ph ph-house-line" aria-hidden="true"></i><div><strong>Your routine, not ours</strong><span>We learn how the home runs and fit around it.</span></div></li>
                <li><i class="ph ph-phone-call" aria-hidden="true"></i><div><strong>Here when you call</strong><span>A real person answers, day or night.</span></div></li>
            </ul>
        </div>
    </section>

    <section class="vt-section">
        <div class="container town-wrap">
            <h2>What we help with</h2>
            <ul class="town-services">
                <li><i class="ph ph-shower" aria-hidden="true"></i>Bathing and dressing</li>
                <li><i class="ph ph-cooking-pot" aria-hidden="true"></i>Meals and cooking</li>
                <li><i class="ph ph-broom" aria-hidden="true"></i>Housekeeping and laundry</li>
                <li><i class="ph ph-pill" aria-hidden="true"></i>Medication reminders</li>
                <li><i class="ph ph-shopping-bag" aria-hidden="true"></i>Groceries and medication pickup</li>
                <li><i class="ph ph-brain" aria-hidden="true"></i>Memory care</li>
                <li><i class="ph ph-chats-circle" aria-hidden="true"></i>Companionship</li>
                <li><i class="ph ph-hand-heart" aria-hidden="true"></i>Respite for family</li>
            </ul>

            <div class="eg-card">
                <div><strong>Check availability in {esc(n)}</strong><p>Leave a number and zip. We call once, usually the same day.</p></div>
                <button type="button" class="vt-btn" data-engage="area-{t['slug']}" data-zip="{t['zips'][0] if t['zips'] else ''}" data-kicker="{esc(n)}" data-title="Check availability in {esc(n)}" data-button="Check availability" data-msg="availability in {esc(place)}">Check availability</button>
            </div>

            <ul class="town-notes">
                <li><i class="ph ph-map-pin" aria-hidden="true"></i><span>{local_short}</span></li>
                <li><i class="ph ph-first-aid" aria-hidden="true"></i><span>Coming home from {esc(hosp)}? We can set up care before discharge.</span></li>
                <li><i class="ph ph-wallet" aria-hidden="true"></i><span>Pay with long-term care insurance, VA benefits, some Medicare Advantage plans, or on your own. We check your coverage free. <a href="paying-for-care.html">Ways to pay</a></span></li>
            </ul>

            <h2>Common questions</h2>
            <div class="faq-list">
{faq_html}
            </div>

            {nearby_html}
        </div>
    </section>

    <section class="vt-final">
        <div class="container">
            <div class="vt-final__panel">
                <div>
                    <h2>Talk to someone local.</h2>
                    <p>Free home visit. No obligation.</p>
                </div>
                <div class="vt-final__ctas">
                    <a href="consult.html?when=now&amp;from=area-{t['slug']}-final" class="vt-btn vt-btn--light">Get care started</a>
                    <a href="tel:7087264536" class="vt-btn vt-btn--line-light"><i class="ph ph-phone" aria-hidden="true"></i>(708) 726-4536</a>
                </div>
            </div>
        </div>
    </section>

{footer}'''

for t in ALL:
    open(f"{SITE}/home-care-{t['slug']}.html", 'w').write(page(t))

def label(t):
    return 'Chicago (all neighborhoods)' if t.get('kind') == 'hub' else t['name']

# Homepage marquee chips (track is duplicated, second copy aria-hidden, for a seamless loop)
chips = ''.join(f'<a class="vt-chip" href="home-care-{t["slug"]}.html">{label(t)}</a>' for t in ALL)
idx = open(f'{SITE}/index.html').read()
if '<!--AREA_CHIPS-->' in idx:
    block = (f'<!--AREA_CHIPS-->\n                <div style="display:flex;gap:12px;">{chips}</div>\n'
             f'                <div style="display:flex;gap:12px;" aria-hidden="true">{chips.replace("<a ", "<a tabindex=\"-1\" ")}</div>\n<!--/AREA_CHIPS-->')
    idx = re.sub(r'<!--AREA_CHIPS-->.*?<!--/AREA_CHIPS-->', lambda m: block, idx, flags=re.S)
    open(f'{SITE}/index.html', 'w').write(idx)

# Service Areas: every listed town or neighborhood that has a page becomes a link
sa = open(f'{SITE}/service-areas.html').read()
for t in ALL:
    if t.get('kind') == 'hub': continue
    sa = sa.replace(f'<div class="area-item">{t["name"]}</div>',
                    f'<a class="area-item area-link" href="home-care-{t["slug"]}.html">{t["name"]} &rarr;</a>')
open(f'{SITE}/service-areas.html', 'w').write(sa)

# Sitemap: rebuild the home-care block from ALL
sm = open(f'{SITE}/sitemap.xml').read()
sm = re.sub(r'  <url>\n    <loc>https://vitaltouchcares.com/home-care-[^<]+</loc>\n.*?</url>\n', '', sm, flags=re.S)
entries = ''.join(f'  <url>\n    <loc>https://vitaltouchcares.com/home-care-{t["slug"]}.html</loc>\n    <lastmod>2026-10-12</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.8</priority>\n  </url>\n' for t in ALL)
sm = sm.replace('</urlset>', entries + '</urlset>')
open(f'{SITE}/sitemap.xml', 'w').write(sm)
# Zip lookup for the homepage "Do we serve your area?" checker
zipmap = {}
for t in ALL:
    if t.get('kind') == 'hub': continue
    for z in t['zips']:
        zipmap.setdefault(z, []).append([t['name'] + (', Chicago' if t.get('kind') == 'chicago' else ''), t['slug']])
open(f'{SITE}/js/zips.js', 'w').write('/* Generated by _tools/build-town-pages.py. Do not edit by hand. */\nwindow.VT_ZIPS = ' + json.dumps(zipmap, sort_keys=True) + ';\n')
print(json.dumps([t['slug'] for t in ALL]))
