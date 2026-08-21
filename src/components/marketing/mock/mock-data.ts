// Illustrative demo content — replace before launch.
// Every name, number, quote, and price on the marketing page lives here so it
// can be swapped for real data in one place.

export interface MarketingHeroCopy {
  eyebrow: string;
  title: string;
  subhead: string;
  primaryCta: string;
  secondaryCta: string;
  note: string;
  browserTitle: string;
}

export const MARKETING_HERO_COPY: MarketingHeroCopy = {
  eyebrow: "ACQUISITION CRM / REAL ESTATE",
  title: "Every lead worked. Nothing goes cold.",
  subhead:
    "VesperWiseCRM is the acquisition system for real estate teams — pipeline, email sequences, and lead queue in one place. Early access available now.",
  primaryCta: "Book a demo",
  secondaryCta: "See the workflow",
  note: "No card. 14-day pilot.",
  browserTitle: "Lead Queue · All sources",
};

export interface MarketingHeroLeadRow {
  name: string;
  address: string;
  source: string;
  stage: string;
  score: number;
  touch: string;
  selected?: boolean;
}

export const MARKETING_HERO_ROWS: MarketingHeroLeadRow[] = [
  {
    name: "Marcus Whitfield",
    address: "4127 Kessler Blvd · Indianapolis, IN",
    source: "PPC",
    stage: "Qualified",
    score: 92,
    touch: "4m ago",
    selected: true,
  },
  {
    name: "Denise Okoro",
    address: "882 Ridgeline Ct · Fort Wayne, IN",
    source: "Cold list",
    stage: "Contacted",
    score: 78,
    touch: "22m ago",
  },
  {
    name: "Ray & Lorna Petrossian",
    address: "15 Halstead Ave · Muncie, IN",
    source: "Referral",
    stage: "Appointment",
    score: 85,
    touch: "1h ago",
  },
  {
    name: "Tobias Lindgren",
    address: "9040 Sunfield Dr · Kokomo, IN",
    source: "Direct mail",
    stage: "Nurture",
    score: 54,
    touch: "3h ago",
  },
  {
    name: "Priya Raghunathan",
    address: "231 W Morris St · Indianapolis, IN",
    source: "Inbound",
    stage: "New",
    score: 71,
    touch: "5h ago",
  },
  {
    name: "Estate of H. Calloway",
    address: "77 Ellsworth Rd · Anderson, IN",
    source: "Probate",
    stage: "Skip traced",
    score: 88,
    touch: "6h ago",
  },
  {
    name: "Walter Nkemdirim",
    address: "3312 Brookville Rd · Terre Haute, IN",
    source: "Cold list",
    stage: "No contact",
    score: 41,
    touch: "1d ago",
  },
];

export interface MarketingHeroActivityEvent {
  text: string;
  time: string;
  accent: boolean;
}

export const MARKETING_HERO_ACTIVITY: MarketingHeroActivityEvent[] = [
  {
    text: "Skip trace returned 3 phones, 1 email",
    time: "TODAY 09:14",
    accent: false,
  },
  {
    text: "AI call summary: wants out before probate closes",
    time: "TODAY 09:41",
    accent: false,
  },
  {
    text: "Motivation score raised 74 → 92",
    time: "TODAY 09:41",
    accent: true,
  },
  {
    text: "Assigned to Dana R. · callback task created",
    time: "TODAY 09:42",
    accent: true,
  },
];

export interface MarketingLeadIntelStat {
  label: string;
  value: string;
}

export const MARKETING_LEAD_INTEL_STATS: MarketingLeadIntelStat[] = [
  { label: "EST. VALUE", value: "$214,000" },
  { label: "EQUITY", value: "68%" },
  { label: "OWNERSHIP", value: "14 yrs" },
  { label: "PHONES", value: "3 verified" },
];

export const MARKETING_PROOF_LABEL =
  "EARLY ACCESS PROGRAM";

export const MARKETING_PROOF_LOGOS: string[] = [];

export const MARKETING_PROOF_PLACEHOLDER_TAG = "";

export interface MarketingPremiseCopy {
  eyebrow: string;
  title: string;
  body: string;
}

export const MARKETING_PREMISE_COPY: MarketingPremiseCopy = {
  eyebrow: "0.0 — PREMISE",
  title: "A CRM that does the follow-up, not just the record-keeping.",
  body:
    "Most acquisition teams lose deals in the gaps — a callback never made, a dead lead never revived. VesperWiseCRM closes those gaps by treating the lead lifecycle as one continuous system.",
};

export interface MarketingPremiseStep {
  figureLabel: string;
  number: string;
  label: string;
  caption: string;
}

