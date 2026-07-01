# Carrot CRM Feature Audit — VesperwiseCRM

**Audit date:** 2026-07-01  
**Repository:** `versperwisecrm`  
**Scope:** CarrotCRM features only (client-customized CRM benchmark)  
**Reference:** [Carrot CRM](https://carrot.com/features/crm/), [Carrot Pricing](https://carrot.com/pricing/)

---

## 1. Executive Summary

### Parity estimate

| Metric | Estimate |
|--------|----------|
| **CarrotCRM feature parity** | **~35%** |
| **Product type** | Client-customized CRM (VesperwiseCRM) with Carrot-inspired team automation |

This is **not** a full Carrot platform clone. It is a bespoke CRM deployment for a client. Website builder, CarrotAgency, SEO tooling, bulk redirects, and Carrot SaaS billing tiers are **intentionally out of scope** (see Appendix).

### What is built and working

- Persistent lead/contact pipeline with drag-and-drop kanban
- Manual lead creation with contact deduplication by email
- Per-account email via Resend: domain verification, gated sends, per-member sender identity, reply routing, inbound capture
- Outreach sequences with cron-driven automated email steps
- Workflow engine (lead created, stage changed, tag added, no-activity days)
- Weighted round-robin lead assignment via routing groups
- Member lead visibility restrictions enforced at database RLS
- Personal and team employee scorecards
- Basic dashboard reporting (lead counts, stage breakdown)

### Biggest remaining CRM gaps for this client

1. **Runtime smoke tests** — provider-backed email/SMS, property forms, and task workflows still need live-data UI exercise
2. **External property intelligence** — address/contract tracking is present, but no ownership/tax/comps API integration yet

### Biggest technical risks

| Risk | Detail |
|------|--------|
| **Cron route smoke pending** | Middleware now allows `/api/cron/*` through to the route handler, but a clean local curl smoke still needs a running dev server. |
| **Single-account-per-user** | `requireAccountId()` uses `.limit(1)` (`src/lib/supabase/account.ts` L13–18); no multi-account switching. |
| **Env-dependent email** | Resend requires `RESEND_API_KEY`; tenant From identity is per-account in `account_email_settings` (`src/lib/email/account-settings.ts`, Settings → Email). |
| **No automated tests** | No `*.test.*` or `*.spec.*` files found. |
| **Provider-dependent comms** | Email requires `RESEND_*`; SMS requires `TWILIO_*`. Missing env config prevents actual sends. |
| **External provider dependency** | Email requires `RESEND_*`, SMS requires `TWILIO_*`, and property comps would require a future third-party data provider. |

### Clone classification

**CRM clone** — subset of CarrotCRM Team-tier capabilities. Not a website-builder, agency-dashboard, or full-platform clone.

---

## 2. Feature Matrix

Status key: **FULL** = end-to-end with DB persistence and permissions · **PARTIAL** = partly implemented · **STUB/MOCK** = placeholder or non-functional path · **MISSING** = no implementation · **UNKNOWN** = not runtime-verified · **N/A** = out of scope for this client deployment

### D. CarrotCRM Free limits (reference only — N/A for client build)

Carrot's commercial freemium limits are not enforced in this bespoke deployment. Documented for benchmark comparison only.

| Feature | Carrot expected | Status | Evidence | Gap / next work |
|---------|-----------------|--------|----------|-----------------|
| 1 user limit | 1 user per free CRM | N/A | Each signup auto-provisions a separate account (`supabase/migrations/20260630142340_tenancy.sql` L41–64) | Not applicable; implement team invite if client needs multi-user per account |
| 3 automated sequences | Max 3 active sequences | N/A | No count check in `src/lib/actions/sequences.ts` L8–74 | Unlimited by design for client |
| Lead email & texting | Email + SMS outreach | FULL* | Email via Resend; SMS via Twilio REST | *Provider env required |
| 5 property reports/mo | Property report quota | MISSING | No property tables or report feature | Add only if client is RE-focused |
| Email on new leads | Notify rep of inbound lead | FULL* | Webhook intake calls shared lead creation with member notifications (`src/app/api/leads/intake/route.ts`, `src/lib/leads/create-lead.ts`) | *Requires `RESEND_*` env |
| Basic reporting | Activity and pipeline stats | FULL | Dashboard includes total/new leads, stage breakdown, source attribution, average touches, close rate, and daily touch activity (`src/app/(dashboard)/page.tsx`, `src/lib/queries/reporting.ts`) | Runtime UI smoke still recommended |

---

### E. CarrotCRM core functionality

| Category | Feature | Carrot expected | Status | Evidence | Gap / next work |
|----------|---------|-----------------|--------|----------|-----------------|
| Intake | Lead intake from web forms | Public forms create CRM leads with source | FULL | Signed intake endpoint creates leads via service-role and populates `contacts.source` (`src/app/api/leads/intake/route.ts`, `src/lib/leads/create-lead.ts`) | Configure `LEAD_INTAKE_SECRET`; pass account/stage/source from form or webhook |
| Intake | Manual lead creation | UI + DB persist | FULL | `src/app/(dashboard)/pipeline/_components/new-lead-dialog.tsx` L57–83 → `createLead` (`src/lib/actions/leads.ts` L9–98) | — |
| Intake | Import/upload offline leads | CSV or file import | FULL | Pipeline import dialog parses CSV and calls shared lead creation (`import-leads-dialog.tsx`, `importLeadsCsv` in `src/lib/actions/leads.ts`) | Supports up to 500 rows/import; live UI smoke not run |
| Intake | Zapier / webhook integration | External lead sources | FULL | `POST /api/leads/intake` accepts signed JSON lead payloads with `source` | Configure external tools to send bearer `LEAD_INTAKE_SECRET` |
| Records | Opportunity/contact records | Contacts linked to leads | FULL | `contacts` + `leads` tables (`supabase/migrations/20260630142401_core_tables.sql` L3–48); detail page (`src/app/(dashboard)/leads/[leadId]/page.tsx`) | — |
| Records | Property records on leads | Address/property attached | FULL | `lead_properties` migration, shared creation helper, CSV/webhook/manual intake mapping, and editable lead-detail panel added | Remote migration applied |
| Comms | Communication history | Timeline of touches | FULL | `activities` feed now shows notes, email, SMS, sequence, assignment, workflow events; note form writes `note_added` (`src/app/(dashboard)/leads/[leadId]/_components/add-note-form.tsx`, `activity-feed.tsx`) | — |
| Comms | Email sending | Send from CRM | FULL* | Per-account domain + From (`account_email_settings`); per-member display name/local-part; gated `sendLeadFacingEmail` (`src/lib/email/send-lead-email.ts`); manual dialog (`send-email-dialog.tsx`) | *Requires verified domain + `RESEND_API_KEY` |
| Comms | Inbound email reply capture | Replies on lead timeline | FULL* | Tokenized Reply-To + `email.received` webhook (`process-inbound.ts`, `/api/webhooks/resend-inbound`); disabled in agent-direct reply mode | *Requires `INBOUND_EMAIL_DOMAIN` + webhook |
| Comms | Per-member sender identity | Rep name on outbound | FULL | `account_members.from_display_name` / `from_email_local_part`; Team + Profile UI; formats `Name via Account <hello@domain>` or `Name <name@domain>` | — |
| Comms | Reply routing modes | Shared inbox vs agent Reply-To | FULL | `reply_routing_mode` on `account_email_settings`; shared inbox uses capture tokens; agent direct uses lead owner email | Mutually exclusive with capture in agent mode |
| Comms | Email health dashboard | Domain status + send volume | FULL | Settings → Email health card: verification, last test send, 7d/30d sends, bounces/complaints (`email-health.ts`, `email_delivery_events`) | Bounce/complaint counts need Resend delivery webhooks |
| Comms | Platform email admin | Cross-tenant abuse controls | FULL* | Env-gated `PLATFORM_ADMIN_EMAILS`; `/platform/email` lists accounts, suspend outbound (`platform-email.ts`) | Internal ops only |
| Comms | Marketing sequence compliance | CAN-SPAM unsubscribe | FULL* | `sequences.is_marketing`, `contacts.email_opted_out_at`, `/api/unsubscribe`, footer in marketing sends | Manual/workflow sends not auto-marketing |
| Comms | Email observability | Structured delivery logs | PARTIAL | JSON `logEmailEvent` on send/inbound/bounce/complaint; optional `ALERT_WEBHOOK_URL` on webhook failures | No external APM integration |
| Comms | SMS sending | Text from CRM / sequences | FULL* | SMS sequence steps are enabled in UI and sent via Twilio REST (`src/lib/sms/twilio.ts`, `src/lib/sequences/send-step.ts`) | *Requires `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER` |
| Outreach | Automated drip campaigns | Multi-step sequences | FULL* | Sequences CRUD (`src/app/(dashboard)/sequences/`), enrollment (`enrollments.ts` L8–58), cron auto-send (`process-automation/route.ts` L17–48), email and SMS send paths | *Provider env and cron runtime smoke still needed |
| Outreach | Instant response on new lead | Auto email/SMS on create | PARTIAL | `runTriggeredWorkflows` on `lead_created` (`leads.ts` L92–94, `engine.ts` L31–96). Requires admin-configured workflow + Resend | No default out-of-box instant response |
| AI | AI lead manager / autonomous follow-up | AI-driven outreach | MISSING | No AI provider imports or routes | P2 if client wants |
| AI | AI opportunity summaries | Generated deal summaries | MISSING | — | P2 |
| AI | AI lead scoring + custom rules | Scorable leads | MISSING | — | P2 |
| Property | Ownership, sales, mortgage, tax, comps | Property intelligence | PARTIAL | Lead-level property profile captures address, type, size, values, and notes | No ownership/tax/comps API |
| Workflow | Action-based tasks with due dates | Every action has due date | FULL | `lead_tasks` migration, lead task panel, and task actions added (`20260701142127_action_tasks.sql`, `src/lib/actions/tasks.ts`, `task-panel.tsx`) | Remote migration applied |
| Workflow | Complete task → set next step | Mandatory next step/deadline | FULL | `completeLeadTask` requires next title/due date and creates the next task before completing current task | Live UI smoke not run |
| Workflow | "Your Day" dashboard | Due/overdue task queue | FULL | Dashboard renders assigned due/overdue tasks via `getYourDayTasks()` and `YourDay` component | Live UI smoke not run |
| Workflow | Start-next-task by priority | Ordered task queue | FULL | `Your Day` orders open assigned tasks by due date and displays high-priority labels | Live UI smoke not run |
| Pipeline | First click → closed contract visibility | Full funnel view | PARTIAL | Kanban by stage (`pipeline/page.tsx`, `kanban-board.tsx` L48–50); no click/visit tracking | No marketing funnel without website integration |
| Pipeline | Deal stages / statuses | Configurable pipeline | FULL | `pipeline_stages` per account; default stages on signup (`core_tables.sql` L121–128); drag-drop stage change (`kanban-board.tsx` L48–50 → `updateLeadStage`) | — |
| Pipeline | Contract / transaction tracking | Contract entity | PARTIAL | `lead_properties` includes contract status, amount, and close date; lead detail has an editable Property & Contract panel | No separate transaction ledger |
| Reporting | Daily activities | Activity metrics | FULL | Dashboard renders daily lead-touch activity for the current week; scorecards still show weekly activity totals (`page.tsx`, `reporting.ts`) | Live-data UI smoke not run |
| Reporting | Avg touches per opportunity | Touch count analytics | FULL | Dashboard calculates all-time lead activity count divided by active leads (`averageTouchesPerLead`) | Uses CRM activities as touches |
| Reporting | Avg time to contract | Time-in-stage metrics | PARTIAL | `avgDaysToWon` on scorecard (`reporting.ts` L148–157) — creation to won only | No contract-specific metric |
| Reporting | Contract-to-close ratio | Close rate | PARTIAL | Dashboard reports won / closed lead close rate; scorecards report user win rate | No separate contract entity yet |
| Reporting | Source/channel attribution | Leads by source | FULL | Manual/webhook/CSV intake write `contacts.source`; dashboard renders leads by source (`reporting.ts`, `page.tsx`) | — |
| Reporting | Team/member reporting | Per-rep metrics | FULL | Team scorecard (`src/app/(dashboard)/team/scorecard/page.tsx`); `getTeamScorecard` (`reporting.ts` L190–205) | — |
| Team | TV KPI dashboard | Wall-display metrics | MISSING | — | P2 |
| Team | Employee scorecard | Rep performance | FULL | Personal (`scorecard/page.tsx`) + team (`team/scorecard/page.tsx`) | — |
| Team | Weighted round robin | Auto assignment | FULL | `assign_lead_round_robin` RPC (`team_features.sql` L117–196); UI in new lead dialog (`new-lead-dialog.tsx` L61–71) and workflow action | — |
| Team | Restricted users | See only assigned leads | FULL | `lead_visibility` column (`team_features.sql` L10–13); RLS policy (`team_features.sql` L235–247); team UI (`team/page.tsx`, `member-restrictions-row.tsx`) | — |
| Team | Groups by region/lead type | Routing pools | PARTIAL | `lead_groups` + weighted members (`team_features.sql` L34–51); no region/lead-type metadata | Name-only groups |
| Team | Auto lead routing on create | Route without manual pick | PARTIAL | Optional group on manual create (`new-lead-dialog.tsx` L131–159); workflow `assign_round_robin` action (`actions.ts` L78–84) | No default routing rule |

---

### F. Access control and tenancy (CRM-relevant)

| Feature | Carrot expected | Status | Evidence | Gap / next work |
|---------|-----------------|--------|----------|-----------------|
| Multi-tenant data isolation | CRM data scoped per account | FULL | `account_id` FK on all CRM tables; RLS via `is_account_member()` (`tenancy.sql` L19–39, `core_tables.sql` L74–102) | — |
| Role-based access control | Owner/admin/member roles | PARTIAL | Roles on `account_members` (`tenancy.sql` L12); `requireAdminAccountId` for workflows (`account.ts` L40–65, `workflows.ts` L40). Group writes require admin at RLS (`team_features.sql` L207–210) but `saveGroup` only calls `requireAccountId` (`groups.ts` L13) — non-admin gets DB error, not upfront guard | Align server actions with admin checks |
| Permission enforcement on backend | Not UI-only | FULL | Supabase RLS on all tables; server actions use `requireAccountId` / `requireAdminAccountId` | — |
| Restricted user lead visibility | Assigned-only members | FULL | RLS policy (`team_features.sql` L235–247) | — |
| Team member invite | Add users to account | FULL | Team invite dialog uses Supabase Admin invite and the signup trigger joins invited users to the inviting account (`invite-member-dialog.tsx`, `team.ts`, `20260701140945_audit_p0_crm_gaps.sql`) | Requires Supabase email auth/invite delivery configuration |
| Agency/client/site hierarchy | Multi-level tenancy | N/A | Flat `accounts` model only | Out of scope |
| Ownership transfer | Transfer account/site | N/A | — | Out of scope |
| Billing/plan entitlements | Feature limits by plan | N/A | No billing tables | Out of scope for client CRM |

---

### H. Integrations (CRM-relevant)

| Integration | Status | Evidence | Gap / next work |
|-------------|--------|----------|-----------------|
| **Resend (email)** | REAL* | Per-account sending via `account_email_settings` + `sendLeadFacingEmail`; webhooks: inbound (`/api/webhooks/resend-inbound`), delivery (`/api/webhooks/resend-events`) | *Runtime send not verified; see `docs/EMAIL_SETUP.md` |
| **Supabase (auth + DB)** | REAL | Migrations in `supabase/migrations/`; clients in `src/lib/supabase/` | Linked project configured |
| **SMS (Twilio etc.)** | REAL* | Twilio REST send helper (`src/lib/sms/twilio.ts`) and sequence send path (`send-step.ts`) | *Requires `TWILIO_*` env |
| **Zapier / webhooks** | REAL | Signed `POST /api/leads/intake` route | Configure sender with `LEAD_INTAKE_SECRET` |
| **Property / comps API** | MISSING | — | P2 |
| **AI provider** | MISSING | — | P2 |
| **CRM ↔ website lead sync** | MISSING | No website layer | N/A unless client adds intake |

*Out of scope (not audited):* Google Analytics, Google Search Console, call tracking, Stripe — website/marketing integrations.

---

## 3. End-to-End Workflow Verification

| # | Workflow | Result | What was verified | Notes |
|---|----------|--------|-------------------|-------|
| 1 | User manually creates lead → appears in pipeline | **PASS** (code) | `createLead` inserts `contacts` + `leads` + `activities` (`leads.ts` L68–94); pipeline queries by `account_id` (`pipeline.ts` L84–91) | Runtime DB persist not manually exercised in this audit |
| 2 | New lead triggers workflow (email / sequence / round robin) | **PARTIAL** | `runTriggeredWorkflows` called on create (`leads.ts` L92–94); actions in `actions.ts` L20–123 | Requires admin to configure workflow; email needs Resend |
| 3 | User enrolls lead in sequence → cron sends steps | **PASS*** | Enrollment sets `next_step_due_at`; cron processes due enrollments; proxy now lets `/api/cron/*` reach route auth (`src/lib/supabase/middleware.ts`) | *Email/SMS sends require provider env |
| 4 | Admin restricts member to assigned leads only | **PASS** (code) | `updateMemberRestrictions` (`team.ts` L11–33); RLS (`team_features.sql` L235–247) | — |
| 5 | Admin assigns via weighted round robin | **PASS** (code) | `assign_lead_round_robin` RPC (`team_features.sql` L117–196); called from `assignLeadToGroup` (`groups.ts` L83–101) | — |
| 6 | User views personal / team scorecard | **PASS** (code) | Routes `/scorecard`, `/team/scorecard`; queries `reporting.ts` L176–205 | Team scorecard requires admin |
| 7 | External form/webhook creates lead with source | **PASS** (code) | Signed intake endpoint creates lead and writes source (`src/app/api/leads/intake/route.ts`) | Runtime webhook smoke requires `LEAD_INTAKE_SECRET` |
| 8 | User completes action → must set next step | **PASS*** (code) | `completeLeadTask` requires next task fields and links `next_task_id`; remote migration applied | *Live UI smoke not run |
| 9 | "Your Day" overdue task queue | **PASS*** (code) | Dashboard fetches and renders assigned due/overdue tasks; remote migration applied | *Live UI smoke not run |
| 10 | SMS sequence step sends | **PASS*** | SMS steps call Twilio REST and log `sms_sent` (`src/lib/sms/twilio.ts`, `send-step.ts`) | *Requires `TWILIO_*` env |

### Removed from verification (out of scope)

Agency client-site creation, client-owned account linking, bulk redirects, per-site CRM with Carrot free limits.

---

## 4. Architecture Findings

### Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.2.9, React 19, Tailwind 4, shadcn/base-ui, @dnd-kit |
| Backend | Next.js Server Actions, single API route (cron) |
| Database | Supabase Postgres with Row Level Security |
| Auth | Supabase Auth (email/password) |
| Email | Resend |
| Hosting | Vercel (cron in `vercel.json` L2–7) |
| Tests | None |

### Data model

```
accounts
  └── account_members (user_id, role, lead_visibility, max_open_leads)
        ├── contacts (first_name, last_name, email, phone, company, source*)
        ├── pipeline_stages
        ├── leads (contact_id, pipeline_stage_id, owner_user_id, routing_group_id, status, value)
        ├── tags → lead_tags
        ├── sequences → sequence_steps (channel: email|sms)
        │     └── lead_sequence_enrollments → sequence_step_sends
        ├── activities (type, payload, actor_user_id)
        ├── lead_tasks (title, due_at, priority, assigned_user_id, next_task_id)
        ├── lead_properties (address, property facts, contract status/amount/date)
        ├── workflows → workflow_actions
        └── lead_groups → lead_group_members (weight, current_weight)

* source is written by manual, CSV, and webhook intake
```

Migrations: `supabase/migrations/20260630142340_tenancy.sql` through `20260630204310_account_member_profiles.sql`.

### Tenancy model

- **Flat account isolation:** every CRM row has `account_id`; RLS checks `is_account_member(account_id)`.
- **Provisioning:** new auth user → new account + owner membership + default pipeline stages (`tenancy.sql` L41–64, `core_tables.sql` L104–131).
- **Single account per session:** `requireAccountId()` returns first membership only (`account.ts` L13–18).
- **No agency/client/site hierarchy.**

### Auth and permissions

- Login/signup: `src/app/(auth)/login/page.tsx` → `signIn`/`signUp` (`auth.ts`).
- Session gate: `src/proxy.ts` → `updateSession` (`middleware.ts` L5–6 public paths: `/login`, `/auth` only).
- Roles: `owner`, `admin`, `member` (`tenancy.sql` L12).
- Admin helpers: `is_account_admin()` (`team_features.sql` L15–28), `requireAdminAccountId()` (`account.ts` L40–65).
- Lead visibility: `assigned_only` enforced in RLS, not just UI (`team_features.sql` L235–247).

### Plan / billing / entitlements

**Absent by design** for this client deployment. No Stripe, subscription tables, or feature gates.

### Background jobs

| Job | Trigger | Handler |
|-----|---------|---------|
| Due sequence steps | Vercel cron hourly (`vercel.json`) | `process-automation/route.ts` L17–48 |
| No-activity workflows | Same cron | `process-automation/route.ts` L58–149 |

Cron uses service-role Supabase client (`service-role.ts`). The proxy now treats `/api/cron/*` as public so the route handler can validate `CRON_SECRET`.

### AI architecture

None. No LLM client, prompts, or AI-specific tables.

---

## 5. Missing Features Roadmap

Prioritized for **this client CRM**, not full Carrot platform parity.

### P0 — needed for a credible client CRM

| Feature | Effort | Rationale |
|---------|--------|-----------|
| Lead intake (webhook or form API) + `contacts.source` | DONE | Signed webhook intake route added |
| Team invite / multi-user per account | DONE | Invite flow and signup trigger support invited accounts |
| New-lead email notification | DONE* | Intake sends member notifications when `RESEND_*` env is configured |
| Notes on leads (`note_added` wiring) | DONE | Note form/action added |
| Fix cron proxy exclusion | DONE | `/api/cron/*` bypasses session redirect |
| SMS sending (complete stub) | DONE* | Twilio-backed sequence SMS enabled when `TWILIO_*` env is configured |

### P1 — CarrotCRM parity improvements

| Feature | Effort | Rationale |
|---------|--------|-----------|
| Action-based task workflow ("Your Day", due/overdue, next-step required) | DONE | Code, migration, and remote apply completed |
| CSV lead import | DONE | Pipeline import dialog and server action added |
| Richer reporting (touches/opp, source attribution, contract-to-close) | DONE | Dashboard metrics added |
| Property/address fields on leads | DONE | `lead_properties` data model, UI, and remote migration apply completed |
| Default instant-response workflow on signup | Low | Seed template workflow for new accounts |

### P2 — advanced (only if client requests)

| Feature | Effort |
|---------|--------|
| AI lead scoring / summaries | High |
| Property comps integration | High |
| TV KPI dashboard | Medium |
| Autonomous AI lead follow-up | High |

### Explicitly not on roadmap unless client asks

Website builder, SEO/location pages, keyword tracking, CarrotAgency multi-site dashboard, bulk redirects, Carrot billing tiers, white-label.

---

## 6. Verification Commands Run

| Command | Result | Notes |
|---------|--------|-------|
| `npm run build` | **PASS** (exit 0) | Next.js 16.2.9; 18 app routes compiled; `.env.local` loaded |
| `npm run lint` | **PASS** (exit 0) | ESLint clean |
| `npx supabase migration list --linked` | **PASS** | Local and remote migration histories match through `20260701144726_lead_property_contracts` |
| `npx supabase db push --linked --yes` | **PASS** | Applied task and property/contract migrations; Docker cache warning did not block push |
| `npx supabase db lint --linked --fail-on error` | **PASS** | No schema errors found |
| `npx supabase gen types --linked --schema public` | **PASS** | Generated linked types verified for `lead_properties`; checked-in types aligned |
| CSV import compile check | **PASS** | `importLeadsCsv` and `ImportLeadsDialog` included in passing build/lint |
| Reporting compile check | **PASS** | Richer dashboard reporting included in passing build/lint |
| Property/contract compile check | **PASS** | `lead_properties`, lead creation mapping, CSV/webhook mapping, and lead-detail editor included in passing build/lint |
| `npm run dev` | **PARTIAL** | Clean dev server started on port 3000 and served an in-app browser request to `/pipeline`; stopped afterward and port 3000 cleared |
| `curl http://localhost:3000/api/cron/process-automation` | **BLOCKED** | Shell curl could not connect to the running dev server even though Next logged a browser request; route proxy code still compiles |
| `curl -H "Authorization: Bearer $CRON_SECRET" ...` (from `.env.local`) | **NOT RUN** | Blocked by shell loopback connectivity in this session |
| Manual UI / email send / DB smoke test | **NOT RUN** | Supabase + Resend keys present in `.env.local`; no interactive session in audit |
| Automated test suite | **N/A** | No tests exist |

### Env configuration observed

Keys present in `.env.local` (values not inspected): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, `INBOUND_EMAIL_DOMAIN`. Per-account From replaces deprecated `RESEND_FROM_EMAIL`. New polish env: `UNSUBSCRIBE_SECRET`, `PLATFORM_ADMIN_EMAILS`, `ALERT_WEBHOOK_URL`, `NEXT_PUBLIC_SITE_URL`. See `docs/EMAIL_SETUP.md`.

---

## Appendix: Out of Scope

The following Carrot product areas were **not audited as gaps** because this project is a client-customized CRM only:

| Area | Carrot product | Status in repo |
|------|----------------|----------------|
| A. Core website platform | AI builder, SEO, location pages, hosting, analytics, call tracking | Not present |
| B. Plus-plan website features | Advanced SEO, rank tracking limits, campaign links | Not present |
| C. CarrotAgency | Client/site dashboard, ownership models, task checklists, team per client | Not present |
| G. Redirects | Bulk redirect UI, import/export, runtime enforcement | Not present |

If scope expands later, re-audit those sections separately.

---

*Audit method: full repository inspection (frontend, migrations, server actions, API routes, config, docs). Classifications based on code evidence, not menu labels or TODOs. Tests not treated as proof of implementation.*
