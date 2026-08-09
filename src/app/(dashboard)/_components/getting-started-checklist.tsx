import Link from "next/link";
import { Check, Circle, Mail, PhoneCall, Settings, Upload, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  label: string;
  description: string;
  href: string;
  complete: boolean;
  icon: typeof Circle;
}

export function GettingStartedChecklist({
  isAdmin,
  workspaceReviewed,
  hasTeammates,
  hasLeads,
  emailConnected,
  callingConnected,
}: {
  isAdmin: boolean;
  workspaceReviewed: boolean;
  hasTeammates: boolean;
  hasLeads: boolean;
  emailConnected: boolean;
  callingConnected: boolean;
}) {
  const items: ChecklistItem[] = [
    ...(isAdmin ? [{ label: "Review workspace settings", description: "Confirm your name, timezone, currency, and formats", href: "/settings/workspace", complete: workspaceReviewed, icon: Settings }] : []),
    ...(isAdmin ? [{ label: "Invite your team", description: "Add the people who will qualify and work leads", href: "/settings/members", complete: hasTeammates, icon: Users }] : []),
    { label: hasLeads ? "Lead data added" : "Add or import your first lead", description: "Start with quick intake or import a CSV from your previous CRM", href: hasLeads ? "/pipeline" : "/intake", complete: hasLeads, icon: hasLeads ? PhoneCall : Upload },
    ...(isAdmin ? [{ label: "Set up outbound email", description: "Verify a sending domain and reply routing", href: "/settings/email", complete: emailConnected, icon: Mail }] : []),
    ...(isAdmin ? [{ label: "Connect calling", description: "Use the Twilio account your workspace owns", href: "/settings/calling", complete: callingConnected, icon: PhoneCall }] : []),
  ];
  const completeCount = items.filter((item) => item.complete).length;
  if (completeCount === items.length) return null;

  return (
    <Card className="border-primary/25">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <div><CardTitle className="text-base">Set up your workspace</CardTitle><p className="mt-1 text-xs text-muted-foreground">{completeCount} of {items.length} complete</p></div>
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted" aria-label={`${completeCount} of ${items.length} setup steps complete`}><div className="h-full bg-primary transition-[width]" style={{ width: `${(completeCount / items.length) * 100}%` }} /></div>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} href={item.href} className="flex min-h-14 items-center gap-3 py-3 transition-colors hover:text-brand-strong">
              {item.complete ? <Check className="size-4 shrink-0 text-brand-strong" /> : <Circle className="size-4 shrink-0 text-muted-foreground" />}
              <Icon className={cn("size-4 shrink-0", item.complete ? "text-muted-foreground" : "text-foreground")} />
              <span className="min-w-0"><span className={cn("block text-sm font-medium", item.complete && "text-muted-foreground line-through")}>{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
