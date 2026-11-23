/* The story both games tell, in the order you reach it.
   Six career stops, the case competitions, leadership, then the finish.
   Keep this in step with index.html and clean.html when the content changes. */
export const CHECKPOINTS = [
  {
    id: 'dtu', n: '01', when: 'until 2023', color: '#FF8A3D', icon: 'graduation-cap', short: 'DTU',
    title: 'Delhi Technological University', role: 'BA (Hons) Economics',
    why: 'Every system runs on incentives. I start by asking who gains and who pays.',
    mets: [['84.6%', 'final score']],
    skills: ['Economic reasoning', 'Research', 'Data analysis'],
  },
  {
    id: 'htl', n: '02', when: '2023–25', color: '#FFC23D', icon: 'bus', short: 'TRAVEL LINE',
    title: 'Himanshu Travel Line', role: 'Operations, growth & key accounts',
    why: "Customers don't buy the cheapest seat. They buy the bus that shows up.",
    mets: [['₹2.5 Cr', 'new B2B business'], ['+26%', 'more buses ready to run'], ['7', 'contracts won or grown']],
    skills: ['B2B sales', 'Key accounts', 'Fleet operations', 'Pricing'],
  },
  {
    id: 'lss', n: '03', when: 'certified', color: '#4CD964', icon: 'badge-check', short: 'GREEN BELT',
    title: 'Lean Six Sigma Green Belt', role: 'Process improvement',
    why: 'Measure the leak, fix the cause, then make the fix stick.',
    mets: [['Green Belt', 'certified']],
    skills: ['DMAIC', 'Root-cause analysis', 'Process mapping', 'Statistical control'],
  },
  {
    id: 'bitsom', n: '04', when: '2025–27', color: '#FF4D7D', icon: 'landmark', short: 'BITSoM',
    title: 'BITS School of Management', role: 'MBA · Mumbai',
    why: 'A strategy is only as good as the plan that carries it out.',
    mets: [['Top 30', 'team, Tata Imagination finals'], ['2×', 'Flipkart WiRED semi-finalist'], ['₹12 L', 'sponsorship raised']],
    skills: ['Strategy', 'Marketing', 'E-commerce', 'Negotiation'],
  },
  {
    id: 'bb', n: '05', when: 'Apr–Jun 2026', color: '#8B7CFF', icon: 'warehouse', short: 'BIGBASKET',
    title: 'BigBasket', role: 'Strategic Initiatives Intern',
    why: 'Stock was leaking through returns nobody tracked. Now they are.',
    mets: [['~₹20 L', 'saved'], ['−27%', 'stock written off'], ['Same day', 'to spot a loss, was 2 days']],
    skills: ['Inventory control', 'Loss analysis', 'Process design', 'Stakeholder alignment'],
  },
  {
    id: 'ai', n: '06', when: 'now', color: '#3DA9FF', icon: 'cpu', short: 'AI BUILDS',
    title: 'Building with AI', role: 'Product builder',
    why: 'I used to hand the fix to someone else. Now I build it myself.',
    mets: [['4', 'products built'], ['1', 'live and public']],
    skills: ['Product thinking', 'Rapid prototyping', 'LLMs & RAG', 'UX'],
    link: ['See the products', 'portfolio.html'],
  },
  {
    id: 'cases', n: '★', when: 'case competitions', color: '#FFC857', icon: 'trophy', short: 'REAL BRIEFS',
    title: 'Real briefs. Real rankings.', role: 'Case competitions',
    why: 'Companies hand over a real problem and rank the answers.',
    rows: [
      ['Top 30 team', 'Tata Imagination Challenge', 'Finals'],
      ['Semi-finalist ×2', 'Flipkart WiRED 9 & 10', '35,000+ registered'],
      ['Top 13', 'TCPL Grow Beyond Better', '14,000+ entries'],
      ['Finalist', 'Case Consilium, BITS Goa', '1st in the semi-finals'],
    ],
    skills: ['Problem framing', 'Market sizing', 'Storytelling'],
  },
  {
    id: 'lead', n: '★', when: 'leadership', color: '#2EF2C3', icon: 'users', short: 'LEADERSHIP',
    title: 'People follow clarity.', role: 'Leadership',
    why: 'Roles where people had a choice whether to follow.',
    rows: [
      ['Sponsorship Head', 'Roar & Conclave', '₹12 L raised, SBI as title sponsor'],
      ['Organising team', 'All India Deans Conference', 'BITSoM'],
      ['Member', 'Marketing & Operations Committee', 'BITSoM'],
      ['Senior member', 'PreQL', 'BITSoM AI & Analytics Club'],
      ['Mentor', 'Theomi', 'MBA aspirants'],
      ['Award', 'Techstars Startup Weekend', 'Outstanding Professional Development'],
      ['Vice President', 'Rotaract Club of USME', '200+ members, 10+ events'],
    ],
    skills: ['Team leadership', 'Sponsorship', 'Mentoring'],
  },
  {
    id: 'finish', n: '07', when: 'next stop', color: '#FF5A1F', icon: 'flag', short: 'FINISH',
    title: 'Your team.', role: 'Strategy, marketing & operations',
    why: "Bring the messy problem. I'll find the friction.",
    finish: true,
  },
];

export const CONTACT = {
  email: 'prathamg329@gmail.com',
  phone: '+91 80768 78652', tel: '+918076878652',
  linkedin: 'https://www.linkedin.com/in/pgupta05',
};
