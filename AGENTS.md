<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

VesperWiseCRM is a single Next.js 16 (App Router, Turbopack) + Supabase app; package manager is npm. Standard dev/validation commands live in `README.md` and `package.json` scripts (`dev`, `build`, `lint`, `test`, `test:e2e`).

### Start services each boot (not handled by the update script)
The base image already has Docker, npm deps, and the Supabase CLI installed. Running processes are NOT restored across boots, so start them in order:

1. Docker daemon (no systemd here): run `sudo dockerd` in the background and wait until `docker info` succeeds. `ubuntu` is in the `docker` group, so a fresh shell can use `docker` without `sudo`.
2. Supabase local stack: `npx supabase start` (Postgres 54322, API 54321, Studio 54323, Mailpit 54324). Use `npx supabase db reset` to reapply migrations. Requires Docker to be up first.
3. App: `npm run dev` → http://localhost:3000. Unauthenticated routes 307-redirect to `/login`.

### Required `.env.local` (gitignored — recreate if missing)
`src/lib/env.ts` fails fast without the Supabase vars. Fill from the keys printed by `npx supabase start` / `npx supabase status`:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
CRON_SECRET=local-dev-cron-secret
```
All other integrations (Resend, Twilio, Anthropic, Google, dialer) are optional feature gates; leave unset for core CRM work.

### Non-obvious gotchas
- `supabase/config.toml` sets `auto_expose_new_tables = true` — REQUIRED. The installed Supabase CLI otherwise revokes Data API (anon/authenticated/service_role) privileges on migration-created tables, so every query fails with `permission denied` and the app/DB-backed tests break. Restart Supabase (`npx supabase stop && npx supabase start`) after changing this.
- Signup disables email confirmation locally but the signup action still redirects to `/login?...`; just sign in with the same credentials to reach the dashboard.
- `npm test` (Vitest): `tests/cron-smoke.test.ts` needs the dev server on :3000; `tests/rls-audit.test.ts` and `tests/onboarding-tour.test.ts` need Supabase running. Dialer DB/E2E suites are skipped unless `RUN_DIALER_DB_TESTS` / `RUN_DIALER_E2E` are set.
- `npm run build` and `npm run dev` share `.next`; avoid running them at the same time.
