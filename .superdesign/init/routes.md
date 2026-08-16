# Route Map

Framework routing: Next.js App Router. Parenthesized route groups do not appear in URLs.

| URL | Entry | Layout | Summary |
|---|---|---|---|
| `/home` | `src/app/(marketing)/home/page.tsx` | root + marketing | Public CRM landing page with hero, product proof, workflow, gallery, pricing preview, and CTA. |
| `/login` | `src/app/(auth)/login/page.tsx` | root | Authentication entry. |
| `/` | `src/app/(dashboard)/page.tsx` | root + dashboard | Authenticated account dashboard and daily work overview. |
| `/intake` | `src/app/(dashboard)/intake/page.tsx` | root + dashboard | Lead intake and AI-assisted note parsing. |
| `/pipeline` | `src/app/(dashboard)/pipeline/page.tsx` | root + dashboard | Filterable acquisition-pipeline Kanban. |
| `/queue` | `src/app/(dashboard)/queue/page.tsx` | root + dashboard | Qualification and routing queue. |
| `/dialer` | `src/app/(dashboard)/dialer/page.tsx` | root + dashboard | Outbound calling workspace. |
| `/leads/[leadId]` | `src/app/(dashboard)/leads/[leadId]/page.tsx` | root + dashboard | Lead record, activity, score, assignments, tasks, and sequences. |
| `/workflows` | `src/app/(dashboard)/workflows/page.tsx` | root + dashboard | Workflow list. |
| `/workflows/new` | `src/app/(dashboard)/workflows/new/page.tsx` | root + dashboard | Workflow builder. |
| `/workflows/[workflowId]` | `src/app/(dashboard)/workflows/[workflowId]/page.tsx` | root + dashboard | Workflow editor. |
| `/sequences` | `src/app/(dashboard)/sequences/page.tsx` | root + dashboard | Outreach sequence list. |
| `/sequences/new` | `src/app/(dashboard)/sequences/new/page.tsx` | root + dashboard | Sequence builder. |
| `/sequences/[sequenceId]` | `src/app/(dashboard)/sequences/[sequenceId]/page.tsx` | root + dashboard | Sequence editor. |
| `/scorecard` | `src/app/(dashboard)/scorecard/page.tsx` | root + dashboard | Personal performance scorecard. |
| `/team` | `src/app/(dashboard)/team/page.tsx` | root + dashboard | Team management. |
| `/team/scorecard` | `src/app/(dashboard)/team/scorecard/page.tsx` | root + dashboard | Team performance scorecard. |
| `/team/clients` | `src/app/(dashboard)/team/clients/page.tsx` | root + dashboard | Client/account list. |
| `/team/clients/[clientId]` | `src/app/(dashboard)/team/clients/[clientId]/page.tsx` | root + dashboard | Client/account record. |
| `/team/groups` | `src/app/(dashboard)/team/groups/page.tsx` | root + dashboard | Routing groups. |
| `/team/groups/new` | `src/app/(dashboard)/team/groups/new/page.tsx` | root + dashboard | New group form. |
| `/team/groups/[groupId]` | `src/app/(dashboard)/team/groups/[groupId]/page.tsx` | root + dashboard | Group editor. |
| `/settings` | `src/app/(dashboard)/settings/page.tsx` | root + dashboard + settings | Settings index/redirect. |
| `/settings/profile` | `src/app/(dashboard)/settings/profile/page.tsx` | root + dashboard + settings | User profile settings. |
| `/settings/workspace` | `src/app/(dashboard)/settings/workspace/page.tsx` | root + dashboard + settings | Workspace settings. |
| `/settings/members` | `src/app/(dashboard)/settings/members/page.tsx` | root + dashboard + settings | Membership settings. |
| `/settings/email` | `src/app/(dashboard)/settings/email/page.tsx` | root + dashboard + settings | Email delivery settings. |
| `/settings/calling` | `src/app/(dashboard)/settings/calling/page.tsx` | root + dashboard + settings | Dialer provider settings. |
| `/settings/google` | `src/app/(dashboard)/settings/google/page.tsx` | root + dashboard + settings | Google integration settings. |
| `/settings/integrations` | `src/app/(dashboard)/settings/integrations/page.tsx` | root + dashboard + settings | Integration overview. |
| `/settings/routing` | `src/app/(dashboard)/settings/routing/page.tsx` | root + dashboard + settings | Routing configuration. |
| `/settings/routing/new` | `src/app/(dashboard)/settings/routing/new/page.tsx` | root + dashboard + settings | New routing rule. |
| `/settings/routing/[groupId]` | `src/app/(dashboard)/settings/routing/[groupId]/page.tsx` | root + dashboard + settings | Routing-rule editor. |
| `/portal` | `src/app/(portal)/portal/page.tsx` | root + portal | Client portal overview. |
| `/portal/leads/[leadId]` | `src/app/(portal)/portal/leads/[leadId]/page.tsx` | root + portal | Portal lead record. |
| `/platform/email` | `src/app/(platform)/platform/email/page.tsx` | root + platform | Platform email operations. |
| `/tv/[token]` | `src/app/tv/[token]/page.tsx` | root | Tokenized TV performance display. |
| `/offline` | `src/app/offline/page.tsx` | root | PWA offline fallback. |

Key route-level layouts are fully captured in `layouts.md`.
