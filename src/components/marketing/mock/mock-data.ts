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
    "VesperWiseCRM is the acquisition system for real estate teams — pipeline, email sequences (early), and the lead queue in one place. Early access available now.",
  primaryCta: "Book a demo",
  secondaryCta: "See the workflow",
  note: "No card. Team free for 60 days.",
  browserTitle: "Lead Queue · All sources",
};

export interface MarketingHeroLeadRow {
  name: string;
  address: string;
  source: string;
  stage: string;
  owner: string;
  touch: string;
  selected?: boolean;
}

export const MARKETING_HERO_ROWS: MarketingHeroLeadRow[] = [
  {
    name: "Marcus Whitfield",
    address: "4127 Kessler Blvd · Indianapolis, IN",
    source: "PPC",
    stage: "Qualified",
    owner: "Dana Reyes",
    touch: "4m ago",
    selected: true,
  },
  {
    name: "Denise Okoro",
    address: "882 Ridgeline Ct · Fort Wayne, IN",
    source: "Cold list",
    stage: "Contacted",
    owner: "Marcus Ju",
    touch: "22m ago",
  },
  {
    name: "Ray & Lorna Petrossian",
    address: "15 Halstead Ave · Muncie, IN",
    source: "Referral",
    stage: "Appointment",
    owner: "Dana Reyes",
    touch: "1h ago",
  },
  {
    name: "Tobias Lindgren",
    address: "9040 Sunfield Dr · Kokomo, IN",
    source: "Direct mail",
    stage: "Nurture",
    owner: "Aisha Karim",
    touch: "3h ago",
  },
  {
    name: "Priya Raghunathan",
    address: "231 W Morris St · Indianapolis, IN",
    source: "Inbound",
    stage: "New",
    owner: "Marcus Ju",
    touch: "5h ago",
  },
  {
    name: "Estate of H. Calloway",
    address: "77 Ellsworth Rd · Anderson, IN",
    source: "Probate",
    stage: "Contacted",
    owner: "Aisha Karim",
    touch: "6h ago",
  },
  {
    name: "Walter Nkemdirim",
    address: "3312 Brookville Rd · Terre Haute, IN",
    source: "Cold list",
    stage: "No contact",
    owner: "Unassigned",
    touch: "1d ago",
  },
];

export interface MarketingPipelineCardFields {
  title: string;
  contact: string;
  owner: string;
  stage: string;
}

export const MARKETING_SELECTED_LEAD: MarketingPipelineCardFields = {
  title: "4127 Kessler Blvd",
  contact: "Marcus Whitfield",
  owner: "Dana Reyes",
  stage: "Qualified",
};

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
      "Email sequences (early), tasks, and pipeline sit on the same record. The owner and stage are never a guess.",
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
  { label: "Email sequences", value: "Early" },
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
  "R. Petrossian · Appointment",
  "Estate of H. Calloway · Contacted",
  "P. Raghunathan · New",
  "T. Lindgren · Nurture",
  "W. Nkemdirim · No contact",
];

export type MarketingSequenceState = 0 | 1 | 2;

export interface MarketingDaySequenceStep {
  day: string;
  action: string;
  state: MarketingSequenceState;
}

export const MARKETING_DAY_SEQUENCE: MarketingDaySequenceStep[] = [
  { day: "D1", action: "Email: intro", state: 0 },
  { day: "D2", action: "Email: process outline", state: 0 },
  { day: "D3", action: "Email: follow-up", state: 0 },
  { day: "D4", action: "Task: check the reply", state: 0 },
  { day: "D5", action: "Email: check-in", state: 0 },
  { day: "D6", action: "Email: comps + offer", state: 0 },
  { day: "D7", action: "Email: last note, then nurture", state: 0 },
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
  { name: "Duplex — Cedar Hills", source: "List import", score: 81, temperature: "hot" },
  { name: "104 Bellamy Ct", source: "Inbound form", score: 64, temperature: "warm" },
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
  channel: "email";
  label: string;
  timing: string;
  status: "scheduled" | "waiting";
}

export const DEMO_SEQUENCE: DemoSequenceStep[] = [
  { channel: "email", label: "Intro + cash offer range", timing: "Day 0", status: "scheduled" },
  { channel: "email", label: "Process outline", timing: "Day 1", status: "scheduled" },
  { channel: "email", label: "Follow-up", timing: "Day 2", status: "scheduled" },
  { channel: "email", label: "Comps + timeline", timing: "Day 4", status: "scheduled" },
  { channel: "email", label: "Still interested?", timing: "Day 7", status: "waiting" },
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
  touches: number;
  deals: number;
}

export const DEMO_SCORECARD: DemoScorecardRow[] = [
  { initials: "MK", name: "M. Keller", touches: 148, deals: 6 },
  { initials: "JR", name: "J. Ruiz", touches: 131, deals: 5 },
  { initials: "AT", name: "A. Tran", touches: 117, deals: 4 },
  { initials: "DB", name: "D. Boone", touches: 92, deals: 2 },
];

export const DEMO_WORDMARKS: string[] = [
  "Apex Homebuyers",
  "Northline Homes",
  "Bluecreek Land Co",
  "Summit Acquisitions",
  "Irongate Realty",
  "Cascade Holdings",
  "Redrock Offers",
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
      "Email sequences (early)",
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
      "Workflows and routing",
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
