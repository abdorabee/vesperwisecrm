const HOUR_MS = 60 * 60 * 1000;

// A blank or non-positive cooldown means the workflow runs once per lead.
// A positive cooldown blocks another run until that many hours have passed.
export function cooldownBlocksRefire(
  firedAtIso: string | null | undefined,
  cooldownHours: number | null,
  now = Date.now(),
): boolean {
  if (!firedAtIso) {
    return false;
  }

  const firedAt = new Date(firedAtIso).getTime();
  if (Number.isNaN(firedAt)) {
    return false;
  }

  if (cooldownHours == null || cooldownHours <= 0) {
    return true;
  }

  return now < firedAt + cooldownHours * HOUR_MS;
}

export function cooldownHoursFromConfig(
  config: Record<string, unknown> | null | undefined,
): number | null {
  const raw = config?.cooldownHours;
  if (raw == null || raw === "") {
    return null;
  }

  const hours = Number(raw);
  if (!Number.isFinite(hours) || hours <= 0) {
    return null;
  }

  return hours;
}

export function stageIdFromConfig(
  config: Record<string, unknown> | null | undefined,
): string | null {
  const stageId = config?.stageId;
  return typeof stageId === "string" && stageId.length > 0 ? stageId : null;
}
