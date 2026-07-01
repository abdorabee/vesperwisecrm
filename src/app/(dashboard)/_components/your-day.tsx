import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { LeadTask } from "@/lib/queries/tasks";

interface YourDayProps {
  tasks: LeadTask[];
}

function isOverdue(task: LeadTask): boolean {
  return new Date(task.due_at).getTime() < Date.now();
}

function contactLabel(task: LeadTask): string {
  const contact = task.lead.contact;
  const name = [contact?.first_name, contact?.last_name].filter(Boolean).join(" ");
  return [name, contact?.company].filter(Boolean).join(" · ");
}

export function YourDay({ tasks }: YourDayProps) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          No due or overdue tasks assigned to you.
        </p>
        <Button render={<Link href="/pipeline" />} nativeButton={false} className="w-fit">
          Review pipeline
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      {tasks.map((task) => (
        <div key={task.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/leads/${task.lead_id}`} className="text-sm font-medium hover:underline">
                {task.title}
              </Link>
              {isOverdue(task) && <Badge variant="destructive">Overdue</Badge>}
              {task.priority === "high" && <Badge>High</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {task.lead.title}
              {contactLabel(task) ? ` · ${contactLabel(task)}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {new Date(task.due_at).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
