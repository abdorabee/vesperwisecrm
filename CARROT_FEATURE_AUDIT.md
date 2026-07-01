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
- Email outreach via Resend (when env configured)
- Outreach sequences with cron-driven automated email steps
- Workflow engine (lead created, stage changed, tag added, no-activity days)
- Weighted round-robin lead assignment via routing groups
- Member lead visibility restrictions enforced at database RLS
- Personal and team employee scorecards
- Basic dashboard reporting (lead counts, stage breakdown)

### Biggest CRM gaps for this client (P0)

1. **Lead intake** — no web forms, webhooks, or CSV import; `contacts.source` column unused
2. **Action-based workflow** — no "Your Day", task due dates, or mandatory next-step on completion
3. **Team onboarding** — no invite flow; each signup creates an isolated account
4. **SMS** — schema and UI stub only; send path throws
5. **New-lead notifications** — no email alert to reps on inbound leads

### Biggest technical risks

| Risk | Detail |
|------|--------|
| **Cron route blocked by auth proxy** | `src/proxy.ts` matches `/api/cron/*`; unauthenticated requests get `307 → /login` before the route handler can validate `CRON_SECRET` (`src/lib/supabase/middleware.ts` L5–6, L39–41). Vercel cron may hit the same issue unless proxy matcher excludes API cron paths. |
| **Single-account-per-user** | `requireAccountId()` uses `.limit(1)` (`src/lib/supabase/account.ts` L13–18); no multi-account switching. |
| **Env-dependent email** | Resend requires `RESEND_API_KEY` + `RESEND_FROM_EMAIL` (`src/lib/resend/client.ts` L6–9, `src/lib/actions/email.ts` L37–41). |
| **No automated tests** | No `*.test.*` or `*.spec.*` files found. |
| **SMS stub** | `sendDueStep` throws for non-email channels (`src/lib/sequences/send-step.ts` L41–43). |

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
| Lead email & texting | Email + SMS outreach | PARTIAL | Email FULL via Resend; SMS STUB | Complete SMS provider integration |
| 5 property reports/mo | Property report quota | MISSING | No property tables or report feature | Add only if client is RE-focused |
| Email on new leads | Notify rep of inbound lead | MISSING | No notification code; `createLead` only logs activity (`src/lib/actions/leads.ts` L84–94) | Add notification workflow or dedicated alert |
| Basic reporting | Activity and pipeline stats | PARTIAL | Dashboard (`src/app/(dashboard)/page.tsx` L6–74), scorecards (`src/lib/queries/reporting.ts` L31–205) | Expand metrics (see Section E) |

---

### E. CarrotCRM core functionality

