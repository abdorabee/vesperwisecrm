export const MOTIVATION_SCORE_FILTER = 70;

export function hasMotivationScoreAtLeast(
  score: number | null | undefined,
  minimum = MOTIVATION_SCORE_FILTER,
): boolean {
  return typeof score === "number" && score >= minimum;
}

export function filterByMotivationScore<T extends { motivation_score: number | null }>(
  leads: T[],
  hotOnly: boolean,
): T[] {
  if (!hotOnly) return leads;
  return leads.filter((lead) =>
    hasMotivationScoreAtLeast(lead.motivation_score),
  );
}
