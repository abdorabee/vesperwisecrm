# CRM Data Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a workspace admin click **Migrate data**, pick a source CRM, upload that CRM’s CSV export, review auto-mapped fields/stages, and import contacts + leads + properties + tags + notes into their VesperWise account.

**Architecture:** Keep the Pipeline “Import CSV” dialog as the quick generic path. Add a guided orchestrator in Settings that dispatches a source adapter per CRM. Adapters translate headers/rows into a `CanonicalImportRecord`. A shared writer persists via existing `createLeadRecord`, then attaches tags and a `note_added` activity. Large files persist as `import_jobs` / `import_job_rows` and drain through a new cron so the browser can close.

**Tech Stack:** Next.js 16 App Router, React 19, Zod, Vitest, existing shadcn settings primitives, Supabase Postgres + RLS, Vercel cron (`CRON_SECRET`).

## Global Constraints

- Tenant remains `account_id` only; admin-only (`requireSettingsAdmin` / `is_account_admin`).
- No new npm packages. No OAuth/API connectors in this plan (Carrot has no public read API).
- Do not invent custom-fields tables; unmapped leftover columns append into the lead note.
- Reuse `src/lib/leads/create-lead.ts` and existing `CRM_FIELD_GROUPS` keys from `src/lib/leads/csv-import.ts`.
- Pipeline CSV dialog stays at 500 rows sync; the migration wizard is the path for larger Carrot/HubSpot-style dumps.
- Copy: button and page title **Migrate data**. Source labels: Carrot CRM, HubSpot, GoHighLevel, Pipedrive, Follow Up Boss, Generic CSV.
- Out of scope: SMS/email bodies, attachments, sequences, tasks, Salesforce, Zoho, runtime LLM mapping.

---

See the attached Cursor plan for task-level file lists, interfaces, field maps, and verification commands.
