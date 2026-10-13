"""Copy for the six paying-for-care guides. build-guides.py renders it.

Rules (owner, 2026-10): short sentences, warm, no jargon, no dashes. Never say
VitalTouch takes a payer it can't bill yet. Every number here traces to a source
in the guide's own `sources` list; when you change one, re-check its source and
bump REVIEWED. Strings are HTML.
"""

REVIEWED = {'iso': '2026-10-12', 'short': 'Oct 2026', 'long': 'October 12, 2026'}

P = 'images/care/'
PH = {
    'standing': (P + 'help-standing.jpg', 'A caregiver helping an older woman stand up at home'),
    'crutches': (P + 'kitchen-crutches.jpg', 'A caregiver with an older woman using crutches in her kitchen'),
    'meds': (P + 'medication-help.jpg', 'A caregiver helping an older woman with her medication at the kitchen table'),
    'meal': (P + 'meal-served.jpg', 'A caregiver serving a meal to an older man at his table'),
    'couch': (P + 'companionship-couch.jpg', 'An older man smiling on his couch with his caregiver beside him'),
    'reading': (P + 'reading-together.jpg', 'A caregiver reading with an older man on the couch'),
    'grooming': (P + 'grooming.jpg', 'A caregiver combing an older man’s hair at home'),
    'groceries': (P + 'groceries-delivered.jpg', 'A caregiver bringing groceries to an older woman at home'),
    'crate': (P + 'groceries-crate.jpg', 'A caregiver bringing a crate of groceries into an older man’s home'),
    'table': (P + 'kitchen-table-talk.jpg', 'A caregiver and an older woman talking at the kitchen table'),
    'greeting': (P + 'greeting-at-home.jpg', 'A caregiver greeting an older woman at home'),
    'sweeping': (P + 'housekeeping.jpg', 'A caregiver sweeping while an older woman with crutches sits nearby'),
}


def d(did, icon, title, lead, body, photo):
    return (did, icon, title, lead, body, PH[photo][0], PH[photo][1])


SRC_682 = ('Illinois Administrative Code, 89 IAC 682 (Home Services Program eligibility)', 'https://ilga.gov/agencies/JCAR/EntirePart?titlepart=08900682')
SRC_684 = ('Illinois Administrative Code, 89 IAC 684 (Home Services Program providers)', 'https://ilga.gov/agencies/JCAR/EntirePart?titlepart=08900684')
SRC_HSP_BOOK = ('IDHS Home Services Program Customer Guidebook (May 2025)', 'https://www.dhs.state.il.us/onenetlibrary/12/documents/Forms/5470_05.2025_HSP_Customer_Guidebook.pdf')
SRC_HSP = ('IDHS: Home Services Program', 'https://www.dhs.state.il.us/page.aspx?item=29738')
SRC_PD = ('HFS: Persons with Disabilities waiver', 'https://hfs.illinois.gov/medicalclients/hcbs/disablities.html')
SRC_LRI = ('HFS: paying spouses and parents of minors under the DRS waivers (March 2024)', 'https://hfs.illinois.gov/content/dam/soi/en/web/hfs/sitecollectiondocuments/mco065drswaiverslegallyresponsibleindividuals.pdf')
SRC_240 = ('Illinois Administrative Code, 89 IAC 240 (Community Care Program)', 'https://ilga.gov/agencies/JCAR/EntirePart?titlepart=08900240')
SRC_CCP = ('Illinois Department on Aging: Community Care Program', 'https://ilaging.illinois.gov/programs/ccp.html')
SRC_ELD = ('HFS: Persons who are Elderly waiver', 'https://hfs.illinois.gov/medicalclients/hcbs/elderly.html')
SRC_LIMITS = ('IDHS: 2026 monthly income standards', 'https://www.dhs.state.il.us/page.aspx?item=21741')
SRC_SHIP = ('Illinois Department on Aging: 2026 Medicaid income and asset limits', 'https://ilaging.illinois.gov/content/dam/soi/en/web/aging/ship/documents/medicaidincomeassetlimits.pdf')
SRC_ACA = ('HFS: notice to ACA adults about 2027 changes (September 2026)', 'https://hfs.illinois.gov/content/dam/soi/en/web/hfs/medicalclients/medicaidguide/ACAAdultCustomerNotice083126ToPrint.pdf')
SRC_HCI = ('HFS: 2026 HealthChoice Illinois contract awards', 'https://www.illinois.gov/content/dam/soi/en/web/illinois/iisnewsattachments/32620-601526.15.26-hci-contract-announcement-release-final.pdf.pdf')
SRC_CAREGIVER = ('Illinois Department on Aging: Family Caregiver Support Program', 'https://ilaging.illinois.gov/programs/caregiver/program.html')
SRC_NAIC = ('NAIC Shopper’s Guide to Long-Term Care Insurance, via the Illinois Department on Aging', 'https://ilaging.illinois.gov/content/dam/soi/en/web/aging/ship/documents/shoppers-guide-ltc-insur.pdf')

