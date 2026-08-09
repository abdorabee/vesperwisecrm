"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import {
  formatWorkspaceCurrency,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  formatWorkspaceTime,
  type WorkspaceSettings,
} from "@/lib/workspace-settings";

const WorkspaceFormattingContext = createContext<WorkspaceSettings | null>(null);

export function WorkspaceFormattingProvider({ settings, children }: { settings: WorkspaceSettings; children: ReactNode }) {
  return <WorkspaceFormattingContext.Provider value={settings}>{children}</WorkspaceFormattingContext.Provider>;
}

export function useWorkspaceFormatting() {
  const settings = useContext(WorkspaceFormattingContext);
  if (!settings) throw new Error("Workspace formatting requires WorkspaceFormattingProvider");
  return useMemo(() => ({
    settings,
    currency: (value: number) => formatWorkspaceCurrency(value, settings, "en-US"),
    date: (value: string | number | Date) => formatWorkspaceDate(value, settings, "en-US"),
    dateTime: (value: string | number | Date) => formatWorkspaceDateTime(value, settings, "en-US"),
    time: (value: string | number | Date) => formatWorkspaceTime(value, settings, "en-US"),
  }), [settings]);
}

export function WorkspaceCurrency({ value }: { value: number }) {
  const { currency } = useWorkspaceFormatting();
  return <span className="tabular-nums">{currency(value)}</span>;
}

export function WorkspaceDate({ value }: { value: string | number | Date }) {
  const { date } = useWorkspaceFormatting();
  return <span className="tabular-nums">{date(value)}</span>;
}

export function WorkspaceDateTime({ value }: { value: string | number | Date }) {
  const { dateTime } = useWorkspaceFormatting();
  return <span className="tabular-nums">{dateTime(value)}</span>;
}
