export function describeScoreChanged(payload: {
  field?: unknown;
  from?: unknown;
  to?: unknown;
}): string {
  const subject = payload.field === "motivation_score" ? "motivation" : "score";
  const to = typeof payload.to === "number" ? payload.to : null;
  const from = typeof payload.from === "number" ? payload.from : null;

  if (to == null) return "Score changed";
  if (from == null) return `Score changed: ${subject} set to ${to}`;
  return `Score changed: ${subject} ${from} to ${to}`;
}
