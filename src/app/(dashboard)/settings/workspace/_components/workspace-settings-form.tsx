"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateWorkspaceSettings } from "@/lib/actions/workspace-settings";
import {
  formatWorkspaceCurrency,
  formatWorkspaceDateTime,
  type WorkspaceSettings,
  type WorkspaceSettingsInput,
} from "@/lib/workspace-settings";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PermissionState, SettingsSection } from "@/components/settings/settings-primitives";
import { SettingsSaveBar, type SaveState } from "@/components/settings/settings-save-bar";

const TIMEZONES = ["Africa/Cairo", "America/Chicago", "America/Los_Angeles", "America/New_York", "Asia/Dubai", "Asia/Riyadh", "Europe/London", "UTC"];
const CURRENCIES = ["USD", "EGP", "EUR", "GBP", "AED", "SAR", "CAD", "AUD"];

function toInput(settings: WorkspaceSettings): WorkspaceSettingsInput {
  return {
    name: settings.name,
    timezone: settings.timezone,
    currencyCode: settings.currencyCode,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
  };
}

export function WorkspaceSettingsForm({ settings, canEdit, schemaAvailable }: {
  settings: WorkspaceSettings;
  canEdit: boolean;
  schemaAvailable: boolean;
}) {
  const initial = useMemo(() => toInput(settings), [settings]);
  const router = useRouter();
  const [savedValues, setSavedValues] = useState(initial);
  const [values, setValues] = useState(initial);
  const [state, setState] = useState<SaveState>("idle");
  const [pending, startTransition] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(savedValues);
  const set = <K extends keyof WorkspaceSettingsInput>(key: K, value: WorkspaceSettingsInput[K]) => {
    setState("idle");
    setValues((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    document.documentElement.dataset.unsavedSettings = dirty ? "true" : "false";
    if (!dirty) return () => { delete document.documentElement.dataset.unsavedSettings; };
    const beforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    const guardLinks = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest("a");
      if (!anchor || anchor.href === window.location.href) return;
      if (!window.confirm("You have unsaved workspace settings. Leave without saving?")) event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", guardLinks, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", guardLinks, true);
      delete document.documentElement.dataset.unsavedSettings;
    };
  }, [dirty]);

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      setState("saving");
      try {
        await updateWorkspaceSettings(values);
        setSavedValues(values);
        setState("saved");
        toast.success("Workspace settings saved");
        router.refresh();
      } catch (error) {
        setState("error");
        toast.error(error instanceof Error ? error.message : "Could not save workspace settings");
      }
    });
  }

  const previewSettings = { ...settings, ...values };
  const now = new Date("2026-08-09T18:30:00.000Z");

  return (
    <form onSubmit={submit}>
      {!schemaAvailable && (
        <PermissionState>
          Workspace preferences are read-only because this database has not received the workspace settings migration. The rest of the CRM will continue using USD and each member&apos;s device formats.
        </PermissionState>
      )}
      <SettingsSection title="Workspace identity" description="This name appears throughout the application and in your account menu.">
        <div className="space-y-2">
          <Label htmlFor="workspace-name">Workspace name</Label>
          <Input id="workspace-name" value={values.name} onChange={(event) => set("name", event.target.value)} disabled={!canEdit || pending} required maxLength={120} />
          {schemaAvailable && !canEdit && <PermissionState />}
        </div>
      </SettingsSection>

      <SettingsSection title="Regional formats" description="Set consistent currency, date, and time defaults for everyone in this workspace.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="timezone">Timezone</Label>
            <select id="timezone" value={values.timezone ?? "__device__"} onChange={(event) => set("timezone", event.target.value === "__device__" ? null : event.target.value)} disabled={!canEdit || pending} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="__device__">Use each member&apos;s device timezone</option>
              {TIMEZONES.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}
            </select>
            <p className="text-xs text-muted-foreground">Generated reports use UTC until a workspace timezone is selected.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <select id="currency" value={values.currencyCode} onChange={(event) => set("currencyCode", event.target.value)} disabled={!canEdit || pending} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="date-format">Date format</Label>
            <select id="date-format" value={values.dateFormat} onChange={(event) => set("dateFormat", event.target.value as WorkspaceSettingsInput["dateFormat"])} disabled={!canEdit || pending} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="system">System default</option>
              <option value="month_day_year">MM/DD/YYYY</option>
              <option value="day_month_year">DD/MM/YYYY</option>
              <option value="iso">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="time-format">Time format</Label>
            <select id="time-format" value={values.timeFormat} onChange={(event) => set("timeFormat", event.target.value as WorkspaceSettingsInput["timeFormat"])} disabled={!canEdit || pending} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50">
              <option value="system">System default</option>
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
        </div>
        <div className="mt-5 rounded-md border border-border bg-muted/30 p-4 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <p className="mt-2 font-mono tabular-nums">{formatWorkspaceCurrency(125000, previewSettings)} · {formatWorkspaceDateTime(now, previewSettings)}</p>
        </div>
      </SettingsSection>

      {canEdit && <SettingsSaveBar dirty={dirty} state={state} onDiscard={() => { setValues(savedValues); setState("idle"); }} />}
    </form>
  );
}
