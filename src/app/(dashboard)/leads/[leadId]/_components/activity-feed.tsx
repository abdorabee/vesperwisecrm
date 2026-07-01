"use client";

import { useState } from "react";
import type { Tables } from "@/lib/supabase/types";

function getPayload(activity: Tables<"activities">): Record<string, unknown> {
  return activity.payload as Record<string, unknown>;
}

function describeActivity(activity: Tables<"activities">): string {
  const payload = getPayload(activity);

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
    case "email_received":
      return `Email received from ${payload.from ?? ""}: "${payload.subject ?? ""}"`;
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

function normalizeSubject(subject: unknown): string {
  if (typeof subject !== "string") {
    return "";
  }
  return subject
    .replace(/^(re|fwd):\s*/gi, "")
    .trim()
    .toLowerCase();
}

function getThreadKey(activity: Tables<"activities">): string | null {
  if (activity.type !== "email_sent" && activity.type !== "email_received") {
    return null;
  }
  const payload = getPayload(activity);
  if (typeof payload.thread_id === "string") {
    return payload.thread_id;
  }
  const subject = normalizeSubject(payload.subject);
  return subject ? `subject:${subject}` : null;
}

type FeedItem =
  | { kind: "activity"; activity: Tables<"activities"> }
  | {
      kind: "email_thread";
      threadKey: string;
      subject: string;
      activities: Tables<"activities">[];
      latestAt: string;
    };

function buildFeedItems(activities: Tables<"activities">[]): FeedItem[] {
  const items: FeedItem[] = [];
  let index = 0;

  while (index < activities.length) {
    const activity = activities[index];
    const threadKey = getThreadKey(activity);

    if (!threadKey) {
      items.push({ kind: "activity", activity });
      index += 1;
      continue;
    }

    const threadActivities: Tables<"activities">[] = [activity];
    let next = index + 1;
    while (next < activities.length) {
      const candidate = activities[next];
      if (getThreadKey(candidate) !== threadKey) {
        break;
      }
      threadActivities.push(candidate);
      next += 1;
    }

    if (threadActivities.length === 1) {
      items.push({ kind: "activity", activity });
    } else {
      const payload = getPayload(activity);
      items.push({
        kind: "email_thread",
        threadKey,
        subject:
          typeof payload.subject === "string" ? payload.subject : "Email thread",
        activities: [...threadActivities].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        ),
        latestAt: activity.created_at,
      });
    }

    index = next;
  }

  return items;
}

function EmailBody({ activity }: { activity: Tables<"activities"> }) {
  const [expanded, setExpanded] = useState(false);
  const payload = getPayload(activity);
  const snippet =
    typeof payload.snippet === "string" ? payload.snippet : null;
  const bodyText =
    typeof payload.body_text === "string" ? payload.body_text : null;
  const bodyHtml =
    typeof payload.body_html_sanitized === "string"
      ? payload.body_html_sanitized
      : null;
  const note =
    activity.type === "note_added" && typeof payload.note === "string"
      ? payload.note
      : null;

  const preview = snippet ?? bodyText ?? note;
  const fullText = bodyText ?? note;
  const hasExpandable = Boolean(fullText || bodyHtml);

  if (!preview && !hasExpandable) {
    return null;
  }

  return (
    <div className="mt-1">
      {!expanded && preview && (
        <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-2 text-sm text-muted-foreground">
          {preview}
        </p>
      )}
      {expanded && fullText && (
        <p className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-2 text-sm text-muted-foreground">
          {fullText}
        </p>
      )}
      {expanded && bodyHtml && (
        <div
          className="prose prose-sm max-w-none rounded-lg border bg-muted/30 p-2 text-sm text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: bodyHtml }}
        />
      )}
      {hasExpandable && (
        <button
          type="button"
          className="mt-1 text-xs text-muted-foreground underline"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : "Show full message"}
        </button>
      )}
    </div>
  );
}

function ActivityItem({ activity }: { activity: Tables<"activities"> }) {
  const payload = getPayload(activity);
  const isEmail =
    activity.type === "email_sent" || activity.type === "email_received";
  const isNote =
    activity.type === "note_added" &&
    typeof payload.note === "string" &&
    !payload.system;

  return (
    <li className="text-sm">
      <p>{describeActivity(activity)}</p>
      {(isEmail || isNote) && <EmailBody activity={activity} />}
      <p className="text-xs text-muted-foreground tabular-nums">
        {new Date(activity.created_at).toLocaleString()}
      </p>
    </li>
  );
}

function EmailThreadItem({
  subject,
  activities,
}: {
  subject: string;
  activities: Tables<"activities">[];
}) {
  return (
    <li className="text-sm">
      <details className="group">
        <summary className="cursor-pointer list-none font-medium">
          {subject}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({activities.length} messages)
          </span>
        </summary>
        <ul className="mt-2 flex flex-col gap-3 border-l pl-3">
          {activities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </ul>
      </details>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        Latest:{" "}
        {new Date(
          activities[activities.length - 1]?.created_at ?? "",
        ).toLocaleString()}
      </p>
    </li>
  );
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

  const feedItems = buildFeedItems(activities);

  return (
    <ul className="flex flex-col gap-3">
      {feedItems.map((item) =>
        item.kind === "email_thread" ? (
          <EmailThreadItem
            key={item.threadKey}
            subject={item.subject}
            activities={item.activities}
          />
        ) : (
          <ActivityItem key={item.activity.id} activity={item.activity} />
        ),
      )}
    </ul>
  );
}
