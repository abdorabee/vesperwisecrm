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
    case "note_added":
      return "Note added";
    case "sequence_enrolled":
      return `Enrolled in sequence: ${payload.sequence_name ?? ""}`;
    case "sequence_step_sent":
      return `Sequence step ${payload.step_number ?? ""} sent`;
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
          <p className="text-xs text-muted-foreground tabular-nums">
            {new Date(activity.created_at).toLocaleString()}
          </p>
        </li>
      ))}
    </ul>
  );
}
