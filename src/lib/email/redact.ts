// Reply tokens are bearer credentials with a 365-day TTL. Logging one verbatim
// -- even on the "invalid" branch, which includes near-miss and lookup-failure
// cases -- puts a live credential into stdout and any downstream log drain.

const VISIBLE_PREFIX_LENGTH = 8;

export function redactToken(token: string | null | undefined): string {
  if (!token || token.length <= VISIBLE_PREFIX_LENGTH) {
    return "…";
  }
  return `${token.slice(0, VISIBLE_PREFIX_LENGTH)}…`;
}
