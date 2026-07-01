# Email setup checklist

Use this guide to configure multi-tenant outbound email and reply capture in VesperwiseCRM.

## 1. Verify your sending domain

1. Sign in as an account **admin** and open **Settings → Email**.
2. Enter your sending domain (e.g. `acmerealty.com`) and register it.
3. Add the SPF and DKIM DNS records shown in the app at your domain provider.
4. Add the recommended DMARC record.
5. Click **Refresh verification** until status is **Verified**.

If verification fails, use the **Review DNS records** link on the Email health card.

## 2. Set account From name and email

After verification:

1. Set **From name** (e.g. `Acme Realty`).
2. Set **From email** on your verified domain (e.g. `hello@acmerealty.com`).
3. Click **Send test email** to confirm delivery.

## 3. Invite your team and set sender identities (optional)

1. Open **Team** and invite members.
2. For each member, optionally set:
   - **Display name** — appears as `Sarah Jones via Acme Realty <hello@...>` when no personal address is set.
   - **Personal local part** — sends as `Sarah Jones <sarah@acmerealty.com>` when set.
3. Members can also edit their own identity under **Profile**.

## 4. Choose reply routing

Under **Settings → Email → Reply routing**:

- **Shared inbox (recommended)** — replies go to VesperwiseCRM and appear on the lead activity feed. Requires **Reply capture** enabled.
- **Individual agent** — Reply-To goes to the assigned lead owner (or default reply email). Inbound CRM capture is disabled in this mode.

## 5. Test send and reply capture

1. Send a manual email from a lead record.
2. Reply to that email from the lead’s inbox.
3. Confirm the reply appears in the lead **Activity** feed (shared inbox mode only).

## 6. Marketing sequences (CAN-SPAM)

For drip campaigns that qualify as marketing:

1. When creating/editing a sequence, enable **Marketing sequence**.
2. Send a test enrollment — the email includes an unsubscribe footer.
3. Click the unsubscribe link and confirm the contact shows **Unsubscribed from marketing email** on the lead.
4. Future marketing sequence steps are skipped for opted-out contacts.

## Environment variables (operators)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Resend API access |
| `RESEND_WEBHOOK_SECRET` | Verify inbound + delivery webhooks |
| `INBOUND_EMAIL_DOMAIN` | Subdomain for `replies+token@` capture |
| `REPLY_TOKEN_TTL_DAYS` | Reply token expiry (default 365) |
| `UNSUBSCRIBE_SECRET` | HMAC secret for unsubscribe tokens |
| `PLATFORM_ADMIN_EMAILS` | Comma-separated platform admin allowlist |
| `ALERT_WEBHOOK_URL` | Optional Slack/generic webhook for webhook failures |
| `NEXT_PUBLIC_SITE_URL` | Base URL for unsubscribe links |

## Resend webhook configuration

Subscribe your Resend project webhooks to:

- `email.received` → `/api/webhooks/resend-inbound`
- `email.bounced`, `email.complained`, `email.failed` → `/api/webhooks/resend-events`