export const MARKETING_PREMISE_STEPS: MarketingPremiseStep[] = [
  {
    figureLabel: "FIG 0.2",
    number: "01",
    label: "Capture",
    caption:
      "Every source — PPC, cold lists, referrals, probate — lands in one queue. No CSV shuffling.",
  },
  {
    figureLabel: "FIG 0.3",
    number: "02",
    label: "Qualify",
    caption:
      "Track contact attempts, notes, and stage changes on one record. Know where every conversation stands.",
  },
  {
    figureLabel: "FIG 0.4",
    number: "03",
    label: "Close",
    caption:
      "Email sequences, tasks and pipeline sit on the same record. The next action is never a guess.",
  },
];

export interface MarketingIntakeSource {
  n: string;
  label: string;
  meta: string;
}

export const MARKETING_INTAKE_SOURCES: MarketingIntakeSource[] = [
  { n: "01", label: "PPC, SEO and inbound seller forms", meta: "REAL TIME" },
  {
    n: "02",
    label: "Cold lists, direct mail and probate records",
    meta: "CSV / API",
  },
  { n: "03", label: "Duplicate detection on import", meta: "AUTO" },
];

export interface MarketingIntakeFilter {
  label: string;
  on: boolean;
}

export const MARKETING_INTAKE_FILTERS: MarketingIntakeFilter[] = [
  { label: "Absentee owner", on: true },
  { label: "Equity above 40%", on: true },
  { label: "Tenure 5+ years", on: true },
  { label: "Pre-foreclosure", on: false },
  { label: "Tax delinquent", on: false },
  { label: "Vacant", on: true },
];

export type MarketingBarTone = "accent" | "strong" | "bg2";

export interface MarketingFunnelBar {
  height: number;
  tone: MarketingBarTone;
  delaySeconds: number;
}

export const MARKETING_FUNNEL_BARS: MarketingFunnelBar[] = Array.from(
  { length: 26 },
  (_, index) => {
    const progress = index / 25;
    const height = Math.round(
      122 - Math.pow(progress, 1.5) * 104 + (index % 3 === 0 ? 6 : 0),
    );

    return {
      height,
      tone: index > 20 ? "accent" : index > 16 ? "strong" : "bg2",
      delaySeconds: Number((index * 0.022).toFixed(3)),
    };
  },
);

export type MarketingScoreTone = "accent" | "strong";

export interface MarketingQualifyScore {
  label: string;
  value: string;
  pct: number;
  tone: MarketingScoreTone;
}

export const MARKETING_QUALIFY_SCORES: MarketingQualifyScore[] = [
  { label: "MOTIVATION", value: "92", pct: 92, tone: "accent" },
  { label: "TIMELINE", value: "30d", pct: 84, tone: "accent" },
  { label: "CONDITION", value: "C-", pct: 46, tone: "strong" },
  { label: "SPREAD", value: "$29k", pct: 62, tone: "strong" },
];

export const MARKETING_QUALIFY_TAGS: string[] = [
  "probate",
  "inherited",
  "two mortgages",
  "no agent",
  "cash offer",
  "roof + HVAC",
];

export interface MarketingEngageStat {
  label: string;
  value: string;
}

export const MARKETING_ENGAGE_STATS: MarketingEngageStat[] = [
  { label: "Email sequences", value: "Live" },
  { label: "Contact timeline", value: "Live" },
  { label: "Pipeline stages", value: "Live" },
];

export interface MarketingWaveformBar {
  height: number;
  active: boolean;
}

export const MARKETING_WAVEFORM_BARS: MarketingWaveformBar[] = Array.from(
  { length: 48 },
  (_, index) => {
    const amp = Math.abs(Math.sin(index * 0.55) * Math.cos(index * 0.17));
    const height = Math.max(3, Math.round(4 + amp * 30));

    return {
      height,
      active: index < 34,
    };
  },
);

export const MARKETING_UP_NEXT: string[] = [
  "R. Petrossian · 85",
  "Estate of H. Calloway · 88",
  "P. Raghunathan · 71",
  "T. Lindgren · 54",
  "W. Nkemdirim · 41",
];

export type MarketingSequenceState = 0 | 1 | 2;

export interface MarketingDaySequenceStep {
  day: string;
  action: string;
  state: MarketingSequenceState;
}

export const MARKETING_DAY_SEQUENCE: MarketingDaySequenceStep[] = [
  { day: "D1", action: "Call + voicemail drop", state: 2 },
  { day: "D1", action: "SMS: cash offer intro", state: 2 },
  { day: "D2", action: "Email: process outline", state: 2 },
  { day: "D3", action: "Call attempt 2", state: 1 },
  { day: "D5", action: "SMS check-in", state: 0 },
  { day: "D6", action: "Email: comps + offer", state: 0 },
  { day: "D7", action: "Final call, then nurture", state: 0 },
];

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