HSP_LINK = '<a href="guide-home-services-program.html">Home Services Program guide</a>'
MED_LINK = '<a href="guide-illinois-medicaid-home-care.html">Medicaid home care guide</a>'
FAM_LINK = '<a href="guide-paid-family-caregiver.html">Paid family caregiver guide</a>'

FIT_PENDING = [
    ('ph-phone', 'We help you apply', 'We’ll walk you through the call and what to have ready.'),
    ('ph-clock-countdown', 'Care while you wait', 'If you need help now, start with another way to pay and switch later.'),
    ('ph-signpost', 'We point you the right way', 'If an approved agency is the better fit, we’ll tell you how to find one.'),
]

GUIDES = [
  dict(
    slug='guide-home-services-program',
    title='Illinois Home Services Program (DRS), Explained',
    desc='Who qualifies for the Illinois Home Services Program, how to apply, what it pays for, and when a family member can be paid. For adults under 60 living with a disability.',
    short='Home Services Program',
    h1='The Illinois Home Services Program, explained',
    sub='Help at home for adults under 60 living with a disability. Who qualifies and how to apply.',
    glance_sub='Illinois Department of Human Services',
    glance=[('Age', 'Under 60 when you apply'), ('Need', 'A disability lasting 12+ months'),
            ('Savings', '$17,500 or less'), ('Cost share', 'None'), ('Apply', '(800) 843-6154')],
    who_h='Who it’s for',
    who_lead='Adults with a serious disability who need help at home to stay out of a nursing home.',
    who=['Under 60 when you apply. People with HIV or a brain injury can apply at any age.',
         'A disability expected to last at least 12 months, or for life.',
         'Enough need on the state’s assessment of daily tasks (a score of 29 or more).',
         '$17,500 or less in savings. Your home, car and belongings don’t count.',
         'An Illinois resident and a U.S. citizen or permanent resident.',
         'Willing to apply for Medicaid. You don’t have to qualify for it.'],
    who_not='60 or older? The Department on Aging runs a separate program. See the ' + MED_LINK + '.',
    photo=PH['crutches'],
    steps_lead='From the first call to a written plan. The state doesn’t publish a timeline, so ask your counselor.',
    steps=[('Call or apply online', 'Call (800) 843-6154 (TTY 866-324-5553), apply online, or visit a local Rehabilitation Services office. In a Medicaid health plan? Have your member ID ready.', 'Day one'),
           ('Interview and assessment', 'A counselor asks about your diagnosis, what you can and can’t do, and your income and savings. Bring proof of each.', 'With a counselor'),
           ('Your service plan', 'A counselor, or your health plan’s care coordinator, visits and writes the plan: what help, how many hours, and who provides it. Services start once it’s in place.', 'Home visit'),
           ('Checked every year', 'A new interview and assessment at least once a year.', 'Yearly')],
    details_lead='The questions families ask most.',
    details=[
      d('family', 'ph-users-three', 'Can a family member be paid?', 'Usually, if you hire them yourself.',
        '<p>You can hire your own worker, called a personal assistant, and the state pays them. Adult children, other relatives and friends can be hired.</p>'
        '<p>Spouses, and parents of a child under 18, can be paid only in limited cases for hands-on personal care. They must be hired directly, not through an agency.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>Every route, side by side: ' + FAM_LINK + '.</span></p>', 'couch'),
      d('covers', 'ph-list-checks', 'What it pays for', 'Help at home, plus equipment and home changes.',
        '<ul class="ip-list"><li>A personal assistant you hire</li><li>Homemaker help from an agency</li><li>Home health aide and nursing</li><li>Home-delivered meals</li><li>An emergency response button</li><li>Adult day care</li><li>Respite for family, up to 240 hours a year</li><li>Equipment and changes to the home</li></ul>'
        '<p>It doesn’t cover rides. A personal assistant can’t drive you.</p>', 'meal'),
      d('cost', 'ph-wallet', 'What it costs you', 'No monthly share of cost.',
        '<p>The program doesn’t charge you. If your income is over the Medicaid limit, you may have a spend-down, which works like a monthly deductible.</p>', 'table'),
      d('health-plan', 'ph-identification-card', 'If you’re in a Medicaid health plan', 'Your care coordinator helps.',
        '<p>The state still decides if you qualify. Your plan’s care coordinator visits, writes the plan and helps find workers. Tell Rehabilitation Services which plan you’re in.</p>', 'meds'),
      d('at-60', 'ph-calendar-check', 'What happens at 60', 'Most people stay in the program.',
        '<p>The age limit applies when you apply. At 60, people who only use homemaker help, adult day care or meals may move to the Department on Aging’s program, if they agree. Everyone else stays.</p>', 'greeting'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='We aren’t an approved provider for this program yet. We’ll still help you get started.',
    fit_points=FIT_PENDING,
    fit_card_title='What we can do today',
    fit_card=[(True, 'Help you apply'), (True, 'Care while your application is pending'),
              (True, 'Long-term care insurance, VA benefits, or paying on your own'),
              (False, 'Bill the Home Services Program (not yet)')],
    cta_h='Need help at home now?', cta_p='Tell us what you need. We’ll help with the next step.',
    sources=[SRC_682, SRC_684, SRC_HSP_BOOK, SRC_HSP, SRC_PD, SRC_LRI],
  ),
  dict(
    slug='guide-illinois-medicaid-home-care',
    title='Medicaid Home Care for Seniors in Illinois, Explained',
    desc='How people 60 and older in Illinois get help at home through the Community Care Program and Medicaid: who qualifies, 2026 limits, how to start, and Medicaid health plans.',
    short='Medicaid for seniors',
    h1='Medicaid home care for seniors in Illinois',
    sub='How people 60 and older get help at home through the state’s Community Care Program.',
    glance_sub='Illinois Department on Aging',
    glance=[('Age', '60 or older'), ('Need', 'Help with daily tasks'), ('Savings', '$17,500 or less'),
            ('Medicaid income', '$1,330 a month (one person, 2026)'), ('Start', '(800) 252-8966')],
    who_h='Who it’s for',
    who_lead='Older adults who need help with daily tasks to keep living at home.',
    who=['60 or older.',
         'Enough need on the state’s assessment of daily tasks (a score of 29 or more).',
         '$17,500 or less in savings. Your home, car and belongings don’t count.',
         'An Illinois resident and a U.S. citizen or eligible non-citizen.',
         'Willing to apply for Medicaid. Help can start while the application is pending.'],
    who_not='Under 60 with a disability? See the ' + HSP_LINK + '.',
    photo=PH['meal'],
    steps_lead='The state’s Senior HelpLine is the front door.',
    steps=[('Call the Senior HelpLine', '(800) 252-8966, Monday to Friday, 8:30 to 5. They connect you with your local care coordination office.', 'Day one'),
           ('A visit at home', 'A care coordinator asks what help you need and checks your income and savings.', 'Home visit'),
           ('A written answer', 'You get a written notice within 15 days of the decision. If you qualify, it comes with a plan and your hours.', 'Within 15 days'),
           ('Care starts', 'An approved agency sends a homecare aide for the hours in your plan.', 'Care begins')],
    details_lead='The questions families ask most.',
    details=[
      d('covers', 'ph-list-checks', 'What it covers', 'Help at home and a few extras.',
        '<ul class="ip-list"><li>Cleaning, meals, laundry, shopping and errands</li><li>Bathing, dressing and grooming</li><li>An emergency response button</li><li>Adult day service</li><li>An automatic medication dispenser</li></ul>', 'sweeping'),
      d('health-plan', 'ph-identification-card', 'If you have a Medicaid health plan', 'Call your care coordinator first.',
        '<p>Ask your plan’s care coordinator about help at home. In Cook County in 2026 the plans are Aetna Better Health, Blue Cross Community Health Plans, CountyCare, Meridian and Molina. Humana joins in 2027.</p>'
        '<p>If you call the HelpLine instead, give them your plan name and member ID.</p>', 'meds'),
      d('cost', 'ph-wallet', 'What it costs you', 'No monthly share of cost today.',
        '<p>Current rules have no monthly charge. If your income is over the Medicaid limit, you may have a spend-down. Hours beyond your plan are yours to pay.</p>', 'table'),
      d('family', 'ph-users-three', 'Can family be paid?', 'Only through an agency.',
        '<p>You can’t hire your own worker in this program. An approved agency can hire a relative as its homecare aide, and a spouse in limited cases.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>Every route, side by side: ' + FAM_LINK + '.</span></p>', 'couch'),
      d('apply-medicaid', 'ph-file-text', 'Applying for Medicaid', 'Online, or by phone.',
        '<p>Apply at <a href="https://abe.illinois.gov" rel="noopener">abe.illinois.gov</a> or call (800) 843-6154. In 2026 the limit for people 65 and older, blind or disabled is $1,330 a month for one person and $1,803 for two, with $17,500 in savings. A spouse at home can keep more.</p>', 'table'),
      d('changes', 'ph-calendar-blank', 'Medicaid changes in 2027', 'Most seniors aren’t affected.',
        '<p>New work rules and six-month renewals apply to adults 19 to 64 who aren’t on Medicare. People 65 and older, and people on Medicaid because of a disability, generally aren’t affected. <a href="changes.html">What’s changing</a></p>', 'reading'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='We can’t bill Medicaid or the Community Care Program yet. We’ll still help you get started.',
    fit_points=FIT_PENDING,
    fit_card_title='What we can do today',
    fit_card=[(True, 'Help you apply'), (True, 'Care while your application is pending'),
              (True, 'Long-term care insurance, VA benefits, or paying on your own'),
              (False, 'Bill Medicaid (not yet)')],
    cta_h='Need help at home now?', cta_p='Tell us what you need. We’ll help with the next step.',
    sources=[SRC_CCP, SRC_240, SRC_ELD, SRC_LIMITS, SRC_SHIP, SRC_HCI, SRC_ACA],
  ),
]

SRC_NAIC_FULL = ('NAIC: A Shopper’s Guide to Long-Term Care Insurance', 'https://content.naic.org/sites/default/files/publication-ltc-lp-shoppers-guide-long-term.pdf')
SRC_7702B = ('26 U.S.C. 7702B: who counts as chronically ill', 'https://www.law.cornell.edu/uscode/text/26/7702B')
SRC_FLTCIP = ('Federal Long Term Care Insurance Program: beginning the claims process', 'https://cdn.ltcfeds.com/planning-tools/downloads/Beginning-Claims-Process.pdf')
SRC_GENWORTH = ('Genworth: file a long-term care claim', 'https://www.genworth.com/claims/long-term-care-claims/file-a-claim')
SRC_IDOI = ('Illinois Department of Insurance: contact and complaints', 'https://idoi.illinois.gov/aboutus/contactus.html')
SRC_IRB = ('IRS Revenue Procedure 2025-32 (2026 limits)', 'https://www.irs.gov/irb/2025-45_IRB')
SRC_VA_AA = ('VA: Aid and Attendance and Housebound benefits', 'https://www.va.gov/pension/aid-attendance-housebound/')
SRC_VA_ELIG = ('VA: Veterans Pension eligibility', 'https://www.va.gov/pension/eligibility/')
SRC_VA_RATES = ('VA: Veterans Pension rates', 'https://www.va.gov/pension/veterans-pension-rates/')
SRC_VA_SURV = ('VA: Survivors Pension rates', 'https://www.va.gov/pension/survivors-pension-rates/')
SRC_VA_REP = ('VA: accredited representatives, frequently asked questions', 'https://www.va.gov/resources/va-accredited-representative-faqs/')
SRC_VA_HHA = ('VA: Homemaker and Home Health Aide care', 'https://www.va.gov/geriatrics/pages/homemaker_and_home_health_aide_care.asp')
SRC_VA_VDC = ('VA: Veteran-Directed Care', 'https://www.va.gov/geriatrics/pages/veteran-directed_care.asp')
SRC_VA_CG = ('VA Caregiver Support Program: benefits', 'https://www.caregiver.va.gov/support/support_benefits.asp')
SRC_MC_HH = ('Medicare.gov: home health services', 'https://www.medicare.gov/coverage/home-health-services')
SRC_MC_LTC = ('Medicare.gov: long-term care', 'https://www.medicare.gov/coverage/long-term-care')
SRC_KFF = ('KFF: Medicare Advantage 2026 spotlight', 'https://www.kff.org/medicare/medicare-advantage-2026-spotlight-a-first-look-at-plan-premiums-and-benefits/')
SRC_GUIDE_FAQ = ('CMS: GUIDE dementia model, frequently asked questions', 'https://www.cms.gov/priorities/innovation/guide/faqs')
SRC_GUIDE_MLN = ('CMS: GUIDE model fact sheet (July 2026)', 'https://www.cms.gov/files/document/mln7172818-guiding-improved-dementia-experience-model.pdf')
SRC_P502 = ('IRS Publication 502: medical and dental expenses', 'https://www.irs.gov/publications/p502')
SRC_P503 = ('IRS Publication 503: child and dependent care expenses', 'https://www.irs.gov/publications/p503')
SRC_P969 = ('IRS Publication 969: health savings accounts', 'https://www.irs.gov/publications/p969')
SRC_CFPB = ('CFPB: what is a reverse mortgage?', 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-reverse-mortgage-en-224/')

LTC_LINK = '<a href="guide-long-term-care-insurance.html">Long-term care insurance guide</a>'
VA_LINK = '<a href="guide-va-benefits.html">VA benefits guide</a>'

GUIDES += [
  dict(
    local_help=dict(
        h='Local help with a policy',
        p='Chicagoland long-term care insurance agents and financial advisors who help families plan for the cost of care.',
        empty='We&rsquo;re inviting local agents and advisors. Listings are free. Nobody pays us to be listed, and we don&rsquo;t pay for referrals.',
        invite='Are you a long-term care insurance agent or financial advisor? Get listed here, free.',
    ),
    slug='guide-long-term-care-insurance',
    title='Using Long-Term Care Insurance for Home Care, Explained',
    desc='How long-term care insurance pays for care at home: when a policy pays, the waiting period, how to start a claim, whether family can be paid, and what to do if a claim is denied.',
    short='Long-term care insurance',
    h1='Using long-term care insurance for care at home',
    sub='Most policies pay for help at home, not just nursing homes. Here’s how to start a claim.',
    glance_sub='How most policies work',
    glance=[('Pays when', 'Help needed with 2 of 6 daily tasks, or memory loss'), ('Waiting period', 'Often 20 to 100 days'),
            ('Family caregivers', 'Most policies don’t pay them'), ('To start', 'Call the claims number on the policy'),
            ('Complaints', '(866) 445-5364')],
    who_h='When a policy pays',
    who_lead='Most policies sold today pay for care at home once a licensed professional confirms you need it.',
    who=['You need help with at least 2 of 6 daily tasks: bathing, dressing, eating, toileting, continence, or getting in and out of a bed or chair.',
         'The need is expected to last at least 90 days.',
         'Or you need supervision because of serious memory loss or confusion.',
         'A doctor, nurse or licensed social worker certifies it.',
         'Care follows a written plan of care.'],
    who_not='Can’t find the policy? Look for papers from the insurance company, or ask whoever helps with finances. We can read it with you.',
    photo=PH['table'],
    steps_lead='Most claims follow the same path. Keep notes of every call.',
    steps=[('Find the policy', 'Look for the company name, the policy number and the claims phone number.', 'First'),
           ('Call the company', 'Say you want to start a long-term care claim. They’ll send forms. If you’re calling for a parent, they may ask for a power of attorney.', 'Day one'),
           ('Assessment', 'The company reviews medical records and may send a nurse, in person or by video.', 'Assessment'),
           ('The waiting period', 'Most policies pay only after a waiting period, often 20 to 100 days. Care during it is usually yours to pay.', '20 to 100 days'),
           ('Invoices and payment', 'Send itemized invoices each month. Some companies pay the agency directly if you sign an assignment of benefits.', 'Monthly')],
    details_lead='The questions families ask most.',
    details=[
      d('family', 'ph-users-three', 'Can a family member be paid?', 'Usually not.',
        '<p>Most policies don’t pay family members, and their care may not count toward the waiting period. A few allow it with limits, so read the policy.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>Other ways family can be paid: ' + FAM_LINK + '.</span></p>', 'couch'),
      d('waiting', 'ph-hourglass-medium', 'How the waiting period counts', 'Calendar days or service days.',
        '<p>Some policies count every day you qualify. Others count only days you receive paid care, so three visits a week takes much longer to count down than daily care. Ask which kind yours is.</p>', 'meal'),
      d('how-paid', 'ph-wallet', 'How it pays', 'Actual costs, or a set amount.',
        '<p>Most policies pay your actual costs up to a daily or monthly limit. Some pay a set amount whatever you spend, and you decide how to use it.</p>', 'table'),
      d('rider', 'ph-file-text', 'Life insurance with a care rider', 'It may pay too.',
        '<p>Some life insurance policies let you use part of the death benefit for care while you’re alive. It usually lowers what’s left for your family, and it uses the same test of need.</p>', 'reading'),
      d('denied', 'ph-warning-circle', 'If a claim is denied', 'Ask why, in writing.',
        '<p>Ask the company for the reason and how to appeal. For help, call the Illinois Department of Insurance at (866) 445-5364.</p>', 'meds'),
      d('taxes', 'ph-receipt', 'Taxes', 'Premiums can count as a medical expense.',
        '<p>Part of what you pay for a long-term care policy can count as a medical expense, up to a limit that rises with age ($6,200 a person at 71 and older in 2026).</p>', 'greeting'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='Most policies require a licensed home care agency. We’re licensed by the State of Illinois, and we do the paperwork with you.',
    fit_points=[('ph-magnifying-glass', 'We read the policy with you', 'What it pays, the waiting period, and what it leaves out.'),
                ('ph-receipt', 'Invoices the company accepts', 'Itemized by task each month, not just hours.'),
                ('ph-handshake', 'We can bill the company', 'When your policy allows an assignment of benefits.')],
    fit_card_title='What we can do today',
    fit_card=[(True, 'Licensed home care agency'), (True, 'Help with the claim forms'), (True, 'Itemized invoices every month'),
              (True, 'Bill the insurer directly, when allowed'), (False, 'Policies that require a Medicare-certified agency')],
    cta_h='Have a policy?', cta_p='Tell us the company. We’ll check it with you, free.',
    sources=[SRC_NAIC_FULL, SRC_7702B, SRC_FLTCIP, SRC_GENWORTH, SRC_IDOI, SRC_IRB],
  ),
  dict(
    slug='guide-va-benefits',
    title='VA Benefits for Home Care: Aid and Attendance and More',
    desc='VA benefits that help pay for care at home: Aid and Attendance amounts through November 2026, who qualifies, how to apply for free, and VA home care and family caregiver programs.',
    short='VA benefits',
    h1='VA benefits that help pay for care at home',
    sub='Aid and Attendance, VA home care, and support for family caregivers. For veterans and surviving spouses.',
    glance_sub='Rates through Nov 30, 2026',
    glance=[('Veteran', 'Up to $2,424 a month'), ('Veteran with a spouse', 'Up to $2,874 a month'),
            ('Surviving spouse', 'Up to $1,558 a month'), ('Net worth limit', '$163,699'), ('Help filing', 'Free')],
    who_h='Who qualifies for Aid and Attendance',
    who_lead='It’s extra money added to a VA pension for veterans and surviving spouses who need help with daily life.',
    who=['Served at least one day during a wartime period, with at least 90 days of active duty (24 months if you joined after September 7, 1980).',
         'Not dishonorably discharged.',
         '65 or older, permanently disabled, or receiving SSI or SSDI.',
         'Needs another person’s help with bathing, dressing or eating, or is bedbound, or has very limited eyesight.',
         'Net worth under $163,699. Your home and car don’t count.',
         'Surviving spouses who haven’t remarried can qualify too.'],
    who_not='The amount depends on your income, and medical costs you pay can count against that income. VA decides the final amount.',
    photo=PH['greeting'],
    steps_lead='Applying is free. No one should charge you to file.',
    steps=[('Get free help', 'Accredited veterans service organizations help for free. Charging a fee to prepare or file a first claim isn’t allowed under federal law.', 'Free'),
           ('Fill out the forms', 'Veterans use VA Form 21P-527EZ. Surviving spouses use 21P-534EZ. A doctor fills out Form 21-2680 about daily needs.', 'Forms'),
           ('Apply', 'Online at VA.gov, by mail, or at a VA regional office.', 'Apply'),
           ('Use it for care', 'The money is paid to you each month. You can use it for care from the provider you choose.', 'Monthly')],
    details_lead='Other VA help for care at home.',
    details=[
      d('hha', 'ph-house-line', 'VA Homemaker and Home Health Aide', 'For veterans in VA health care.',
        '<p>Aides from agencies under VA contract help with bathing, dressing, meals and shopping, and give family a break. You need to be enrolled in VA health care and meet VA’s need criteria. A copay may apply.</p>'
        '<p>Start with a VA social worker at Hines VA Hospital or Jesse Brown VA Medical Center.</p>', 'meal'),
      d('vdc', 'ph-sliders-horizontal', 'Veteran-Directed Care', 'A budget you control.',
        '<p>The veteran manages a budget and hires their own workers, which can include a family member or neighbor. Availability varies. Ask a VA social worker.</p>', 'couch'),
      d('caregiver', 'ph-users-three', 'Family caregiver stipend', 'For a 70% or higher service-connected rating.',
        '<p>The main family caregiver of a veteran who needs personal care for at least six months, from an injury or illness connected to service, can get a monthly stipend, plus at least 30 days of respite a year.</p>'
        '<p>VA Caregiver Support Line: (855) 260-3274.</p>', 'standing'),
      d('housebound', 'ph-house', 'Housebound benefit', 'If you’re mostly confined to home.',
        '<p>A smaller add-on to the pension, up to $1,776 a month for a veteran. You can’t get Housebound and Aid and Attendance at the same time.</p>', 'reading'),
      d('rates', 'ph-calendar-blank', 'Amounts change every December', 'New rates on December 1.',
        '<p>The amounts on this page run through November 30, 2026. VA updates them, and the net worth limit, each December.</p>', 'table'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='Aid and Attendance is paid to you, so you can use it with us today.',
    fit_points=[('ph-check-circle', 'Aid and Attendance works with us', 'It’s your money to use for care.'),
                ('ph-clock-countdown', 'Care while your claim is pending', 'Start now and keep your receipts.'),
                ('ph-signpost', 'VA home care contracts', 'We aren’t a VA-contracted agency yet. A VA social worker can point you to one.')],
    fit_card_title='What we can do today',
    fit_card=[(True, 'Care paid with Aid and Attendance'), (True, 'Care while your claim is pending'),
              (True, 'Point you to free filing help'), (False, 'VA Homemaker and Home Health Aide program (not yet)')],
    cta_h='A veteran in the family?', cta_p='Tell us what you need. We’ll help with the next step.',
    sources=[SRC_VA_AA, SRC_VA_ELIG, SRC_VA_RATES, SRC_VA_SURV, SRC_VA_REP, SRC_VA_HHA, SRC_VA_VDC, SRC_VA_CG],
  ),
  dict(
    slug='guide-paid-family-caregiver',
    title='Getting Paid to Care for a Family Member in Illinois',
    desc='The real ways a relative can be paid to provide care in Illinois: the Home Services Program, the Community Care Program, VA programs, long-term care insurance, and home care agencies.',
    short='Paid family caregivers',
    h1='Getting paid to care for a family member',
    sub='The real ways a relative can be paid for care in Illinois, and the limits of each.',
    glance_sub='Illinois, 2026',
    glance=[('Under 60, with a disability', 'Hire them yourself'), ('60 and older', 'Only through an agency'),
            ('Veterans', 'Some VA programs'), ('Insurance', 'Most policies don’t'), ('Spouses', 'Limited cases')],
    who_h='Who can be paid',
    who_lead='Adult children, other relatives and friends can usually be paid. Spouses are the hardest case.',
    who=['Adult children and grandchildren', 'Brothers, sisters, nieces and nephews', 'Friends and neighbors',
         'Spouses, only in limited cases for hands-on personal care',
         'Parents of a child under 18, only in limited cases'],
    who_not='No program pays family just for being family. The money comes from a state program, the VA, insurance, or the family itself.',
    photo=PH['couch'],
    steps_lead='The route depends on age, disability, veteran status and insurance.',
    steps=[('Find your route', 'Use the list below to see which programs fit the person who needs care.', 'First'),
           ('Check eligibility', 'The person who needs care is assessed, not the caregiver. Each route has its own rules.', 'Assessment'),
           ('Get hired', 'In the Home Services Program, the person hires you directly. Everywhere else, an agency hires, trains and pays you as its employee.', 'Hiring'),
           ('Before the first shift', 'Expect a background check, training, and timesheets or a check-in app.', 'Paperwork')],
    details_lead='Every route we know of, with its limits.',
    details=[
      d('hsp', 'ph-wheelchair', 'Under 60 with a disability', 'Home Services Program.',
        '<p>The person hires their own personal assistant and the state pays them. Most relatives qualify.</p>'
        '<p>Spouses and parents of a child under 18 can be paid only for extraordinary hands-on care, hired directly, and for limited hours a week.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>' + HSP_LINK + '</span></p>', 'crutches'),
      d('ccp', 'ph-identification-card', '60 and older', 'Community Care Program, through an agency.',
        '<p>There’s no option to hire family yourself. An approved agency can hire a relative as its homecare aide, and a spouse in limited cases.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>' + MED_LINK + '</span></p>', 'meal'),
      d('va', 'ph-medal', 'Veterans', 'Some VA programs pay family.',
        '<p>Veteran-Directed Care lets a veteran hire family or neighbors with a VA budget. The VA family caregiver program pays a monthly stipend to the main caregiver of a veteran with a 70% or higher service-connected rating.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>' + VA_LINK + '</span></p>', 'greeting'),
      d('ltc', 'ph-shield-check', 'Long-term care insurance', 'Read the policy.',
        '<p>Most policies don’t pay family members. A few allow it with limits, and some pay a set amount you can spend as you choose.</p>'
        '<p class="chg__do"><i class="ph ph-lightbulb" aria-hidden="true"></i><span>' + LTC_LINK + '</span></p>', 'table'),
      d('agency', 'ph-buildings', 'Through a home care agency', 'Trained, on payroll, with a backup.',
        '<p>An agency can hire your relative as its caregiver. They get trained and paid by the hour, and the agency sends someone else when they’re sick or need a break. The care is paid for on your own, with VA Aid and Attendance, or by a policy that allows it.</p>', 'standing'),
      d('support', 'ph-hand-heart', 'Support for unpaid caregivers', 'Respite and training.',
        '<p>The Illinois Family Caregiver Support Program doesn’t pay caregivers, but it offers respite, training and support groups. Call the Senior HelpLine at (800) 252-8966.</p>', 'reading'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='We can hire, train and pay a relative or friend as our caregiver.',
    fit_points=[('ph-user-plus', 'We hire and train them', 'If they qualify, they join our team.'),
                ('ph-wallet', 'Paid on our payroll', 'By the hour, with taxes handled.'),
                ('ph-lifebuoy', 'A backup plan', 'If they’re sick or need a break, we send someone else.')],
    fit_card_title='What we can do today',
    fit_card=[(True, 'Hire a relative or friend as our caregiver'), (True, 'Paid on your own or with VA Aid and Attendance'),
              (True, 'Insurance, if your policy allows it'), (False, 'State program routes (not yet)')],
    cta_h='Someone you trust in mind?', cta_p='Tell us about them. We’ll check if they qualify.',
    sources=[SRC_684, SRC_LRI, SRC_240, SRC_VA_VDC, SRC_VA_CG, SRC_NAIC, SRC_CAREGIVER],
  ),
  dict(
    slug='guide-medicare-and-paying-on-your-own',
    title='What Medicare Covers at Home, and Paying on Your Own',
    desc='What Original Medicare and Medicare Advantage pay for at home, the GUIDE dementia respite benefit, and the tax breaks and savings families use to pay for everyday help.',
    short='Medicare and paying on your own',
    h1='Medicare, and paying for care on your own',
    sub='What Medicare pays for at home, what it doesn’t, and how families pay for the rest.',
    glance_sub='2026',
    glance=[('Original Medicare', 'Short-term skilled care only'), ('Everyday help alone', 'Not covered'),
            ('Medicare Advantage', 'Some plans include help at home'), ('Dementia respite', 'Up to $2,625 a year'),
            ('Open enrollment', 'Oct 15 to Dec 7')],
    who_h='What Original Medicare covers at home',
    who_lead='Medicare pays for short-term skilled care at home. It doesn’t pay for everyday help on its own.',
    who=['Part-time nursing or therapy that a doctor orders.',
         'For someone who is mostly homebound.',
         'A home health aide, but only alongside that skilled care.',
         'From a Medicare-certified home health agency.'],
    who_not='Medicare doesn’t pay for bathing, dressing, meals or housekeeping when that’s the only help you need. That’s where the options below come in.',
    photo=PH['meds'],
    steps_lead='How most families cover everyday help.',
    steps=[('Check your Medicare Advantage plan', 'Some plans include in-home help hours. Look in your Evidence of Coverage or call the number on your card.', 'Plan papers'),
           ('Look for other coverage', 'Long-term care insurance, a life insurance care rider, or VA benefits may pay. See the guides below.', 'Other coverage'),
           ('Use the tax breaks', 'Home care can count as a medical expense, and work-related care costs may qualify for a credit.', 'Tax time'),
           ('Start with the hours you need', 'With us, paying on your own is month to month. Add hours as needs grow.', 'Month to month')],
    details_lead='The questions families ask most.',
    details=[
      d('advantage', 'ph-heartbeat', 'Medicare Advantage help at home', 'Some plans include it.',
        '<p>In 2026, about 7% of Medicare Advantage plans, and 25% of special needs plans, list in-home support. Hours are limited and some plans use their own vendor.</p>'
        '<p>Open enrollment runs October 15 to December 7, 2026. Free Medicare counseling (SHIP): (800) 548-9034.</p>', 'meds'),
      d('guide', 'ph-brain', 'Dementia respite (GUIDE)', 'For Original Medicare.',
        '<p>GUIDE programs pay for respite, up to $2,625 a year in 2026, for people living with dementia who have an unpaid family caregiver. The money goes to the program, not the family.</p>'
        '<p>Chicago-area programs include UChicago Medicine, Rush and the Advocate Memory Center. Ask the doctor or memory clinic.</p>', 'reading'),
      d('taxes', 'ph-receipt', 'Tax breaks', 'Care can count as a medical expense.',
        '<p>If a doctor, nurse or licensed social worker certifies that someone needs help with 2 daily tasks or has serious memory loss, and care follows a plan, home care can count as a medical expense. Medical costs above 7.5% of income are deductible.</p>'
        '<p>Pay to a relative usually doesn’t count unless they’re licensed. If you work, a dependent care account or credit may help. Ask a tax professional.</p>', 'table'),
      d('hsa', 'ph-piggy-bank', 'Health savings accounts', 'HSA money can pay for qualified care.',
        '<p>Money in a health savings account can pay for qualified long-term care services, as well as long-term care insurance premiums up to a limit.</p>', 'groceries'),
      d('reverse', 'ph-house-line', 'Home equity', 'A reverse mortgage, at 62 or older.',
        '<p>Some homeowners 62 and older use a reverse mortgage. You must meet with a HUD-approved counselor first. Talk with someone you trust before you sign anything.</p>', 'greeting'),
    ],
    fit_h='Where VitalTouch fits',
    fit_p='Paying on your own is simple with us. No long contracts.',
    fit_points=[('ph-calendar-check', 'Month to month', 'No minimums. Change hours any time.'),
                ('ph-receipt', 'Itemized invoices', 'Useful at tax time and for any insurance claim.'),
                ('ph-arrows-clockwise', 'Switch later', 'If a benefit comes through, we switch your billing over.')],
    fit_card_title='What we can do today',
    fit_card=[(True, 'Care paid on your own, month to month'), (True, 'Itemized invoices'),
              (True, 'Help reading your Medicare Advantage benefit'), (False, 'Bill Original Medicare (it doesn’t cover this care)')],
    cta_h='Ready to start small?', cta_p='Tell us what you need. We’ll suggest the hours.',
    sources=[SRC_MC_LTC, SRC_MC_HH, SRC_KFF, SRC_GUIDE_FAQ, SRC_GUIDE_MLN, SRC_P502, SRC_P503, SRC_P969, SRC_CFPB],
  ),
]

ORDER = ['guide-long-term-care-insurance', 'guide-va-benefits', 'guide-medicare-and-paying-on-your-own',
         'guide-paid-family-caregiver', 'guide-illinois-medicaid-home-care', 'guide-home-services-program']
GUIDES.sort(key=lambda g: ORDER.index(g['slug']))