| Category | Feature | Carrot expected | Status | Evidence | Gap / next work |
|----------|---------|-----------------|--------|----------|-----------------|
| Intake | Lead intake from web forms | Public forms create CRM leads with source | MISSING | No public API route; only `src/app/api/cron/process-automation/route.ts` exists. `contacts.source` in schema (`supabase/migrations/20260630142401_core_tables.sql` L11) never set in `createLead` (`src/lib/actions/leads.ts` L31–66) | Add webhook or form POST endpoint; populate `source` |
| Intake | Manual lead creation | UI + DB persist | FULL | `src/app/(dashboard)/pipeline/_components/new-lead-dialog.tsx` L57–83 → `createLead` (`src/lib/actions/leads.ts` L9–98) | — |
| Intake | Import/upload offline leads | CSV or file import | MISSING | No import routes, actions, or UI | Add CSV import action |
| Intake | Zapier / webhook integration | External lead sources | MISSING | No webhook handler; grep finds no zapier/webhook code | Add signed webhook API |
| Records | Opportunity/contact records | Contacts linked to leads | FULL | `contacts` + `leads` tables (`supabase/migrations/20260630142401_core_tables.sql` L3–48); detail page (`src/app/(dashboard)/leads/[leadId]/page.tsx`) | — |
| Records | Property records on leads | Address/property attached | MISSING | No property table or fields beyond generic `title`/`value` on leads | Add property model if RE client |
| Comms | Communication history | Timeline of touches | PARTIAL | `activities` table (`supabase/migrations/20260630142424_sequences_activities.sql` L30–41); feed UI (`src/app/(dashboard)/leads/[leadId]/_components/activity-feed.tsx` L3–50). `note_added` type supported in feed (L17–18) but **no UI to add notes** | Add note creation action + UI |
| Comms | Email sending | Send from CRM | FULL* | `sendLeadEmail` (`src/lib/actions/email.ts` L9–68) via Resend; dialog (`send-email-dialog.tsx`) | *Requires `RESEND_*` env; runtime not verified |
| Comms | SMS sending | Text from CRM / sequences | STUB/MOCK | DB allows `sms` channel (`sequences_activities.sql` L20); UI disabled (`sequence-form.tsx` L143–145); `sendDueStep` throws (`send-step.ts` L41–43) | Integrate Twilio/etc. |
| Outreach | Automated drip campaigns | Multi-step sequences | PARTIAL | Sequences CRUD (`src/app/(dashboard)/sequences/`), enrollment (`enrollments.ts` L8–58), cron auto-send (`process-automation/route.ts` L17–48). Email only | SMS; verify cron path not blocked by proxy |
| Outreach | Instant response on new lead | Auto email/SMS on create | PARTIAL | `runTriggeredWorkflows` on `lead_created` (`leads.ts` L92–94, `engine.ts` L31–96). Requires admin-configured workflow + Resend | No default out-of-box instant response |
| AI | AI lead manager / autonomous follow-up | AI-driven outreach | MISSING | No AI provider imports or routes | P2 if client wants |
| AI | AI opportunity summaries | Generated deal summaries | MISSING | — | P2 |
| AI | AI lead scoring + custom rules | Scorable leads | MISSING | — | P2 |
| Property | Ownership, sales, mortgage, tax, comps | Property intelligence | MISSING | — | P1/P2 for RE client |
| Workflow | Action-based tasks with due dates | Every action has due date | MISSING | No `tasks` table or due-date fields on activities | Core Carrot differentiator; P1 |
| Workflow | Complete task → set next step | Mandatory next step/deadline | MISSING | — | P1 |
| Workflow | "Your Day" dashboard | Due/overdue task queue | MISSING | Dashboard shows lead stats only (`src/app/(dashboard)/page.tsx` L19–40) | P1 |
| Workflow | Start-next-task by priority | Ordered task queue | MISSING | — | P1 |
| Pipeline | First click → closed contract visibility | Full funnel view | PARTIAL | Kanban by stage (`pipeline/page.tsx`, `kanban-board.tsx` L48–50); no click/visit tracking | No marketing funnel without website integration |
| Pipeline | Deal stages / statuses | Configurable pipeline | FULL | `pipeline_stages` per account; default stages on signup (`core_tables.sql` L121–128); drag-drop stage change (`kanban-board.tsx` L48–50 → `updateLeadStage`) | — |
| Pipeline | Contract / transaction tracking | Contract entity | MISSING | `leads.status` is open/won/lost only (`core_tables.sql` L43) | Add contract stage/fields if needed |
| Reporting | Daily activities | Activity metrics | PARTIAL | `activitiesThisWeek` on scorecard (`reporting.ts` L129–134) | No daily breakdown view |
| Reporting | Avg touches per opportunity | Touch count analytics | MISSING | — | P1 |
| Reporting | Avg time to contract | Time-in-stage metrics | PARTIAL | `avgDaysToWon` on scorecard (`reporting.ts` L148–157) — creation to won only | No contract-specific metric |
| Reporting | Contract-to-close ratio | Close rate | MISSING | Win rate only (`reporting.ts` L144–146) | P1 |
| Reporting | Source/channel attribution | Leads by source | MISSING | `contacts.source` unused | Wire source on intake |
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
| Team member invite | Add users to account | MISSING | Team page lists existing members only (`team/page.tsx` L48–50); no invite action | P0: Supabase invite or magic-link flow |
| Agency/client/site hierarchy | Multi-level tenancy | N/A | Flat `accounts` model only | Out of scope |
| Ownership transfer | Transfer account/site | N/A | — | Out of scope |
| Billing/plan entitlements | Feature limits by plan | N/A | No billing tables | Out of scope for client CRM |

---

### H. Integrations (CRM-relevant)

