// Illustrative demo content — replace before launch.
// Every name, number, quote, and price on the marketing page lives here so it
// can be swapped for real data in one place.

export type LeadTemperature = "hot" | "warm" | "cold";

export interface DemoQueueLead {
  name: string;
  source: string;
  score: number;
  temperature: LeadTemperature;
}

export const DEMO_QUEUE_LEADS: DemoQueueLead[] = [
  { name: "3412 Larkspur Ave", source: "PPC form", score: 92, temperature: "hot" },
  { name: "Duplex — Cedar Hills", source: "Cold call", score: 81, temperature: "hot" },
  { name: "104 Bellamy Ct", source: "SMS reply", score: 64, temperature: "warm" },
  { name: "Vacant lot — Rte 9", source: "List import", score: 47, temperature: "warm" },
  { name: "88 Winslow Dr", source: "Referral", score: 22, temperature: "cold" },
];

export interface DemoPipelineCard {
  title: string;
  value: string;
  match: number;
  owner: string;
}

export interface DemoPipelineColumn {
  stage: string;
  cards: DemoPipelineCard[];
}

export const DEMO_PIPELINE: DemoPipelineColumn[] = [
  {
    stage: "Qualified",
    cards: [
      { title: "3412 Larkspur Ave", value: "$42,000", match: 92, owner: "MK" },
      { title: "104 Bellamy Ct", value: "$18,500", match: 64, owner: "JR" },
    ],
  },
  {
    stage: "Negotiation",
    cards: [
      { title: "Duplex — Cedar Hills", value: "$61,000", match: 81, owner: "MK" },
      { title: "19 Fontaine St", value: "$27,300", match: 58, owner: "AT" },
    ],
  },
  {
    stage: "Under contract",
    cards: [{ title: "771 Mesa Verde", value: "$54,750", match: 88, owner: "JR" }],
  },
];

export interface DemoSequenceStep {
  channel: "email" | "sms" | "call";
  label: string;
  timing: string;
  status: "sent" | "scheduled" | "waiting";
}

export const DEMO_SEQUENCE: DemoSequenceStep[] = [
  { channel: "email", label: "Intro + cash offer range", timing: "Day 0", status: "sent" },
  { channel: "sms", label: "Quick follow-up text", timing: "Day 1", status: "sent" },
  { channel: "call", label: "Qualification call", timing: "Day 2", status: "sent" },
  { channel: "email", label: "Comps + timeline", timing: "Day 4", status: "scheduled" },
  { channel: "sms", label: "Still interested?", timing: "Day 7", status: "waiting" },
];

export interface DemoKpi {
  label: string;
  value: string;
}

export const DEMO_DASHBOARD_KPIS: DemoKpi[] = [
  { label: "Total leads", value: "1,284" },
  { label: "Created this week", value: "67" },
  { label: "Avg touches/lead", value: "4.2" },
  { label: "Close rate", value: "18%" },
];

export interface DemoBar {
  label: string;
  count: number;
}

export const DEMO_STAGE_BARS: DemoBar[] = [
  { label: "New", count: 342 },
  { label: "Qualified", count: 208 },
  { label: "Negotiation", count: 96 },
  { label: "Contract", count: 41 },
];

export interface DemoScorecardRow {
  initials: string;
  name: string;
  dials: number;
  deals: number;
}

export const DEMO_SCORECARD: DemoScorecardRow[] = [
  { initials: "MK", name: "M. Keller", dials: 148, deals: 6 },
  { initials: "JR", name: "J. Ruiz", dials: 131, deals: 5 },
  { initials: "AT", name: "A. Tran", dials: 117, deals: 4 },
  { initials: "DB", name: "D. Boone", dials: 92, deals: 2 },
];

export const DEMO_WORDMARKS: string[] = [
  "Apex Homebuyers",
  "Northline Dials",
  "Bluecreek Land Co",
  "Summit Acquisitions",
  "Irongate Realty",
  "Cascade Callers",
  "Redrock Offers",
];

export interface DemoMetric {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const DEMO_METRICS: DemoMetric[] = [
  { value: 12000, suffix: "+", label: "Leads worked through the queue" },
  { value: 38000, suffix: "+", label: "Follow-ups sent automatically" },
  { value: 9200, suffix: "+", label: "Calls scored and summarized by AI" },
  { value: 40, suffix: "%", label: "Less time on manual data entry" },
];

export interface DemoTestimonial {
  quote: string;
  initials: string;
  persona: string;
  detail: string;
}

export const DEMO_TESTIMONIALS: DemoTestimonial[] = [
  {
    quote:
      "We used to lose deals because a lead sat untouched for a week. Now every lead has a next action and the sequences run whether we remember or not.",
    initials: "AL",
    persona: "Acquisitions Lead",
    detail: "Land-flipping team, 6 seats",
  },
  {
    quote:
      "The AI call summaries alone pay for it. My closers stopped taking notes and started closing — I read the summary and know exactly where a deal stands.",
    initials: "AO",
    persona: "Agency Owner",
    detail: "Cold-calling agency, 14 seats",
  },
  {
    quote:
      "The TV wall changed the floor. Everyone can see dials, deals, and who's on top — we stopped chasing reports and the numbers went up on their own.",
    initials: "SM",
    persona: "Sales Manager",
    detail: "Wholesaling operation, 9 seats",
  },
];

export interface DemoPricingTier {
  name: string;
  price: string;
  cadence: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}

export const DEMO_PRICING_TIERS: DemoPricingTier[] = [
  {
    name: "Solo",
    price: "$29",
    cadence: "per user / month",
    description: "For a single operator running their own lead flow.",
    features: [
      "Lead intake forms + API",
      "Kanban pipeline",
      "Email sequences",
      "Mobile PWA",
    ],
  },
  {
    name: "Team",
    price: "$79",
    cadence: "per user / month",
    description: "For acquisition teams that live in the queue all day.",
    features: [
      "Everything in Solo",
      "AI lead scoring + call summaries",
      "SMS sequences + workflows",
      "Scorecards + TV KPI wall",
      "Team roles & permissions",
    ],
    highlighted: true,
  },
  {
    name: "Agency",
    price: "Custom",
    cadence: "annual billing",
    description: "For agencies sourcing and working leads for clients.",
    features: [
      "Everything in Team",
      "Client portal + digests",
      "Priority support",
      "Onboarding & migration help",
    ],
  },
];
