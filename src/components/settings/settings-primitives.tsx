import type { ReactNode } from "react";
import { Check, CircleAlert, LockKeyhole } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function SettingsPageHeader({ title, description, eyebrow }: {
  title: string;
  description: string;
  eyebrow?: string;
}) {
  return (
    <header className="max-w-2xl space-y-2 border-b border-border pb-6">
      {eyebrow && <p className="text-xs font-semibold tracking-[0.08em] text-brand-strong uppercase">{eyebrow}</p>}
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="max-w-prose text-sm leading-6 text-muted-foreground">{description}</p>
    </header>
  );
}

export function SettingsSection({ title, description, children, className }: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("grid gap-5 border-b border-border py-7 last:border-b-0 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]", className)}>
      <div>
        <h2 className="text-sm font-semibold">{title}</h2>
        {description && <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">{description}</p>}
      </div>
      <div className="min-w-0 max-w-2xl">{children}</div>
    </section>
  );
}

export function ConnectionStatus({ connected, label, detail }: {
  connected: boolean;
  label: string;
  detail?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {detail && <p className="mt-1 text-xs text-muted-foreground">{detail}</p>}
      </div>
      <Badge variant={connected ? "default" : "secondary"}>
        {connected ? <Check className="size-3" /> : <CircleAlert className="size-3" />}
        {connected ? "Connected" : "Not connected"}
      </Badge>
    </div>
  );
}

export function PermissionState({ children = "Owner or admin access is required to change this setting." }: { children?: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
      <LockKeyhole className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
