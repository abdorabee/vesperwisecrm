# Quick Wins Progress — Comp AI Roadmap

**Source plan**: `/Users/laflame/.claude/plans/research-analyze-and-upgrade-fizzy-aurora.md` (§13, "Quick Wins (1–2 weeks)"), approved 2026-08-04.
**Branch**: `improvement-ph-1`.
**Purpose of this file**: a resumable status board so any agent/session picking this up — with no memory of this conversation — knows exactly what shipped, what's half-done, and what's untouched. Update the status + notes for a task whenever you touch it. Don't delete finished rows; they're the record of what happened.

---

## Status legend

`DONE` code complete + typechecked/linted/built · `IN PROGRESS` partially done · `BLOCKED` cannot proceed without a decision/dependency · `NOT STARTED`

---

## 1. Command palette (cmd-K)

**Status: DONE** (code-complete, not yet manually click-tested in an authenticated browser session — see Verification below)

What shipped:
- [src/lib/actions/search.ts](../../src/lib/actions/search.ts) — new server action `searchCommandPalette(query)`. Calls the existing `smart_search_leads` RPC (unchanged — Smart Search itself was not touched), then joins lead title + contact name for display. Reuses the existing `LeadMatchReason` type from `src/lib/queries/pipeline.ts`.
- [src/components/command-palette.tsx](../../src/components/command-palette.tsx) — new client component. Global `⌘K`/`Ctrl+K` listener, 200ms debounced search via the action above, a "Leads" result group (title + contact name + top match reason) and a static "Go to" nav group (Pipeline, Lead Queue, Sequences, Workflows, My Scorecard, +Team/Clients/Employee Scorecard when `isAdmin`). Built on the existing shadcn `Command`/`CommandDialog` primitives in `src/components/ui/command.tsx` (already in the project, previously only used inside the tag-editor combobox).
- [src/app/(dashboard)/layout.tsx](<../../src/app/(dashboard)/layout.tsx>) — mounts `<CommandPalette isAdmin={isAdmin} />` once, globally, for every dashboard route.

Update (autonomous tick, same day): added a visible "Search ⌘K" trigger row in the dashboard sidebar (`src/components/dashboard-nav.tsx` — new `showSearchTrigger` prop on `SidebarShell`, only passed from `DashboardSidebar`; Portal/Platform sidebars unchanged) that dispatches a `vesperwise:open-command-palette` window event, which `command-palette.tsx` now also listens for alongside its own ⌘K/Ctrl+K keydown handler. Closes the discoverability gap noted below.

**Bug found + fixed (user-reported, live testing)**: initial version crashed at runtime with `TypeError: Cannot read properties of undefined (reading 'subscribe')` inside `cmdk`'s `CommandInput`. Root cause: this repo's `CommandDialog` (`src/components/ui/command.tsx`) does **not** wrap its children in a `<Command>` root the way the standard shadcn template does — it was previously only used by the tag-editor combobox, which calls `<Command>` directly (not `CommandDialog`), so this gap had never been exercised. `CommandInput`/`CommandList` need a `<Command>` ancestor to get cmdk's internal store context; without it, `context` is `undefined`. Fixed by wrapping the palette's contents in `<Command shouldFilter={false}>` inside `CommandDialog`, matching the tag-editor's working pattern. `shouldFilter={false}` is also required: cmdk's built-in filter otherwise matches typed text against each `CommandItem`'s `value` string (`lead-<uuid>`), which would hide every lead result since the query text never appears in a UUID — search relevance is already server-computed by `smart_search_leads`, so cmdk's own filtering must be disabled.
  - **Confirmed fixed** by the user in a live authenticated session (⌘K now opens and searches correctly).
  - Separately, the user also saw a hydration warning in the terminal (`aria-describedby="DndDescribedBy-0"` vs `-2"` on Kanban cards on `/pipeline`). Investigated and it's **unrelated to the command palette** — root cause is `@dnd-kit/utilities`'s `useUniqueId` (`node_modules/@dnd-kit/utilities/dist/utilities.esm.js:169-178`), which generates ids via a plain module-level counter mutated inside `useMemo`, not React's SSR-safe `useId()`. This is a known dnd-kit + Next.js Strict Mode dev-mode quirk (Strict Mode's double-render intentionally re-invokes impure code like this), cosmetic only (aria-only attribute, doesn't affect DnD functionality), and dev-only (Strict Mode double-invocation doesn't happen in production builds). Pre-existing on the Pipeline page's `DndContext`/`KanbanBoard`, not touched by this work. Left alone — not asked for, and the standard fix (deferring `DndContext` to client-only render after mount) is a separate, unrelated change to code nobody flagged as broken.
  - **Lesson for verification going forward**: `next build` did NOT catch the original ⌘K crash. `(dashboard)/*` routes are all dynamic (not statically prerendered), so `next build` only type-checks and registers them — it never actually renders the client component tree, so a client-only runtime crash like this is invisible to build/typecheck/lint. This project has no component-testing setup (no `jsdom`/`@testing-library/react` in `package.json`), so the only way to actually catch this class of bug is a live authenticated browser session — which I can't do myself (no login). Flagging so nobody assumes "build passed" means "the client component renders."

