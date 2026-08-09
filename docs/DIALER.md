# Production Dialer

## Scope

The V1 dialer is an outbound, human-paced progressive dialer. An agent previews a target and explicitly starts each browser call. It does not auto-dial and does not implement inbound calling, recording, voicemail, power/parallel/predictive dialing, routing, transcription, AI summaries, sentiment, or analytics.

`DIALER_ENABLED` defaults to false. When disabled, the dashboard shell and `/dialer` do not query dialer tables. This permits a staged migration and provider rollout without disrupting existing CRM behavior.

**Billing model: bring your own Twilio account.** There is no platform-owned Twilio account behind the dialer. Each tenant connects their own Twilio Account SID, Auth Token, API Key, TwiML App, and phone number from the Settings tab on `/dialer`; Twilio bills that tenant directly for every minute. The platform never sees a Twilio invoice for a tenant's calling activity. An account with nothing connected sees a "connect your Twilio account" prompt instead of the dialer queues.

Ops cost estimate (platform-owned vs BYO Twilio, US + Egypt destination rates): [DIALER_COST.md](./DIALER_COST.md).

## Architecture

- Next.js server actions validate authenticated user operations and use the cookie-bound Supabase client.
- Transactional Postgres RPCs enforce tenant membership, assigned-only lead visibility, DNC, one active call per user, workspace/queue concurrency, rate limits, queue claims, idempotency, and dispositions.
- `DialerProvider` isolates provider behavior: initiate, cancel, reconcile status, validate callbacks, normalize events, and generate outbound instructions. Every method takes the requesting `accountId` and resolves that tenant's own credentials per call; the provider instance itself holds no credential state, so a single warm process safely serves many tenants.
- The Twilio server adapter mints five-minute outgoing-only Access Tokens using the calling tenant's own API Key. The browser receives a token and attempt ID, never the destination or provider credentials.
- The signed Twilio Voice request resolves the destination from the trusted call row, attaches the parent Call SID transactionally, then emits TwiML. A persistence failure produces a hangup rather than a PSTN leg.
- Signed status callbacks become normalized provider events. `(provider, provider_event_key)` is unique; only a strictly newer provider sequence may change current state, and terminal states cannot regress.
- Supabase Realtime publishes `calls`, `call_attempts`, and `dialer_queue_items`. The active-call client polls every five seconds only while Realtime is disconnected and the call is nonterminal.
- A secret-protected reconciliation endpoint checks stale attempts in bounded batches. Supabase Cron should invoke it every minute.

The CRM continues to use `activities` for concise `call_started`, `call_completed`, and `call_disposition_set` summaries. Complete lifecycle/audit details remain in `calls`, `call_attempts`, and `call_events`.

## Data model

Migration `20260722022022_production_dialer.sql` adds:

- `dialer_settings`: tenant concurrency, rate, and retry defaults.
- `call_dispositions`: tenant-configurable outcomes and DNC/retry behavior.
- `dialer_queues`: personal or admin-managed shared queues, optionally restricted to a lead group.
- `dialer_queue_items`: ordered targets, claims, readiness, cancellation, and retry state.
- `calls`: logical outbound call cycles linked to a contact, optional lead, queue item, and owner.
- `call_attempts`: immutable attempt numbering plus current provider state, timing, notes, disposition, failure, and idempotency metadata.
- `call_events`: append-only user/system/provider audit events and sanitized provider metadata.
- Contact fields `phone_e164`, `do_not_call_at`, `do_not_call_reason`, and `do_not_call_by_user_id`.

All tables have explicit authenticated grants and RLS. Portal clients are excluded by `is_internal_account_member`. Provider transition RPCs are executable only by `service_role`; user RPCs revalidate identity and tenant access internally.

Migration `20260806180100_dialer_provider_credentials.sql` adds `dialer_provider_credentials`: one row per account holding the tenant's own Twilio Account SID, encrypted Auth Token, API Key SID, encrypted API Key Secret, TwiML App SID, phone number, and connection status. Unlike every other table above, this one grants **no** policies to `authenticated` at all — not even an admin-scoped `select`. The only way to read or write it is the service-role client, gated by `requireAdminAccountId()` in application code (`src/lib/actions/dialer-credentials.ts`, `src/lib/queries/dialer-credentials.ts`). Auth Token and API Key Secret are AES-256-GCM encrypted at rest via `src/lib/dialer/credentials-crypto.ts`, keyed by `DIALER_CREDENTIALS_ENCRYPTION_KEY`.

