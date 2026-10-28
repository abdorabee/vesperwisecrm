import {
  LEGAL_LAST_UPDATED,
  PUBLIC_BILLING_CADENCE,
  PUBLIC_SEAT_OFFER,
} from "@/lib/billing/public-offer";

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
  updated?: string;
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
      "The pipeline and the lead queue sit on one record so assignments do not die in a spreadsheet between acquisition and disposition.",
    sections: [
      {
        heading: "One queue for every source",
        body: "Forms, lists, referrals, and inbound messages land in the same qualification queue. Ownership is visible before anyone opens the lead.",
      },
      {
        heading: "Follow-up that does not depend on memory",
        body: "Notes, tasks, and the owner stay on the lead. When a seller returns after ninety days, the history is already on the record.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  "fix-and-flip": {
    href: "/solutions/fix-and-flip",
    eyebrow: "Solutions / Fix and flip",
    title: "From intake to rehab without losing context.",
    description:
      "Property notes, motivation, and next actions stay on the lead so acquisitions, project managers, and dispositions are looking at the same record.",
    sections: [
      {
        heading: "Capture the property on the lead",
        body: "Condition, occupancy, asking price, and work needed are fields on the lead — not a second spreadsheet.",
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
      "Longer holds need a shared record. Tasks and a shared pipeline keep off-market opportunities visible without a dedicated VA watching a sheet.",
    sections: [
      {
        heading: "Nurture without losing the thread",
        body: "A seller who is not ready this quarter still has a next task. The owner and the due date sit on the record, not in someone's inbox.",
      },
      {
        heading: "Reporting that matches how you buy",
        body: "See what is in qualification, what is under contract, and what stalled — without exporting five tools into a weekly deck.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  agents: {
    href: "/solutions/agents",
    eyebrow: "Solutions / Agents",
    title: "Treat listing and buyer leads like acquisition work.",
    description:
      "VesperWise is a pipeline CRM: stages, the lead queue, notes, and owners keep the next step visible after the first conversation.",
    sections: [
      {
        heading: "Every conversation on the record",
        body: "Notes, tasks, and the next step stay with the lead so coverage does not collapse when someone is out or a lead changes hands.",
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
        heading: "The pipeline stays the record",
        body: "Notes, property fields, and activity history stay on the lead. The pipeline shows what is available, pending, or stuck.",
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
        heading: "Intake and lead capture",
        body: "Leads arrive from forms, imports, and channels. Contact and property context are tracked on the record.",
      },
      {
        heading: "Qualify and pipeline",
        body: "The queue shows who to follow up with. The pipeline is the shared view of what happens next.",
      },
      {
        heading: "Workflows and reporting",
        body: "Tasks and owners keep the next step. The scorecard shows what moved, what stalled, and who owns it.",
      },
    ],
    cta: { label: "See the workflow", href: "/home#ch1" },
  },
  onboarding: {
    href: "/onboarding",
    eyebrow: "Resources / Onboarding",
    title: "A 60-day Team trial, not a six-month implementation.",
    description:
      "Start with intake, the queue, and one pipeline. CSV import of contacts and leads is in workspace settings.",
    sections: [
      {
        heading: "Week one: get leads in",
        body: "Connect a source or import a list. The queue should have work on day one.",
      },
      {
        heading: "Week two: follow up and pipeline",
        body: "Assign an owner and move leads through pipeline stages. An in-app tour walks signed-in members through the same path.",
      },
    ],
    cta: { label: "Start free trial", href: "/signup" },
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
        body: "Public marketing pages, a book-a-demo calendar, and working footer destinations. Pipeline and lead queue are live. The CRM is available in early access after sign-in.",
      },
      {
        heading: "Next",
        body: "Attributed customer quotes replace the labeled placeholders on the landing page. Seat prices on the pricing section are the current monthly offer. No invented metrics in the meantime.",
      },
    ],
    cta: { label: "Book a demo", href: "/book-demo" },
  },
  integrations: {
    href: "/integrations",
    eyebrow: "Resources / Integrations",
    title: "Email and docs on the record.",
    description:
      "Workspace admins connect providers in Settings after sign-in. Nothing here is a marketplace install — each account brings its own credentials.",
    sections: [
      {
        heading: "Email",
        body: "Signup, the contact form, and the internal client digest go through Resend. VesperWise CRM is a pipeline CRM for leads, deals, and next tasks.",
      },
      {
        heading: "Google Docs and Drive",
        body: "Generate a property report into Docs and store it in Drive from the lead, using the account's connected Google client.",
      },
      {
        heading: "Phone numbers on the record",
        body: "A workspace can store the phone number that belongs on the lead. VesperWise CRM is a pipeline CRM for leads, deals, and next tasks.",
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
        body: "A 30-minute demo covers intake, the queue, and the pipeline against your workflow. No card required.",
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
      "VesperWise CRM is the conversion system in the VesperWise ecosystem: intake, qualification, conversations, pipeline, and the next task on one record so the next step stays visible between tools.",
    sections: [
      {
        heading: "Track every lead and its next task.",
        body: "Most acquisition stacks split across multiple tools. Handoffs are where seller conversations die. This product keeps the next step on the record.",
      },
      {
        heading: "Not a generic CRM with a real-estate coat",
        body: "The queue, pipeline, notes, tasks, owners, and property fields are the product. Interface examples on the marketing site are illustrative, not customer proof.",
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
      "Workspaces are separated in Postgres with row-level security. Sign-in is email and password through Supabase.",
    sections: [
      {
        heading: "Access",
        body: "Members only see data in their account. Client portal users are scoped to assigned leads. Platform admin is a separate, allow-listed surface.",
      },
      {
        heading: "Credentials",
        body: "Service-role keys never ship to the browser. Public marketing routes do not require a session.",
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
      "This privacy notice describes the public site and the signed-in product. It is not counsel-reviewed legal advice.",
    updated: LEGAL_LAST_UPDATED,
    sections: [
      {
        heading: "The offer",
        body: `${PUBLIC_SEAT_OFFER} ${PUBLIC_BILLING_CADENCE}`,
      },
      {
        heading: "Marketing site",
        body: "If you book a demo or send a contact message, we collect your name, work email, company, and the message or slot you chose so we can reply. We do not sell that information.",
      },
      {
        heading: "Workspace data",
        body: "Lead and email data in a signed-in workspace belongs to that account. Providers you connect (email and Google) process data under their terms and your configuration.",
      },
      {
        heading: "Subprocessors",
        body: "Supabase stores workspace data and handles sign-in. Polar processes Starter and Team checkout, invoices, and cancellation. Resend sends workspace email and signup messages when email is configured. AI scoring and note parsing send lead text to Anthropic when that feature is configured and the plan includes it. Google Docs and Drive run only after a workspace connects Google.",
      },
      {
        heading: "Retention and deletion",
        body: "There is no automatic deletion schedule. Canceling a Polar subscription does not delete leads or email stored for the workspace. The product has no self-serve control that deletes a workspace. Ask through the contact form if you need data removed.",
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
      "These terms describe the public site and the current product offer. They are not a substitute for a signed order form or counsel review.",
    updated: LEGAL_LAST_UPDATED,
    sections: [
      {
        heading: "The offer",
        body: `${PUBLIC_SEAT_OFFER} ${PUBLIC_BILLING_CADENCE}`,
      },
      {
        heading: "The site",
        body: "Illustrative names, interface examples, and quotes on the marketing site are not customer proof. The seat prices in the offer above are the current prices.",
      },
      {
        heading: "The product",
        body: "Access to VesperWise CRM requires an account. Lead and email data in a signed-in workspace belongs to that account. You are responsible for the data you import and for credentials you connect. The product is a record-keeping and task tool for your own leads and deals. We may suspend abuse of intake.",
      },
      {
        heading: "Cancellation and refunds",
        body: "A workspace admin can cancel a Polar subscription at period end from Billing settings. The workspace keeps full access until that period ends. Canceling does not delete workspace data, and the app does not issue a refund as part of that cancellation. The 60-day Team trial does not ask for a card.",
      },
      {
        heading: "Auto-renewal",
        body: "A paid Starter or Team subscription renews each month through Polar until an admin cancels it at period end. There is no annual plan.",
      },
      {
        heading: "Your data",
        body: "You are responsible for the data you import and for credentials you connect. The product is a record-keeping and task tool for your own leads and deals.",
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
        body: "Connected providers can affect email delivery even when the CRM is up.",
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