Explicitly NOT done:
- No unit/component tests written for `command-palette.tsx` or `searchCommandPalette` itself (the search action calls the live `smart_search_leads` RPC against the hosted DB — an integration test for it would follow the `rls-audit.test.ts` real-data pattern; not written yet, scope judgment call for an autonomous tick, not blocked by anything).
- Not manually click-tested in a real authenticated browser session (see Verification).
- Noticed in passing (pre-existing, not introduced by this work, not touched): `useSidebarCollapsed()` in `dashboard-nav.tsx` trips the `react-hooks/set-state-in-effect` lint rule on its localStorage-hydration effect. It's the standard SSR-hydration-mismatch-avoidance pattern (read `window.localStorage` only after mount), so the "fix" isn't obviously safe without risking a hydration bug — left alone rather than guessing.

**Verification performed**: `npx tsc --noEmit` clean, `npx eslint` clean (had to fix one `react-hooks/set-state-in-effect` violation — moved the "clear results on empty query" `setState` out of the debounce `useEffect` and into the `onValueChange` handler instead), and a full `npm run build` compiled every route (including `/leads/[leadId]` and every `(dashboard)` route where the palette is mounted) with zero errors. **Not** verified by clicking through it in a logged-in browser session — that would have required signing into an account, which I don't do on the user's behalf (see CLAUDE.md-level operating rules on account creation/credentials). If you're a human or an agent with a valid login, the fast manual check is: open any `/pipeline`-family page, hit `⌘K`, type a lead name/phone/email, confirm results navigate to `/leads/[id]`.

---

## 2. Cross-channel suppression list (SMS side)

**Status: DONE** (code shipped; **migration NOT applied to the hosted Supabase DB** — see Blocked note)

Scope note: the original plan (§13) bundled this with the SMS-inbound-hijack RLS fix from the 2026-07-25 security audit. That fix lives on the separate `dialer` branch (see §3 below) and doesn't exist on `improvement-ph-1` — so this shipped standalone instead of bundled. Email opt-out already existed (`contacts.email_opted_out_at`, `/api/unsubscribe`); this closes the equivalent gap for SMS, which had **no opt-out enforcement at all** before this change — `sendSms` in the sequence sender was never checking anything.

What shipped:
- [supabase/migrations/20260804090000_sms_opt_out.sql](../../supabase/migrations/20260804090000_sms_opt_out.sql) — adds `contacts.sms_opted_out_at timestamptz`, mirroring the existing `email_opted_out_at` column.
- [src/lib/supabase/types.ts](../../src/lib/supabase/types.ts) — hand-added `sms_opted_out_at` to the `contacts` Row/Insert/Update types (this file is committed and hand-maintained in this repo, not gitignored/auto-generated — confirmed before editing).
- [src/lib/sms/process-inbound.ts](../../src/lib/sms/process-inbound.ts) — detects standard carrier opt-out keywords (`STOP`, `STOPALL`, `UNSUBSCRIBE`, `CANCEL`, `END`, `QUIT`, case-insensitive, whole trimmed message) on every inbound SMS and sets `sms_opted_out_at` on all matched contacts; the `sms_received` activity payload now carries `opted_out: boolean`.
- [src/lib/sequences/send-step.ts](../../src/lib/sequences/send-step.ts) — the SMS branch now checks `contact.sms_opted_out_at` and skips the send (cancels the enrollment, logs a `sequence_step_sent` activity with `reason: "contact_opted_out"`) **regardless of the sequence's marketing flag** — unlike email opt-out, which only blocks marketing sequences. This is deliberate: TCPA/carrier rules treat STOP as universal, not campaign-scoped (see the comment left in the code).
- [contact-sms-opt-out-badge.tsx](<../../src/app/(dashboard)/leads/[leadId]/_components/contact-sms-opt-out-badge.tsx>) + `clearContactSmsOptOut` action in [src/lib/actions/contacts.ts](../../src/lib/actions/contacts.ts) — admin-only "clear opt-out" control, mirroring the existing email badge. Wired into the Contact card on [leads/[leadId]/page.tsx](<../../src/app/(dashboard)/leads/[leadId]/page.tsx>).