| Integration | Status | Evidence | Gap / next work |
|-------------|--------|----------|-----------------|
| **Resend (email)** | REAL* | `src/lib/resend/client.ts` L5–16; used in `email.ts` L44–50, `send-step.ts` L71–77 | *Runtime send not verified; keys present in `.env.local` |
| **Supabase (auth + DB)** | REAL | Migrations in `supabase/migrations/`; clients in `src/lib/supabase/` | Linked project configured |
| **SMS (Twilio etc.)** | STUB/MOCK | Schema + disabled UI; throw in `send-step.ts` L41–43 | P0/P1 |
| **Zapier / webhooks** | MISSING | — | P0 intake |
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
| 3 | User enrolls lead in sequence → cron sends steps | **PARTIAL** | Enrollment sets `next_step_due_at` (`enrollments.ts` L33–44); cron processes due enrollments (`process-automation/route.ts` L20–32) | Email only; cron HTTP test returned **307 → /login** (proxy blocks unauthenticated API) |
| 4 | Admin restricts member to assigned leads only | **PASS** (code) | `updateMemberRestrictions` (`team.ts` L11–33); RLS (`team_features.sql` L235–247) | — |
| 5 | Admin assigns via weighted round robin | **PASS** (code) | `assign_lead_round_robin` RPC (`team_features.sql` L117–196); called from `assignLeadToGroup` (`groups.ts` L83–101) | — |
| 6 | User views personal / team scorecard | **PASS** (code) | Routes `/scorecard`, `/team/scorecard`; queries `reporting.ts` L176–205 | Team scorecard requires admin |
| 7 | External form/webhook creates lead with source | **FAIL** | No public intake endpoint | P0 gap |
| 8 | User completes action → must set next step | **FAIL** | No task/action entity | — |
| 9 | "Your Day" overdue task queue | **FAIL** | Dashboard is stats-only (`page.tsx` L19–40) | — |
| 10 | SMS sequence step sends | **FAIL** | `sendDueStep` throws for SMS (`send-step.ts` L41–43) | — |

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
        ├── workflows → workflow_actions
        └── lead_groups → lead_group_members (weight, current_weight)

* source column exists but is never written
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

Cron uses service-role Supabase client (`service-role.ts`). **Risk:** proxy middleware may intercept cron HTTP before `CRON_SECRET` check (verified: `307 → /login` without session).

### AI architecture

None. No LLM client, prompts, or AI-specific tables.

---

## 5. Missing Features Roadmap

Prioritized for **this client CRM**, not full Carrot platform parity.

### P0 — needed for a credible client CRM

| Feature | Effort | Rationale |
|---------|--------|-----------|
| Lead intake (webhook or form API) + `contacts.source` | Medium | No inbound path today; blocks real production use |
| Team invite / multi-user per account | Medium | Each user gets isolated account on signup |
| New-lead email notification | Low | Carrot free includes this; critical for response time |
| Notes on leads (`note_added` wiring) | Low | Schema exists; feed already renders type |
| Fix cron proxy exclusion | Low | Automation may not run from Vercel cron if proxy blocks |
| SMS sending (complete stub) | Medium | CarrotCRM includes texting; channel already in schema |

### P1 — CarrotCRM parity improvements

| Feature | Effort | Rationale |
|---------|--------|-----------|
| Action-based task workflow ("Your Day", due/overdue, next-step required) | High | Major CarrotCRM differentiator |
| CSV lead import | Medium | Common ops need |
| Richer reporting (touches/opp, source attribution, contract-to-close) | Medium | Scorecard is a start |
| Property/address fields on leads | Medium | If RE-focused client |
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
| `npm run build` | **PASS** (exit 0) | Next.js 16.2.9; 17 routes compiled; `.env.local` loaded |
| `npm run lint` | **PASS** (exit 0) | ESLint clean |
| `npm run dev` | **BLOCKED** | Port 3000 in use; new instance on 3001 hit sandbox network interface error |
| `curl http://localhost:3000/api/cron/process-automation` | **307 → /login** | Proxy redirects unauthenticated API before route handler |
| `curl -H "Authorization: Bearer $CRON_SECRET" ...` (from `.env.local`) | **307 → /login** | Same; cron auth never reached |
| Manual UI / email send / DB smoke test | **NOT RUN** | Supabase + Resend keys present in `.env.local`; no interactive session in audit |
| Automated test suite | **N/A** | No tests exist |

### Env configuration observed

Keys present in `.env.local` (values not inspected): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`.

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
