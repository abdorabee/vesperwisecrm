# VesperWiseCRM

VesperWiseCRM is a multi-tenant acquisition CRM built with Next.js App Router, Supabase Postgres/Auth/RLS, and Vercel. It tracks leads, deals, and the next task. It does not send bulk, cold, or automated email or SMS, and it does not place calls.

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

## Polar billing

Polar billing is disabled until the provider values in `.env.local` are present. Configure the Starter and Team product IDs plus the sandbox or production environment, then register the Standard Webhook endpoint at the **final HTTPS host** (Polar does not follow redirects):

```text
https://www.vesperwisecrm.com/api/webhooks/polar
```

The apex host `https://vesperwisecrm.com/...` currently 308-redirects to `www`. Polar treats any 3xx as a delivery failure and disables the endpoint after consecutive failures. After deploying a working handler, re-enable the webhook from the Polar dashboard if it was disabled.

Starter and Team checkout are enabled. Scale is stored in the billing model but checkout remains disabled until its additional capabilities are implemented and accepted; its product ID is optional until Scale checkout is enabled. Apply the Supabase migrations before enabling provider values; the webhook secret and access token must remain server-side.

## Deployment

The web application is designed for Vercel and the data layer for Supabase. Apply migrations before enabling features that use new tables. Keep service-role keys, webhook credentials, provider credentials, and cron secrets server-side.
