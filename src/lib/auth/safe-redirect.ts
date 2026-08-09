// `${origin}${next}` is not safe: string concatenation lets `next` rewrite the
// authority section. "@evil.com" parses as userinfo + host evil.com, and
// ".evil.com" extends the hostname. Both escape the origin entirely, which
// turns the post-login callback into a phishing redirector.

const DEFAULT_REDIRECT = "/pipeline";

export function resolveSafeRedirect(
  next: string | null | undefined,
  origin: string,
  fallback: string = DEFAULT_REDIRECT,
): string {
  if (!next) {
    return fallback;
  }

  let target: URL;
  try {
    target = new URL(next, origin);
  } catch {
    return fallback;
  }

  if (target.origin !== origin) {
    return fallback;
  }

  return `${target.pathname}${target.search}${target.hash}`;
}
