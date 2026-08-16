export interface MarketingPageSection {
  heading: string;
  body: string;
}

export interface MarketingPageContent {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  sections: MarketingPageSection[];
  cta?: { label: string; href: string };
  form?: "contact";
}

export const SOLUTION_SLUGS = [
  "wholesalers",
  "fix-and-flip",
  "buy-and-hold",
  "agents",
  "dispositions",
] as const;

export type SolutionSlug = (typeof SOLUTION_SLUGS)[number];

export const SOLUTION_PAGES: Record<SolutionSlug, MarketingPageContent> = {
  wholesalers: {
    href: "/solutions/wholesalers",
    eyebrow: "Solutions / Wholesalers",
    title: "Keep every contract on a next step.",
    description:
      "Intake, skip tracing, qualification, and the dialer sit on one record so assignments do not die in a spreadsheet between acquisition and disposition.",
    sections: [
      {
        heading: "One queue for paid and cold traffic",
        body: "PPC, lists, referrals, and inbound forms land in the same qualification queue. Scoring and ownership are visible before anyone picks up the phone.",
      },
      {
        heading: "Follow-up that does not depend on memory",
        body: "Email and SMS sequences stay attached to the lead. When a seller revives after ninety days, the conversation history is already on the record.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  "fix-and-flip": {
    href: "/solutions/fix-and-flip",
    eyebrow: "Solutions / Fix and flip",
    title: "From first call to rehab without losing context.",
    description:
      "Property notes, motivation, and next actions stay on the lead so acquisitions, project managers, and dispositions are looking at the same record.",
    sections: [
      {
        heading: "Capture the property while you are on the call",
        body: "Condition, occupancy, asking price, and work needed are fields on the lead — not a second spreadsheet after the call ends.",
      },
      {
        heading: "Handoffs that keep the deal moving",
        body: "When a lead is under contract, ownership and tasks move with it. The pipeline shows what is blocked instead of what someone remembers.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  "buy-and-hold": {
    href: "/solutions/buy-and-hold",
    eyebrow: "Solutions / Buy and hold",
    title: "Work seller conversations like a portfolio.",
    description:
      "Longer holds need longer follow-up. Sequences, tasks, and a shared pipeline keep off-market opportunities alive without a dedicated VA watching a sheet.",
    sections: [
      {
        heading: "Nurture without losing the thread",
        body: "A seller who is not ready this quarter still has a next step. Sequences and reminders fire from the record, not from someone's inbox.",
      },
      {
        heading: "Reporting that matches how you buy",
        body: "See what is in qualification, what is under contract, and what went cold — without exporting five tools into a weekly deck.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  agents: {
    href: "/solutions/agents",
    eyebrow: "Solutions / Agents",
    title: "Treat listing and buyer leads like acquisition work.",
    description:
      "VesperWise is built for teams that live in conversations: intake, skip tracing, a dialer on the record, and a pipeline that does not go quiet after the first touch.",
    sections: [
      {
        heading: "Every conversation on the record",
        body: "Calls, emails, and notes stay with the lead so coverage does not collapse when someone is out or a lead changes hands.",
      },
      {
        heading: "A queue instead of a personal CRM",
        body: "Shared ownership and routing keep high-intent leads from sitting in one agent's phone while the rest of the team is idle.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  dispositions: {
    href: "/solutions/dispositions",
    eyebrow: "Solutions / Dispositions",
    title: "Close the loop between acquisition and buyers.",
    description:
      "When a contract is ready, dispositions need the property context, the seller conversation, and a next action — not a forwarded email thread.",
    sections: [
      {
        heading: "The record arrives complete",
        body: "Notes, property fields, and activity history travel with the lead into dispositions. Nobody re-asks the seller what was already said.",
      },
      {
        heading: "Multi-market reporting without a warehouse project",
        body: "Scale plans cover reporting across markets. The pipeline is the source of truth for what is available, pending, or stuck.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
};

export const MARKETING_PAGES = {
  docs: {
    href: "/docs",
    eyebrow: "Resources / Docs",
    title: "How the acquisition system is put together.",
    description:
      "A short map of the product surfaces on the marketing site. In-app docs live with your workspace after you sign in.",
    sections: [
      {
        heading: "Intake and skip tracing",
        body: "Leads arrive from forms, imports, and channels, then get owner and property context before a rep sees the record.",
      },
      {
        heading: "Qualify, dial, pipeline",
        body: "The queue ranks who to call. The dialer logs from the record. The pipeline is the shared view of what happens next.",
      },
      {
        heading: "Workflows and reporting",
        body: "Sequences and workflows own follow-up. Reporting shows what moved, what stalled, and who owns the next step.",
      },
    ],
    cta: { label: "See the workflow", href: "/home#ch1" },
  },
  onboarding: {
    href: "/onboarding",
    eyebrow: "Resources / Onboarding",
    title: "A 14-day pilot, not a six-month implementation.",
    description:
      "Start with intake, the queue, and one pipeline. Data migration is included on the public offer. Dedicated onboarding is on Scale.",
    sections: [
      {
        heading: "Week one: get leads in",
        body: "Connect a source, import a list, and put skip tracing on record creation. The queue should have work on day one.",
      },
      {
        heading: "Week two: talk and follow up",
        body: "Dial from the record, turn on a sequence, and assign ownership. An in-app tour walks signed-in members through the same path.",
      },
    ],
    cta: { label: "Start a pilot", href: "/signup" },
  },
  changelog: {
    href: "/changelog",
    eyebrow: "Resources / Changelog",
    title: "What shipped on the public site.",
    description:
      "This page tracks marketing and product surfaces you can see without signing in. Workspace release notes appear in-app as they land.",
    sections: [
      {
        heading: "Current",
        body: "Public marketing pages, a book-a-demo calendar, and working footer destinations. The CRM itself — intake, skip tracing, dialer, pipeline, sequences, and workflows — is available after sign-in.",
      },
      {
        heading: "Next",
        body: "Attributed customer quotes and final pricing replace the labeled placeholders on the landing page. No invented metrics in the meantime.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  integrations: {
    href: "/integrations",
    eyebrow: "Resources / Integrations",
    title: "Email, docs, and telephony on the record.",
    description:
      "Workspace admins connect providers in Settings after sign-in. Nothing here is a marketplace install — each account brings its own credentials.",
    sections: [
      {
        heading: "Email",
        body: "Outbound and inbound email run through Resend, with per-account From addresses and reply capture back onto the lead.",
      },
      {
        heading: "Google Docs and Drive",
        body: "Generate a property report into Docs and store it in Drive from the lead, using the account's connected Google client.",
      },
      {
        heading: "Twilio",
        body: "SMS and the power dialer use a connected Twilio account. Skip tracing and telephony are billed at cost on published pricing.",
      },
    ],
    cta: { label: "Talk to sales", href: "/contact" },
  },
  support: {
    href: "/support",
    eyebrow: "Resources / Support",
    title: "Talk to a person, not a ticket maze.",
    description:
      "For product questions, book a walkthrough. For account or billing issues, send a message. There is no public help center yet.",
    sections: [
      {
        heading: "See the product",
        body: "A 30-minute demo covers intake, the queue, the dialer, and pipeline against your workflow. No card required.",
      },
      {
        heading: "Account help",
        body: "Signed-in workspace issues go through the contact form. Include the account name and what you were trying to do.",
      },
    ],
    cta: { label: "Contact us", href: "/contact" },
  },
  about: {
    href: "/about",
    eyebrow: "Company / About",
    title: "The acquisition system for real estate teams.",
    description:
      "VesperWise CRM is the conversion system in the VesperWise ecosystem: intake, qualification, conversations, pipeline, and follow-up on one record so leads do not go cold between tools.",
    sections: [
      {
        heading: "Built for the follow-up",
        body: "Most acquisition stacks split skip tracing, dialing, and CRM. Handoffs are where seller conversations die. This product keeps the next step on the record.",
      },
      {
        heading: "Not a generic CRM with a real-estate coat",
        body: "The queue, dialer, sequences, and property fields are the product. Interface examples on the marketing site are illustrative, not customer proof.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  careers: {
    href: "/careers",
    eyebrow: "Company / Careers",
    title: "No open roles right now.",
    description:
      "We are not hiring on a public board. If you want to be considered later, send a short note through contact — no invented headcount or culture deck.",
    sections: [
      {
        heading: "How to reach us",
        body: "Use the contact form with the role you care about and a link to work. We read it. We will not pretend there is a pipeline if there is not.",
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
  security: {
    href: "/security",
    eyebrow: "Company / Security",
    title: "Tenant isolation is the default, not an add-on.",
    description:
      "Workspaces are separated in Postgres with row-level security. Auth is handled by Supabase. Scale includes SSO and an audit log.",
    sections: [
      {
        heading: "Access",
        body: "Members only see data in their account. Client portal users are scoped to assigned leads. Platform admin is a separate, allow-listed surface.",
      },
      {
        heading: "Credentials",
        body: "Twilio tokens are encrypted at rest with a server-side key. Service-role keys never ship to the browser. Public marketing routes do not require a session.",
      },
      {
        heading: "What this page is not",
        body: "This is a product description, not a SOC 2 report or a penetration-test letter. Ask on a demo if you need a questionnaire.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  contact: {
    href: "/contact",
    eyebrow: "Company / Contact",
    title: "Tell us what you want to see.",
    description:
      "Sales, pilots, and account questions land here. For a scheduled walkthrough, book a demo and pick a slot.",
    sections: [],
    form: "contact",
    cta: { label: "Book a demo instead", href: "/book-demo" },
  },
  privacy: {
    href: "/privacy",
    eyebrow: "Legal / Privacy",
    title: "What we collect on this site.",
    description:
      "This is a working privacy notice for the public marketing site, not counsel-reviewed legal advice. The signed-in CRM has its own account-level data practices.",
    sections: [
      {
        heading: "Marketing site",
        body: "If you book a demo or send a contact message, we collect your name, work email, company, and the message or slot you chose so we can reply. We do not sell that information.",
      },
      {
        heading: "Workspace data",
        body: "Lead, call, and email data in a signed-in workspace belongs to that account. Providers you connect (email, Twilio, Google) process data under their terms and your configuration.",
      },
      {
        heading: "Contact",
        body: "Privacy questions can go through the contact form. If we update this notice, the date on the page will change.",
      },
    ],
  },
  terms: {
    href: "/terms",
    eyebrow: "Legal / Terms",
    title: "Using the public site and the product.",
    description:
      "These terms are a working placeholder for the marketing site and a 14-day pilot. They are not a substitute for a signed order form or counsel review.",
    sections: [
      {
        heading: "The site",
        body: "Marketing copy, interface examples, and pricing figures may be placeholders. Do not treat illustrative names, quotes, or numbers as customer proof.",
      },
      {
        heading: "The product",
        body: "Access to VesperWise CRM requires an account. You are responsible for the data you import and for credentials you connect. We may suspend abuse of intake, email, or telephony.",
      },
      {
        heading: "Pilots",
        body: "Published offers (no card, 14-day pilot, data migration included) apply until replaced by an order form. Skip tracing and telephony are billed at cost.",
      },
    ],
    cta: { label: "See pricing", href: "/home#pricing" },
  },
  status: {
    href: "/status",
    eyebrow: "Legal / Status",
    title: "Service status",
    description:
      "There is no third-party status board yet. This page is the public statement of record for marketing and product availability.",
    sections: [
      {
        heading: "All systems operational",
        body: "The marketing site, authentication, and the CRM application are expected to be available. If you cannot sign in or load a workspace, contact us with the time and what you saw.",
      },
      {
        heading: "Dependencies",
        body: "Email, SMS, and dialing depend on providers you connect. An outage there can affect sending even when the CRM is up.",
      },
    ],
    cta: { label: "Contact", href: "/contact" },
  },
} as const satisfies Record<string, MarketingPageContent>;

export type MarketingPageSlug = keyof typeof MARKETING_PAGES;

export function getMarketingPage(slug: string): MarketingPageContent | null {
  if (slug in MARKETING_PAGES) {
    return MARKETING_PAGES[slug as MarketingPageSlug];
  }
  return null;
}

export function getSolutionPage(slug: string): MarketingPageContent | null {
  if (SOLUTION_SLUGS.includes(slug as SolutionSlug)) {
    return SOLUTION_PAGES[slug as SolutionSlug];
  }
  return null;
}
