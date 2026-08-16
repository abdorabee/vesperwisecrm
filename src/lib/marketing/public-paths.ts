export const MARKETING_PUBLIC_PATHS = [
  "/home",
  "/book-demo",
  "/solutions",
  "/docs",
  "/onboarding",
  "/changelog",
  "/integrations",
  "/support",
  "/about",
  "/careers",
  "/security",
  "/contact",
  "/privacy",
  "/terms",
  "/status",
] as const;

export const MARKETING_SITEMAP_PATHS = [
  "/home",
  "/book-demo",
  "/solutions/wholesalers",
  "/solutions/fix-and-flip",
  "/solutions/buy-and-hold",
  "/solutions/agents",
  "/solutions/dispositions",
  "/docs",
  "/onboarding",
  "/changelog",
  "/integrations",
  "/support",
  "/about",
  "/careers",
  "/security",
  "/contact",
  "/privacy",
  "/terms",
  "/status",
] as const;

export function isMarketingPublicPath(pathname: string): boolean {
  return MARKETING_PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
