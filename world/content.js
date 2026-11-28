/* Everything the world says, in one place.
   Source: Pratham's resume (off-campus one-pager) and the earlier site.
   Each place has spots; each spot is one physical thing in the world
   (the `object` line tells the builder what to make; it is never shown). */

export const PERSON = {
  name: 'Pratham Gupta',
  first: 'Pratham',
  line: 'I find the friction. Then I fix it.',
  sub: 'MBA 2027 at BITSoM. Strategy, marketing and operations. I grew a bus business, stopped a warehouse leak and now build AI products.',
  status: 'Open to roles',
  email: 'prathamg329@gmail.com',
  phone: '+91 80768 78652',
  tel: '+918076878652',
  linkedin: 'https://www.linkedin.com/in/pgupta05',
  portrait: 'images/pratham.webp',
  headline: [
    ['₹2.5 Cr', 'new B2B business won'],
    ['~₹20 L', 'losses stopped at BigBasket'],
    ['Top 30', 'team, Tata Imagination finals'],
    ['#1', 'of 60+ Rotaract clubs, as Vice President'],
  ],
};

export const PLACES = [
  /* ------------------------------------------------------------------ */
  {
    id: 'plaza', name: 'Town Square', label: 'Start here', color: '#FF6A2B', icon: 'map-pin',
    kicker: 'Welcome',
    spots: [
      {
        id: 'main', title: "Hi, I'm Pratham.",
        object: 'Welcome board / kiosk at the south edge of the plaza (core builds it)',
        lead: 'I find the friction in messy systems, then fix it for good. This town is my career so far: walk to any building and step onto a glowing marker to see what happened there.',
        metrics: [['₹2.5 Cr', 'new B2B business won'], ['~₹20 L', 'losses stopped'], ['Top 30', 'Tata Imagination finals'], ['#1', 'of 60+ Rotaract clubs']],
        bullets: [
          'MBA 2027 at BITS School of Management, Mumbai',
          'Strategy, marketing and operations',
          'Walk with the arrow keys or WASD, or tap where you want to go. Open the map to jump anywhere.',
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'dtu', name: 'Delhi Technological University', label: 'University', color: '#E07A2E', icon: 'graduation-cap',
    kicker: 'Education · graduated 2023', role: 'BA (Hons) Economics',
    spots: [
      {
        id: 'main', title: 'Where it started',
        object: 'Main academic building: red-brick block with a central clock tower, steps and a lawn in front',
        lead: 'Every system runs on incentives. Economics taught me to start by asking who gains and who pays.',
        metrics: [['84.6%', 'final score'], ['BA (Hons)', 'Economics']],
        skills: ['Economic reasoning', 'Research', 'Data analysis'],
      },
      {
        id: 'econ', title: 'The data lab',
        object: 'Library / computer lab wing with a chalkboard of charts visible through big windows',
        lead: 'Where I learned to make numbers argue honestly.',
        bullets: [
          'Top 5% of 120 peers in Applied Econometrics',
          'Top 10% of 52, with distinction in four finance electives',
        ],
        skills: ['Econometrics', 'Finance', 'Statistics'],
      },
      {
        id: 'rotaract', title: 'Rotaract Club of USME',
        object: 'Student club house / activity pavilion with a banner, notice board and a small stage',
        kicker: 'Vice President · 2023',
        lead: 'My first time leading people who chose to follow.',
        metrics: [['#1', 'of 60+ clubs in Rotaract District 3012'], ['2', 'Best Institutional Club Awards'], ['200+', 'members, 10+ events']],
        skills: ['Team leadership', 'Event management', 'Community building'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'htl', name: 'Himanshu Travel Line', label: 'Bus depot', color: '#F2B705', icon: 'bus',
    kicker: 'Work · Jun 2023 – Apr 2025', role: 'Associate Manager, Operations & Growth',
    spots: [
      {
        id: 'main', title: 'The depot',
        object: 'Depot office at the entrance gate: two-storey office with reception, company sign, boom barrier',
        lead: "Customers don't buy the cheapest seat. They buy the bus that shows up. For two years I ran operations and growth for a school and corporate bus fleet.",
        metrics: [['₹2.5 Cr', 'B2B deals closed'], ['₹76 L', 'revenue from a pricing revamp'], ['+26%', 'more buses available each day']],
        skills: ['B2B sales', 'Key accounts', 'Fleet operations', 'Pricing', 'Route planning'],
      },
      {
        id: 'contracts', title: 'The contracts desk',
        object: 'Client meeting room / glass-fronted office with a table, contract folders and a framed school/corporate client wall',
        lead: 'Winning the account was half the job. Keeping it was the other half.',
        metrics: [['₹2.5 Cr', 'closed in B2B deals'], ['2', 'new corporate contracts'], ['5', 'existing contracts grown']],
        bullets: [
          'Negotiated 2 new corporate contracts and expanded fleet deployment in 5 existing ones',
          'Retained 3 key B2B accounts with monthly legal and client-conduct training at client schools, to show our crew standards',
        ],
        skills: ['Negotiation', 'Account management'],
      },
      {
        id: 'fleet', title: 'The parking bays',
        object: 'Rows of numbered bus parking bays with school buses and coaches parked nose-in; a few marked PREMIUM with shiny upgraded coaches',
        lead: 'Same fleet, more trips, better price.',
        metrics: [['₹76 L', 'revenue across 50+ vehicles'], ['₹20 L', 'premium revenue'], ['30+', 'vehicles upgraded']],
        bullets: [
          'Revamped corporate pricing and added customer-referred B2C bookings: ₹76 L across 50+ vehicles',
          'Upgraded 30+ vehicles with modern tech and repositioned them as premium: ₹20 L in premium revenue',
        ],
        skills: ['Pricing', 'Product positioning'],
      },
      {
        id: 'dispatch', title: 'The dispatch tower',
        object: 'Small control tower / dispatch cabin with screens showing a GPS route map, next to the exit lane; a crew briefing area with a whiteboard beside it',
        lead: 'Late buses were a routing and discipline problem, not a driver problem.',
        metrics: [['−47%', 'service delays'], ['+26%', 'vehicle availability'], ['−28%', 'departure delays in two months']],
        bullets: [
          'GPS-based rerouting and real-time driver support cut service delays 47%, improving on-time school arrivals',
          'Staggered bus dispatch and shifted routes, unlocking more daily trips from the same fleet (+26% availability)',
          'Daily crew briefings and checklist accountability cut departure delays 28% in two months',
        ],
        skills: ['Operations', 'Process design', 'GPS routing'],
      },
      {
        id: 'fuel', title: 'The fuel bay',
        object: 'Fuel island with a canopy, two pumps and a bus refuelling',
        lead: 'The cheapest kilometre is the one you don’t drive.',
        metrics: [['₹9 L', 'fuel saved per year'], ['+15%', 'productive vehicle hours']],
        bullets: ['Remapped routes and used fleet capacity better, saving ₹9 L a year in fuel and lifting productive vehicle hours 15%'],
        skills: ['Route optimisation', 'Capacity planning'],
      },
      {
        id: 'records', title: 'The records room',
        object: 'Admin / workshop building at the back: a records office (shelves turning into a computer screen) beside a maintenance shed',
        lead: 'Paper logs were slow and expensive. So they went.',
        metrics: [['₹4.2 L', 'saved a year by going digital'], ['₹1.6 L', 'fixed costs cut a year']],
        bullets: [
          'Digitised records and streamlined admin, ending the dependence on manual logs',
          'Switched to cheaper vendors and right-sized fixed overheads in low-usage months',
        ],
        skills: ['Digitisation', 'Vendor management', 'Cost control'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'lss', name: 'Six Sigma Workshop', label: 'Green Belt', color: '#2FA84F', icon: 'badge-check',
    kicker: 'Certified · 2026', role: 'Lean Six Sigma Green Belt',
    spots: [
      {
        id: 'main', title: 'Green Belt',
        object: 'Bright workshop building with a sawtooth roof, big roller door open, green belt banner',
        lead: 'Measure the leak, fix the cause, then make the fix stick.',
        metrics: [['Green Belt', 'Lean Six Sigma, certified']],
        bullets: ['Apply DMAIC and root-cause analysis to drive operational improvement'],
        skills: ['DMAIC', 'Root-cause analysis', 'Process mapping', 'Statistical control'],
      },
      {
        id: 'dmaic', title: 'The process line',
        object: 'A short conveyor line outside or inside the open door with 5 stations labelled Define, Measure, Analyse, Improve, Control, boxes moving along it',
        lead: 'Five steps I now run almost by reflex.',
        bullets: [
          'Define: agree the problem and the number that proves it',
          'Measure: get the baseline before touching anything',
          'Analyse: find the root cause, not the loudest symptom',
          'Improve: change the process, test it small',
          'Control: build the check that keeps the fix in place',
        ],
        skills: ['Lean', 'Kaizen', 'Control charts'],
      },
      {
        id: 'certs', title: 'The certificate wall',
        object: 'A wall or pavilion with three framed certificates and a small reading bench',
        lead: 'Learning I went looking for.',
        bullets: [
          'Lean Six Sigma Green Belt',
          'Google Advanced Data Analytics Professional Certificate',
          'Wharton (UPenn): Marketing; Business Foundations',
        ],
        skills: ['Data analytics', 'Marketing'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'bitsom', name: 'BITS School of Management', label: 'MBA campus', color: '#D6336C', icon: 'landmark',
    kicker: 'Education · 2025 – 2027', role: 'MBA · Mumbai',
    spots: [
      {
        id: 'main', title: 'The MBA',
        object: 'Modern glass-and-white academic block with a big entrance canopy and campus name in plain letters',
        lead: 'A strategy is only as good as the plan that carries it out. Here I test both, against real companies.',
        metrics: [['Top 30', 'team, Tata Imagination finals'], ['2×', 'Flipkart WiRED semi-finalist'], ['₹12 L', 'sponsorship raised']],
        skills: ['Strategy', 'Marketing', 'E-commerce', 'Negotiation'],
      },
      {
        id: 'cases', title: 'The case arena',
        object: 'A rounded pavilion / amphitheatre with a trophy cabinet and a big leaderboard screen',
        lead: 'Real briefs. Real rankings. Companies hand over a real problem and rank the answers.',
        rows: [
          ['Top 30 team', 'Tata Imagination Challenge 2026', 'National finalist'],
          ['Semi-finalist ×2', 'Flipkart WiRED 9 & 10', 'Of 35,000+; internship PPI at WiRED 9'],
          ['Top 13', 'TCPL Grow Beyond Better', 'Of 14,000+ entries; earned a PPI'],
          ['1st in semi-finals', 'Case Consilium, BITS Goa', 'Advanced to the finals'],
        ],
        skills: ['Problem framing', 'Market sizing', 'Storytelling'],
      },
      {
        id: 'roar', title: 'Roar & Conclave stage',
        object: 'Outdoor festival stage / auditorium with a truss, banners and a sponsor board (plain text, no real logos)',
        kicker: 'Sponsorship · BITSoM flagship events',
        lead: 'Sponsorship is sales with a deadline you can’t move.',
        metrics: [['₹12 L', 'raised in sponsorship'], ['80 / 200+', 'qualified leads converted'], ['₹25 L', 'budget across 10 domains']],
        bullets: [
          'Converted 80 of 200+ qualified leads into ₹12 L, with SBI as title sponsor',
          'Structured a ₹25 L sponsorship budget across 10 domains for the cultural fest and the CXO leadership summit',
        ],
        skills: ['Sponsorship sales', 'Budgeting'],
      },
      {
        id: 'deans', title: 'All India Deans Conference',
        object: 'A conference hall with a long glass front, flags on poles and a row of chairs facing a podium',
        kicker: 'Ops & Logistics Head',
        lead: 'Two days, deans from the world’s top schools, and no room for a missed detail.',
        bullets: [
          'Ran venue layout, staging, catering, transport and vendor SLAs for a 2-day summit',
          'Curated a premium guest experience for deans of USC Marshall, Cornell Johnson, Durham, NTU Nanyang and ISB Hyderabad',
        ],
        skills: ['Event operations', 'Vendor SLAs', 'Guest experience'],
      },
      {
        id: 'opscom', title: 'Operations Committee',
        object: 'A committee room / student office with a laptop wall showing a workflow diagram and a canteen counter next to it',
        kicker: 'Senior Member',
        lead: 'Small fixes that give people their week back.',
        metrics: [['48', 'man-hours saved every week']],
        bullets: [
          'Built an AI workflow optimiser across verticals, saving 48 man-hours a week',
          'Shaped a new student credit subscription plan by negotiating menu pricing and meal options with the TajSATS head office',
        ],
        skills: ['AI workflows', 'Negotiation'],
      },
      {
        id: 'preql', title: 'PreQL',
        object: 'A small analytics club room / glass box with screens of charts',
        kicker: 'Senior member · BITSoM AI & Analytics Club',
        lead: 'Helping classmates get to the answer faster.',
        bullets: ['Built an AI campaign tracker', 'Run sessions that help classmates crack cases faster'],
        skills: ['Analytics', 'AI tools', 'Teaching'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'bb', name: 'BigBasket', label: 'Grocery store', color: '#7DB928', icon: 'shopping-basket',
    kicker: 'Summer internship · Apr – Jun 2026', role: 'Strategic Initiatives Intern · a Tata enterprise',
    spots: [
      {
        id: 'main', title: 'The store',
        object: 'Bright grocery store front with big glass windows, produce crates outside, the name "BigBasket" in plain lettering (no logo)',
        lead: 'Stock was leaking through write-offs and returns nobody tracked. Now they are tracked daily, in 22 cities.',
        metrics: [['~₹20 L', 'saved'], ['1.21% → 0.88%', 'SKU write-off, as a share of sales'], ['22', 'cities']],
        skills: ['Inventory control', 'Loss analysis', 'Process design', 'Stakeholder alignment'],
      },
      {
        id: 'shelves', title: 'The fresh aisle',
        object: 'Shelves of produce and packaged goods with date tags; visible through the windows or as an outdoor market row',
        lead: 'First expiry, first out. Simple rules, enforced daily.',
        metrics: [['~₹20 L', 'saved'], ['27% → 18%', 'top-1000 SKU wastage share']],
        bullets: [
          'Cut SKU write-off from 1.21% to 0.88% of sales across 22 cities with FEFO, MBQ and days-on-hand controls',
          'Moved cities from monthly to daily tracking with SKU-level root-cause analysis',
        ],
        skills: ['FEFO', 'Root-cause analysis'],
      },
      {
        id: 'returns', title: 'The returns dock',
        object: 'Return-to-vendor (RTV) counter / small dock with stacked crates and a cage marked RETURNS',
        lead: 'The loss head office couldn’t see.',
        metrics: [['−60%', 'RTV loss'], ['₹1.8 L', 'a month, after the cut']],
        bullets: ['Uncovered an untracked return-to-vendor loss, added it to daily reporting and cut it 60% to ₹1.8 L a month'],
        skills: ['Loss analysis', 'Reporting'],
      },
      {
        id: 'dashboard', title: 'The live dashboard',
        object: 'A big outdoor screen / control-room window showing a city map with 22 dots and a write-off chart',
        lead: 'From a 2-day lag to same-day.',
        bullets: [
          'Built a live write-off dashboard for 22 cities, removing a 2-day reporting lag',
          'Pitched an AI trend layer on top of it to head-office leaders',
        ],
        skills: ['Dashboards', 'Data storytelling'],
      },
      {
        id: 'audit', title: 'The bin audit',
        object: 'Warehouse racking (dark store) with bins, a supervisor with a clipboard/tablet, a checklist board',
        lead: 'The fewer expired items on shelves, the fewer angry customers.',
        metrics: [['−25%', 'customer expiry complaints'], ['92%', 'bin audit completion'], ['500', 'SKUs checked daily']],
        bullets: ['Lifted bin audit completion to 92% with supervisor-led daily checks of 500 SKUs'],
        skills: ['Audit design', 'Floor operations'],
      },
      {
        id: 'dock', title: 'The loading dock',
        object: 'Dark store / distribution centre loading dock with a delivery van, electric delivery scooters and pallets',
        lead: 'Strategy is easier when you’ve stacked the crates yourself.',
        bullets: [
          'Flagged SKU-level transit damage across distribution centres and dark stores using real-time route data, and drove fixes with city teams',
          'Ran dark store and DC floor operations firsthand: stacking, GRN, PO generation and bin audits',
        ],
        skills: ['Supply chain', 'Last-mile operations'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'ailab', name: 'AI Lab', label: 'Products', color: '#3B82F6', icon: 'cpu',
    kicker: 'Now', role: 'Product builder',
    spots: [
      {
        id: 'main', title: 'Building with AI',
        object: 'A modern glass cube / pavilion lab with a light-blue accent, screens visible inside',
        lead: 'I used to hand the fix to someone else. Now I build it myself.',
        metrics: [['4', 'products built'], ['1', 'live and public']],
        skills: ['Product thinking', 'Rapid prototyping', 'LLMs & RAG', 'UX'],
      },
      { id: 'transit-one', title: 'Transit One', product: 'transit-one', object: 'Product kiosk 1: a standing screen showing images/transit-one-preview.png (a phone app), with a small bus model beside it' },
      { id: 'finbuddy', title: 'FinBuddy', product: 'finbuddy', object: 'Product kiosk 2: a standing screen showing images/finbuddy-preview.png, with a coin/chart sculpture' },
      { id: 'crave', title: 'Crave Command Center', product: 'crave', object: 'Product kiosk 3: a standing screen showing images/crave-preview.png, with a delivery scooter' },
      { id: 'chhatri', title: 'Chhatri', product: 'chhatri', object: 'Product kiosk 4: a standing screen showing images/chhatri-preview.png, with a little house with a white cool roof' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'lead', name: 'Leadership Square', label: 'Leadership', color: '#7C5CFF', icon: 'users',
    kicker: 'Leadership', role: 'People follow clarity.',
    spots: [
      {
        id: 'main', title: 'People follow clarity.',
        object: 'A town hall with a columned porch and steps, facing a square with a flag',
        lead: 'Roles where people had a choice whether to follow. Each one lives in its building around town; here they are together.',
        rows: [
          ['Sponsorship', 'Roar & Conclave, BITSoM', '₹12 L raised, SBI as title sponsor'],
          ['Ops & Logistics Head', 'All India Deans Conference', 'A 2-day summit of global deans'],
          ['Senior Member', 'Operations Committee, BITSoM', '48 man-hours saved a week'],
          ['Senior member', 'PreQL, BITSoM AI & Analytics Club', 'AI campaign tracker'],
          ['Mentor', 'Theomi', 'MBA aspirants'],
          ['Award', 'Techstars Startup Weekend', 'Outstanding Professional Development'],
          ['Vice President', 'Rotaract Club of USME', '#1 of 60+ clubs in District 3012'],
        ],
      },
      {
        id: 'techstars', title: 'Techstars Startup Weekend',
        object: 'A plinth with an award sculpture (abstract, no logo) in the square',
        kicker: 'Award',
        lead: 'A weekend to take an idea from a pitch to a plan.',
        bullets: ['Outstanding Professional Development Award'],
        skills: ['Pitching', 'Teamwork under pressure'],
      },
      {
        id: 'theomi', title: 'Theomi',
        object: 'A shaded corner with benches and a small round table where two people sit talking (mentoring)',
        kicker: 'Mentor',
        lead: 'Paying it forward to the next set of MBA aspirants.',
        bullets: ['Mentoring MBA aspirants on their way to business school'],
        skills: ['Mentoring', 'Coaching'],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'curious', name: 'Still Curious Park', label: 'Off the clock', color: '#14B8A6', icon: 'trees',
    kicker: 'Off the clock', role: 'Still curious.',
    spots: [
      { id: 'main', title: 'Still curious.', object: 'Park entrance arch with a small lake behind it', lead: 'What I do when I’m not fixing things.' },
      { id: 'music', title: 'Music & singing', object: 'A bandstand / small open-air stage with a mic stand and speakers', lead: 'A different kind of expression.', image: 'images/curious/music.jpg' },
      { id: 'pool', title: 'Pool', object: 'An open-sided pavilion with a pool table under pendant lights', lead: 'Angles, patience and a good game.', image: 'images/curious/pool.jpg' },
      { id: 'food', title: 'New cuisines', object: 'A row of colourful food stalls / carts with umbrellas and tables', lead: 'Always chasing a new flavour.', image: 'images/curious/cuisines.jpg' },
      { id: 'travel', title: 'Travel', object: 'A signpost with arrows to far-off places and a suitcase, by the lake jetty', lead: 'New places, fresh perspective.', image: 'images/curious/travel.jpg' },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    id: 'team', name: 'Your Team', label: 'Contact', color: '#FF5A1F', icon: 'send',
    kicker: 'Next stop', role: 'Strategy, marketing & operations',
    spots: [
      {
        id: 'main', title: 'Your team.',
        object: 'The tallest building in town: a slim glass office tower with an empty top floor lit up, and a sign "Your team?" at the entrance',
        lead: 'Bring the messy problem. I’ll find the friction. Email is fastest.',
        contact: true,
      },
    ],
  },
];

export const PRODUCTS = {
  'transit-one': {
    name: 'Transit One', status: 'Prototype', kicker: 'B2B passenger transport · built solo',
    summary: 'A bid-led marketplace connecting institutional transport requirements with fleet operators.',
    problem: 'How could schools and businesses compare transport offers beyond a quoted rate, with routes, vehicle requirements and service expectations in one place?',
    build: 'A two-sided marketplace: customers post a route and operators bid. I built pricing tiers and both user journeys to make the comparison easier, with an AI sales copilot and supplier vetting in the design.',
    state: 'Interactive mobile-first prototype. Payments, contracts and operator verification are not live.',
    stack: ['Two-sided marketplace', 'Dynamic pricing tiers', 'Bid & match flow', 'Mobile-first UI'],
    image: 'images/transit-one-preview.png', phone: true,
    links: [['Go to product', 'transit-one-app.html']],
  },
  finbuddy: {
    name: 'FinBuddy', status: 'Live', kicker: 'Financial-learning assistant · team of four',
    summary: 'An approachable way to explore investing concepts, dated sources and an educational risk quiz.',
    problem: 'How could someone new to investing learn the basics without getting lost in jargon or mistaking a chatbot for an adviser?',
    build: 'A conversational interface with short explanations, source context and learning prompts, plus a risk-profiling quiz that allocates illustrative asset weights, served through a RAG assistant on live data.',
    state: 'Publicly accessible, built in a team of four. An educational tool, not investment advice or evidence of financial performance.',
    stack: ['Next.js', 'Vercel AI SDK', 'Pinecone', 'Claude', 'RAG'],
    image: 'images/finbuddy-preview.png',
    links: [['Go to product', 'https://finn-buddy.vercel.app/'], ['Source', 'https://github.com/pgupta0/FinBuddy']],
  },
  crave: {
    name: 'Crave Command Center', status: 'Concept sim', kicker: 'Food-delivery operations simulation',
    summary: 'A simulated control surface for comparing rider load, relay handovers and five delivery models.',
    problem: 'What would a shared view of rider load and relay handovers look like, and how might different delivery models behave?',
    build: 'A live operations map simulating five operating models at once, with riders moving in real time, relay handovers between them, and a KPI terminal overlaid on top.',
    state: 'Concept work, not a real product or real data. Built to explore what a live-ops control surface could feel like.',
    stack: ['5 operating models', 'Real-time map sim', 'Relay handovers', 'KPI terminal'],
    image: 'images/crave-preview.png',
    links: [['Go to product', 'crave-command-center.html']],
  },
  chhatri: {
    name: 'Chhatri', status: 'Concept deck', kicker: 'Climate-tech cool-roof system · Team Quick Pivots',
    summary: 'An interactive climate-tech case for a low-cost, measured cool-roof system for heat-exposed homes.',
    problem: 'How could cooling heat-exposed homes become an affordable service with measurable results, rather than a one-off roof treatment?',
    build: 'A proposed system combining reflective coating, an air gap, ventilation, local installation crews and sensor verification. The case connects the physical solution with delivery and funding.',
    state: 'Interactive concept deck by Team Quick Pivots. Thermal outcomes, unit economics and growth projections are model assumptions, not validated field results.',
    stack: ['Climate tech', 'Scroll-driven film', 'Thermal physics sim', 'Unit economics model'],
    image: 'images/chhatri-preview.png',
    links: [['Go to product', 'chhatri.html']],
  },
};

export const placeById = id => PLACES.find(p => p.id === id);
export const spotById = full => {
  const [pid, sid = 'main'] = full.split('.');
  const place = placeById(pid);
  const spot = place && place.spots.find(s => s.id === sid);
  return place && spot ? { place, spot } : null;
};