Migration `20260806180000_fix_prepare_dialer_call_e164_regex.sql` corrects a double-escaped regex in `prepare_dialer_call` (`'^\\+[1-9]...'`) that rejected every correctly formatted E.164 number under Postgres's default `standard_conforming_strings = on`. Any deployment that already applied `20260722022022_production_dialer.sql` needs this follow-up migration before the dialer can place a single call.

## Environment variables

```dotenv
DIALER_ENABLED=false
DIALER_PROVIDER=twilio
DIALER_PUBLIC_BASE_URL=https://crm.example.com
DIALER_DEFAULT_COUNTRY=US
DIALER_MAX_CALLS_PER_SECOND=1
DIALER_CREDENTIALS_ENCRYPTION_KEY=

CRON_SECRET=
```

`DIALER_PUBLIC_BASE_URL` must be the exact HTTPS origin Twilio calls. Do not include a trailing slash. `DIALER_DEFAULT_COUNTRY` is used only to interpret national-format contact numbers; valid E.164 numbers are preserved. The effective calls-per-second cap is the stricter of `DIALER_MAX_CALLS_PER_SECOND` and the tenant value in `dialer_settings`. `DIALER_CREDENTIALS_ENCRYPTION_KEY` is 32 raw bytes, base64-encoded (`openssl rand -base64 32`) — it decrypts every tenant's stored Twilio Auth Token and API Key Secret, so treat it at the same sensitivity tier as `SUPABASE_SERVICE_ROLE_KEY`: platform secret store only, never committed, and losing it means every connected tenant has to reconnect.