**RESOLVED 2026-08-04**: user explicitly authorized applying the migration. Applied via the Supabase MCP `apply_migration` tool to project `xhfvopsserqkvoozbreh` (`vesperwisecrm`), recorded as migration `20260804133254_sms_opt_out`. Verified via `information_schema.columns` that `contacts.sms_opted_out_at` (`timestamp with time zone`, nullable) now exists on the hosted project. Ran `get_advisors(type: security)` afterward — only pre-existing, unrelated findings (RLS-enabled-no-policy on `email_reply_tokens`, a few `SECURITY DEFINER` functions callable by `authenticated`, leaked-password-protection disabled); nothing new introduced by this column. Re-ran the full DB-backed test suite (`rls-audit.test.ts`, `onboarding-tour.test.ts`) against the updated schema — all 25 tests still pass.

This feature is now live end-to-end: inbound STOP replies will actually persist, and the sequence sender will actually honor them.

Update (autonomous tick, same day): exported `isSmsOptOutKeyword` from `process-inbound.ts` and added `tests/sms-opt-out-keywords.test.ts` — 10 passing pure-function tests (case-insensitivity, whitespace, and importantly that a keyword *embedded in a sentence* like "please stop calling me" does NOT trigger opt-out, only an exact whole-message match does, matching carrier convention).

Update (autonomous tick, same day): added [tests/sms-opt-out.test.ts](../../tests/sms-opt-out.test.ts) — 3 passing integration tests against the live hosted project (real throwaway account/contact/lead/sequence rows, cleaned up in `afterAll`): (1) an inbound "STOP" sets `sms_opted_out_at` and flags `opted_out: true` on the `sms_received` activity, (2) a normal reply does not, (3) `sendDueStep` skips + cancels the enrollment for an opted-out contact **on a deliberately non-marketing sequence**, to explicitly verify the "STOP suppresses regardless of marketing flag" behavior documented in `send-step.ts`'s comment. Full suite now 28 passing (was 25); only the pre-existing environmental `cron-smoke` failures remain (need a live `:3000` server, unrelated).

Update (autonomous tick, same day): added [tests/search-command-palette.test.ts](../../tests/search-command-palette.test.ts) — 3 passing integration tests (real session via the `onboarding-tour.test.ts` cookie-mocking pattern): empty query short-circuits without a DB call, a real lead is found by contact name with display fields + match reasons populated, and a second account's owner gets zero results for the same query (account-scoping check). Full suite now 31/35 passing (same 4 pre-existing unrelated `cron-smoke` failures).

**Test debt on the Quick Wins is now fully closed** — both shipped features (command palette, SMS suppression) have integration coverage. Nothing further is self-identifiable as unblocked/reversible follow-up; the only open item is the `dialer` branch decision below, plus the standing question of whether to commit/push this work.
- Dialer/voice-channel suppression is explicitly out of scope here — the dialer subsystem doesn't exist on this branch (see §3).

---

## 3. Pre-existing blocking bugs (E.164 regex, SMS-hijack RLS fix, migration drift)

**Status: BLOCKED — out of branch scope, not attempted**

The plan's §13 item #3 assumed these bugs (documented in prior memory/security audit, 2026-07-25) were in this codebase. **They are not.** Verified by grep: `prepare_dialer_call` and `account_phone_numbers` do not exist anywhere in `improvement-ph-1`'s `supabase/migrations/` or `src/`. `git branch -a` shows a separate `dialer` branch (`remotes/origin/dialer`) — that's where the dialer/telephony subsystem and its 2026-07-25 security-fix migrations (`20260725*`) actually live, per prior memory (`vesperwisecrm-security-audit-2026-07.md`, `vesperwisecrm-telephony-architecture.md`).

**Do not attempt to fix these bugs on `improvement-ph-1`** — there is nothing here to fix; the affected code doesn't exist on this branch. This needs a separate decision from the user: merge/rebase the `dialer` branch first, or work the fix directly on `dialer`. Flagging here so nobody burns time searching this branch for a regex that isn't here.

---

## What's left from the Quick Wins list

Nothing else was in §13 of the plan. Everything above is either DONE or explicitly BLOCKED with a stated reason. Before moving on to the plan's Medium-term items (§14: `lead_facts` evidence ledger, NL search compiler, Postgres task queue, Calendar integration), someone needs to:

1. Decide whether/how to bring the `dialer` branch's blocking fixes in (§3 above) — **the one remaining item that needs a human decision.**
2. Decide whether to commit/push this work — **the other remaining item that needs a human decision.**
3. No more self-identifiable local/reversible work remains on the Quick Wins list. If you're an agent picking this up with no new instruction from the user, don't invent further additions here — check back with the user or move on to the plan's Medium-term items only if explicitly asked.
