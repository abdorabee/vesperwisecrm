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
  title: "Every lead worked. Next task on the record.",
  subhead:
    "VesperWiseCRM is the pipeline CRM for real estate teams. Leads, stages, notes, tasks, and owners stay on one record.",
  primaryCta: "Book a demo",
  secondaryCta: "See the workflow",
  note: "Pricing is shown on our pricing page",
  browserTitle: "Lead Queue · All sources",
};

export interface MarketingHeroLeadRow {
  name: string;
  address: string;
  source: string;
  stage: string;
  selected?: boolean;
}

export const MARKETING_HERO_ROWS: MarketingHeroLeadRow[] = [
  {
    name: "Marcus Whitfield",
    address: "4127 Kessler Blvd · Indianapolis, IN",
    source: "PPC",
    stage: "Qualified",
    selected: true,
  },
  {
    name: "Denise Okoro",
    address: "882 Ridgeline Ct · Fort Wayne, IN",
    source: "Imported list",
    stage: "Contacted",
  },
  {
    name: "Ray & Lorna Petrossian",
    address: "15 Halstead Ave · Muncie, IN",
    source: "Referral",
    stage: "Appointment",
  },
  {
    name: "Tobias Lindgren",
    address: "9040 Sunfield Dr · Kokomo, IN",
    source: "Direct mail",
    stage: "Nurture",
  },
  {
    name: "Priya Raghunathan",
    address: "231 W Morris St · Indianapolis, IN",
    source: "Inbound",
    stage: "New",
  },
  {
    name: "Estate of H. Calloway",
    address: "77 Ellsworth Rd · Anderson, IN",
    source: "Probate",
    stage: "Contacted",
  },
  {
    name: "Walter Nkemdirim",
    address: "3312 Brookville Rd · Terre Haute, IN",
    source: "Imported list",
    stage: "No contact",
  },
];

export interface MarketingHeroActivityEvent {
  text: string;
  time: string;
  accent: boolean;
}

export const MARKETING_HERO_ACTIVITY: MarketingHeroActivityEvent[] = [
  {
    text: "Lead added from an imported list",
    time: "Activity",
    accent: false,
  },
  {
    text: "Moved to Qualified · probate timeline on the record",
    time: "Activity",
    accent: false,
  },
  {
    text: "Note added on the record",
    time: "Activity",
    accent: true,
  },
  {
    text: "Assigned to Dana R. · next task created",
    time: "Activity",
    accent: true,
  },
];

export interface MarketingLeadIntelStat {
  label: string;
  value: string;
}

export const MARKETING_LEAD_INTEL_STATS: MarketingLeadIntelStat[] = [
  { label: "SOURCE", value: "PPC" },
  { label: "STAGE", value: "Qualified" },
  { label: "OWNER", value: "Dana R." },
  { label: "NEXT TASK", value: "Review Thursday" },
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
  title: "Track every lead and its next task.",
  body:
    "Most acquisition teams lose deals in the gaps — a next task never set, a dead lead never revived. VesperWiseCRM closes those gaps by keeping the pipeline and the next task on one record.",
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
      "Every source — PPC, imported lists, referrals, probate — lands in one queue. No CSV shuffling.",
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
      "Notes, tasks, and owner sit on the lead. The next action is never a guess.",
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
    label: "Imported lists, direct mail, and probate records",
    meta: "CSV / API",
  },
  { n: "03", label: "Duplicate detection on import", meta: "AUTO" },
];

export interface MarketingIntakeFilter {
  label: string;
  on: boolean;
}

export const MARKETING_INTAKE_FILTERS: MarketingIntakeFilter[] = [
  { label: "PPC and inbound forms", on: true },
  { label: "Imported lists", on: true },
  { label: "Referrals", on: true },
  { label: "Direct mail", on: false },
  { label: "Probate records", on: true },
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
  { label: "MOTIVATION", value: "On the record", pct: 70, tone: "accent" },
  { label: "TIMELINE", value: "On the record", pct: 70, tone: "accent" },
  { label: "CONDITION", value: "On the record", pct: 50, tone: "strong" },
  { label: "SPREAD", value: "On the record", pct: 50, tone: "strong" },
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
  { label: "Notes", value: "On the lead" },
  { label: "Tasks", value: "On the lead" },
  { label: "Owner", value: "On the lead" },
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
  "R. Petrossian",
  "Estate of H. Calloway",
  "P. Raghunathan",
  "T. Lindgren",
  "W. Nkemdirim",
];

export type MarketingPlanState = 0 | 1 | 2;

export interface MarketingDayPlanStep {
  day: string;
  action: string;
  state: MarketingPlanState;
}

export const MARKETING_DAY_PLAN: MarketingDayPlanStep[] = [
  { day: "D1", action: "Task: confirm the owner", state: 0 },
  { day: "D1", action: "Note: offer context", state: 0 },
  { day: "D2", action: "Task: review the timeline", state: 0 },
  { day: "D3", action: "Task: check the stage", state: 0 },
  { day: "D5", action: "Task check-in", state: 0 },
  { day: "D6", action: "Task: comps on the record", state: 0 },
  { day: "D7", action: "Task: set the next step", state: 0 },
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
  { name: "Duplex — Cedar Hills", source: "Referral", score: 81, temperature: "hot" },
  { name: "104 Bellamy Ct", source: "Form reply", score: 64, temperature: "warm" },
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

export interface DemoPlanStep {
  channel: "task" | "note";
  label: string;
  timing: string;
  status: "scheduled" | "waiting";
}

export const DEMO_PLAN: DemoPlanStep[] = [
  { channel: "task", label: "Intro and cash offer range", timing: "Day 0", status: "scheduled" },
  { channel: "task", label: "Quick follow-up task", timing: "Day 1", status: "scheduled" },
  { channel: "note", label: "Qualification note", timing: "Day 2", status: "scheduled" },
  { channel: "task", label: "Comps and timeline", timing: "Day 4", status: "scheduled" },
  { channel: "note", label: "Still interested?", timing: "Day 7", status: "waiting" },
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
  tasks: number;
  deals: number;
}

export const DEMO_SCORECARD: DemoScorecardRow[] = [
  { initials: "MK", name: "M. Keller", tasks: 148, deals: 6 },
  { initials: "JR", name: "J. Ruiz", tasks: 131, deals: 5 },
  { initials: "AT", name: "A. Tran", tasks: 117, deals: 4 },
  { initials: "DB", name: "D. Boone", tasks: 92, deals: 2 },
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

export interface DemoMetric {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
}

export const DEMO_METRICS: DemoMetric[] = [
  { value: 12000, suffix: "+", label: "Leads worked through the queue" },
  { value: 38000, suffix: "+", label: "Next tasks on the pipeline" },
  { value: 9200, suffix: "+", label: "Deals with an owner and a next task" },
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
      "We used to lose deals because a lead sat untouched for a week. Now every lead has an owner and a next task.",
    initials: "AL",
    persona: "Acquisitions Lead",
    detail: "Land-flipping team, 6 seats",
  },
  {
    quote:
      "The pipeline alone pays for it. My closers stopped hunting through notes — I open the lead and know exactly where a deal stands.",
    initials: "AO",
    persona: "Agency Owner",
    detail: "Brokerage, 14 seats",
  },
  {
    quote:
      "The scorecard changed the floor. Everyone can see tasks, deals, and who's on top — we stopped chasing reports and the numbers went up on their own.",
    initials: "SM",
    persona: "Sales Manager",
    detail: "Wholesaling operation, 9 seats",
  },
];