There is deliberately no `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_VOICE_FROM_NUMBER` / `TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET` / `TWILIO_TWIML_APP_SID` here anymore — those were the platform-wide credentials the old single-tenant dialer used, and keeping a platform-level fallback would defeat the BYO billing model. (The `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` variables still exist for the separate, unrelated outbound-SMS feature in `src/lib/sms/twilio.ts` — don't confuse the two.)

All variables above are server-only. Do not prefix provider credentials with `NEXT_PUBLIC_`.

## Database setup

Inspect commands before use:

```bash
npx supabase migration list
npx supabase db reset
npx supabase gen types typescript --local > /tmp/vesperwise-types.ts
npx supabase inspect db table-sizes
npx supabase inspect db index-usage
```

The committed generated types already contain the dialer schema. Regenerate and compare them whenever the migration changes. A local reset requires Docker and validates the complete migration chain. For a linked staging project, use the repository's normal reviewed migration deployment process; do not enable the feature until the migration is confirmed.

## Twilio Voice setup (per tenant)

Each account admin does this once, in their own Twilio console, from the Settings tab on `/dialer`:

1. Create a Twilio API Key (Console → Account → API keys & tokens) and note its SID and secret.
2. Create a TwiML App.
3. Set its Voice Request URL to the platform's fixed callback (same for every tenant — the application resolves which tenant a request belongs to from the `attemptId` embedded in the call, not from which TwiML App invoked the URL):

   `POST https://<crm-host>/api/dialer/providers/twilio/voice`

4. Buy or use an existing voice-capable Twilio number on that account.
5. In `/dialer` → Settings → "Your Twilio account", enter the Account SID, Auth Token, API Key SID/Secret, TwiML App SID, and the phone number. The app makes one read-only Twilio API call to verify the pair before saving.
6. Allow microphone access for the CRM origin and confirm CSP/network controls permit Twilio Voice SDK traffic.

The status URL is generated by the adapter for every dialed number, also identical across tenants:

`POST https://<crm-host>/api/webhooks/dialer/twilio/status?attemptId=<uuid>`

Twilio signs both endpoints. Because the correct signing secret is now per-tenant, both routes resolve `call_attempts.account_id` from the (unguessable, server-minted) `attemptId` *before* validating the signature, then validate against that tenant's own Auth Token — not a global one. The application validates against the canonical `DIALER_PUBLIC_BASE_URL` URL; if a reverse proxy changes the public host or scheme, fix `DIALER_PUBLIC_BASE_URL`, do not disable validation.

For local provider testing, use an HTTPS tunnel and set `DIALER_PUBLIC_BASE_URL` to its stable public origin. Update the TwiML App URL (in whichever Twilio account you're testing with) to the same origin. Never use production credentials in an untrusted shared tunnel.

## Reconciliation schedule

The endpoint is:

`GET https://<crm-host>/api/cron/reconcile-dialer`

It requires `Authorization: Bearer <CRON_SECRET>`. Configure Supabase Cron to call it once per minute. Store the URL and secret in Supabase Vault or another secret store; do not commit them into a migration. A representative `pg_cron`/`pg_net` job is:

```sql
select cron.schedule(
  'reconcile-vesperwise-dialer',
  '* * * * *',
  $$
  select net.http_get(
    url := '<DIALER_RECONCILE_URL>',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || '<CRON_SECRET>'
    )
  );
  $$
);
```

Replace placeholders through the Supabase dashboard or a secret-backed deployment operation. Verify the first invocations and HTTP status in Cron job history.

## Queue and retry behavior

- Every start uses a client UUID idempotency key. Repeating the same reservation returns the original attempt.
- An account advisory lock serializes reservations for concurrency and per-second limits.
- One user may have one initiating/ringing/answered attempt. Workspace and queue limits allow multiple agents.
- Pausing blocks new starts but does not terminate active calls.
- A retry always creates a new attempt. Retryable dispositions return the queue item after a bounded exponential delay; maximum attempts terminate queue eligibility.
- Busy/no-answer behavior is explicit through the chosen disposition. No outcome auto-dials the next target.
- Stale attempts without an attached provider call fail during reconciliation. Stale attached attempts are compared with provider status.

## Security and operational controls

- The destination is normalized with `libphonenumber-js`, resolved server-side, and checked against account-wide normalized DNC suppression.
- Only owner/admin users may clear DNC, and a reason is required and audited.
- Shared queues are owner/admin managed. Personal queues are owned by the current user. Lead-group restrictions and assigned-only lead visibility are enforced in RLS/RPCs.
- Logs contain account/call/attempt/event identifiers and safe error codes. They intentionally omit phone numbers, notes, tokens, credentials, and raw provider payloads.
- Provider routes are public only for callback reachability; signature validation is their authentication boundary.
- The browser cannot choose a destination, source number, account, user, or provider Call SID.

Monitor callback error rates, reconciliation failures, attempts stuck in active states, provider rate-limit responses, call completion ratios, and queue items left `in_progress`. Alert on repeated signature failures without logging request payloads.

## Testing

Provider/domain/migration contract tests:

```bash
npx vitest run \
  tests/dialer-domain.test.ts \
  tests/twilio-dialer-provider.test.ts \
  tests/dialer-migration-contract.test.ts
```

Full validation:

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e
```

Database integration tests require a reachable migrated Supabase project. Browser/E2E tests require a running app, fake media permissions for Chromium, and test provider credentials or a dedicated provider test account. Never point automated tests at a production caller ID or real seller numbers.

The repository includes opt-in suites for those environments:

```bash
RUN_DIALER_DB_TESTS=true npm test -- tests/dialer-database.test.ts
RUN_DIALER_E2E=true npm run test:e2e -- e2e/dialer.spec.ts
```

The browser suite injects a connector only when running a non-production Next.js development build. Production builds always use the real configured Twilio adapter.

## Production rollout

1. Keep `DIALER_ENABLED=false`.
2. Apply and validate the migration in a local/staging database.
3. Deploy the application and server-only environment values, including `DIALER_CREDENTIALS_ENCRYPTION_KEY`.
4. Confirm `DIALER_PUBLIC_BASE_URL` is the exact public origin — the TwiML App itself is configured per tenant from the Settings tab, not centrally.
5. Connect at least one test tenant's Twilio account, call both endpoints with Twilio's validation tooling, and place a controlled test call.
6. Configure and verify the one-minute reconciliation schedule.
7. Verify RLS with owner, member, assigned-only member, portal-client, and cross-tenant accounts.
8. Set `DIALER_ENABLED=true` and redeploy.
9. Watch provider callbacks, reconciliation, active-attempt counts, and errors during the initial rollout.

## Rollback

Set `DIALER_ENABLED=false` and redeploy first. Pause queues and remove/disable the reconciliation schedule. Existing calls at the provider may be ended through Twilio if necessary. The migration is additive; retain dialer tables and audit rows during application rollback. Do not drop them under incident pressure. Any later schema rollback should be a separately reviewed migration with explicit retention/export decisions.

## Adding another provider

1. Implement `DialerProvider` in `src/lib/dialer/providers/<provider>/server.ts`.
2. Keep credentials and destination resolution server-side.
3. Map all provider states to the normalized call state set.
4. Produce stable provider event keys and monotonic sequences (or a documented equivalent ordering strategy).
5. Validate provider signatures using the provider's maintained library.
6. Return only sanitized callback metadata.
7. Add the adapter to the provider registry and environment validation.
8. Implement a browser adapter if the provider uses WebRTC.
9. Add mapping, token, signature, cancellation, reconciliation, duplicate, out-of-order, and failure tests before activation.

The database, actions, queues, UI, and activity feed must not import provider SDKs directly.
