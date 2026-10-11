// `${origin}${next}` is not safe: string concatenation lets `next` rewrite the
// authority section. "@evil.com" parses as userinfo + host evil.com, and
// ".evil.com" extends the hostname. A path that survives the first parse can
// still start with "//" after dot-segment removal, and that string is
// protocol-relative when parsed again.

const DEFAULT_REDIRECT = "/pipeline";

function sameOriginPath(path: string, origin: string): string | null {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(path, origin);
  } catch {
    return null;
  }

  if (parsed.origin !== origin) {
    return null;
  }

  const again = `${parsed.pathname}${parsed.search}${parsed.hash}`;
  if (again !== path || again.startsWith("//") || again.includes("\\")) {
    return null;
  }

  return path;
}

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

  const path = `${target.pathname}${target.search}${target.hash}`;
  return sameOriginPath(path, origin) ?? fallback;
}
