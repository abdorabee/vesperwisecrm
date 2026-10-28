export const PRODUCTION_SITE_ORIGIN = "https://www.vesperwisecrm.com";

export function publicSiteOrigin(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return fromEnv || PRODUCTION_SITE_ORIGIN;
}
