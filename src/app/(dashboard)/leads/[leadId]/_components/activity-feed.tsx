import type { Tables } from "@/lib/supabase/types";

function describeActivity(activity: Tables<"activities">): string {
  const payload = activity.payload as Record<string, unknown>;

  switch (activity.type) {
    case "lead_created":
      return `Lead created: "${payload.title ?? ""}"`;
    case "stage_changed":
      return `Stage changed from ${payload.from_stage ?? "—"} to ${payload.to_stage ?? "—"}`;
    case "tag_added":
      return `Tag added: ${payload.tag_name ?? ""}`;
    case "tag_removed":
      return `Tag removed: ${payload.tag_name ?? ""}`;
    case "email_sent":
      return `Email sent: "${payload.subject ?? ""}" to ${payload.to ?? ""}`;
    case "sms_sent":
      return `SMS sent to ${payload.to ?? ""}`;
    case "note_added":
      return payload.system ? String(payload.note ?? "System note") : "Note added";
    case "sequence_enrolled":
      return `Enrolled in sequence: ${payload.sequence_name ?? ""}`;
    case "sequence_step_sent":
      return `Sequence ${payload.channel ?? ""} step ${payload.step_number ?? ""} sent`;
    case "workflow_triggered":
      return `Workflow ${payload.workflow_name ?? ""} ${payload.status ?? "ran"}`;
    case "task_created":
      return `Task created: ${payload.title ?? ""}`;
    case "task_completed":
      return `Task completed: ${payload.title ?? ""}`;
    default:
      return activity.type;
  }
}

export function ActivityFeed({
  activities,
}: {
  activities: Tables<"activities">[];
}) {
  if (activities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No activity yet.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {activities.map((activity) => (
        <li key={activity.id} className="text-sm">
          <p>{describeActivity(activity)}</p>
          {activity.type === "note_added" &&
            typeof (activity.payload as Record<string, unknown>).note ===
              "string" &&
            !(activity.payload as Record<string, unknown>).system && (
              <p className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-2 text-sm text-muted-foreground">
                {String((activity.payload as Record<string, unknown>).note)}
              </p>
            )}
          <p className="text-xs text-muted-foreground tabular-nums">
            {new Date(activity.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
