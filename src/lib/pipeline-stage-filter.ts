const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function resolvePipelineStageId(
  stages: { id: string; name: string }[],
  stageParam: string | undefined | null,
): string | undefined {
  const value = stageParam?.trim();
  if (!value) return undefined;
  if (UUID_RE.test(value)) return value;
  return stages.find(
    (stage) => stage.name.toLowerCase() === value.toLowerCase(),
  )?.id;
}
