# VesperWiseCRM

VesperWiseCRM is a multi-tenant acquisition CRM built with Next.js App Router, Supabase Postgres/Auth/RLS, and Vercel. It includes lead intake and qualification, pipeline management, teams, tasks, sequences, workflows, reporting, email/SMS, client portals, and a provider-independent browser dialer.

## Local development

1. Copy `.env.example` to `.env.local` and configure Supabase.
2. Install dependencies with `npm install`.
3. Apply the local database migrations with `npx supabase start` and `npx supabase db reset`.
4. Start the app with `npm run dev`.

The application is available at `http://localhost:3000` by default.

## Validation

```bash
npm test
npx tsc --noEmit
npm run lint
npm run build
npm run test:e2e
```

Some integration and E2E tests require a reachable Supabase project and, for HTTP smoke tests, a running application server. See the individual test headers for their setup.

## Dialer

The outbound dialer is disabled by default and uses a Twilio Voice adapter behind a provider-neutral domain interface. It supports explicit click-to-call, personal/shared progressive queues, dispositions, DNC suppression, signed/idempotent callbacks, Realtime status updates, and cron reconciliation.

See [docs/DIALER.md](docs/DIALER.md) for architecture, configuration, migrations, Twilio setup, scheduling, deployment, rollback, and adapter extension instructions.

## Deployment

The web application is designed for Vercel and the data layer for Supabase. Apply migrations before enabling features that use new tables. Keep service-role keys, webhook credentials, provider credentials, and cron secrets server-side.
